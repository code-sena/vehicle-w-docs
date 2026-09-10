# Deployment

> How the system is run. This project has **one environment: local**
> (`01-context/scope.md`). There is no staging and no production, so this document
> describes the Docker environment the team uses and nothing else. Anything marked
> **[to confirm]** is a proposal the team has to agree on before the first service is built.

**Last updated:** 2026-09-10

---

## 1. Environments

| Environment | Exists | Description |
|-------------|--------|-------------|
| Local | Yes | Everything runs with Docker Compose on each team member's machine (RNF-007) |
| Staging | No | Out of scope |
| Production | No | Out of scope. The project is not deployed for real users |

Jenkins appears in the project stack, but the pipeline belongs to `10-devops`, not here.

---

## 2. Containers

| Container | Port (host) | Notes |
|-----------|-------------|-------|
| `sqlserver` | `1433` | One database for the whole system, ten schemas (ADR-003). Data in a named volume |
| `rabbitmq` | `5672`, `15672` | `15672` is the console used to inspect queues and dead letter queues |
| `api-gateway` | `8080` | The only port the clients use |
| `security-service` | `8082` | |
| `audit-service` | `8083` | |
| `settings-service` | `8084` | |
| `customer-service` | `8085` | |
| `catalog-service` | `8086` | |
| `reserva-service` | `8087` | |
| `execution-service` | `8088` | |
| `promotion-service` | `8089` | |
| `payment-service` | `8090` | |
| `notification-service` | `8091` | |

**[to confirm]** The port numbers are a proposal. Two things behind it:

- The services start at `8082` on purpose: React Native's Metro bundler uses `8081`, and a
  backend service on that port makes the mobile app fail in a way that is annoying to
  diagnose.
- Service ports are exposed for debugging only. From the clients everything goes through
  `8080` (ADR-005).

Eleven applications plus two infrastructure containers is a heavy environment for a laptop.
It is a known consequence of ADR-002, and it is the reason the build order in that ADR
matters: not every service has to be running to work on one flow.

The Angular application runs outside Compose during development, with its own dev server.

---

## 3. Network and startup order

All containers share one Compose network and reach each other by container name, never by
`localhost`.

1. `sqlserver` and `rabbitmq` start first and must be healthy before anything else.
2. The database, the ten schemas and the ten users are created (section 4).
3. The Liquibase changelog is applied once against the database — schemas, tables,
   triggers and seed data, in the order the master file lists (RNF-006.3). **The services
   do not migrate on startup.**
4. Without the seed data the system does not start working: there is no booking without the
   `AGENDADA` status row.
5. The services start, and `api-gateway` last.

A service that cannot reach its dependencies fails on startup instead of running
half-broken (`cross-cutting.md`).

---

## 4. Database initialisation

Two steps, in this order:

**Step 1 — what Liquibase cannot do**, because it needs an administrator connection:

1. Create the database.
2. Create one database user per service, with permissions only on its own schema (ADR-003).

**Step 2 — the Liquibase changelog**, run once with that administrator connection:

3. The ten schemas, the tables, the constraints and the triggers, in the order the master
   file lists.
4. The seed catalogs — 13 tables, listed in section 17 of `06-data`.

**[to confirm]** Where step 1 lives: an init script mounted into the `sqlserver` container,
or a documented manual step.

**[to confirm]** Who runs step 2: a one-off container in the Compose file, or a command the
developer runs. It is not run by the services.

⚠️ The seed inserts use `SET IDENTITY_INSERT` with explicit ids on purpose.
`reserva_status.CANCELADA = 5` and `payment_status.APPROVED = 3` are written as literals
inside constraints and indexes, so **those two ids cannot change**.

From there on, every schema change is a **new changeset** in that same changelog, written
by whoever owns the schema. A changeset that has already run is never edited — Liquibase
refuses to proceed on a checksum mismatch, and that is the safety net, not a bug. No manual
changes to the database.

---

## 5. Configuration

Everything that changes between machines comes from environment variables (RNF-004.7). The
repository has an `.env.example` with the names and no real values; the real `.env` is
never committed.

| Variable | Used by | Description |
|----------|---------|-------------|
| `DB_HOST`, `DB_PORT`, `DB_NAME` | Every service | The shared database |
| `DB_USER_<SERVICE>`, `DB_PASSWORD_<SERVICE>` | Each service | Its own database user (ADR-003) |
| `RABBITMQ_HOST`, `RABBITMQ_USER`, `RABBITMQ_PASSWORD` | Services that publish or consume events | Broker connection |
| `JWT_SECRET` | `security-service`, the other services and the gateway | Signing and verification (ADR-006) |
| `JWT_EXPIRATION` | `security-service` | One hour (RNF-004.2) |
| `UPLOAD_MAX_SIZE` | `api-gateway`, `payment-service` | Receipt image limit (ADR-008) |
| `RECEIPT_STORAGE_PATH` | `payment-service` | **[to confirm]** — only applies if receipts are stored as files |

Spring profiles: `local` for a service run from the IDE, `docker` for the same service
inside Compose. The difference is the host names of the database and the broker.

---

## 6. Running it

1. Copy `.env.example` to `.env` and fill in the values.
2. Start the environment with Docker Compose.
3. Wait for the database and the broker to be healthy, and for the migrations and the seed
   data to run.
4. The API is available on port `8080`; the RabbitMQ console on `15672`.

RNF-007 asks that this works on any machine with Docker, without installing Java, SQL
Server or RabbitMQ locally, and that the setup can be reproduced from scratch.

---

## 7. Pending decisions

- **[to confirm]** Where receipt images are stored: a volume mounted into
  `payment-service`, or bytes in the database (ADR-008). If it is a volume, it has to be
  part of the Compose definition.
- **[to confirm]** One repository for the eleven applications or one per service. Belongs
  to `10-devops`.
- **[to confirm]** Maven or Gradle (also open in ADR-007).
- **[to confirm]** Health endpoints with Spring Boot Actuator, and whether Compose uses them
  as health checks.
- **[to confirm]** Where the initialisation script lives (section 4).
- Which services have to be running for the demo, given that eleven applications on one
  laptop is a lot (ADR-002).

---

## Correlations

- Local environment and Docker requirement → `04-requirements/non-functional.md` (RNF-007)
- Versioned migrations → `04-requirements/non-functional.md` (RNF-006.3)
- Seed data and frozen ids → `06-data/MODELO-DE-DATOS.md`, section 17
- Schemas and database users → ADR-003
- Broker topology → ADR-004
- The gateway as the only entry point → ADR-005
- Receipt uploads → ADR-008
- Pipeline and CI/CD → `10-devops/`