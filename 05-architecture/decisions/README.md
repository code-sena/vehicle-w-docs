# Architecture Decision Records

This folder contains the decisions that define the architecture of Express car wash.

## Decision index

| ADR | Decision | Status |
|---|---|---|
| ADR-001 | Documentation language | Accepted |
| ADR-002 | Original architectural style and service decomposition | Superseded by ADR-009 |
| ADR-003 | Shared SQL Server database and schema ownership | Accepted |
| ADR-004 | REST and RabbitMQ communication | Accepted |
| ADR-005 | API Gateway | Accepted |
| ADR-006 | JWT authentication and service authorization | Accepted |
| ADR-007 | Internal hexagonal architecture | Accepted |
| ADR-008 | Manual QR/receipt payment verification | Accepted |
| ADR-009 | Revised six-service decomposition | Proposed — in use: every built service follows it |
| ADR-010 | Data model vs frontend alignment | Accepted |
| ADR-011 | Notification service: push, events, reminders and booking emails (§7, §8) | Accepted |
| ADR-012 | Booking: vehicle resolution by REST to customer-service | Accepted |
| ADR-013 | Payment service: .NET stack and layered (Clean) architecture | Proposed — in use |
| ADR-014 | Operations: booking integration by REST, operator provisioning, manual assignment | Proposed — in use |
| ADR-015 | Loyalty points, promotions, fixed-role permissions and per-booking bays (amends ADR-010) | Accepted |

## How to read the ADRs

Start with ADR-009 for the current service boundaries. Then read ADR-003 for data ownership, ADR-004 for communication, ADR-005 (and its implementation note) and ADR-006 for the edge/security model, ADR-010 for differences between the data model and the screens, ADR-015 for how the loyalty ledger, promotions, role permissions and per-booking bays were finally resolved (amends part of ADR-010), ADR-011 for notifications, ADR-012 for how booking reads vehicles, ADR-014 for how operations works with bookings and operators, ADR-007 for internal service structure (and ADR-013 for the .NET exception in payment), and ADR-008 for payment verification (with its implementation note).

ADR-002 is kept because it records the previous decomposition and why it was changed. It must not be used as the current service list.

## ADR rules

Each ADR records one architectural decision, its context, alternatives and consequences. A later ADR may supersede an earlier one; the earlier file remains for traceability.
