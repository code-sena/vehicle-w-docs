# 15 — Project Control

> What can go wrong, and what works but still needs fixing. Reviewed at each retrospective.

---

## Contents

| File | What it answers |
|------|-----------------|
| [`risks.md`](./risks.md) | Active risks with level, strategy, mitigation and contingency; closed risks and lessons |
| [`technical-backlog.md`](./technical-backlog.md) | Technical debt found while building the system, with effort and priority |

## State at 2026-10-16

- Built and running in Docker: api-gateway (8080), security (3001), customer (3002), booking (3003),
  operations (3004), payment (3005, .NET 8) and notification (3006); web app and Android app (APK
  published from the public server).
- Tests: 647 unit and integration tests and 19 end-to-end tests pass (`11-quality/testing-strategy.md`).
- Highest risks: R-011 (public server turned on on demand), R-010 (documentation drift), R-003 (end-to-end suite still run by hand; CI covers the unit tests since 2026-10-19).
- Open technical items: TD-022 (request rate limit), TD-007 (correlation id in the
  last clients), TD-023 (audit log); see `technical-backlog.md`.

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
