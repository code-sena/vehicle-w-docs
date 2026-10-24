# Modeling Conventions

Conventions that apply across all 9 schemas. Anything table-specific lives in `models.md`
instead — this file only covers what's supposed to look the same everywhere.

## Database per service — and why we bend it

The team's stated rule is one physical database per service. What we actually run is **one
SQL Server 2016+ instance, split into 9 schemas** owned by six services (ADR-009):

| Service | Schemas |
|---------|---------|
| `security-service` | `security`, `audit` |
| `customer-service` | `customer` |
| `booking-service` | `catalog`, `booking` |
| `operations-service` | `execution` |
| `payment-service` | `promotion`, `payment` |
| `notification-service` | `notification` |

Every schema has exactly one owner; a service may own more than one.

This is a deliberate trade-off against the assignment's constraints (one grading environment,
one instructor-provided core), not an oversight, and it keeps the part of "database per
service" that actually matters:

- No table has a foreign key into a schema owned by **another service**. Every one of the 26
  places a service needs another service's data is a plain column (22 of them indexed), validated by
  the application — see the contract table at the end of `models.md`. The only foreign key that
  crosses two schemas, `booking.booking_service → catalog.service_price`, stays inside
  `booking-service`.
- Each schema can be backed up, scripted, or migrated on its own.
- If a service ever needs to move to its own physical instance, it takes all of its schemas
  with it and nothing in the DDL has to change — only the connection string and the removal of `RECURSIVE_TRIGGERS OFF` at the
  database level, which today is shared.

What we lose, and accept losing: physical isolation (a runaway query in one schema can still
starve another), and independent scaling per engine. Neither matters at this project's scale.

## Surrogate keys: `IDENTITY`, not `UUID`

Every table uses a SQL Server `IDENTITY(1,1)` integer as its primary key
(`BIGINT` for high-growth tables like `booking`, `payment`, `loyalty_transaction`;
`INT` or `SMALLINT` for catalogs and low-cardinality tables), not a `UUID`.

Reasons:
- The shared `security` core the instructor provides is `IDENTITY`-based, so matching it
  keeps joins to that schema simple.
- Sequential inserts avoid the page-fragmentation cost `UNIQUEIDENTIFIER` causes on a
  clustered index in SQL Server.
- A few constraints (`ck_booking_cancel`, `ux_payment_one_approved_per_booking`) rely on
  specific seeded IDs staying stable — see the ⚠️ notes on `booking_status` and
  `payment_status` in `models.md`. Sequential integers make that kind of seed data easy to
  reason about; random UUIDs would not change the logic, just make it harder to read.

## The standard audit block

Most **domain** tables end with the same seven columns (the exceptions are listed below the block,
and the exact columns of every table are in the "Audit columns" table of each ER diagram):

```sql
created_at   DATETIME2(3)  NOT NULL DEFAULT SYSUTCDATETIME(),
created_by   BIGINT        NULL,
updated_at   DATETIME2(3)  NULL,
updated_by   BIGINT        NULL,
deleted_at   DATETIME2(3)  NULL,
deleted_by   BIGINT        NULL,
row_version  INT           NOT NULL DEFAULT 1,
```

- Tables with only part of the block, or none: `security.app_user` (`created_at`),
  `login_lockout` and `person_address` (`updated_at`), `audit.audit_log` and the rest of the security
  core (none), `booking.schedule_history` (none, insert-only log), `execution.inspection_report` (no
  `deleted_*`), `inspection_phase` (none), `inspection_finding` (`created_*`, `deleted_*`),
  `inspection_photo` (`created_*`), `operator_profile` (`updated_*`), `operator_skill` (none) and
  `notification.booking_tracking` (`updated_at`) and `pending_delivery` (`created_at`).
- `updated_at` and `row_version` are bumped on every `UPDATE` by a `tr_touch_<table>` trigger, which
  each changeset writes explicitly for its table (`migration-strategy.md`, "Triggers"). As built
  (checked 2026-10-24), there are 16 of them, on the tables that are edited after creation:
  `security.user_preference`, the three `customer` tables, `catalog.service` and `service_price`,
  `booking.booking`, `business_hour`, `business_hour_exception`, `establishment` and `service_bay`,
  and `execution.operator`, `operator_availability`, `operator_absence`, `service_execution` and
  `inspection_report`. Lookup tables seeded once have none. The `notification` tables have no touch trigger:
  notification-service sets `updated_at` itself where it needs it. payment-service has none either:
  `EfUnitOfWork` sets `row_version` and the audit columns before saving.
- `created_by` / `updated_by` / `deleted_by` reference `security.app_user.user_id`, but — like
  every other cross-service reference — with no FK.
- `row_version` backs optimistic locking: a second editor's `UPDATE ... WHERE row_version = @x`
  simply matches zero rows if someone else got there first. payment-service sends that `WHERE` on
  every table (EF Core concurrency token), and booking-service on `booking.booking` (`@Version`,
  BIZ-09, migration 045: its trigger no longer bumps the version Hibernate already bumped); both answer
  409. The other Java tables do not check it yet.

`security.person`, `app_user`, `role`, `permission`, `role_permission`, `user_role`,
`user_session`, and `password_reset_token` intentionally **don't** carry this block. They're
either the instructor-provided shared core (not ours to extend) or short-lived security
artifacts (`user_session`, `password_reset_token`) that get created and consumed once rather
than edited by an administrator — auditing who last "edited" a session token isn't a
meaningful question.

## Soft delete, by default

Rows are not physically deleted: `deleted_at IS NULL` means active; `deleted_at IS NOT NULL` means
deleted. The exceptions are rows that carry no history of their own: `security.login_lockout`,
`person_address` and `role_permission`, `execution.operator_skill` (the list is replaced),
`promotion.booking_promotion` (a removed coupon) and a soft-deleted `business_hour_exception` that
blocks reusing its date. Two consequences worth knowing:

- Uniqueness constraints that matter to the business, not just to storage, need a **filtered
  index** instead of a plain `UNIQUE`: `customer_vehicle.license_plate` and
  `service_price`'s (service, vehicle type) pair are both scoped to `WHERE deleted_at IS
  NULL`, so a soft-deleted row never blocks a legitimate new one.
- Every query the application writes needs `WHERE deleted_at IS NULL` unless it's explicitly
  browsing history. There's no `is_deleted` flag or view doing this automatically today.

## Timestamps: always UTC, always `DATETIME2(3)`

SQL Server's `DATETIME2` carries no time zone. The convention is: **everything is stored in
UTC**, written with `SYSUTCDATETIME()`, and converted to Colombia local time in the frontend
only. Storing local time would desynchronize the whole schedule the first time the app moves
servers or deploys somewhere with a different system clock — this matters most in `booking`,
where overlap checks compare timestamps directly.

## Naming

```
Schemas:      one word, names a bounded context; one owning service each, and a
              service may own several (ADR-009) — security, catalog, booking…
Tables:       snake_case, singular for the "one row = one entity" tables
              (booking, payment, customer), plural only where the table already
              reads as a collection in the domain (none currently do)
Columns:      snake_case, descriptive — scheduled_start, applied_amount
FKs:          [referenced_table]_id — customer_id, service_price_id
PKs:          [table]_id — booking_id, payment_receipt_id (never a bare `id`,
              so a join never needs a column alias to stay readable)
Constraints:  pk_[table], fk_[table]_[target], uq_[table]_[column], ck_[table]_[rule]
Indexes:      ix_[table]_[column(s)] (ux_ prefix when unique)
Triggers:     tr_[table]_[what it prevents], tr_touch_[table] for the trigger
              that bumps updated_at and row_version
```

`[role]`, `[permission]`, and `[action]` are wrapped in brackets because they're T-SQL
reserved words — same reasoning as renaming the `identity` schema to `security` (see the
note in `security`'s section of `models.md`).

## Catalog / lookup tables

Twelve tables — `role`, `vehicle_type`, `loyalty_movement_type`, `service_category`,
`booking_status`, `bay_status`, `cancellation_reason`, `execution_status`, `discount_type`,
`payment_method_type`, `payment_status`, `notification_type` — share one shape: `code` (unique),
`name`, `display_order`, `is_active` and the audit block. `role` has only `code` and `name`;
`bay_status` has `accepts_bookings` instead of `is_active`.

They're kept as separate tables rather than one generic `status` table on purpose: a FK from
`booking.booking_status_id` to a dedicated `booking_status` table guarantees a booking can
only ever hold a booking status. A single shared "statuses" table would let a booking end up
in `REFUNDED`, which is a payment concept — the type system (via the FK target) is what
prevents that, not application code remembering to filter.

`code` is what the application matches on (`CANCELLED`); `name` is the Spanish label
(`Cancelada`). Keeping them separate means the Spanish label can change without touching any
code path that checks the status.
