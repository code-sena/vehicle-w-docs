# Events — Security Service

Exchange `carwash.events` (topic) on RabbitMQ, ADR-004. Published **after commit**, envelope
`{eventId, eventType, aggregateId, occurredAt, version, payload}`. Enabled with `MESSAGING_ENABLED=true`.

## Published

| Event | Routing key | Payload | Consumers |
|---|---|---|---|
| `UserRegistered` | `security.user_registered` | `userId`, `personId`, `email`, `firstName`, `roles`, `createdByAdmin` | customer-service (creates the client profile), notification-service (welcome notification + email) |

`email` and `firstName` are the only personal data on the bus; `UserRegistered.toString()` omits
them so they never reach the logs (ADR-011 §5).

## Raised but not published

`EmailChanged` (`security.user.email-changed`), `PasswordChanged` (`security.user.password-changed`)
and `AccountDeactivated` (`security.user.deactivated`) are raised by the use cases, but
`RabbitDomainEventPublisher` only writes them to the log: no service consumes them yet.

## Consumed

None.

## Synchronous calls received from other services

| Caller | Call | Why |
|---|---|---|
| customer-service | `GET /api/v1/users/me` with the caller's token | Read `personId` when the registration event did not arrive |
| notification-service | `GET /internal/v1/users/{id}/contact` with `X-Internal-Key` | Current email/name, language and switches for emails and reminders (ADR-011 §8) |
| notification-service | `GET /internal/v1/users/admins` with `X-Internal-Key` | Active admins for the staff notifications |
| operations-service | `GET /api/v1/admin/users?role=OPERATOR` with the admin's token | Operator accounts and names |
| operations-service | `GET /internal/v1/users/{id}/contact` with `X-Internal-Key` | First names in ratings and skipping disabled accounts in the automatic and the manual assignment (A-13) |
| api-gateway | `GET /api/v1/auth/session` with the caller's `Authorization` | Whether the token's session is still open (ADR-005); cached 30 s |
