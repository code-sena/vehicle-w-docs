# ADR-007 — Internal Architecture of the Services

| Field | Value |
|-------|-------|
| **ID** | ADR-007 |
| **Date** | 2026-09-09 |
| **Status** | Accepted |
| **Authors** | Juan Camilo |
| **Reviewers** | Brayan Patiño, Merari Urbano — Development team |

---

## Context

ADR-002 to ADR-006 decide how the services relate to each other. None of them says how
the code inside a service is organised, and the backend has not been written yet, so this
is the right moment: changing the internal structure once six services exist is a rewrite.

`02-domain/entities-and-rules.md` already models the domain with tactical DDD: the
`Booking` and `Assignment` aggregates, value objects such as `Money` and `TimeSlot`,
numbered invariants (INV-001 and following), and two domain services,
`AvailabilityChecker` and `OperatorAssigner`. That work only pays off if the code has a
place where a domain rule can live without a framework around it.

The scaffold already includes `_stacks/java-spring.md` with a hexagonal package structure
for Java and Spring Boot 3, and `05-architecture/hexagonal-architecture.md` explaining the
pattern, but with TypeScript examples and no connection to this project's domain.

**Known constraints:**

- Java 21 + Spring Boot, Maven or Gradle (`01-context/scope.md`).
- Three part-time developers, and the backend has not started.
- RNF-003 requires integration tests on the booking flow, the assignment and the payment
  record.
- RNF-006.4 requires frontend and backend to communicate only through the REST API.

---

## Decision

**We decided:** every backend service is organised with **hexagonal architecture (ports
and adapters)**, following the package structure already defined in
`_stacks/java-spring.md`.

| Layer | What goes in it | Depends on |
|-------|-----------------|------------|
| `domain` | Aggregates, entities, value objects, domain events, invariants, domain services (`AvailabilityChecker`, `OperatorAssigner`), and the ports | Nothing. Plain Java, no Spring, no JPA |
| `application` | Use cases that implement the input ports and orchestrate the domain | `domain` |
| `infrastructure` | REST controllers, JPA repositories, RabbitMQ publishers and consumers, receipt file storage, configuration | `domain` and `application` |

Rules that make it real:

- **The domain never imports Spring or JPA.** No `@Entity`, no `@Service`, no
  `@Autowired` inside `domain`.
- **Persistence entities are separate from domain entities**, with a mapper in the
  persistence adapter. The `booking` schema (ADR-003) is an implementation detail of the
  adapter, not of the domain.
- **Ports are interfaces owned by the domain.** `BookingRepository` and `EventPublisher`
  are declared in `domain/port/out` and implemented in `infrastructure`.
- **Publishing an event goes through a port.** The RabbitMQ adapter (ADR-004) implements
  it, so the domain never knows the broker exists.
- **The invariants from `02-domain/entities-and-rules.md` live inside the aggregate**, not
  in the controller and not in the use case.
- **The depth of the domain layer varies by service.** `booking-service` and
  `operations-service` have real rules to protect; `notification-service` and
  `admin-service` are closer to CRUD and their domain layer will be thin. That is
  expected — the structure is the same, the amount of logic is not, and we do not invent
  abstractions to fill it.

**Justification:**

- **It gives the domain model from 02 somewhere to live.** Without this, the invariants
  end up scattered across controllers and Spring services, which is exactly what the whole
  domain document was written to avoid.
- **It makes RNF-003 testable.** A rule such as "a rating requires the booking to be
  COMPLETED" can be tested with plain JUnit, no Spring context and no database. Only the
  concurrency scenarios need the real database.
- **The structure is already written for our stack.** `_stacks/java-spring.md` has the
  package layout, the port examples and the test examples for Java 21 and Spring Boot 3,
  so we adopt it instead of inventing our own.
- **Nothing has been coded yet**, so the cost of adopting it is zero today and high later.

---

## Evaluated alternatives

| Alternative | Pros | Cons | Reason for discarding |
|-------------|------|------|-----------------------|
| **A — Hexagonal in every service (chosen)** | The domain from 02 has a home; business rules testable without Spring; one single structure across the six services | More classes and mappers than a direct approach; the team has to learn it while building | — (chosen) |
| **B — Classic Spring layering** (controller → service → repository) | Familiar, less code, faster to start | Business rules end up mixed with framework code; JPA entities become the domain model; the tactical DDD work in 02 would be documentation nobody follows | Loses the value of the domain model already delivered |
| **C — Hexagonal only in the two Core services** | Effort where the complexity actually is | Two different structures to learn and review; a service that starts as CRUD tends to grow rules later | The inconsistency costs more than the classes it saves |
| **D — Clean Architecture with CQRS and separate read models** | Reads and writes optimised independently | Read and write models are almost identical here; the pattern guide itself says not to use CQRS in that case | Complexity with no problem to solve |

---

## Consequences

**Positive:**

- Domain rules are unit-testable without Spring or a database, which makes the RNF-003
  test suite feasible for a small team.
- Changing SQL Server, RabbitMQ or the REST layer touches adapters, not business rules.
- The vocabulary in the code matches `02-domain`: `Booking`, `Assignment`, `TimeSlot`,
  `OperatorAssigner`.

**Negative / Trade-offs:**

- More classes: a domain entity, a persistence entity, a DTO and a mapper where a
  layered approach would have one class.
- A learning curve while the team is also learning Spring Boot, right when the delivery
  date matters.
- In thin services the structure will feel like overhead. It is accepted for consistency.

**Impact on the system:**

- Affected services: the six domain services. The gateway is not affected — it has no
  domain (ADR-005).
- Documents that must be updated: `05-architecture/hexagonal-architecture.md`, which has
  to be rewritten with Java examples from our own domain instead of the generic
  TypeScript ones.

---

## Pending decisions

- Maven or Gradle, and whether the six services live in one repository or several. That
  belongs to `10-devops`.
- Whether shared value objects such as `Money` are duplicated per service or extracted
  into a shared library. Duplication is the safer default in microservices; this is
  revisited if it becomes painful.

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Under deadline pressure, JPA annotations end up in the domain and the separation is lost | High | Medium | Reviewed in the Pull Request (RNF-006.1); the rule is one line: no Spring or JPA imports under `domain` |
| The team spends more time on mappers than on features | Medium | Medium | Thin services keep a thin domain layer; no abstractions are created without a rule to protect |
| The structure is documented but the code ends up layered anyway | Medium | High | `hexagonal-architecture.md` is rewritten with our own examples before the first service is built |

---

## References

- Package structure, ports and tests for Java and Spring → `_stacks/java-spring.md`
- Pattern explanation → `05-architecture/hexagonal-architecture.md`
- Aggregates, value objects, invariants and domain services →
  `02-domain/entities-and-rules.md`
- Concurrency and integrity tests → `04-requirements/non-functional.md` (RNF-003)
- Service list → ADR-002
- Persistence per domain schema → ADR-003
- Event publishing → ADR-004