# Non-Functional Requirements (NFR)

> NFRs define the **qualities of the system** — not what it does but how well it does it.
> The golden rule: every NFR must have a metric. "The system must be fast" is not an NFR.
> "The P99 latency of the /orders endpoint must be < 200ms under 500 RPS load" is.

---

## How to write a measurable NFR?

| Bad | Good |
|-----|------|
| "The system must be fast" | "P95 latency must be < 300ms under 1000 concurrent RPS" |
| "The system must be secure" | "All endpoints require a valid JWT; tokens expire in 1 hour" |
| "The system must scale" | "The system must support up to 5000 concurrent users without degradation" |
| "The system must be available" | "Availability SLO: 99.9% monthly (maximum 44 min downtime/month)" |

---

## RNF-001: Performance
 
| Attribute | Metric | How it is verified |
|-----------|--------|--------------------|
| API response time — booking and auth endpoints | p95 < 2 s | Manual measurement with Postman in the local/Docker environment |
| Availability query | < 2 s with the seeded test dataset | Manual test |
| Booking confirmation | Must not wait on asynchronous side-effects (operator notification, receipt); these are queued | Integration test |
 
> The SRS mentioned load tests with 500 concurrent users. No load-testing tool has been adopted
> and the team has no environment to run them, so that figure is kept as an aspirational target,
> not a committed requirement.
 
---
 
## RNF-002: Availability
 
| Environment | Target | Notes |
|------------|--------|-------|
| Local / Docker (dev) | Best-effort — not a monitored SLO | The project is not deployed for real users (scope.md, Out of Scope #5) |
| Academic review sessions | The system must be running and operational during each scheduled review | Verified by the team before each session |
 
**Health checks:** `GET /health` per service, following the Spring Boot Actuator convention.
 
> The original SRS (RNF1) asked for ≥99% uptime with alerting on unplanned outages. That only
> makes sense for a real production deployment, which is explicitly out of scope. Kept as a future
> target if the project continues past the academic delivery.
 
---
 
## RNF-003: Concurrency and data integrity
 
| Scenario | Expected behaviour | How it is verified |
|---------|--------------------|--------------------|
| Two customers booking the same wash bay, date and time | The system must confirm only one of them; the second receives the updated availability | Integration test on the booking flow (RF-006) |
| Assigning an operator already booked for that slot | The system must block the assignment | Integration test (RF-009) |
| A second payment being approved for a booking that already has an approved payment, or a receipt's transaction reference being reused across bookings | Must not be possible — enforced by a filtered unique index per booking and a unique index on the transaction reference | Integration test (RF-014, RF-016) |
 
> This replaces the SRS's original scalability target (1000 concurrent users with cloud
> auto-scaling): there is no cloud deployment in scope, and what actually matters for this system
> is correctness under concurrency, not volume.
 
---
 
## RNF-004: Security
 
| # | Requirement | How it is verified |
|---|-------------|--------------------|
| 4.1 | Private endpoints require a valid JWT in the `Authorization: Bearer` header | A request without a token returns 401 |
| 4.2 | JWT tokens expire after 1 hour | An expired token returns 401 |
| 4.3 | Passwords are stored hashed with BCrypt, never in plain text | Database inspection |
| 4.4 | Accounts lock temporarily after repeated failed login attempts (RF-004b) | Manual test |
| 4.5 | Each role (Administrator, Operator, Customer) can only reach its own endpoints | A cross-role request returns 403 |
| 4.6 | No card data is ever collected or stored by this system — digital payments are manual QR transfers verified against an uploaded receipt, and cash is confirmed directly by the Administrator (RF-013 to RF-016) | Code and schema review |
| 4.7 | Credentials and API keys live in environment variables, never in the repository | Code review before each PR |
| 4.8 | HTTPS is required in any environment reachable outside the team's machines; HTTP is acceptable for local development only | Deployment review |
| 4.9 | Personal data is handled under Colombian Law 1581 of 2012: the user accepts the data-processing policy at sign-up | Sign-up flow review |
 
---
 
## RNF-005: Observability
 
| Pillar | Requirement | How it is verified |
|--------|-------------|--------------------|
| Logs | Each service logs incoming requests and errors to standard output, readable via `docker logs` | Manual check |
| Cross-service tracing | Not defined — open question for the team once asynchronous messaging is built | — |
 
---
 
## RNF-006: Maintainability
 
| # | Requirement | How it is verified |
|---|-------------|--------------------|
| 6.1 | Every change enters through a Pull Request with at least one approval | GitHub history |
| 6.2 | Commits follow Conventional Commits | Commit history review |
| 6.3 | Database schema changes are applied through versioned migrations | Liquibase changelogs |
| 6.4 | Frontend and backend stay separated, communicating only through the REST API | Code review |
| 6.5 | A new team member can run the whole stack locally with Docker, following `10-devops/local-setup.md` | A member reproduces the setup from scratch |
 
---
 
## RNF-007: Portability
 
| # | Requirement | How it is verified |
|---|-------------|--------------------|
| 7.1 | The backend, the database and the services run as Docker containers on any team machine | Local setup from scratch |
| 7.2 | No service depends on a specific team member's operating system | Setup reproduced on more than one machine |
| 7.3 | Environment-specific configuration lives only in environment variables | Code review |
 
---
 
## RNF-008: Compatibility
 
| # | Requirement | How it is verified |
|---|-------------|--------------------|
| 8.1 | The mobile app runs on Android 8.0 or higher; iOS is out of scope (scope.md, Out of Scope #1) | Test on a device or emulator |
| 8.2 | The web app works on the current versions of Chrome, Firefox and Edge | Manual test per browser |
| 8.3 | The web interface remains usable on screens from 360 px wide | Responsive test |
 
---
 
## RNF-009: Usability
 
| # | Requirement | How it is verified |
|---|-------------|--------------------|
| 9.1 | A customer can complete a booking in no more than 5 steps from the dashboard | Flow review |
| 9.2 | Every form shows a clear message identifying the field that failed validation | Manual test per form |
| 9.3 | Every action that changes data shows a confirmation or error message | Manual test |
 
> No formal usability testing is planned; validation is an informal review by the team and the
> technical instructors.
 
---
 
## RNF-010: Localisation (i18n)
 
| # | Requirement | How it is verified |
|---|-------------|--------------------|
| 10.1 | The interface is available in Spanish, English, French and Portuguese (scope.md, Feature #6) | Manual check of every screen in each language |
| 10.2 | No screen shows untranslated keys or text left in another language | Manual check per language |
| 10.3 | Amounts are displayed in COP | Manual check |
| 10.4 | Dates follow the format of the selected language | Manual check per language |
 
---
 
## Dropped from the original template (not applicable to this project)
 
- **Disaster Recovery (RTO/RPO)** — there is no production environment to recover
- **Availability SLOs and error budgets** — nothing is deployed for real users
- **Auto-scaling policies (CPU thresholds, instance limits)** — no cloud infrastructure in scope
- **PagerDuty / Alertmanager on-call rotation** — this is an academic team
- **Distributed tracing (OpenTelemetry / Jaeger)** — not part of the stack
---
 
## RNF priority matrix
 
| RNF | Priority | Validated how? | Owner |
|-----|----------|-----------------|-------|
| RNF-001 Performance | P2 | Manual measurement | Backend lead |
| RNF-002 Availability (review sessions) | P1 | Manual check before each session | Whole team |
| RNF-003 Concurrency and integrity | P1 | Integration tests | Backend lead |
| RNF-004 Security | P1 | Manual tests + code review | Backend lead |
| RNF-005 Observability | P3 | Not validated yet | — |
| RNF-006 Maintainability | P2 | Code review + GitHub history | Whole team |
| RNF-007 Portability | P1 | Local setup from scratch | Whole team |
| RNF-008 Compatibility | P1 | Manual tests on devices and browsers | Frontend lead |
| RNF-009 Usability | P2 | Informal review | Frontend lead |
| RNF-010 Localisation | P2 | Manual check per language | Frontend lead |
 
---
## Correlations

- Detailed SLOs and SLAs → `13-operations/README.md`
- Pipeline that validates NFRs → `10-devops/README.md`
- Incidents related to NFR violations → `13-operations/incident-management.md`
- Security checklist → `00-governance/security-policy.md`
