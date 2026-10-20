# ADR-013 — Payment Service: .NET Stack and Layered (Clean) Architecture

- **ID:** ADR-013
- **Date:** 2026-10-06 (updated 2026-10-13: sections 1 and 3 match the current code)
- **Status:** Proposed — in use: payment-service is built this way
- **Authors:** Development team

---

## Context

ADR-007 says the backend uses Java 21 and Spring Boot and that the six services follow hexagonal
architecture with persistence entities separated from domain objects. `payment-service` was built
in **C# / .NET 8** (ASP.NET Core, EF Core), so ADR-007 no longer describes every service.

The other services rely on a shared contract that payment must keep, whatever its stack:

- JWT HS256 signed by security-service, with the same secret, issuer and audience (ADR-006).
- Errors as RFC 9457 Problem Details with a stable `code` (the web translates `API_ERRORS.<code>`).
- `GET /actuator/health` for the health checks and scripts.
- Configuration from `lavarapido-infra/.env`, environment variables winning.
- Its own schemas (`payment`, `promotion`) in the shared `LavaRapido` database, migrated with
  Liquibase and its own changelog tables (ADR-003).

**Known constraints:**
- Spring's `spring.config.import` and Liquibase-on-startup are not available in .NET.
- The service is reached only through the gateway (`ROUTE_PAYMENT_URL`, port 3005).

---

## Decision

**We decided:** keep payment-service in .NET 8 as the only non-Java service, organised in four
projects with dependencies pointing to the domain (Clean / Onion architecture, the .NET form of
ports and adapters), and keep the shared contract above.

### 1. Projects and dependencies

```
PaymentService.Api ──► PaymentService.Application ──► PaymentService.Domain
        └─────────► PaymentService.Infrastructure ──► PaymentService.Application
```

| Project | Content | References |
|---|---|---|
| `Domain` | `Payment` aggregate (state machine `PENDING → IN_REVIEW → APPROVED / REJECTED`, `APPROVED → REFUNDED`) and `PaymentPolicy`, `PaymentAccount`, `PaymentReceipt`, `Promotion` aggregate with its discount strategies (`Discounts/`), `LoyaltyTransaction` ledger, domain events, `AggregateRoot` / `Entity` | Nothing (no NuGet package) |
| `Application` | **Input ports** (`IPaymentCommandUseCases`, `IPaymentQueryUseCases`, `IPaymentAccountUseCases`, `IPromotionAdminUseCases`, `ICustomerPromotionUseCases`, `ILoyaltyUseCases`) implemented by `PaymentCommandService`, `PaymentQueryService`, `PaymentAccountService`, `PromotionAdminService`, `CustomerPromotionService`, `LoyaltyService`; helpers `BookingPaymentGuard`, `AmountDueCalculator`, `LoyaltyRewardService`; **output ports** `IPaymentRepository`, `IPaymentAccountRepository`, `IPromotionRepository`, `IPromotionRedemptionRepository`, `ILoyaltyLedgerRepository`, `IBookingDirectory`, `IUnitOfWork`, `IIntegrationEventPublisher` | Domain |
| `Infrastructure` | **Output adapters**: EF Core repositories and `EfUnitOfWork` (SQL Server), `BookingServiceDirectory` (HTTP to booking-service), `RabbitMqIntegrationEventPublisher` (events after commit; `NullIntegrationEventPublisher` when messaging is off) | Application, EF Core, RabbitMQ client |
| `Api` | **Input adapter**: controllers, JWT bearer, CORS, `GlobalExceptionHandler`, `EnvFile`, Swagger | Application, Infrastructure (composition root) |

### 2. Shared contract, .NET implementation

| Contract | How payment does it |
|---|---|
| JWT (ADR-006) | `AddJwtBearer` with `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, HS256 only, roles from the `roles` claim. Does not start without `JWT_SECRET` |
| Errors | `GlobalExceptionHandler` → Problem Details with `code` (400, 404, 409, 503) |
| Health | `GET /actuator/health` → `{"status":"UP"}` (fixed, no database check) and `GET /health` |
| Configuration | `EnvFile.Load()` reads `lavarapido-infra/.env` without overriding real environment variables. Port `PAYMENT_PORT` (3005); database from `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` or `ConnectionStrings__PaymentDb` |
| Migrations (ADR-003) | Plain-SQL Liquibase changelogs in `db/`, applied by the `payment-migrate` container of `lavarapido-infra/docker-compose.yml` with `DATABASECHANGELOG_PAYMENT`. The service never migrates on startup |

### 3. Accepted differences with ADR-007

| ADR-007 (Java services) | payment-service | Why it is accepted |
|---|---|---|
| Persistence entities separate from domain objects | EF Core maps the domain classes directly (`IEntityTypeConfiguration`), with a private parameterless constructor for EF | Fluent configuration keeps attributes out of the domain; a second model would only add mapping code |
| One use case per class or per port | One service per area and side: commands and queries of payments are split (`PaymentCommandService` / `PaymentQueryService`), promotions are split into admin and customer services | Keeps each class small without one class per method; the input ports (`I...UseCases`) are the same idea as ADR-007's `...UseCase` interfaces |

---

## Evaluated alternatives

| Alternative | Pros | Cons | Reason for discarding |
|------------|------|------|-----------------------|
| .NET 8 with Clean architecture — chosen | The owner's stack; same contract for the rest of the system | Two stacks to build, run and test | — (chosen) |
| Rewrite payment in Spring Boot | One stack, Liquibase on startup, same structure as the others | Rework of a working service | The contract above already isolates the difference |
| .NET with a single project (controllers + EF) | Less code | Business rules mixed with EF and HTTP; harder to test | Breaks the testability goal of ADR-007 |

---

## Consequences

**Positive:**
- The domain (`Payment` states and rules) is tested without EF or ASP.NET (`PaymentTests`, xUnit).
- The web and the mobile app cannot tell payment from the Java services: same token, errors,
  health and gateway.

**Negative / Trade-offs:**
- Developers need the .NET 8 SDK besides the JDK; CI needs `dotnet test` besides `./mvnw verify`.
- Migrations need the `payment-migrate` container (or the Liquibase CLI); starting the service
  alone does not create its tables.
- `/actuator/health` does not check the database.
- No RabbitMQ publisher yet: the domain events (`PaymentApproved`, `PaymentRejected`,
  `PaymentRefunded`) are not sent (see `09-microservices/services/06-payment-service/events.md`).
- Only the domain has tests; Application, Infrastructure and Api have none.
- No container in `lavarapido-infra/docker-compose.yml` yet.

*Status checked against the code on 2026-10-20:* the three last points and the health point are
solved. payment-service publishes its events to `carwash.events` (`RabbitMqIntegrationEventPublisher`:
`payment.confirmed`, `payment.rejected`, `payment.refunded`, `payment.promotion_redeemed`,
`payment.loyalty_points_earned`), `/actuator/health` and `/health` check the database, there are
Application unit tests and Infrastructure integration tests, and the service runs in Docker Compose
(`payment-service`, after `payment-migrate`).

**Impact on the system:**
- Affected services: payment-service; api-gateway (route to `:3005`).
- Documents updated: ADR-007 (note), `09-microservices/service-catalog.md`,
  `09-microservices/services/06-payment-service/`, `10-devops/local-setup.md`,
  `10-devops/environments.md`, `05-architecture/hexagonal-architecture.md`.

---

## References

- ADR-003 (database strategy), ADR-006 (authentication), ADR-007 (internal service architecture),
  ADR-008 (payment verification)
- `09-microservices/services/06-payment-service/README.md` and `decisions.md`
- `lavarapido-payment-service/README.md` (how to open and run the solution)
