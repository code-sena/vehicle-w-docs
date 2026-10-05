# Runbook — Notification Service

## Health

```bash
curl http://localhost:3006/actuator/health      # {"status":"UP"}
```

RabbitMQ panel: http://localhost:15672 (guest/guest) → Queues → `notification-service.events`.
Mailpit (if `MAIL_HOST` points to it): http://localhost:8025.

## Common problems

| Symptom | Likely cause | What to do |
|---|---|---|
| Startup fails on `localhost:1433` | SQL Server not healthy yet (e.g. right after `docker compose up`) | Wait for `lavarapido-sqlserver` (healthy) and start again |
| No notifications from events | `MESSAGING_ENABLED=false` or RabbitMQ down | Enable messaging, check the queue in the panel |
| Messages piling in the DLQ | Invalid event or repeated failure | Inspect the message in the panel; fix the publisher |
| Welcome email does not arrive | `MAIL_ENABLED=false`, wrong Gmail app password, spam folder, or mistyped email | Check `MAIL_*` and the log line `Email for notification … sent` |
| Booking email / reminder only in the inbox | `INTERNAL_API_KEY` empty or different from security-service, or security-service down | Same key in both services; log warns `INTERNAL_API_KEY is not set` |
| Reminder never sent | Booking created with less time than the lead, task disabled, or service was down past the booking time | Check `notification.booking_reminder` (`sent_at`, `deleted_at`) and `REMINDERS_ENABLED` |
| Push does not arrive | `PUSH_ENABLED=false` or the phone has no registered token (needs an EAS build) | See ADR-011 §2 |

## Useful queries

```sql
SELECT booking_id, user_id, lead_minutes, remind_at, sent_at, deleted_at
FROM notification.booking_reminder ORDER BY remind_at DESC;
```
