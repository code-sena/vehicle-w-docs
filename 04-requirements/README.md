# 04 — Requirements

> What LavaRápido must do (functional) and how well (non-functional), the user stories they come
> from, and where each one is implemented and tested.

---

## Contents

| File | What it answers |
|------|-----------------|
| [`functional.md`](./functional.md) ⭐ | 41 functional requirements (RF-xxx): 29 with a source story and RF-027 to RF-038 built without one, with owning service and priority |
| [`non-functional.md`](./non-functional.md) | 12 non-functional requirements (RNF-xxx): performance, availability, security, observability, idempotence, fault tolerance… |
| [`user-stories.md`](./user-stories.md) | 20 user stories (HU-xxx) with Gherkin acceptance criteria, grouped by epic |
| [`traceability-matrix.md`](./traceability-matrix.md) ⭐ | RF → story → test → service → status, and every known gap |
| `_template-hu.md` | Template for a new story |

## Status at 2026-10-27 (from the traceability matrix, checked against the code)

38 of the 41 functional requirements are done and 3 are partial (RF-005: the web sends one service per
booking; RF-015: the web has no payment history screen; RF-023: reports built in the browser); none
is missing. Everything is released on `main` of the 10 repositories and deployed on the Azure server
by the continuous deployment (ADR-017). Since 2026-10-26 the customer chooses the payment mode when
booking, with a cash limit and a 30-minute deadline for digital payments (RF-005, RF-013, ADR-021).
RF-027 to RF-038 still have no user story. Of the 12 non-functional requirements, 3 are met (RNF-001,
RNF-011, RNF-012) and 9 are partial; RNF-003 now has 17 integration tests against SQL Server in the CI
of payment, but not in the other services, and RNF-004 keeps the accepted risks of ADR-020. The requirements
specification of `lavarapido-docs` (v7.8 of 2026-10-21) still counts 40 RF as implemented.

## Rules

- A requirement names the service that owns it; a frontend-only requirement says so.
- A requirement is **Done** only when the code exists and a test (or a documented manual check)
  proves it — the matrix links the test class.
- New behavior starts as a story with acceptance criteria, then a requirement, then code.

## Correlations

| Fed by | Feeds |
|---|---|
| `03-product/` (backlog, roadmap) | Stories and priorities |
| `02-domain/` | Rules referenced by the requirements (INV-xxx) |
| This section | `07-api/`, `09-microservices/`, `11-quality/` |
