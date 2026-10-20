# 11 — Quality

> How the team makes sure LavaRápido works and keeps working as it changes: automated tests per
> service, manual end-to-end runs, and pull-request review.

---

## State today (2026-10-20)

| Item | State |
|---|---|
| Backend automated tests | 612, all green on 2026-10-19: Java 464 (security 151, customer 69, booking 43, operations 55, notification 112, api-gateway 34) + payment .NET 148 (7 of them persistence tests against an isolated database). On 2026-10-20 the reverted role change took 2 tests out of security-service |
| Web automated tests | 43 Vitest tests in 37 spec files, all green |
| End-to-end | 19 automated tests in `lavarapido-infra/e2e`, all green on 2026-10-19; 42 functional cases passed the same day |
| CI | GitHub Actions in the 10 repositories (`10-devops/ci-cd.md`) |
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
