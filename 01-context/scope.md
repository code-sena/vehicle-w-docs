# System Scope

> **Why this document exists:** Scope prevents scope creep and aligns expectations.
> It is equally important to define what the system does NOT do as what it does.
> Review this document at the start of each planning cycle.

---

## In Scope

What the system **DOES build and maintain**:

### MVP Features

| # | Feature | Description | Responsible service |
|---|---------|-------------|--------------------|
| 1 | User management | Sign-up, login, password recovery and change, and profiles with different roles and permissions | security |
| 2 | Wash service management | Service request with selection of date, time and service type; changes and cancellation before execution | reserve |
| 3 | Operator assignment | Automatic by availability, direct selection by the customer, or manual override by the Administrator when needed | execution |
| 4 | Payment management | QR-based payment (cash, Nequi, Daviplata, bank transfer) with an uploaded receipt reviewed by an administrator; transaction recording and payment history | payment |
| 5 | Ratings and reviews | Customers rate and comment on the service once it is completed | execution |
| 6 | Role-based dashboard and user preferences | Dashboard and notifications tailored to each user role, theme customisation, and interface available in four languages (Spanish, English, French, Portuguese) | settings, notification (dashboard itself is frontend-only) |
| 7 | Administrative management | Management of the shop's settings and business hours, wash bays, operator schedules and availability, plus operational reports and statistics | settings, reserve, execution |
| 8 | Promotions and loyalty | Administrator-created discounts/promotions, customer-applied promo codes at payment time, and a loyalty points program (accumulate on completed services, redeem for discounts) | promotion, customer |

### Included integrations

No external systems are integrated in this version. Payment is a manual QR
transfer verified by an administrator against a customer-uploaded receipt —
there is no payment gateway in the loop, and no card data is ever collected
or transmitted.

### Environments being built

| Environment | Purpose |
|-------------|---------|
| Local | Development and testing on each team member's machine, with Docker for the database and services |
---

| # | What is out of scope | Reason | Future version? |
|---|---------------------|--------|----------------|
| 1 | iOS mobile app | Current scope covers Android only | Yes — the React Native codebase allows it |
| 2 | At-home / mobile wash service | The business model requires the customer to bring the vehicle to the shop | Under evaluation |
| 3 | Electronic invoicing (DIAN) | Requires the business to be legally registered with the tax authority | No |
| 4 | Supplies and inventory management | Outside the booking domain | No |
| 5 | Staging and production deployment | Academic project, not deployed for real users | Yes — if the project continues |
| 6 | Email notifications and password recovery by email | No mail provider integrated in this version | Yes |

### What another system / team handles (and why not us)

Nothing is delegated to an external system in this version — payment
verification is done manually by an administrator, inside the platform.

---

## Scope assumptions

> These assumptions are taken to be true. If they change, the scope must be renegotiated.

| # | Assumption | Consequence if false |
|---|-----------|---------------------|
| 1 | Customers accept paying by QR transfer and uploading a receipt, instead of an automated gateway | RF4 would need a different payment story before it could be demonstrated |
| 2 | Customers have an Android device and internet access when booking | An alternative booking channel would be required |
| 3 | Data volume matches an academic project, not real operation | Indexing, pagination and query strategy would need review |
| 4 | The shop has fixed schedules and assigned operators | Availability and assignment logic would change entirely |
| 5 | The team keeps its three members throughout the phase | The MVP scope would have to be reduced |

---

## Constraints

| Type | Description |
|------|-------------|
| **Time** | The MVP must be ready by the academic delivery date |
| **Budget** | No assigned funding. Development runs on the team's own equipment and free or free-tier tools. The estimated cost under real conditions is COP 148,173,000. |
| **Technology** | Java 21 + Spring Boot, Angular, React Native and SQL Server. |
| **Regulatory** | Personal data handling under Colombian Law 1581 of 2012 (habeas data) |
| **Team** | 3 part-time developers, alongside their academic workload |

---

## External dependencies

| Dependency | Team / Provider | Required date | Status |
|-----------|--------------------|--------------|--------|
| Development equipment | Team members | Project start | 🟢 Available |
| Technical guidance and delivery reviews | Technical instructors | Each review cycle | 🟢 Available |
---

## How to update the scope

The scope can change, but the change has a process:

1. Document the proposed change in this file
2. Evaluate the impact on schedule and effort
3. Obtain approval from the Product Owner and Tech Lead
4. Update the roadmap in `03-product/vision.md`
5. Create or update HUs in `04-requirements/user-stories.md`

---

## Correlations

- Vision and roadmap → `03-product/vision.md`
- Term glossary → `01-context/glossary.md`
- System overview → `01-context/overview.md`
- Scope-related risks → `15-project-control/risks.md`
