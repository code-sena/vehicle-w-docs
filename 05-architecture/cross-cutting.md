# Cross-Cutting Concerns

**Last updated:** 2026-10-20 (status notes checked against the code)

These rules apply across the six backend services. They are intentionally limited to decisions supported by the current requirements and data model.

## 1. Audit and data lifecycle

Domain tables use the audit block defined in `06-data/modeling-conventions.md`:

| Field | Purpose |
|---|---|
| `created_at`, `created_by` | Creation timestamp and user |
| `updated_at`, `updated_by` | Last update timestamp and user |
| `deleted_at`, `deleted_by` | Logical deletion |
| `row_version` | Optimistic-locking version |

Domain data uses soft delete. The services fill `created_by`, `updated_by` and `deleted_by` with the
user id taken from the JWT (the persistence adapters set them on each write), and the `tr_touch_*`
triggers set `updated_at` and add one to `row_version` on every update.

**Status of `audit.audit_log` (checked 2026-10-20).** The table exists (security-service, migration 002),
but nothing writes to it yet: there is no audit trigger in the changelogs and no service calls
`sp_set_session_context`. The original plan was a trigger that reads `SESSION_CONTEXT(N'user_id')`,
set once per request by a filter in each service:

```sql
EXEC sp_set_session_context @key = N'user_id', @value = @currentUserId;
```

Until that is built, the audit block of each row (who created, updated or deleted it, and when) is the
record of changes. Services do not publish audit events.

## 2. Concurrency

`row_version` is used for optimistic locking. An update includes the version read by the application; if another update already changed the row, the update affects no row and the application reports a conflict. **Status (2026-10-20):** only payment-service enforces it (EF Core maps `row_version` as a concurrency token). The Java services do not map it with `@Version`; booking-service relies on its schedule lock (`sp_getapplock`) and the trigger `tr_booking_bay_overlap` for the conflict that matters most (two bookings for one bay).

Cross-service transactions are not used. A transaction stays inside the schemas owned by one service and is never kept open while waiting for another service.

## 3. Logging

Services write logs to standard output so they can be inspected with Docker. Logs should include timestamp, level, service name and correlation id.

Never log passwords, JWTs, password-reset tokens, receipt contents or unnecessary personal data.

## 4. Correlation id

Target: the API Gateway generates or accepts a correlation id and forwards it; service-to-service HTTP calls and RabbitMQ messages keep the same identifier so a request can be followed across the system.

**Status (2026-10-20):** each service reads `X-Correlation-Id` (or generates one), logs it and returns it (`CorrelationIdFilter`, `CorrelationIdMiddleware` in payment-service). The gateway forwards the header if the client sends one but does not generate it. booking → customer, operations → booking/security and payment → booking forward it; customer → security, notification → security and the RabbitMQ messages do not carry it yet (`13-operations/observability.md`).

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

Events are published after commit. The Outbox pattern is not adopted in the current version (accepted risk H-11, ADR-020).

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

Routing keys built today (checked against `origin/develop` on 2026-10-26 with a script that extracts
the publishers and the bindings from the code; payloads in ADR-011 §17):

| Event (`02-domain/domain-events.md`) | Routing key | Publishing service | Consumers (queue) |
|---|---|---|---|
| `UserRegistered` | `security.user_registered` | `security-service` | customer (`customer-service.events`), notification (`notification-service.events`) |
| `BookingConfirmed` (also on reschedule and when the admin moves a booking back to confirmed) | `booking.confirmed` | `booking-service` | operations (`operations-service.booking-confirmed`), notification |
| `BookingCancelled` (carries `reason` and `reasonCode`) | `booking.cancelled` | `booking-service` | notification |
| `BookingStatusChanged` (admin sets in progress, completed or no-show) | `booking.status_changed` | `booking-service` | notification |
| `OperatorAssigned` (also on reassignment) | `execution.operator_assigned` | `operations-service` | notification |
| `ServiceStarted` | `execution.service_started` | `operations-service` | notification |
| `ServiceCompleted` | `execution.service_completed` | `operations-service` | notification |
| `ServiceNotStarted` | `execution.service_not_started` | `operations-service` | notification |
| `ServiceNotFinished` | `execution.service_not_finished` | `operations-service` | notification |
| `OperatorUnassigned` (rescheduled booking nobody can take, E-12) | `execution.operator_unassigned` | `operations-service` | notification |
| `InspectionShared` | `execution.inspection_shared` | `operations-service` | notification |
| `PaymentReported` (the client reported a payment with a receipt; 2026-10-26, ADR-021) | `payment.reported` | `payment-service` | booking (`booking.payment-events`) |
| `PaymentConfirmed` | `payment.confirmed` | `payment-service` | booking (`booking.payment-events`), notification |
| `PaymentRejected` | `payment.rejected` | `payment-service` | notification |
| `PaymentRefunded` | `payment.refunded` | `payment-service` | notification |
| `PromotionRedeemed` | `payment.promotion_redeemed` | `payment-service` | notification |
| `LoyaltyPointsEarned` | `payment.loyalty_points_earned` | `payment-service` | notification |

17 routing keys are published by four services (security, booking, operations, payment);
customer-service and notification-service publish nothing. notification-service binds 16 of them, all but
`payment.reported` (the `booking.created` binding, which
nobody published, was removed on 2026-10-24, OPS-10); operations and customer have one each, and
booking-service two (`payment.reported` and `payment.confirmed`, since 2026-10-26: a DIGITAL booking with
its payment reported no longer expires, ADR-021). Events of the domain catalog that are not emitted
(`UserAuthenticated`, `BookingModified`, `OperatorReassigned`, `RatingSubmitted`, `PaymentInitiated`,
`LoyaltyPointsRedeemed`, `NotificationCreated`) have no routing key. The security events
`security.user.email-changed`, `security.user.password-changed` and `security.user.deactivated` and the
customer events are raised but only written to the log.

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
  "aggregateId": "id of the aggregate that produced it, as text (user, booking or payment id)",
  "occurredAt": "ISO 8601 timestamp (Java: Instant.toString(); payment: DateTimeOffset 'O', e.g. +00:00)",
  "version": 1,
  "payload": { "...": "event-specific fields" }
}
```

| Concern | Current rule |
|---|---|
| Delivery | At least once should be assumed by consumers |
| Acknowledgement | After successful processing |
| Retry | customer-service, booking-service and notification-service retry a failed message 3 times (first wait 1 s); operations-service 3 times too (2 s, then 4 s) and rethrows the transient failures (booking, security or the database not answering) so they are retried (OPS-04) |
| Dead letter | Then the message goes, through the direct exchange `carwash.events.dlx`, to `customer-service.events.dlq`, `notification-service.events.dlq`, `operations-service.booking-confirmed.dlq` or `booking.payment-events.dlq`. The old operations queue `operations-service.events` (no DLX) is drained into the new one and deleted when operations starts |
| Idempotency | A consumer checks `eventId` against its own processed-events record before acting, in the same transaction as the work it does (implemented in notification-service, `processed_event`; customer-service checks whether the profile exists; booking-service sets `payment_reported_at` only once, so a repeated payment notice changes nothing) |
| Publisher confirms | operations-service only (OPS-04): `correlated` confirms and mandatory publishing; a nack or an unroutable event goes to the log. Sharing an inspection waits for the confirm (503 `NOTIFICATION_NOT_SENT` otherwise) |
| Outbox | Not adopted in this version (H-11, ADR-020): a publish that fails is only logged. notification-service has its own outbox for delivery only: `pending_delivery` (migration 047) retries push and email up to 5 times (OPS-05) |

A new event should have a documented consumer and a reason to exist.

## 8. File uploads

Two kinds of business file are built, and neither is logged:

- Payment receipts and payment-account QR codes: sent as a base64 data URL (PNG, JPEG, WebP or GIF;
  SVG and external links are rejected, `ImageSource`) and stored in the payment tables.
- Inspection photos: multipart upload, JPEG or PNG, up to 2 MB each and 5 per finding, stored as bytes
  in `execution.inspection_photo`.

There is no separate file storage yet.

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
