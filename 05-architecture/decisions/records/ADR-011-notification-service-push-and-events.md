# ADR-011 — Notification Service: Push Delivery and Event Contract

- **ID:** ADR-011
- **Date:** 2026-09-30 (updated 2026-10-09: sections 9 to 14; 2026-10-23: section 17, the contract as built)
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
| `PaymentRefunded` | `payment.refunded` | `customerUserId`, `paymentId`, `amount` | `PAYMENT_REFUNDED` (section 9) |
| `PromotionRedeemed` | `payment.promotion_redeemed` | `customerUserId`, `bookingId`, `bookingCode`, `promotionName`, `discountAmount` | `PROMOTION_REDEEMED` (ADR-015) |
| `LoyaltyPointsEarned` | `payment.loyalty_points_earned` | `customerUserId`, `bookingId`, `bookingCode`, `points`, `balance`, `unlockedPromotions[]` | `LOYALTY_POINTS_EARNED` + one `PROMOTION_AVAILABLE` per unlocked coupon (section 11) |

`scheduledStart` is ISO-8601 UTC. An event without its recipient id produces no notification.

> **Current contract (checked against `origin/develop` on 2026-10-23): section 17.** This table is the
> original agreement. Since then `BookingCreated` was never published, `BookingConfirmed` never
> carries `operatorUserId` (the consumer still reads it if it comes), payment events also carry
> `bookingId`, and `BookingStatusChanged`, `ServiceNotStarted`, `ServiceNotFinished` and
> `InspectionShared` were added.

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
so it never reaches the logs. Other notifications are not emailed yet (see section 7 for
reminders).

### 6. Messaging can be switched off

`MESSAGING_ENABLED` (default `false`) turns RabbitMQ on. When this ADR was written only
`security-service` (publisher) and `notification-service` (consumer) used it; today the flag is read
by the six services: **four publish** (security, booking, operations, payment) and **three consume**
(customer, operations, notification), see section 17. Queue `notification-service.events` is bound
to its routing keys on `carwash.events`; failed messages are retried three times and then
dead-lettered to `notification-service.events.dlq`.

### 7. Booking reminders (added 2026-10-02)

`notification-service` reminds the customer before each booking (`BOOKING_REMINDER`, category
`REMINDER`) without querying `booking-service`:

- `BookingConfirmed` (new or rescheduled booking) carries `bookingId`, `bookingCode`,
  `customerUserId` and `scheduledStart`; the consumer stores one row per booking and lead time in
  the new table `notification.booking_reminder` (migration 019). Default leads: 24 h and 1 h
  (`app.reminders.leads`). Leads already in the past are not scheduled; a reschedule moves them.
- `BookingCancelled` cancels the pending reminders (soft delete).
- A scheduled task (`app.reminders.check-interval`, default 5 min) sends the due reminders to the
  inbox and by push, and marks them sent. A reminder whose booking time already passed (service
  was down) is discarded without notifying.
- Reminders are also emailed (section 8).
- Designed for a single instance; several instances would need a lock to avoid duplicates.

### 8. Booking and reminder emails: contact read from `security-service` (added 2026-10-04)

Booking notifications (`BOOKING_CREATED`, `BOOKING_CONFIRMED`, `BOOKING_CANCELLED`) and
`BOOKING_REMINDER` are also emailed. `notification-service` still stores no emails: when one of
these is sent it asks `security-service` for the current contact:

- `GET /internal/v1/users/{id}/contact` returns only `email`, `firstName` and `active`.
- `/internal/**` lives outside `/api/v1` (never exposed to the web or the gateway) and has its own
  security chain: it ignores user JWTs and requires the shared key `INTERNAL_API_KEY` in the
  `X-Internal-Key` header (constant-time comparison). With no key configured the routes stay closed.
- If the key is missing, `security-service` is down or the account is inactive, the notification
  still reaches the inbox and push, without email.

Alternative discarded: copying the email from `UserRegistered` into this service — it would
duplicate personal data, go stale when the user changes it, and existing accounts would have none.

### 9. Payment results are emailed; refunds notify the customer (added 2026-10-08)

`payment-service` now publishes `payment.confirmed`, `payment.rejected` and `payment.refunded`
(`PaymentIntegrationEvents`). The customer receives `PAYMENT_CONFIRMED`, `PAYMENT_REJECTED` and the
new `PAYMENT_REFUNDED` (migration `028`, category `MESSAGE`) in the inbox and by email, through the
same contact lookup as section 8.

Rule applied: a customer notification is emailed when it changes something for the customer.
Service progress stays in the inbox and push only.

| Emailed to the customer | Inbox and push only |
|---|---|
| `USER_WELCOME`, `BOOKING_CREATED`, `BOOKING_CONFIRMED`, `BOOKING_CANCELLED`, `BOOKING_REMINDER`, `PROMOTION_REDEEMED`, `PAYMENT_CONFIRMED`, `PAYMENT_REJECTED`, `PAYMENT_REFUNDED`, `PROMOTION_AVAILABLE` and `INSPECTION_REPORT` (section 11) | `OPERATOR_ASSIGNED`, `SERVICE_STARTED`, `SERVICE_COMPLETED`, `LOYALTY_POINTS_EARNED` (section 11) and every staff notification (section 10) |

### 10. Staff notifications and role-aware welcome (added 2026-10-08)

Besides `OPERATOR_ASSIGNED`, operators and administrators are told about booking changes (RF-018):

| Recipient | Type | When |
|---|---|---|
| Assigned operator | `OPERATOR_SERVICE_RESCHEDULED` | The booking moves to another time |
| Assigned operator | `OPERATOR_SERVICE_CANCELLED` | The booking is cancelled |
| Previous operator | `OPERATOR_SERVICE_UNASSIGNED` | The booking is reassigned to someone else |
| Every active administrator | `ADMIN_BOOKING_CREATED` | A new booking is confirmed |
| Every active administrator | `ADMIN_BOOKING_RESCHEDULED` | A booking moves to another time |
| Every active administrator | `ADMIN_BOOKING_CANCELLED` | A booking is cancelled (with the reason; the event does not say who cancelled) |

- `notification-service` still queries no other service's data: it keeps its own projection
  `notification.booking_tracking` (migration `027`), fed by `BookingConfirmed`, `BookingCancelled`
  and `OperatorAssigned`, to tell a new booking from a rescheduled one and to know the assigned
  operator.
- The administrators' ids come from `security-service` `GET /internal/v1/users/admins` (active
  `ADMIN` accounts, same internal key as section 8). If it cannot be read, the administrator
  notices are skipped and the event is still processed.
- Staff notifications are inbox and push only, never email: product decision, an operator's
  assignment must not reach their email.
- The welcome message depends on the role (administrator, operator or customer). `UserRegistered`
  carries `createdByAdmin`; when an administrator opened the account, the message explains how to
  sign in (ask the administrator for the password or use "Forgot your password?"). The password is
  never sent.

### 11. Loyalty points, unlocked coupons and inspection notices (added 2026-10-08)

`payment-service` publishes `LoyaltyPointsEarned` right after `payment.confirmed` whenever the
approval (or an in-person payment) credits loyalty points (ADR-015 section 5). `unlockedPromotions`
lists the promotions available today whose `required_points` that credit has just reached, each with
`code`, `name`, `discountPercent` and `requiredPoints`.

| Notification | Text | Channel |
|---|---|---|
| `LOYALTY_POINTS_EARNED` (new, category `PROMOTION`) | "Ganaste N puntos": the booking code and the new balance | Inbox and push only |
| `PROMOTION_AVAILABLE` (one per unlocked coupon) | "¡Tienes un cupón canjeable!": the promotion's name, its discount and the code to use when paying | Inbox, push and email |

The vehicle inspection report (today RF-036) is not a backend aggregate yet: the web keeps it locally. The
administrator announces it from the inspection screen through `POST /api/v1/admin/notifications`
with type `INSPECTION_REPORT` (new, category `MESSAGE`). The message carries the summary (phases,
number of findings and their areas) instead of the public link, which only opens in the
administrator's browser while the report is local. It replaces the former "send by WhatsApp" button:
product decision, every customer update goes through notifications and email. The admin endpoint
applies the same email rule as events (`EmailRecipients`): `INSPECTION_REPORT` is emailed, a plain
`SYSTEM_MESSAGE` is not. It accepts only those two types: any other one is rejected with 400
`NOTIFICATION_TYPE_NOT_ALLOWED`, because an event-only type written by hand (e.g. a fake "payment
approved") would reach the customer's inbox and email as if it were real.

Both new types are seeded by migration `029`.

*Update 2026-10-23:* the inspection report is now an aggregate of operations-service (ADR-014 §9):
when the administrator shares a published report, operations publishes
`execution.inspection_shared` with the public token, and notification sends `INSPECTION_REPORT`
with the link `WEB_URL/report/{token}`. The manual `POST /api/v1/admin/notifications` with that type
is still accepted.

### 12. The user's notification switches are stored in security and applied here (added 2026-10-08)

The three switches of Configuración > Notificaciones (web and mobile) used to live only in the
browser or the phone, so turning one off changed nothing. They now live in
`security.user_preference` (`notifications_enabled` = push, plus `email_reminders_enabled` and
`promotions_enabled`, security migration `030`, both default 1 so nobody stops receiving what they
already received), are edited through `PUT /api/v1/users/me/preferences` (partial update: an
omitted field keeps its value, so changing the theme never resets a switch) and travel to this
service in the internal contact (`pushEnabled`, `emailRemindersEnabled`, `promotionsEnabled`,
section 8).

| Switch off | Effect |
|---|---|
| Push | No push to the user's phones; the inbox and the email are not affected |
| Booking-reminder email | `BOOKING_REMINDER` is not emailed |
| Promotions | `PROMOTION_AVAILABLE` (unlocked coupon) is neither emailed nor pushed |

- The inbox is always filled: the switches only choose external channels. One rule set
  (`NotificationChannels`) is used both by the email decision (`EmailRecipients`) and by the push
  decision (`NotificationSendingService`).
- The push check asks security-service only when the user has registered phones. If the contact
  cannot be read, the push is sent anyway (better one notice too many than none); a missing switch
  in an older security-service response counts as on.


### 13. Reminders stop when the service starts or finishes (added 2026-10-09)

**Problem:** reminders were cancelled only by `BookingCancelled`. A service started early still sent
"your booking is in 1 hour" to a client whose car was already being washed.

**Decision:** `ServiceStarted` and `ServiceCompleted` (operations-service) also cancel the pending
reminders of that booking, in the same idempotent consumer (`DomainEventConsumerService`). Together
with the start window of ADR-014 §6, a client is never reminded of a service that already began.


### 14. Alert to the administrators: a booking starts soon without an operator (added 2026-10-09)

**Problem:** the administrator learns about each new booking (section 10) and the dashboard lists
the bookings without operator, but nothing warns them when the time is close and the booking is
still unassigned.

**Decision:** the reminder task (every `REMINDER_CHECK_INTERVAL`, 5 min) also looks in
`notification.booking_tracking` for bookings that are not cancelled, have no operator and start in
less than `REMINDER_UNASSIGNED_LEAD` (default 2 h), or should have started less than 1 hour ago.
Every active administrator (security-service `/internal/v1/users/admins`) receives
`ADMIN_BOOKING_UNASSIGNED` "Reserva sin operario" (category `MESSAGE`, inbox and push, never email,
like every staff notification).

- Each booking is alerted once: `booking_tracking.unassigned_alert_at` (migration `031`). If the
  booking is rescheduled the mark is cleared and the alert comes again before the new time; once an
  operator is assigned it is not alerted.
- Older bookings (more than 1 hour after their start) are not alerted, so an old booking that nobody
  closed does not fill the inbox.
- Without administrators (or with security-service down) nothing is marked and the next round
  retries. notification-service still queries no other service's data: it uses its own projection.

### 15. Each notification is written in the language of the account that receives it (added 2026-10-14)

**Problem:** the account stores its language (RF-020: Spanish, English, French or Portuguese), but
every notice — inbox, push and email — was written in Spanish.

**Decision:** the texts are templates in `i18n/notifications_{es,en,fr,pt}.properties`
(`NotificationTexts`). The factories build each notice as a key plus its data (`LocalizedText`): booking
code, date, amount, optional pieces such as the reason. Right before sending, notification-service reads
the recipient's language from the internal contact of security-service (the same call it already makes
for the email and the channel switches, §8 and §12; it now carries `language`) and writes the title and
the message in that language. Dates use each language's format (`01/10/2026 a las 10:00`,
`10/01/2026 at 10:00 AM`…). The email greeting, footer and subject follow the same language.

- What is stored is still the rendered text (06-data, decision 1): a notification keeps saying what it
  said when it was sent, even if the user changes language later.
- Without a language, or with security-service down, the notice goes out in Spanish.
- Messages written by an administrator (`SYSTEM_MESSAGE`) are sent as typed.
- A test checks that the 4 files have the same keys and the same parameters.

### 16. Deliveries as commands, and push in the mobile app (added 2026-10-15)

**Problem:** the backend already sent push through Expo (§2) and stored the phones, but the mobile app
never asked for permission, never registered its token and did nothing when a push was tapped. On the
backend, the push and email calls were written inline in the sending service, so a new channel meant
editing it and one failing channel could stop the next.

**Decision (backend):** the external deliveries follow the **Command** pattern.

- `DeliveryCommand` (`channel()`, `execute()`), with `PushDeliveryCommand` and `EmailDeliveryCommand`.
- `DeliveryPlanner` decides which channels apply (active phones + the user's switches, §12; email only
  when the command carries an address) and builds one command per channel. It reads the contact from
  security-service only when the user has phones.
- `DeliveryInvoker` runs them one by one and isolates failures: a broken SMTP does not stop the push,
  and the notification already saved in the inbox is never undone. The log line says by which channels
  it went out and which failed.
- The Expo message now carries `channelId` = category in lower case (`reminder`, `promotion`…),
  `priority: high` and `data.category`, besides `notificationId`, `type` and the reference.

**Decision (mobile, `expo-notifications`):** the same pattern on the app side.

| Piece | Role |
|---|---|
| `pushGateway` | Adapter: the only file that uses `expo-notifications` (permission, Android channels, token, listeners, badge) |
| `RegisterDeviceCommand` | On sign-in: permission → 6 Android channels (one per category, translated) → Expo token → `PUT /notifications/devices` |
| `UnregisterDeviceCommand` | On sign-out, while the access token is still valid: `POST /notifications/devices/unregister` |
| `MarkNotificationReadCommand`, `OpenNotificationCommand`, `RefreshInboxCommand` | Tapping a push: mark it read, open its screen, reload the inbox and the icon badge |
| `CompositeCommand` | Groups the three above; if one fails the others still run |
| `notificationCommandFactory` | Turns each event (sign-in, sign-out, push received, push tapped) into its command |
| `NotificationCommandInvoker` | One queue for the whole app: register and unregister never overlap; errors are logged, never thrown to the screen |
| `PushNotificationsSync` | Component that connects the above with the session and the navigation |

- The screen each push opens depends on the role and the type (`notificationRoutes`); an unknown type
  opens the inbox. This is navigation only: who is notified and the text are still decided by the backend.
- The push data is validated before use (`PushPayload`): ids must be positive integers.
- A push that opened the closed app is handled once the session is loaded.

**Limits:**
- Since SDK 53, **Expo Go on Android does not receive remote push**. Testing on a phone needs a
  development build (`npx expo run:android` or `eas build --profile development`) and an EAS project id
  (`eas init`, or `EXPO_PUBLIC_EAS_PROJECT_ID`). Without them the app skips the registration and keeps
  working; the inbox still fills.
- Web, emulators without Google services and Expo Go skip the registration in the same way.
- Expo push receipts (the second step that confirms delivery to Firebase/Apple) are not read yet; only
  the tickets (`DeviceNotRegistered` deactivates the token).

**Verified on 2026-10-15:** 6 backend tests (`DeliveryCommandsTest`, 83 in the service); 11 checks of the
mobile commands with test doubles; live run against a local fake Expo endpoint (message with channel,
priority and data; a `DeviceNotRegistered` token deactivated; unregister on sign-out); the app in web mode
signs in, opens the inbox and signs out with the new code.

### 17. The event contract as built (checked against `origin/develop` on 2026-10-23)

Exchange `carwash.events` (topic, durable). Envelope
`{eventId, eventType, aggregateId, occurredAt, version: 1, payload}`; `occurredAt` belongs to the
envelope, not to the payload. Every publisher sends after its transaction commits and, if RabbitMQ
fails, only logs the error (no Outbox, accepted risk H-11). Four services publish; customer and
notification publish nothing.

| Producer | Routing key | `eventType` | Payload | Consumers (queue) |
|---|---|---|---|---|
| security | `security.user_registered` | `UserRegistered` | `userId`, `personId`, `email`, `firstName`, `roles`, `createdByAdmin` | customer (`customer-service.events`), notification (`notification-service.events`) |
| booking | `booking.confirmed` | `BookingConfirmed` | `bookingId`, `bookingCode`, `customerUserId`, `customerVehicleId`, `scheduledStart`, `serviceBayId`, `preferredOperatorId` (only on creation, if chosen) | operations (`operations-service.events`), notification |
| booking | `booking.cancelled` | `BookingCancelled` | same base fields + `reason` (display name of the reason, in Spanish); `customerUserId` is `null` when the system expires a booking | notification |
| booking | `booking.status_changed` | `BookingStatusChanged` | same base fields + `status` (`IN_PROGRESS`, `COMPLETED` or `NO_SHOW`) — A-11, 2026-10-23 | notification |
| operations | `execution.operator_assigned` | `OperatorAssigned` | `bookingId`, `bookingCode`, `customerUserId`, `operatorUserId`, `scheduledStart` | notification |
| operations | `execution.service_started` | `ServiceStarted` | same | notification |
| operations | `execution.service_completed` | `ServiceCompleted` | same | notification |
| operations | `execution.service_not_started` | `ServiceNotStarted` | same | notification |
| operations | `execution.service_not_finished` | `ServiceNotFinished` | same | notification |
| operations | `execution.inspection_shared` | `InspectionShared` | `bookingId`, `bookingCode`, `customerUserId`, `plate`, `publicToken`, `phasesDone`, `phasesTotal`, `findings`, `majorFindings`, `areas` | notification |
| payment | `payment.confirmed` | `PaymentConfirmed` | `paymentId`, `bookingId`, `customerUserId`, `amount` | notification |
| payment | `payment.rejected` | `PaymentRejected` | same + `reason` | notification |
| payment | `payment.refunded` | `PaymentRefunded` | same as confirmed | notification |
| payment | `payment.promotion_redeemed` | `PromotionRedeemed` | `customerUserId`, `bookingId`, `bookingCode`, `promotionCode`, `promotionName`, `discountAmount` | notification |
| payment | `payment.loyalty_points_earned` | `LoyaltyPointsEarned` | `customerUserId`, `bookingId`, `bookingCode`, `points`, `balance`, `unlockedPromotions[]` (`code`, `name`, `discountPercent`, `requiredPoints`) | notification |
| — | `booking.created` | `BookingCreated` | no producer: notification still binds and handles it | notification |

Queues: `customer-service.events` and `notification-service.events` dead-letter to
`customer-service.events.dlq` / `notification-service.events.dlq` through the direct exchange
`carwash.events.dlx` after three attempts. `operations-service.events` has no DLQ: its listener is
idempotent and logs a failure instead of requeueing (ADR-014 §10).

Notes:

- `BookingStatusChanged` (A-11): when the administrator moves a booking to in progress, completed or
  no-show from the panel, the client gets `SERVICE_STARTED`, `SERVICE_COMPLETED` or a
  `BOOKING_CANCELLED` worded as no-show. **Open gap:** the consumer cancels pending reminders only
  for `BookingCancelled`, `ServiceStarted` and `ServiceCompleted`, so a status set by the admin does
  not stop the reminders yet (`15-project-control/risks.md`). Moving a booking back to `CONFIRMED`
  republishes `BookingConfirmed`.
- `ServiceNotStarted` / `ServiceNotFinished`: operations' follow-up job publishes one per booking that
  ended with an operator and nobody registered (ADR-014 §8); notification sends
  `OPERATOR_SERVICE_NOT_REGISTERED` to the operator and `ADMIN_SERVICE_NOT_REGISTERED` to every active
  administrator.
- Raised but only logged (no consumer): security `EmailChanged`, `PasswordChanged`,
  `AccountDeactivated`; customer `CustomerProvisioned`, `VehicleRegistered`, `VehicleUpdated`,
  `VehicleRemoved`, `LoyaltyPointsChanged`.
- notification-service knows 26 notification types (`NotificationTypeCode`), all seeded.

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
