# Data Dictionary

`models.md` documents every column. This file is narrower on purpose: it covers only the
fields that are genuinely easy to get wrong — status codes someone will hardcode instead of
looking up, flag combinations that only make sense together, and fields whose name doesn't
fully say what they mean.

| Field | Service | Table | Type | Detailed description | Possible values |
|-------|---------|-------|------|----------------------|------------------|
| `reserve_status_id` | reserve | reserve | SMALLINT | Current state of a reserve. ID `5` is hard-coded inside `ck_reserve_cancel` and `tr_reserve_bay_overlap` — never re-seed this table with a different row order. | 1 `AGENDADA`, 2 `CONFIRMADA`, 3 `EN_EJECUCION`, 4 `FINALIZADA`, 5 `CANCELLED`, 6 `NO_ASISTIO` |
| `payment_status_id` | payment | payment | SMALLINT | Current state of a payment attempt. ID `3` is hard-coded inside `ux_payment_one_approved_per_reserve`. | 1 `PENDING`, 2 `IN_REVIEW`, 3 `APPROVED`, 4 `REJECTED`, 5 `REFUNDED` |
| `execution_status_id` | execution | service_execution | SMALLINT | State of one line item's execution — independent of the parent reserve's status. | `PENDIENTE`, `EN_PROCESO`, `PAUSADA`, `FINALIZADA`, `CON_NOVEDAD` |
| `is_public` + `min_completed_reserve` | promotion | promotion | BIT + INT | Together they decide who a promotion reaches. `is_public = 1` with `min_completed_reserve = 0` means every customer qualifies. `is_public = 1` with `min_completed_reserve = 5` means only customers with 5+ finished reserves qualify. `is_public = 0` ignores this column entirely — eligibility comes only from `promotion_customer`. | See description |
| `points_redeemed` + `points_discount_amount` | reserve | reserve | INT + DECIMAL(12,2) | Must both be zero or both be greater than zero (`ck_reserve_points`). `points_redeemed` is how many loyalty points were spent; `points_discount_amount` is what those points were worth in pesos, and is the number that actually reduces the reserve's charge. | Both 0, or both > 0 |
| `sign` | customer | loyalty_movement_type | SMALLINT | Whether this movement type adds or removes points from the balance. Multiply `loyalty_transaction.points` by this to get the actual balance impact. | `1` (adds), `-1` (subtracts) |
| `is_customer_fault` | reserve | cancellation_reason | BIT | Marks whether a cancellation reason is attributable to the customer — used for reporting and for deciding whether a no-show penalty applies. Not the same as `is_final` on status tables. | `0`, `1` |
| `requires_account` + `requires_receipt` | payment | payment_method_type | BIT + BIT | `requires_account` is true for every seeded method (cash included — cash still has a `payment_account` row, just without a QR). `requires_receipt` is `0` only for cash; every QR-based method needs an uploaded `payment_receipt`. | `0` / `1` each |
| `reported_amount` vs `amount` | payment | payment_receipt / payment | DECIMAL(12,2) | `payment.amount` is what the system expects to be paid. `payment_receipt.reported_amount` is what the uploaded receipt claims was paid. The two are compared during manual review — a mismatch is the signal an admin acts on, not something the database blocks automatically. | Any positive value |
| `transaction_reference` | payment | payment_receipt | NVARCHAR(100) | Reference number printed on the receipt. Indexed specifically so the same reference can't quietly be reused across two different payments — the antifraud control that stands in for a real payment gateway. | Free text, nullable |
| `singleton` | settings | establishment | BIT | Always `1`. Exists only so `uq_establishment_singleton` + `ck_establishment_singleton` can guarantee the table never holds more than one row. | `1` (only) |
| `size_factor` | customer | vehicle_type | DECIMAL(4,2) | Reference multiplier shown in the admin UI when creating a new tariff — never used to compute an actual charge. The real price always comes from `catalog.service_price`. | e.g. 0.60–2.00 |
| `applied_amount` | promotion | reserve_promotion | DECIMAL(12,2) | The discount a promotion actually granted, frozen at the moment it was applied — not recalculated if the promotion's terms change later. | > 0 |
| `reference_entity` + `reference_id` | notification | notification | NVARCHAR(40) + BIGINT | Together they point at what a notification is about, e.g. `('reserve', 145)`, so tapping the notification can deep-link to the right screen. Not a foreign key — `reference_entity` can name a table in any schema. | e.g. `reserve`, `payment` |
| `is_read` + `read_at` | notification | notification | BIT + DATETIME2(3) | Must be set together (`ck_notification_read`): both null/`0`, or both populated. | — |
| `deleted_at` | all domain tables | — | DATETIME2(3) | `NULL` = active row. Any non-null value means soft-deleted — the record is never removed, only hidden from normal queries. | `NULL` or a UTC timestamp |
| `row_version` | all domain tables | — | INT | Optimistic-locking counter, incremented automatically by a trigger on every `UPDATE`. Application code should read it before an edit and include it in the `WHERE` clause of the update. | Starts at 1, increments |
