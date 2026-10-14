# C4 Level 2 — Containers (as built, 2026-10-06)

> Source of truth: `lavarapido-infra/docker-compose.yml`, each service's `application.yml` and
> REST clients. Dashed/"planned" elements are not built yet.

```mermaid
flowchart TB
    client([Client]):::person
    operator([Operator]):::person
    admin([Administrator]):::person

    subgraph frontends[Front ends]
        web[Web app<br/>Angular 21 · :4200]
        mobile[Android app<br/>React Native / Expo]
    end

    gateway[API Gateway<br/>Spring Cloud Gateway · :8080<br/>routing + CORS]

    subgraph services[Spring Boot 4 · Java 21 · hexagonal — payment: .NET 8]
        security[security-service :3001<br/>accounts, roles, JWT, preferences]
        customer[customer-service :3002<br/>customers, vehicles]
        booking[booking-service :3003<br/>catalog, schedule, bays, bookings]
        notification[notification-service :3006<br/>inbox, push, email, reminders]
        operations[operations-service :3004<br/>operators, assignment, execution, ratings]
        payment[payment-service :3005 · .NET 8<br/>payment accounts, payments, receipts]
    end

    sql[(SQL Server 2022 · :1433<br/>database LavaRapido<br/>one schema owner per service)]
    rabbit[[RabbitMQ · :5672<br/>exchange carwash.events]]
    smtp[SMTP<br/>Gmail / Mailpit]:::ext
    expo[Expo Push API]:::ext

    client --> web
    client --> mobile
    operator --> mobile
    admin --> web
    web -- REST + JWT --> gateway
    mobile -- REST + JWT --> gateway
    gateway --> security
    gateway --> customer
    gateway --> booking
    gateway --> operations
    gateway --> payment
    gateway --> notification

    booking -- "REST (user JWT)<br/>vehicle check" --> customer
    customer -- "REST (user JWT)<br/>/users/me" --> security
    notification -- "REST (X-Internal-Key)<br/>/internal/v1/users/{id}/contact, /admins" --> security
    operations -- "REST (user JWT)<br/>bookings, status" --> booking
    operations -- "REST (admin JWT)<br/>operator accounts" --> security
    operations -- "REST (X-Internal-Key)<br/>/internal/v1/users/{id}/contact (names in ratings)" --> security
    payment -- "REST (user JWT)<br/>booking total" --> booking

    security -- user_registered --> rabbit
    booking -- booking.confirmed / cancelled --> rabbit
    operations -- execution.* --> rabbit
    rabbit -- user_registered --> customer
    rabbit -- user, booking + execution events --> notification

    security --> sql
    customer --> sql
    booking --> sql
    operations --> sql
    payment --> sql
    notification --> sql

    security -- recovery code --> smtp
    notification -- welcome, booking, reminder --> smtp
    notification --> expo

    classDef person fill:#08427b,color:#fff,stroke:#052e56
    classDef planned stroke-dasharray: 5 5,fill:#eee,color:#555
    classDef ext fill:#999,color:#fff
```

In development the web reaches the services through the gateway: `Web/proxy.conf.json` sends `/api`
to `http://localhost:8080`.
