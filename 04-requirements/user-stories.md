# User Stories — Backlog

> **What to fill in here:** The product's User Story backlog.
> Each HU uses the standard format with Acceptance Criteria in Given/When/Then.
> Refined (Ready) HUs go to the sprint. Unrefined ones are epics or ideas.

---

## Backlog status
 
| Epic | HUs | Priority |
|------|-----|----------|
| EP-001 Account access | 4 | Must / Should Have |
| EP-002 Booking lifecycle | 3 | Must / Should Have |
| EP-003 Operator assignment | 4 | Must / Should Have |
| EP-004 Payments | 3 | Must / Should Have |
| EP-005 Shop administration | 1 | Should Have |
| EP-006 Promotions and loyalty | 2 | Should / Could Have |
| EP-007 User experience & preferences | 3 | Should / Could Have |
| **Total** | **20** | |
 
> Project-level planning lives in `plan de actividades/scrum1.1.xlsx`.
> The 21 HUs in that file describe project activities; the stories below
> specify the software itself.
 
---
 
## Epics
 
| ID | Epic | Description |
|----|------|-------------|
| EP-001 | Account access | Sign-up, login, password recovery/change |
| EP-002 | Booking lifecycle | Request, modify, cancel and rate a wash service |
| EP-003 | Operator assignment | Automatic, customer-chosen and admin-assigned operators |
| EP-004 | Payments | QR-based payment with receipt review, and history |
| EP-005 | Shop administration | Business hours, operator availability, reports |
| EP-006 | Promotions and loyalty | Discounts, promo codes, points program |
| EP-007 | User experience & preferences | Role-based dashboard, notifications, theme and language |
 
---
 
## User Stories
 
### HU-AUTH-001 — Customer sign-up {#HU-AUTH-001}
 
**Epic:** EP-001
 
> **As** a new customer
> **I want** to create an account with my document number, first and last name, phone, email and password
> **so that** I can book wash services under my own profile
 
**Acceptance Criteria:**
 
```gherkin
Scenario 1: Successful sign-up
  Given I am on the sign-up screen
  When  I submit a unique email and all required fields
  Then  my account is created
  And   I am able to log in with those credentials
 
Scenario 2: Duplicate email
  Given an account already exists with the email I entered
  When  I submit the sign-up form
  Then  the system shows an error indicating the email is already registered
  And   no new account is created
```
 
| Field | Value |
|-------|-------|
| Story Points | 3 |
| Priority | Must Have |
| Status | In Progress |
| Affected service(s) | `security-service` |
| Covers | RF-001 |
 
---
 
### HU-AUTH-002 — Login with role-based redirect {#HU-AUTH-002}
 
**Epic:** EP-001
 
> **As** a registered user (customer, operator or administrator)
> **I want** to log in with my email and password
> **so that** I reach the screens relevant to my role
 
**Acceptance Criteria:**
 
```gherkin
Scenario 1: Successful login
  Given I have a registered account
  When  I submit the correct email and password
  Then  I am redirected to the dashboard for my role
 
Scenario 2: Repeated failed attempts
  Given I have submitted the wrong password several times in a row
  When  I exceed the allowed number of attempts
  Then  my account is temporarily locked
  And   I see a message explaining the lock
```
 
| Field | Value |
|-------|-------|
| Story Points | 3 |
| Priority | Must Have |
| Status | In Progress |
| Affected service(s) | `security-service` |
| Covers | RF-002, RF-004b |
 
---
 
### HU-AUTH-003 — Password recovery {#HU-AUTH-003}
 
**Epic:** EP-001
 
> **As** a user who forgot their password
> **I want** to receive a code by email and use it to set a new password
> **so that** I can regain access to my account
 
**Acceptance Criteria:**
 
```gherkin
Scenario 1: Registered email
  Given I submit an email that is registered in the system
  When  I request a password reset
  Then  a 6-digit code valid for 15 minutes is sent to that email

Scenario 2: Unregistered email
  Given I submit an email that is not registered
  When  I request a password reset
  Then  the system shows the same message as for a registered email
  And   no email is sent, so nobody can find out which emails have an account

Scenario 3: Valid code
  Given I received a code less than 15 minutes ago
  When  I enter it together with a new password that meets the password rules
  Then  my password is changed
  And   the same code can not be used again

Scenario 4: Too many wrong codes
  Given I enter a wrong code 5 times
  When  I try again, even with the right code
  Then  the system asks me to request a new code
```
 
| Field | Value |
|-------|-------|
| Story Points | 2 |
| Priority | Should Have |
| Status | In Progress |
| Affected service(s) | `security-service` |
| Covers | RF-003 |
| Dependencies | Email provider not yet integrated — see `01-context/scope.md`, Out of Scope #6 |
 
---
 
### HU-AUTH-004 — Change password {#HU-AUTH-004}
 
**Epic:** EP-001
 
> **As** an authenticated user
> **I want** to change my password from my account settings
> **so that** I can keep my account secure without going through password recovery
 
**Acceptance Criteria:**
 
```gherkin
Scenario 1: Correct current password
  Given I am logged in and open account settings
  When  I enter my correct current password and a new password that meets the security requirements
  Then  my password is updated and I can log in with the new one
 
Scenario 2: Incorrect current password
  Given I am logged in and open account settings
  When  I enter an incorrect current password
  Then  the system rejects the change and my password stays unchanged
```
 
| Field | Value |
|-------|-------|
| Story Points | 2 |
| Priority | Should Have |
| Status | In Progress |
| Affected service(s) | `security-service` |
| Covers | RF-004 |
 
---
 
### HU-BOOK-001 — Request a wash service booking {#HU-BOOK-001}
 
**Epic:** EP-002
 
> **As** a customer
> **I want** to book a wash service by choosing a date, time and wash type
> **so that** I can get my vehicle washed without calling or driving to check availability
 
**Acceptance Criteria:**
 
```gherkin
Scenario 1: Slot available
  Given I select a date, time and wash type
  When  the slot is available
  Then  the booking is created and I see a confirmation
 
Scenario 2: Slot already taken
  Given I select a date and time that is already fully booked
  When  I submit the request
  Then  the system shows alternative available times instead of confirming
```
 
| Field | Value |
|-------|-------|
| Story Points | 5 |
| Priority | Must Have |
| Status | In Progress |
| Affected service(s) | `booking-service` |
| Covers | RF-005, RF-006 |
 
---
 
### HU-BOOK-002 — Modify or cancel a booking {#HU-BOOK-002}
 
**Epic:** EP-002
 
> **As** a customer
> **I want** to modify or cancel a booking before it starts
> **so that** I'm not stuck with a slot that no longer works for me
 
**Acceptance Criteria:**
 
```gherkin
Scenario 1: Cancel before start
  Given I have a booking that has not started yet
  When  I cancel it
  Then  the slot becomes available again for other customers
 
Scenario 2: Cancel while in progress
  Given my booking's service has already started
  When  I try to cancel it
  Then  the system blocks the cancellation and explains why
```
 
| Field | Value |
|-------|-------|
| Story Points | 3 |
| Priority | Must Have |
| Status | In Progress |
| Affected service(s) | `booking-service` |
| Covers | RF-007 |
 
---
 
### HU-BOOK-003 — Automatic operator assignment {#HU-BOOK-003}
 
**Epic:** EP-003
 
> **As** a customer
> **I want** the system to assign an available operator to my booking automatically
> **so that** I don't have to pick one every time I book
 
**Acceptance Criteria:**
 
```gherkin
Scenario 1: Operator available
  Given my booking is confirmed
  When  at least one operator is available for that slot
  Then  the system assigns one automatically and notifies them
 
Scenario 2: No operator available
  Given my booking is confirmed
  When  no operator is available for that slot
  Then  the Administrator and I are both notified
```
 
| Field | Value |
|-------|-------|
| Story Points | 5 |
| Priority | Must Have |
| Status | In Progress |
| Affected service(s) | `operations-service` |
| Covers | RF-008 |
| Technical notes | Tie-break rule when multiple operators are equally available is still undefined — see `04-requirements/functional.md`, Notes |
 
---
 
### HU-BOOK-004 — Manual operator selection {#HU-BOOK-004}
 
**Epic:** EP-003
 
> **As** a customer
> **I want** to pick a specific operator from those available
> **so that** I can choose someone I trust or prefer
 
**Acceptance Criteria:**
 
```gherkin
Scenario 1: Operator available
  Given I am completing a booking
  When  I open the list of available operators
  Then  I can select one and the booking is assigned to them
 
Scenario 2: Operator becomes unavailable
  Given I have selected an operator from the list
  When  that operator is no longer available for the slot
  Then  the system tells me and shows the updated list of available operators
```
 
| Field | Value |
|-------|-------|
| Story Points | 3 |
| Priority | Should Have |
| Status | Backlog |
| Affected service(s) | `operations-service` |
| Covers | RF-010 |
 
---
 
### HU-BOOK-006 — Administrator assigns or reassigns an operator {#HU-BOOK-006}
 
**Epic:** EP-003
 
> **As** an Administrator
> **I want** to assign or reassign an operator to a booking
> **so that** I can resolve absences and balance the workload
 
**Acceptance Criteria:**
 
```gherkin
Scenario 1: Reassign to an available operator
  Given a booking already has an assigned operator
  When  I reassign it to a different operator who is available for that slot
  Then  the new operator is notified and the previous one is released from that booking
 
Scenario 2: Operator not available
  Given a booking needs an operator
  When  I try to assign an operator who is unavailable for that slot
  Then  the system blocks the assignment and explains why
```
 
| Field | Value |
|-------|-------|
| Story Points | 3 |
| Priority | Should Have |
| Status | In Progress |
| Affected service(s) | `operations-service` |
| Covers | RF-009 |
 
---
 
### HU-BOOK-007 — Operator views and updates assigned services {#HU-BOOK-007}
 
**Epic:** EP-003
 
> **As** an operator
> **I want** to see the bookings assigned to me and update their status
> **so that** the customer and the administrator know how the service is progressing
 
**Acceptance Criteria:**
 
```gherkin
Scenario 1: View assigned bookings
  Given I am logged in as an operator
  When  I open my assigned services
  Then  I see each booking with its customer, vehicle, time and wash type
 
Scenario 2: Update service status
  Given I have a booking assigned for today
  When  I mark it as started and later as completed
  Then  the status is updated and the customer can rate the service
 
Scenario 3: Booking not assigned to me
  Given a booking is assigned to another operator
  When  I try to update its status
  Then  the system blocks the action
```
 
| Field | Value |
|-------|-------|
| Story Points | 3 |
| Priority | Must Have |
| Status | In Progress |
| Affected service(s) | `operations-service` |
| Covers | RF-011, RF-012b |
 
---
 
### HU-BOOK-005 — Rate a completed service {#HU-BOOK-005}
 
**Epic:** EP-002
 
> **As** a customer
> **I want** to rate and comment on a service after it's done
> **so that** I can give feedback and help other customers choose
 
**Acceptance Criteria:**
 
```gherkin
Scenario 1: Service completed
  Given my booking's service has been marked as completed
  When  I submit a rating and comment
  Then  it is saved and visible on the operator's profile
 
Scenario 2: Service not yet completed
  Given my booking's service has not been completed yet
  When  I try to submit a rating
  Then  the system blocks it
```
 
| Field | Value |
|-------|-------|
| Story Points | 2 |
| Priority | Should Have |
| Status | In Progress |
| Affected service(s) | `operations-service` |
| Covers | RF-012 |
| Dependencies | HU-BOOK-007 — the service must be marked as completed first |
 
---
 
### HU-PAY-001 — Pay for a booking via QR and receipt upload {#HU-PAY-001}
 
**Epic:** EP-004
 
> **As** a customer
> **I want** to pay for my booking with the method I choose — scanning the shop's QR and uploading a receipt for a digital method, or paying in person for cash
> **so that** I have a traceable record of payment when I pay digitally, without being forced through a QR I can't use for cash
 
**Acceptance Criteria:**
 
```gherkin
Scenario 1: Receipt submitted for a digital method
  Given I have a confirmed booking pending payment and I pick Nequi, Daviplata or bank transfer
  When  I see that method's QR and account details, pay through my banking app, and upload a receipt with the transaction reference and amount
  Then  the payment is recorded as awaiting review and linked to the booking
 
Scenario 2: Cash payment needs no receipt
  Given I have a confirmed booking pending payment and I pick cash
  When  I select cash as my payment method
  Then  the system shows no QR and does not ask me to upload a receipt — the Administrator confirms the cash payment directly
 
Scenario 3: Receipt reused
  Given I upload a receipt whose transaction reference was already used for another payment
  When  I submit it
  Then  the system rejects the upload and asks for a different receipt
```
 
| Field | Value |
|-------|-------|
| Story Points | 5 |
| Priority | Must Have |
| Status | In Progress |
| Affected service(s) | `payment-service` |
| Covers | RF-013, RF-013b, RF-016 |
 
---
 
### HU-PAY-002 — View payment history {#HU-PAY-002}
 
**Epic:** EP-004
 
> **As** a customer
> **I want** to see a history of my past payments organised by date and service
> **so that** I can keep track of what I've spent and when
 
**Acceptance Criteria:**
 
```gherkin
Scenario 1: Payments exist
  Given I have made one or more payments
  When  I open my payment history
  Then  I see them listed by date, each linked to its corresponding service
 
Scenario 2: No payments yet
  Given I have not made any payments
  When  I open my payment history
  Then  I see a message indicating there are no payments yet
```
 
| Field | Value |
|-------|-------|
| Story Points | 2 |
| Priority | Should Have |
| Status | In Progress |
| Affected service(s) | `payment-service` |
| Covers | RF-015 |
 
---
 
### HU-PAY-003 — Administrator reviews a payment receipt {#HU-PAY-003}
 
**Epic:** EP-004
 
> **As** an Administrator
> **I want** to review a digital payment's receipt against the booking amount, or confirm a cash payment directly
> **so that** I can approve or reject the payment before the wash is confirmed as paid
 
**Acceptance Criteria:**
 
```gherkin
Scenario 1: Digital payment — amount matches
  Given a digital payment is awaiting review with an uploaded receipt
  When  I compare the reported amount against the booking and it matches
  Then  I approve the payment and the customer is notified
 
Scenario 2: Digital payment — amount doesn't match or the receipt is unreadable
  Given a digital payment is awaiting review
  When  the reported amount doesn't match, or the receipt can't be verified
  Then  I reject the payment with a reason and the customer is notified to try again
 
Scenario 3: Cash payment
  Given a customer chose to pay in cash
  When  I confirm that the cash was received
  Then  I approve the payment directly — no receipt is needed
```
 
| Field | Value |
|-------|-------|
| Story Points | 3 |
| Priority | Must Have |
| Status | In Progress |
| Affected service(s) | `payment-service` |
| Covers | RF-014 |
 
---
 
### HU-ADMIN-001 — Manage shop schedule and view reports {#HU-ADMIN-001}
 
**Epic:** EP-005
 
> **As** an Administrator
> **I want** to configure the shop's business hours, manage operator availability, and view operational reports
> **so that** I can run the business day to day and make informed decisions
 
**Acceptance Criteria:**
 
```gherkin
Scenario 1: Configure business hours
  Given I am logged in as Administrator
  When  I set the opening and closing hours for each day, or register an exception (holiday, special hours)
  Then  the new schedule applies to future availability checks
 
Scenario 2: View reports
  Given services have been completed
  When  I open the reports section
  Then  I see services performed, revenue, average rating and performance per operator
```
 
| Field | Value |
|-------|-------|
| Story Points | 5 |
| Priority | Should Have |
| Status | Backlog |
| Affected service(s) | `booking-service`, `operations-service` |
| Covers | RF-021, RF-022, RF-023 |
 
---
 
### HU-UI-001 — Role-based dashboard {#HU-UI-001}
 
**Epic:** EP-007
 
> **As** a user (customer, operator or administrator)
> **I want** to see a dashboard summarising what matters to my role when I log in
> **so that** I can act on the most relevant information without hunting for it
 
**Acceptance Criteria:**
 
```gherkin
Scenario 1: Data available
  Given I log in and have data associated with my role (bookings, assignments, or operational metrics depending on the role)
  When  I open the dashboard
  Then  I see metrics, graphs and quick actions relevant to my role
 
Scenario 2: No data yet
  Given there is no data associated with me yet
  When  I open the dashboard
  Then  I see a message indicating there are no records yet, instead of a broken or empty screen
```
 
| Field | Value |
|-------|-------|
| Story Points | 5 |
| Priority | Should Have |
| Status | Backlog |
| Affected service(s) | Frontend only |
| Covers | RF-017 |
 
---
 
### HU-UI-002 — Notifications inbox {#HU-UI-002}
 
**Epic:** EP-007
 
> **As** a user
> **I want** to receive notifications about relevant events (booking created, status change, payment, assignment)
> **so that** I stay informed without constantly checking the app
 
**Acceptance Criteria:**
 
```gherkin
Scenario 1: Event occurs
  Given a relevant event happens on my account (e.g. an operator is assigned to my booking)
  When  I open my notifications
  Then  I see it listed as unread
 
Scenario 2: Marking as read
  Given I have unread notifications
  When  I open one
  Then  it is marked as read and no longer counted as pending
```
 
| Field | Value |
|-------|-------|
| Story Points | 3 |
| Priority | Should Have |
| Status | In Progress |
| Affected service(s) | `notification-service` |
| Covers | RF-018 |
 
---
 
### HU-UI-003 — Interface preferences: theme and language {#HU-UI-003}
 
**Epic:** EP-007
 
> **As** a user
> **I want** to choose my visual theme and interface language
> **so that** I can use the app comfortably in the way that suits me best
 
**Acceptance Criteria:**
 
```gherkin
Scenario 1: Change theme
  Given I am in settings
  When  I select a different visual theme
  Then  the interface updates immediately and keeps that theme the next time I log in
 
Scenario 2: Change language
  Given I am in settings
  When  I select one of the four supported languages (Spanish, English, French, Portuguese)
  Then  all interface text updates to that language
  And   it is kept the next time I log in

Scenario 3: Preferences belong to each account
  Given I changed theme and language while signed in as a client
  When  I sign out and sign in as an administrator (another email) on the same browser
  Then  I see the administrator's own theme and language, not the client's
  And   signing in again as the client restores the client's theme and language
```
 
| Field | Value |
|-------|-------|
| Story Points | 3 |
| Priority | Could Have |
| Status | In Progress |
| Affected service(s) | `security-service` |
| Covers | RF-019, RF-020 |
 
---
 
### HU-PROMO-001 — Manage promotions {#HU-PROMO-001}
 
**Epic:** EP-006
 
> **As** an Administrator
> **I want** to create, edit or deactivate promotions and discounts
> **so that** I can run marketing campaigns to attract and retain customers
 
**Acceptance Criteria:**
 
```gherkin
Scenario 1: Create a promotion
  Given I am logged in as Administrator
  When  I create a promotion with a discount, start date and end date
  Then  it becomes available for customers to apply during its validity window
 
Scenario 2: Deactivate a promotion
  Given a promotion is currently active
  When  I deactivate it
  Then  customers can no longer apply it to new payments
```
 
| Field | Value |
|-------|-------|
| Story Points | 3 |
| Priority | Should Have |
| Status | Backlog |
| Affected service(s) | `payment-service` |
| Covers | RF-024 |
 
---
 
### HU-PROMO-002 — Apply a promotion and earn loyalty points {#HU-PROMO-002}
 
**Epic:** EP-006
 
> **As** a customer
> **I want** to apply a valid promotion code when paying, and earn points for completed services
> **so that** I get a better price now and a reason to keep coming back
 
**Acceptance Criteria:**
 
```gherkin
Scenario 1: Valid promotion at payment
  Given I have a booking pending payment
  When  I apply a promotion code that is currently valid
  Then  the discount is reflected before I confirm payment
 
Scenario 2: Expired or inapplicable promotion
  Given I apply a promotion code that is expired or does not apply to this service
  When  I try to use it
  Then  the system notifies me and the original price stands
 
Scenario 3: Earning points
  Given a service has been completed and paid
  When  the payment is confirmed
  Then  loyalty points are credited to my account and can be redeemed later for a discount
```
 
| Field | Value |
|-------|-------|
| Story Points | 5 |
| Priority | Could Have |
| Status | Backlog |
| Affected service(s) | `payment-service`, `payment-service` |
| Covers | RF-025, RF-026 |
 
---
 
## Rules for writing HUs
 
### 1. The role matters
Do not write "As a user" — that says nothing. Use the specific role:
```
✓ As a registered customer
✓ As an operator
✓ As an Administrator
✗ As a user
✗ As the system
```
 
### 2. The benefit justifies the work
The "so that" must describe a business benefit, not redescribe the action:
```
✓ so that I can get my vehicle washed without driving to check availability
✗ so that I can see the available slots (this only describes the feature)
```
 
### 3. ACs are verifiable
Each AC must be verifiable manually or automatable as a test:
```
✓ Then the booking is created and I see a confirmation
✓ Then the system blocks the cancellation and explains why
✗ Then the system works well (not verifiable)
✗ Then the user is satisfied (not verifiable)
```
 
### 4. One HU = one unit of value
If the HU has 15 ACs, it is probably 3 HUs.
One HU must be completable within a single development phase.
 
---
 
## Correlations
 
- Functional requirements each HU covers → `04-requirements/functional.md`
- Non-functional requirements → `04-requirements/non-functional.md`
- Traceability matrix → `04-requirements/traceability-matrix.md`
- Full HU template with DoD checklist → `04-requirements/_template-hu.md`
 