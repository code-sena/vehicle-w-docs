# Hexagonal Architecture (Ports and Adapters)

> How the code inside each of our services is organised. The decision to use this
> architecture is in [ADR-007](decisions/records/ADR-007-internal-service-architecture.md);
> this document explains how we apply it, with examples from our own domain. The package
> structure comes from `_stacks/java-spring.md`.

**Last updated:** 2026-09-10
**Applies to:** the ten backend services. The gateway has no domain, so it does not follow
this structure.

---

## 1. Why we use it

Our rules do not live in the database. `06-data` protects a lot — foreign keys inside a
schema, `CHECK` constraints, overlap triggers, filtered indexes — but there is a whole set
of rules it explicitly cannot enforce, listed in section 16 of that document:

- A service can only be rated once its execution is finished.
- The assigned operator has to be available and without a registered absence.
- A booking cannot fall outside the establishment's business hours.
- The points discount has to match the redeemed loyalty movements.
- The eighteen references that cross schemas have to be valid before writing.

Those rules have to live somewhere in the code. If we organise a service the usual Spring
way — controller, service, repository — they end up mixed with HTTP handling and JPA
annotations, and the JPA entity slowly becomes the domain model.

Hexagonal architecture gives us a place where a rule is just a rule: plain Java, no
framework around it. Everything else — REST, SQL Server, RabbitMQ, the uploaded receipt —
plugs into it from the outside.

---

## 2. The idea in one picture

```
                    ┌─────────────────────────────┐
   REST controller  │                             │  JPA repository
   ───────────────▶ │          DOMAIN             │ ◀───────────────
   (primary         │   Reserva, ServiceBay,      │   (secondary
    adapter)        │   rules and invariants      │    adapter)
                    │                             │
   RabbitMQ         │   knows nothing about       │  RabbitMQ publisher
   consumer         │   Spring, JPA or HTTP       │  REST clients to other services
   ───────────────▶ │                             │ ◀───────────────
                    └─────────────────────────────┘
                       ▲                      ▲
                  input ports            output ports
                  (what can be           (what the domain
                   done to it)            needs from outside)
```

Everything points **inwards**. The domain never points out.

---

## 3. Package structure

This is `reserva-service`; the other nine follow the same shape, each one named after its
schema.

```
src/main/java/com/expresscarwash/reserva/
├── domain/                          ← plain Java, no Spring, no JPA
│   ├── model/
│   │   ├── Reserva.java             ← aggregate root, holds the rules
│   │   ├── ReservaStatus.java       ← AGENDADA, CONFIRMADA, EN_EJECUCION, FINALIZADA, CANCELADA, NO_ASISTIO
│   │   ├── ReservaService.java      ← a service line inside a booking
│   │   ├── TimeSlot.java            ← value object
│   │   └── Money.java               ← value object
│   ├── event/
│   │   ├── ReservaConfirmed.java
│   │   └── ReservaCancelled.java
│   ├── service/
│   │   └── ScheduleChecker.java     ← business hours, exceptions and bay availability
│   └── port/
│       ├── in/
│       │   ├── CreateReservaUseCase.java
│       │   └── CancelReservaUseCase.java
│       └── out/
│           ├── ReservaRepository.java
│           ├── CustomerVehiclePort.java   ← what customer-service must confirm
│           ├── ServicePricePort.java      ← what catalog-service must confirm
│           ├── OperatorAvailabilityPort.java
│           └── EventPublisher.java
│
├── application/                     ← orchestrates; uses Spring only for injection
│   ├── CreateReservaService.java
│   └── CancelReservaService.java
│
└── infrastructure/
    ├── rest/
    │   ├── ReservaController.java
    │   └── dto/
    ├── persistence/
    │   ├── ReservaEntity.java       ← @Entity, maps to the reserva schema
    │   ├── ReservaJpaRepository.java
    │   ├── ReservaRepositoryAdapter.java
    │   └── ReservaMapper.java
    ├── messaging/
    │   ├── RabbitEventPublisher.java
    │   └── ExecutionEventListener.java
    ├── client/
    │   ├── CustomerHttpClient.java  ← calls customer-service (ADR-004)
    │   ├── CatalogHttpClient.java
    │   └── ExecutionHttpClient.java
    └── config/
```

---

## 4. The ports

A port is an interface that belongs to the domain. It says *what* is needed, never *how*.

### Input port — what can be done to the domain

```java
package com.expresscarwash.reserva.domain.port.in;

public interface CreateReservaUseCase {
    ReservaId create(CreateReservaCommand command);
}
```

### Output ports — what the domain needs from the outside

```java
package com.expresscarwash.reserva.domain.port.out;

public interface ReservaRepository {
    Optional<Reserva> findById(ReservaId id);
    boolean bayIsTaken(ServiceBayId bay, TimeSlot slot);
    void save(Reserva reserva);
}

public interface CustomerVehiclePort {
    boolean vehicleBelongsToCustomer(CustomerVehicleId vehicle, CustomerId customer);
}

public interface ServicePricePort {
    Money currentPriceOf(ServicePriceId priceId);
}

public interface EventPublisher {
    void publish(DomainEvent event);
}
```

`CustomerVehiclePort` and `ServicePricePort` are the interesting ones. They exist because
`06-data` removed the foreign keys that used to guarantee those references: the domain
knows it needs the answer, and the adapter is the one that knows the answer arrives over
REST from another service (ADR-004).

---

## 5. The adapters

### Primary adapter — REST controller

Its whole job is translating HTTP into a call to a use case, and the result back into HTTP.
No business rules here.

```java
@RestController
@RequestMapping("/api/reservas")
public class ReservaController {

    private final CreateReservaUseCase createReserva;

    @PostMapping
    @PreAuthorize("hasRole('CLIENTE')")
    public ResponseEntity<ReservaResponse> create(@Valid @RequestBody CreateReservaRequest request,
                                                  @AuthenticationPrincipal AppUser user) {
        ReservaId id = createReserva.create(request.toCommand(user.id()));
        return ResponseEntity.status(HttpStatus.CREATED).body(ReservaResponse.of(id));
    }
}
```

`@Valid` checks that the request is well formed. Whether the booking is *allowed* is a
different question, answered inside the domain (`cross-cutting.md`, section 5).

### Secondary adapter — persistence

The domain model and the JPA entity are two different classes, with a mapper in between.
The `reserva` schema is a detail of this adapter (ADR-003).

```java
@Repository
public class ReservaRepositoryAdapter implements ReservaRepository {

    private final ReservaJpaRepository jpa;
    private final ReservaMapper mapper;

    @Override
    public void save(Reserva reserva) {
        jpa.save(mapper.toEntity(reserva));
    }

    @Override
    public Optional<Reserva> findById(ReservaId id) {
        return jpa.findById(id.value()).map(mapper::toDomain);
    }
}
```

The audit columns (`created_by`, `updated_by`, `row_version`) are filled here, not in the
domain: they are a persistence concern, and `row_version` is what makes the optimistic
locking of `cross-cutting.md` work.

### Secondary adapter — another service

```java
@Component
public class CustomerHttpClient implements CustomerVehiclePort {

    private final RestClient rest;

    @Override
    public boolean vehicleBelongsToCustomer(CustomerVehicleId vehicle, CustomerId customer) {
        return rest.get()
                   .uri("/api/customers/{c}/vehicles/{v}", customer.value(), vehicle.value())
                   .retrieve()
                   .toEntity(VehicleResponse.class)
                   .getStatusCode().is2xxSuccessful();
    }
}
```

The domain asks whether the vehicle belongs to the customer. It does not know that
`customer-service` exists, or that the answer travels over HTTP.

### Secondary adapter — event publishing

```java
@Component
public class RabbitEventPublisher implements EventPublisher {

    private final RabbitTemplate rabbit;

    @Override
    public void publish(DomainEvent event) {
        rabbit.convertAndSend("carwash.events", event.routingKey(), Envelope.of(event));
    }
}
```

---

## 6. The use case

The use case orchestrates: it validates references, calls the domain, saves and publishes.
It does not decide business rules — it asks the domain to decide.

```java
@Service
public class CreateReservaService implements CreateReservaUseCase {

    private final ReservaRepository reservas;
    private final CustomerVehiclePort vehicles;
    private final ServicePricePort prices;
    private final ScheduleChecker schedule;
    private final EventPublisher events;

    @Override
    public ReservaId create(CreateReservaCommand command) {

        // 1. Cross-schema references, validated BEFORE opening the transaction (ADR-004)
        if (!vehicles.vehicleBelongsToCustomer(command.vehicle(), command.customer())) {
            throw new DomainException("The vehicle does not belong to this customer");
        }
        Money price = prices.currentPriceOf(command.servicePrice());

        return persist(command, price);
    }

    @Transactional
    private ReservaId persist(CreateReservaCommand command, Money price) {
        schedule.ensureWithinBusinessHours(command.slot());
        schedule.ensureBayIsFree(command.bay(), command.slot());

        Reserva reserva = Reserva.create(command.vehicle(), command.slot(), price, command.bookedBy());

        reservas.save(reserva);
        events.publish(new ReservaConfirmed(reserva));   // published after the commit
        return reserva.id();
    }
}
```

Two rules from `cross-cutting.md` are visible here: the remote validations happen **before**
the transaction opens, and the event leaves **after** the commit.

---

## 7. The dependency rule

```
infrastructure ──▶ application ──▶ domain
                                     │
                          domain depends on nothing
```

In practice it is one line, and it is what we check in every Pull Request:

> **No file under `domain/` may import Spring or JPA.**

If an `@Entity`, an `@Autowired` or a `RabbitTemplate` shows up in there, the separation is
gone and the domain stops being testable on its own.

---

## 8. What this buys us in testing

A domain rule is tested with plain JUnit — no Spring context, no database, no Docker:

```java
@Test
void aFinishedReservaCannotBeCancelled() {
    Reserva reserva = aReserva().withStatus(FINALIZADA).build();

    assertThrows(DomainException.class, reserva::cancel);
}
```

That test runs in milliseconds. Only the scenarios that really need infrastructure — two
customers taking the same bay at the same time, where the overlap trigger does the work —
need the real database.

---

## 9. How strict we are, service by service

Not every service has the same amount of logic, and we are not going to pretend otherwise:

| Service | Domain layer |
|---------|--------------|
| `reserva-service`, `execution-service` | Real rules to protect: schedules, bays, availability, execution. Full structure |
| `payment-service`, `promotion-service`, `security-service` | Fewer rules, but they matter: receipt verification, eligibility, lockout. Full structure |
| `customer-service`, `catalog-service`, `notification-service` | Some rules — loyalty balance, price validity, read state. Thin domain layer |
| `settings-service`, `audit-service` | Close to CRUD and queries. Same structure, almost empty domain layer |

The structure is the same everywhere so that moving between services is easy, but we do not
invent abstractions to fill a domain layer that has nothing to protect (ADR-007).

---

## 10. Checklist before opening a Pull Request

- [ ] Nothing under `domain/` imports Spring or JPA.
- [ ] The business rule is inside the aggregate, not in the controller or the use case.
- [ ] The controller only translates HTTP and delegates.
- [ ] The JPA entity is not the domain model; there is a mapper.
- [ ] Ports are declared in `domain/port`, implemented in `infrastructure`.
- [ ] A cross-schema reference is validated before the transaction opens.
- [ ] The use case writes only its own schema.
- [ ] The event is published after the commit.
- [ ] The domain rule has a test that runs without Spring.
- [ ] Queries exclude logically deleted rows (`deleted_at`).

---

## 11. Mistakes we want to avoid

| Mistake | Why it hurts |
|---------|--------------|
| Annotating the domain entity with `@Entity` to save a mapper | The database ends up shaping the domain, and changing a column changes a business rule |
| Putting the rule in the controller because it is quicker | The rule cannot be tested without HTTP, and it gets duplicated the day a RabbitMQ consumer needs it |
| Injecting `RestClient` or `RabbitTemplate` into a domain class | The domain stops being plain Java and its tests need infrastructure |
| Creating an interface for every class "because hexagonal" | Ports exist for what crosses the boundary, not for every collaboration inside the domain |
| Reading another schema directly to avoid a REST call | It breaks the ownership rule in ADR-003, and the database user will reject it anyway |
| Forgetting `deleted_at` in a query | Deleted rows come back to life in a screen or a report |

---

## References and correlations

- Decision to use this architecture → [ADR-007](decisions/records/ADR-007-internal-service-architecture.md)
- Package structure, dependencies and test examples for Java 21 → `_stacks/java-spring.md`
- Rules the database cannot enforce → `06-data/MODELO-DE-DATOS.md`, section 16
- What the database does enforce → `06-data/MODELO-DE-DATOS.md`, section 15
- Transactions, logging and error rules → `05-architecture/cross-cutting.md`
- Schemas and data ownership → [ADR-003](decisions/records/ADR-003-database-strategy.md)
- Validations and events between services → [ADR-004](decisions/records/ADR-004-service-communication.md)
- General pattern catalog → `05-architecture/pattern-guide.md`