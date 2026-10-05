# Cross-Cutting Concerns

**Last updated:** 2026-09-24

These rules apply across the six backend services. They are intentionally limited to decisions supported by the current requirements and data model.

## 1. Audit and data lifecycle

Domain tables use the audit block defined in `06-data/modeling-conventions.md`:

| Field | Purpose |
|---|---|
| `created_at`, `created_by` | Creation timestamp and user |
| `updated_at`, `updated_by` | Last update timestamp and user |
| `deleted_at`, `deleted_by` | Logical deletion |
| `row_version` | Optimistic-locking version |

Domain data uses soft delete. `audit.audit_log` records changes through database triggers. Services do not publish audit events as a replacement for this database-level audit.

**How `changed_by` gets filled.** The trigger reads `SESSION_CONTEXT(N'user_id')`, which is empty unless something sets it first. Every service sets it at the start of each request, before touching any table:

```sql
EXEC sp_set_session_context @key = N'user_id', @value = @currentUserId;
```

`@currentUserId` comes from the authenticated JWT (`ADR-006`), read once per request — not per query. This has to happen in one shared place per service (a filter or interceptor), not copied into every use case by hand; ADR-009 flagged forgetting this as a real, High-probability risk, since a missed request just leaves `changed_by` NULL with no error to notice it by.

## 2. Concurrency

`row_version` is used for optimistic locking. An update includes the version read by the application; if another update already changed the row, the update affects no row and the application reports a conflict. **Status (2026-10-04):** not enforced yet — no service maps `row_version` with `@Version`; booking-service relies on its schedule lock (`sp_getapplock`) for the only conflict that matters today (two bookings for one bay).

Cross-service transactions are not used. A transaction stays inside the schemas owned by one service and is never kept open while waiting for another service.

## 3. Logging

Services write logs to standard output so they can be inspected with Docker. Logs should include timestamp, level, service name and correlation id.

Never log passwords, JWTs, password-reset tokens, receipt contents or unnecessary personal data.

## 4. Correlation id

Target: the API Gateway generates or accepts a correlation id and forwards it; service-to-service HTTP calls and RabbitMQ messages keep the same identifier so a request can be followed across the system.

**Status (2026-10-04):** each service reads `X-Correlation-Id` (or generates one), logs it and returns it (`CorrelationIdFilter`). The gateway forwards the header if the client sends one but does not generate it, booking-service forwards it on its calls to customer-service (since 2026-10-03); the other REST calls (customer → security, notification → security) and RabbitMQ messages do not carry it yet (`13-operations/observability.md`).

The project does not currently include a distributed tracing platform.

## 5. Error handling

The detailed API contract belongs to `07-api`. The architecture uses these HTTP categories:

| Status | Meaning |
|---:|---|
| 400 | Invalid request or input |
| 401 | Missing, invalid or expired authentication |
| 403 | Authenticated but not authorised |
| 404 | Resource not found |
| 409 | Current-state conflict |
| 422 | Valid resource but invalid for the requested operation |
| 500 | Unexpected server error |

Error codes should be stable and should not expose stack traces or sensitive information.

Validation has three layers:

1. Input validation in the REST adapter.
2. Cross-service reference validation before writing.
3. Domain invariants inside the domain/application layer.

## 6. Transactions

Each use case opens one local transaction. The transaction may write multiple schemas only when those schemas belong to the same service.

A booking and a payment are not one database transaction because they belong to different services. Their consistency is achieved through application validation and events, not a cross-service transaction.

Events are published after commit. The Outbox pattern is not adopted in the current version.

## 7. Messaging

RabbitMQ provides asynchronous communication.

**Topology.** One topic exchange, `carwash.events`, shared by all six services. A
topic exchange (not a separate exchange per service) keeps this simple for a
team of three, and a topic exchange still lets a service subscribe to only the
routing keys it actually needs. The queue per consuming service is bound to
the specific routing keys in the table below.

**Routing key convention:** `<owning-schema>.<event-in-snake-case>` — the
schema prefix matches `06-data`/`ADR-003` ownership directly, so the same name
tells you both the queue to bind and which service's database the fact came
from.

| Event (`02-domain/domain-events.md`) | Routing key | Publishing service |
|---|---|---|
| `UserRegistered` | `security.user_registered` | `security-service` |
| `UserAuthenticated` | `security.user_authenticated` | `security-service` |
| `BookingCreated` | `booking.created` | `booking-service` |
| `BookingConfirmed` | `booking.confirmed` | `booking-service` |
| `BookingModified` | `booking.modified` | `booking-service` |
| `BookingCancelled` | `booking.cancelled` | `booking-service` |
| `OperatorAssigned` | `execution.operator_assigned` | `operations-service` |
| `OperatorReassigned` | `execution.operator_reassigned` | `operations-service` |
| `ServiceStarted` | `execution.service_started` | `operations-service` |
| `ServiceCompleted` | `execution.service_completed` | `operations-service` |
| `RatingSubmitted` | `execution.rating_submitted` | `operations-service` |
| `PaymentInitiated` | `payment.initiated` | `payment-service` |
| `PaymentConfirmed` | `payment.confirmed` | `payment-service` |
| `PaymentRejected` | `payment.rejected` | `payment-service` |
| `PromotionApplied` | `payment.promotion_applied` | `payment-service` (planned) |
| `LoyaltyPointsEarned` | `payment.loyalty_points_earned` | `payment-service` (planned) |
| `LoyaltyPointsRedeemed` | `payment.loyalty_points_redeemed` | `payment-service` (planned) |
| `NotificationCreated` | `notification.created` | `notification-service` |

`execution.*` is used for operator/service-execution events (including
rating, since it physically lives on `service_execution`) rather than
`operations.*`, to keep the prefix matching the schema name directly instead
of introducing a second name for the same thing.

**Envelope.** Every message on `carwash.events` carries this shape; only
`payload` differs per event — its business fields are the "Important
information" list already given for that event in `domain-events.md`.

```json
{
  "eventId": "uuid — the idempotency key for consumers",
  "eventType": "PascalCase event name, e.g. BookingConfirmed",
  "aggregateId": "uuid of the aggregate that produced it",
  "occurredAt": "ISO 8601 timestamp",
  "version": 1,
  "payload": { "...": "event-specific fields" }
}
```

| Concern | Current rule |
|---|---|
| Delivery | At least once should be assumed by consumers |
| Acknowledgement | After successful processing |
| Retry | Limited retries with backoff are proposed |
| Dead letter | Failed messages should be retained for review |
| Idempotency | A consumer checks `eventId` against its own processed-events record before acting, in the same transaction as the work it does (implemented in notification-service, `processed_event`; customer-service checks whether the profile exists) |
| Outbox | Not adopted in this version |

A new event should have a documented consumer and a reason to exist.

## 8. File uploads

The only business file currently identified is the payment receipt. The file must not be logged. Size, accepted image formats and final storage location remain implementation details to be closed before the payment upload is built.

## 9. Configuration and secrets

Environment-specific values must be supplied through environment variables or local environment configuration. Real secrets must not be committed.

Relevant configuration includes SQL Server connection details, RabbitMQ credentials and the JWT signing secret.

## 10. Time and language

SQL Server timestamps are stored in UTC using `DATETIME2(3)`. The clients convert them for display in the Colombian local context.

The backend should return stable error/event codes rather than hard-coded user-facing translations. Final API localisation details belong to `07-api`.

## 11. Deliberately not adopted

The current architecture does not require:

- Redis
- a distributed tracing platform
- a metrics/alerting stack
- CQRS
- Event Sourcing
- a service mesh
- a BFF
- a separate database per service
- a payment gateway

These technologies may be considered in a future version if a concrete requirement appears.

## References

- Data conventions → `06-data/modeling-conventions.md`
- Cross-service references → `06-data/models.md`
- Communication → `decisions/records/ADR-004-service-communication.md`
- Authentication → `decisions/records/ADR-006-authentication-and-authorization.md`
