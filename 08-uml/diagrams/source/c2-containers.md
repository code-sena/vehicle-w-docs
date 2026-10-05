# C4 Level 2 — Containers (as built, 2026-10-04)

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

    subgraph services[Spring Boot 4 · Java 21 · hexagonal]
        security[security-service :3001<br/>accounts, roles, JWT, preferences]
        customer[customer-service :3002<br/>customers, vehicles]
        booking[booking-service :3003<br/>catalog, schedule, bays, bookings]
        notification[notification-service :3006<br/>inbox, push, email, reminders]
        operations[operations-service<br/>planned]:::planned
        payment[payment-service<br/>incomplete]:::planned
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
    gateway --> notification

    booking -- "REST (user JWT)<br/>vehicle check" --> customer
    customer -- "REST (user JWT)<br/>/users/me" --> security
    notification -- "REST (X-Internal-Key)<br/>/internal/v1/users/{id}/contact" --> security

    security -- user_registered --> rabbit
    booking -- booking.confirmed / cancelled --> rabbit
    rabbit -- user_registered --> customer
    rabbit -- user + booking events --> notification

    security --> sql
    customer --> sql
    booking --> sql
    notification --> sql

    security -- recovery code --> smtp
    notification -- welcome, booking, reminder --> smtp
    notification --> expo

    classDef person fill:#08427b,color:#fff,stroke:#052e56
    classDef planned stroke-dasharray: 5 5,fill:#eee,color:#555
    classDef ext fill:#999,color:#fff
```

In development the web can also call the services directly through `Web/proxy.conf.json`
(same path table as the gateway).
