# CI/CD

> **Status (2026-10-19): in place with GitHub Actions.** Every repository has
> `.github/workflows/ci.yml`, and `lavarapido-infra` also has `deploy.yml`, a manual button that
> updates the Azure server. Jenkins, the tool first planned, was not used: GitHub Actions needs no
> server of its own and runs next to the code.

---

## Continuous integration: what runs on each push

`ci.yml` runs on every push and pull request to `develop` and `main`, and by hand with
**Run workflow**. A new push on the same branch cancels the run still in progress
(`concurrency: ci-<ref>`). The result shows as ✓ or ✗ next to each commit on GitHub.

| Repository | Runner | Steps | Kept on failure |
|---|---|---|---|
| security, customer, booking, operations, notification, api-gateway | Temurin JDK 21, Maven cache | `./mvnw -B -ntp verify` (builds and runs the tests) | `target/surefire-reports/` (7 days) |
| `lavarapido-payment-service` | .NET SDK 8.0 | `dotnet restore` → `dotnet build -c Release` → `dotnet test` (the 7 integration tests skip themselves without SQL Server) | `test-results/` `.trx` (7 days) |
| `Front-end-proyecto-web` | Node 22, npm cache | `npm ci` → `ng build --configuration production` → `ng test --watch=false` | — |
| `LavadoVehicular-Movil` | Node 22, npm cache | `npm ci` → `tsc --noEmit` (the APK is still built with EAS) | — |
| `lavarapido-infra` | Ubuntu runner | `bash -n` and `shellcheck` on `deploy/*.sh`, `docker compose config` for the local and production files, `node --check` on `e2e/*.js` | — |

Backend tests need neither SQL Server nor RabbitMQ (fakes, mocks and web slices; see
`11-quality/testing-strategy.md`), so no service containers are started in CI. The end-to-end suite
(`lavarapido-infra/e2e`) needs the whole system and is still run by hand before a release.

**Rule:** a branch is merged into `develop` only with CI green
(`00-governance/definition-of-done.md`).

---

## Deployment: the "Desplegar en Azure" button

`lavarapido-infra/.github/workflows/deploy.yml`, run by hand from **Actions → Desplegar en Azure →
Run workflow**. Only one deployment runs at a time (`concurrency: deploy-azure`); a second one waits.

| Step | What it does |
|---|---|
| Is the VM on? | Opens port 22; if it does not answer, it stops and says to start `vehiclecarwash-vm` in the portal |
| Prepare the key | Writes the `AZURE_SSH_KEY` secret and pins the server's host key (`KNOWN_HOST`) |
| Update | `ssh azureuser@<host> "deploy <services>"`; empty input updates everything |
| Check | Waits up to 5 minutes until the web and `GET /api/v1/catalog/services` answer 200 |

On the server, the GitHub key is restricted in `~/.ssh/authorized_keys`
(`restrict,command="bash …/deploy/ci-deploy.sh"`): it cannot open a shell, only run
`ci-deploy.sh`, which validates the service names and then calls `update-server.sh`. Removing that
line revokes it. Setup steps: `lavarapido-infra/DEPLOY.md` and `production.md`.

The update can also be run by any member with their own SSH key (`production.md`, access section).

---

## Secrets

Never in a workflow file or a repository. CI needs none: the `lavarapido-infra` check uses
placeholder values only to validate the Compose files. The deployment uses one GitHub secret,
`AZURE_SSH_KEY` (private part of the restricted deploy key). Production secrets stay in
`.env.production` on the server.

---

## Not done yet

- End-to-end tests in CI (they need SQL Server, RabbitMQ and the seven services).
- Building the images in CI and pushing them to a registry, so the server stops compiling.
- Coverage gate (JaCoCo) and static analysis (SonarQube).

---

## Correlations

- Tests that run in the pipeline → `11-quality/testing-strategy.md`
- Public server and access → `production.md`, `environments.md`
- Branches and merge rule → `00-governance/git-conventions.md`
