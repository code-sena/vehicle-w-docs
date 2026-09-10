# Modeling Conventions

Conventions that apply across all 10 schemas. Anything table-specific lives in `models.md`
instead — this file only covers what's supposed to look the same everywhere.

## Database per service — and why we bend it

The team's stated rule is one physical database per service. What we actually run is **one
SQL Server 2016+ instance, split into 10 schemas** — `security`, `audit`, `settings`,
`customer`, `catalog`, `reserve`, `execution`, `promotion`, `payment`, `notification`.

This is a deliberate trade-off against the assignment's constraints (one grading environment,
one instructor-provided core), not an oversight, and it keeps the part of "database per
service" that actually matters:

- No table has a foreign key into another schema. Every one of the 18 places a service needs
  another service's data is a plain indexed column, validated by the application — see the
  contract table at the end of `models.md`.
- Each schema can be backed up, scripted, or migrated on its own.
- If a service ever needs to move to its own physical instance, nothing in the DDL has to
  change — only the connection string and the removal of `RECURSIVE_TRIGGERS OFF` at the
  database level, which today is shared.

What we lose, and accept losing: physical isolation (a runaway query in one schema can still
starve another), and independent scaling per engine. Neither matters at this project's scale.

## Surrogate keys: `IDENTITY`, not `UUID`

Every table uses a SQL Server `IDENTITY(1,1)` integer as its primary key
(`BIGINT` for high-growth tables like `reserve`, `payment`, `loyalty_transaction`;
`INT` or `SMALLINT` for catalogs and low-cardinality tables), not a `UUID`.

Reasons:
- The shared `security` core the instructor provides is `IDENTITY`-based, so matching it
  keeps joins to that schema simple.
- Sequential inserts avoid the page-fragmentation cost `UNIQUEIDENTIFIER` causes on a
  clustered index in SQL Server.
- A few constraints (`ck_reserve_cancel`, `ux_payment_one_approved_per_reserve`) rely on
  specific seeded IDs staying stable — see the ⚠️ notes on `reserve_status` and
  `payment_status` in `models.md`. Sequential integers make that kind of seed data easy to
  reason about; random UUIDs would not change the logic, just make it harder to read.

## The standard audit block

Every **domain** table (i.e., everything except the `security` core and
`security.password_reset_token`) ends with the same seven columns:

```sql
created_at   DATETIME2(3)  NOT NULL DEFAULT SYSUTCDATETIME(),
created_by   BIGINT        NULL,
updated_at   DATETIME2(3)  NULL,
updated_by   BIGINT        NULL,
deleted_at   DATETIME2(3)  NULL,
deleted_by   BIGINT        NULL,
row_version  INT           NOT NULL DEFAULT 1,
```

- `updated_at` and `row_version` are never set by application code. A generated trigger
  (`tr_touch_<table>`, built once from `sys.tables`/`sys.columns` for every table that has a
  `row_version` column — see section 14 of `schema_sqlserver.sql`) bumps both on every
  `UPDATE`, so it can't be forgotten in one service and not another.
- `created_by` / `updated_by` / `deleted_by` reference `security.app_user.user_id`, but — like
  every other cross-service reference — with no FK.
- `row_version` backs optimistic locking: a second editor's `UPDATE ... WHERE row_version = @x`
  simply matches zero rows if someone else got there first.

`security.person`, `app_user`, `role`, `permission`, `role_permission`, `user_role`,
`user_session`, and `password_reset_token` intentionally **don't** carry this block. They're
either the instructor-provided shared core (not ours to extend) or short-lived security
artifacts (`user_session`, `password_reset_token`) that get created and consumed once rather
than edited by an administrator — auditing who last "edited" a session token isn't a
meaningful question.

## Soft delete, always

No table is ever hit with a physical `DELETE`. `deleted_at IS NULL` means active;
`deleted_at IS NOT NULL` means deleted. Two consequences worth knowing:

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
servers or deploys somewhere with a different system clock — this matters most in `reserve`,
where overlap checks compare timestamps directly.

## Naming

```
Schemas:      one word, matches the microservice — security, catalog, reserve…
Tables:       snake_case, singular for the "one row = one entity" tables
              (reserve, payment, customer), plural only where the table already
              reads as a collection in the domain (none currently do)
Columns:      snake_case, descriptive — scheduled_start, applied_amount
FKs:          [referenced_table]_id — customer_id, service_price_id
PKs:          [table]_id — reserve_id, payment_receipt_id (never a bare `id`,
              so a join never needs a column alias to stay readable)
Constraints:  pk_[table], fk_[table]_[target], uq_[table]_[column], ck_[table]_[rule]
Indexes:      ix_[table]_[column(s)] (ux_ prefix when unique)
Triggers:     tr_[table]_[what it prevents], tr_touch_[table] for the generated
              audit trigger
```

`[role]`, `[permission]`, and `[action]` are wrapped in brackets because they're T-SQL
reserved words — same reasoning as renaming the `identity` schema to `security` (see the
note in `security`'s section of `models.md`).

## Catalog / lookup tables

Eleven tables — `role`, `vehicle_type`, `loyalty_movement_type`, `service_category`,
`reserve_status`, `cancellation_reason`, `execution_status`, `discount_type`,
`payment_method_type`, `payment_status`, `notification_type` — share one shape:
`code`, `name`, `display_order`, `is_active` (plus the audit block, where they have one).

They're kept as separate tables rather than one generic `status` table on purpose: a FK from
`reserve.reserve_status_id` to a dedicated `reserve_status` table guarantees a reserve can
only ever hold a reserve status. A single shared "statuses" table would let a reserve end up
in `REFUNDED`, which is a payment concept — the type system (via the FK target) is what
prevents that, not application code remembering to filter.

`code` is what the application matches on (`CANCELLED`); `name` is what a user sees
(`CANCELLED`). Keeping them separate means the Spanish label can change without touching any
code path that checks the status.
