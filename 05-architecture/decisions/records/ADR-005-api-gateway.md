# ADR-005 — API Gateway

| Field | Value |
|---|---|
| **ID** | ADR-005 |
| **Date** | 2026-09-24 |
| **Status** | Accepted (implementation notes 2026-10-04, 2026-10-23 and 2026-10-24) |
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

**Known gap (SEC-01):** the filter only recognised the exact prefix `Bearer ` (capital B). Closed on
2026-10-24, see below.

## Implementation note (2026-10-24): any scheme, rate limit, client IP and timeouts

Merged to `develop` on 2026-10-24 (gateway `c8b607a`, 62 tests in CI).

- **SEC-01 — any scheme, any path.** `SessionCheckFilter` checks the session of **every** request
  that carries `Authorization`, whatever the scheme (`Bearer`, `bearer`, `BEARER`, `Basic`) and
  whatever the path (`//api` included). The cache key is the token alone (without the scheme), so
  logout clears it in all its variants, before and after calling security.
- **SEC-04 — rate limit on `/api/v1/auth/**`.** A bucket per client IP: 60 requests that refill in one
  minute (`AUTH_RATE_LIMIT_REQUESTS`, `AUTH_RATE_LIMIT_WINDOW`, `AUTH_RATE_LIMIT_ENABLED`). Over it,
  429 `RATE_LIMITED` (ProblemDetail) with `Retry-After` and CORS. The path is matched decoded. The
  bucket lives in memory, per replica, and IPv6 is not grouped by /64.
- **Client IP.** `ClientIpResolver` trusts `X-Forwarded-For` only when the connection comes from
  `TRUSTED_PROXIES` (private and local ranges by default, where Caddy lives) and reads it right to
  left; Caddy rewrites that header, so a client cannot fake it. The gateway forwards the resolved IP to
  the services (SEC-11), and security-service only trusts `X-Forwarded-For` from private or local
  addresses (`forward-headers-strategy: native`), so `user_session.ip_address` is the real client.
- **SEC-16 — route timeouts.** `ROUTE_CONNECT_TIMEOUT` 5 s and `ROUTE_READ_TIMEOUT` 60 s; a route
  that takes longer answers a generic 500 (no new error code).

Still not done: correlation id generation (the gateway forwards `X-Correlation-Id`; each service
generates one when it is missing). Accepted: D-02 (gateway README).

## References

- Security → `ADR-006-authentication-and-authorization.md`
- Deployment → `../deployment.md`
