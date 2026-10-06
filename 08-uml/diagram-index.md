# Diagram Index

> Registry of the system's diagrams. Sources are Mermaid inside Markdown in
> `08-uml/diagrams/source/`, so GitHub renders them without exports. Every diagram here was
> drawn from the code on 2026-10-04; update it in the same PR that changes the behavior.

---

## Registry

### Architecture (C4)

| ID | Name | Source | Description |
|----|------|--------|-------------|
| C4-01 | System context | `05-architecture/overview.md` §3 | The system, its three roles, SMTP and Expo Push |
| C4-02 | Containers (as built) | [`source/c2-containers.md`](./diagrams/source/c2-containers.md) | Front ends, gateway, services, SQL Server, RabbitMQ, REST and event links |

### Sequence

| ID | Name | Source | Covers |
|----|------|--------|--------|
| SEQ-01 | Sign-up and welcome | [`source/seq-registration.md`](./diagrams/source/seq-registration.md) | RF-001, RF-018 |
| SEQ-02 | Book a wash (and full slot) | [`source/seq-booking.md`](./diagrams/source/seq-booking.md) | RF-005, RF-006 |
| SEQ-03 | Booking reminder | [`source/seq-reminder.md`](./diagrams/source/seq-reminder.md) | ADR-011 §7 |
| SEQ-04 | Operator assignment, execution and rating | [`source/seq-assignment-execution.md`](./diagrams/source/seq-assignment-execution.md) | RF-009, RF-011, RF-012, RF-012b, ADR-014 |
| SEQ-05 | Payment by receipt, review and manual payment | [`source/seq-payment.md`](./diagrams/source/seq-payment.md) | RF-013, RF-013b, RF-014, ADR-008 |

### State

| ID | Name | Source | Covers |
|----|------|--------|--------|
| ST-01 | Booking lifecycle | [`source/state-booking.md`](./diagrams/source/state-booking.md) | RF-006, RF-007 |
| ST-02 | Payment lifecycle | [`source/state-payment.md`](./diagrams/source/state-payment.md) | RF-013b, RF-014, ADR-008 |

### Data

The data model is documented as tables, not as an ER diagram: `06-data/models.md` (47 tables, every
column, index and constraint) and the executable script `lavarapido-6-services-sqlserver.sql`.

---

## Missing

| Diagram | Waits for |
|---|---|
| Sequence: automatic operator assignment on `booking.confirmed` | RF-008 (TD-020) |
| Sequence: promotion and loyalty points | payment-service promotions and loyalty |

---

## Naming

`c<level>-<name>.md`, `seq-<flow>.md`, `state-<entity>.md`, `erd-<schema>.md` — one diagram per file,
Mermaid in a fenced ` ```mermaid ` block, plus a one-line note of the code it comes from.

---

## Correlations

- Architecture view → `05-architecture/overview.md`
- Domain events → `02-domain/domain-events.md`
- Events per service → `09-microservices/services/<NN-service>/events.md`
