# Risk Register

> Risks that can stop LavaRápido from being delivered or demonstrated. Reviewed at each
> retrospective and whenever a service is merged. Last review: **2026-10-20**.

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
| R-011 | The public server on Azure is off when it is needed (it is turned on on demand by one person) | Operations | Medium | Medium | Medium | Mitigate | DevOps (project lead) |

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

- **Mitigation:** backup command in `13-operations/README.md`; the seeds and dev demo accounts
  rebuild a usable database in minutes.

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
- **Contingency:** run the demo locally with Docker (`lavarapido-infra`, profile `app`).

---

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
