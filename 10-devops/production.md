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
                             └► rest    ──► web (nginx + Angular build)
```

| Piece | Where it is defined | Notes |
|---|---|---|
| Base stack | `lavarapido-infra/docker-compose.yml` (`--profile app`) | SQL Server, RabbitMQ, the 6 services, payment migrations and the gateway |
| Production overrides | `lavarapido-infra/docker-compose.prod.yml` | Only Caddy publishes ports; SQL Server Express; profile `prod` (no Swagger); 512 MB and automatic restart per Java service; Mailpit replaced by a real SMTP |
| Entry point | `lavarapido-infra/deploy/Caddyfile` | HTTPS automatic when `SITE_ADDRESS` is a domain; `/actuator` never reaches the gateway because it does not start with `/api` |
| Web | `Front-end-proyecto-web/Dockerfile` + `nginx.conf` | Angular production build served by nginx; nginx proxies `/api` to the gateway and sends the security headers below |
| Secrets | `lavarapido-infra/.env.production` (template `.env.production.example`, git-ignored) | Never the development values |

The current server is an Azure VM (`lavarapidovehicular.northcentralus.cloudapp.azure.com`), the one the
mobile `preview` build points to (`EXPO_PUBLIC_API_URL` in `eas.json`).

---

## Configuration (`.env.production`)

| Variable | Purpose |
|---|---|
| `SITE_ADDRESS`, `PUBLIC_URL` | Domain for Caddy and the public base URL (links in emails, the inspection report link, the APK button). Without a domain: `:80` and `http://<server IP>` |
| `DB_PASSWORD`, `DB_NAME`, `DB_USERNAME` | SQL Server inside the stack |
| `JWT_SECRET`, `INTERNAL_API_KEY` | New random values (`openssl rand -base64 48`); the services refuse to start in `prod` without the internal key |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME` | First administrator, see below |
| `MESSAGING_ENABLED`, `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD` | Events between services (must be `true` in production) |
| `MAIL_ENABLED`, `MAIL_DOCKER_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` | Real SMTP (Gmail with an app password) |
| `PUSH_ENABLED` | `true` sends push notifications through Expo to the installed app |
| `AUTO_ASSIGN_ENABLED` | Automatic operator assignment when a booking is confirmed (RF-008) |
| `BOOKING_ZONE` | `America/Bogota` |

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

The CSP does not restrict scripts or styles yet: Angular's `index.html` loads its stylesheet with an
inline `onload`, which a strict `script-src` would block. Tightening it means turning off critical CSS
inlining in `angular.json` first.

The Firebase key in the mobile `google-services.json` is meant to be public in an Android app, but it
should be restricted to the package `com.vehiclecarwash.app` in the Google Cloud console.

---

## Updating the server

After pushing to `develop`:

```bash
bash ~/lavarapido/lavarapido-infra/deploy/update-server.sh                 # everything
bash ~/lavarapido/lavarapido-infra/deploy/update-server.sh web             # only the web
```

It pulls the repositories and rebuilds what changed; data in the `sqlserver-data` volume is kept and
Liquibase applies new changesets at startup.

---

## Health and status

| Check | Expected |
|---|---|
| `PUBLIC_URL` | Landing page |
| `PUBLIC_URL/api/v1/catalog/services` | JSON with the catalog |
| `PUBLIC_URL/app/version.json` | The published APK version |
| `docker compose ... ps` | Every service `healthy` |

On 16 October 2026 the Azure host resolved (64.236.160.129) but did not answer on ports 80 or 443,
so the VM was stopped or its network rules closed. While it is down, the published APK cannot reach
the API. Starting the VM (or opening 80/443 in its network security group) and running
`update-server.sh` brings it back with the data intact.

---

## Still missing for a sturdier deployment

1. A database user of its own instead of `sa`.
2. Scheduled backups of the `sqlserver-data` volume.
3. A CI pipeline that tests and builds the images before deploying (`ci-cd.md`).
4. Uptime monitoring of `PUBLIC_URL` so an outage like the one above is noticed at once.

---

## Correlations

- Local environment → `local-setup.md`
- Every configuration variable → `environments.md`
- Notification types and push → `05-architecture/decisions/records/ADR-011-notification-service-push-and-events.md`
- Migration numbering → `06-data/migration-strategy.md`
