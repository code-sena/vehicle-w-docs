# Technical decisions — API Gateway

> Internal design decisions of this service not covered by the global ADRs.

---

## The JWT is validated by each service, not by the gateway

**Date:** 2026-10-04
**Context:** Two strategies: (A) the gateway verifies the JWT and passes `X-User-Id` /
`X-User-Role` to the services; (B) each microservice verifies its own token.

**Decision:** Strategy B, already fixed by ADR-006. The gateway forwards `Authorization` unchanged
and adds no user headers.

**Consequences:**
- The services already validate signature, issuer, audience and expiry; nothing changes in them.
- A service stays protected even when called without the gateway (e.g. in development through
  `proxy.conf.json`).
- No risk of a client forging `X-User-*`, because nobody trusts such headers.
- The signature is checked once per service instead of once at the gateway: negligible cost.

---

## CORS is answered by the gateway

**Date:** 2026-10-04
**Context:** Browsers send a preflight (`OPTIONS`) before a cross-origin call. Spring Cloud Gateway
(webmvc) answers that preflight itself, so the services' CORS never reaches the browser and the
call is blocked.

**Decision:** The gateway configures CORS (`CorsConfig`, same origins as the services through
`CORS_ALLOWED_ORIGINS`) and every route removes the CORS headers returned by the service
(`RemoveResponseHeader`), because a duplicated `Access-Control-Allow-Origin` is also rejected by
browsers.

**Consequences:** Services keep their own CORS for direct calls in development; allowed origins
are changed in one place (`.env`).

---

## Gateway implementation

**Date:** 2026-10-04
**Context:** Options: (A) Spring Cloud Gateway, (B) NGINX/Kong, (C) a custom gateway.

**Decision:** (A) Spring Cloud Gateway 2025.1 on Spring MVC (`gateway-server-webmvc`), compatible
with Spring Boot 4, as ADR-005 states.

**Consequences:**
- Same stack (Java 21, Spring Boot, Maven, Docker) as every other service.
- Routes live in `application.yml` and are tested with `./mvnw test`.
- Servlet (webmvc) instead of reactive: simpler and enough for the project's load.

---

## Tokens of closed sessions are cut here

**Date:** 2026-10-21
**Context:** A review found that a token kept working for up to an hour after a logout or after an
administrator disabled the account: the services only check signature and expiry. Options: (A) every
service asks security-service, (B) the gateway asks once for all of them, (C) shorter tokens.

**Decision:** (B). `SessionCheckFilter` runs right after CORS and, for a call with a token outside
`/api/v1/auth/**`, asks security-service `GET /api/v1/auth/session` with the same `Authorization`. A
401 is returned to the client as is; any 2xx lets the call go on. The answer is kept 30 seconds per
token (by its SHA-256), and a logout through the gateway clears it. If security-service fails or does
not answer in 3 seconds, the call goes on and nothing is cached.

**Consequences:**
- No service had to change: one place covers customer, booking, operations, payment and notification.
- One extra call per token every 30 seconds, not per request.
- Disabling an account takes up to 30 seconds to reach the other services; a logout is immediate.
- The filter runs after CORS so the browser can read the 401 (without CORS headers it would see a
  network error instead of "session expired").
- Calls that skip the gateway (only possible inside the Docker network or in development) are not
  checked; security-service's own endpoints are checked anyway.

---

## Pending decision: rate limiting

**Context:** Limit requests per IP on login/registration and per user on the rest.

**Status:** Not implemented. It needs a shared store (Redis) the project does not have; to be
revisited if the system is published on the internet. Today security-service only limits the
attempts on a password-recovery code (5 failures burn it); login has no attempt limit (RF-004b).

---

## Correlations

- Global ADRs → `05-architecture/decisions/records/` (ADR-005, ADR-006, ADR-011)
- Gateway runbook → `runbook.md`
