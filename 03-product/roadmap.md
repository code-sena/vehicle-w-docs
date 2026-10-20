# Product Roadmap — Vehicle Washing

This roadmap sequences the approved scope; it is not a promise of calendar dates. Reprioritization requires evidence and must preserve the boundary in `01-context/scope.md`.

| Milestone | Outcome | Included capabilities | Exit criteria |
|---|---|---|---|
| M1 — Foundation | Secure, role-based access and master operating data | Registration, login, password change/recovery, temporary lockout, roles; operators, schedules and wash-service configuration | Each role has only its permitted access and an administrator can configure the data required to offer a slot. |
| M2 — Validated booking and payment | Customer completes the essential flow | Vehicle profile, service/date/time selection, availability validation, operator choice or automatic assignment, booking confirmation, QR payment attempt and receipt review, in-app notifications | A customer receives a confirmed available booking with an independently recorded payment state; no conflicting time-slot booking is created. |
| M3 — Service execution and changes | The booked work is performed and traceable | Assigned-work view, reassignment before work starts, separate booking/assignment status updates, permitted modification/cancellation, customer history and notifications | Staff and customer see the appropriate booking, assignment and payment state without conflating them. |
| M4 — Administration, feedback and retention | The business can maintain and improve the operation | Promotions, loyalty rules/points, payment history/reconciliation, one rating per completed wash-service line, dashboards, reports, role preferences and supported languages | Administrators can operate from platform records; customers can rate each completed wash-service line; promotion/loyalty rules are explicitly defined before use. |

## Dependencies and ordering

```text
Roles + services + schedules
                 ↓
Vehicle + availability + assignment
                 ↓
Confirmed booking + independently reviewed QR payment state
                 ↓
Assignment and execution status / cancellation
                 ↓
Rating, notification, history, reports and improvement
```

The booking may not bypass availability validation. Payment, booking and assignment states are separate. A rating may not be created until its service is completed; reassignment preserves assignment history; and the policy on whether payment must be confirmed before service starts remains an explicit decision to resolve.

## Candidates after the MVP

Only after validating need and capacity may the team evaluate iOS support, at-home washing, additional locations and additional integrations. Electronic invoicing, inventory management and production deployment are explicitly not part of the current academic MVP. Loyalty is in the current domain scope, but its point-account model and formulas must be defined before implementation. The remaining exclusions are listed in `01-context/scope.md` and `problem-framing.md`.

## Roadmap governance

Review at each planning cycle using discovery evidence, pilot measures, technical constraints and scope impact. Update the backlog before starting changed work, and update the glossary/domain documentation when the business language or rule changes.
