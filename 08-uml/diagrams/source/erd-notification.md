# ER — Schema notification (notification-service, 7 tables)

Source: the Liquibase changelogs of `lavarapido-notification-service` on `origin/develop` (`3f99df4`, 2026-10-24), every changeset applied (last structural file: `048-notification-pending-delivery-nvarchar.sql`). Each entity lists all its columns except the standard audit block, which is in the table under the diagram. Types are the SQL Server base type; lengths, precision and defaults are in `09-microservices/services/07-notification-service/data-model.md`. `PK`, `FK` and `UK` (unique, alone or filtered) are the database keys; "nullable" marks columns that accept NULL. One relationship per foreign key, labelled with its column.

```mermaid
erDiagram
    notification_type {
        smallint notification_type_id PK
        nvarchar code UK
        nvarchar name
        smallint display_order
        bit is_active
    }
    notification {
        bigint notification_id PK
        bigint user_id "security.app_user, no FK"
        smallint notification_type_id FK
        nvarchar title
        nvarchar message
        nvarchar reference_entity "nullable"
        bigint reference_id "nullable"
        bit is_read
        datetime2 read_at "nullable"
        datetime2 sent_at
    }
    device_token {
        bigint device_token_id PK
        bigint user_id "security.app_user, no FK"
        nvarchar token UK
        nvarchar platform
        bit is_active
        datetime2 last_seen_at
    }
    processed_event {
        bigint processed_event_id PK
        nvarchar event_id UK
        nvarchar event_type
        datetime2 processed_at
    }
    booking_reminder {
        bigint booking_reminder_id PK
        bigint booking_id "booking.booking, no FK"
        bigint user_id "security.app_user, no FK"
        nvarchar booking_code "nullable"
        datetime2 scheduled_start
        int lead_minutes
        datetime2 remind_at
        datetime2 sent_at "nullable"
    }
    booking_tracking {
        bigint booking_id PK "booking.booking, no FK"
        nvarchar booking_code "nullable"
        bigint customer_user_id "nullable, security.app_user, no FK"
        bigint operator_user_id "nullable, security.app_user, no FK"
        datetime2 scheduled_start "nullable"
        bit is_cancelled
        datetime2 unassigned_alert_at "nullable"
    }
    pending_delivery {
        bigint pending_delivery_id PK
        bigint notification_id FK
        nvarchar channel
        nvarchar email_address "nullable"
        nvarchar recipient_name "nullable"
        nvarchar language "nullable"
        int attempts
        datetime2 next_attempt_at
        nvarchar last_error "nullable"
        datetime2 delivered_at "nullable"
        datetime2 failed_at "nullable"
    }
    notification }o--|| notification_type : "notification_type_id"
    pending_delivery }o--|| notification : "notification_id"
```

## Audit columns

The standard block is `created_at`, `created_by`, `updated_at`, `updated_by`, `deleted_at`, `deleted_by`, `row_version` (`06-data/modeling-conventions.md`).

| Table | Audit columns |
|---|---|
| `notification.notification_type` | all seven |
| `notification.notification` | all seven |
| `notification.device_token` | all seven |
| `notification.processed_event` | all seven |
| `notification.booking_reminder` | all seven |
| `notification.booking_tracking` | updated_at |
| `notification.pending_delivery` | created_at |

## References to other services

They have no foreign key (ADR-003); the code keeps them consistent.

| Column | Points to | Owner |
|---|---|---|
| `notification.notification.user_id` | `security.app_user` | security-service |
| `notification.device_token.user_id` | `security.app_user` | security-service |
| `notification.booking_reminder.booking_id` | `booking.booking` | booking-service |
| `notification.booking_reminder.user_id` | `security.app_user` | security-service |
| `notification.booking_tracking.booking_id` | `booking.booking` | booking-service |
| `notification.booking_tracking.customer_user_id` | `security.app_user` | security-service |
| `notification.booking_tracking.operator_user_id` | `security.app_user` | security-service |
