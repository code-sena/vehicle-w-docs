# ADR-002 — Architectural Style and Service Decomposition

| Field | Value |
|-------|-------|
| **ID** | ADR-002 |
| **Date** | 2026-09-10 |
| **Status** | Accepted |
| **Authors** | Juan Camilo Guilombo — [role] |
| **Reviewers** | Brayan Patiño, Merari Urbano, Juan Camilo Guilombo — Development team |

---

## Context

`02-domain/domain-map.md` identifies the Bounded Contexts but deliberately leaves the
service boundaries open: a Bounded Context is a domain boundary, not a deployment
decision. That decision belongs here.

The data model in `06-data` was built by the whole team and it already answers this
question. It defines ten schemas in a single SQL Server database, states that each schema
is an independent service, and enforces it: **there is not a single foreign key that
crosses from one schema to another**. The eighteen columns that reference another schema
carry an index and a comment, and the application has to validate them.

Two more facts come from that model and were not visible when the architecture was first
drafted:

- `security` and `audit` are a **shared core supplied by the instructor**, identical
  across the ten projects of the ficha. Their structure is not ours to redesign.
- The system has **one establishment with wash bays**, not several branches, and payment
  is verified in-house instead of through an external gateway (ADR-008).

An earlier draft of this ADR proposed grouping the contexts into six services. It was
replaced by this one before delivery, because it contradicted a data model the team had
already agreed on.

**Known constraints:**

- Three part-time developers working alongside their academic workload.
- Only a local Docker environment. No staging, no production, no cloud.
- One SQL Server database, split by schema (ADR-003).
- An academic delivery date.

---

## Decision

**We decided:** the backend is built as microservices, **one service per schema**, behind
a single API Gateway. Ten domain services plus the gateway.

| Service | Schema | Tables | Responsibility |
|---------|--------|--------|----------------|
| `security-service` | `security` | 8 | People, accounts, roles, permissions, sessions, password reset |
| `audit-service` | `audit` | 1 | Change log written by database triggers; exposes queries over it |
| `settings-service` | `settings` | 2 | Establishment data and per-user preferences (theme, language) |
| `customer-service` | `customer` | 5 | Customers, their vehicles, vehicle types and loyalty points |
| `catalog-service` | `catalog` | 3 | Wash services, categories and prices per vehicle type |
| `reserva-service` | `reserva` | 7 | Business hours, bays, bookings and the services in each booking |
| `execution-service` | `execution` | 5 | Operators, availability, absences, service execution and ratings |
| `promotion-service` | `promotion` | 5 | Promotions, eligibility and discounts applied to a booking |
| `payment-service` | `payment` | 5 | Payment accounts, payments and receipt verification (ADR-008) |
| `notification-service` | `notification` | 2 | Notification types and the notices sent to each user |
| `api-gateway` | — | — | Single entry point, routing, JWT verification (ADR-005) |

The schema names are the ones in `06-data`, including `reserva`. They are not translated:
they are the identifiers the DDL, the seed data and the triggers already use, and
renaming them in the documentation alone would create two vocabularies for the same thing.

### How this maps to the domain

| Bounded Context in `02-domain` | Service |
|--------------------------------|---------|
| Identity & Access | `security-service` |
| Vehicle Management | `customer-service` |
| Service Catalog | `catalog-service` |
| Booking | `reserva-service` |
| Operations & Assignment | `execution-service` |
| Feedback & Rating | `execution-service` — the rating belongs to the executed service line |
| Payment | `payment-service` |
| Notification | `notification-service` |
| Promotions & Loyalty | Split: promotions in `promotion-service`, loyalty points in `customer-service` |
| **Branch Management** | **Dropped from the domain.** The system has one establishment; capacity is handled with bays in `reserva` |
| *(not in 02)* | `audit-service`, `settings-service` |

**Justification:**

- **The schema boundary is already a real boundary.** With no cross-schema foreign keys,
  each schema can only be written by its owner. Putting two schemas inside one service
  would hide that boundary instead of respecting it.
- **`security` and `audit` come from the instructor's shared core**, so they are the
  clearest candidates to stand on their own: their structure does not change with our
  domain decisions.
- **The rating goes with the execution, not with the booking.** In the data model a rating
  is a column of `service_execution`, which is one line of service performed by one
  operator. A booking with a wash and a polish can be rated separately for each.
- **Loyalty points stay with the customer.** `loyalty_transaction` lives in the `customer`
  schema and the balance is a column of `customer`, so the service that owns the customer
  owns the balance.

---

## Evaluated alternatives

| Alternative | Pros | Cons | Reason for discarding |
|-------------|------|------|-----------------------|
| **A — One service per schema, ten services (chosen)** | Matches the data model the team agreed on; the boundary is enforced by the database; each service is small and understandable | Eleven applications to build, containerise and keep running, with three part-time developers | — (chosen) |
| **B — Group the small schemas into six services** | Fewer deployables, less configuration, faster to finish | The grouping would be ours alone and would contradict `06-data`, which states one service per schema; it also hides boundaries the database already enforces | Contradicts documentation the whole team agreed on |
| **C — Modular monolith with the ten schemas inside** | Simplest to build; a single ACID transaction across schemas | The project is stated as a microservices system in `01-context`, and RabbitMQ would lose most of its purpose | Discarded for consistency with the scope, not because it is technically wrong at this size |
| **D — One service per aggregate** | Maximum granularity | Twenty-plus services for a team of three | Not realistic |

---

## Consequences

**Positive:**

- Architecture and data model say the same thing, so `05` and `06` can be read together
  without translating names.
- Each service owns exactly one schema, which makes the ownership rule in ADR-003 trivial
  to check: a service that touches a schema that is not its own is wrong, full stop.
- The services are small. Each one can be explained in a review session in a couple of
  minutes.

**Negative / Trade-offs:**

- **Eleven applications for three part-time developers.** This is the real cost of the
  decision and the main risk of the project, not a detail.
- `audit-service` and `settings-service` are very thin: one is a table written by triggers,
  the other is two configuration tables. They exist because they are separate schemas, not
  because they hold much logic.
- The eighteen cross-schema references have to be validated by the application, which
  means calls between services where a foreign key used to be enough.

**Impact on the system:**

- Documents that must be updated:
  - `02-domain/` — already corrected: branches and zones were dropped, and payment is
    described as an administrator approving a reviewed receipt.
  - `04-requirements/functional.md` and the traceability matrix — RF-021 and RF-023 refer
    to branches; the Module column has to point to these ten services.
  - `01-context/scope.md` — branches are no longer part of the system.
  - `09-microservices/` — the scaffold still describes other services.

---

## Pending decisions

- Whether `audit-service` needs to be a running application at all. The `audit_log` table
  is written by database triggers, so a service is only needed to expose queries over it.
  This is confirmed when the reports for RF-023 are designed.
- Build order. Not every service can be ready for the delivery date, so the team has to
  agree which ones are required for the demo.

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Eleven applications are too many for the team and the MVP is not finished | High | High | Build in order of dependency: `security`, `customer`, `catalog`, `reserva`, `execution`. `promotion`, `notification`, `settings` and `audit` come after |
| The delivery date forces a merge of services late in the project | Medium | Medium | `audit` and `settings` are the first candidates to be absorbed by another service, because they are the thinnest |
| A cross-schema reference is written without validating it and the data ends up inconsistent | High | High | The eighteen references are listed in `06-data`; each one is validated against its owning service before writing (ADR-004) |

---

## References

- Schemas, tables and cross-service references → `06-data/MODELO-DE-DATOS.md`, section 16
- Bounded Contexts → `02-domain/domain-map.md`
- Functional requirements → `04-requirements/functional.md`
- Related to: ADR-003 (database strategy), ADR-004 (communication), ADR-005 (gateway),
  ADR-008 (payment verification)