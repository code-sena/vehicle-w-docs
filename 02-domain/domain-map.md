# Domain Map — Bounded Contexts

> Express car wash — vehicle washing management platform.
>
> This document maps the domain: the Bounded Contexts, what each one is
> responsible for, and how they relate to each other. It doesn't fix database
> tables, frameworks, or API endpoints on purpose — that lives in `06-data`,
> `05-architecture`, and `07-api`. Mixing those in here would make this doc go
> stale every time an implementation detail changes, and the whole point is
> that it shouldn't.

---

## 1. Domain overview

Express car wash manages on-demand vehicle washing at a single shop
location. A customer registers, adds their vehicle(s), and books a wash for
a date and time. The customer drives the vehicle to the shop — this isn't a
mobile or at-home service, the business model requires the visit.

The **booking** is the center of everything else in this document. Once a
customer picks a vehicle, a service, and a time slot, the system checks
that the slot is actually available and confirms it. From there, an
operator needs to be assigned to carry out the wash — either automatically
based on who's free, chosen directly by the customer from the operators
available, or assigned/reassigned by an administrator if something
needs to change. The customer pays by scanning the shop's QR code for
their chosen method and uploading a payment receipt, which an
administrator reviews and approves or rejects; once the wash is done the
customer can rate it and leave a comment.

Operator availability, the service catalog (what washes exist and what
they cost), promotions/loyalty points, and things like language and theme
preferences all exist to support that one core flow.

### Main actors

| Actor | Domain responsibility |
|---|---|
| **Customer** | Registers, manages vehicles, creates and manages bookings, optionally picks an operator, pays, gets notified, rates completed services. |
| **Operator** | Keeps their availability up to date and works the services assigned to them, updating status as they go. |
| **Administrator** | Manages operator availability, assignments/reassignments, promotions, payment review, and pulls operational reports. |

---

## 2. Identified Bounded Contexts

These contexts come straight from the current functional requirements — each
one covers a part of the system where the vocabulary and responsibilities
are different enough from the rest that it deserves its own boundary.

### Bounded Context: Identity & Access

| Field | Value |
|---|---|
| **Name** | IdentityAccess |
| **Responsibility** | Registration, login, password recovery/change, and role-based access. |
| **Type** | Generic |

Nothing here is specific to washing cars — it's the same authentication
problem any platform has. That's exactly why it's classified as Generic
instead of Core.

**Context-specific terms (Ubiquitous Language):**

| Term | Meaning in this context |
|---|---|
| **User** | Anyone with an account on the platform. |
| **Role** | Customer, Operator, or Administrator — nothing else. |
| **Authentication** | Confirming a user is who they say they are before letting them in. |
| **Password reset token** | A single-use, time-limited token issued to recover a forgotten password. |

**Requirements covered:** RF-001, RF-002, RF-003, RF-004, RF-004b.

---

### Bounded Context: Booking

| Field | Value |
|---|---|
| **Name** | Booking |
| **Responsibility** | Owns a booking from creation through availability checks, changes, cancellation, and completion. |
| **Type** | **Core** |

This is the reason the platform exists. Everything else in this map either
feeds into a booking or reacts to one.

**Context-specific terms (Ubiquitous Language):**

| Term | Meaning in this context |
|---|---|
| **Booking / Reserva** | A scheduled wash: one vehicle, one service, one date/time. |
| **Booking status** | Where the booking is in its lifecycle — see section 5. |
| **Time slot** | The date and time reserved. |
| **Wash bay** | The physical bay assigned to a booking once confirmed; two bookings can share a time slot as long as they're in different bays. |
| **Availability** | Whether that slot can actually be booked given the current rules. |
| **Cancellation** | Backing out of a booking before the service starts, when the rules allow it. |

**Requirements covered:** RF-005, RF-006, RF-007, RF-012b.

---

### Bounded Context: Vehicle Management

| Field | Value |
|---|---|
| **Name** | VehicleManagement |
| **Responsibility** | Keeps each customer's registered vehicles so one can be picked when booking. |
| **Type** | Supporting |

A vehicle belongs to a customer and matters *for* a booking, but it isn't
the booking itself — a customer can register a vehicle without ever booking
anything with it.

**Context-specific terms (Ubiquitous Language):**

| Term | Meaning in this context |
|---|---|
| **Vehicle** | A vehicle a customer registered, available to pick when booking. |
| **Vehicle owner** | The customer the vehicle belongs to. |

> The current requirements just say customers register and use vehicles when
> booking. The exact fields (plate, brand, type, etc.) get defined in the data
> model, not here.

**Requirements covered:** RF-005.

---

### Bounded Context: Service Catalog

| Field | Value |
|---|---|
| **Name** | ServiceCatalog |
| **Responsibility** | The list of wash services the business offers, with their price and duration. |
| **Type** | Supporting |

Don't confuse a *service* with a *booking*. The service is what's on the
menu (Basic Wash, Premium Wash, and whatever else gets added later); the
booking is a specific customer picking one at a specific time. The catalog
needs to grow past what exists today without anyone having to touch the
domain model to do it — so a wash type is its own entity with its own id,
never a hardcoded list.

**Context-specific terms (Ubiquitous Language):**

| Term | Meaning in this context |
|---|---|
| **Wash service** | A type of wash the business offers. |
| **Duration** | How long the service is expected to take. |
| **Price** | What the service currently costs. |

**Requirements covered:** RF-005 and the service-selection part of booking.

---

### Bounded Context: Operations & Assignment

| Field | Value |
|---|---|
| **Name** | OperationsAssignment |
| **Responsibility** | Operator availability, assigning operators to bookings, tracking the service as it's carried out, and admin reassignment. |
| **Type** | **Core** |

A booking on its own doesn't wash anything — someone has to actually be
assigned to do it, and that person needs a way to say "I started" and "I
finished." That's what this context is for.

There are three ways an operator ends up assigned:

1. **Automatically**, based on who's available.
2. **The customer picks one directly** from whoever's available.
3. **An administrator assigns or reassigns** one when needed.

Worth being honest about a gap here: the current requirements only confirm
availability (RF-008) as the automatic-assignment rule. Older
project drafts mentioned things like proximity or workload, but those never
made it into the current RF-008, so we're not treating them as real rules
until someone actually writes them down as one.

**Context-specific terms (Ubiquitous Language):**

| Term | Meaning in this context |
|---|---|
| **Operator** | A user with the Operator role who performs the washes. |
| **Availability** | The windows of time an operator can work. |
| **Assignment** | The link between a booking and the operator doing it. |
| **Assignment status** | Where that operator's task is — see section 5. |
| **Reassignment** | An administrator swapping out the assigned operator. |

**Requirements covered:** RF-008, RF-009, RF-010, RF-011, RF-012b, RF-022.

---

### Bounded Context: Payment

| Field | Value |
|---|---|
| **Name** | Payment |
| **Responsibility** | Tracks payment attempts, uploaded receipts, review status, and history for a booking. |
| **Type** | Supporting |

There is no payment gateway integration — this platform never collects or
transmits card data at all. The customer scans the shop's QR code for their
chosen method and pays outside the platform (bank transfer, Nequi,
Daviplata, or in person for cash), then uploads a receipt as proof. An
administrator compares the receipt against the booking and approves or
rejects it.

Cash, Nequi, Daviplata, and bank transfer are the methods the current
requirements name.

**Context-specific terms (Ubiquitous Language):**

| Term | Meaning in this context |
|---|---|
| **Payment** | A payment attempt tied to one booking. |
| **Payment account** | The shop's QR code and account details shown to the customer for a given method. |
| **Payment receipt** | The proof of payment the customer uploads — file, transaction reference, reported amount. |
| **Payment status** | Where the payment is right now — see section 5. |
| **Payment history** | Past payments the customer can look back at. |

**Requirements covered:** RF-013, RF-014, RF-015, RF-016.

---

### Bounded Context: Feedback & Rating

| Field | Value |
|---|---|
| **Name** | FeedbackRating |
| **Responsibility** | Customer ratings and comments after a service is done. |
| **Type** | Supporting |

Can't rate something that hasn't happened yet — a rating only makes sense
once the booking reaches `COMPLETED`.

**Context-specific terms (Ubiquitous Language):**

| Term | Meaning in this context |
|---|---|
| **Rating** | The customer's score for a completed service. |
| **Comment** | The written feedback that goes with it. |
| **Completed service** | The status that unlocks rating. |

**Requirements covered:** RF-012.

---

### Bounded Context: Notification

| Field | Value |
|---|---|
| **Name** | Notification |
| **Responsibility** | Delivers notifications to users and tracks read/unread. |
| **Type** | Generic / Supporting |

This context reacts — a booking gets confirmed, an operator gets assigned, a
payment goes through, and Notification tells the right person about it. It
never owns any of those events itself.

**Context-specific terms (Ubiquitous Language):**

| Term | Meaning in this context |
|---|---|
| **Notification** | A message sent to a user because something relevant happened. |
| **Read / Unread** | Whether the user has seen it yet. |

**Requirements covered:** RF-018.

---

### Bounded Context: Promotions & Loyalty

| Field | Value |
|---|---|
| **Name** | PromotionsLoyalty |
| **Responsibility** | Promotions, discounts applied at payment, loyalty points, and redeeming them. |
| **Type** | Supporting |

This one's in the map because RF-024, RF-025, and RF-026 are real
requirements right now, not because it's built yet — see the open questions
in section 9.

**Context-specific terms (Ubiquitous Language):**

| Term | Meaning in this context |
|---|---|
| **Promotion** | A discount or benefit with its own validity conditions. |
| **Discount** | The reduction a promotion applies to an eligible booking/payment. |
| **Loyalty points** | Points a customer earns under the loyalty rules. |
| **Redemption** | Spending accumulated points on a benefit. |

**Requirements covered:** RF-024, RF-025, RF-026.

---

### Cross-cutting capabilities

A few requirements don't belong to any single context — they cut across all
of them:

- **Role-based dashboards (RF-017):** what you see depends on your role and
  whichever context owns that data, not a context of its own.
- **Theme preference (RF-019)** and **language preference (RF-020):** user
  settings, not business concepts.
- **Operational reports (RF-023):** reads data from other contexts, doesn't
  own any of it.

---

## 3. Context Map

Arrows here describe domain dependency — who needs to know about whom — not
a final REST/messaging/microservice design.

```text
                         ┌──────────────────────┐
                         │   Identity & Access  │
                         │       Generic        │
                         └──────────┬───────────┘
                                    │
                         authentication / roles
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌─────────────────┐       ┌──────────────────┐       ┌────────────────────┐
│ Vehicle         │──────▶│     Booking      │◀─────▶│ Operations &       │
│ Management      │       │      Core        │       │ Assignment Core    │
│ Supporting      │       └───────┬──────────┘       └─────────┬──────────┘
└─────────────────┘               │                            │
                                  │                            │
                    ┌─────────────┴─────────────┐              │
                    │                           │              │
                    ▼                           ▼              ▼
             ┌────────────┐              ┌────────────┐ ┌────────────┐
             │  Service   │              │  Payment   │ │Notification│
             │  Catalog   │              │ Supporting │ │  Generic   │
             │ Supporting │              └────────────┘ │ /Supporting│
             └────────────┘                             └────────────┘

                 Booking ───────────────▶ Feedback & Rating
                 (completed service)

                 Booking / Payment ────▶ Promotions & Loyalty

       Relevant business events from several contexts ───▶ Notification
```

### Relationships table

| Context A | Relationship | Context B | Business meaning |
|---|---|---|---|
| Booking | depends on | Vehicle Management | A booking references a vehicle the customer registered. |
| Booking | depends on | Service Catalog | A booking picks a service from the catalog. |
| Booking | collaborates with | Operations & Assignment | A confirmed booking needs an operator and a way to track execution. |
| Booking | enables | Payment | A payment always belongs to a booking. |
| Booking | enables | Feedback & Rating | Completing a service unlocks rating it. |
| Booking / Payment | collaborates with | Promotions & Loyalty | Promotions and loyalty rules can affect a payment when eligible. |
| Identity & Access | provides identity information to | All contexts | Every protected operation checks who you are and what role you have. |
| Relevant contexts | publish business information/events to | Notification | Notifications tell users what happened without owning the event itself. |

### Important relationship rules

1. Booking owns the booking's lifecycle — Operations doesn't touch
   `BookingStatus`, it manages assignment and execution status instead.
2. An assignment isn't a booking. The booking is the customer's request; the
   assignment is who's responsible for carrying it out.
3. A service isn't a booking either — the catalog defines what's offered,
   Booking represents one specific occurrence of it actually happening.
4. Payment doesn't own the booking, just the payment attempt tied to it.
5. Notification doesn't own whatever triggered it — it just tells people.
6. There is no external payment gateway to model — Payment owns the whole
   attempt-to-review lifecycle itself, end to end.

---

## 4. Core Domain, Supporting, and Generic

| Bounded Context | Type | Justification |
|---|---|---|
| **Booking** | **Core** | The actual transaction the business runs on. |
| **Operations & Assignment** | **Core** | Getting an operator to the booking is just as essential as the booking existing in the first place. |
| **Identity & Access** | Generic | Standard auth — nothing about it is specific to car washes. |
| **Vehicle Management** | Supporting | Needed for a booking, but not the transaction itself. |
| **Service Catalog** | Supporting | Reference data — what's on offer and at what price. |
| **Payment** | Supporting | Critical for traceability, but a manual QR-and-receipt review, not a real-time transaction engine. |
| **Feedback & Rating** | Supporting | Adds value after the fact, doesn't drive the transaction. |
| **Notification** | Generic / Supporting | Communicates what other contexts already decided. |
| **Promotions & Loyalty** | Supporting | Retention feature, not the core exchange. |

---

## 5. Domain lifecycle and status vocabularies

A booking's lifecycle and an assignment's lifecycle aren't the same thing,
and we're keeping them as two separate status fields on purpose instead of
one shared "status" that means different things depending on who's reading
it.

### BookingStatus

```text
PENDING ─────▶ CONFIRMED ─────▶ IN_PROGRESS ─────▶ COMPLETED
   │                 │
   └─────────────────┴──────────────▶ CANCELLED
```

- **PENDING:** just created, not confirmed yet.
- **CONFIRMED:** validated and scheduled.
- **IN_PROGRESS:** the wash has started.
- **COMPLETED:** done.
- **CANCELLED:** called off under the applicable rules.

### AssignmentStatus

```text
PENDING ─────▶ IN_PROGRESS ─────▶ COMPLETED
   │
   └──────────▶ CANCELLED
```

An assignment can also get replaced through reassignment — swapping the
operator doesn't cancel the customer's booking.

### Domain distinction

| Concept | Represents | Main owner |
|---|---|---|
| **BookingStatus** | The customer's reservation/service lifecycle | Booking |
| **AssignmentStatus** | The operator's assigned task | Operations & Assignment |
| **PaymentStatus** | The financial transaction | Payment |

The exact transition rules and guards belong in `entities-and-rules.md`.

---

## 6. Key domain rules derived from current requirements

1. A customer has to be authenticated to do anything that requires being one.
2. A booking always identifies a customer, a vehicle, a wash service, and a scheduled date/time.
3. The requested time slot gets validated before the booking is confirmed.
4. A customer can only modify or cancel a booking when the rules allow it — mainly, before the service starts.
5. Automatic assignment goes by operator availability (RF-008).
6. A customer can pick an operator from whoever's available (RF-010).
7. An administrator can assign or reassign an operator (RF-009).
8. An operator only sees and updates the bookings assigned to them, nothing else.
9. A rating can only happen after the service is completed.
10. Every payment belongs to exactly one booking.
11. No card data is ever collected or stored on our side — payment is a manual QR transfer verified against an uploaded receipt, reviewed by an administrator.
12. Customers can pull up their payment history.
13. Promotions only apply when their validity and eligibility conditions hold.
14. Loyalty points only get earned or redeemed under the defined loyalty rules.
15. A notification always has a recipient and a read/unread state.
16. What an admin or operator can do depends on their role.
17. Operator availability lives in the operational domain and feeds directly into whether they can be assigned.
18. Theme and language are user preferences — they don't touch the booking domain at all.
19. Reports read from the business contexts; they don't own any of the concepts they report on.

---

## 7. Modeling decisions

| Decision | Alternative considered | Reason |
|---|---|---|
| Keep **Booking** as the central Core Context | Treat booking as a secondary function of operations | Everything in the current requirements revolves around requesting, validating, changing, cancelling, and completing a reservation. |
| Split **BookingStatus** from **AssignmentStatus** | One shared status field | A reservation and an operator's task don't move through the same states for the same reasons. |
| Keep **Service** in its own catalog | Hardcode service types as an enum | The catalog needs to grow without anyone touching the domain model to add a wash type. |
| Keep **Vehicle Management** separate from Booking | Treat vehicle as part of the booking itself | A customer manages vehicles on their own, independent of whether they're booking anything right now. |
| Drop **Branch** (and the earlier **Zone** grouping) as a domain concept | Model a multi-location business | The approved MVP scope is a single shop location — RF-008 resolves availability directly against operator schedules, with no location layer above it, and `01-context/glossary.md` doesn't define either term. Reintroducing multi-location later wouldn't require touching Booking's internal shape, since it never depended on a location for anything but a reference. |
| Keep **Payment** separate from Booking | Store payment details inside the booking | Payment has its own lifecycle, history, and review workflow — bundling it in would make Booking own things it shouldn't. |
| Keep **Feedback & Rating** separate | Put rating rules directly into Booking | Rating is a separate, post-service capability with its own rule (can't rate before completion). |
| Treat **Notification** as generic/supporting | Let Notification own business changes | It communicates what happened elsewhere; it shouldn't decide what happens. |
| Keep **Promotions & Loyalty** in the map | Leave it out since it's not built yet | RF-024 through RF-026 are current requirements — leaving it out would make it too easy to forget before delivery. |
| Don't fix microservice boundaries here | One microservice per Bounded Context | A Bounded Context is a domain boundary, not a deployment decision — that belongs to architecture. |
| Don't model SQL Server tables here | Model persistence directly in the domain map | Keeping this independent of the database is the whole point of a domain map. |
| Don't assume proximity, workload, specialization, or rating for automatic assignment | Copy the criteria from older documentation | RF-008 only confirms availability — the rest was never carried over from the old drafts. |
| Use the current role vocabulary (Customer, Operator, Administrator) | Bring back roles from the old database scripts (Supervisor, Cajero) | Those roles were dropped; the current context only defines three. |

---

## 8. Domain events — initial catalog

These are the main event candidates from the business flow described above.
They're all past tense, since an event is something that already happened.

| Event | Originating context | Trigger / meaning |
|---|---|---|
| `UserRegistered` | Identity & Access | A customer's account was created. |
| `UserAuthenticated` | Identity & Access | A user logged in successfully. |
| `BookingCreated` | Booking | A booking was created. |
| `BookingConfirmed` | Booking | A booking passed validation and is confirmed. |
| `BookingModified` | Booking | An allowed change to a booking went through. |
| `BookingCancelled` | Booking | A booking was cancelled under the rules. |
| `OperatorAssigned` | Operations & Assignment | An operator got assigned to a booking. |
| `OperatorReassigned` | Operations & Assignment | The assigned operator was swapped out. |
| `ServiceStarted` | Operations & Assignment | The operator started the wash. |
| `ServiceCompleted` | Operations & Assignment | The wash is done. |
| `PaymentInitiated` | Payment | A payment attempt started. |
| `PaymentConfirmed` | Payment | An administrator approved the payment after reviewing the uploaded receipt. |
| `PaymentRejected` | Payment | The payment was rejected on review, or the attempt failed. |
| `RatingSubmitted` | Feedback & Rating | A customer left a rating/comment after completion. |
| `NotificationCreated` | Notification | A notification went out to someone. |
| `PromotionApplied` | Promotions & Loyalty | An eligible promotion got applied. |
| `LoyaltyPointsEarned` | Promotions & Loyalty | Loyalty points were credited. |
| `LoyaltyPointsRedeemed` | Promotions & Loyalty | Loyalty points were spent. |

Full payloads, who consumes each event, and idempotency go in
`02-domain/domain-events.md`, with the rest (integration contracts) in
architecture and API docs.

---

## 9. Open questions and boundaries

These are left for later on purpose, instead of guessing at an answer now.

| # | Question | Where it gets resolved |
|---|---|---|
| 1 | Does Vehicle Management get its own microservice, or fold into a bigger one? | `05-architecture` / `09-microservices` |
| 2 | Exact SQL Server tables, keys, indexes, constraints. | `06-data` |
| 3 | Exact API endpoints, DTOs, integration contracts. | `07-api` |
| 4 | Assignment algorithm beyond operator availability. | Requirements / domain rules / architecture |
| 5 | Promotion eligibility rules, discount math, loyalty point formulas. | `04-requirements` / `02-domain/entities-and-rules.md` |
| 6 | How notifications actually get delivered (channels, mechanism). | `05-architecture` / `09-microservices` |
| 7 | Exact report calculations. | `04-requirements` / reporting docs |

---

## 10. Consistency and traceability

This map needs to stay in sync with the rest of the documentation — if a
requirement changes in a way that touches a responsibility, an actor, a rule,
or a concept here, this file gets updated first, before architecture, data,
API, UML, or microservice docs catch up to it.

### Current context alignment

- **Actors:** Customer, Operator, Administrator.
- **Core process:** booking and delivering a vehicle wash.
- **Main business objects:** User, Vehicle, Booking, Wash Service,
  Operator, Assignment, Payment, Rating, Promotion, Loyalty Points, Notification.
- **Payment verification:** manual QR transfer with an uploaded receipt, reviewed by an administrator — no external payment gateway.
- **Persistence technology:** SQL Server, documented outside the domain model.

### Requirements alignment

| Requirement area | Domain Context |
|---|---|
| RF-001 to RF-004b — account access and security | Identity & Access |
| RF-005 to RF-007 — booking | Booking + Vehicle Management + Service Catalog |
| RF-008 to RF-012b — operator assignment and service execution | Operations & Assignment |
| RF-013 to RF-016 — payments | Payment |
| RF-017 — role dashboards | Cross-cutting presentation capability |
| RF-018 — notifications | Notification |
| RF-019 to RF-020 — theme/language | Cross-cutting user preferences |
| RF-021 to RF-022 — operator schedules and availability | Operations & Assignment |
| RF-023 — operational reports | Cross-cutting reporting capability |
| RF-024 to RF-026 — promotions and loyalty | Promotions & Loyalty |

### Relationship with the rest of the documentation

- `01-context/` — project context, actors, scope, terminology.
- `04-requirements/` — functional and non-functional requirements.
- `02-domain/entities-and-rules.md` — entities, aggregates, value objects, invariants, and domain services built from this map.
- `02-domain/domain-events.md` — full detail on the events listed here.
- `05-architecture/` — how these boundaries actually get implemented.
- `06-data/` — the SQL Server persistence model.
- `07-api/` — external and inter-service contracts.
- `08-uml/` — diagrams using this same vocabulary.
- `09-microservices/` — final service decomposition, once decided.