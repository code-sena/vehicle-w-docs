# Technical Security Rules

> Mandatory technical controls that apply to all project code.
> These rules complement the security policy (`security-policy.md`) with
> concrete implementation practices.

---

## OWASP Top 10 — Controls per category

### A01 — Broken Access Control

```typescript
// ❌ BAD — trusting frontend data
const userId = req.body.userId;

// ✅ GOOD — extract from verified JWT token
const userId = req.user.sub; // req.user comes from the authentication middleware
```

**Rules:**
- Every protected endpoint MUST have the authentication middleware applied
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
```typescript
// ❌ BAD — direct concatenation
const user = await db.query(`SELECT * FROM users WHERE id = ${userId}`);

// ✅ GOOD — parameterized query
const user = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// ✅ GOOD — ORM with typed parameters
const user = await userRepository.findOne({ where: { id: userId } });
```

**Rules:**
- Parameterized queries ALWAYS. Zero concatenated strings in SQL
- Validate and sanitize all inputs with a validation library (Zod, Joi, class-validator)
- In GraphQL: limit query depth with `graphql-depth-limit`

### A04 — Insecure Design

- Every HU that exposes user data must undergo privacy review (RNF-004.9, Colombian Law 1581 of 2012)
- Bulk query endpoints have mandatory pagination
- **Internal IDs are sequential `IDENTITY(1,1)` integers, not UUIDs — by design (ADR-003), not an oversight.** They are never exposed as the sole access control: exposing a sequential id is not the same as authorizing access to it, and every endpoint still checks role and ownership (A01) regardless of how guessable the id is

### A05 — Security Misconfiguration

```
# Verification checklist per environment
□ Stack traces NOT visible in production
□ Security headers configured (Helmet.js or equivalent):
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
- Account lockout after **5 consecutive failed attempts, for 15 minutes** — this is the definition RF-004b was missing (`05-architecture/overview.md`, closes AT-004). Confirm this in `04-requirements/functional.md` before building the feature
- No rate limiting at the gateway: there is no public exposure to rate-limit against (ADR-005, Pending decisions) — the account lockout above is the actual defense against brute-forcing a single account

### A08 — Software and Data Integrity Failures

- Verify the Docker image digest for `sqlserver` and `rabbitmq` matches what the team last tested — there is no production registry to pull from, only the local Compose environment (`05-architecture/deployment.md`)
- There are no third-party webhooks: payment verification is manual, in-house (ADR-008)
- Validate that messages from RabbitMQ have the expected schema before processing them — there is no Kafka in this stack (ADR-004)

### A09 — Security Logging and Monitoring Failures

- Every failed authentication must be logged with the account and timestamp (no IP/user-agent capture is planned — the environment is local Docker, not a public-facing service)
- Log delete operations with who, when, and what was deleted — covered by the audit block on every domain table (`deleted_at`/`deleted_by`) and `audit.audit_log` (`06-data`, ADR-003)
- Security logs are plain output, readable with `docker logs` — there is no log retention policy or alerting stack: `04-requirements/non-functional.md` explicitly drops metrics and alerting from this academic delivery's scope

### A10 — Server-Side Request Forgery (SSRF)

- URLs constructed from user input MUST be validated against an allowlist of permitted domains
- Do not fetch from private IPs (192.168.x.x, 10.x.x.x, 127.x.x.x) from the server

---

## User input handling

```typescript
// Example with Zod — always validate in the Controller/Adapter layer
const CreateUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100).trim(),
  role: z.enum(['ADMIN', 'USER', 'VIEWER']),
});

// The result is typed and sanitized
const parsed = CreateUserSchema.parse(req.body);
```

**Rule:** All external inputs (HTTP body, query params, path params, broker messages)
pass through a validation schema before reaching the domain.

---

## Secure error handling

```typescript
// ❌ BAD — exposes internal details
res.status(500).json({ error: error.message, stack: error.stack });

// ✅ GOOD — generic message + traceId for internal correlation
res.status(500).json({
  error: 'INTERNAL_SERVER_ERROR',
  message: 'Internal server error',
  traceId: req.headers['x-trace-id'],
});
```

---

## Correlations

- Security policy (management, access, vault) → `00-governance/security-policy.md`
- System threat model → `05-architecture/security-threat-model.md`
- Authentication and JWT → `07-api/authentication.md`
- Observability and security logs → `13-operations/observability.md`
