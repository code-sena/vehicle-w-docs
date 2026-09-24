# Entities, Value Objects, Aggregates, and Business Rules

This document translates the concepts from `domain-map.md` into the tactical domain model.

The examples are intentionally conceptual. The domain model does not prescribe SQL Server table names, framework annotations or deployment details. Those concerns belong to `05-architecture` and `06-data`.

---

## 1. Tactical DDD concepts

### Entity

An **Entity** is a domain object whose identity distinguishes it from other objects of the same kind.

Examples:

- User
- Customer Vehicle
- Booking
- Booking Service
- Service
- Operator
- Service Execution
- Payment
- Promotion
- Notification

Two bookings can have the same customer, vehicle, services and time and still be different bookings because they have different identities.

### Value Object

A **Value Object** is defined by its values rather than by an independent identity.

Examples:

- Money
- TimeSlot
- Date range
- Payment amount

Value objects should be treated as immutable: changing their value means creating a new value.

### Aggregate

An **Aggregate** groups domain objects that must remain consistent together and has one aggregate root.

The most important aggregate in this domain is `Booking`, which contains the booking's selected service lines and booking-level rules.

A service execution is managed independently because it belongs to one booking line and has its own operational lifecycle.

### Business Rule

A business rule is a condition that must be true for the domain to remain valid.

Rules should be expressed independently of a particular database or UI implementation.

---

## 2. Domain entities

### Entity: User

**Context:** Identity & Access

A user is an account that can act as a Customer, Operator or Administrator according to the roles assigned to the account.

Important concepts:

- identity;
- credentials;
- roles and permissions;
- password recovery;
- sessions;
- user preferences.

**Rules**

- Passwords are never stored as plain text.
- A user can only perform actions allowed by their assigned role.
- Authentication and authorization are separate concerns: authentication establishes identity, while authorization checks permissions.

---

### Entity: Customer Vehicle

**Context:** Vehicle Management

A customer vehicle is a vehicle registered by a customer and available for selection in a booking.

Important concepts:

- owner;
- vehicle type;
- registration/plate;
- active state.

**Rules**

1. A vehicle belongs to one customer.
2. Only its owner can manage it through the customer-facing functionality.
3. A vehicle used in a booking must belong to the customer creating that booking.
4. Deactivating a vehicle must not erase historical bookings.

---

### Entity: Wash Service

**Context:** Service Catalog

A wash service represents an offering provided by the shop.

It is not the same as a booking.

Examples may include different types of vehicle washing, but the domain does not hardcode a fixed list of service names.

Important concepts:

- service name;
- category;
- description;
- active state.

A service can have different prices depending on vehicle type and validity period.

---

### Entity: Service Price

**Context:** Service Catalog

A service price represents the applicable tariff for one service and one vehicle type during a validity period.

Important concepts:

- service;
- vehicle type;
- price;
- estimated duration;
- validity period.

**Rules**

1. A booking uses the price that was applicable when its service line was created.
2. Changing a future/current catalog price must not rewrite the historical price of an existing booking.
3. Overlapping active tariff periods for the same service and vehicle type are not allowed.

The exact persistence strategy is defined in `06-data`.

---

### Entity: Booking

**Context:** Booking

A booking is the central customer transaction.

A booking identifies:

- the customer's vehicle;
- scheduled start and end;
- the selected service lines;
- the booking lifecycle;
- the service bay when confirmed;
- booking-level promotion/loyalty information when applicable.

A booking can contain **one or more `BookingService` lines**.

### Booking lifecycle

The current persistence model uses these states:

```text
AGENDADA
   │
   ├── confirm ──▶ CONFIRMADA
   │                  │
   │                  └── start ──▶ EN_EJECUCION
   │                                   │
   │                                   └── finish ──▶ FINALIZADA
   │
   ├── cancel ──▶ CANCELLED
   │
   └── no-show ─▶ NO_ASISTIO
```

The exact transition guards must follow the current functional requirements and operational flow.

### Booking rules

**INV-BOOK-001 — A booking requires a customer vehicle**

The booking cannot be created without a valid customer vehicle.

**INV-BOOK-002 — The vehicle belongs to the customer**

The selected vehicle must belong to the customer creating the booking.

**INV-BOOK-003 — At least one service line is required**

A booking without a selected wash service is not a valid booking.

**INV-BOOK-004 — The scheduled range is valid**

The scheduled end must be later than the scheduled start.

**INV-BOOK-005 — Availability must be validated**

A booking cannot be confirmed if the requested time cannot be accommodated by the shop's operating rules and available service bays.

**INV-BOOK-006 — A bay cannot be double-booked**

Two active bookings cannot occupy the same service bay during overlapping time ranges.

**INV-BOOK-007 — Booking changes are restricted by lifecycle**

Modification and cancellation are allowed only while the current requirements permit them. Once execution has started, cancellation is blocked.

**INV-BOOK-008 — Historical service prices remain stable**

The price used for each booking service line comes from the applicable service-price record at booking time. Later catalog changes do not rewrite the booking's historical charge.

**INV-BOOK-009 — Points redemption must be represented consistently**

If loyalty points are redeemed, both the redeemed-point amount and its monetary discount must represent the same redemption. A booking cannot have one without the other.

---

### Entity: Booking Service

**Context:** Booking

`BookingService` is a line inside a booking representing one selected wash service.

Important concepts:

- booking;
- service price;
- quantity.

**Rules**

1. Quantity must be greater than zero.
2. The same service-price row cannot be duplicated inside the same booking.
3. The selected service price remains the historical reference for the line.
4. A booking can contain several different service lines.

This entity is important because a booking is not limited to one wash service.

---

### Entity: Service Bay

**Context:** Booking

A service bay is a physical washing position in the single shop.

**Rules**

1. Only active bays can be used for new confirmations.
2. A bay cannot be assigned to overlapping active bookings.
3. A cancelled booking releases the bay for later availability.
4. The domain does not model Branch or Zone above the bay because the MVP contains one shop.

---

### Entity: Business Hours and Exceptions

**Context:** Booking

The shop's availability is defined by normal business hours and exceptional dates.

Important concepts:

- day of week;
- opening/closing time;
- active/inactive schedule;
- exception date;
- exceptional opening or closure.

Availability must consider both normal hours and exceptions before confirming a booking.

---

### Entity: Operator

**Context:** Operations & Assignment

An operator is a user who performs vehicle washing services.

Important concepts:

- operator identity;
- availability;
- absences;
- assigned service executions.

**Rules**

1. An operator must have the Operator role.
2. An operator can only be assigned when available for the requested work.
3. An operator cannot execute overlapping services.
4. Operator availability is required for automatic assignment. The final selection/tie-break rule is not defined here because the current requirements contain conflicting wording.

---

### Entity: Service Execution

**Context:** Operations & Assignment

A service execution represents the actual work performed for one `BookingService` line.

Important concepts:

- booking service line;
- operator;
- execution status;
- start time;
- finish time;
- optional rating and comment.

### Execution lifecycle

```text
PENDIENTE
    │
    ├── start ──▶ EN_PROCESO ──▶ FINALIZADA
    │
    ├── pause ──▶ PAUSADA ──▶ EN_PROCESO
    │
    └────────────────────────▶ CON_NOVEDAD
```

The exact transitions are subject to the operational requirements.

### Execution rules

**INV-EXEC-001 — One execution per booking service line**

A service line has at most one current execution record.

**INV-EXEC-002 — An execution has one responsible operator**

The execution identifies the operator performing the service.

**INV-EXEC-003 — Operator overlap is not allowed**

The same operator cannot appear to execute two overlapping services.

**INV-EXEC-004 — Only the assigned operator can update execution progress**

An operator cannot start or complete another operator's work.

**INV-EXEC-005 — Rating belongs to the completed execution**

Rating is optional and is only available after the service execution has been completed.

---

### Entity: Operator Assignment

Assignment is a domain concept representing the responsibility of an operator for a service execution.

The current data model represents this responsibility through `execution.service_execution.operator_id`; it does **not** define a separate `assignment` table.

There are three assignment paths:

| Method | Who selects the operator | Rule |
|---|---|---|
| Automatic | System | Uses operator availability only. |
| Customer selected | Customer | The selected operator must be available. |
| Administrator assigned/reassigned | Administrator | The selected operator must be available. |

For a reassignment, the operational history must not be silently lost. The implementation should preserve the relevant history according to the architecture/data decisions.

---

### Entity: Payment

**Context:** Payment

A payment is an attempt to settle the amount associated with one booking.

Supported methods:

- `CASH`
- `NEQUI`
- `DAVIPLATA`
- `BANK_TRANSFER`

### Payment lifecycle

```text
PENDING ──▶ IN_REVIEW ──▶ APPROVED
                  │
                  └──────▶ REJECTED

APPROVED ──▶ REFUNDED
```

### Payment rules

**INV-PAY-001 — Payment belongs to a booking**

Every payment attempt is associated with one booking.

**INV-PAY-002 — Digital payment uses receipt verification**

For digital methods, the customer submits a receipt with the reported amount and transaction reference.

**INV-PAY-003 — Cash does not require a digital receipt**

Cash is confirmed directly by the administrator.

**INV-PAY-004 — Administrator reviews payment**

A payment requiring review is approved or rejected by an authorized administrator.

**INV-PAY-005 — Receipt amount is compared with the amount due**

A mismatch is a reason for review/rejection; it is not silently treated as a successful payment.

**INV-PAY-006 — Transaction references cannot be reused for approved payments**

A receipt reference already used by another approved payment cannot be reused.

**INV-PAY-007 — No card data**

The system does not collect or store card numbers, CVV codes or card expiration dates.

---

### Entity: Promotion

**Context:** Promotions & Loyalty

A promotion defines a discount that can be applied when its eligibility conditions are satisfied.

Current data supports:

- discount type;
- validity period;
- active state;
- public eligibility;
- minimum completed-booking threshold;
- customer-specific eligibility.

The exact discount formulas must follow the current product and requirements documentation.

---

### Entity: Loyalty Transaction

**Context:** Promotions & Loyalty / Payment ownership

A loyalty transaction records one movement of points.

A movement can:

- add points;
- subtract points.

The ledger is the authoritative source for the customer's loyalty balance.

The customer record can contain a display copy of the balance, but that copy must not be used to validate redemption.

**INV-LOY-001 — Ledger is the source of truth**

Redemption validation uses the loyalty transaction history/balance, not the customer's display copy.

**INV-LOY-002 — A redemption has a monetary effect**

When points are redeemed against a booking, the booking records both points redeemed and their monetary discount.

---

### Entity: Rating

**Context:** Feedback & Rating

Rating is modeled as a domain concept associated with a completed service execution.

It contains:

- score from 1 to 5;
- optional comment;
- rating date.

The current physical model stores these values in `execution.service_execution`:

- `quality_rating`
- `quality_comment`
- `rated_at`

There is no independent `rating` table.

**INV-RATING-001 — Rating only after completion**

A customer can rate a service line only after its execution has been completed.

**INV-RATING-002 — Score range**

The score must be between 1 and 5.

**INV-RATING-003 — Comment requires a score**

A comment cannot exist without a rating.

**INV-RATING-004 — One rating state per execution**

A service execution can have at most one current rating.

Rating is not an automatic-assignment criterion.

---

### Entity: Notification

**Context:** Notification

A notification represents information prepared for a user because something relevant happened.

Important concepts:

- recipient;
- notification type;
- message;
- read/unread state;
- creation time.

The notification context does not decide the business event that caused the notification.

---

## 3. Value Objects

### Money

Represents a monetary amount and its currency.

For this project, amounts are expressed in COP.

Rules:

- amount cannot be negative;
- currency must be supported;
- comparisons use monetary values rather than floating-point arithmetic.

### TimeSlot

Represents the requested date/time interval for a booking.

It contains:

- start;
- end.

Rules:

- start must be earlier than end;
- overlap is evaluated using the complete interval, not only the start time.

### Date Range

Used conceptually for:

- service-price validity;
- promotion validity;
- business-hour exceptions.

A range must have valid start/end boundaries according to the context using it.

---

## 4. Aggregates

### Aggregate: Booking

**Aggregate root:** `Booking`

Conceptually contains:

- booking identity and lifecycle;
- scheduled interval;
- customer vehicle reference;
- selected `BookingService` lines;
- booking-level promotion/loyalty information;
- service-bay assignment.

The aggregate protects rules that must remain consistent inside the booking, such as having service lines and keeping booking-level values coherent.

### Aggregate: Service Execution

**Aggregate root:** `ServiceExecution`

Conceptually contains:

- booking service reference;
- operator;
- execution status;
- start/finish timestamps;
- optional rating information.

It is kept separate from Booking because operational progress should not require changing the booking's internal structure.

### Aggregate: Payment

**Aggregate root:** `Payment`

The payment lifecycle is independent from booking lifecycle.

### Aggregate: Promotion

**Aggregate root:** `Promotion`

Promotion eligibility and validity belong to this business capability.

### Aggregate: Notification

**Aggregate root:** `Notification`

A notification is an independent record for a recipient.

---

## 5. Domain services

### AvailabilityChecker

**Context:** Booking

Determines whether a requested time can be confirmed considering:

- shop business hours;
- business-hour exceptions;
- active service bays;
- existing active bookings;
- overlapping time ranges.

It does not decide operator assignment.

### OperatorAssigner

**Context:** Operations & Assignment

Provides the assignment rules for:

- automatic assignment;
- customer-selected assignment;
- administrator assignment/reassignment.

For automatic assignment, availability is a required condition. The exact selection/tie-break rule must come from the approved requirements. The current documentation is inconsistent about whether workload is only mentioned historically or is used as a tie-break, so this document does not establish that rule.

The domain must not silently introduce other criteria such as:

- proximity;
- specialization;
- rating;
- distance;
- performance score.

### PaymentReviewer

**Context:** Payment

Conceptually validates a payment attempt using:

- payment method;
- required receipt;
- reported amount;
- transaction reference;
- existing approved payment references.

The administrator performs the final approve/reject action.

### PromotionEligibilityChecker

**Context:** Promotions & Loyalty

Determines whether a promotion can be applied according to the current promotion rules.

The exact formula is defined outside this domain document when it is not yet finalized.

---

## 6. Business rule summary

| ID | Rule |
|---|---|
| INV-BOOK-001 | Booking requires a customer vehicle. |
| INV-BOOK-002 | Vehicle must belong to the customer. |
| INV-BOOK-003 | Booking requires at least one service line. |
| INV-BOOK-004 | Scheduled end must be later than scheduled start. |
| INV-BOOK-005 | Booking availability must be validated before confirmation. |
| INV-BOOK-006 | A service bay cannot be double-booked in overlapping active intervals. |
| INV-BOOK-007 | Booking changes are restricted by lifecycle. |
| INV-BOOK-008 | Historical booking service prices remain stable. |
| INV-BOOK-009 | Points redeemed and points discount amount must be consistent. |
| INV-EXEC-001 | Each booking service line has at most one execution. |
| INV-EXEC-002 | Each execution has one responsible operator. |
| INV-EXEC-003 | Operator execution intervals cannot overlap. |
| INV-EXEC-004 | Only the responsible operator can update execution progress. |
| INV-EXEC-005 | Rating is available only after completion. |
| INV-PAY-001 | Every payment belongs to one booking. |
| INV-PAY-002 | Digital payments require receipt verification. |
| INV-PAY-003 | Cash does not require a digital receipt. |
| INV-PAY-004 | Authorized administrator reviews pending payments. |
| INV-PAY-005 | Reported receipt amount is compared with amount due. |
| INV-PAY-006 | Approved transaction references cannot be reused. |
| INV-PAY-007 | No card data is collected or stored. |
| INV-LOY-001 | Loyalty ledger is the source of truth. |
| INV-LOY-002 | Loyalty redemption records points and monetary discount together. |
| INV-RATING-001 | Rating is only allowed after service completion. |
| INV-RATING-002 | Rating score is 1–5. |
| INV-RATING-003 | Comment requires a score. |
| INV-RATING-004 | One current rating exists per execution. |

---

## 7. Domain-to-data alignment

The domain concepts intentionally map to the current data model without making the domain depend on SQL Server.

| Domain concept | Current data representation |
|---|---|
| User | `security.person`, `security.app_user`, roles and permissions |
| User preferences | `security.user_preference` |
| Customer | `customer.customer` |
| Customer vehicle | `customer.customer_vehicle` |
| Vehicle type | `customer.vehicle_type` |
| Wash service | `catalog.service` |
| Service price | `catalog.service_price` |
| Establishment | `booking.establishment` |
| Business hours | `booking.business_hour` |
| Exceptions | `booking.business_hour_exception` |
| Service bay | `booking.service_bay` |
| Booking status | `booking.booking_status` |
| Booking | `booking.booking` |
| Booking service | `booking.booking_service` |
| Operator | `execution.operator` |
| Operator availability | `execution.operator_availability` |
| Operator absence | `execution.operator_absence` |
| Service execution | `execution.service_execution` |
| Rating | `execution.service_execution.quality_rating`, `quality_comment`, `rated_at` |
| Promotion | `promotion.promotion` and related promotion tables |
| Payment | `payment.payment` |
| Payment receipt | `payment.payment_receipt` |
| Payment methods/accounts | `payment.payment_method_type`, `payment.payment_account` |
| Loyalty ledger | `payment.loyalty_transaction` |
| Customer loyalty display copy | `customer.customer.loyalty_points` |
| Notification | `notification.notification` |

This table is a consistency bridge only. The physical ownership and cross-service reference rules are defined by `06-data`.

---

## 8. Open decisions

Only items that are genuinely not settled by the current requirements are kept here.

| Topic | Current state |
|---|---|
| Payment-before-service policy | The product backlog identifies this as a decision to resolve before release. |
| Exact promotion formulas | Must follow the final product/requirements definition. |
| Exact loyalty earning formula | Must follow the final product/requirements definition. |
| Notification delivery channels | Not defined in the domain model. |
| Cross-service implementation of domain events | Defined by architecture/API, not by this document. |

No open question remains about whether Rating should be a separate physical table: the current data model stores rating fields on `service_execution`.
