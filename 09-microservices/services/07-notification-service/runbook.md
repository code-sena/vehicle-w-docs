# Runbook — Notification Service

## Health

```bash
curl http://localhost:3006/actuator/health      # {"status":"UP"}
```

RabbitMQ panel: http://localhost:15672 (user and password from `RABBITMQ_USERNAME` / `RABBITMQ_PASSWORD` in `.env`) → Queues → `notification-service.events` and its DLQ `notification-service.events.dlq`.
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
| Push or email arrive late, or twice | Delivery goes through `notification.pending_delivery` (OPS-05): after a failure it retries after 1, 2, 4… minutes up to 5 times; at least once, so a database error right after sending can repeat it (known, low) | Check `pending_delivery` (`attempts`, last error); fix Expo or SMTP |
| Events fail and go back to the queue while security is down | Expected (OPS-06): without the admins list the event is retried, then dead-lettered | Start security-service |
| Operator and admins get "service not registered" | Expected: operations published `ServiceNotStarted` / `ServiceNotFinished` for a booking nobody closed | The admin closes it from "Por cerrar" |

## Tests

`./mvnw verify`: 133 tests in the CI run of 2026-10-24 (no database needed).

## Useful queries

```sql
SELECT booking_id, user_id, lead_minutes, remind_at, sent_at, deleted_at
FROM notification.booking_reminder ORDER BY remind_at DESC;
```
