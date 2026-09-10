# ADR-006 — Authentication and Authorization

| Field | Value |
|-------|-------|
| **ID** | ADR-006 |
| **Date** | 2026-09-10 |
| **Status** | Accepted |
| **Authors** | Juan Camilo Guilombo — [role] |
| **Reviewers** | Brayan Patiño, Merari Urbano, Juan Camilo Guilombo — Development team |

---

## Context

Every role in this system sees a different application: a customer books and pays, an
operator only works on what is assigned to them, an administrator manages the catalog,
approves payments and reviews reports. RF-002 redirects by role, RNF-004.5 requires a
cross-role request to be rejected with a 403, and the data model adds a rule of its own:
an operator can only update the `service_execution` rows that belong to them.

`04-requirements/non-functional.md` already fixes several things: a valid JWT in the
`Authorization: Bearer` header (RNF-004.1), one-hour expiry (RNF-004.2), passwords hashed
with BCrypt (RNF-004.3) and credentials in environment variables (RNF-004.7). ADR-005
decided that the gateway rejects anonymous traffic and each service checks the roles.

The `security` schema comes from the instructor's shared core and it brings structure we
did not design and cannot ignore:

- `person` and `app_user` are separate: a person can exist without credentials.
- `role`, `permission`, `role_permission` and `user_role` — permissions are data, and a
  user can hold more than one role.
- `user_session` — sessions are recorded in the database.
- `password_reset_token` — password recovery has a table, storing a hash of the token, an
  expiry and a `used_at`.

**Known constraints:**

- Three roles seeded: Administrador, Operario, Cliente.
- Everything runs locally in Docker. No identity provider, no budget for one.
- Personal data is handled under Colombian Law 1581 of 2012 (RNF-004.9).
- There is still no mail provider, so a reset link cannot be delivered by email.

---

## Decision

**We decided:** stateless authentication with JWT issued by `security-service`, verified by
the gateway and by every service, with authorization applied inside each service.

| Element | Decision |
|---------|----------|
| Token type | JWT, sent as `Authorization: Bearer <token>` |
| Issuer | `security-service` only |
| Signature | HS256 with a shared secret, delivered to each service as an environment variable (RNF-004.7) |
| Lifetime | One hour (RNF-004.2) |
| Claims | User id, role codes and expiry. No personal data beyond what is needed to authorise (RNF-004.9) |
| Refresh token | Not used in this version. When the token expires the user logs in again |
| `user_session` | A record of the sessions that were opened: who, when, from where, and whether it was closed. It is written by `security-service`; it is not read on every request |
| Logout | The client deletes the token and `security-service` closes the session row. The token itself stays valid until it expires |
| Password storage | BCrypt (RNF-004.3). Passwords are never logged, returned or stored in plain text |
| Failed attempts | `security-service` counts them per account and locks it temporarily (RF-004b) |
| Password reset | `password_reset_token` stores the hash of the token, never the token itself, with an expiry and `used_at` so it cannot be reused |
| Authorization | Spring Security in each service: the role decides which endpoints are reachable (RNF-004.5) |
| Ownership rules | Checked in the service on top of the role: an operator with a valid Operario token still cannot update a `service_execution` that is not theirs, and a customer only reaches their own bookings, vehicles and payments |
| Service-to-service calls | The caller forwards the user's token, so the callee knows who the request is for |

**Justification:**

- **Stateless JWT keeps ten services from depending on a session lookup.** Only
  `security-service` owns the `security` schema (ADR-003), so if every request had to be
  checked against `user_session`, all ten services would have to call `security-service` on
  every single call. That turns authentication into the busiest service in the system.
- **`user_session` is still worth writing.** It answers "who was connected and when", which
  is what the shared core intends, and it costs one write per login instead of one read per
  request.
- **Role is not enough on its own.** Every operator holds the Operario role, so the role
  check cannot decide whether *this* operator owns *this* execution line. That is a
  business rule and it lives in the service that owns the data.
- **The reset token is stored hashed** for the same reason passwords are: whoever reads the
  table must not be able to use what they find.

---

## Evaluated alternatives

| Alternative | Pros | Cons | Reason for discarding |
|-------------|------|------|-----------------------|
| **A — Stateless JWT, HS256, session recorded but not checked per request (chosen)** | No lookup per request; works the same for web and mobile; Spring Security supports it directly | Every service holds the secret; a token cannot be revoked before it expires | — (chosen) |
| **B — JWT validated against `user_session` on every request** | Immediate revocation on logout or lockout | Every service would call `security-service` on every request, making it a bottleneck and a single point of failure | The cost does not justify the benefit in this project |
| **C — JWT signed with RS256** | Only `security-service` holds the private key | Key pair generation, distribution and rotation for a single local deployment | Correct for production, more management than this project can justify today |
| **D — External identity provider (Keycloak, Auth0)** | Recovery, lockout and roles out of the box | A whole product to run, and the `security` schema of the ficha would go unused | Incompatible with the shared core we are required to use |

---

## Consequences

**Positive:**

- Any service verifies who the user is without calling `security-service`, so
  authentication is not a dependency of every request.
- The same mechanism works for the Angular client and the React Native client.
- Sessions and password resets are recorded, which is what the shared core expects.

**Negative / Trade-offs:**

- **A token cannot be revoked.** If a user logs out or an account is locked, a token that
  was already issued stays valid until it expires — up to one hour.
- Every service holds the signing secret, so a leak in any of them compromises all of them.
- Without refresh tokens the user is sent back to the login screen after an hour.
  Acceptable for an academic demo, reconsidered before real use.

**Impact on the system:**

- Affected services: all ten plus the gateway.
- Documents that must be updated: `09-microservices/services/02-auth-service/`, which still
  describes RS256, refresh tokens and a Redis blacklist from the scaffold.

---

## Pending decisions

- **The lockout threshold and duration for RF-004b are not defined.** The requirement says
  "repeated failed attempts" without a number. It has to be defined in `04-requirements`
  before the feature is built — we are not inventing it here.
- **How the reset token reaches the user.** The table exists, but there is no mail
  provider. Until there is one, the flow cannot be completed as RF-003 describes.
- **How fine-grained permissions are used.** The core provides `permission` and
  `role_permission`, but the requirements only ask for role-level control. Whether the
  services check permissions or only roles is confirmed when the endpoints are designed
  in `07-api`.
- Whether `password_reset_token` already exists in the instructor's core, to avoid
  duplicating a table of the standard (`06-data`, section 19).

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| The signing secret ends up committed to the repository | Medium | High | Secrets only in environment variables, `.env` ignored by Git, checked in code review (RNF-004.7) |
| A locked account keeps operating with a token issued before the lock | Medium | Medium | One-hour lifetime limits the window; accepted for this version and recorded here |
| A service trusts the role in the token and forgets the ownership check | Medium | High | Ownership rules are listed in `06-data`, section 16, and verified by integration tests |
| A reset token is reused or does not expire | Low | High | The table stores the hash, an expiry and `used_at`; the service checks all three |

---

## References

- Security requirements → `04-requirements/non-functional.md` (RNF-004)
- Login, lockout and password change → `04-requirements/functional.md` (RF-002 to RF-004b)
- `security` schema, its tables and why they are split → `06-data/MODELO-DE-DATOS.md`, section 4
- Business rules the database cannot enforce → `06-data/MODELO-DE-DATOS.md`, section 16
- Authentication at the edge, authorization in the service → ADR-005
- Service-to-service calls skip the gateway → ADR-004