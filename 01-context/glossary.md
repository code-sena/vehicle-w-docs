# Project Glossary

> **Instructions:** Define here all technical and business terms used in the project.
> This is the official dictionary — if there is ambiguity, this document wins.
> Add terms throughout the project, not only at the start.

---

## How to use this glossary

1. Before using a technical or business term in code, docs, or conversations: look it up here.
2. If it's not there: add it with its definition.
3. If there is disagreement about the definition: discuss it as a team and update this document.

---

## Domain terms

| Term | Definition | Notes |
|------|-----------|-------|
| Booking | A reserved time slot for a wash service on a specific vehicle | In Spanish always *turno* |
| Wash service | A type of wash offered, with its own duration and price | |
| Operator | Shop employee who performs the wash; has their own working availability | |
| Availability | Time window in which an operator can take bookings | |
| Assignment | Linking an operator to a booking. It can be automatic, chosen by the customer, or set by the administrator | |
| Rating | Optional score (1–5) and comment the customer submits for a service line once it is completed | At most one per line |
| Booking line | One service inside a booking (e.g. wash + polish = two lines); each line is executed by one operator | Table `booking.booking_service` |
| Wash bay | A physical washing position of the shop; two bookings can't hold the same bay at the same time | Table `booking.service_bay` |
| Loyalty ledger | The record of every loyalty-point movement; the source of truth for a customer's balance | `payment.loyalty_transaction` (ADR-009) |
| Promotion | Discount applicable to a booking under conditions defined by the administrator | |
| Customer | Person who registers one or more vehicles and books time slots | Distinct from "user", which covers all three roles |
| Administrator | Role that manages operators, schedules and services | Single role |

---

## Domains (schemas)

> One domain per data schema, as modelled in `06-data/models.md`. Every schema has exactly
> one owning service, and a service may own more than one (ADR-009). No foreign key crosses
> from one service's schemas into another's.

| # | Domain (schema) | What it answers | Owning service |
|---|-----------------|-----------------|----------------|
| 1 | Security | Who is the person, and what are they allowed to do? (people, credentials, roles, permissions, sessions, preferences) | `security-service` |
| 2 | Audit | What changed, when, and who changed it? | `security-service` (read-only; written by triggers) |
| 3 | Customer | Who is the customer, and what vehicles do they have? (plus a display copy of their loyalty points) | `customer-service` |
| 4 | Catalog | What services are offered, and at what price per vehicle type? | `booking-service` |
| 5 | Booking | When is the shop open, which bays exist, and what slots are booked? (includes the shop's own data) | `booking-service` |
| 6 | Execution | Who washes the vehicle, and how is the job going? | `operations-service` |
| 7 | Promotion | What discounts exist, and who do they apply to? | `payment-service` |
| 8 | Payment | How is a booking charged and verified (QR, receipt, review), and how many loyalty points does each customer have? | `payment-service` |
| 9 | Notification | What gets communicated to the user, and about what? | `notification-service` |

**Security** and **Audit** are the shared core, common across every service in the project
family — they aren't specific to this car wash domain. The former `Settings` schema no longer
exists: the shop's data moved to `booking` and user preferences to `security` (ADR-009).

---

## Technical terms of the project

| Term | Definition |
|------|-----------|
| Microservice | Independent service with a single responsibility and its own process. In this project the services share a single database, organised by domain |
| API Gateway | Single entry point that routes requests from the web and mobile clients to the corresponding services |
| JWT | Signed token that carries the user's identity and role, allowing the API to authenticate requests without keeping a session |
| Migration | Versioned change to the database schema, applied in a controlled and repeatable way |
| DTO | Object used to carry data between layers or services, without exposing the internal domain model |
| Idempotence | Property of an operation to produce the same result if executed multiple times. Relevant to payment review |

---

## Acronyms

| Acronym | Meaning |
|---------|---------|
| ADR | Architecture Decision Record |
| API | Application Programming Interface |
| CI/CD | Continuous Integration / Continuous Delivery |
| CRUD | Create, Read, Update, Delete |
| CU | Use Case |
| DoD | Definition of Done |
| DTO | Data Transfer Object |
| HU | User Story |
| i18n | Internationalisation |
| IAM | Identity and Access Management |
| JWT | JSON Web Token |
| MVP | Minimum Viable Product |
| PR | Pull Request |
| RF | Functional Requirement |
| RNF | Non-Functional Requirement |
| SLA | Service Level Agreement |
| SLO | Service Level Objective |
| SRS | Software Requirements Specification |