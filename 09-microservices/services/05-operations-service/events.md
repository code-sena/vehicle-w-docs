# Events — Operations Service

Exchange `carwash.events` (topic), ADR-004. Published **after commit**; with
`MESSAGING_ENABLED=false` they only go to the log. If RabbitMQ fails the error is logged and the
event is lost (no Outbox, ADR-020). Since OPS-04 the publisher uses publisher confirms
(`correlated`) and mandatory publishing: a nack or an unroutable event is logged (still no retry).
Checked against `origin/develop` on 2026-10-24.

## Published

| Event (`eventType`) | Routing key | When | Payload |
|---|---|---|---|
| `OperatorAssigned` | `execution.operator_assigned` | The automatic assignment picks an operator, or the admin assigns or changes it | `bookingId`, `bookingCode`, `customerUserId`, `operatorUserId`, `scheduledStart` (UTC) |
| `ServiceStarted` | `execution.service_started` | The operator starts the service | same |
| `ServiceCompleted` | `execution.service_completed` | The operator finishes the service | same |
| `ServiceNotStarted` | `execution.service_not_started` | Follow-up job: a booking with an operator reached its end time and was never started; once per booking (`follow_up_notice_at`) | same |
| `ServiceNotFinished` | `execution.service_not_finished` | Follow-up job: started and never finished, end + margin (60 min) passed; once per booking | same |
| `OperatorUnassigned` | `execution.operator_unassigned` | A rescheduled booking no longer fits its operator and nobody else is free: the pending executions are deleted and the booking is left without operator (E-12, 2026-10-24) | same; `operatorUserId` is the operator who lost it |
| `InspectionShared` | `execution.inspection_shared` | The admin shares a published inspection report; the request waits for the broker's confirm and answers 503 `NOTIFICATION_NOT_SENT` without it (OPS-08) | `bookingId`, `bookingCode`, `customerUserId`, `plate`, `publicToken`, `phasesDone`, `phasesTotal`, `findings`, `majorFindings`, `areas` |

`occurredAt` travels in the envelope (`{eventId, eventType, aggregateId, occurredAt, version,
payload}`), not in the payload; `aggregateId` is the booking id. Closing a booking as attended
(`POST /admin/assignments/{bookingId}/attended`) publishes nothing: a `ServiceCompleted` hours later
would tell the client to pick up the car.

Consumer: notification-service only (operator, client and, for the two follow-up events and
`OperatorUnassigned`, every active administrator).

## Consumed

| Routing key | Event | What operations does |
|---|---|---|
| `booking.confirmed` | `BookingConfirmed` | Assigns a free operator when the booking has none (RF-008), honouring `preferredOperatorId` (RF-010); on a reschedule keeps the operator only if they still fit, otherwise publishes `OperatorUnassigned` (E-12). Queue `operations-service.booking-confirmed`, DLQ `operations-service.booking-confirmed.dlq` through `carwash.events.dlx` (OPS-04): transient failures (booking, security or the database not answering) are rethrown, retried 3 times (2 s, 4 s) and then dead-lettered. The old `operations-service.events` is drained into the new queue and deleted on start (`LegacyQueueMigration`) |

## Synchronous calls

| Call | Why |
|---|---|
| booking-service `GET /admin/bookings/{id}`, `GET /admin/bookings?from=&to=` (admin's token) | Booking to assign and the other bookings of the day (busy operators) |
| booking-service `GET /operator/bookings/{id}`, `GET /operator/bookings` (operator's token + `X-Internal-Key`) | Operator's services (E-01: booking requires the key and the gateway no longer routes these paths) |
| booking-service `PATCH /operator/bookings/{id}/status` (operator's token + `X-Internal-Key`) | Move the booking to `IN_PROGRESS` / `COMPLETED` |
| booking-service `GET /bookings/{id}`, `GET /bookings/me` (client's token) | The client rates only their own completed booking |
| booking-service `GET /internal/v1/bookings/{id}`, `/internal/v1/bookings?from=&to=` (`X-Internal-Key`) | The booking and the day's bookings in the automatic assignment and the follow-up job (no user token) |
| booking-service `POST /internal/v1/bookings/{id}/no-show` (`X-Internal-Key`) | Follow-up job: close a booking that never had an operator |
| security-service `GET /admin/users?role=OPERATOR` (admin's token) | Operator accounts, names and contact; every page is read (OPS-12) |
| security-service `GET /internal/v1/users/{id}/contact` (`X-Internal-Key`) | First names in ratings and services; skip disabled accounts in the automatic and manual assignment (A-13, fails closed: if security does not answer, 503 `SECURITY_SERVICE_UNAVAILABLE` and no assignment); check an operator account exists before creating its row. Both assignments call booking and security **before** taking `sp_getapplock` (OPS-11) |

If booking-service does not answer, the operation fails with 503 `BOOKING_SERVICE_UNAVAILABLE`.
Without `INTERNAL_API_KEY` the operator cannot start or finish a service (503) and there is no
automatic assignment.
