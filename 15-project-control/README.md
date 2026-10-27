# 15 — Project Control

> What can go wrong, and what works but still needs fixing. Reviewed at each retrospective.

---

## Contents

| File | What it answers |
|------|-----------------|
| [`risks.md`](./risks.md) | Active risks with level, strategy, mitigation and contingency; closed risks and lessons |
| [`technical-backlog.md`](./technical-backlog.md) | Technical debt found while building the system, with effort and priority |

## State at 2026-10-27

- Built and running in Docker: api-gateway (8080), security (3001), customer (3002), booking (3003),
  operations (3004), payment (3005, .NET 8) and notification (3006); web app and Android app (APK
  published from the public server). The 10 repositories have their release on `main` (api-gateway,
  security, operations and notification `v1.1.0`; customer and booking `v1.1.1`; payment, infra, web and
  mobile `v1.1.2`), `main` is protected in all of them, and Azure runs `main`, updated by the continuous
  deployment on every merge (2026-10-26 and 2026-10-27 succeeded).
- Tests: 1,337 automated tests green in CI on `main` on 2026-10-27 (backend 989, web 242, mobile 106;
  payment's 17 integration tests run against SQL Server in CI); the 19 end-to-end tests passed 19/19 on
  2026-10-27 and the 42 functional cases on 2026-10-19 (`11-quality/testing-strategy.md`).
- Requirements: 38 of 41 RF done, 3 partial (RF-005, RF-015, RF-023); 3 of 12 RNF met
  (`04-requirements/traceability-matrix.md`).
- Highest risks: R-017 (unpaged payments queue in the web) and R-011 (public server on demand, at the
  exposition, without uptime monitor). R-012 (first continuous deployment) and R-016 (first deployment
  of the fleet round) were closed on 2026-10-27; R-013 and R-014 on 2026-10-24.
- Open: one high finding (E-10 in the web) and eight medium ones (booking lock during the customer
  call, two of operations, three of the infra scripts, the inspection by link, the push in the
  background), plus the items found on 2026-10-27: restricting the Firebase key (H-09), the uptime
  monitor (H-15), the sample legal contact data, the OpenAPI export (H-23) and the booking pagination;
  see `risks.md`. Highest technical item: TD-044 (E-10 web). The findings closed on 2026-10-23 and
  2026-10-24, each with its merge commit, and the accepted risks of ADR-020: `risks.md`.

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
