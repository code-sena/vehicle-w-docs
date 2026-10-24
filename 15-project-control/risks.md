# Risk Register

> Risks that can stop LavaRápido from being delivered or demonstrated. Reviewed at each
> retrospective and whenever a service is merged. Last review: **2026-10-23** (against `origin/develop`
> and the internal review of that day; the fixes still in unmerged branches are not counted as done).

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
| R-011 | The public server on Azure is off when it is needed (it is turned on on demand by one person), in particular at the final exposition (~2026-10-27); there is no uptime monitor (H-15) | Operations | Medium | High | High | Mitigate | DevOps (project lead) |
| R-012 | The continuous deployment fails the first time it is used: it was never run, the `AZURE_SSH_KEY` and `DEPLOY_DISPATCH_TOKEN` secrets do not exist and the order of the first merges matters (CD-01, CD-02) | Operations | High | Medium | High | Mitigate | DevOps (project lead) |
| R-013 | Money shown and money approved disagree: a paid booking can be rescheduled with other services and the client cannot read the amount the server expects after a reload (BIZ-01, BIZ-02) | Technical | Medium | High | High | Mitigate | booking and payment owners |
| R-014 | A closed session keeps working through the `bearer` lower-case gap (SEC-01) | Security | Low | High | Medium | Mitigate | gateway owner |
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
  asks the DevOps owner to turn it on in advance and runs `deploy/update-server.sh` after the last push.
  Before the exposition: VM on the day before, an external uptime check of `PUBLIC_URL` and a recorded
  video of the main flows.
- **Contingency:** run the demo locally with Docker (`lavarapido-infra`, profile `app`) or show the video.

### R-012 — First continuous deployment

- **Trigger:** the `ci/continuous-deployment` and `ci/request-deploy` branches are merged to `main`.
- **Mitigation:** create the two secrets and the restricted key on the VM first; merge `lavarapido-infra`
  before the other repositories; run `deploy.yml` twice by hand with the VM on and check
  `crontab -l | grep boot-update` and the branch of every repository on the server (`10-devops/ci-cd.md`).
- **Contingency:** keep updating by hand with `update-server.sh` (`BRANCH=develop`), as today.

### R-013 — Booking and payment amounts

- **Mitigation (planned in the contract of 2026-10-23, not merged):** `AMOUNT_CHANGED` when the approved
  amount no longer matches, the client can only change date and time of a booking, and
  `GET /api/v1/loyalty/redemptions/{bookingId}` gives the client the amount due.
- **Contingency:** the administrator checks the booking total before approving a payment.

### R-014 — Closed-session tokens

- **Mitigation:** case-insensitive `Bearer` check in `SessionCheckFilter` with its test.
- **Contingency:** rotate `JWT_SECRET` (logs everyone out) if an old token is known to be in the wrong hands.

### R-015 — Changes during the exposition

- **Mitigation:** freeze `main` on 2026-10-27 and deploy the day before.

---

## Open findings of the review of 2026-10-23

Severity as given by the review. Items whose fix exists only in an unmerged branch stay open.

| ID | Severity | Finding | Where | Owner |
|----|----------|---------|-------|-------|
| CD-01 | Critical | Continuous deployment never run; 0 secrets; `deploy.yml` 0 runs | `lavarapido-infra` | DevOps (project lead) |
| SEC-01 | High | `bearer` in lower case skips `SessionCheckFilter`: a closed-session token works up to 1 h in customer, booking, operations, notification and payment (weakens RF-027, RF-028 and E-02) | `SessionCheckFilter.java` | gateway owner |
| BIZ-01 | High | A paid or in-review booking can be rescheduled with other services; approving does not recompute the amount | booking `BookingService`, payment `PaymentCommandService` | booking and payment owners |
| BIZ-02 | High | The client cannot read the amount the server expects; after a reload the applied coupon is not shown (rest of E-08) | payment, web, mobile | payment owner |
| OPS-01 (= E-13) | High | `finish`/`start` call booking before saving their own row: a failure in between leaves booking `COMPLETED` and the line `IN_PROGRESS`, and the operator is blocked | `OperationsService` | operations owner |
| CD-02 | High | `lavarapido-infra` must reach `main` before the other repositories or the dispatch is rejected | CD rollout | DevOps |
| CD-04 | High | customer, booking and payment have no *Pedir despliegue* job | `ci.yml` of those repos | their owners |
| CD-03, CD-06, CD-07, CD-08 | High / Medium | Deploy waits, retries on boot, health wait, Caddy restart: fixed only in the local branch `ci/continuous-deployment` (not pushed, not tested) | `deploy/*.sh` | DevOps |
| H-15 | High | Public URL down while the VM is off; no monitor | Azure VM | DevOps |
| SEC-04 (= E-04) | Medium | No rate limit on `/api/v1/auth/**`; account enumeration by timing and 423 | gateway, Caddy, security | gateway/security owner |
| SEC-05 | Medium | The 5-attempt limit of the recovery code is not atomic and lives in memory | `PasswordRecoveryService` | security owner |
| SEC-07 (= E-03) | Medium | Law 1581 consent not required by the server | `RegisterRequest` | security owner |
| A-01 (rest) | Medium | The web and the mobile still block the **login** of existing accounts on other domains; the web list is fixed in code | `login.viewmodel.ts`, mobile validators | web and mobile owners |
| A-11 (rest) | Medium | `BookingStatusChanged` does not cancel the reminders | notification `DomainEventConsumerService` | notification owner |
| B-01 (rest) | Medium | Assignment notes are not shown to the operator; reassigning without notes erases them | operations `OperatorServiceResponse` | operations owner |
| E-05 (rest) | Medium | A demo password is still written in `GUIA-EQUIPO.md` of infra; `payment-migrate` gets the password as an argument; old passwords remain in the history (rotate) | infra, payment | DevOps, payment owner |
| BIZ-04 (rest) | Medium | A catalog price of 0 is still accepted by booking | booking `PriceDefinition` | booking owner |
| BIZ-05 | Medium | The coupon discount is frozen in pesos when the booking changes | payment | payment owner |
| BIZ-06 | Medium | Changing a vehicle's type keeps the old price | booking, customer | booking owner |
| BIZ-07 | Medium | Cancelling a paid booking does not tell payment | booking, payment | booking and payment owners |
| BIZ-08 (= E-17) | Medium | Removing a vehicle with active bookings leaves them orphaned | customer | customer owner |
| BIZ-09 (= E-11, A-16) | Medium | No optimistic locking in booking; two open payments per booking possible | booking, payment | booking and payment owners |
| BIZ-10 | Medium | Schedule, exceptions or a bay in maintenance do not check existing bookings | booking `ScheduleService` | booking owner |
| OPS-03 | Medium | start/finish/rating without the assignment lock or `@Version` | operations | operations owner |
| OPS-05 (= E-14), OPS-06 (= E-15) | Medium | Push and email without retry; admin notices lost if security is down | notification | notification owner |
| OPS-08 (= A-14) | Medium | Sharing an inspection answers 204 even when the event was not published | operations | operations owner |
| E-16 (risk) | Medium | The plate rule also runs when reading: a stored plate longer than 6 characters breaks that vehicle | customer `CustomerVehiclePersistenceAdapter` | customer owner |
| CD-05, CD-09, CD-10, CD-11 | Medium | Two runs needed for the switch to `main`; payment deploys `develop` without protection; disk and backup retention; rollback is manual and global | infra, payment | DevOps, payment owner |
| F-02 / H-03, H-04 | Medium | Web tests still miss several screens and coverage; mobile has 13 tests | web, mobile | web and mobile owners |
| MOV-04, MOV-05, MOV-06, WEB-05, WEB-06 | Medium | Mobile screens that skip the ViewModel; admin booking form offers invalid states; untranslated error codes; errors silenced | web, mobile | web and mobile owners |
| SEC-11 to SEC-16, BIZ-12 to BIZ-14, OPS-10 to OPS-12, CD-12 to CD-16, MOV-07 to MOV-18, WEB-07 to WEB-15 | Low | Smaller gaps (password limit in bytes, Sonar false positives, `booking.created` without producer, deploy key scope, accessibility, dead code…) | several | each owner |

## Accepted risks for version 1 (ADR-020)

| ID | Risk | Why it is accepted |
|----|------|--------------------|
| H-11 (TD-011) | No Outbox: an event is lost if RabbitMQ is down at publish time | Four services and two languages to change; jobs rebuild what matters from the database |
| H-10 | Every service uses the `sa` login | Nine schemas of grants and six services to change days before the exposition; SQL Server is not reachable from outside |
| H-18 | The web keeps the JWT in `localStorage` | An HttpOnly cookie needs CSRF and refresh support; 1-hour tokens, session check and a strict CSP limit it |
| H-16 | Admin reports are computed in the browser | Backend reporting is new work in three services; academic data volume |

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

---

## Correlations

- Architectural decisions that mitigate risks → `05-architecture/decisions/`
- Known gaps → `04-requirements/traceability-matrix.md`
- Incident handling → `13-operations/incident-management.md`
