# System Observability

> What each service makes visible today (logs, health, broker panel), how to use it to find a
> problem, and what is still missing. Covers RNF-005 (observability).

---

## What exists today

| Pillar | Implemented | Where |
|--------|-------------|-------|
| Logs | Spring Boot console logs with service name and correlation id on every line | Terminal of each service, or `docker logs <container>` |
| Health | `GET /actuator/health` (+ liveness/readiness probes) on every service and the gateway | `http://localhost:300N/actuator/health`, `:8080` |
| Info | `GET /actuator/info` (service name) | same |
| Broker | RabbitMQ management panel: queues, message rates, dead-letter queues | http://localhost:15672 |
| Email | Mailpit inbox for test emails (when `MAIL_HOST` points to it) | http://localhost:8025 |
| Metrics | ❌ not exposed (no Micrometer registry) | — |
| Traces | ❌ no distributed tracing | — |

---

## Logs

### Format

Every line carries the service name and the request's correlation id:

```
INFO [booking-service,3f2a9c1e-…] 33220 --- [nio-3003-exec-4] c.l.b.a.usecase.BookingService : …
```

Pattern (`logging.pattern.level` in each `application.yml`): `%5p [${spring.application.name},%X{correlationId:-}]`.

### Correlation id

`CorrelationIdFilter` (every service) reads `X-Correlation-Id` from the request — accepted only if it
matches `^[A-Za-z0-9-]{1,64}$`, so it cannot inject lines into the log — or generates a UUID,
puts it in the MDC and returns it in the response header.

**Partly done:** booking-service forwards the id on its calls to customer-service, so a booking
and its vehicle check share one id. **Gap:** customer → security, notification → security and the
RabbitMQ messages do not carry it yet, and neither the web nor the gateway sends one. Today each service logs its own id; following one user action across
services means matching timestamps. Fix: forward the header in the `RestClient`s and add it as a
message header when publishing events.

### Levels

| Level | Used for |
|-------|----------|
| ERROR | Unexpected exceptions (the API answers 500 `INTERNAL_ERROR`), a failed publish to RabbitMQ, a failed email |
| WARN | Rejected tokens, a service that did not answer (customer, security), invalid messages sent to the DLQ, `INTERNAL_API_KEY` not set |
| INFO | Business milestones: booking created, event published/consumed, notification created, reminder sent, email sent |

### What is never logged

- Passwords, password hashes, recovery codes, JWTs, the internal API key.
- Email addresses and names: `UserRegistered.toString()` omits them; email logs only say
  "Email for notification N sent".
- Stack traces in API responses (`server.error.include-stacktrace: never`); they stay in the log.

---

## Health checks

```bash
for p in 3001 3002 3003 3006 8080; do echo "$p $(curl -s localhost:$p/actuator/health)"; done
```

- The database is part of the health of every service (Spring's datasource indicator).
- RabbitMQ health is checked only when `MESSAGING_ENABLED=true`
  (`management.health.rabbit.enabled`).
- Mail health is off on purpose: a down SMTP server must not mark a service as down, because email
  is secondary to the inbox.

---

## Business signals to watch (manual today)

| Signal | How to see it |
|---|---|
| Events piling up | RabbitMQ panel → Queues: `notification-service.events`, `customer-service.events` ("Ready" should stay near 0) |
| Failed events | RabbitMQ panel → `*.dlq` queues (any message there needs a look) |
| Reminders not sent | `SELECT * FROM notification.booking_reminder WHERE sent_at IS NULL AND deleted_at IS NULL AND remind_at < SYSUTCDATETIME()` |
| Emails failing | Log lines `Could not send the email for notification` |
| Bookings created today | `SELECT COUNT(*) FROM booking.booking WHERE created_at >= CAST(SYSUTCDATETIME() AS DATE)` |

---

## Next steps (not implemented)

1. Propagate `X-Correlation-Id` across REST calls and events (see the gap above).
2. Metrics: add `micrometer-registry-prometheus` and expose `/actuator/prometheus`; then RED
   metrics (rate, errors, duration) per endpoint.
3. JSON logs (`logging.structured.format.console=ecs`) if logs are shipped to a central store.
4. Tracing with OpenTelemetry once the system runs outside a single machine.

---

## Correlations

- Incident handling → `13-operations/incident-management.md`
- Runbook per service → `09-microservices/services/<NN-service>/runbook.md`
- Cross-cutting concerns (errors, correlation id, security) → `05-architecture/cross-cutting.md`
