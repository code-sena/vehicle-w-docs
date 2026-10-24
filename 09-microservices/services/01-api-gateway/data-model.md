# Data Model — API Gateway

> The gateway has no database and no shared cache. Its only state is two in-memory maps: session
> answers and the request buckets of the auth rate limit (below; checked against `origin/develop`
> `c8b607a`, 2026-10-24). Everything else is configuration in `src/main/resources/application.yml`,
> overridable with environment variables.

---

## Storage

| Item | Value |
|---|---|
| Database | None |
| Cache / shared store | None (no Redis in the stack) |
| In-memory state | Session answers from security-service, by SHA-256 of the token alone (never the token itself), 30 seconds each, at most 10 000 entries. Request buckets of `/api/v1/auth/**`, one per client IP (SEC-04), at most 10 000: when full, the buckets already refilled are dropped, and if still full all are cleared |

Consequence: both maps are per instance. The rate limit on `/api/v1/auth/**` (429 `RATE_LIMITED`) counts
per gateway replica, since there is no shared store; closed sessions are cut by asking security-service,
and each instance keeps its own short cache. See `decisions.md`.

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
| Allowed web origins | `app.cors.allowed-origins` | `CORS_ALLOWED_ORIGINS` | `http://localhost:4200,http://localhost:8081` |
| Session check on/off | `app.session-check.enabled` | `SESSION_CHECK_ENABLED` | `true` |
| How long a session answer is kept | `app.session-check.cache-ttl` | `SESSION_CHECK_CACHE_TTL` | `30s` |
| Wait for security-service | `app.session-check.timeout` | `SESSION_CHECK_TIMEOUT` | `3s` |
| Auth rate limit on/off | `app.rate-limit.auth.enabled` | `AUTH_RATE_LIMIT_ENABLED` | `true` |
| Requests per IP to `/api/v1/auth/**` | `app.rate-limit.auth.requests` | `AUTH_RATE_LIMIT_REQUESTS` | `60` |
| Time to refill them | `app.rate-limit.auth.window` | `AUTH_RATE_LIMIT_WINDOW` | `1m` |
| Proxies whose `X-Forwarded-For` is trusted | `app.trusted-proxies` | `TRUSTED_PROXIES` | loopback and private networks (`127.0.0.0/8,::1/128,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,fc00::/7`) |
| Connect to a service | `spring.http.clients.connect-timeout` | `ROUTE_CONNECT_TIMEOUT` | `5s` |
| Wait for a service's whole answer | `spring.http.clients.read-timeout` | `ROUTE_READ_TIMEOUT` | `60s` |

Routes live in `spring.cloud.gateway.server.webmvc.routes` (path predicates per service; full table
in `README.md`). Changing a route means editing the file and restarting the gateway.
Values can also come from `lavarapido-infra/.env` (imported as optional properties).

---

## Correlations

- Routes and responsibilities → `README.md`
- Environments → `10-devops/environments.md`
- Service registry → `09-microservices/service-catalog.md`
