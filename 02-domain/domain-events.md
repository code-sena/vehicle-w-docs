# Domain Events

Domain events represent facts that have already happened in the business domain.

This document defines the business meaning of each event. It does not define RabbitMQ routing keys, DTO classes, database triggers or deployment details; those belong to architecture and integration documentation.

---

## 1. Event conventions

A domain event should:

- use past tense;
- describe a fact, not a command;
- identify the business object involved;
- contain enough information for an interested consumer to understand what happened;
- be safe to process more than once when it is transported asynchronously.

Examples:

```text
BookingCreated
PaymentConfirmed
ServiceCompleted
RatingSubmitted
```

Commands are different:

```text
CreateBooking
ConfirmPayment
StartService
SubmitRating
```

A command asks for an action. An event states that an action or business change has already happened.

---

## 2. Standard event information

The implementation may use a common envelope containing information such as:

| Field | Meaning |
|---|---|
| `eventId` | Unique identifier for the event occurrence. |
| `eventType` | Event name. |
| `aggregateId` | Identifier of the business object that produced the event. |
| `occurredAt` | Time when the event occurred. |
| `version` | Version of the event contract. |
| `payload` | Business information required by consumers. |

The exact serialization format and transport mechanism are architectural concerns.

---

# 3. Event catalog

## UserRegistered

**Origin:** Identity & Access

**Meaning:** A new user account was successfully created.

**Typical reactions:**

- create or update notification/welcome information if required;
- record an audit event.

---

## UserAuthenticated

**Origin:** Identity & Access

**Meaning:** A user successfully authenticated.

**Typical reactions:**

- security/audit processing.

No business service should treat a successful login as a booking or payment action.

---

## BookingCreated

**Origin:** Booking

**Meaning:** A booking was created with its customer vehicle, scheduled interval and selected service lines.

**Important information:**

- booking identifier;
- customer identifier;
- vehicle identifier;
- scheduled start/end;
- selected service identifiers;
- booking status.

**Typical reactions:**

- notify the customer;
- continue availability/confirmation workflow when applicable.

---

## BookingConfirmed

**Origin:** Booking

**Meaning:** The booking passed the required availability checks and was confirmed.

**Important information:**

- booking identifier;
- scheduled interval;
- service bay;
- customer/vehicle references;
- selected services.

**Typical reactions:**

- start the operator-assignment workflow;
- notify the customer;
- notify the selected/assigned operator when applicable.

---

## BookingModified

**Origin:** Booking

**Meaning:** An allowed change to a booking was completed.

Examples include a permitted change of:

- date/time;
- selected service information;
- other booking data allowed by the requirements.

**Typical reactions:**

- notify affected users;
- re-evaluate availability/assignment if the change affects them.

---

## BookingCancelled

**Origin:** Booking

**Meaning:** A booking was cancelled under the applicable rules.

**Important information:**

- booking identifier;
- cancellation reason;
- previous lifecycle state;
- cancelled time.

**Typical reactions:**

- release availability;
- cancel or update pending operational work;
- notify affected users.

---

## OperatorAssigned

**Origin:** Operations & Assignment

**Meaning:** An operator became responsible for a service execution.

**Assignment methods:**

- automatic;
- customer selected;
- administrator assigned.

**Important information:**

- booking/service-line reference;
- operator;
- assignment method;
- assignment time.

**Typical reactions:**

- notify the operator;
- notify the customer when required.

---

## OperatorReassigned

**Origin:** Operations & Assignment

**Meaning:** Responsibility for operational work changed from one operator to another.

The event should preserve enough information to distinguish the previous and new responsible operators.

**Important rule:**

Automatic reassignment does not change the booking itself; it changes who is responsible for the operational work.

---

## ServiceStarted

**Origin:** Operations & Assignment

**Meaning:** An assigned operator started a service execution.

**Important information:**

- service execution identifier;
- booking service identifier;
- operator;
- start time.

**Typical reactions:**

- update the booking's overall operational state when the business rules require it;
- notify the customer.

---

## ServiceCompleted

**Origin:** Operations & Assignment

**Meaning:** A service execution finished.

**Important information:**

- service execution identifier;
- booking service identifier;
- operator;
- finish time.

**Typical reactions:**

- update the booking lifecycle when all required service work is complete;
- make rating available for the completed service line;
- notify the customer.

---

## PaymentInitiated

**Origin:** Payment

**Meaning:** A payment attempt was registered for a booking.

**Important information:**

- payment identifier;
- booking identifier;
- amount;
- payment method.

For digital methods, the receipt/review workflow can continue after this event.

---

## PaymentConfirmed

**Origin:** Payment

**Meaning:** An authorized administrator approved a payment after the required verification.

**Important information:**

- payment identifier;
- booking identifier;
- approved amount;
- payment method;
- reviewer.

**Typical reactions:**

- notify the customer;
- apply loyalty effects when the final loyalty rules require them.

---

## PaymentRejected

**Origin:** Payment

**Meaning:** A payment attempt was rejected.

Possible review reasons include:

- amount mismatch;
- invalid/unreadable receipt;
- reused transaction reference;
- other defined verification failures.

**Typical reactions:**

- notify the customer;
- allow another payment attempt when the booking rules permit it.

---

## RatingSubmitted

**Origin:** Feedback & Rating / Operations & Assignment

**Meaning:** A customer submitted a rating for a completed service execution.

**Important information:**

- service execution;
- customer;
- score;
- optional comment;
- rating time.

**Important rule:**

Rating is not an operator-assignment criterion. A rating may be used for reporting, but it must not silently influence automatic assignment.

---

## PromotionApplied

**Origin:** Promotions & Loyalty

**Meaning:** An eligible promotion was applied to a booking.

**Important information:**

- promotion;
- booking;
- discount type/value;
- resulting discount amount.

This event depends on the final promotion rules.

---

## LoyaltyPointsEarned

**Origin:** Promotions & Loyalty / Payment

**Meaning:** A loyalty ledger transaction credited points to a customer.

**Important information:**

- customer;
- point amount;
- source booking/payment;
- resulting ledger balance when appropriate.

The authoritative balance remains the loyalty transaction ledger.

---

## LoyaltyPointsRedeemed

**Origin:** Promotions & Loyalty / Payment

**Meaning:** A loyalty ledger transaction deducted points used for a booking benefit.

**Important information:**

- customer;
- points redeemed;
- booking;
- monetary discount.

The booking records the monetary effect of the redemption; the ledger records the point movement.

---

## NotificationCreated

**Origin:** Notification

**Meaning:** A notification record was created for a user.

**Important information:**

- notification identifier;
- recipient;
- notification type;
- message;
- creation time.

The notification context communicates information but does not own the business state that generated the notification.

---

# 4. Main business event flows

## Booking → assignment → execution

```text
Customer
   │
   │ Create booking
   ▼
Booking
   │
   ├── BookingCreated
   │
   └── availability/confirmation
           │
           └── BookingConfirmed
                    │
                    ▼
            Operations & Assignment
                    │
                    └── OperatorAssigned
                              │
                              ▼
                       Service Execution
                              │
                         ServiceStarted
                              │
                         ServiceCompleted
                              │
                              ▼
                      Rating available
```

A booking can contain multiple service lines, so the execution/rating part of the flow is evaluated per service line.

---

## Payment flow

```text
Customer
   │
   │ Payment attempt
   ▼
Payment
   │
   └── PaymentInitiated
           │
           ▼
      Administrator review
           │
       ┌───┴─────────┐
       ▼             ▼
PaymentConfirmed  PaymentRejected
       │             │
       ▼             ▼
  Notification    Notification
```

Cash follows the same payment lifecycle conceptually, but it does not require a digital receipt.

---

## Rating flow

```text
ServiceCompleted
       │
       ▼
Customer can rate
       │
       ▼
RatingSubmitted
       │
       ├── stored with the service execution
       └── available for reporting
```

Rating does not create a separate physical rating record in the current data model.

---

## Loyalty flow

```text
Approved payment / eligible promotion
              │
              ▼
     Loyalty business rule
              │
       ┌──────┴──────┐
       ▼             ▼
Points earned   Points redeemed
       │             │
       └──────┬──────┘
              ▼
   payment.loyalty_transaction
              │
              ▼
      ledger is source of truth
```

`customer.customer.loyalty_points` is only a display copy and must not be used to authorize a redemption.

---

# 5. Event ownership and current service alignment

The current architecture groups the domain capabilities into six services.

| Event family | Domain context | Current owning service |
|---|---|---|
| User events | Identity & Access | `security-service` |
| Booking events | Booking | `booking-service` |
| Operator/execution events | Operations & Assignment | `operations-service` |
| Payment events | Payment | `payment-service` |
| Promotion/loyalty events | Promotions & Loyalty | `payment-service` |
| Notification events | Notification | `notification-service` |
| Rating event | Feedback & Rating | `operations-service` |

This mapping is included for consistency with the current architecture. The domain event itself remains a business fact, not a microservice-specific implementation object.

---

# 6. Event rules

### Events are facts

An event should describe something that happened.

Bad:

```text
AssignOperator
```

Good:

```text
OperatorAssigned
```

### Events must not redefine domain ownership

`NotificationCreated` does not mean Notification owns Booking.

`PaymentConfirmed` does not mean Payment owns Booking.

`RatingSubmitted` does not mean there must be a separate rating database/table.

### Events must not create undocumented business rules

For example:

- a rating does not automatically change operator assignment;
- payment approval does not automatically imply service completion;
- a notification does not change a booking status;
- a loyalty event does not authorize redemption unless the ledger rules allow it.

---

# 7. Event consistency and idempotency

When events are transported asynchronously, duplicate delivery can occur.

Consumers should therefore be designed so that processing the same business event more than once does not produce an incorrect duplicate effect.

For example:

```text
PaymentConfirmed
        │
        ├── first delivery → create customer notification
        │
        └── duplicate delivery → recognize the same event and avoid
                                  creating the same effect twice
```

The exact mechanism for idempotency, retries, dead-letter queues and message broker configuration belongs to `05-architecture`.

---

# 8. Event evolution

Events are contracts.

### Compatible changes

Examples:

- adding an optional field;
- adding a new event type;
- extending the payload without changing existing meaning.

### Potentially breaking changes

Examples:

- removing a required field;
- changing the type of an existing field;
- renaming an event;
- changing the meaning of an existing field.

When a breaking change is required, the architecture/API documentation must define a migration strategy instead of silently changing the existing event.

---

# 9. Traceability

| Event | Main requirement/domain area |
|---|---|
| `UserRegistered` | RF-001 |
| `UserAuthenticated` | RF-002 |
| `BookingCreated` | RF-005 to RF-006 |
| `BookingModified` / `BookingCancelled` | RF-007 |
| `BookingConfirmed` | RF-005 to RF-007 |
| `OperatorAssigned` / `OperatorReassigned` | RF-008 to RF-010 |
| `ServiceStarted` / `ServiceCompleted` | RF-011 to RF-012b |
| `RatingSubmitted` | RF-012 |
| `PaymentInitiated` | RF-013 / RF-013b |
| `PaymentConfirmed` / `PaymentRejected` | RF-014 |
| Payment history | RF-015 |
| Card/receipt rules | RF-016 |
| Notifications | RF-018 |
| Preferences | RF-019 to RF-020 |
| Promotions / loyalty | RF-024 to RF-026 |

---

# 10. What does not belong in this document

The following should not be added here just because they are part of the technical solution:

- SQL Server DDL;
- table indexes;
- foreign-key definitions;
- Liquibase changesets;
- REST endpoints;
- DTO schemas;
- Docker configuration;
- API Gateway routes;
- RabbitMQ exchange/queue names;
- JWT configuration;
- Kubernetes manifests;
- database-per-service deployment decisions.

Those details belong in the appropriate architecture, data, API or operations documentation.

The purpose of this document is to keep the **business events and their meaning** stable while implementation details evolve.
