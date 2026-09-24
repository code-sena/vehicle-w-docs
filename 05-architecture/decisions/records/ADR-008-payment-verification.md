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

## References

- Payment requirements → `04-requirements/functional.md` RF-013 to RF-016
- Payment model → `06-data/models.md`
- Payment domain events → `02-domain/domain-events.md`
