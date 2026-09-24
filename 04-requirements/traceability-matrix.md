# Traceability Matrix

> Connects `04-requirements/functional.md` (RF) → `04-requirements/user-stories.md` (HU) → tests → service.
> Status as of 2026-09-24: the business rules of the six services are implemented and covered by
> unit tests; the system has not yet run end to end, so no row is ✅ Done (Definition of Done).
> End-to-end requests for every flow are in `lavarapido-backend/http/flujo-demo.http`.

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
| RF-001 | Customer sign-up | HU-AUTH-001 | `PasswordPolicyTest` | `security-service` | 🟡 In progress |
| RF-002 | Login with role-based redirect | HU-AUTH-002 | `auth.spec.ts` (web) | `security-service` | 🟡 In progress |
| RF-003 | Password recovery via email | HU-AUTH-003 | `PasswordResetCodeTest`, `PasswordRecoveryServiceTest`, `auth.spec.ts` (web) | `security-service` | 🟡 In progress |
| RF-004 | Change password (authenticated) | HU-AUTH-004 | `PasswordPolicyTest` | `security-service` | 🟡 In progress |
| RF-004b | Account lockout after failed logins | HU-AUTH-002 | `LoginLockoutTest` | `security-service` | 🟡 In progress |
| RF-005 | Request booking (date, time, type) | HU-BOOK-001 | `BookingTest` | `booking-service` | 🟡 In progress |
| RF-006 | Slot availability validation | HU-BOOK-001 | `AvailabilityCheckerTest`, `TimeSlotTest` | `booking-service` | 🟡 In progress |
| RF-007 | Modify/cancel booking before start | HU-BOOK-002 | `BookingTest` (cancel) | `booking-service` | 🟡 In progress (cancel done, modify pending) |
| RF-008 | Automatic operator assignment | HU-BOOK-003 | `AssignmentPolicyTest` | `operations-service` | 🟡 In progress |
| RF-009 | Assignment/reassignment by Administrator | HU-BOOK-006 | `ServiceExecutionTest` (reassign) | `operations-service` | 🟡 In progress |
| RF-010 | Operator selection by customer | HU-BOOK-004 | — | `operations-service` | 🔴 Pending |
| RF-011 | Operator views assigned bookings | HU-BOOK-007 | — | `operations-service` | 🟡 In progress |
| RF-012 | Rate a completed service | HU-BOOK-005 | `ServiceExecutionTest` (rating) | `operations-service` | 🟡 In progress |
| RF-012b | Operator updates service status | HU-BOOK-007 | `ServiceExecutionTest` | `operations-service` | 🟡 In progress |
| RF-013 | Show QR (digital methods only) and payment instructions | HU-PAY-001 | `PaymentTest` | `payment-service` | 🟡 In progress |
| RF-013b | Upload payment receipt (digital methods only) | HU-PAY-001 | `PaymentTest` | `payment-service` | 🟡 In progress |
| RF-014 | Admin reviews digital receipt or confirms cash payment | HU-PAY-003 | `PaymentTest` | `payment-service` | 🟡 In progress |
| RF-015 | Payment history by date/service | HU-PAY-002 | — | `payment-service` | 🟡 In progress |
| RF-016 | No card data collected; reject reused transaction reference | HU-PAY-001 | `PaymentTest` (reference) | `payment-service` | 🟡 In progress |
| RF-017 | Role-based dashboard | HU-UI-001 | — | Frontend only | 🟡 In progress (screens built, not yet fed by the API) |
| RF-018 | Notifications with read/unread state | HU-UI-002 | `NotificationFactoryTest` | `notification-service` | 🟡 In progress |
| RF-019 | Theme customisation | HU-UI-003 | Manual check | `security-service` | 🟡 In progress |
| RF-020 | Language switch (4 languages) | HU-UI-003 | Manual check | `security-service` | 🟡 In progress |
| RF-021 | Configure business hours and exceptions | HU-ADMIN-001 | — | `booking-service` | 🔴 Pending |
| RF-022 | Operator availability registration/adjustment | HU-ADMIN-001 | — | `operations-service` | 🟡 In progress (operator side done; admin adjustment pending) |
| RF-023 | Operational reports | HU-ADMIN-001 | — | `booking-service`, `operations-service`, `payment-service` | 🟡 In progress (per-operator report done; revenue pending) |
| RF-024 | Manage promotions (create/edit/deactivate) | HU-PROMO-001 | — | `payment-service` | 🔴 Pending |
| RF-025 | Apply promotion at payment | HU-PROMO-002 | — | `payment-service` | 🔴 Pending |
| RF-026 | Earn/redeem loyalty points | HU-PROMO-002 | `PaymentTest` (points) | `payment-service` | 🟡 In progress (earn done, redeem pending) |

---

## RNF → Validation matrix

| RNF ID | Description | How it is validated | Status |
|--------|-------------|----------------------|--------|
| RNF-001 | Performance (p95 < 2 s) | Manual measurement with Postman | 🔴 Pending |
| RNF-002 | Availability during review sessions | Manual check before each session | 🔴 Pending |
| RNF-003 | Concurrency and data integrity | Integration tests on booking and payment | 🔴 Pending |
| RNF-004 | Security (JWT, BCrypt, roles, lockout) | Unit tests (`LoginLockoutTest`, `PasswordPolicyTest`, web guards and interceptors) + manual tests | 🟡 In progress |
| RNF-005 | Observability (service logs) | Manual check via `docker logs` | 🔴 Pending |
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
| HU without integration test | The business rules have unit tests, but no flow has an automated end-to-end test yet (only `http/flujo-demo.http`, run by hand) | Automate at least the booking and payment flows before marking their HUs as Done | Whole team |

---

## Closed gaps

| Gap | How it was closed |
|-----|-------------------|
| No tie-breaker when several operators are equally available (RF-008) | Fewest open jobs, then lowest operator id (`AssignmentPolicy`, `AssignmentPolicyTest`) |
| RF-003 blocked for lack of an email provider | SMTP added for this single e-mail (Mailpit locally, any SMTP account for the delivery) — `01-context/scope.md` |
| Lockout thresholds undefined (RF-004b) | 5 failed attempts within 15 minutes lock the account for 15 minutes (`LoginLockoutTest`) |

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