# Cross-Cutting Concerns

> Rules that apply to **every** backend service, so each one does not solve them its own
> way. This document develops section 7 of `overview.md`. Where something is not decided
> yet, it says so instead of inventing a rule.

**Last updated:** 2026-09-10

---

## 1. What every domain table carries

Defined in `06-data` and repeated in the ten schemas. It is not optional and it is not per
service.

| Columns | Purpose |
|---------|---------|
| `created_at`, `created_by` | Who created the row and when |
| `updated_at`, `updated_by` | Who changed it last and when |
| `deleted_at`, `deleted_by` | Who deleted it and when — logically |
| `row_version` | Counter incremented by a trigger on every change |

Three rules come with it:

- **Nothing is physically deleted.** Deleting means filling `deleted_at`, and every query
  has to exclude deleted rows. A cancelled booking is still part of the history.
- **`row_version` is optimistic locking.** A service that updates a row sends the version
  it read; if it no longer matches, somebody else changed the row first and the update is
  rejected instead of overwriting their work. This is how RNF-003 is met for two
  administrators editing the same booking.
- **`created_by` and `updated_by` hold a user id from the `security` schema**, without a
  foreign key. The service writes what the token says (ADR-006).

---

## 2. Change history

There are no `*_history` tables. Every change is written to `audit.audit_log` by a trigger
on each domain table, storing the previous and the new value as JSON (ADR-003).

Two consequences for the services:

- **No service publishes an audit event and no service writes the log.** The database does
  it, so it cannot be forgotten in a code path.
- `RECURSIVE_TRIGGERS` is off, so the audit trigger does not fire itself.

---

## 3. Logging

Logs go to **standard output**, in plain text, read with `docker logs` (RNF-005). There is
no log aggregator and no metrics stack in this project.

Every line carries at least: timestamp, level, service name and correlation id.

| Level | When |
|-------|------|
| `ERROR` | The operation could not complete: database error, unreachable service, message sent to the dead letter queue |
| `WARN` | Something unexpected that was handled: a retry, an event received twice, a rejected login |
| `INFO` | Business transitions: a booking confirmed, an operator assigned, a payment approved |
| `DEBUG` | Local development detail. Not enabled by default |

**Never logged:** passwords, reset tokens, JWTs, receipt images or their contents, and
personal data beyond the identifier needed to follow the operation (RNF-004.9).

---

## 4. Correlation id

The gateway generates one per incoming request and passes it downstream. It is the only
tracing mechanism in the project.

| Hop | How it travels |
|-----|----------------|
| Client → gateway | Generated if the request does not bring one |
| Gateway → service | HTTP header |
| Service → service | The caller forwards the same header |
| Service → event | In the envelope metadata |
| Event → consumer | Read from the envelope and used in the consumer's own logs |

Each service puts it into the logging context, so a booking can be followed from the tap in
the app, through `reserva-service`, into the event, and into `execution-service`.

---

## 5. Error handling

### REST responses

Errors return a consistent JSON body. The final contract belongs to `07-api`; the proposed
shape is:

```json
{
  "timestamp": "2026-09-10T14:32:00Z",
  "status": 409,
  "error": "BAY_NOT_AVAILABLE",
  "message": "The selected bay is taken for that time",
  "correlationId": "a5f3..."
}
```

| Code | When |
|------|------|
| `400` | Malformed request or invalid input |
| `401` | Missing, invalid or expired token (RNF-004.1) |
| `403` | Valid token, but the role or the ownership rule does not allow it (RNF-004.5) |
| `404` | The resource does not exist |
| `409` | Conflict with the current state: the bay is taken, the booking is already final, the payment is already approved |
| `422` | The referenced row exists but is not valid for this operation: an inactive price, an expired promotion |
| `500` | Unexpected error |

Rules:

- **A stack trace is never returned to the client.** It goes to the log; the client gets a
  code.
- The `error` field is a **stable code**, not a sentence. The clients translate it, which is
  what makes the language preference (RF-020) possible without the backend knowing the
  language.
- Each service maps its domain exceptions to these codes in one place, not in every
  controller.

### Validation happens at three levels

Neither replaces the others:

- **Input validation**, in the REST adapter: required fields, formats, ranges.
- **Cross-schema validation**, before writing: the referenced row exists and is usable. The
  eighteen references are listed in section 16 of `06-data` (ADR-004).
- **Invariants**, inside the aggregate: a rating only on a finished service line, a
  cancellation reason only on a cancelled booking.

---

## 6. Transactions

- **One transaction per use case**, opened and closed in the application layer.
- A transaction writes **only its own schema** (ADR-003).
- **A transaction is never held open across a REST call to another service.** Validate
  first, then open the transaction.
- The event is published **after** the commit, never inside it (ADR-004).
- A booking and its payment are **not** in the same transaction: they belong to different
  services. Their consistency is validated before writing, not guaranteed by the database.

---

## 7. Messaging

| Concern | Rule |
|---------|------|
| Publishing | After the transaction commits |
| Delivery | At-least-once: a consumer must expect the same event twice |
| Idempotency | **Pending.** The data model has no table for processed events; see ADR-004 |
| Retries | Limited attempts with backoff, then the dead letter queue |
| Poison messages | Kept in the dead letter queue for manual review, never discarded silently |
| Acknowledgement | Manual, after the work finishes |

---

## 8. Uploaded files

Only `payment-service` receives files: the receipt image a customer uploads (ADR-008).

| Rule | Detail |
|------|--------|
| Size limit | Enforced at the gateway and again in the service |
| Accepted types | Images only |
| Where they are stored | **Pending** — a mounted folder or the database (ADR-008) |
| Logging | The file is never written to the log, not even its content type chain |

---

## 9. Configuration and secrets

- Everything that changes between machines comes from **environment variables**
  (RNF-004.7): database URL, per-service database user, RabbitMQ credentials, JWT secret.
- The repository has an `.env.example` with the variable names and no real values. The real
  `.env` is never committed.
- Two Spring profiles: `local` and `docker`. The difference is the host names of the
  database and the broker.
- If a required variable is missing, the service **fails on startup** instead of running
  with a default.

---

## 10. Time and language

| Concern | Rule | Status |
|---------|------|--------|
| Storage | `DATETIME2(3)`, always UTC, written with `SYSUTCDATETIME()` | Decided in `06-data` |
| Display | Converted to Colombian time in the clients | Decided in `06-data` |
| Language | The backend returns codes; the clients hold the translations | Proposed — confirm before `07-api` |

---

## 11. What is not covered here

- **No distributed tracing, no metrics and no alerting.** RNF-005 drops them explicitly.
- **No shared library** between services for now. If the same rule ends up copied in ten
  services and starts to hurt, it gets revisited.
- **No caching layer.** There is no Redis in this project.
- **No rate limiting**, because there is no public exposure (ADR-005).

---

## Correlations

- Audit block, logical deletion, `row_version` and triggers → `06-data/MODELO-DE-DATOS.md`, sections 2 and 15
- Cross-service references → `06-data/MODELO-DE-DATOS.md`, section 16
- Observability and security requirements → `04-requirements/non-functional.md`
- Communication and broker topology → ADR-004
- Correlation id generated at the edge → ADR-005
- Authentication and authorization → ADR-006
- Where each rule lives inside a service → ADR-007
- Receipt uploads → ADR-008