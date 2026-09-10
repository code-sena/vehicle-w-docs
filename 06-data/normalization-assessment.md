# Normalization Assessment

The schema targets 3NF across the board, with a short list of deliberate exceptions below.
Each exception exists for a specific, named reason — not as a shortcut.

## Normalization decisions worth explaining

**`catalog.service` has no `price` column (2NF).**
Price depends on the service *and* the vehicle type together, not on the service alone.
Storing it on `service` would be a partial dependency on part of a composite key that doesn't
formally exist as a key but behaves like one. `catalog.service_price` holds the (service,
vehicle type) pair with its own price and validity range instead.

**`customer.customer` doesn't repeat `person` data (3NF).**
Name, phone, and email live once, in `security.person`. `customer` only adds what's specific
to being a customer: loyalty points, customer-since date. Copying name/phone here would create
two places for the same fact to drift out of sync — exactly what 3NF rules out.

**`execution.operator` doesn't store `person_id` (3NF — avoiding a transitive dependency).**
`operator → app_user → person` is already a path to the personal data. Storing `person_id`
directly on `operator` too would be a second path to the same fact (a transitive dependency
through `app_user`), and the two paths could contradict each other after an edit to one but
not the other.

**`reserve.business_hour` doesn't store a bay count (3NF).**
An earlier version repeated `concurrent_bays` on every one of the seven weekday rows, always
the same number — a textbook 3NF violation, since bay capacity has nothing to do with which
day of the week it is. Capacity is now obtained by counting active `reserve.service_bay` rows.

**Catalog/lookup values are 11 separate tables, not 1 generic `status` table.**
This isn't a normalization rule in the strict sense, but the same instinct applies: a shared
`status` table would let a foreign key from `reserve` accept a payment status by accident,
because nothing about the column would say otherwise. Splitting them lets the foreign key
itself be the constraint. See `modeling-conventions.md` for the full reasoning.

## Intentional denormalizations

| Where | What's duplicated | Why it's allowed | How it stays honest |
|---|---|---|---|
| `customer.customer.loyalty_points` | The sum of that customer's `loyalty_transaction` rows | Computing the balance on every screen that shows it would mean summing the whole ledger on every page load | `balance_after` on each `loyalty_transaction` row lets the cached value be reconciled against the ledger at any time |
| `reserve.reserve_service.service_price_id` → frozen price | The price at booking time, reached by reference rather than copied as a number | Needed *because* prices change over time and a reserve must keep the price it was actually charged | `catalog.service_price` rows are immutable after creation (`tr_service_price_immutable`), so the reference itself can never drift — no separate reconciliation needed |
| `promotion.reserve_promotion.applied_amount` | The discount a promotion granted, frozen at the moment it was applied | The promotion's terms can change or expire after the fact; what was actually discounted that day is a historical fact | Never recalculated — treated purely as a record, not a live value |
| `audit.audit_log.previous_data` / `new_data` | Whole-row snapshots as JSON, not normalized into typed columns | Every audited entity has a different shape; one shared table can't have one schema per entity | Deliberately schema-less by design — this is the one place in the model where "normalize it" doesn't apply, because the table's job is to store arbitrary shapes, not query them relationally |

## Non-denormalizations worth flagging (things that look like shortcuts but aren't)

- **`customer.vehicle_type.size_factor`** looks like it could drive pricing, but it's
  explicitly documented as reference-only — the UI uses it to *suggest* a price when an admin
  creates a new tariff. The real price is never derived from it; it always comes from
  `catalog.service_price`. If it were used to calculate price, that would be a second source
  of truth for the same number — the schema avoids that by keeping it inert.
- **`reserve.reserve` has no `total` column.** It's fully derived — from `reserve_service` +
  `service_price`, minus `reserve_promotion` and `points_discount_amount` — on purpose, so
  there's never a stored total that can go stale relative to its inputs.
