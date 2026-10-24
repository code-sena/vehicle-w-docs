# ADR-020 — Risks Accepted for Version 1

- **ID:** ADR-020
- **Date:** 2026-10-23
- **Status:** Accepted
- **Authors:** Development team

---

## Context

The instructors' evaluation (findings H-01 to H-25) and the internal review of 2026-10-23 listed
several improvements that the team will **not** make before the final exposition (~2026-10-27). Each
of them is a known gap, checked against `origin/develop` on 2026-10-23, and leaving it undocumented
would look like an oversight. This ADR records the decision to accept them for version 1, why, and
what keeps the impact small.

**Known constraints:**
- Three part-time developers and four days until the exposition.
- Academic demo deployment (ADR-016) with test data, not a service for real customers.
- Each change below touches several services or both clients, with more risk of breaking the demo
  than the gap itself.

---

## Decision

**We decided:** to accept these four risks for version 1 and to revisit them only if the project
continues to a real deployment.

| ID | Risk accepted | Where it is in the code (2026-10-23) | Why it is accepted | What limits the impact |
|---|---|---|---|---|
| H-11 | **No Outbox for events.** Services publish to RabbitMQ after the commit; if the broker is down the event is only logged and lost | `RabbitDomainEventPublisher` in security, booking and operations; `RabbitMqIntegrationEventPublisher` in payment (`afterCommit`, `catch` → `log.error`) | An Outbox needs a table, a relay job and deduplication in four services and two languages; the broker runs on the same VM as the services | Publishing after commit never announces something that was rolled back; consumers are idempotent (`processed_event`); reminders, alerts and the "Por cerrar" list are rebuilt from the database by scheduled jobs; ADR-004 already chose this trade-off |
| H-10 | **One shared `sa` database user** for every service and for the backup scripts | `DB_USERNAME=sa` in `docker-compose.yml` and `.env.production.example`; payment builds `User Id=sa` by default | One login per schema means creating logins, users and grants for nine schemas and changing six services and the migrations; a mistake would stop the demo | Only Caddy is reachable from outside (ADR-016); SQL Server has no public port; the password lives only in `.env.production`; schema ownership is enforced by code review and no cross-schema FK (ADR-003) |
| H-18 | **The web stores the JWT in `localStorage`** (`auth_session`) | `core/services/auth.ts` of the web; the mobile app uses SecureStore | An HttpOnly cookie needs CSRF protection and a refresh-token flow that this version does not have | One-hour tokens; closed sessions are cut by the gateway and security (ADR-006); Caddy's CSP only allows the site's own scripts plus one hash; no third-party scripts |
| H-16 | **Admin reports are computed in the browser** from the bookings and payments already loaded | `features/admin/viewmodels/reports.viewmodel.ts` reads `ReservationsStore` and `PaymentsStore` | A reporting endpoint per service, or a read model, is new backend work in booking, payment and operations | The data volume of an academic demo fits in the loaded lists; the loaded queue is capped (200 payments, E-10), which is stated next to RF-023 as **Partial** |

---

## Evaluated alternatives

| Alternative | Pros | Cons | Reason for discarding |
|------------|------|------|-----------------------|
| Accept and document the four risks — chosen | No risk to the demo; the gaps are visible and justified | The gaps remain | — (chosen) |
| Implement the Outbox and per-service logins now | Closes two security/reliability findings | Changes in all services and the migrations days before the exposition | Too risky for the time left |
| Leave them undocumented | No work | Looks like an oversight in the evaluation | Not honest |

---

## Consequences

**Positive:**
- The team spends the remaining days on the open defects that affect users (SEC-01, BIZ-01, BIZ-02,
  OPS-01, CD-01).
- Reviewers find each accepted gap with its reason in one place.

**Negative / Trade-offs:**
- RF-023 (reports) and RNF-004 (security) stay **Partial** in `04-requirements/traceability-matrix.md`.
- A RabbitMQ outage during a demo can lose a notification.

**Impact on the system:**
- Documents: `15-project-control/risks.md` (accepted risks), ADR-004, ADR-006, ADR-016.

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| An event is lost while RabbitMQ restarts | Low | Medium | Restart RabbitMQ only with the services stopped; check the DLQs after a demo |
| The `sa` password leaks | Low | High | Never committed (E-05 removed the literal ones from the code); rotate it if it appears in a repository |

---

## References

- `15-project-control/risks.md`, `15-project-control/technical-backlog.md`
- Related to: ADR-003 (database), ADR-004 (communication), ADR-006 (authentication), ADR-016 (deployment), ADR-019 (frontend)
