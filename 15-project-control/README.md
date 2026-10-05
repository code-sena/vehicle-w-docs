# 15 — Project Control

> What can go wrong, and what works but still needs fixing. Reviewed at each retrospective.

---

## Contents

| File | What it answers |
|------|-----------------|
| [`risks.md`](./risks.md) | Active risks with level, strategy, mitigation and contingency; closed risks and lessons |
| [`technical-backlog.md`](./technical-backlog.md) | Technical debt found while building the system, with effort and priority |

## State at 2026-10-04

- Built: api-gateway, security, customer, booking, notification (286 backend tests green).
- In progress by teammates: operations-service, mobile app. Incomplete: payment-service.
- Highest risks: R-001 (operations integration), R-002 (payment), R-003 (no CI, web tests broken).
- Top technical items: TD-001 (web specs), TD-002 (preferences per account), TD-004 (gateway repo).

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
