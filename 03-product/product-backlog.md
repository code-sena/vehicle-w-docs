# Product Backlog — Vehicle Washing

## 1. Purpose

The Product Backlog contains the prioritized product work required to transform the Vehicle Washing Product Vision and Roadmap into implementable functionality.

The backlog is organized around the three independent services:

- **Security Service**
- **Operational Service**
- **Commercial Service**

The two frontend applications consume these capabilities according to their user roles:

- **Angular Web Application:** Administrators and Operators
- **React Native / Expo Application:** Customers

The backlog is a living artifact. Items may be added, removed, refined, reprioritized, or split as new evidence becomes available.

---

# 2. Backlog Structure

Each backlog item follows this hierarchy:

```text
Product Vision
      ↓
Roadmap Horizon
      ↓
Epic
      ↓
Feature
      ↓
User Story
      ↓
Acceptance Criteria
      ↓
Implementation Tasks
```

---

# 3. Prioritization

The backlog uses the following priorities:

| Priority | Meaning |
|---|---|
| P0 — Critical | Required for the core product flow |
| P1 — High | Important for MVP or business operation |
| P2 — Medium | Valuable but not required for the initial product |
| P3 — Low | Future improvement or optional capability |

---

# 4. H1 — MVP Backlog

## EPIC SEC-01 — Authentication and Identity

**Service:** Security  
**Priority:** P0

### SEC-US-01 — Register an account

**As a** customer  
**I want** to create an account  
**So that** I can access the Vehicle Washing platform.

#### Acceptance Criteria

- The user can provide the required registration information.
- The system validates required fields.
- The system prevents duplicate accounts according to the defined identity rules.
- A valid user account is created.
- The user receives an appropriate response after registration.

---

### SEC-US-02 — Log in

**As a** registered user  
**I want** to log in  
**So that** I can securely access the platform.

#### Acceptance Criteria

- Valid credentials allow authentication.
- Invalid credentials are rejected.
- A valid JWT is generated after successful authentication.
- Unauthorized users cannot access protected resources.

---

### SEC-US-03 — Manage my profile

**As a** customer  
**I want** to view and update my profile  
**So that** my personal information remains current.

#### Acceptance Criteria

- The authenticated user can view their profile.
- The user can update permitted information.
- The system validates the submitted data.
- Only authorized users can modify their own profile.

---

## EPIC SEC-02 — Authorization

**Service:** Security  
**Priority:** P0

### SEC-US-04 — Assign roles

**As an** administrator  
**I want** to assign roles to users  
**So that** access can be controlled according to responsibilities.

#### Acceptance Criteria

- Authorized administrators can view available roles.
- A role can be assigned to a user.
- Unauthorized users cannot modify role assignments.
- The assigned role is stored correctly.

---

### SEC-US-05 — Manage permissions

**As an** administrator  
**I want** to manage permissions  
**So that** users only access authorized functionality.

#### Acceptance Criteria

- Permissions can be created or configured according to the defined model.
- Permissions can be associated with roles.
- Unauthorized access is rejected.
- Permission changes are reflected in authorization decisions.

---

# 5. H1 — Operational Backlog

## EPIC OPS-01 — Vehicle Management

**Service:** Operational  
**Priority:** P0

### OPS-US-01 — Register a vehicle

**As a** customer  
**I want** to register my vehicle  
**So that** I can use it when booking a washing service.

#### Acceptance Criteria

- The customer can enter the required vehicle information.
- Required fields are validated.
- The vehicle is associated with the authenticated owner.
- The vehicle is stored successfully.
- The customer can view the registered vehicle.

---

### OPS-US-02 — View my vehicles

**As a** customer  
**I want** to see my registered vehicles  
**So that** I can select one when creating an appointment.

#### Acceptance Criteria

- Only the authenticated user's vehicles are displayed.
- Vehicle information is presented clearly.
- The user can select a vehicle for a future appointment.

---

### OPS-US-03 — Update a vehicle

**As a** customer  
**I want** to update my vehicle information  
**So that** the stored information remains accurate.

#### Acceptance Criteria

- The owner can edit permitted information.
- The system validates the changes.
- The updated information is persisted.
- Users cannot modify vehicles belonging to another customer.

---

# 6. H1 — Commercial Backlog

## EPIC COM-01 — Service Catalog

**Service:** Commercial  
**Priority:** P0

### COM-US-01 — View available services

**As a** customer  
**I want** to browse available washing services  
**So that** I can choose the service that best fits my needs.

#### Acceptance Criteria

- Available services are displayed.
- Each service includes its relevant information.
- Inactive services are not presented as bookable.
- The customer can select a service to view its details.

---

### COM-US-02 — View service details

**As a** customer  
**I want** to view the price and duration of a service  
**So that** I can make an informed booking decision.

#### Acceptance Criteria

- The service name is displayed.
- The service description is displayed when available.
- The price is displayed.
- The estimated duration is displayed.
- The information corresponds to the current service configuration.

---

## EPIC COM-02 — Appointment Management

**Service:** Commercial  
**Priority:** P0

### COM-US-03 — Check availability

**As a** customer  
**I want** to check available appointment times  
**So that** I can choose a suitable schedule.

#### Acceptance Criteria

- The user can select a date.
- Available time slots are displayed.
- Unavailable slots cannot be selected.
- Availability reflects existing appointments according to the defined business rules.

---

### COM-US-04 — Create an appointment

**As a** customer  
**I want** to create an appointment  
**So that** my vehicle can be scheduled for a washing service.

#### Acceptance Criteria

- The customer must be authenticated.
- A valid vehicle must be selected.
- A valid service must be selected.
- A valid date and time must be selected.
- The system validates availability before creating the appointment.
- The appointment is associated with the customer, vehicle, and service.
- A confirmation is returned after successful creation.

---

### COM-US-05 — View my appointments

**As a** customer  
**I want** to view my appointments  
**So that** I can track my scheduled services.

#### Acceptance Criteria

- The customer can view their appointments.
- Appointment information includes relevant date, time, vehicle, and service information.
- The customer cannot view another customer's appointments.

---

# 7. H1 — Frontend Backlog

## EPIC FE-01 — Customer Mobile Experience

**Platform:** React Native / Expo  
**Priority:** P0

### FE-US-01 — Customer registration screen

The application must provide a mobile registration flow connected to Security.

### FE-US-02 — Customer login screen

The application must authenticate customers and maintain the authenticated session.

### FE-US-03 — Vehicle management screens

The application must allow customers to register, view, and update vehicles.

### FE-US-04 — Service catalog screens

The application must display available services and their details.

### FE-US-05 — Appointment booking flow

The application must allow customers to select a vehicle, service, date, and available time.

---

## EPIC FE-02 — Administrative and Operator Web Experience

**Platform:** Angular  
**Priority:** P1

### FE-US-06 — Administrative login

Administrators and operators must be able to securely access the web application.

### FE-US-07 — Vehicle consultation

Authorized users must be able to consult relevant vehicle information.

### FE-US-08 — Appointment consultation

Authorized users must be able to view appointment information required for their responsibilities.

---

# 8. H2 — Operational Expansion Backlog

## EPIC OPS-02 — Service Execution

**Service:** Operational  
**Priority:** P1

### OPS-US-04 — Assign an operator

**As an** administrator  
**I want** to assign an operator to a service  
**So that** the service has a responsible person.

#### Acceptance Criteria

- Authorized users can view available operators.
- An operator can be assigned to an appointment/service.
- Unauthorized users cannot perform assignments.
- The assignment is stored correctly.

---

### OPS-US-05 — View assigned services

**As an** operator  
**I want** to see my assigned services  
**So that** I know which vehicles I must service.

#### Acceptance Criteria

- The operator sees only relevant assigned services.
- Each item displays the required operational information.
- Service status is visible.

---

### OPS-US-06 — Start a service

**As an** operator  
**I want** to mark a service as started  
**So that** the system reflects its current operational state.

#### Acceptance Criteria

- Only authorized operators can start assigned services.
- The status changes according to the defined workflow.
- The change is persisted.

---

### OPS-US-07 — Complete a service

**As an** operator  
**I want** to mark a service as completed  
**So that** the customer and business have an updated service status.

#### Acceptance Criteria

- Only authorized operators can complete assigned services.
- The status changes to the defined completed state.
- The completion is recorded.
- The updated status becomes available to authorized consumers.

---

# 9. H2 — Promotions Backlog

## EPIC COM-03 — Promotions

**Service:** Commercial  
**Priority:** P1

### COM-US-06 — Create a promotion

**As an** administrator  
**I want** to create a promotion  
**So that** I can offer discounts or benefits to customers.

#### Acceptance Criteria

- Authorized administrators can create promotions.
- Required promotion information is validated.
- A promotion can have an activation status.
- Invalid promotion configurations are rejected.

---

### COM-US-07 — Activate or deactivate a promotion

**As an** administrator  
**I want** to activate or deactivate a promotion  
**So that** I can control when it can be used.

#### Acceptance Criteria

- Only authorized users can change promotion status.
- Inactive promotions cannot be applied.
- Active promotions can be evaluated by the booking process.

---

### COM-US-08 — Apply a valid promotion

**As a** customer  
**I want** to apply an eligible promotion  
**So that** I can receive the corresponding benefit.

#### Acceptance Criteria

- The promotion is validated before application.
- Expired or inactive promotions are rejected.
- Eligibility rules are evaluated.
- The resulting price/benefit is calculated according to the configured rules.

---

# 10. H2 — Payments Backlog

## EPIC COM-04 — Payment Management

**Service:** Commercial  
**Priority:** P1

### COM-US-09 — Register a payment

**As a** customer/business process  
**I want** to register a payment  
**So that** the appointment has a corresponding payment record.

#### Acceptance Criteria

- The payment is associated with the correct appointment.
- The payment status is stored.
- Invalid payment information is rejected.
- Authorized users can consult the payment status.

---

### COM-US-10 — Confirm payment status

**As an** administrator  
**I want** to view payment status  
**So that** I can verify whether an appointment has been paid.

#### Acceptance Criteria

- Payment status is displayed clearly.
- The payment is associated with the correct appointment.
- Unauthorized users cannot access restricted payment information.

---

### COM-US-11 — View payment history

**As a** customer  
**I want** to view my payment history  
**So that** I can review previous transactions associated with my services.

#### Acceptance Criteria

- Only the customer's authorized payment history is displayed.
- Each record includes relevant payment information.
- Records are associated with the corresponding service or appointment.

---

# 11. H2 — Cancellation

## EPIC COM-05 — Appointment Cancellation

**Service:** Commercial  
**Priority:** P1

### COM-US-12 — Cancel an appointment

**As a** customer  
**I want** to cancel an appointment  
**So that** I can change my plans when necessary.

#### Acceptance Criteria

- The system verifies that the appointment can be cancelled.
- The cancellation follows the defined business rules.
- The appointment status is updated.
- The operational service receives the necessary state information.

---

# 12. H2 — Administration Backlog

## EPIC SEC-03 — Administrative Security

**Service:** Security  
**Priority:** P1

### SEC-US-06 — Manage users

**As an** administrator  
**I want** to manage users  
**So that** I can maintain platform access.

### SEC-US-07 — Configure roles and permissions

**As an** administrator  
**I want** to configure roles and permissions  
**So that** each user has the appropriate access.

### SEC-US-08 — Review security activity

**As an** administrator  
**I want** to review relevant security activity  
**So that** I can identify important access or security events.

---

# 13. H3 — Evolution Backlog

The following items are candidates for future development and require validation before being prioritized.

## EPIC COM-06 — Notifications

Potential stories:

- Receive appointment confirmation.
- Receive appointment reminders.
- Receive service-status notifications.
- Receive relevant promotion notifications.

**Priority:** P2

---

## EPIC COM-07 — Customer Loyalty

Potential stories:

- View loyalty benefits.
- Accumulate benefits according to defined rules.
- Redeem eligible benefits.

**Priority:** P2

---

## EPIC OPS-03 — Advanced Operational Management

Potential stories:

- View operational dashboards.
- Analyze service duration.
- Monitor operator workload.
- Identify operational bottlenecks.

**Priority:** P2

---

## EPIC COM-08 — Business Analytics

Potential stories:

- View service performance indicators.
- Analyze revenue.
- Analyze promotion performance.
- Review customer retention indicators.

**Priority:** P2

---

## EPIC SYS-01 — External Integrations

Potential stories:

- Integrate notification providers.
- Integrate payment providers.
- Integrate external reporting systems.

**Priority:** P3

These integrations must be evaluated individually based on business value, security, cost, and technical feasibility.

---

# 14. Cross-Service Integration Requirements

The core product depends on communication between services.

The main relationships are:

```text
Security
   │
   │ User Identity / Authorization
   ↓
Operational
   │
   │ Vehicle / Operational Information
   ↓
Commercial
   │
   │ Appointment / Commercial Information
   ↓
Operational
```

The exact communication mechanism is an implementation concern and must be defined consistently with the project's technical architecture.

Business ownership must not be duplicated between services.

---

# 15. Backlog Dependencies

| Backlog Item | Depends On |
|---|---|
| Vehicle registration | User authentication |
| Appointment creation | Authentication + Vehicle + Service |
| Availability | Service + Appointment data |
| Promotion application | Appointment + Promotion rules |
| Payment registration | Appointment |
| Operator assignment | Appointment |
| Service execution | Operator assignment |
| Service completion | Service execution |
| Service history | Completed services |
| Advanced reports | Sufficient operational/commercial data |

---

# 16. MVP Release Candidate

The MVP should contain, at minimum:

### Security

- Registration
- Login
- JWT authentication
- Profile
- Roles
- Permissions

### Operational

- Vehicle registration
- Vehicle consultation
- Vehicle update
- Vehicle-owner association

### Commercial

- Service catalog
- Service details
- Availability
- Appointment creation
- Appointment consultation
- Basic appointment status

### Frontends

- Customer registration/login
- Customer vehicle management
- Customer service catalog
- Customer booking flow
- Basic Angular administrative/operator access

---

# 17. Backlog Refinement Rules

Before a backlog item becomes ready for implementation, it should have:

- Clear user value.
- Defined service ownership.
- Clear acceptance criteria.
- Identified dependencies.
- Appropriate priority.
- Sufficient technical context.
- No unresolved ambiguity that could significantly affect implementation.

Large stories should be divided into smaller stories before implementation.

---

# 18. Definition of Ready

A User Story is considered **Ready** when:

- The story follows a clear user-oriented format.
- The expected behavior is understood.
- Acceptance criteria are defined.
- Dependencies are known.
- The responsible service is identified.
- The scope is small enough to estimate and implement.
- Required design or technical decisions are available.

---

# 19. Definition of Done

A User Story is considered **Done** when:

- Implementation is completed.
- Acceptance criteria are satisfied.
- Required tests pass.
- Security requirements are satisfied.
- The correct service owns the implemented business logic.
- API contracts are updated when necessary.
- Frontend integration is completed when applicable.
- No critical defects remain.
- The functionality is documented when required.

---

# 20. Backlog Traceability

Each implemented story should be traceable through:

```text
Problem
   ↓
User Need
   ↓
Product Vision
   ↓
Roadmap
   ↓
Epic
   ↓
Feature
   ↓
User Story
   ↓
Implementation
   ↓
Test
   ↓
Product Metric
```

This traceability ensures that development work remains connected to a validated product need.

---

# 21. Backlog Governance

The Product Owner or responsible product role should periodically review the backlog.

The backlog may be changed when:

- New discovery evidence becomes available.
- User feedback identifies a new need.
- A feature is no longer valuable.
- Technical constraints change.
- Business priorities change.
- A dependency requires reprioritization.

Changes should always preserve the Product Vision and the defined service boundaries.

---

# 22. Expected Outcome

The Product Backlog provides the development team with a structured path from product strategy to implementation.

The initial priority is to establish a reliable end-to-end vehicle-washing booking flow.

Once the MVP is validated, the backlog expands into operational execution, promotions, payments, and administration.

Future capabilities such as notifications, loyalty, analytics, automation, and integrations remain intentionally dependent on evidence and validation.