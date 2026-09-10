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
| Rating | Score and comment the customer submits once the service is completed | |
| Promotion | Discount applicable to a booking under conditions defined by the administrator | |
| Customer | Person who registers one or more vehicles and books time slots | Distinct from "user", which covers all three roles |
| Administrator | Role that manages operators, schedules and services | Single role |

---

## Domains (schemas)

> One domain per data schema, as modelled in `06-data/models.md` / `MODELO-DE-DATOS.md`.
> Each schema is an independent microservice: no foreign key crosses a schema boundary.

| # | Domain | What it answers |
|---|--------|------------------|
| 1 | Security | Who is the person, and what are they allowed to do? (people, credentials, roles, permissions, sessions) |
| 2 | Audit | What changed, when, and who changed it? |
| 3 | Settings | What's the business called, and what does each user prefer? (shop info, user preferences) |
| 4 | Customer | Who is the customer, what vehicles do they have, and how many loyalty points? |
| 5 | Catalog | What services are offered, and at what price per vehicle type? |
| 6 | Booking  | When is the shop attended, and what slots are booked? |
| 7 | Execution | Who washes the vehicle, and how is the job going? |
| 8 | Promotion | What discounts exist, and who do they apply to? |
| 9 | Payment | How is a booking charged, and how is the payment verified? (QR, receipt, review) |
| 10 | Notification | What gets communicated to the user, and about what? |

**Security** and **Audit** are the shared core, common across every service in the project
family — they aren't specific to this car wash domain.

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