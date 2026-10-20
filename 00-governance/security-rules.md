# Technical Security Rules

> Mandatory technical controls that apply to all project code.
> These rules complement the security policy (`security-policy.md`) with
> concrete implementation practices.

---

## OWASP Top 10 — Controls per category

### A01 — Broken Access Control

```java
// ❌ BAD — trusting frontend data
long userId = request.userId();

// ✅ GOOD — extract it from the verified JWT (each service has its own AuthenticatedUser)
long userId = AuthenticatedUser.from(jwt).userId();
```

**Rules:**
- Every endpoint is authenticated by default (`SecurityConfig` of each service); public paths are listed explicitly per service, and role rules are declared on the paths (for example `/api/v1/admin/**` requires `ADMIN`)
- Permissions are verified in the application layer, not the controller (hexagonal architecture, ADR-007)
- A resource is only returned to the role allowed to read it — see `security-policy.md` for the three seeded roles
- On top of the role, ownership is checked in the service: an `OPERATOR` only reaches their own `service_execution` rows, a `CLIENT` only their own bookings/vehicles/payments (ADR-006)

### A02 — Cryptographic Failures

**Rules:**
- Passwords: **BCrypt** (RNF-004.3). Never MD5 or SHA-1 for passwords
- JWTs: this project signs with **HS256 and a shared secret**, not RS256 — a deliberate, documented trade-off (ADR-006), not an oversight. Every service holds the secret as an environment variable, and the accepted risk is tracked as `05-architecture/overview.md`, AT-006. RS256 is the planned evolution if the project moves past the academic delivery
- Sensitive data in transit: HTTPS mandatory outside the team's own machines; HTTP is acceptable for local development only (RNF-004.8)
- Never log passwords, tokens, or payment receipt contents

### A03 — Injection

**SQL:**
```java
// ❌ BAD — direct concatenation
jdbc.queryForList("SELECT * FROM customer.customer WHERE customer_id = " + id);

// ✅ GOOD — named parameter
jdbc.query("SELECT ... FROM customer.customer WHERE customer_id = :id", new MapSqlParameterSource("id", id), mapper);

// ✅ GOOD — Spring Data JPA with typed parameters (booking-service)
bookingJpaRepository.findWithLinesById(id);
```

**Rules:**
- Parameterized queries ALWAYS. Zero concatenated strings in SQL
- Validate every request body with Bean Validation (`jakarta.validation`) in the REST adapter; the Angular forms validate too, but only as a convenience
- There is no GraphQL in this stack

### A04 — Insecure Design

- Every HU that exposes user data must undergo privacy review (RNF-004.9, Colombian Law 1581 of 2012)
- Bulk query endpoints have mandatory pagination
- **Internal IDs are sequential `IDENTITY(1,1)` integers, not UUIDs — by design (ADR-003), not an oversight.** They are never exposed as the sole access control: exposing a sequential id is not the same as authorizing access to it, and every endpoint still checks role and ownership (A01) regardless of how guessable the id is

### A05 — Security Misconfiguration

```
# Verification checklist per environment
□ Stack traces NOT visible in production
□ Security headers configured (Spring Security defaults):
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - Content-Security-Policy defined
  - Strict-Transport-Security in production
□ Unnecessary ports closed
□ Development credentials NOT in production
```

### A06 — Vulnerable Components

**Rules:**
- Run `mvn versions:display-dependency-updates` (or the Gradle equivalent) before each academic delivery — there is no continuous release cycle to gate, so this runs per milestone, not per merge
- Critical/High vulnerabilities in a dependency are fixed before the next review session
- Do not use floating versions; pin exact versions in `pom.xml` / `build.gradle`

### A07 — Identification and Authentication Failures

- JWT with maximum expiration of **1 hour** for access tokens (RNF-004.2)
- **No refresh tokens in this version.** The user logs in again once the token expires — deferred by ADR-006, not implemented as a stopgap
- Account lockout after **5 failed attempts within 15 minutes, for 15 minutes** — the definition of RF-004b (`05-architecture/overview.md`, closes AT-004), now stated in `04-requirements/functional.md`. The counters are stored in `security.login_lockout` (migration 034), so a restart of `security-service` does not clear them; only the password recovery code attempts are counted in memory
- No rate limiting yet at the gateway or in Caddy, even though the academic server is public (TD-022, ADR-005 Pending decisions) — the account lockout above is the current defense against brute-forcing a single account

### A08 — Software and Data Integrity Failures

- Verify the Docker image digest for `sqlserver` and `rabbitmq` matches what the team last tested — there is no image registry: the local environment and the Azure server build the same Compose files (`05-architecture/deployment.md`)
- There are no third-party webhooks: payment verification is manual, in-house (ADR-008)
- Validate that messages from RabbitMQ have the expected schema before processing them — there is no Kafka in this stack (ADR-004)

### A09 — Security Logging and Monitoring Failures

- Every failed authentication must be logged with the account and timestamp; successful logins also record IP and user agent in `security.user_session`
- Records with history are deactivated, not deleted; the tables keep the audit columns (`deleted_at`/`deleted_by`), but `audit.audit_log` is not written yet (corrective action ACO-04 in `lavarapido-docs`)
- Security logs are plain output, readable with `docker logs` — there is no log retention policy or alerting stack: `04-requirements/non-functional.md` explicitly drops metrics and alerting from this academic delivery's scope

### A10 — Server-Side Request Forgery (SSRF)

- URLs constructed from user input MUST be validated against an allowlist of permitted domains
- Do not fetch from private IPs (192.168.x.x, 10.x.x.x, 127.x.x.x) from the server

---

## User input handling

```java
// Bean Validation in the REST adapter (security-service)
public record RegisterRequest(@NotBlank @Size(max = 20) String documentNumber,
                              @NotBlank @Size(max = 60) String firstName,
                              @NotBlank @Size(max = 60) String lastName,
                              @NotBlank @Email @Size(max = 60) String email,
                              @Size(max = 20) String phone,
                              @NotBlank @Size(max = 72) String password,
                              Boolean acceptsTerms,
                              Boolean acceptsDataPolicy) { }

// @Valid on the controller parameter rejects a bad shape with 400 before the use case runs
public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest body) { ... }
```

**Rule:** All external inputs (HTTP body, query params, path params, broker messages)
pass through a validation schema before reaching the domain.

---

## Secure error handling

```java
// ❌ BAD — exposes internal details
return ResponseEntity.status(500).body(e.getMessage() + Arrays.toString(e.getStackTrace()));

// ✅ GOOD — RFC 9457 problem+json body with a stable code, same shape in every service (ApiExceptionHandler)
//   { "title": "Conflict", "status": 409, "detail": "...", "code": "SLOT_UNAVAILABLE" }
// The frontend translates the code; unexpected errors return a generic 500 with code INTERNAL_ERROR.
```

---

## Correlations

- Security policy (roles, JWT, secrets) → `00-governance/security-policy.md`
- System threat model → `05-architecture/security-threat-model.md`
- Authentication and JWT → `07-api/authentication.md`
- Observability and security logs → `13-operations/observability.md`
