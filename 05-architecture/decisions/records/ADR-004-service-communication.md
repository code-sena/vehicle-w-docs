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

Events may include booking confirmation/cancellation, operator assignment, service execution changes, payment review results, loyalty changes and notification-triggering events. The exact event catalogue belongs to `02-domain/domain-events.md` and the API/event contracts.

## Event rules

- Events are published after the local database transaction commits.
- Consumers must tolerate duplicate delivery.
- Acknowledgement occurs after successful processing.
- Retry/dead-letter handling is required for the running broker configuration.
- An Outbox table/process is **not adopted yet**.

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
- Cross-service references → `06-data/models.md`
- Cross-cutting messaging → `../cross-cutting.md`
