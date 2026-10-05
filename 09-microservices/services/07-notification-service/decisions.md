# Technical decisions — Notification Service

The main decisions are in **ADR-011**; this is a summary for the service.

## Idempotent consumer

**Decision:** The `eventId` is stored in `processed_event` in the same transaction as the
notifications (and reminders). A repeated event creates nothing; a failed one can be retried.

## Push through the Expo Push API

**Decision:** Phones register their Expo push token (`PUT /notifications/devices`); sending is
asynchronous and a push failure never loses the notification, which stays in the inbox.

## Reminders scheduled from events, not by querying booking

**Context:** booking-service stores the vehicle, not the client's user id, and a scheduled task
has no user token to ask for it.
**Decision:** `BookingConfirmed` already carries `customerUserId` and `scheduledStart`; the
consumer stores the reminders in `booking_reminder` and a scheduled task sends the due ones.
A reminder whose booking time already passed is discarded. Designed for a single instance.

## Email address read at send time, never stored

**Decision:** For booking emails and reminders the address is requested from security-service
through `/internal/**` with `INTERNAL_API_KEY` (ADR-011 §8). The alternative — copying the email
from `UserRegistered` — was discarded: duplicated personal data that goes stale, and existing
accounts would not have it.
