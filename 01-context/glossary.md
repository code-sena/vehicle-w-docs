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
| Booking | A reserved time slot at a branch for a wash service on a specific vehicle | In Spanish always *turno* |
| Branch | Physical location where the service is provided and where the customer brings their vehicle | |
| Wash service | A type of wash offered, with its own duration and price | |
| Operator | Branch employee who performs the wash; has their own working availability | |
| Availability | Time window in which an operator can take bookings at their branch | |
| Assignment | Linking an operator to a booking. It can be automatic, chosen by the customer, or set by the administrator | |
| Rating | Score and comment the customer submits once the service is completed | |
| Promotion | Discount applicable to a booking under conditions defined by the administrator | |
| Customer | Person who registers one or more vehicles and books time slots | Distinct from "user", which covers all three roles |
| Administrator | Role that manages branches, operators, schedules and services | Single role; there is no zone administrator |
---
## Technical terms of the project

| Term | Definition |
|------|-----------|
| Microservice | Independent service with a single responsibility and its own process. In this project the services share a single database, organised by domain |
| API Gateway | Single entry point that routes requests from the web and mobile clients to the corresponding services |
| JWT | Signed token that carries the user's identity and role, allowing the API to authenticate requests without keeping a session |
| Migration | Versioned change to the database schema, applied in a controlled and repeatable way |
| DTO | Object used to carry data between layers or services, without exposing the internal domain model |
| Idempotence | Property of an operation to produce the same result if executed multiple times. Relevant to payment confirmation |
| Sandbox | Payment provider's test environment, which simulates transactions without moving real money |

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
| PSE | Colombian bank transfer payment method |
| RF | Functional Requirement |
| RNF | Non-Functional Requirement |
| SLA | Service Level Agreement |
| SLO | Service Level Objective |
| SRS | Software Requirements Specification |