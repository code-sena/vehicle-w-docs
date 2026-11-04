# Risk Register

> Risks that can stop LavaRápido from being delivered or demonstrated. Reviewed at each
> retrospective and whenever a service is merged. Last review: **2026-10-27** (against `main` of the 10
> repositories after the releases of that day; the server runs `main` through the continuous deployment.
> Findings of the cross review of section 4 of `auditoria-lavarapido-2026-10-24.md` kept below).

Level = probability × impact (Low / Medium / High → Low, Medium, High, Critical).
Owner is a role; the team assigns the person in the sprint board.

---

## Active risks

| ID | Risk | Category | Prob. | Impact | Level | Strategy | Owner |
|----|------|----------|-------|--------|-------|----------|-------|
| R-003 | Regressions reach `develop` unnoticed: CI runs the unit tests of every repository, but the end-to-end suite still depends on someone running it | Technical | Low | Medium | Low | Mitigate | Team lead |
| R-004 | Secrets leak (`.env`: DB password, `JWT_SECRET`, `INTERNAL_API_KEY`, Gmail app password) | Security | Low | High | Medium | Avoid | Every developer |
| R-005 | An event is lost between commit and publish (no Outbox): missing welcome/booking notification or profile | Technical | Low | Medium | Low | Accept | notification-service owner |
| R-006 | Work stays uncommitted in several repositories or collides with a teammate's (mobile, web) | Team | Medium | Medium | Medium | Mitigate | Each repository owner |
| R-008 | Data loss on a developer machine (`docker compose down -v`, broken volume) before a demo | Technical | Low | High | Medium | Mitigate | Whoever runs the demo |
| R-009 | Gmail SMTP stops (app password revoked, daily sending limit) | External | Medium | Low | Low | Accept | notification-service owner |
| R-010 | Documentation drifts from the code again | Team | Medium | Medium | Medium | Mitigate | Author of each PR |
| R-011 | The public server on Azure is off when it is needed (it is turned on on demand by one person), in particular at the final exposition (~2026-10-27); there is no uptime monitor (H-15). What reaches `main` while it is off is deployed when it starts (`boot-update.sh`) | Operations | Medium | High | High | Mitigate | DevOps (project lead) |
| R-017 | The web admin payments queue (unpaged, with images, every 45 s) exhausts payment's memory with real data (E-10 web) | Technical | Medium | High | High | Mitigate | web owner |
| R-015 | A merge to `main` during the exposition recreates containers for 1–2 minutes (CD-15) | Operations | Medium | Medium | Medium | Avoid | Team lead |

---

## Details



### R-003 — No automated safety net

- **Trigger:** a merge breaks a flow that worked.
- **Mitigation:** GitHub Actions runs `./mvnw verify`, `dotnet test`, `ng build`/`ng test` and `tsc` on
  every push and pull request since 2026-10-19 (`10-devops/ci-cd.md`); merge only with the check green,
  and run the end-to-end suite (`lavarapido-infra/e2e`, 19 tests against the containers) before a release.
- **Contingency:** manual end-to-end run before each review session (`13-operations/README.md`).

### R-004 — Secrets

- **Mitigation:** `.env` is git-ignored; `.env.example` only has names; logs never print secrets;
  secrets are never pasted into chats or issues.
- **Contingency:** rotate the leaked value in `.env` (new Gmail app password, new `JWT_SECRET` —
  which logs everyone out — or new `INTERNAL_API_KEY`) and restart the services.

### R-005 — Lost event

- **Mitigation:** consumers are idempotent and failures go to dead-letter queues, so a retry is
  safe; customer-service also creates the profile on first use if the event never arrived.
- **Contingency:** tell the customer directly. The API has a manual notification endpoint
  (`POST /api/v1/admin/notifications`, `SYSTEM_MESSAGE`), but no screen of the web or the app uses it.

### R-006 — Uncommitted or colliding work

- **Mitigation:** small commits per repository; nobody changes the mobile app while a teammate is
  working on it; pull every repository before starting and merge feature branches into `develop`
  the same day.
- **Contingency:** resolve conflicts keeping both changes, then run the tests.


### R-008 — Data loss before a demo

- **Mitigation:** backup and restore commands in `13-operations/README.md`; on the server,
  `backup-db.sh` and `verify-backup.sh` run daily, on boot and before every update; the seeds rebuild
  the catalogs in minutes (demo accounts only with `DEMO_*_PASSWORD`, E-05).

### R-009 — Email provider

- **Status 2026-10-16:** it occurred while loading demo data locally: Gmail answered `550 5.4.5` (daily
  quota) and the emails were not sent; the notifications were still saved in the inbox.
- **Contingency:** notifications still reach the inbox and push; switch `MAIL_HOST` to Mailpit to
  show the emails locally, and keep Gmail only for the public server.

### R-010 — Documentation drift

- **Mitigation:** the review checklist (`11-quality/README.md`) requires updating `models.md`,
  OpenAPI exports and the service docs in the same PR.

### R-011 — Public server off

- **Mitigation:** the server is described in `10-devops/production.md`; whoever needs it for a review
  asks the DevOps owner to turn it on in advance. It runs `main` and the continuous deployment updates it on
  every merge; if it was off, `boot-update.sh` deploys at start what reached `main` meanwhile (ADR-017).
  Before the exposition: VM on the day before, an external uptime check of `PUBLIC_URL` and a recorded
  video of the main flows.
- **Contingency:** run the demo locally with Docker (`lavarapido-infra`, profile `app`) or show the video.

### R-017 — Unpaged payments queue in the web

- **Mitigation:** switch the web to `?page&size` and load the image in the detail before real data
  arrives (the mobile app already does it).
- **Contingency:** close the admin tabs that are not in use; payment restarts by itself (`restart: unless-stopped`).

### R-015 — Changes during the exposition

- **Mitigation:** freeze `main` on 2026-10-27 and deploy the day before.

---

## Open findings (cross review of 2026-10-24)

Only what is still open in `origin/develop` after the 128 branches merged on 2026-10-24: section 4 of
`auditoria-lavarapido-2026-10-24.md` and the `REVIEW-*.md` reports of the fleet. Everything else of the
review of 2026-10-23 is closed below, with its merge commit.

| ID | Severity | Finding | Where | Owner |
|----|----------|---------|-------|-------|
| E-10 (web) | High | The web still asks the admin payments queue without `page`/`size`: up to 200 payments with their receipt image, plus one call to booking per booking, every 45 s in two screens (WEB-16). With real data it puts payment's 384 MB at risk. Fix: `?status=&page=0&size=20`, `hasReceiptImage`, image only in the detail (`GET /admin/payments/{id}`) | web `payments-api.ts`, `payments-store.ts` | web owner |
| E-11 (lock) | Medium | booking keeps the schedule lock (`sp_getapplock`) while it calls customer (up to 3 s) in cancel, status change and the operator's advance: with customer slow every booking write queues and may answer 409 `SCHEDULE_BUSY`. Fix: read the vehicle before taking the lock | booking `BookingService` | booking owner |
| OPS-01 (follow-up) | Medium | A booking the admin set `COMPLETED` with lines still open gets false "not started" notices (`FollowUpPolicy`); the first start after the deploy may send a burst for the last 28 days. Count those bookings in production before the release | operations `FollowUpPolicy`, `FollowUpService` | operations owner |
| OPS-11 + A-13 | Medium | Every `BookingConfirmed` asks security for every operator's account, also those without a shift; failing closed, one transient failure stops the whole assignment (3 retries, then the DLQ). Fix: check only the candidates that pass `AssignmentPolicy` | operations `OperationsService` | operations owner |
| M1 | Medium | `restore-db.sh` takes a regular backup first; the retention of 14 can delete the very file being restored | infra `deploy/restore-db.sh` | DevOps |
| M3 | Medium | `rollback.sh` reuses the current Compose and Caddyfile with the `:prev` images: a contract change between versions (port 80↔8080, variables) leaves the service down | infra `deploy/rollback.sh` | DevOps |
| M4 | Medium | `update-server.sh` run by hand does not take the deploy lock and can collide with `boot-update.sh` or the workflow | infra `deploy/update-server.sh` | DevOps |
| M2 | Medium | The inspection opened by link or after a reload shows client, state, service and date empty (the store no longer loads in its constructor since WEB-16) | web `inspection.viewmodel.ts` | web owner |
| M5 (MOV-10) | Medium | The push is not unregistered when the session expires with the app in the background or opened cold (the DELETE answers 401) | mobile `AuthServiceContext.tsx` | mobile owner |
| Low (contracts) | Low | `reasonCode` published but not used by notification (reason in Spanish for every language); the automatic no-show publishes nothing; old PACKAGE promotions cannot be edited; the unlocked-coupon notice omits a FIXED amount; `BOOKING_EXPIRY_CHECK_*` still in the infra files; the web operator history expects cancelled bookings that never arrive | notification, booking, payment, infra, web, mobile | each owner |
| Low (backend) | Low | notification `markDelivered` inside the send `try` (a database error after sending repeats it); payment 022 fills old redemptions with today's promotion (check the IN_REVIEW payments first) and 023's view also blocks the same reference on an in-person payment of the same booking; operations answers 500 to a trigger `THROW` (was 409) and `LegacyQueueMigration` uses auto-ack; security answers 500 when `sp_getapplock` times out; BIZ-10 checks every future booking when the week changes | `REVIEW-BACKEND.md` items 4–11 | each owner |
| Low (front) | Low | Web `amountDueFailed` not reset after a coupon change; a silent refresh can overwrite a coupon just applied (web and mobile); `deploy.yml` may lose the SSH session in a long `compose up` | `REVIEW-FRONT-INFRA.md` B1–B3 | web, mobile, DevOps |

**Operational items of the release (state on 2026-10-27):**

| # | Item | Who | State |
|---|------|-----|-------|
| 1 | Create the secrets: `AZURE_SSH_KEY` and `DEPLOY_DISPATCH_TOKEN` in the project lead's 6 repositories; `DEPLOY_DISPATCH_TOKEN` and `EXPO_TOKEN` in Camilo's and Merari's (CD-01) | project lead, Camilo, Merari | ✅ Done: the continuous deployment runs since 2026-10-26 |
| 2 | Merge the documentation: `lavarapido-docs` to `main` and `vehicle-w-docs` to `docs` | project lead | `vehicle-w-docs` is integrated in `docs` as it changes and `main` is moved forward to `docs` (equal since 2026-11-04); `lavarapido-docs` is kept by its owner |
| 3 | Deploy on Azure; the first run with the old scripts needed a Caddy restart | DevOps | ✅ Done: the server runs `main`, deployed by the continuous deployment (2026-10-26 and 2026-10-27, web and API 200) |
| 4 | Before the release, in the production database: look for duplicated open payments (migration 023) and count the `COMPLETED` bookings with open lines | DevOps, payment and operations owners | Not recorded here. Migration 023 is deployed (its first changeset already rejects the older duplicated open payment) |
| 5 | Releases to `main` with infra last; payment and mobile by Merari; then remove payment from `DEVELOP_ONLY` | whole team | ✅ Done: the 10 repositories have their release on `main` (payment `v1.1.2`, mobile `v1.1.2`) and `DEVELOP_ONLY` is empty. Payment `v1.1.3` was merged to `main` on 2026-10-27; tag and GitHub release on 2026-11-04 |
| 6 | End-to-end tests against Azure with `e2e.yml` and the test accounts the team creates | project lead | Open: `e2e.yml` has not run (no `E2E_*` secrets); the local suite passed 19/19 on 2026-10-27 |
| 7 | Regenerate the PDF and Word deliverables with the team's APA 7 generator | documentation owner | Kept by the owner of `lavarapido-docs` |

**Open items found on 2026-10-27:**

| ID | Severity | Item | Where | Owner |
|----|----------|------|-------|-------|
| H-09 | Medium | The Firebase API key of the mobile `google-services.json` is not restricted to the package `com.vehiclecarwash.app` in the Google Cloud console (TD-052) | mobile, Google Cloud console | mobile owner |
| H-15 | Medium | No uptime monitor (UptimeRobot or similar) for `PUBLIC_URL` (R-011) | infra | DevOps |
| Legal data | Medium | The legal texts (terms and data policy, web and mobile) still carry sample contact data: `datos@expresscarwash.co`, `+57 300 123 4567`, NIT and address of "Express Car Wash S.A.S." (TD-053) | web `src/assets/i18n/*.json`, mobile `src/app/config/locales/*.json` | web and mobile owners, with the real business data |
| H-23 | Low | No OpenAPI export from the running services: the contracts of `07-api` are rebuilt and edited by hand from the code (TD-054) | all services, `07-api` | backend lead |
| Pagination | Low | The booking lists (`/api/v1/bookings/me`, `/api/v1/admin/bookings`) return every booking (all of the client's, or all of the admin's date range) without paging (TD-055) | booking-service, web, mobile | booking owner |

## Accepted risks for version 1 (ADR-020)

| ID | Risk | Why it is accepted |
|----|------|--------------------|
| H-11 (TD-011) | No Outbox: an event is lost if RabbitMQ is down at publish time | Four services and two languages to change; jobs rebuild what matters from the database |
| H-10 | Every service uses the `sa` login | Nine schemas of grants and six services to change days before the exposition; SQL Server is not reachable from outside |
| H-18 | The web keeps the JWT in `localStorage` | An HttpOnly cookie needs CSRF and refresh support; 1-hour tokens, session check and a strict CSP limit it |
| H-16 | Admin reports are computed in the browser | Backend reporting is new work in three services; academic data volume |
| D-02, E-21, SEC-15 | Session answer cached 30 s in the gateway; `refresh_token_hash` never written; sign-up with a walk-in person's document links that person | Documented in the gateway and security READMEs on 2026-10-24; small impact for an academic deployment |

## Closed on 2026-10-24 (merged into `develop`, CI green; released on `main` and deployed since 2026-10-26)

The fleet round merged 128 branches with `--no-ff` in the 10 repositories (`auditoria-lavarapido-2026-10-24.md`).
Each commit below is the **merge commit in `develop`** of that repository. They reached the server with
the releases of 2026-10-26 and 2026-10-27 through the continuous deployment (migrations applied, web and
API 200; C-010 below).

| ID | What was fixed | Commits in `develop` |
|----|----------------|----------------------|
| SEC-01 | The gateway checks the session of every request with `Authorization`, any scheme and any path; logout clears every variant | gateway `2e20204` |
| SEC-04 (= E-04) | 60 requests/min per client IP on `/api/v1/auth/**` (429 `RATE_LIMITED`, `Retry-After`); `/password/forgot` with even timing | gateway `3cfa9e9`, security `8987e9b` |
| SEC-05 | Recovery code with `sp_getapplock`; the 5th failure burns it (423 `TOO_MANY_ATTEMPTS`) | security `6450d2e`, mobile `261fc11` |
| SEC-07 (= E-03) | Law 1581 consent required (400 `CONSENT_REQUIRED`) | security `c5ecf17` |
| SEC-09 | 403 tests with CLIENT and OPERATOR on admin and `/users/me/*` endpoints | security `f78a995` |
| SEC-11 | Password limit in UTF-8 bytes; real client IP forwarded by the gateway and trusted by security only from private proxies | security `abf328e`, `845e543`; gateway `5744839` |
| SEC-12 | Wrong current passwords count in the login lockout | security `c2fd4ec` |
| SEC-16 | Route timeouts 5 s / 60 s | gateway `e5d7c12` |
| A-01 (rest) | Login and recovery check only the email format; the current email is accepted unchanged | web `31594ac`, mobile `eb7621c`, security `0b5ed17` |
| BIZ-01 | The client only changes date and time (409 `BOOKING_SERVICES_LOCKED`); approving checks the amount (409 `AMOUNT_CHANGED`); the admin is warned | booking `2983d76`, payment `a898a98`, web `19138db` |
| BIZ-02 (rest of E-08) | Amount due and coupon from the server (`GET /loyalty/redemptions/{bookingId}`), also after a reload | payment `fb90b0c`, web `0bdc8c1`, mobile `2ce105f` |
| BIZ-04 (rest) | Service price greater than 0 (migration 044) | booking `66a6998` |
| BIZ-05 | Percentage coupon recalculated with today's total (migration 022) | payment `6a924b4` |
| BIZ-06 | Frozen price only for the same vehicle type | booking `c903e65` |
| BIZ-07 | `bookingCancelled` on payments: refund or reject | payment `9d2e299`, web `04b4ee3`, mobile `f4e6fb2` |
| BIZ-08 (= E-17) | A vehicle with active bookings cannot be removed | booking `a7e8e1d`, customer `7f5c3a6`, infra `9637cb9` |
| BIZ-09 (= E-11, A-16) | `@Version` + trigger 045 on bookings; one open payment per booking and unique live reference (migration 023) | booking `348683e`, payment `3e79a00` |
| BIZ-10 | Schedule, exceptions and bay states check active bookings (409 `SCHEDULE_CONFLICTS_BOOKINGS`) | booking `78dc05a` |
| BIZ-12 (A-10) | Client routes of booking and customer only for `CLIENT` | booking `ada0888`, customer `55cc4d8` |
| BIZ-13 (E-18) | Error mapping: customer's 4xx kept, 503 when the database is down; required ids in payment | booking `9497e70`, payment `c33e1d9` |
| B-07 | booking's expiry job removed (operations closes the no-shows) | booking `c9860e4` |
| A-20 / OPS-10 | `reasonCode` in `booking.cancelled`; `booking.created` binding removed | booking `62eea3a`, notification `8fde2ee` |
| E-16 (risk) | Long plates stored before the rule are readable | customer `eaad74e` |
| E-19 | Sample "Express Car Wash" data cleared (seed 113); neutral texts in the clients | booking `5e19ad3`, web `8faf9f4`, mobile `282a9b7` |
| OPS-01 (= E-13) | Start and finish save before calling booking and accept a step already done | operations `6d18916` |
| OPS-03 | `UPDLOCK` on the execution writes | operations `16175fc` |
| OPS-11 | Assignment calls booking and security before the lock | operations `5e9d15b` |
| A-13 (rest) | The account check fails closed (503 `SECURITY_SERVICE_UNAVAILABLE`) | operations `e87688c` |
| E-12 (rest) | A rescheduled booking nobody can take is left without operator; `execution.operator_unassigned` and its notices | operations `d17b5fd`, notification `54976eb` |
| A-12 | Start until `START_LATE_LIMIT` (4 h) after the end, 409 `SERVICE_TOO_LATE`, `startableUntil` | operations `4138ead`, web `0d05429`, mobile `180a6e0` |
| B-01 (rest) | The operator sees the notes; reassigning without notes keeps them | operations `b943858`, web `7ac143d`, mobile `558d848` |
| OPS-04 | Queue `operations-service.booking-confirmed` with DLX/DLQ, retries and publisher confirms | operations `1fda373` |
| OPS-08 (= A-14) | Sharing an inspection answers 503 `NOTIFICATION_NOT_SENT` without the broker's confirm | operations `984bd19` |
| OPS-12 | 503 `DATABASE_UNAVAILABLE`; every page of operators; the unassigned alert mark kept | operations `a651fe1`, `0568f47`; notification `be8fe40` |
| A-11 (rest) | `BookingStatusChanged` cancels reminders; `BOOKING_NO_SHOW` type (seed 116) | notification `952cd7e`, web `7910219`, mobile `180a6e0` |
| OPS-05 (= E-14) | Push and email with retries (`pending_delivery`, migration 047) | notification `511c022` |
| OPS-06 (= E-15) | Admin notices retried when security does not answer | notification `a345ac9` |
| E-10 (payment, mobile) | Paged admin queue without images; the mobile app uses it (the web is still open above) | payment `91fb0a4`, mobile `b430ead` |
| C-04, D-01 | Cash on an inactive account for the admin; `discountType`/`discountValue` for FIXED coupons | payment `1362263`, `ac1ec6f`; web `c0e75dc`, `2a572e6`; mobile `9a32ab4`, `5278370` |
| Sonar | Payment quality gate green | payment `7239409` |
| WEB-16 / contract 6 | Fresh data without reload (web `LiveRefresh`, mobile `useRefreshOnFocus`) | web `b0d58b5`, mobile `dfdcaad` |
| WEB-04, WEB-05, WEB-12, A-02, A-18, H-05 | Reports update on data; 216 error codes in 4 languages and field errors; recovery icons; fr/pt texts; operator history from real status; read-only permission matrix | web `2070857`, `5e5e234`, `9c57384`, `e6657e6`, `f966c6b`, `08d36ab`, `86fea9b`, `a4d3715` |
| H-19 (WEB-15) | Web image on `nginx-unprivileged` port 8080, `npm ci --ignore-scripts`; Caddy and the health check on 8080 | web `835395d`, infra `9e56536` |
| F-02 / H-03 (rest) | Real guard and interceptor tests; web coverage in CI | web `7edd87f`, `2245758` |
| MOV-04 to MOV-16 (most), MOV-06 | View models, valid status transitions, silenced errors, HTTPS production URL, push unregistration on expiry (foreground), APK check on foreground, accessibility, dead code, paging and limits; 207 error codes | mobile `def7fd7`, `d7ce3a4`, `6cfd798`, `7b5f095`, `2ad33a2`, `749257c`, `10f7a25`, `59d478e`, `89d1fa7`, `627fa7c`, `da049dd`; infra `f230ad8` |
| CD-03, CD-06 to CD-08, CD-10, CD-11, CD-13, CD-14 | Continuous deployment with health wait, Caddy restart, boot catch-up, `:prev` images and `rollback.sh`, image prune and backup retention, deploy checks, CI syntax loop and actionlint | infra `006b5b0`, `166c121`, `bae88a8`, `009f7a7`, `4653c53`, `ec4ae3d` |
| CD-04 | "Pedir despliegue" in customer, booking and payment too (8 repositories); mobile OTA `cd.yml` | booking `5dd6794`, customer `3181cae`, payment `3b8730e`, mobile `e5d7d67`, infra `e89e5a0` |
| C1 (cross review) | `setup-server.sh` never downgrades a repository | infra `cf28ed0` |
| E-20 | `restore-db.sh` with the deploy lock, confirmation and `payment-migrate`; backup cron without `USER` | infra `1150821`, `9eaa457` |
| E-05 (rest) | `payment-migrate` gets the password by `LIQUIBASE_COMMAND_PASSWORD`; placeholders in `GUIA-EQUIPO.md` (rotate the old `sa` password still in the history) | infra `b63f85a` |
| H-13 | Remote end-to-end battery and manual `e2e.yml` | infra `573d10b` |
| CD-12, H-10 | Documented: the `produccion` Environment (not created) and the shared `sa` as accepted risk | infra `03c7083`, `4a865aa` |

## Closed on 2026-10-23 (merged into `develop`, CI green)

| ID | What was fixed | Commits |
|----|----------------|---------|
| E-01 (SEC-02, BIZ-03, OPS-02) | The gateway no longer routes `/api/v1/operator/bookings/**`; booking requires `X-Internal-Key` there and operations sends it | booking `a73467d`, operations `144a0c6`, gateway `b9107aa`, infra `f07802a` |
| E-02 (SEC-03), partly | A token whose role was removed revokes all the account's sessions (open part: SEC-01) | security `579480e` |
| E-05 (SEC-06, BIZ-11), partly | security-service without a default profile; demo passwords from `DEMO_*_PASSWORD`; payment without a default database password | security `e952fe2`, infra `f0800ef`, payment `1c7df54` |
| A-01 (SEC-08), partly | `ALLOWED_EMAIL_DOMAINS` checked on sign-up, account creation and email change | security `bef15d5`, infra `fed8465`, web `9f24ce8`, mobile `ee6e339` |
| A-13, E-12 (OPS-07) | Disabled operator accounts rejected in the manual assignment; a reschedule revalidates the operator | operations `e94319c`, web `5f4377c`, mobile `437bd03` |
| A-11, partly | `booking.status_changed` tells the client about the admin's status changes | booking `369bd85`, notification `f9c9adf` |
| B-01, partly | Assignment notes stored (migration 042) and sent by the web | operations `cf28fbe`, web `dbe0a49` |
| A-02 | The admin can reassign an operator from the web | web `eb3e16d` |
| A-09 | Loyalty points frozen per booking line (migration 043) | booking `8926287` |
| A-20 | The chosen cancellation reason is used | booking `5c23630`, web `48e60e8` |
| E-16 | Plates longer than 6 characters rejected (see the open reading risk above) | customer `645fa5c` |
| E-07 (BIZ-04 for coupons) | Percentage coupons 1–99 % and a minimum amount always due | payment `827746f`, web `1175eb0`, mobile `c0cd099` |
| E-08, partly | Removing a coupon cancels the redemption on the server (open part: BIZ-02) | payment `6e2df05`, web `2158196`, mobile `ce630a5` |
| E-09 | One coupon per booking (unique index, payment migration 021) | payment `6e2df05` |
| A-17, A-19 | Revenue by approval date; "En servicio" state | web `3c02a4d` |
| A-18, partly | Operator history and assigned services with real data | web `b20d3a9` |
| F-01 | jest-expo in the mobile CI (13 tests) | mobile `07d2ab8`, `2416330` |
| F-02, partly | Guard, interceptor and ViewModel tests (web 115 → 146) | web `401489b` |
| A-04 | Sessions closed on password change and recovery; concurrent failed logins counted with `sp_getapplock` (2026-10-22) | security `b5f5b0d`, `8050f3a` |

## Closed risks / lessons learned

| ID | Risk | Outcome | Lesson |
|----|------|---------|--------|
| C-001 | Booking times shifted 5 hours | Occurred, fixed (JVM in UTC, `BOOKING_ZONE=America/Bogota`) | Store UTC, convert only at the edges |
| C-002 | Services failing at startup after `docker compose up` | Occurred, understood | Wait for SQL Server to be healthy before starting services |
| C-003 | Two booking implementations of the same service | Occurred, resolved by rebuilding from the SQL model | Agree on the data model before coding a service |
| C-004 | operations-service drifting from the booking/notification contracts (old R-001) | Closed 2026-10-16: it publishes and consumes the agreed events and assigns automatically on `booking.confirmed` | Fix event contracts in `02-domain` before building the consumer |
| C-005 | payment-service staying partial (old R-002) | Closed 2026-10-16: events, promotions, points, refunds and its Docker container are done | Put a service in Docker Compose from its first commit |
| C-006 | Review finding known requirement gaps (old R-007) | Closed 2026-10-16: per-account preferences, account lockout and the 404 page are built | Keep the gap list visible and close it before the review, not during it |
| C-007 | Money shown and money approved disagree (old R-013, BIZ-01/BIZ-02) | Closed 2026-10-24: `AMOUNT_CHANGED`, client reschedule only of date and time, amount due from the server (payment `a898a98`, `fb90b0c`; booking `2983d76`) | Agree the contract of an amount once, in the server, and make every client read it |
| C-008 | A closed session kept working through `bearer` (old R-014, SEC-01) | Closed 2026-10-24: gateway `2e20204` | Test the header in every case and variant, not only the one the clients send |
| C-009 | The continuous deployment fails the first time it is used (old R-012: no secrets, server on `develop`, 502 until Caddy restarts, infra reaching `main` last) | Closed 2026-10-27: the secrets exist, `DEVELOP_ONLY` is empty, the server runs `main` and the automatic deploys of 2026-10-26 and 2026-10-27 succeeded (web and API 200). The first mobile `cd.yml` run failed for the missing `EXPO_TOKEN`; the next ones published the OTA | Create the secrets and the guard against downgrades before the first merge to `main`, and release the repository that deploys last |
| C-010 | The first deployment of the 128 branches of 2026-10-24 breaks something only visible live (old R-016: migrations 044, 045, 047, 022, 023, seeds 113, 116, the new queue of operations, `sp_getapplock`, the client IP behind Caddy) | Closed 2026-10-27: deployed through the continuous deployment with the `pre-update` backup, migrations up to 049 and payment 023 applied, web and API 200; payment's integration tests now run those migrations against SQL Server in CI | Deploy big rounds outside a review with a backup first, and test migrations against a real database in CI |

---

## Correlations

- Architectural decisions that mitigate risks → `05-architecture/decisions/`
- Known gaps → `04-requirements/traceability-matrix.md`
- Incident handling → `13-operations/incident-management.md`
