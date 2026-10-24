# Data model — Notification Service

Schema `notification` in the shared SQL Server database `LavaRapido` (one owning service per schema, ADR-003/ADR-009): 7 tables, 88 columns. No foreign key leaves these schemas; references to other services are plain columns (last section).

> **Source:** the Liquibase changelogs of `lavarapido-notification-service` on `origin/develop` (`c5429ad`, 2026-10-24), applied in the order of `src/main/resources/db/changelog/db.changelog-master.xml`. The tables below were generated from those changelogs and are checked against them, against the JPA entities and against the ERD (`08-uml/diagrams/source/erd-notification.md`) by the script described in `06-data/migration-strategy.md` ("How the docs are checked"). The rationale of each table is in `06-data/models.md`.

## Tables

| Table | Purpose | Created in |
|---|---|---|
| `notification.notification_type` | Notification types (27 rows: seed 108, migrations 025, 027, 028, 029, 031, 038, 041 and seed 116). `code` matches the Java enum `NotificationTypeCode`. | 010 |
| `notification.notification` | One notification of one user: type, title, message, reference (`reference_entity` + `reference_id`), read state, sent date. Soft delete. | 010 |
| `notification.device_token` | Expo push tokens of each user's phones (016, ADR-011). A token has one owner at a time: another account logging in on the phone takes the row over. | 016 |
| `notification.processed_event` | Ids of the events already consumed (017), so a repeated RabbitMQ delivery does not create the notification twice. | 017 |
| `notification.booking_reminder` | Pending reminders, one per (booking, lead time in minutes) (019). Cancelled with `deleted_at`; a rescheduled booking moves them. | 019 |
| `notification.booking_tracking` | Latest known state of each booking according to the events (027): code, client, assigned operator, start, cancelled. Tells a new booking from a rescheduled one and which operator to notify; `unassigned_alert_at` (031) records when the admins were told the booking still had no operator. No audit block. | 027 |
| `notification.pending_delivery` | Push and e-mail deliveries of a notification (047, OPS-05), one row per (notification, channel `PUSH`/`EMAIL`). Written in the same transaction as the notification and sent after the commit; a failure is retried by `DeliveryRetryScheduler` with a growing wait (1 min, 2×, 4×… up to 1 h) until `app.delivery.max-attempts` (5). `delivered_at` or `failed_at` closes the row; rows are not deleted. An e-mail row keeps the address, name and language only while it is pending: both are cleared when it is delivered or abandoned. Only `created_at` of the audit block. | 047 |

- No table has a touch trigger: notification-service sets `updated_at` itself where it needs it.
- The service asks security-service for the contact data when it sends (ADR-011); only an e-mail delivery still pending in `pending_delivery` keeps the address and name, which are cleared once it is delivered or abandoned (047).

## Columns, keys and indexes

**Null** = accepts NULL. **Key**: `PK`, `IDENTITY` (starts at 1, step 1), `FK →` a table of this service, `UQ` (unique; *filtered* = only among the rows of its `WHERE`), `→ … (no FK)` = reference to another service. **Since** = migration that added the column. Dates are `DATETIME2(3)` in UTC.

### `notification.notification_type`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `notification_type_id` | SMALLINT | No | — | PK, IDENTITY | 010 |
| `code` | NVARCHAR(40) | No | — | UQ | 010 |
| `name` | NVARCHAR(80) | No | — | — | 010 |
| `display_order` | SMALLINT | No | `0` | — | 010 |
| `is_active` | BIT | No | `1` | — | 010 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 010 |
| `created_by` | BIGINT | Yes | — | — | 010 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 010 |
| `updated_by` | BIGINT | Yes | — | — | 010 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 010 |
| `deleted_by` | BIGINT | Yes | — | — | 010 |
| `row_version` | INT | No | `1` | — | 010 |

- Constraints: `pk_notification_type` PRIMARY KEY (notification_type_id) · `uq_notification_type_code` UNIQUE (code)
- Indexes: —
- Triggers: —

### `notification.notification`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `notification_id` | BIGINT | No | — | PK, IDENTITY | 010 |
| `user_id` | BIGINT | No | — | → security.app_user (no FK) | 010 |
| `notification_type_id` | SMALLINT | No | — | FK → notification.notification_type.notification_type_id | 010 |
| `title` | NVARCHAR(120) | No | — | — | 010 |
| `message` | NVARCHAR(500) | No | — | — | 010 |
| `reference_entity` | NVARCHAR(40) | Yes | — | — | 010 |
| `reference_id` | BIGINT | Yes | — | — | 010 |
| `is_read` | BIT | No | `0` | — | 010 |
| `read_at` | DATETIME2(3) | Yes | — | — | 010 |
| `sent_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 010 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 010 |
| `created_by` | BIGINT | Yes | — | — | 010 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 010 |
| `updated_by` | BIGINT | Yes | — | — | 010 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 010 |
| `deleted_by` | BIGINT | Yes | — | — | 010 |
| `row_version` | INT | No | `1` | — | 010 |

- Constraints: `pk_notification` PRIMARY KEY (notification_id) · `fk_notification_type` FOREIGN KEY (notification_type_id) → notification.notification_type (notification_type_id) · `ck_notification_read` CHECK `(is_read = 0 AND read_at IS NULL) OR (is_read = 1 AND read_at IS NOT NULL)`
- Indexes: `ix_notification_user_unread` (user_id, is_read) · `ix_notification_user_date` (user_id, sent_at)
- Triggers: —

### `notification.device_token`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `device_token_id` | BIGINT | No | — | PK, IDENTITY | 016 |
| `user_id` | BIGINT | No | — | → security.app_user (no FK) | 016 |
| `token` | NVARCHAR(200) | No | — | UQ | 016 |
| `platform` | NVARCHAR(10) | No | — | — | 016 |
| `is_active` | BIT | No | `1` | — | 016 |
| `last_seen_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 016 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 016 |
| `created_by` | BIGINT | Yes | — | — | 016 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 016 |
| `updated_by` | BIGINT | Yes | — | — | 016 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 016 |
| `deleted_by` | BIGINT | Yes | — | — | 016 |
| `row_version` | INT | No | `1` | — | 016 |

- Constraints: `pk_device_token` PRIMARY KEY (device_token_id) · `uq_device_token_token` UNIQUE (token) · `ck_device_token_platform` CHECK `platform IN (N'ANDROID', N'IOS')`
- Indexes: `ix_device_token_user_active` (user_id, is_active)
- Triggers: —

### `notification.processed_event`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `processed_event_id` | BIGINT | No | — | PK, IDENTITY | 017 |
| `event_id` | NVARCHAR(64) | No | — | UQ | 017 |
| `event_type` | NVARCHAR(60) | No | — | — | 017 |
| `processed_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 017 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 017 |
| `created_by` | BIGINT | Yes | — | — | 017 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 017 |
| `updated_by` | BIGINT | Yes | — | — | 017 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 017 |
| `deleted_by` | BIGINT | Yes | — | — | 017 |
| `row_version` | INT | No | `1` | — | 017 |

- Constraints: `pk_processed_event` PRIMARY KEY (processed_event_id) · `uq_processed_event_event` UNIQUE (event_id)
- Indexes: —
- Triggers: —

### `notification.booking_reminder`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `booking_reminder_id` | BIGINT | No | — | PK, IDENTITY | 019 |
| `booking_id` | BIGINT | No | — | → booking.booking (no FK) | 019 |
| `user_id` | BIGINT | No | — | → security.app_user (no FK) | 019 |
| `booking_code` | NVARCHAR(20) | Yes | — | — | 019 |
| `scheduled_start` | DATETIME2(3) | No | — | — | 019 |
| `lead_minutes` | INT | No | — | — | 019 |
| `remind_at` | DATETIME2(3) | No | — | — | 019 |
| `sent_at` | DATETIME2(3) | Yes | — | — | 019 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 019 |
| `created_by` | BIGINT | Yes | — | — | 019 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 019 |
| `updated_by` | BIGINT | Yes | — | — | 019 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 019 |
| `deleted_by` | BIGINT | Yes | — | — | 019 |
| `row_version` | INT | No | `1` | — | 019 |

- Constraints: `pk_booking_reminder` PRIMARY KEY (booking_reminder_id) · `uq_booking_reminder_lead` UNIQUE (booking_id, lead_minutes) · `ck_booking_reminder_lead` CHECK `lead_minutes > 0`
- Indexes: `ix_booking_reminder_due` (remind_at) WHERE `sent_at IS NULL AND deleted_at IS NULL`
- Triggers: —

### `notification.booking_tracking`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `booking_id` | BIGINT | No | — | PK, → booking.booking (no FK) | 027 |
| `booking_code` | NVARCHAR(20) | Yes | — | — | 027 |
| `customer_user_id` | BIGINT | Yes | — | → security.app_user (no FK) | 027 |
| `operator_user_id` | BIGINT | Yes | — | → security.app_user (no FK) | 027 |
| `scheduled_start` | DATETIME2(3) | Yes | — | — | 027 |
| `is_cancelled` | BIT | No | `0` | — | 027 |
| `updated_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 027 |
| `unassigned_alert_at` | DATETIME2(3) | Yes | — | — | 031 |

- Constraints: `pk_booking_tracking` PRIMARY KEY (booking_id)
- Indexes: —
- Triggers: —

### `notification.pending_delivery`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `pending_delivery_id` | BIGINT | No | — | PK, IDENTITY | 047 |
| `notification_id` | BIGINT | No | — | FK → notification.notification.notification_id | 047 |
| `channel` | VARCHAR(10) | No | — | — | 047 |
| `email_address` | NVARCHAR(254) | Yes | — | — | 047 |
| `recipient_name` | NVARCHAR(100) | Yes | — | — | 047 |
| `language` | VARCHAR(5) | Yes | — | — | 047 |
| `attempts` | INT | No | `0` | — | 047 |
| `next_attempt_at` | DATETIME2(3) | No | — | — | 047 |
| `last_error` | NVARCHAR(300) | Yes | — | — | 047 |
| `delivered_at` | DATETIME2(3) | Yes | — | — | 047 |
| `failed_at` | DATETIME2(3) | Yes | — | — | 047 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 047 |

- Constraints: `pk_pending_delivery` PRIMARY KEY (pending_delivery_id) · `fk_pending_delivery_notification` FOREIGN KEY (notification_id) → notification.notification (notification_id) · `uq_pending_delivery_channel` UNIQUE (notification_id, channel) · `ck_pending_delivery_channel` CHECK `channel IN ('PUSH', 'EMAIL')` · `ck_pending_delivery_attempts` CHECK `attempts >= 0`
- Indexes: `ix_pending_delivery_due` (next_attempt_at) WHERE `delivered_at IS NULL AND failed_at IS NULL`
- Triggers: —

## Triggers

None.

## Seed data

- `108-seed-notification-type`: 12 notification types (`MERGE`, only the missing ones).
- `116-seed-notification-booking-no-show-type`: notification type `BOOKING_NO_SHOW` (A-11).
- Migrations 025, 027, 028, 029, 031, 038 and 041 add 14 more notification types and seed 116 adds `BOOKING_NO_SHOW` (27 in total).

## Migrations

Liquibase, changelog table `DATABASECHANGELOG_NOTIFICATION` (lock table `DATABASECHANGELOGLOCK_NOTIFICATION`), in the order of the master file:

| Order | File | Changesets | Precondition | Rollback | Purpose |
|---|---|---|---|---|---|
| 1 | `010-create-notification-schema.sql` | 5 | onFail:MARK_RAN | No | Schema `notification`, tables `notification_type` and `notification` and their 2 indexes |
| 2 | `016-create-notification-device-token.sql` | 2 | onFail:MARK_RAN | No | Table `device_token` (ADR-011) |
| 3 | `017-create-notification-processed-event.sql` | 1 | onFail:MARK_RAN | No | Table `processed_event` (idempotency, ADR-011) |
| 4 | `019-create-notification-booking-reminder.sql` | 1 | onFail:MARK_RAN | No | Table `booking_reminder` and its filtered index of due reminders |
| 5 | `seed/108-seed-notification-type.sql` | 1 | none | No | Seed: 12 notification types (`MERGE`, only the missing ones) |
| 6 | `seed/116-seed-notification-booking-no-show-type.sql` | 1 | none | Yes | Seed: notification type `BOOKING_NO_SHOW` (A-11) |
| 7 | `025-notification-promotion-redeemed-type.sql` | 1 | onFail:MARK_RAN | No | Type `PROMOTION_REDEEMED` |
| 8 | `027-notification-staff-notifications.sql` | 2 | onFail:MARK_RAN (1 without) | 1 of 2 | Table `booking_tracking` and 6 staff types (`OPERATOR_SERVICE_*`, `ADMIN_BOOKING_*`) |
| 9 | `028-notification-payment-refunded-type.sql` | 1 | onFail:MARK_RAN | No | Type `PAYMENT_REFUNDED` |
| 10 | `029-notification-loyalty-and-inspection-types.sql` | 1 | none | No | Types `LOYALTY_POINTS_EARNED` and `INSPECTION_REPORT` |
| 11 | `031-notification-unassigned-booking-alert.sql` | 2 | onFail:MARK_RAN (1 without) | 1 of 2 | Column `booking_tracking.unassigned_alert_at` and type `ADMIN_BOOKING_UNASSIGNED` |
| 12 | `038-notification-app-update-type.sql` | 1 | none | Yes | Type `APP_UPDATE_AVAILABLE` |
| 13 | `041-notification-service-not-registered-types.sql` | 1 | none | Yes | Types `OPERATOR_SERVICE_NOT_REGISTERED` and `ADMIN_SERVICE_NOT_REGISTERED` |
| 14 | `047-notification-pending-delivery.sql` | 1 | onFail:MARK_RAN | Yes | Table `pending_delivery` (OPS-05, E-14: push and e-mail deliveries with retries) and its filtered index |

**Changesets** = `--changeset` blocks in the file; **Precondition** = what Liquibase does when the check fails (`MARK_RAN`: mark as run without executing; `CONTINUE`: skip now and try again on the next update; `HALT`: stop the migration). Numbering and rules: `06-data/migration-strategy.md`.

## References to other services (no FK)

| Column | Points to | Owner | Index |
|---|---|---|---|
| `notification.notification.user_id` | `security.app_user` | security-service | `ix_notification_user_unread` |
| `notification.device_token.user_id` | `security.app_user` | security-service | `ix_device_token_user_active` |
| `notification.booking_reminder.booking_id` | `booking.booking` | booking-service | `uq_booking_reminder_lead` |
| `notification.booking_reminder.user_id` | `security.app_user` | security-service | none |
| `notification.booking_tracking.booking_id` | `booking.booking` | booking-service | `PK` |
| `notification.booking_tracking.customer_user_id` | `security.app_user` | security-service | none |
| `notification.booking_tracking.operator_user_id` | `security.app_user` | security-service | none |
