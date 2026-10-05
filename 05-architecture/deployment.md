# Deployment

**Last updated:** 2026-10-04

The project runs on the team's machines (local development, integration testing and demos).
There is no staging or production deployment in scope.

## 1. Environments

| Environment | Status | Purpose |
|---|---|---|
| Local | In use | Development, integration testing and demos with Docker Compose |
| Staging | Out of scope | Not built in this academic version |
| Production | Out of scope | The system is not deployed for real users |

## 2. Runtime components

Defined in `lavarapido-infra/docker-compose.yml`:

| Component | Image / source | Port(s) | Role |
|---|---|---|---|
| `sqlserver` | `mcr.microsoft.com/mssql/server:2022-latest` | 1433 | Database `LavaRapido`, nine owned schemas |
| `db-init` | same image, runs once | — | Creates the `LavaRapido` database if missing |
| `rabbitmq` | `rabbitmq:4-management` | 5672, 15672 (panel) | Event broker, exchange `carwash.events` |
| `mailpit` | `axllent/mailpit` | 1025 (SMTP), 8025 (inbox) | Catches emails in local tests (Gmail SMTP is used when configured) |
| `security-service` | `lavarapido/security-service:local` | 3001 | Identity, roles, preferences |
| `customer-service` | `lavarapido/customer-service:local` | 3002 | Customers and vehicles |
| `booking-service` | `lavarapido/booking-service:local` | 3003 | Catalog, schedule, bays, bookings |
| `notification-service` | `lavarapido/notification-service:local` | 3006 | Inbox, push, email, reminders |
| `api-gateway` | `lavarapido/api-gateway:local` | 8080 | External entry point |
| Web (Angular) | `ng serve` | 4200 | Not containerised; proxies `/api` (`proxy.conf.json`) |
| Mobile (Expo) | Expo dev server | — | Developed separately |

`docker compose up -d` starts only the infrastructure (SQL Server, RabbitMQ, Mailpit); the services
and the gateway belong to the `app` profile (`docker compose --profile app up -d --build`), so a
developer can run them from the IDE with `./mvnw spring-boot:run` instead.

`operations-service` and `payment-service` are not in the compose file yet (in development /
incomplete).

## 3. Logical topology

```text
Angular (4200) / React Native
          │ REST
          ▼
   API Gateway (8080)           ← in development the web may still call services directly
          │
   ┌──────┼──────────────┬───────────────┐
   ▼      ▼              ▼               ▼
security customer     booking      notification
 (3001)  (3002)        (3003)         (3006)
   │       ▲  REST        │               │  REST (X-Internal-Key) → security
   │       └──────────────┘               │
   └──── publish ──► RabbitMQ ◄── publish ┘(consumes)
                       │
          customer, notification consume
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

Each service applies its own Liquibase changelog at startup and keeps its own changelog tables,
so services can be migrated independently. Cross-service foreign keys are not used.

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
commands → `13-operations/README.md`. Payment receipt storage is still pending (payment-service).

## 8. Health and verification

Every service and the gateway expose `GET /actuator/health` (database included). Verification
before a demo → `13-operations/README.md`.

## 9. CI/CD boundary

Jenkins is the planned CI tool; pipeline design lives in `10-devops/ci-cd.md`.

## References

- Local environment → `10-devops/local-setup.md`
- Requirements → `04-requirements/non-functional.md`
- Data model → `06-data/models.md`
- Service decomposition → `decisions/records/ADR-009-service-decomposition-revised.md`
