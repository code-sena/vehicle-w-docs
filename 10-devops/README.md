# 10 — DevOps

> How LavaRápido is started, configured and (soon) built automatically. Today everything runs on
> the team's machines with Docker Compose; there is no remote environment yet.

---

## Contents

| File | What it answers |
|------|-----------------|
| [`local-setup.md`](./local-setup.md) | Start the whole system on a new computer: prerequisites, `.env`, order, ports, demo accounts, common issues |
| [`environments.md`](./environments.md) | Which environments exist, how they differ, every configuration variable |
| [`ci-cd.md`](./ci-cd.md) | The Jenkins pipeline the team will build (planned) |

---

## At a glance

| Item | Value |
|---|---|
| Orchestration | `lavarapido-infra/docker-compose.yml`: SQL Server, RabbitMQ, Mailpit, the 4 built services, api-gateway |
| Configuration | One `lavarapido-infra/.env` (template: `.env.example`), read by compose and by each service run with `./mvnw` |
| Database migrations | Liquibase, run by each service at startup |
| CI/CD | Jenkins, planned (no `Jenkinsfile` yet) |
| Remote environments | None |

---

## Correlations

| Section | Relationship |
|---------|--------------|
| `05-architecture/deployment.md` | What must run for the architecture to work |
| `11-quality/testing-strategy.md` | Tests the pipeline runs |
| `13-operations/` | Health checks, incidents, backups |
