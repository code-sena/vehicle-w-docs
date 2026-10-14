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

## Out of scope (what it does NOT do)

- **No business logic** — it only routes.
- **No JWT validation** — each service verifies its own token (ADR-006). The gateway does not
  add `X-User-*` headers and services never trust such headers.
- **No data** — stateless.
- Rate limiting is not implemented yet (see `decisions.md`).

---

## Routes

| Path | Service |
|---|---|
| `/api/v1/auth/**`, `/api/v1/users/**`, `/api/v1/admin/users/**` | security-service :3001 |
| `/api/v1/vehicles/**`, `/api/v1/vehicle-types`, `/api/v1/admin/vehicles` | customer-service :3002 |
| `/api/v1/catalog/**`, `/api/v1/schedule/**`, `/api/v1/establishment`, `/api/v1/bookings/**`, `/api/v1/admin/bookings/**`, `/api/v1/admin/catalog/**`, `/api/v1/admin/schedule/**`, `/api/v1/admin/bays/**`, `/api/v1/admin/establishment`, `/api/v1/operator/bookings/**` | booking-service :3003 |
| `/api/v1/admin/operators/**`, `/api/v1/admin/assignments/**`, `/api/v1/operator/services/**`, `/api/v1/operator/ratings`, `/api/v1/ratings/**` | operations-service :3004 |
| `/api/v1/payments/**`, `/api/v1/payment-accounts`, `/api/v1/admin/payments/**`, `/api/v1/admin/payment-accounts/**`, `/api/v1/admin/payment-methods` | payment-service :3005 |
| `/api/v1/notifications/**`, `/api/v1/admin/notifications/**` | notification-service :3006 |

Routing configuration: `lavarapido-api-gateway/src/main/resources/application.yml`. In local
development the web's `Web/proxy.conf.json` sends all of `/api` to the gateway (`:8080`), so a new
route only has to be added here.

Service URLs: `ROUTE_SECURITY_URL`, `ROUTE_CUSTOMER_URL`, `ROUTE_BOOKING_URL`,
`ROUTE_OPERATIONS_URL`, `ROUTE_PAYMENT_URL`, `ROUTE_NOTIFICATION_URL` (default
`http://localhost:3001`…`3006`; container names in Docker). The compose file does not set
`ROUTE_PAYMENT_URL` yet (see `05-architecture/deployment.md`).

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
paths are 404, and that CORS works without duplicated headers.

---

## Related documents

- [decisions.md](./decisions.md) — Gateway design decisions
- [runbook.md](./runbook.md) — Operation
- ADR-005 (API gateway), ADR-006 (JWT verified by each service), ADR-011 §8 (internal routes)
