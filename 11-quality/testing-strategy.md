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

### Current numbers (all green in CI on `main`, 2026-10-27)

Counted from the log of the last `ci.yml` run on `main` of each repository on 2026-10-27 (`Tests run:` of Maven,
`Passed!` of `dotnet test`, the Vitest and jest summaries; run ids in `10-devops/ci-cd.md`). The test
classes listed are the ones counted on 2026-10-21; the fixes of 2026-10-22 and 2026-10-23 added cases to
them (E-01, E-02, E-05, A-01, A-09, A-11, A-13, A-20, B-01, E-07, E-08, E-09) and the web suite grew
with F-02. The fleet round of 2026-10-24 added 354 tests (838 → 1,192) and the payment at booking and the
fixes of 2026-10-26 and 2026-10-27 another 145 (1,192 → 1,337); payment `v1.1.3` (merged on 2026-10-27,
run 40595106824, checked 2026-11-04) added 11 more (1,337 → 1,348). The main new classes are named in each row.

| Service | Tests | Test classes |
|---|---|---|
| security-service | 200 | `UserAccountTest`, `ValueObjectsTest`, `PasswordPolicyTest`, `PasswordResetTokenTest`, `UserPreferenceTest`, `AccountRegistrationServiceTest`, `AuthenticationServiceTest`, `PasswordRecoveryServiceTest`, `UserProfileAndAdministrationTest`, `PersonAddressServiceTest`, `UserPreferenceServiceTest`, `RolePermissionAdministrationServiceTest`, `AdministratorBootstrapServiceTest`, `AdministratorBootstrapRunnerTest`, `JwtTokenIssuerTest`, `EmailResetCodeNotifierTest`, `ApiSecurityWebTest` (including a token of a closed session answering 401); since 2026-10-24 `CurrentPasswordVerifier` cases, `ClientIpBehindGatewayTest` (real Tomcat), the 403 tests of SEC-09/F-04, consent and the 72-byte limit |
| customer-service | 83 | `CustomerAccountTest`, `LicensePlateTest`, `LicensePlatePolicyTest`, `CustomerVehicleServiceTest`, `UserRegisteredListenerTest`, `CustomerApiWebTest`; since 2026-10-24 stored long plates (E-16), removal with active bookings (BIZ-08) and client-only routes (BIZ-12); since 2026-10-27 the owners of many vehicles read in one query |
| booking-service | 137 | `BookingTest`, `EstablishmentTest`, `ServiceBayTest` (a bay cannot be created in maintenance), `AvailabilityPolicyTest` (including the reason of an unavailable time), `BookingServiceTest`, `CatalogServiceTest`, `BookingApiWebTest`; `BookingServiceTest` also covers the internal no-show for bookings without operator; since 2026-10-24 `ScheduleServiceTest` (BIZ-10), the client reschedule (BIZ-01), positive prices (BIZ-04), the optimistic lock (BIZ-09), the error mapping with a local HTTP server (BIZ-13), `reasonCode` (A-20) and the Liquibase changelog test. The expired-bookings job and its tests were removed (B-07). Since 2026-10-26 the payment at booking: `PaymentPolicyTest`, `PaymentDeadlineJobTest`, `PaymentEventsListenerTest`, `CancellationReasonTest` and new cases in `BookingTest`, `BookingServiceTest` and `BookingApiWebTest` (`INVALID_PAYMENT_MODE`, `CASH_BOOKING_LIMIT`, `PAYMENT_TIMEOUT`); since 2026-10-27 the 10-service limit and the business-hours week (400 `VALIDATION_ERROR`), `withoutBusyTimes` and `bookedBy` only for staff |
| operations-service | 110 | `AssignmentPolicyTest`, `AutoAssignmentPolicyTest`, `StartPolicyTest`, `ServiceExecutionTest`, `InspectionReportTest`, `OperatorMetricsCalculatorTest`, `TeamSummaryCalculatorTest`, `OperationsServiceTest`, `OperatorProfileServiceTest`, `OperatorPersistenceAdapterTest` (operator row race), `OperationsApiWebTest`; `OperationsServiceTest` checks the unassigned rule and that the lock is taken before saving an assignment; `FollowUpPolicyTest` and `FollowUpServiceTest` cover the bookings that ended and nobody registered (no false no-shows, one notice, closing as attended without inventing times); since 2026-10-24 the atomic start and finish (OPS-01), locks (OPS-03), fail-closed account check (A-13), unassignment (E-12), `SERVICE_TOO_LATE` (A-12), the listener retries and DLQ (OPS-04), the 503 of sharing (OPS-08) and the database errors (OPS-12) |
| notification-service | 133 | `NotificationTest`, `DeviceTokenTest`, `BookingReminderTest`, `NotificationFactoryTest`, `LocalizedNotificationsTest`, `NotificationUseCasesTest`, `BookingReminderServiceTest`, `StaffNotificationsTest`, `UnassignedBookingAlertTest`, `AppUpdateNoticeTest`, `DeliveryCommandsTest`, `AdminNotificationControllerTest`, `DomainEventEnvelopeTest` (a null payload field no longer sends the event to the DLQ); since 2026-10-24 reminders cancelled by status (A-11), `pending_delivery` dispatch (OPS-05), retried admin lookup (OPS-06), bindings and DLQ (OPS-10) and the unassigned notices (E-12) |
| api-gateway | 62 | `GatewayRoutesTest`, `SessionCheckFilterTest` (closed sessions cut with any scheme, answer cached per token, logout in every variant, security-service down), `AuthRateLimitFilterTest`, `ClientIpResolverTest`, `GatewayAuthRateLimitTest`, `GatewayRouteTimeoutTest` |
| payment-service (.NET, xUnit, `dotnet test`) | 275 | Domain 142 (`PaymentTests`, `PaymentPolicyTests`, `PromotionTests`, `LoyaltyTransactionTests`, `AggregateRootTests`; `PaymentReported` since 2026-10-26), Application 61 (`PaymentCommandServiceTests`, `PaymentQueryServiceTests`, `CustomerPromotionServiceTests`), API 47 (role and validation tests of F-04 and BIZ-13, `InternalApiKeyTests` of the internal reported route; since `v1.1.3` `PaymentConnectionStringTests`: the service does not start without `DB_PASSWORD`), Infrastructure 25: 13 without a database (`UniqueIndexConflictsTests`; since `v1.1.3` `RabbitMqOptionsTests`: a remote RabbitMQ requires user and password, `guest` only on localhost) and the 12 integration tests of `PersistenceTests`, which run in CI against SQL Server 2022 with the Liquibase migrations (job "Pruebas de integración", 0 skipped); without `PAYMENT_INTEGRATION_DB` those 12 skip themselves |
| **Total backend** | **1,000** | Java 725 + .NET 275 |
| Web (Angular, Vitest, `ng test`) | 242 | 68 spec files (66 on 2026-10-24, 59 on 2026-10-23; the fleet added the live refresh, the amount due from the server, the error codes in four languages and the real guard and interceptor; the payment at booking added `history-card.spec.ts` (pay-before badge) and cases in `car-wash-form.spec.ts` (payment step) and `payment.viewmodel.spec.ts`), including `api-error.spec.ts` (error codes and the slot reason), `payment.spec.ts` (two accounts of the same method), `auth.spec.ts` (tabs follow a sign-in or sign-out made in another tab), `reservations-store.spec.ts` and `reservations.spec.ts` (one unassigned rule, the to-close list, filters, paging, day labels), `management.spec.ts` (accounts and the fixed roles), `reports.spec.ts` (only completed bookings count as services done) and the client `dashboard.spec.ts` (loyalty bar) |
| Mobile (React Native, jest-expo, `npm test`) | 106 | 28 suites (25 on 2026-10-24, 3 on 2026-10-23, F-01; `useReservePaymentStep` since 2026-10-26): validators, services, view models and hooks (`useClientPayment`, `useRefreshOnFocus`, `useOperatorRatings`…), the error codes and the push unregistration; no screen tests |
| **Total** | **1,348** | none skipped in CI |

On 2026-10-27 the 19 end-to-end tests of `lavarapido-infra/e2e` passed 19/19 against the complete
system (with the gateway's session check on; the suite now sends `paymentMode` when it books). The 42 functional cases CP-01 to CP-42 (Test Documentation of
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

Only payment-service has **tests against a real SQL Server**: the 12 integration tests of
`PersistenceTests` run in CI since 2026-10-27, in the job "Pruebas de integración" (which runs the whole
infrastructure project, 25 tests), against SQL Server 2022 as a service container with the Liquibase
migrations applied (on a machine without a database those 12 skip themselves). Since `v1.1.3` the local
`docker-compose.yml` of payment uses the same SQL Server 2022 image and the same database name as the CI
(`LavaRapidoPaymentIT`). In the Java services the schema is validated at
startup (`ddl-auto: validate` + Liquibase) and by the manual end-to-end runs.

## Tier 5: End-to-end

**Automated** (`lavarapido-infra/e2e`, Node scripts through the gateway, with `E2E_ADMIN_ID`,
`E2E_OPERATOR_ID` and `E2E_CLIENT_ID` set to the local accounts). Run of 2026-10-16 against the
`develop` code: 19 of 19 checks green; run again on 2026-10-19 with the same result (11.2 s) and on
2026-10-27 against `main`: 19 of 19, with the suites sending `paymentMode` when they book.

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
`ng test --watch=false --coverage` (web), and `tsc --noEmit` plus `npm test` with jest-expo (mobile,
since 2026-10-23). The end-to-end suites are not in CI because they need the whole system: the local
one is run by hand before a release (last full run 2026-10-27, 19/19) and the remote one with the manual
`e2e.yml` (merged 2026-10-24, not run against Azure yet; it needs the `E2E_*` accounts). payment's
integration tests run in CI against SQL Server since 2026-10-27.

---

## Coverage

The web measures coverage in CI since 2026-10-24 (`@vitest/coverage-v8`, report kept as an artifact,
no minimum). The backends do not measure it yet (JaCoCo can be added). Policy: every business rule and
every endpoint's security has a test (this is what the pyramid above covers).

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
| The web suite still misses screens (F-02, H-03) | 242 tests on 2026-10-27; the guard and the interceptor are now tested with the real `AuthService` and routes (F-02). Still without ViewModel tests: inspection, schedules, operators, calendar, business data, client vehicles and the sidebar |
| The cross-service tests do not cover sign-up | Add it with a disposable account when a test mail domain is agreed |
| The mobile app has few automated tests (H-04) | 106 jest-expo tests in 28 suites on 2026-10-27 (validators, services, view models and hooks, removing a coupon through `useClientPayment`); still no screen tests |
| End-to-end tests are not in CI | Remote battery `e2e/remote` with `e2e.yml` (manual) since 2026-10-24; first run against Azure pending (secrets `E2E_*`). Running them on every push still needs the whole system as job containers |
| No test against a real SQL Server in the Java services | payment has 12 in CI since 2026-10-27 (SQL Server 2022 service container, migrations 022/023 included). Still missing: Testcontainers or a service container for the Java persistence adapters (booking locking and triggers, migrations 044/045/049, notification 047, the `sp_getapplock` of SEC-05) — today they are checked live on Azure |
| ~~payment-service has no API tests~~ | Done: 47 API tests (roles of F-04, `VALIDATION_ERROR` of BIZ-13, startup without `DB_PASSWORD`) |
| ~~operations-service has no test with booking-service down~~ | Done with OPS-01 (finish with booking down, partial failure) |

---

## Correlations

- TDD guide and test doubles → `11-quality/tdd-guide.md`
- Traceability RF → test → `04-requirements/traceability-matrix.md`
- Domain invariants → `02-domain/entities-and-rules.md`
