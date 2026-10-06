# Data model — Payment Service

Schemas `payment` (7 tables) and `promotion` (5 tables) in `LavaRapido`. Base DDL:
`lavarapido-6-services-sqlserver.sql` and `06-data/models.md`.

## Tables

| Table | Purpose |
|---|---|
| `payment.payment_method_type` | `EFECTIVO`, `NEQUI`, `DAVIPLATA`, `TRANSFERENCIA`, with `requires_account` and `requires_receipt` |
| `payment.payment_account` | The shop's account per method: holder, number, `qr_image_url`, instructions, active. Seed: "Caja del establecimiento" (cash) |
| `payment.payment_status` | `PENDING`(1), `IN_REVIEW`(2), `APPROVED`(3), `REJECTED`(4), `REFUNDED`(5). **`APPROVED` must be id 3** |
| `payment.payment` | Booking, account, amount, status, `processed_at`, `approved_by`, rejection reason |
| `payment.payment_receipt` | Receipt of a payment: `file_url` (image as data URL), transaction reference, reported amount, who uploaded it |
| `payment.loyalty_movement_type` | `EARNED`, `REDEEMED`, `EXPIRED`, `ADJUSTED` with sign ±1 |
| `payment.loyalty_transaction` | Points ledger per customer with `balance_after` (no endpoints yet) |
| `promotion.discount_type` | `PERCENT`, `FIXED` |
| `promotion.promotion` | Promotion with value, validity, limits per customer and total |
| `promotion.promotion_service` · `promotion_customer` · `booking_promotion` | Services and customers a promotion applies to, and promotions applied to a booking |

Database safety nets:
- `ux_payment_one_approved_per_booking`: filtered unique index (status 3), one approved payment per booking.
- `ck_payment_amount`, `ck_preceipt_amount`, `ck_loyalty_balance`, `ck_promo_*`: amounts, balances and limits.
- `booking_id`, `customer_id`, `service_id` point to other schemas without foreign keys (ADR-003).

## Migrations

Liquibase (YAML master + plain SQL changesets), changelog table `DATABASECHANGELOG_PAYMENT`:
`001`–`014` schemas and tables · `015-seed-reference-data` · `016-payment-images-as-data`
(`qr_image_url` and `file_url` to `NVARCHAR(MAX)`).

The .NET service does **not** apply migrations on startup like the Java services: the
`payment-migrate` container of `lavarapido-infra/docker-compose.yml` runs them once.
