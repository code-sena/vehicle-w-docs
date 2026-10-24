# Production Deployment

> How LavaRápido runs on a public server: one Linux VM with Docker, Caddy in front, and the same
> images as the local Docker profile. The step-by-step commands live in
> `lavarapido-infra/DEPLOY.md`; this page explains the shape of the deployment, what each piece
> does and what still has to be watched.

---

## Topology

```
Internet ──► Caddy :80/:443 ──► /api/*  ──► api-gateway:8080 ──► security · customer · booking
                             │                                    operations · payment · notification
                             ├► /app/*  ──► APK and version.json (deploy/downloads)
                             └► rest    ──► web:8080 (unprivileged nginx + Angular build)
```

| Piece | Where it is defined | Notes |
|---|---|---|
| Base stack | `lavarapido-infra/docker-compose.yml` (`--profile app`) | SQL Server, RabbitMQ, the 6 services, payment migrations and the gateway |
| Production overrides | `lavarapido-infra/docker-compose.prod.yml` | Only Caddy publishes ports; SQL Server Express; profile `prod` (no Swagger); 512 MB and automatic restart per Java service; Mailpit replaced by a real SMTP |
| Entry point | `lavarapido-infra/deploy/Caddyfile` | HTTPS automatic when `SITE_ADDRESS` is a domain; `/actuator` never reaches the gateway because it does not start with `/api` |
| Web | `Front-end-proyecto-web/Dockerfile` + `nginx.conf` | Angular production build served by `nginx-unprivileged` on port **8080**, without root (H-19, 2026-10-24; Caddy points to `web:8080` and the health check to `127.0.0.1:8080`); the build runs `npm ci --ignore-scripts`. nginx proxies `/api` to the gateway and sends the security headers below |
| Secrets | `lavarapido-infra/.env.production` (template `.env.production.example`, git-ignored) | Never the development values |

The current server is an Azure VM (`lavarapidovehicular.northcentralus.cloudapp.azure.com`), the one the
mobile `preview` build points to (`EXPO_PUBLIC_API_URL` in `eas.json`).

---

## Configuration (`.env.production`)

| Variable | Purpose |
|---|---|
| `SITE_ADDRESS`, `PUBLIC_URL` | Domain for Caddy and the public base URL (links in emails, the inspection report link, the APK button). Without a domain: `:80` and `http://<server IP>` |
| `DB_PASSWORD`, `DB_NAME`, `DB_USERNAME` | SQL Server inside the stack (`sa`, an accepted risk: `15-project-control/risks.md`) |
| `JWT_SECRET`, `INTERNAL_API_KEY` | New random values (`openssl rand -base64 48`). `docker-compose.prod.yml` refuses to start security, booking, operations and notification without the internal key (`${INTERNAL_API_KEY:?…}`). Since 2026-10-23 (E-01) it is also what lets the operator start and finish services: booking only accepts `/api/v1/operator/bookings/**` from operations-service with this key, so without it the operator flow answers 503 |
| `ALLOWED_EMAIL_DOMAINS` | Domains accepted on sign-up, account creation and email change (A-01; default `gmail.com`). Login and password recovery do not check it |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`, `ADMIN_DOCUMENT`, `ADMIN_PHONE` | First administrator, see below; the email must belong to an allowed domain |
| `MESSAGING_ENABLED`, `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD` | Events between services (must be `true` in production; not `guest`) |
| `MAIL_ENABLED`, `MAIL_DOCKER_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` | Real SMTP (Gmail with an app password) |
| `PUSH_ENABLED` | `true` sends push notifications through Expo to the installed app |
| `AUTO_ASSIGN_ENABLED` | Automatic operator assignment when a booking is confirmed (RF-008) |
| `BOOKING_ZONE` | `America/Bogota` |
| Optional: `SESSION_CHECK_*`, `BOOKING_EXPIRY_GRACE_MINUTES`, `FOLLOW_UP_ENABLED`, `FOLLOW_UP_INTERVAL`, `FOLLOW_UP_LOOK_BACK_DAYS` | Defaults are fine; `FOLLOW_UP_LOOK_BACK_DAYS=28` is how many days back operations looks for bookings nobody closed, since the VM can stay off for weeks (`environments.md`). `BOOKING_EXPIRY_CHECK_*` still appear in the templates but booking no longer reads them (B-07) |
| Read by the services with their defaults, not passed by the compose files (2026-10-24) | `AUTH_RATE_LIMIT_*`, `TRUSTED_PROXIES`, `ROUTE_CONNECT_TIMEOUT`, `ROUTE_READ_TIMEOUT` (gateway), `START_LATE_LIMIT` (operations), `DELIVERY_*` (notification), `BOOKING_SERVICE_TIMEOUT` (customer). Changing one means adding it to the service in the compose file (`environments.md`) |

`docker-compose.prod.yml` sets `SPRING_PROFILES_ACTIVE=prod` for every Java service, so Swagger is
off and the demo accounts are never created there (`DEMO_*_PASSWORD` is only read with the `dev`
profile).

`CORS_ALLOWED_ORIGINS` is set to `PUBLIC_URL` for every service in `docker-compose.prod.yml`: the web
and the API share the same origin, so the browser never needs CORS there. The development default
(`http://localhost:4200,http://localhost:8081`) is the same in the gateway, every service and the
compose file.

---

## First administrator

A production database starts empty: the demo accounts (`admin@gmail.com`, …) only exist in
development and public sign-up only creates clients. When security-service starts it runs
`AdministratorBootstrapRunner`:

1. Without `ADMIN_EMAIL` and `ADMIN_PASSWORD` it creates nothing; if there is no administrator either,
   the log warns `There is no administrator yet`.
2. If at least one account with role `ADMIN` exists, it does nothing (`ADMIN_EMAIL is not used`).
3. Otherwise it creates the account through the same use case an administrator uses to create
   accounts: password policy, unique email and document, and the `UserRegistered` event (welcome
   email). `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`, `ADMIN_DOCUMENT` and `ADMIN_PHONE` are optional
   (defaults `Administrador`, `Principal`, `1000000000`, `3000000000`). The log shows
   `First administrator created`.
4. A failure (invalid data, database not answering) is logged and security-service keeps starting:
   login does not depend on it. Fix the variables and restart.

With the administrator in place the variables are ignored, so they can be removed after the first
start. The password is never written to the log.

---

## Publishing a new version of the mobile app

| Change | Command (from the mobile repo) | What happens |
|---|---|---|
| Screens or logic only | `npm run publish:update -- "what changed"` | EAS Update (OTA): the installed app downloads it on the next start |
| Native change (new library, permissions, icon) | `eas build -p android --profile preview`, then `npm run publish:apk -- "what changed"` | `scripts/publish-apk.mjs` connects by SSH (`DEPLOY_HOST`, `DEPLOY_SSH_KEY`) and runs `deploy/publish-apk.sh` on the server |

`publish-apk.sh` downloads the APK, replaces `deploy/downloads/LavaRapidoVehicular.apk` in one move
(nobody downloads half a file), writes `version.json` (`versionCode`, size, date, notes) and calls
`POST /internal/v1/notifications/app-update` inside the Docker network with the internal key.
notification-service then sends the `APP_UPDATE_AVAILABLE` notice (inbox and push) once per
`versionCode` to every user with the app installed. `NOTIFY=0` publishes without notifying.

The web landing page shows the download button and a QR code for `/app/LavaRapidoVehicular.apk`,
and the installed app compares its `versionCode` with `version.json` to offer the update.

---

## Security headers

nginx adds these headers to every web response (`nginx-security-headers.conf`, included in each
`location` because nginx drops server-level `add_header` when a location sets its own):

| Header | Value |
|---|---|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Content-Security-Policy` | `frame-ancestors 'self'; object-src 'none'; base-uri 'self'` |

In production those values are replaced by Caddy (`deploy/Caddyfile`, `header { defer … }`), which also
sends `Strict-Transport-Security`, removes `Server` and sets the CSP actually in force for the web:
`default-src 'self'; script-src 'self' 'unsafe-hashes' 'sha256-…'` (the hash allows only the inline
`onload` Angular adds to load its stylesheet), `style-src` and `font-src` with Google Fonts and jsDelivr,
`img-src 'self' data: blob:`, `connect-src 'self'`, `object-src 'none'`, `frame-ancestors 'self'`. If
Angular changes that `onload`, the page loads without styles and the browser console shows the new hash
to put in the `Caddyfile`.

The Firebase key in the mobile `google-services.json` is meant to be public in an Android app, but it
should be restricted to the package `com.vehiclecarwash.app` in the Google Cloud console.

---

## Updating the server

**Today (2026-10-24) the server runs `develop`** (updated at 04:35, before the 128 fleet branches,
which are **not deployed yet**) and is updated by hand, by a member with SSH access:

```bash
BRANCH=develop bash ~/lavarapido/lavarapido-infra/deploy/update-server.sh      # everything
BRANCH=develop bash ~/lavarapido/lavarapido-infra/deploy/update-server.sh web  # only the web
```

`BRANCH=develop` is required until `v1.1.0` is on `main`: the merged scripts default to `main`, and
`setup-server.sh` refuses to move a repository to a branch that does not contain what is deployed
(it stops with an error instead of downgrading; `ALLOW_DOWNGRADE=1` forces it).

`update-server.sh` (as merged on 2026-10-24):

1. pulls the 9 repositories (`setup-server.sh`); if one fails nothing is built;
2. backs up the database (`backup-db.sh pre-update`; if it fails nothing is updated);
3. tags each running image `lavarapido/<service>:local` as `:prev`, unless `backups/update-pending`
   shows that the last update did not finish (then `:prev` keeps the last version that worked);
4. rebuilds what changed with `docker compose … --profile app up -d --build` (data in the
   `sqlserver-data` volume is kept; Liquibase applies new changesets at startup);
5. restarts Caddy when the Caddyfile it sees differs from the repository's;
6. waits up to 8 minutes for the 11 containers to be healthy, otherwise exits 1 naming them;
7. on a full update, writes `backups/deployed-heads`; removes `update-pending`;
8. prunes dangling images and build cache older than 7 days.

**The first update after the merge** still runs the old scripts, which do not restart Caddy: the new
web listens on 8080 and the new Caddyfile says `web:8080`, so the web answers 502 until Caddy is
restarted (`… --profile app restart caddy`) or the update is run a second time.

If an update leaves something broken: `deploy/rollback.sh [services]` (images) and, if a migration
broke the data, `restore-db.sh` with the `pre-update` backup (`13-operations/README.md`).

The **Desplegar en Azure** button of `lavarapido-infra` (`ci-cd.md`) does the same from GitHub, but
on 2026-10-24 it had never run: the `AZURE_SSH_KEY` secret does not exist yet. The last update
documented with evidence is 2026-10-24 at 04:35 (`auditoria-lavarapido-2026-10-24.md`).

**Next: continuous deployment from `main`.** Merged into `develop` of the 10 repositories on
2026-10-24, not run yet: every merge to `main` with green CI asks `deploy.yml` to update the server;
the server switches to `main` (payment stays on `develop` until its first release), and, if the VM
was off, catches up on the next boot (`boot-update.sh` compares `repo-heads.sh` with
`backups/deployed-heads`). Flow, secrets and first-run steps: `ci-cd.md`.

### Access with a personal key

Each member creates their own key and shares only the public part; private keys are never sent or
committed.

```powershell
ssh-keygen -t ed25519 -f $HOME\.ssh\lavarapido_azure      # on the member's PC
ssh -i $HOME\.ssh\lavarapido_azure azureuser@<server IP>  # once the key is added
```

The project lead adds the `.pub` line once: Azure portal → `vehiclecarwash-vm` → **Reset password →
Reset SSH public key** (user `azureuser`), or `echo "<public key>" >> ~/.ssh/authorized_keys` on the
server. As of 2026-10-19, `authorized_keys` holds the project lead's key and Juan Camilo's key. The
restricted GitHub Actions key (`restrict,command="bash …/deploy/ci-deploy.sh"`) still has to be added
together with the `AZURE_SSH_KEY` secret (`ci-cd.md`). Deleting a line revokes that access.

---

## Health and status

| Check | Expected |
|---|---|
| `PUBLIC_URL` | Landing page |
| `PUBLIC_URL/api/v1/catalog/services` | JSON with the catalog |
| `PUBLIC_URL/app/version.json` | The published APK version |
| `docker compose ... ps` | Every service `healthy` |

The VM runs on an *Azure for Students* subscription, so the project lead turns it on for reviews,
demos and tests and off the rest of the time to save credit. While it is off the host still resolves
(64.236.160.129) but ports 80 and 443 do not answer and the installed app cannot reach the API; starting
the VM brings everything back with the data intact (`restart: unless-stopped`). After merging to
`develop`, run `BRANCH=develop update-server.sh` so the server gets the new images.

---

## Database backups

They already exist (`lavarapido-infra/deploy`, since 2026-10-21). `setup-server.sh` writes two cron
lines for `azureuser`: `@reboot sleep 300` and `0 23 * * *` (6 p.m. in Colombia), each running
`backup-db.sh` and then `verify-backup.sh`. `update-server.sh` also backs up before every update.

| Script | What it does |
|---|---|
| `backup-db.sh` | `BACKUP DATABASE … WITH CHECKSUM` + `RESTORE VERIFYONLY`, copies it out of the container, gzips it to `~/lavarapido/backups/LavaRapido-<UTC>.bak.gz` (mode 600) and keeps the last 14 (`BACKUP_KEEP`). With a label (`pre-update`, `pre-restore`) it writes `LavaRapido-<label>-<UTC>.bak.gz` and keeps the last 10 of that label (`BACKUP_KEEP_LABELED`), so many updates in a row never delete the daily ones |
| `verify-backup.sh` | Restores the newest backup as `LavaRapido_verificacion`, compares its table count with the real database, counts users and bookings, then drops it |
| `restore-db.sh <file>` | Replaces `LavaRapido`: takes the deploy lock, needs a terminal and asks to type `RESTAURAR` (showing the date and the steps), backs up the current state first, stops the services, restores, reruns `payment-migrate` and always starts the services again (E-20). With `--as <name>` it restores under another name without touching the real database |
| `rollback.sh [services]` | Goes back to the `:prev` images without compiling; lock, `VOLVER`, terminal, health wait, line in `deploy.log` (CD-11) |

Every run is logged in `~/lavarapido/backups/backup.log`. The backups live on the VM disk: they
protect against a bad migration or a human error, not against losing the VM. Procedure and
checks: `13-operations/README.md`.

---

## Still missing for a sturdier deployment

1. A database user of its own instead of `sa` (accepted risk for this version, `15-project-control/risks.md`).
2. Creating the secrets and running the continuous deployment for the first time (`ci-cd.md`).
3. Building the images in CI and pushing them to a registry, so the server stops compiling (CI already tests every repository, `ci-cd.md`).
4. Uptime monitoring of `PUBLIC_URL` so an outage like the one above is noticed at once.
5. A copy of the backups outside the VM (image pruning and backup retention exist since 2026-10-24).
6. `rollback.sh` that detects a contract change against `:prev`, and the lock in `update-server.sh` run by hand (`15-project-control/risks.md`).

---

## Correlations

- Local environment → `local-setup.md`
- Every configuration variable → `environments.md`
- Notification types and push → `05-architecture/decisions/records/ADR-011-notification-service-push-and-events.md`
- Why one VM with Compose and Caddy → `05-architecture/decisions/records/ADR-016-deployment-azure-vm-compose-caddy.md`
- Mobile updates (EAS Update and APK) → `05-architecture/decisions/records/ADR-018-mobile-app-updates.md`
- Backups and restore → `13-operations/README.md`
- Migration numbering → `06-data/migration-strategy.md`
