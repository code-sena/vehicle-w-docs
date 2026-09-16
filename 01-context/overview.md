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
|  Administrator | Business owner or manager; no technical background required | Manages operators and schedules; defines services and promotions; reviews and approves payments; oversees overall operation and generates operational reports |   
| Operator | Employee who performs the wash; no technical background required | Records their working availability, views assigned services, updates service status, and receives customer ratings |
| Customer | Vehicle owner; no technical background required | Registers their vehicle, books time slots (time and service type), picks an operator from those available or lets the system assign one, pays by scanning the shop's QR code and uploading a receipt, applies promotions and rates the service |

## Technology stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Frontend | Angular (web) + React Native (Android) | Angular enforces a modular structure and static typing, which keeps the logic manageable across three roles with different permissions. React Native shares its language and component model with the web client, so both clients consume the same API and the team works within a single paradigm |
| Backend | Java 21 + Spring Boot | Booking requires strict transactional control: two customers must never end up with the same time slot and operator. Spring Boot provides transaction management, security and data access out of the box, while Java 21 adds strong typing and virtual threads to handle concurrent bookings without blocking threads |
| Database | SQL Server | The domain is strongly relational (customer → vehicle → booking → operator → payment) and requires referential integrity and ACID transactions on payment: a booking ending up with two approved payments, or a payment receipt being reused across bookings, is not acceptable. A document store would push that consistency into application code |
| Message broker | RabbitMQ | Actions such as notifying an operator of an assigned booking, sending the customer's booking confirmation or notifying them once the Administrator reviews their payment receipt should not delay the booking response. Queueing them lets the booking confirm immediately, and a delivery failure won't bring the operation down |
| Infrastructure | Docker + Jenkins | Docker ensures the backend, the database and the services run identically on every team member's machine and on the server, removing the "it works on my machine" problem. Jenkins automates builds and tests on every change, preventing code that breaks the application from being merged |

## Current status

- **Phase:** Design complete, implementation not started. Domain (`02-domain`), product definition (`03-product`), requirements (`04-requirements`), architecture (`05-architecture`, 8 ADRs) and the data model (`06-data`, `MODELO-DE-DATOS.md`) are all written and cross-checked against each other
- **Current version:** N/A — the project does not use release versioning yet; no code has been written
- **Last release:** N/A
- **Next milestone:** `security-service` first, following the build order in ADR-002 (`security` → `customer` → `catalog` → `reserva` → `execution`, then the rest) — working login and role-based access with JWT (RF-001 to RF-004b), which every other service depends on

## Project contacts

| Role | Name | Contact |
|------|------|---------|
| Project Lead | Brayan Estiven Patiño Cabrera | bspc1507@gmail.com |
| Frontend Lead | Juan Camilo Guilombo | cguilombo587@gmail.com |
| Backend Lead | Merari Urbano | GitHub: merari0322 |
