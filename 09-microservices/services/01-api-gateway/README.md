# API Gateway

> **Single entry point** to the system (ADR-005). The web and mobile apps call one port
> (8080) and the gateway forwards each request to the microservice that owns the path.

---

## Location in the architecture

| Field | Value |
|-------|-------|
| Number in catalog | 01 |
| Local port | 8080 (`GATEWAY_PORT`) |
| Repository | `lavarapido-api-gateway` |
| Stack | Spring Boot 4 + Spring Cloud Gateway 2025.1 (webmvc) · Java 21 |
| DB engine | — (stateless, no own DB) |
| Communicates with | security-service, customer-service, booking-service, operations-service, payment-service, notification-service |
| Consumed by | Web frontend (`proxy.conf.json` in dev), mobile app |

---

## Responsibilities (what this service DOES)

- Route `/api/v1/**` to the owning service, forwarding method, body, query string and headers
  (`Authorization`, `X-Correlation-Id`, `Accept-Language`) unchanged.
- Answer CORS for the browser (preflight included) with the same allowed origins as the services
  (`CORS_ALLOWED_ORIGINS`), and drop the services' own CORS headers so they are not duplicated.
- Keep `/internal/**` (service-to-service routes, ADR-011 §8) unreachable from outside: 404.
- Cut tokens of closed sessions (`SessionCheckFilter`, ADR-006 update 2026-10-21): before forwarding a
  call with a token to any service, ask security-service `GET /api/v1/auth/session` and answer its own
  401 if the session was closed. The answer is kept 30 seconds per token; `/api/v1/auth/**` is left to
  security-service, and a logout through the gateway clears the cached answer at once. If
  security-service does not answer, the call goes on.

## Out of scope (what it does NOT do)

- **No business logic** — it only routes.
- **No JWT validation** — each service verifies its own token (ADR-006); the gateway only asks
  whether the session is still open. It does not add `X-User-*` headers and services never trust
  such headers.
- **No data** — the only state is the short in-memory cache of session answers.
- Rate limiting only on `/api/v1/auth/**`: 60 requests per minute per client IP, then 429 `RATE_LIMITED`
  (SEC-04, 2026-10-24; in memory, per replica). The session check covers any `Authorization` scheme
  (SEC-01), the client IP is resolved from `X-Forwarded-For` only behind `TRUSTED_PROXIES` and forwarded
  to the services, and routes time out after 5 s (connect) and 60 s (read) (SEC-16).

---

## Routes

| Path | Service |
|---|---|
| `/api/v1/auth/**`, `/api/v1/users/**`, `/api/v1/admin/users/**`, `/api/v1/admin/roles-permissions/**` | security-service :3001 |
| `/api/v1/vehicles/**`, `/api/v1/vehicle-types`, `/api/v1/admin/vehicles` | customer-service :3002 |
| `/api/v1/catalog/**`, `/api/v1/schedule/**`, `/api/v1/establishment`, `/api/v1/bookings/**`, `/api/v1/admin/bookings/**`, `/api/v1/admin/catalog/**`, `/api/v1/admin/schedule/**`, `/api/v1/admin/bays/**`, `/api/v1/admin/establishment`, `/api/v1/operator/bookings/**` | booking-service :3003 |
| `/api/v1/admin/operators/**`, `/api/v1/operators/**`, `/api/v1/admin/inspections/**`, `/api/v1/public/inspections/**`, `/api/v1/admin/assignments/**`, `/api/v1/operator/services/**`, `/api/v1/operator/ratings`, `/api/v1/ratings/**` | operations-service :3004 |
| `/api/v1/payments/**`, `/api/v1/payment-accounts`, `/api/v1/admin/payments/**`, `/api/v1/admin/payment-accounts/**`, `/api/v1/admin/payment-methods`, `/api/v1/admin/promotions/**`, `/api/v1/loyalty/**` | payment-service :3005 |
| `/api/v1/notifications/**`, `/api/v1/admin/notifications/**` | notification-service :3006 |

Routing configuration: `lavarapido-api-gateway/src/main/resources/application.yml`. In local
development the web's `Web/proxy.conf.json` sends all of `/api` to the gateway (`:8080`), so a new
route only has to be added here.

Service URLs: `ROUTE_SECURITY_URL`, `ROUTE_CUSTOMER_URL`, `ROUTE_BOOKING_URL`,
`ROUTE_OPERATIONS_URL`, `ROUTE_PAYMENT_URL`, `ROUTE_NOTIFICATION_URL` (default
`http://localhost:3001`…`3006`; container names in Docker, `ROUTE_PAYMENT_URL` included).

---

## How to run it locally

```bash
cd lavarapido-api-gateway
./mvnw spring-boot:run
curl http://localhost:8080/actuator/health      # {"status":"UP"}
```

With Docker: `docker compose --profile app up -d` in `lavarapido-infra` (service `api-gateway`).

## Tests

`./mvnw test` — `GatewayRoutesTest` starts one fake HTTP server per service and checks that every
route reaches the right one, that token and query string travel, that `/internal/**` and unknown
paths are 404, and that CORS works without duplicated headers. `SessionCheckFilterTest` uses a fake
security-service: an open session goes through, a closed one gets security-service's 401, the
answer is cached per token, a logout clears it, and a failing security-service lets the call go on.
Since 2026-10-24 also `AuthRateLimitFilterTest`, `ClientIpResolverTest`, `GatewayAuthRateLimitTest` and
`GatewayRouteTimeoutTest`; 62 tests in the CI run of 2026-10-24.

---

## Related documents

- [decisions.md](./decisions.md) — Gateway design decisions
- [runbook.md](./runbook.md) — Operation
- ADR-005 (API gateway), ADR-006 (JWT verified by each service), ADR-011 §8 (internal routes)
