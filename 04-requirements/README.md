# 04 — Requirements

> What LavaRápido must do (functional) and how well (non-functional), the user stories they come
> from, and where each one is implemented and tested.

---

## Contents

| File | What it answers |
|------|-----------------|
| [`functional.md`](./functional.md) ⭐ | 29 functional requirements (RF-xxx), with owning service, source story and priority |
| [`non-functional.md`](./non-functional.md) | 10 non-functional requirements (RNF-xxx): performance, availability, security, observability… |
| [`user-stories.md`](./user-stories.md) | 20 user stories (HU-xxx) with Gherkin acceptance criteria, grouped by epic |
| [`traceability-matrix.md`](./traceability-matrix.md) ⭐ | RF → story → test → service → status, and every known gap |
| `_template-hu.md` | Template for a new story |

## Status at 2026-10-04 (from the traceability matrix)

10 Done · 10 In progress · 16 Pending (most wait for operations-service and payment-service) ·
1 Cancelled. Known gaps called out in the matrix: login attempt limit (RF-004b) and theme/language
per account (RF-019/020).

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
