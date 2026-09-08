# Problem Framing — Problem Definition

> **Why this document exists:** Before designing solutions, the team must be aligned on the problem it solves. This document captures that alignment.
>
> **Project:** Vehicle Washing Service Management Platform (Vehicle Washing)
> **Domain:** Vehicle washing and automotive care services
> **Document status:** Problem definition, grounded in the current implementation

---

## 1. The problem in one sentence

**Vehicle owners** who **need to maintain and clean their vehicles through professional washing services** struggle with **finding, scheduling, and managing vehicle washing services in a simple and reliable way** because **traditional washing processes rely heavily on manual coordination, limited service information, and disconnected management of vehicles, appointments, promotions, staff assignment, and payments**, resulting in **longer service times, scheduling difficulties, limited visibility of service status, and a fragmented customer and operational experience**.

### Problem interpretation

The problem is not simply the lack of a vehicle-washing application — it is the **fragmented management of the vehicle-washing service experience**, split across three groups of concerns that historically live in separate channels (a phone call, a paper ticket, a supervisor's memory):

- **Identity and access** — who is a customer, who is staff, and what each is allowed to do.
- **Operational execution** — which vehicle, which service, which operator, in what state.
- **Commercial activity** — bookings, pricing, promotions, and payment.

This three-way split is precisely why the system was built as three independent microservices (Security, Operational, Commercial) rather than one monolith: each concern has a different owner, a different data shape, and a different rate of change.

Customers need to be able to identify their vehicle, see available services and prices, book according to real availability, know about active promotions, track service status, pay, and review history. Operators need a clear queue of assigned work instead of verbal handoffs. Administrators need to manage staff, services, promotions, and see the business's daily performance without manual reconciliation.

---

## 2. Affected users

| Segment | Description | Estimated size | Priority |
|---------|-------------|---------------|---------|
| Vehicle owners / Clients | People who own or regularly use vehicles and book washing services through the web or mobile app | Hundreds per deployment (client-facing, highest volume) | High |
| Wash operators (Operator role) | Staff who receive assigned services, update job status, and record work performed | 3–10 per business | High |
| Administrators (Admin role) | Users who manage services, prices, promotions, staff, and review operational/business performance | 1–3 per business | High |

> **Note:** As an academic project without a live customer base yet, these sizes are realistic estimates for a single-location deployment. Replace with real figures once the system is piloted.

### Jobs-to-be-Done (JTBD)

**Client — When** I need to clean or maintain my vehicle, **I want** to see available services, prices, and time slots and book instantly without a phone call, **so that** I get a confirmed appointment and can track its status without unnecessary waiting or confusion.

**Operator — When** a vehicle is scheduled for a washing service, **I want** to see a clear, prioritized list of assigned services with vehicle and customer details, **so that** I can start and update work without waiting for a supervisor to hand out jobs verbally.

**Administrator — When** I need to manage the washing operation, **I want** to manage users, services, promotions, staff assignment, and payments from one integrated platform, **so that** the business runs in a controlled, organized, and traceable way instead of relying on paper and spreadsheets.

---

## 3. Evidence of the problem

| Evidence type | Source | Date | Key finding |
|--------------|--------|------|------------|
| Informal interviews | 3–5 local car wash owners/administrators | Pre-development phase | Bookings are taken by phone/WhatsApp with no shared calendar; double bookings happen weekly |
| Direct observation | Shadowing a car wash's daily operation | Pre-development phase | Operators wait for verbal instructions from a supervisor between services, causing idle time |
| Process analysis | Review of the current booking-to-payment workflow | Pre-development phase | Vehicle, service, appointment, promotion, and payment information live in disconnected channels with no single source of truth |
| Benchmarking | Comparable booking apps in adjacent sectors (salons, workshops) | Pre-development phase | Similar service sectors already offer real-time slot booking and status tracking; local car washes largely do not |
| Customer feedback | Informal feedback reported by owners | Pre-development phase | Clients complain about not knowing when their vehicle will be ready or losing track of past services |

### Assumptions to validate
1. Customers experience real friction scheduling washes today (not just a perceived problem).
2. Customers value seeing service status in real time, not only at pickup.
3. Operators' idle time between services is measurable and meaningful, not anecdotal.
4. Administrators would trust an automated daily report over manual reconciliation once tested side by side.

> **Important:** Until validated with real users, these remain hypotheses, not confirmed facts — the figures below are illustrative planning estimates, not measured data.

---

## 4. Current user solution (and its problems)

| Current solution | Limitations | Cost/Friction |
|-----------------|------------|--------------|
| Phone calls / WhatsApp for booking | No shared availability view, no confirmation trail, easy to double-book | ~30–45 min/day answering booking messages |
| Paper tickets or a notebook for service tracking | No searchable history, easily lost, no link between client and past vehicles/services | ~1 hour/day transcribing/reconciling |
| Verbal assignment of operators by a supervisor | No queue visibility, operators idle between assignments, no record of who did what | Uneven workload distribution, disputes over pay/performance |
| Excel spreadsheets for revenue/staff tracking | Manual entry, no real-time view, error-prone, not accessible from the shop floor | ~1–1.5 hours/day of manual data entry at day close |
| Informal, verbally-communicated promotions | Customers may not know which offers are active | Missed upsell opportunities, inconsistent application |

### Current-state problem
Because identity, operations, and commercial activity are each handled through a different informal channel, there is no single source of truth for customers, vehicles, services, appointments, promotions, payments, or service status — which is the exact gap the three-microservice split is designed to close.

---

## 5. Solution hypothesis

**We believe that** a platform built on three independent microservices — **Security** (authentication, roles, permissions via JWT), **Operational** (vehicles, service execution, staff/operator assignment, status tracking), and **Commercial** (service catalog, pricing, bookings, promotions, payments) — each with its own database (PostgreSQL, MySQL, SQL Server respectively) and exposed through an Angular web app (Admin/Operator) and a React Native/Expo mobile app (Client),

**for** vehicle owners, wash operators, and administrators,

**will achieve** a single, real-time source of truth for bookings, staff workload, and service history — eliminating double bookings and manual reconciliation.

**We will know we succeeded when** clients can complete the full journey — select a vehicle, pick a service, book a slot, apply a promotion, and pay — with minimal manual intervention, while operators receive assignments digitally instead of verbally, and administrators get daily reports automatically instead of by hand.

### How each service addresses the problem

| Concern from Section 1 | Owning service | Core capability |
|---|---|---|
| Who can do what | **Security** | Person, User, Role, Module, Form, Permission (RBAC) with JWT |
| Vehicle, service execution, operator workload | **Operational** | Vehicle registration, service execution, operator assignment, status tracking |
| Booking, pricing, promotions, payment | **Commercial** | Service catalog, appointment scheduling, promotions, payment/billing |

The downward dependency rule (business → operational → security → common) keeps these concerns from re-tangling into the same fragmentation the system is meant to solve.

---

## 6. Success metrics (North Star)

| Metric | Current baseline | 6-month target | How to measure it |
|--------|----------------|---------------|-------------------|
| Double-booking rate | ~1–2/week (estimated) | 0 | Booking conflicts flagged by the Commercial service |
| Time to reconcile daily records | ~2–3 hours/day (manual) | < 15 minutes/day | Time from shift close to report generation |
| % of bookings made without a phone call | ~0% today | > 70% | Bookings created via web/mobile vs. entered manually |
| Operator idle time between services | Unmeasured (perceived as high) | Reduced by 30% | Timestamp gap between completion and next assignment |
| Successful end-to-end booking-to-payment completion rate | Not applicable (no digital flow today) | ≥ 90% | Appointment + payment records in the Commercial service |

**North Star Metric:** Percentage of service bookings created, confirmed, and paid end-to-end through the platform without manual phone/WhatsApp coordination.

> Baselines marked "estimated" should be replaced with real numbers once the platform is piloted with an actual car wash business.

---

## 7. Hypothesis risks

| Risk | Probability | Impact | Experiment to validate |
|------|------------|--------|----------------------|
| Operators resist using a mobile/web interface instead of verbal instructions | Medium | High | Pilot the Operator role flow with 2–3 real operators for one week |
| Clients still prefer calling instead of booking through the app | Medium | Medium | Compare booking-channel usage after mobile app rollout with a small client group |
| The three-microservice split adds more operational complexity than a single small car wash needs | Low | Medium | Review service boundaries against real usage after the pilot |
| Business owners don't trust automated reports over manual reconciliation | Medium | High | Run both systems in parallel for 2 weeks and compare totals |
| Cross-service consistency issues (e.g., a booking confirmed in Commercial but not reflected in Operational) | Medium | High | End-to-end test of the booking → assignment → status flow across the three services |
| Appointment availability isn't accurately synchronized under concurrent bookings | Medium | High | Load-test simultaneous booking attempts for the same slot |

---

## 8. Out of scope (we do not solve)

- **Online payment gateway integration:** the current version tracks payment status and association with services/appointments, not real payment processing — this avoids PCI-compliance scope within the academic timeline.
- **Multi-branch / franchise management:** the system is scoped to a single car wash location per deployment; cross-location reporting is a future extension.
- **Advanced loyalty/rewards programs:** client history supports service continuity, not a points/rewards engine.
- **Vehicle repair or mechanical services:** the platform covers washing and related care, not mechanical repair.
- **Supplier/inventory procurement automation:** the system tracks internal staff/service execution, not ordering consumables (soap, wax, etc.) from suppliers.
- **AI-based recommendations or GPS tracking:** not required to validate the core booking-to-payment journey.

### Scope principle
The initial version focuses on validating one core flow: **Client → Vehicle → Service → Appointment → Promotion (if applicable) → Payment → Service completion**, implemented across Security, Operational, and Commercial. Anything outside that flow is deferred unless it's required to make the flow work.

---

## Correlations
- Security / Operational / Commercial services → `Vehicle Washing` repository
- Web frontend (Admin / Operator / Client roles) → `Front-end-proyecto-web` repository
- Mobile app (Client booking flow) → `Vehicle Washing-Movil` repository
- ERD, technical manual, DDD diagrams → academic submission documentation

### Traceability
**Problem → Evidence → Solution Hypothesis (mapped to Security/Operational/Commercial) → Success Metrics → User Stories → Implementation → Measurement**
