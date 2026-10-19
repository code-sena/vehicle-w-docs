# Sequence — Login, lockout and logout (RF-002, RF-004b)

Source: `security-service` `AuthController` (`/api/v1/auth/login`, `/logout`), `AuthenticationService.login /
logout`, `LoginLockout`, `JwtTokenIssuer`; checked against the code on 2026-10-19.

```mermaid
sequenceDiagram
    autonumber
    actor U as User (client, operator or admin)
    participant W as Web / app
    participant GW as API Gateway
    participant S as security-service
    participant DB as SQL Server (security)

    U->>W: Email and password
    W->>GW: POST /api/v1/auth/login
    GW->>S: forward
    S->>DB: account by email
    alt email unknown
        S->>S: compares against a dummy hash (same response time)
        S-->>W: 401 INVALID_CREDENTIALS
    else account found
        S->>DB: login_lockout of the account
        alt locked (lockedUntil in the future)
            S-->>W: 423 ACCOUNT_LOCKED (even with the right password)
        else wrong password
            S->>DB: failedCount + 1 (kept even though the request fails)
            alt 5th failure within 15 minutes
                S-->>W: 423 ACCOUNT_LOCKED (locked for 15 minutes)
            else
                S-->>W: 401 INVALID_CREDENTIALS
            end
        else right password
            alt account deactivated
                S-->>W: 403 ACCOUNT_DISABLED
            else
                S->>DB: clear login_lockout, last_login = now
                S->>DB: user_session (expires with the token, IP, user agent)
                S->>S: JWT HS256 (sub, roles, session id), 1 h
                S-->>W: 200 {token, expiresAt, user}
                W->>W: redirects by role (client, operator, admin)
            end
        end
    end

    U->>W: Log out
    W->>GW: POST /api/v1/auth/logout (Bearer token)
    GW->>S: forward
    S->>DB: user_session revoked
    S-->>W: 204
```

The deactivated state is checked only after the password, so only the owner of the account learns it
is disabled. Recovering the password also clears the lockout ([seq-password-recovery](./seq-password-recovery.md)).
