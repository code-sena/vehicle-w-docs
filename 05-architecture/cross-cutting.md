# Cross-Cutting Concerns

**Last updated:** 2026-09-24

These rules apply across the six backend services. They are intentionally limited to decisions supported by the current requirements and data model.

## 1. Audit and data lifecycle

Domain tables use the audit block defined in `06-data/modeling-conventions.md`:

| Field | Purpose |
|---|---|
| `created_at`, `created_by` | Creation timestamp and user |
| `updated_at`, `updated_by` | Last update timestamp and user |
| `deleted_at`, `deleted_by` | Logical deletion |
| `row_version` | Optimistic-locking version |

Domain data uses soft delete. `audit.audit_log` records changes through database triggers. Services do not publish audit events as a replacement for this database-level audit.

## 2. Concurrency

`row_version` is used for optimistic locking. An update includes the version read by the application; if another update already changed the row, the update affects no row and the application reports a conflict.

Cross-service transactions are not used. A transaction stays inside the schemas owned by one service and is never kept open while waiting for another service.

## 3. Logging

Services write logs to standard output so they can be inspected with Docker. Logs should include timestamp, level, service name and correlation id.

Never log passwords, JWTs, password-reset tokens, receipt contents or unnecessary personal data.

## 4. Correlation id

The API Gateway generates or accepts a correlation id and forwards it to downstream services. Service-to-service HTTP calls and RabbitMQ messages keep the same identifier so a request can be followed across the system.

The project does not currently include a distributed tracing platform.

## 5. Error handling

The detailed API contract belongs to `07-api`. The architecture uses these HTTP categories:

| Status | Meaning |
|---:|---|
| 400 | Invalid request or input |
| 401 | Missing, invalid or expired authentication |
| 403 | Authenticated but not authorised |
| 404 | Resource not found |
| 409 | Current-state conflict |
| 422 | Valid resource but invalid for the requested operation |
| 500 | Unexpected server error |

Error codes should be stable and should not expose stack traces or sensitive information.

Validation has three layers:

1. Input validation in the REST adapter.
2. Cross-service reference validation before writing.
3. Domain invariants inside the domain/application layer.

## 6. Transactions

Each use case opens one local transaction. The transaction may write multiple schemas only when those schemas belong to the same service.

A booking and a payment are not one database transaction because they belong to different services. Their consistency is achieved through application validation and events, not a cross-service transaction.

Events are published after commit. The Outbox pattern is not adopted in the current version.

## 7. Messaging

RabbitMQ provides asynchronous communication.

| Concern | Current rule |
|---|---|
| Delivery | At least once should be assumed by consumers |
| Acknowledgement | After successful processing |
| Retry | Limited retries with backoff are proposed |
| Dead letter | Failed messages should be retained for review |
| Idempotency | Pending implementation decision |
| Outbox | Not adopted in this version |

A new event should have a documented consumer and a reason to exist.

## 8. File uploads

The only business file currently identified is the payment receipt. The file must not be logged. Size, accepted image formats and final storage location remain implementation details to be closed before the payment upload is built.

## 9. Configuration and secrets

Environment-specific values must be supplied through environment variables or local environment configuration. Real secrets must not be committed.

Relevant configuration includes SQL Server connection details, RabbitMQ credentials and the JWT signing secret.

## 10. Time and language

SQL Server timestamps are stored in UTC using `DATETIME2(3)`. The clients convert them for display in the Colombian local context.

The backend should return stable error/event codes rather than hard-coded user-facing translations. Final API localisation details belong to `07-api`.

## 11. Deliberately not adopted

The current architecture does not require:

- Redis
- a distributed tracing platform
- a metrics/alerting stack
- CQRS
- Event Sourcing
- a service mesh
- a BFF
- a separate database per service
- a payment gateway

These technologies may be considered in a future version if a concrete requirement appears.

## References

- Data conventions → `06-data/modeling-conventions.md`
- Cross-service references → `06-data/models.md`
- Communication → `decisions/records/ADR-004-service-communication.md`
- Authentication → `decisions/records/ADR-006-authentication-and-authorization.md`
