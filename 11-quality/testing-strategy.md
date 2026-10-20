# Testing Strategy

> How LavaRápido is tested today, what each kind of test protects, how to run them, and the gaps.
> Backend: JUnit 5 + Mockito + Spring Boot Test (`./mvnw test`); payment-service: xUnit (`dotnet test`). Web: Vitest through
> `@angular/build:unit-test` (`ng test`).

---

## Project testing pyramid

```
                 ┌───────────────────────────┐
                 │   End-to-end               │  Real flows against the running system (e2e/)
                 ├───────────────────────────┤
                 │   Web/API slice tests      │  HTTP contract + security of each service
                 ├───────────────────────────┤
                 │   Use case tests           │  Application rules with fakes/mocks
                 ├───────────────────────────┤
                 │   Domain unit tests        │  Aggregates, value objects, policies
                 └───────────────────────────┘
```

### Current numbers (all green, run on 2026-10-19)

Counted from the Maven summary (`Tests run:` at the end of `./mvnw test`), `dotnet test` and Vitest. The
`tests` attribute of the surefire XML of customer-service reports one less (68) because of a nested
test class; the 69 test cases do run.

| Service | Tests | Test classes |
|---|---|---|
| security-service | 151 | `UserAccountTest`, `ValueObjectsTest`, `PasswordPolicyTest`, `PasswordResetTokenTest`, `UserPreferenceTest`, `AccountRegistrationServiceTest`, `AuthenticationServiceTest`, `PasswordRecoveryServiceTest`, `UserProfileAndAdministrationTest`, `PersonAddressServiceTest`, `UserPreferenceServiceTest`, `RolePermissionAdministrationServiceTest`, `AdministratorBootstrapServiceTest`, `AdministratorBootstrapRunnerTest`, `JwtTokenIssuerTest`, `EmailResetCodeNotifierTest`, `ApiSecurityWebTest` |
| customer-service | 69 | `CustomerAccountTest`, `LicensePlateTest`, `LicensePlatePolicyTest`, `CustomerVehicleServiceTest`, `UserRegisteredListenerTest`, `CustomerApiWebTest` |
| booking-service | 43 | `BookingTest`, `EstablishmentTest`, `ServiceBayTest` (a bay cannot be created in maintenance), `AvailabilityPolicyTest` (including the reason of an unavailable time), `BookingServiceTest`, `CatalogServiceTest`, `BookingApiWebTest` |
| operations-service | 55 | `AssignmentPolicyTest`, `AutoAssignmentPolicyTest`, `StartPolicyTest`, `ServiceExecutionTest`, `InspectionReportTest`, `OperatorMetricsCalculatorTest`, `TeamSummaryCalculatorTest`, `OperationsServiceTest`, `OperatorProfileServiceTest`, `OperatorPersistenceAdapterTest` (operator row race), `OperationsApiWebTest` |
| notification-service | 112 | `NotificationTest`, `DeviceTokenTest`, `BookingReminderTest`, `NotificationFactoryTest`, `LocalizedNotificationsTest`, `NotificationUseCasesTest`, `BookingReminderServiceTest`, `StaffNotificationsTest`, `UnassignedBookingAlertTest`, `AppUpdateNoticeTest`, `DeliveryCommandsTest`, `AdminNotificationControllerTest` |
| api-gateway | 34 | `GatewayRoutesTest` |
| payment-service (.NET, xUnit, `dotnet test`) | 148 | Domain 113 (`PaymentTests`, `PaymentPolicyTests`, `PromotionTests`, `LoyaltyTransactionTests`, `AggregateRootTests`), Application 28 (`PaymentCommandServiceTests`, `PaymentQueryServiceTests`, `CustomerPromotionServiceTests`); the 7 `PersistenceTests` need a real SQL Server: they skip themselves without `PAYMENT_INTEGRATION_DB` and on 2026-10-19 ran against the isolated `LavaRapidoPaymentIT` database |
| **Total backend** | **612** | Java 464 + .NET 148 |
| Web (Angular, Vitest, `ng test`) | 43 | 37 spec files, including `api-error.spec.ts` (error codes and the slot reason) and `payment.spec.ts` (two accounts of the same method) |
| **Total** | **655** | |

The same day the 19 end-to-end tests of `lavarapido-infra/e2e` and the 42 functional cases CP-01 to
CP-42 (Test Documentation of `lavarapido-docs`) passed against the complete system. On 2026-10-20 the
admin role change was reverted and its 2 tests left security-service, so a new run will count 2 fewer
there.

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

## Tier 5: End-to-end

**Automated** (`lavarapido-infra/e2e`, Node scripts through the gateway, with `E2E_ADMIN_ID`,
`E2E_OPERATOR_ID` and `E2E_CLIENT_ID` set to the local accounts). Run of 2026-10-16 against the
`develop` code: 19 of 19 checks green; run again on 2026-10-19 with the same result (11.2 s).

| Script | What it checks |
|---|---|
| `booking-flow.test.js` | The client sees the free operators, books choosing one, operations assigns it on `booking.confirmed` (RabbitMQ), notification notifies the client, the admin home counts the booking, `/internal` is not reachable through the gateway |
| `full-flow.test.js` | Client books → automatic assignment → payment reported → admin approves (points earned) → operator starts and finishes → client rates, checking every notice; restores the client's points and coupons |
| `inspection-flow.test.js` | Inspection report of a 200-minute booking: finding with photos (6 photos rejected), publish, share, public link without plate or emails, public photo, client notice |
| `access-rules.test.js` | Role rules, internal routes, profile address, payment filters, tax data hidden from the public, operator profile validation, a time before opening answers `reason: OUTSIDE_HOURS`, a token of a missing account creates no operator row |

They use the team's real accounts (no new sign-ups, so no test emails) and delete what they create
through SQL. Local data they need: an operator with shifts covering 9:00, a payment method with
receipt besides cash, and business hours opening before 9:00 (`e2e/README.md`).

**Manual**, against the whole system before each review session (`13-operations/README.md`):
sign-up → welcome email → login → register vehicle → book (and a full slot) → booking email →
reminder → admin moves the booking → cancellation. The last full run (2026-10-04) passed,
including the reminder email to a real inbox.

## Contract tests

No consumer-driven contract tests. The **contracts are exported from the running services**
(`07-api/contracts/openapi/*.yaml`, `GET /v3/api-docs`), so they never drift from the code; the
web slice tests protect each provider's side.

## Performance tests

`lavarapido-infra/e2e/performance.js` measures the p95 of the main reads through the gateway (30
requests each, after a warm-up). Run of 2026-10-19 on the development PC: every endpoint under the
2 s limit; the slowest p95 was the client's bookings with 49 ms (on 2026-10-14 it was `/payments/me`
with 686 ms).

**Screen width (RNF-008):** `lavarapido-infra/e2e/width-360.js` opens 12 web screens (public, client,
admin) at 360 px and fails if any has horizontal scroll; all passed on 2026-10-14, 2026-10-16 and 2026-10-19.
On 2026-10-19 a wider review also checked 33 web screens at 360 and 768 px and 15 mobile screens at
360 px, with no overflow.

---

## How to run

```bash
./mvnw test                      # one backend service (from its folder)
dotnet test                      # payment-service (from lavarapido-payment-service)
npx ng test --watch=false        # web
```

Do not run `./mvnw clean` while that same service is running (it deletes the classes in use).

---

## CI

GitHub Actions since 2026-10-19 (`10-devops/ci-cd.md`): every push and pull request to `develop` and
`main` runs `./mvnw verify` (Java services and gateway), `dotnet test` (payment), `ng build` and
`ng test --watch=false` (web) and `tsc --noEmit` (mobile). The end-to-end suite is not in CI because
it needs the whole system; it is run by hand before a release.

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
| The web suite is mostly "should create" specs | Add tests for the booking form, the payment page and the stores |
| The cross-service tests do not cover sign-up | Add it with a disposable account when a test mail domain is agreed |
| The mobile app has no automated tests | `tsc --noEmit`, `expo-doctor` and `expo export` are the current checks; add Jest for the view models |
| End-to-end tests are not in CI | Start SQL Server, RabbitMQ and the services as job containers and run `e2e/*.test.js` |
| No test against a real SQL Server | Testcontainers for the persistence adapters of booking (locking, triggers) |
| payment-service has no API tests | Use-case tests exist (`PaymentCommandServiceTests`, `PaymentQueryServiceTests`, `CustomerPromotionServiceTests` with in-memory fakes); add API tests (roles, 409 codes) |
| operations-service has no test with booking-service down | Add a test for 503 `BOOKING_SERVICE_UNAVAILABLE` in `OperationsServiceTest` |

---

## Correlations

- TDD guide and test doubles → `11-quality/tdd-guide.md`
- Traceability RF → test → `04-requirements/traceability-matrix.md`
- Domain invariants → `02-domain/entities-and-rules.md`
