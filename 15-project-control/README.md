# 15 — Project Control

> What can go wrong, and what works but still needs fixing. Reviewed at each retrospective.

---

## Contents

| File | What it answers |
|------|-----------------|
| [`risks.md`](./risks.md) | Active risks with level, strategy, mitigation and contingency; closed risks and lessons |
| [`technical-backlog.md`](./technical-backlog.md) | Technical debt found while building the system, with effort and priority |

## State at 2026-10-23

- Built and running in Docker: api-gateway (8080), security (3001), customer (3002), booking (3003),
  operations (3004), payment (3005, .NET 8) and notification (3006); web app and Android app (APK
  published from the public server). `v1.0.0` in 8 of the 10 repositories; payment and mobile pending.
  `develop` already carries the fixes of 2026-10-22 and 2026-10-23 and waits for `v1.1.0`.
- Tests: 838 automated tests green in CI on `develop` on 2026-10-23 (backend 679, web 146, mobile 13);
  the 19 end-to-end tests passed on 2026-10-21 and the 42 functional cases on 2026-10-19
  (`11-quality/testing-strategy.md`).
- Requirements: 30 of 41 RF done, 11 partial; 3 of 12 RNF met (`04-requirements/traceability-matrix.md`).
- Highest risks: R-012 (continuous deployment never run, CD-01), R-011 (public server on demand, at
  the exposition), R-013 (booking and payment amounts, BIZ-01/BIZ-02), R-014 (SEC-01).
- Open technical items with the highest priority: TD-033 (continuous deployment), TD-029 (SEC-01),
  TD-030 (OPS-01), TD-031 (BIZ-01), TD-032 (BIZ-02); see `technical-backlog.md`. Findings closed on
  2026-10-23, with their commits, and the accepted risks of ADR-020: `risks.md`.

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
