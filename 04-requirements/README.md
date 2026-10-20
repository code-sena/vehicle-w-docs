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

## Status at 2026-10-20 (from the traceability matrix)

40 of the 41 functional requirements are done; RF-023 (consolidated reports for a chosen period)
is partial. RF-027 to RF-038 still have no user story. Of the 12 non-functional requirements, 5
are met and 7 are partial (see the matrix).

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
