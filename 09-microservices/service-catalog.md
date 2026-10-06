# Microservices Catalog

> The complete inventory of system services — one row per service.
> For the detail of each service, go to `09-microservices/services/NN-service-name/`.
> Decomposition decided in ADR-002 and revised in ADR-009.

---

## Services map

```
                          ┌─────────────────────┐
  Web (Angular)           │     API Gateway      │   (in dev the web reaches it through
  Mobile (React Native)──▶│        :8080         │    proxy.conf.json -> :8080)
                          └──────────┬──────────┘
                                     │ routes by path (/api/v1/**)
   ┌──────────┬──────────┬───────────┼──────────┬─────────────┬─────────────┐
   ▼          ▼          ▼           ▼          ▼             ▼             ▼
┌────────┐┌─────────┐┌─────────┐┌──────────┐┌───────────┐┌──────────────┐
│security││customer ││ booking ││operations││  payment  ││ notification │
│ :3001  ││  :3002  ││  :3003  ││  :3004   ││:3005 .NET ││    :3006     │
└────────┘└─────────┘└─────────┘└──────────┘└───────────┘└──────────────┘

  REST between services (caller's token):
    customer   ──▶ security  (GET /users/me)
    booking    ──▶ customer  (vehicles)
    operations ──▶ booking   (bookings, status IN_PROGRESS / COMPLETED)
    operations ──▶ security  (operator accounts)
    payment    ──▶ booking   (booking total, status, owner)
    notification ──▶ security (/internal, X-Internal-Key: email)

  Events on RabbitMQ (exchange carwash.events):
    security, booking, operations ──publish──▶ RabbitMQ ──▶ notification, customer

  All services share one SQL Server database (LavaRapido), one schema owner per service.
```

---

## Service registry

| # | Service | Main responsibility | Port | Schemas (SQL Server) | Status |
|---|---------|-------------------|------|-----|--------|
| 01 | `api-gateway` | Single entry point: routes `/api/v1/**`, CORS | 8080 | — (stateless) | 🟢 Built |
| 02 | `security-service` | Accounts, login (JWT HS256), roles, profile, password recovery | 3001 | `security`, `audit` | 🟢 Built |
| 03 | `customer-service` | Client profile and vehicles | 3002 | `customer` | 🟢 Built |
| 04 | `booking-service` | Catalog and prices, schedule, bays, availability, bookings | 3003 | `catalog`, `booking` | 🟢 Built |
| 05 | `operations-service` | Operators, shifts and absences, assignment, service execution, ratings | 3004 | `execution` | 🟢 Built |
| 06 | `payment-service` | Payment accounts with QR, payments with receipt, admin review | 3005 | `payment`, `promotion` | 🟡 Partial (promotions, loyalty and events pending; not in Docker Compose yet) |
| 07 | `notification-service` | Inbox, push (Expo), email, booking reminders | 3006 | `notification` | 🟢 Built |

Common stack: Spring Boot 4 · Java 21 · Maven · hexagonal architecture (ADR-007) · Liquibase ·
RFC 9457 errors with a stable `code` · `/actuator/health` · Swagger UI in the `dev` profile.
**Exception:** `payment-service` is .NET 8 / ASP.NET Core with EF Core. It keeps the same JWT,
error format and `/actuator/health`; its Liquibase changelogs run in the `payment-migrate`
container instead of on startup.

---

## Detail per service

| # | Folder | Contract |
|---|--------|----------|
| 01 | [`services/01-api-gateway/`](./services/01-api-gateway/README.md) | `07-api/contracts/openapi/api-gateway.yaml` |
| 02 | [`services/02-security-service/`](./services/02-security-service/README.md) | `07-api/contracts/openapi/security-service.yaml` |
| 03 | [`services/03-customer-service/`](./services/03-customer-service/README.md) | `07-api/contracts/openapi/customer-service.yaml` |
| 04 | [`services/04-booking-service/`](./services/04-booking-service/README.md) | `07-api/contracts/openapi/booking-service.yaml` |
| 05 | [`services/05-operations-service/`](./services/05-operations-service/README.md) | `07-api/contracts/openapi/operations-service.yaml` |
| 06 | [`services/06-payment-service/`](./services/06-payment-service/README.md) | `07-api/contracts/openapi/payment-service.yaml` |
| 07 | [`services/07-notification-service/`](./services/07-notification-service/README.md) | `07-api/contracts/openapi/notification-service.yaml` |


---

## Service communication matrix

| Source service | Destination | Channel | Type | Description |
|----------------|-------------|---------|------|-------------|
| api-gateway | every service | HTTP/REST | Synchronous | Forwards `/api/v1/**` by path (no JWT validation, ADR-006) |
| security | RabbitMQ | Event `security.user_registered` | Asynchronous | New account |
| customer | security | HTTP/REST `GET /users/me` (caller's token) | Synchronous | Read `personId` to create a missing client profile |
| booking | customer | HTTP/REST `GET /vehicles/{id}`, `/admin/vehicles` (caller's token) | Synchronous | Vehicle ownership and type (INV-BOOK-002) |
| booking | RabbitMQ | Events `booking.confirmed`, `booking.cancelled` | Asynchronous | Booking lifecycle |
| customer | RabbitMQ | consumes `security.user_registered` | Asynchronous | Create the client profile |
| operations | booking | HTTP/REST `/admin/bookings`, `/operator/bookings`, `PATCH /operator/bookings/{id}/status`, `/bookings/{id}` (caller's token) | Synchronous | Bookings to assign; move them to `IN_PROGRESS` / `COMPLETED`; the client's booking before rating |
| operations | security | HTTP/REST `GET /admin/users?role=OPERATOR` (admin's token) | Synchronous | Operator accounts and names |
| operations | RabbitMQ | Events `execution.operator_assigned`, `execution.service_started`, `execution.service_completed` | Asynchronous | Execution lifecycle |
| payment | booking | HTTP/REST `GET /bookings/{id}`, `/bookings/me`, `/admin/bookings/{id}` (caller's token) | Synchronous | Booking total, status and owner (the browser never sends the amount) |
| notification | RabbitMQ | consumes user, booking, execution and payment events | Asynchronous | Inbox, push, email, reminders |
| notification | security | HTTP/REST `GET /internal/v1/users/{id}/contact` (`X-Internal-Key`) | Synchronous | Current email for booking emails and reminders (ADR-011 §8) |

---

## Data ownership matrix

Each business entity has a single owner service. Others access it via API or events, never by
reading another schema.

| Entity / Data | Owner service (Source of Truth) | How other services access |
|---------------|--------------------------------|--------------------------|
| Person, account, roles, session | security-service | JWT claims; `GET /users/me`; `/internal/.../contact`; `UserRegistered` event |
| Client profile, vehicles, vehicle types | customer-service | REST (`/vehicles`, `/admin/vehicles`, `/vehicle-types`) |
| Services, prices, schedule, bays, bookings | booking-service | REST; `BookingConfirmed` / `BookingCancelled` events |
| Operators, shifts, absences, executions, ratings | operations-service | REST; `OperatorAssigned` / `ServiceStarted` / `ServiceCompleted` events |
| Payment accounts, payments, receipts, promotions, loyalty ledger | payment-service | REST (events not published yet) |
| Notifications, devices, reminders | notification-service | REST (own inbox only) |

---

## How to add a new service

1. Assign the next available number in this catalog.
2. Create the folder: `cp -r 09-microservices/_template/service 09-microservices/services/NN-new-service`.
3. Fill in the README, data-model, events, decisions and runbook.
4. Export the OpenAPI contract from the running service (`GET /v3/api-docs`) into `07-api/contracts/openapi/`.
5. Add the routes to the API gateway (`application.yml`). The web's `proxy.conf.json` already
   sends all of `/api` to the gateway (`:8080`), so it does not change.
6. Add the service to this catalog and to `lavarapido-infra/docker-compose.yml`.
7. Write an ADR if the service introduces a new decision.

---

## Correlations

- Architecture and patterns → `05-architecture/`
- API contracts per service → `07-api/contracts/openapi/`
- System events → `02-domain/domain-events.md`
- Template for creating services → `09-microservices/_template/service/`
