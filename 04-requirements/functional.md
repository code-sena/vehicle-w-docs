# Functional Requirements (RF)

---
## Auth (auth-service)
 
| ID | Module | Description | Source | Priority |
|----|--------|-------------|--------|----------|
| RF-001 | auth-service | The system must let a customer sign up with name, phone, address, email and password | HU-AUTH-001 | Must Have |
| RF-002 | auth-service | The system must let a user log in with email and password, redirecting according to their role | HU-AUTH-002 | Must Have |
| RF-003 | auth-service | The system must let a user recover their password via a link sent to their registered email | HU-AUTH-003 | Should Have |
| RF-004 | auth-service | The system must let an authenticated user change their password after validating the current one | HU-AUTH-004 | Should Have |
| RF-004b | auth-service | The system must lock an account temporarily after repeated failed login attempts | HU-AUTH-002 | Must Have |
 
## Booking (booking-service)
 
| ID | Module | Description | Source | Priority |
|----|--------|-------------|--------|----------|
| RF-005 | booking-service | The system must let a customer request a service by selecting branch, date, time and wash type | HU-BOOK-001 | Must Have |
| RF-006 | booking-service | The system must validate slot availability and suggest alternative times if the requested slot is taken | HU-BOOK-001 | Must Have |
| RF-007 | booking-service | The system must let a customer modify or cancel a booking before the service starts; cancellation must be blocked once the service is in progress | HU-BOOK-002 | Must Have |
| RF-008 | booking-service | The system must automatically assign an available operator to a booking based on operator availability at the branch | HU-BOOK-003 | Must Have |
| RF-009 | booking-service | The Administrator must be able to manually assign or reassign an operator to a booking; assignment must be blocked if the chosen operator is unavailable | HU-BOOK-006 | Should Have |
| RF-010 | booking-service | The customer must be able to manually choose an operator from the list of operators available at the branch | HU-BOOK-004 | Should Have |
| RF-011 | booking-service | An operator must be able to view their assigned bookings with customer and branch details | HU-BOOK-007 | Must Have |
| RF-012 | booking-service | A customer must be able to rate and comment on a service only after it has been completed | HU-BOOK-005 | Should Have |
| RF-012b | booking-service | An operator must be able to update the status of a service assigned to them (started, completed); the action must be blocked for bookings assigned to another operator | HU-BOOK-007 | Must Have |
 
## Payments (payment-service)
 
| ID | Module | Description | Source | Priority |
|----|--------|-------------|--------|----------|
| RF-013 | payment-service | The system must let a customer pay for a booking online via Nequi, card or PSE, through Wompi | HU-PAY-001 | Must Have |
| RF-014 | payment-service | The system must record each transaction and link it to its corresponding booking | HU-PAY-001 | Must Have |
| RF-015 | payment-service | The system must show the customer a payment history ordered by date and service | HU-PAY-002 | Should Have |
| RF-016 | payment-service | The system must not store raw card data — sensitive payment data is handled entirely by Wompi | HU-PAY-001 | Must Have |
 
## Frontend (role-based dashboard and preferences)
 
| ID | Module | Description | Source | Priority |
|----|--------|-------------|--------|----------|
| RF-017 | Frontend only | The system must show a role-based dashboard with summary metrics and quick actions | HU-UI-001 | Should Have |
| RF-018 | Frontend only | The system must notify users of relevant events (booking created, status change, payment, assignment), tracking read/unread state | HU-UI-002 | Should Have |
| RF-019 | Frontend only | The system must let a user customise the visual theme and persist it as a preference | HU-UI-003 | Could Have |
| RF-020 | Frontend only | The system must let a user switch the interface language among the four supported languages (Spanish, English, French, Portuguese) | HU-UI-003 | Could Have |
 
## Administration (admin-service)
 
| ID | Module | Description | Source | Priority |
|----|--------|-------------|--------|----------|
| RF-021 | admin-service | The Administrator must be able to create, edit or deactivate branches | HU-ADMIN-001 | Should Have |
| RF-022 | admin-service | An operator must be able to register their availability, and the Administrator must be able to view/adjust it | HU-ADMIN-001 | Should Have |
| RF-023 | admin-service | The system must generate operational reports: services performed, revenue, average rating and performance per branch/operator | HU-ADMIN-001 | Should Have |
 
## Promotions and loyalty (module TBD — payment-service or a dedicated promotion-service)
 
| ID | Module | Description | Source | Priority |
|----|--------|-------------|--------|----------|
| RF-024 | TBD | The Administrator must be able to create, edit or deactivate promotions and discounts | HU-PROMO-001 | Should Have |
| RF-025 | TBD | A customer must be able to apply a valid promotion code at payment time; the system must notify them if the promotion is expired or not applicable | HU-PROMO-002 | Could Have |
| RF-026 | TBD | A customer must be able to accumulate loyalty points per completed service and redeem them for discounts | HU-PROMO-002 | Could Have |