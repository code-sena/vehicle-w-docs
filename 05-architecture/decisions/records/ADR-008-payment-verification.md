# ADR-008 — Payment Verification by QR and Receipt

| Field | Value |
|-------|-------|
| **ID** | ADR-008 |
| **Date** | 2026-09-10 |
| **Status** | Accepted |
| **Authors** | Juan Camilo Guilombo  — [role] |
| **Reviewers** | Brayan Patiño, Merari Urbano, Juan Camilo Guilombo — Development team |

---

## Context

`04-requirements/functional.md` states that payment happens through Wompi with Nequi, card
and PSE (RF-013), that the transaction is associated with the booking (RF-014), and that
sensitive card data is never stored because the gateway handles it (RF-016). The
architecture was drafted with Wompi as the only external system.

That is not the model the team built. `06-data` defines a `payment` schema whose title is
*payment by QR*: the customer sees the establishment's QR code, pays from their own banking
app, uploads the receipt, and the administrator verifies it. The seeded payment methods are
Efectivo, Nequi, Daviplata and Transferencia. There is no gateway anywhere in the model.

Two practical facts pushed this decision:

- Integrating a gateway requires a public callback URL, and this project only runs on the
  team's machines (`01-context/scope.md`).
- The business the project is modelled on already charges this way.

This ADR records the change explicitly, because it removes an integration that four
requirements and the whole payment section of the architecture were built around.

**Known constraints:**

- Everything runs in local Docker; no public URL for a webhook.
- The administrator is a real person who has to review each payment.
- RF-016 still applies: no sensitive payment data is stored.

---

## Decision

**We decided:** the system does **not** integrate any payment gateway. Payment happens
outside the system and is **verified inside it**.

The flow:

1. `payment-service` shows the customer the account and QR for the chosen method, from
   `payment_account`.
2. The customer pays from their own banking app. **The money never passes through our
   system.**
3. The customer uploads the receipt: image, transaction reference and the amount they
   declare (`payment_receipt`).
4. The payment moves to *En revisión*.
5. The administrator compares the receipt against the booking and approves or rejects it,
   leaving a comment and their user id.
6. `payment-service` publishes `payment.approved`, `payment.rejected` or
   `payment.under_review`, which is what drives loyalty points and notifications (ADR-004).

Cash is modelled the same way, with a `payment_account` row and no receipt required, so
that a payment always points to an account and there is no special case.

**What the architecture gains and loses:**

| | |
|---|---|
| External systems | **None.** The system context diagram has no external integration left |
| `payment-service` outbound calls | Only to `reserva-service`, to read the booking being paid |
| New requirement | Storing receipt images uploaded by customers |
| New actor in the flow | The administrator, who is now part of the payment path |

**Justification:**

- **It is buildable in the environment we actually have.** A gateway callback needs a
  public URL; a QR and an uploaded image do not.
- **The fraud controls are in the model, not improvised.** A unique filtered index allows
  only one approved payment per booking; a unique index on `transaction_reference` detects
  the same receipt being used to pay two different bookings; `reported_amount` is stored
  separately from the expected `amount` so the two can be compared.
- **RF-016 is satisfied more strongly than before.** We never receive card data because we
  never take the payment at all.
- **A rejected payment does not block the customer.** `payment` allows several rows per
  booking, so a corrected receipt is a new attempt and both stay on record.

---

## Evaluated alternatives

| Alternative | Pros | Cons | Reason for discarding |
|-------------|------|------|-----------------------|
| **A — QR plus receipt verified by the administrator (chosen)** | Works with no public URL and no gateway account; matches how the business charges today; fraud controls enforced by the database | Verification is manual, so it depends on a person; no automatic reconciliation | — (chosen) |
| **B — Wompi integration, as RF-013 states** | Automatic confirmation; no manual review; the classic answer for a payment system | Needs a public callback URL, a merchant account and sandbox credentials; not reachable from a local-only environment | Cannot be completed in the project's environment |
| **C — QR with no receipt, trusting the customer** | Simplest flow of all | Nothing proves the payment happened; the business would lose money | Not acceptable |
| **D — Record payments only as cash, at the counter** | No uploads, no images | Removes the online payment the product is supposed to offer | Contradicts the purpose of the product |

---

## Consequences

**Positive:**

- The system has no external dependency, so nothing in the demo depends on a third party
  being available.
- Every payment leaves a trail: who uploaded the receipt, who reviewed it, when, and with
  what comment.
- Cash and transfers are handled by the same flow, with two flags on
  `payment_method_type`.

**Negative / Trade-offs:**

- **A payment is not confirmed until a person reviews it.** The service can start before
  the payment is approved, or the customer can wait — that policy is not defined yet.
- The system now stores images uploaded by users, which is a new concern: size limits,
  file types and where the files live.
- Refunds (`REEMBOLSADO`) are a status change made by hand. There is no automatic refund.

**Impact on the system:**

- Documents that must be updated:
  - `04-requirements/functional.md` — RF-013, RF-014 and RF-016 describe Wompi.
  - `01-context/overview.md` and `scope.md` — Wompi is listed as the external integration
    of the project.
  - `02-domain/domain-events.md` — the payment events assume a gateway result.
  - `05-architecture/overview.md` and `security-threat-model.md` — updated in the same pass
    as this ADR.

---

## Pending decisions

- **Where receipt images are stored.** The options are a folder mounted in the
  `payment-service` container, or bytes in the database. Neither is decided, and it affects
  `deployment.md` and the backup story.
- **Maximum size and accepted formats** for a receipt image, agreed with the gateway
  (ADR-005).
- **Whether a service can start before its payment is approved.** This is still an open
  question in `02-domain/entities-and-rules.md` and it matters more now that approval
  depends on a person.

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| The administrator approves a receipt that does not correspond to the booking | Medium | High | `reported_amount` is compared against the expected amount, and the transaction reference is unique across payments |
| The same receipt is uploaded for two bookings | Medium | High | Unique index on `transaction_reference` (`06-data`, section 12) |
| Two approved payments for one booking | Low | Medium | Filtered unique index that allows only one row with `payment_status = APPROVED` per booking |
| Uploaded images fill the disk of the environment | Medium | Low | Size limit at the gateway and at `payment-service`; storage location decided as part of the pending decision above |
| The demo shows a payment stuck in review because nobody approved it | Medium | Medium | Seed an administrator account and include the approval step in the demo script |

---

## References

- `payment` schema, its tables and its fraud controls → `06-data/MODELO-DE-DATOS.md`, section 12
- Charge flow → `06-data/MODELO-DE-DATOS.md`, section 14
- Current payment requirements → `04-requirements/functional.md` (RF-013 to RF-016)
- Events published by this service → ADR-004
- Upload path through the gateway → ADR-005
- Threats and accepted risks → `05-architecture/security-threat-model.md`