# Sequence — Sign-up and welcome (RF-001, RF-018)

Source: `security-service` `AuthController.register`, `AccountRegistrationService`,
`RabbitDomainEventPublisher`; checked against the code on 2026-10-19.

```mermaid
sequenceDiagram
    autonumber
    actor C as Client
    participant W as Web
    participant GW as API Gateway
    participant S as security-service
    participant MQ as RabbitMQ
    participant CU as customer-service
    participant N as notification-service
    participant M as SMTP

    C->>W: Fills the sign-up form and accepts the Terms and the Data Policy
    W->>GW: POST /api/v1/auth/register {document, names, email, phone, password,<br/>acceptsTerms, acceptsDataPolicy}
    GW->>S: forward
    S->>S: Validate (password policy, unique email/document), save person + account (CLIENT)
    S->>S: Both consents true → terms_accepted_at and data_policy_accepted_at = now
    S-->>W: 201 Created
    S-)MQ: UserRegistered (security.user_registered), after commit
    par customer profile
        MQ-)CU: UserRegistered
        CU->>CU: Create customer profile (idempotent)
    and welcome
        MQ-)N: UserRegistered
        N->>N: Create WELCOME notification (idempotent: processed_event)
        N->>M: Welcome email (address comes in the event)
    end
    C->>W: Logs in
    W->>GW: POST /api/v1/auth/login
    GW->>S: forward
    S-->>W: 200 JWT (HS256, 1 h, roles claim)
```

A failure in a consumer is retried and then sent to its dead-letter queue
(`customer-service.events.dlq`, `notification-service.events.dlq`); the sign-up itself is
already committed.

The two consent fields are optional in the API so that older app versions keep working; the current
web and app send them, and the account stores when they were accepted.
