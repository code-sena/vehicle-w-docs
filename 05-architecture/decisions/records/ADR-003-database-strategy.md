# ADR-003 — Database Strategy

| Field | Value |
|---|---|
| **ID** | ADR-003 |
| **Date** | 2026-09-24 |
| **Status** | Accepted |
| **Authors** | Development team |
| **Reviewers** | Development team |

## Context

The service architecture needs clear data ownership, but the academic project runs in a shared SQL Server environment. The requirements also need relational integrity inside a service, especially for bookings, prices, payments and loyalty records.

A strict physical database per service would increase the infrastructure and setup burden for this project. A single database without ownership boundaries would make service boundaries unclear.

## Decision

Use **one physical SQL Server database**, logically separated into nine schemas owned by six services:

| Service | Schemas |
|---|---|
| `security-service` | `security`, `audit` |
| `customer-service` | `customer` |
| `booking-service` | `catalog`, `booking` |
| `operations-service` | `execution` |
| `payment-service` | `promotion`, `payment` |
| `notification-service` | `notification` |

Every schema has exactly one owner. A service may own more than one schema.

## Foreign-key rule

Foreign keys are allowed inside the ownership boundary of a service. They are not allowed between schemas owned by different services. Cross-service references are indexed identifiers validated by the application.

For example, `booking.booking_service.service_price_id → catalog.service_price` is a real FK because both schemas belong to `booking-service`. A payment's `booking_id` is not an FK because `payment` belongs to `payment-service` and `booking` belongs to `booking-service`.

## Why

- Keeps the database relational and easy to run locally.
- Keeps ownership visible through schemas.
- Preserves strong relational constraints inside each service.
- Allows a future service to move its schemas to another physical database without redesigning the ownership model.

## Trade-offs

The project accepts weaker physical isolation and shared database resource contention. These are acceptable for the current academic scale.

## Consequences

- Transactions must stay inside one service ownership boundary.
- Cross-service consistency is handled by application validation and events.
- Data migrations must respect schema ownership.
- The model must not reintroduce cross-service foreign keys.

## References

- Current model → `06-data/models.md`
- Service decomposition → `ADR-009-service-decomposition-revised.md`
