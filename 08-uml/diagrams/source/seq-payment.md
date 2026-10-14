# Sequence — Payment by receipt and review (RF-013, RF-013b, RF-014)

Source: `payment-service` `PaymentCommandService.ReportAsync / ApproveAsync / RejectAsync /
RegisterInPersonAsync` (input port `IPaymentCommandUseCases`), `Payment` aggregate,
`BookingServiceDirectory` (ADR-008, ADR-013).

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    actor A as Admin
    participant W as Web (through the gateway)
    participant P as payment-service (.NET)
    participant B as booking-service
    participant DB as SQL Server (payment)

    C->>W: Pay service
    W->>P: GET /api/v1/payment-accounts
    P-->>W: active accounts that require a receipt (QR, instructions)
    C->>C: Pays from the bank app (outside the platform)
    C->>W: Account, transaction reference, receipt image
    W->>P: POST /api/v1/payments
    P->>B: GET /bookings/{id} (client JWT)
    B-->>P: status, total, owner
    alt booking payable and no open/approved payment
        P->>DB: payment PENDING (amount = booking total) + receipt → IN_REVIEW
        P-->>W: 201 payment IN_REVIEW
    else not payable / already reported / already approved
        P-->>W: 400 BOOKING_NOT_PAYABLE | 409 PAYMENT_ALREADY_REPORTED | 409 PAYMENT_ALREADY_APPROVED
    end

    A->>W: Payments → Verify
    W->>P: GET /api/v1/admin/payments?status=IN_REVIEW
    P->>B: GET /admin/bookings/{id} (admin JWT) per payment
    P-->>W: payments with booking data
    alt approve
        W->>P: POST /api/v1/admin/payments/{id}/approve
        P->>DB: APPROVED, approved_by, processed_at (unique index: one per booking)
    else reject
        W->>P: POST /api/v1/admin/payments/{id}/reject {reason}
        P->>DB: REJECTED + reason (the client can report again)
    end
    Note over P: Domain events PaymentApproved / PaymentRejected are raised<br/>but not published yet: notification is not told (TD-015)

    A->>W: Payments → Manual entry (cash at the shop)
    W->>P: POST /api/v1/admin/payments {bookingId, paymentAccountId}
    P->>B: GET /admin/bookings/{id}
    P->>DB: payment APPROVED at once (amount = booking total)
```

Paths and bodies: `07-api/contracts/openapi/payment-service.yaml`.
