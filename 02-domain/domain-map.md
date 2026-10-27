# Domain Map — Bounded Contexts

## 1. Domain overview

The system manages the complete process of scheduling and carrying out vehicle washing services at a single physical shop.

The domain starts when a customer chooses a vehicle, one or more wash services and a time slot. It continues through availability validation, booking confirmation, operator assignment, service execution, payment verification and optional customer feedback.

The domain is divided into bounded contexts so that each business responsibility has a clear vocabulary and boundary.

### Main actors

| Actor | Domain responsibility |
|---|---|
| **Customer** | Manages their vehicles, creates bookings, chooses an available operator when allowed, makes or reports payment, and rates completed service lines. |
| **Operator** | Maintains availability and performs assigned service executions. |
| **Administrator** | Manages catalog and shop configuration, assigns or reassigns operators, reviews payments and manages operational information. |

### Core business concepts

| Term | Meaning |
|---|---|
| **Booking** | A scheduled request for one or more wash services for a customer's vehicle. |
| **Booking service** | One selected wash service inside a booking, with its applicable price and quantity. |
| **Time slot** | The start and end time requested for a booking. |
| **Service bay** | A physical washing position in the shop. |
| **Availability** | Whether a requested time can be confirmed considering shop hours, exceptions and occupied bays. |
| **Service execution** | The operational work performed for one booking service line. |
| **Operator assignment** | The responsibility of an operator for carrying out a service execution. |
| **Payment attempt** | A payment record associated with one booking and its review status. |
| **Rating** | Optional customer feedback for one completed service execution. |
| **Loyalty ledger** | The history of loyalty-point movements; it is the source of truth for the balance. |

---

## 2. Bounded Contexts

### Bounded Context: Identity & Access

| Field | Value |
|---|---|
| **Name** | Identity & Access |
| **Responsibility** | User identity, authentication, roles, permissions, sessions, password recovery and user preferences. |
| **Type** | Generic / supporting |

This context defines who can use the system and what they are allowed to do.

The current role vocabulary is:

- Customer
- Operator
- Administrator

Theme and language preferences belong here as user preferences. They are not part of Booking.

---

### Bounded Context: Vehicle Management

| Field | Value |
|---|---|
| **Name** | Vehicle Management |
| **Responsibility** | Customer-owned vehicles and vehicle types used to determine applicable service prices. |
| **Type** | Supporting |

A vehicle belongs to one customer. A customer can register more than one vehicle and can select one of their vehicles when creating a booking.

Vehicle type is also used by the service catalog to determine the applicable price.

---

### Bounded Context: Service Catalog

| Field | Value |
|---|---|
| **Name** | Service Catalog |
| **Responsibility** | Wash services, categories, prices by vehicle type and service duration. |
| **Type** | Supporting |

A **Wash Service** describes what the shop offers.

A **Service Price** represents the tariff for a particular service and vehicle type during a validity period.

The catalog is separate from a booking because changing a current catalog price must not rewrite the price that an existing booking was made with.

---

### Bounded Context: Booking

| Field | Value |
|---|---|
| **Name** | Booking |
| **Responsibility** | Shop availability, booking creation and lifecycle, selected services, time slots, service bays and booking changes. |
| **Type** | **Core** |

Booking is the central business process.

A booking:

- belongs to a customer's vehicle;
- contains one or more selected services;
- has a scheduled start and end;
- can be assigned a service bay when confirmed;
- has its own lifecycle;
- can include a promotion and/or loyalty-point redemption when the applicable rules allow it.

The MVP represents one physical shop, so there is no Branch or Zone concept in the domain.

---

### Bounded Context: Operations & Assignment

| Field | Value |
|---|---|
| **Name** | Operations & Assignment |
| **Responsibility** | Operator availability, operator assignment, service execution and post-service rating data. |
| **Type** | **Core** |

This context turns a confirmed booking into actual work.

A booking can contain several service lines. Each service line can have its own execution record and operator.

There are three assignment paths:

1. **Automatic:** the system chooses from available operators.
2. **Customer selected:** the customer chooses an available operator.
3. **Administrator assigned/reassigned:** an administrator chooses or changes the operator.

For automatic assignment, operator **availability is required**. The rule implemented in
`operations-service` (`AutoAssignmentPolicy`, ADR-014) is: the operator the customer chose if that
operator is free; otherwise the free operator with the fewest bookings that day, and on a tie the lowest
id. Proximity, specialization and rating are not assignment criteria.

---

### Bounded Context: Payment

| Field | Value |
|---|---|
| **Name** | Payment |
| **Responsibility** | Payment attempts, payment methods, shop payment accounts, uploaded receipts, manual review, payment history and loyalty transactions. |
| **Type** | Supporting |

The current payment flow is manual.

Supported methods are:

- Cash
- Nequi
- Daviplata
- Bank transfer

Digital methods use the shop's QR/account information and an uploaded receipt. The administrator reviews the reported amount and transaction reference.

The system does not collect or store card data and does not currently depend on an external payment gateway.

The loyalty transaction ledger also belongs to this context. It is the source of truth for loyalty-point balance and redemption validation.

---

### Bounded Context: Promotions & Loyalty

| Field | Value |
|---|---|
| **Name** | Promotions & Loyalty |
| **Responsibility** | Promotion eligibility, discounts and loyalty-point movements. |
| **Type** | Supporting |

Promotions are coupons with a code. Each one asks for a loyalty balance (`RequiredPoints`) that unlocks
it; points are not spent when it is used. The data model also has a table for customer-specific
promotions (`promotion.promotion_customer`), which the code does not use yet.

Loyalty points are represented through a transaction ledger. The `loyalty_points` value kept with the customer is a display copy, not the authoritative balance.

As implemented: a promotion gives a percentage or a fixed amount off the booking (with an optional
maximum), and an approved payment credits the loyalty points of the booked services. The domain does
not invent additional formulas.

---

### Bounded Context: Feedback & Rating

| Field | Value |
|---|---|
| **Name** | Feedback & Rating |
| **Responsibility** | Optional customer rating and comment after a service line has been completed. |
| **Type** | Supporting capability |

Rating is a business concept, but it is intentionally tied to service execution.

The current model allows:

- score from 1 to 5;
- optional comment;
- rating timestamp;
- one rating state per service execution.

There is no independent `rating` table in the current data model.

---

### Bounded Context: Notification

| Field | Value |
|---|---|
| **Name** | Notification |
| **Responsibility** | User notifications generated from relevant business events. |
| **Type** | Generic / supporting |

Notification communicates what happened in other contexts. It does not own the booking, payment or execution decision that caused the notification.

The delivery channel remains an architectural concern and should not be invented in the domain model.

---

### Cross-cutting capabilities

Some capabilities use information from several contexts without becoming a new bounded context:

- operational reports;
- role-based presentation;
- audit;
- user interface preferences.

Audit is a cross-cutting capability associated with Identity & Access in the current architecture. It is not a separate business context or microservice.

---

## 3. Context relationships

The relationships below describe business dependencies, not physical database relationships.

```text
                     Identity & Access
                            │
                  identity / permissions
                            │
          ┌─────────────────┼──────────────────┐
          ▼                 ▼                  ▼
 Vehicle Management ────▶ Booking ◀──── Service Catalog
                              │
                              │ confirmed booking
                              ▼
                    Operations & Assignment
                         │            │
                         │            └────▶ Feedback & Rating
                         │
                         ▼
                     Notification

 Booking ───────────────────────────────▶ Payment
 Payment ── payment reported / confirmed ▶ Booking
 Payment ───────────────────────────────▶ Promotions & Loyalty
 Booking ───────────────────────────────▶ Promotions & Loyalty
 Relevant business events ──────────────▶ Notification
```

### Relationship table

| Context | Relationship | Context | Meaning |
|---|---|---|---|
| Vehicle Management | provides | Booking | Booking uses a vehicle that belongs to the customer. |
| Service Catalog | provides | Booking | Booking selects one or more catalog services and their applicable prices. |
| Booking | collaborates with | Operations & Assignment | Confirmed bookings become service work that must be assigned and executed. |
| Booking | enables | Payment | A payment attempt belongs to a booking. |
| Payment | informs | Booking | When the customer reports a payment (or the administrator approves it), Payment tells Booking with `PaymentReported` / `PaymentConfirmed`, so the digital payment deadline stops running; before cancelling an overdue booking, Booking also asks Payment whether a payment was reported (internal query, ADR-021). |
| Operations & Assignment | enables | Feedback & Rating | Rating is available after the related service execution is completed. |
| Booking / Payment | collaborates with | Promotions & Loyalty | Promotions and loyalty rules can affect the booking/payment amount when applicable. |
| Identity & Access | provides identity | All protected contexts | Operations depend on the user's identity and role. |
| Relevant contexts | publish business information | Notification | Notification informs users without owning the underlying business state. |

### Important boundary rules

1. **Booking owns booking lifecycle.** Operations manages execution; it does not redefine booking concepts.
2. **A booking is not an execution.** A booking represents the scheduled customer request; an execution represents work performed for one selected service.
3. **A booking can contain multiple service lines.** Each line can have its own execution and rating.
4. **A service is not a booking.** Catalog services are reusable offerings; booking lines are concrete selections made for a booking.
5. **Payment does not own the booking.** It records and reviews the financial attempt associated with it.
6. **Notification does not own business changes.** It communicates changes decided elsewhere.
7. **The domain has one shop in the MVP.** Branch and Zone are not domain concepts.
8. **Automatic operator assignment requires availability.** Among the free operators it prefers the one the customer chose, then the one with the fewest bookings that day. Other criteria require an explicit future requirement.
9. **Loyalty validation uses the transaction ledger.** The customer's displayed points value is not the source of truth.

---

## 4. Core, supporting and generic contexts

| Bounded Context | Type | Reason |
|---|---|---|
| **Booking** | **Core** | The central customer transaction: availability, scheduling and booking lifecycle. |
| **Operations & Assignment** | **Core** | Converts confirmed bookings into real service work and tracks execution. |
| **Identity & Access** | Generic / supporting | Required across the system but not specific to vehicle washing. |
| **Vehicle Management** | Supporting | Enables booking but is not the central transaction. |
| **Service Catalog** | Supporting | Defines what can be booked and at what applicable price. |
| **Payment** | Supporting | Handles payment attempts and verification for bookings. |
| **Promotions & Loyalty** | Supporting | Adds discounts and retention capabilities. |
| **Feedback & Rating** | Supporting | Captures post-service customer feedback. |
| **Notification** | Generic / supporting | Communicates business events generated by other contexts. |

---

## 5. Domain lifecycle and status vocabularies

The project keeps separate lifecycles for booking, execution and payment. They must not be collapsed into one generic status.

### Booking status

The current data model uses English codes (ADR-010); the web translates them:

| Status | Meaning |
|---|---|
| `SCHEDULED` | Booking exists but has no bay yet. Kept in the model; the current flow never creates it because a booking is confirmed with a bay at once (RF-006). |
| `CONFIRMED` | Booking has a bay and a time. |
| `IN_PROGRESS` | Work for the booking is underway. |
| `COMPLETED` | The booking has finished. |
| `CANCELLED` | Booking was cancelled (with a reason). |
| `NO_SHOW` | The customer did not attend the scheduled service. |

Transition guards as implemented: see the booking lifecycle in `entities-and-rules.md`.

### Service execution status

Each selected service line has its own execution status (English codes, seed `execution.execution_status`):

| Status | Meaning |
|---|---|
| `PENDING` | An operator is assigned and the service line has not started. |
| `IN_PROGRESS` | The operator is currently performing the service. |
| `PAUSED` | Execution temporarily paused. Exists in the model; no use case sets it today. |
| `COMPLETED` | The service line has been completed. |
| `WITH_ISSUE` | Execution marked with an operational issue. Exists in the model; no use case sets it today. |

### Payment status

| Status | Meaning |
|---|---|
| `PENDING` | Payment attempt exists but has not entered review. |
| `IN_REVIEW` | Administrator is reviewing the payment. |
| `APPROVED` | Payment was approved. |
| `REJECTED` | Payment was rejected. |
| `REFUNDED` | An approved payment was later refunded. |

### Why the lifecycles stay separate

| Concept | Represents |
|---|---|
| Booking status | Customer's scheduled wash lifecycle |
| Execution status | Operational work for one service line |
| Payment status | Financial verification lifecycle |

A change in one lifecycle does not automatically mean that every other lifecycle has the same status.

---

## 6. Key domain rules

1. A protected operation requires an authenticated user with the required role.
2. A customer can only use vehicles that belong to that customer.
3. A booking must identify a customer vehicle and a valid scheduled time.
4. A booking contains one or more selected service lines.
5. Each selected service line stores the applicable service-price reference used when the booking was created, so later catalog price changes do not rewrite the historical booking price.
6. A booking's scheduled end must be later than its scheduled start.
7. A booking can only use a service bay when the requested time is compatible with shop availability and existing active bookings.
8. Two active bookings cannot occupy the same service bay during overlapping times.
9. A customer can cancel a booking only before its start time; rescheduling is done by the administrator. Once execution has started, cancellation is blocked.
10. Automatic operator assignment requires operator availability; among the free operators it prefers the customer's choice, then the fewest bookings that day.
11. Customer-selected assignment must use an operator who is available for the requested work.
12. Administrator assignment/reassignment must not assign an unavailable operator.
13. Each service execution belongs to one booking service line.
14. An operator cannot execute two overlapping services at the same time.
15. Only the operator assigned to a service execution can start or complete that execution.
16. A service line can be rated only after its execution is completed.
17. A rating is optional and has a score from 1 to 5.
18. A rating comment cannot exist without a rating score.
19. Payment attempts belong to one booking.
20. A digital payment receipt includes a reported amount and transaction reference and is reviewed by an administrator.
21. The reported receipt amount is compared with the amount due; a mismatch is a review condition, not an automatic payment approval.
22. A transaction reference already used in a payment of another booking cannot be reused.
23. The system does not collect or store card data.
24. Cash does not require a digital receipt; the administrator registers the cash payment and it is approved at once.
25. Promotions apply only when their validity and eligibility rules are satisfied.
26. Loyalty redemption is validated against the loyalty transaction ledger, not against the customer's display copy.
27. A notification has a recipient and a read/unread state.
28. Roles limit the operations that a user can perform.
29. Reports consume information from the business contexts; they do not become owners of the concepts they report.

---

## 7. Modeling decisions

| Decision | Alternative | Reason |
|---|---|---|
| Keep Booking as a Core context | Treat operations as the central transaction | The customer transaction starts with scheduling and booking. |
| Allow one booking to contain multiple service lines | Force one service per booking | Current requirements and `booking.booking_service` allow one or more services in a single booking. |
| Keep service prices separate from services | Store one mutable price directly on Service | Prices depend on vehicle type and validity period and must preserve historical booking amounts. |
| Keep service execution per booking line | Track one execution for the whole booking | Different service lines can have their own operator, timing and rating. |
| Keep rating tied to service execution | Create an independent Rating table | The current data model stores rating fields directly on `execution.service_execution`. |
| Keep Payment separate from Booking | Store payment lifecycle inside Booking | Payment has its own attempts, review states and history. |
| Keep the loyalty ledger in the Payment context | Treat customer.loyalty_points as the source of truth | The ledger is the authoritative record of point movements; the customer field is only a display copy. |
| Keep one establishment in the MVP | Introduce Branch and Zone | The current scope is a single shop. |
| Require operator availability for automatic assignment, then the customer's choice, then the fewest bookings that day | Proximity, specialization or rating rules | It is the rule built in `operations-service` (ADR-014); the other criteria are not in the requirements. |
| Keep domain boundaries independent from deployment boundaries | Force one microservice per bounded context | Microservice decomposition is an architecture decision, not a DDD rule. |
| Keep persistence details outside the domain model | Model SQL Server tables as domain entities | The domain should describe business concepts; the data model describes physical persistence. |

---

## 8. Domain events — initial catalog

The following events describe meaningful changes in the business domain. Their transport, serialization and infrastructure belong to architecture/API documentation.

| Event | Origin context | Meaning |
|---|---|---|
| `UserRegistered` | Identity & Access | A new user account was created. |
| `UserAuthenticated` | Identity & Access | A user successfully authenticated. |
| `BookingCreated` | Booking | A booking was created. |
| `BookingConfirmed` | Booking | A booking passed the required availability/confirmation checks. |
| `BookingModified` | Booking | An allowed booking change was completed. |
| `BookingCancelled` | Booking | A booking was cancelled. |
| `OperatorAssigned` | Operations & Assignment | An operator was assigned to service work. |
| `OperatorReassigned` | Operations & Assignment | Responsibility for service work changed to another operator. |
| `ServiceStarted` | Operations & Assignment | A service execution started. |
| `ServiceCompleted` | Operations & Assignment | A service execution was completed. |
| `PaymentInitiated` | Payment | A payment attempt was registered. |
| `PaymentReported` | Payment | The customer reported a payment with its receipt (`payment.reported`); Booking consumes it and records when the payment was reported. |
| `PaymentConfirmed` | Payment | An administrator approved a payment. |
| `PaymentRejected` | Payment | An administrator rejected a payment. |
| `RatingSubmitted` | Feedback & Rating | A customer submitted feedback for a completed service line. |
| `PromotionApplied` | Promotions & Loyalty | An eligible promotion was applied. |
| `LoyaltyPointsEarned` | Promotions & Loyalty | A loyalty-point movement credited points. |
| `LoyaltyPointsRedeemed` | Promotions & Loyalty | A loyalty-point movement deducted points. |
| `NotificationCreated` | Notification | A notification record was created for a user. |

Not every event in this catalog is emitted by the code. Which ones are published, which are only logged and which are not emitted at all is listed in `domain-events.md` (Implementation status).

---

## 9. Boundaries and pending decisions

The domain model intentionally does not decide implementation details that belong elsewhere.

| Topic | Current position | Owner |
|---|---|---|
| Microservice decomposition | Six services are defined by the current architecture decision | `05-architecture` / ADR-009 |
| Physical database | One SQL Server database with nine owned schemas | `05-architecture` / `06-data` |
| Cross-service foreign keys | Not used across service ownership boundaries | `06-data` |
| API endpoints and DTOs | Not defined here | `07-api` |
| Exact event transport and broker configuration | Not defined here | `05-architecture` |
| Notification delivery channels | Inbox, push (Expo) and email, as built in notification-service | `05-architecture` / `09-microservices` |
| Promotion formulas | Percentage or fixed amount with optional cap, as built in payment-service | `09-microservices` (payment-service) |
| Loyalty earning/redemption formula | Points of the booked services credited on an approved payment; points are not spent | `09-microservices` (payment-service) / `06-data` |
| Payment-before-service policy | Set by the payment mode chosen at booking (ADR-021): a `DIGITAL` booking must have its payment reported before `min(creation + 30 min, start)` or it is cancelled with `PAYMENT_TIMEOUT`; a `CASH` booking is paid at the shop and a customer can hold one active cash booking. Admin bookings have no deadline. Once reported, the payment can be reviewed while the booking is `CONFIRMED`, `IN_PROGRESS` or `COMPLETED` | `02-domain/entities-and-rules.md` (INV-BOOK-010 to 012), `09-microservices` (booking and payment) |

---

## 10. Consistency and traceability

### Context alignment

The current domain model uses:

- Customer, Operator and Administrator as roles.
- One physical shop for the MVP.
- Booking as the central business process.
- Multiple service lines per booking.
- Operator availability is required for automatic assignment; then the customer's choice, then the fewest bookings that day (ADR-014).
- Manual QR/receipt payment verification.
- Rating per completed service line.
- Loyalty ledger as the source of truth.
- No Branch or Zone domain concept.

### Requirements alignment

| Requirement area | Domain context |
|---|---|
| RF-001 to RF-004b | Identity & Access |
| RF-005 to RF-007 | Booking + Vehicle Management + Service Catalog |
| RF-008 to RF-012b | Operations & Assignment |
| RF-013 to RF-016 | Payment |
| RF-017 | Presentation / UI capability |
| RF-018 | Notification |
| RF-019 to RF-020 | Identity & Access / user preferences |
| RF-021 to RF-022 | Booking / Operations & Assignment |
| RF-023 | Cross-context reporting |
| RF-024 to RF-026 | Promotions & Loyalty |

### Relationship with other documentation

- `01-context/` provides scope and project vocabulary.
- `03-product/` provides product vision, backlog and user stories.
- `04-requirements/` provides the functional and non-functional requirements.
- `05-architecture/` maps the domain boundaries to services and technical architecture.
- `06-data/` maps the domain concepts to SQL Server schemas and tables.
- `07-api/` defines API contracts.
- `08-uml/` should use the same domain vocabulary.
- `09-microservices/` describes the implementation of the service boundaries.

If a later document changes a business rule or domain concept, this folder must be reviewed before allowing the inconsistency to spread to architecture and data documentation.
