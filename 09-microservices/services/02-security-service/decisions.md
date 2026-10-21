# Technical decisions — Security Service

## HS256 with a shared secret, verified by each service

**Context:** Every service must verify the token (ADR-006) without calling security-service.
**Decision:** HS256 JWT, 1 hour, secret `JWT_SECRET` (≥ 32 bytes, startup fails otherwise). Each
service validates signature, issuer, audience and expiry with Spring's resource server.
**Consequences:** Simple to operate; every service holds the secret, so it must never be committed
(`.env` is git-ignored). Since 2026-10-21 a token of a closed session is rejected (next decision).

## A token of a closed session is rejected

**Context:** Logout, an account disabled by an admin or closed by its owner only set `revoked_at`; the
token kept working until its hour ran out.
**Decision:** The JWT decoder adds `ActiveSessionValidator` after the usual checks: the `sid` must be a
session of that user, not revoked and not expired (`SessionStatusUseCase`, one lookup by primary key).
`GET /api/v1/auth/session` answers 204 when the token gets through, so the gateway can ask the same
question for the other services. A token without `sid` is not tied to a session: only a holder of the
secret can sign one, and that person could use the `sid` of an open session anyway.
**Consequences:** Every request to security-service does one more indexed read. The other services
are covered by the gateway (see the API Gateway decisions).

## Login never reveals whether an email exists

**Decision:** Same error code and same BCrypt timing for "unknown email" and "wrong password";
a disabled account is reported only after a correct password.
**Consequences:** No account enumeration through the login form.

## Password recovery codes are hashed and single-use

**Decision:** 6-digit code, stored only as a BCrypt hash, valid 15 minutes, single use; a new
request invalidates the previous code and 5 failed attempts burn it.

## Internal routes use a shared key, not a user JWT

**Context:** notification-service needs a user's email; a user token cannot be used from a
scheduled task and must not let one user read another's contact.
**Decision:** `/internal/**` has its own security chain that ignores user JWTs and requires
`X-Internal-Key` = `INTERNAL_API_KEY` (constant-time comparison). Empty key = routes closed.
The gateway does not route `/internal/**`. See ADR-011 §8.
**Consequences:** The email stays in a single place and is always current; the key must be the
same in security-service and notification-service.
