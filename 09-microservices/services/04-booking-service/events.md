# Events — Booking Service

Exchange `carwash.events` (topic), ADR-004. Published **after commit**; if RabbitMQ is down the
booking is still saved and the error is logged (the Outbox pattern is not adopted yet). Checked
against `origin/develop` on 2026-10-24.

## Published

| Event | Routing key | When | Payload |
|---|---|---|---|
| `BookingConfirmed` | `booking.confirmed` | A booking is created, rescheduled, or moved back to `CONFIRMED` by the admin | `bookingId`, `bookingCode`, `customerUserId`, `customerVehicleId`, `scheduledStart` (UTC), `serviceBayId`, and `preferredOperatorId` when the client chose one (RF-010, only on creation) |
| `BookingCancelled` | `booking.cancelled` | Cancelled by the client or the admin with the chosen reason (A-20; without one, `CUSTOMER_REQUEST`). The expiry job that cancelled `SCHEDULED` bookings was removed (B-07, 2026-10-24) | same + `reason` (the reason's display name, in Spanish) + `reasonCode` (its stable code, A-20/OPS-10) |
| `BookingStatusChanged` | `booking.status_changed` | The admin moves the booking to `IN_PROGRESS`, `COMPLETED` or `NO_SHOW` from the panel (A-11, 2026-10-23) | same + `status` (no `reasonCode`) |

`eventType` is the event name (`BookingConfirmed`…); `occurredAt` travels in the envelope, not in
the payload. The operator's start and finish (through operations-service) publish nothing here:
operations announces them as `ServiceStarted`/`ServiceCompleted`.

`customerUserId` is the client (the caller, or the vehicle owner when the admin books), so
notification-service knows whom to notify without asking booking.

Consumers: notification-service (all three: inbox, push and email; schedules and cancels reminders,
also for `BookingStatusChanged` since A-11) and operations-service (`booking.confirmed` only: automatic
assignment, ADR-014 §10).

## Consumed

None.

## Synchronous calls

| Call | Why |
|---|---|
| customer-service `GET /vehicles/{id}`, `GET /vehicles` (caller's token) | The vehicle belongs to the client (INV-BOOK-002) and its type sets the price |
| customer-service `GET /admin/vehicles?ids=` (admin's token) | Vehicles and owners in the admin list |

Received from operations-service: `/internal/v1/bookings`, `/internal/v1/bookings/{id}`,
`POST /internal/v1/bookings/{id}/no-show` (`X-Internal-Key`; publishes no event — low, open) and, with
the operator's token **and** the key, `/api/v1/operator/bookings/**` (E-01: the gateway no longer routes it).

Received from customer-service: `GET /internal/v1/bookings/active-count?customerVehicleId=`
(`X-Internal-Key`), before a vehicle is removed (BIZ-08).

If customer-service does not answer, the operation fails with 503 `CUSTOMER_SERVICE_UNAVAILABLE`:
nothing is booked without validating the vehicle. A 4xx from customer is passed through with its
code (403 `FORBIDDEN`, 409, 400 `CUSTOMER_NOT_PROVISIONED`…) instead of a 503 (BIZ-13).
