# ER — Schema execution (operations-service, 11 tables)

Source: the Liquibase changelogs of `lavarapido-operations-service` on `origin/develop` (`37e32ff`, 2026-10-24), every changeset applied (last structural file: `042-execution-assignment-notes.sql`). Each entity lists all its columns except the standard audit block, which is in the table under the diagram. Types are the SQL Server base type; lengths, precision and defaults are in `09-microservices/services/05-operations-service/data-model.md`. `PK`, `FK` and `UK` (unique, alone or filtered) are the database keys; "nullable" marks columns that accept NULL. One relationship per foreign key, labelled with its column.

```mermaid
erDiagram
    execution_status {
        smallint execution_status_id PK
        nvarchar code UK
        nvarchar name
        bit is_final
        smallint display_order
        bit is_active
    }
    operator {
        int operator_id PK
        bigint user_id UK "security.app_user, no FK"
        date hired_on
        bit is_active
    }
    operator_availability {
        int operator_availability_id PK
        int operator_id FK
        smallint day_of_week
        time starts_at
        time ends_at
        bit is_active
    }
    operator_absence {
        int operator_absence_id PK
        int operator_id FK
        datetime2 starts_at
        datetime2 ends_at
        nvarchar reason
    }
    service_execution {
        bigint service_execution_id PK
        bigint booking_service_id UK "booking.booking_service, no FK"
        int operator_id FK
        smallint execution_status_id FK
        datetime2 started_at "nullable"
        datetime2 finished_at "nullable"
        smallint quality_rating "nullable"
        nvarchar quality_comment "nullable"
        datetime2 rated_at "nullable"
        bit is_comment_visible
        datetime2 follow_up_notice_at "nullable"
        nvarchar assignment_notes "nullable"
    }
    inspection_report {
        bigint inspection_report_id PK
        bigint booking_id UK "booking.booking, no FK"
        nvarchar booking_code "nullable"
        nvarchar vehicle "nullable"
        nvarchar plate "nullable"
        nvarchar services "nullable"
        date booking_date
        time booking_time
        int duration_minutes
        nvarchar public_token UK
        bit is_published
        datetime2 published_at "nullable"
    }
    inspection_phase {
        bigint inspection_phase_id PK
        bigint inspection_report_id FK
        nvarchar phase
        nvarchar status
        datetime2 started_at "nullable"
        datetime2 finished_at "nullable"
    }
    inspection_finding {
        bigint inspection_finding_id PK
        bigint inspection_report_id FK
        nvarchar phase
        nvarchar area
        nvarchar severity
        nvarchar note "nullable"
    }
    inspection_photo {
        bigint inspection_photo_id PK
        bigint inspection_finding_id FK
        nvarchar content_type
        varbinary content
        int size_bytes
    }
    operator_profile {
        int operator_id PK, FK
        nvarchar specialty "nullable"
    }
    operator_skill {
        int operator_skill_id PK
        int operator_id FK
        nvarchar name
        nvarchar skill_level
        smallint display_order
    }
    operator_availability }o--|| operator : "operator_id"
    operator_absence }o--|| operator : "operator_id"
    service_execution }o--|| operator : "operator_id"
    service_execution }o--|| execution_status : "execution_status_id"
    inspection_phase }o--|| inspection_report : "inspection_report_id"
    inspection_finding }o--|| inspection_report : "inspection_report_id"
    inspection_photo }o--|| inspection_finding : "inspection_finding_id"
    operator_profile |o--|| operator : "operator_id"
    operator_skill }o--|| operator : "operator_id"
```

## Audit columns

The standard block is `created_at`, `created_by`, `updated_at`, `updated_by`, `deleted_at`, `deleted_by`, `row_version` (`06-data/modeling-conventions.md`).

| Table | Audit columns |
|---|---|
| `execution.execution_status` | all seven |
| `execution.operator` | all seven |
| `execution.operator_availability` | all seven |
| `execution.operator_absence` | all seven |
| `execution.service_execution` | all seven |
| `execution.inspection_report` | created_at, created_by, updated_at, updated_by, row_version |
| `execution.inspection_phase` | — |
| `execution.inspection_finding` | created_at, created_by, deleted_at, deleted_by |
| `execution.inspection_photo` | created_at, created_by |
| `execution.operator_profile` | updated_at, updated_by |
| `execution.operator_skill` | — |

## References to other services

They have no foreign key (ADR-003); the code keeps them consistent.

| Column | Points to | Owner |
|---|---|---|
| `execution.operator.user_id` | `security.app_user` | security-service |
| `execution.service_execution.booking_service_id` | `booking.booking_service` | booking-service |
| `execution.inspection_report.booking_id` | `booking.booking` | booking-service |
