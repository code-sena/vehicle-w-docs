# Traceability Matrix

> Connects `04-requirements/functional.md` (RF) → `04-requirements/user-stories.md` (HU) → tests → service.
> Status as of 2026-10-06. The microservices security, customer, booking and notification are built,
> merged into `develop`, connected to the web and verified end to end against the real database
> (registration → welcome email, vehicle, booking → confirmation, reminder by email).
> operations-service (3004) is built and connected to the web. payment-service (3005, .NET 8) covers
> payment accounts, receipts and review; promotions and loyalty are pending.
> Tests per service: `./mvnw test` in each Java repository (security 106, customer 67, booking 31,
> notification 60, api-gateway 22 — counts at 2026-10-04; operations 22 — run on 2026-10-06).
> payment: `dotnet test`, 39 green on 2026-10-06 (domain tests only: `PaymentTests`, `AggregateRootTests`).

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
| RF-004b | Account lockout after failed logins | HU-AUTH-002 | — | `security-service` | 🔴 Pending (not in the current service, see gaps) |
| RF-005 | Request booking (date, time, type) | HU-BOOK-001 | `BookingServiceTest`, `BookingTest`, `BookingApiWebTest` | `booking-service` | ✅ Done |
| RF-006 | Slot availability validation | HU-BOOK-001 | `AvailabilityPolicyTest`, `BookingServiceTest` (full slot → alternatives) | `booking-service` | ✅ Done |
| RF-007 | Modify/cancel booking before start | HU-BOOK-002 | `BookingTest` (reschedule, cancel, blocked after start), `BookingServiceTest` | `booking-service` | ✅ Done |
| RF-008 | Automatic operator assignment | HU-BOOK-003 | — | `operations-service` | 🟡 Partial — the admin assigns with a candidates list (`AssignmentPolicy`); automatic assignment on `booking.confirmed` is not built |
| RF-009 | Assignment/reassignment by Administrator | HU-BOOK-006 | `AssignmentPolicyTest`, `OperationsServiceTest`, `ServiceExecutionTest` (reassign only while pending) | `operations-service` | ✅ Done |
| RF-010 | Operator selection by customer | HU-BOOK-004 | — | `operations-service` | 🔴 Pending (no client endpoint to choose the operator) |
| RF-011 | Operator views assigned bookings | HU-BOOK-007 | `OperationsServiceTest`, `OperationsApiWebTest` | `operations-service` | ✅ Done |
| RF-012 | Rate a completed service | HU-BOOK-005 | `ServiceExecutionTest` (1–5, once, only completed), `OperationsServiceTest` | `operations-service` | ✅ Done (one rating per booking, applied to all its lines) |
| RF-012b | Operator updates service status | HU-BOOK-007 | `ServiceExecutionTest`, `OperationsServiceTest` | `operations-service` | ✅ Done (start only on the booking day; booking moves to `IN_PROGRESS` / `COMPLETED`) |
| RF-013 | Show QR (digital methods only) and payment instructions | HU-PAY-001 | — (no Application/Api tests yet) | `payment-service` | ✅ Done (`GET /payment-accounts`: active accounts of methods that require a receipt) |
| RF-013b | Upload payment receipt (digital methods only) | HU-PAY-001 | `PaymentTests` (receipt, submit for review) | `payment-service` | ✅ Done (image stored as data URL until there is file storage) |
| RF-014 | Admin reviews digital receipt or confirms cash payment | HU-PAY-003 | `PaymentTests` (approve, reject, refund) | `payment-service` | ✅ Done (approve / reject with reason / manual payment) |
| RF-015 | Payment history by date/service | HU-PAY-002 | — | `payment-service` | 🟡 Partial — `GET /payments/me` lists the client’s payments; no date/service filter in the API |
| RF-016 | No card data collected; reject reused transaction reference | HU-PAY-001 | — | `payment-service` | 🟡 Partial — no card data; a reused transaction reference is **not** rejected yet |
| RF-017 | Role-based dashboard | HU-UI-001 | — | Frontend | ✅ Done (admin dashboard reads bookings, operators and payments; operator home reads its services) |
| RF-018 | Notifications with read/unread state | HU-UI-002 | `NotificationUseCasesTest`, `NotificationFactoryTest`, `BookingReminderServiceTest`, `BookingReminderTest` | `notification-service` | ✅ Done (inbox, push, welcome, booking and reminder emails — `feature/booking-reminders` merged) |
| RF-019 | Theme customisation, per account | HU-UI-003 | Manual check | `security-service` (preferences) | 🟡 In progress — gap: the web keeps the theme in browser `localStorage` (shared by every account on the device); `GET/PUT /users/me/preferences` exists but is not called, and it only accepts `light`/`dark` while the web has 4 palettes |
| RF-020 | Language switch (4 languages), per account | HU-UI-003 | Manual check | `security-service` (preferences) | 🟡 In progress — same gap as RF-019 (language in `localStorage`) |
| RF-021 | Configure business hours and exceptions | HU-ADMIN-001 | `AvailabilityPolicyTest` (break, closed day), `BookingApiWebTest` | `booking-service` | ✅ Done |
| RF-022 | Operator availability registration/adjustment | HU-ADMIN-001 | `AssignmentPolicyTest` (shift, absence), `OperationsServiceTest` | `operations-service` | ✅ Done (weekly shift and absences, set by the admin) |
| RF-023 | Operational reports | HU-ADMIN-001 | — | `booking-service`, `operations-service`, `payment-service` | 🟡 In progress (web reports read real bookings and payments) |
| RF-024 | Manage promotions (create/edit/deactivate) | HU-PROMO-001 | — | `payment-service` | 🔴 Pending (tables exist in `promotion`, no endpoints) |
| RF-025 | Apply promotion at payment | HU-PROMO-002 | — | `payment-service` | 🔴 Pending |
| RF-026 | Earn/redeem loyalty points | HU-PROMO-002 | — | `payment-service` | 🔴 Pending (`payment.loyalty_transaction` exists, no endpoints; booking points columns stay 0) |

---

## RNF → Validation matrix

| RNF ID | Description | How it is validated | Status |
|--------|-------------|----------------------|--------|
| RNF-001 | Performance (p95 < 2 s) | Manual measurement with Postman | 🔴 Pending |
| RNF-002 | Availability during review sessions | Manual check before each session | 🔴 Pending |
| RNF-003 | Concurrency and data integrity | Integration tests on booking and payment | 🔴 Pending |
| RNF-004 | Security (JWT, BCrypt, roles, lockout) | `ApiSecurityWebTest`, `CustomerApiWebTest`, `BookingApiWebTest` (401/403 per role), `PasswordPolicyTest`, `GatewayRoutesTest` (`/internal` not exposed) + web guards | 🟡 In progress (login lockout missing) |
| RNF-005 | Observability (service logs) | `/actuator/health` per service, `X-Correlation-Id` in every log line | 🟡 In progress |
| RNF-006 | Maintainability (PRs, commits, migrations) | GitHub history + code review | 🟡 In progress |
| RNF-007 | Portability (Docker, no OS dependency) | Local setup reproduced from scratch | 🟡 In progress |
| RNF-008 | Compatibility (Android 8+, browsers, 360 px) | Manual tests on devices and browsers | 🔴 Pending |
| RNF-009 | Usability (booking in ≤ 5 steps, form messages) | Flow and form review | 🔴 Pending |
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
| HU without integration test | Each service has unit and web tests, but no flow across services is automated; end-to-end checks were run by hand against the real database | Automate at least registration → booking → notification | Whole team |
| RF-004b not implemented | An earlier version of this matrix listed a lockout test (`LoginLockoutTest`), but no such code exists in `security-service` | Implement 5 failed attempts in 15 minutes → 15-minute lock in `security-service` | security-service owner |

---

## Closed gaps

| Gap | How it was closed |
|-----|-------------------|
| No tie-breaker when several operators are equally available (RF-008) | Fewest open jobs, then lowest operator id (`AssignmentPolicy`, `AssignmentPolicyTest`) |
| RF-003 blocked for lack of an email provider | SMTP added for this single e-mail (Mailpit locally, any SMTP account for the delivery) — `01-context/scope.md` |
| Booking emails and reminders had no email address (RF-018) | Address read from security-service at send time through `/internal/**` (ADR-011 §8) |

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