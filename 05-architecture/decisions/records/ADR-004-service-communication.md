# ADR-004 — Service Communication

| Field | Value |
|---|---|
| **ID** | ADR-004 |
| **Date** | 2026-09-24 |
| **Status** | Accepted |
| **Authors** | Development team |
| **Reviewers** | Development team |

## Context

The six services need synchronous validation for data they do not own and asynchronous reactions for work that does not need to delay the user's request. The system already includes RabbitMQ in the technology stack.

## Decision

Use **REST for synchronous validation** and **RabbitMQ for asynchronous domain events**.

### REST examples

| Caller | Callee | Reason |
|---|---|---|
| `booking-service` | `customer-service` | Validate customer vehicle ownership |
| `booking-service` | `operations-service` | Validate availability information when required by the booking flow |
| `payment-service` | `booking-service` | Validate the booking and amount due before payment creation/review |
| `payment-service` | `customer-service` | Validate customer information when a promotion or loyalty rule requires it |
| `operations-service` | `security-service` | Validate operator user identity when required |

The exact API contracts belong to `07-api`. Service-to-service calls do not pass through the external gateway.

### RabbitMQ examples

Events may include booking confirmation/cancellation, operator assignment, service execution changes, payment review results, loyalty changes and notification-triggering events. Each event's business meaning and payload fields belong to `02-domain/domain-events.md`. The exchange, the exact routing key per event, and the envelope shape are in `cross-cutting.md`, section 7 — kept there instead of here so there's one place for it, not two.

## Event rules

- Events are published after the local database transaction commits.
- Consumers must tolerate duplicate delivery.
- Acknowledgement occurs after successful processing.
- Retry/dead-letter handling is required for the running broker configuration. Since 2026-10-24 the three consumers (customer, operations, notification) retry 3 times and then dead-letter through `carwash.events.dlx`; operations moved to the queue `operations-service.booking-confirmed` for that (OPS-04, ADR-011 §17).
- operations-service publishes with publisher confirms (OPS-04): a nack or an unroutable event is logged, not retried. notification-service keeps its own delivery outbox (`pending_delivery`, OPS-05) for push and email, which is not an event outbox.
- An Outbox table/process is **not adopted**: accepted risk for version 1 (H-11, ADR-020). If the broker is down at publish time the event is logged and lost; scheduled jobs (reminders, unassigned alerts, the follow-up of bookings nobody closed) rebuild what matters from the database.

## Consequences

REST keeps required validation explicit. RabbitMQ prevents non-essential side effects such as notifications from blocking the main operation. The trade-off is asynchronous failure handling and the need for idempotency.

## Alternatives

| Alternative | Result |
|---|---|
| REST only | Not adopted; side effects would become unnecessarily synchronous |
| Events for everything | Not adopted; cross-service references need immediate validation |
| REST + RabbitMQ + Outbox | Not adopted yet; can be introduced if the commit/publish failure becomes unacceptable |

## References

- Domain events → `02-domain/domain-events.md`
- Exchange, routing keys and envelope → `../cross-cutting.md`, section 7
- Cross-service references → `06-data/models.md`
- Cross-cutting messaging → `../cross-cutting.md`
