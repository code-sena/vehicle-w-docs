# Testing Strategy

> How LavaRápido is tested today, what each kind of test protects, how to run them, and the gaps.
> Backend: JUnit 5 + Mockito + Spring Boot Test (`./mvnw test`); payment-service: xUnit (`dotnet test`). Web: Vitest through
> `@angular/build:unit-test` (`ng test`).

---

## Project testing pyramid

```
                 ┌───────────────────────────┐
                 │   End-to-end (manual)      │  Real flows against the running system
                 ├───────────────────────────┤
                 │   Web/API slice tests      │  HTTP contract + security of each service
                 ├───────────────────────────┤
                 │   Use case tests           │  Application rules with fakes/mocks
                 ├───────────────────────────┤
                 │   Domain unit tests        │  Aggregates, value objects, policies
                 └───────────────────────────┘
```

### Current numbers (all green; operations and payment run on 2026-10-06, the rest on 2026-10-04)

| Service | Tests | Test classes |
|---|---|---|
| security-service | 106 | `UserAccountTest`, `ValueObjectsTest`, `PasswordPolicyTest`, `PasswordResetTokenTest`, `AccountRegistrationServiceTest`, `AuthenticationServiceTest`, `PasswordRecoveryServiceTest`, `UserProfileAndAdministrationTest`, `JwtTokenIssuerTest`, `EmailResetCodeNotifierTest`, `ApiSecurityWebTest` |
| customer-service | 67 | `CustomerAccountTest`, `LicensePlateTest`, `LicensePlatePolicyTest`, `CustomerVehicleServiceTest`, `UserRegisteredListenerTest`, `CustomerApiWebTest` |
| booking-service | 31 | `BookingTest`, `AvailabilityPolicyTest`, `BookingServiceTest`, `CatalogServiceTest`, `BookingApiWebTest` |
| operations-service | 22 | `AssignmentPolicyTest` (5), `ServiceExecutionTest` (4), `OperationsServiceTest` (9), `OperationsApiWebTest` (4) |
| notification-service | 60 | `NotificationTest`, `DeviceTokenTest`, `NotificationFactoryTest`, `BookingReminderTest`, `NotificationUseCasesTest`, `BookingReminderServiceTest` |
| api-gateway | 22 | `GatewayRoutesTest` |
| payment-service (.NET, xUnit, `dotnet test`) | 39 | `PaymentTests`, `AggregateRootTests` — domain only; no Application, Infrastructure or Api tests yet |
| **Total backend** | **347** | Java 308 + .NET 39 |
| Web | — | 36 spec files; **the suite does not compile today** (see gaps) |

---

## Tier 1: Domain unit tests

**What:** aggregates, value objects and domain policies, with no Spring and no database.
**Examples:** `BookingTest` (a booking needs services, cannot change after it starts, valid status
transitions), `AvailabilityPolicyTest` (grid, break, past times, alternatives),
`LicensePlatePolicyTest` (plate format per vehicle type), `BookingReminderTest` (which reminders
are still in the future, message in Colombian time).
**Rule:** every invariant in `02-domain/entities-and-rules.md` that the code enforces has a test
named after the behavior (booking, customer and notification use `@DisplayName` in Spanish to state the rule).

## Tier 2: Use case tests

**What:** application services with their ports replaced by **in-memory fakes** (notification:
`Fakes.java` in security and notification, in-memory repositories in security) or **Mockito mocks** (booking, customer). A fixed `Clock` makes
time-based rules deterministic.
**Examples:** `BookingServiceTest` (confirmed with a bay, full slot → alternatives, vehicle of
another client → 404, vehicle already booked), `CustomerVehicleServiceTest` (profile created on
first use), `BookingReminderServiceTest` (scheduled, sent, not repeated, cancelled, moved, emailed).

## Tier 3: Web/API slice tests

**What:** `@WebMvcTest` with the service's **real security configuration**, use cases mocked, and
JWTs signed in the test with the same algorithm (HS256). They protect the HTTP contract:
public vs protected routes, 401 without token, 403 for the wrong role, status codes and the
`code` of each error (RFC 9457).
**Examples:** `ApiSecurityWebTest` (also `/internal/**` only with the internal key),
`CustomerApiWebTest`, `BookingApiWebTest` (409 `SLOT_UNAVAILABLE` with alternatives).

## Tier 4: Integration tests with fake neighbours

**What:** the component running for real against fake external systems.
**Examples:** `GatewayRoutesTest` starts the gateway and one fake HTTP server per service and
checks every route, token forwarding, CORS and that `/internal/**` is not exposed.
`UserRegisteredListenerTest` feeds raw RabbitMQ messages to the listener.

There are **no tests against a real SQL Server** yet: the database schema is validated at startup
(`ddl-auto: validate` + Liquibase) and by the manual end-to-end runs.

## Tier 5: End-to-end (manual)

Run by hand against the whole system before each review session (`13-operations/README.md`):
sign-up → welcome email → login → register vehicle → book (and a full slot) → booking email →
reminder → admin moves the booking → cancellation. The last full run (2026-10-04) passed,
including the reminder email to a real inbox.

## Contract tests

No consumer-driven contract tests. The **contracts are exported from the running services**
(`07-api/contracts/openapi/*.yaml`, `GET /v3/api-docs`), so they never drift from the code; the
web slice tests protect each provider's side.

## Performance tests

Not done. RNF-001 (p95 < 2 s) is checked by hand; availability queries read one day of bookings
and are small.

---

## How to run

```bash
./mvnw test                      # one backend service (from its folder)
dotnet test                      # payment-service (from lavarapido-payment-service)
npx ng test --watch=false        # web (blocked today, see gaps)
```

Do not run `./mvnw clean` while that same service is running (it deletes the classes in use).

---

## CI

No pipeline yet. **Planned: Jenkins**, one `Jenkinsfile` per repository running `./mvnw verify`
(services) or `npm ci`, `ng build` and `ng test --watch=false` (web) on every push/PR to `develop`.
The web stage will fail until the 6 stale specs are fixed.

---

## Coverage

No coverage tool configured. Policy: every business rule and every endpoint's security has a test
(this is what the pyramid above covers); JaCoCo can be added to report numbers.

---

## Test data

| Need | How |
|---|---|
| Users with a role | JWT signed in the test (`NimbusJwtEncoder` with the test secret) |
| Repositories | In-memory fakes or Mockito |
| Time | `Clock.fixed(...)` |
| Real database (manual runs) | Liquibase seeds + dev demo accounts (`admin@gmail.com`, `cliente@gmail.com`, `operador@gmail.com`) |

---

## Gaps

| Gap | Action |
|---|---|
| Web test suite does not compile: 6 scaffold specs point to classes that no longer exist (`features/*/viewmodels/*.spec.ts`, `settings-panel.spec.ts`, `stepper.spec.ts`) | Fix or delete those specs, then add tests for the booking form and stores |
| No automated test across services | Automate registration → booking → notification |
| No CI | Add a workflow per repository |
| No test against a real SQL Server | Testcontainers for the persistence adapters of booking (locking, triggers) |
| payment-service only tests its domain | Add use-case tests (`PaymentApplicationService` with fake ports) and API tests (roles, 409 codes) |
| operations-service has no test with booking-service down | Add a test for 503 `BOOKING_SERVICE_UNAVAILABLE` in `OperationsServiceTest` |

---

## Correlations

- TDD guide and test doubles → `11-quality/tdd-guide.md`
- Traceability RF → test → `04-requirements/traceability-matrix.md`
- Domain invariants → `02-domain/entities-and-rules.md`
