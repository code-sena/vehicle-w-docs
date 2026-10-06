# ADR-007 — Internal Service Architecture

| Field | Value |
|---|---|
| **ID** | ADR-007 |
| **Date** | 2026-09-24 |
| **Status** | Accepted |
| **Authors** | Development team |
| **Reviewers** | Development team |

## Context

The backend uses Java 21 and Spring Boot. The domain documentation contains business rules that should remain testable without Spring or SQL Server.

## Decision

Use **hexagonal architecture (ports and adapters)** in each of the six backend services.

| Layer | Responsibility |
|---|---|
| Domain | Entities, value objects, invariants, domain services and domain events |
| Application | Use cases, orchestration and transaction boundaries |
| Infrastructure | REST, persistence, RabbitMQ, file storage and configuration |

The domain layer does not import Spring or JPA. Persistence entities are separate from domain objects. External systems are reached through ports.

## Consequences

The structure adds mapping and interface code, but keeps business rules testable and avoids coupling the domain model to infrastructure.

## Implementation note (2026-10-06)

The five Java services (security, customer, booking, operations, notification) follow this ADR.
`payment-service` is .NET 8 and uses the same idea in four projects (Domain, Application,
Infrastructure, Api), with three accepted differences: EF Core maps the domain classes directly,
there are no input-port interfaces, and one application service holds all use cases. See
**ADR-013**.

## Alternatives

| Alternative | Result |
|---|---|
| Traditional controller-service-repository layering | Not adopted; it would mix domain rules with framework code |
| Hexagonal only in core services | Not adopted; one structure is easier for the team to maintain |
| CQRS/Clean Architecture with separate read models | Not adopted; current requirements do not justify the extra complexity |

## References

- Implementation guide → `../hexagonal-architecture.md`
- Domain model → `02-domain/entities-and-rules.md`
