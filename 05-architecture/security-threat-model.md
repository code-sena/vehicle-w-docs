# Security Threat Model

> What we are protecting, what could go wrong, and what we actually do about it. This
> document does not claim the system is secure: it lists the threats we identified, the
> measures we implemented, and the risks we knowingly accepted for this version.

**Last updated:** 2026-09-10
**Scope:** the ten services, the gateway and the database, in the local environment
described in `01-context/scope.md`. There is no public deployment and no penetration
testing has been performed.

---

## 1. What we are protecting

| Asset | Why it matters | Where it lives |
|-------|----------------|----------------|
| Credentials | Access to any account | `security.app_user`, hashed with BCrypt |
| Password reset tokens | Whoever holds a valid one can take over an account | `security.password_reset_token`, stored hashed |
| JWT tokens | Whoever holds one is that user for up to an hour | Client side; the signing secret is an environment variable |
| Personal data | Protected by Law 1581 of 2012 (RNF-004.9) | `security.person`, `customer` |
| Bookings and executions | The operational core of the business | `reserva`, `execution` |
| Payments and receipts | Money the business believes it received | `payment.payment`, `payment.payment_receipt` |
| The change log | The evidence of who did what | `audit.audit_log` |
| **Card data** | — | **Nowhere. We never take the payment, so we never receive it (RF-016)** |

The last row is the most important: in this system the money is never handled by the
platform. The customer pays from their own bank and we only verify the evidence (ADR-008).

---

## 2. Trust boundaries

| Boundary | What crosses it | Control |
|----------|-----------------|---------|
| Client → gateway | Everything the user sends, including receipt images | JWT verification, input validation, upload size limit (ADR-005) |
| Gateway → service | Already authenticated requests | Each service verifies the token again (ADR-006) |
| Service → service | Direct REST calls that skip the gateway | The caller forwards the user's token; the callee verifies it |
| Service → database | SQL over JDBC | One database user per service, limited to its own schema (ADR-003) |
| Service → RabbitMQ | Domain events | Credentials in environment variables; the broker is not exposed outside the compose network |

There is no boundary with an external system, because there is none.

---

## 3. Identified threats and what we do about them

Grouped with STRIDE. Only categories with something real to say are filled in.

### Spoofing

| Threat | Measure | Reference |
|--------|---------|-----------|
| Guessing a password by trying repeatedly | Temporary account lockout after repeated failed attempts | RF-004b |
| Using a stolen or forged token | Signed JWT, verified at the gateway and in every service; one-hour lifetime | ADR-006 |
| Reusing a password reset token | The table stores a hash, an expiry and `used_at`; all three are checked | ADR-006 |
| Impersonating a service inside the network | Not addressed: traffic inside the compose network is trusted | Accepted risk R-03 |

### Tampering

| Threat | Measure | Reference |
|--------|---------|-----------|
| SQL injection through search or booking fields | Parameterised queries through JPA; no string-concatenated SQL | RNF-004.4 |
| A service writing another schema | One database user per service, permissions limited to its schema | ADR-003 |
| Altering what a booking costs | The price is not sent by the client: `reserva_service` points to the `service_price` row that was current, and a trigger keeps prices immutable | `06-data`, sections 8 and 15 |
| **Uploading a receipt that does not correspond to the payment** | `reported_amount` is compared against the expected amount, and the administrator reviews the image before approving | ADR-008 |
| **Reusing one receipt to pay two bookings** | Unique index on `transaction_reference` | ADR-008 |
| **Two approved payments for one booking** | Filtered unique index that allows only one approved row per booking | ADR-008 |
| Deleting evidence of a change | Nothing is physically deleted; every change is written to `audit.audit_log` by a trigger | ADR-003 |

### Repudiation

| Threat | Measure | Reference |
|--------|---------|-----------|
| Denying who approved a payment | `payment.approved_by` and the reviewer of the receipt are stored, and the change is in the audit log | ADR-008 |
| Denying who changed a service status | Every domain table records `updated_by`, and the trigger writes the old and new value | ADR-003 |

### Information disclosure

| Threat | Measure | Reference |
|--------|---------|-----------|
| Passwords readable in the database | BCrypt, never plain text, never returned by any endpoint | RNF-004.3 |
| Card data stored by mistake | We never receive it | RF-016, ADR-008 |
| A customer reading another customer's receipt | Receipt access is checked against the owner of the booking, not only the role | ADR-006 |
| Personal data or tokens leaking through logs | Explicit rule about what is never logged | `cross-cutting.md` |
| Stack traces exposing internal structure | Errors return a code, never a stack trace | `cross-cutting.md` |
| A secret committed to the repository | Secrets only in environment variables, `.env` ignored by Git, reviewed in the Pull Request | RNF-004.7 |

### Denial of service

| Threat | Measure | Reference |
|--------|---------|-----------|
| Flooding the API with requests | Not addressed: no rate limiting, because there is no public exposure | Accepted risk R-04 |
| Filling the disk with uploaded images | Size limit at the gateway and in `payment-service` | ADR-008 |

### Elevation of privilege

| Threat | Measure | Reference |
|--------|---------|-----------|
| A customer reaching administrator endpoints | Role check in every service, answering 403 | RNF-004.5 |
| A customer approving their own payment | Approval is an administrator operation, and `approved_by` records who did it | ADR-008 |
| An operator updating a service line assigned to someone else | Ownership check inside the service, on top of the role | ADR-006 |
| A customer reading another customer's bookings or vehicles | The same ownership rule applied to reads | ADR-006 |

---

## 4. Knowingly accepted risks

| ID | Accepted risk | Why we accept it | When it must be fixed |
|----|---------------|------------------|-----------------------|
| R-01 | The JWT is signed with HS256 and all services hold the secret, so any of them could issue a valid token | One team, one local deployment; RS256 means distributing and rotating keys | Before any deployment outside the team's machines |
| R-02 | A token cannot be revoked: logout or lockout leaves existing tokens valid for up to an hour | Revocation would mean checking `user_session` on every request in ten services | Together with R-01 |
| R-03 | Traffic between services inside the Docker network is trusted | There is no network beyond the developer's machine | When there is a real deployment |
| R-04 | No rate limiting beyond the account lockout | No public exposure | Before public exposure |
| R-05 | **Payment approval depends on a person reviewing an image.** A convincing fake receipt can be approved | It is the trade-off of not using a gateway; the amount check and the unique reference limit it | If the project is deployed for real money, a gateway replaces this step (ADR-008) |
| R-06 | Password recovery cannot be completed: the table exists but there is no mail provider | Out of scope in this version | When a mail provider is integrated |

---

## 5. What this analysis does not cover

- No penetration testing, vulnerability scanning or security audit has been done.
- Container and host hardening is out of scope: everything runs locally.
- Availability and disaster recovery are not analysed; there is no production environment.
- This document does not certify that the system is secure. It documents what was
  considered and what was decided.

---

## Correlations

- Security requirements → `04-requirements/non-functional.md` (RNF-004)
- What the database guarantees: indexes, triggers and constraints → `06-data`, section 15
- Rules the application must guarantee → `06-data`, section 16
- Payment verification and its fraud controls → ADR-008
- Schema separation and database users → ADR-003
- Gateway responsibilities → ADR-005
- Authentication and authorization → ADR-006
- Logging and error rules → `cross-cutting.md`