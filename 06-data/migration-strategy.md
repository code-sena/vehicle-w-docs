# Migration Strategy

## Tool: Flyway

SQL Server, triggers, filtered indexes, and `SET IDENTITY_INSERT` blocks are all plain T-SQL —
there's nothing here that benefits from an abstraction layer like Liquibase's XML/YAML. Flyway
runs the `.sql` files we already have almost unchanged, tracks what ran in
`flyway_schema_history`, and its naming convention is the one already used informally in this
document (`V001__…`, `S001__…`).

`schema_sqlserver.sql`, as it stands today, is a single script meant to be run once against a
fresh database. Turning it into a migration history means splitting it along the same section
breaks it already has:

```
V001__create_schemas.sql                        (section 1)
V002__create_security_and_audit_core.sql         (section 2 — person, app_user, role,
                                                   permission, role_permission, user_role,
                                                   user_session, password_reset_token,
                                                   audit_log)
V003__create_settings_schema.sql                 (section 3)
V004__create_customer_schema.sql                 (section 4)
V005__create_catalog_schema.sql                  (section 5)
V006__create_reserve_schema.sql                  (section 6)
V007__create_execution_schema.sql                (section 7)
V008__create_promotion_schema.sql                (section 8)
V009__create_payment_schema.sql                  (section 9)
V010__create_notification_schema.sql             (section 10)
V011__create_overlap_triggers.sql                (section 12)
V012__create_service_price_immutability_trigger.sql (section 13)
V013__create_audit_triggers.sql                  (section 14 — see note below)
S001__seed_security_role.sql                     (section 15)
S002__seed_customer_catalogs.sql
S003__seed_catalog_service_category.sql
S004__seed_reserve_catalogs.sql
S005__seed_execution_status.sql
S006__seed_promotion_discount_type.sql
S007__seed_payment_catalogs.sql
S008__seed_notification_type.sql
S009__seed_reserve_bays_and_hours.sql
```

**Why `V013` (the audit trigger generator) has to run last:** section 14 builds one
`tr_touch_<table>` trigger per table by querying `sys.tables` / `sys.columns` for every table
that already has a `row_version` column. It's a chicken-and-egg dependency on every earlier
migration — running it any sooner would generate triggers for a subset of tables and silently
miss the rest.

**Where this breaks down later:** a new domain table added in `V014` and beyond won't get a
`tr_touch_` trigger automatically, because `V013` already ran and Flyway never re-runs a
migration that already succeeded. From that point on, a migration adding a new domain table
must also `CREATE TRIGGER tr_touch_<new_table>` explicitly, following the same shape section
14 generates, instead of relying on the one-time bulk generation.

## Rules

```
✓ Migrations are always forward-only — no down-migrations in this project
✓ One migration per logical change (one CREATE SCHEMA statement per file is too granular;
  one file per schema, as above, is the right grain for the initial rollout)
✓ Seed data always ships in its own S-prefixed migration, never mixed into a V migration
✗ Never edit a migration that has already run in any environment — including local dev,
  once teammates have pulled it
✗ Never DROP COLUMN / DROP TABLE while any service's code still reads it — deprecate in
  code first, drop in the next release
```

## Two seed-data details that are easy to break by mistake

- `S001` through `S009` use `SET IDENTITY_INSERT … ON` to seed specific IDs. Two of those IDs
  are load-bearing: `reserve_status.reserve_status_id = 5` (`CANCELLED`) is hard-coded inside
  `ck_reserve_cancel` and `tr_reserve_bay_overlap`; `payment_status.payment_status_id = 3`
  (`APPROVED`) is hard-coded inside `ux_payment_one_approved_per_reserve`. Re-running a seed
  migration with a different row order, or re-seeding from scratch without `IDENTITY_INSERT`,
  would silently break both constraints.
- Seed migrations are the one place `IF NOT EXISTS` guards matter: Flyway won't re-run
  `S001` once it's recorded as applied, but a manual `INSERT` against a database that already
  has this seed data would violate the tables' `UNIQUE (code)` constraints outright — which is
  the intended safety net, not a bug to work around.

## Compatible changes (ship directly as a new `V` migration)

```sql
-- Nullable column: always safe
ALTER TABLE reserve.reserve ADD COLUMN customer_note NVARCHAR(300) NULL;

-- NOT NULL column with a valid DEFAULT: safe
ALTER TABLE payment.payment ADD COLUMN currency_code CHAR(3) NOT NULL DEFAULT 'COP';

-- New index: safe (SQL Server has no CONCURRENTLY; expect a brief lock on large tables)
CREATE INDEX ix_reserve_scheduled_end ON reserve.reserve (scheduled_end);
```

## Incompatible changes (need a two-phase migration)

Example: renaming `payment.payment_receipt.transaction_reference` to
`payment.payment_receipt.reference_code` without downtime.

```sql
-- Phase 1 (release N): add the new column, backfill it, deploy code that writes both
ALTER TABLE payment.payment_receipt ADD reference_code NVARCHAR(100) NULL;
UPDATE payment.payment_receipt SET reference_code = transaction_reference;

-- Phase 2 (release N+1, once no running code reads the old column): drop it
ALTER TABLE payment.payment_receipt DROP COLUMN transaction_reference;
```

The same two-phase approach applies to any column that changes type or meaning, not just
renames — dropping the old value one release after the last consumer stops reading it.
