# ADR-009 — Revised Service Decomposition

| Field | Value |
|---|---|
| **ID** | ADR-009 |
| **Date** | 2026-09-22 |
| **Status** | Proposed |
| **Authors** | Development team |
| **Reviewers** | Development team |

## Context

The original architecture created a larger number of services by separating several closely related schemas. The current data model has consolidated those boundaries to reduce unnecessary service-to-service calls while keeping logical ownership clear.

The current SQL Server model contains 43 tables in nine schemas. The revised architecture groups related schemas into six services.

## Decision

The revised decomposition is:

| Service | Schemas | Main responsibility |
|---|---|---|
| `security-service` | `security`, `audit` | Identity, access, preferences and audit |
| `customer-service` | `customer` | Customers, vehicles and loyalty display copy |
| `booking-service` | `catalog`, `booking` | Catalog, prices, shop schedule and bookings |
| `operations-service` | `execution` | Operators, availability, assignment, execution and ratings |
| `payment-service` | `promotion`, `payment` | Promotions, payments, receipts and loyalty ledger |
| `notification-service` | `notification` | In-app notifications |

The API Gateway remains infrastructure and is not counted as a domain service.

## Ownership rules

- Every schema has exactly one owning service.
- A service may own more than one schema.
- Cross-service foreign keys are not used.
- Cross-service references are validated by the application.
- Foreign keys are allowed inside a service ownership boundary.

## Important boundary changes

- `establishment` belongs to `booking` because it is the shop represented by its hours, exceptions and service bays.
- `user_preference` belongs to `security` because it is part of the user's account context.
- The loyalty ledger belongs to `payment` because points are treated as a value that follows ledger rules.
- `customer.customer.loyalty_points` is a display copy, not the source of truth.
- Rating data is stored on `execution.service_execution` rather than in a separate rating table.

## Why

The revised grouping keeps related transactions and invariants inside one service, reduces unnecessary cross-service calls and matches the current `06-data` model. It also keeps the number of services manageable for a three-person academic team.

## Consequences

Positive consequences include clearer ownership and fewer service boundaries for tightly coupled operations. The shared physical database remains a deliberate academic trade-off and does not remove logical service ownership.

The team must update older architecture, API and microservice documents that still use the previous service list.

## Risks

- Some documents may continue to reference the old service names.
- The shared database reduces physical isolation.
- Cross-service consistency still needs application validation and event handling.

## References

- Current data model → `06-data/models.md`
- Domain map → `02-domain/domain-map.md`
- Requirements → `04-requirements/functional.md`
