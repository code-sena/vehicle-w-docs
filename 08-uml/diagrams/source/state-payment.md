# State — Payment lifecycle (RF-013b, RF-014, ADR-008)

Source: `payment-service` `Payment` aggregate (`SubmitForReview`, `Approve`, `Reject`, `Refund`),
`PaymentStatus`, seed `payment.payment_status`.

```mermaid
stateDiagram-v2
    [*] --> PENDING : Create (amount = booking total)
    PENDING --> PENDING : AttachReceipt
    PENDING --> IN_REVIEW : SubmitForReview (needs at least one receipt)
    IN_REVIEW --> APPROVED : Approve (admin)
    IN_REVIEW --> REJECTED : Reject (admin, reason ≤ 200)
    APPROVED --> REFUNDED : Refund (admin)
    REJECTED --> [*]
    REFUNDED --> [*]
    APPROVED --> [*]
```

| Rule | Where |
|---|---|
| A client payment goes `PENDING → IN_REVIEW` in the same request; a manual payment goes straight to `APPROVED` | `PaymentApplicationService` |
| One approved payment per booking (`APPROVED` must be id 3) | `ux_payment_one_approved_per_booking` + use-case check |
| One open (`PENDING` / `IN_REVIEW`) payment per booking | `HasOpenPaymentAsync` → 409 `PAYMENT_ALREADY_REPORTED` |
| After `REJECTED` the client can report a new payment for the same booking | No open payment remains |
| Any other transition throws `DomainException` | `Payment.EnsureStatus` |
