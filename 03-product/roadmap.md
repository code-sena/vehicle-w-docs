# Product Roadmap — Vehicle Washing

## 1. Purpose

The product roadmap defines the planned evolution of Vehicle Washing from the initial MVP to future improvements.

It translates the Product Vision into concrete product horizons while maintaining clear ownership between the Security, Operational, and Commercial services.

The roadmap is a planning tool, not a fixed implementation schedule. Priorities may change based on user feedback, validation results, technical constraints, and business needs.

---

## 2. Roadmap Principles

The roadmap follows these principles:

1. **Deliver customer value early**  
   The first horizon must provide a complete and usable vehicle-washing flow.

2. **Respect service ownership**  
   Each capability must remain within the service responsible for its business domain.

3. **Build the core flow before advanced features**  
   Authentication, vehicles, services, appointments, and basic operational tracking have priority over secondary features.

4. **Validate before expanding**  
   Features with high uncertainty should be validated before receiving significant development effort.

5. **Avoid unnecessary scope**  
   Features outside the MVP should not be added unless evidence demonstrates their value.

6. **Keep the architecture scalable**  
   New capabilities must integrate with existing services without recreating a monolithic domain.

---

# 3. Roadmap at a Glance

| Horizon | Focus | Main Outcome |
|---|---|---|
| H1 — MVP | Core vehicle washing flow | Users can register, manage vehicles, browse services, and create appointments |
| H2 — Expansion | Operational management, promotions, and payments | The business can manage service execution, promotions, and payment status |
| H3 — Evolution | Automation, analytics, loyalty, and integrations | The platform becomes more mature and scalable based on validated needs |

---

# 4. H1 — MVP

## Objective

Deliver the minimum end-to-end product capable of supporting the fundamental vehicle-washing process.

The MVP must allow a customer to authenticate, register a vehicle, select a service, check availability, and create an appointment.

The architecture must already respect the separation between Security, Operational, and Commercial responsibilities.

---

## 4.1 Security Service

### Planned capabilities

- User registration
- User login
- Authentication using JWT
- User profile management
- Role management
- Permission management
- Basic authorization
- Administrative access control

### Expected outcome

Users can securely access the platform and receive the permissions associated with their roles.

---

## 4.2 Operational Service

### Planned capabilities

- Vehicle registration
- Vehicle listing
- Vehicle detail consultation
- Vehicle information update
- Vehicle-owner association
- Basic vehicle availability information
- Initial operational data required by the appointment process

### Expected outcome

The platform can maintain reliable information about customer vehicles and associate each vehicle with its owner.

---

## 4.3 Commercial Service

### Planned capabilities

- Service catalog
- Service detail consultation
- Service price
- Estimated service duration
- Appointment creation
- Appointment consultation
- Availability consultation
- Basic appointment status
- Appointment information required by the operational process

### Expected outcome

Customers can select a vehicle-washing service and schedule an appointment through the platform.

---

## 4.4 Angular Web Application

The Angular application will initially focus on administrative and operational users.

### Planned capabilities

- Login
- User administration
- Basic role/permission management
- Vehicle consultation
- Service consultation
- Appointment consultation
- Basic operational views

---

## 4.5 React Native / Expo Mobile Application

The mobile application will focus on the customer experience.

### Planned capabilities

- Customer registration
- Login
- Profile
- Vehicle registration
- Vehicle consultation
- Service catalog
- Service details
- Appointment creation
- Appointment consultation

---

## 4.6 H1 Core Flow

The MVP must support the following end-to-end flow:

```text
User
  ↓
Security Service
  ↓
Vehicle
  ↓
Operational Service
  ↓
Service Selection
  ↓
Commercial Service
  ↓
Appointment
  ↓
Operational Coordination
  ↓
Appointment Confirmation
```

---

## 4.7 H1 Dependencies

The main dependencies are:

```text
Security
   ↓
Operational
   ↓
Commercial
```

Authentication and user identity must be available before protected operational and commercial capabilities can be fully used.

Vehicle information must be available before an appointment can be associated with a specific vehicle.

Service and availability information must be available before the customer can create an appointment.

---

## 4.8 H1 Success Criteria

The MVP is considered successful when:

- A user can register and authenticate.
- A user can register a vehicle.
- A user can browse available services.
- A user can view service price and duration.
- A user can check appointment availability.
- A user can create an appointment.
- The appointment is correctly associated with the user, vehicle, and selected service.
- The main flow can be completed without manual intervention.
- Security, Operational, and Commercial responsibilities remain separated.

---

# 5. H2 — Expansion

## Objective

Expand the MVP into a more complete operational and commercial platform.

This horizon focuses on the capabilities required to actually manage service execution, promotions, and payments.

---

# 5.1 Operational Management

### Planned capabilities

- Operator assignment
- Service execution queue
- Service status management
- Service start
- Service completion
- Operational appointment tracking
- Cancellation synchronization
- Service history
- Operational status updates

### Expected outcome

Operators can clearly understand which services must be performed, their current status, and the vehicles associated with them.

---

# 5.2 Commercial Expansion

### Planned capabilities

- Promotions CRUD
- Promotion activation/deactivation
- Promotion validation
- Promotion application
- Payment registration
- Payment confirmation
- Payment status
- Payment history
- Appointment cancellation management

### Expected outcome

Customers can receive applicable promotions and have their payments recorded and tracked through the platform.

---

# 5.3 Security Expansion

### Planned capabilities

- Administrative user management
- More detailed role configuration
- More granular permissions
- Access control improvements
- Security audit capabilities

### Expected outcome

Administrators can manage users and permissions with greater control.

---

# 5.4 Angular Expansion

The Angular application will evolve toward complete administrative and operator workflows.

### Operator capabilities

- Assigned services
- Service queue
- Vehicle information
- Service status
- Service execution
- Service completion

### Administrator capabilities

- User management
- Roles
- Permissions
- Services
- Promotions
- Appointment monitoring
- Payment status

---

# 5.5 React Native / Expo Expansion

The mobile application will provide additional customer capabilities.

### Planned capabilities

- Appointment history
- Promotion visualization
- Promotion application
- Payment status
- Service status
- Service history
- Cancellation
- Improved customer experience

---

# 5.6 H2 Core Flow

The expanded flow becomes:

```text
Authentication
     ↓
Vehicle
     ↓
Service Selection
     ↓
Appointment
     ↓
Availability Validation
     ↓
Promotion (Optional)
     ↓
Payment
     ↓
Operator Assignment
     ↓
Service Execution
     ↓
Service Completion
     ↓
Service History
```

---

# 5.7 H2 Success Criteria

The expansion is considered successful when:

- Operators can manage assigned services.
- Service status can be updated digitally.
- Appointment cancellations are reflected operationally.
- Promotions can be created and applied according to defined rules.
- Payment status can be recorded and consulted.
- Customers can review relevant appointment and service information.
- Administrative users can manage access with greater granularity.
- The platform reduces dependence on manual coordination.

---

# 6. H3 — Evolution

## Objective

Improve the platform based on real usage, validated customer needs, and operational evidence.

H3 contains capabilities with greater uncertainty and therefore should be implemented only after the MVP and expansion have generated sufficient evidence.

---

## 6.1 Customer Experience

Potential capabilities:

- Notifications
- Appointment reminders
- Advanced service history
- Customer loyalty features
- Improved booking experience
- Personalized but rule-based customer benefits

---

## 6.2 Operational Improvements

Potential capabilities:

- Process automation
- Advanced operational dashboards
- Performance indicators
- Operator productivity metrics
- Service-time analysis
- Improved workload management

---

## 6.3 Commercial Improvements

Potential capabilities:

- Advanced reports
- Revenue indicators
- Promotion performance analysis
- Customer retention analysis
- Additional payment capabilities
- Business performance indicators

---

## 6.4 Integrations

Potential future integrations may include:

- Notification providers
- Payment providers
- External reporting systems
- Other business systems

External integrations must be evaluated according to business value, technical complexity, security, and maintenance cost.

---

## 6.5 New Service Types

The platform may eventually support additional vehicle-washing or detailing services.

Examples may include:

- Additional washing packages
- Interior cleaning
- Exterior detailing
- Specialized cleaning services

New services should be introduced without violating existing service boundaries.

---

# 7. Features Intentionally Deferred

The following capabilities are outside the current roadmap unless future evidence justifies their inclusion:

- Mechanical repair management
- Vehicle sales
- Fuel management
- Insurance management
- Advanced fleet management
- Real-time GPS tracking
- AI-based recommendations
- Multi-business marketplace
- International expansion
- Advanced business intelligence
- Unnecessary third-party integrations

These items should not compete with MVP priorities.

---

# 8. Prioritization Framework

When deciding whether a feature should enter the roadmap, the team evaluates:

| Criterion | Question |
|---|---|
| User value | Does the feature solve a real user problem? |
| Business value | Does it contribute to the business objective? |
| Evidence | Is there enough evidence supporting the need? |
| Technical feasibility | Can it be implemented within the current architecture? |
| Service ownership | Is the capability assigned to the correct service? |
| Dependency | Does it require another capability to exist first? |
| Complexity | Is the effort proportional to the expected value? |
| MVP relevance | Is it necessary for the core product flow? |

---

# 9. Roadmap Milestones

| Milestone | Main Deliverables | Expected Result |
|---|---|---|
| M1 — Foundation | Security, initial databases, project structure, basic frontends | Technical foundation |
| M2 — Core Product | Vehicles, services, availability, appointments | Functional MVP |
| M3 — Operational Expansion | Assignment, execution, statuses, history | Digital operational management |
| M4 — Commercial Expansion | Promotions, payments, cancellation | Complete commercial flow |
| M5 — Evolution | Notifications, reports, loyalty, automation | Mature product capabilities |

---

# 10. Roadmap and Product Backlog Relationship

The roadmap defines **when and why** major capabilities are prioritized.

The Product Backlog defines **what must be built** to deliver those capabilities.

The relationship is:

```text
Product Vision
      ↓
Strategic Pillars
      ↓
Roadmap Horizons
      ↓
Epics
      ↓
Features
      ↓
User Stories
      ↓
Tasks
      ↓
Implementation
      ↓
Testing
      ↓
Product Metrics
```

The roadmap should therefore remain at a higher level than the Product Backlog.

---

# 11. Roadmap Traceability

| Product Need | Roadmap Horizon | Service |
|---|---|---|
| Secure access | H1 | Security |
| User management | H1/H2 | Security |
| Vehicle management | H1 | Operational |
| Service catalog | H1 | Commercial |
| Appointment management | H1 | Commercial |
| Operational assignment | H2 | Operational |
| Service execution | H2 | Operational |
| Promotions | H2 | Commercial |
| Payments | H2 | Commercial |
| Advanced history | H3 | Operational/Commercial |
| Notifications | H3 | Commercial |
| Reports and KPIs | H3 | Commercial/Operational |
| Automation | H3 | Cross-service |

---

# 12. Definition of Done by Horizon

## H1 — MVP

The MVP is done when the core customer journey can be completed successfully from authentication to appointment creation.

## H2 — Expansion

The expansion is done when the business can manage service execution, promotions, and payment status digitally.

## H3 — Evolution

An evolution feature is done when it has:

- A validated user or business need.
- A defined owner.
- Clear acceptance criteria.
- Appropriate security controls.
- Tests.
- Monitoring or measurable success criteria when applicable.
- No unnecessary duplication of business logic.

---

# 13. Roadmap Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Scope expansion | Delays MVP | Maintain strict scope boundaries |
| Unvalidated features | Low product value | Validate before prioritizing |
| Service coupling | Architectural problems | Respect service ownership |
| Manual processes remain | Low adoption | Prioritize end-to-end digital flows |
| Payment complexity | Delayed H2 | Start with controlled payment status management |
| Poor data synchronization | Double booking or inconsistent information | Define clear contracts between services |
| Excessive frontend scope | Delayed delivery | Prioritize core user journeys |

---

# 14. Roadmap Governance

The roadmap should be reviewed periodically.

Changes should be based on:

- User feedback
- Discovery findings
- Product metrics
- Operational results
- Technical constraints
- Security requirements
- Business priorities

A feature should not be added simply because it is technically interesting.

Each major roadmap change should preserve the Product Vision and the defined service boundaries.

---

# 15. Expected Outcome

By following this roadmap, Vehicle Washing should evolve progressively from a functional MVP into a reliable digital platform for managing vehicle-washing services.

The product will first establish the core customer journey, then strengthen operational and commercial management, and finally introduce advanced capabilities based on validated needs.

The roadmap maintains a clear principle:

> **Build the essential flow first, expand based on evidence, and evolve without losing simplicity or architectural boundaries.**