# Diagram Index

> Registry of the system's diagrams. Sources are Mermaid inside Markdown in
> `08-uml/diagrams/source/`, so GitHub renders them directly. Every diagram also has a PNG with the
> same name in [`diagrams/exports/`](./diagrams/exports/) for documents outside GitHub. Every diagram
> here was checked against the code on 2026-10-19 (the ER diagrams were generated from the production
> database that day); the containers, booking components, operations/booking/notification classes,
> production deployment, assignment sequence and booking states were checked again against
> `origin/develop` on 2026-10-23, and the booking and payment flows (payment mode, cash limit, payment
> deadline, `payment.reported`) against `main` on 2026-10-27, when every outdated PNG was exported
> again (`README.md`). Update the source and its image in the same PR that changes the behavior.

---

## Registry

### Use cases

| ID | Name | Source | Covers |
|----|------|--------|--------|
| UC-01 | Use cases by actor (CU01–CU32 of the SRS) | [`source/uc-actors.md`](./diagrams/source/uc-actors.md) | Every actor |
| UC-02 | Use cases → backend input ports | [`source/uc-backend-mapping.md`](./diagrams/source/uc-backend-mapping.md) | CU01–CU32 |

### Architecture (C4) and deployment

| ID | Name | Source | Description |
|----|------|--------|-------------|
| C4-01 | System context | `05-architecture/overview.md` §3 | The system, its three roles, SMTP and Expo Push |
| C4-02 | Containers (as built) | [`source/c2-containers.md`](./diagrams/source/c2-containers.md) | Three views: overview (front ends, gateway, services, SQL Server, RabbitMQ), REST calls between services, and events |
| C4-03 | booking-service components (hexagonal) | [`source/c3-booking-components.md`](./diagrams/source/c3-booking-components.md) | Adapters in, ports in, use cases, domain, ports out, adapters out |
| DEP-01 | Production on Azure | [`source/deployment-production.md`](./diagrams/source/deployment-production.md) | VM, containers, Caddy, Portainer, SSH and GitHub Actions access, and the server data |

### Class (domain model)

| ID | Name | Source |
|----|------|--------|
| CL-01 | security-service | [`source/class-security.md`](./diagrams/source/class-security.md) |
| CL-02 | customer-service | [`source/class-customer.md`](./diagrams/source/class-customer.md) |
| CL-03 | booking-service (catalog and booking) | [`source/class-booking.md`](./diagrams/source/class-booking.md) |
| CL-04 | operations-service (execution and inspection) | [`source/class-operations.md`](./diagrams/source/class-operations.md) |
| CL-05 | payment-service (payments, promotions, loyalty) | [`source/class-payment.md`](./diagrams/source/class-payment.md) |
| CL-06 | notification-service | [`source/class-notification.md`](./diagrams/source/class-notification.md) |

### Sequence

| ID | Name | Source | Covers |
|----|------|--------|--------|
| SEQ-01 | Sign-up and welcome | [`source/seq-registration.md`](./diagrams/source/seq-registration.md) | RF-001, RF-018 |
| SEQ-02 | Book a wash (and why a time is not available), payment mode and payment deadline | [`source/seq-booking.md`](./diagrams/source/seq-booking.md) | RF-005, RF-006, RF-010, ADR-021 |
| SEQ-03 | Booking reminder | [`source/seq-reminder.md`](./diagrams/source/seq-reminder.md) | ADR-011 §7 |
| SEQ-04 | Operator assignment, execution and rating | [`source/seq-assignment-execution.md`](./diagrams/source/seq-assignment-execution.md) | RF-009, RF-011, RF-012, RF-012b, ADR-014 |
| SEQ-05 | Payment by receipt, review, manual payment and refund | [`source/seq-payment.md`](./diagrams/source/seq-payment.md) | RF-013, RF-013b, RF-014, RF-016, ADR-008 |
| SEQ-06 | Automatic operator assignment and operator choice | [`source/seq-auto-assignment.md`](./diagrams/source/seq-auto-assignment.md) | RF-008, RF-010, ADR-014 |
| SEQ-07 | Login, lockout and logout | [`source/seq-login-lockout.md`](./diagrams/source/seq-login-lockout.md) | RF-002, RF-004b |
| SEQ-08 | Password recovery with a 6-digit code | [`source/seq-password-recovery.md`](./diagrams/source/seq-password-recovery.md) | RF-003 |
| SEQ-09 | Loyalty points and coupon redemption | [`source/seq-loyalty-coupon.md`](./diagrams/source/seq-loyalty-coupon.md) | RF-024, RF-025, RF-026 |
| SEQ-10 | Vehicle inspection report | [`source/seq-inspection-report.md`](./diagrams/source/seq-inspection-report.md) | CU30 |
| SEQ-11 | New APK and the update notice | [`source/seq-app-update.md`](./diagrams/source/seq-app-update.md) | Mobile distribution |

### State

| ID | Name | Source | Covers |
|----|------|--------|--------|
| ST-01 | Booking lifecycle | [`source/state-booking.md`](./diagrams/source/state-booking.md) | RF-006, RF-007 |
| ST-02 | Payment lifecycle | [`source/state-payment.md`](./diagrams/source/state-payment.md) | RF-013b, RF-014, ADR-008 |
| ST-03 | Service execution | [`source/state-execution.md`](./diagrams/source/state-execution.md) | RF-009, RF-012, RF-012b |
| ST-04 | Inspection report and its phases | [`source/state-inspection.md`](./diagrams/source/state-inspection.md) | CU30 |
| ST-05 | User account (active, locked, inactive) | [`source/state-user-account.md`](./diagrams/source/state-user-account.md) | RF-001, RF-002, RF-004b, RF-027 |

### Activity

| ID | Name | Source | Covers |
|----|------|--------|--------|
| ACT-01 | Booking a wash | [`source/activity-booking.md`](./diagrams/source/activity-booking.md) | CU05, CU06, CU07 |
| ACT-02 | Paying and reviewing a payment | [`source/activity-payment.md`](./diagrams/source/activity-payment.md) | CU12, CU13, CU25 |
| ACT-03 | An operator's working day | [`source/activity-operator-day.md`](./diagrams/source/activity-operator-day.md) | CU10, CU11, CU22 |

### Data (entity-relationship)

Generated from the `LavaRapido` database (`sys.tables`, `sys.columns`, `sys.foreign_keys`) with every
migration applied (up to 039 when they were generated): 57 tables in 9 schemas. On 2026-10-27 the model has 58 tables and 1 view (migrations up to 049, seeds up to 117, payment up to 023; the new table is `notification.pending_delivery`); see `06-data/models.md`. Each file also lists the references to other
services, which have no foreign key (ADR-003). The full dictionary stays in `06-data/models.md`.

| ID | Schemas | Source | Tables |
|----|---------|--------|--------|
| ER-01 | security, audit | [`source/erd-security.md`](./diagrams/source/erd-security.md) | 12 |
| ER-02 | customer | [`source/erd-customer.md`](./diagrams/source/erd-customer.md) | 3 |
| ER-03 | catalog, booking | [`source/erd-booking.md`](./diagrams/source/erd-booking.md) | 13 |
| ER-04 | execution | [`source/erd-operations.md`](./diagrams/source/erd-operations.md) | 11 |
| ER-05 | promotion, payment | [`source/erd-payment.md`](./diagrams/source/erd-payment.md) | 12 |
| ER-06 | notification | [`source/erd-notification.md`](./diagrams/source/erd-notification.md) | 7 |

---

## Missing

Nothing pending for the current scope. When a new flow or table is added, add its diagram here.

---

## Naming

`uc-<name>.md`, `c<level>-<name>.md`, `deployment-<env>.md`, `class-<service>.md`, `seq-<flow>.md`,
`state-<entity>.md`, `activity-<process>.md`, `erd-<service>.md`: Mermaid in fenced ` ```mermaid `
blocks, plus a note of the code it comes from and the date it was checked. Inside sequence and state
diagrams do not write `;` in a message: Mermaid takes it as the end of the line.

---

## Correlations

- Architecture view → `05-architecture/overview.md`
- Domain events → `02-domain/domain-events.md`
- Events per service → `09-microservices/services/<NN-service>/events.md`
- Tables and columns → `06-data/models.md`
- Use cases (full specification) → `lavarapido-docs`, Requirements Specification §7
