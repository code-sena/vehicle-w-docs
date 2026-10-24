# Deployment Environments

> The environments the project actually has today, how they are configured, and what is still
> missing. Rule: no secret is ever committed — they live in `lavarapido-infra/.env` (git-ignored).

---

## Project environments

| Environment | Status | How it runs | Data |
|-------------|--------|-------------|------|
| **local (dev profile)** | 🟢 In use | Infra in Docker (`docker compose up -d`, includes `payment-migrate`), each Java service with `./mvnw spring-boot:run`, payment with `dotnet run`, web with `ng serve` (+ `proxy.conf.json` → gateway) | Liquibase seeds + demo accounts |
| **local Docker (app profile)** | 🟢 Available | `docker compose --profile app up -d --build`: every service (payment included) and the API gateway in containers | Same database |
| **production** | 🟢 In use, turned on on demand | `docker-compose.yml` + `docker-compose.prod.yml` on an Azure VM: Caddy on 80/443, web in nginx, SQL Server Express (see `production.md`). Follows `develop`, updated by hand; continuous deployment from `main` is prepared but not pushed (`ci-cd.md`) | Empty database plus the first administrator from `ADMIN_*`; daily and on-boot backups |
| **staging** | 🔴 Not set up | — | — |
| **CI** | 🟢 GitHub Actions | `ci.yml` in every repository on each push/PR to `develop` and `main` (`ci-cd.md`) | — |

Spring profile `dev` turns on Swagger UI and, in security-service, the demo accounts. Since
2026-10-23 (E-05) **security-service has no default profile**: `docker-compose.yml` sets
`SPRING_PROFILES_ACTIVE=dev` and, run from the IDE, it needs `-Dspring-boot.run.profiles=dev`
(`local-setup.md`). customer, booking, operations and notification still default to `dev`. In
production `docker-compose.prod.yml` sets `prod` for all of them.

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
| `INTERNAL_API_KEY` | security, booking, operations, notification | Shared key sent as `X-Internal-Key` to `/internal/**` (emails, reminders, automatic assignment, names in ratings). **Required for the operator** since 2026-10-23 (E-01): booking only accepts `/api/v1/operator/bookings/**` from operations-service with this key, so without it starting or finishing a service answers 503, also locally. Empty locally means those features are off; mandatory in production |
| `ALLOWED_EMAIL_DOMAINS` | security | `gmail.com` (comma separated). Checked on sign-up, admin account creation (operators included) and email change → 400 `EMAIL_DOMAIN_NOT_ALLOWED`; login, password recovery and stored accounts are not checked (A-01) |
| `DEMO_ADMIN_PASSWORD`, `DEMO_OPERATOR_PASSWORD`, `DEMO_CLIENT_PASSWORD` | security (`dev` profile only) | Empty by default. Each one set creates `admin@gmail.com`, `operador@gmail.com` or `cliente@gmail.com` with that password; empty means that account is not created. Passwords are no longer in the code (E-05) |
| `PUSH_ENABLED`, `EXPO_ACCESS_TOKEN` | notification | Push through Expo |
| `REMINDER_LEADS`, `REMINDER_CHECK_INTERVAL` | notification | `24h,1h`, `5m` |
| `CUSTOMER_SERVICE_URL`, `SECURITY_SERVICE_URL` | booking / customer, operations, notification | Service-to-service URLs |
| `BOOKING_SERVICE_URL` | operations, payment | `http://localhost:3003/api/v1` |
| `CUSTOMER_SERVICE_TIMEOUT`, `SECURITY_SERVICE_TIMEOUT`, `BOOKING_SERVICE_TIMEOUT` | booking / customer / operations | `3s`: how long to wait for the neighbour (booking answers 503 `CUSTOMER_SERVICE_UNAVAILABLE` when customer does not respond). payment uses a fixed 5 s |
| `ROUTE_*_URL`, `GATEWAY_PORT` | api-gateway | Where each service is: `ROUTE_SECURITY_URL` (3001), `ROUTE_CUSTOMER_URL` (3002), `ROUTE_BOOKING_URL` (3003), `ROUTE_OPERATIONS_URL` (3004), `ROUTE_PAYMENT_URL` (3005), `ROUTE_NOTIFICATION_URL` (3006) |
| `BOOKING_ZONE` | booking, operations | `America/Bogota` |
| `BOOKING_SLOT_MINUTES`, `BOOKING_MAX_DAYS_AHEAD` | booking | `30` (start times offered every 30 min), `60` (how far ahead a client can book) |
| `BOOKING_EXPIRY_GRACE_MINUTES`, `BOOKING_EXPIRY_CHECK_ENABLED`, `BOOKING_EXPIRY_CHECK_INTERVAL` | booking, operations (only the margin) | `60` (margin after the end: a scheduled booking is cancelled, one that never had an operator becomes no-show), `true`, `PT5M` (the job runs every 5 minutes) |
| `FOLLOW_UP_ENABLED`, `FOLLOW_UP_INTERVAL`, `FOLLOW_UP_LOOK_BACK_DAYS` | operations | `true`, `PT5M`, `28`: the job that closes bookings without operator and notifies the ones the admin has to close. It looks 28 days back (the server can stay off for weeks; the web loads 30 days and the mobile 29, so the "Por cerrar" card shows all of them) |
| `SESSION_CHECK_ENABLED`, `SESSION_CHECK_CACHE_TTL`, `SESSION_CHECK_TIMEOUT` | api-gateway | `true`, `30s` (how long the answer about a token's session is kept), `3s` (wait for security-service before letting the call go on) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`, `ADMIN_DOCUMENT`, `ADMIN_PHONE` | security | First administrator created at startup when there is none (production; empty locally) |
| `AUTO_ASSIGN_ENABLED` | operations | Automatic operator assignment when a booking is confirmed |
| `SITE_ADDRESS`, `PUBLIC_URL` | Caddy, services | Production only: domain (or `:80`) and public base URL |

In Docker (`--profile app`) the compose file replaces the host names with the container names
(`sqlserver`, `rabbitmq`, `mailpit`, `security-service`…).

---

## What production still needs

1. Pushing and testing the continuous deployment, with the `AZURE_SSH_KEY` and `DEPLOY_DISPATCH_TOKEN` secrets (`ci-cd.md`).
2. Building the Docker images in CI and pushing them to a registry (the CI pipelines already build and test each repository, `ci-cd.md`).
3. Uptime monitoring of `PUBLIC_URL`.
4. A copy of the backups outside the VM (scheduled backups already exist, `production.md`).

Accepted for this version and not planned (`15-project-control/risks.md`): the shared `sa`
database user and the absence of an Outbox for events (ADR-004).

---

## Correlations

- Local setup step by step → `local-setup.md`
- Production server → `production.md`
- Services, ports and schemas → `09-microservices/service-catalog.md`
