# Product Vision — Vehicle Washing

> The vision is the **North Star** for the Vehicle Washing development team. All decisions about sprints, features, design, priorities, and system evolution must align with this vision.
>
> The vision must be ambitious yet achievable, inspiring yet specific enough to guide project decisions.

---

## Vision Statement

> **For vehicle owners who need a fast, simple, and organized way to manage vehicle washing services, Vehicle Washing is a digital service management platform — built on three independent services (Security, Operational, Commercial) and delivered through an Angular web app and a React Native/Expo mobile app — that allows users to manage vehicles, browse services, schedule appointments, apply promotions, manage payments, and review service history. Unlike traditional processes based on in-person assistance, phone calls, or messaging, our platform centralizes the customer experience and simplifies the operational management of the washing business, without letting identity, operations, and commerce blur back into one another.**

### Elements of the vision

| Element | Definition |
|---|---|
| **Target customer** | Vehicle owners (clients), plus wash operators and business administrators as internal users |
| **Need** | Managing vehicle washing services in a simple, organized way |
| **Product** | Vehicle Washing |
| **Category** | Digital vehicle-washing service management platform |
| **Main benefit** | Centralizing and simplifying the service management process |
| **Current alternative** | In-person attention, phone calls, messaging, and manual processes |
| **Differentiator** | Vehicles, services, appointments, promotions, and payments integrated on one platform — implemented as three purpose-built services (Security, Operational, Commercial) instead of one monolith or a pile of disconnected tools |

---

# Team Mission

> **Our mission is to develop a digital platform that transforms traditional vehicle washing service management into a centralized, simple, and reliable process. We aim to improve the customer experience and increase operational efficiency by digitizing vehicle, service, appointment, promotion, and payment management — cleanly separating identity, operations, and commerce so each can be built, tested, and trusted independently.**

---

# Strategic Pillars

The strategic pillars are the main areas that move the product from mission to vision. Each pillar below is tied to a service and to a metric already established in `problem-framing.md`, so the pillars stay concrete instead of generic.

| Pillar | Description | Owning service(s) | Success metrics |
|---|---|---|---|
| **1. Frictionless booking** | Let the client manage vehicles, browse services, and book an appointment without unnecessary steps or a phone call | Commercial (catalog, booking), Operational (vehicles) | Average time to create an appointment, % of bookings made via web/mobile instead of phone |
| **2. Operational clarity** | Replace verbal handoffs with a digital work queue so operators always know what's next | Operational | Operator idle time between services, % of services with a digitally recorded status change |
| **3. Data reliability** | Keep appointment, availability, promotion, and payment information consistent across services | Commercial ↔ Operational sync | Double-booking rate, successful operations vs. registered errors |
| **4. Trustworthy administration** | Let the business close the day from the platform's numbers instead of a manual recount | Security (admin users), Commercial (reports) | Time to reconcile daily records, % of payments with a system-recorded status |
| **5. Scalability by service boundary** | Let the platform grow — more clients, more staff, new features — without one service's changes breaking another | All three services (Security, Operational, Commercial) | Cross-service integration test coverage, absence of duplicated business logic across services |

---

# High-Level Roadmap

The roadmap represents the product's evolution from the **MVP** to future capabilities, organized around the three owning services and the two frontends (Angular web, Expo mobile) instead of a flat list of feature domains.

```text
H1 — MVP
 │
 ├── Security (auth, roles)
 ├── Operational (vehicles)
 └── Commercial (catalog, appointments)
 │
 ▼
H2 — EXPANSION
 │
 ├── Operational (assignment, status tracking)
 ├── Commercial (promotions, payments)
 └── Security (admin users)
 │
 ▼
H3 — EVOLUTION
 │
 ├── Notifications
 ├── Advanced reports
 ├── Loyalty
 └── External integrations
```

---

## Horizon 1 — MVP

**Period:** Sprint 1-3

**Objective:**
> Validate the core product flow: a client can register, manage their vehicle, browse services, and schedule an appointment — end to end, with no phone call.

### Epics / features by owning service

**Security**
* User registration and login
* Basic profile management
* Roles and permissions (Person, User, Role, RolUser, JWT)

**Operational**
* Register vehicle
* Browse vehicles
* Update vehicle information
* Associate vehicle with its owner

**Commercial**
* Browse services
* View service details, price, and duration
* Create appointment
* Check appointments
* Check availability
* Basic appointment status management

**Frontend**
* [Angular] Admin and Operator core screens
* [Expo] Client registration, vehicle, and booking screens

**Uncertainty:** Low

### Core flow
```text
User (Security)
  ↓
Vehicle (Operational)
  ↓
Service (Commercial)
  ↓
Appointment (Commercial → Operational)
  ↓
Confirmation (Operational)
```

---

# Horizon 2 — Expansion

**Period:** Sprint 4-6

**Objective:**
> Expand the platform's value by digitizing operator workflow and adding commercial and administrative capabilities.

### Operational
* Operator assignment queue
* Service execution and status tracking end to end
* Appointment cancellation (reflected from Commercial)

### Commercial
* Browse, create, update, activate/deactivate promotions
* Validate and apply promotions
* Register and confirm payments
* Check payment status and history

### Security
* Manage administrative users
* Manage roles and permissions at a finer grain

**Frontend**
* [Angular] Operator assignment queue, Admin promotion/payment screens
* [Expo] Client-facing promotion display, payment status

**Uncertainty:** Medium

---

# Horizon 3 — Evolution

**Period:** Sprint 7+ / 6-12 months

**Objective:**
> Evolve the product with new capabilities that increase efficiency, satisfaction, and retention.

### Potential areas
* Notifications and appointment reminders
* Advanced service history
* Loyalty program
* Advanced reports and business KPIs
* Process automation
* External integrations
* New washing service types

**Uncertainty:** High

> These features are not part of the initial scope and must be validated before being added to the product — see Scope Boundaries below.

---

# Roadmap Summary

| Horizon | Period | Objective | Owning services / Frontend | Uncertainty |
|---|---|---|---|---|
| **H1 — MVP** | Sprint 1-3 | Validate the core washing-booking flow | Security, Operational, Commercial (core) + Angular/Expo core screens | Low |
| **H2 — Expansion** | Sprint 4-6 | Expand operational, commercial, and administrative capabilities | Operational (assignment/status), Commercial (promotions/payments), Security (admin users) | Medium |
| **H3 — Evolution** | Sprint 7+ | Evolve and scale the product | Notifications, Reports, Loyalty, Integrations | High |

---

# Product Principles

## 1. Customer First
> Every feature must deliver a clear benefit to the user and make a vehicle-washing-related task easier.

Before implementing a feature, the team must answer: **What user problem are we solving, and which service owns it?**

## 2. Simplicity
> Core operations must be easy to understand and perform, without unnecessary steps.

The user must be able to register a vehicle, browse a service, create an appointment, and check an appointment without unnecessarily complex processes.

## 3. Centralized Experience, Distributed Ownership
> Service-related information must be available from one centralized platform for the user — even though, underneath, it is intentionally split across Security, Operational, and Commercial. Centralization is a user-experience property, not an argument for a single database.

## 4. Reliability
> Information about users, vehicles, services, appointments, promotions, and payments must stay consistent and trustworthy across service boundaries. A feature is not "done" just because it works technically — it must also guarantee that cross-service data (e.g. a Commercial booking reflected in Operational) stays correct.

## 5. Scope Discipline
> Features must be prioritized by the value they bring to the product and its users, following: **User Need → Value → Priority → Implementation**. This avoids scope creep and keeps focus on the core objectives.

## 6. Operator Context Wins
> If an interface decision makes sense for an administrator at a desk but not for an operator mid-shift with limited time, the operator's context wins — this platform only replaces verbal coordination if it's actually faster to use than a shouted instruction.

---

# Product Definition of Done

The product is not "Done" simply because features have been coded. It is successful when it demonstrably solves the identified problem and lets a client complete the core vehicle-washing flow end to end.

## Objective
> **Let clients manage their vehicle washing services digitally, simply, and in an organized way, while businesses have the tools to run their operation efficiently — with identity, execution, and commerce each handled by the service designed for it.**

---

# Key Results

| Key Result | Baseline | Target | Date |
|---|---|---|---|
| **KR1: Successfully created appointments** | Not applicable (no digital flow today) | ≥ 90% | End of H1 |
| **KR2: Appointments completed correctly (booking → wash → status closed)** | Not applicable (no digital flow today) | ≥ 85% | End of H2 |
| **KR3: Core operations performed digitally (vs. phone/WhatsApp)** | ~0% (estimated, pre-launch) | ≥ 80% | End of H2 |
| **KR4: Payments processed correctly** | Not applicable (no digital flow today) | ≥ 90% | End of H3 |
| **KR5: Double-booking rate** | ~1–2/week (estimated) | 0 | End of H2 |
| **KR6: Returning clients** | Unmeasured | To be set after H1 baseline | After pilot |

> **Note:** Baselines marked "estimated" or "not applicable" reflect a pre-launch academic project without a live customer base yet — they are realistic planning figures, not measured data. Replace them with real numbers once the platform is piloted with an actual car wash business, consistent with the baselines already used in `problem-framing.md`.

---

# North Star Metric

> **Percentage of clients who successfully complete a vehicle washing service through the platform, end to end across Security, Operational, and Commercial.**

This metric represents the product's real value better than counting registrations or raw user counts alone.

### Associated flow
```text
Register / Login (Security)
      ↓
Vehicle (Operational)
      ↓
Service (Commercial)
      ↓
Appointment (Commercial → Operational)
      ↓
Promotion — Optional (Commercial)
      ↓
Payment (Commercial)
      ↓
Service Completed (Operational)
```

---

# Product Success Criteria

The product must show results across four dimensions.

## Customer
The client must be able to: register, log in, register vehicles, browse services, check prices, select a service, schedule an appointment, check appointment status, apply promotions, manage payments, and review their history.

## Business
The business must be able to: manage customers, administer vehicles, administer services, manage appointments, manage promotions, manage payments, and control the operation — through the Admin and Operator roles in the Angular web app.

## Technology
The system must: keep data consistent within and across Security, Operational, and Commercial; correctly manage roles and permissions; maintain adequate availability; allow reliable communication between the three services (respecting the downward dependency rule: Commercial → Operational → Security → common); and be able to evolve one service without breaking the others.

## Product
The product must: solve the identified problem, be easy to use, reduce manual processes, centralize information from the user's point of view, and allow its results to be measured against the metrics above.

---

# Scope Boundaries

The product vision sets a direction — it does not mean every vehicle-related feature belongs in this system. The full list of out-of-scope items (with the reasoning behind each) already lives in `03-product/problem-framing.md`, Section 8. In summary, the following stay out of the initial scope: mechanical repair, vehicle sales, fuel management, insurance management, real-time GPS tracking, advanced fleet management, AI-based recommendations, multi-business marketplace, international expansion, advanced business intelligence, and external integrations not required by the MVP.

These may be evaluated later if there's evidence they add real value — see the Decision Filter below.

---

# Correlations

| Section | Relationship |
|---|---|
| `03-product/problem-framing.md` | Defines **why** the product exists, the problem it solves, and the full out-of-scope list |
| `03-product/product-backlog.md` | Defines the features needed to implement the vision, tagged `HU-SECURITY-*`, `HU-OPERATIONAL-*`, `HU-COMMERCIAL-*` |
| `04-requirements/user-stories.md` | Turns the vision into requirements and user stories |
| `02-domain/` | Domain entities and capabilities identified from user needs (Person, User, Role, Vehicle, Service, Appointment, Promotion, Payment) |
| `02-architecture/` | Explains why Security, Operational, and Commercial are separate services with separate databases |
| `13-operations/README.md` | Defines KPIs and mechanisms to measure product behavior |
| `15-project-control/technical-backlog.md` | Tracks technical tasks and technical debt related to implementation |

---

# Vision Traceability

```text
PROBLEM
   │
   ▼
USER NEED
   │
   ▼
PRODUCT VISION
   │
   ├───────────────┐
   ▼               ▼
STRATEGIC       PRODUCT
PILLARS         PRINCIPLES
   │               │
   └───────┬───────┘
           ▼
        ROADMAP
   (tagged by Security / Operational / Commercial)
           │
           ▼
    PRODUCT BACKLOG
   (HU-SECURITY-* / HU-OPERATIONAL-* / HU-COMMERCIAL-*)
           │
           ▼
      USER STORIES
           │
           ▼
     IMPLEMENTATION
           │
           ▼
          TEST
           │
           ▼
        METRICS
```

This traceability lets the team verify that every feature built has a clear link to a user need, the product's objectives, and the service that owns it.

---

# Product Vision Summary

> **Vehicle Washing aims to transform traditional vehicle washing service management into a centralized, simple, and reliable digital experience, allowing customers to manage their vehicles and services while enabling businesses to manage their operations efficiently — with identity, execution, and commerce handled by three purpose-built services instead of one tangled system.**

---

# Decision Filter

Before adding a new feature, the team must evaluate:

1. **Does it solve a real user need?**
2. **Is it related to the product vision?**
3. **Does it bring value to the client or the business?**
4. **Is it needed at this stage of the roadmap?**
5. **Is there evidence justifying its inclusion?**
6. **Which service owns it — Security, Operational, or Commercial — and does it respect the downward dependency rule?**

If a feature doesn't meet these criteria, it must be **postponed, re-evaluated, or discarded**.

---

# Expected Outcome

After completing this document, the team should have clarity on:
* **Who** the target user is
* **What problem** is being solved
* **What value** Vehicle Washing offers
* **What differentiates** the product
* **What principles** guide decisions
* **Which features** are built first, and by which service
* **How the product will evolve**
* **How success will be measured**
* **What is out of scope**

The product vision is the reference that keeps the **problem, requirements, backlog, design, architecture, development, and metrics** of the project aligned.
