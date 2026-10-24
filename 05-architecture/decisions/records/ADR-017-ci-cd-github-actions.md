# ADR-017 — CI/CD with GitHub Actions and Continuous Deployment from `main`

- **ID:** ADR-017
- **Date:** 2026-10-23
- **Status:** Accepted for CI (in use in the 10 repositories). The continuous deployment part is
  **Proposed**: written in local branches, not pushed to GitHub and never run against the server.
- **Authors:** Development team

---

## Context

The system lives in 10 repositories (6 services, gateway, infra, web, mobile) owned by three
people. Until 2026-10-19 nothing checked a push automatically, and the server was updated by
whoever remembered to run `update-server.sh`. The instructors' evaluation also asks for a visible
pipeline and for releases that go through review.

**Known constraints:**
- No server for a CI tool (the plan was Jenkins) and no budget.
- The VM is turned on only on demand, so a deployment may find it off.
- Each repository has a different owner on GitHub; secrets must be created by each owner.
- The backend tests must run without SQL Server or RabbitMQ.

---

## Decision

**We decided:** to use **GitHub Actions** for both parts.

**1. Continuous integration (in use since 2026-10-19).** Every repository has `ci.yml`, run on each
push and pull request to `develop` and `main` and by hand: `./mvnw verify` (Java 21) in the six Java
repositories, `dotnet build` + `dotnet test` in payment, production build + Vitest in the web,
`tsc --noEmit` + jest-expo in the mobile app, and script/Compose/e2e syntax checks in infra.
A branch is merged into `develop` only with CI green. On 2026-10-23 the last runs on `develop` were
green with 838 tests (`10-devops/ci-cd.md`).

**2. Releases through `main`.** `develop` integrates; `main` receives a reviewed pull request and
the `v1.0.0` tag (8 of 10 repositories on 2026-10-23; payment and mobile pending). `main` is protected
in those 8.

**3. Continuous deployment from `main` (proposed).** Prepared on 2026-10-23 in the local branches
`ci/continuous-deployment` (`lavarapido-infra`) and `ci/request-deploy` (web, api-gateway, security,
operations, notification):

- When a push to `main` passes CI, the job **Pedir despliegue** dispatches `deploy.yml` of
  `lavarapido-infra` with `automatic=true` (secret `DEPLOY_DISPATCH_TOKEN`, a fine-grained token
  limited to `lavarapido-infra` with *Actions: Read and write*).
- `deploy.yml` connects with `AZURE_SSH_KEY`, a key that on the server can only run
  `deploy/ci-deploy.sh` (`restrict,command=…`), with the host key pinned. One deployment at a time
  (`concurrency: deploy-azure`); `ci-deploy.sh` waits up to 20 minutes for another update.
- `update-server.sh` pulls `main` of every repository (payment stays on `develop` until it has
  `v1.0.0`), backs up the database, rebuilds, restarts Caddy if its `Caddyfile` changed and **waits
  up to 8 minutes for every container to be healthy**; only a full, healthy update writes
  `backups/deployed-heads`.
- If the VM is off, an automatic run leaves a warning and stays green; at the next boot
  `boot-update.sh` (`@reboot`) compares `repo-heads.sh` with `deployed-heads` and updates if
  something was not deployed. A manual run with the VM off fails, so a person knows to start it.

**Justification:** Actions runs next to the code at no cost, needs no server of its own, and each
owner can see the result next to their commit. Deploying only from `main` makes the reviewed pull
request the gate for production; the boot catch-up covers the VM being off most of the time.

---

## Evaluated alternatives

| Alternative | Pros | Cons | Reason for discarding |
|------------|------|------|-----------------------|
| GitHub Actions — chosen | Free, no server, result on each commit, secrets per repository | Secrets must be created by each repository owner; runners cannot reach a VM that is off | — (chosen) |
| Jenkins (the original plan) | Full control, plugins | Needs its own always-on server and maintenance | No server and no time to maintain it |
| Deploy every push to `develop` | Faster feedback on the server | Unreviewed code in front of the instructors | `main` with a pull request is the release gate |
| Build images in CI and push them to a registry | The server stops compiling; rollback by tag | Registry, credentials and image versioning to manage | Postponed: the server builds with the Docker cache |
| Server polls GitHub by cron | No secrets in GitHub | Delay; deployments run with nobody watching the result | The dispatch gives a visible result, and the boot task already covers the VM being off |

---

## Consequences

**Positive:**
- Every push gets a ✓/✗ in minutes; 838 tests run on each `develop` change.
- Once pushed, a reviewed merge reaches the server with nobody connecting by SSH, and a broken
  container turns the deployment red instead of looking green.

**Negative / Trade-offs:**
- CI has no coverage measure nor static analysis inside the pipeline; the end-to-end suite and the
  payment integration tests stay manual.
- The continuous deployment has not been tested: today `deploy.yml` has 0 runs and 0 secrets, and the
  server still follows `develop` (CD-01).
- customer, booking and payment do not have the *Pedir despliegue* job; their changes reach the
  server with the next deployment of any repository.
- The first time, the workflow must be run twice by hand: the server still has the old scripts.

**Impact on the system:**
- Affected: the 10 repositories (`.github/workflows`), `lavarapido-infra/deploy`.
- Documents: `10-devops/ci-cd.md`, `10-devops/production.md`, `11-quality/testing-strategy.md`.

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| A merge to `main` fails red because `DEPLOY_DISPATCH_TOKEN` is missing | High until the secrets exist | Low | Create the secrets before pushing the `ci/request-deploy` branches (SEC-10) |
| `lavarapido-infra` reaches `main` after another repository and `deploy.yml` rejects the `automatic` input | Medium | Medium | Merge infra first (CD-02) |
| A merge during the exposition recreates containers for 1–2 minutes | Medium | Medium | Freeze `main` on 2026-10-27 (CD-15) |
| The deploy key is usable from any branch's workflow | Low | High | GitHub Environment limited to `main` (CD-12) |

---

## References

- `lavarapido-infra/.github/workflows/ci.yml`, `deploy.yml`; `DEPLOY.md` of the branch `ci/continuous-deployment`
- `10-devops/ci-cd.md`
- Related to: ADR-016 (deployment), `00-governance/git-conventions.md`
