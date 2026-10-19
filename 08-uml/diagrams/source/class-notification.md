# Class diagram — notification-service domain

Source: `lavarapido-notification-service/src/main/java/com/lavarapido/notification/domain` as of
2026-10-19. Getters, `restore(...)` factories and paging records are left out.

```mermaid
classDiagram
    direction LR
    class Notification {
        <<aggregate root>>
        -Long notificationId
        -long userId
        -NotificationTypeCode type
        -String title
        -String message
        -String referenceEntity
        -Long referenceId
        -Instant sentAt
        -Instant readAt
        -Instant deletedAt
        +create(long userId, NotificationTypeCode, String title, String message, ...)$ Notification
        +markRead(Instant)
        +markUnread()
        +delete(Instant)
        +belongsTo(long user) boolean
        +category() NotificationCategory
    }
    class NotificationTypeCode {
        <<enumeration>>
        24 types
        USER_WELCOME
        BOOKING_CREATED / CONFIRMED / CANCELLED / REMINDER
        OPERATOR_ASSIGNED, SERVICE_STARTED, SERVICE_COMPLETED
        PAYMENT_CONFIRMED / REJECTED / REFUNDED
        PROMOTION_AVAILABLE, PROMOTION_REDEEMED, LOYALTY_POINTS_EARNED
        INSPECTION_REPORT, SYSTEM_MESSAGE, APP_UPDATE_AVAILABLE
        OPERATOR_SERVICE_CANCELLED / RESCHEDULED / UNASSIGNED
        ADMIN_BOOKING_CREATED / RESCHEDULED / CANCELLED / UNASSIGNED
        +category() NotificationCategory
    }
    class NotificationCategory {
        <<enumeration>>
        REMINDER
        PROMOTION
        CONFIRMATION
        CANCELLATION
        MESSAGE
        SYSTEM
    }
    class DeviceToken {
        <<aggregate root>>
        -Long deviceTokenId
        -long userId
        -String token
        -DevicePlatform platform
        -boolean active
        -Instant lastSeenAt
        +register(long userId, String token, DevicePlatform, Instant)$ DeviceToken
        +reassignTo(long newUserId, DevicePlatform, Instant)
        +deactivate()
        +validToken(String)$ String
    }
    class DevicePlatform {
        <<enumeration>>
        ANDROID
        IOS
    }
    class BookingReminder {
        <<value object>>
        Long id
        long bookingId
        long userId
        String bookingCode
        Instant scheduledStart
        int leadMinutes
        Instant remindAt
        Instant sentAt
        +planFor(long bookingId, long userId, String code, Instant start, List~Duration~ leads, Instant now)$ List~BookingReminder~
        +isStale(Instant) boolean
    }
    class TrackedBooking {
        <<value object>>
        long bookingId
        String bookingCode
        Long customerUserId
        Long operatorUserId
        Instant scheduledStart
        boolean cancelled
        +confirmed(...)$ TrackedBooking
        +rescheduled(String code, Instant start) TrackedBooking
        +assignedTo(Long operator) TrackedBooking
        +startChangesTo(Instant) boolean
    }
    class DomainEventEnvelope {
        <<value object>>
        String eventId
        String eventType
        String aggregateId
        Instant occurredAt
        int version
        Map payload
    }
    class LocalizedText {
        <<value object>>
        String key
        Map params
    }
    class EventNotificationFactory {
        <<domain service>>
        +from(DomainEventEnvelope) List~SendNotificationCommand~
    }
    class StaffNotificationFactory {
        <<domain service>>
        +from(DomainEventEnvelope, Optional~TrackedBooking~, ...) List~SendNotificationCommand~
        +track(DomainEventEnvelope, Optional~TrackedBooking~) Optional~TrackedBooking~
    }
    class NotificationTexts {
        <<domain service>>
        +render(LocalizedText, String language) String
        +when(Instant, String language) String
    }

    Notification --> NotificationTypeCode
    NotificationTypeCode --> NotificationCategory
    DeviceToken --> DevicePlatform
    EventNotificationFactory ..> DomainEventEnvelope : reads
    EventNotificationFactory ..> LocalizedText : builds
    StaffNotificationFactory ..> DomainEventEnvelope : reads
    StaffNotificationFactory ..> TrackedBooking : keeps the last known state
    NotificationTexts ..> LocalizedText : ES, EN, FR, PT
    BookingReminder ..> TrackedBooking : same booking
```

Rules kept by these classes:

- Every event is handled once: its `eventId` goes to `notification.processed_event`, so a repeated
  delivery from RabbitMQ creates nothing.
- One event can produce several notifications: the customer's (`EventNotificationFactory`) and the
  operator's and administrators' (`StaffNotificationFactory`), which compares the event with the
  `TrackedBooking` to know if the booking was rescheduled, reassigned or cancelled.
- Texts are stored as keys and rendered in the user's language (`NotificationTexts`).
- `BookingReminder.planFor` plans one reminder per lead (`REMINDER_LEADS`, `24h,1h` by default) and
  skips the ones already in the past. A new plan replaces the old one when the booking is
  rescheduled; cancelling, starting or finishing the service removes the pending ones; and a reminder
  found after the booking time (`isStale`) is closed without being sent.
- `DeviceToken.validToken` accepts only Expo push tokens (`ExponentPushToken[...]`); a token that
  appears for another user is reassigned, not duplicated.
