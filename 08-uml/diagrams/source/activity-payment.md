# Activity — Paying a booking and reviewing the payment (CU12, CU13, CU25)

Built from `payment-service` (`PaymentCommandService`, `CustomerPromotionService`, `PaymentPolicy`) and the
payment screens of the web and app. Sequences: [seq-payment](./seq-payment.md),
[seq-loyalty-coupon](./seq-loyalty-coupon.md). Checked on 2026-10-19.

```mermaid
flowchart TD
    start((Start)) --> payable{Booking CONFIRMED,<br/>IN_PROGRESS or COMPLETED<br/>and no open or approved payment?}
    payable -- no --> nopay[The Pay button is not shown] --> stop((End))
    payable -- yes --> coupon{Apply a coupon?}
    coupon -- yes --> redeem[Type the code]
    redeem --> valid{Valid: dates, points,<br/>minimum, limits?}
    valid -- no --> msg[Message with the reason] --> coupon
    valid -- yes --> due[Amount due = total − coupons]
    coupon -- no --> due
    due --> where{Where does the client pay?}
    where -- "at the shop (cash)" --> cash[Admin registers the payment in person<br/>with the amount due]
    cash --> approved
    where -- "Nequi, Daviplata, transfer" --> acc[Choose the account<br/>holder, number, QR]
    acc --> bank[Pay from the bank app]
    bank --> upload[Upload the receipt + reference]
    upload --> reused{Reference used on<br/>another booking?}
    reused -- yes --> refmsg[409 TRANSACTION_REFERENCE_REUSED] --> upload
    reused -- no --> review[Payment IN_REVIEW]
    review --> admin{Admin compares the receipt<br/>with the account}
    admin -- reject with a reason --> rejected[REJECTED<br/>client notified] --> upload
    admin -- approve --> approved[APPROVED<br/>loyalty points credited]
    approved --> notify[Client notified: payment confirmed,<br/>points earned, coupons unlocked]
    notify --> refund{Refund later?}
    refund -- yes --> refunded[REFUNDED<br/>points reversed, client notified] --> stop
    refund -- no --> stop
```
