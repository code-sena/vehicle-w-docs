# Events — Operations Service

Exchange `carwash.events` (topic), ADR-004. Published **after commit**; with
`MESSAGING_ENABLED=false` they only go to the log. If RabbitMQ fails the error is logged and the
event is lost (no Outbox, ADR-020). Checked against `origin/develop` on 2026-10-23.

## Published

| Event (`eventType`) | Routing key | When | Payload |
|---|---|---|---|
| `OperatorAssigned` | `execution.operator_assigned` | The automatic assignment picks an operator, or the admin assigns or changes it | `bookingId`, `bookingCode`, `customerUserId`, `operatorUserId`, `scheduledStart` (UTC) |
| `ServiceStarted` | `execution.service_started` | The operator starts the service | same |
| `ServiceCompleted` | `execution.service_completed` | The operator finishes the service | same |
| `ServiceNotStarted` | `execution.service_not_started` | Follow-up job: a booking with an operator reached its end time and was never started; once per booking (`follow_up_notice_at`) | same |
| `ServiceNotFinished` | `execution.service_not_finished` | Follow-up job: started and never finished, end + margin (60 min) passed; once per booking | same |
| `InspectionShared` | `execution.inspection_shared` | The admin shares a published inspection report | `bookingId`, `bookingCode`, `customerUserId`, `plate`, `publicToken`, `phasesDone`, `phasesTotal`, `findings`, `majorFindings`, `areas` |

`occurredAt` travels in the envelope (`{eventId, eventType, aggregateId, occurredAt, version,
payload}`), not in the payload; `aggregateId` is the booking id. Closing a booking as attended
(`POST /admin/assignments/{bookingId}/attended`) publishes nothing: a `ServiceCompleted` hours later
would tell the client to pick up the car.

Consumer: notification-service only (operator, client and, for the two follow-up events, every
active administrator).

## Consumed

| Routing key | Event | What operations does |
|---|---|---|
| `booking.confirmed` | `BookingConfirmed` | Assigns a free operator when the booking has none (RF-008), honouring `preferredOperatorId` (RF-010); on a reschedule keeps the operator only if they still fit (E-12). Queue `operations-service.events`, **no DLQ**: the listener is idempotent, logs a failure and never requeues (ADR-014 §10) |

## Synchronous calls

| Call | Why |
|---|---|
| booking-service `GET /admin/bookings/{id}`, `GET /admin/bookings?from=&to=` (admin's token) | Booking to assign and the other bookings of the day (busy operators) |
| booking-service `GET /operator/bookings/{id}`, `GET /operator/bookings` (operator's token + `X-Internal-Key`) | Operator's services (E-01: booking requires the key and the gateway no longer routes these paths) |
| booking-service `PATCH /operator/bookings/{id}/status` (operator's token + `X-Internal-Key`) | Move the booking to `IN_PROGRESS` / `COMPLETED` |
| booking-service `GET /bookings/{id}`, `GET /bookings/me` (client's token) | The client rates only their own completed booking |
| booking-service `GET /internal/v1/bookings/{id}`, `/internal/v1/bookings?from=&to=` (`X-Internal-Key`) | The booking and the day's bookings in the automatic assignment and the follow-up job (no user token) |
| booking-service `POST /internal/v1/bookings/{id}/no-show` (`X-Internal-Key`) | Follow-up job: close a booking that never had an operator |
| security-service `GET /admin/users?role=OPERATOR` (admin's token) | Operator accounts, names and contact |
| security-service `GET /internal/v1/users/{id}/contact` (`X-Internal-Key`) | First names in ratings and services; skip disabled accounts in the automatic and manual assignment (A-13); check an operator account exists before creating its row |

If booking-service does not answer, the operation fails with 503 `BOOKING_SERVICE_UNAVAILABLE`.
Without `INTERNAL_API_KEY` the operator cannot start or finish a service (503) and there is no
automatic assignment.
