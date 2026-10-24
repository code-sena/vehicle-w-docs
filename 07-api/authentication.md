# Authentication and Authorization

> How clients authenticate and how every service decides what a caller may do. Decision record:
> ADR-006. Implementation: `security-service` issues tokens; every service validates them.
> Checked against `origin/develop` on 2026-10-24.

---

## Flow

```
POST /api/v1/auth/login {email, password}
  → security-service checks the BCrypt hash and that the account is active and not locked
  → opens a session (security.user_session) and returns a signed JWT + expiry
Client sends   Authorization: Bearer <token>   on every protected call
Gateway        asks security-service whether the token's session is still open (cached 30 s)
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
| `roles` | e.g. `["CLIENT"]` → Spring authorities `ROLE_CLIENT`; .NET `RoleClaimType = "roles"` |
| `sid` | Session id |
| `iat`, `exp` | Issued at, expiry (`JWT_ACCESS_TOKEN_TTL`, default `1h`) |
| Personal data | **None** (no email, no name) |

The services validate signature, `iss`, `aud` and `exp` (payment-service also, with 30 s of clock
skew). Whether the session is still valid is checked in two places (ADR-006):

- security-service rejects, on its own endpoints, a token whose session is closed or expired and, since
  **E-02**, a token whose account was disabled or no longer has one of the token's roles. In that case
  it also revokes every session of the account, so the person signs in again with the roles they have
  today. `GET /api/v1/auth/session` answers 204 (valid) or 401 (not valid).
- The gateway calls that endpoint before forwarding any call with a non-empty `Authorization` header,
  whatever its scheme or path (except `/api/v1/auth/**`, but including `/api/v1/auth/logout`), and keeps
  the answer 30 seconds per token (`SESSION_CHECK_CACHE_TTL`, key = SHA-256 of the token alone, so
  `bearer`, `Bearer` and `BEARER` share it). A rejected token gets the same
  `401 UNAUTHORIZED` body security-service returns, so the web shows "session expired" as with an
  expired token. If security-service does not answer within 3 s (`SESSION_CHECK_TIMEOUT`), the call goes
  on (the service still checks the signature).

A session closes on logout, when an administrator disables the account, when the owner closes it,
and when the account loses a role of the token (E-02). A logout through the gateway takes effect at
once (the cached answer is cleared before and after forwarding it); the others reach the other
services within the 30-second cache.

SEC-01 (fixed; checked on 2026-10-24): the gateway used to check only headers that started with `Bearer `
exactly, while Spring Security in the services also accepts other casing (`bearer …`); now every
non-empty `Authorization` header is checked.

Rate limit (SEC-04): the gateway allows each client IP `AUTH_RATE_LIMIT_REQUESTS` (60) calls to
`/api/v1/auth/**` per `AUTH_RATE_LIMIT_WINDOW` (1 min, refilled gradually); beyond that it answers 429
`RATE_LIMITED` with `Retry-After`, before security-service. The client IP is the remote address, or
`X-Forwarded-For` only when the connection comes from `TRUSTED_PROXIES` (Caddy); the gateway forwards
that IP to the services in `X-Forwarded-For` (SEC-11).

---

## Roles

| Role | Can |
|---|---|
| `CLIENT` | Own profile, own vehicles (`/api/v1/vehicles/**`, role `CLIENT`), catalog, availability, own bookings (`/api/v1/bookings/**`, role `CLIENT`: create, change date and time, cancel with a client-side reason before start), own payments (`/api/v1/payments/**`, role `CLIENT`), coupons and loyalty points (`/api/v1/loyalty/**`, role `CLIENT`), rating of own completed bookings (`/api/v1/ratings/**`), the operator of own bookings (`/api/v1/operators/my-bookings`), own notifications |
| `OPERATOR` | Own profile and notifications, the services assigned to them in operations-service (`/api/v1/operator/services/**`: list, start, finish; `/api/v1/operator/ratings`), and the vehicle lookup `GET /api/v1/admin/vehicles` |
| `ADMIN` | Everything under `/api/v1/admin/**`: users, roles and permissions, all vehicles, all bookings and their status, catalog and prices, schedule, bays, business data, operators and assignments, inspection reports, payments, payment accounts, promotions, manual notifications. Also `GET /api/v1/bookings/availability` and `/cancellation-reasons` (the booking form of the web) |

Since BIZ-12 / A-10, `/api/v1/bookings/**` (booking-service) and `/api/v1/vehicles/**`
(customer-service) are only for `CLIENT`, except the two booking reads above: an administrator or
operator gets 403 there, and no longer gets a customer profile provisioned by calling them.

Roles are fixed (ADR-010). Any authenticated role may call the other `/api/v1/**` paths of a service
(for example `GET /api/v1/payment-accounts`, `GET /api/v1/operators/available`); the exact rule of
every operation is in its contract (`x-access`, `x-roles`). Ownership is checked inside each service:
a client asking for another client's booking, vehicle or payment gets **404** (not 403), so the API
does not reveal that it exists.

`/api/v1/operator/bookings/**` of booking-service (E-01) needs an `OPERATOR` or `ADMIN` token **and**
the internal key: only operations-service calls it, on behalf of the operator, after checking that the
booking is assigned to them. A direct call with only the token answers 403, and the gateway does not
publish these paths.

What a rejected call returns:

| Service | No or invalid token | Wrong role |
|---|---|---|
| Java services | 401 `ProblemDetail` `code` `UNAUTHORIZED` (+ `WWW-Authenticate: Bearer`) | 403 `ProblemDetail` `code` `FORBIDDEN` |
| payment-service | 401 with an empty body (JWT middleware); a token without a numeric `sub` gets the `ProblemDetail` `UNAUTHORIZED` | 403 with an empty body |

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
| booking → customer, payment → booking, operations → booking `/api/v1/admin/bookings` | The user's JWT, forwarded |
| operations → booking `/api/v1/operator/bookings/**` (E-01) | The operator's JWT **and** `X-Internal-Key` |
| operations → booking `/internal/v1/bookings` (automatic assignment, free operators, to-close list, no-show) | `X-Internal-Key`; without `INTERNAL_API_KEY` operations answers 503 `BOOKING_SERVICE_UNAVAILABLE` |
| customer → booking `/internal/v1/bookings/active-count` (BIZ-08, before retiring a vehicle) | `X-Internal-Key`; without `INTERNAL_API_KEY`, or if booking does not answer, customer answers 503 `BOOKING_SERVICE_UNAVAILABLE` |
| notification and operations → security `/internal/v1/users/{id}/contact`, notification → `/internal/v1/users/admins` | `X-Internal-Key` |
| `deploy/publish-apk.sh` → notification `/internal/v1/notifications/app-update` | `X-Internal-Key`, from inside the Docker network |

`X-Internal-Key` is `INTERNAL_API_KEY` (`app.internal.api-key`), compared in constant time. The
`/internal/**` routes have their own filter chain that accepts only the key (never a user token) and
are never routed by the gateway (ADR-011 §8). The contracts mark them with `x-internal: true` and the
`internalKey` security scheme.

---

## Registration, e-mail and passwords

- **E-mail domain (A-01).** Registration, creating a user or an operator, and changing the e-mail
  require a domain listed in `ALLOWED_EMAIL_DOMAINS` (default `gmail.com`, compared without case after
  trimming); otherwise 400 `EMAIL_DOMAIN_NOT_ALLOWED`. Login and password recovery only check the
  format, so existing accounts with other domains can still sign in.
- Registration requires both consents (`acceptsTerms`, `acceptsDataPolicy`; 400 `CONSENT_REQUIRED`,
  SEC-07) and stores when they were accepted (Law 1581).
- Password policy enforced by security-service (`PasswordPolicy`, 400 `WEAK_PASSWORD` with
  `violations`); hashes with BCrypt.
- Recovery: a 6-digit code sent by e-mail, valid 15 minutes, burnt after 5 wrong attempts; the attempt
  that burns it and the next ones answer 423 `TOO_MANY_ATTEMPTS` (SEC-05).
- Changing the password or the e-mail and closing one's own account ask for the current password; a
  wrong one counts as a failed login and, with the account locked, they answer 423
  `TOO_MANY_ATTEMPTS` (SEC-12).
- Login answers the same error for unknown e-mail and wrong password (401 `INVALID_CREDENTIALS`).
- Lockout (RF-004b): 5 failed logins within 15 minutes lock the account for 15 minutes (`LoginLockout`,
  table `security.login_lockout`); login answers **423** `ACCOUNT_LOCKED` meanwhile. A successful login or a
  password reset clears the counter.

---

## Correlations

- ADR-006 → `05-architecture/decisions/records/ADR-006-authentication-and-authorization.md`
- Threats → `05-architecture/security-threat-model.md`
- Security service → `09-microservices/services/02-security-service/`
- Error codes of each operation → `contracts/openapi/<service>.yaml` (`x-codes`)
