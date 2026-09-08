# Traceability Matrix

> Connects `04-requirements/functional.md` (RF) → `04-requirements/user-stories.md` (HU) → tests → service.
> Almost no tests exist yet, so most rows are 🔴 Pending. Update the "Tests that verify it" column
> as tests are written, and the status as work progresses.

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
| RF-001 | Customer sign-up | HU-AUTH-001 | — | auth-service | 🔴 Pending |
| RF-002 | Login with role-based redirect | HU-AUTH-002 | — | auth-service | 🔴 Pending |
| RF-003 | Password recovery via email | HU-AUTH-003 | — | auth-service | ⏸ Blocked |
| RF-004 | Change password (authenticated) | HU-AUTH-004 | — | auth-service | 🔴 Pending |
| RF-004b | Account lockout after failed logins | HU-AUTH-002 | — | auth-service | 🔴 Pending |
| RF-005 | Request booking (branch, date, time, type) | HU-BOOK-001 | — | booking-service | 🔴 Pending |
| RF-006 | Slot availability validation | HU-BOOK-001 | — | booking-service | 🔴 Pending |
| RF-007 | Modify/cancel booking before start | HU-BOOK-002 | — | booking-service | 🔴 Pending |
| RF-008 | Automatic operator assignment | HU-BOOK-003 | — | booking-service | 🔴 Pending |
| RF-009 | Assignment/reassignment by Administrator | HU-BOOK-006 | — | booking-service | 🔴 Pending |
| RF-010 | Operator selection by customer | HU-BOOK-004 | — | booking-service | 🔴 Pending |
| RF-011 | Operator views assigned bookings | HU-BOOK-007 | — | booking-service | 🔴 Pending |
| RF-012 | Rate a completed service | HU-BOOK-005 | — | booking-service | 🔴 Pending |
| RF-012b | Operator updates service status | HU-BOOK-007 | — | booking-service | 🔴 Pending |
| RF-013 | Pay online via Wompi | HU-PAY-001 | — | payment-service | ⏸ Blocked |
| RF-014 | Record and link transaction to booking | HU-PAY-001 | — | payment-service | ⏸ Blocked |
| RF-015 | Payment history by date/service | HU-PAY-002 | — | payment-service | 🔴 Pending |
| RF-016 | No raw card data stored (delegated to Wompi) | HU-PAY-001 | — | payment-service | ⏸ Blocked |
| RF-017 | Role-based dashboard | HU-UI-001 | — | Frontend only | 🔴 Pending |
| RF-018 | Notifications with read/unread state | HU-UI-002 | — | Frontend only | 🔴 Pending |
| RF-019 | Theme customisation | HU-UI-003 | Manual check | Frontend only | 🟡 In progress |
| RF-020 | Language switch (4 languages) | HU-UI-003 | Manual check | Frontend only | 🟡 In progress |
| RF-021 | Create/edit/deactivate branches | HU-ADMIN-001 | — | admin-service | 🔴 Pending |
| RF-022 | Operator availability registration/adjustment | HU-ADMIN-001 | — | admin-service | 🔴 Pending |
| RF-023 | Operational reports | HU-ADMIN-001 | — | admin-service | 🔴 Pending |
| RF-024 | Manage promotions (create/edit/deactivate) | HU-PROMO-001 | — | TBD | 🔴 Pending |
| RF-025 | Apply promotion at payment | HU-PROMO-002 | — | TBD | 🔴 Pending |
| RF-026 | Earn/redeem loyalty points | HU-PROMO-002 | — | TBD | 🔴 Pending |

---

## RNF → Validation matrix

| RNF ID | Description | How it is validated | Status |
|--------|-------------|----------------------|--------|
| RNF-001 | Performance (p95 < 2 s) | Manual measurement with Postman | 🔴 Pending |
| RNF-002 | Availability during review sessions | Manual check before each session | 🔴 Pending |
| RNF-003 | Concurrency and data integrity | Integration tests on booking and payment | 🔴 Pending |
| RNF-004 | Security (JWT, BCrypt, roles, lockout) | Manual tests + code review | 🔴 Pending |
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
| HU-PAY-001 | Pay for a booking online | RF-013, RF-014, RF-016 | Must Have |
| HU-PAY-002 | View payment history | RF-015 | Should Have |
| HU-ADMIN-001 | Manage branches and view reports | RF-021, RF-022, RF-023 | Should Have |
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
| HU without test | None of the 19 HUs has an automated test yet | Write tests before marking any HU as Done | Whole team |
| Blocked RF | RF-003 needs an email provider, which is out of scope in `01-context/scope.md` (Out of Scope #6) | Integrate SMTP or drop the requirement | Whole team |
| Blocked RF | RF-013, RF-014 and RF-016 depend on Wompi sandbox credentials (🔴 Pending in scope.md, External dependencies) | Request the credentials | Whole team |
| Undefined service | RF-024 to RF-026 have "TBD" as their service | Decide between `payment-service` and a dedicated `promotion-service` | Backend lead |
| Documents disagree | `functional.md` lists promotions as RF-024 to RF-026, while `01-context/scope.md` places them in phase 2, outside the MVP | Decide which is correct and update the other | Whole team |
| Undefined rule | No tie-breaker is defined when several operators are equally available for the same slot (RF-008) | Define the rule before implementing automatic assignment | Backend lead |

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