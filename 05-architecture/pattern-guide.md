# Pattern Guide

**Last updated:** 2026-10-04

This document distinguishes patterns that are part of the current architecture from patterns that are only proposals or alternatives. A pattern listed here is not automatically an implementation requirement.

## 1. Patterns currently used or adopted

| Pattern | Where | Status | Reason |
|---|---|---|---|
| Microservices | Backend | Adopted | Separates six business areas into independently owned services |
| API Gateway | External access | Adopted | Gives web/mobile clients one entry point |
| Hexagonal architecture | Backend services | Adopted | Keeps domain rules independent from Spring and infrastructure |
| Repository / ports | Service persistence | Adopted | Isolates domain/application from SQL Server access |
| Publish/Subscribe | RabbitMQ | Adopted | Decouples asynchronous reactions such as notifications |
| Soft delete | Domain data | Adopted | Keeps operational history |
| Optimistic locking | Domain data | Modeled, not enforced | `row_version` columns and triggers exist, but no service maps them with `@Version` yet |
| Pessimistic schedule lock | booking-service | Adopted | `sp_getapplock` serialises booking creation/rescheduling so two clients cannot take the same bay; `tr_booking_bay_overlap` is the database safety net |
| Idempotent consumer | customer, notification | Adopted | `notification.processed_event` stores handled `eventId`s; customer skips a profile that already exists |
| Dead-letter queue | RabbitMQ consumers | Adopted | Invalid or repeatedly failing messages go to `<service>.events.dlq` |
| Ports for external calls | booking, customer, notification | Adopted | REST clients to other services are output adapters behind a port (e.g. `CustomerDirectory`, `UserContactDirectory`) |
| Shared-key internal API | security ← notification | Adopted | `/internal/**` routes protected by `X-Internal-Key`, never routed by the gateway (ADR-011 §8) |
| Scheduler | notification | Adopted | `ReminderScheduler` sends due booking reminders |

## 2. API Gateway

Clients call the gateway instead of addressing backend services directly.

```text
Client → API Gateway → service
```

The gateway handles routing and CORS. It does **not** validate the JWT: every service validates it and applies its own authorization (ADR-005 implementation note, ADR-006).

## 3. Hexagonal architecture

Each service has domain, application and infrastructure responsibilities. See `hexagonal-architecture.md` for the package structure and Java examples.

## 4. Repository pattern

Persistence access is represented by ports. The application/domain side does not know whether the adapter uses Spring Data JPA, JDBC or another persistence technology.

This pattern is used to protect the domain boundary, not to create an abstraction for every table.

## 5. Publish/Subscribe with RabbitMQ

Services publish events when another service may react asynchronously.

Example:

```text
booking-service
      │
      │ booking.confirmed
      ▼
  RabbitMQ
      │
      ├── operations-service
      └── notification-service
```

Consumers must be prepared for duplicate delivery: notification-service records each handled `eventId` in `notification.processed_event`, and customer-service ignores a `UserRegistered` whose profile already exists. There is still no Outbox: an event can be lost if the service stops between commit and publish.

## 6. Soft delete

Business data uses `deleted_at` instead of physical deletion. Queries exclude deleted rows unless history is explicitly requested.

## 7. Optimistic locking

`row_version` is designed to prevent an update based on stale data from silently overwriting another update. **Status:** the column and its `tr_touch_*` trigger exist, but the services do not read it back yet (no `@Version` in the JPA entities), so today the last write wins. Booking conflicts are covered instead by the schedule lock.

```text
Admin A reads version 4
Admin B reads version 4
Admin A saves → version 5
Admin B saves with version 4 → conflict
```

## 8. Patterns considered but not adopted

| Pattern | Status | Reason |
|---|---|---|
| Database per Service | Not adopted | The academic environment uses one physical SQL Server database with schema ownership |
| Saga | Not adopted as an implementation | No concrete distributed transaction implementation has been defined |
| Outbox | Not adopted | Current messaging publishes after commit and accepts the crash window |
| CQRS | Not adopted | Read/write models do not justify the added complexity |
| Event Sourcing | Not adopted | SQL Server state plus audit history is sufficient |
| Eventual-consistency framework | Not adopted | RabbitMQ events are enough for current flows |
| BFF | Not adopted | One gateway is sufficient for the current web/mobile clients |
| Service mesh | Not adopted | Local academic deployment does not require it |
| Redis cache | Not adopted | No concrete caching requirement exists |
| Circuit Breaker | Not formally adopted | Retry/error behaviour is still being implemented and measured |
| Sidecar | Not adopted | No operational need exists |

## 9. Do not use a pattern just because it exists here

Before adding a pattern, answer:

1. What concrete problem does it solve?
2. Which current requirement needs it?
3. What complexity does it add?
4. Can the team operate it in the current local Docker environment?

If there is no clear answer, keep the simpler architecture.

## References

- Architecture overview → `overview.md`
- Internal structure → `hexagonal-architecture.md`
- Messaging → `decisions/records/ADR-004-service-communication.md`
- Database ownership → `decisions/records/ADR-003-database-strategy.md`
