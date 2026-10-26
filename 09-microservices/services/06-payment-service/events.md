# Events — Payment Service

## Published

On `carwash.events` (ADR-004) with the common envelope, after the unit of work commits and only
with `MESSAGING_ENABLED=true`. notification-service consumes all of them except `payment.reported` (ADR-011);
booking-service consumes `payment.reported` and `payment.confirmed` (queue `booking.payment-events`, ADR-021). If RabbitMQ
fails the error is logged and the event is lost (no Outbox, ADR-020). `occurredAt` (envelope) is
formatted with .NET's round-trip `"O"` format (`+00:00`). Checked against `origin/develop` on
2026-10-26 (`PaymentReported` added for the payment at booking).

| Event | Routing key | When | Payload |
|---|---|---|---|
| `PaymentReported` | `payment.reported` | The client reports a payment with a receipt (`POST /api/v1/payments` → `Payment.ReportWithReceipt`), also when reporting again after a rejection. A payment the admin registers in person does not publish it (it is born approved) | `paymentId`, `bookingId`, `customerUserId`, `amount` |
| `PaymentConfirmed` | `payment.confirmed` | The admin approves a payment or registers an in-person one | `paymentId`, `bookingId`, `customerUserId`, `amount` |
| `PaymentRejected` | `payment.rejected` | The admin rejects a payment | `paymentId`, `bookingId`, `customerUserId`, `amount`, `reason` |
| `PaymentRefunded` | `payment.refunded` | The admin refunds an approved payment | `paymentId`, `bookingId`, `customerUserId`, `amount` |
| `PromotionRedeemed` | `payment.promotion_redeemed` | The customer redeems a coupon on a booking | `customerUserId`, `bookingId`, `bookingCode`, `promotionCode`, `promotionName`, `discountAmount` |
| `LoyaltyPointsEarned` | `payment.loyalty_points_earned` | Right after `payment.confirmed`, when that payment credits loyalty points | `customerUserId`, `bookingId`, `bookingCode`, `points`, `balance`, `unlockedPromotions[]` (`code`, `name`, `discountPercent`, `requiredPoints`) |

`aggregateId` is the payment id for the four payment events and the booking id for the coupon and
points events. Removing a coupon (`DELETE /api/v1/loyalty/redemptions/{bookingId}/{promotionId}`,
2026-10-23) publishes no event.

`unlockedPromotions` holds the promotions available today whose `requiredPoints` this credit has
just reached (`Promotion.IsUnlockedBy`); it is empty when no coupon unlocks. Only `discountPercent` travels, so a FIXED coupon is announced
without its amount (low, open). A booking whose
services carry no points publishes no `LoyaltyPointsEarned` (ADR-015 section 5).

## Consumed

None.

## Synchronous calls

| Call | Why |
|---|---|
| booking-service `GET /bookings/{id}`, `GET /bookings/me` (client's token) | The booking belongs to the client; its total and status |
| booking-service `GET /admin/bookings/{id}` (admin's token) | Booking data in the admin list, manual payments |

Timeout 5 s. If booking-service does not answer, the operation fails with 503
`BOOKING_SERVICE_UNAVAILABLE`.

Received from booking-service: `GET /internal/v1/payments/bookings/{bookingId}/reported`
(`X-Internal-Key` = `INTERNAL_API_KEY`; the gateway does not route it). `PaymentDeadlineJob` asks it
before cancelling a DIGITAL booking for `PAYMENT_TIMEOUT`, in case `payment.reported` was lost
(ADR-021). Answers `{"bookingId": 123, "reported": true}`; `reported` is true when the booking has a
payment `IN_REVIEW` or `APPROVED`.
