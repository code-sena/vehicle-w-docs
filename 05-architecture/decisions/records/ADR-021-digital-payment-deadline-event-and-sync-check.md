# ADR-021 — Digital Payment Deadline: Event Plus a Synchronous Check Before Cancelling

- **ID:** ADR-021
- **Date:** 2026-10-26
- **Status:** Accepted
- **Authors:** Development team

---

## Context

While preparing the final exposition the team asked what stops a bot or a person from making many
bookings and blocking the schedule. There was a rate limit on `/auth` (60 requests per minute per IP,
lockout after 5 failures), the capacity of the bays and the rule that a vehicle cannot hold
overlapping bookings, but there was no limit per client and no obligation to pay. Following the
instructor's suggestion, the client now chooses how they will pay when booking (`paymentMode` =
`DIGITAL` or `CASH`, INV-BOOK-010), cash bookings are limited (INV-BOOK-011) and a `DIGITAL` booking
has a payment deadline: `min(creation + BOOKING_PAYMENT_WINDOW (30 min), scheduled start)`
(INV-BOOK-012). When the deadline passes without a reported payment, the booking is cancelled with the
reason `PAYMENT_TIMEOUT` and the time slot is released.

The payment lives in payment-service and the deadline in booking-service, so booking has to learn
that the client reported the payment. payment-service now publishes `PaymentReported`
(`payment.reported`) when the client reports a payment with a receipt, and booking consumes it (and
`payment.confirmed`) in the queue `booking.payment-events` to set `payment_reported_at`.

The services publish **without an Outbox** (H-11, ADR-020): the event goes to RabbitMQ after the
commit and, if that fails, it is only logged. In the live test of 2026-10-26 this happened: with
payment-service unable to reach RabbitMQ (on Windows .NET resolved `localhost` to IPv6 and the AMQP
connection was cut), the `payment.reported` notice was lost and the first version of
`PaymentDeadlineJob` cancelled a booking that **had** been paid.

**Known constraints:**
- No Outbox in version 1 (ADR-020); adding one means a table, a relay job and deduplication in two
  languages, days before the exposition.
- Cancelling a paid booking is the worst outcome: the client loses the time slot and the money has to be
  returned by hand.
- payment-service had no internal routes and validated no `X-Internal-Key`.

---

## Decision

**We decided:** keep the event as the normal path and, **before cancelling**, ask payment-service
synchronously whether the booking has a payment. Cancel only when payment-service explicitly answers
that there is none.

- payment-service exposes `GET /internal/v1/payments/bookings/{bookingId}/reported` → 200
  `{"bookingId": 123, "reported": true}`; `reported` is true when the booking has a payment `IN_REVIEW`
  or `APPROVED`. It requires `X-Internal-Key` = `INTERNAL_API_KEY` (`InternalApiKeyAuthenticationHandler`,
  401 without the key or with a wrong one, a user JWT is never accepted) and the gateway does not route it.
- booking-service calls it through the out port `PaymentStatusDirectory` (adapter
  `PaymentServiceDirectory`, `PAYMENT_SERVICE_URL`, timeout 3 s, with the internal key).
  `PaymentDeadlineJob` runs every `BOOKING_PAYMENT_EXPIRY_INTERVAL` (60 s) over the overdue DIGITAL
  bookings without a report (`ix_booking_payment_pending`), and for each one:
  - `reported = true` → marks the booking as reported (`Booking.markPaymentReported`) and does not cancel it;
  - `reported = false` → cancels it the usual way (`BookingCancelled` with `reasonCode` `PAYMENT_TIMEOUT`);
  - no answer, an error or an answer without `reported` (`PAYMENT_SERVICE_UNAVAILABLE`) → does not cancel
    it in that round and looks again in the next one.
- The question is asked **before** taking the schedule lock, so the lock is not held while waiting for
  payment; the booking is then read again with the lock held.

**Justification:** the event keeps the screens up to date within seconds (`paymentReported` arrived in
about 5 s in the test), and the synchronous check makes the one irreversible action, cancelling, depend
on payment's own data instead of on a notice that may have been lost. It is a small change in two
services and does not need the Outbox.

---

## Evaluated alternatives

| Alternative | Pros | Cons | Reason for discarding |
|------------|------|------|-----------------------|
| Event plus a synchronous check before cancelling — chosen | The normal path stays asynchronous; a lost event can no longer cancel a paid booking; small change | booking depends synchronously on payment to cancel; one extra call per overdue booking | — (chosen) |
| Only the event | No coupling between booking and payment; simplest | Without an Outbox a lost `payment.reported` cancels a paid booking. It happened in the live test | Wrong result in exactly the case that matters |
| Implement the Outbox in payment-service | The event is not lost; booking needs nothing else | Table, relay job and deduplication in .NET, plus testing, days before the exposition; still eventual (a late event can arrive after the deadline) | Too much for the time left (same reason as ADR-020); can be added later and the check still helps |
| Cancel without checking (a lost event is accepted) | No dependency | Cancels paid bookings; the admin has to restore them and the client loses the time slot | Not acceptable for the client |

---

## Consequences

**Positive:**
- A lost or dead-lettered `payment.reported` (or `payment.confirmed`) can no longer cancel a booking that
  was paid: in the test with payment cut from RabbitMQ the paid booking was not cancelled, because the job
  asked payment.
- If payment-service is down nothing is cancelled ("not cancelled this round:
  PAYMENT_SERVICE_UNAVAILABLE"); when it came back, the job cancelled the unpaid booking in the next round.
- payment-service now has internal routes with a real key check.

**Negative / Trade-offs:**
- booking-service depends **synchronously** on payment-service to cancel for `PAYMENT_TIMEOUT`.
- **If payment-service does not answer, no booking is cancelled:** an unpaid DIGITAL booking keeps its time
  slot for as long as payment is down (or `INTERNAL_API_KEY` differs between the two services: payment
  answers 401). The deadline is a soft limit in that case.
- One extra HTTP call per overdue booking each minute (at most a few per minute in this shop).
- The window between the deadline and the cancellation is up to one job interval (60 s) plus the call.

**Impact on the system:**
- Affected services: booking-service (migration 049, seed 117, `PaymentPolicy`, `PaymentDeadlineJob`,
  `PaymentEventsListener`, `PaymentStatusDirectory`), payment-service (`PaymentReported`, internal route,
  `InternalApiKeyAuthenticationHandler`), infra (`BOOKING_*`, `PAYMENT_SERVICE_URL`, `INTERNAL_API_KEY` in
  payment), web and mobile (payment step of the booking wizard).
- Documents updated: `02-domain/entities-and-rules.md`, `02-domain/domain-events.md`,
  `05-architecture/cross-cutting.md` §7, ADR-011 §17, `06-data/models.md`, `06-data/migration-strategy.md`,
  the OpenAPI contracts of booking and payment, the booking and payment service documents.

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| payment-service down for a long time keeps unpaid DIGITAL bookings in the schedule | Low | Medium | The job logs it every round; the admin can cancel by hand; the job cancels them as soon as payment answers |
| Different `INTERNAL_API_KEY` in booking and payment (401) | Low | Medium | `docker-compose.prod.yml` requires the key for payment; the job logs the failure each round (`runbook.md` of booking) |
| A payment reported just after the deadline but before the job runs | Low | Low | The check asks payment at that moment, so a payment already `IN_REVIEW` keeps the booking |
| Messages stuck in `booking.payment-events.dlq` | Low | Low | The synchronous check covers them; the DLQ is visible in RabbitMQ |

---

## References

- Related to: ADR-004 (REST and RabbitMQ), ADR-008 (payment verification), ADR-011 §17 (event contract),
  ADR-020 (H-11, no Outbox).
- Rules INV-BOOK-010 to INV-BOOK-012 (`02-domain/entities-and-rules.md`).
- Code: booking-service `origin/develop` `db156cb`; payment-service `origin/develop` `d94cde5`.
- Pending (technical backlog): a lateness tolerance for cash bookings.
