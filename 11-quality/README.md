# 11 — Quality

> How the team makes sure LavaRápido works and keeps working as it changes: automated tests per
> service, manual end-to-end runs, and pull-request review.

---

## State today (2026-10-23)

| Item | State |
|---|---|
| Backend automated tests | 679, all green in CI on `develop` on 2026-10-23: Java 528 (security 171, customer 71, booking 60, operations 72, notification 115, api-gateway 39) + payment .NET 151 (plus 7 persistence tests that skip themselves without SQL Server) |
| Web automated tests | 146 Vitest tests in 59 spec files, green in CI on 2026-10-23 |
| Mobile automated tests | 13 jest-expo tests in 3 suites (added 2026-10-23), plus `tsc --noEmit` |
| End-to-end | 19 automated tests in `lavarapido-infra/e2e`, all green on 2026-10-21; the 42 functional cases passed on 2026-10-19 |
| CI | GitHub Actions in the 10 repositories, 838 tests per run (`10-devops/ci-cd.md`) |
| Coverage tool | None yet |

Details, tiers, tools and gaps → [`testing-strategy.md`](./testing-strategy.md).

---

## Contents

| File | What it answers |
|------|-----------------|
| [`testing-strategy.md`](./testing-strategy.md) | Which tests exist, what each protects, how to run them, gaps |
| [`tdd-guide.md`](./tdd-guide.md) | How to write a test first, with the conventions used in this project |

---

## Pull-request review checklist

A reviewer checks, besides "it works":

1. `./mvnw test` (payment: `dotnet test`; web: `ng build`) passes locally; new rules have a test.
2. Business rules live in the backend domain/use cases, not in the frontend.
3. Identifiers in English, code comments in Spanish, docs in English (ADR-001).
4. No secrets in the diff (`.env`, passwords, keys); new variables added to `.env.example`.
5. New tables/columns come with a Liquibase changeset and an update of `06-data/models.md`.
6. New endpoints appear in the exported OpenAPI (`07-api/contracts/openapi/`) and in the gateway
   routes if they are public.
7. Errors use RFC 9457 with a `code`, and the web has the `API_ERRORS.<code>` translation in the
   4 languages.

---

## Correlations

| This section is fed by... | And feeds into... |
|---------------------------|-------------------|
| `04-requirements/traceability-matrix.md` → what to test | Tests per RF |
| `07-api/contracts/openapi/` → API contracts | Web/API slice tests |
| `00-governance/definition-of-done.md` | Review checklist |
| `10-devops/` | How to start the system for end-to-end runs |
