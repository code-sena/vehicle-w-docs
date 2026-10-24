# Data model — Payment Service

Schemas `promotion` and `payment` in the shared SQL Server database `LavaRapido` (one owning service per schema, ADR-003/ADR-009): 12 tables, 175 columns. No foreign key leaves these schemas; references to other services are plain columns (last section).

> **Source:** the Liquibase changelogs of `lavarapido-payment-service` on `origin/develop` (`16a6fac`, 2026-10-23), applied in the order of `db/changelog/db.changelog-master.yaml`. The tables below were generated from those changelogs and are checked against them, against the EF Core configuration and against the ERD (`08-uml/diagrams/source/erd-payment.md`) by the script described in `06-data/migration-strategy.md` ("How the docs are checked"). The rationale of each table is in `06-data/models.md`.

## Tables

| Table | Purpose | Created in |
|---|---|---|
| `promotion.discount_type` | `PERCENT`, `FIXED` (seed 015) and `PACKAGE` (017). The service resolves their ids by code at startup (`CatalogIds`), so they are not fixed. | 003 |
| `promotion.promotion` | Promotion or coupon: code, discount type and value, limits, validity, `required_points` to unlock it (018), and the package card fields (017). `is_public` and `min_completed_booking` are not mapped by the code (the database defaults apply). | 004 |
| `promotion.promotion_service` | Services a promotion is limited to (`service_id` points to `catalog.service` without FK). No entity uses it yet. | 005 |
| `promotion.promotion_customer` | Customers a private promotion is assigned to. No entity uses it yet. | 006 |
| `promotion.booking_promotion` | Coupon applied to a booking and the amount it discounted (`applied_amount`, frozen). Since 021 a booking has at most one (`ux_booking_promotion_one_per_booking`). Removing a coupon (`DELETE /api/v1/loyalty/redemptions/{bookingId}/{promotionId}`) deletes the row. | 007 |
| `payment.payment_method_type` | Payment methods `EFECTIVO`, `NEQUI`, `DAVIPLATA`, `TRANSFERENCIA` (seed 015) with `requires_account` and `requires_receipt`. | 008 |
| `payment.payment_account` | The shop's account per method: holder, number, QR image (data URL, `NVARCHAR(MAX)` since 016), instructions. Seed 015 creates the cash row "Caja del establecimiento". | 009 |
| `payment.payment_status` | Payment states, ids 1–5 in this order: `PENDING`, `IN_REVIEW`, `APPROVED`, `REJECTED`, `REFUNDED` (seed 015, checked by 015 and 019). `APPROVED` = 3 is hard-coded in `ux_payment_one_approved_per_booking` and in the code (`PaymentStatusIds`). | 010 |
| `payment.payment` | One payment attempt of a booking: account, state, amount, when it was processed, who approved it, rejection reason. At most one approved payment per booking. | 011 |
| `payment.payment_receipt` | Proof of payment uploaded by the client: image (data URL, `NVARCHAR(MAX)` since 016), transaction reference, reported amount, upload and review data. | 012 |
| `payment.loyalty_movement_type` | Point movement kinds with their sign: `EARNED` +1, `REDEEMED` −1, `EXPIRED` −1, `ADJUSTED` +1 (seed 015) and `REVERSED` −1 (020). The code writes `EARNED` and `REVERSED`. | 013 |
| `payment.loyalty_transaction` | Points ledger, the source of truth for balances. `customer_id` holds the client's **user id** (`security.app_user`, ADR-015). `sequence_no` (020) numbers the movements of each client and is unique per client, so two concurrent movements on the same balance cannot both be saved. | 014 |

- No table has a touch trigger: `EfUnitOfWork` increments `row_version` (EF Core concurrency token) and sets the audit columns before saving; a stale `row_version` answers 409.
- The .NET service does **not** apply migrations on startup: the `payment-migrate` container (`liquibase/liquibase:4.29`, `lavarapido-infra/docker-compose.yml`) runs them once before the service starts.
- `booking_promotion` rows are deleted physically when the client removes a coupon; promotions are soft-deleted.

## Columns, keys and indexes

**Null** = accepts NULL. **Key**: `PK`, `IDENTITY` (starts at 1, step 1), `FK →` a table of this service, `UQ` (unique; *filtered* = only among the rows of its `WHERE`), `→ … (no FK)` = reference to another service. **Since** = migration that added the column. Dates are `DATETIME2(3)` in UTC.

### `promotion.discount_type`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `discount_type_id` | SMALLINT | No | — | PK, IDENTITY | 003 |
| `code` | NVARCHAR(30) | No | — | UQ | 003 |
| `name` | NVARCHAR(60) | No | — | — | 003 |
| `display_order` | SMALLINT | No | `0` | — | 003 |
| `is_active` | BIT | No | `1` | — | 003 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 003 |
| `created_by` | BIGINT | Yes | — | — | 003 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 003 |
| `updated_by` | BIGINT | Yes | — | — | 003 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 003 |
| `deleted_by` | BIGINT | Yes | — | — | 003 |
| `row_version` | INT | No | `1` | — | 003 |

- Constraints: `pk_discount_type` PRIMARY KEY (discount_type_id) · `uq_discount_type_code` UNIQUE (code)
- Indexes: —
- Triggers: —

### `promotion.promotion`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `promotion_id` | INT | No | — | PK, IDENTITY | 004 |
| `code` | NVARCHAR(30) | No | — | UQ | 004 |
| `name` | NVARCHAR(100) | No | — | — | 004 |
| `description` | NVARCHAR(300) | Yes | — | — | 004 |
| `discount_type_id` | SMALLINT | No | — | FK → promotion.discount_type.discount_type_id | 004 |
| `discount_value` | DECIMAL(12,2) | No | — | — | 004 |
| `max_discount_amount` | DECIMAL(12,2) | Yes | — | — | 004 |
| `min_purchase_amount` | DECIMAL(12,2) | No | `0` | — | 004 |
| `is_public` | BIT | No | `1` | — | 004 |
| `min_completed_booking` | INT | No | `0` | — | 004 |
| `valid_from` | DATE | No | — | — | 004 |
| `valid_to` | DATE | No | — | — | 004 |
| `max_redemptions` | INT | Yes | — | — | 004 |
| `max_redemptions_per_customer` | INT | Yes | — | — | 004 |
| `is_active` | BIT | No | `1` | — | 004 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 004 |
| `created_by` | BIGINT | Yes | — | — | 004 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 004 |
| `updated_by` | BIGINT | Yes | — | — | 004 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 004 |
| `deleted_by` | BIGINT | Yes | — | — | 004 |
| `row_version` | INT | No | `1` | — | 004 |
| `price` | DECIMAL(12,2) | Yes | — | — | 017 |
| `duration_minutes` | INT | Yes | — | — | 017 |
| `icon` | NVARCHAR(40) | Yes | — | — | 017 |
| `featured` | BIT | No | `0` | — | 017 |
| `benefits` | NVARCHAR(600) | Yes | — | — | 017 |
| `required_points` | INT | No | `0` | — | 018 |

- Constraints: `pk_promotion` PRIMARY KEY (promotion_id) · `uq_promotion_code` UNIQUE (code) · `fk_promotion_discount_type` FOREIGN KEY (discount_type_id) → promotion.discount_type (discount_type_id) · `ck_promo_value` CHECK `discount_value > 0` · `ck_promo_range` CHECK `valid_to >= valid_from` · `ck_promo_minbooking` CHECK `min_completed_booking >= 0` · `ck_promo_max_discount` CHECK `max_discount_amount IS NULL OR max_discount_amount > 0` · `ck_promo_max_redemptions` CHECK `max_redemptions IS NULL OR max_redemptions > 0` · `ck_promo_max_per_customer` CHECK `max_redemptions_per_customer IS NULL OR max_redemptions_per_customer > 0` · `ck_promo_per_customer_le_total` CHECK `max_redemptions IS NULL OR max_redemptions_per_customer IS NULL OR max_redemptions_per_customer <= max_redemptions` · `ck_promo_required_points` CHECK `required_points >= 0`
- Indexes: —
- Triggers: —

### `promotion.promotion_service`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `promotion_service_id` | INT | No | — | PK, IDENTITY | 005 |
| `promotion_id` | INT | No | — | FK → promotion.promotion.promotion_id | 005 |
| `service_id` | INT | No | — | → catalog.service (no FK) | 005 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 005 |
| `created_by` | BIGINT | Yes | — | — | 005 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 005 |
| `updated_by` | BIGINT | Yes | — | — | 005 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 005 |
| `deleted_by` | BIGINT | Yes | — | — | 005 |
| `row_version` | INT | No | `1` | — | 005 |

- Constraints: `pk_promotion_service` PRIMARY KEY (promotion_service_id) · `uq_promotion_service` UNIQUE (promotion_id, service_id) · `fk_promotion_service_promotion` FOREIGN KEY (promotion_id) → promotion.promotion (promotion_id)
- Indexes: `ix_promotion_service_service` (service_id)
- Triggers: —

### `promotion.promotion_customer`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `promotion_customer_id` | BIGINT | No | — | PK, IDENTITY | 006 |
| `promotion_id` | INT | No | — | FK → promotion.promotion.promotion_id | 006 |
| `customer_id` | BIGINT | No | — | → customer.customer (no FK) | 006 |
| `assigned_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 006 |
| `assigned_by` | BIGINT | Yes | — | → security.app_user (no FK) | 006 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 006 |
| `created_by` | BIGINT | Yes | — | — | 006 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 006 |
| `updated_by` | BIGINT | Yes | — | — | 006 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 006 |
| `deleted_by` | BIGINT | Yes | — | — | 006 |
| `row_version` | INT | No | `1` | — | 006 |

- Constraints: `pk_promotion_customer` PRIMARY KEY (promotion_customer_id) · `uq_promotion_customer` UNIQUE (promotion_id, customer_id) · `fk_promotion_customer_promotion` FOREIGN KEY (promotion_id) → promotion.promotion (promotion_id)
- Indexes: `ix_promotion_customer_customer` (customer_id) · `ix_promotion_customer_assigned_by` (assigned_by)
- Triggers: —

### `promotion.booking_promotion`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `booking_promotion_id` | BIGINT | No | — | PK, IDENTITY | 007 |
| `booking_id` | BIGINT | No | — | UQ, → booking.booking (no FK) | 007 |
| `promotion_id` | INT | No | — | FK → promotion.promotion.promotion_id | 007 |
| `applied_amount` | DECIMAL(12,2) | No | — | — | 007 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 007 |
| `created_by` | BIGINT | Yes | — | — | 007 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 007 |
| `updated_by` | BIGINT | Yes | — | — | 007 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 007 |
| `deleted_by` | BIGINT | Yes | — | — | 007 |
| `row_version` | INT | No | `1` | — | 007 |

- Constraints: `pk_booking_promotion` PRIMARY KEY (booking_promotion_id) · `uq_booking_promotion` UNIQUE (booking_id, promotion_id) · `fk_booking_promotion_promotion` FOREIGN KEY (promotion_id) → promotion.promotion (promotion_id) · `ck_bpromo_amount` CHECK `applied_amount > 0`
- Indexes: `ix_booking_promotion_booking` (booking_id) · `ux_booking_promotion_one_per_booking` UNIQUE (booking_id)
- Triggers: —

### `payment.payment_method_type`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `payment_method_type_id` | SMALLINT | No | — | PK, IDENTITY | 008 |
| `code` | NVARCHAR(30) | No | — | UQ | 008 |
| `name` | NVARCHAR(60) | No | — | — | 008 |
| `requires_account` | BIT | No | `1` | — | 008 |
| `requires_receipt` | BIT | No | `1` | — | 008 |
| `display_order` | SMALLINT | No | `0` | — | 008 |
| `is_active` | BIT | No | `1` | — | 008 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 008 |
| `created_by` | BIGINT | Yes | — | — | 008 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 008 |
| `updated_by` | BIGINT | Yes | — | — | 008 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 008 |
| `deleted_by` | BIGINT | Yes | — | — | 008 |
| `row_version` | INT | No | `1` | — | 008 |

- Constraints: `pk_payment_method_type` PRIMARY KEY (payment_method_type_id) · `uq_payment_method_type_code` UNIQUE (code)
- Indexes: —
- Triggers: —

### `payment.payment_account`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `payment_account_id` | SMALLINT | No | — | PK, IDENTITY | 009 |
| `payment_method_type_id` | SMALLINT | No | — | FK → payment.payment_method_type.payment_method_type_id | 009 |
| `account_holder` | NVARCHAR(120) | No | — | — | 009 |
| `account_number` | NVARCHAR(50) | Yes | — | — | 009 |
| `qr_image_url` | NVARCHAR(MAX) | Yes | — | — | 009 |
| `instructions` | NVARCHAR(300) | Yes | — | — | 009 |
| `is_active` | BIT | No | `1` | — | 009 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 009 |
| `created_by` | BIGINT | Yes | — | — | 009 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 009 |
| `updated_by` | BIGINT | Yes | — | — | 009 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 009 |
| `deleted_by` | BIGINT | Yes | — | — | 009 |
| `row_version` | INT | No | `1` | — | 009 |

- Constraints: `pk_payment_account` PRIMARY KEY (payment_account_id) · `fk_payment_account_method` FOREIGN KEY (payment_method_type_id) → payment.payment_method_type (payment_method_type_id)
- Indexes: —
- Triggers: —

### `payment.payment_status`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `payment_status_id` | SMALLINT | No | — | PK, IDENTITY | 010 |
| `code` | NVARCHAR(30) | No | — | UQ | 010 |
| `name` | NVARCHAR(60) | No | — | — | 010 |
| `is_final` | BIT | No | `0` | — | 010 |
| `display_order` | SMALLINT | No | `0` | — | 010 |
| `is_active` | BIT | No | `1` | — | 010 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 010 |
| `created_by` | BIGINT | Yes | — | — | 010 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 010 |
| `updated_by` | BIGINT | Yes | — | — | 010 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 010 |
| `deleted_by` | BIGINT | Yes | — | — | 010 |
| `row_version` | INT | No | `1` | — | 010 |

- Constraints: `pk_payment_status` PRIMARY KEY (payment_status_id) · `uq_payment_status_code` UNIQUE (code)
- Indexes: —
- Triggers: —

### `payment.payment`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `payment_id` | BIGINT | No | — | PK, IDENTITY | 011 |
| `booking_id` | BIGINT | No | — | UQ (filtered), → booking.booking (no FK) | 011 |
| `payment_account_id` | SMALLINT | No | — | FK → payment.payment_account.payment_account_id | 011 |
| `payment_status_id` | SMALLINT | No | — | FK → payment.payment_status.payment_status_id | 011 |
| `amount` | DECIMAL(12,2) | No | — | — | 011 |
| `processed_at` | DATETIME2(3) | Yes | — | — | 011 |
| `approved_by` | BIGINT | Yes | — | → security.app_user (no FK) | 011 |
| `rejection_reason` | NVARCHAR(200) | Yes | — | — | 011 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 011 |
| `created_by` | BIGINT | Yes | — | — | 011 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 011 |
| `updated_by` | BIGINT | Yes | — | — | 011 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 011 |
| `deleted_by` | BIGINT | Yes | — | — | 011 |
| `row_version` | INT | No | `1` | — | 011 |

- Constraints: `pk_payment` PRIMARY KEY (payment_id) · `fk_payment_account` FOREIGN KEY (payment_account_id) → payment.payment_account (payment_account_id) · `fk_payment_status` FOREIGN KEY (payment_status_id) → payment.payment_status (payment_status_id) · `ck_payment_amount` CHECK `amount > 0`
- Indexes: `ix_payment_booking` (booking_id) · `ix_payment_status` (payment_status_id) · `ix_payment_approved_by` (approved_by) · `ux_payment_one_approved_per_booking` UNIQUE (booking_id) WHERE `payment_status_id = 3 AND deleted_at IS NULL`
- Triggers: —

### `payment.payment_receipt`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `payment_receipt_id` | BIGINT | No | — | PK, IDENTITY | 012 |
| `payment_id` | BIGINT | No | — | FK → payment.payment.payment_id | 012 |
| `file_url` | NVARCHAR(MAX) | No | — | — | 012 |
| `transaction_reference` | NVARCHAR(100) | Yes | — | — | 012 |
| `reported_amount` | DECIMAL(12,2) | Yes | — | — | 012 |
| `uploaded_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 012 |
| `uploaded_by` | BIGINT | No | — | → security.app_user (no FK) | 012 |
| `reviewed_at` | DATETIME2(3) | Yes | — | — | 012 |
| `reviewed_by` | BIGINT | Yes | — | → security.app_user (no FK) | 012 |
| `review_comment` | NVARCHAR(300) | Yes | — | — | 012 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 012 |
| `created_by` | BIGINT | Yes | — | — | 012 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 012 |
| `updated_by` | BIGINT | Yes | — | — | 012 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 012 |
| `deleted_by` | BIGINT | Yes | — | — | 012 |
| `row_version` | INT | No | `1` | — | 012 |

- Constraints: `pk_payment_receipt` PRIMARY KEY (payment_receipt_id) · `fk_payment_receipt_payment` FOREIGN KEY (payment_id) → payment.payment (payment_id) · `ck_preceipt_amount` CHECK `reported_amount IS NULL OR reported_amount > 0` · `ck_preceipt_review` CHECK `(reviewed_at IS NULL AND reviewed_by IS NULL) OR (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)`
- Indexes: `ix_payment_receipt_payment` (payment_id) · `ix_payment_receipt_reference` (transaction_reference) · `ix_payment_receipt_reviewed_by` (reviewed_by) · `ix_payment_receipt_uploaded_by` (uploaded_by)
- Triggers: —

### `payment.loyalty_movement_type`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `loyalty_movement_type_id` | SMALLINT | No | — | PK, IDENTITY | 013 |
| `code` | NVARCHAR(30) | No | — | UQ | 013 |
| `name` | NVARCHAR(60) | No | — | — | 013 |
| `sign` | SMALLINT | No | — | — | 013 |
| `display_order` | SMALLINT | No | `0` | — | 013 |
| `is_active` | BIT | No | `1` | — | 013 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 013 |
| `created_by` | BIGINT | Yes | — | — | 013 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 013 |
| `updated_by` | BIGINT | Yes | — | — | 013 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 013 |
| `deleted_by` | BIGINT | Yes | — | — | 013 |
| `row_version` | INT | No | `1` | — | 013 |

- Constraints: `pk_loyalty_movement_type` PRIMARY KEY (loyalty_movement_type_id) · `uq_loyalty_movement_type_code` UNIQUE (code) · `ck_loyalty_movement_sign` CHECK `sign IN (-1, 1)`
- Indexes: —
- Triggers: —

### `payment.loyalty_transaction`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `loyalty_transaction_id` | BIGINT | No | — | PK, IDENTITY | 014 |
| `customer_id` | BIGINT | No | — | → security.app_user (no FK) | 014 |
| `loyalty_movement_type_id` | SMALLINT | No | — | FK → payment.loyalty_movement_type.loyalty_movement_type_id | 014 |
| `booking_id` | BIGINT | Yes | — | → booking.booking (no FK) | 014 |
| `points` | INT | No | — | — | 014 |
| `balance_after` | INT | No | — | — | 014 |
| `expires_on` | DATE | Yes | — | — | 014 |
| `description` | NVARCHAR(200) | Yes | — | — | 014 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 014 |
| `created_by` | BIGINT | Yes | — | — | 014 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 014 |
| `updated_by` | BIGINT | Yes | — | — | 014 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 014 |
| `deleted_by` | BIGINT | Yes | — | — | 014 |
| `row_version` | INT | No | `1` | — | 014 |
| `sequence_no` | INT | No | — | — | 020 |

- Constraints: `pk_loyalty_transaction` PRIMARY KEY (loyalty_transaction_id) · `fk_loyalty_transaction_type` FOREIGN KEY (loyalty_movement_type_id) → payment.loyalty_movement_type (loyalty_movement_type_id) · `ck_loyalty_points` CHECK `points <> 0` · `ck_loyalty_balance` CHECK `balance_after >= 0`
- Indexes: `ix_loyalty_transaction_customer` (customer_id, created_at) · `ix_loyalty_transaction_booking` (booking_id) · `ux_loyalty_transaction_customer_sequence` UNIQUE (customer_id, sequence_no)
- Triggers: —

## Triggers

None.

## Seed data

- `015-seed-reference-data`: discount types, 4 payment methods, the cash account, the 5 payment states (one INSERT each, so `APPROVED` = 3, checked with `onFail:HALT`) and 4 movement types.
- `017-promotion-package-fields` adds the discount type `PACKAGE`; `020-loyalty-reversal-and-sequence` adds the movement type `REVERSED`.

## Migrations

Liquibase, changelog table `DATABASECHANGELOG_PAYMENT` (lock table `DATABASECHANGELOGLOCK_PAYMENT`), in the order of the master file:

| Order | File | Changesets | Precondition | Rollback | Purpose |
|---|---|---|---|---|---|
| 1 | `changes/001-create-schema-promotion.sql` | 1 | onFail:MARK_RAN | Yes | Schema `promotion` |
| 2 | `changes/002-create-schema-payment.sql` | 1 | onFail:MARK_RAN | Yes | Schema `payment` |
| 3 | `changes/003-promotion-discount-type.sql` | 1 | none | Yes | Table `discount_type` |
| 4 | `changes/004-promotion-promotion.sql` | 1 | none | Yes | Table `promotion` |
| 5 | `changes/005-promotion-promotion-service.sql` | 1 | none | Yes | Table `promotion_service` |
| 6 | `changes/006-promotion-promotion-customer.sql` | 1 | none | Yes | Table `promotion_customer` |
| 7 | `changes/007-promotion-booking-promotion.sql` | 1 | none | Yes | Table `booking_promotion` |
| 8 | `changes/008-payment-payment-method-type.sql` | 1 | none | Yes | Table `payment_method_type` |
| 9 | `changes/009-payment-payment-account.sql` | 1 | none | Yes | Table `payment_account` |
| 10 | `changes/010-payment-payment-status.sql` | 1 | none | Yes | Table `payment_status` |
| 11 | `changes/011-payment-payment.sql` | 1 | none | Yes | Table `payment` and the filtered unique index of one approved payment per booking |
| 12 | `changes/012-payment-payment-receipt.sql` | 1 | none | Yes | Table `payment_receipt` |
| 13 | `changes/013-payment-loyalty-movement-type.sql` | 1 | none | Yes | Table `loyalty_movement_type` |
| 14 | `changes/014-payment-loyalty-transaction.sql` | 1 | none | Yes | Table `loyalty_transaction` |
| 15 | `changes/015-seed-reference-data.sql` | 6 | onFail:HALT (5 without) | Yes | Seed: discount types, 4 payment methods, the cash account, the 5 payment states (one INSERT each, so `APPROVED` = 3, checked with `onFail:HALT`) and 4 movement types |
| 16 | `changes/016-payment-images-as-data.sql` | 1 | onFail:MARK_RAN | Yes | `payment_account.qr_image_url` and `payment_receipt.file_url` to `NVARCHAR(MAX)` (images as data URL) |
| 17 | `changes/017-promotion-package-fields.sql` | 2 | none | Yes | Discount type `PACKAGE` and the package columns of `promotion` (`price`, `duration_minutes`, `icon`, `featured`, `benefits`) |
| 18 | `changes/018-promotion-required-points.sql` | 2 | onFail:MARK_RAN (1 without) | Yes | Column `promotion.required_points` and its check |
| 19 | `changes/019-verify-catalog-ids.sql` | 3 | onFail:HALT | Yes | Checks only (`onFail:HALT`): payment state ids 1–5 and the discount and movement codes the code needs |
| 20 | `changes/020-loyalty-reversal-and-sequence.sql` | 5 | onFail:MARK_RAN (3 without) | Yes | Movement type `REVERSED`; column `loyalty_transaction.sequence_no` (backfilled, then NOT NULL) and unique index per client |
| 21 | `changes/021-promotion-one-per-booking.sql` | 1 | onFail:CONTINUE | Yes | Unique index `ux_booking_promotion_one_per_booking` (E-09: one coupon per booking; `onFail:CONTINUE` if duplicates exist) |

**Changesets** = `--changeset` blocks in the file; **Precondition** = what Liquibase does when the check fails (`MARK_RAN`: mark as run without executing; `CONTINUE`: skip now and try again on the next update; `HALT`: stop the migration). Numbering and rules: `06-data/migration-strategy.md`.

## References to other services (no FK)

| Column | Points to | Owner | Index |
|---|---|---|---|
| `promotion.promotion_service.service_id` | `catalog.service` | booking-service | `ix_promotion_service_service` |
| `promotion.promotion_customer.customer_id` | `customer.customer` | customer-service | `ix_promotion_customer_customer` |
| `promotion.promotion_customer.assigned_by` | `security.app_user` | security-service | `ix_promotion_customer_assigned_by` |
| `promotion.booking_promotion.booking_id` | `booking.booking` | booking-service | `uq_booking_promotion` |
| `payment.payment.booking_id` | `booking.booking` | booking-service | `ix_payment_booking` |
| `payment.payment.approved_by` | `security.app_user` | security-service | `ix_payment_approved_by` |
| `payment.payment_receipt.uploaded_by` | `security.app_user` | security-service | `ix_payment_receipt_uploaded_by` |
| `payment.payment_receipt.reviewed_by` | `security.app_user` | security-service | `ix_payment_receipt_reviewed_by` |
| `payment.loyalty_transaction.customer_id` | `security.app_user` (the client's user id, ADR-015) | security-service | `ix_loyalty_transaction_customer` |
| `payment.loyalty_transaction.booking_id` | `booking.booking` | booking-service | `ix_loyalty_transaction_booking` |
