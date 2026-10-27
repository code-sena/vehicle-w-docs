# Sequence — Payment by receipt, review, manual payment and refund (RF-013, RF-013b, RF-014, RF-016)

Source: `payment-service` `PaymentCommandService.ReportAsync / ApproveAsync / RejectAsync /
RegisterInPersonAsync / RefundAsync` (input port `IPaymentCommandUseCases`), `BookingPaymentGuard`,
`AmountDueCalculator`, `LoyaltyRewardService`, `Payment` aggregate, `BookingServiceDirectory`
(ADR-008, ADR-013); booking-service `PaymentEventsListener` and `PaymentDeadlineJob`, payment-service
`InternalPaymentsController` (ADR-021). Checked against the code on 2026-10-19, `payment.reported` and the
internal check added on 2026-10-27.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    actor A as Admin
    participant W as Web / app (through the gateway)
    participant P as payment-service (.NET)
    participant B as booking-service
    participant DB as SQL Server (payment, promotion)
    participant MQ as RabbitMQ (carwash.events)

    C->>W: Pay service
    W->>P: GET /api/v1/payment-accounts
    P-->>W: active accounts (holder, number, QR, instructions), no cash for a DIGITAL booking
    C->>C: Pays from the bank app (outside the platform)
    C->>W: Account, transaction reference, receipt image
    W->>P: POST /api/v1/payments
    P->>B: GET /bookings/{id} (client JWT + X-Correlation-Id)
    B-->>P: status, total, owner, loyalty points
    P->>DB: approved or open payment? reference behind another live payment? coupons applied?
    alt payable, no approved/open payment, reference not reused
        P->>P: amount = booking total − coupons (PaymentPolicy.AmountDue)
        P->>DB: payment PENDING + receipt → IN_REVIEW
        P-->>W: 201 payment IN_REVIEW
        P->>MQ: payment.reported (PaymentReported), after commit
        MQ-)B: payment.reported (queue booking.payment-events)
        B->>B: payment_reported_at = now, the payment deadline stops
    else not payable / already reported / already approved / reference reused
        P-->>W: 409 BOOKING_NOT_PAYABLE | PAYMENT_ALREADY_REPORTED | PAYMENT_ALREADY_APPROVED | TRANSACTION_REFERENCE_REUSED
    end

    A->>W: Payments → Verify
    W->>P: GET /api/v1/admin/payments?status=IN_REVIEW
    P->>B: GET /admin/bookings/{id} (admin JWT) per payment
    P-->>W: payments with booking data and the receipt
    alt approve
        W->>P: POST /api/v1/admin/payments/{id}/approve
        P->>DB: APPROVED, approved_by, processed_at (unique index: one per booking)
        P->>DB: loyalty_transaction EARNED (points of the booking lines, once per booking)
        P->>MQ: payment.confirmed
        P->>MQ: payment.loyalty_points_earned (balance and coupons unlocked)
        MQ-)B: payment.confirmed (same queue)
    else reject
        W->>P: POST /api/v1/admin/payments/{id}/reject {reason}
        P->>DB: REJECTED + reason (the client can report again, same reference allowed)
        P->>MQ: payment.rejected
    end

    A->>W: Payments → Manual entry (cash at the shop)
    W->>P: GET /api/v1/admin/payments/amount-due?bookingId=
    W->>P: POST /api/v1/admin/payments {bookingId, paymentAccountId}
    P->>B: GET /admin/bookings/{id}
    P->>DB: payment APPROVED at once (amount = amount due) + points EARNED
    P->>MQ: payment.confirmed, payment.loyalty_points_earned

    A->>W: Payments → Refund
    W->>P: POST /api/v1/admin/payments/{id}/refund
    P->>DB: REFUNDED + loyalty_transaction REVERSED (the points the booking still has)
    P->>MQ: payment.refunded
    Note over MQ: notification-service turns each payment.* event into<br/>an inbox message, push and email for the client

    Note over P,B: A DIGITAL booking past its deadline without payment_reported_at (lost event)
    B->>P: GET /internal/v1/payments/bookings/{id}/reported (X-Internal-Key)
    P->>DB: a payment IN_REVIEW or APPROVED for the booking?
    P-->>B: 200 {bookingId, reported}
```

The coupon applied before paying is in [seq-loyalty-coupon](./seq-loyalty-coupon.md). What booking does
with the answer of the internal check (keep the booking or cancel it with `PAYMENT_TIMEOUT`) is in
[seq-booking](./seq-booking.md). booking also takes `payment.confirmed` from the same queue and sets
`payment_reported_at` if it was still empty. Paths and bodies: `07-api/contracts/openapi/payment-service.yaml`.
