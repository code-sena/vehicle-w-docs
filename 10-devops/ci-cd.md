# CI/CD

> **Status (2026-10-06): planned, not built.** The team will use **Jenkins**. No `Jenkinsfile`
> exists yet in any repository. This page fixes what each pipeline must do so the first
> `Jenkinsfile` follows it.

---

## Repositories and what each pipeline builds

| Repository | Build / test command | Artifact |
|---|---|---|
| `lavarapido-security-service` | `./mvnw -B verify` | Docker image (`Dockerfile` exists) |
| `lavarapido-customer-service` | `./mvnw -B verify` | Docker image (`Dockerfile` exists) |
| `lavarapido-booking-service` | `./mvnw -B verify` | Docker image (`Dockerfile` exists) |
| `lavarapido-operations-service` | `./mvnw -B verify` | Docker image (`Dockerfile` exists) |
| `lavarapido-payment-service` (.NET 8) | `dotnet restore`, `dotnet build -c Release`, `dotnet test` | Docker image (**no `Dockerfile` yet**); Liquibase changelogs in `db/` run by `payment-migrate` |
| `lavarapido-notification-service` | `./mvnw -B verify` | Docker image (`Dockerfile` exists) |
| `lavarapido-api-gateway` | `./mvnw -B verify` | Docker image (`Dockerfile` exists) |
| Web (Angular) | `npm ci`, `npx ng build`, `npx ng test --watch=false` | `dist/` (no `Dockerfile` yet) |
| `lavarapido-infra` | `docker compose config` (syntax check) | — |

Backend tests need neither SQL Server nor RabbitMQ (fakes, mocks and web slices; see
`11-quality/testing-strategy.md`), so the agent only needs JDK 21, the .NET 8 SDK (payment) and Docker.

---

## Pipeline per service (target)

| Stage | When | Steps |
|---|---|---|
| Checkout | Every push and PR | `checkout scm` |
| Build and test | Every push and PR | `./mvnw -B verify`; publish JUnit reports (`target/surefire-reports/*.xml`) |
| Image | Push to `develop` / `main` | `docker build -t lavarapido/<service>:<commit> .` |
| Deploy (local server) | Push to `develop`, manual approval | `docker compose up -d <service>` from `lavarapido-infra` |

A PR can be merged only with the pipeline green (`00-governance/definition-of-done.md`).

### Minimal `Jenkinsfile` (backend service)

```groovy
pipeline {
    agent any
    tools { jdk 'jdk-21' }
    stages {
        stage('Build and test') {
            steps { sh './mvnw -B verify' }   // en Windows: bat 'mvnw.cmd -B verify'
            post { always { junit 'target/surefire-reports/*.xml' } }
        }
        stage('Image') {
            when { anyOf { branch 'develop'; branch 'main' } }
            steps { sh "docker build -t lavarapido/${env.JOB_BASE_NAME}:${env.GIT_COMMIT.take(7)} ." }
        }
    }
}
```

### payment-service pipeline (.NET)

`dotnet restore` → `dotnet build -c Release --no-restore` → `dotnet test --no-build -c Release
--logger trx` (publish the `.trx` results). The image stage waits for a `Dockerfile`
(ADR-013). A Liquibase `validate` against a throwaway SQL Server is optional.

### Web pipeline

`npm ci` → `npx ng build` → `npx ng test --watch=false`. The test stage will fail until the
6 stale spec files are fixed (`11-quality/testing-strategy.md`, Gaps).

---

## Secrets in Jenkins

Never in the `Jenkinsfile` or the repository. Stored as Jenkins credentials and injected as
environment variables only in the deploy stage: `JWT_SECRET`, `DB_PASSWORD`, `INTERNAL_API_KEY`,
`MAIL_USERNAME` / `MAIL_PASSWORD`. The test stage needs none of them.

---

## Not planned yet

Coverage gate (JaCoCo), static analysis (SonarQube), image registry, a remote environment.

---

## Correlations

- Tests that run in the pipeline → `11-quality/testing-strategy.md`
- How the system is started → `local-setup.md`, `environments.md`
- Branches → `00-governance/git-conventions.md`
