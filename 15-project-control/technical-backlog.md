# Technical Backlog

> Things that work but not as they should, found while building and documenting the system.
> Separate from the product user stories. Last review: **2026-10-06**.

| ID | Description | Where | Impact if not resolved | Effort | Priority |
|----|-------------|-------|------------------------|--------|----------|
| TD-001 | 6 stale spec files stop the web test suite from compiling (`features/*/viewmodels/*.spec.ts`, `settings-panel.spec.ts`, `stepper.spec.ts`) | Web | No web tests run; Jenkins web stage would fail | 1 SP | High |
| TD-002 | Theme and language are stored per browser (`localStorage`), not per account: a second account on the same device inherits them. Load after login and save on change through `GET/PUT /api/v1/users/me/preferences`; security-service must accept the 4 web palettes (today only `light`/`dark`, `ck_pref_theme`) with a new changeset | Web + security-service | RF-019/020 not met (HU-UI-003 scenario 3) | 3 SP | High |
| TD-003 | No login attempt limit (lockout or delay after repeated failures) | security-service | RF-004b not met; brute force possible | 3 SP | Medium |
| TD-004 | Create the `lavarapido-api-gateway` repository on GitHub and push it | api-gateway | — | 0.5 SP | ✅ Resolved (pushed, `develop` in sync with `origin`) |
| TD-005 | Web calls the services directly through `proxy.conf.json`; switch to one `/api` entry pointing to the gateway (8080) | Web | — | 0.5 SP | ✅ Resolved (`proxy.conf.json` → `http://localhost:8080`) |
| TD-006 | Jenkins pipeline per repository (`10-devops/ci-cd.md`) | All | Regressions found late | 3 SP | Medium |
| TD-007 | Propagate `X-Correlation-Id` in the remaining REST clients (customer → security, notification → security, payment → booking) and in RabbitMQ messages; generate it in the gateway (booking → customer and operations → booking/security already done) | All services | One user action cannot be followed across services | 2 SP | Low |
| TD-008 | Map `row_version` with `@Version` (optimistic locking) in entities edited by admins | booking, customer, security | Last write wins on concurrent admin edits | 2 SP | Low |
| TD-009 | No wildcard (`**`) route: unknown URLs render an empty page | Web | Poor UX on wrong links | 0.5 SP | Low |
| TD-010 | Persistence tests against a real SQL Server (Testcontainers) for booking locking and triggers | booking-service | Lock/trigger regressions only seen manually | 3 SP | Low |
| TD-011 | Outbox for events (publish from a table in the same transaction) | security, booking, operations | An event can be lost if the service stops between commit and publish | 5 SP | Low |
| TD-012 | Metrics (`micrometer-registry-prometheus`) | All services | No numbers for RNF-001 | 2 SP | Low |
| TD-013 | Establishment extension (billing and help data) waits for ADR-010 to define the fields | booking-service | Admin settings screen stays local | 2 SP | Low |
| TD-014 | payment-service has no `Dockerfile` and no container in `lavarapido-infra/docker-compose.yml`; the `api-gateway` container has no `ROUTE_PAYMENT_URL` | payment-service, infra | With `--profile app` every payment route fails | 1 SP | High |
| TD-015 | payment-service does not publish its events; notification already listens for `payment.confirmed` / `payment.rejected` | payment-service | The client is not told when a payment is approved or rejected | 3 SP | High |
| TD-016 | A transaction reference can be reused on another payment (ADR-008 control, RF-016) | payment-service | Same receipt could pay two bookings | 1 SP | Medium |
| TD-017 | payment-service: no `X-Correlation-Id` filter, and `/actuator/health` does not check the database | payment-service | Logs cannot be followed; health says UP with the database down | 1 SP | Low |
| TD-018 | payment-service only tests its domain (no use-case or API tests) | payment-service | Role and 409 rules unprotected | 2 SP | Medium |
| TD-019 | payment changelogs use their own `001`–`016` numbering, repeating the global numbers (`06-data/migration-strategy.md`) | payment-service | Confusing history; risk of picking a wrong number | 0.5 SP | Low |
| TD-020 | Automatic operator assignment on `booking.confirmed` (RF-008), reusing `AssignmentPolicy` (ADR-014) | operations-service | The admin must assign every booking by hand | 3 SP | Medium |
| TD-021 | `OperatorServiceResponse.startable` and its tests are still uncommitted in `lavarapido-operations-service` (the exported contract already shows it) | operations-service | Contract and repository differ until it is committed | 0.5 SP | Medium |

---

## Correlations

- Risks these items reduce → `risks.md`
- Requirement gaps → `04-requirements/traceability-matrix.md`
- Testing gaps → `11-quality/testing-strategy.md`
