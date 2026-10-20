# Functional Requirements (RF)

---
## Auth (`security-service`)
 
| ID | Service | Description | Source | Priority |
|----|--------|-------------|--------|----------|
| RF-001 | `security-service` | The system must let a customer sign up with document number, first name, last name, phone, email and password | HU-AUTH-001 | Must Have |
| RF-002 | `security-service` | The system must let a user log in with email and password, redirecting according to their role | HU-AUTH-002 | Must Have |
| RF-003 | `security-service` | The system must let a user recover their password with a 6-digit code sent to their registered email, valid for 15 minutes and for 5 attempts, without revealing whether the email is registered | HU-AUTH-003 | Should Have |
| RF-004 | `security-service` | The system must let an authenticated user change their password after validating the current one | HU-AUTH-004 | Should Have |
| RF-004b | `security-service` | The system must lock an account for 15 minutes after 5 failed login attempts within 15 minutes | HU-AUTH-002 | Must Have |
 
## Booking & Operations (`booking-service`, `operations-service`)
 
| ID | Service | Description | Source | Priority |
|----|--------|-------------|--------|----------|
| RF-005 | `booking-service` | The system must let a customer request a service by selecting date, time and wash type | HU-BOOK-001 | Must Have |
| RF-006 | `booking-service` | The system must validate slot availability and suggest alternative times if the requested slot is taken | HU-BOOK-001 | Must Have |
| RF-007 | `booking-service` | The system must let a customer cancel a booking before its start time (no reason is asked; the booking stores `CUSTOMER_REQUEST`) and let the Administrator reschedule it; both actions are blocked once the service is in progress | HU-BOOK-002 | Must Have |
| RF-008 | `operations-service` | The system must automatically assign an available operator to a booking based on operator availability | HU-BOOK-003 | Must Have |
| RF-009 | `operations-service` | The Administrator must be able to manually assign or reassign an operator to a booking; assignment must be blocked if the chosen operator is unavailable | HU-BOOK-006 | Should Have |
| RF-010 | `operations-service` | The customer must be able to manually choose an operator from the list of available operators | HU-BOOK-004 | Should Have |
| RF-011 | `operations-service` | An operator must be able to view their assigned bookings with customer and vehicle details | HU-BOOK-007 | Must Have |
| RF-012 | `operations-service` | A customer may optionally rate (1–5) and comment on their own booking, once, and only after it has been completed; the rating is stored on every line of the booking | HU-BOOK-005 | Should Have |
| RF-012b | `operations-service` | An operator must be able to update the status of a service assigned to them (started, completed); the action must be blocked for bookings assigned to another operator | HU-BOOK-007 | Must Have |
 
## Payments (`payment-service`)

> Cash is a payment method too, but it has no QR and needs no receipt (`requires_receipt = 0`
> in `payment.payment_method_type`, per `MODELO-DE-DATOS.md` §12) — the Administrator
> confirms it directly. Only the digital methods (Nequi, Daviplata, bank transfer) go
> through the QR + receipt-upload flow.
 
| ID | Service | Description | Source | Priority |
|----|--------|-------------|--------|----------|
| RF-013 | `payment-service` | The system must show the customer the shop's payment methods (cash, Nequi, Daviplata, bank transfer) and, for each digital method, its QR code and account instructions — cash shows no QR | HU-PAY-001 | Must Have |
| RF-013b | `payment-service` | For a digital payment method, the system must let the customer upload a payment receipt with the declared amount and transaction reference; cash needs no receipt | HU-PAY-001 | Must Have |
| RF-014 | `payment-service` | The Administrator must be able to review a pending payment — comparing the receipt's declared amount against the amount due for a digital method, or confirming a cash payment directly — and approve or reject it | HU-PAY-003 | Must Have |
| RF-015 | `payment-service` | The system must show the customer a payment history ordered by date and service | HU-PAY-002 | Should Have |
| RF-016 | `payment-service` | The system must not collect or store card data, and must reject a receipt whose transaction reference was already used on a different approved payment | HU-PAY-001 | Must Have |
 
## Frontend (role-based dashboard and preferences)
 
| ID | Service | Description | Source | Priority |
|----|--------|-------------|--------|----------|
| RF-017 | Frontend only | The system must show a role-based dashboard with summary metrics and quick actions | HU-UI-001 | Should Have |
| RF-018 | `notification-service` | The system must notify users of relevant events (booking created, status change, payment, assignment), tracking read/unread state | HU-UI-002 | Should Have |
| RF-019 | `security-service` | The system must let a user customise the visual theme (palette) and persist it **per account**: each user (each email) keeps their own theme, and signing in with another account on the same device shows that account's theme, not the previous one | HU-UI-003 | Could Have |
| RF-020 | `security-service` | The system must let a user switch the interface language among the four supported languages (Spanish, English, French, Portuguese) and persist it **per account**, with the same rule as RF-019 | HU-UI-003 | Could Have |
 
## Administration (`booking-service`, `operations-service`, `payment-service`)
 
| ID | Service | Description | Source | Priority |
|----|--------|-------------|--------|----------|
| RF-021 | `booking-service` | The Administrator must be able to configure the shop's business hours and register exceptions (holidays, special hours) | HU-ADMIN-001 | Should Have |
| RF-022 | `operations-service` | The Administrator must be able to register and adjust each operator's weekly shift and absences and activate or deactivate operators; the operator can view their own schedule | HU-ADMIN-001 | Should Have |
| RF-023 | `booking-service`, `operations-service`, `payment-service` | The system must generate operational reports: services performed, revenue, average rating and performance per operator | HU-ADMIN-001 | Should Have |
 
## Promotions and loyalty (`payment-service`)
 
| ID | Service | Description | Source | Priority |
|----|--------|-------------|--------|----------|
| RF-024 | `payment-service` | The Administrator must be able to create, edit or deactivate promotions and discounts | HU-PROMO-001 | Should Have |
| RF-025 | `payment-service` | A customer must be able to apply a valid promotion code at payment time; the system must notify them if the promotion is expired or not applicable | HU-PROMO-002 | Could Have |
| RF-026 | `payment-service` | A customer must accumulate loyalty points for each paid service (credited when the payment is approved); the balance unlocks promotions without the points being spent | HU-PROMO-002 | Could Have |

## Requirements added after the stories (RF-027 to RF-038)

These requirements describe functions that were built before a story was written for them. They
are stated in the SRS (`lavarapido-docs`, section 5) and still need their user stories.

| ID | Service | Description | Priority |
|----|--------|-------------|----------|
| RF-027 | `security-service` | The user can view and update their profile and contact address, change their email, log out and deactivate their own account (with the current password); an administrator cannot deactivate their own account | Should Have |
| RF-028 | `security-service` | The Administrator can list users with their registration date, create operator and administrator accounts, and activate or deactivate accounts. The role is set when the account is created and is not changed later; an administrator account cannot be deactivated | Should Have |
| RF-029 | `security-service` | Three fixed roles (administrator, operator, customer) with a permission matrix the Administrator can view and edit; the matrix is informative and authorization uses the role in the JWT (ADR-015) | Could Have |
| RF-030 | `customer-service` | The customer registers, views, edits and removes their vehicles (plate and vehicle type) | Must Have |
| RF-031 | `booking-service` | The Administrator manages the service catalog with price and duration per vehicle type and loyalty points | Must Have |
| RF-032 | `booking-service` | The Administrator manages the wash bays; only active bays are used for new bookings | Must Have |
| RF-033 | `booking-service` | The Administrator views all bookings by date range, changes their status (confirm, cancel with a reason, no-show) and reschedules them, following the booking life cycle | Should Have |
| RF-034 | `payment-service` | The Administrator manages the shop's payment accounts (holder, number, QR image, instructions); only active accounts are shown to the customer | Must Have |
| RF-035 | `payment-service` | The Administrator can mark an approved payment as refunded (`payment.refunded`) | Could Have |
| RF-036 | `operations-service` | The Administrator records a vehicle inspection report (five phases, findings with up to 5 photos) for bookings of 180 minutes or more and shares it with the customer through a public link | Should Have |
| RF-037 | `booking-service` | The Administrator keeps the shop's legal, tax and contact data, shown on the public page and the help center | Should Have |
| RF-038 | `operations-service` | The Administrator records each operator's specialty and up to 10 skills with their level | Could Have |

> **Implementation notes (current state):**
> - RF-003: the code is stored only as a hash; asking for a new code invalidates the previous
>   one, and a successful reset also lifts a login lockout (RF-004b).
> - RF-001: no address is collected — neither the data model nor the sign-up screen has one,
>   and the service is at the shop, not at home (`01-context/scope.md`, Out of Scope #2).
> - RF-006: when a bay is free the booking is confirmed at once; otherwise nothing is saved and
>   up to five alternative start times of that day are returned.
> - RF-008: if the customer chose an operator who is still free, that operator is assigned;
>   otherwise the eligible operator (active account, shift covers the slot, no absence, no
>   overlapping booking) with the fewest bookings that day is chosen; ties go to the lowest
>   operator id. A rescheduled booking keeps its operator.
> - RF-007: the API also accepts a reschedule from the customer (`PUT /api/v1/bookings/{id}`), but
>   no client screen offers it; the web and the app only let the customer cancel.
> - RF-026 (implemented 2026-10-07, ADR-015): each catalog service has its own loyalty-point value
>   (`catalog.service.loyalty_points`, admin-editable in Gestión > Servicios), not a flat rate.
>   Points are credited to `payment.loyalty_transaction` when the booking's payment is approved,
>   summing the points of every service on the booking. Redemption is not a direct points-to-cash
>   conversion: accumulated points **unlock promotions** (`promotion.promotion.required_points`);
>   once unlocked, the customer redeems the promotion's own coupon code on the payment screen for
>   a real percentage discount (`discount_type_id` = `PERCENT`, `discount_value` = the percent,
>   20/30/50/100 = free), recorded in `promotion.booking_promotion`. A successful redemption
>   notifies the customer in-app and by email (`PromotionRedeemed`, ADR-011).
