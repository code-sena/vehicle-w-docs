# ER — Schemas notification (notification-service, 6 tables)

Source: the `LavaRapido` database read on 2026-10-19 (`sys.tables`, `sys.columns`, `sys.foreign_keys`) with every
migration applied (up to 039). The audit block (`created_at`, `created_by`, `updated_at`, `updated_by`,
`deleted_at`, `deleted_by`, `row_version`) is left out to keep the diagram readable; 6 of the 6 tables have it.

```mermaid
erDiagram
    booking_reminder {
        bigint booking_reminder_id PK
        bigint booking_id
        bigint user_id
        nvarchar booking_code "nullable"
        datetime2 scheduled_start
        int lead_minutes
        datetime2 remind_at
        datetime2 sent_at "nullable"
    }
    booking_tracking {
        bigint booking_id PK
        nvarchar booking_code "nullable"
        bigint customer_user_id "nullable"
        bigint operator_user_id "nullable"
        datetime2 scheduled_start "nullable"
        bit is_cancelled
        datetime2 unassigned_alert_at "nullable"
    }
    device_token {
        bigint device_token_id PK
        bigint user_id
        nvarchar token
        nvarchar platform
        bit is_active
        datetime2 last_seen_at
    }
    notification {
        bigint notification_id PK
        bigint user_id
        smallint notification_type_id FK
        nvarchar title
        nvarchar message
        nvarchar reference_entity "nullable"
        bigint reference_id "nullable"
        bit is_read
        datetime2 read_at "nullable"
        datetime2 sent_at
    }
    notification_type {
        smallint notification_type_id PK
        nvarchar code
        nvarchar name
        smallint display_order
        bit is_active
    }
    processed_event {
        bigint processed_event_id PK
        nvarchar event_id
        nvarchar event_type
        datetime2 processed_at
    }
    notification }o--|| notification_type : "notification_type_id"
```

References to other services have no foreign key (ADR-003); they are kept by the code:

| Column | Points to | Owner |
|---|---|---|
| `notification.booking_reminder.booking_id` | `booking.booking` | booking-service |
| `notification.booking_reminder.user_id` | `security.app_user` | security-service |
| `notification.booking_tracking.customer_user_id` | `security.app_user` | security-service |
| `notification.booking_tracking.operator_user_id` | `security.app_user` | security-service |
| `notification.device_token.user_id` | `security.app_user` | security-service |
| `notification.notification.user_id` | `security.app_user` | security-service |
| `notification.notification.reference_id` | the row named by `reference_entity` (`booking`, `payment` or `app_version`) | booking-service, payment-service |
