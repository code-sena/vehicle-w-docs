# Sequence — Password recovery with a 6-digit code (RF-003)

Source: `security-service` `AuthController` (`/api/v1/auth/password/forgot | verify | reset`),
`PasswordRecoveryService`, `PasswordResetToken`, `PasswordRecoveryPolicy` (`code-ttl: 15m`,
`max-failed-attempts: 5`), `SecureRandomResetCodeGenerator`, `EmailResetCodeNotifier`; checked
against the code on 2026-10-19.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant W as Web / app
    participant S as security-service
    participant DB as SQL Server (security)
    participant M as SMTP (Gmail / Mailpit)

    U->>W: Forgot my password → email
    W->>S: POST /api/v1/auth/password/forgot {email}
    alt active account with that email
        S->>DB: invalidate the previous codes that are still valid
        S->>S: 6-digit code (SecureRandom), stored as a hash
        S->>DB: password_reset_token (expires in 15 min, IP)
        S->>M: email with the code and its expiry
    else unknown or inactive email
        S->>S: nothing is done
    end
    S-->>W: 202 (same answer in both cases)

    U->>W: Types the code
    W->>S: POST /api/v1/auth/password/verify {email, code}
    S->>DB: latest valid code of the account
    alt code matches
        S-->>W: 204
    else wrong code
        S->>S: failed attempts + 1, at the 5th the code is invalidated
        S-->>W: 400 INVALID_RESET_CODE
    end

    U->>W: New password (twice)
    W->>S: POST /api/v1/auth/password/reset {email, code, newPassword}
    S->>S: code checked again, password policy, different from the current one
    alt valid
        S->>DB: code used (used_at), new password hash
        S->>DB: login_lockout cleared (a locked account can log in again)
        S->>S: PasswordChanged (RECOVERED), written to the log
        S-->>W: 204 → back to login
    else weak or same password
        S-->>W: 400 WEAK_PASSWORD | SAME_PASSWORD (the code is not spent)
    else code invalid or expired
        S-->>W: 400 INVALID_RESET_CODE
    end
```

The answer of `forgot` does not reveal whether the email exists. The failed-attempt counter lives in
memory (`InMemoryResetAttemptCounter`); the code itself, its hash and its expiry live in the database.
