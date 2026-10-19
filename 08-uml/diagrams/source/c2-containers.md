# C4 Level 2 — Containers (as built, 2026-10-19)

> Source of truth: `lavarapido-infra/docker-compose.yml`, each service's `application.yml` and
> REST clients. The view is split in three diagrams so each one can be read on its own: who enters
> the system, which service calls which, and which events travel through RabbitMQ.

## 1. Overview

```mermaid
flowchart TB
    client([Client]):::person
    operator([Operator]):::person
    admin([Administrator]):::person

    subgraph front[Front ends]
        direction LR
        web[Web app<br/>Angular 21]
        mobile[Android app<br/>React Native / Expo]
    end

    gateway[API Gateway · :8080<br/>Spring Cloud Gateway<br/>routing + CORS]

    subgraph services[Microservices]
        direction LR
        security[security-service<br/>:3001]
        customer[customer-service<br/>:3002]
        booking[booking-service<br/>:3003]
        operations[operations-service<br/>:3004]
        payment[payment-service<br/>:3005 · .NET 8]
        notification[notification-service<br/>:3006]
    end

    sql[(SQL Server 2022<br/>database LavaRapido)]
    rabbit[[RabbitMQ<br/>exchange carwash.events]]
    smtp[SMTP<br/>Gmail / Mailpit]:::ext
    expo[Expo Push API]:::ext

    client --> web & mobile
    operator --> mobile
    admin --> web
    web -- "REST + JWT" --> gateway
    mobile -- "REST + JWT" --> gateway
    gateway -- "/api/v1/**" --> services
    services -- "one schema owner per service" --> sql
    services -- "publish / consume" --> rabbit
    notification -- "email" --> smtp
    notification -- "push" --> expo
    security -- "recovery code" --> smtp

    classDef person fill:#08427b,color:#fff,stroke:#052e56
    classDef ext fill:#999,color:#fff
```

| Service | What it owns | Schemas |
|---|---|---|
| security-service (Spring Boot 4, Java 21) | Accounts, roles, permissions, JWT, preferences, sessions | `security`, `audit` |
| customer-service (Spring Boot 4) | Customers and vehicles | `customer` |
| booking-service (Spring Boot 4) | Catalog, prices, schedule, bays, bookings, business data | `catalog`, `booking` |
| operations-service (Spring Boot 4) | Operators, shifts, assignment, execution, ratings, inspection report | `execution` |
| payment-service (.NET 8) | Payment accounts, payments, receipts, promotions, loyalty points | `payment`, `promotion` |
| notification-service (Spring Boot 4) | Inbox, push, email, reminders, staff alerts | `notification` |

## 2. Calls between services (REST)

```mermaid
flowchart LR
    booking[booking-service]
    customer[customer-service]
    security[security-service]
    operations[operations-service]
    payment[payment-service]
    notification[notification-service]
    apk[deploy/publish-apk.sh]:::ext

    booking -- "vehicle check<br/>(user JWT)" --> customer
    customer -- "/users/me<br/>(user JWT)" --> security
    operations -- "bookings, status<br/>(user JWT)" --> booking
    operations -- "/internal/v1/bookings<br/>(X-Internal-Key)" --> booking
    operations -- "operator accounts, names<br/>(admin JWT, X-Internal-Key)" --> security
    payment -- "booking status, total, owner, points<br/>(user JWT + X-Correlation-Id)" --> booking
    notification -- "/internal/v1/users/{id}/contact, /admins<br/>(X-Internal-Key)" --> security
    apk -- "/internal/v1/notifications/app-update<br/>(X-Internal-Key)" --> notification

    classDef ext fill:#999,color:#fff
```

## 3. Events (RabbitMQ, exchange `carwash.events`)

```mermaid
flowchart LR
    security[security-service]
    booking[booking-service]
    operations[operations-service]
    payment[payment-service]
    rabbit[[RabbitMQ<br/>carwash.events]]
    customer2[customer-service]
    operations2[operations-service]
    notification[notification-service]

    security -- "security.user_registered" --> rabbit
    booking -- "booking.confirmed<br/>booking.cancelled" --> rabbit
    operations -- "execution.operator_assigned<br/>execution.service_started<br/>execution.service_completed<br/>execution.inspection_shared" --> rabbit
    payment -- "payment.confirmed / rejected / refunded<br/>payment.promotion_redeemed<br/>payment.loyalty_points_earned" --> rabbit
    rabbit -- "security.user_registered<br/>(creates the customer profile)" --> customer2
    rabbit -- "booking.confirmed<br/>(automatic assignment)" --> operations2
    rabbit -- "all the events above<br/>(inbox, push, email, reminders)" --> notification
```

In development the web reaches the services through the gateway: `Web/proxy.conf.json` sends `/api`
to `http://localhost:8080`. In production Caddy serves the web and sends `/api` to the gateway over
HTTPS ([deployment-production](./deployment-production.md)). The `/internal/**` routes are not
published by the gateway; they need the `X-Internal-Key` header.

customer-service raises its own domain events (`customer.provisioned`, `customer.vehicle.*`) but only
writes them to the log; no other service needs them yet. security-service publishes only
`security.user_registered`; its other events (`security.user.deactivated`, email and password
changes) also stay in the log.
