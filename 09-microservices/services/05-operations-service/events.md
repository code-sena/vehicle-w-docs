# Events — Operations Service

Exchange `carwash.events` (topic), ADR-004. Published **after commit**; with
`MESSAGING_ENABLED=false` they only go to the log.

## Published

| Event | Routing key | When | Payload |
|---|---|---|---|
| `OperatorAssigned` | `execution.operator_assigned` | The admin assigns or changes the operator of a booking | `bookingId`, `bookingCode`, `customerUserId`, `operatorUserId`, `scheduledStart` (UTC), `occurredAt` |
| `ServiceStarted` | `execution.service_started` | The operator starts the service | same |
| `ServiceCompleted` | `execution.service_completed` | The operator finishes the service | same |

Consumers: notification-service (notifies the operator and the client).

## Consumed

None.

## Synchronous calls

| Call | Why |
|---|---|
| booking-service `GET /admin/bookings/{id}`, `GET /admin/bookings?from=&to=` (admin's token) | Booking to assign and the other bookings of the day (busy operators) |
| booking-service `GET /operator/bookings/{id}`, `GET /operator/bookings` (operator's token) | Operator's services |
| booking-service `PATCH /operator/bookings/{id}/status` | Move the booking to `IN_PROGRESS` / `COMPLETED` |
| booking-service `GET /bookings/{id}`, `GET /bookings/me` (client's token) | The client rates only their own completed booking |
| security-service `GET /admin/users?role=OPERATOR` (admin's token) | Operator accounts, names and contact |

If booking-service does not answer, the operation fails with 503 `BOOKING_SERVICE_UNAVAILABLE`.
