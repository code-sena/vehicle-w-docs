# Deployment Environments

> The environments the project actually has today, how they are configured, and what is still
> missing. Rule: no secret is ever committed — they live in `lavarapido-infra/.env` (git-ignored).

---

## Project environments

| Environment | Status | How it runs | Data |
|-------------|--------|-------------|------|
| **local (dev profile)** | 🟢 In use | Infra in Docker (`docker compose up -d`, includes `payment-migrate`), each Java service with `./mvnw spring-boot:run`, payment with `dotnet run`, web with `ng serve` (+ `proxy.conf.json` → gateway) | Liquibase seeds + demo accounts |
| **local Docker (app profile)** | 🟢 Available | `docker compose --profile app up -d --build`: every service (payment included) and the API gateway in containers | Same database |
| **production** | 🟢 In use, turned on on demand | `docker-compose.yml` + `docker-compose.prod.yml` on an Azure VM: Caddy on 80/443, web in nginx, SQL Server Express (see `production.md`) | Empty database plus the first administrator from `ADMIN_*` |
| **staging** | 🔴 Not set up | — | — |
| **CI** | 🟢 GitHub Actions | `ci.yml` in every repository on each push/PR to `develop` and `main` (`ci-cd.md`) | — |

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
| `CORS_ALLOWED_ORIGINS` | services, gateway | `http://localhost:4200,http://localhost:8081` (Angular dev server and `expo start --web`); same default in every service, the gateway and the compose file. In production, `PUBLIC_URL` |
| `MESSAGING_ENABLED`, `RABBITMQ_*` | security, customer, booking, operations, notification | `true` to use RabbitMQ events |
| `MAIL_ENABLED`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` | security, notification | Gmail (app password) or Mailpit |
| `INTERNAL_API_KEY` | security, booking, operations, notification | Shared key for `/internal/**` (also needed for automatic assignment) |
| `PUSH_ENABLED`, `EXPO_ACCESS_TOKEN` | notification | Push through Expo |
| `REMINDER_LEADS`, `REMINDER_CHECK_INTERVAL` | notification | `24h,1h`, `5m` |
| `CUSTOMER_SERVICE_URL`, `SECURITY_SERVICE_URL` | booking / customer, operations, notification | Service-to-service URLs |
| `BOOKING_SERVICE_URL` | operations, payment | `http://localhost:3003/api/v1` |
| `CUSTOMER_SERVICE_TIMEOUT`, `SECURITY_SERVICE_TIMEOUT`, `BOOKING_SERVICE_TIMEOUT` | booking / customer / operations | `3s`: how long to wait for the neighbour (booking answers 503 `CUSTOMER_SERVICE_UNAVAILABLE` when customer does not respond). payment uses a fixed 5 s |
| `ROUTE_*_URL`, `GATEWAY_PORT` | api-gateway | Where each service is: `ROUTE_SECURITY_URL` (3001), `ROUTE_CUSTOMER_URL` (3002), `ROUTE_BOOKING_URL` (3003), `ROUTE_OPERATIONS_URL` (3004), `ROUTE_PAYMENT_URL` (3005), `ROUTE_NOTIFICATION_URL` (3006) |
| `BOOKING_ZONE` | booking, operations | `America/Bogota` |
| `BOOKING_SLOT_MINUTES`, `BOOKING_MAX_DAYS_AHEAD` | booking | `30` (start times offered every 30 min), `60` (how far ahead a client can book) |
| `BOOKING_EXPIRY_GRACE_MINUTES`, `BOOKING_EXPIRY_CHECK_ENABLED`, `BOOKING_EXPIRY_CHECK_INTERVAL` | booking | `60` (an open booking is closed 1 h after its end), `true`, `PT5M` (the job runs every 5 minutes) |
| `SESSION_CHECK_ENABLED`, `SESSION_CHECK_CACHE_TTL`, `SESSION_CHECK_TIMEOUT` | api-gateway | `true`, `30s` (how long the answer about a token's session is kept), `3s` (wait for security-service before letting the call go on) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`, `ADMIN_DOCUMENT`, `ADMIN_PHONE` | security | First administrator created at startup when there is none (production; empty locally) |
| `AUTO_ASSIGN_ENABLED` | operations | Automatic operator assignment when a booking is confirmed |
| `SITE_ADDRESS`, `PUBLIC_URL` | Caddy, services | Production only: domain (or `:80`) and public base URL |

In Docker (`--profile app`) the compose file replaces the host names with the container names
(`sqlserver`, `rabbitmq`, `mailpit`, `security-service`…).

---

## What production still needs

1. Building the Docker images in CI and pushing them to a registry (the CI pipelines already build and test each repository, `ci-cd.md`).
2. A database user of its own instead of `sa`, and scheduled backups of `sqlserver-data`.
3. Uptime monitoring of `PUBLIC_URL`.
4. An Outbox for events (ADR-004) if losing an event during a broker outage is not acceptable.

---

## Correlations

- Local setup step by step → `local-setup.md`
- Production server → `production.md`
- Services, ports and schemas → `09-microservices/service-catalog.md`
