# Data model — Booking Service

Schemas `catalog` and `booking` in the shared SQL Server database `LavaRapido` (one owning service per schema, ADR-003/ADR-009): 13 tables, 183 columns. No foreign key leaves these schemas; references to other services are plain columns (last section).

> **Source:** the Liquibase changelogs of `lavarapido-booking-service` on `origin/develop` (`5dd6794`, 2026-10-24), applied in the order of `src/main/resources/db/changelog/db.changelog-master.xml`. The tables below were generated from those changelogs and are checked against them, against the JPA entities and against the ERD (`08-uml/diagrams/source/erd-booking.md`) by the script described in `06-data/migration-strategy.md` ("How the docs are checked"). The rationale of each table is in `06-data/models.md`.

## Tables

| Table | Purpose | Created in |
|---|---|---|
| `catalog.service_category` | Service categories: `LAVADO`, `POLICHADO`, `DETALLADO`, `INTERIOR`, `PAQUETES` (seed 103; combos are services of `PAQUETES`, ADR-010). | 005 |
| `catalog.service` | Service without price (2NF): code, name, description, category, active flag and the loyalty points it earns (022). | 005 |
| `catalog.service_price` | Price and estimated minutes per (service, vehicle type), valid from/to. **Immutable** (`tr_service_price_immutable`): a new price closes the row (`valid_to`) and inserts another; one current row per pair (`ux_service_price_current`). Since 044 the current price must be greater than 0 (`ck_service_price_positive`; closed or deleted rows may stay at 0). | 005 |
| `booking.establishment` | The shop (a single row, `singleton = 1`): contact data plus the legal, tax and channel data edited in Settings (032). The example values of seed 110 were emptied again by seed 111, and seed 113 removes the invented business that seed 109 created (only the values still equal to the example). | 005 |
| `booking.business_hour` | Weekly hours, one row per weekday (1 = Monday … 7 = Sunday), with an optional break (018) that falls inside the opening hours. | 005 |
| `booking.business_hour_exception` | Holiday (closed all day) or special day with other hours, one per date. Soft delete; a soft-deleted row with the same date is physically deleted before reusing the date (`SchedulePersistenceAdapter`). | 005 |
| `booking.service_bay` | Wash bays with their state (`bay_status_id`, 018; it replaced `is_active`). Capacity is the number of bays that accept bookings. | 005 |
| `booking.booking_status` | Booking states with fixed ids: 1 `SCHEDULED`, 2 `CONFIRMED`, 3 `IN_PROGRESS`, 4 `COMPLETED`, 5 `CANCELLED`, 6 `NO_SHOW` (seed 104). Ids 1–3 (active) and 5 are hard-coded in `tr_booking_bay_overlap` and `ck_booking_cancel`. | 005 |
| `booking.cancellation_reason` | Cancellation reasons (seed 104) plus the system reason `EXPIRED` (seed 112) used when a scheduled booking reaches its time without confirmation. | 005 |
| `booking.booking` | The booking: vehicle (no FK), bay, start/end in UTC, status, who booked (no FK), cancellation reason, notes. No total column: the total is computed from its lines. `row_version` is the optimistic lock of `BookingJpaEntity` (`@Version`, 045). | 005 |
| `booking.booking_service` | Booking lines. Each one points to the immutable `service_price` row it was charged with, and since 043 keeps the loyalty points the service was worth when booked (lines older than 043 got the points current at migration time). | 005 |
| `booking.bay_status` | Bay states with fixed ids: 1 `ACTIVE` (accepts bookings), 2 `MAINTENANCE`, 3 `INACTIVE` (018, ADR-010). | 018 |
| `booking.schedule_history` | Insert-only log of changes to the weekly hours (`WEEK`), the exceptions (`EXCEPTION`) and the bays (`BAY`), shown in Schedule and bays (021). No audit block: it is never edited or deleted. | 021 |

- Status codes are in English (ADR-010); the web and the app translate them.
- `booking_service`, `service_category`, `booking_status`, `cancellation_reason` and `bay_status` carry `row_version` but have no touch trigger, so it stays at 1 when they change.
- `booking.row_version` is the optimistic lock (`@Version` in `BookingJpaEntity`, BIZ-09): two requests that change the same booking cannot both win, and the second answers 409. Since 045 `tr_touch_booking` only bumps it when the `UPDATE` did not (a manual script).

## Columns, keys and indexes

**Null** = accepts NULL. **Key**: `PK`, `IDENTITY` (starts at 1, step 1), `FK →` a table of this service, `UQ` (unique; *filtered* = only among the rows of its `WHERE`), `→ … (no FK)` = reference to another service. **Since** = migration that added the column. Dates are `DATETIME2(3)` in UTC.

### `catalog.service_category`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `service_category_id` | SMALLINT | No | — | PK, IDENTITY | 005 |
| `code` | NVARCHAR(30) | No | — | UQ | 005 |
| `name` | NVARCHAR(60) | No | — | — | 005 |
| `description` | NVARCHAR(200) | Yes | — | — | 005 |
| `display_order` | SMALLINT | No | `0` | — | 005 |
| `is_active` | BIT | No | `1` | — | 005 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 005 |
| `created_by` | BIGINT | Yes | — | — | 005 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 005 |
| `updated_by` | BIGINT | Yes | — | — | 005 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 005 |
| `deleted_by` | BIGINT | Yes | — | — | 005 |
| `row_version` | INT | No | `1` | — | 005 |

- Constraints: `pk_service_category` PRIMARY KEY (service_category_id) · `uq_service_category_code` UNIQUE (code)
- Indexes: —
- Triggers: —

### `catalog.service`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `service_id` | INT | No | — | PK, IDENTITY | 005 |
| `code` | NVARCHAR(30) | No | — | UQ | 005 |
| `name` | NVARCHAR(100) | No | — | — | 005 |
| `description` | NVARCHAR(MAX) | Yes | — | — | 005 |
| `service_category_id` | SMALLINT | No | — | FK → catalog.service_category.service_category_id | 005 |
| `is_active` | BIT | No | `1` | — | 005 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 005 |
| `created_by` | BIGINT | Yes | — | — | 005 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 005 |
| `updated_by` | BIGINT | Yes | — | — | 005 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 005 |
| `deleted_by` | BIGINT | Yes | — | — | 005 |
| `row_version` | INT | No | `1` | — | 005 |
| `loyalty_points` | INT | No | `0` | — | 022 |

- Constraints: `pk_service` PRIMARY KEY (service_id) · `uq_service_code` UNIQUE (code) · `fk_service_category` FOREIGN KEY (service_category_id) → catalog.service_category (service_category_id)
- Indexes: —
- Triggers: `tr_touch_service` (AFTER UPDATE, sets `updated_at` and `row_version`)

### `catalog.service_price`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `service_price_id` | BIGINT | No | — | PK, IDENTITY | 005 |
| `service_id` | INT | No | — | FK → catalog.service.service_id | 005 |
| `vehicle_type_id` | SMALLINT | No | — | → customer.vehicle_type (no FK) | 005 |
| `price` | DECIMAL(12,2) | No | — | — | 005 |
| `estimated_minutes` | SMALLINT | No | — | — | 005 |
| `valid_from` | DATE | No | — | — | 005 |
| `valid_to` | DATE | Yes | — | — | 005 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 005 |
| `created_by` | BIGINT | Yes | — | — | 005 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 005 |
| `updated_by` | BIGINT | Yes | — | — | 005 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 005 |
| `deleted_by` | BIGINT | Yes | — | — | 005 |
| `row_version` | INT | No | `1` | — | 005 |

- Constraints: `pk_service_price` PRIMARY KEY (service_price_id) · `fk_service_price_service` FOREIGN KEY (service_id) → catalog.service (service_id) · `ck_service_price_price` CHECK `price >= 0` · `ck_service_price_minutes` CHECK `estimated_minutes > 0` · `ck_service_price_range` CHECK `valid_to IS NULL OR valid_to > valid_from` · `ck_service_price_positive` CHECK `price > 0 OR valid_to IS NOT NULL OR deleted_at IS NOT NULL` (044; created `WITH NOCHECK` if existing rows broke it)
- Indexes: `ux_service_price_current` UNIQUE (service_id, vehicle_type_id) WHERE `valid_to IS NULL AND deleted_at IS NULL` · `ix_service_price_vehicle_type` (vehicle_type_id)
- Triggers: `tr_service_price_immutable` (AFTER UPDATE) · `tr_touch_service_price` (AFTER UPDATE, sets `updated_at` and `row_version`)

### `booking.establishment`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `establishment_id` | SMALLINT | No | — | PK, IDENTITY | 005 |
| `legal_name` | NVARCHAR(150) | No | — | — | 005 |
| `trade_name` | NVARCHAR(150) | No | — | — | 005 |
| `tax_id` | NVARCHAR(30) | No | — | — | 005 |
| `address` | NVARCHAR(200) | No | — | — | 005 |
| `phone` | NVARCHAR(20) | Yes | — | — | 005 |
| `email` | NVARCHAR(120) | Yes | — | — | 005 |
| `logo_url` | NVARCHAR(500) | Yes | — | — | 005 |
| `singleton` | BIT | No | `1` | UQ | 005 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 005 |
| `created_by` | BIGINT | Yes | — | — | 005 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 005 |
| `updated_by` | BIGINT | Yes | — | — | 005 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 005 |
| `deleted_by` | BIGINT | Yes | — | — | 005 |
| `row_version` | INT | No | `1` | — | 005 |
| `business_type` | NVARCHAR(100) | Yes | — | — | 032 |
| `founded_on` | DATE | Yes | — | — | 032 |
| `legal_representative` | NVARCHAR(150) | Yes | — | — | 032 |
| `legal_representative_document` | NVARCHAR(30) | Yes | — | — | 032 |
| `website` | NVARCHAR(200) | Yes | — | — | 032 |
| `tax_regime` | NVARCHAR(150) | Yes | — | — | 032 |
| `ciiu_activity` | NVARCHAR(150) | Yes | — | — | 032 |
| `dian_resolution` | NVARCHAR(60) | Yes | — | — | 032 |
| `invoice_prefix` | NVARCHAR(10) | Yes | — | — | 032 |
| `invoice_range` | NVARCHAR(30) | Yes | — | — | 032 |
| `instagram` | NVARCHAR(100) | Yes | — | — | 032 |
| `facebook` | NVARCHAR(150) | Yes | — | — | 032 |
| `support_line` | NVARCHAR(30) | Yes | — | — | 032 |
| `service_hours_note` | NVARCHAR(150) | Yes | — | — | 032 |

- Constraints: `pk_establishment` PRIMARY KEY (establishment_id) · `uq_establishment_singleton` UNIQUE (singleton) · `ck_establishment_singleton` CHECK `singleton = 1`
- Indexes: —
- Triggers: `tr_touch_establishment` (AFTER UPDATE, sets `updated_at` and `row_version`)

### `booking.business_hour`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `business_hour_id` | SMALLINT | No | — | PK, IDENTITY | 005 |
| `day_of_week` | SMALLINT | No | — | UQ | 005 |
| `opens_at` | TIME(0) | No | — | — | 005 |
| `closes_at` | TIME(0) | No | — | — | 005 |
| `is_active` | BIT | No | `1` | — | 005 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 005 |
| `created_by` | BIGINT | Yes | — | — | 005 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 005 |
| `updated_by` | BIGINT | Yes | — | — | 005 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 005 |
| `deleted_by` | BIGINT | Yes | — | — | 005 |
| `row_version` | INT | No | `1` | — | 005 |
| `break_starts_at` | TIME(0) | Yes | — | — | 018 |
| `break_ends_at` | TIME(0) | Yes | — | — | 018 |

- Constraints: `pk_business_hour` PRIMARY KEY (business_hour_id) · `uq_business_hour_day` UNIQUE (day_of_week) · `ck_business_hour_day` CHECK `day_of_week BETWEEN 1 AND 7` · `ck_business_hour_range` CHECK `closes_at > opens_at` · `ck_business_hour_break` CHECK `(break_starts_at IS NULL AND break_ends_at IS NULL) OR (break_starts_at IS NOT NULL AND break_ends_at IS NOT NULL AND break_starts_at > opens_at AND break_ends_at < closes_at AND break_ends_at > break_starts_at)`
- Indexes: —
- Triggers: `tr_touch_business_hour` (AFTER UPDATE, sets `updated_at` and `row_version`)

### `booking.business_hour_exception`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `business_hour_exception_id` | INT | No | — | PK, IDENTITY | 005 |
| `exception_date` | DATE | No | — | UQ | 005 |
| `is_closed` | BIT | No | `1` | — | 005 |
| `opens_at` | TIME(0) | Yes | — | — | 005 |
| `closes_at` | TIME(0) | Yes | — | — | 005 |
| `reason` | NVARCHAR(120) | No | — | — | 005 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 005 |
| `created_by` | BIGINT | Yes | — | — | 005 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 005 |
| `updated_by` | BIGINT | Yes | — | — | 005 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 005 |
| `deleted_by` | BIGINT | Yes | — | — | 005 |
| `row_version` | INT | No | `1` | — | 005 |

- Constraints: `pk_business_hour_exception` PRIMARY KEY (business_hour_exception_id) · `uq_business_hour_exception_date` UNIQUE (exception_date) · `ck_bhe_hours` CHECK `(is_closed = 1 AND opens_at IS NULL AND closes_at IS NULL) OR (is_closed = 0 AND opens_at IS NOT NULL AND closes_at IS NOT NULL AND closes_at > opens_at)`
- Indexes: —
- Triggers: `tr_touch_business_hour_exception` (AFTER UPDATE, sets `updated_at` and `row_version`)

### `booking.service_bay`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `service_bay_id` | SMALLINT | No | — | PK, IDENTITY | 005 |
| `code` | NVARCHAR(20) | No | — | UQ | 005 |
| `name` | NVARCHAR(60) | No | — | — | 005 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 005 |
| `created_by` | BIGINT | Yes | — | — | 005 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 005 |
| `updated_by` | BIGINT | Yes | — | — | 005 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 005 |
| `deleted_by` | BIGINT | Yes | — | — | 005 |
| `row_version` | INT | No | `1` | — | 005 |
| `bay_status_id` | SMALLINT | No | `1` | FK → booking.bay_status.bay_status_id | 018 |

- Constraints: `pk_service_bay` PRIMARY KEY (service_bay_id) · `uq_service_bay_code` UNIQUE (code) · `fk_service_bay_status` FOREIGN KEY (bay_status_id) → booking.bay_status (bay_status_id)
- Indexes: —
- Triggers: `tr_touch_service_bay` (AFTER UPDATE, sets `updated_at` and `row_version`)

### `booking.booking_status`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `booking_status_id` | SMALLINT | No | — | PK, IDENTITY | 005 |
| `code` | NVARCHAR(30) | No | — | UQ | 005 |
| `name` | NVARCHAR(60) | No | — | — | 005 |
| `is_final` | BIT | No | `0` | — | 005 |
| `display_order` | SMALLINT | No | `0` | — | 005 |
| `is_active` | BIT | No | `1` | — | 005 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 005 |
| `created_by` | BIGINT | Yes | — | — | 005 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 005 |
| `updated_by` | BIGINT | Yes | — | — | 005 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 005 |
| `deleted_by` | BIGINT | Yes | — | — | 005 |
| `row_version` | INT | No | `1` | — | 005 |

- Constraints: `pk_booking_status` PRIMARY KEY (booking_status_id) · `uq_booking_status_code` UNIQUE (code)
- Indexes: —
- Triggers: —

### `booking.cancellation_reason`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `cancellation_reason_id` | SMALLINT | No | — | PK, IDENTITY | 005 |
| `code` | NVARCHAR(30) | No | — | UQ | 005 |
| `name` | NVARCHAR(60) | No | — | — | 005 |
| `is_customer_fault` | BIT | No | `0` | — | 005 |
| `display_order` | SMALLINT | No | `0` | — | 005 |
| `is_active` | BIT | No | `1` | — | 005 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 005 |
| `created_by` | BIGINT | Yes | — | — | 005 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 005 |
| `updated_by` | BIGINT | Yes | — | — | 005 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 005 |
| `deleted_by` | BIGINT | Yes | — | — | 005 |
| `row_version` | INT | No | `1` | — | 005 |

- Constraints: `pk_cancellation_reason` PRIMARY KEY (cancellation_reason_id) · `uq_cancellation_reason_code` UNIQUE (code)
- Indexes: —
- Triggers: —

### `booking.booking`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `booking_id` | BIGINT | No | — | PK, IDENTITY | 005 |
| `customer_vehicle_id` | BIGINT | No | — | → customer.customer_vehicle (no FK) | 005 |
| `service_bay_id` | SMALLINT | Yes | — | FK → booking.service_bay.service_bay_id | 005 |
| `scheduled_start` | DATETIME2(3) | No | — | — | 005 |
| `scheduled_end` | DATETIME2(3) | No | — | — | 005 |
| `booking_status_id` | SMALLINT | No | — | FK → booking.booking_status.booking_status_id | 005 |
| `booked_by` | BIGINT | No | — | → security.app_user (no FK) | 005 |
| `cancellation_reason_id` | SMALLINT | Yes | — | FK → booking.cancellation_reason.cancellation_reason_id | 005 |
| `points_redeemed` | INT | No | `0` | — | 005 |
| `points_discount_amount` | DECIMAL(12,2) | No | `0` | — | 005 |
| `notes` | NVARCHAR(300) | Yes | — | — | 005 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 005 |
| `created_by` | BIGINT | Yes | — | — | 005 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 005 |
| `updated_by` | BIGINT | Yes | — | — | 005 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 005 |
| `deleted_by` | BIGINT | Yes | — | — | 005 |
| `row_version` | INT | No | `1` | — | 005 |

- Constraints: `pk_booking` PRIMARY KEY (booking_id) · `fk_booking_bay` FOREIGN KEY (service_bay_id) → booking.service_bay (service_bay_id) · `fk_booking_status` FOREIGN KEY (booking_status_id) → booking.booking_status (booking_status_id) · `fk_booking_cancellation` FOREIGN KEY (cancellation_reason_id) → booking.cancellation_reason (cancellation_reason_id) · `ck_booking_range` CHECK `scheduled_end > scheduled_start` · `ck_booking_cancel` CHECK `cancellation_reason_id IS NULL OR booking_status_id = 5` · `ck_booking_points` CHECK `(points_redeemed = 0 AND points_discount_amount = 0) OR (points_redeemed > 0 AND points_discount_amount > 0)`
- Indexes: `ix_booking_start_status` (scheduled_start, booking_status_id) · `ix_booking_customer_vehicle` (customer_vehicle_id) · `ix_booking_bay_start` (service_bay_id, scheduled_start) · `ix_booking_booked_by` (booked_by)
- Triggers: `tr_booking_bay_overlap` (AFTER INSERT, UPDATE) · `tr_touch_booking` (AFTER UPDATE, sets `updated_at`; bumps `row_version` only if the UPDATE did not (045))

### `booking.booking_service`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `booking_service_id` | BIGINT | No | — | PK, IDENTITY | 005 |
| `booking_id` | BIGINT | No | — | FK → booking.booking.booking_id | 005 |
| `service_price_id` | BIGINT | No | — | FK → catalog.service_price.service_price_id | 005 |
| `quantity` | SMALLINT | No | `1` | — | 005 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 005 |
| `created_by` | BIGINT | Yes | — | — | 005 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 005 |
| `updated_by` | BIGINT | Yes | — | — | 005 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 005 |
| `deleted_by` | BIGINT | Yes | — | — | 005 |
| `row_version` | INT | No | `1` | — | 005 |
| `loyalty_points` | INT | Yes | — | — | 043 |

- Constraints: `pk_booking_service` PRIMARY KEY (booking_service_id) · `uq_booking_service` UNIQUE (booking_id, service_price_id) · `fk_booking_service_booking` FOREIGN KEY (booking_id) → booking.booking (booking_id) · `ck_booking_service_qty` CHECK `quantity > 0` · `fk_booking_service_price` FOREIGN KEY (service_price_id) → catalog.service_price (service_price_id)
- Indexes: `ix_booking_service_price` (service_price_id)
- Triggers: —

### `booking.bay_status`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `bay_status_id` | SMALLINT | No | — | PK, IDENTITY | 018 |
| `code` | NVARCHAR(30) | No | — | UQ | 018 |
| `name` | NVARCHAR(60) | No | — | — | 018 |
| `accepts_bookings` | BIT | No | `0` | — | 018 |
| `display_order` | SMALLINT | No | `0` | — | 018 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 018 |
| `created_by` | BIGINT | Yes | — | — | 018 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 018 |
| `updated_by` | BIGINT | Yes | — | — | 018 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 018 |
| `deleted_by` | BIGINT | Yes | — | — | 018 |
| `row_version` | INT | No | `1` | — | 018 |

- Constraints: `pk_bay_status` PRIMARY KEY (bay_status_id) · `uq_bay_status_code` UNIQUE (code)
- Indexes: —
- Triggers: —

### `booking.schedule_history`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `schedule_history_id` | BIGINT | No | — | PK, IDENTITY | 021 |
| `entity_type` | NVARCHAR(20) | No | — | — | 021 |
| `title` | NVARCHAR(200) | No | — | — | 021 |
| `detail` | NVARCHAR(300) | Yes | — | — | 021 |
| `changed_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 021 |
| `changed_by` | BIGINT | Yes | — | → security.app_user (no FK) | 021 |

- Constraints: `pk_schedule_history` PRIMARY KEY (schedule_history_id) · `ck_schedhist_entity_type` CHECK `entity_type IN (N'WEEK', N'EXCEPTION', N'BAY')`
- Indexes: `ix_schedule_history_changed_at` (changed_at desc)
- Triggers: —

## Triggers

| Trigger | Table | Fires | What it does |
|---|---|---|---|
| `tr_service_price_immutable` | `catalog.service_price` | AFTER UPDATE | Rejects (THROW 51001) any change to `service_id`, `vehicle_type_id`, `price`, `estimated_minutes` or `valid_from`: a price row can only be closed (`valid_to`) or soft-deleted. |
| `tr_booking_bay_overlap` | `booking.booking` | AFTER INSERT, UPDATE | Rejects (THROW 51002) two active bookings (states 1–3, not deleted) that overlap on the same bay. Safety net of INV-BOOK-006; the code checks it first. |
| `tr_touch_service` | `catalog.service` | AFTER UPDATE | Sets `updated_at = SYSUTCDATETIME()` and `row_version + 1` on the updated rows (skips nested calls) |
| `tr_touch_service_price` | `catalog.service_price` | AFTER UPDATE | Sets `updated_at = SYSUTCDATETIME()` and `row_version + 1` on the updated rows (skips nested calls) |
| `tr_touch_establishment` | `booking.establishment` | AFTER UPDATE | Sets `updated_at = SYSUTCDATETIME()` and `row_version + 1` on the updated rows (skips nested calls) |
| `tr_touch_business_hour` | `booking.business_hour` | AFTER UPDATE | Sets `updated_at = SYSUTCDATETIME()` and `row_version + 1` on the updated rows (skips nested calls) |
| `tr_touch_business_hour_exception` | `booking.business_hour_exception` | AFTER UPDATE | Sets `updated_at = SYSUTCDATETIME()` and `row_version + 1` on the updated rows (skips nested calls) |
| `tr_touch_service_bay` | `booking.service_bay` | AFTER UPDATE | Sets `updated_at = SYSUTCDATETIME()` and `row_version + 1` on the updated rows (skips nested calls) |
| `tr_touch_booking` | `booking.booking` | AFTER UPDATE | Sets `updated_at = SYSUTCDATETIME()` on the updated rows and `row_version + 1` only on those whose `UPDATE` left `row_version` unchanged, so it does not fight Hibernate `@Version` (changed in 045; skips nested calls) |

## Seed data

- `103-seed-catalog`: 5 categories, services `BASIC`, `PREMIUM`, `FULL` and their 18 prices (6 vehicle types).
- `104-seed-booking-catalogs`: the 6 booking states (fixed ids) and 6 cancellation reasons.
- `109-seed-establishment-schedule`: the establishment row, the weekly hours (Sunday closed) and 4 bays (bay 4 in maintenance).
- `110-seed-establishment-business-data`: example values for the 032 columns.
- `111-clear-example-business-data`: Empties the example values of 110 again (only if they are still the examples).
- `112-seed-expired-cancellation-reason`: cancellation reason `EXPIRED`.
- `113-clear-example-establishment`: Removes the example business of 109 (legal and trade name, tax id, address, phone, e-mail; E-19), only the values still equal to the example.
- `018-booking-adr-010` also inserts the 3 rows of `bay_status` (ids 1–3) with its table.

## Migrations

Liquibase, changelog table `DATABASECHANGELOG_BOOKING` (lock table `DATABASECHANGELOGLOCK_BOOKING`), in the order of the master file:

| Order | File | Changesets | Precondition | Rollback | Purpose |
|---|---|---|---|---|---|
| 1 | `005-create-booking-schemas.sql` | 22 | onFail:MARK_RAN | No | Schemas `catalog` and `booking`, their 11 base tables, `tr_service_price_immutable`, `tr_booking_bay_overlap` and 7 touch triggers |
| 2 | `018-booking-adr-010.sql` | 3 | onFail:MARK_RAN | No | Table `bay_status` with its 3 rows; `service_bay.is_active` replaced by `bay_status_id`; daily break in `business_hour` (ADR-010) |
| 3 | `021-booking-schedule-history.sql` | 1 | onFail:MARK_RAN | Yes | Table `schedule_history` (log of schedule and bay changes) |
| 4 | `022-booking-catalog-loyalty-points.sql` | 1 | onFail:MARK_RAN | Yes | Column `catalog.service.loyalty_points` |
| 5 | `024-booking-revert-bay-operator.sql` | 1 | onFail:MARK_RAN | Yes | Drops `service_bay.operator_id` if an earlier local attempt created it (otherwise MARK_RAN) |
| 6 | `032-booking-establishment-business-data.sql` | 1 | onFail:MARK_RAN | Yes | 14 nullable columns with the legal, tax and channel data of `establishment` |
| 7 | `043-booking-service-loyalty-points.sql` | 2 | onFail:MARK_RAN (1 without) | Yes | Column `booking_service.loyalty_points` (A-09: points frozen when booking) and its backfill from the current catalog |
| 8 | `044-booking-service-price-positive.sql` | 1 | onFail:MARK_RAN | Yes | Check `ck_service_price_positive` (BIZ-04: the current price is greater than 0); created `WITH NOCHECK` if a current price is already 0 |
| 9 | `045-booking-row-version-optimistic-lock.sql` | 1 | onFail:MARK_RAN | Yes | `ALTER TRIGGER tr_touch_booking` (BIZ-09, E-11): it no longer bumps `row_version` when the `UPDATE` already changed it (Hibernate `@Version`); `updated_at` is still set |
| 10 | `seed/103-seed-catalog.sql` | 3 | onFail:MARK_RAN | No | Seed: 5 categories, services `BASIC`, `PREMIUM`, `FULL` and their 18 prices (6 vehicle types) |
| 11 | `seed/104-seed-booking-catalogs.sql` | 2 | onFail:MARK_RAN | No | Seed: the 6 booking states (fixed ids) and 6 cancellation reasons |
| 12 | `seed/109-seed-establishment-schedule.sql` | 3 | onFail:MARK_RAN | No | Seed: the establishment row, the weekly hours (Sunday closed) and 4 bays (bay 4 in maintenance) |
| 13 | `seed/110-seed-establishment-business-data.sql` | 1 | onFail:MARK_RAN | No | Seed: example values for the 032 columns |
| 14 | `seed/111-clear-example-business-data.sql` | 1 | onFail:MARK_RAN | No | Empties the example values of 110 again (only if they are still the examples) |
| 15 | `seed/112-seed-expired-cancellation-reason.sql` | 1 | onFail:MARK_RAN | Yes | Seed: cancellation reason `EXPIRED` |
| 16 | `seed/113-clear-example-establishment.sql` | 1 | onFail:MARK_RAN | Yes | Removes the example business of 109 (legal and trade name, tax id, address, phone, e-mail; E-19), only the values still equal to the example |

**Changesets** = `--changeset` blocks in the file; **Precondition** = what Liquibase does when the check fails (`MARK_RAN`: mark as run without executing; `CONTINUE`: skip now and try again on the next update; `HALT`: stop the migration). Numbering and rules: `06-data/migration-strategy.md`.

## References to other services (no FK)

| Column | Points to | Owner | Index |
|---|---|---|---|
| `catalog.service_price.vehicle_type_id` | `customer.vehicle_type` | customer-service | `ix_service_price_vehicle_type` |
| `booking.booking.customer_vehicle_id` | `customer.customer_vehicle` | customer-service | `ix_booking_customer_vehicle` |
| `booking.booking.booked_by` | `security.app_user` | security-service | `ix_booking_booked_by` |
| `booking.schedule_history.changed_by` | `security.app_user` | security-service | none |
