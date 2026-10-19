# Hexagonal Architecture

**Last updated:** 2026-10-06

The six backend services use the same internal architectural style: **hexagonal architecture (ports and adapters)**. Five of them are Java 21 and Spring Boot; `payment-service` is .NET 8 and applies the same idea in four projects (see section 13 and ADR-013).

The goal is simple: business rules should not depend on Spring, JPA, SQL Server or RabbitMQ.

## 1. Layers

```text
┌──────────────────────────────────────────────┐
│                 Infrastructure               │
│ REST controllers │ JPA │ RabbitMQ │ Storage │
└──────────────────────┬───────────────────────┘
                       │ adapters
                       ▼
┌──────────────────────────────────────────────┐
│                  Application                 │
│              use cases / orchestration       │
└──────────────────────┬───────────────────────┘
                       │ input/output ports
                       ▼
┌──────────────────────────────────────────────┐
│                    Domain                    │
│ entities │ value objects │ rules │ events    │
└──────────────────────────────────────────────┘
```

Dependencies point inward. The domain does not depend on infrastructure.

## 2. Package structure

Every built service (security, customer, booking, notification) follows this structure. Real
example, `booking-service` (`com.lavarapido.booking`):

```text
src/main/java/com/lavarapido/booking/
├── domain/
│   ├── model/          Booking, BookingLine, BookingStatus… (no Spring, no JPA)
│   ├── service/        AvailabilityPolicy (pure domain policy)
│   ├── event/          BookingEvent
│   ├── exception/      ConflictException, InvalidValueException… (carry the API `code`)
│   └── port/
│       ├── in/         use-case interfaces, commands and views
│       └── out/        repositories, directories, event publisher
├── application/
│   └── usecase/        BookingService, CatalogService (implement port.in)
└── infrastructure/
    ├── adapter/
    │   ├── in/web/             REST controllers + dto/
    │   ├── out/persistence/    JPA entities, Spring Data repositories, adapters
    │   ├── out/messaging/      RabbitMQ publisher
    │   └── out/customer/       REST client to customer-service
    └── config/                 security, clock, beans
```

Other services add adapters with the same rule: `in/messaging` (RabbitMQ listeners) in customer
and notification, `in/scheduling` (reminder job) in notification, `out/identity` (REST client to
security), `out/email` and `out/push` in notification. The dependency direction never changes.

## 3. Domain layer

The domain contains business concepts and rules with no framework annotations.

For the booking domain, examples include:

- `Booking`
- `BookingService`
- `TimeSlot`
- `Money`
- booking invariants

For operations, examples include:

- `Operator`
- `ServiceExecution`
- availability and assignment rules

A domain class must not import `org.springframework.*` or JPA annotations.

## 4. Application layer

The application layer implements use cases and coordinates ports. It may start a transaction and call domain methods, but it should not contain business rules that belong inside the domain model.

Example:

```java
public final class ConfirmBookingUseCase {
    private final BookingRepository bookingRepository;
    private final EventPublisher eventPublisher;

    public void execute(long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(BookingNotFound::new);

        booking.confirm();
        bookingRepository.save(booking);
        eventPublisher.publish(booking.confirmedEvent());
    }
}
```

This is illustrative structure, not an implemented project class.

## 5. Input ports

Input ports represent application use cases exposed to adapters.

```java
public interface CreateBookingUseCase {
    BookingResult execute(CreateBookingCommand command);
}
```

A REST controller calls the input port. A future non-HTTP adapter could use the same port without changing the domain.

## 6. Output ports

Output ports are interfaces required by the application/domain side:

```java
public interface BookingRepository {
    Optional<Booking> findById(long bookingId);
    void save(Booking booking);
}
```

The infrastructure adapter implements the port with Spring Data/JPA or another persistence mechanism.

## 7. Persistence adapters

The SQL Server model is an infrastructure concern. Persistence entities should not be treated automatically as domain entities.

A typical adapter is:

```text
JPA entity → mapper → domain object

Domain object → mapper → JPA entity
```

This keeps database column names, auditing fields and persistence annotations outside the domain model.

## 8. Messaging adapters

RabbitMQ is accessed through an output port such as:

```java
public interface EventPublisher {
    void publish(DomainEvent event);
}
```

The RabbitMQ adapter serializes the event and publishes it after the application transaction commits. The domain does not know RabbitMQ exists.

Consumers are infrastructure input adapters that translate messages into application commands.

## 9. REST adapters

Controllers should be thin:

```text
HTTP request
   ↓
Controller / input adapter
   ↓
Input port
   ↓
Use case
   ↓
Domain
   ↓
Output ports
   ↓
Adapters
```

Controllers should not implement booking availability, payment approval, assignment or rating rules directly.

## 10. Service-specific depth

The same structure is used across all six services, but the amount of domain logic differs.

| Service | Expected domain depth |
|---|---|
| `security-service` | Medium: authentication, roles, password rules and preferences |
| `customer-service` | Medium: customer/vehicle ownership rules |
| `booking-service` | High: slot conflicts, booking lifecycle, price freezing |
| `operations-service` | High: availability, assignment, execution and rating rules (`AssignmentPolicy`, `ServiceExecution`) |
| `payment-service` | High: payment review and refund (`Payment`), coupons (`Promotion` with discount strategies) and the loyalty ledger (`LoyaltyTransaction`) |
| `notification-service` | Thin: notification creation and read state |

## 11. Testing consequence

Domain rules can be tested with plain JUnit without starting Spring. Integration tests are still required for database constraints, transactions, messaging and concurrency scenarios.

The project should not create abstractions only to make the diagram look hexagonal. The pattern is useful when it protects a business rule or isolates an external dependency.

## 12. What is intentionally not included

The current architecture does not adopt CQRS, Event Sourcing or a shared domain library. These would require a concrete problem before being introduced.

## 13. payment-service (.NET 8)

`payment-service` keeps the dependency rule (everything points to the domain) with four projects
instead of Java packages (ADR-013):

```text
PaymentService.Api ──► PaymentService.Application ──► PaymentService.Domain
        └─────────► PaymentService.Infrastructure ──► PaymentService.Application
```

| Java services (sections 1–9) | payment-service |
|---|---|
| `domain` package (model, ports) | `PaymentService.Domain`: `Payment` aggregate and `PaymentPolicy`, `PaymentAccount`, `PaymentReceipt`, `Promotion` aggregate with discount strategies, `LoyaltyTransaction`, domain events. No NuGet package |
| `application` (use cases) + input ports `...UseCase` | `PaymentService.Application`: input ports `I...UseCases` (payments command/query, accounts, promotions admin/customer, loyalty) implemented by `PaymentCommandService`, `PaymentQueryService`, `PaymentAccountService`, `PromotionAdminService`, `CustomerPromotionService`, `LoyaltyService`; output ports for repositories, `IBookingDirectory`, `IUnitOfWork` and `IIntegrationEventPublisher` |
| `infrastructure/adapter/out` (JPA entities, REST clients, RabbitMQ) | `PaymentService.Infrastructure`: EF Core repositories that map the **domain classes directly** (`IEntityTypeConfiguration`), `EfUnitOfWork`, `BookingServiceDirectory` (HTTP), `RabbitMqIntegrationEventPublisher` (events published after commit) |
| `infrastructure/adapter/in/web` | `PaymentService.Api`: controllers, JWT, `GlobalExceptionHandler`, composition root |

Domain tests use xUnit (`tests/PaymentService.Domain.UnitTests`) without EF or ASP.NET.

## References

- Internal service decision → `decisions/records/ADR-007-internal-service-architecture.md`
- Domain rules → `02-domain/entities-and-rules.md`
- Java/Spring stack → `_stacks/java-spring.md`
- payment-service in .NET → `decisions/records/ADR-013-payment-service-dotnet-stack.md`