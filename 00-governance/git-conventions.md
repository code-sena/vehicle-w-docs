# Git Conventions

> **Read this document before making your first commit on the project.**

## Branch strategy

```
main          ← Stable. Merge from develop for deliveries.
  └── develop ← Integration. Merge from features (`dev` in this docs repository).
        └── feat/[description]    ← One branch per feature/user story (`feature/` also used in existing repos)
        └── fix/[description]     ← One branch per bugfix
        └── chore/[description]   ← Infrastructure, docs, dependency changes
        └── hotfix/[description]  ← Urgent fixes directly to main
```

**Repositories:** one per service (`lavarapido-security-service`, `lavarapido-customer-service`,
`lavarapido-booking-service`, `lavarapido-notification-service`, `lavarapido-api-gateway`,
`lavarapido-infra`), the web, the mobile app, and this documentation repository.

**Rules:**
- Nobody commits directly to `main`
- Features go through a branch and a PR to `develop`; a small fix (a few lines, no new behavior)
  may go straight to `develop`
- One branch = one task (do not mix different features)
- Branches are deleted after merge

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

- Use **Squash and Merge** for features (keeps `develop` history clean)
- Use **Merge Commit** for releases to `main` (preserves full history)
- **Do not** use Rebase & Merge (creates confusion in shared history)

---

## Tags and versioning

Follow [SemVer](https://semver.org/): `MAJOR.MINOR.PATCH`

```bash
# When releasing to production
git tag -a v1.2.0 -m "Release v1.2.0: add reports module"
git push origin v1.2.0
```
