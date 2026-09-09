# Domain Events

> Express car wash — this catalog details the 18 domain events identified in
> `domain-map.md` (section 8): what triggers each one, what it carries, who
> reacts to it, and how the platform stays resilient when a message gets
> delivered twice or a consumer is briefly down. This is the contract that
> lets `booking-service`, `operations-service`, `payment-service`, and
> `auth-service` talk to each other over RabbitMQ without calling each other
> directly.

---

## What is a domain event?

A **Domain Event** communicates that something important already happened
in the business. It's an immutable message, always in past tense.

```
✓ BookingCreated
✓ PaymentRejected
✓ OperatorAssigned

✗ CreateBooking (this is a command, not an event — it hasn't happened yet)
✗ BookingUpdated (too generic — updated how?)
✗ BookingEvent (doesn't say what occurred)
```

### Command vs. Event

| Concept | Intent | Tense | Can fail? |
|---|---|---|---|
| **Command** | An instruction to do something | Present | Yes |
| **Event** | A notification that something occurred | Past | No — it already happened |

```
Customer → [ConfirmBooking] → booking-service → [BookingConfirmed] → operations-service, notification
              (Command)                              (Event)
```

---

## Standard envelope fields

Every event published on RabbitMQ carries this envelope, regardless of
which context it comes from:

| Field | Type | Description |
|---|---|---|
| `eventId` | UUID | Unique id for this specific event instance — the idempotency key |
| `eventType` | string | Event name in PascalCase, e.g. `BookingConfirmed` |
| `aggregateId` | UUID | Id of the aggregate that produced the event |
| `aggregateType` | string | e.g. `Booking`, `Assignment`, `Payment` |
| `occurredAt` | ISO 8601 | When the business fact actually happened |
| `version` | integer | Schema version of this event type |
| `payload` | object | The event-specific data — different for every event |
| `metadata.correlationId` | UUID | Ties together every event/command in one business transaction, for tracing |
| `metadata.causationId` | UUID | Id of whatever event or command directly caused this one |
| `metadata.userId` | UUID | Who initiated the chain, when there's a human behind it |

The event catalog below only shows the `payload` field for each event —
the envelope around it is always the same shape from this table.

---

## Event catalog

### Event: BookingCreated

| Field | Value |
|---|---|
| **Name** | `BookingCreated` |
| **Bounded Context** | Booking |
| **Aggregate** | Booking |
| **Trigger** | A customer submits a new booking request (RF-005/006/007) |
| **Consumers** | Notification |
| **Channel (routing key)** | `booking.created` |
| **Schema version** | v1 |
| **Delivery guarantee** | At-least-once |

**Payload example:**

```json
{
  "eventId": "8f14e45f-ceea-4c9c-a5f3-000000000001",
  "eventType": "BookingCreated",
  "aggregateId": "b1a2c3d4-0000-0000-0000-000000000001",
  "aggregateType": "Booking",
  "occurredAt": "2026-09-10T14:03:00Z",
  "version": 1,
  "payload": {
    "bookingId": "b1a2c3d4-0000-0000-0000-000000000001",
    "customerId": "c1a2c3d4-0000-0000-0000-000000000002",
    "vehicleId": "v1a2c3d4-0000-0000-0000-000000000003",
    "serviceId": "s1a2c3d4-0000-0000-0000-000000000004",
    "branchId": "br1a2c3d-0000-0000-0000-000000000005",
    "scheduledAt": "2026-09-11T09:00:00Z",
    "priceAtBooking": { "amount": 20000, "currency": "COP" }
  }
}
```

**What do consumers do with this event?**

| Consuming service | Action | Idempotent? |
|---|---|---|
| Notification | Sends the customer an in-app confirmation that the request came through | Yes — uses `eventId` as the idempotency key |

---

### Event: BookingConfirmed

| Field | Value |
|---|---|
| **Name** | `BookingConfirmed` |
| **Bounded Context** | Booking |
| **Aggregate** | Booking |
| **Trigger** | The requested time slot passes availability validation (RF-006/RF-007) |
| **Consumers** | Operations & Assignment, Notification |
| **Channel (routing key)** | `booking.confirmed` |
| **Schema version** | v1 |
| **Delivery guarantee** | At-least-once |

**Payload example:**

```json
{
  "eventId": "8f14e45f-ceea-4c9c-a5f3-000000000002",
  "eventType": "BookingConfirmed",
  "aggregateId": "b1a2c3d4-0000-0000-0000-000000000001",
  "aggregateType": "Booking",
  "occurredAt": "2026-09-10T14:03:05Z",
  "version": 1,
  "payload": {
    "bookingId": "b1a2c3d4-0000-0000-0000-000000000001",
    "branchId": "br1a2c3d-0000-0000-0000-000000000005",
    "scheduledAt": "2026-09-11T09:00:00Z",
    "operatorPreselected": false
  }
}
```

`operatorPreselected` tells operations-service whether the customer already
picked an operator (RF-010) or whether it needs to run automatic assignment
(RF-008).

**What do consumers do with this event?**

| Consuming service | Action | Idempotent? |
|---|---|---|
| Operations & Assignment | If `operatorPreselected` is false, runs `OperatorAssigner.assignAutomatically()` and creates an `Assignment` | Yes — checks whether an `Assignment` already exists for this `bookingId` before creating one |
| Notification | Tells the customer their booking is confirmed | Yes — uses `eventId` |

---

### Event: BookingModified

| Field | Value |
|---|---|
| **Name** | `BookingModified` |
| **Bounded Context** | Booking |
| **Aggregate** | Booking |
| **Trigger** | A permitted change to a `PENDING` or `CONFIRMED` booking goes through |
| **Consumers** | Notification |
| **Channel (routing key)** | `booking.modified` |
| **Schema version** | v1 |
| **Delivery guarantee** | At-least-once |

**Payload example:**

```json
{
  "eventId": "8f14e45f-ceea-4c9c-a5f3-000000000003",
  "eventType": "BookingModified",
  "aggregateId": "b1a2c3d4-0000-0000-0000-000000000001",
  "aggregateType": "Booking",
  "occurredAt": "2026-09-10T15:10:00Z",
  "version": 1,
  "payload": {
    "bookingId": "b1a2c3d4-0000-0000-0000-000000000001",
    "changedField": "scheduledAt",
    "previousValue": "2026-09-11T09:00:00Z",
    "newValue": "2026-09-11T11:00:00Z"
  }
}
```

**What do consumers do with this event?**

| Consuming service | Action | Idempotent? |
|---|---|---|
| Notification | Tells the customer what changed | Yes — uses `eventId` |

---

### Event: BookingCancelled

| Field | Value |
|---|---|
| **Name** | `BookingCancelled` |
| **Bounded Context** | Booking |
| **Aggregate** | Booking |
| **Trigger** | A customer or admin cancels a `PENDING` or `CONFIRMED` booking |
| **Consumers** | Operations & Assignment, Notification |
| **Channel (routing key)** | `booking.cancelled` |
| **Schema version** | v1 |
| **Delivery guarantee** | At-least-once |

**Payload example:**

```json
{
  "eventId": "8f14e45f-ceea-4c9c-a5f3-000000000004",
  "eventType": "BookingCancelled",
  "aggregateId": "b1a2c3d4-0000-0000-0000-000000000001",
  "aggregateType": "Booking",
  "occurredAt": "2026-09-10T16:00:00Z",
  "version": 1,
  "payload": {
    "bookingId": "b1a2c3d4-0000-0000-0000-000000000001",
    "cancelledBy": "CUSTOMER"
  }
}
```

**What do consumers do with this event?**

| Consuming service | Action | Idempotent? |
|---|---|---|
| Operations & Assignment | Cancels the associated `Assignment` if one exists | Yes — checks the `Assignment`'s current status before cancelling |
| Notification | Tells the customer the cancellation went through | Yes — uses `eventId` |

> **Not confirmed yet:** whether a cancellation ever triggers a refund
> through Payment. Nothing in the current requirements says either way —
> flagged as an open question, same as in `entities-and-rules.md`.

---

### Event: OperatorAssigned

| Field | Value |
|---|---|
| **Name** | `OperatorAssigned` |
| **Bounded Context** | Operations & Assignment |
| **Aggregate** | Assignment |
| **Trigger** | An operator gets assigned through any of the 3 paths (RF-008/009/010) |
| **Consumers** | Notification |
| **Channel (routing key)** | `operations.operator_assigned` |
| **Schema version** | v1 |
| **Delivery guarantee** | At-least-once |

**Payload example:**

```json
{
  "eventId": "8f14e45f-ceea-4c9c-a5f3-000000000005",
  "eventType": "OperatorAssigned",
  "aggregateId": "as1a2c3d-0000-0000-0000-000000000006",
  "aggregateType": "Assignment",
  "occurredAt": "2026-09-10T14:03:06Z",
  "version": 1,
  "payload": {
    "assignmentId": "as1a2c3d-0000-0000-0000-000000000006",
    "bookingId": "b1a2c3d4-0000-0000-0000-000000000001",
    "operatorId": "op1a2c3d-0000-0000-0000-000000000007",
    "assignmentMethod": "AUTOMATIC"
  }
}
```

**What do consumers do with this event?**

| Consuming service | Action | Idempotent? |
|---|---|---|
| Notification | Tells the customer who's assigned, and tells the operator they have a new job | Yes — uses `eventId` |

---

### Event: OperatorReassigned

| Field | Value |
|---|---|
| **Name** | `OperatorReassigned` |
| **Bounded Context** | Operations & Assignment |
| **Aggregate** | Assignment |
| **Trigger** | An administrator reassigns a booking to a different operator (RF-009) |
| **Consumers** | Notification |
| **Channel (routing key)** | `operations.operator_reassigned` |
| **Schema version** | v1 |
| **Delivery guarantee** | At-least-once |

**Payload example:**

```json
{
  "eventId": "8f14e45f-ceea-4c9c-a5f3-000000000006",
  "eventType": "OperatorReassigned",
  "aggregateId": "as1a2c3d-0000-0000-0000-000000000008",
  "aggregateType": "Assignment",
  "occurredAt": "2026-09-10T17:00:00Z",
  "version": 1,
  "payload": {
    "bookingId": "b1a2c3d4-0000-0000-0000-000000000001",
    "previousAssignmentId": "as1a2c3d-0000-0000-0000-000000000006",
    "previousOperatorId": "op1a2c3d-0000-0000-0000-000000000007",
    "newAssignmentId": "as1a2c3d-0000-0000-0000-000000000008",
    "newOperatorId": "op1a2c3d-0000-0000-0000-000000000009"
  }
}
```

Carries both the old and new assignment ids, matching the design decision
in `entities-and-rules.md`: reassignment cancels the old `Assignment` and
creates a new one, it doesn't mutate the existing record.

**What do consumers do with this event?**

| Consuming service | Action | Idempotent? |
|---|---|---|
| Notification | Tells the customer and both operators (old and new) about the change | Yes — uses `eventId` |

---

### Event: ServiceStarted

| Field | Value |
|---|---|
| **Name** | `ServiceStarted` |
| **Bounded Context** | Operations & Assignment |
| **Aggregate** | Assignment |
| **Trigger** | The assigned operator marks the wash as started |
| **Consumers** | Booking, Notification |
| **Channel (routing key)** | `operations.service_started` |
| **Schema version** | v1 |
| **Delivery guarantee** | At-least-once |

**Payload example:**

```json
{
  "eventId": "8f14e45f-ceea-4c9c-a5f3-000000000007",
  "eventType": "ServiceStarted",
  "aggregateId": "as1a2c3d-0000-0000-0000-000000000006",
  "aggregateType": "Assignment",
  "occurredAt": "2026-09-11T09:02:00Z",
  "version": 1,
  "payload": {
    "assignmentId": "as1a2c3d-0000-0000-0000-000000000006",
    "bookingId": "b1a2c3d4-0000-0000-0000-000000000001",
    "operatorId": "op1a2c3d-0000-0000-0000-000000000007"
  }
}
```

**What do consumers do with this event?**

| Consuming service | Action | Idempotent? |
|---|---|---|
| Booking | Calls `Booking.start()`, moving `BookingStatus` from `CONFIRMED` to `IN_PROGRESS` | Yes — `start()` is a no-op if the booking is already `IN_PROGRESS` |
| Notification | Tells the customer the wash is underway | Yes — uses `eventId` |

---

### Event: ServiceCompleted

| Field | Value |
|---|---|
| **Name** | `ServiceCompleted` |
| **Bounded Context** | Operations & Assignment |
| **Aggregate** | Assignment |
| **Trigger** | The assigned operator marks the wash as finished |
| **Consumers** | Booking, Notification |
| **Channel (routing key)** | `operations.service_completed` |
| **Schema version** | v1 |
| **Delivery guarantee** | At-least-once |

**Payload example:**

```json
{
  "eventId": "8f14e45f-ceea-4c9c-a5f3-000000000008",
  "eventType": "ServiceCompleted",
  "aggregateId": "as1a2c3d-0000-0000-0000-000000000006",
  "aggregateType": "Assignment",
  "occurredAt": "2026-09-11T09:45:00Z",
  "version": 1,
  "payload": {
    "assignmentId": "as1a2c3d-0000-0000-0000-000000000006",
    "bookingId": "b1a2c3d4-0000-0000-0000-000000000001",
    "operatorId": "op1a2c3d-0000-0000-0000-000000000007"
  }
}
```

**What do consumers do with this event?**

| Consuming service | Action | Idempotent? |
|---|---|---|
| Booking | Calls `Booking.complete()`, moving `BookingStatus` to `COMPLETED` — this also unlocks rating for that booking (INV-007) | Yes — `complete()` is a no-op if already `COMPLETED` |
| Notification | Prompts the customer to rate the service | Yes — uses `eventId` |

---

### Event: PaymentInitiated

| Field | Value |
|---|---|
| **Name** | `PaymentInitiated` |
| **Bounded Context** | Payment |
| **Aggregate** | Payment |
| **Trigger** | A customer starts a payment attempt through Wompi |
| **Consumers** | *(none currently — internal to payment-service)* |
| **Channel (routing key)** | `payment.initiated` |
| **Schema version** | v1 |
| **Delivery guarantee** | At-least-once |

**Payload example:**

```json
{
  "eventId": "8f14e45f-ceea-4c9c-a5f3-000000000009",
  "eventType": "PaymentInitiated",
  "aggregateId": "pay1a2c3-0000-0000-0000-000000000010",
  "aggregateType": "Payment",
  "occurredAt": "2026-09-11T09:46:00Z",
  "version": 1,
  "payload": {
    "paymentId": "pay1a2c3-0000-0000-0000-000000000010",
    "bookingId": "b1a2c3d4-0000-0000-0000-000000000001",
    "amount": { "amount": 20000, "currency": "COP" },
    "method": "NEQUI"
  }
}
```

Published now so a future consumer (analytics, for example) has something
to subscribe to — right now nothing in the platform reacts to it.

---

### Event: PaymentConfirmed

| Field | Value |
|---|---|
| **Name** | `PaymentConfirmed` |
| **Bounded Context** | Payment |
| **Aggregate** | Payment |
| **Trigger** | Wompi confirms the payment succeeded |
| **Consumers** | Notification, Promotions & Loyalty *(planned)* |
| **Channel (routing key)** | `payment.confirmed` |
| **Schema version** | v1 |
| **Delivery guarantee** | At-least-once |

**Payload example:**

```json
{
  "eventId": "8f14e45f-ceea-4c9c-a5f3-000000000011",
  "eventType": "PaymentConfirmed",
  "aggregateId": "pay1a2c3-0000-0000-0000-000000000010",
  "aggregateType": "Payment",
  "occurredAt": "2026-09-11T09:46:05Z",
  "version": 1,
  "payload": {
    "paymentId": "pay1a2c3-0000-0000-0000-000000000010",
    "bookingId": "b1a2c3d4-0000-0000-0000-000000000001",
    "amount": { "amount": 20000, "currency": "COP" },
    "gatewayReference": "wompi-txn-abc123"
  }
}
```

**What do consumers do with this event?**

| Consuming service | Action | Idempotent? |
|---|---|---|
| Notification | Sends the customer a payment receipt | Yes — uses `eventId` |
| Promotions & Loyalty *(planned)* | Would credit loyalty points for this payment | Not built yet |

---

### Event: PaymentRejected

| Field | Value |
|---|---|
| **Name** | `PaymentRejected` |
| **Bounded Context** | Payment |
| **Aggregate** | Payment |
| **Trigger** | Wompi rejects or fails the payment attempt |
| **Consumers** | Notification |
| **Channel (routing key)** | `payment.rejected` |
| **Schema version** | v1 |
| **Delivery guarantee** | At-least-once |

**Payload example:**

```json
{
  "eventId": "8f14e45f-ceea-4c9c-a5f3-000000000012",
  "eventType": "PaymentRejected",
  "aggregateId": "pay1a2c3-0000-0000-0000-000000000010",
  "aggregateType": "Payment",
  "occurredAt": "2026-09-11T09:46:05Z",
  "version": 1,
  "payload": {
    "paymentId": "pay1a2c3-0000-0000-0000-000000000010",
    "bookingId": "b1a2c3d4-0000-0000-0000-000000000001",
    "reason": "INSUFFICIENT_FUNDS"
  }
}
```

**What do consumers do with this event?**

| Consuming service | Action | Idempotent? |
|---|---|---|
| Notification | Tells the customer the payment failed and to try again | Yes — uses `eventId` |

---

### Event: RatingSubmitted

| Field | Value |
|---|---|
| **Name** | `RatingSubmitted` |
| **Bounded Context** | Feedback & Rating |
| **Aggregate** | Rating |
| **Trigger** | A customer rates a `COMPLETED` booking (RF-012) |
| **Consumers** | Operations & Assignment |
| **Channel (routing key)** | `rating.submitted` |
| **Schema version** | v1 |
| **Delivery guarantee** | At-least-once |

**Payload example:**

```json
{
  "eventId": "8f14e45f-ceea-4c9c-a5f3-000000000013",
  "eventType": "RatingSubmitted",
  "aggregateId": "rt1a2c3d-0000-0000-0000-000000000014",
  "aggregateType": "Rating",
  "occurredAt": "2026-09-11T12:00:00Z",
  "version": 1,
  "payload": {
    "ratingId": "rt1a2c3d-0000-0000-0000-000000000014",
    "bookingId": "b1a2c3d4-0000-0000-0000-000000000001",
    "operatorId": "op1a2c3d-0000-0000-0000-000000000007",
    "score": 5,
    "comment": "Great service, on time."
  }
}
```

**What do consumers do with this event?**

| Consuming service | Action | Idempotent? |
|---|---|---|
| Operations & Assignment | Records the score against the operator for future reference — **not** currently used as an automatic-assignment criterion (INV-008 keeps that to availability only) | Yes — uses `eventId` |

---

### Event: NotificationCreated

| Field | Value |
|---|---|
| **Name** | `NotificationCreated` |
| **Bounded Context** | Notification |
| **Aggregate** | Notification |
| **Trigger** | Any of the events above that Notification reacts to |
| **Consumers** | *(none — this is the terminal event in every chain)* |
| **Channel (routing key)** | `notification.created` |
| **Schema version** | v1 |
| **Delivery guarantee** | At-least-once |

**Payload example:**

```json
{
  "eventId": "8f14e45f-ceea-4c9c-a5f3-000000000015",
  "eventType": "NotificationCreated",
  "aggregateId": "nt1a2c3d-0000-0000-0000-000000000016",
  "aggregateType": "Notification",
  "occurredAt": "2026-09-11T09:02:01Z",
  "version": 1,
  "payload": {
    "notificationId": "nt1a2c3d-0000-0000-0000-000000000016",
    "recipientId": "c1a2c3d4-0000-0000-0000-000000000002",
    "type": "SERVICE_STARTED",
    "message": "Your wash just started at Branch Chapinero."
  }
}
```

This one exists mostly for completeness and for future analytics — nothing
downstream currently subscribes to it, since notifying the user *is* the
end of the chain.

---

### Event: PromotionApplied *(planned)*

| Field | Value |
|---|---|
| **Name** | `PromotionApplied` |
| **Bounded Context** | Promotions & Loyalty |
| **Aggregate** | Promotion |
| **Trigger** | An eligible promotion gets applied at payment time |
| **Consumers** | Payment |
| **Channel (routing key)** | `promotion.applied` |
| **Schema version** | v1 |
| **Delivery guarantee** | At-least-once |

**Payload example (draft — not built yet):**

```json
{
  "eventType": "PromotionApplied",
  "payload": {
    "promotionId": "pr1a2c3d-0000-0000-0000-000000000017",
    "bookingId": "b1a2c3d4-0000-0000-0000-000000000001",
    "discountAmount": { "amount": 2000, "currency": "COP" }
  }
}
```

---

### Event: LoyaltyPointsEarned *(planned)*

| Field | Value |
|---|---|
| **Name** | `LoyaltyPointsEarned` |
| **Bounded Context** | Promotions & Loyalty |
| **Aggregate** | TBD — see open question in `entities-and-rules.md` about where points live |
| **Trigger** | A confirmed payment earns loyalty points |
| **Consumers** | Notification |
| **Channel (routing key)** | `loyalty.points_earned` |
| **Schema version** | v1 |
| **Delivery guarantee** | At-least-once |

**Payload example (draft — not built yet):**

```json
{
  "eventType": "LoyaltyPointsEarned",
  "payload": {
    "customerId": "c1a2c3d4-0000-0000-0000-000000000002",
    "pointsEarned": 20,
    "sourceBookingId": "b1a2c3d4-0000-0000-0000-000000000001"
  }
}
```

---

### Event: LoyaltyPointsRedeemed *(planned)*

| Field | Value |
|---|---|
| **Name** | `LoyaltyPointsRedeemed` |
| **Bounded Context** | Promotions & Loyalty |
| **Aggregate** | TBD — same open question as above |
| **Trigger** | A customer spends points on a benefit |
| **Consumers** | Payment |
| **Channel (routing key)** | `loyalty.points_redeemed` |
| **Schema version** | v1 |
| **Delivery guarantee** | At-least-once |

**Payload example (draft — not built yet):**

```json
{
  "eventType": "LoyaltyPointsRedeemed",
  "payload": {
    "customerId": "c1a2c3d4-0000-0000-0000-000000000002",
    "pointsRedeemed": 100,
    "appliedToBookingId": "b1a2c3d4-0000-0000-0000-000000000001"
  }
}
```

---

### Event: UserRegistered

| Field | Value |
|---|---|
| **Name** | `UserRegistered` |
| **Bounded Context** | Identity & Access |
| **Aggregate** | User |
| **Trigger** | A new account is created (RF-001) |
| **Consumers** | Notification |
| **Channel (routing key)** | `identity.user_registered` |
| **Schema version** | v1 |
| **Delivery guarantee** | At-least-once |

**Payload example:**

```json
{
  "eventId": "8f14e45f-ceea-4c9c-a5f3-000000000018",
  "eventType": "UserRegistered",
  "aggregateId": "c1a2c3d4-0000-0000-0000-000000000002",
  "aggregateType": "User",
  "occurredAt": "2026-09-10T13:00:00Z",
  "version": 1,
  "payload": {
    "userId": "c1a2c3d4-0000-0000-0000-000000000002",
    "name": "Juan Díaz",
    "role": "CUSTOMER"
  }
}
```

**What do consumers do with this event?**

| Consuming service | Action | Idempotent? |
|---|---|---|
| Notification | Sends a welcome message | Yes — uses `eventId` |

---

### Event: UserAuthenticated

| Field | Value |
|---|---|
| **Name** | `UserAuthenticated` |
| **Bounded Context** | Identity & Access |
| **Aggregate** | User |
| **Trigger** | A successful login |
| **Consumers** | *(none currently)* |
| **Channel (routing key)** | `identity.user_authenticated` |
| **Schema version** | v1 |
| **Delivery guarantee** | At-least-once |

**Payload example:**

```json
{
  "eventId": "8f14e45f-ceea-4c9c-a5f3-000000000019",
  "eventType": "UserAuthenticated",
  "aggregateId": "c1a2c3d4-0000-0000-0000-000000000002",
  "aggregateType": "User",
  "occurredAt": "2026-09-11T08:00:00Z",
  "version": 1,
  "payload": {
    "userId": "c1a2c3d4-0000-0000-0000-000000000002"
  }
}
```

Published mainly for audit purposes right now (`00-governance/security-policy.md`
asks for auth events to be traceable) — no other service reacts to it yet.

---

## Event flow: booking → assignment → completion

This is the main flow of the platform, tying together Booking, Operations &
Assignment, and Notification:

```
Customer
  │
  │  CreateBooking (command)
  ▼
[Aggregate: Booking] ── BookingCreated ──────────────▶ [Notification]
  │
  │  (availability check passes)
  ▼
[Aggregate: Booking] ── BookingConfirmed ─────────────▶ [Notification]
  │                                    │
  │                                    ▼
  │                          [operations-service]
  │                          OperatorAssigner runs
  │                          [Aggregate: Assignment]
  │                                    │
  │                                    ├── OperatorAssigned ─▶ [Notification]
  │                                    │
  │                       (operator marks it started)
  │                                    │
  │                          ServiceStarted ────────────────▶ [Booking: start()]
  │                                                                    │
  │                                                        BookingStatus = IN_PROGRESS
  │
  │                       (operator marks it done)
  │                                    │
  │                          ServiceCompleted ──────────────▶ [Booking: complete()]
  │                                                                    │
  │                                                        BookingStatus = COMPLETED
  │                                                                    │
  │                                                       (rating unlocked — RF-012)
  ▼
[Aggregate: Payment] ── PaymentConfirmed ─────────────▶ [Notification]
```

---

## Schema evolution strategy

Events are contracts — changing one in an incompatible way breaks whoever's
consuming it, possibly without anyone noticing until production.

### Compatible changes (safe)

```
✓ Add a new optional field to the payload
✓ Add a whole new event type
✓ Change a required field to optional
```

### Incompatible changes (breaks consumers)

```
✗ Remove a field from the payload
✗ Change a field's type (string → number)
✗ Change an optional field to required
✗ Rename the event
```

### How to evolve a schema without breaking anything

```
Step 1: Publish the new version (e.g. BookingConfirmedV2) alongside the old one
Step 2: Keep publishing both during the migration window
Step 3: Move consumers to V2 one at a time
Step 4: Announce V1 as deprecated at least one sprint ahead
Step 5: Stop publishing V1
```

---

## Event summary table

| Event | Origin context | Routing key | Consumers | Version |
|---|---|---|---|---|
| UserRegistered | Identity & Access | `identity.user_registered` | Notification | v1 |
| UserAuthenticated | Identity & Access | `identity.user_authenticated` | — | v1 |
| BookingCreated | Booking | `booking.created` | Notification | v1 |
| BookingConfirmed | Booking | `booking.confirmed` | Operations & Assignment, Notification | v1 |
| BookingModified | Booking | `booking.modified` | Notification | v1 |
| BookingCancelled | Booking | `booking.cancelled` | Operations & Assignment, Notification | v1 |
| OperatorAssigned | Operations & Assignment | `operations.operator_assigned` | Notification | v1 |
| OperatorReassigned | Operations & Assignment | `operations.operator_reassigned` | Notification | v1 |
| ServiceStarted | Operations & Assignment | `operations.service_started` | Booking, Notification | v1 |
| ServiceCompleted | Operations & Assignment | `operations.service_completed` | Booking, Notification | v1 |
| PaymentInitiated | Payment | `payment.initiated` | — | v1 |
| PaymentConfirmed | Payment | `payment.confirmed` | Notification, Promotions & Loyalty (planned) | v1 |
| PaymentRejected | Payment | `payment.rejected` | Notification | v1 |
| RatingSubmitted | Feedback & Rating | `rating.submitted` | Operations & Assignment | v1 |
| NotificationCreated | Notification | `notification.created` | — | v1 |
| PromotionApplied | Promotions & Loyalty | `promotion.applied` | Payment | v1 (planned) |
| LoyaltyPointsEarned | Promotions & Loyalty | `loyalty.points_earned` | Notification | v1 (planned) |
| LoyaltyPointsRedeemed | Promotions & Loyalty | `loyalty.points_redeemed` | Payment | v1 (planned) |

---

## Policies — reactions to events

A **Policy** describes what happens automatically when an event shows up —
"whenever X occurs, do Y."

| Trigger event | Policy | Emitted command | Service |
|---|---|---|---|
| `BookingConfirmed` | Whenever it arrives with `operatorPreselected: false`, run automatic assignment | `AssignOperatorAutomatically` | operations-service |
| `BookingCancelled` | Whenever it arrives and an `Assignment` exists for that booking, cancel it | `CancelAssignment` | operations-service |
| `ServiceStarted` | Whenever it arrives, move the booking forward | `StartBooking` | booking-service |
| `ServiceCompleted` | Whenever it arrives, close out the booking and unlock rating | `CompleteBooking` | booking-service |
| `PaymentConfirmed` | Whenever it arrives *(once Promotions & Loyalty exists)*, credit loyalty points | `CreditLoyaltyPoints` | promotions-service *(planned)* |

---

## Resilience patterns

### At-least-once delivery + idempotency

RabbitMQ guarantees an event is delivered **at least once**, but a retry
after a dropped acknowledgment can deliver the same message twice.
Consumers have to be idempotent — processing the same `eventId` twice must
never double-apply the effect.

```java
// Idempotent consumer — checks eventId before doing anything
public void onBookingConfirmed(BookingConfirmedEvent event) {
    if (processedEventRepository.exists(event.getEventId())) {
        log.info("Event {} already processed, skipping", event.getEventId());
        return;
    }

    operatorAssigner.assignAutomatically(event.getBranchId());

    // marked in the same transaction as the actual work, so a crash
    // between the two never leaves the event "half processed"
    processedEventRepository.markProcessed(event.getEventId());
}
```

### Dead Letter Exchange (DLQ)

When an event fails processing after a few retries, RabbitMQ routes it to a
dead letter exchange instead of losing it silently.

| Setting | Recommended value |
|---|---|
| Retries before DLQ | 3–5 |
| Backoff | Exponential (1s → 2s → 4s → 8s) |
| DLQ retention | 7 days |
| Alert | Fires when the DLQ has more than 0 messages |

> The runbook for handling messages stuck in the DLQ belongs in each
> service's own `09-microservices/services/<service>/runbook.md`, not here.