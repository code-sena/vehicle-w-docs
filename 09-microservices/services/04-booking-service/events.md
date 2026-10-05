# Events — Booking Service

Exchange `carwash.events` (topic), ADR-004. Published **after commit**; if RabbitMQ is down the
booking is still saved and the error is logged (the Outbox pattern is not adopted yet).

## Published

| Event | Routing key | When | Payload |
|---|---|---|---|
| `BookingConfirmed` | `booking.confirmed` | A booking is created, or rescheduled | `bookingId`, `bookingCode`, `customerUserId`, `customerVehicleId`, `scheduledStart` (UTC), `serviceBayId` |
| `BookingCancelled` | `booking.cancelled` | Cancelled by the client or the admin | same + `reason` |

`customerUserId` is the client (the caller, or the vehicle owner when the admin books), so
notification-service knows whom to notify without asking booking.

Consumers: notification-service (inbox, push and email; schedules and cancels reminders).

## Consumed

None.

## Synchronous calls

| Call | Why |
|---|---|
| customer-service `GET /vehicles/{id}`, `GET /vehicles` (caller's token) | The vehicle belongs to the client (INV-BOOK-002) and its type sets the price |
| customer-service `GET /admin/vehicles?ids=` (admin's token) | Vehicles and owners in the admin list |

If customer-service does not answer, the operation fails with 503 `CUSTOMER_SERVICE_UNAVAILABLE`:
nothing is booked without validating the vehicle.
