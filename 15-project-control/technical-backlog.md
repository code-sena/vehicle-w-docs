# Technical Backlog

> Things that work but not as they should, found while building and documenting the system.
> Separate from the product user stories. Last review: **2026-10-23** (checked against `origin/develop` of every
> repository; review findings and their severity in `risks.md`).

| ID | Description | Where | Impact if not resolved | Effort | Priority |
|----|-------------|-------|------------------------|--------|----------|
| TD-001 | 6 stale spec files stopped the web test suite from compiling | Web | — | 1 SP | ✅ Resolved (the suite compiles and runs: 43 tests in 37 files, `ng test`) |
| TD-002 | Theme and language were stored per browser, not per account | Web + security-service | — | 3 SP | ✅ Resolved (`GET/PUT /api/v1/users/me/preferences` after login; security-service accepts the 4 palettes, changelog 020) |
| TD-003 | No login attempt limit | security-service | — | 3 SP | ✅ Resolved (`LoginLockout`: 5 failures in 15 min lock the account 15 min, 423 `ACCOUNT_LOCKED`, changelog 034) |
| TD-004 | Create the `lavarapido-api-gateway` repository on GitHub and push it | api-gateway | — | 0.5 SP | ✅ Resolved (pushed, `develop` in sync with `origin`) |
| TD-005 | Web calls the services directly through `proxy.conf.json`; switch to one `/api` entry pointing to the gateway (8080) | Web | — | 0.5 SP | ✅ Resolved (`proxy.conf.json` → `http://localhost:8080`) |
| TD-006 | CI pipeline per repository | All | — | 3 SP | ✅ Resolved (GitHub Actions `ci.yml` in the 10 repositories on 2026-10-19, plus the Azure deploy workflow; `10-devops/ci-cd.md`) |
| TD-007 | Propagate `X-Correlation-Id` in the remaining REST clients (customer → security, notification → security) and in RabbitMQ messages; generate it in the gateway. Already done: booking → customer, operations → booking/security, payment → booking | customer, notification, api-gateway | One user action cannot be followed across every service | 1.5 SP | Low |
| TD-008 | Map `row_version` with `@Version` (optimistic locking) in entities edited by admins and in the executions (BIZ-09, OPS-03) | booking, customer, security, operations | Last write wins on concurrent edits; an admin reassigning while the operator starts loses a write | 2 SP | Medium |
| TD-009 | No wildcard (`**`) route: unknown URLs rendered an empty page | Web | — | 0.5 SP | ✅ Resolved (`features/not-found`, route `**`) |
| TD-010 | Persistence tests against a real SQL Server (Testcontainers) for booking locking and triggers | booking-service | Lock/trigger regressions are only caught by the end-to-end suite (`lavarapido-infra/e2e`) | 3 SP | Low |
| TD-011 | Outbox for events (publish from a table in the same transaction) | security, booking, operations, payment | An event can be lost if the service stops between commit and publish | 5 SP | ⏸ Accepted for version 1 (H-11, ADR-020) |
| TD-012 | Metrics (`micrometer-registry-prometheus`) | All services | No numbers for RNF-001 | 2 SP | Low |
| TD-013 | Establishment extension (billing and help data) | booking-service | — | 2 SP | ✅ Resolved (changelog 032, `GET/PUT /api/v1/admin/establishment`; the web settings screen saves to the server) |
| TD-014 | payment-service had no `Dockerfile` and no container in `lavarapido-infra/docker-compose.yml` | payment-service, infra | — | 1 SP | ✅ Resolved (`payment-migrate` + `payment-service` containers, `ROUTE_PAYMENT_URL`) |
| TD-015 | payment-service did not publish its events | payment-service | — | 3 SP | ✅ Resolved (payment.confirmed, rejected, refunded, promotion_redeemed and loyalty_points_earned) |
| TD-016 | A transaction reference could be reused on another payment | payment-service | — | 1 SP | ✅ Resolved (409 `TRANSACTION_REFERENCE_REUSED`) |
| TD-017 | payment-service had no `X-Correlation-Id` handling and its health did not check the database | payment-service | — | 1 SP | ✅ Resolved (`CorrelationIdMiddleware`; `/health` and `/actuator/health` answer 503 DOWN when SQL Server does not answer within 3 s) |
| TD-018 | payment-service only tested its domain | payment-service | — | 2 SP | ✅ Resolved (domain, application and integration test projects: 151 tests in CI on 2026-10-23, plus 7 against SQL Server that skip themselves in CI) |
| TD-019 | payment changelogs use their own `001`–`021` numbering, repeating the global numbers (`06-data/migration-strategy.md`) | payment-service | Confusing history; risk of picking a wrong number | 0.5 SP | Low |
| TD-020 | Automatic operator assignment on `booking.confirmed` (RF-008) | operations-service | — | 3 SP | ✅ Resolved (`BookingConfirmedListener` + `AutoAssignmentPolicy`, with the optional operator chosen by the client, RF-010) |
| TD-021 | `OperatorServiceResponse.startable` was uncommitted | operations-service | — | 0.5 SP | ✅ Resolved (committed with its tests) |
| TD-022 | No request rate limit in the gateway or in Caddy (the account lockout only protects one account at a time); account enumeration by timing (SEC-04) | api-gateway, infra, security | Request floods against the public server; anyone can lock an account for 15 minutes | 2 SP | Medium |
| TD-023 | `audit.audit_log` exists but no trigger or service writes to it (ADR-009) | All services | No record of who changed what beyond the audit columns of each row | 3 SP | Low |
| TD-024 | A token kept working up to an hour after logout or after the account was disabled | security-service, api-gateway | — | 3 SP | ✅ Resolved 2026-10-21 (`ActiveSessionValidator` in security, `SessionCheckFilter` in the gateway, ADR-006 update) |
| TD-025 | Bookings nobody closed stayed `CONFIRMED` forever and each admin screen counted "unassigned" its own way | booking-service, operations-service, Web | — | 3 SP | ✅ Resolved 2026-10-21 (a booking without operator becomes no-show 1 h after the end; one with an operator goes to the admin's **To close** list with a notice, never a false no-show; `GET /api/v1/admin/assignments/unassigned` is the one count) |
| TD-026 | Manual and automatic assignment could give one operator two services at the same time | operations-service | — | 1 SP | ✅ Resolved 2026-10-21 (`sp_getapplock` on `operations-assignment`) |
| TD-028 | An event with a `null` payload field failed to parse in notification-service and went to the DLQ | notification-service | — | 0.5 SP | ✅ Resolved 2026-10-21 (null fields are ignored; `DomainEventEnvelopeTest`) |
| TD-027 | 12 admin screens had no real tests | Web | — | 2 SP | ✅ Resolved for bookings, management and reports (store, filters, roles, counts) and, on 2026-10-23, the guard, the interceptor and more ViewModels (F-02, 146 tests); inspection, schedules, operators, calendar, business data, client vehicles and the sidebar still only check that they load |
| TD-029 | The gateway only recognises `Bearer ` with a capital B, so `bearer` skips the session check (SEC-01) | api-gateway | A closed-session token works up to 1 h in five services | 0.5 SP | **High** |
| TD-030 | `finish`/`start` move booking before saving the execution; a failure in between blocks the operator (OPS-01 = E-13) | operations-service | The operator cannot finish nor start another service until the row is fixed by hand | 1 SP | **High** |
| TD-031 | Approving a payment does not compare its amount with what the booking costs now; the client can change the services of a paid booking (BIZ-01) | payment-service, booking-service | Approved amount different from the booking total | 2 SP | **High** |
| TD-032 | The client has no endpoint for the amount due and the applied coupon; the web and the mobile compute the total (BIZ-02, rest of E-08) | payment-service, Web, mobile | After a reload the client sees the full price while the server expects the discounted one | 1.5 SP | **High** |
| TD-033 | Push the continuous deployment (`ci/continuous-deployment`, `ci/request-deploy`), create `AZURE_SSH_KEY` and `DEPLOY_DISPATCH_TOKEN`, run it twice by hand (CD-01, CD-02, CD-04) | infra and 5 repos (+ customer, booking, payment) | The server keeps following `develop` by hand | 2 SP | **Critical** |
| TD-034 | `BookingStatusChanged` does not cancel pending reminders (rest of A-11) | notification-service | A client gets "your booking is in 1 hour" after the admin closed it | 0.5 SP | Medium |
| TD-035 | The operator's services do not include the assignment notes; reassigning without notes erases them (rest of B-01) | operations-service, Web, mobile | The admin's notes never reach the operator | 1 SP | Medium |
| TD-036 | Require the Law 1581 consent in `POST /auth/register` (SEC-07) | security-service | Accounts created without recorded consent | 0.5 SP | Medium |
| TD-037 | The web and the mobile block the login of existing accounts on other domains (rest of A-01) | Web, mobile | Older accounts cannot sign in from the clients | 0.5 SP | Medium |
| TD-038 | The admin reports are computed in the browser from the loaded bookings and payments (H-16) | Web | Reports limited to the loaded data | 3 SP | ⏸ Accepted for version 1 (ADR-020) |
| TD-039 | One database login per service instead of `sa` (H-10) | All services, infra | No database-level isolation between schemas | 3 SP | ⏸ Accepted for version 1 (ADR-020) |
| TD-040 | Remove the demo password still written in `GUIA-EQUIPO.md` of infra, stop passing `--password` to `payment-migrate` and rotate the passwords that remain in the history (rest of E-05) | infra, payment | A known password in a public repository | 0.5 SP | Medium |
| TD-041 | The operator could move any booking by calling booking directly (E-01) | booking, operations, api-gateway | — | 2 SP | ✅ Resolved 2026-10-23 (`X-Internal-Key` on `/api/v1/operator/bookings/**`, route removed from the gateway) |
| TD-042 | Coupons of 100 % or above the total left bookings unpayable; two coupons per booking; a coupon could not be removed (E-07, E-09, E-08) | payment-service, Web, mobile | — | 2 SP | ✅ Resolved 2026-10-23 (1–99 %, minimum amount due, unique index, `DELETE /api/v1/loyalty/redemptions/{bookingId}/{promotionId}`); the amount for the client is TD-032 |
| TD-043 | The mobile app had no automated tests (F-01, H-04) | mobile | — | 1 SP | ✅ Resolved 2026-10-23 (jest-expo in CI, 13 tests); more cases still needed |

---

## Correlations

- Risks these items reduce → `risks.md`
- Requirement gaps → `04-requirements/traceability-matrix.md`
- Testing gaps → `11-quality/testing-strategy.md`
