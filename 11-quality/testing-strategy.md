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

### Current numbers (all green in CI on `develop`, 2026-10-23)

Counted from the log of the last `ci.yml` run of each repository on 2026-10-23 (`Tests run:` of Maven,
`Passed!` of `dotnet test`, the Vitest and jest summaries; run ids in `10-devops/ci-cd.md`). The test
classes listed are the ones counted on 2026-10-21; the fixes of 2026-10-22 and 2026-10-23 added cases to
them (E-01, E-02, E-05, A-01, A-09, A-11, A-13, A-20, B-01, E-07, E-08, E-09) and the web suite grew
with F-02.

| Service | Tests | Test classes |
|---|---|---|
| security-service | 171 | `UserAccountTest`, `ValueObjectsTest`, `PasswordPolicyTest`, `PasswordResetTokenTest`, `UserPreferenceTest`, `AccountRegistrationServiceTest`, `AuthenticationServiceTest`, `PasswordRecoveryServiceTest`, `UserProfileAndAdministrationTest`, `PersonAddressServiceTest`, `UserPreferenceServiceTest`, `RolePermissionAdministrationServiceTest`, `AdministratorBootstrapServiceTest`, `AdministratorBootstrapRunnerTest`, `JwtTokenIssuerTest`, `EmailResetCodeNotifierTest`, `ApiSecurityWebTest` (including a token of a closed session answering 401) |
| customer-service | 71 | `CustomerAccountTest`, `LicensePlateTest`, `LicensePlatePolicyTest`, `CustomerVehicleServiceTest`, `UserRegisteredListenerTest`, `CustomerApiWebTest` |
| booking-service | 60 | `BookingTest` (including when a booking expires), `EstablishmentTest`, `ServiceBayTest` (a bay cannot be created in maintenance), `AvailabilityPolicyTest` (including the reason of an unavailable time), `BookingServiceTest`, `CatalogServiceTest`, `BookingApiWebTest`; `BookingServiceTest` also covers the expired-bookings close and the internal no-show for bookings without operator |
| operations-service | 72 | `AssignmentPolicyTest`, `AutoAssignmentPolicyTest`, `StartPolicyTest`, `ServiceExecutionTest`, `InspectionReportTest`, `OperatorMetricsCalculatorTest`, `TeamSummaryCalculatorTest`, `OperationsServiceTest`, `OperatorProfileServiceTest`, `OperatorPersistenceAdapterTest` (operator row race), `OperationsApiWebTest`; `OperationsServiceTest` checks the unassigned rule and that the lock is taken before saving an assignment; `FollowUpPolicyTest` and `FollowUpServiceTest` cover the bookings that ended and nobody registered (no false no-shows, one notice, closing as attended without inventing times) |
| notification-service | 115 | `NotificationTest`, `DeviceTokenTest`, `BookingReminderTest`, `NotificationFactoryTest`, `LocalizedNotificationsTest`, `NotificationUseCasesTest`, `BookingReminderServiceTest`, `StaffNotificationsTest`, `UnassignedBookingAlertTest`, `AppUpdateNoticeTest`, `DeliveryCommandsTest`, `AdminNotificationControllerTest`, `DomainEventEnvelopeTest` (a null payload field no longer sends the event to the DLQ) |
| api-gateway | 39 | `GatewayRoutesTest`, `SessionCheckFilterTest` (closed sessions cut, answer cached per token, security-service down) |
| payment-service (.NET, xUnit, `dotnet test`) | 151 + 7 skipped | Domain 119 (`PaymentTests`, `PaymentPolicyTests`, `PromotionTests`, `LoyaltyTransactionTests`, `AggregateRootTests`), Application 32 (`PaymentCommandServiceTests`, `PaymentQueryServiceTests`, `CustomerPromotionServiceTests`); the 7 `PersistenceTests` need a real SQL Server: they skip themselves without `PAYMENT_INTEGRATION_DB` (in CI they are skipped; on 2026-10-21 they ran against the isolated `LavaRapidoPaymentIT` database) |
| **Total backend** | **679** | Java 528 + .NET 151 |
| Web (Angular, Vitest, `ng test`) | 146 | 59 spec files (41 on 2026-10-21, more ViewModel tests added by F-02 on 2026-10-23), including `api-error.spec.ts` (error codes and the slot reason), `payment.spec.ts` (two accounts of the same method), `auth.spec.ts` (tabs follow a sign-in or sign-out made in another tab), `reservations-store.spec.ts` and `reservations.spec.ts` (one unassigned rule, the to-close list, filters, paging, day labels), `management.spec.ts` (accounts and the fixed roles), `reports.spec.ts` (only completed bookings count as services done) and the client `dashboard.spec.ts` (loyalty bar) |
| Mobile (React Native, jest-expo, `npm test`) | 13 | 3 suites added on 2026-10-23 (F-01): validators and the booking, payment and login services; no screen tests |
| **Total** | **838** | 845 counting the 7 skipped integration tests |

The same day the 19 end-to-end tests of `lavarapido-infra/e2e` passed against the complete system
(with the gateway's session check on). The 42 functional cases CP-01 to CP-42 (Test Documentation of
`lavarapido-docs`) were last run in full on 2026-10-19.

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
`ng test --watch=false` (web), and `tsc --noEmit` plus `npm test` with jest-expo (mobile, since
2026-10-23). The end-to-end suite is not in CI because it needs the whole system; it is run by hand
before a release (last full run 2026-10-21).

---

## Coverage

No coverage tool configured and CI does not measure it (F-02). Policy: every business rule and every
endpoint's security has a test (this is what the pyramid above covers); JaCoCo and
`ng test --coverage` can be added to report numbers.

---

## Test data

| Need | How |
|---|---|
| Users with a role | JWT signed in the test (`NimbusJwtEncoder` with the test secret) |
| Repositories | In-memory fakes or Mockito |
| Time | `Clock.fixed(...)` |
| Real database (manual runs) | Liquibase seeds + dev demo accounts (`admin@gmail.com`, `cliente@gmail.com`, `operador@gmail.com`), created only with the `dev` profile and the `DEMO_*_PASSWORD` values of the local `.env` (E-05) |

---

## Gaps

| Gap | Action |
|---|---|
| The web suite still misses screens (F-02, H-03) | 146 tests on 2026-10-23; still without ViewModel tests: inspection, schedules, operators, calendar, business data, client vehicles and the sidebar; `authGuard` by role and the 401 interceptor need more cases |
| The cross-service tests do not cover sign-up | Add it with a disposable account when a test mail domain is agreed |
| The mobile app has few automated tests (H-04) | 13 jest-expo tests since 2026-10-23 (validators, booking, payment and login services); no test of the screens, of removing a coupon or of the payment screen |
| End-to-end tests are not in CI | Start SQL Server, RabbitMQ and the services as job containers and run `e2e/*.test.js` |
| No test against a real SQL Server | Testcontainers for the persistence adapters of booking (locking, triggers) |
| payment-service has no API tests | Use-case tests exist (`PaymentCommandServiceTests`, `PaymentQueryServiceTests`, `CustomerPromotionServiceTests` with in-memory fakes); add API tests (roles, 409 codes) |
| operations-service has no test with booking-service down | Add a test for 503 `BOOKING_SERVICE_UNAVAILABLE` in `OperationsServiceTest` |

---

## Correlations

- TDD guide and test doubles → `11-quality/tdd-guide.md`
- Traceability RF → test → `04-requirements/traceability-matrix.md`
- Domain invariants → `02-domain/entities-and-rules.md`
