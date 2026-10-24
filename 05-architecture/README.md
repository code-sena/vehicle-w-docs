# 05 — Architecture

This section documents the main architectural decisions of Express car wash: how the system is divided, how services communicate, how the shared SQL Server database is organised, how services are deployed, and which cross-cutting rules apply to all backend services.

## What is here

| File | Purpose |
|---|---|
| `overview.md` | Current system architecture, services, schemas and communication |
| `deployment.md` | Local Docker deployment and environment boundaries |
| `cross-cutting.md` | Rules shared by the backend services |
| `pattern-guide.md` | Patterns actually used, proposed or explicitly not adopted |
| `hexagonal-architecture.md` | Internal structure of a Java/Spring Boot service |
| `security-threat-model.md` | STRIDE-based security risks and current mitigations |
| `decisions/` | Architecture Decision Records (ADRs) |

## Current architecture in one view

The backend uses six domain services plus one API Gateway:

| Service | Owned schemas | Main responsibility |
|---|---|---|
| `security-service` | `security`, `audit` | Identity, roles, sessions, preferences and audit data |
| `customer-service` | `customer` | Customers, vehicles and the display copy of loyalty points |
| `booking-service` | `catalog`, `booking` | Services, prices, shop hours, bays and bookings |
| `operations-service` | `execution` | Operators, availability, assignment, execution and ratings |
| `payment-service` | `promotion`, `payment` | Promotions, payments, receipts and loyalty ledger |
| `notification-service` | `notification` | In-app notifications, push, email and booking reminders |

Built and running today (local Docker Compose and the Azure server): api-gateway (8080), security (3001), customer (3002), booking (3003), operations (3004), payment (3005, .NET 8: payments, accounts, promotions, loyalty and its events) and notification (3006). Status table in `overview.md`.

All six services use the same physical SQL Server database in the current academic environment. Schemas provide logical ownership boundaries. A service may own more than one schema, but every schema has exactly one owning service.

## Architecture rules

- The system has one physical SQL Server database, logically separated into nine schemas.
- Cross-service foreign keys are not used. References to another service are indexed identifiers validated by the application.
- Foreign keys may exist between schemas owned by the same service.
- `booking-service` owns both `catalog` and `booking` because a booking freezes a price from the catalog.
- `payment-service` owns both `promotion` and `payment`; the loyalty ledger follows the same ownership as payment.
- Payment is manual QR/transfer verification. There is no payment gateway and no card data is collected.
- The API Gateway is infrastructure, not a domain microservice.
- REST is used for synchronous validation and RabbitMQ for asynchronous consequences.
- Authentication uses JWT issued by `security-service`; each service performs its own authorization and ownership checks.
- Services use hexagonal architecture (ports and adapters, ADR-007): `domain` (model, ports) → `application` (use cases) → `infrastructure` (web, persistence, messaging adapters). Five are Java 21 / Spring Boot; payment-service is .NET 8 with the same layers as projects (ADR-013).
- The JWT is validated by every service; the gateway routes, answers CORS and cuts tokens of closed sessions by asking security-service (ADR-005, ADR-006).
- Service-to-service calls without a user (notification → security, operations → booking and security during the automatic assignment and the follow-up job, the APK script → notification) use `X-Internal-Key` on `/internal/**` routes, which the gateway never exposes. Since 2026-10-23 operations also sends it, with the operator's token, on booking's `/api/v1/operator/bookings/**`, which the gateway no longer routes (E-01).
- The clients follow a feature-based MVVM structure (web zoneless with signals; mobile in layers, ADR-019). Deployment, CI/CD and mobile updates: ADR-016, ADR-017, ADR-018. Gaps accepted for version 1: ADR-020.

## Sources of truth

The architecture is checked against `01-context`, `03-product`, `04-requirements` and especially the current `06-data` model. ADRs record why important decisions were made. If an old ADR conflicts with a later accepted ADR, the later decision wins while the historical ADR is kept for traceability.

## Related sections

- `02-domain/` — domain concepts, entities, rules and events
- `04-requirements/` — functional and non-functional requirements
- `06-data/` — SQL Server schemas, tables, constraints and migrations
- `07-api/` — API contracts
- `09-microservices/` — service implementation documentation
- `10-devops/` — local environment, production server, and the GitHub Actions CI/CD
