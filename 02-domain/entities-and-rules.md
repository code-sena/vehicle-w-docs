# Entities, Value Objects, and Business Rules

> Express car wash — this document translates the domain knowledge from
> `domain-map.md` into the concrete building blocks of the DDD tactical
> model: entities, value objects, aggregates, and the business rules that
> hold them together.

> **Stack note:** the code examples below are written in plain Java, with no
> Spring or JPA annotations. That's on purpose — under the hexagonal
> architecture this project follows (`05-architecture/hexagonal-architecture.md`),
> the domain layer can't depend on a framework. Persistence mapping (JPA
> entities, repositories) lives in the infrastructure layer and is covered in
> `06-data`, not here.

---

## Tactical DDD concepts

### Entity

An **Entity** is an object defined by its identity, not its attributes. Two
entities are equal if they have the same id, even if everything else about
them differs.

```
✓ Entity: Booking — two bookings made at the exact same time, for the
  same branch and service, are still two different bookings, distinguished
  by their id.
✓ Entity: User — changes email, password, even role over time, but stays
  the same user.
✗ Not an entity: Money — $20,000 COP is $20,000 COP, it doesn't matter
  which "instance" of it you're holding.
```

### Value Object (VO)

A **Value Object** is defined by its attributes; it has no identity of its
own, and it's immutable — if something changes, it's a new VO, not the same
one mutated.

```
✓ Value Object: Money (20000, COP)
✓ Value Object: TimeSlot (2026-09-10, 14:00)
```

### Aggregate

An **Aggregate** is a cluster of entities and VOs treated as a single unit,
with an **Aggregate Root** as the only entry point — nothing outside the
aggregate touches an internal object directly, it goes through the root.

```
Booking (Aggregate Root)
  ├── scheduledAt: TimeSlot (Value Object)
  └── priceAtBooking: Money (Value Object)
```

**Golden rule:** a transaction never crosses aggregate boundaries. If an
operation needs to change two aggregates at once (say, a `Booking` and an
`Assignment`), it happens through a domain event, not a shared transaction —
see `domain-events.md`.

### Business Rules

**Business Rules** (invariants) are constraints the domain must always
satisfy. They live in the Aggregate Root and get checked on every operation
that could break them — never left to whoever happens to call the code
correctly.

---

## System entities

### Entity: User

**Context:** Identity & Access

**Description:** Anyone with an account on the platform — customer,
operator, or administrator.

**Attributes:**

| Attribute | Type | Description | Required | Rules |
|---|---|---|---|---|
| id | UUID | Identity | Yes | Auto-generated |
| name | String | | Yes | |
| email | String | | Yes | Unique across the platform |
| passwordHash | String | | Yes | Never the raw password — INV-013 |
| role | Role (enum) | `CUSTOMER`, `OPERATOR`, `ADMINISTRATOR` | Yes | Set once at registration, immutable afterward |
| failedLoginAttempts | int | | Yes | Resets on successful login |
| lockedUntil | DateTime | | No | Null unless temporarily locked (RF-004b) |
| createdAt | DateTime | | Yes | Immutable |

**Invariants:**

```
INV-013: Passwords are never stored in plain text
  - Rule: only passwordHash exists on this entity
  - Violation: a raw password field would be a data breach waiting to happen
  - Implementation: enforced by never adding such a field, checked in code review
```

**Code example:**

```java
public final class User {

    private final UserId id;
    private String name;
    private final Email email;
    private String passwordHash;
    private final Role role;
    private int failedLoginAttempts;
    private LocalDateTime lockedUntil;

    private User(UserId id, String name, Email email, String passwordHash, Role role) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.failedLoginAttempts = 0;
    }

    public static User register(String name, Email email, String passwordHash, Role role) {
        return new User(UserId.newId(), name, email, passwordHash, role);
    }

    public void registerFailedLogin() {
        this.failedLoginAttempts++;
        if (this.failedLoginAttempts >= 5) {
            this.lockedUntil = LocalDateTime.now().plusMinutes(15);
        }
    }

    public boolean isLocked() {
        return lockedUntil != null && LocalDateTime.now().isBefore(lockedUntil);
    }
}
```

---

### Entity: Booking

**Context:** Booking

**Description:** A scheduled wash — one vehicle, one service, one branch,
one time slot. The central transaction of the whole platform.

**Attributes:**

| Attribute | Type | Description | Required | Rules |
|---|---|---|---|---|
| id | UUID | Identity | Yes | Auto-generated |
| customerId | UUID | References a `User` | Yes | |
| vehicleId | UUID | References a `Vehicle` | Yes | Must belong to `customerId` — INV-002 |
| serviceId | UUID | References a `Service` | Yes | One service per booking — confirmed with the team, 2026-09-08 |
| branchId | UUID | References a `Branch` | Yes | |
| scheduledAt | TimeSlot | Value Object | Yes | |
| status | BookingStatus | | Yes | See lifecycle below |
| priceAtBooking | Money | Value Object | Yes | Frozen at creation — INV-006 |
| createdAt / updatedAt | DateTime | | Yes | |

**Lifecycle / States:**

```
PENDING ──(confirm)──▶ CONFIRMED ──(operator starts)──▶ IN_PROGRESS ──(operator finishes)──▶ COMPLETED
   │                        │
   └────────(cancel)────────┴──────────────────────────────────────────▶ CANCELLED
```

| State | Description | Allowed transitions |
|---|---|---|
| PENDING | Just created, slot not validated yet | → CONFIRMED, → CANCELLED |
| CONFIRMED | Slot validated, waiting for the wash to start | → IN_PROGRESS, → CANCELLED |
| IN_PROGRESS | Operator is doing the wash | → COMPLETED |
| COMPLETED | Wash finished | Terminal state |
| CANCELLED | Called off before completion | Terminal state |

**Invariants:**

```
INV-001: A booking always has all five core references
  - Rule: customerId, vehicleId, serviceId, branchId and scheduledAt must
    all be present
  - Violation: a booking missing any of these was never actually created
  - Implementation: validated in the static factory method, not in a setter

INV-002: A booking's vehicle must belong to its customer
  - Rule: vehicleId must reference a Vehicle whose ownerId == customerId
  - Violation: a customer could book using someone else's registered vehicle
  - Implementation: checked in booking-service before Booking.create() is called,
    since it needs to look up the Vehicle in another aggregate

INV-003: No two confirmed bookings share the same branch + time slot
  - Rule: this is what "availability" means in RF-006/RF-007
  - Violation: two customers get double-booked for the same operator at the
    same time
  - Implementation: AvailabilityChecker domain service, checked before confirm()

INV-004: A booking only moves forward through valid BookingStatus transitions
  - Rule: see the lifecycle table above — no skipping states, no going backward
  - Violation: a booking marked COMPLETED without ever being IN_PROGRESS
  - Implementation: guarded inside each state-changing method (confirm(),
    start(), complete(), cancel())

INV-005: A COMPLETED or CANCELLED booking is immutable
  - Rule: no further changes once a booking reaches either terminal state
  - Violation: editing a booking after the customer already paid and rated it
  - Implementation: every mutating method checks the current status first

INV-006: priceAtBooking is frozen at creation time
  - Rule: changing a Service's price later never affects a booking already made
  - Violation: a customer gets charged a different price than what they agreed to
  - Implementation: priceAtBooking is read once, in Booking.create(), and
    never recalculated from Service.price afterward
```

**Code example:**

```java
public final class Booking {

    private final BookingId id;
    private final CustomerId customerId;
    private final VehicleId vehicleId;
    private final ServiceId serviceId;
    private final BranchId branchId;
    private final TimeSlot scheduledAt;
    private final Money priceAtBooking;
    private BookingStatus status;

    private Booking(BookingId id, CustomerId customerId, VehicleId vehicleId,
                     ServiceId serviceId, BranchId branchId, TimeSlot scheduledAt,
                     Money priceAtBooking) {
        this.id = id;
        this.customerId = customerId;
        this.vehicleId = vehicleId;
        this.serviceId = serviceId;
        this.branchId = branchId;
        this.scheduledAt = scheduledAt;
        this.priceAtBooking = priceAtBooking;
        this.status = BookingStatus.PENDING;
    }

    public static Booking create(CustomerId customerId, VehicleId vehicleId,
                                  ServiceId serviceId, BranchId branchId,
                                  TimeSlot scheduledAt, Money priceAtBooking) {
        if (customerId == null || vehicleId == null || serviceId == null
                || branchId == null || scheduledAt == null) {
            throw new DomainException("INV-001: a booking needs customer, vehicle, service, branch and time slot");
        }
        return new Booking(BookingId.newId(), customerId, vehicleId, serviceId,
                branchId, scheduledAt, priceAtBooking);
    }

    public void confirm() {
        if (this.status != BookingStatus.PENDING) {
            throw new DomainException("INV-004: only a PENDING booking can be confirmed");
        }
        this.status = BookingStatus.CONFIRMED;
    }

    public void start() {
        if (this.status != BookingStatus.CONFIRMED) {
            throw new DomainException("INV-004: only a CONFIRMED booking can start");
        }
        this.status = BookingStatus.IN_PROGRESS;
    }

    public void complete() {
        if (this.status != BookingStatus.IN_PROGRESS) {
            throw new DomainException("INV-004: only an IN_PROGRESS booking can be completed");
        }
        this.status = BookingStatus.COMPLETED;
    }

    public void cancel() {
        if (this.status == BookingStatus.COMPLETED || this.status == BookingStatus.CANCELLED) {
            throw new DomainException("INV-005: a COMPLETED or CANCELLED booking can't change");
        }
        this.status = BookingStatus.CANCELLED;
    }
}
```

---

### Entity: Vehicle

**Context:** Vehicle Management

| Attribute | Type | Description | Required | Rules |
|---|---|---|---|---|
| id | UUID | Identity | Yes | |
| ownerId | UUID | References the `User` who registered it | Yes | |
| plate | String | | Yes | |
| brand / model | String | | Yes | |
| type | VehicleType (enum) | Car, motorcycle, truck, etc. | Yes | |
| active | boolean | | Yes | Deactivating keeps booking history intact |

---

### Entity: Service (WashService)

**Context:** Service Catalog

| Attribute | Type | Description | Required | Rules |
|---|---|---|---|---|
| id | UUID | Identity | Yes | |
| name | String | e.g. "Basic Wash" | Yes | |
| description | String | | No | |
| price | Money | Value Object | Yes | Can change without affecting past bookings — INV-006 |
| durationMinutes | int | | Yes | |
| active | boolean | | Yes | |

This is modeled as a real entity with its own table, not an enum, on
purpose — the catalog has 5 services today and needs to grow past that
without a code change.

---

### Entity: Operator

**Context:** Operations & Assignment

| Attribute | Type | Description | Required | Rules |
|---|---|---|---|---|
| id | UUID | Identity | Yes | |
| userId | UUID | References the underlying `User` (role `OPERATOR`) | Yes | |
| branchId | UUID | The branch this operator works at | Yes | |
| available | boolean | | Yes | |

---

### Entity: Assignment

**Context:** Operations & Assignment

**Description:** Links a `Booking` to the `Operator` doing it. Tracked
separately from the booking so an operator can update their own progress
without touching the Booking aggregate.

| Attribute | Type | Description | Required | Rules |
|---|---|---|---|---|
| id | UUID | Identity | Yes | |
| bookingId | UUID | References the `Booking` | Yes | |
| operatorId | UUID | References the `Operator` | Yes | |
| status | AssignmentStatus | | Yes | See lifecycle below |
| assignmentMethod | AssignmentMethod (enum) | `AUTOMATIC`, `CUSTOMER_SELECTED`, `ADMIN_ASSIGNED` | Yes | Tracks which of RF-008/009/010 created it |
| assignedAt / startedAt / completedAt | DateTime | | No | Set as the assignment progresses |

**Lifecycle / States:**

```
PENDING ──(operator starts)──▶ IN_PROGRESS ──(operator finishes)──▶ COMPLETED
   │
   └──(reassigned)──▶ CANCELLED
```

| State | Description | Allowed transitions |
|---|---|---|
| PENDING | Operator assigned, hasn't started | → IN_PROGRESS, → CANCELLED |
| IN_PROGRESS | Operator working on it | → COMPLETED |
| COMPLETED | Done | Terminal state |
| CANCELLED | Replaced through reassignment | Terminal state |

**Invariants:**

```
INV-008: Automatic assignment only considers operators available at the
requested branch
  - Rule: RF-008 confirms availability-at-branch as the only automatic
    criterion. Proximity, workload, specialization and rating are NOT
    applied unless a future requirement defines them.
  - Violation: assigning based on undocumented criteria the team never agreed on
  - Implementation: OperatorAssigner domain service

INV-009: An operator can only update assignments they hold
  - Rule: operatorId on the Assignment must match the authenticated operator
    calling start()/complete()
  - Violation: one operator marking another operator's job as done
  - Implementation: checked in operations-service before calling the entity method
```

**Design decision — reassignment creates a new Assignment.** Confirmed with
the team (2026-09-08): when an administrator reassigns a booking, the
current `Assignment` is cancelled and a brand-new one is created for the new
operator, instead of overwriting `operatorId` in place. This keeps a full
history of who was assigned and when.

**Code example:**

```java
public final class Assignment {

    private final AssignmentId id;
    private final BookingId bookingId;
    private final OperatorId operatorId;
    private final AssignmentMethod method;
    private AssignmentStatus status;

    private Assignment(AssignmentId id, BookingId bookingId, OperatorId operatorId,
                        AssignmentMethod method) {
        this.id = id;
        this.bookingId = bookingId;
        this.operatorId = operatorId;
        this.method = method;
        this.status = AssignmentStatus.PENDING;
    }

    public static Assignment create(BookingId bookingId, OperatorId operatorId,
                                     AssignmentMethod method) {
        return new Assignment(AssignmentId.newId(), bookingId, operatorId, method);
    }

    public void start(OperatorId requestingOperator) {
        if (!this.operatorId.equals(requestingOperator)) {
            throw new DomainException("INV-009: only the assigned operator can start this job");
        }
        if (this.status != AssignmentStatus.PENDING) {
            throw new DomainException("Only a PENDING assignment can start");
        }
        this.status = AssignmentStatus.IN_PROGRESS;
    }

    public void complete(OperatorId requestingOperator) {
        if (!this.operatorId.equals(requestingOperator)) {
            throw new DomainException("INV-009: only the assigned operator can complete this job");
        }
        if (this.status != AssignmentStatus.IN_PROGRESS) {
            throw new DomainException("Only an IN_PROGRESS assignment can be completed");
        }
        this.status = AssignmentStatus.COMPLETED;
    }

    // Reassignment cancels this one; a new Assignment gets created separately
    // by OperatorAssigner instead of mutating operatorId here.
    public void cancelForReassignment() {
        if (this.status != AssignmentStatus.PENDING) {
            throw new DomainException("Can't reassign a job that's already in progress or done");
        }
        this.status = AssignmentStatus.CANCELLED;
    }
}
```

---

### Entity: Branch

**Context:** Branch Management

| Attribute | Type | Description | Required | Rules |
|---|---|---|---|---|
| id | UUID | Identity | Yes | |
| name | String | | Yes | |
| address | String | | Yes | |
| city | String | | Yes | |
| active | boolean | | Yes | An inactive branch can't take new bookings |

---

### Entity: Payment

**Context:** Payment

| Attribute | Type | Description | Required | Rules |
|---|---|---|---|---|
| id | UUID | Identity | Yes | |
| bookingId | UUID | References the `Booking` | Yes | Exactly one per payment — INV-010 |
| amount | Money | Value Object | Yes | |
| method | PaymentMethod (enum) | `CARD`, `PSE`, `NEQUI` | Yes | |
| status | PaymentStatus | `PENDING`, `CONFIRMED`, `REJECTED` | Yes | |
| gatewayReference | String | Wompi's transaction reference | Yes, once confirmed | |
| createdAt | DateTime | | Yes | |

**Invariants:**

```
INV-010: A payment always belongs to exactly one booking
  - Rule: bookingId is required and immutable
  - Violation: an orphaned payment with no booking to reconcile against
  - Implementation: constructor requires bookingId, no setter exists to change it

INV-012: Raw payment card data is never stored anywhere in this system
  - Rule: no field on Payment (or anywhere else) may hold a card number, CVV
    or expiration date
  - Violation: a data breach and a direct violation of RF-016
  - Implementation: enforced by never defining such a field — Wompi is the
    only party that ever touches that information
```

---

### Entity: Rating

**Context:** Feedback & Rating

| Attribute | Type | Description | Required | Rules |
|---|---|---|---|---|
| id | UUID | Identity | Yes | |
| bookingId | UUID | The completed `Booking` being rated | Yes | At most one per booking — INV-007 |
| customerId | UUID | | Yes | |
| score | int | 1 to 5 | Yes | |
| comment | String | | No | |
| createdAt | DateTime | | Yes | |

**Invariants:**

```
INV-007: At most one rating per booking, only after it's COMPLETED
  - Rule: a Rating can only be created for a Booking whose status is COMPLETED,
    and only once
  - Violation: rating a wash that hasn't happened, or rating the same one twice
  - Implementation: checked before Rating.create() is called — needs to read
    the Booking's status, so it's validated in the calling service, not inside
    Rating itself
```

---

### Entity: Notification

**Context:** Notification

| Attribute | Type | Description | Required | Rules |
|---|---|---|---|---|
| id | UUID | Identity | Yes | |
| recipientId | UUID | The `User` this is for | Yes | |
| message | String | | Yes | |
| type | NotificationType (enum) | | Yes | |
| read | boolean | | Yes | Defaults to false |
| createdAt | DateTime | | Yes | |

---

### Entity: Promotion *(planned — see open questions)*

**Context:** Promotions & Loyalty

| Attribute | Type | Description | Required | Rules |
|---|---|---|---|---|
| id | UUID | Identity | Yes | |
| name | String | | Yes | |
| discountType | DiscountType (enum) | Percentage or fixed amount | Yes | |
| discountValue | BigDecimal | | Yes | |
| validFrom / validTo | Date | | Yes | |
| active | boolean | | Yes | |

**Invariant:**

```
INV-011: A promotion can only apply while active and within its validity window
  - Rule: validFrom <= today <= validTo, and active == true
  - Violation: an expired promotion still granting a discount
  - Implementation: not built yet — applies once Promotions & Loyalty ships
```

Loyalty points aren't modeled here in detail — whether they live as a
balance on `User` or as their own `LoyaltyAccount` with a transaction log is
still an open question (see the end of this document).

---

## System Value Objects

### Value Object: Money

**Description:** An amount plus a currency (COP). Two `Money` instances with
the same amount and currency are the same value.

| Attribute | Type | Description |
|---|---|---|
| amount | BigDecimal | |
| currency | String | Always "COP" for now |

**Validation rules:**

```
- amount must be >= 0
- currency must be a supported ISO code (only COP today)
```

**Example:**

```java
public final class Money {

    private final BigDecimal amount;
    private final String currency;

    public Money(BigDecimal amount, String currency) {
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            throw new DomainException("Money can't be negative");
        }
        this.amount = amount;
        this.currency = currency;
    }

    @Override
    public boolean equals(Object o) {
        if (!(o instanceof Money)) return false;
        Money other = (Money) o;
        return amount.compareTo(other.amount) == 0 && currency.equals(other.currency);
    }

    @Override
    public int hashCode() {
        return Objects.hash(amount.stripTrailingZeros(), currency);
    }
}
```

### Value Object: TimeSlot

**Description:** The date and time reserved for a wash. Used to check
availability at a branch.

| Attribute | Type | Description |
|---|---|---|
| date | LocalDate | |
| time | LocalTime | |

**Example:**

```java
public final class TimeSlot {

    private final LocalDate date;
    private final LocalTime time;

    public TimeSlot(LocalDate date, LocalTime time) {
        if (date == null || time == null) {
            throw new DomainException("A time slot needs both a date and a time");
        }
        this.date = date;
        this.time = time;
    }

    public boolean overlaps(TimeSlot other) {
        return this.date.equals(other.date) && this.time.equals(other.time);
    }
}
```

---

## System Aggregates

### Aggregate: Booking

**Aggregate Root:** `Booking`

**Internal entities:** none — this is a single-entity aggregate.

**Value Objects:** `TimeSlot` (scheduledAt), `Money` (priceAtBooking)

**Aggregate invariants:**

```
AGGR-INV-001: priceAtBooking never gets recalculated from the current
Service price after creation — it's part of the aggregate's own state,
not a live reference to Service Catalog.

AGGR-INV-002: scheduledAt (TimeSlot) can only change while status is
PENDING or CONFIRMED — once IN_PROGRESS, the time slot is locked in.
```

**Why this is an aggregate:** `Booking`, its `scheduledAt`, and its
`priceAtBooking` have to be consistent with each other at every point in
the lifecycle — you can't have a booking whose price silently drifts from
what the customer agreed to, or whose time slot changes after the wash has
already started. Keeping them in one aggregate means a single save either
keeps all of that consistent, or none of it happens.

---

### Aggregate: Assignment

**Aggregate Root:** `Assignment`

**Internal entities:** none.

**Value Objects:** none — `assignedAt`/`startedAt`/`completedAt` are plain
timestamps, not modeled as their own VO.

**Aggregate invariants:**

```
AGGR-INV-003: status and the timestamp fields must stay in sync —
startedAt is only ever set when the assignment moves to IN_PROGRESS,
completedAt only when it moves to COMPLETED. There's no scenario where
completedAt is set but status isn't COMPLETED.
```

**Why this is an aggregate:** the whole point of `Assignment` is tracking
one operator's progress on one booking as a single, small, consistent unit
— separate from `Booking` itself so that an operator marking their own
progress never needs to touch the booking aggregate at all (see the
relationship rules in `domain-map.md`, section 3).

---

## Summary table of tactical building blocks

| Name | Type | Bounded Context | Aggregate Root? |
|---|---|---|---|
| User | Entity | Identity & Access | Yes |
| Booking | Entity | Booking | Yes |
| Vehicle | Entity | Vehicle Management | Yes |
| Service | Entity | Service Catalog | Yes |
| Operator | Entity | Operations & Assignment | Yes |
| Assignment | Entity | Operations & Assignment | Yes |
| Branch | Entity | Branch Management | Yes |
| Payment | Entity | Payment | Yes |
| Rating | Entity | Feedback & Rating | Yes |
| Notification | Entity | Notification | Yes |
| Promotion | Entity (planned) | Promotions & Loyalty | Yes |
| Money | Value Object | Shared (Booking, Service, Payment) | N/A |
| TimeSlot | Value Object | Booking | N/A |
| AvailabilityChecker | Domain Service | Booking | N/A |
| OperatorAssigner | Domain Service | Operations & Assignment | N/A |

---

## Domain Services

A **Domain Service** is business logic that doesn't naturally belong to any
single entity — usually because it needs to look across several instances
of an entity, or several aggregates, to make a decision.

### AvailabilityChecker

**Context:** Booking

Decides whether a requested `TimeSlot` at a given branch can be booked. It
has to look at every existing `Booking` for that branch, which is more than
any single `Booking` instance could decide about itself.

```java
public class AvailabilityChecker {

    public boolean isAvailable(BranchId branchId, TimeSlot requested, List<Booking> existingBookings) {
        return existingBookings.stream()
                .filter(b -> b.getBranchId().equals(branchId))
                .filter(b -> b.getStatus() != BookingStatus.CANCELLED)
                .noneMatch(b -> b.getScheduledAt().overlaps(requested));
    }
}
```

### OperatorAssigner

**Context:** Operations & Assignment

Implements the three assignment paths from RF-008/009/010. Automatic
assignment needs to look across every operator at a branch — again, more
than a single `Operator` or `Assignment` can decide alone.

```java
public class OperatorAssigner {

    // RF-008: automatic assignment by availability at the branch
    public Optional<OperatorId> assignAutomatically(List<Operator> operatorsAtBranch) {
        return operatorsAtBranch.stream()
                .filter(Operator::isAvailable)
                .findFirst()
                .map(Operator::getId);
    }

    // RF-010: the customer picks directly from who's available
    public Assignment assignChosenByCustomer(BookingId bookingId, OperatorId chosenOperator) {
        return Assignment.create(bookingId, chosenOperator, AssignmentMethod.CUSTOMER_SELECTED);
    }

    // RF-009: an administrator assigns or reassigns
    public Assignment assignByAdmin(BookingId bookingId, OperatorId chosenOperator) {
        return Assignment.create(bookingId, chosenOperator, AssignmentMethod.ADMIN_ASSIGNED);
    }
}
```

---

## Correlation with code

| Domain artifact | Package / folder in code | File |
|---|---|---|
| Aggregate Root `Booking` | `src/domain/booking/` | `Booking.java` |
| Aggregate Root `Assignment` | `src/domain/operations/` | `Assignment.java` |
| Value Object `Money` | `src/domain/shared/valueobjects/` | `Money.java` |
| Value Object `TimeSlot` | `src/domain/booking/valueobjects/` | `TimeSlot.java` |
| Domain Service `AvailabilityChecker` | `src/domain/booking/services/` | `AvailabilityChecker.java` |
| Domain Service `OperatorAssigner` | `src/domain/operations/services/` | `OperatorAssigner.java` |
| Repository port `BookingRepository` | `src/domain/booking/ports/` | `BookingRepository.java` |

> See the full hexagonal folder structure in `05-architecture/hexagonal-architecture.md`.

---

## Open questions

These came up while writing this document and don't have a confirmed answer
yet.

| # | Question |
|---|---|
| 1 | Does payment have to be confirmed *before* the wash starts, or can the operator start work while payment is still pending? |
| 2 | Where does `Rating` actually live as a service — inside booking-service, or its own module? Affects where INV-007 gets enforced. |
| 3 | Loyalty points: a balance on `User`, or a separate `LoyaltyAccount` with its own transaction history? |