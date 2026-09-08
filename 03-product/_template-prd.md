# Product Requirements Document — Vehicle Washing

## 1. Product Information

**Product:** Vehicle Washing  
**Document:** Product Requirements Document  
**Status:** Draft  
**Version:** 1.0

---

## 2. Product Overview

Vehicle Washing is a digital platform designed to manage vehicle washing services through three independent microservices:

- Security Service
- Operational Service
- Commercial Service

The platform provides different experiences according to the user role.

**Angular Web Application**
- Administrators
- Operators

**React Native / Expo Mobile Application**
- Customers

---

## 3. Problem

Customers and vehicle-washing businesses may rely on manual channels such as phone calls, messaging applications, or in-person communication to request, schedule, manage, and track vehicle-washing services.

This can generate fragmented information, scheduling difficulties, limited visibility of service status, and inefficient administrative processes.

Vehicle Washing aims to centralize this process through a digital platform.

---

## 4. Product Goal

Provide a simple and organized digital experience that allows customers to manage vehicles, consult services, schedule appointments, apply promotions, manage payments, and review service information.

At the same time, the platform should help operators and administrators manage the operational and commercial processes of the business.

---

## 5. Target Users

### Customer

Needs to:

- Register and authenticate.
- Manage vehicles.
- Browse services.
- Check availability.
- Schedule appointments.
- Apply available promotions.
- Review payments.
- Track service information.
- Review service history.

### Operator

Needs to:

- View assigned services.
- Consult vehicle information.
- Update service status.
- Execute services.
- Complete services.

### Administrator

Needs to:

- Manage users.
- Manage roles and permissions.
- Manage services.
- Manage promotions.
- Monitor appointments.
- Review operational and commercial information.

---

## 6. Functional Requirements

### Security

- User registration.
- User authentication.
- JWT-based authorization.
- Profile management.
- Role management.
- Permission management.
- User administration.

### Operational

- Vehicle registration.
- Vehicle consultation.
- Vehicle update.
- Vehicle-owner association.
- Operator assignment.
- Service execution.
- Service status management.
- Service completion.
- Service history.

### Commercial

- Service catalog.
- Service details.
- Pricing.
- Service duration.
- Availability.
- Appointment creation.
- Appointment consultation.
- Appointment cancellation.
- Promotions.
- Payments.
- Payment status.
- Payment history.

---

## 7. Non-Functional Requirements

### Security

The system must protect authentication, authorization, personal information, and restricted operations.

### Performance

Core operations such as authentication, vehicle consultation, service consultation, and appointment creation should respond within acceptable time limits.

### Availability

The platform should remain available for the main customer and business workflows.

### Maintainability

Each service must maintain clear domain responsibilities and avoid unnecessary duplication of business logic.

### Scalability

The architecture should allow each service to evolve independently.

### Usability

The customer booking process should be simple and understandable.

---

## 8. Core User Flow

```text
Customer
   ↓
Authentication
   ↓
Vehicle
   ↓
Service Selection
   ↓
Availability
   ↓
Appointment
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
History
```

---

## 9. Service Ownership

| Capability | Owner |
|---|---|
| Identity | Security |
| Authentication | Security |
| Authorization | Security |
| Vehicles | Operational |
| Service execution | Operational |
| Operators | Operational |
| Service catalog | Commercial |
| Appointments | Commercial |
| Promotions | Commercial |
| Payments | Commercial |

---

## 10. MVP Scope

The MVP includes:

- Registration.
- Login.
- Authentication.
- Profile.
- Roles and permissions.
- Vehicle management.
- Service catalog.
- Service details.
- Availability.
- Appointment creation.
- Appointment consultation.
- Basic Angular administration.
- Basic React Native customer experience.

---

## 11. Out of Scope

The following are outside the initial product scope:

- Mechanical repair.
- Vehicle sales.
- Fuel management.
- Insurance.
- Advanced fleet management.
- Real-time GPS.
- AI recommendations.
- Multi-business marketplace.
- International expansion.
- Advanced BI.
- Unnecessary external integrations.

---

## 12. Success Metrics

### North Star Metric

Percentage of customers who successfully complete a vehicle-washing service through the platform end-to-end.

### Supporting Metrics

- Successful appointment creation.
- Completed appointments.
- Digital operational service tracking.
- Correct payment processing.
- Double-booking rate.
- Returning customers.

---

## 13. Acceptance Criteria

A product increment is accepted when:

- The defined functionality works according to its requirements.
- Acceptance criteria are satisfied.
- Required security controls are implemented.
- Required tests pass.
- The correct service owns the business logic.
- The functionality does not introduce critical defects.

---

## 14. Traceability

```text
Problem
 ↓
User Need
 ↓
Product Vision
 ↓
Roadmap
 ↓
Product Backlog
 ↓
User Story
 ↓
Implementation
 ↓
Testing
 ↓
Metrics
```