# Events — API Gateway

> The gateway does not take part in messaging: it has no RabbitMQ dependency.

| Direction | Events |
|---|---|
| Published | None |
| Consumed | None |

Business events are published by the services behind it (security, booking) and consumed by
customer and notification. See:

- `09-microservices/services/02-security-service/events.md`
- `09-microservices/services/04-booking-service/events.md`
- `09-microservices/services/07-notification-service/events.md`

## Access information

The gateway does not write its own access log. Each service logs the request it receives with
its correlation id (`13-operations/observability.md`). The gateway forwards the
`X-Correlation-Id` header unchanged when the client sends one.
