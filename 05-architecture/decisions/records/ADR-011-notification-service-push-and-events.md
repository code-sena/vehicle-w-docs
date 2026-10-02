# ADR-011 — Notification Service: Push Delivery and Event Contract

- **ID:** ADR-011
- **Date:** 2026-09-30
- **Status:** Accepted
- **Authors:** Development team

---

## Context

`notification-service` owns the `notification` schema (ADR-009): `notification_type` and
`notification` (`06-data/models.md`, section 09). Building it surfaced three needs the model does
not cover:

1. **Push notifications.** The team wants notifications to reach the phone even when the mobile
   app is closed (like a messaging app). Push delivery needs the device's push token, and the
   model has nowhere to store it.
2. **Idempotency.** `cross-cutting.md` §7 requires each consumer to check `eventId` "against its
   own processed-events record, in the same transaction as the work it does". The schema has no
   such record.
3. **Recipients.** The events in `02-domain/domain-events.md` identify the customer by
   `customer_id`, but a notification is addressed to a `security.app_user` (`user_id`). Resolving
   one from the other would force `notification-service` to read another service's data.

**Known constraints:**
- The mobile app is built with Expo; Expo Go no longer receives remote push on Android, so push
  only works in a development/production build (EAS Build).
- Every schema keeps a single owning service and no cross-schema FK (ADR-003).
- The service must run without RabbitMQ and without an Expo account, because the publishing
  services are still being built.

---

## Decision

### 1. Two new tables in the `notification` schema

| Table | Purpose | Changeset |
|---|---|---|
| `notification.device_token` | Expo push token per phone: `user_id` (no FK, indexed), `token` (unique), `platform` (`ANDROID`/`IOS`), `is_active`, `last_seen_at`, standard audit block | `016-create-notification-device-token.sql` |
| `notification.processed_event` | `event_id` (unique) and `event_type` of every consumed event, standard audit block | `017-create-notification-processed-event.sql` |

A token is unique: if another account signs in on the same phone, the row is reassigned to the
new user instead of duplicated. Expo's `DeviceNotRegistered` response deactivates the token.

### 2. Push delivery through the Expo Push API

`notification-service` sends push notifications with `https://exp.host/--/api/v2/push/send`
(free; Expo forwards to Firebase Cloud Messaging and Apple Push Notification service). Push is a
best-effort extra: the notification is always stored first, and a push failure never fails the
request. Sending runs asynchronously. Controlled by `PUSH_ENABLED` (default `false`: pushes are
only logged).

### 3. Event contract: the publisher sends the recipient's `user_id`

Every event that must produce a notification carries the recipient's `security.app_user` id in
its `payload`. The publishing service knows it (`booking.booked_by`, `execution.operator.user_id`,
the token's `sub`).

| Event | Routing key | Payload fields read by `notification-service` | Notification |
|---|---|---|---|
| `UserRegistered` | `security.user_registered` | `userId`, `email`, `firstName` | `USER_WELCOME` (inbox + email) |
| `BookingCreated` | `booking.created` | `customerUserId`, `bookingId`, `bookingCode`, `scheduledStart` | `BOOKING_CREATED` |
| `BookingConfirmed` | `booking.confirmed` | `customerUserId`, `operatorUserId` (optional), `bookingId`, `bookingCode`, `scheduledStart` | `BOOKING_CONFIRMED` (+ `OPERATOR_ASSIGNED`) |
| `BookingCancelled` | `booking.cancelled` | `customerUserId`, `bookingId`, `bookingCode`, `reason` | `BOOKING_CANCELLED` |
| `OperatorAssigned` | `execution.operator_assigned` | `operatorUserId`, `customerUserId`, `bookingId`, `bookingCode`, `scheduledStart` | `OPERATOR_ASSIGNED` |
| `ServiceStarted` | `execution.service_started` | `customerUserId`, `bookingId`, `bookingCode` | `SERVICE_STARTED` |
| `ServiceCompleted` | `execution.service_completed` | `customerUserId`, `bookingId`, `bookingCode` | `SERVICE_COMPLETED` |
| `PaymentConfirmed` | `payment.confirmed` | `customerUserId`, `paymentId`, `amount` | `PAYMENT_CONFIRMED` |
| `PaymentRejected` | `payment.rejected` | `customerUserId`, `paymentId`, `amount`, `reason` | `PAYMENT_REJECTED` |

`scheduledStart` is ISO-8601 UTC. An event without its recipient id produces no notification.

### 4. Notification text and types

The title and message are stored already rendered (`06-data` decision), in Spanish, the system's
default language. The API also returns the stable type `code`, so clients can show their own
translation. The `notification_type` seed (`108`) defines 12 codes: the 11 event-driven ones plus
`SYSTEM_MESSAGE`, used by `POST /api/v1/admin/notifications` (ADMIN only) for announcements and
for testing before the other services publish events. Each code maps to a display category
(`REMINDER`, `PROMOTION`, `CONFIRMATION`, `CANCELLATION`, `MESSAGE`, `SYSTEM`) computed in code,
not stored.

### 5. Welcome email

The welcome notification is also sent by email through the same SMTP settings as
`security-service` (`MAIL_*`, Gmail app password or Mailpit), controlled by `MAIL_ENABLED`. To
avoid storing or querying emails, `UserRegistered` carries the recipient's `email` and
`firstName`; this is the only personal data on the bus, and `UserRegistered.toString()` omits it
so it never reaches the logs. Other notifications are not emailed yet: booking reminders need
`booking-service` data.

### 6. Messaging can be switched off

`MESSAGING_ENABLED` (default `false`) turns RabbitMQ on for `security-service` (publisher) and
`notification-service` (consumer). Queue `notification-service.events` is bound to the routing
keys above on `carwash.events`; failed messages are retried three times and then dead-lettered to
`notification-service.events.dlq`.

---

## Consequences

**Positive:**
- Push, in-app inbox and events work without reading any other service's tables.
- Duplicate deliveries never create duplicate notifications.
- The service runs on any machine with only SQL Server.

**Negative / trade-offs:**
- Two tables outside the original DDL; `lavarapido-6-services-sqlserver.sql` and `06-data` must be
  updated to include them.
- Push requires an EAS build of the mobile app; iOS additionally requires an Apple Developer
  account.
- Stored text is in one language; full localisation of history would need templates, which the
  data model decided against.
- Without the Outbox (ADR-004), an event can be lost if RabbitMQ is down at publish time.

---

## Alternatives considered

| Alternative | Why it was discarded |
|---|---|
| Firebase Cloud Messaging directly | Requires native setup per platform; Expo's service wraps FCM and APNs with one API and no server credentials |
| Store device tokens in `security` | Push delivery is a notification concern; `security` should not grow per-feature data |
| Resolve `customer_id` → `user_id` by calling `customer-service` | Adds a synchronous dependency to an asynchronous side effect |
| No processed-event table (rely on unique constraints) | Notifications have no natural unique key; duplicates would be indistinguishable |

---

## References

- ADR-003, ADR-004, ADR-009
- `05-architecture/cross-cutting.md` §7 — exchange, routing keys, envelope
- `02-domain/domain-events.md` — event meanings
- `06-data/models.md` §09 — notification schema
- Expo push notifications: https://docs.expo.dev/push-notifications/overview/
