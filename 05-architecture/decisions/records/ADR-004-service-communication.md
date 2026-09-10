# ADR-004 — Communication Between Services

| Field | Value |
|-------|-------|
| **ID** | ADR-004 |
| **Date** | 2026-09-10 |
| **Status** | Accepted |
| **Authors** | Juan Camilo Guilombo — [role] |
| **Reviewers** | Brayan Patiño, Merari Urbano, Juan Camilo Guilombo — Development team |

---

## Context

ADR-002 splits the backend into ten services and ADR-003 removes every foreign key that
crosses a schema. Together they create a concrete obligation: the **eighteen cross-schema
references listed in `06-data`, section 16, have to be validated by the application**
before writing. A payment that points to a booking, an operator that points to a user
account, a promotion assigned to a customer — none of those are guaranteed by the database
any more.

At the same time, `01-context/overview.md` puts RabbitMQ in the stack, and the data model
defines eleven notification types, which are in practice the events the system reacts to:
booking created, confirmed and cancelled; operator assigned; service started and finished;
payment under review, approved and rejected; points earned; promotion assigned.

What has to be decided is **when a service calls another one directly and when it publishes
an event**, plus the broker topology. Without that rule, the risk is using RabbitMQ for
everything just because it is available, or using REST for everything and making the user
wait for work that could happen afterwards.

**Known constraints:**

- RNF-001: confirming a booking must not wait on side effects such as notifying the
  operator.
- Payment is verified in-house, so there is no external gateway callback to wait for
  (ADR-008).
- Everything runs in local Docker. Three part-time developers, no experience running
  message brokers.

---

## Decision

**We decided:** synchronous REST when the caller cannot continue without the answer, and
RabbitMQ events when the work is already done and something else has to react.

### Synchronous (REST over HTTP, JSON)

Every cross-schema reference that must exist before writing is a synchronous validation.
The main ones:

| Caller | Callee | Why |
|--------|--------|-----|
| Web and mobile clients | `api-gateway` | The user is waiting for a screen |
| `reserva-service` | `customer-service` | The vehicle exists and belongs to the customer, before creating the booking |
| `reserva-service` | `catalog-service` | The `service_price` row is valid and current, to freeze the price |
| `reserva-service` | `execution-service` | Operator availability for the requested slot |
| `execution-service` | `security-service` | The operator's user account exists |
| `promotion-service` | `reserva-service` | The booking exists before recording a discount against it |
| `promotion-service` | `customer-service` | Eligibility: completed bookings, customer assigned to the promotion |
| `payment-service` | `reserva-service` | The booking exists and what it is worth, before creating the payment |

Service-to-service calls do not pass through the gateway; the caller forwards the user's
token (ADR-006).

### Asynchronous (RabbitMQ)

| Flow | Event | Why it is not a call |
|------|-------|----------------------|
| A confirmed booking has to be assigned | `reserva.confirmed` | The customer gets the confirmation without waiting for an operator to be found (RNF-001) |
| A cancelled booking releases its bay and its assignment | `reserva.cancelled` | The cancellation is already valid on its own |
| The operator starts or finishes a service line | `execution.service_started`, `execution.service_finished` | `reserva-service` moves the booking forward when it hears about it |
| An approved payment adds loyalty points | `payment.approved` | `customer-service` reacts; the payment does not need to wait |
| Anything the user should be told about | every event above, plus `payment.under_review` and `payment.rejected` | `notification-service` builds the notice; the publisher does not know it exists |

The eleven rows of `notification.notification_type` are the reference list: **an event
exists because something reacts to it**, and we do not create events with no consumer.

`audit.audit_log` does **not** travel through the broker. It is written by a database
trigger on each domain table (ADR-003), which is simpler and cannot be skipped.

### Broker topology

| Element | Value |
|---------|-------|
| Exchange | `carwash.events`, type `topic` |
| Routing keys | `<schema>.<event>`, for example `reserva.confirmed`, `execution.service_finished`, `payment.approved` |
| Queues | One per consuming service, bound to the routing keys it needs: `execution.reserva-events`, `reserva.execution-events`, `customer.payment-events`, `notification.events` |
| Dead letter | Exchange `carwash.events.dlx`, with one `<queue>.dlq` per queue |
| Retries | Limited attempts with backoff, then the dead letter queue |
| Acknowledgement | Manual, after the consumer finishes its work |

Events are published **after** the database transaction commits, so no event ever announces
something that was rolled back.

---

## Evaluated alternatives

| Alternative | Pros | Cons | Reason for discarding |
|-------------|------|------|-----------------------|
| **A — Mixed: REST for validations, events for consequences (chosen)** | The user does not wait for side effects; each mechanism used where it fits | Two mechanisms to learn and debug | — (chosen) |
| **B — Synchronous REST only** | Simplest to trace; no broker to run | Confirming a booking would wait for the assignment and the notification, breaking RNF-001; a service being down would break the booking | Contradicts RNF-001 |
| **C — Events for everything, including validations** | Maximum decoupling | A reference cannot be validated with a message the caller does not wait for; the eighteen cross-schema rules would become eventually consistent, and orphan rows would be normal | Unacceptable with no foreign keys to fall back on |
| **D — Chosen option plus the Outbox pattern** | An event is published if and only if its transaction committed | An outbox table, a publisher process and one more moving part in ten services | Not adopted for now — see risks |

The broker is not re-evaluated here: RabbitMQ is fixed by `01-context/overview.md`.

---

## Consequences

**Positive:**

- The eighteen references that the database no longer protects have an explicit owner and
  an explicit moment where they are checked.
- Booking confirmation returns as soon as the booking is stored (RNF-001).
- `reserva-service` does not need to know that `notification-service` exists.

**Negative / Trade-offs:**

- Creating a booking now depends on `customer-service`, `catalog-service` and
  `execution-service` being up. That is the price of validating what the database no
  longer validates.
- A failure has two shapes: an HTTP error the user sees, and an event that ends up in a
  dead letter queue with nobody watching it.
- Debugging a booking that was confirmed but never assigned means reading logs in two
  services and the broker. The correlation id is what makes that possible
  (`cross-cutting.md`).

**Impact on the system:**

- Affected services: all ten.
- Documents that must be updated:
  - `02-domain/domain-events.md` — the delivered catalog still contains events tied to
    branches and to an external payment gateway, and uses routing keys that no longer match
    the schema names.

---

## Pending decisions

- **Where the idempotency record lives.** Delivery is at-least-once, so a consumer can
  receive the same event twice, but `06-data` has no table for processed events. The two
  options are a small `processed_event` table in each consuming schema — a change to
  `06-data` — or relying on state checks (an already assigned booking is not assigned
  again). This has to be closed before the first consumer is built.
- The exact number of retries and the backoff, once there is something running to measure.
- Whether `settings-service` and `audit-service` publish or consume anything at all. Right
  now neither of them appears in any flow.

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| A consumer processes the same event twice and duplicates an assignment or a loyalty accrual | High | High | Idempotency, once the pending decision above is closed; state checks in the meantime |
| The service crashes between the commit and the publish, and the assignment never happens | Low | High | The administrator can assign the operator manually; if it happens more than once, the Outbox of alternative D is adopted |
| Messages pile up in a dead letter queue and nobody notices | Medium | Medium | The queues are reviewed in the RabbitMQ management console before each review session |
| Events are created for flows with no consumer, just because the broker is there | Medium | Low | The eleven notification types are the reference list; a new event needs a consumer and a documented reason |

---

## References

- Cross-service references that must be validated → `06-data/MODELO-DE-DATOS.md`, section 16
- Notification types and what triggers them → `06-data/MODELO-DE-DATOS.md`, section 13
- Complete flows: book, execute, charge, discount → `06-data/MODELO-DE-DATOS.md`, section 14
- Response time and asynchronous side effects → `04-requirements/non-functional.md` (RNF-001)
- Service list → ADR-002
- Schemas and ownership → ADR-003
- Payment verification → ADR-008