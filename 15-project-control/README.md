# 15 — Project Control

> What can go wrong, and what works but still needs fixing. Reviewed at each retrospective.

---

## Contents

| File | What it answers |
|------|-----------------|
| [`risks.md`](./risks.md) | Active risks with level, strategy, mitigation and contingency; closed risks and lessons |
| [`technical-backlog.md`](./technical-backlog.md) | Technical debt found while building the system, with effort and priority |

## State at 2026-10-06

- Built: api-gateway (8080), security (3001), customer (3002), booking (3003), operations (3004),
  notification (3006).
- Partial: payment-service (3005, .NET 8) — promotions, loyalty, events and its Docker Compose
  container pending. In progress by teammates: mobile app.
- Highest risks: R-002 (payment partial), R-003 (no CI, web tests broken); R-001 (operations) lowered to Medium.
- Top technical items: TD-001 (web specs), TD-002 (preferences per account), TD-014 (payment in Docker Compose), TD-015 (payment events).

## Rules

- A risk has an owner role, a trigger and a contingency; a risk that occurred moves to "Closed
  risks / lessons learned".
- Technical items are not user stories: they go to the sprint when they block a story, a review
  or the pipeline.

---

## Correlations

| Fed by | Why |
|--------|-----|
| `05-architecture/` | Accepted trade-offs (no Outbox, shared JWT secret) |
| `04-requirements/traceability-matrix.md` | Requirement gaps |
| `13-operations/` | Incidents that become lessons or technical items |
