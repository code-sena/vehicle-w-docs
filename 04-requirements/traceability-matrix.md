# Traceability Matrix

> Connects `04-requirements/functional.md` (RF) → `04-requirements/user-stories.md` (HU) → tests → service.
> Status as of 2026-10-13. The six microservices (security, customer, booking, operations, payment,
> notification) and the api-gateway are built, merged into `develop`, connected to the web and the
> Android app and verified end to end against the real database with real accounts.
> Tests per service: `./mvnw test` in each Java repository (security 129, customer 68, booking 38,
> operations 45, notification 100, api-gateway 34) and `dotnet test` in payment (domain 113,
> application 23, 28 in the review branch; 7 integration tests skipped by design because they need a separate database).
> Web: `ng test`, 36 tests in 35 files.
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
| RF-001 | Customer sign-up | HU-AUTH-001 | `AccountRegistrationServiceTest`, `PasswordPolicyTest`, `ApiSecurityWebTest`; profile created by `UserRegisteredListenerTest`, `CustomerVehicleServiceTest` | `security-service`, `customer-service` | ✅ Done |
| RF-002 | Login with role-based redirect | HU-AUTH-002 | `AuthenticationServiceTest`, `JwtTokenIssuerTest`, `ApiSecurityWebTest`, `auth.spec.ts` (web) | `security-service` | ✅ Done |
| RF-003 | Password recovery via email | HU-AUTH-003 | `PasswordRecoveryServiceTest`, `PasswordResetTokenTest`, `EmailResetCodeNotifierTest` | `security-service` | ✅ Done |
| RF-004 | Change password (authenticated) | HU-AUTH-004 | `UserProfileAndAdministrationTest`, `PasswordPolicyTest` | `security-service` | ✅ Done |
| RF-004b | Account lockout after failed logins | HU-AUTH-002 | `AuthenticationServiceTest` (lock, window, reset), `PasswordRecoveryServiceTest` (reset lifts it), `ApiSecurityWebTest` (423) | `security-service` | ✅ Done (5 failures in 15 min → 15-min lock, `login_lockout`, migration 034) |
| RF-005 | Request booking (date, time, type) | HU-BOOK-001 | `BookingServiceTest`, `BookingTest`, `BookingApiWebTest` | `booking-service` | ✅ Done |
| RF-006 | Slot availability validation | HU-BOOK-001 | `AvailabilityPolicyTest`, `BookingServiceTest` (full slot → alternatives) | `booking-service` | ✅ Done |
| RF-007 | Modify/cancel booking before start | HU-BOOK-002 | `BookingTest` (reschedule, cancel, blocked after start), `BookingServiceTest` | `booking-service` | ✅ Done |
| RF-008 | Automatic operator assignment | HU-BOOK-003 | `AutoAssignmentPolicyTest`, `OperationsServiceTest` (auto-assign, disabled account) | `operations-service`, `booking-service` | ✅ Done (on `booking.confirmed`: client's choice if free, else fewest bookings that day; ADR-014 §10) |
| RF-009 | Assignment/reassignment by Administrator | HU-BOOK-006 | `AssignmentPolicyTest`, `OperationsServiceTest` (incl. `pastBookingIsNotAssignable`), `ServiceExecutionTest` (reassign only while pending) | `operations-service` | ✅ Done (a booking whose time has passed answers 409 `BOOKING_IN_PAST`, ADR-014 §8) |
| RF-010 | Operator selection by customer | HU-BOOK-004 | `OperationsServiceTest` (free operators), `OperationsApiWebTest` | `operations-service`, `booking-service` | ✅ Done (`GET /operators/available`; optional `preferredOperatorId` on the booking, web and app) |
| RF-011 | Operator views assigned bookings | HU-BOOK-007 | `OperationsServiceTest`, `OperationsApiWebTest` | `operations-service` | ✅ Done |
| RF-012 | Rate a completed service | HU-BOOK-005 | `ServiceExecutionTest` (1–5, once, only completed), `OperationsServiceTest` (incl. `ratingShowsFirstNames`) | `operations-service` | ✅ Done (one rating per booking, applied to all its lines; the client sees the operator's first name and the operator the client's, ADR-014 §7) |
| RF-012b | Operator updates service status | HU-BOOK-007 | `StartPolicyTest`, `ServiceExecutionTest`, `OperationsServiceTest` | `operations-service` | ✅ Done (start only from 15 minutes before the booking, 409 `SERVICE_TOO_EARLY`, ADR-014 §6; booking moves to `IN_PROGRESS` / `COMPLETED`; pending reminders are cancelled) |
| RF-013 | Show QR (digital methods only) and payment instructions | HU-PAY-001 | `PaymentQueryServiceTests` | `payment-service` | ✅ Done (`GET /payment-accounts`: active accounts of methods that require a receipt; the QR is the shop's own static image, it does not expire) |
| RF-013b | Upload payment receipt (digital methods only) | HU-PAY-001 | `PaymentTests` (receipt, submit for review), `PaymentCommandServiceTests` | `payment-service` | ✅ Done (image stored as data URL until there is file storage; the client also reports the amount paid) |
| RF-014 | Admin reviews digital receipt or confirms cash payment | HU-PAY-003 | `PaymentTests` (approve, reject, refund), `PaymentCommandServiceTests` (approve, in-person payment) | `payment-service` | ✅ Done (approve / reject with reason / refund; cash is recorded by the admin as an in-person payment, approved at once) |
| RF-015 | Payment history by date/service | HU-PAY-002 | `PaymentQueryServiceTests` (`Mine_*`, `MyBookings_*`) | `payment-service` | ✅ Done in `feature/payment-history-and-reference-test`, pending review by the payment-service owner (`GET /payments/me?from=&to=&service=`, newest booking first) |
| RF-016 | No card data collected; reject reused transaction reference | HU-PAY-001 | `PaymentCommandServiceTests` (`Report_WithAReferenceAlreadyUsedForAnotherBooking_IsRejected`, same booking after a rejection allowed) | `payment-service` | ✅ Done (no card data; a reused reference answers `TRANSACTION_REFERENCE_REUSED`; tests in `feature/payment-history-and-reference-test`, pending review by the payment-service owner) |
| RF-017 | Role-based dashboard | HU-UI-001 | — | Frontend | ✅ Done (admin dashboard reads bookings, operators and payments; operator home reads its services) |
| RF-018 | Notifications with read/unread state | HU-UI-002 | `NotificationUseCasesTest`, `NotificationFactoryTest`, `BookingReminderServiceTest`, `BookingReminderTest`, `StaffNotificationsTest`, `UnassignedBookingAlertTest`, `AdminNotificationControllerTest` | `notification-service` | ✅ Done (inbox, push, email for customer-relevant notices, reminders, staff notices, coupon and payment notices, user switches — ADR-011 §8 to §14) |
| RF-019 | Theme customisation, per account | HU-UI-003 | `UserPreferenceTest`, `UserPreferenceServiceTest` | `security-service` (preferences) | ✅ Done (4 palettes stored in `security.user_preference`, migration 020; web and app read and save them through `/users/me/preferences`) |
| RF-020 | Language switch (4 languages), per account | HU-UI-003 | `UserPreferenceTest`, `UserPreferenceServiceTest`, manual check per language | `security-service` (preferences) | ✅ Done (language stored per account; notifications — inbox, push and email — are written in the account language, `LocalizedNotificationsTest`, ADR-011 §15) |
| RF-021 | Configure business hours and exceptions | HU-ADMIN-001 | `AvailabilityPolicyTest` (break, closed day), `BookingApiWebTest` | `booking-service` | ✅ Done |
| RF-022 | Operator availability registration/adjustment | HU-ADMIN-001 | `AssignmentPolicyTest` (shift, absence), `OperationsServiceTest` | `operations-service` | ✅ Done (weekly shift and absences, set by the admin) |
| RF-023 | Operational reports | HU-ADMIN-001 | — | `booking-service`, `operations-service`, `payment-service` | 🟡 In progress (web reports read real bookings and payments; operator weekly metrics — services and trend, punctuality, revenue, worked hours — computed in operations-service, `OperatorMetricsCalculatorTest`; average rating per operator already in ratings) |
| RF-024 | Manage promotions (create/edit/deactivate) | HU-PROMO-001 | `PromotionTests` (rules, optional price/duration, pause) | `payment-service` | ✅ Done (`/admin/promotions`: discount, required points, start date, pause/resume) |
| RF-025 | Apply promotion at payment | HU-PROMO-002 | `PromotionTests` (redeem rules), `CustomerPromotionServiceTests` | `payment-service` | ✅ Done (the client redeems a coupon code when paying; once per booking) |
| RF-026 | Earn/redeem loyalty points | HU-PROMO-002 | `LoyaltyTransactionTests`, `PaymentCommandServiceTests` (points earned, unlocked coupons), `PromotionTests` (`IsUnlockedBy`) | `payment-service` | ✅ Done (points per service set by the admin, credited when the payment is approved, reversed on refund; `LoyaltyPointsEarned` announces the points and the unlocked coupons, ADR-015 §5) |

---

## RNF → Validation matrix

| RNF ID | Description | How it is validated | Status |
|--------|-------------|----------------------|--------|
| RNF-001 | Performance (p95 < 2 s) | `lavarapido-infra/e2e/performance.js` (p95 of the main reads through the gateway) | ✅ Met on 2026-10-14 (slowest p95 686 ms, `/payments/me`) |
| RNF-002 | Availability during review sessions | Manual check before each session | 🔴 Pending |
| RNF-003 | Concurrency and data integrity | Integration tests on booking and payment | 🔴 Pending |
| RNF-004 | Security (JWT, BCrypt, roles, lockout) | `ApiSecurityWebTest`, `CustomerApiWebTest`, `BookingApiWebTest` (401/403 per role), `PasswordPolicyTest`, `GatewayRoutesTest` (`/internal` not exposed) + web guards | 🟡 In progress (login lockout missing) |
| RNF-005 | Observability (service logs) | `/actuator/health` per service, `X-Correlation-Id` in every log line | 🟡 In progress |
| RNF-006 | Maintainability (PRs, commits, migrations) | GitHub history + code review | 🟡 In progress |
| RNF-007 | Portability (Docker, no OS dependency) | Local setup reproduced from scratch | 🟡 In progress |
| RNF-008 | Compatibility (Android 8+, browsers, 360 px) | `lavarapido-infra/e2e/width-360.js` (12 web screens at 360 px); devices by hand | 🟡 In progress (web at 360 px passes; Android 8 device still to try) |
| RNF-009 | Usability (booking in ≤ 5 steps, form messages) | Flow and form review | 🟡 In progress (booking takes 5 steps: vehicle, service, date, time, confirm — choosing the operator is optional; form messages reviewed in 4 languages) |
| RNF-010 | Localisation (4 languages, COP, date formats) | Manual check per language | 🟡 In progress |

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
| ✅ Done | Implemented, tested and merged into `dev` |
| 🟡 In progress | Under development, or validated informally without automation |
| 🔴 Pending | In the backlog, not started |
| ⏸ Blocked | Has an external blocker |
| ❌ Cancelled | Removed from scope |

---

## Identified gaps (requirements without coverage)

| Gap type | Description | Required action | Owner |
|----------|-------------|------------------|-------|

---

## Closed gaps

| Gap | How it was closed |
|-----|-------------------|
| No tie-breaker when several operators are equally available (RF-008) | Fewest open jobs, then lowest operator id (`AssignmentPolicy`, `AssignmentPolicyTest`) |
| RF-003 blocked for lack of an email provider | SMTP added for this single e-mail (Mailpit locally, any SMTP account for the delivery) — `01-context/scope.md` |
| Booking emails and reminders had no email address (RF-018) | Address read from security-service at send time through `/internal/**` (ADR-011 §8) |
| RF-019/RF-020 theme and language only in the browser | Stored per account in `security.user_preference` (4 palettes, migration 020); web and app use `/users/me/preferences` |
| No flow across services was automated | `lavarapido-infra/e2e/booking-flow.test.js`: booking → automatic assignment → notifications → admin home, through the gateway |
| RF-016 reused transaction reference accepted | `BookingPaymentGuard` rejects it with `TRANSACTION_REFERENCE_REUSED` |
| RF-024 to RF-026 promotions and loyalty pending | Built in payment-service (ADR-015) and shown on web and mobile |
| "Pay" offered on bookings already paid or under review | `GET /payments/me/bookings` returns `payable` (`PaymentPolicy.CanReportPayment`) and the screens only use that flag |
| Operator could start a booking of another day; reminders kept arriving | Start only from 15 minutes before (ADR-014 §6) and reminders cancelled on start/finish (ADR-011 §13) |

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