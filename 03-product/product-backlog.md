# Product Backlog — Express Car Wash

This is the product-level, prioritized backlog. It uses the terms and MVP boundary in `01-context/`. IDs provide traceability; they do not prescribe a technical service boundary.

## Prioritization

| Priority | Meaning |
|---|---|
| P0 | Required to create a valid booking and record its payment outcome. |
| P1 | Required to operate, complete, cancel, administer or evaluate the approved MVP. |
| P2 | Candidate after MVP validation; not committed. |

## M1 — Foundation

### EP-01 — Access and roles (P0)

| ID | User story | Acceptance criteria |
|---|---|---|
| US-01 | As a user, I want to register, log in, recover/change my password and manage my permitted profile data so that I can use the platform securely. | Required data is validated; duplicate accounts are rejected; invalid credentials are rejected; passwords are never stored in plain text — only their hash; password recovery issues a single-use, time-limited token and does not require an excluded email channel. |
| US-02 | As an administrator, I want to manage role-based access so that customers, operators and administrators only use the functions assigned to them. | Authorized administrators can assign roles; unauthorized access is denied; permissions are applied to protected actions. |
| US-03 | As an administrator, I want to manage wash services, operators and schedules so that customers are offered real operating options. | Required master data is validated; an operator is associated with the relevant schedule; inactive or invalid options cannot be booked. |

### EP-02 — Customer vehicle (P0)

| ID | User story | Acceptance criteria |
|---|---|---|
| US-04 | As a customer, I want to register and manage my vehicles so that I can use one in a booking. | Required vehicle data is validated; the vehicle is linked to its owner; only its owner can view or modify it; a saved vehicle is selectable in booking. |

## M2 — Confirmed booking

### EP-03 — Availability and assignment (P0)

| ID | User story | Acceptance criteria |
|---|---|---|
| US-05 | As a customer, I want to choose a wash service, date and available time so that I can plan my visit. | The catalog shows active services with price and duration; only valid schedules and available slots are selectable; unavailable slots cannot be selected; two confirmed bookings cannot share the same wash bay and time slot. |
| US-06 | As a customer, I want to choose an available operator or request automatic assignment so that the service has an appropriate responsible operator. | The customer only sees eligible available operators; automatic assignment considers operator availability only; an administrator can override assignment when authorized; undocumented criteria such as rating, workload or proximity are not used. |

### EP-04 — Booking and payment (P0)

| ID | User story | Acceptance criteria |
|---|---|---|
| US-07 | As a customer, I want to create a booking for my vehicle so that I have a confirmed wash slot. | The customer is authenticated; the vehicle belongs to that customer; one service and time slot are selected; availability is revalidated before confirmation; the agreed price is frozen at creation; the booking starts `AGENDADA` and is confirmed only through the valid availability transition. |
| US-08 | As a customer, I want to pay for my booking by scanning the shop's QR code and uploading a receipt so that the payment is traceable. | The customer picks a payment method (cash, Nequi, Daviplata or bank transfer) and sees the corresponding QR/account details; card data is never collected or stored; one booking can have several payment attempts but at most one `APPROVED` payment; the payment moves through `PENDING → IN_REVIEW → APPROVED/REJECTED`; the reported receipt amount is checked against the booking amount; a reused receipt reference is flagged. The payment-before-service policy is resolved before release. |

## M3 — Service execution and changes

### EP-05 — Operator work management (P1)

| ID | User story | Acceptance criteria |
|---|---|---|
| US-09 | As an operator, I want to maintain my availability and view assigned services so that I know what I can accept and must perform. | The operator can record permitted availability; the operator sees only their assigned work; each entry includes vehicle, service, time, assignment status and booking status. |
| US-10 | As an operator, I want to update the status of an assigned service so that the customer and administrator have a current record. | Only the assigned operator can start or complete their assignment; an assignment moves `PENDING → IN_PROGRESS → COMPLETED`; the corresponding booking moves through its valid lifecycle; booking, assignment and payment statuses remain separately visible. |
| US-11 | As a customer, I want to consult my booking and service history so that I can track upcoming and completed services. | A customer sees only their own records; each record includes relevant booking, payment and service-status information. |

### EP-06 — Cancellation (P1)

| ID | User story | Acceptance criteria |
|---|---|---|
| US-12 | As a customer, I want to modify or cancel an eligible booking before execution so that I can change my plans. | The system permits changes/cancellation only before the service starts; completed or cancelled bookings are immutable; cancellation updates availability and the pending assignment consistently; payment handling follows the documented policy when defined. |

### EP-06A — Reassignment and notification (P1)

| ID | User story | Acceptance criteria |
|---|---|---|
| US-13 | As an administrator, I want to assign or reassign a pending service so that operational changes do not leave work unowned. | The administrator selects an operator available at that time; reassignment cancels the previous pending assignment and creates a new assignment instead of overwriting history; the booking is not cancelled; the relevant parties are notified. |
| US-14 | As a user, I want to receive and read in-app notifications about relevant changes so that I can act on current information. | Booking confirmation/modification/cancellation, assignment/reassignment, payment result and service completion create the appropriate notification; every notification has one recipient and read/unread state; email delivery is not required. |

## M4 — Administration, promotion and feedback

### EP-07 — Promotions and administration (P1)

| ID | User story | Acceptance criteria |
|---|---|---|
| US-15 | As an administrator, I want to create and control promotions so that eligible customers receive the intended discount. | Authorized administrators can create, update, activate or deactivate a promotion; active dates and conditions are validated; expired, inactive or ineligible promotions are not applied; the resulting amount is recorded with the booking. |
| US-16 | As a customer, I want to earn or redeem loyalty points according to defined rules so that eligible repeat use has a transparent benefit. | The loyalty account model and earning/redemption formulas are approved before implementation; only eligible events change points; every point change is traceable; no provisional formula is silently released. |
| US-17 | As an administrator, I want to consult payment and operational reports so that I can run the business from recorded data. | Authorized users can consult booking, payment and service information; reports respect access permissions and use recorded platform data; no card data is ever collected or exposed, since the platform never handles it. |
| US-18 | As a user, I want role-appropriate dashboards, preferences and Spanish/English interface options so that I can use the platform comfortably. | The dashboard exposes only role-appropriate information; available preferences (theme, language, notification opt-in) are stored for the user; the interface exposes the two scoped languages; access controls are unchanged by language or preference. |

### EP-08 — Rating and review (P1)

| ID | User story | Acceptance criteria |
|---|---|---|
| US-19 | As a customer, I want to rate and comment on a completed service so that I can share my experience. | Only the customer linked to a completed booking can submit one rating; score is from 1 to 5 and comment is optional; incomplete or cancelled services cannot be rated; the rating is linked to the correct booking and is visible only to authorized roles. |

## Cross-cutting Definition of Done

A story is done only when its acceptance criteria pass, role authorization is verified, relevant validation/error handling is implemented, required API/UI work is integrated, the affected business rule is tested, and documentation is updated where the story changes product language or rules.

## Explicitly deferred candidates (P2)

- iOS application, at-home wash service, email notifications and email-based password recovery.
- Additional shop locations, only after validation.
- Additional integrations, only after validation.

Electronic invoicing, inventory and production deployment are not backlog candidates for this MVP; see `01-context/scope.md`.

## Traceability

| Product need | Backlog epics |
|---|---|
| Avoid uncertain booking and wasted trips | EP-02, EP-03, EP-04 |
| Organize work and assignment | EP-01, EP-03, EP-05, EP-06 |
| Keep payment and operational records | EP-04, EP-05, EP-07 |
| Improve through customer feedback | EP-08 |
| Keep affected users informed | EP-06A |
| Encourage eligible repeat use | EP-07 |

## Domain-context coverage

| Domain context (`02-domain/domain-map.md`) | Backlog coverage |
|---|---|
| Identity & Access | EP-01 |
| Vehicle Management | EP-02 |
| Service Catalog and Shop Management | EP-01, EP-03 |
| Booking | EP-03, EP-04, EP-06 |
| Operations & Assignment | EP-03, EP-05, EP-06A |
| Payment | EP-04, EP-07 |
| Notification | EP-06A |
| Feedback & Rating | EP-08 |
| Promotions & Loyalty | EP-07 |
