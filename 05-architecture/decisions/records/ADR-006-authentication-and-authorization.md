# ADR-006 — Authentication and Authorization

| Field | Value |
|---|---|
| **ID** | ADR-006 |
| **Date** | 2026-09-24 |
| **Status** | Accepted |
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
| Claims | User id, role information and expiry; no unnecessary personal data |
| Passwords | BCrypt |
| Refresh token | Not used in this version |
| Roles | Administrator, Operator, Customer |
| Ownership | Checked by the owning service |
| Secret | Environment variable, never committed |

## Authorization model

The role check is followed by resource ownership/business-rule checks. A valid Operator token does not automatically authorise updates to every execution record.

## Service-to-service calls

The caller forwards the authenticated token and correlation id. The receiving service validates the token and applies its own authorization rules.

## Consequences

JWT avoids a security-service lookup on every request. The trade-off was that a token could not be revoked before expiry. Since 2026-10-21 that is no longer the case (see the update below).

## Update 2026-10-21 — closed sessions

A review found that a token kept working for up to an hour after a logout or after an administrator disabled the account. The decision above stays (each service verifies its own token), and two checks were added on top:

- security-service rejects a token whose session (`sid` claim) is closed or expired, on every one of its endpoints (`ActiveSessionValidator`), and exposes `GET /api/v1/auth/session` (204 open, 401 closed).
- The gateway asks that endpoint before forwarding a call with a token to any other service (`SessionCheckFilter`). The answer is kept 30 seconds per token, so it is one extra call per token and half minute, not per request; a logout through the gateway clears it at once.
- If security-service does not answer, the call goes on (the service still checks the signature): the check cannot take the API down.
- A token without `sid` is not tied to a session. Only someone holding the secret can sign one (the e2e tests do), and that person could put the `sid` of an open session anyway, so requiring it would protect nothing more.

In production only Caddy is published (`docker-compose.prod.yml`), so every outside call goes through the gateway and gets the check.

## Alternatives

External identity providers, per-request session validation and asymmetric signing were considered but are outside the current academic implementation. They may be revisited for a real deployment.

## References

- Gateway → `ADR-005-api-gateway.md`
- Security requirements → `04-requirements/non-functional.md`
- Security schema → `06-data/models.md`
