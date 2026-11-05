# Architecture Decision Records

This folder contains the decisions that define the architecture of LavaRápido.

## Decision index

| ADR | Decision | Status |
|---|---|---|
| [ADR-001](./records/ADR-001-documentation-language.md) | Documentation language | Accepted |
| [ADR-002](./records/ADR-002-architectural-style-and-service-decomposition.md) | Original architectural style and service decomposition | Superseded by ADR-009 |
| [ADR-003](./records/ADR-003-database-strategy.md) | Shared SQL Server database and schema ownership | Accepted |
| [ADR-004](./records/ADR-004-service-communication.md) | REST and RabbitMQ communication | Accepted |
| [ADR-005](./records/ADR-005-api-gateway.md) | API Gateway (cuts closed-session tokens with any scheme, rate limit on `/auth`, client IP, timeouts — 2026-10-24) | Accepted |
| [ADR-006](./records/ADR-006-authentication-and-authorization.md) | JWT authentication, sessions, attempt caps, consent, `X-Internal-Key` and service authorization | Accepted |
| [ADR-007](./records/ADR-007-internal-service-architecture.md) | Internal hexagonal architecture | Accepted |
| [ADR-008](./records/ADR-008-payment-verification.md) | Manual QR/receipt payment verification | Accepted |
| [ADR-009](./records/ADR-009-service-decomposition-revised.md) | Revised six-service decomposition | Accepted |
| [ADR-010](./records/ADR-010-data-model-vs-frontend-alignment.md) | Data model vs frontend alignment | Accepted |
| [ADR-011](./records/ADR-011-notification-service-push-and-events.md) | Notification service: push, events, reminders and booking emails; event contract as built (§17) | Accepted |
| [ADR-012](./records/ADR-012-booking-vehicle-resolution-rest.md) | Booking: vehicle resolution by REST to customer-service | Accepted |
| [ADR-013](./records/ADR-013-payment-service-dotnet-stack.md) | Payment service: .NET stack and layered (Clean) architecture | Accepted |
| [ADR-014](./records/ADR-014-operations-booking-integration-and-assignment.md) | Operations: booking integration by REST, operator provisioning, assignment, the follow-up of bookings nobody closed, locks, retries and the start window (§12) | Accepted |
| [ADR-015](./records/ADR-015-loyalty-promotions-roles-bays-2026-10.md) | Loyalty points, promotions, fixed-role permissions and per-booking bays (amends ADR-010) | Accepted |
| [ADR-016](./records/ADR-016-deployment-azure-vm-compose-caddy.md) | Deployment: one Azure VM with Docker Compose and Caddy | Accepted |
| [ADR-017](./records/ADR-017-ci-cd-github-actions.md) | CI/CD with GitHub Actions and continuous deployment from `main` | Accepted (2026-10-24); running since 2026-10-26, every merge to `main` deploys (status update 2026-10-27) |
| [ADR-018](./records/ADR-018-mobile-app-updates.md) | Mobile app updates: EAS Update by fingerprint, automatic OTA with `cd.yml` and a mandatory APK | Accepted |
| [ADR-019](./records/ADR-019-frontend-architecture.md) | Frontend architecture: feature-based MVVM (web, zoneless) and a layered mobile app | Accepted |
| [ADR-020](./records/ADR-020-accepted-risks-v1.md) | Risks accepted for version 1 (no Outbox, shared `sa`, JWT in `localStorage`, reports in the browser) | Accepted |
| [ADR-021](./records/ADR-021-digital-payment-deadline-event-and-sync-check.md) | Digital payment deadline: event plus a synchronous check with payment-service before cancelling (payment at booking, 2026-10-26) | Accepted |

## How to read the ADRs

Start with ADR-009 for the current service boundaries. Then read ADR-003 for data ownership, ADR-004 for communication, ADR-005 (and its implementation note) and ADR-006 for the edge/security model, ADR-010 for differences between the data model and the screens, ADR-015 for how the loyalty ledger, promotions, role permissions and per-booking bays were finally resolved (amends part of ADR-010), ADR-011 for notifications, ADR-012 for how booking reads vehicles, ADR-014 for how operations works with bookings and operators, ADR-007 for internal service structure (and ADR-013 for the .NET exception in payment), and ADR-008 for payment verification (with its implementation note). For how it runs and ships, read ADR-016 (deployment), ADR-017 (CI/CD), ADR-018 (mobile updates) and ADR-019 (frontend structure); ADR-020 lists what was consciously left out of version 1, and ADR-021 how the payment deadline of a booking copes with the missing Outbox.

ADR-002 is kept because it records the previous decomposition and why it was changed. It must not be used as the current service list.

## ADR rules

Each ADR records one architectural decision, its context, alternatives and consequences. A later ADR may supersede an earlier one; the earlier file remains for traceability.
