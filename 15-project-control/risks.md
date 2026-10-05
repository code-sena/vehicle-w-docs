# Risk Register

> Risks that can stop LavaRápido from being delivered or demonstrated. Reviewed at each
> retrospective and whenever a service is merged. Last review: **2026-10-04**.

Level = probability × impact (Low / Medium / High → Low, Medium, High, Critical).
Owner is a role; the team assigns the person in the sprint board.

---

## Active risks

| ID | Risk | Category | Prob. | Impact | Level | Strategy | Owner |
|----|------|----------|-------|--------|-------|----------|-------|
| R-001 | operations-service arrives late or does not match the booking/notification contracts | Team / Technical | Medium | High | High | Mitigate | operations-service owner |
| R-002 | payment-service stays incomplete: payment screens keep local data | Technical | High | Medium | High | Mitigate | payment-service owner |
| R-003 | Regressions reach `develop` unnoticed: no CI yet and the web test suite does not compile | Technical | High | Medium | High | Mitigate | Team lead |
| R-004 | Secrets leak (`.env`: DB password, `JWT_SECRET`, `INTERNAL_API_KEY`, Gmail app password) | Security | Low | High | Medium | Avoid | Every developer |
| R-005 | An event is lost between commit and publish (no Outbox): missing welcome/booking notification or profile | Technical | Low | Medium | Low | Accept | notification-service owner |
| R-006 | Work stays uncommitted in several repositories or collides with a teammate's (mobile, web) | Team | Medium | Medium | Medium | Mitigate | Each repository owner |
| R-007 | Review finds requirement gaps already known: per-account preferences (RF-019/020), login attempt limit (RF-004b), 404 page | Business | Medium | Medium | Medium | Mitigate | Team lead |
| R-008 | Data loss on a developer machine (`docker compose down -v`, broken volume) before a demo | Technical | Low | High | Medium | Mitigate | Whoever runs the demo |
| R-009 | Gmail SMTP stops (app password revoked, sending limit) | External | Low | Low | Low | Accept | notification-service owner |
| R-010 | Documentation drifts from the code again | Team | Medium | Medium | Medium | Mitigate | Author of each PR |

---

## Details

### R-001 — operations-service integration

- **Trigger:** operations PR without the events notification already listens for
  (`execution.operator_assigned`, `execution.service_started`, `execution.service_completed`).
- **Mitigation:** the contracts are fixed in `02-domain/domain-events.md` and
  `09-microservices/services/07-notification-service/events.md`; booking publishes
  `booking.confirmed` with `serviceBayId` and `scheduledStart` for assignment; add the gateway
  route and the `proxy.conf.json` entry in the same PR.
- **Contingency:** demo the operator area with its current local data.

### R-002 — payment-service incomplete

- **Mitigation:** keep payment out of the demo's critical path; the booking flow ends at the
  booking summary.
- **Contingency:** show the payment screens as prototype (documented as Local in
  `12-ux-ui/navigation-map.md`).

### R-003 — No automated safety net

- **Trigger:** a merge breaks a flow that worked.
- **Mitigation:** run `./mvnw test` before every PR (286 backend tests); fix the 6 stale web
  specs; build the Jenkins pipeline (`10-devops/ci-cd.md`).
- **Contingency:** manual end-to-end run before each review session (`13-operations/README.md`).

### R-004 — Secrets

- **Mitigation:** `.env` is git-ignored; `.env.example` only has names; logs never print secrets;
  secrets are never pasted into chats or issues.
- **Contingency:** rotate the leaked value in `.env` (new Gmail app password, new `JWT_SECRET` —
  which logs everyone out — or new `INTERNAL_API_KEY`) and restart the services.

### R-005 — Lost event

- **Mitigation:** consumers are idempotent and failures go to dead-letter queues, so a retry is
  safe; customer-service also creates the profile on first use if the event never arrived.
- **Contingency:** re-create the missing notification manually from the admin notifications
  screen.

### R-006 — Uncommitted or colliding work

- **Mitigation:** small commits per repository; nobody changes the mobile app while a teammate is
  working on it; the api-gateway repository must be created on GitHub and pushed.
- **Contingency:** resolve conflicts keeping both changes, then run the tests.

### R-007 — Known requirement gaps

- **Mitigation:** gaps are listed openly in `04-requirements/traceability-matrix.md`; the
  per-account preferences fix is small (load/save through `GET/PUT /users/me/preferences`, extend
  the allowed themes in security-service).

### R-008 — Data loss before a demo

- **Mitigation:** backup command in `13-operations/README.md`; the seeds and dev demo accounts
  rebuild a usable database in minutes.

### R-009 — Email provider

- **Contingency:** notifications still reach the inbox and push; switch `MAIL_HOST` to Mailpit to
  show the emails locally.

### R-010 — Documentation drift

- **Mitigation:** the review checklist (`11-quality/README.md`) requires updating `models.md`,
  OpenAPI exports and the service docs in the same PR.

---

## Closed risks / lessons learned

| ID | Risk | Outcome | Lesson |
|----|------|---------|--------|
| C-001 | Booking times shifted 5 hours | Occurred, fixed (JVM in UTC, `BOOKING_ZONE=America/Bogota`) | Store UTC, convert only at the edges |
| C-002 | Services failing at startup after `docker compose up` | Occurred, understood | Wait for SQL Server to be healthy before starting services |
| C-003 | Two booking implementations of the same service | Occurred, resolved by rebuilding from the SQL model | Agree on the data model before coding a service |

---

## Correlations

- Architectural decisions that mitigate risks → `05-architecture/decisions/`
- Known gaps → `04-requirements/traceability-matrix.md`
- Incident handling → `13-operations/incident-management.md`
