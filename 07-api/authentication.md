# Authentication and Authorization

> How clients authenticate and how every service decides what a caller may do. Decision record:
> ADR-006. Implementation: `security-service` issues tokens; every service validates them.

---

## Flow

```
POST /api/v1/auth/login {email, password}
  → security-service checks the BCrypt hash and that the account is active
  → opens a session (security.user_session) and returns a signed JWT + expiry
Client sends   Authorization: Bearer <token>   on every protected call
Each service   verifies signature, issuer, audience, expiry → roles → authorization
POST /api/v1/auth/logout  → closes the session in security-service
```

There is no refresh token: when the token expires (1 hour) the web shows "session expired" and the
user signs in again.

---

## The token

| Item | Value |
|---|---|
| Algorithm | HS256, shared secret `JWT_SECRET` (same value in every service) |
| `iss` | `lavarapido-security-service` (`JWT_ISSUER`) |
| `aud` | `lavarapido-api` (`JWT_AUDIENCE`) |
| `sub` | User id (`security.app_user`) |
| `roles` | e.g. `["CLIENT"]` → Spring authorities `ROLE_CLIENT` |
| `sid` | Session id |
| `iat`, `exp` | Issued at, expiry (`JWT_ACCESS_TOKEN_TTL`, default `1h`) |
| Personal data | **None** (no email, no name) |

The services validate signature, `iss`, `aud` and `exp`. They do **not** check whether the session
was closed: after logout a token keeps working in the other services until it expires (accepted for
the 1-hour lifetime; stated in `05-architecture/security-threat-model.md`).

---

## Roles

| Role | Can |
|---|---|
| `CLIENT` | Own profile, own vehicles, catalog, availability, own bookings (create, change, cancel before start), own payments, coupons and loyalty points, rating of own completed bookings (`/api/v1/ratings/**`), own notifications |
| `OPERATOR` | Own profile and notifications, the services assigned to them (`/api/v1/operator/**`: list, start, finish, their ratings), and the vehicle lookup `GET /api/v1/admin/vehicles` |
| `ADMIN` | Everything under `/api/v1/admin/**`: users, roles and permissions, all vehicles, all bookings and their status, catalog and prices, schedule, bays, business data, operators and assignments, inspection reports, payments, payment accounts, promotions, manual notifications; also `/api/v1/operator/bookings/**` in booking-service |

Roles are fixed (ADR-010). Ownership is checked inside each service: a client asking for another
client's booking or vehicle gets **404** (not 403), so the API does not reveal that it exists.

---

## Public endpoints (no token)

| Service | Public |
|---|---|
| security | `POST /api/v1/auth/register`, `/auth/login`, `/auth/password/forgot`, `/auth/password/verify`, `/auth/password/reset` |
| customer | `GET /api/v1/vehicle-types` |
| booking | `GET /api/v1/catalog/**`, `/api/v1/schedule/**`, `/api/v1/establishment` (landing page) |
| operations | `GET /api/v1/public/inspections/{token}` and its photos (published inspection report, opened from the link) |
| payment | `GET /health`, `/actuator/health` |
| all | `/actuator/health`, `/actuator/info`; Swagger UI only with the `dev` profile (disabled by default) |

Everything else under `/api/v1/**` needs a token; `/api/v1/admin/**` needs `ADMIN`.

---

## Service-to-service

| Call | Credential |
|---|---|
| booking → customer, customer → security, operations → booking and security, payment → booking | The user's JWT, forwarded |
| notification → security `/internal/v1/users/{id}/contact` and `/internal/v1/users/admins` | Header `X-Internal-Key` = `INTERNAL_API_KEY`; separate filter chain; never routed by the gateway (ADR-011 §8) |
| operations → booking `/internal/v1/bookings`, operations → security `/internal/v1/users/{id}/contact` (automatic assignment, no user) | `X-Internal-Key` |
| `deploy/publish-apk.sh` → notification `/internal/v1/notifications/app-update` | `X-Internal-Key`, from inside the Docker network |

---

## Password rules and recovery

- Password policy enforced by security-service (`PasswordPolicy`); hashes with BCrypt.
- Recovery: a 6-digit code sent by email, valid 15 minutes, burnt after 5 wrong attempts.
- Login answers the same error for unknown email and wrong password.
- Lockout (RF-004b): 5 failed logins within 15 minutes lock the account for 15 minutes (`LoginLockout`,
  table `security.login_lockout`); login answers **423** `ACCOUNT_LOCKED` meanwhile. A successful login or a
  password reset clears the counter.

---

## Correlations

- ADR-006 → `05-architecture/decisions/records/ADR-006-authentication-and-authorization.md`
- Threats → `05-architecture/security-threat-model.md`
- Security service → `09-microservices/services/02-security-service/`
