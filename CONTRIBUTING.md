# Contributing Guide

> Welcome to the team. This guide explains how to make your first contribution
> and the rules that apply to all changes in this repository.

---

## Before you start

1. Read `00-governance/README.md` — team rules
2. Read `00-governance/git-conventions.md` — how to work with Git
3. Make sure your local environment is set up: `10-devops/local-setup.md`
4. Understand the system domain: `02-domain/domain-map.md`

---

## Workflow

```
1. Pick a User Story from the sprint (status: Ready)
2. Create your branch from develop
3. Implement using TDD (Red → Green → Refactor)
4. Update affected documentation
5. Open a Pull Request using the template
6. PR is reviewed and merged by the Tech Lead
```

### Branch naming

```
feat/short-description     (feature/ is also used in existing repos)
fix/short-description
chore/short-description    (documentation changes in this repository use chore/)
```

Examples:
```
feat/booking-reminders
fix/booking-time-zone
chore/architecture-update-docs
```

---

## Pull Request process

1. **Open the PR** against `develop` (`dev` in this documentation repository; never directly against `main`)
2. **Fill in the PR template** completely (`/.github/pull_request_template.md`)
3. **Assign reviewers:** at least 1 (preferably the Tech Lead or service owner)
4. **Tests must be green** — locally and in the GitHub Actions check of the branch (`10-devops/ci-cd.md`)
5. **Do not force-push** to a branch whose PR already has comments — create new commits

### What blocks a merge

- Failing tests or build
- Fewer than 1 approval
- Documentation not updated (API, data model, domain)
- A new business rule or endpoint without a test (see `11-quality/testing-strategy.md`)

---

## Code style

- Follow `_stacks/java-spring.md` and the existing code: identifiers in English, code comments in Spanish, documentation in English (ADR-001).
- Conventional Commits are mandatory: `type(scope): description`
- One commit = one logical unit of change. Do not commit "wip" or "fixing stuff"

### Commit types

| Type | When to use |
|------|-------------|
| `feat` | New functionality |
| `fix` | Bug fix |
| `refactor` | Code improvement without behavior change |
| `test` | Add or improve tests |
| `docs` | Documentation only |
| `chore` | Build, CI, dependencies, config |
| `perf` | Performance improvement |

---

## TDD — Test-Driven Development

**Team rule:** User Stories are implemented using TDD. No exceptions.

```
1. Write the test that describes the behavior (RED — fails)
2. Write the minimum code to pass the test (GREEN — passes)
3. Refactor without breaking tests (REFACTOR)
```

See full guide: `11-quality/tdd-guide.md`

---

## Documentation

If your change:
- Adds/modifies an endpoint → re-export the OpenAPI contract (`07-api/README.md`) and, if public, add the gateway route
- Changes a data model → Liquibase changeset + `06-data/models.md` + the service's `data-model.md` + the global script `lavarapido-6-services-sqlserver.sql`
- Makes an architecture decision → write an ADR
- Adds a new microservice → update `service-catalog.md`

---

## Questions?

- Check the documentation in this repo — it's probably already answered there
- Ask in the daily stand-up or in the team channel
- If you think something is missing from the documentation, document it yourself (that is the spirit of this project)
