# CI/CD

> **Status (checked 2026-10-24):** continuous integration runs with GitHub Actions in the 10
> repositories and is green on `develop` in all of them. The continuous deployment (merge to `main` →
> CI → "Pedir despliegue" → `deploy.yml`, plus the mobile OTA `cd.yml`) is **merged into `develop` of
> the 10 repositories** since 2026-10-24, but it has **never run**: the secrets do not exist yet and
> `main` still holds `v1.0.0` (payment and mobile have no release). The Azure server keeps running
> `develop`, updated by hand with `update-server.sh`. Jenkins, the tool first planned, was not used:
> GitHub Actions needs no server of its own and runs next to the code.

---

## Continuous integration: what runs on each push

`ci.yml` runs on every push and pull request to `develop` and `main`, and by hand with
**Run workflow**. A new push on the same branch cancels the run still in progress
(`concurrency: ci-<ref>`, all repositories except `lavarapido-infra`). The result shows as ✓ or ✗
next to each commit on GitHub. Every workflow has `permissions: contents: read`.

| Repository | Runner | Steps | Kept on failure |
|---|---|---|---|
| security, customer, booking, operations, notification, api-gateway | Temurin JDK 21, Maven cache | `./mvnw -B -ntp verify` (builds and runs the tests) | `target/surefire-reports/` (7 days) |
| `lavarapido-payment-service` | .NET SDK 8.0 | `dotnet restore` → `dotnet build -c Release` → `dotnet test` (the 11 integration tests skip themselves without SQL Server) | `test-results/` `.trx` (7 days) |
| `Front-end-proyecto-web` | Node 22, npm cache | `npm ci` → `ng build --configuration production` → `ng test --watch=false --coverage` (Vitest + jsdom, `@vitest/coverage-v8`; report kept as an artifact, F-02) | `coverage/` |
| `LavadoVehicular-Movil` | Node 22, npm cache | `npm ci` → `tsc --noEmit` → `npm test -- --ci` (jest-expo); the APK is still built with EAS | — |
| `lavarapido-infra` | Ubuntu runner | `bash -n` and `shellcheck --severity=error` on `deploy/*.sh` (a broken script anywhere fails the loop, CD-14), `docker compose config` for the local and production files (placeholder secrets), `node --check` on `e2e/*.js` and `e2e/remote/*.js`, and **actionlint 1.7.7** (by Docker) on the workflows | — |

Backend tests need neither SQL Server nor RabbitMQ (fakes, mocks and web slices; see
`11-quality/testing-strategy.md`), so no service containers are started in CI. The end-to-end suites
(`lavarapido-infra/e2e`) need the whole system: the local one is run by hand, the remote one with
`e2e.yml` (below).

### Last run on `develop` (2026-10-24)

Counted from the log of the last `ci.yml` run of each repository (`gh run view <id> --log`):

| Repository | Run | Commit | Tests |
|---|---|---|---|
| `lavarapido-api-gateway` | 40090537507 | `c8b607a` | 62 |
| `lavarapido-security-service` | 40090547470 | `b5fe56e` | 200 |
| `lavarapido-customer-service` | 40091404136 | `3181cae` | 82 |
| `lavarapido-booking-service` | 40091398206 | `5dd6794` | 95 |
| `lavarapido-operation-service` | 40090561391 | `37e32ff` | 110 |
| `lavarapido-payment-service` | 40091411190 | `3b8730e` | 225 (134 domain + 52 application + 34 API + 5 infrastructure) + 11 integration skipped |
| `lavarapido-notification-service` | 40090571731 | `c5429ad` | 133 |
| `Front-end-proyecto-web` | 40091066070 | `ba2c93a` | 212 (66 files) |
| `LavadoVehicular-Movil` | 40091417420 | `e5d7d67` | 73 (25 suites) |
| `lavarapido-infra` | 40102872850 | `cf28ed0` | no tests: script, Compose, e2e syntax and actionlint checks |
| **Total** | | | **1,192 passing** (backend 907, web 212, mobile 73); 1,203 counting the 11 skipped |

On 2026-10-23 the total was 838 (backend 679, web 146, mobile 13): the fleet round of 2026-10-24 added
354 tests.

**Rule:** a branch is merged into `develop` only with CI green
(`00-governance/definition-of-done.md`).

### What CI does not check

- No coverage gate (the web measures coverage but does not fail on it; the backends do not measure
  it) and no static analysis inside the pipeline. SonarCloud runs its automatic analysis outside the
  workflows (payment's quality gate is green since 2026-10-24).
- The end-to-end suites and the 11 payment integration tests (they need SQL Server and the services).
- The mobile tests cover validators, services, view models and hooks; no screen tests.

---

## Branches and releases

| Item | State on 2026-10-24 |
|---|---|
| `v1.0.0` tag | In 8 repositories: api-gateway, security, customer, booking, operations, notification, infra and web (`main` = `develop` at release time) |
| Pending release | `lavarapido-payment-service`: PR #2 `develop` → `main` open, approved, CI and Sonar green (it now also carries the 11 fleet branches). `LavadoVehicular-Movil`: no PR yet |
| `main` protected | The same 8 repositories; payment and mobile are not protected |
| `develop` protected | None |
| After the release | `develop` carries the fixes of 2026-10-23 and 2026-10-24 (128 branches); they wait for `v1.1.0` |

---

## Deployment today: by hand, from `develop`

The Azure VM runs `develop` (deployed on 2026-10-24 at 04:35, before the fleet branches; those are
**not deployed yet**). A member with an SSH key updates it with:

```bash
BRANCH=develop bash ~/lavarapido/lavarapido-infra/deploy/update-server.sh            # everything
BRANCH=develop bash ~/lavarapido/lavarapido-infra/deploy/update-server.sh web        # only the web
```

`BRANCH=develop` is needed until `v1.1.0`: the new `setup-server.sh` defaults to `main`. It refuses to
move a repository to a branch that does not contain what is deployed (`merge-base --is-ancestor`), so
it stops with an error instead of downgrading the server (`ALLOW_DOWNGRADE=1` forces it). The full
sequence of `update-server.sh` is under "Continuous deployment" below and in `production.md`.

**First run after the merge (A1 of the cross review):** the server still has the old scripts, which
do not restart Caddy; the new web listens on 8080 and the new Caddyfile says `web:8080`, so after that
first run the web answers 502 until Caddy is restarted or the update is run a second time at once
(the second run already uses the new `update-server.sh`, which restarts Caddy when its Caddyfile
changed).

---

## Continuous deployment (merged to `develop` on 2026-10-24, never run)

```
PR approved → merge to main (repo X)
      │
      ▼
ci.yml of X: build and tests ──✓──► job "Pedir despliegue" (only on push to main)
                                          │  POST …/lavarapido-infra/actions/workflows/deploy.yml/dispatches
                                          │  {"ref":"main","inputs":{"automatic":"true","source":"X@sha"}}
                                          ▼
                      lavarapido-infra deploy.yml ("Desplegar en Azure")
                         ├─ VM off and automatic → warning, job green (boot-update catches up later)
                         ├─ VM off and manual    → job red ("start the VM")
                         ├─ SSH down but HTTPS up → job red (CD-13)
                         └─ VM on → ssh "deploy" → ci-deploy.sh → update-server.sh
                                                     ├─ pull main of every repo (payment: develop), never downgrading
                                                     ├─ backup-db.sh pre-update (if it fails, stop)
                                                     ├─ tag the running images as :prev (unless the last update failed)
                                                     ├─ docker compose up -d --build
                                                     ├─ restart Caddy if its Caddyfile changed
                                                     ├─ wait ≤ 8 min until every container is healthy
                                                     ├─ write backups/deployed-heads (full update only)
                                                     └─ prune dangling images and build cache older than 7 days
                         └─ check web and API answer 200 (≤ 5 min; on failure the body is shown)
```

| Piece | What it does |
|---|---|
| Job **Pedir despliegue** (`ci.yml`) | In **8 repositories**: api-gateway, security, customer, booking, operations, notification, payment and the web. Runs after the build, only on `push` to `main` (on `develop` it shows as *skipped*). Fails red if `DEPLOY_DISPATCH_TOKEN` is missing; otherwise calls the GitHub API with `curl -sS --fail-with-body --max-time 30` |
| `deploy.yml` triggers | Manual (**Run workflow**, optional services), dispatched by another repo (`automatic`, `source`), or a push to `main` of `lavarapido-infra` that touches `docker-compose*.yml`, `deploy/**` or the workflow |
| `deploy.yml` concurrency | `deploy-azure`, `cancel-in-progress: false`; job timeout 70 min |
| `ci-deploy.sh` | If another update holds the lock (`/tmp/lavarapido-deploy.lock`), waits up to 20 minutes (`flock -w 1200`) instead of failing. `rollback.sh`, `restore-db.sh` and `boot-update.sh` take the same lock; `update-server.sh` run by hand does **not** (open, M4) |
| `setup-server.sh` | Default branch `main`; `DEVELOP_ONLY=lavarapido-payment-service` keeps payment on `develop` until it has `v1.0.0`. Never downgrades a repository (2026-10-24, C1 of the cross review). Installs the `@reboot` task for `boot-update.sh` next to the backup tasks |
| `boot-update.sh` | On VM start: pulls `main` and, if `repo-heads.sh` differs from `~/lavarapido/backups/deployed-heads`, runs a full update; otherwise rebuilds nothing. Log in `~/lavarapido/backups/deploy.log` |
| Health wait | `update-server.sh` polls `docker inspect` of 11 containers every 10 s for up to 8 minutes and exits 1 naming the ones that are not healthy |
| `:prev` images and `rollback.sh` | Before building, `update-server.sh` tags each `lavarapido/<service>:local` as `:prev` (not while `backups/update-pending` shows the last update failed). `deploy/rollback.sh [services]` goes back to them without compiling (asks to type `VOLVER`, needs a terminal, waits for health, writes `deploy.log`). See `13-operations/README.md` |
| Clean-up and retention | After a healthy update: `docker image prune -f` and `docker builder prune --filter until=168h`. Backups `LavaRapido-pre-update-*` keep the last 10, apart from the 14 regular ones (CD-10) |
| Mobile `cd.yml` | `LavadoVehicular-Movil`: on push to `main` (not for `.md`/`docs/` only) or by hand, but publishes only from `main`. Job `check` repeats `tsc` and jest; job `publish` needs `EXPO_TOKEN`, compares the native fingerprint with the build of the installed APK and, if it is the same, runs `eas update --channel preview`; if it changed it fails and asks for a new APK (ADR-018) |
| `e2e.yml` | `lavarapido-infra`, manual only: runs `e2e/remote` against a URL with the `E2E_*` accounts; flags `allow_writes`, `allow_signup`, `rate_limit` are off by default |

**Secrets it needs (none exists today):**

| Repository | Secret | Who creates it |
|---|---|---|
| `lavarapido-infra` | `AZURE_SSH_KEY` (private part of the restricted deploy key) | Brayan |
| api-gateway, security, operations, notification, web | `DEPLOY_DISPATCH_TOKEN` (fine-grained token, only `lavarapido-infra`, **Actions: Read and write**) | Brayan |
| booking, customer | `DEPLOY_DISPATCH_TOKEN` | Camilo, or Brayan with the Admin role |
| payment | `DEPLOY_DISPATCH_TOKEN` | Merari, or Brayan with the Admin role |
| `LavadoVehicular-Movil` | `EXPO_TOKEN` (expo.dev access token of the project owner) | Merari, or Brayan with the Admin role |
| `lavarapido-infra` (for `e2e.yml`) | `E2E_ADMIN_*`, `E2E_CLIENT_*`, `E2E_OPERATOR_*` (+ optional `E2E_SIGNUP_EMAIL`) | Brayan, after the team creates the test accounts |

**Before it can be trusted:** create the secrets and the restricted key on the VM; release `v1.1.0`
with infra **last** and `DEVELOP_ONLY=""` afterwards (the job of the other repos answers 422 until
`deploy.yml` on `main` accepts `automatic`); `cd.yml` and `e2e.yml` can only be launched once they are
on `main` (GitHub answers 404 for a workflow that is not on the default branch). The first mobile
release to `main` will fail its CD until a new APK is built, because MOV-08 changed `eas.json` and
with it the fingerprint.

---

## Secrets

Never in a workflow file or a repository. CI needs none: the `lavarapido-infra` check uses
placeholder values only to validate the Compose files. Deployment needs the secrets of the table
above. Production secrets stay in `.env.production` on the server.

---

## Not done yet

- Creating the secrets and running the continuous deployment and `e2e.yml` for the first time.
- `rollback.sh` does not detect a contract change between the running version and `:prev` (port,
  variables); `update-server.sh` by hand does not take the lock (`15-project-control/risks.md`).
- End-to-end tests on every push (they need SQL Server, RabbitMQ and the seven services).
- Building the images in CI and pushing them to a registry, so the server stops compiling.
- Coverage gate and static analysis inside the pipeline.

---

## Correlations

- Tests that run in the pipeline → `11-quality/testing-strategy.md`
- Public server and access → `production.md`, `environments.md`
- Rollback and restore → `13-operations/README.md`
- Decisions → `05-architecture/decisions/records/ADR-016-deployment-azure-vm-compose-caddy.md`,
  `ADR-017-ci-cd-github-actions.md`, `ADR-018-mobile-app-updates.md`
- Branches and merge rule → `00-governance/git-conventions.md`
