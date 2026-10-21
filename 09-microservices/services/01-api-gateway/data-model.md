# Data Model — API Gateway

> The gateway has no database and no shared cache. Its only state is an in-memory map of session
> answers (below). Everything else is configuration in `src/main/resources/application.yml`,
> overridable with environment variables.

---

## Storage

| Item | Value |
|---|---|
| Database | None |
| Cache / shared store | None (no Redis in the stack) |
| In-memory state | Session answers from security-service, by SHA-256 of the token (never the token itself), 30 seconds each, at most 10 000 entries |

Consequence: rate limiting is **not** done here (it would need a shared store). Closed sessions are
cut by asking security-service; each gateway instance keeps its own short cache. See `decisions.md`.

---

## Configuration instead of tables

| Setting | Property | Env variable | Default |
|---|---|---|---|
| Port | `server.port` | `GATEWAY_PORT` | `8080` |
| security-service URL | route `security-service` | `ROUTE_SECURITY_URL` | `http://localhost:3001` |
| customer-service URL | route `customer-service` | `ROUTE_CUSTOMER_URL` | `http://localhost:3002` |
| booking-service URL | route `booking-service` | `ROUTE_BOOKING_URL` | `http://localhost:3003` |
| operations-service URL | route `operations-service` | `ROUTE_OPERATIONS_URL` | `http://localhost:3004` |
| payment-service URL | route `payment-service` | `ROUTE_PAYMENT_URL` | `http://localhost:3005` |
| notification-service URL | route `notification-service` | `ROUTE_NOTIFICATION_URL` | `http://localhost:3006` |
| Allowed web origins | `app.cors.allowed-origins` | `CORS_ALLOWED_ORIGINS` | `http://localhost:4200` |
| Session check on/off | `app.session-check.enabled` | `SESSION_CHECK_ENABLED` | `true` |
| How long a session answer is kept | `app.session-check.cache-ttl` | `SESSION_CHECK_CACHE_TTL` | `30s` |
| Wait for security-service | `app.session-check.timeout` | `SESSION_CHECK_TIMEOUT` | `3s` |

Routes live in `spring.cloud.gateway.server.webmvc.routes` (path predicates per service; full table
in `README.md`). Changing a route means editing the file and restarting the gateway.
Values can also come from `lavarapido-infra/.env` (imported as optional properties).

---

## Correlations

- Routes and responsibilities → `README.md`
- Environments → `10-devops/environments.md`
- Service registry → `09-microservices/service-catalog.md`
