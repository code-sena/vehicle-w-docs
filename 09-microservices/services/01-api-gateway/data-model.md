# Data Model — API Gateway

> The gateway is **stateless**: no database, no cache, no session. Everything it needs is
> configuration in `src/main/resources/application.yml`, overridable with environment variables.

---

## Storage

| Item | Value |
|---|---|
| Database | None |
| Cache / shared store | None (no Redis in the stack) |
| In-memory state | None that outlives a request |

Consequence: rate limiting and token revocation are **not** done here (they would need a shared
store). See `decisions.md`.

---

## Configuration instead of tables

| Setting | Property | Env variable | Default |
|---|---|---|---|
| Port | `server.port` | `GATEWAY_PORT` | `8080` |
| security-service URL | route `security-service` | `ROUTE_SECURITY_URL` | `http://localhost:3001` |
| customer-service URL | route `customer-service` | `ROUTE_CUSTOMER_URL` | `http://localhost:3002` |
| booking-service URL | route `booking-service` | `ROUTE_BOOKING_URL` | `http://localhost:3003` |
| notification-service URL | route `notification-service` | `ROUTE_NOTIFICATION_URL` | `http://localhost:3006` |
| Allowed web origins | `app.cors.allowed-origins` | `CORS_ALLOWED_ORIGINS` | `http://localhost:4200` |

Routes live in `spring.cloud.gateway.server.webmvc.routes` (path predicates per service; full table
in `README.md`). Changing a route means editing the file and restarting the gateway.
Values can also come from `lavarapido-infra/.env` (imported as optional properties).

---

## Correlations

- Routes and responsibilities → `README.md`
- Environments → `10-devops/environments.md`
- Service registry → `09-microservices/service-catalog.md`
