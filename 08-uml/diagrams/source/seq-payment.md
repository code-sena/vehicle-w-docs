# Sequence — Payment by receipt, review, manual payment and refund (RF-013, RF-013b, RF-014, RF-016)

Source: `payment-service` `PaymentCommandService.ReportAsync / ApproveAsync / RejectAsync /
RegisterInPersonAsync / RefundAsync` (input port `IPaymentCommandUseCases`), `BookingPaymentGuard`,
`AmountDueCalculator`, `LoyaltyRewardService`, `Payment` aggregate, `BookingServiceDirectory`
(ADR-008, ADR-013). Checked against the code on 2026-10-19.

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
    P-->>W: active accounts (holder, number, QR, instructions)
    C->>C: Pays from the bank app (outside the platform)
    C->>W: Account, transaction reference, receipt image
    W->>P: POST /api/v1/payments
    P->>B: GET /bookings/{id} (client JWT + X-Correlation-Id)
    B-->>P: status, total, owner, loyalty points
    P->>DB: approved or open payment? reference used on another booking? coupons applied?
    alt payable, no approved/open payment, reference not reused
        P->>P: amount = booking total − coupons (PaymentPolicy.AmountDue)
        P->>DB: payment PENDING + receipt → IN_REVIEW
        P-->>W: 201 payment IN_REVIEW
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
```

The coupon applied before paying is in [seq-loyalty-coupon](./seq-loyalty-coupon.md). Paths and
bodies: `07-api/contracts/openapi/payment-service.yaml`.
