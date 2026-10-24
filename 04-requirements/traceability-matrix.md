# Traceability Matrix

> Connects `04-requirements/functional.md` (RF) → `04-requirements/user-stories.md` (HU) → tests → service.
> Status as of 2026-10-23, checked against `origin/develop` and the review of that day. The six
> microservices (security, customer, booking, operations, payment, notification) and the api-gateway
> are built, merged into `develop`, connected to the web and the Android app and deployed on the
> academic Azure server; 8 of the 10 repositories have the `v1.0.0` release (payment and mobile are
> pending).
> **41 RF: 30 Done, 11 Partial, 0 missing. 12 RNF: 3 Done, 9 Partial.** A requirement is *Done* only
> when the behaviour works end to end; *Partial* lists what is still missing, with the finding id
> (`15-project-control/risks.md`).
> CI on `develop`, 2026-10-23: web 146, mobile 13, api-gateway 39, security 171, customer 71,
> booking 60, operations 72, notification 115 and payment 151 (+ 7 integration tests skipped without
> SQL Server) — **838 automated tests**, all green. The 19 end-to-end tests (`lavarapido-infra/e2e`)
> last passed on 2026-10-21 and the 42 functional cases on 2026-10-19.
---

## How to use this matrix

```
Requirement → HU → Test case → Implementation → Service

If a requirement has no HU: it is not planned
If an HU has no test case: it has no completeness criterion
If a test case has no implementation: there is test technical debt
If there is code without an HU: possible gold-plating, or a change made without a story
```

---

## RF → HU → Test → Service matrix

| RF ID | RF Description | HU(s) | Tests that verify it | Service | Status |
|-------|-----------------|-------|-----------------------|---------|--------|
| RF-001 | Customer sign-up | HU-AUTH-001 | `AccountRegistrationServiceTest`, `PasswordPolicyTest`, `ApiSecurityWebTest`; profile created by `UserRegisteredListenerTest`, `CustomerVehicleServiceTest` | `security-service`, `customer-service` | 🟡 Partial — sign-up works and the server limits the email domain (A-01, 2026-10-23), but the Law 1581 consent is not **required** by the server (`acceptsTerms`/`acceptsDataPolicy` optional, SEC-07), and the web and mobile also block the **login** of accounts on other domains |
| RF-002 | Login with role-based redirect | HU-AUTH-002 | `AuthenticationServiceTest`, `JwtTokenIssuerTest`, `ApiSecurityWebTest`, `auth.spec.ts` (web) | `security-service` | ✅ Done |
| RF-003 | Password recovery via email | HU-AUTH-003 | `PasswordRecoveryServiceTest`, `PasswordResetTokenTest`, `EmailResetCodeNotifierTest` | `security-service` | ✅ Done |
| RF-004 | Change password (authenticated) | HU-AUTH-004 | `UserProfileAndAdministrationTest`, `PasswordPolicyTest` | `security-service` | ✅ Done |
| RF-004b | Account lockout after failed logins | HU-AUTH-002 | `AuthenticationServiceTest` (lock, window, reset), `PasswordRecoveryServiceTest` (reset lifts it), `ApiSecurityWebTest` (423) | `security-service` | ✅ Done (5 failures in 15 min → 15-min lock, `login_lockout`, migration 034) |
| RF-005 | Request booking (date, time, type) | HU-BOOK-001 | `BookingServiceTest`, `BookingTest`, `BookingApiWebTest` | `booking-service` | 🟡 Partial — the API accepts several services per booking, but the web booking screen sends only one (`serviceIds: [serviceId]`) |
| RF-006 | Slot availability validation | HU-BOOK-001 | `AvailabilityPolicyTest`, `BookingServiceTest` (full slot → alternatives) | `booking-service` | ✅ Done |
| RF-007 | Customer cancels before start; administrator reschedules | HU-BOOK-002 | `BookingTest` (reschedule, cancel, blocked after start), `BookingServiceTest` | `booking-service` | ✅ Done (the customer cancels without a reason, stored as `CUSTOMER_REQUEST`; rescheduling is done by the administrator, the client screens do not offer it — AM-03) |
| RF-008 | Automatic operator assignment | HU-BOOK-003 | `AutoAssignmentPolicyTest`, `OperationsServiceTest` (auto-assign, disabled account) | `operations-service`, `booking-service` | ✅ Done (on `booking.confirmed`: client's choice if free, else fewest bookings that day; ADR-014 §10) |
| RF-009 | Assignment/reassignment by Administrator | HU-BOOK-006 | `AssignmentPolicyTest`, `OperationsServiceTest` (incl. `pastBookingIsNotAssignable`, disabled account), `ServiceExecutionTest` (reassign only while pending, notes) | `operations-service` | 🟡 Partial — assign and reassign work and block unavailable operators, including a disabled account (A-13, 2026-10-23) and a past booking (`BOOKING_IN_PAST`). Missing: the assignment notes are stored but the operator never sees them, and reassigning without notes erases them (B-01); the web's reassign label lacks fr/pt |
| RF-010 | Operator selection by customer | HU-BOOK-004 | `OperationsServiceTest` (free operators), `OperationsApiWebTest` | `operations-service`, `booking-service` | ✅ Done (`GET /operators/available`; optional `preferredOperatorId` on the booking, web and app) |
| RF-011 | Operator views assigned bookings | HU-BOOK-007 | `OperationsServiceTest`, `OperationsApiWebTest` | `operations-service` | ✅ Done |
| RF-012 | Rate a completed service | HU-BOOK-005 | `ServiceExecutionTest` (1–5, once, only completed), `OperationsServiceTest` (incl. `ratingShowsFirstNames`) | `operations-service` | ✅ Done (one rating per booking, applied to all its lines; the client sees the operator's first name and the operator the client's, ADR-014 §7) |
| RF-012b | Operator updates service status | HU-BOOK-007 | `StartPolicyTest`, `ServiceExecutionTest`, `OperationsServiceTest`, `BookingApiWebTest` (operator route without the internal key) | `operations-service`, `booking-service` | ✅ Done (start only from 15 minutes before the booking, 409 `SERVICE_TOO_EARLY`, ADR-014 §6; booking moves to `IN_PROGRESS` / `COMPLETED`; pending reminders are cancelled. Since 2026-10-23 (E-01) the operator can only move a booking through operations, which checks the assignment. Open risk OPS-01: a failure between booking and operations on finish can block the operator) |
| RF-013 | Show QR (digital methods only) and payment instructions | HU-PAY-001 | `PaymentQueryServiceTests` | `payment-service` | ✅ Done (`GET /payment-accounts`: active accounts of methods that require a receipt; the QR is the shop's own static image, it does not expire) |
| RF-013b | Upload payment receipt (digital methods only) | HU-PAY-001 | `PaymentTests` (receipt, submit for review), `PaymentCommandServiceTests` | `payment-service` | ✅ Done (image stored as data URL until there is file storage; the client also reports the amount paid) |
| RF-014 | Admin reviews digital receipt or confirms cash payment | HU-PAY-003 | `PaymentTests` (approve, reject, refund), `PaymentCommandServiceTests` (approve, in-person payment) | `payment-service` | ✅ Done (approve / reject with reason / refund; cash is recorded by the admin as an in-person payment, approved at once). Open risk BIZ-01: approving does not compare the amount with what the booking costs today, so a paid booking rescheduled with other services keeps the old amount |
| RF-015 | Payment history by date/service | HU-PAY-002 | `PaymentQueryServiceTests` (`Mine_*`, `MyBookings_*`) | `payment-service` | 🟡 Partial — the API filters by date and service (`GET /payments/me?from=&to=&service=`, newest first), but the client screens do not use those filters |
| RF-016 | No card data collected; reject reused transaction reference | HU-PAY-001 | `PaymentCommandServiceTests` (`Report_WithAReferenceAlreadyUsedForAnotherBooking_IsRejected`, same booking after a rejection allowed) | `payment-service` | 🟡 Partial — no card data and a reused reference answers `TRANSACTION_REFERENCE_REUSED`, but the check is in the use case only: the column has an index, not a unique constraint, so two reports at the same time can pass |
| RF-017 | Role-based dashboard | HU-UI-001 | — | Frontend | ✅ Done (admin dashboard reads bookings, operators and payments; operator home reads its services) |
| RF-018 | Notifications with read/unread state | HU-UI-002 | `NotificationUseCasesTest`, `NotificationFactoryTest`, `BookingReminderServiceTest`, `BookingReminderTest`, `StaffNotificationsTest`, `UnassignedBookingAlertTest`, `AdminNotificationControllerTest` | `notification-service` | 🟡 Partial — inbox, push, email for customer-relevant notices, reminders, staff notices, coupon and payment notices, user switches (ADR-011 §8 to §17); the admin's status changes notify the client since 2026-10-23 (`booking.status_changed`, A-11). Missing: those status changes do not cancel the reminders, `booking.created` has no producer, and the admin notices are skipped if security-service is down (E-15) |
| RF-019 | Theme customisation, per account | HU-UI-003 | `UserPreferenceTest`, `UserPreferenceServiceTest` | `security-service` (preferences) | ✅ Done (4 palettes stored in `security.user_preference`, migration 020; web and app read and save them through `/users/me/preferences`) |
| RF-020 | Language switch (4 languages), per account | HU-UI-003 | `UserPreferenceTest`, `UserPreferenceServiceTest`, manual check per language | `security-service` (preferences) | ✅ Done (language stored per account; notifications — inbox, push and email — are written in the account language, `LocalizedNotificationsTest`, ADR-011 §15) |
| RF-021 | Configure business hours and exceptions | HU-ADMIN-001 | `AvailabilityPolicyTest` (break, closed day), `BookingApiWebTest` | `booking-service` | ✅ Done |
| RF-022 | Operator availability registration/adjustment | HU-ADMIN-001 | `AssignmentPolicyTest` (shift, absence), `OperationsServiceTest` | `operations-service` | ✅ Done (weekly shift and absences, set by the admin) |
| RF-023 | Operational reports | HU-ADMIN-001 | `reports.spec.ts` (web), `OperatorMetricsCalculatorTest` | `booking-service`, `operations-service`, `payment-service` | 🟡 Partial — operator weekly metrics (services and trend, punctuality, revenue, worked hours) are computed in operations-service; the other reports are computed in the browser from the loaded bookings and payments (accepted risk H-16, ADR-020) and the payments queue is capped at 200 (E-10) |
| RF-024 | Manage promotions (create/edit/deactivate) | HU-PROMO-001 | `PromotionTests` (rules, optional price/duration, pause, 1–99 %) | `payment-service` | ✅ Done (`/admin/promotions`: discount, required points, start date, pause/resume; since 2026-10-23 (E-07) a percentage must be 1–99 % and no coupon leaves a booking at 0) |
| RF-025 | Apply promotion at payment | HU-PROMO-002 | `PromotionTests` (redeem rules), `CustomerPromotionServiceTests` | `payment-service` | 🟡 Partial — the client redeems a coupon when paying, one per booking (E-09, unique index, 2026-10-23) and can remove it (`DELETE /api/v1/loyalty/redemptions/{bookingId}/{promotionId}`, E-08). Missing: after reloading the payment screen the client does not see the applied coupon nor the amount the server expects (BIZ-02), and the discount is frozen in pesos if the booking changes (BIZ-05) |
| RF-026 | Earn loyalty points that unlock promotions | HU-PROMO-002 | `LoyaltyTransactionTests`, `PaymentCommandServiceTests` (points earned, unlocked coupons), `PromotionTests` (`IsUnlockedBy`) | `payment-service` | ✅ Done (points per service set by the admin, credited when the payment is approved, reversed on refund; `LoyaltyPointsEarned` announces the points and the unlocked coupons, ADR-015 §5) |

| RF-027 | Own account management | — | `UserProfileAndAdministrationTest`, `PersonAddressServiceTest`, `AuthenticationServiceTest` | `security-service` | 🟡 Partial — profile, address, email and password change, logout and closing the account work, and they close sessions (password change and recovery since 2026-10-22). Missing: a closed session's token still works in five services when sent as `bearer` (SEC-01), and the session check is fail-open with a 30 s cache |
| RF-028 | User administration | — | `UserProfileAndAdministrationTest`, `ApiSecurityWebTest`, `AuthenticationServiceTest` (role removed) | `security-service` | 🟡 Partial — create operator/admin accounts (allowed domains only, A-01), activate or deactivate; an administrator account cannot be deactivated (`ADMIN_CANNOT_BE_DISABLED`); the role change was reverted on 2026-10-20 and a role removed by hand revokes the sessions (E-02). Missing: SEC-01 lets a deactivated user's token keep working until it expires |
| RF-029 | Roles and permission matrix | — | `RolePermissionAdministrationServiceTest` | `security-service` | ✅ Done (matrix informative, ADR-015) |
| RF-030 | Customer vehicles | — | `CustomerVehicleServiceTest`, `LicensePlateTest`, `CustomerApiWebTest` | `customer-service` | 🟡 Partial — register, edit and remove vehicles work (plate rule per type since E-16, 2026-10-23). Missing: removing a vehicle with active bookings leaves them orphaned (E-17/BIZ-08) and changing the vehicle type keeps the old price (BIZ-06) |
| RF-031 | Service catalog and prices | — | `CatalogServiceTest` | `booking-service` | ✅ Done |
| RF-032 | Wash bays | — | — (functional case CP-30) | `booking-service` | ✅ Done |
| RF-033 | Administrative booking management | — | `BookingTest`, `BookingServiceTest` | `booking-service` | ✅ Done (status changes and rescheduling) |
| RF-034 | Shop payment accounts | — | — (functional case CP-32) | `payment-service` | ✅ Done |
| RF-035 | Refund | — | `PaymentTests`, `PaymentCommandServiceTests` | `payment-service` | ✅ Done |
| RF-036 | Vehicle inspection report | — | `InspectionReportTest`, `OperationsApiWebTest`, `inspection-flow.test.js` | `operations-service`, `notification-service` | ✅ Done (web and mobile) |
| RF-037 | Business data | — | `EstablishmentTest`, `BookingApiWebTest` | `booking-service` | ✅ Done |
| RF-038 | Operator profile | — | `OperatorProfileServiceTest` | `operations-service` | ✅ Done |
---

## RNF → Validation matrix

| RNF ID | Description | How it is validated | Status |
|--------|-------------|----------------------|--------|
| RNF-001 | Performance (p95 < 2 s) | `lavarapido-infra/e2e/performance.js` (p95 of the main reads through the gateway) | ✅ Met on 2026-10-14 (slowest p95 686 ms, `/payments/me`) |
| RNF-002 | Availability during review sessions | Manual check before each session | 🟡 Partial — the services and the gateway answer when the VM is on (site 200 on 2026-10-23), but the VM is off most of the time to save credit, there is no uptime monitor and the continuous deployment is not tested (H-15, CD-01) |
| RNF-003 | Concurrency and data integrity | Integration tests on booking and payment | 🟡 Partial (no `@Version` on bookings and executions, and two open payments per booking are possible — E-11, A-16, OPS-03; rules enforced in code and database: bay overlap trigger, one approved payment per booking, unique reference; integration tests against SQL Server pending) |
| RNF-004 | Security (JWT, BCrypt, roles, lockout) | `ApiSecurityWebTest`, `CustomerApiWebTest`, `BookingApiWebTest` (401/403 per role, operator route needs the internal key), `PasswordPolicyTest`, `GatewayRoutesTest` (`/internal` and `/operator/bookings` not exposed), `SessionCheckFilterTest` + web guards | 🟡 Partial — JWT, BCrypt, roles, lockout, closed sessions, HTTPS with Caddy and E-01/E-02/E-05 fixed on 2026-10-23. Missing: SEC-01 (`bearer` skips the session check), no rate limit (SEC-04), a demo password still in `GUIA-EQUIPO.md` of infra and old passwords in the history (E-05) |
| RNF-005 | Observability (service logs) | `/actuator/health` per service, `X-Correlation-Id` in every log line | 🟡 Partial |
| RNF-006 | Maintainability (PRs, commits, migrations) | GitHub history + code review | 🟡 Partial |
| RNF-007 | Portability (Docker, no OS dependency) | Local setup reproduced from scratch | 🟡 Partial |
| RNF-008 | Compatibility (Android 8+, browsers, 360 px) | `lavarapido-infra/e2e/width-360.js` and a wider review; devices by hand | 🟡 Partial (on 2026-10-17, 60 web screens at 360 and 768 px and 26 app screens at 360 px without overflow; Android 8 device still to try) |
| RNF-009 | Usability (booking in ≤ 5 steps, form messages) | Flow and form review | 🟡 Partial (booking takes 5 steps: vehicle, service, date, time, confirm — choosing the operator is optional; form messages reviewed in 4 languages) |
| RNF-010 | Localisation (4 languages, COP, date formats) | Manual check per language | 🟡 Partial |
| RNF-011 | Idempotence of events | Unit tests of the event consumer (`processed_event`) and of the loyalty credit | ✅ Done |
| RNF-012 | Fault tolerance (SMTP, Expo Push, RabbitMQ down) | Test with the external service stopped | ✅ Done |

---

## Inverse traceability: HU → RF

| HU | Title | RF(s) it implements | Priority |
|----|-------|----------------------|----------|
| HU-AUTH-001 | Customer sign-up | RF-001 | Must Have |
| HU-AUTH-002 | Login with role-based redirect | RF-002, RF-004b | Must Have |
| HU-AUTH-003 | Password recovery | RF-003 | Should Have |
| HU-AUTH-004 | Change password | RF-004 | Should Have |
| HU-BOOK-001 | Request a booking | RF-005, RF-006 | Must Have |
| HU-BOOK-002 | Modify or cancel a booking | RF-007 | Must Have |
| HU-BOOK-003 | Automatic operator assignment | RF-008 | Must Have |
| HU-BOOK-004 | Manual operator selection | RF-010 | Should Have |
| HU-BOOK-005 | Rate a completed service | RF-012 | Should Have |
| HU-BOOK-006 | Administrator assigns or reassigns an operator | RF-009 | Should Have |
| HU-BOOK-007 | Operator views and updates assigned services | RF-011, RF-012b | Must Have |
| HU-PAY-001 | Pay for a booking via QR and receipt | RF-013, RF-013b, RF-016 | Must Have |
| HU-PAY-002 | View payment history | RF-015 | Should Have |
| HU-PAY-003 | Administrator reviews a payment receipt | RF-014 | Must Have |
| HU-ADMIN-001 | Manage shop schedule and view reports | RF-021, RF-022, RF-023 | Should Have |
| HU-UI-001 | Role-based dashboard | RF-017 | Should Have |
| HU-UI-002 | Notifications inbox | RF-018 | Should Have |
| HU-UI-003 | Interface preferences: theme and language | RF-019, RF-020 | Could Have |
| HU-PROMO-001 | Manage promotions | RF-024 | Should Have |
| HU-PROMO-002 | Apply promotion / earn loyalty points | RF-025, RF-026 | Could Have |

---

## Status legend

| Status | Meaning |
|--------|---------|
| ✅ Done | Implemented, tested and merged into `develop` |
| 🟡 Partial | Works in part: the row says what is missing and the finding id, or it is validated informally without automation |
| 🔴 Pending | In the backlog, not started |
| ⏸ Blocked | Has an external blocker |
| ❌ Cancelled | Removed from scope |

---

## Identified gaps (requirements without coverage)

| Gap type | Description | Required action | Owner |
|-------|-------------|------------------|-------|
| Code without HU | RF-027 to RF-038 were built without a user story | Write their stories | Whole team |
| Partial requirement | RF-023: consolidated reports for a chosen period | Build the reports in the backend (accepted for version 1, H-16, ADR-020) | Backend lead |
| Partial requirements (2026-10-23) | RF-001, RF-005, RF-009, RF-015, RF-016, RF-018, RF-025, RF-027, RF-028, RF-030: what each one misses is in its row | Findings SEC-01, SEC-07, BIZ-02, BIZ-05, BIZ-06, BIZ-08, B-01, A-11, E-15 in `15-project-control/risks.md` | Owner of each service |
| Missing screen | The customer cannot reschedule from the web or the app (the API allows it) | Improvement action AM-03 | Frontend lead |
| Test gap | RF-032 and RF-034 have no automated test of their own; RNF-003 has no integration tests against SQL Server | Add the tests | Backend lead |

---

## Closed gaps

| Gap | How it was closed |
|-----|-------------------|
| No tie-breaker when several operators are equally available (RF-008) | Fewest bookings that day, then lowest operator id (`AutoAssignmentPolicy`, `AutoAssignmentPolicyTest`) |
| RF-003 blocked for lack of an email provider | SMTP added for this single e-mail (Mailpit locally, any SMTP account for the delivery) — `01-context/scope.md` |
| Booking emails and reminders had no email address (RF-018) | Address read from security-service at send time through `/internal/**` (ADR-011 §8) |
| RF-019/RF-020 theme and language only in the browser | Stored per account in `security.user_preference` (4 palettes, migration 020); web and app use `/users/me/preferences` |
| No flow across services was automated | `lavarapido-infra/e2e/booking-flow.test.js`: booking → automatic assignment → notifications → admin home, through the gateway |
| RF-016 reused transaction reference accepted | `BookingPaymentGuard` rejects it with `TRANSACTION_REFERENCE_REUSED` |
| RF-024 to RF-026 promotions and loyalty pending | Built in payment-service (ADR-015) and shown on web and mobile |
| "Pay" offered on bookings already paid or under review | `GET /payments/me/bookings` returns `payable` (`PaymentPolicy.CanReportPayment`) and the screens only use that flag |
| Operator could start a booking of another day; reminders kept arriving | Start only from 15 minutes before (ADR-014 §6) and reminders cancelled on start/finish (ADR-011 §13) |
| The operator could move any booking by calling booking directly (E-01, RF-012b) | booking requires `X-Internal-Key` on `/api/v1/operator/bookings/**` and the gateway no longer routes it (2026-10-23) |
| A disabled operator account could be assigned by hand (A-13, RF-009) | 409 `OPERATOR_ACCOUNT_DISABLED` (2026-10-23) |
| A 100 % or larger-than-total coupon left a booking unpayable (E-07, RF-024) | Percentage 1–99 % and a minimum amount always due (2026-10-23) |
| Two coupons on one booking (E-09, RF-025) | Unique index, migration 021 of payment (2026-10-23) |

---

## How to maintain this matrix

1. When an HU is created: add the row in the RF → HU → Test → Service section and in the inverse table
2. When a test is written: note the file in the "Tests that verify it" column
3. When an HU is completed: change the status to ✅
4. At each phase review: go through the gaps and assign actions

---

## Correlations

- User Stories → `04-requirements/user-stories.md`
- Functional Requirements → `04-requirements/functional.md`
- Non-Functional Requirements → `04-requirements/non-functional.md`