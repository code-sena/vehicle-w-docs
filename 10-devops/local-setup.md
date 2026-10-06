# Local Project Setup

> How to run LavaRápido on a developer machine. The team guide with more detail lives in the
> infra repository: `lavarapido-infra/GUIA-EQUIPO.md`.

---

## Prerequisites

| Tool | Version | Verify with |
|------|---------|-------------|
| Git | any recent | `git --version` |
| Docker Desktop | 24+ | `docker --version` |
| JDK | **21+** (the team uses 21; 24 also works) | `java -version` |
| .NET SDK | **8** (only for payment-service; Visual Studio 2022 17.8+ also works) | `dotnet --version` |
| Node.js | 20.19+ / 22.12+ / 24 (Angular 21) | `node -v` |
| Angular CLI (optional, comes with `npx`) | 21 | `npx ng version` |

Maven is **not** needed: each service ships the Maven wrapper (`./mvnw`).

Recommended: IntelliJ IDEA or VS Code; a SQL client (DBeaver, Azure Data Studio or SSMS); Postman
or the Swagger UI of each service.

---

## Repositories and folder layout

Clone every repository **side by side** (the compose file and the services find each other by
relative path):

```
Backend/
├── lavarapido-infra/                 docker-compose.yml, .env, GUIA-EQUIPO.md
├── lavarapido-security-service/
├── lavarapido-customer-service/
├── lavarapido-booking-service/
├── lavarapido-notification-service/
└── lavarapido-api-gateway/
Web/                                  Angular app
LavadoVehicular-Movil/                React Native (Expo) app
```

---

## Local ports in use

| Port | What |
|------|------|
| 1433 | SQL Server (database `LavaRapido`). A native Windows SQL Server on the same port must be stopped (service `MSSQLSERVER`) |
| 5672 / 15672 | RabbitMQ / management panel (guest / guest) |
| 1025 / 8025 | Mailpit SMTP / web inbox for test emails |
| 3001 | security-service |
| 3002 | customer-service |
| 3003 | booking-service |
| 3004 | operations-service (`OPERATIONS_PORT`) |
| 3005 | payment-service, .NET (`PAYMENT_PORT`) |
| 3006 | notification-service |
| 8080 | api-gateway |
| 4200 | Web (`ng serve`) |

```bash
# Who is using a port (Windows PowerShell)
Get-NetTCPConnection -State Listen -LocalPort 3001 | Select OwningProcess
```

---

## Step-by-step installation

### Step 1: Environment variables

```bash
cd Backend/lavarapido-infra
cp .env.example .env        # then fill in the secrets
```

Every service reads `../lavarapido-infra/.env` automatically. Required values:

| Variable | What |
|---|---|
| `DB_PASSWORD` | SQL Server `sa` password |
| `JWT_SECRET` | ≥ 32 bytes, **same for all services** |
| `INTERNAL_API_KEY` | Shared key security ↔ notification (booking emails and reminders) |
| `MAIL_*` | Gmail app password, or leave Mailpit defaults |
| `MESSAGING_ENABLED=true` | Turn on RabbitMQ events (welcome email, booking notifications, reminders) |

Generate a secret: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
`.env` is git-ignored: never commit it.

### Step 2: Start the infrastructure

```bash
cd Backend/lavarapido-infra
docker compose up -d        # SQL Server, RabbitMQ, Mailpit (+ creates the database)
docker ps                   # wait until lavarapido-sqlserver shows (healthy)
```

### Step 3: Start the services

One terminal per service, **after** SQL Server is healthy. Migrations (Liquibase) and seed data
run automatically at startup.

```bash
cd Backend/lavarapido-security-service     && ./mvnw spring-boot:run
cd Backend/lavarapido-customer-service     && ./mvnw spring-boot:run
cd Backend/lavarapido-booking-service      && ./mvnw spring-boot:run
cd Backend/lavarapido-operations-service   && ./mvnw spring-boot:run
cd Backend/lavarapido-payment-service      && dotnet run --project src/PaymentService.Api   # .NET 8
cd Backend/lavarapido-notification-service && ./mvnw spring-boot:run
cd Backend/lavarapido-api-gateway          && ./mvnw spring-boot:run   # required: the web goes through it
```

payment-service does not create its tables on startup: `docker compose up -d` runs the
`payment-migrate` container (Liquibase) once. It reads the same `lavarapido-infra/.env`.

Alternative (everything in Docker): `docker compose --profile app up -d --build`. payment-service
is not in the compose file yet: run it with `dotnet run` (see `05-architecture/deployment.md`).

### Step 4: Start the web

```bash
cd Web
npm install
npx ng serve                # http://localhost:4200 — proxy.conf.json sends /api to the gateway (:8080)
```

### Step 5: Verify it works

```bash
curl http://localhost:3001/actuator/health   # {"status":"UP"} — same for 3002–3006 and 8080
```

Swagger UI (dev profile): `http://localhost:300N/swagger-ui.html`; payment-service:
`http://localhost:3005/swagger`.
Demo accounts (seeded by security-service in dev): `admin@gmail.com`, `operador@gmail.com`,
`cliente@gmail.com`.

---

## Daily workflow

```bash
docker compose up -d                     # in lavarapido-infra
git pull                                 # in each repo you work on
./mvnw spring-boot:run                   # each service (new migrations apply on startup)
npx ng serve                             # web
```

At the end: stop the services (Ctrl+C) and, if you want, `docker compose stop`.

---

## Common issues

| Problem | Fix |
|---|---|
| Service fails: TCP connection to `localhost:1433` failed | SQL Server still starting: wait for **healthy** and start again |
| `Port XXXX was already in use` | Another instance is running: stop it or change `PORT` |
| Every request answers 401 | `JWT_SECRET` (or issuer/audience) differs between services |
| Web shows `ECONNREFUSED` in the `ng serve` console | The target service is not running |
| No welcome email / booking notifications | `MESSAGING_ENABLED=false` or RabbitMQ down |
| Booking emails/reminders only in the inbox | `INTERNAL_API_KEY` empty or different between security and notification |
| `./mvnw: cannot read distributionUrl` | `.mvn/wrapper/maven-wrapper.properties` lost its final newline: add it |
| Start over (deletes all data) | `docker compose down -v` then `docker compose up -d` |

Do **not** run `./mvnw clean` while that same service is running: it deletes the compiled
classes the running instance uses.

---

## Utility commands

```bash
./mvnw test                                   # tests of a service
npx ng build --configuration development      # build the web
docker exec -it lavarapido-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -d LavaRapido
```

---

## Useful local URLs

| URL | What |
|---|---|
| http://localhost:4200 | Web |
| http://localhost:300N/swagger-ui.html | Swagger of each service |
| http://localhost:15672 | RabbitMQ panel |
| http://localhost:8025 | Mailpit (test emails) |

---

## Correlations

- Environments and deployment → `environments.md`
- Services and ports → `09-microservices/service-catalog.md`
