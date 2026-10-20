# ADR-015 — Loyalty Points, Promotions, Fixed-Role Permissions and Per-Booking Bays

- **ID:** ADR-015
- **Date:** 2026-10-07 (amended 2026-10-08: section 5)
- **Status:** Accepted
- **Authors:** Development team

---

## Context

Four features were built on top of `booking-service` while real traffic against `operation-service`
and `payment-service` was still being wired up: a fixed operator-per-bay assignment, a
promotions-as-fixed-price-package model, and a free-form "custom roles" catalog. A review against
already-accepted **ADR-010** (bays/operators, promotions, roles) and the just-updated
`12-ux-ui/navigation-map.md` found that three of those four features contradicted decisions already
on record. The team was asked before anything else was touched, and gave a final, more specific
shape for each of the four areas, partly reaffirming ADR-010 and partly amending it. This ADR
records that final shape and supersedes the conflicting parts of ADR-010 without reopening the
parts that still hold.

---

## Decision

### 1. Bays and operators — ADR-010 reaffirmed, now implemented

ADR-010 already decided "the bay is chosen per booking and the operator per service execution;
operators are not tied to a bay for a whole shift" and that no new table was needed
(`booking.service_bay_id`, `service_execution.operator_id` already carry this). That decision had
not been surfaced in any UI yet. This ADR confirms it stands exactly as written and adds the
read side: `operation-service`'s `GET /api/v1/admin/assignments` now returns each assignment's bay
(`BookingSnapshot.Bay`, sourced from `booking-service`'s existing `BookingResponse.bay`), so admin
and operator screens can show "which operator is in which bay" per active booking without any new
table. A fixed "assign shift" feature, if it existed anywhere in either frontend, is removed.

### 2. Roles — ADR-010 reaffirmed, implemented on the schema that already existed for it

ADR-010 said "the three roles are fixed; roles and permissions are shown read-only." This session's
earlier work built a parallel, disconnected `security.custom_role` catalog (free-text name,
comma-separated permission text) that had no effect on real authorization and let the admin create
or delete arbitrary roles — a direct contradiction. It is removed (migration `026`, which also drops
that table).

The three roles stay fixed (`security.role`, seeded `ADMIN`/`OPERATOR`/`CLIENT`). What changes from
"read-only" to "editable" is the **permission assignment** per role, using
`security.permission`/`security.role_permission` — tables that existed since the original schema
(migration `002`) but that no code had ever read or written until now. The admin screen now picks
one of the three roles (no free-text name) and checks/unchecks permissions for it
(`GET`/`PUT /api/v1/admin/roles-permissions`). This has **no effect on real authorization yet**: the
JWT's role claim (`RoleCode`, ADR-006) is still what every `@PreAuthorize`/gateway route checks: the
permission matrix is, for now, informational/future-facing, same as ADR-010 originally scoped it.

### 3. Promotions — ADR-010 amended

ADR-010 said promotions should stay pure discount coupons and that the "promotions as fixed-price
packages" model should be dropped in favor of combos becoming catalog services. This session's work
had already built the opposite (package display: price, duration, icon, featured, benefits list;
`promotion.promotion.price`/`duration_minutes`/`icon`/`featured`/`benefits`, migration `017`,
payment-service). The team's final instruction keeps that package-style **display**, because the
screens built on it work and look right — but the underlying discount is now a **real, applied
discount**, not a display-only price:

- `promotion.promotion.required_points` (migration `018`): the loyalty-point threshold that must be
  accumulated before the coupon is redeemable. 0 means no point gate.
- The discount itself reuses the existing `discount_type_id`/`discount_value` columns (present since
  migration `004`, previously hijacked to hold `PACKAGE` + the display price): it is now always
  `PERCENT` with `discount_value` holding the percentage (1–100; 100 = free), applied to the
  booking's total at redemption time, capped at the remaining total.
- Redemption (`POST /api/v1/loyalty/redeem` in payment-service): validates the coupon is active, in
  its date range, and that the customer's current loyalty balance (from the ledger, see below) meets
  `required_points`; records the redemption in `promotion.booking_promotion`; the applied amount is
  subtracted from what the customer is actually charged when they report or the admin registers the
  payment. Redeeming a coupon does **not** spend/consume loyalty points — points unlock the
  promotion, they are not a wallet that gets drawn down (see loyalty decision below).
- A successful redemption publishes `PromotionRedeemed` on `carwash.events` (same envelope and
  exchange as the Java services, ADR-004/ADR-011); `notification-service` turns it into an in-app
  notification and an email with the promotion's name and a confirmation message
  (`NotificationTypeCode.PROMOTION_REDEEMED`, migration `025`).
- The icon picker (web and mobile) renders the actual icon, not just its stored name, and the
  "Destacada"/"Activo" badges on the promotion card are vertically aligned. Both are presentation
  fixes with no backend counterpart.

### 4. Loyalty points — new, following the existing (dormant) ledger

`payment.loyalty_transaction`/`loyalty_movement_type` existed since migrations `013`–`014` but
nothing read or wrote them; `02-domain/domain-map.md` already specified the ledger as the
authoritative balance (never a denormalized customer field) and explicitly left the earning/
redemption formula to "the current requirements and data model" rather than inventing one — this
ADR is that formula:

- **Earning:** each catalog service carries its own `loyalty_points` value
  (`catalog.service.loyalty_points`, booking-service migration `022`, admin-editable in
  Gestión > Servicios — not a flat COP-based rate). `BookingLine` snapshots the service's points at
  booking time (same pattern as price); `Booking.totalLoyaltyPoints()` sums them, exposed on
  `BookingResponse.totalLoyaltyPoints`. When payment-service approves a payment
  (`PaymentCommandService.ApproveAsync` / `RegisterInPersonAsync`), it credits that many points as
  an `EARNED` row in `payment.loyalty_transaction`, idempotent per `(customerId, bookingId)`.
- **Balance:** the customer's current balance is always the `balance_after` of their latest ledger
  row (0 if none) — read live, never cached on a customer table.
  `customerId` in the ledger holds the same security `user_id` that booking-service already exposes
  as `ownerUserId`: no other service exposes `customer-service`'s internal `customer_id` to anything
  outside itself (every cross-service contract — booking, vehicles — already keys off `user_id`), so
  requiring that id here would need a new lookup that does not otherwise exist. The column comments
  from migrations `013`/`014` ("customer.customer") are superseded by this note.
- **Spending:** points are never debited. They gate which promotions are *visible as unlocked*
  (`balance >= required_points`); the client dashboard's loyalty section and the payment screen's
  coupon field both read `GET /api/v1/loyalty/promotions` (balance + per-promotion `unlocked` flag)
  and `GET /api/v1/loyalty/balance`. This is implemented identically on web and mobile.
- `payment-service` gained its first RabbitMQ producer (`RabbitMQ.Client`, `IDomainEventPublisher`)
  for the `PromotionRedeemed` event, gated by `MESSAGING_ENABLED` exactly like the Java services'
  `app.messaging.enabled`, so it is a no-op until that flag and RabbitMQ are actually turned on.

### 5. Amendment 2026-10-08 — visible points, "coupon unlocked" notice, simpler promotion form

Instructor review and team request after section 4 went live:

- **Points are visible end to end.** The administrator sets each service's points in the service
  form (web `ServiceModal`, mobile `ServiceFormModal`); both frontends always send
  `ServiceRequest.loyaltyPoints`, because booking-service binds it to a primitive `int` and an
  omitted field would silently reset the points to 0 on every edit. The customer sees each service's
  points when booking ("Suma N puntos") and in the booking summary, on web and mobile.
- **The customer is told when points arrive and when a coupon unlocks.** When an approval
  (`ApproveAsync`) or an in-person payment (`RegisterInPersonAsync`) credits points,
  `LoyaltyRewardService` also returns the promotions that this credit unlocks
  (`Promotion.IsUnlockedBy(pointsBefore, pointsAfter, today)`: available today, not reached before,
  reached now), and payment-service publishes `LoyaltyPointsEarned`
  (`payment.loyalty_points_earned`) right after `payment.confirmed`. notification-service turns it
  into "Ganaste N puntos" (inbox only) plus one "¡Tienes un cupón canjeable!" per unlocked coupon,
  with its code (inbox and email). Contract and email rule: ADR-011 section 11.
- **Points are credited when the payment is approved, not when the operator finishes the service.**
  Section 4 already tied earning to the payment because payment-service is the only place that knows
  the booking was paid; crediting at completion would let an unpaid booking earn points. The notice
  therefore reaches the customer when the administrator approves the payment (or registers it in
  person).
- **The promotion form only asks for what has an effect.** "Promotional price", "duration" and
  "status" are removed from the web and mobile forms: the coupon is a percentage discount on the
  booking (section 3), and the status is computed by payment-service from the start date and the
  pause flag (paused or resumed from the promotion card). `price` and `duration_minutes` become
  optional in the API (`SavePromotionRequest`, `PromotionDefinition`; validated only when sent); the
  columns were already nullable since migration `017`, so no migration is needed. The promotion card
  now shows the discount and the points needed instead of a price.

- **"Pay" is offered only when payment-service would accept the payment.** The customer's history
  asked for "Pay" on bookings that were already paid or under review. payment-service now answers,
  per booking of the caller, the latest payment status and `payable`
  (`GET /api/v1/payments/me/bookings`, `PaymentPolicy.CanReportPayment`: payable booking status, no
  approved payment and no pending or in-review one, the same rule `BookingPaymentGuard` applies when
  reporting). The web and the app show the button with that flag and do not repeat the rule; if
  payment-service does not answer, the button is hidden, because paying would fail anyway.

This amendment resolves the "display price vs. real discount" trade-off listed under Consequences
and its risk row: the display price is no longer entered or shown.

**Note checked against the code on 2026-10-20.** The discount is no longer only a percentage: the
promotion form accepts `PERCENT` or `FIXED` (`DiscountTypeCodes.ParseEditable`), each calculated by its
strategy (`PercentageDiscountStrategy`, `FixedAmountDiscountStrategy`) with an optional maximum and
never more than the amount due. Old `PACKAGE` rows cannot be redeemed until the admin edits them.

---

## Evaluated alternatives

| Alternative | Pros | Cons | Reason for discarding |
|---|---|---|---|
| Revert promotions to pure ADR-010 coupons (drop package display) | Matches ADR-010 literally | Throws away working, already-built screens the team wants to keep | Team explicitly asked to keep the package display |
| Direct points→money redemption (spend points for a cash discount) | Simpler mental model | Does not match "points unlock tiers/promotions" the team described; collides with the dormant `pointsRedeemed`/`pointsDiscountAmount` booking-level fields, which are a *different*, still-unused mechanism | Team's description was explicitly tier/unlock-based |
| New `customer_id`-resolution endpoint in customer-service, to satisfy the `loyalty_transaction.customer_id → customer.customer` comment literally | Matches the original column comment | New cross-service contract for an id nothing else in the system currently needs or exposes | Not worth the new coupling; `user_id` is already the de facto customer identity everywhere else |
| Keep `security.custom_role` and only stop exposing create/delete in the UI | Less code to remove | Dead, disconnected catalog stays in the schema; `security.role_permission` (the table actually meant for this) stays unused | Replacing it is strictly simpler and uses schema that already existed for exactly this |

---

## Consequences

**Positive:**
- The loyalty ledger, `security.permission`/`role_permission`, and the per-booking bay field on
  `AssignmentView` were all dormant, pre-existing schema/contract surface with zero consumers before
  this ADR; all three are now load-bearing instead of dead weight.
- Web and mobile read the same four new/changed payment-service and security-service endpoints, so
  both platforms stay in lockstep by construction rather than by separately re-implementing a rule.
- `promotion.promotion`'s `discount_type_id`/`discount_value` go back to meaning what their own
  constraints (`ck_promo_value`, the FK to `discount_type`) always implied, instead of being
  hijacked to hold a display price.

**Negative / Trade-offs:**
- `promotion.promotion` now carries both display-only fields (`price`, `duration_minutes`, `icon`,
  `featured`, `benefits`) and the real discount fields (`discount_type_id`, `discount_value`,
  `required_points`) on the same row; they are not kept in sync with each other by any constraint
  (e.g. nothing stops an admin from setting a 100% discount on a promotion displayed as a cheap
  package). Acceptable for the current scope; a future ADR should decide whether to split the table
  if the mismatch becomes a real product problem.
- Role permissions are editable but **not enforced**: `security.role_permission` has no effect on
  any `@PreAuthorize` or gateway rule yet. Wiring real per-permission authorization is out of scope
  for this ADR and would need its own review (every protected endpoint would need to declare which
  permission it requires, not just which role).
- `payment-service`'s new RabbitMQ dependency (`RabbitMQ.Client`) is the service's first messaging
  code; `BOOKING_SERVICE_URL` was also found missing from `lavarapido-infra/docker-compose.yml`
  (pre-existing gap, unrelated to this ADR, fixed alongside it since the loyalty-crediting path
  needs it to work in a containerized deploy).

**Impact on the system:**
- Affected services: booking, operations, payment, notification, security; web and mobile frontends.
- Documents updated alongside this ADR: `06-data/migration-strategy.md` (migration-number table),
  `06-data/models.md` and `lavarapido-6-services-sqlserver.sql` (new/changed columns and tables),
  `04-requirements/functional.md` (RF-026 implementation note).

---

## Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| A promotion's display price and its real discount percent drift apart and confuse the customer | Medium | Low | Admin screen shows both fields side by side when editing; revisit if it becomes a real complaint |
| `MESSAGING_ENABLED=false` by default means redemption notifications silently don't fire until someone turns RabbitMQ on in an environment | Medium | Medium | Same default as every other service already in the system; documented here and in the docker-compose comment added next to the flag |
| Role permissions editable but unenforced could be mistaken for real access control by a future reader of the admin screen | Low | Medium | Stated explicitly in this ADR and in the controller's Javadoc |

---

## References

- Supersedes, in part: ADR-010 (promotions section only; bays and roles sections reaffirmed)
- Related to: ADR-004 (service communication), ADR-006 (auth), ADR-009 (service decomposition),
  ADR-011 (notification events), ADR-014 (operations/booking integration)
- `02-domain/domain-map.md` (Promotions & Loyalty bounded context, written before this ADR and
  already consistent with it)
- Team decision captured in chat, 2026-10-07; amendment requested after the instructor's review,
  2026-10-08
