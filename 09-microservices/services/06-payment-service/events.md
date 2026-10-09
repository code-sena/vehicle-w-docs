# Events — Payment Service

## Published

On `carwash.events` (ADR-004) with the common envelope, after the unit of work commits and only
with `MESSAGING_ENABLED=true`. notification-service consumes all of them (ADR-011).

| Event | Routing key | When | Payload |
|---|---|---|---|
| `PaymentConfirmed` | `payment.confirmed` | The admin approves a payment or registers an in-person one | `customerUserId`, `paymentId`, `amount` |
| `PaymentRejected` | `payment.rejected` | The admin rejects a payment | `customerUserId`, `paymentId`, `amount`, `reason` |
| `PaymentRefunded` | `payment.refunded` | The admin refunds an approved payment | `customerUserId`, `paymentId`, `amount` |
| `PromotionRedeemed` | `payment.promotion_redeemed` | The customer redeems a coupon on a booking | `customerUserId`, `bookingId`, `bookingCode`, `promotionName`, `discountAmount` |
| `LoyaltyPointsEarned` | `payment.loyalty_points_earned` | Right after `payment.confirmed`, when that payment credits loyalty points | `customerUserId`, `bookingId`, `bookingCode`, `points`, `balance`, `unlockedPromotions[]` (`code`, `name`, `discountPercent`, `requiredPoints`) |

`unlockedPromotions` holds the promotions available today whose `requiredPoints` this credit has
just reached (`Promotion.IsUnlockedBy`); it is empty when no coupon unlocks. A booking whose
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
