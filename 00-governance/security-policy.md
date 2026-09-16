# Security Policy

> Security is not a feature — it is a system property built from day one. This document
> defines the mandatory practices.
> Any deviation must be explicitly approved by the Tech Lead.

---

## Security principles

1. **Defense in Depth:** Multiple security layers. If one fails, the others contain the damage.
2. **Least Privilege:** Each component has only the minimum necessary permissions.
3. **Fail Secure:** In case of error, the system denies access, does not allow it.
4. **Security by Design:** Security controls are designed from the start, not added at the end.
5. **Zero Trust:** Always verify, never implicitly trust, even within the internal network.

---

## Authentication

### JWT (JSON Web Tokens)

| Property | Required value |
|----------|---------------|
| Signing algorithm | HS256, shared secret delivered to every service as an environment variable (ADR-006) |
| Access token expiration | 1 hour (`exp`) — RNF-004.2 |
| Refresh token | **Not used in this version.** When the token expires, the user logs in again (ADR-006, evaluated and deferred — see "Planned evolution" in `05-architecture/overview.md`) |
| Required claims | User id and role codes only — no personal data beyond what authorization needs (RNF-004.9) |
| Client storage | Whatever Angular/React Native storage the client implementation chooses; the token is never logged |

**Prohibited in the payload:**
- Passwords
- Card data — moot in this project, since no card data is ever collected (ADR-008)
- Full PII (only the user ID and role codes)

### Session tracking and token revocation

- `security.user_session` records who logged in, when, and whether the session was closed — it answers "who was connected and when," it is **not** checked on every request (ADR-006)
- **A JWT cannot be revoked before it expires.** Logging out or locking an account closes the session row, but a token issued before that moment stays valid until its hour runs out. This is an accepted trade-off (`05-architecture/overview.md`, AT-007), not an oversight — checking `user_session` on every request would turn `security-service` into a bottleneck all ten services depend on

---

## Authorization

### RBAC (Role-Based Access Control)

Only three roles are seeded, exactly as defined in `security.role` (`06-data`, section 4) — there is no `SUPER_ADMIN` and no room for a custom role without a migration:

| Role | Description | Permissions |
|------|-------------|------------|
| `ADMINISTRATOR` | Business owner or manager | Configures the establishment, services and promotions; assigns/reassigns operators; reviews and approves payments; consults operational reports (RF-021 to RF-023) |
| `OPERATOR` | Performs the wash | Records their own availability; views and updates only the `service_execution` rows assigned to them (RF-008 to RF-012b, RF-022) |
| `CLIENT` | Registers vehicles and books | Manages their own vehicles and bookings, pays by QR, rates completed services, views only their own records (RF-005 to RF-016) |

**Permission model:**

The `security` schema also defines granular `permission` and `role_permission` tables (resource + action, e.g. `reserva:cancel`), inherited from the instructor's shared core. **This project's requirements only ask for role-level control** — whether services check fine-grained permissions or only the role is confirmed when the endpoints are designed in `07-api` (ADR-006, Pending decisions). Until then, treat the role as the unit of authorization.

**Validation:**
- The API Gateway rejects a request with a missing, invalid or expired JWT before it reaches any service (ADR-005)
- Each service validates the JWT again and checks the role for that endpoint — service-to-service calls do not pass through the gateway (ADR-004), so skipping this would leave internal calls unauthenticated
- On top of the role, each service checks **ownership**: an `OPERATOR` with a valid token still cannot update a `service_execution` line that is not theirs, and a `CLIENT` only reaches their own bookings, vehicles and payments

---

## Secure communication

### Transmission

- **HTTPS mandatory** in all environments except local
- TLS 1.2 minimum; TLS 1.3 recommended
- Certificates: Let's Encrypt (staging) / Corporate CA (production)
- HSTS enabled in production

### Internal service-to-service communication

- mTLS for service-to-service communication in production (if possible with service mesh)
- Bearer token or internal API key for services that do not support mTLS

---

## Secret management

```
✗ NEVER in source code
✗ NEVER in committed .env
✗ NEVER in logs
✗ NEVER in client error messages
✓ Environment variables (injected by the orchestrator)
✓ Vault (HashiCorp Vault, AWS Secrets Manager, etc.)
✓ Kubernetes Secrets (encrypted with KMS)
```

**Secret rotation:**
- API keys: every 90 days
- TLS certificates: 60 days before expiration
- DB passwords: every 6 months or immediately if compromise is suspected

---

## Input validation and sanitization

### General rules

1. **Never trust user input.** Validate at the edge (controller) before processing.
2. **Whitelist, not blacklist.** Define what is allowed, not only what is prohibited.
3. **Reject early.** If input is invalid, respond 400 and do not process further.

### SQL Injection — Prevention

```typescript
// ✗ VULNERABLE
const result = await db.query(`SELECT * FROM users WHERE email = '${userInput}'`);

// ✓ SAFE — always use prepared parameters
const result = await db.query('SELECT * FROM users WHERE email = $1', [userInput]);
```

### XSS — Prevention

```typescript
// ✗ VULNERABLE — rendering HTML without escaping
element.innerHTML = userProvidedContent;

// ✓ SAFE — use textContent or sanitize
element.textContent = userProvidedContent;
// or with library: DOMPurify.sanitize(userProvidedContent)
```

### Validation with Zod / Joi

```typescript
// Explicit validation schema in the controller
const CreateOrderSchema = z.object({
  clientId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive().max(1000),
    price: z.object({
      amount: z.number().positive(),
      currency: z.enum(['COP', 'USD']),
    }),
  })).min(1).max(50),
});
```

---

## OWASP Top 10 — Review checklist

| Vulnerability | Implemented control |
|---------------|-------------------|
| A01: Broken Access Control | RBAC + permission validation in each service |
| A02: Cryptographic Failures | TLS 1.2+, bcrypt for passwords, secrets in vault |
| A03: Injection | Prepared parameters in SQL, schema validation |
| A04: Insecure Design | Threat modeling in design, Security review |
| A05: Security Misconfiguration | IaC for configuration, review of defaults |
| A06: Vulnerable Components | Dependabot / Snyk for automatic updates |
| A07: Authentication Failures | JWT with rotation, brute-force protection |
| A08: Software Integrity Failures | Verify dependency checksums, SBOM |
| A09: Logging Failures | Logs without PII, centralized, with alerts |
| A10: SSRF | Whitelist of external URLs, do not follow redirects automatically |

---

## Audit and security logs

### Events that are ALWAYS recorded

```typescript
// Security events — store in a separate log, with retention > 1 year
const SECURITY_EVENTS = [
  'auth.login.success',
  'auth.login.failure',
  'auth.login.brute_force_detected',
  'auth.password.changed',
  'auth.token.revoked',
  'auth.unauthorized_access_attempt',
  'data.pii.accessed',
  'admin.role.changed',
  'admin.user.deleted',
];
```

**Required fields in security logs:**
- `userId` (or `ANONYMOUS` if not authenticated)
- `sourceIp`
- `action`
- `resource`
- `result` (SUCCESS / FAILURE)
- `timestamp`

---

## Vulnerability process

### What to do if you find a vulnerability

1. **Do not commit it to the public repo** or discuss it in open channels
2. Immediately notify the Tech Lead via a private channel
3. Create a private issue or a restricted repository issue
4. Severity is assigned (CVSS score or internal classification)
5. Remediated in the current sprint if critical, in the next sprint if high

### Remediation SLAs

| Severity | Remediation time |
|----------|----------------|
| Critical (CVSS 9-10) | 24 hours |
| High (CVSS 7-8.9) | 1 week |
| Medium (CVSS 4-6.9) | 1 month |
| Low (CVSS < 4) | Next security review |

---

## Correlations

- Security non-functional requirements → `04-requirements/non-functional.md`
- ADR on authentication → `05-architecture/decisions/`
- Security event observability → `13-operations/observability.md`
- RBAC implemented in → `09-microservices/services/XX-auth-service/`
