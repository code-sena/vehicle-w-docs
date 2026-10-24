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
| Required claims | Identifiers and role codes only — `sub` (user id), `roles`, `sid` (session id), `iss`, `aud`, `iat`, `nbf`, `exp`, `jti`. No personal data beyond what authorization needs (RNF-004.9) |
| Client storage | Web: `localStorage` (`auth_session`), an accepted risk for version 1 (H-18, ADR-020); mobile: SecureStore on the phone. The token is never logged |

**Prohibited in the payload:**
- Passwords
- Card data — moot in this project, since no card data is ever collected (ADR-008)
- Full PII (only identifiers and role codes: no name, e-mail, phone or document number)

### Session tracking and token revocation

- `security.user_session` records who logged in, when, and whether the session was closed: logout, account disabled by an administrator, account closed by its owner, password changed (the other sessions, since 2026-10-22), password recovered (all, since 2026-10-22) and a role removed from `security.user_role` (all, E-02, since 2026-10-23)
- **A token of a closed session stops working** (since 2026-10-21, ADR-006 update). security-service rejects it on its own endpoints, and the gateway asks security-service (`GET /api/v1/auth/session`) before forwarding a call to any other service, keeping the answer 30 seconds per token (`SESSION_CHECK_CACHE_TTL`). A logout that goes through the gateway takes effect at once; disabling an account reaches the other services within those 30 seconds
- If security-service does not answer, the gateway lets the call go on: the service behind it still checks signature and expiry, so an outage of security-service does not take the rest of the API down. A lockout (RF-004b) only blocks new logins; it does not close sessions already open
- **SEC-01 (closed on 2026-10-24):** the gateway used to check only headers that start with `Bearer ` (capital B). Since gateway `2e20204` it checks every request that carries `Authorization`, with any scheme and on any path, and a logout clears the cached answer in all its variants
- **Attempt caps (2026-10-24):** 60 requests per minute per client IP on `/api/v1/auth/**` (429 `RATE_LIMITED`, SEC-04); the 5th wrong recovery code burns it (423 `TOO_MANY_ATTEMPTS`, SEC-05); wrong current passwords count in the login lockout (SEC-12); sign-up requires both consent boxes (400 `CONSENT_REQUIRED`, SEC-07); passwords are limited to 72 characters and 72 UTF-8 bytes (SEC-11)

---

## Authorization

### RBAC (Role-Based Access Control)

Only three roles are seeded, exactly as defined in `security.role` (`06-data`, section 4) — there is no `SUPER_ADMIN` and no room for a custom role without a migration:

| Role | Description | Permissions |
|------|-------------|------------|
| `ADMIN` | Business owner or manager (the *Administrator*) | Configures the establishment, services and promotions; assigns/reassigns operators; reviews and approves payments; consults operational reports (RF-021 to RF-023); creates operator and administrator accounts and activates or deactivates accounts (RF-028). The role is set when the account is created and there is no endpoint to change it; an administrator account cannot be deactivated (`ADMIN_CANNOT_BE_DISABLED`) and an administrator cannot deactivate their own account |
| `OPERATOR` | Performs the wash | Records their own availability; views and updates only the `service_execution` rows assigned to them (RF-008 to RF-012b, RF-022) |
| `CLIENT` | Registers vehicles and books | Manages their own vehicles and bookings, pays by QR, rates completed services, views only their own records (RF-005 to RF-016) |

**Permission model:**

The `security` schema also defines granular `permission` and `role_permission` tables (resource + action, e.g. `booking:cancel`), inherited from the instructor's shared core. The administrator can view and edit this matrix for the three fixed roles (RF-029), but it is informative: **authorization is decided by the role in the JWT** (ADR-015). Applying the matrix to each endpoint is an open improvement.

**Validation:**
- The API Gateway only routes and answers CORS; it does **not** validate the JWT (ADR-005)
- Each service validates the JWT and checks the role for that endpoint — service-to-service calls do not pass through the gateway (ADR-004), and the `/internal/**` routes require the shared `X-Internal-Key` header
- On top of the role, each service checks **ownership**: an `OPERATOR` with a valid token still cannot update a `service_execution` line that is not theirs, and a `CLIENT` only reaches their own bookings, vehicles and payments

---

## Secure communication

### Transmission

- **HTTPS mandatory** in all environments except local
- TLS 1.2 minimum; TLS 1.3 recommended
- Certificates: Let's Encrypt, issued and renewed automatically by Caddy on the academic Azure server
- HSTS enabled on the public server

### Internal service-to-service communication

- Services talk over the internal Docker network and are not published outside it; only the API Gateway is exposed
- A service calling another forwards the **caller's JWT** and correlation id (`05-architecture/cross-cutting.md`), so the called service authorises the original user, not the calling service
- mTLS is not used in this version (no service mesh); it is the evolution if the services ever run on separate hosts

---

## Secret management

```
✗ NEVER in source code
✗ NEVER in committed .env
✗ NEVER in logs
✗ NEVER in client error messages
✓ Environment variables, read from a local .env file that is git-ignored (Docker Compose)
✓ .env.example in the repository, with placeholder values only
✓ Target: one database login per service, with rights only on its own schemas (ADR-003 / ADR-009). Today every service still uses `sa`: accepted risk for version 1 (H-10, ADR-020; preventive action AP-08 in `lavarapido-docs`)
```

**Secret rotation:**
- The JWT secret (at least 32 characters, HS256) and the database passwords are changed before any shared or public deployment, and immediately if a compromise is suspected
- Demo credentials never reach a public deployment: since 2026-10-23 (E-05) security-service has no default profile and the demo passwords come only from `DEMO_*_PASSWORD` in the local `.env`; production runs the `prod` profile, which creates no demo account
- TLS certificates: renewed before expiration (Let's Encrypt)

---

## Input validation and sanitization

### General rules

1. **Never trust user input.** Validate at the edge (controller) before processing.
2. **Whitelist, not blacklist.** Define what is allowed, not only what is prohibited.
3. **Reject early.** If input is invalid, respond 400 and do not process further.

### SQL Injection — Prevention

```java
// ✗ VULNERABLE — concatenating user input into SQL
jdbc.queryForList("SELECT user_id FROM security.app_user WHERE username = '" + email + "'");

// ✓ SAFE — named parameters (NamedParameterJdbcTemplate), as every adapter in the project does
jdbc.queryForList("SELECT user_id FROM security.app_user WHERE username = :email",
        new MapSqlParameterSource("email", email), Long.class);
```

### XSS — Prevention

```typescript
// Angular (web client). ✗ VULNERABLE — bypassing Angular's sanitizer
this.sanitizer.bypassSecurityTrustHtml(userProvidedContent);
element.innerHTML = userProvidedContent;

// ✓ SAFE — interpolation {{ value }} escapes by default; never bypass the sanitizer for user data
element.textContent = userProvidedContent;
```

### Validation with Bean Validation

```java
// Explicit validation of the request shape in the REST adapter (booking-service, BookingDtos).
// Ids are numbers (IDENTITY keys, ADR-003); prices and the end time are never accepted from the client.
public record CreateBookingRequest(
        @NotNull Long vehicleId,
        @NotEmpty List<Integer> serviceIds,
        @NotNull LocalDate date,
        @NotNull @JsonFormat(pattern = "HH:mm") LocalTime time,
        @Size(max = 300) String notes,
        @Positive Integer preferredOperatorId) { }
// The shape is checked here (400); the business rules are checked by the domain (409 or 422).
```

---

## OWASP Top 10 — Review checklist

| Vulnerability | Implemented control |
|---------------|-------------------|
| A01: Broken Access Control | Role rules per path in each service's `SecurityConfig` (`[Authorize(Roles = …)]` in payment-service) + ownership check in each service |
| A02: Cryptographic Failures | TLS 1.2+ outside local, BCrypt for passwords, secrets in environment variables |
| A03: Injection | Named parameters in every SQL statement, Bean Validation on every request |
| A04: Insecure Design | Threat modeling in design, Security review |
| A05: Security Misconfiguration | Docker Compose as the single definition of every environment; review of defaults |
| A06: Vulnerable Components | Dependency review before each delivery (`security-rules.md`, A06) |
| A07: Authentication Failures | 1-hour JWT, no refresh token (ADR-006), lockout after 5 failed attempts (RF-004b) |
| A08: Software Integrity Failures | Pinned dependency versions, RabbitMQ messages validated before processing |
| A09: Logging Failures | Logs without PII, with a correlation id per request; `audit.audit_log` exists but is not written yet (ACO-04) |
| A10: SSRF | Whitelist of external URLs, do not follow redirects automatically |

---

## Audit and security logs

### Events that are ALWAYS recorded

| Event | Where it is recorded |
|-------|---------------------|
| Successful login | `security.user_session` (user, start, expiry, IP, user agent) + `app_user.last_login` |
| Failed login and lockout (RF-004b) | `security.login_lockout` (failed attempts and lock time) + `security-service` log |
| Logout | `security.user_session.revoked_at` |
| Password change (RF-004) | `security-service` log |
| Access denied (403) | Log of the service that denied it |
| Any change to a domain table | `updated_at` and `row_version` of the row (set by the `tr_touch_<table>` triggers). `audit.audit_log` is designed for this but nothing writes to it yet (ACO-04) |

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
- RBAC implemented in → `security-service` (roles and JWT) and in every service: role rules per path in each `SecurityConfig` (Java), `[Authorize(Roles = …)]` in payment-service (.NET), plus ownership checks in the use cases
