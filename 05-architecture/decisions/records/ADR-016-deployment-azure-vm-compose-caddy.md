# ADR-016 — Deployment: One Azure VM with Docker Compose and Caddy

- **ID:** ADR-016
- **Date:** 2026-10-23 (records the deployment in use since 2026-10-15, when `docker-compose.prod.yml` and the `Caddyfile` were added)
- **Status:** Accepted (updated 2026-10-24: web on port 8080 without root, `:prev` images, rollback, clean-up)
- **Authors:** Development team

---

## Context

The system has nine runnable parts (six services, the API gateway, the Angular web and the mobile
API it shares) plus SQL Server and RabbitMQ. The instructors and the demos need one public address
that works from a browser and from the installed Android app, with HTTPS, and the team needs to
update it several times a week.

**Known constraints:**
- No budget: an *Azure for Students* subscription with limited credit, so the machine is turned on
  only for reviews, demos and tests.
- Three part-time developers, none of them dedicated to operations.
- The same images must run locally (`docker compose --profile app`) and on the server, so a bug seen
  on the server can be reproduced on a laptop.
- The Android app needs a stable host name for `EXPO_PUBLIC_API_URL` and a place to download the APK.

---

## Decision

**We decided:** to deploy everything on **one Linux VM in Azure** (`vehiclecarwash-vm`,
`lavarapidovehicular.northcentralus.cloudapp.azure.com`, Ubuntu with Docker), with the same
`lavarapido-infra/docker-compose.yml` used locally plus `docker-compose.prod.yml` on top, and
**Caddy** as the only container that publishes ports (80/443).

| Piece | Production setting |
|---|---|
| Entry | Caddy: automatic HTTPS for the domain; `/api/*` → `api-gateway:8080`; `/app/*` → APK and `version.json` from `deploy/downloads`; everything else → `web:8080` (unprivileged nginx with the Angular build, no root since 2026-10-24, H-19). `/actuator` never reaches the gateway because it does not start with `/api` |
| Security headers | Caddy sets HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, removes `Server`, and a CSP for the web (`script-src 'self'` plus the hash of Angular's inline `onload`) |
| Services | `SPRING_PROFILES_ACTIVE=prod` (no Swagger, no demo accounts), `mem_limit` 512 MB per Java service (384 MB payment, 64 MB web and Caddy), health checks, `restart: unless-stopped`, logs capped at 3 × 10 MB |
| Data | SQL Server Express in the `sqlserver-data` volume; RabbitMQ and Caddy certificates in volumes; nothing but Caddy reachable from outside |
| Secrets | `.env.production` on the server (git-ignored); `INTERNAL_API_KEY`, `JWT_SECRET` and the RabbitMQ user are mandatory (`${VAR:?…}`) |
| Backups | `deploy/backup-db.sh` + `verify-backup.sh` by cron (daily 23:00 UTC and 5 minutes after boot) and before every update (`pre-update`, the last 10 kept apart from the 14 regular ones); `restore-db.sh` by hand, with the deploy lock and a typed confirmation |
| Updates | `deploy/update-server.sh` pulls the repositories (never downgrading), tags the running images `:prev`, runs `up -d --build`, waits for health and prunes old images; today it follows `develop` by hand (`BRANCH=develop`; ADR-017 for the move to `main`). `deploy/rollback.sh` goes back to `:prev` without compiling |

**Justification:** it is the smallest setup that gives a real public URL with HTTPS for the web
and the app, reuses the local Compose files unchanged, and fits the free credit. Caddy obtains and
renews the certificate by itself and its configuration is one short file.

---

## Evaluated alternatives

| Alternative | Pros | Cons | Reason for discarding |
|------------|------|------|-----------------------|
| One VM + Compose + Caddy — chosen | Same files as local; one machine to start and stop; HTTPS without manual certificates | Single point of failure; images built on the server; restart takes 1–2 min | — (chosen) |
| Kubernetes (AKS) or Container Apps | Scaling, rolling updates, managed health | Cost above the student credit; far more configuration than the team can maintain | Out of budget and scope |
| Shared hosting / PaaS per service | Nothing to administer | Does not run Docker, Java 21 and SQL Server together; nine separate deployments | Not possible with the stack |
| nginx (or Traefik) as the public proxy | Well known | Certificates by hand (certbot) or more configuration | Caddy does HTTPS with one line |
| Keep the demos on a laptop | Free | No URL for the instructors or for the installed app | Does not meet the review needs |

---

## Consequences

**Positive:**
- One URL for the web, the API and the APK download; the app and the web share the origin, so the
  browser never needs CORS in production.
- Anyone can reproduce production locally with the same Compose files.
- Turning the VM off saves credit and loses no data (`restart: unless-stopped`, volumes).

**Negative / Trade-offs:**
- When the VM is off the site does not answer and the installed app cannot reach the API (H-15).
- Everything shares 8 GB of RAM (4 GB swap added by `setup-server.sh`); a full rebuild takes
  10–20 minutes on the server.
- Backups stay on the VM disk: they protect against a bad migration, not against losing the VM.
- The database user is `sa` for every service (accepted risk, ADR-020).

**Impact on the system:**
- Affected services: all, through `lavarapido-infra`.
- Documents: `10-devops/production.md`, `05-architecture/deployment.md`,
  `08-uml/diagrams/source/deployment-production.md`, `13-operations/README.md`.

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| The VM is off during a review | Medium | High | Turn it on before; external uptime check and a recorded video as a fallback (`15-project-control/risks.md`) |
| A migration breaks a service after an update | Low | High | Backup before every update; the update fails when a container is not healthy; `rollback.sh` (images) and `restore-db.sh` (data) |
| The disk fills with old images and backups | Medium | Medium | Keep 14 regular and 10 pre-update backups; image and build-cache prune after each healthy update (CD-10) |

---

## References

- `lavarapido-infra/DEPLOY.md`, `docker-compose.prod.yml`, `deploy/Caddyfile`
- `10-devops/production.md`, `10-devops/environments.md`
- Related to: ADR-003 (one database), ADR-005 (gateway), ADR-017 (CI/CD), ADR-018 (mobile updates), ADR-020 (accepted risks)
