# 10 — DevOps

> How LavaRápido is started, configured, deployed and built automatically. Development runs on the
> team's machines with Docker Compose; the academic demo server runs the same Compose files on one
> Azure Linux VM behind Caddy, turned on on demand.

---

## Contents

| File | What it answers |
|------|-----------------|
| [`local-setup.md`](./local-setup.md) | Start the whole system on a new computer: prerequisites, `.env`, order, ports, demo accounts, common issues |
| [`environments.md`](./environments.md) | Which environments exist, how they differ, every configuration variable |
| [`production.md`](./production.md) | The public server: topology, `.env.production`, first administrator, APK publishing, security headers, status |
| [`ci-cd.md`](./ci-cd.md) | GitHub Actions: CI in every repository with the real test counts, how the server is updated today and the continuous deployment that is prepared |

---

## At a glance

| Item | Value |
|---|---|
| Orchestration | `lavarapido-infra/docker-compose.yml`: SQL Server, RabbitMQ, Mailpit, the 6 services, payment migrations, api-gateway; `docker-compose.prod.yml` adds the web and Caddy |
| Configuration | One `lavarapido-infra/.env` (template: `.env.example`), read by compose and by each service run with `./mvnw` |
| Database migrations | Liquibase, run by each service at startup |
| CI/CD | GitHub Actions: `ci.yml` in the 10 repositories (838 tests green on `develop`, 2026-10-23) and `deploy.yml` in `lavarapido-infra`. The server is updated by hand from `develop`; continuous deployment from `main` is prepared in local branches, not pushed nor tested |
| Backups | `backup-db.sh` + `verify-backup.sh` by cron (daily and 5 min after boot) and before each update; `restore-db.sh` by hand (`13-operations/README.md`) |
| Remote environments | Academic demo server ("production") on an Azure VM, turned on on demand (`production.md`); no staging |

---

## Correlations

| Section | Relationship |
|---------|--------------|
| `05-architecture/deployment.md` | What must run for the architecture to work |
| `11-quality/testing-strategy.md` | Tests the pipeline runs |
| `13-operations/` | Health checks, incidents, backups |
