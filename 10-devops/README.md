# 10 — DevOps

> How LavaRápido is started, configured, deployed and (soon) built automatically. Development runs
> on the team's machines with Docker Compose; production runs the same images on one Linux VM behind
> Caddy.

---

## Contents

| File | What it answers |
|------|-----------------|
| [`local-setup.md`](./local-setup.md) | Start the whole system on a new computer: prerequisites, `.env`, order, ports, demo accounts, common issues |
| [`environments.md`](./environments.md) | Which environments exist, how they differ, every configuration variable |
| [`production.md`](./production.md) | The public server: topology, `.env.production`, first administrator, APK publishing, security headers, status |
| [`ci-cd.md`](./ci-cd.md) | The Jenkins pipeline the team will build (planned) |

---

## At a glance

| Item | Value |
|---|---|
| Orchestration | `lavarapido-infra/docker-compose.yml`: SQL Server, RabbitMQ, Mailpit, the 6 services, payment migrations, api-gateway; `docker-compose.prod.yml` adds the web and Caddy |
| Configuration | One `lavarapido-infra/.env` (template: `.env.example`), read by compose and by each service run with `./mvnw` |
| Database migrations | Liquibase, run by each service at startup |
| CI/CD | Jenkins, planned (no `Jenkinsfile` yet) |
| Remote environments | Production on an Azure VM (`production.md`); no staging |

---

## Correlations

| Section | Relationship |
|---------|--------------|
| `05-architecture/deployment.md` | What must run for the architecture to work |
| `11-quality/testing-strategy.md` | Tests the pipeline runs |
| `13-operations/` | Health checks, incidents, backups |
