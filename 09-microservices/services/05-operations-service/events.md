# Events — Operations Service

Exchange `carwash.events` (topic), ADR-004. Published **after commit**; with
`MESSAGING_ENABLED=false` they only go to the log.

## Published

| Event | Routing key | When | Payload |
|---|---|---|---|
| `OperatorAssigned` | `execution.operator_assigned` | The automatic assignment picks an operator, or the admin assigns or changes it | `bookingId`, `bookingCode`, `customerUserId`, `operatorUserId`, `scheduledStart` (UTC), `occurredAt` |
| `ServiceStarted` | `execution.service_started` | The operator starts the service | same |
| `ServiceCompleted` | `execution.service_completed` | The operator finishes the service | same |
| `InspectionShared` | `execution.inspection_shared` | The admin shares a published inspection report | `bookingId`, `bookingCode`, `customerUserId`, `plate`, `publicToken`, `phasesDone`, `phasesTotal`, `findings`, `majorFindings`, `areas`, `occurredAt` |

Consumers: notification-service (notifies the operator and the client).

## Consumed

| Routing key | Event | What operations does |
|---|---|---|
| `booking.confirmed` | `BookingConfirmed` | Assigns a free operator when the booking has none (RF-008), honouring `preferredOperatorId` (RF-010). Queue `operations-service.events`; never requeues (ADR-014 §10) |

## Synchronous calls

| Call | Why |
|---|---|
| booking-service `GET /admin/bookings/{id}`, `GET /admin/bookings?from=&to=` (admin's token) | Booking to assign and the other bookings of the day (busy operators) |
| booking-service `GET /operator/bookings/{id}`, `GET /operator/bookings` (operator's token) | Operator's services |
| booking-service `PATCH /operator/bookings/{id}/status` | Move the booking to `IN_PROGRESS` / `COMPLETED` |
| booking-service `GET /bookings/{id}`, `GET /bookings/me` (client's token) | The client rates only their own completed booking |
| security-service `GET /admin/users?role=OPERATOR` (admin's token) | Operator accounts, names and contact |
| booking-service `GET /internal/v1/bookings/{id}`, `/internal/v1/bookings?from=&to=` (`X-Internal-Key`) | The booking and the day's bookings in the automatic assignment (no user token) |
| security-service `GET /internal/v1/users/{id}/contact` (`X-Internal-Key`) | First names in ratings and services; skip disabled accounts in the automatic assignment; check an operator account exists before creating its row |

If booking-service does not answer, the operation fails with 503 `BOOKING_SERVICE_UNAVAILABLE`.
