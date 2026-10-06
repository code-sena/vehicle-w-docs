# ADR-008 — Payment Verification by QR and Receipt

| Field | Value |
|---|---|
| **ID** | ADR-008 |
| **Date** | 2026-09-24 |
| **Status** | Accepted |
| **Authors** | Development team |
| **Reviewers** | Development team |

## Context

The current requirements and data model define payment as a manual process. The customer pays outside the platform using the shop's QR/account information and uploads a receipt. The Administrator reviews the payment.

The earlier documentation mentioned Wompi, but that integration is no longer part of the current model.

## Decision

The platform does **not** integrate a payment gateway. It records and verifies payments made outside the platform.

Supported methods are:

- Cash
- Nequi
- Daviplata
- Bank transfer

For digital methods the customer provides the receipt, declared amount and transaction reference. The Administrator reviews and approves or rejects the payment.

The payment lifecycle is represented by the current data model as `PENDING`, `IN_REVIEW`, `APPROVED`, `REJECTED` and `REFUNDED`.

No card data is collected or stored.

## Controls

- The declared receipt amount is stored separately from the amount due.
- A transaction reference cannot be reused on another approved payment.
- A booking cannot have more than one approved payment.
- Rejected attempts remain in history so a corrected attempt can be recorded.

## Consequences

The flow is possible in the local academic environment without a public payment callback. The trade-off is manual review and the need to define receipt-file storage before implementation.

## Alternatives

| Alternative | Result |
|---|---|
| Wompi/payment gateway | Superseded; not part of the current requirements/data model |
| QR without receipt | Rejected; no evidence for manual verification |
| Cash only | Rejected; it removes digital payment support |

## Pending decisions

- Final storage location for receipt images.
- Accepted image formats and maximum size.
- Whether service execution may start before payment approval.

## Implementation note (2026-10-06)

Built in `payment-service` (.NET 8, ADR-013):

| Point of this ADR | As built |
|---|---|
| Methods | Seed `EFECTIVO`, `NEQUI`, `DAVIPLATA`, `TRANSFERENCIA`; the admin manages one account per method with QR and instructions |
| Client flow | `POST /payments` creates the payment, attaches the receipt and moves it to `IN_REVIEW` in one step. The amount is the booking total read from booking-service; the browser never sends it |
| Cash / verified transfer | `POST /admin/payments`: the admin registers it and it is approved at once |
| Review | Approve, reject with a reason (max 200), refund an approved payment |
| One approved payment per booking | ✅ Filtered unique index `ux_payment_one_approved_per_booking` + check in the use case |
| One open payment per booking | ✅ 409 `PAYMENT_ALREADY_REPORTED` |
| Declared amount stored apart from the amount due | ✅ `payment_receipt.reported_amount` vs `payment.amount` (today both get the booking total) |
| Transaction reference not reused | ❌ **Not enforced yet** (RF-016) |
| Rejected attempts kept in history | ✅ A new payment can be reported after a rejection |

Pending decisions, as answered for now:

- **Receipt storage:** temporary — the receipt and the account QR are stored as images (data
  URLs) in `NVARCHAR(MAX)` columns (migration 016). Request body limit 8 MB. Final file storage
  is still open.
- **Execution before payment approval:** not blocked; operations does not check payments.

## References

- Payment requirements → `04-requirements/functional.md` RF-013 to RF-016
- Payment model → `06-data/models.md`
- Payment domain events → `02-domain/domain-events.md`
