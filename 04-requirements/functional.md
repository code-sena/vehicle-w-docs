# Functional Requirements (RF)

---
## Auth (security)
 
| ID | Module | Description | Source | Priority |
|----|--------|-------------|--------|----------|
| RF-001 | security | The system must let a customer sign up with name, phone, address, email and password | HU-AUTH-001 | Must Have |
| RF-002 | security | The system must let a user log in with email and password, redirecting according to their role | HU-AUTH-002 | Must Have |
| RF-003 | security | The system must let a user recover their password via a link sent to their registered email | HU-AUTH-003 | Should Have |
| RF-004 | security | The system must let an authenticated user change their password after validating the current one | HU-AUTH-004 | Should Have |
| RF-004b | security | The system must lock an account temporarily after repeated failed login attempts | HU-AUTH-002 | Must Have |
 
## Booking & Operations (reserve, execution)
 
| ID | Module | Description | Source | Priority |
|----|--------|-------------|--------|----------|
| RF-005 | reserve | The system must let a customer request a service by selecting date, time and wash type | HU-BOOK-001 | Must Have |
| RF-006 | reserve | The system must validate slot availability and suggest alternative times if the requested slot is taken | HU-BOOK-001 | Must Have |
| RF-007 | reserve | The system must let a customer modify or cancel a booking before the service starts; cancellation must be blocked once the service is in progress | HU-BOOK-002 | Must Have |
| RF-008 | execution | The system must automatically assign an available operator to a booking based on operator availability | HU-BOOK-003 | Must Have |
| RF-009 | execution | The Administrator must be able to manually assign or reassign an operator to a booking; assignment must be blocked if the chosen operator is unavailable | HU-BOOK-006 | Should Have |
| RF-010 | execution | The customer must be able to manually choose an operator from the list of available operators | HU-BOOK-004 | Should Have |
| RF-011 | execution | An operator must be able to view their assigned bookings with customer and vehicle details | HU-BOOK-007 | Must Have |
| RF-012 | execution | A customer must be able to rate and comment on a service only after it has been completed | HU-BOOK-005 | Should Have |
| RF-012b | execution | An operator must be able to update the status of a service assigned to them (started, completed); the action must be blocked for bookings assigned to another operator | HU-BOOK-007 | Must Have |
 
## Payments (payment)

> Cash is a payment method too, but it has no QR and needs no receipt (`requires_receipt = 0`
> in `payment.payment_method_type`, per `MODELO-DE-DATOS.md` §12) — the Administrator
> confirms it directly. Only the digital methods (Nequi, Daviplata, bank transfer) go
> through the QR + receipt-upload flow.
 
| ID | Module | Description | Source | Priority |
|----|--------|-------------|--------|----------|
| RF-013 | payment | The system must show the customer the shop's payment methods (cash, Nequi, Daviplata, bank transfer) and, for each digital method, its QR code and account instructions — cash shows no QR | HU-PAY-001 | Must Have |
| RF-013b | payment | For a digital payment method, the system must let the customer upload a payment receipt with the declared amount and transaction reference; cash needs no receipt | HU-PAY-001 | Must Have |
| RF-014 | payment | The Administrator must be able to review a pending payment — comparing the receipt's declared amount against the amount due for a digital method, or confirming a cash payment directly — and approve or reject it | HU-PAY-003 | Must Have |
| RF-015 | payment | The system must show the customer a payment history ordered by date and service | HU-PAY-002 | Should Have |
| RF-016 | payment | The system must not collect or store card data, and must reject a receipt whose transaction reference was already used on a different approved payment | HU-PAY-001 | Must Have |
 
## Frontend (role-based dashboard and preferences)
 
| ID | Module | Description | Source | Priority |
|----|--------|-------------|--------|----------|
| RF-017 | Frontend only | The system must show a role-based dashboard with summary metrics and quick actions | HU-UI-001 | Should Have |
| RF-018 | notification | The system must notify users of relevant events (booking created, status change, payment, assignment), tracking read/unread state | HU-UI-002 | Should Have |
| RF-019 | settings | The system must let a user customise the visual theme and persist it as a preference | HU-UI-003 | Could Have |
| RF-020 | settings | The system must let a user switch the interface language among the four supported languages (Spanish, English, French, Portuguese) | HU-UI-003 | Could Have |
 
## Administration (reserve, execution)
 
| ID | Module | Description | Source | Priority |
|----|--------|-------------|--------|----------|
| RF-021 | reserve | The Administrator must be able to configure the shop's business hours and register exceptions (holidays, special hours) | HU-ADMIN-001 | Should Have |
| RF-022 | execution | An operator must be able to register their availability, and the Administrator must be able to view/adjust it | HU-ADMIN-001 | Should Have |
| RF-023 | reserve, execution, payment | The system must generate operational reports: services performed, revenue, average rating and performance per operator | HU-ADMIN-001 | Should Have |
 
## Promotions and loyalty (promotion, customer)
 
| ID | Module | Description | Source | Priority |
|----|--------|-------------|--------|----------|
| RF-024 | promotion | The Administrator must be able to create, edit or deactivate promotions and discounts | HU-PROMO-001 | Should Have |
| RF-025 | promotion | A customer must be able to apply a valid promotion code at payment time; the system must notify them if the promotion is expired or not applicable | HU-PROMO-002 | Could Have |
| RF-026 | customer | A customer must be able to accumulate loyalty points per completed service and redeem them for discounts | HU-PROMO-002 | Could Have |