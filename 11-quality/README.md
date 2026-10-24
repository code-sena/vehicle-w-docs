# 11 — Quality

> How the team makes sure LavaRápido works and keeps working as it changes: automated tests per
> service, manual end-to-end runs, and pull-request review.

---

## State today (2026-10-24)

| Item | State |
|---|---|
| Backend automated tests | 907, all green in CI on `develop` on 2026-10-24: Java 682 (security 200, customer 82, booking 95, operations 110, notification 133, api-gateway 62) + payment .NET 225 (plus 11 integration tests that skip themselves without SQL Server) |
| Web automated tests | 212 Vitest tests in 66 spec files, green in CI on 2026-10-24 (with coverage report) |
| Mobile automated tests | 73 jest-expo tests in 25 suites, plus `tsc --noEmit` |
| End-to-end | 19 automated tests in `lavarapido-infra/e2e`, all green on 2026-10-21; the 42 functional cases passed on 2026-10-19. A remote battery (`e2e/remote`, 6 test files, launched with `e2e.yml`) is merged since 2026-10-24 but has only run against a simulator (44/44), not against Azure |
| CI | GitHub Actions in the 10 repositories, 1,192 tests per run (`10-devops/ci-cd.md`) |
| Coverage tool | Web only (`@vitest/coverage-v8`, report as a CI artifact, no gate); none in the backends |

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
