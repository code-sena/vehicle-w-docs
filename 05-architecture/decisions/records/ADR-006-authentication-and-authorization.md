# ADR-006 — Authentication and Authorization

| Field | Value |
|---|---|
| **ID** | ADR-006 |
| **Date** | 2026-09-24 |
| **Status** | Accepted (updated 2026-10-21, 2026-10-23 and 2026-10-24) |
| **Authors** | Development team |
| **Reviewers** | Development team |

## Context

Customers, operators and administrators have different permissions. A valid role alone is not enough: ownership rules also matter. For example, an operator must not update another operator's execution, and a customer must not access another customer's booking.

## Decision

Use stateless JWT authentication. `security-service` issues the token. The gateway and every backend service verify the token, while authorization is enforced by the service that owns the requested resource.

| Element | Decision |
|---|---|
| Token | JWT Bearer token |
| Issuer | `security-service` |
| Algorithm | HS256 for current academic deployment |
| Lifetime | One hour |
| Claims | `sub` (user id), `roles`, `sid` (session id), `iss`, `aud`, `iat`, `nbf`, `exp`, `jti`; no personal data |
| Passwords | BCrypt |
| Refresh token | Not used in this version |
| Roles | Administrator, Operator, Customer — fixed: there is no endpoint to change a user's roles (ADR-015) |
| Ownership | Checked by the owning service |
| Secret | Environment variable, never committed |

## Authorization model

The role check is followed by resource ownership/business-rule checks. A valid Operator token does not automatically authorise updates to every execution record.

## Service-to-service calls

The caller forwards the authenticated token and correlation id. The receiving service validates the token and applies its own authorization rules.

Calls that have no user token (automatic assignment, reminders, emails, the APK notice) go to
`/internal/**` with the shared key `X-Internal-Key` (`INTERNAL_API_KEY`). The key is compared in
constant time; an empty key closes those routes; the gateway never routes `/internal/**`. Since
2026-10-23 (E-01) booking also requires the key, together with the operator's token, on
`/api/v1/operator/bookings/**`: only operations-service, which checks that the booking is assigned
to that operator, can move a booking to `IN_PROGRESS` or `COMPLETED`. The gateway no longer routes
those paths.

## Consequences

JWT avoids a security-service lookup on every request. The trade-off was that a token could not be revoked before expiry. Since 2026-10-21 that is no longer the case (see the update below).

## Update 2026-10-21 — closed sessions

A review found that a token kept working for up to an hour after a logout or after an administrator disabled the account. The decision above stays (each service verifies its own token), and two checks were added on top:

- security-service rejects a token whose session (`sid` claim) is closed or expired, on every one of its endpoints (`ActiveSessionValidator`), and exposes `GET /api/v1/auth/session` (204 open, 401 closed).
- The gateway asks that endpoint before forwarding a call with a token to any other service (`SessionCheckFilter`). The answer is kept 30 seconds per token, so it is one extra call per token and half minute, not per request; a logout through the gateway clears it at once.
- If security-service does not answer, the call goes on (the service still checks the signature): the check cannot take the API down.
- A token without `sid` is not tied to a session. Only someone holding the secret can sign one (the e2e tests do), and that person could put the `sid` of an open session anyway, so requiring it would protect nothing more.

In production only Caddy is published (`docker-compose.prod.yml`), so every outside call goes through the gateway and gets the check.

## Update 2026-10-22 and 2026-10-23 — more ways to close a session

On top of logout and disabled accounts, these now close sessions (security-service, `user_session.revoked_at`):

| Event | Sessions closed | Since |
|---|---|---|
| The user changes the password (`PUT /users/me/password`) | Every other session; the one in use stays open | 2026-10-22 |
| The password is recovered (`POST /auth/password/reset`) | Every session of the account | 2026-10-22 |
| A role in the token is no longer in `security.user_role`, or the account is inactive (E-02) | Every session of the account, the first time any of its tokens is checked | 2026-10-23 |

E-02: `ActiveSessionValidator` compares the `roles` claim with the account's current roles. There is
no endpoint to remove a role (roles are fixed), so retiring an administrator is a manual change in
`security.user_role`; the next check revokes all their sessions and they must log in again with the
roles they have now. The gateway sees it within the 30-second cache.

Login lockout (2026-10-22): five failed passwords lock the account for 15 minutes. Concurrent
failed logins of the same account are counted one at a time with `sp_getapplock` (exclusive,
transaction owner, 10 s timeout), so a burst of parallel attempts cannot get more than five tries.

E-05 (2026-10-23): security-service has no default Spring profile, and the demo accounts' passwords
come from `DEMO_*_PASSWORD` instead of the code, so a deployment that forgets the profile does not
start with Swagger or demo accounts.

**Open gaps (2026-10-23):** SEC-01 and SEC-04 were closed on 2026-10-24 (next section). The session
check is still fail-open and cached 30 s (accepted trade-off above).

## Update 2026-10-24 — attempt caps, consent and role-only routes

Merged to `develop` on 2026-10-24 (security `b5fe56e`, 200 tests; gateway `c8b607a`, 62 tests;
booking `5dd6794`; customer `3181cae`).

| Finding | Rule now |
|---|---|
| SEC-01 | The gateway checks the session with any scheme and on any path; logout clears every variant (ADR-005) |
| SEC-04 | 60 requests per minute per client IP on `/api/v1/auth/**`, then 429 `RATE_LIMITED` with `Retry-After`; the real IP comes from `X-Forwarded-For` only behind `TRUSTED_PROXIES`. `/password/forgot` also pays the BCrypt cost for an unknown email, so its timing does not reveal accounts |
| SEC-05 | Recovery code: `sp_getapplock` per user in `checkCode`; the 5th wrong code burns it and answers 423 `TOO_MANY_ATTEMPTS` until a new code is requested or it expires (the counter is in memory: a restart forgets it) |
| SEC-12 | A wrong current password (change password, change email, deactivate account) counts in the login lockout (5 in 15 min); while locked, 423 `TOO_MANY_ATTEMPTS`, and the login answers `ACCOUNT_LOCKED` |
| SEC-07 | Registration without both boxes (`acceptsTerms`, `acceptsDataPolicy`) — or with only one — answers 400 `CONSENT_REQUIRED` |
| SEC-11 | Passwords are capped at 72 characters **and** 72 UTF-8 bytes (BCrypt); before, 40 «ñ» gave a 500, now 400 `WEAK_PASSWORD`. The session stores the real client IP |
| A-01 | Changing the email to the current one (even if not gmail) is accepted unchanged |
| SEC-09 | 403 tests with CLIENT and OPERATOR on the admin endpoints and on `/users/me/password` and `/users/me/email` |
| BIZ-12 / A-10 | `/api/v1/bookings/**` and `/api/v1/vehicles/**` accept only `CLIENT` (403 for ADMIN and OPERATOR), so no client profile is created for staff; `availability` and `cancellation-reasons` stay open to ADMIN for the admin's booking form |

**Still open:** a `sp_getapplock` timeout (10 s) answers 500 instead of 409 (low); the rate-limit bucket
and the recovery-code counter live in memory, per replica. SEC-14 (Sonar), SEC-15, D-02 and E-21 are
documented as accepted in the services' READMEs.

**Accepted risk (H-18):** the web keeps the session, token included, in `localStorage`
(`auth_session`), readable by any script that runs on the page. The mobile app uses SecureStore on
the phone. Moving the web to an HttpOnly cookie would need CSRF protection and a refresh flow, which
this version does not have; the one-hour expiry, the session check and the CSP limit the impact.

## Alternatives

External identity providers, per-request session validation and asymmetric signing were considered but are outside the current academic implementation. They may be revisited for a real deployment.

## References

- Gateway → `ADR-005-api-gateway.md`
- Security requirements → `04-requirements/non-functional.md`
- Security schema → `06-data/models.md`
