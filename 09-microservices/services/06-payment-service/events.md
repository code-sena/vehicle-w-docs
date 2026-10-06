# Events — Payment Service

## Published

None yet. The `Payment` aggregate raises domain events, but there is no RabbitMQ publisher:

| Domain event | When | Status |
|---|---|---|
| `PaymentApproved` | The admin approves a payment (or registers a manual one) | Raised, not published |
| `PaymentRejected` | The admin rejects a payment | Raised, not published |
| `PaymentRefunded` | The admin refunds an approved payment | Raised, not published |

Pending: publish them on `carwash.events` (ADR-004) so notification-service can tell the client,
and loyalty points can be earned on `PaymentApproved`. notification-service is already bound to
the routing keys **`payment.confirmed`** and **`payment.rejected`**, so the publisher must use
those keys (not `payment.approved`).

## Consumed

None.

## Synchronous calls

| Call | Why |
|---|---|
| booking-service `GET /bookings/{id}`, `GET /bookings/me` (client's token) | The booking belongs to the client; its total and status |
| booking-service `GET /admin/bookings/{id}` (admin's token) | Booking data in the admin list, manual payments |

Timeout 5 s. If booking-service does not answer, the operation fails with 503
`BOOKING_SERVICE_UNAVAILABLE`.
