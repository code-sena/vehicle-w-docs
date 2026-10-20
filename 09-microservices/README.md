# 09 — Microservices

> One folder per service with what a developer needs to work on it: responsibility, data, events,
> local decisions and how to operate it. Updated in the same PR as the service's code.

---

## Contents

| Path | What it answers |
|------|-----------------|
| [`service-catalog.md`](./service-catalog.md) ⭐ | Every service: port, repository, status, communication matrix, data ownership, how to add one |
| [`services/01-api-gateway/`](./services/01-api-gateway/) | Entry point, routes, CORS |
| [`services/02-security-service/`](./services/02-security-service/) | Accounts, roles, JWT, recovery, preferences, internal contact API |
| [`services/03-customer-service/`](./services/03-customer-service/) | Client profiles and vehicles |
| [`services/04-booking-service/`](./services/04-booking-service/) | Catalog, prices, schedule, bays, availability, bookings |
| [`services/05-operations-service/`](./services/05-operations-service/) | Operators, shifts, absences, assignment, execution, ratings, inspection report |
| [`services/06-payment-service/`](./services/06-payment-service/) | Payment accounts, payments, receipts, refunds, promotions, loyalty points (.NET 8) |
| [`services/07-notification-service/`](./services/07-notification-service/) | Inbox, push, email, booking reminders, staff alerts |
| `_template/service/` | Starting point for a new service folder |

Numbers follow the service decomposition (ADR-009).

## Folder structure per service

```
services/NN-<service>/
├── README.md       responsibility, endpoints, configuration, how to run and test
├── data-model.md   schemas and tables it owns (detail in 06-data/models.md)
├── events.md       events published and consumed, synchronous calls
├── decisions.md    service-level decisions not covered by an ADR
└── runbook.md      health, known symptoms and fixes
```

## Cross-cutting rules (all services)

- One schema owner per service; no cross-service foreign keys; other services' data only through
  their API or their events (`06-data/models.md`).
- REST for answers needed now, RabbitMQ (`carwash.events`) for consequences after commit
  (ADR-004). No Kafka, no service discovery: addresses come from configuration (`.env`).
- Every service validates the JWT itself (ADR-006) and uses the hexagonal structure (ADR-007).
- Event catalog: `02-domain/domain-events.md` (meaning) and each `events.md` (routing keys,
  payloads).

## Correlations

| Fed by | Feeds |
|--------|-------|
| `05-architecture/overview.md` | The list of services |
| `06-data/models.md` | Each `data-model.md` |
| `07-api/contracts/openapi/` | Each README's endpoint summary |
| Each `runbook.md` | `13-operations/` |
