# 15 — Project Control

> What can go wrong, and what works but still needs fixing. Reviewed at each retrospective.

---

## Contents

| File | What it answers |
|------|-----------------|
| [`risks.md`](./risks.md) | Active risks with level, strategy, mitigation and contingency; closed risks and lessons |
| [`technical-backlog.md`](./technical-backlog.md) | Technical debt found while building the system, with effort and priority |

## State at 2026-10-24

- Built and running in Docker: api-gateway (8080), security (3001), customer (3002), booking (3003),
  operations (3004), payment (3005, .NET 8) and notification (3006); web app and Android app (APK
  published from the public server). `v1.0.0` in 8 of the 10 repositories; payment and mobile pending.
  `develop` carries the fixes of 2026-10-22 to 2026-10-24 (128 branches merged on 2026-10-24) and
  waits for `v1.1.0`; Azure runs the `develop` of 2026-10-24 04:35, **without** the fleet round.
- Tests: 1,192 automated tests green in CI on `develop` on 2026-10-24 (backend 907, web 212, mobile 73);
  the 19 end-to-end tests passed on 2026-10-21 and the 42 functional cases on 2026-10-19
  (`11-quality/testing-strategy.md`).
- Requirements: 38 of 41 RF done, 3 partial (RF-005, RF-015, RF-023); 3 of 12 RNF met
  (`04-requirements/traceability-matrix.md`).
- Highest risks: R-012 (continuous deployment merged but never run, no secrets), R-016 (first
  deployment of the fleet round), R-017 (unpaged payments queue in the web), R-011 (public server on
  demand, at the exposition). R-013 (amounts) and R-014 (SEC-01) were closed on 2026-10-24.
- Open: one high finding (E-10 in the web) and eight medium ones (booking lock during the customer
  call, two of operations, three of the infra scripts, the inspection by link, the push in the
  background), plus the operational steps of the release; see `risks.md`. Highest technical items:
  TD-033 (first run of the continuous deployment) and TD-044 (E-10 web). The findings closed on
  2026-10-23 and 2026-10-24, each with its merge commit, and the accepted risks of ADR-020: `risks.md`.

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
