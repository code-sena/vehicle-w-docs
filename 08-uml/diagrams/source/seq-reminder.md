# Sequence — Booking reminder (ADR-011 §7)

Source: `notification-service` `DomainEventConsumerService.updateReminders`, `BookingReminderService`,
`BookingReminder`; checked against the code on 2026-10-19.

```mermaid
sequenceDiagram
    autonumber
    participant MQ as RabbitMQ
    participant N as notification-service
    participant DB as notification.booking_reminder
    participant J as ReminderScheduler
    participant S as security-service
    actor C as Client

    MQ-)N: BookingConfirmed (new or rescheduled)
    N->>DB: Replace pending reminders: one per lead (REMINDER_LEADS, default 24h,1h) still in the future
    MQ-)N: BookingCancelled, ServiceStarted or ServiceCompleted
    N->>DB: Cancel pending reminders of that booking (soft delete)
    loop every REMINDER_CHECK_INTERVAL (default 5m)
        J->>DB: Reminders due (remind_at <= now, not sent)
        alt booking time already passed (service was down)
            J->>DB: mark sent_at without notifying
        else
            J->>S: GET /internal/v1/users/{id}/contact (X-Internal-Key)
            J->>N: BOOKING_REMINDER notification (in the client's language)
            N-->>C: inbox + push + email
            J->>DB: mark sent_at (never sent twice)
        end
    end
```
