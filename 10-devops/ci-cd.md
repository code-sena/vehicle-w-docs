# CI/CD

> **Status (checked 2026-11-04):** continuous integration runs with GitHub Actions in the 10
> repositories and is green on `main` in all of them (1,348 tests). The continuous deployment (merge to
> `main` → CI → "Pedir despliegue" → `deploy.yml`, plus the mobile OTA `cd.yml`) is **active**: the
> secrets exist, every repository has its release on `main` and the Azure server runs `main`, payment
> included. The automatic deploys of the night of 2026-10-26 and of 2026-10-27 succeeded (web and API
> answered 200). The deploy that payment `v1.1.3` asked for on 2026-10-27 (run 40595202472) found the
> VM turned off and did not deploy; `deploy/boot-update.sh` brings the server to the last `main` when
> it is turned on again. Jenkins, the tool first planned, was not used: GitHub Actions needs no server of its
> own and runs next to the code.

---

## Continuous integration: what runs on each push

`ci.yml` runs on every push and pull request to `develop` and `main`, and by hand with
**Run workflow**. A new push on the same branch cancels the run still in progress
(`concurrency: ci-<ref>`, all repositories except `lavarapido-infra`). The result shows as ✓ or ✗
next to each commit on GitHub. Every workflow has `permissions: contents: read`.

| Repository | Runner | Steps | Kept on failure |
|---|---|---|---|
| security, customer, booking, operations, notification, api-gateway | Temurin JDK 21, Maven cache | `./mvnw -B -ntp verify` (builds and runs the tests) | `target/surefire-reports/` (7 days) |
| `lavarapido-payment-service` | .NET SDK 8.0 | Job "Compilar y probar": `dotnet restore` → `dotnet build -c Release` → `dotnet test`. Job "Pruebas de integración" (since 2026-10-27): SQL Server 2022 as a service container, the database created, the Liquibase migrations applied like `payment-migrate`, then the 25 tests of `PaymentService.Infrastructure.IntegrationTests` (none skipped; in the first job the 12 that need the database are skipped) | `test-results/` and `integration-test-results/` `.trx` (7 days) |
| `Front-end-proyecto-web` | Node 22, npm cache | `npm ci` → `ng build --configuration production` → `ng test --watch=false --coverage` (Vitest + jsdom, `@vitest/coverage-v8`; report kept as an artifact, F-02) | `coverage/` |
| `LavadoVehicular-Movil` | Node 22, npm cache | `npm ci` → `tsc --noEmit` → `npm test -- --ci` (jest-expo); the APK is still built with EAS | — |
| `lavarapido-infra` | Ubuntu runner | `bash -n` and `shellcheck --severity=error` on `deploy/*.sh` (a broken script anywhere fails the loop, CD-14), `docker compose config` for the local and production files (placeholder secrets), `node --check` on `e2e/*.js` and `e2e/remote/*.js`, and **actionlint 1.7.7** (by Docker) on the workflows | — |

Backend tests need neither SQL Server nor RabbitMQ (fakes, mocks and web slices; see
`11-quality/testing-strategy.md`), so no service containers are started in CI, except the SQL Server of
payment's integration job. The end-to-end suites
(`lavarapido-infra/e2e`) need the whole system: the local one is run by hand, the remote one with
`e2e.yml` (below).

### Last run on `main` (checked 2026-11-04)

Counted from the log of the last `ci.yml` run on `main` of each repository (`gh run view <id> --log`):

| Repository | Run | Commit | Tests |
|---|---|---|---|
| `lavarapido-api-gateway` | 40383758289 | `6961feb` (`v1.1.0`) | 62 |
| `lavarapido-security-service` | 40383741059 | `391fb1f` (`v1.1.0`) | 200 |
| `lavarapido-customer-service` | 40461925271 | `83d322e` (`v1.1.1`) | 83 |
| `lavarapido-booking-service` | 40461919301 | `506feca` (`v1.1.1`) | 137 |
| `lavarapido-operation-service` | 40383776759 | `9511328` (`v1.1.0`) | 110 |
| `lavarapido-payment-service` | 40595106824 (2026-10-27) | `1eba3d9` (`v1.1.3`) | 275 (142 domain + 61 application + 47 API + 25 infrastructure: 13 without database and 12 against SQL Server 2022 in the job "Pruebas de integración", 0 skipped) |
| `lavarapido-notification-service` | 40383796954 | `7fdfd1e` (`v1.1.0`) | 133 |
| `Front-end-proyecto-web` | 40458685993 | `acea5e3` (`v1.1.2`) | 242 (68 files) |
| `LavadoVehicular-Movil` | 40569787378 | `f8300d6` (`v1.1.2`) | 106 (28 suites) |
| `lavarapido-infra` | 40461663875 | `682f629` (`v1.1.2`) | no tests: script, Compose, e2e syntax and actionlint checks |
| **Total** | | | **1,348 passing** (backend 1,000, web 242, mobile 106) |

With payment `v1.1.2` (run 40461931061, 2026-10-27) the total was 1,337 (payment 264). On 2026-10-24 the total on `develop` was 1,192 (backend 907, web 212, mobile 73) and on 2026-10-23, 838.

**Rule:** a branch is merged into `develop` only with CI green
(`00-governance/definition-of-done.md`).

### What CI does not check

- No coverage gate (the web measures coverage but does not fail on it; the backends do not measure
  it) and no static analysis inside the pipeline. SonarCloud runs its automatic analysis outside the
  workflows (payment's quality gate is green since 2026-10-24).
- The end-to-end suites (they need SQL Server, RabbitMQ and the services); the local suite passed
  19/19 on 2026-10-27, run by hand. Only payment has integration tests against a real SQL Server in CI.
- The mobile tests cover validators, services, view models and hooks; no screen tests.

---

## Branches and releases

| Item | State on 2026-11-04 |
|---|---|
| Releases on `main` | api-gateway `v1.1.0`, security `v1.1.0`, customer `v1.1.1`, booking `v1.1.1`, operations `v1.1.0`, notification `v1.1.0`, payment `v1.1.3` (merged on 2026-10-27, tag and GitHub release on 2026-11-04), infra `v1.1.2`, web `v1.1.2`, mobile `v1.1.2` (an OTA update on top of the APK 1.1.1) |
| `main` protected | All 10 repositories: pull request, one approval from another member, green CI (`Compilar y probar`, `Revisar configuración` in infra, `Revisar tipos` in mobile), no force push |
| `develop` protected | None |
| Release flow | `develop` → pull request `Release vX.Y.Z` → approval → merge commit → tag and GitHub release → `develop` fast-forwarded to `main`; the releases of 2026-10-27 were approved by Brayan |

---

## Deployment by hand (fallback)

The Azure VM runs `main` and is updated by the continuous deployment below. A member with an SSH key can
still update it by hand, for example while GitHub Actions is down:

```bash
bash ~/lavarapido/lavarapido-infra/deploy/update-server.sh            # everything, from main
bash ~/lavarapido/lavarapido-infra/deploy/update-server.sh web        # only the web
```

`setup-server.sh` defaults to `main` and refuses to move a repository to a branch that does not contain
what is deployed (`merge-base --is-ancestor`), so it stops with an error instead of downgrading the server
(`ALLOW_DOWNGRADE=1` forces it). The full sequence of `update-server.sh` is under "Continuous deployment"
below and in `production.md`. The first run with the old scripts (502 until Caddy restarted, A1 of the
cross review) is behind us: the server already has the scripts that restart Caddy when its Caddyfile
changes.

---

## Continuous deployment (merged on 2026-10-24, running since 2026-10-26)

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
                                                     ├─ pull main of every repo (payment too), never downgrading
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
| `setup-server.sh` | Default branch `main`; `DEVELOP_ONLY` is empty since every repository has its release on `main`, so payment deploys from `main` like the others (the variable stays for a future repository without a release). Never downgrades a repository (2026-10-24, C1 of the cross review). Installs the `@reboot` task for `boot-update.sh` next to the backup tasks |
| `boot-update.sh` | On VM start: pulls `main` and, if `repo-heads.sh` differs from `~/lavarapido/backups/deployed-heads`, runs a full update; otherwise rebuilds nothing. Log in `~/lavarapido/backups/deploy.log` |
| Health wait | `update-server.sh` polls `docker inspect` of 11 containers every 10 s for up to 8 minutes and exits 1 naming the ones that are not healthy |
| `:prev` images and `rollback.sh` | Before building, `update-server.sh` tags each `lavarapido/<service>:local` as `:prev` (not while `backups/update-pending` shows the last update failed). `deploy/rollback.sh [services]` goes back to them without compiling (asks to type `VOLVER`, needs a terminal, waits for health, writes `deploy.log`). See `13-operations/README.md` |
| Clean-up and retention | After a healthy update: `docker image prune -f` and `docker builder prune --filter until=168h`. Backups `LavaRapido-pre-update-*` keep the last 10, apart from the 14 regular ones (CD-10) |
| Mobile `cd.yml` | `LavadoVehicular-Movil`: on push to `main` (not for `.md`/`docs/` only) or by hand, but publishes only from `main`. Job `check` repeats `tsc` and jest; job `publish` needs `EXPO_TOKEN`, compares the native fingerprint with the build of the installed APK and, if it is the same, runs `eas update --channel preview`; if it changed it fails and asks for a new APK (ADR-018) |
| `e2e.yml` | `lavarapido-infra`, manual only: runs `e2e/remote` against a URL with the `E2E_*` accounts; flags `allow_writes`, `allow_signup`, `rate_limit` are off by default |

**Secrets it uses (the deploy ones exist since 2026-10-26; the `E2E_*` ones do not exist yet):**

| Repository | Secret | Who created it |
|---|---|---|
| `lavarapido-infra` | `AZURE_SSH_KEY` (private part of the restricted deploy key) | Brayan |
| api-gateway, security, operations, notification, web | `DEPLOY_DISPATCH_TOKEN` (fine-grained token, only `lavarapido-infra`, **Actions: Read and write**) | Brayan |
| booking, customer | `DEPLOY_DISPATCH_TOKEN` | Camilo, or Brayan with the Admin role |
| payment | `DEPLOY_DISPATCH_TOKEN` | Merari, or Brayan with the Admin role |
| `LavadoVehicular-Movil` | `EXPO_TOKEN` (expo.dev access token of the project owner) | Merari, or Brayan with the Admin role |
| `lavarapido-infra` (for `e2e.yml`) | `E2E_ADMIN_*`, `E2E_CLIENT_*`, `E2E_OPERATOR_*` (+ optional `E2E_SIGNUP_EMAIL`) | Not created yet: Brayan, after the team creates the test accounts |

**How it went:** the dispatch token, the deploy key and `EXPO_TOKEN` exist; infra was released last and
`DEVELOP_ONLY` is empty. The automatic deploys of the night of 2026-10-26 and of 2026-10-27 succeeded and
the web and the API answered 200 afterwards. The mobile `cd.yml` failed its first run (`v1.1.0`,
2026-10-26) because `EXPO_TOKEN` did not exist yet, and published the OTA updates of `v1.1.1` and `v1.1.2`.

---

## Secrets

Never in a workflow file or a repository. CI needs none: the `lavarapido-infra` check uses
placeholder values only to validate the Compose files. Deployment needs the secrets of the table
above. Production secrets stay in `.env.production` on the server.

---

## Not done yet

- `e2e.yml` (remote end-to-end against the server) has never run: the `E2E_*` secrets and accounts do
  not exist yet; the local suite is run by hand (19/19 on 2026-10-27).
- `rollback.sh` does not detect a contract change between the running version and `:prev` (port,
  variables); `update-server.sh` by hand does not take the lock (`15-project-control/risks.md`).
- End-to-end tests on every push (they need SQL Server, RabbitMQ and the seven services).
- Building the images in CI and pushing them to a registry, so the server stops compiling.
- Coverage gate and static analysis inside the pipeline.
- An uptime monitor for the public server (H-15).

---

## Correlations

- Tests that run in the pipeline → `11-quality/testing-strategy.md`
- Public server and access → `production.md`, `environments.md`
- Rollback and restore → `13-operations/README.md`
- Decisions → `05-architecture/decisions/records/ADR-016-deployment-azure-vm-compose-caddy.md`,
  `ADR-017-ci-cd-github-actions.md`, `ADR-018-mobile-app-updates.md`
- Branches and merge rule → `00-governance/git-conventions.md`
