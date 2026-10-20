# Discovery Brief — Vehicle Washing

## Objective

Validate whether the documented booking and operational problems occur in the target car-wash business, how users currently work around them, and which MVP capabilities create enough value to retain.

## Questions by participant

| Participant | Questions to answer |
|---|---|
| Customers | How do they choose a service and time? How often do they find a slot unavailable? Would they scan a QR code and upload a receipt at booking? Which booking, payment and notification states do they need to understand? |
| Operators | How are schedules and assignments communicated? When can availability change? Which assignment states are useful during execution? Is reassignment needed before work starts? |
| Administrators | How are operator schedules, services, promotions, loyalty and payment receipts managed today? What report and notification information is needed to run the day? |

## Methods and minimum evidence

| Activity | Participants / artifact | Output |
|---|---|---|
| Semi-structured interviews | At least 3 customers, 2 operators and 1 administrator if access is available | Pain points, language and current workaround. |
| Observation of a service day | The shop, with permission | Booking, assignment, payment and status workflow. |
| Prototype or sandbox walkthrough | One representative from each role | Usability findings for the MVP flow. |
| Operational-record review | Existing appointment/payment records, if permitted | Baseline for conflicts, no-shows and reconciliation. |

## Assumptions to validate

| ID | Assumption | Related decision | Status |
|---|---|---|---|
| D-01 | Customers value seeing availability before travelling. | Slot selection. | Pending |
| D-02 | Customers will complete the QR-scan-and-receipt-upload flow at booking instead of paying in person. | Payment confirmation flow. | Pending |
| D-03 | Operators can keep their availability and service status current. | Assignment and execution workflow. | Pending |
| D-04 | Administrator-configured schedules reflect real shop operation. | Availability calculation. | Pending |
| D-05 | Customer-selected operators add value versus automatic assignment. | Assignment options. | Pending |
| D-06 | A post-service rating is useful to customers and the business. | Rating and review feature. | Pending |
| D-07 | The in-app inbox, with push and email copies the user can switch off, keeps users informed. | Notification channel and read/unread experience. | Pending |
| D-08 | Payment must be confirmed before a wash can start. | Payment/operations policy. | Pending — explicit domain question |
| D-09 | Customers understand the difference between booking, assignment and payment states. | Status presentation. | Pending |
| D-10 | The proposed promotion conditions and loyalty-point formulas are useful and understandable. | Promotions and loyalty rules. | Pending |

## Evidence log

| ID | Finding / evidence | Source | Date | Status | Product impact |
|---|---|---|---|---|---|
| D-CTX-01 | Calls, walk-ins, handwritten bookings and manual coordination are the documented starting problem. | `01-context/overview.md` | Not recorded | Context only | Basis for research; not a validated finding. |

Add one row for every interview, observation or test. Do not convert a hypothesis into a finding without recording its source and date.

## Decision rules

- Keep a capability when evidence shows it solves a frequent, consequential user problem and it fits the approved scope.
- Refine a capability when users use different terminology, a rule is missing, or the current workflow reveals an exception.
- Do not create automatic-assignment criteria beyond operator availability at the shop unless evidence becomes an approved requirement.
- Do not decide payment-before-service, promotion eligibility, loyalty-point calculation or notification delivery channel through a product assumption; record the decision and update the domain rule.
- Escalate a scope change when evidence requires a feature outside `01-context/scope.md`; do not add it directly to the MVP backlog.

## Outputs

Discovery outputs update `problem-framing.md` (evidence and risks), `vision.md` (validated value), `roadmap.md` (priority) and `product-backlog.md` (stories and acceptance criteria). Domain terminology or rules discovered during the work must also update `01-context/glossary.md` and the appropriate artifact in `02-domain/`.
