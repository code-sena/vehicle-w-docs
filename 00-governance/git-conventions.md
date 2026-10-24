# Git Conventions

> **Read this document before making your first commit on the project.**

## Branch strategy

```
main          ← Stable. Merge from develop for deliveries.
  └── develop ← Integration. Merge from features (this documentation repository integrates on `docs`).
        └── feat/[description]    ← One branch per feature/user story (`feature/` also used in existing repos)
        └── fix/[description]     ← One branch per bugfix
        └── chore/[description]   ← Infrastructure, docs, dependency changes
        └── hotfix/[description]  ← Urgent fixes directly to main
```

**Repositories:** one per service (`lavarapido-security-service`, `lavarapido-customer-service`,
`lavarapido-booking-service`, `lavarapido-operation-service`, `lavarapido-payment-service`,
`lavarapido-notification-service`, `lavarapido-api-gateway`), `lavarapido-infra`, the web
(`Front-end-proyecto-web`), the mobile app (`LavadoVehicular-Movil`), this documentation repository
and the evidence repository (`lavarapido-docs`, working branch `main`).

**Rules:**
- Nobody commits directly to `main`
- Features go through a branch and a PR to `develop`; a small fix (a few lines, no new behavior)
  may go straight to `develop`
- One branch = one task (do not mix different features)
- Branches are pushed and kept on GitHub after the merge, as a record of the work

---

## Branch naming format

```
[type]/[description-in-kebab-case]

Examples:
feat/oauth2-login
fix/schedule-overlap-calculation
chore/update-spring-dependencies
hotfix/null-token-expiration
```

---

## Commit format (Conventional Commits)

```
[type]([scope]): [lowercase description, imperative mood, no trailing period]

[optional body — explain WHY, not what]

[optional footer — issue/user story references]
```

**Types:**
| Type | When to use |
|------|-------------|
| `feat` | New functionality |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, whitespace (no logic change) |
| `refactor` | Code refactoring without behavior change |
| `test` | Add or modify tests |
| `chore` | Tooling, dependencies, CI |
| `perf` | Performance improvement |

**Examples:**
```
feat(iam): implement JWT login

fix(scheduling): correct schedule overlap validation
Closes #42

docs(api): update actor service OpenAPI contract

chore(deps): upgrade Spring Boot to 3.2.0
```

---

## Pull Request policy

- **Size:** maximum 400 lines of code (excluding tests). If larger, split it.
- **Reviewers:** minimum 1 approval before merging
- **Review time:** reviewer has a maximum of 24 business hours
- **Template:** use the template at `.github/pull_request_template.md`
- **Green CI:** merge only proceeds if the GitHub Actions check of the branch passes (`10-devops/ci-cd.md`); run the tests locally before pushing to avoid a red check

---

## Merge policy

- Code repositories: pull `develop` with `--ff-only`, then `git merge --no-ff <branch>` into `develop`, so each branch stays visible in the history
- This documentation repository: the branch is merged into `docs`; `lavarapido-docs` merges into `main`
- Use **Merge Commit** for releases to `main` (preserves full history)
- **Do not** use Rebase & Merge on shared branches (creates confusion in shared history)

---

## Tags and versioning

Follow [SemVer](https://semver.org/): `MAJOR.MINOR.PATCH`

State on 2026-10-23: `v1.0.0` is tagged on `main` in 8 code repositories (api-gateway, security,
customer, booking, operations, notification, infra and web), released through a reviewed pull request
`develop` → `main`. payment-service and the mobile app are still without it. The fixes merged into
`develop` after the release go out as `v1.1.0`.

```bash
# When releasing to production
git tag -a v1.2.0 -m "Release v1.2.0: add reports module"
git push origin v1.2.0
```
