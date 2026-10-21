# Notification Service

> Turns domain events into **notifications**: in-app inbox, push to the phone (Expo) and email.
> It also schedules **booking reminders**. It owns the `notification` schema (ADR-011).

---

## Location in the architecture

| Field | Value |
|-------|-------|
| Number in catalog | 07 |
| Local port | 3006 |
| Repository | `lavarapido-notification-service` |
| Stack | Spring Boot 4 · Java 21 · Maven · hexagonal (ADR-007) |
| DB engine | SQL Server — schema `notification` (Liquibase, changelog table `DATABASECHANGELOG_NOTIFICATION`) |
| Communicates with | RabbitMQ (consumes events), Expo Push API, SMTP (Gmail/Mailpit), security-service (`/internal/**`) |
| Consumed by | Web and mobile (inbox, unread counter, device registration) |

---

## Responsibilities (what this service DOES)

- Consume events from `carwash.events` and create the matching notification for the recipient
  (welcome, booking confirmed/cancelled, operator assigned, service started/completed, inspection
  report, payment confirmed/rejected/refunded, coupon redeemed, loyalty points earned and coupons
  unlocked). Idempotent by `eventId` (`processed_event`).
- Staff notifications (ADR-011 §10): the assigned operator and the admins hear about new, rescheduled,
  cancelled and unassigned bookings (`booking_tracking` keeps the last known state of each booking),
  and about a service that ended and nobody registered (`ServiceNotStarted` / `ServiceNotFinished`
  from operations-service).
- Alert to every active admin when a booking is about to start without an operator (ADR-011 §14).
- Inbox per user: list with filters, unread count, mark read/unread, mark all read, delete.
- Push to the user's registered devices through Expo (ADR-011 §2).
- Email: the welcome email (address from `UserRegistered`) and the booking emails and reminders
  (address read from security-service at send time, ADR-011 §8).
- **Booking reminders** (ADR-011 §7): `BookingConfirmed` schedules reminders 24 h and 1 h before
  the booking; `BookingCancelled` cancels them; a reschedule moves them. A scheduled task sends
  the due ones to the inbox, push and email.
- Let the administrator send a manual notification.
- **New app version** (`APP_UPDATE_AVAILABLE`, migration 038): `POST /internal/v1/notifications/app-update`
  with `{ "versionCode": n }` and the internal key sends the notice (inbox and push) to every user with
  the app installed, once per `versionCode` (`processed_event` with id `app-update-v<n>`). The server's
  `deploy/publish-apk.sh` calls it after publishing an APK.
- Push and email go out as delivery commands (`DeliveryPlanner` decides the channels, `DeliveryInvoker`
  runs them), so a failing channel never stops the others (ADR-011, amended 15 Oct).

**Language (ADR-011 §15):** every notice is written in the language of the account that receives it
(Spanish, English, French or Portuguese; templates in `src/main/resources/i18n/`). The language comes
from security-service's internal contact; without it the notice goes out in Spanish.

## Out of scope (what it does NOT do)

- Does not store emails or personal data (only `user_id`).
- Does not query booking-service: everything it needs comes in the events.

---

## Endpoints

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/notifications` (filters: read, category, dates; paginated) | token |
| GET | `/api/v1/notifications/unread-count` | token |
| PATCH | `/api/v1/notifications/{id}/read` · `/unread` | token (own only) |
| POST | `/api/v1/notifications/read-all` | token |
| DELETE | `/api/v1/notifications/{id}` | token (own only) |
| PUT | `/api/v1/notifications/devices` | token — register an Expo push token |
| POST | `/api/v1/notifications/devices/unregister` | token |
| POST | `/api/v1/admin/notifications` | ADMIN — manual notification |
| POST | `/internal/v1/notifications/app-update` | `X-Internal-Key` only (never through the gateway) — announce a new APK |

Full contract: [`07-api/contracts/openapi/notification-service.yaml`](../../../07-api/contracts/openapi/notification-service.yaml).

---

## How to run it locally

```bash
cd lavarapido-notification-service
./mvnw spring-boot:run           # http://localhost:3006 — Swagger: /swagger-ui.html (dev profile)
```

| Variable | Default | Purpose |
|---|---|---|
| `MESSAGING_ENABLED`, `RABBITMQ_*` | `false` | Consume events |
| `PUSH_ENABLED`, `EXPO_ACCESS_TOKEN` | `false` | Send push with Expo |
| `MAIL_ENABLED`, `MAIL_*` | `false` | Send emails (same SMTP as security-service) |
| `INTERNAL_API_KEY`, `SECURITY_SERVICE_URL` | empty / `http://localhost:3001` | Read the recipient's email for booking emails and reminders |
| `REMINDERS_ENABLED`, `REMINDER_LEADS`, `REMINDER_CHECK_INTERVAL` | `true`, `24h,1h`, `5m` | Booking reminders |

With every switch off the service still works: notifications are saved and shown in the inbox.

---

## Related documents

- [data-model.md](./data-model.md) · [events.md](./events.md) · [decisions.md](./decisions.md) · [runbook.md](./runbook.md)
- ADR-011 (push, events, welcome email, reminders, booking emails)
