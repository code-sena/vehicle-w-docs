# ADR-010 — Data Model vs Frontend Alignment

- **ID:** ADR-010
- **Date:** 2026-09-29
- **Status:** Accepted
- **Authors:** Development team

---

## Context

The Angular frontend was built first with mock data, and the SQL Server model
(`lavarapido-6-services-sqlserver.sql`, `06-data/models.md`) was designed in parallel. When the
first backend service (`security-service`) was connected, a screen-by-screen review found fields
the screens use that the model does not store, and screens built on rules the model deliberately
does not follow.

This has to be settled before building `customer-service`, `booking-service`,
`operations-service` and `payment-service`: each gap is cheap to fix now (mock data, empty
tables) and expensive once real data exists.

**Known constraints:**
- The `security` core schema is shared with the instructor's reference DDL: existing tables
  (`person`, `app_user`, ...) must not be altered. New data goes into new tables.
- Every schema keeps a single owning service (ADR-003, ADR-009).
- Three-person academic team: prefer removing UI over adding infrastructure (email delivery,
  invitation flows) that the current scope does not need.

---

## Decision

**We decided:** resolve each gap case by case, with one rule: **the data model owns business
rules and legal obligations; the frontend owns presentation.** When a screen needs data the
business really uses, the model changes. When a screen invented a rule, or the model already
expresses it better, the frontend changes.

### Model changes (the frontend is right)

| Gap | Change | Owning service |
|---|---|---|
| Legal consent (Law 1581 of 2012) is not recorded | New table `security.user_consent` (type, document version, accepted_at, IP) | security |
| Vehicle model is not stored | Add `model` to `customer.customer_vehicle` | customer |
| User address is not stored | New table `security.person_address` (does not touch `person`) | security |
| Business data covers 7 of ~20 fields (tax regime, DIAN resolution, invoice range, social links...) | Extend `booking.establishment` with the fields needed on receipts and the help screen | booking |
| A bay cannot be "under maintenance" | Replace `service_bay.is_active` with a bay-status catalog (ACTIVE, MAINTENANCE, INACTIVE) | booking |
| Operator reassignment is overwritten (one `service_execution` row per line) | New table `execution.service_reassignment` (from/to operator, reason, who, when) | operations |
| One notification flag vs three toggles (push, email reminder, promotions) | Split `user_preference.notifications_enabled` into three flags | security |
| No lunch break per day | Add `break_starts_at` / `break_ends_at` to `booking.business_hour` | booking |
| Operator specialty is not stored | Add `specialty` to `execution.operator` | operations |

### Frontend changes (the model is right)

| Gap | Change |
|---|---|
| One fixed price per service (`SERVICE_PRICES`) | Price depends on the vehicle type chosen in the booking (`catalog.service_price`) |
| Promotions modelled as packages (price, duration, icon, feature list) | Combos become catalog services in a "Packages" category; promotions stay discount coupons |
| Email editable in the profile | **Amended 2026-09-30:** the email (the login) can be changed from the profile, confirmed with the current password (`PUT /users/me/email`); the new email is used to sign in from then on. A code sent to the new address may be added later to catch typos |
| Custom roles can be created | The three roles are fixed; roles and permissions are shown read-only |
| User invitations | The administrator creates the account with a temporary password |
| Delete account (profile) / delete user (admin) | Accounts are **deactivated**, never deleted: the person can no longer sign in and all their sessions are closed, while bookings, payments and ratings are kept. Profile: `POST /users/me/deactivate` (asks for the password). Admin: `PATCH /admin/users/{id}/status` |
| Operator tags, certifications and weekly goal | Removed (no business rule behind them); specialty stays |
| "Assign shift" (fixed operator per bay) | Removed — see bay decision below |
| Status codes in two languages (`AGENDADA` ... `CANCELLED`) | English codes in the database (`SCHEDULED`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW`); the frontend translates them |
| `bancolombia` and `TRANSFER` for the same method | Single code `BANK_TRANSFER` |

### Bays and operators

A bay is a physical washing spot; its count is the shop's capacity. **The bay is chosen per
booking and the operator per service execution**; operators are not tied to a bay for a whole
shift. At any moment each busy bay has one operator, but the pairing changes booking by booking.
This is how the current model already works (`booking.service_bay_id`,
`service_execution.operator_id`), so no table is added.

**Justification:** frontend changes are cheap while it runs on mock data; model changes get
expensive once real data exists, so only what the business needs goes into the model. Rules that
protect money and personal data (price per vehicle type, capped discounts, consent) stay in the
model.

### Implementation status

The booking-side changes are implemented in the booking-service Liquibase changelog (each
service migrates the shared SQL Server instance with its own changelog table):

| ADR-010 change | Where it landed |
|---|---|
| `service_bay.is_active` → `bay_status` catalog (ACTIVE, MAINTENANCE, INACTIVE, with `accepts_bookings`) | changeset `018` (the status ids 1/2/3 are seeded there) |
| `booking.business_hour` lunch break (`break_starts_at` / `break_ends_at`) | changeset `018` |
| Status codes in English (`SCHEDULED` … `NO_SHOW`), cancellation reasons in Spanish | seed `104` |
| Catalog seeds: 5 categories, 3 example services (BASIC/PREMIUM/FULL) with per-vehicle-type prices | seed `103` |
| Establishment singleton, 4 bays (BAY-04 starts in maintenance), weekly hours (Sunday inactive) | seed `109` |

`catalog` and `booking` are recreated from scratch in dev by changeset `005` (approved reset in
plan P2) so the schema always matches this ADR. `booking` intentionally keeps **no total column**:
the total is derived from `booking_service` + prices minus `points_discount_amount`, never stored.

---

## Evaluated alternatives

| Alternative | Pros | Cons | Reason for discarding |
|------------|------|------|-----------------------|
| Case by case (chosen) | Each gap fixed where it belongs; model stays normalized | Changes on both sides | — (chosen) |
| Model follows the frontend entirely | No UI rework | Imports invented rules (fixed prices, promotions as packages, editable login) and alters the shared core | Business rules would depend on mock screens |
| Frontend follows the model entirely | No migrations | Loses legally required consent and data the business needs (vehicle model, address, invoicing data) | Ignores real requirements |
| Fixed operator per bay per shift | Matches the "assign shift" modal | New assignment table; rigid scheduling | The shop moves operators between bays |

---

## Consequences

**Positive:**
- Every screen has a clear data source before its backend service is built.
- Consent proof satisfies Law 1581 of 2012.
- The shared `security` core stays identical to the instructor's DDL.

**Negative / Trade-offs:**
- Several screens lose features (custom roles, invitations, tags, certifications, shift assignment).
- Promotions and catalog screens need rework before `payment-service` and `booking-service`.

**Impact on the system:**
- Affected services: security, customer, booking, operations, payment.
- Documents that must be updated: `06-data/models.md`, `06-data/data-dictionary.md`,
  `lavarapido-6-services-sqlserver.sql`, `08-uml` ER diagrams, `02-domain` (promotion vs combo).

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Renaming status codes breaks seeds written against the old codes | Medium | Medium | Change seeds and code in the same migration; booking status id 5 stays `CANCELLED` |
| Instructor requires the original `security` DDL unchanged | Low | High | Only new tables are added to `security` |
| Team keeps building removed UI features | Medium | Low | Share this ADR before the next sprint |

---

## References

- Screen-by-screen coverage review (2026-09-29)
- `06-data/models.md`, `lavarapido-6-services-sqlserver.sql`
- Related to: ADR-001, ADR-003, ADR-006, ADR-009
