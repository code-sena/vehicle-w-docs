# Security Threat Model

**Last updated:** 2026-09-24

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
| Spoofing | Stolen credentials used to log in | BCrypt passwords, JWT authentication, login controls | Implemented in design |
| Spoofing | Forged service-to-service identity | Forwarded authenticated token and service authorization | Design |
| Tampering | Customer changes another customer's booking id | Ownership checks inside owning service | Required |
| Tampering | Receipt reference reused | Unique transaction reference constraint | Data model |
| Repudiation | User denies changing a booking | Audit trigger with user id and timestamps | Data model |
| Information disclosure | Password/token appears in logs | Logging rules prohibit secrets | Design |
| Information disclosure | User reads another user's payment | Role plus ownership checks | Required |
| Denial of Service | Excessive requests | No public deployment/rate limiter currently | Accepted for scope |
| Elevation of privilege | Customer calls administrator operation | Role checks in service | Required |
| Elevation of privilege | Operator changes another operator's execution | Ownership check on `service_execution` | Required |

## 4. Authentication

`security-service` issues JWTs. The gateway verifies the token at the edge, and every backend service verifies the token and applies its own authorization rules.

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
- transaction reference uniqueness for approved payments
- only one approved payment per booking
- administrator review before approval
- receipt content excluded from logs

## 7. Data protection

Sensitive configuration must be supplied through environment variables. Passwords, JWTs, reset tokens and unnecessary personal data must not be logged.

The project handles personal data under the applicable Colombian data-protection requirements documented in `04-requirements` and `00-governance`.

## 8. Messaging security

RabbitMQ credentials must not be committed. Consumers must validate event structure before processing. Duplicate delivery must be expected.

The current design does not define message-level encryption or a separate service mesh because the deployment is local and academic.

## 9. Remaining risks

| Risk | Impact | Current treatment |
|---|---|---|
| JWT secret shared by services is leaked | High | Environment variables; reconsider asymmetric signing before real deployment |
| Event published after DB commit but service crashes before publish | Medium/High | Manual recovery; Outbox remains a future option |
| Receipt storage is not yet defined | Medium | Decision required before implementation |
| Password recovery needs a usable SMTP provider | Medium | Mailpit locally; real SMTP account pending |
| Rate limiting is not implemented | Medium | Public production exposure is out of scope |

## References

- Authentication → `decisions/records/ADR-006-authentication-and-authorization.md`
- Gateway → `decisions/records/ADR-005-api-gateway.md`
- Payment → `decisions/records/ADR-008-payment-verification.md`
- Data model → `06-data/models.md`
- Security requirements → `04-requirements/non-functional.md`
