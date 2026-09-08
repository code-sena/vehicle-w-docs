# Product Backlog Template — Vehicle Washing

## 1. Epic

**Epic ID:**  
**Epic Name:**  
**Service:**  
**Roadmap Horizon:**  
**Priority:**  
**Description:**

---

## 2. User Story

**Story ID:**  

**As a** [user role]

**I want** [capability]

**So that** [benefit/value]

---

## 3. Business Value

Describe the value that the story provides to:

- Customer.
- Operator.
- Administrator.
- Business.

---

## 4. Acceptance Criteria

### AC-01

**Given** [initial condition]

**When** [action]

**Then** [expected result]

### AC-02

**Given** [initial condition]

**When** [action]

**Then** [expected result]

---

## 5. Service Ownership

**Responsible Service:** Security / Operational / Commercial

**Reason:**

Describe why the selected service owns the business capability.

---

## 6. Dependencies

**Depends on:**

- [Dependency]

**Required by:**

- [Dependent functionality]

---

## 7. Frontend

**Platform:**

- Angular
- React Native / Expo

**Required screens/components:**

- [Screen/component]

---

## 8. Priority

| Priority | Definition |
|---|---|
| P0 | Critical for the core product flow |
| P1 | High business/product value |
| P2 | Medium priority |
| P3 | Future or optional |

---

## 9. Definition of Ready

The story is ready when:

- User value is clear.
- Service ownership is defined.
- Acceptance criteria are defined.
- Dependencies are identified.
- Scope is understandable.
- Required technical context is available.

---

## 10. Definition of Done

The story is done when:

- Implementation is completed.
- Acceptance criteria are satisfied.
- Required tests pass.
- Security requirements are satisfied.
- Business logic belongs to the correct service.
- Required API contracts are updated.
- Frontend integration is completed when applicable.
- No critical defects remain.

---

## 11. Traceability

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
User Story
   ↓
Acceptance Criteria
   ↓
Implementation
   ↓
Test
   ↓
Metric
```

---

## 12. Example — Vehicle Washing

### Epic

**Epic ID:** COM-02  
**Epic Name:** Appointment Management  
**Service:** Commercial  
**Roadmap Horizon:** H1 — MVP  
**Priority:** P0

### User Story

**Story ID:** COM-US-04

**As a** customer

**I want** to create an appointment for my vehicle

**So that** I can schedule a vehicle-washing service.

### Acceptance Criteria

- The customer must be authenticated.
- The customer must have a registered vehicle.
- The customer must select an available service.
- The customer must select an available date and time.
- The system must validate availability.
- The appointment must be associated with the correct customer and vehicle.
- The appointment must be stored successfully.
- The customer must receive a confirmation.

### Service Ownership

**Responsible Service:** Commercial

The appointment is a commercial capability and therefore belongs to the Commercial Service.

The vehicle information remains owned by the Operational Service.

### Dependencies

- Security authentication.
- Customer vehicle.
- Service catalog.
- Availability.

### Frontend

**React Native / Expo**

Required screens:

- Service selection.
- Date and time selection.
- Appointment confirmation.

**Angular**

Required screens:

- Appointment consultation.
- Administrative/operational appointment view.