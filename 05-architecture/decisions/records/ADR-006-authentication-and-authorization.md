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

JWT avoids a security-service lookup on every request. The trade-off is that a token cannot be revoked immediately in this version; it can remain valid until expiry.

## Alternatives

External identity providers, per-request session validation and asymmetric signing were considered but are outside the current academic implementation. They may be revisited for a real deployment.

## References

- Gateway → `ADR-005-api-gateway.md`
- Security requirements → `04-requirements/non-functional.md`
- Security schema → `06-data/models.md`
