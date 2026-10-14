# Data model — Notification Service

Schema `notification` in `LavaRapido`. Base DDL: `lavarapido-6-services-sqlserver.sql`, section 6,
plus the new tables of ADR-011.

## Tables

| Table | Purpose | Origin |
|---|---|---|
| `notification.notification_type` | 12 types (`USER_WELCOME`, `BOOKING_CONFIRMED`, `BOOKING_REMINDER`, …); the category (reminder, confirmation, cancellation…) is computed in code | base script, seed 108 |
| `notification.notification` | One notification of one user: type, title, message, reference (`booking`/`payment` + id), read state, sent date; soft delete | base script |
| `notification.device_token` | Expo push tokens of each user's phones | ADR-011, migration 016 |
| `notification.processed_event` | `eventId` of every consumed event (idempotency) | ADR-011, migration 017 |
| `notification.booking_reminder` | One pending reminder per (booking, lead time): user, booking time, `remind_at`, `sent_at`; cancelled with `deleted_at` | ADR-011 §7, migration 019 |
| `notification.booking_tracking` | Latest known state of each booking from the events: code, client, assigned operator, start time, cancelled. Tells a new booking from a rescheduled one, who the operator is, and which bookings start soon without operator (`unassigned_alert_at`: when the administrators were alerted) | ADR-011 §10 and §14, migrations 027 and 031 |

`user_id` points to `security.app_user` without a foreign key (ADR-003). No email or name is stored.

## Migrations

Liquibase, changelog table `DATABASECHANGELOG_NOTIFICATION`:
`010-create-notification-schema` · `016-create-notification-device-token` ·
`017-create-notification-processed-event` · `019-create-notification-booking-reminder` ·
seed `108-seed-notification-type`.
