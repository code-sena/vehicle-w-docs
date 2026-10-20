# Technical Backlog

> Things that work but not as they should, found while building and documenting the system.
> Separate from the product user stories. Last review: **2026-10-20** (checked against the code of every repository).

| ID | Description | Where | Impact if not resolved | Effort | Priority |
|----|-------------|-------|------------------------|--------|----------|
| TD-001 | 6 stale spec files stopped the web test suite from compiling | Web | — | 1 SP | ✅ Resolved (the suite compiles and runs: 43 tests in 37 files, `ng test`) |
| TD-002 | Theme and language were stored per browser, not per account | Web + security-service | — | 3 SP | ✅ Resolved (`GET/PUT /api/v1/users/me/preferences` after login; security-service accepts the 4 palettes, changelog 020) |
| TD-003 | No login attempt limit | security-service | — | 3 SP | ✅ Resolved (`LoginLockout`: 5 failures in 15 min lock the account 15 min, 423 `ACCOUNT_LOCKED`, changelog 034) |
| TD-004 | Create the `lavarapido-api-gateway` repository on GitHub and push it | api-gateway | — | 0.5 SP | ✅ Resolved (pushed, `develop` in sync with `origin`) |
| TD-005 | Web calls the services directly through `proxy.conf.json`; switch to one `/api` entry pointing to the gateway (8080) | Web | — | 0.5 SP | ✅ Resolved (`proxy.conf.json` → `http://localhost:8080`) |
| TD-006 | CI pipeline per repository | All | — | 3 SP | ✅ Resolved (GitHub Actions `ci.yml` in the 10 repositories on 2026-10-19, plus the Azure deploy workflow; `10-devops/ci-cd.md`) |
| TD-007 | Propagate `X-Correlation-Id` in the remaining REST clients (customer → security, notification → security) and in RabbitMQ messages; generate it in the gateway. Already done: booking → customer, operations → booking/security, payment → booking | customer, notification, api-gateway | One user action cannot be followed across every service | 1.5 SP | Low |
| TD-008 | Map `row_version` with `@Version` (optimistic locking) in entities edited by admins | booking, customer, security | Last write wins on concurrent admin edits | 2 SP | Low |
| TD-009 | No wildcard (`**`) route: unknown URLs rendered an empty page | Web | — | 0.5 SP | ✅ Resolved (`features/not-found`, route `**`) |
| TD-010 | Persistence tests against a real SQL Server (Testcontainers) for booking locking and triggers | booking-service | Lock/trigger regressions are only caught by the end-to-end suite (`lavarapido-infra/e2e`) | 3 SP | Low |
| TD-011 | Outbox for events (publish from a table in the same transaction) | security, booking, operations | An event can be lost if the service stops between commit and publish | 5 SP | Low |
| TD-012 | Metrics (`micrometer-registry-prometheus`) | All services | No numbers for RNF-001 | 2 SP | Low |
| TD-013 | Establishment extension (billing and help data) | booking-service | — | 2 SP | ✅ Resolved (changelog 032, `GET/PUT /api/v1/admin/establishment`; the web settings screen saves to the server) |
| TD-014 | payment-service had no `Dockerfile` and no container in `lavarapido-infra/docker-compose.yml` | payment-service, infra | — | 1 SP | ✅ Resolved (`payment-migrate` + `payment-service` containers, `ROUTE_PAYMENT_URL`) |
| TD-015 | payment-service did not publish its events | payment-service | — | 3 SP | ✅ Resolved (payment.confirmed, rejected, refunded, promotion_redeemed and loyalty_points_earned) |
| TD-016 | A transaction reference could be reused on another payment | payment-service | — | 1 SP | ✅ Resolved (409 `TRANSACTION_REFERENCE_REUSED`) |
| TD-017 | payment-service had no `X-Correlation-Id` handling and its health did not check the database | payment-service | — | 1 SP | ✅ Resolved (`CorrelationIdMiddleware`; `/health` and `/actuator/health` answer 503 DOWN when SQL Server does not answer within 3 s) |
| TD-018 | payment-service only tested its domain | payment-service | — | 2 SP | ✅ Resolved (domain, application and integration test projects: 148 tests, 7 of them against SQL Server) |
| TD-019 | payment changelogs use their own `001`–`020` numbering, repeating the global numbers (`06-data/migration-strategy.md`) | payment-service | Confusing history; risk of picking a wrong number | 0.5 SP | Low |
| TD-020 | Automatic operator assignment on `booking.confirmed` (RF-008) | operations-service | — | 3 SP | ✅ Resolved (`BookingConfirmedListener` + `AutoAssignmentPolicy`, with the optional operator chosen by the client, RF-010) |
| TD-021 | `OperatorServiceResponse.startable` was uncommitted | operations-service | — | 0.5 SP | ✅ Resolved (committed with its tests) |
| TD-022 | No request rate limit in the gateway or in Caddy (the account lockout only protects one account at a time) | api-gateway, infra | Request floods against the public server | 2 SP | Medium |
| TD-023 | `audit.audit_log` exists but no trigger or service writes to it (ADR-009) | All services | No record of who changed what beyond the audit columns of each row | 3 SP | Low |

---

## Correlations

- Risks these items reduce → `risks.md`
- Requirement gaps → `04-requirements/traceability-matrix.md`
- Testing gaps → `11-quality/testing-strategy.md`
