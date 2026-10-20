# Deployment

**Last updated:** 2026-10-20

The project runs on the team's machines (local development and integration testing) and on one
Azure virtual machine (production, used for the demos). There is no staging environment.

## 1. Environments

| Environment | Status | Purpose |
|---|---|---|
| Local | In use | Development, integration testing and demos with Docker Compose |
| Staging | Out of scope | Not built in this academic version |
| Production | In use | Azure VM with `docker-compose.yml` + `docker-compose.prod.yml` behind Caddy (HTTPS); diagram `08-uml/diagrams/source/deployment-production.md`, details `10-devops/production.md` |

## 2. Runtime components

Defined in `lavarapido-infra/docker-compose.yml`:

| Component | Image / source | Port(s) | Role |
|---|---|---|---|
| `sqlserver` | `mcr.microsoft.com/mssql/server:2022-latest` | 1433 | Database `LavaRapido`, nine owned schemas |
| `db-init` | same image, runs once | — | Creates the `LavaRapido` database if missing |
| `rabbitmq` | `rabbitmq:4-management` | 5672, 15672 (panel) | Event broker, exchange `carwash.events` |
| `mailpit` | `axllent/mailpit` | 1025 (SMTP), 8025 (inbox) | Catches emails in local tests (Gmail SMTP is used when configured) |
| `payment-migrate` | `liquibase/liquibase:4.29`, runs once | — | Applies the payment-service changelogs (`payment`, `promotion` schemas) |
| `security-service` | `lavarapido/security-service:local` | 3001 | Identity, roles, preferences |
| `customer-service` | `lavarapido/customer-service:local` | 3002 | Customers and vehicles |
| `booking-service` | `lavarapido/booking-service:local` | 3003 | Catalog, schedule, bays, bookings |
| `operations-service` | `lavarapido/operations-service:local` | 3004 | Operators, assignment, execution, ratings |
| `payment-service` | `lavarapido/payment-service:local` | 3005 | Payment accounts, payments, receipts, promotions, loyalty (.NET 8) |
| `notification-service` | `lavarapido/notification-service:local` | 3006 | Inbox, push, email, reminders |
| `api-gateway` | `lavarapido/api-gateway:local` | 8080 | External entry point |
| Web (Angular) | `ng serve` | 4200 | Not containerised; proxies `/api` to the gateway `:8080` (`proxy.conf.json`) |
| Mobile (Expo) | Expo dev server | — | Developed separately |

`docker compose up -d` starts only the infrastructure (SQL Server, RabbitMQ, Mailpit) and runs
`payment-migrate` once; the services and the gateway belong to the `app` profile
(`docker compose --profile app up -d --build`), so a developer can run them from the IDE with
`./mvnw spring-boot:run` (or `dotnet run` for payment) instead.

`payment-service` is in the `app` profile too: it waits for `payment-migrate` and the gateway reaches
it with `ROUTE_PAYMENT_URL: http://payment-service:3005`. In production the same compose file runs
with `docker-compose.prod.yml` on top: no host ports except Caddy's 80/443, and Mailpit is not
started.

## 3. Logical topology

```text
Angular (4200) / React Native
          │ REST
          ▼
   API Gateway (8080)
          │
   ┌──────┬──────────┬──────────┼──────────┬──────────┐
   ▼      ▼          ▼          ▼          ▼          ▼
security customer  booking  operations  payment  notification
 (3001)  (3002)    (3003)    (3004)     (3005)     (3006)
REST: customer → security · booking → customer · operations → booking, security
      payment → booking · notification → security (X-Internal-Key)
Events: security, booking, operations, payment ──publish──► RabbitMQ ──► customer, operations, notification
   all ──► SQL Server (1433) · database LavaRapido · one schema owner per service
security (recovery code), notification (emails) ──► SMTP (Gmail or Mailpit)
notification ──► Expo Push API
```

## 4. SQL Server deployment

One database, separated by schema ownership (ADR-003):

- `security`, `audit` → `security-service`
- `customer` → `customer-service`
- `catalog`, `booking` → `booking-service`
- `execution` → `operations-service`
- `promotion`, `payment` → `payment-service`
- `notification` → `notification-service`

Each Java service applies its own Liquibase changelog at startup and keeps its own changelog
tables, so services can be migrated independently. payment-service (.NET) does not migrate on
startup: the `payment-migrate` container applies its changelogs (`DATABASECHANGELOG_PAYMENT`).
Cross-service foreign keys are not used.

## 5. Startup order

Compose enforces it with `depends_on`: SQL Server healthy → `db-init` completed and RabbitMQ
healthy → services → gateway (the gateway waits only for the services to start). Running the services with `./mvnw spring-boot:run`, start the containers first
and wait for `sqlserver` to be healthy; the services do not depend on each other to start.

## 6. Configuration

All values come from `lavarapido-infra/.env` (template `.env.example`, never commit `.env`):
database, RabbitMQ, `JWT_SECRET`, `INTERNAL_API_KEY`, mail, CORS origins, booking time zone,
reminder leads. Full list → `10-devops/environments.md`.

## 7. Storage and backups

SQL Server and RabbitMQ use named volumes (`sqlserver-data`, `rabbitmq-data`). Backup and restore
commands → `13-operations/README.md`. There is no file storage yet: payment receipts and account
QR codes are stored as images (data URLs) in the `payment` schema.

## 8. Health and verification

Every service and the gateway expose `GET /actuator/health` (database included in the Java
services; payment-service also checks the database, on `/actuator/health` and on `GET /health`). Verification
before a demo → `13-operations/README.md`.

## 9. CI/CD boundary

CI runs on GitHub Actions in every repository, and `lavarapido-infra` has a manual workflow that updates the Azure server; details in `10-devops/ci-cd.md`.

## References

- Local environment → `10-devops/local-setup.md`
- Requirements → `04-requirements/non-functional.md`
- Data model → `06-data/models.md`
- Service decomposition → `decisions/records/ADR-009-service-decomposition-revised.md`
