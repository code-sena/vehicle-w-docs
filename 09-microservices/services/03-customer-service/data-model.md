# Data model — Customer Service

Schema `customer` in the shared SQL Server database `LavaRapido` (one owning service per schema, ADR-003/ADR-009): 3 tables, 39 columns. No foreign key leaves these schemas; references to other services are plain columns (last section).

> **Source:** the Liquibase changelogs of `lavarapido-customer-service` on `origin/develop` (`02cdb46`, 2026-10-23), applied in the order of `src/main/resources/db/changelog/db.changelog-master.xml`. The tables below were generated from those changelogs and are checked against them, against the JPA entities and against the ERD (`08-uml/diagrams/source/erd-customer.md`) by the script described in `06-data/migration-strategy.md` ("How the docs are checked"). The rationale of each table is in `06-data/models.md`.

## Tables

| Table | Purpose | Created in |
|---|---|---|
| `customer.vehicle_type` | The 6 vehicle types with fixed ids (seed 102). `size_factor` is only the price suggestion shown to the admin; the real price is `catalog.service_price`. | 004 |
| `customer.customer` | Client profile: `person_id` and `user_id` (the JWT `sub`) point to `security` without FK. `loyalty_points` was planned as a display copy of the balance; nothing updates it (the balance is read live from payment-service). | 004 |
| `customer.customer_vehicle` | Vehicle of a client: plate (stored clean and upper-case), type, brand, model (015), color. Soft delete; the plate is unique only among vehicles that are not deleted. | 004 |

- The three tables have their touch trigger; the code never writes `updated_at` or `row_version`.

## Columns, keys and indexes

**Null** = accepts NULL. **Key**: `PK`, `IDENTITY` (starts at 1, step 1), `FK →` a table of this service, `UQ` (unique; *filtered* = only among the rows of its `WHERE`), `→ … (no FK)` = reference to another service. **Since** = migration that added the column. Dates are `DATETIME2(3)` in UTC.

### `customer.vehicle_type`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `vehicle_type_id` | SMALLINT | No | — | PK, IDENTITY | 004 |
| `code` | NVARCHAR(30) | No | — | UQ | 004 |
| `name` | NVARCHAR(60) | No | — | — | 004 |
| `size_factor` | DECIMAL(4,2) | No | — | — | 004 |
| `display_order` | SMALLINT | No | `0` | — | 004 |
| `is_active` | BIT | No | `1` | — | 004 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 004 |
| `created_by` | BIGINT | Yes | — | — | 004 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 004 |
| `updated_by` | BIGINT | Yes | — | — | 004 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 004 |
| `deleted_by` | BIGINT | Yes | — | — | 004 |
| `row_version` | INT | No | `1` | — | 004 |

- Constraints: `pk_vehicle_type` PRIMARY KEY (vehicle_type_id) · `uq_vehicle_type_code` UNIQUE (code) · `ck_vehicle_type_size_factor` CHECK `size_factor > 0`
- Indexes: —
- Triggers: `tr_touch_vehicle_type` (AFTER UPDATE, sets `updated_at` and `row_version`)

### `customer.customer`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `customer_id` | BIGINT | No | — | PK, IDENTITY | 004 |
| `person_id` | BIGINT | No | — | UQ, → security.person (no FK) | 004 |
| `loyalty_points` | INT | No | `0` | — | 004 |
| `customer_since` | DATE | No | `CAST(SYSUTCDATETIME() AS DATE)` | — | 004 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 004 |
| `created_by` | BIGINT | Yes | — | — | 004 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 004 |
| `updated_by` | BIGINT | Yes | — | — | 004 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 004 |
| `deleted_by` | BIGINT | Yes | — | — | 004 |
| `row_version` | INT | No | `1` | — | 004 |
| `user_id` | BIGINT | Yes | — | UQ (filtered), → security.app_user (no FK) | 014 |

- Constraints: `pk_customer` PRIMARY KEY (customer_id) · `uq_customer_person` UNIQUE (person_id) · `ck_customer_points` CHECK `loyalty_points >= 0`
- Indexes: `ux_customer_user` UNIQUE (user_id) WHERE `user_id IS NOT NULL AND deleted_at IS NULL`
- Triggers: `tr_touch_customer` (AFTER UPDATE, sets `updated_at` and `row_version`)

### `customer.customer_vehicle`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `customer_vehicle_id` | BIGINT | No | — | PK, IDENTITY | 004 |
| `customer_id` | BIGINT | No | — | FK → customer.customer.customer_id | 004 |
| `license_plate` | NVARCHAR(10) | No | — | UQ (filtered) | 004 |
| `vehicle_type_id` | SMALLINT | No | — | FK → customer.vehicle_type.vehicle_type_id | 004 |
| `brand` | NVARCHAR(50) | Yes | — | — | 004 |
| `color` | NVARCHAR(30) | Yes | — | — | 004 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 004 |
| `created_by` | BIGINT | Yes | — | — | 004 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 004 |
| `updated_by` | BIGINT | Yes | — | — | 004 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 004 |
| `deleted_by` | BIGINT | Yes | — | — | 004 |
| `row_version` | INT | No | `1` | — | 004 |
| `model` | NVARCHAR(50) | Yes | — | — | 015 |

- Constraints: `pk_customer_vehicle` PRIMARY KEY (customer_vehicle_id) · `fk_customer_vehicle_customer` FOREIGN KEY (customer_id) → customer.customer (customer_id) · `fk_customer_vehicle_type` FOREIGN KEY (vehicle_type_id) → customer.vehicle_type (vehicle_type_id)
- Indexes: `ux_customer_vehicle_plate_active` UNIQUE (license_plate) WHERE `deleted_at IS NULL` · `ix_customer_vehicle_customer` (customer_id)
- Triggers: `tr_touch_customer_vehicle` (AFTER UPDATE, sets `updated_at` and `row_version`)

## Triggers

| Trigger | Table | Fires | What it does |
|---|---|---|---|
| `tr_touch_vehicle_type` | `customer.vehicle_type` | AFTER UPDATE | Sets `updated_at = SYSUTCDATETIME()` and `row_version + 1` on the updated rows (skips nested calls) |
| `tr_touch_customer` | `customer.customer` | AFTER UPDATE | Sets `updated_at = SYSUTCDATETIME()` and `row_version + 1` on the updated rows (skips nested calls) |
| `tr_touch_customer_vehicle` | `customer.customer_vehicle` | AFTER UPDATE | Sets `updated_at = SYSUTCDATETIME()` and `row_version + 1` on the updated rows (skips nested calls) |

## Seed data

- `102-seed-customer-catalogs`: the 6 vehicle types with fixed ids 1–6.

## Migrations

Liquibase, changelog table `DATABASECHANGELOG_CUSTOMER` (lock table `DATABASECHANGELOGLOCK_CUSTOMER`), in the order of the master file:

| Order | File | Changesets | Precondition | Rollback | Purpose |
|---|---|---|---|---|---|
| 1 | `004-create-customer-schema.sql` | 7 | onFail:MARK_RAN | No | Schema `customer`, tables `vehicle_type`, `customer`, `customer_vehicle`, filtered unique plate index and the 3 touch triggers |
| 2 | `014-add-customer-user-id.sql` | 2 | onFail:MARK_RAN | No | Column `customer.user_id` and filtered unique index `ux_customer_user` |
| 3 | `015-add-customer-vehicle-model.sql` | 1 | onFail:MARK_RAN | No | Column `customer_vehicle.model` |
| 4 | `seed/102-seed-customer-catalogs.sql` | 1 | onFail:MARK_RAN | No | Seed: the 6 vehicle types with fixed ids 1–6 |

**Changesets** = `--changeset` blocks in the file; **Precondition** = what Liquibase does when the check fails (`MARK_RAN`: mark as run without executing; `CONTINUE`: skip now and try again on the next update; `HALT`: stop the migration). Numbering and rules: `06-data/migration-strategy.md`.

## References to other services (no FK)

| Column | Points to | Owner | Index |
|---|---|---|---|
| `customer.customer.person_id` | `security.person` | security-service | `uq_customer_person` |
| `customer.customer.user_id` | `security.app_user` | security-service | `ux_customer_user` |
