# System Overview


---

## What is LavaRápido?

LavaRápido (Vehicle Washing, SENA ADSO project 3145556) is a web and mobile platform for a
single-location car wash business. It lets customers book a slot from their phone,
and lets the business organize its operators' work and collect payments
from a single place.

## Problem it solves

**Before the system:** Customers had to call or drive to the shop
without knowing whether a slot was free. Inside, bookings were kept by
hand, slots overlapped, work was handed out at the manager's discretion,
and cash payments left no record of the customer.

**With the system:** Customers see real availability and book in minutes
with no wasted trips, either choosing their own operator or letting the
system assign one. When booking, the customer chooses how to pay: by
scanning the shop's own QR code and uploading proof of payment within 30
minutes, which the Administrator verifies against the amount due, or in
cash at the shop (one active cash booking at a time). Every service keeps
a history and a rating.

**Where this comes from:** this is a documented project hypothesis, not
measured field research — no booking-error rate, wasted-trip count or
adoption figure has been collected yet. The team will capture a pilot
baseline before claiming any of those outcomes (full detail, including
the risks to validate before trusting this hypothesis, in
`03-product/problem-framing.md`).

## Main users

| Role | Description | What they do in the system |
|------|-------------|--------------------------|
|  Administrator | Business owner or manager; no technical background required | Manages operators and schedules; creates operator and administrator accounts and activates or deactivates accounts (the role is set at creation and is not changed later; an administrator account cannot be deactivated); defines services and promotions; reschedules or cancels bookings; reviews and approves payments; oversees overall operation and generates operational reports |
| Operator | Employee who performs the wash; no technical background required | Records their working availability, views assigned services, updates service status, and receives customer ratings |
| Customer | Vehicle owner; no technical background required | Registers their vehicle, books time slots (time and service type), picks an operator from those available or lets the system assign one, cancels a booking before its start time, pays by scanning the shop's QR code and uploading a receipt, applies promotions and rates the service |

## Technology stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Frontend | Angular (web) + React Native (Android) | Angular enforces a modular structure and static typing, which keeps the logic manageable across three roles with different permissions. React Native shares its language and component model with the web client, so both clients consume the same API and the team works within a single paradigm |
| Backend | Java 21 + Spring Boot | Booking requires strict transactional control: two customers must never end up with the same time slot and operator. Spring Boot provides transaction management, security and data access out of the box, while Java 21 adds strong typing and virtual threads to handle concurrent bookings without blocking threads |
| Database | SQL Server | The domain is strongly relational (customer → vehicle → booking → operator → payment) and requires referential integrity and ACID transactions on payment: a booking ending up with two approved payments, or a payment receipt being reused across bookings, is not acceptable. A document store would push that consistency into application code |
| Message broker | RabbitMQ | Actions such as notifying an operator of an assigned booking, sending the customer's booking confirmation or notifying them once the Administrator reviews their payment receipt should not delay the booking response. Queueing them lets the booking confirm immediately, and a delivery failure won't bring the operation down |
| Infrastructure | Docker + GitHub Actions | Docker ensures the backend, the database and the services run identically on every team member's machine and on the server, removing the "it works on my machine" problem. GitHub Actions builds and tests every repository on each change, preventing code that breaks the application from being merged (Jenkins was the first plan; GitHub Actions needs no server of its own). Since 2026-10-26 a merge to `main` also deploys the change to the Azure server (continuous deployment, ADR-017) |

## Current status

- **Phase:** Implementation and stabilisation (status at 2026-10-27). Design complete (`02-domain` to `06-data`, 21 ADRs). The six services and the gateway are built, tested and run together with Docker Compose (SQL Server, RabbitMQ, Mailpit and the services): **api-gateway (8080), security (3001), customer (3002), booking (3003), operations (3004), payment (3005, .NET 8) and notification (3006)**. payment-service covers QR accounts, payments with receipt, admin review, refunds, in-person payments, promotions redeemed as coupons and loyalty points, and publishes its events. Since 2026-10-26 the customer chooses the payment mode when booking (digital or cash): a digital booking without a reported payment is cancelled when its 30-minute deadline passes, and a customer can hold one active cash booking (ADR-021). notification-service delivers inbox, push and email, booking reminders, staff notices (including the alert for bookings without operator) and respects each user's notification switches. The web client and the Android app go through the gateway to all six services. Operator metrics, business data and the vehicle inspection report (web and mobile) are served by the backend. The system is deployed on an Azure VM since 2026-10-16 (`10-devops/production.md`). Every repository runs its tests on GitHub Actions on each change; on 2026-10-27, 1,337 tests were green on `main` (`10-devops/ci-cd.md`). Notifications are written in the language of each account (Spanish, English, French or Portuguese). 38 of the 41 functional requirements are done and 3 partial (`04-requirements/traceability-matrix.md`); the open findings with their severity are in `15-project-control/risks.md`
- **Current version:** on `main` of the 10 code repositories: api-gateway `v1.1.0`, security `v1.1.0`, customer `v1.1.1`, booking `v1.1.1`, operations `v1.1.0`, notification `v1.1.0`, payment `v1.1.2`, infra `v1.1.2`, web `v1.1.2` and the mobile app `v1.1.2` (an OTA update over the APK 1.1.1, versionCode 6). `main` is protected in all 10 (pull request, one approval, green CI)
- **Last release:** 2026-10-27 (booking, customer, payment, infra, web and the mobile app), approved by Brayan. The Azure server runs `main` and is updated by the continuous deployment on every merge (ADR-017); the automatic deploys of 2026-10-26 and 2026-10-27 succeeded
- **Next milestone:** the final exposition (~2026-10-27). Still open: restricting the Firebase API key (H-09), an uptime monitor (H-15), the sample legal contact data, the payment history screen in the web (RF-015) and the OpenAPI export (H-23)

## Project contacts

| Role | Name | Contact |
|------|------|---------|
| Project Lead | Brayan Estiven Patiño Cabrera | bspc1507@gmail.com |
| Frontend Lead | Juan Camilo Guilombo Osorio | cguilombo587@gmail.com |
| Backend Lead | Merari Urbano Quintero | merariurbano0322@gmail.com (GitHub: merari0322) |
