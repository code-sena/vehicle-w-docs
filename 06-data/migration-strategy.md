# Migration Strategy

## Tool: Liquibase

Liquibase is the team's actual choice (see `01-context/overview.md` and the "Migration" entry in
`01-context/glossary.md`). We use its **SQL-formatted changelogs** — plain `.sql` files with a
`--liquibase formatted sql` header and one `--changeset` comment per unit of change — rather than
its XML/YAML format, since the whole schema is already hand-written T-SQL and a formatted-SQL
changelog stays a normal `.sql` file that SSMS, `sqlcmd`, and this document's own code blocks can
run unmodified.

Liquibase tracks what ran in `DATABASECHANGELOG` (and coordinates concurrent deploys with
`DATABASECHANGELOGLOCK`), keyed by `id` + `author` + file path — not by filename convention the
way Flyway is, but we still name files in the order they must run, for humans reading the
folder.

`schema_sqlserver.sql`, as it stands today, is a single script meant to be run once against a
fresh database. Turning it into a changelog history means splitting it along the same section
breaks it already has, with one SQL file per changeset group:

```
db/changelog/
  db.changelog-master.xml                        (root — includes every file below, in order)
  001-create-schemas.sql                          (section 1)
  002-create-security-and-audit-core.sql          (section 2 — person, app_user, role,
                                                    permission, role_permission, user_role,
                                                    user_session, password_reset_token,
                                                    audit_log)
  003-create-settings-schema.sql                  (section 3)
  004-create-customer-schema.sql                  (section 4)
  005-create-catalog-schema.sql                   (section 5)
  006-create-reserva-schema.sql                   (section 6)
  007-create-execution-schema.sql                 (section 7)
  008-create-promotion-schema.sql                 (section 8)
  009-create-payment-schema.sql                   (section 9)
  010-create-notification-schema.sql              (section 10)
  011-create-overlap-triggers.sql                 (section 12)
  012-create-service-price-immutability-trigger.sql (section 13)
  013-create-audit-triggers.sql                   (section 14 — see note below)
  seed/
    101-seed-security-role.sql                    (section 15)
    102-seed-customer-catalogs.sql
    103-seed-catalog-service-category.sql
    104-seed-reserva-catalogs.sql
    105-seed-execution-status.sql
    106-seed-promotion-discount-type.sql
    107-seed-payment-catalogs.sql
    108-seed-notification-type.sql
    109-seed-reserva-bays-and-hours.sql
```

`db.changelog-master.xml` just lists `<include file="..."/>` in this exact order — Liquibase runs
files in the order the master lists them, not alphabetically, so the include order is what
actually enforces section 1 before section 2, seeds after every schema exists, and so on.

**A SQL-formatted changeset looks like this** (the header Liquibase parses, wrapping the T-SQL we
already have):

```sql
--liquibase formatted sql

--changeset merari:002-create-security-and-audit-core
--comment: Shared core (person, app_user, role, permission, role_permission,
--         user_role, user_session, password_reset_token) plus audit.audit_log
CREATE TABLE [audit].audit_log (
    ...
);
GO
CREATE TABLE [security].person (
    ...
);
GO
-- ... the rest of section 2, unchanged from schema_sqlserver.sql
```

**Why `013-create-audit-triggers.sql` (the audit trigger generator) has to run last:** section 14
builds one `tr_touch_<table>` trigger per table by querying `sys.tables` / `sys.columns` for every
table that already has a `row_version` column. It's a chicken-and-egg dependency on every earlier
changeset — running it any sooner would generate triggers for a subset of tables and silently miss
the rest.

**Where this breaks down later:** a new domain table added in changeset `014` and beyond won't get
a `tr_touch_` trigger automatically, because `013` already ran and Liquibase never re-runs a
changeset it has already recorded as executed (it checksums each changeset and errors out if the
content of an already-run one changes). From that point on, a changeset adding a new domain table
must also `CREATE TRIGGER tr_touch_<new_table>` explicitly, following the same shape section 14
generates, instead of relying on the one-time bulk generation.

## Rules

```
✓ Changesets are always forward-only — no rollback blocks maintained in this project
✓ One changeset per logical change (one CREATE SCHEMA statement per changeset is too granular;
  one changeset per schema, as above, is the right grain for the initial rollout)
✓ Seed data always ships in its own changeset under seed/, never mixed into a schema changeset
✗ Never edit a changeset that has already run in any environment — including local dev, once
  teammates have pulled it. Liquibase will refuse to proceed (checksum mismatch) if you do,
  which is the intended safety net, not a bug to work around
✗ Never DROP COLUMN / DROP TABLE while any service's code still reads it — deprecate in code
  first, drop in the next release
```

## Two seed-data details that are easy to break by mistake

- `101` through `109` use `SET IDENTITY_INSERT … ON` to seed specific IDs. Two of those IDs are
  load-bearing: `reserva_status.reserva_status_id = 5` (`CANCELADA`) is hard-coded inside
  `ck_reserva_cancel` and `tr_reserva_bay_overlap`; `payment_status.payment_status_id = 3`
  (`APPROVED`) is hard-coded inside `ux_payment_one_approved_per_reserva`. Re-running a seed
  changeset with a different row order, or re-seeding from scratch without `IDENTITY_INSERT`,
  would silently break both constraints.
- Seed changesets are the one place a `preConditions` block matters: add
  `--preConditions onFail:MARK_RAN` with a `sqlCheck` that the target table is empty, so
  re-running Liquibase against a database that already has this seed data skips the insert
  instead of violating the tables' `UNIQUE (code)` constraints.

## Compatible changes (ship directly as a new changeset)

```sql
--liquibase formatted sql

--changeset merari:014-add-reserva-customer-note
ALTER TABLE reserva.reserva ADD customer_note NVARCHAR(300) NULL;
GO

--changeset merari:015-add-payment-currency-code
ALTER TABLE payment.payment ADD currency_code CHAR(3) NOT NULL CONSTRAINT df_payment_currency DEFAULT 'COP';
GO

--changeset merari:016-add-reserva-scheduled-end-index
CREATE INDEX ix_reserva_scheduled_end ON reserva.reserva (scheduled_end);
GO
```

Nullable columns, `NOT NULL` columns with a valid `DEFAULT`, and new indexes are always safe as a
single changeset (SQL Server has no `CONCURRENTLY`; expect a brief lock on large tables).

## Incompatible changes (need a two-phase migration)

Example: renaming `payment.payment_receipt.transaction_reference` to
`payment.payment_receipt.reference_code` without downtime.

```sql
--liquibase formatted sql

--changeset merari:017-add-payment-receipt-reference-code
-- Phase 1 (release N): add the new column, backfill it, deploy code that writes both
ALTER TABLE payment.payment_receipt ADD reference_code NVARCHAR(100) NULL;
GO
UPDATE payment.payment_receipt SET reference_code = transaction_reference;
GO

--changeset merari:018-drop-payment-receipt-transaction-reference
-- Phase 2 (release N+1, once no running code reads the old column): drop it
ALTER TABLE payment.payment_receipt DROP COLUMN transaction_reference;
GO
```

The same two-phase approach applies to any column that changes type or meaning, not just
renames — dropping the old value one release after the last consumer stops reading it, each phase
as its own changeset so the two can ship in different releases.
