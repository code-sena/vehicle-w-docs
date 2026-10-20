# ER — Schemas execution (operations-service, 11 tables)

Source: the `LavaRapido` database read on 2026-10-19 (`sys.tables`, `sys.columns`, `sys.foreign_keys`) with every
migration applied (up to 039). The audit block (`created_at`, `created_by`, `updated_at`, `updated_by`,
`deleted_at`, `deleted_by`, `row_version`) is left out to keep the diagram readable; 9 of the 11 tables have some or all of these columns.

```mermaid
erDiagram
    operator {
        int operator_id PK
        bigint user_id
        date hired_on
        bit is_active
    }
    operator_profile {
        int operator_id PK,FK
        nvarchar specialty "nullable"
    }
    operator_skill {
        int operator_skill_id PK
        int operator_id FK
        nvarchar name
        nvarchar skill_level
        smallint display_order
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
        bigint booking_service_id
        int operator_id FK
        smallint execution_status_id FK
        datetime2 started_at "nullable"
        datetime2 finished_at "nullable"
        smallint quality_rating "nullable"
        nvarchar quality_comment "nullable"
        datetime2 rated_at "nullable"
        bit is_comment_visible
    }
    execution_status {
        smallint execution_status_id PK
        nvarchar code
        nvarchar name
        bit is_final
        smallint display_order
        bit is_active
    }
    inspection_report {
        bigint inspection_report_id PK
        bigint booking_id
        nvarchar booking_code "nullable"
        nvarchar vehicle "nullable"
        nvarchar plate "nullable"
        nvarchar services "nullable"
        date booking_date
        time booking_time
        int duration_minutes
        nvarchar public_token
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
    operator_profile }o--|| operator : "operator_id"
    operator_skill }o--|| operator : "operator_id"
    operator_availability }o--|| operator : "operator_id"
    operator_absence }o--|| operator : "operator_id"
    service_execution }o--|| operator : "operator_id"
    service_execution }o--|| execution_status : "execution_status_id"
    inspection_phase }o--|| inspection_report : "inspection_report_id"
    inspection_finding }o--|| inspection_report : "inspection_report_id"
    inspection_photo }o--|| inspection_finding : "inspection_finding_id"
```

References to other services have no foreign key (ADR-003); they are kept by the code:

| Column | Points to | Owner |
|---|---|---|
| `execution.inspection_report.booking_id` | `booking.booking` | booking-service |
| `execution.operator.user_id` | `security.app_user` | security-service |
| `execution.service_execution.booking_service_id` | `booking.booking_service` | booking-service |
