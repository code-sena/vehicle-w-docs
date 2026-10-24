# ADR-005 — API Gateway

| Field | Value |
|---|---|
| **ID** | ADR-005 |
| **Date** | 2026-09-24 |
| **Status** | Accepted (implementation notes 2026-10-04 and 2026-10-23) |
| **Authors** | Development team |
| **Reviewers** | Development team |

## Context

The Angular web client and React Native Android client should not need to know the internal addresses of six backend services. Authentication also needs one edge where anonymous traffic can be rejected before routing.

## Decision

Use a single **API Gateway** as the external HTTP entry point. The current stack uses Spring Cloud Gateway.

The gateway is infrastructure, not a domain service. It routes requests to the six backend services and performs the edge authentication check. Each service still validates the JWT and applies its own authorization/ownership rules.

## Responsibilities

- Route client requests.
- Reject missing/invalid JWTs at the edge.
- Forward the Authorization header.
- Generate or forward a correlation id.
- Apply request/file limits relevant to the API.

## Non-responsibilities

The gateway does not contain booking, payment, assignment or loyalty business rules. It does not become a shared business-logic layer.

## Consequences

Clients have one base URL and internal service addresses remain an implementation detail. The gateway becomes a required component for external traffic, so its health must be checked in the local deployment.

## Implementation note (2026-10-04)

The gateway was built with Spring Cloud Gateway 2025.1 on Spring MVC (`lavarapido-api-gateway`, port 8080). Two responsibilities above were deliberately **not** implemented in the gateway:

- **Edge JWT rejection:** the gateway forwards `Authorization` unchanged and every service validates the token (ADR-006). An anonymous request to a protected route reaches the service and gets its 401. This keeps one source of truth for security and protects services that are called directly. *(Changed on 2026-10-21, see the note below: the gateway now cuts tokens of closed sessions.)*
- **Correlation id generation and request limits:** not done; each service generates its own correlation id (see `13-operations/observability.md`).

Added: CORS is answered by the gateway, and `/internal/**` is never routed. Details → `09-microservices/services/01-api-gateway/decisions.md`.

## Implementation note (2026-10-23): the gateway cuts closed-session tokens

Since 2026-10-21 the gateway **does** reject tokens at the edge, but only for one reason: their
session is closed. `SessionCheckFilter` (`lavarapido-api-gateway`) runs on every `/api/**` request
that carries `Authorization: Bearer …`, except the public `/api/v1/auth/**` routes:

- It asks security-service `GET /api/v1/auth/session` with the same header. A closed session
  (logout, account disabled or deactivated, password changed or recovered, a role removed — E-02,
  ADR-006) answers 401 and the gateway returns that 401 without calling the target service.
- The answer is cached per token (SHA-256 of the header) for `SESSION_CHECK_CACHE_TTL` (30 s), up to
  10,000 tokens; `POST /api/v1/auth/logout` removes the token from the cache at once.
- If security-service does not answer within `SESSION_CHECK_TIMEOUT` (3 s) the request goes on
  (fail-open): the service behind still verifies signature and expiry, and a security outage does not
  take the rest of the API down.
- Signature, expiry and roles are still checked by each service, not by the gateway.

Also since 2026-10-23 (E-01) the gateway no longer routes `/api/v1/operator/bookings/**`: only
operations-service calls those booking routes, inside the Docker network and with `X-Internal-Key`.

**Known gap (SEC-01, open):** the filter only recognises the exact prefix `Bearer ` (capital B),
while Spring Security and .NET JwtBearer accept `bearer`/`BEARER`. A token of a closed session sent
with `bearer` skips the check and keeps working until it expires (at most 1 hour) in customer,
booking, operations, notification and payment; security-service itself rejects it
(`ActiveSessionValidator`). The fix is a case-insensitive prefix check plus a test in
`SessionCheckFilterTest` (`15-project-control/risks.md`).

Still not done: correlation id generation (the gateway forwards `X-Correlation-Id`; each service
generates one when it is missing) and request rate limits (SEC-04: Caddy and the gateway have no
limit on `/api/v1/auth/**`).

## References

- Security → `ADR-006-authentication-and-authorization.md`
- Deployment → `../deployment.md`
