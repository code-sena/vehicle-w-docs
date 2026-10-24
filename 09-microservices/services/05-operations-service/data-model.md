# Data model — Operations Service

Schema `execution` in the shared SQL Server database `LavaRapido` (one owning service per schema, ADR-003/ADR-009): 11 tables, 117 columns. No foreign key leaves these schemas; references to other services are plain columns (last section).

> **Source:** the Liquibase changelogs of `lavarapido-operations-service` on `origin/develop` (`37e32ff`, 2026-10-24), applied in the order of `src/main/resources/db/changelog/db.changelog-master.xml`. The tables below were generated from those changelogs and are checked against them, against the JPA entities and against the ERD (`08-uml/diagrams/source/erd-operations.md`) by the script described in `06-data/migration-strategy.md` ("How the docs are checked"). The rationale of each table is in `06-data/models.md`.

## Tables

| Table | Purpose | Created in |
|---|---|---|
| `execution.execution_status` | Execution states with fixed ids: 1 `PENDING`, 2 `IN_PROGRESS`, 3 `PAUSED`, 4 `COMPLETED`, 5 `WITH_ISSUE` (seed 105). The code uses `PENDING`, `IN_PROGRESS` and `COMPLETED`. | 007 |
| `execution.operator` | One row per account with role `OPERATOR` (`user_id` unique, no FK to `security`), hire date and active flag. | 007 |
| `execution.operator_availability` | Weekly shift of an operator, one row per (operator, weekday 1–7). | 007 |
| `execution.operator_absence` | Dated absence of an operator with a reason; two absences of the same operator cannot overlap (`tr_operator_absence_overlap`). | 007 |
| `execution.service_execution` | Execution of one booking line (`booking_service_id` unique, no FK): operator, state, start/end, the client's rating, when the operator and admins were told nobody registered it (`follow_up_notice_at`, 040) and the admin's notes for the operator (`assignment_notes`, 042). | 007 |
| `execution.inspection_report` | Vehicle inspection report of a long booking (033, one per booking): a copy of the booking taken when it starts, the random `public_token` of the public link, and whether it is published. | 033 |
| `execution.inspection_phase` | The 5 phases of a report (`RECEPTION`, `EXTERIOR`, `INTERIOR`, `ENGINE`, `DELIVERY`) with their state, one row per (report, phase). | 033 |
| `execution.inspection_finding` | Findings of a phase (area, severity `INFO`/`MINOR`/`MAJOR`, note). Soft delete. | 033 |
| `execution.inspection_photo` | Photos of a finding as binary (`image/jpeg` or `image/png`, up to 2 MB). Read apart from the findings so listing a report never loads the binaries. | 033 |
| `execution.operator_profile` | Specialty of an operator (037), one row per operator (PK = FK). | 037 |
| `execution.operator_skill` | Skills of an operator with their level (`CERTIFIED`, `EXPERT`, `ADVANCED`), unique name per operator. Saving replaces the whole list (physical delete and insert). | 037 |

- The rating lives in `service_execution` and not in its own table: it cannot exist without the line it rates (`06-data/models.md`, decision 3 of `service_execution`).
- `execution_status` has no touch trigger. `operator_skill` rows are deleted physically when the list is saved.

## Columns, keys and indexes

**Null** = accepts NULL. **Key**: `PK`, `IDENTITY` (starts at 1, step 1), `FK →` a table of this service, `UQ` (unique; *filtered* = only among the rows of its `WHERE`), `→ … (no FK)` = reference to another service. **Since** = migration that added the column. Dates are `DATETIME2(3)` in UTC.

### `execution.execution_status`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `execution_status_id` | SMALLINT | No | — | PK, IDENTITY | 007 |
| `code` | NVARCHAR(30) | No | — | UQ | 007 |
| `name` | NVARCHAR(60) | No | — | — | 007 |
| `is_final` | BIT | No | `0` | — | 007 |
| `display_order` | SMALLINT | No | `0` | — | 007 |
| `is_active` | BIT | No | `1` | — | 007 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 007 |
| `created_by` | BIGINT | Yes | — | — | 007 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 007 |
| `updated_by` | BIGINT | Yes | — | — | 007 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 007 |
| `deleted_by` | BIGINT | Yes | — | — | 007 |
| `row_version` | INT | No | `1` | — | 007 |

- Constraints: `pk_execution_status` PRIMARY KEY (execution_status_id) · `uq_execution_status_code` UNIQUE (code)
- Indexes: —
- Triggers: —

### `execution.operator`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `operator_id` | INT | No | — | PK, IDENTITY | 007 |
| `user_id` | BIGINT | No | — | UQ, → security.app_user (no FK) | 007 |
| `hired_on` | DATE | No | — | — | 007 |
| `is_active` | BIT | No | `1` | — | 007 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 007 |
| `created_by` | BIGINT | Yes | — | — | 007 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 007 |
| `updated_by` | BIGINT | Yes | — | — | 007 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 007 |
| `deleted_by` | BIGINT | Yes | — | — | 007 |
| `row_version` | INT | No | `1` | — | 007 |

- Constraints: `pk_operator` PRIMARY KEY (operator_id) · `uq_operator_user` UNIQUE (user_id)
- Indexes: —
- Triggers: `tr_touch_operator` (AFTER UPDATE, sets `updated_at` and `row_version`)

### `execution.operator_availability`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `operator_availability_id` | INT | No | — | PK, IDENTITY | 007 |
| `operator_id` | INT | No | — | FK → execution.operator.operator_id | 007 |
| `day_of_week` | SMALLINT | No | — | — | 007 |
| `starts_at` | TIME(0) | No | — | — | 007 |
| `ends_at` | TIME(0) | No | — | — | 007 |
| `is_active` | BIT | No | `1` | — | 007 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 007 |
| `created_by` | BIGINT | Yes | — | — | 007 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 007 |
| `updated_by` | BIGINT | Yes | — | — | 007 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 007 |
| `deleted_by` | BIGINT | Yes | — | — | 007 |
| `row_version` | INT | No | `1` | — | 007 |

- Constraints: `pk_operator_availability` PRIMARY KEY (operator_availability_id) · `uq_operator_availability` UNIQUE (operator_id, day_of_week) · `fk_operator_availability_operator` FOREIGN KEY (operator_id) → execution.operator (operator_id) · `ck_oavail_day` CHECK `day_of_week BETWEEN 1 AND 7` · `ck_oavail_range` CHECK `ends_at > starts_at`
- Indexes: —
- Triggers: `tr_touch_operator_availability` (AFTER UPDATE, sets `updated_at` and `row_version`)

### `execution.operator_absence`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `operator_absence_id` | INT | No | — | PK, IDENTITY | 007 |
| `operator_id` | INT | No | — | FK → execution.operator.operator_id | 007 |
| `starts_at` | DATETIME2(3) | No | — | — | 007 |
| `ends_at` | DATETIME2(3) | No | — | — | 007 |
| `reason` | NVARCHAR(120) | No | — | — | 007 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 007 |
| `created_by` | BIGINT | Yes | — | — | 007 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 007 |
| `updated_by` | BIGINT | Yes | — | — | 007 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 007 |
| `deleted_by` | BIGINT | Yes | — | — | 007 |
| `row_version` | INT | No | `1` | — | 007 |

- Constraints: `pk_operator_absence` PRIMARY KEY (operator_absence_id) · `fk_operator_absence_operator` FOREIGN KEY (operator_id) → execution.operator (operator_id) · `ck_oabs_range` CHECK `ends_at > starts_at`
- Indexes: `ix_operator_absence_operator` (operator_id, starts_at)
- Triggers: `tr_operator_absence_overlap` (AFTER INSERT, UPDATE) · `tr_touch_operator_absence` (AFTER UPDATE, sets `updated_at` and `row_version`)

### `execution.service_execution`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `service_execution_id` | BIGINT | No | — | PK, IDENTITY | 007 |
| `booking_service_id` | BIGINT | No | — | UQ, → booking.booking_service (no FK) | 007 |
| `operator_id` | INT | No | — | FK → execution.operator.operator_id | 007 |
| `execution_status_id` | SMALLINT | No | — | FK → execution.execution_status.execution_status_id | 007 |
| `started_at` | DATETIME2(3) | Yes | — | — | 007 |
| `finished_at` | DATETIME2(3) | Yes | — | — | 007 |
| `quality_rating` | SMALLINT | Yes | — | — | 007 |
| `quality_comment` | NVARCHAR(500) | Yes | — | — | 007 |
| `rated_at` | DATETIME2(3) | Yes | — | — | 007 |
| `is_comment_visible` | BIT | No | `1` | — | 007 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 007 |
| `created_by` | BIGINT | Yes | — | — | 007 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 007 |
| `updated_by` | BIGINT | Yes | — | — | 007 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 007 |
| `deleted_by` | BIGINT | Yes | — | — | 007 |
| `row_version` | INT | No | `1` | — | 007 |
| `follow_up_notice_at` | DATETIME2(3) | Yes | — | — | 040 |
| `assignment_notes` | NVARCHAR(300) | Yes | — | — | 042 |

- Constraints: `pk_service_execution` PRIMARY KEY (service_execution_id) · `uq_service_execution_booking_service` UNIQUE (booking_service_id) · `fk_service_execution_operator` FOREIGN KEY (operator_id) → execution.operator (operator_id) · `fk_service_execution_status` FOREIGN KEY (execution_status_id) → execution.execution_status (execution_status_id) · `ck_sexec_rating` CHECK `quality_rating IS NULL OR quality_rating BETWEEN 1 AND 5` · `ck_sexec_range` CHECK `finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at` · `ck_sexec_comment` CHECK `quality_comment IS NULL OR quality_rating IS NOT NULL` · `ck_sexec_rated` CHECK `(quality_rating IS NULL AND rated_at IS NULL) OR (quality_rating IS NOT NULL AND rated_at IS NOT NULL)`
- Indexes: `ix_service_execution_operator` (operator_id, started_at)
- Triggers: `tr_touch_service_execution` (AFTER UPDATE, sets `updated_at` and `row_version`)

### `execution.inspection_report`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `inspection_report_id` | BIGINT | No | — | PK, IDENTITY | 033 |
| `booking_id` | BIGINT | No | — | UQ, → booking.booking (no FK) | 033 |
| `booking_code` | NVARCHAR(20) | Yes | — | — | 033 |
| `vehicle` | NVARCHAR(120) | Yes | — | — | 033 |
| `plate` | NVARCHAR(15) | Yes | — | — | 033 |
| `services` | NVARCHAR(300) | Yes | — | — | 033 |
| `booking_date` | DATE | No | — | — | 033 |
| `booking_time` | TIME(0) | No | — | — | 033 |
| `duration_minutes` | INT | No | — | — | 033 |
| `public_token` | NVARCHAR(64) | No | — | UQ | 033 |
| `is_published` | BIT | No | `0` | — | 033 |
| `published_at` | DATETIME2(3) | Yes | — | — | 033 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 033 |
| `created_by` | BIGINT | Yes | — | — | 033 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 033 |
| `updated_by` | BIGINT | Yes | — | — | 033 |
| `row_version` | INT | No | `1` | — | 033 |

- Constraints: `pk_inspection_report` PRIMARY KEY (inspection_report_id) · `uq_inspection_report_booking` UNIQUE (booking_id) · `uq_inspection_report_token` UNIQUE (public_token) · `ck_inspreport_published` CHECK `(is_published = 0 AND published_at IS NULL) OR (is_published = 1 AND published_at IS NOT NULL)`
- Indexes: —
- Triggers: `tr_touch_inspection_report` (AFTER UPDATE, sets `updated_at` and `row_version`)

### `execution.inspection_phase`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `inspection_phase_id` | BIGINT | No | — | PK, IDENTITY | 033 |
| `inspection_report_id` | BIGINT | No | — | FK → execution.inspection_report.inspection_report_id | 033 |
| `phase` | NVARCHAR(20) | No | — | — | 033 |
| `status` | NVARCHAR(20) | No | `N'PENDING'` | — | 033 |
| `started_at` | DATETIME2(3) | Yes | — | — | 033 |
| `finished_at` | DATETIME2(3) | Yes | — | — | 033 |

- Constraints: `pk_inspection_phase` PRIMARY KEY (inspection_phase_id) · `uq_inspection_phase` UNIQUE (inspection_report_id, phase) · `fk_inspection_phase_report` FOREIGN KEY (inspection_report_id) → execution.inspection_report (inspection_report_id) · `ck_inspphase_phase` CHECK `phase IN (N'RECEPTION', N'EXTERIOR', N'INTERIOR', N'ENGINE', N'DELIVERY')` · `ck_inspphase_status` CHECK `[status] IN (N'PENDING', N'IN_PROGRESS', N'DONE')`
- Indexes: —
- Triggers: —

### `execution.inspection_finding`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `inspection_finding_id` | BIGINT | No | — | PK, IDENTITY | 033 |
| `inspection_report_id` | BIGINT | No | — | FK → execution.inspection_report.inspection_report_id | 033 |
| `phase` | NVARCHAR(20) | No | — | — | 033 |
| `area` | NVARCHAR(120) | No | — | — | 033 |
| `severity` | NVARCHAR(10) | No | — | — | 033 |
| `note` | NVARCHAR(500) | Yes | — | — | 033 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 033 |
| `created_by` | BIGINT | Yes | — | — | 033 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 033 |
| `deleted_by` | BIGINT | Yes | — | — | 033 |

- Constraints: `pk_inspection_finding` PRIMARY KEY (inspection_finding_id) · `fk_inspection_finding_report` FOREIGN KEY (inspection_report_id) → execution.inspection_report (inspection_report_id) · `ck_inspfinding_phase` CHECK `phase IN (N'RECEPTION', N'EXTERIOR', N'INTERIOR', N'ENGINE', N'DELIVERY')` · `ck_inspfinding_severity` CHECK `severity IN (N'INFO', N'MINOR', N'MAJOR')`
- Indexes: `ix_inspection_finding_report` (inspection_report_id)
- Triggers: —

### `execution.inspection_photo`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `inspection_photo_id` | BIGINT | No | — | PK, IDENTITY | 033 |
| `inspection_finding_id` | BIGINT | No | — | FK → execution.inspection_finding.inspection_finding_id | 033 |
| `content_type` | NVARCHAR(30) | No | — | — | 033 |
| `content` | VARBINARY(MAX) | No | — | — | 033 |
| `size_bytes` | INT | No | — | — | 033 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 033 |
| `created_by` | BIGINT | Yes | — | — | 033 |

- Constraints: `pk_inspection_photo` PRIMARY KEY (inspection_photo_id) · `fk_inspection_photo_finding` FOREIGN KEY (inspection_finding_id) → execution.inspection_finding (inspection_finding_id) · `ck_inspphoto_type` CHECK `content_type IN (N'image/jpeg', N'image/png')` · `ck_inspphoto_size` CHECK `size_bytes > 0 AND size_bytes <= 2097152`
- Indexes: `ix_inspection_photo_finding` (inspection_finding_id)
- Triggers: —

### `execution.operator_profile`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `operator_id` | INT | No | — | PK, FK → execution.operator.operator_id | 037 |
| `specialty` | NVARCHAR(80) | Yes | — | — | 037 |
| `updated_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 037 |
| `updated_by` | BIGINT | Yes | — | — | 037 |

- Constraints: `pk_operator_profile` PRIMARY KEY (operator_id) · `fk_operator_profile_operator` FOREIGN KEY (operator_id) → execution.operator (operator_id)
- Indexes: —
- Triggers: —

### `execution.operator_skill`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `operator_skill_id` | INT | No | — | PK, IDENTITY | 037 |
| `operator_id` | INT | No | — | FK → execution.operator.operator_id | 037 |
| `name` | NVARCHAR(60) | No | — | — | 037 |
| `skill_level` | NVARCHAR(12) | No | — | — | 037 |
| `display_order` | SMALLINT | No | — | — | 037 |

- Constraints: `pk_operator_skill` PRIMARY KEY (operator_skill_id) · `fk_operator_skill_operator` FOREIGN KEY (operator_id) → execution.operator (operator_id) · `uq_operator_skill_name` UNIQUE (operator_id, name) · `ck_operator_skill_level` CHECK `skill_level IN ('CERTIFIED', 'EXPERT', 'ADVANCED')`
- Indexes: —
- Triggers: —

## Triggers

| Trigger | Table | Fires | What it does |
|---|---|---|---|
| `tr_operator_absence_overlap` | `execution.operator_absence` | AFTER INSERT, UPDATE | Rejects (THROW 50002) two absences of the same operator that overlap. |
| `tr_touch_operator` | `execution.operator` | AFTER UPDATE | Sets `updated_at = SYSUTCDATETIME()` and `row_version + 1` on the updated rows (skips nested calls) |
| `tr_touch_operator_availability` | `execution.operator_availability` | AFTER UPDATE | Sets `updated_at = SYSUTCDATETIME()` and `row_version + 1` on the updated rows (skips nested calls) |
| `tr_touch_operator_absence` | `execution.operator_absence` | AFTER UPDATE | Sets `updated_at = SYSUTCDATETIME()` and `row_version + 1` on the updated rows (skips nested calls) |
| `tr_touch_service_execution` | `execution.service_execution` | AFTER UPDATE | Sets `updated_at = SYSUTCDATETIME()` and `row_version + 1` on the updated rows (skips nested calls) |
| `tr_touch_inspection_report` | `execution.inspection_report` | AFTER UPDATE | Sets `updated_at = SYSUTCDATETIME()` and `row_version + 1` on the updated rows (skips nested calls) |

## Seed data

- `105-seed-execution-status`: the 5 execution states with fixed ids.

## Migrations

Liquibase, changelog table `DATABASECHANGELOG_OPERATIONS` (lock table `DATABASECHANGELOGLOCK_OPERATIONS`), in the order of the master file:

| Order | File | Changesets | Precondition | Rollback | Purpose |
|---|---|---|---|---|---|
| 1 | `007-create-execution-schema.sql` | 11 | onFail:MARK_RAN | No | Schema `execution`, tables `execution_status`, `operator`, `operator_availability`, `operator_absence`, `service_execution`, `tr_operator_absence_overlap` and 4 touch triggers |
| 2 | `033-execution-inspection-report.sql` | 5 | onFail:MARK_RAN | Yes | Tables `inspection_report`, `inspection_phase`, `inspection_finding`, `inspection_photo` and `tr_touch_inspection_report` (ADR-014 §9) |
| 3 | `037-execution-operator-profile.sql` | 2 | onFail:MARK_RAN | Yes | Tables `operator_profile` and `operator_skill` (ADR-010) |
| 4 | `040-execution-follow-up-notice.sql` | 1 | onFail:MARK_RAN | Yes | Column `service_execution.follow_up_notice_at` (service that ended without being registered) |
| 5 | `042-execution-assignment-notes.sql` | 1 | onFail:MARK_RAN | Yes | Column `service_execution.assignment_notes` (B-01: the admin's notes for the operator) |
| 6 | `seed/105-seed-execution-status.sql` | 1 | onFail:MARK_RAN | No | Seed: the 5 execution states with fixed ids |

**Changesets** = `--changeset` blocks in the file; **Precondition** = what Liquibase does when the check fails (`MARK_RAN`: mark as run without executing; `CONTINUE`: skip now and try again on the next update; `HALT`: stop the migration). Numbering and rules: `06-data/migration-strategy.md`.

## References to other services (no FK)

| Column | Points to | Owner | Index |
|---|---|---|---|
| `execution.operator.user_id` | `security.app_user` | security-service | `uq_operator_user` |
| `execution.service_execution.booking_service_id` | `booking.booking_service` | booking-service | `uq_service_execution_booking_service` |
| `execution.inspection_report.booking_id` | `booking.booking` | booking-service | `uq_inspection_report_booking` |
