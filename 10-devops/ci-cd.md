# CI/CD

> **Status (checked 2026-10-23):** continuous integration is in place with GitHub Actions in the 10
> repositories and was green on `develop` in all of them. Deployment is still **manual**: the Azure
> server runs `develop` and is updated by hand with `update-server.sh`. The continuous deployment
> described at the end (merge to `main` → CI → "Pedir despliegue" → `deploy.yml`) is written and
> reviewed, but it lives in **local branches that are not on GitHub yet** and has **never been run
> against the server**. Jenkins, the tool first planned, was not used: GitHub Actions needs no
> server of its own and runs next to the code.

---

## Continuous integration: what runs on each push

`ci.yml` runs on every push and pull request to `develop` and `main`, and by hand with
**Run workflow**. A new push on the same branch cancels the run still in progress
(`concurrency: ci-<ref>`, all repositories except `lavarapido-infra`). The result shows as ✓ or ✗
next to each commit on GitHub. Every workflow has `permissions: contents: read`.

| Repository | Runner | Steps | Kept on failure |
|---|---|---|---|
| security, customer, booking, operations, notification, api-gateway | Temurin JDK 21, Maven cache | `./mvnw -B -ntp verify` (builds and runs the tests) | `target/surefire-reports/` (7 days) |
| `lavarapido-payment-service` | .NET SDK 8.0 | `dotnet restore` → `dotnet build -c Release` → `dotnet test` (the 7 integration tests skip themselves without SQL Server) | `test-results/` `.trx` (7 days) |
| `Front-end-proyecto-web` | Node 22, npm cache | `npm ci` → `ng build --configuration production` → `ng test --watch=false` (Vitest + jsdom) | — |
| `LavadoVehicular-Movil` | Node 22, npm cache | `npm ci` → `tsc --noEmit` → `npm test -- --ci` (jest-expo, added 2026-10-23); the APK is still built with EAS | — |
| `lavarapido-infra` | Ubuntu runner | `bash -n` and `shellcheck --severity=error` on `deploy/*.sh`, `docker compose config` for the local and production files (placeholder secrets), `node --check` on `e2e/*.js` | — |

Backend tests need neither SQL Server nor RabbitMQ (fakes, mocks and web slices; see
`11-quality/testing-strategy.md`), so no service containers are started in CI. The end-to-end suite
(`lavarapido-infra/e2e`) needs the whole system and is still run by hand before a release.

### Last run on `develop` (2026-10-23)

Counted from the log of the last `ci.yml` run of each repository (`gh run view <id> --log`):

| Repository | Run | Commit | Tests |
|---|---|---|---|
| `lavarapido-api-gateway` | 40031516608 | `3f5eae3` | 39 |
| `lavarapido-security-service` | 40033589665 | `113fc4d` | 171 |
| `lavarapido-customer-service` | 40032144059 | `02cdb46` | 71 |
| `lavarapido-booking-service` | 40031872718 | `38681b2` | 60 |
| `lavarapido-operation-service` | 40032504802 | `71df4b2` | 72 |
| `lavarapido-payment-service` | 40033727458 | `16a6fac` | 151 (119 domain + 32 application) + 7 integration skipped |
| `lavarapido-notification-service` | 40032199857 | `0831ce7` | 115 |
| `Front-end-proyecto-web` | 40034217210 | `6bb8017` | 146 (59 files) |
| `LavadoVehicular-Movil` | 40034663140 | `238a7c6` | 13 (3 suites) |
| `lavarapido-infra` | 40032047434 | `b4704eb` | no tests: script, Compose and e2e syntax checks |
| **Total** | | | **838 passing** (backend 679, web 146, mobile 13); 845 counting the 7 skipped |

**Rule:** a branch is merged into `develop` only with CI green
(`00-governance/definition-of-done.md`).

### What CI does not check

- No coverage measure or gate (JaCoCo, `ng test --coverage`) and no static analysis inside the
  pipeline. SonarCloud runs its automatic analysis on `main` outside the workflows.
- The end-to-end suite and the 7 payment integration tests (they need SQL Server and the services).
- The mobile tests cover validators and the booking, payment and login services; no screen tests.

---

## Branches and releases

| Item | State on 2026-10-23 |
|---|---|
| `v1.0.0` tag | In 8 repositories: api-gateway, security, customer, booking, operations, notification, infra and web (`main` = `develop` at release time) |
| Pending release | `lavarapido-payment-service` (PR `develop` → `main` open, Sonar quality gate in error) and `LavadoVehicular-Movil` (no PR yet) |
| `main` protected | The same 8 repositories; payment and mobile are not protected |
| `develop` protected | None |
| After the release | `develop` already carries the fixes of 2026-10-23; they wait for `v1.1.0` |

---

## Deployment today: by hand, from `develop`

The Azure VM runs `develop` (`deploy/setup-server.sh` and `update-server.sh` default to
`BRANCH=develop` in `origin/develop` and `origin/main` of `lavarapido-infra`). A member with an SSH
key updates it with:

```bash
bash ~/lavarapido/lavarapido-infra/deploy/update-server.sh            # everything
bash ~/lavarapido/lavarapido-infra/deploy/update-server.sh web        # only the web
```

`update-server.sh` pulls the 9 repositories, takes a database backup (`backup-db.sh`; if it fails
nothing is updated) and runs `docker compose … --profile app up -d --build`. It does **not** wait for
the containers to become healthy. Details: `production.md`.

`lavarapido-infra` also has `deploy.yml` ("Desplegar en Azure", manual **Run workflow**): checks that
port 22 answers, connects with the `AZURE_SSH_KEY` secret and the pinned host key, runs
`deploy <services>` and waits up to 5 minutes for the web and `GET /api/v1/catalog/services` to
answer 200. On 2026-10-23 it had **0 runs** and the repository had **0 secrets**, so the button has
never deployed.

On the server, the GitHub key is meant to be restricted in `~/.ssh/authorized_keys`
(`restrict,command="bash …/deploy/ci-deploy.sh"`): it cannot open a shell, only run
`ci-deploy.sh`, which validates the service names, takes a lock (`flock`) so two updates never run
together and then calls `update-server.sh`. Removing that line revokes it.

---

## Continuous deployment (prepared, not on GitHub, not tested live)

Written on 2026-10-23 in the local branch `ci/continuous-deployment` of `lavarapido-infra`
(`DEPLOY.md`, `deploy.yml`, `deploy/*.sh`) and in the local branch `ci/request-deploy` of
api-gateway, security, operations, notification and the web. Nothing of this is on GitHub or on
the server yet; this section describes the design so it can be reviewed before it is pushed.

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
                         └─ VM on → ssh "deploy" → ci-deploy.sh → update-server.sh
                                                     ├─ pull main of every repo (payment: develop)
                                                     ├─ backup-db.sh (if it fails, stop)
                                                     ├─ docker compose up -d --build
                                                     ├─ restart Caddy if its Caddyfile changed
                                                     ├─ wait ≤ 8 min until every container is healthy
                                                     └─ write backups/deployed-heads (full update only)
                         └─ check web and API answer 200 (≤ 5 min)
```

| Piece | What it does |
|---|---|
| Job **Pedir despliegue** (`ci.yml` of each repo) | Runs after `build`, only on `push` to `main`. Fails red if the `DEPLOY_DISPATCH_TOKEN` secret is missing; otherwise calls the GitHub API to dispatch `deploy.yml` with `automatic=true` |
| `deploy.yml` triggers | Manual (**Run workflow**, optional services), dispatched by another repo (`automatic`), or a push to `main` of `lavarapido-infra` that touches `docker-compose*.yml`, `deploy/**` or the workflow |
| `deploy.yml` concurrency | `deploy-azure`, `cancel-in-progress: false`; job timeout 70 min, update step 60 min |
| `ci-deploy.sh` | If another update holds the lock, waits up to 20 minutes (`flock -w 1200`) instead of failing |
| `setup-server.sh` | Default branch `main`; `DEVELOP_ONLY=lavarapido-payment-service` keeps payment on `develop` until it has `v1.0.0`. Installs the `@reboot` task for `boot-update.sh` next to the backup tasks |
| `boot-update.sh` | On VM start: pulls `main` and, if `repo-heads.sh` differs from `~/lavarapido/backups/deployed-heads`, runs a full update; otherwise rebuilds nothing. Log in `~/lavarapido/backups/deploy.log` |
| `deployed-heads` | Written by `update-server.sh` only when a **full** update ends with every container healthy, so an update that failed halfway is retried on the next boot |
| Health wait | `update-server.sh` polls `docker inspect` of 11 containers (SQL Server, RabbitMQ, 6 services, gateway, web, Caddy) every 10 s for up to 8 minutes and exits 1 naming the ones that are not healthy |

**Secrets it needs (none exists today):**

| Repository | Secret | What it is |
|---|---|---|
| `lavarapido-infra` | `AZURE_SSH_KEY` | Private part of the restricted deploy key |
| Each repo with the job (web, api-gateway, security, operations, notification) | `DEPLOY_DISPATCH_TOKEN` | Fine-grained token with access only to `lavarapido-infra` and **Actions: Read and write** |

customer, booking and payment do not have the job: their changes reach the server with the next
deployment of any repository (every update pulls all of them) or by hand.

**Before it can be trusted** (findings CD-01 to CD-04 of the 2026-10-23 review,
`15-project-control/risks.md`): create both secrets, add the restricted key on the VM, push
`lavarapido-infra` to `main` before any other repository (its `deploy.yml` is the one that accepts the
`automatic` input), and run the workflow **twice by hand** with the VM on — the first run still uses
the old server scripts (`develop`); the second switches the server to `main` and installs the boot
task (`crontab -l | grep boot-update`).

---

## Secrets

Never in a workflow file or a repository. CI needs none: the `lavarapido-infra` check uses
placeholder values only to validate the Compose files. Deployment needs `AZURE_SSH_KEY` and, with
continuous deployment, `DEPLOY_DISPATCH_TOKEN` (table above). Production secrets stay in
`.env.production` on the server.

---

## Not done yet

- Pushing and testing the continuous deployment (above).
- End-to-end tests in CI (they need SQL Server, RabbitMQ and the seven services).
- Building the images in CI and pushing them to a registry, so the server stops compiling.
- Coverage gate and static analysis inside the pipeline.

---

## Correlations

- Tests that run in the pipeline → `11-quality/testing-strategy.md`
- Public server and access → `production.md`, `environments.md`
- Decisions → `05-architecture/decisions/records/ADR-016-deployment-azure-vm-compose-caddy.md`,
  `ADR-017-ci-cd-github-actions.md`
- Branches and merge rule → `00-governance/git-conventions.md`
