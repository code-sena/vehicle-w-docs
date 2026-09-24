# Problem Framing — Vehicle Washing

## Problem in one sentence

Customers of a single-location car-wash business need to book a wash with reliable availability and a traceable payment, while operators and administrators need a shared view of the work, because calls, walk-ins and handwritten coordination do not provide a consistent record of slots, assignments, service execution or payments.

## Affected users and jobs

| User | Need | Job to be done | Priority |
|---|---|---|---|
| Customer | Avoid an unnecessary trip and know the cost and status of a wash | When I need a wash, I want to choose a service, slot and available operator from my phone so that I can arrive with a confirmed booking. | High |
| Operator | Know assigned work and keep it current | When I am working, I want to see my availability and assigned services and update their status so that I can execute work in order. | High |
| Administrator | Operate the shop with reliable information | When I manage the business, I want to configure services, schedules, operators and promotions and monitor bookings and payments so that I can run the operation. | High |

## Current situation and impact

The documented context identifies these current workarounds: customers call or travel to the shop to ask about a slot; bookings are recorded by hand; assignments are coordinated manually; and cash payments may leave no customer record. These practices can cause overlapping bookings, wasted customer trips, unclear work ownership and incomplete operational history.

This is a documented project hypothesis, not measured field research. No counts, time savings, booking-error rate or adoption rate have been collected yet.

## Evidence status

| Evidence | Source | Status | Consequence |
|---|---|---|---|
| Description of calls, walk-ins, handwritten bookings and manual assignment | `01-context/overview.md` | Documented project context | Used to frame the initial product problem. |
| Scope, roles and supported payment methods | `01-context/scope.md` | Approved project scope | Defines the MVP boundary. |
| User interviews, observation, operational records or pilot results | — | Pending | Assumptions and targets remain unvalidated. |

## Solution hypothesis

We believe that a role-based web and Android experience that centralizes vehicle data, operator availability, bookings, QR-based payment and service status will reduce coordination friction for customers and give the business a traceable operating flow.

We will know the hypothesis is promising when pilot evidence shows that users can complete the booking-to-service flow and the business can use the recorded booking, payment and status information without reverting to a separate manual register.

## Product rules that shape the solution

- A customer registers one or more vehicles and books a slot for a selected vehicle.
- A booking identifies exactly one customer, vehicle and time slot, and includes one or more wash services, each its own line with its own frozen price. The vehicle must belong to that customer.
- Booking, assignment and payment each have an independent lifecycle. A confirmed booking is a validated slot; it does not make a pending or rejected payment appear approved.
- An operator can be selected from available operators, assigned automatically, or assigned manually by an administrator.
- Automatic assignment considers only operator availability at the shop. Workload, proximity, specialization and ratings are not assignment criteria unless a requirement adds them.
- A reassignment cancels the pending assignment and creates a new assignment, preserving who was previously responsible; it does not cancel the booking.
- A payment belongs to one booking and moves through `PENDING → IN_REVIEW → APPROVED / REJECTED`, with `REFUNDED` as a later terminal state. The customer scans the shop's QR code for their chosen method (cash, Nequi, Daviplata or bank transfer) and uploads a payment receipt; an administrator compares the reported amount against the booking and approves or rejects it. At most one payment per booking can be `APPROVED`. No card data is ever collected or stored by the platform.
- Only the assigned operator can progress assigned work. A booking moves `PENDING → CONFIRMED → IN_PROGRESS → COMPLETED`; its assignment moves `PENDING → IN_PROGRESS → COMPLETED`. Completed or cancelled bookings cannot be changed.
- Only one rating (score 1–5, optionally with comment) is allowed per completed wash-service line within a booking — a booking with two services can receive two independent ratings, one per operator/line.
- Notifications have a recipient and a read/unread state; the delivery channel remains a technical/open decision. Email notifications remain out of scope.

## Initial success measures

The project has no production baseline. Before setting numeric targets, the team will capture a pilot baseline for the following measures:

| Measure | Why it matters | Measurement point |
|---|---|---|
| Completed digital booking flow | Indicates that customers can get a confirmed slot | Confirmed booking with its payment result recorded |
| Booking conflicts | Tests whether availability and assignment are reliable | Conflicting bookings detected or prevented |
| Services with a recorded final status | Indicates operational traceability | Completed or cancelled service records |
| Payments matched to bookings | Indicates commercial traceability | Payment and booking reconciliation |
| Customer rating after completed service | Indicates usable post-service feedback | Rating linked to a completed service |
| Read and unread booking notifications | Indicates that relevant changes reach the intended user | Notification record by recipient and state |

## Risks to validate

| Risk | Validation activity |
|---|---|
| Customers may prefer calls or walk-ins to digital booking | Interview and observe a small pilot group. |
| Operators may not update availability or service status during work | Test the operator flow during a shift. |
| Customers may not want to pay by QR transfer at booking | Interview customers and validate the QR-and-receipt flow end to end. |
| Shop schedules or assignment practices may differ from the assumed model | Review schedules and assignment rules with the administrator. |
| Payment may still be pending when the scheduled service starts | Resolve the business policy before implementation; the domain deliberately leaves this open. |
| Promotion eligibility or loyalty-point formulas may be unclear | Define and validate rules before enabling promotion or loyalty redemption. |

## Out of scope for this product version

The MVP does not include an iOS application, at-home washing, electronic invoicing, inventory management, production deployment, or email notifications/password recovery by email. It also does not cover mechanical repair, vehicle sales, fuel, insurance, advanced fleet management, real-time GPS, AI recommendations, a multi-business marketplace, international expansion or advanced BI. See `01-context/scope.md` for the authoritative rationale and future candidates.

## Related documents

- Product direction: `vision.md`
- Validation plan: `discovery-brief.md`
- Delivery sequence: `roadmap.md`
- Deliverable work: `product-backlog.md`
