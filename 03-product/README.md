# 03 — Product Definition

This folder defines **what** Express Car Wash will deliver and **why**. It is grounded in the project context and scope in `01-context/`; it uses the domain language defined in `01-context/glossary.md`. Technical architecture is documented elsewhere and must not redefine product scope.

## Product at a glance

Express Car Wash is a web and Android platform for a multi-branch car-wash business. A customer registers a vehicle, selects a branch, service, date and time, chooses an available operator or requests automatic assignment, pays online, and later rates the completed service. Administrators manage branches, services, operators, schedules, promotions and operational reporting; operators manage availability and the execution status of their assigned services.

## Documents

| Document | Purpose |
|---|---|
| [problem-framing.md](problem-framing.md) | Defines the problem, affected users, assumptions, evidence status, risks and scope boundary. |
| [discovery-brief.md](discovery-brief.md) | Plans the discovery work needed to validate assumptions without presenting them as facts. |
| [vision.md](vision.md) | States the product direction, principles and measurable success criteria. |
| [roadmap.md](roadmap.md) | Organizes the scoped MVP and later candidates by delivery milestone. |
| [product-backlog.md](product-backlog.md) | Prioritized epics and user stories traceable to the MVP scope and business rules. |
| `_template-*.md` | Reusable templates; they are not product decisions. |

## Source of truth and alignment rules

- Product terms use the glossary: **booking**, **branch**, **wash service**, **operator**, **availability**, **assignment**, **promotion**, **payment** and **rating**.
- The MVP boundary is `01-context/scope.md`. A roadmap or backlog item cannot silently expand it.
- Product requirements must respect the existing business model: a booking is for one vehicle, branch, wash service and time; assignment can be customer-selected, automatic or administrator-set; payment is traceable to that booking; ratings are submitted only after completion.
- `02-domain/domain-map.md` is the source of truth for the product's domain boundaries: Booking and Operations & Assignment are core; identity, vehicle, catalog, branch, payment, feedback, notification, promotions and loyalty support that core flow.
- Booking status, assignment status and payment status are distinct. Product screens and stories must not collapse them into one ambiguous “status”.
- Discovery assumptions and planning targets are not validated research results. They must be replaced with evidence when the team conducts research or pilots the product.

## Traceability

```text
Context and scope → problem framing → vision → roadmap → backlog → requirements → implementation and tests
                              ↑
                    discovery evidence and domain rules
```

## Deliberately excluded from this folder

Detailed architecture, service decomposition, database design, API contracts and implementation tasks belong in their respective sections. They may support product decisions, but they do not replace them.
