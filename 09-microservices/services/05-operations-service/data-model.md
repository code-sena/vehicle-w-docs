# Data model — Operations Service

Schema `execution` in `LavaRapido`. Base DDL: `lavarapido-6-services-sqlserver.sql` and
`06-data/models.md`, section 06 (5 tables, plus the 4 inspection tables of migration 033 and the 2
operator profile tables of migration 037).

## Tables

| Table | Purpose |
|---|---|
| `execution.execution_status` | `PENDING`(1), `IN_PROGRESS`(2), `PAUSED`(3), `COMPLETED`(4), `WITH_ISSUE`(5). Different from the booking status |
| `execution.operator` | One row per account with role `OPERATOR`: `user_id` (unique), `hired_on`, `is_active` |
| `execution.operator_availability` | Weekly shift: one row per (operator, `day_of_week` 1–7), `starts_at` < `ends_at` |
| `execution.operator_absence` | Dated absence (`starts_at`, `ends_at` in UTC) with a reason |
| `execution.inspection_report` | Inspection report of a long booking (one per booking): copy of the booking, random `public_token`, published or not |
| `execution.inspection_phase` / `inspection_finding` / `inspection_photo` | Its 5 phases, the findings of each phase (soft delete) and their photos (JPEG/PNG up to 2 MB) |
| `execution.operator_profile` / `operator_skill` | Operator specialty (one row per operator) and skills with their level (`CERTIFIED`, `EXPERT`, `ADVANCED`), unique name per operator |
| `execution.service_execution` | One row per booking line (`booking_service_id`, unique): operator, status, `started_at`, `finished_at`, and the client's `quality_rating` (1–5), `quality_comment`, `rated_at` |

The rating lives in `service_execution` and not in its own table: it cannot exist without the line
it rates (`06-data/models.md`, decision 3).

Database safety nets:
- `tr_operator_absence_overlap`: two absences of the same operator cannot overlap.
- `ck_sexec_rating`, `ck_sexec_comment`, `ck_sexec_rated`: rating 1–5, comment only with a rating,
  `rated_at` only with a rating.
- `tr_touch_*`: triggers that set `updated_at` and `row_version`; the code never writes them.
- `user_id` and `booking_service_id` point to other schemas without foreign keys (ADR-003).

## Migrations

Liquibase, changelog table `DATABASECHANGELOG_OPERATIONS`:
`007-create-execution-schema` (tables + triggers) · seed `105-seed-execution-status` ·
`033-execution-inspection-report` (inspection report, ADR-014 §9) · `037-execution-operator-profile`
(specialty and skills).
Every changeset has a precondition, so it is marked as run when the full SQL script already
created the object.
