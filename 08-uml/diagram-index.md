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

### State

| ID | Name | Source | Covers |
|----|------|--------|--------|
| ST-01 | Booking lifecycle | [`source/state-booking.md`](./diagrams/source/state-booking.md) | RF-006, RF-007 |

### Data

The data model is documented as tables, not as an ER diagram: `06-data/models.md` (47 tables, every
column, index and constraint) and the executable script `lavarapido-6-services-sqlserver.sql`.

---

## Missing (add when the service exists)

| Diagram | Waits for |
|---|---|
| Sequence: operator assignment and execution | operations-service |
| Sequence: payment by receipt and review | payment-service |
| State: payment lifecycle | payment-service |

---

## Naming

`c<level>-<name>.md`, `seq-<flow>.md`, `state-<entity>.md`, `erd-<schema>.md` — one diagram per file,
Mermaid in a fenced ` ```mermaid ` block, plus a one-line note of the code it comes from.

---

## Correlations

- Architecture view → `05-architecture/overview.md`
- Domain events → `02-domain/domain-events.md`
- Events per service → `09-microservices/services/<NN-service>/events.md`
