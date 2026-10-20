# Security Threat Model

**Last updated:** 2026-10-20 (status column checked against the code)

This threat model uses STRIDE for the current web/mobile, gateway, six-service, SQL Server and RabbitMQ architecture. It describes current mitigations and identifies risks that still require implementation work.

## 1. Assets

The main assets are:

- user credentials and password-reset tokens
- JWT signing secret
- personal and vehicle data
- booking and execution records
- payment receipts and payment references
- loyalty balances and transactions
- audit records
- RabbitMQ credentials and messages

## 2. Trust boundaries

```text
Customer / Operator / Administrator
              │
              ▼
        Web / Android
              │
        HTTPS / REST
              ▼
         API Gateway
              │
       ┌──────┴──────┐
       ▼             ▼
   Six services   RabbitMQ
       │
       ▼
    SQL Server
```

The browser/mobile client is untrusted. Service code validates authorization even when a request came through the gateway.

## 3. STRIDE analysis

| Threat | Example | Current mitigation | Status |
|---|---|---|---|
| Spoofing | Stolen credentials used to log in | BCrypt passwords, JWT authentication, inactive accounts rejected, account locked 15 minutes after 5 failed attempts in 15 minutes (RF-004b) | Implemented |
| Spoofing | Forged service-to-service identity | Forwarded user token (booking → customer, customer → security, operations → booking/security, payment → booking); `X-Internal-Key` on `/internal/**` (notification → security, operations → booking/security, APK script → notification), not routed by the gateway | Implemented |
| Tampering | Customer changes another customer's booking id | Ownership checks inside owning service (booking-service answers 404 for a booking that is not the caller's) | Implemented |
| Tampering | Receipt reference reused | Use-case check: a reference already used on another booking is rejected (409 `TRANSACTION_REFERENCE_REUSED`); the column has an index, not a unique constraint | Implemented |
| Repudiation | User denies changing a booking | `created_by` / `updated_by` / `deleted_by` with timestamps on each row; `audit.audit_log` exists but nothing writes to it yet | Partial |
| Information disclosure | Password/token appears in logs | Logging rules prohibit secrets | Design |
| Information disclosure | User reads another user's payment | Role plus ownership checks (payment-service asks booking-service for the booking with the client's token) | Implemented |
| Denial of Service | Excessive requests | No rate limiter; the Azure server only opens 80/443 (Caddy) and each container has a memory limit | Accepted for scope |
| Elevation of privilege | Customer calls administrator operation | Role checks in each service (Spring Security rules by path, `[Authorize(Roles = ...)]` in payment-service) | Implemented |
| Elevation of privilege | Operator changes another operator's execution | The operator starts or finishes only the service lines assigned to them (`OperationsService.myLines`), on a booking that booking-service returns for their token | Implemented |

## 4. Authentication

`security-service` issues JWTs (HS256, shared secret). Every backend service verifies the token and applies its own authorization rules; the gateway only routes (ADR-005 implementation note).

The current design uses:

- JWT Bearer authentication
- HS256 shared secret from environment configuration
- one-hour token lifetime
- BCrypt password hashing
- role claims
- ownership checks in the service

## 5. Authorization

Roles are:

- Administrator
- Operator
- Customer

A valid role does not replace resource ownership. For example, an Operator may update only execution records assigned to them, and a Customer may access only their own customer/vehicle/booking/payment information.

## 6. Payment security

The system does not collect card data and does not integrate a payment gateway. Digital payments are made outside the platform and the customer uploads a receipt.

Controls include:

- declared amount stored separately from amount due
- a transaction reference cannot be reused on another booking
- only one approved payment per booking
- administrator review before approval
- receipt content excluded from logs

## 7. Data protection

Sensitive configuration must be supplied through environment variables. Passwords, JWTs, reset tokens and unnecessary personal data must not be logged.

The project handles personal data under the applicable Colombian data-protection requirements documented in `04-requirements` and `00-governance`.

## 8. Messaging security

RabbitMQ credentials must not be committed. Consumers must validate event structure before processing. Duplicate delivery must be expected.

The current design does not define message-level encryption or a separate service mesh: RabbitMQ is only reachable inside the Docker network, also on the Azure server.

## 9. Remaining risks

| Risk | Impact | Current treatment |
|---|---|---|
| JWT secret shared by services is leaked | High | Environment variables; reconsider asymmetric signing before real deployment |
| Event published after DB commit but service crashes before publish | Medium/High | Manual recovery; Outbox remains a future option |
| Receipts and inspection photos stored inside the database | Medium | Images only (no SVG, no external links), inspection photos up to 2 MB; a file storage is a future option |
| SMTP credentials (Gmail app password) in `.env` | Medium | `.env` is git-ignored; never logged; rotate if shared |
| Internal API key leaked | Medium | Grants read of a user's contact data and of the admins list, read of bookings and the app-update notice; separate from `JWT_SECRET`; rotate in `.env` |
| Rate limiting is not implemented | Medium | The Azure server is public; only the login has a limit (lockout) |

## References

- Authentication → `decisions/records/ADR-006-authentication-and-authorization.md`
- Gateway → `decisions/records/ADR-005-api-gateway.md`
- Payment → `decisions/records/ADR-008-payment-verification.md`
- Data model → `06-data/models.md`
- Security requirements → `04-requirements/non-functional.md`
