# Events — Security Service

Exchange `carwash.events` (topic) on RabbitMQ, ADR-004. Published **after commit**, envelope
`{eventId, eventType, aggregateId, occurredAt, version, payload}`. Enabled with `MESSAGING_ENABLED=true`.

## Published

| Event | Routing key | Payload | Consumers |
|---|---|---|---|
| `UserRegistered` | `security.user_registered` | `userId`, `personId`, `email`, `firstName`, `roles` | customer-service (creates the client profile), notification-service (welcome notification + email) |

`email` and `firstName` are the only personal data on the bus; `UserRegistered.toString()` omits
them so they never reach the logs (ADR-011 §5).

## Consumed

None.

## Synchronous calls received from other services

| Caller | Call | Why |
|---|---|---|
| customer-service | `GET /api/v1/users/me` with the caller's token | Read `personId` when the registration event did not arrive |
| notification-service | `GET /internal/v1/users/{id}/contact` with `X-Internal-Key` | Current email/name for booking emails and reminders (ADR-011 §8) |
