# Product Vision — Vehicle Washing

## Vision statement

**For** vehicle owners who need to arrange a wash without uncertain availability, and for car-wash staff who need an organized daily operation, **Vehicle Washing** is a web and Android booking-management platform **that** connects vehicle, service, operator availability, QR-based payment, notifications and service execution in one traceable flow. **Unlike** calls, walk-ins and handwritten registers, it gives customers a confirmed booking and gives the business a current, role-appropriate view of the work.

## Mission

Make the car-wash experience easier to plan, execute and follow up: customers should know what they booked and paid for; operators should know what to perform; and administrators should be able to manage the operation from reliable records.

## Strategic pillars

| Pillar | Product commitment | Evidence of value |
|---|---|---|
| Reliable booking | Show a customer valid service, time and operator options and prevent conflicts. | Digital bookings are completed without a conflict. |
| Clear execution | Give operators their availability, assigned services and status changes. | Assigned services progress through recorded statuses. |
| Trustworthy transaction | Link the booking, applicable promotion and the reviewed QR payment result. | Payments reconcile to their booking. |
| Controlled operation | Give administrators the tools to manage schedules, services, promotions, payment review and reports. | Operational records can be consulted without a separate manual register. |
| Simple access | Adapt the experience and permissions to customer, operator and administrator roles. | Each role can complete its scoped tasks. |
| Informed participants | Notify the relevant customer or operator when a meaningful booking, assignment, payment or service event occurs. | Notification records reach the intended recipient and can be read. |

## Product principles

1. **A confirmed booking is the core outcome.** The product prioritizes the path from vehicle to a confirmed booking with a traceable payment outcome before secondary capabilities.
2. **Availability must be truthful.** A displayed slot cannot be booked if the relevant schedule or operator is unavailable.
3. **One product language.** The interface and documents use the glossary terms consistently; a booking is not alternately called an appointment, order or service request.
4. **The customer sees simplicity; the business retains traceability.** Every essential action produces an appropriate, role-controlled record.
5. **Scope is a product decision.** Features listed as excluded in `01-context/scope.md` are not promoted through the roadmap or backlog.
6. **State has meaning.** Booking status, assignment status and payment status answer different user questions and are always presented separately.

## Definition of product success

The MVP is successful when a customer can authenticate, register a vehicle, select one or more wash services and an available slot, receive a recorded booking and payment result, and follow relevant notifications; an operator can see and update their assigned work; and an administrator can maintain operating data, reassign pending work, review and approve payments, apply approved promotions and consult the resulting records.

There is no live baseline yet. The team will establish pilot baselines and targets for the measures in `problem-framing.md` before claiming product outcomes.

## Scope boundary

The vision includes the approved MVP in `01-context/scope.md` and the current domain requirements: user and role management, booking changes/cancellation, assignment, QR-based payment with receipt review, in-app notifications, ratings, promotions and loyalty, role-based interfaces and administrative management. iOS, at-home washing, electronic invoicing, inventory, production deployment, additional locations and email notifications are excluded from this version.

## Traceability

`problem-framing.md` explains the need; `roadmap.md` sequences the scope; `product-backlog.md` turns it into testable stories. The terms and rules are sourced from `01-context/glossary.md` and the domain documentation in `02-domain/`.
