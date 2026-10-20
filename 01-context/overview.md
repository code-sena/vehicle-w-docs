# System Overview


---

## What is Express car wash?

Express car wash is a web and mobile platform for a single-location car
wash business. It lets customers book a slot from their phone,
and lets the business organize its operators' work and collect payments
from a single place.

## Problem it solves

**Before the system:** Customers had to call or drive to the shop
without knowing whether a slot was free. Inside, bookings were kept by
hand, slots overlapped, work was handed out at the manager's discretion,
and cash payments left no record of the customer.

**With the system:** Customers see real availability and book in minutes
with no wasted trips, either choosing their own operator or letting the
system assign one. The customer pays by scanning the shop's own QR code
and uploading proof of payment, which the Administrator verifies against
the amount due, and every service keeps a history and a rating.

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
| Infrastructure | Docker + GitHub Actions | Docker ensures the backend, the database and the services run identically on every team member's machine and on the server, removing the "it works on my machine" problem. GitHub Actions builds and tests every repository on each change, preventing code that breaks the application from being merged, and updates the Azure server with one button (Jenkins was the first plan; GitHub Actions needs no server of its own) |

## Current status

- **Phase:** Implementation (status at 2026-10-20). Design complete (`02-domain` to `06-data`, 15 ADRs). The six services and the gateway are built, tested and run together with Docker Compose (SQL Server, RabbitMQ, Mailpit and the services): **api-gateway (8080), security (3001), customer (3002), booking (3003), operations (3004), payment (3005, .NET 8) and notification (3006)**. payment-service covers QR accounts, payments with receipt, admin review, refunds, in-person payments, promotions redeemed as coupons and loyalty points, and publishes its events. notification-service delivers inbox, push and email, booking reminders, staff notices (including the alert for bookings without operator) and respects each user's notification switches. The web client and the Android app go through the gateway to all six services. Operator metrics, business data and the vehicle inspection report (web and mobile) are served by the backend. The system is deployed on an Azure VM since 2026-10-16 (`10-devops/production.md`). Since 2026-10-19 every repository runs its tests on GitHub Actions on each change (`10-devops/ci-cd.md`). Notifications are written in the language of each account (Spanish, English, French or Portuguese). Known gaps: consolidated reports for a chosen period (RF-023, partial) and rate limiting
- **Current version:** no release tags yet; the Android app is at version 1.1.0 (versionCode 5, published 2026-10-19)
- **Last release:** N/A (the Azure server runs the `develop` branch)
- **Next milestone:** consolidated reports in the backend, rate limiting in the gateway and the first release tag (`v1.0.0`) when `develop` is moved to `main`

## Project contacts

| Role | Name | Contact |
|------|------|---------|
| Project Lead | Brayan Estiven Patiño Cabrera | bspc1507@gmail.com |
| Frontend Lead | Juan Camilo Guilombo Osorio | cguilombo587@gmail.com |
| Backend Lead | Merari Urbano Quintero | merariurbano0322@gmail.com (GitHub: merari0322) |
