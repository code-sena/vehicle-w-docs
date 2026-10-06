# Deployment Environments

> The environments the project actually has today, how they are configured, and what is still
> missing. Rule: no secret is ever committed — they live in `lavarapido-infra/.env` (git-ignored).

---

## Project environments

| Environment | Status | How it runs | Data |
|-------------|--------|-------------|------|
| **local (dev profile)** | 🟢 In use | Infra in Docker (`docker compose up -d`, includes `payment-migrate`), each Java service with `./mvnw spring-boot:run`, payment with `dotnet run`, web with `ng serve` (+ `proxy.conf.json` → gateway) | Liquibase seeds + demo accounts |
| **local Docker (app profile)** | 🟢 Available | `docker compose --profile app up -d --build`: every Java service and the API gateway in containers (payment-service not yet: no `Dockerfile` and no compose entry) | Same database |
| **staging / production** | 🔴 Not set up | — | — |
| **CI** | 🔴 Not set up | No pipeline yet; tests run locally with `./mvnw test`, `dotnet test` and `ng build` | — |

Spring profile `dev` (default) turns on Swagger UI and the demo data seeder; without it Swagger is off.

---

## Configuration

All services read the same file, `lavarapido-infra/.env` (template: `.env.example`). Environment
variables override it. Main variables:

| Variable | Used by | Local value / note |
|----------|---------|--------------------|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | all services | SQL Server on `localhost:1433`, database `LavaRapido` |
| `DB_HOST`, `DB_PORT`, `DB_NAME` | payment (.NET) | `localhost`, `1433`, `LavaRapido` (payment builds its connection string from these instead of `DB_URL`) |
| `PORT` | security, customer, booking, notification | `3001`, `3002`, `3003`, `3006` (default of each service) |
| `OPERATIONS_PORT` | operations | `3004` |
| `PAYMENT_PORT` | payment | `3005` |
| `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE` | all services | Same values everywhere (security signs, the rest verify) |
| `CORS_ALLOWED_ORIGINS` | services, gateway | `http://localhost:4200` |
| `MESSAGING_ENABLED`, `RABBITMQ_*` | security, customer, booking, operations, notification | `true` to use RabbitMQ events |
| `MAIL_ENABLED`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` | security, notification | Gmail (app password) or Mailpit |
| `INTERNAL_API_KEY` | security, notification | Shared key for `/internal/**` |
| `PUSH_ENABLED`, `EXPO_ACCESS_TOKEN` | notification | Push through Expo |
| `REMINDER_LEADS`, `REMINDER_CHECK_INTERVAL` | notification | `24h,1h`, `5m` |
| `CUSTOMER_SERVICE_URL`, `SECURITY_SERVICE_URL` | booking / customer, operations, notification | Service-to-service URLs |
| `BOOKING_SERVICE_URL` | operations, payment | `http://localhost:3003/api/v1` |
| `CUSTOMER_SERVICE_TIMEOUT`, `SECURITY_SERVICE_TIMEOUT`, `BOOKING_SERVICE_TIMEOUT` | booking / customer / operations | `3s`: how long to wait for the neighbour (booking answers 503 `CUSTOMER_SERVICE_UNAVAILABLE` when customer does not respond). payment uses a fixed 5 s |
| `ROUTE_*_URL`, `GATEWAY_PORT` | api-gateway | Where each service is: `ROUTE_SECURITY_URL` (3001), `ROUTE_CUSTOMER_URL` (3002), `ROUTE_BOOKING_URL` (3003), `ROUTE_OPERATIONS_URL` (3004), `ROUTE_PAYMENT_URL` (3005), `ROUTE_NOTIFICATION_URL` (3006) |
| `BOOKING_ZONE` | booking, operations | `America/Bogota` |
| `BOOKING_SLOT_MINUTES`, `BOOKING_MAX_DAYS_AHEAD` | booking | `30` (start times offered every 30 min), `60` (how far ahead a client can book) |

In Docker (`--profile app`) the compose file replaces the host names with the container names
(`sqlserver`, `rabbitmq`, `mailpit`, `security-service`…).

---

## What a real deployment would still need

1. A CI pipeline per repository: `./mvnw verify` (Java services), `dotnet test` (payment), `ng build` (web), Docker image build.
2. A hosted SQL Server and RabbitMQ, with the secrets in the hosting provider's secret store.
3. The web built for production and served behind the API gateway (same domain, no CORS), or
   with `API_BASE_URL` pointing to the gateway.
4. HTTPS in front of the gateway.
5. An Outbox for events (ADR-004) if losing an event during a broker outage is not acceptable.

---

## Correlations

- Local setup step by step → `local-setup.md`
- Services, ports and schemas → `09-microservices/service-catalog.md`
