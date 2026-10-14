# Migration Strategy

## Tool: Liquibase, one changelog per service

Liquibase with **SQL-formatted changelogs** (`--liquibase formatted sql`, one `--changeset` per
unit of change). Each service owns the changelog of **its own schemas** in
`src/main/resources/db/changelog/` and applies it at startup; `ddl-auto: validate` then checks that
the JPA entities match the tables.

Every service records its history in its **own changelog tables**, so services migrate
independently in the shared `LavaRapido` database:

| Service | Changelog tables |
|---|---|
| security-service | `DATABASECHANGELOG_SECURITY`, `DATABASECHANGELOGLOCK_SECURITY` |
| customer-service | `DATABASECHANGELOG_CUSTOMER`, `DATABASECHANGELOGLOCK_CUSTOMER` |
| booking-service | `DATABASECHANGELOG_BOOKING`, `DATABASECHANGELOGLOCK_BOOKING` |
| operations-service | `DATABASECHANGELOG_OPERATIONS`, `DATABASECHANGELOGLOCK_OPERATIONS` |
| payment-service | `DATABASECHANGELOG_PAYMENT`, `DATABASECHANGELOGLOCK_PAYMENT` |
| notification-service | `DATABASECHANGELOG_NOTIFICATION`, `DATABASECHANGELOGLOCK_NOTIFICATION` |

## File numbering (shared across services)

Numbers are unique across the whole system, so a number tells which part of the model a file
touches and in which order the global script (`lavarapido-6-services-sqlserver.sql`) applies them:

| Range | Meaning |
|---|---|
| `001`–`013` | Initial schema, one block per schema (from the original single script) |
| `014`+ | Later changes, numbered in the order they were made |
| `101`–`109` | Seed data (`seed/` folder) |

Current files (2026-10-09):

```
security-service       001-create-security-schemas · 002-create-security-and-audit-core
                       003-create-security-user-preference · seed/101-seed-security-role
                       020-security-user-preference-palettes
                       023-security-custom-role (created and dropped again in the same
                         session by 026 — see ADR-015: replaced before any other
                         environment pulled it, so it never shipped as real history)
                       026-security-role-permissions (drops custom_role, seeds
                         security.permission and default security.role_permission rows)
                       030-security-user-preference-notification-channels
                         (email_reminders_enabled, promotions_enabled — ADR-011 §12)
                       034-security-login-lockout (RF-004b)
customer-service       004-create-customer-schema · 014-add-customer-user-id
                       015-add-customer-vehicle-model · seed/102-seed-customer-catalogs
booking-service        005-create-booking-schemas (catalog + booking, triggers)
                       018-booking-adr-010 (bay_status, bay state, business-hour break)
                       021-booking-schedule-history (audit log for schedule/bay changes)
                       022-booking-catalog-loyalty-points (catalog.service.loyalty_points)
                       024-booking-revert-bay-operator (drops service_bay.operator_id —
                         ADR-015 reaffirms ADR-010's per-booking pairing, not per-shift)
                       seed/103-seed-catalog · seed/104-seed-booking-catalogs
                       seed/109-seed-establishment-schedule
                       032-booking-establishment-business-data (legal, tax and channel columns)
                       seed/110-seed-establishment-business-data (example values for them)
notification-service   010-create-notification-schema · 016-create-notification-device-token
                       017-create-notification-processed-event
                       019-create-notification-booking-reminder · seed/108-seed-notification-type
                       025-notification-promotion-redeemed-type (PROMOTION_REDEEMED)
                       027-notification-staff-notifications (staff types + booking_tracking)
                       028-notification-payment-refunded-type (PAYMENT_REFUNDED)
                       029-notification-loyalty-and-inspection-types
                         (LOYALTY_POINTS_EARNED, INSPECTION_REPORT)
                       031-notification-unassigned-booking-alert
                         (booking_tracking.unassigned_alert_at, ADMIN_BOOKING_UNASSIGNED — ADR-011 §14)
operations-service     007-create-execution-schema (5 tables + triggers) · seed/105-seed-execution-status
                       033-execution-inspection-report (inspection report, phases, findings, photos — ADR-014 §9)
payment-service        db/changelog/changes/001 … 018 (own numbering, see below)
```

Current global high-water mark: **034** (security-service); seeds go up to **110**. The next new
changeset in any Java service's shared numbering starts at **035**, and the next seed at **111**.

**payment-service is different** (.NET, ADR-013):

- Its changelogs live in `lavarapido-payment-service/db/changelog/` (YAML master, plain-SQL files
  in `changes/`), not in `src/main/resources`.
- The service does not apply them at startup: the `payment-migrate` container
  (`liquibase/liquibase:4.29` in `lavarapido-infra/docker-compose.yml`) runs `update` once.
- It uses its **own numbering** `001`–`018` (`001-create-schema-promotion` … `015-seed-reference-data`,
  `016-payment-images-as-data`, `017-promotion-package-fields`, `018-promotion-required-points`).
  Those numbers repeat the global ones above; the changeset ids (`pay-0NN-…`) and the changelog
  table `DATABASECHANGELOG_PAYMENT` keep them apart, but a new payment file should not be read as
  part of the global sequence.

`db.changelog-master.xml` of each service lists its files with `<include>`; Liquibase runs them in
that order (schema first, then later changes, then seeds).

## How a changeset looks

```sql
--liquibase formatted sql

--changeset lavarapido:security-001-schema-security
--comment: Esquema del security-service (ADR-009)
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM sys.schemas WHERE name = 'security'
CREATE SCHEMA [security];
```

- Author `lavarapido`, id `<service>-<number>-<what>`.
- **Every changeset has a precondition with `onFail:MARK_RAN`**: if the object already exists
  (database created earlier from the global script), Liquibase marks it as run instead of failing.
  This is what lets a database created by hand and a database created by the services converge.

## Triggers

There is no generic trigger generator. Each changeset that creates a domain table with
`row_version` also creates its `tr_touch_<table>` trigger explicitly (examples: `tr_touch_booking`,
`tr_touch_customer_vehicle`, `tr_touch_user_preference`). Business triggers live with their
tables: `tr_booking_bay_overlap` and `tr_service_price_immutable` in booking `005`.

## Keeping the global script in sync

`lavarapido-6-services-sqlserver.sql` (repository root of the docs workspace) is the full model in
one script for people who create the database by hand. When a service adds a changeset, the same
change goes into the script and into `models.md` in the same PR. Last full check: 2026-10-04 (script
run on an empty database: 47 tables).

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

- Seeds of status catalogs use `SET IDENTITY_INSERT … ON` to seed specific IDs. Two of those IDs are
  load-bearing: `booking_status.booking_status_id = 5` (`CANCELLED`) is hard-coded inside
  `ck_booking_cancel` and `tr_booking_bay_overlap`; `payment_status.payment_status_id = 3`
  (`APPROVED`) is hard-coded inside `ux_payment_one_approved_per_booking`. Re-running a seed
  changeset with a different row order, or re-seeding from scratch without `IDENTITY_INSERT`,
  would silently break both constraints.
- Seed changesets check that the target table is empty
  (`--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM …` with `onFail:MARK_RAN`), so a
  database that already has the seed data skips the insert instead of violating the tables'
  `UNIQUE (code)` constraints.

## Compatible changes (ship directly as a new changeset)

```sql
--liquibase formatted sql

--changeset merari:014-add-booking-customer-note
ALTER TABLE booking.booking ADD customer_note NVARCHAR(300) NULL;
GO

--changeset merari:015-add-payment-currency-code
ALTER TABLE payment.payment ADD currency_code CHAR(3) NOT NULL CONSTRAINT df_payment_currency DEFAULT 'COP';
GO

--changeset merari:016-add-booking-scheduled-end-index
CREATE INDEX ix_booking_scheduled_end ON booking.booking (scheduled_end);
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
