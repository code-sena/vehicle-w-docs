# Security Service

> **Identity authority** of the system: accounts, login, JWT issuance, roles and the user
> profile. It owns the `security` and `audit` schemas.

---

## Location in the architecture

| Field | Value |
|-------|-------|
| Number in catalog | 02 |
| Local port | 3001 |
| Repository | `lavarapido-security-service` |
| Stack | Spring Boot 4 · Java 21 · Maven · hexagonal (ADR-007) |
| DB engine | SQL Server — schemas `security`, `audit` (Liquibase, changelog table `DATABASECHANGELOG_SECURITY`) |
| Communicates with | RabbitMQ (publishes `security.user_registered`), SMTP (password recovery email) |
| Consumed by | Web, mobile, customer-service (`GET /users/me`), operations-service (`GET /admin/users?role=OPERATOR`, `/internal/**`), notification-service (`/internal/**`) |

---

## Responsibilities (what this service DOES)

- Register clients and let the administrator create accounts (operator, admin) with a temporary password.
  A self-registered account stores when the person accepted the Terms and the Data Processing Policy
  (`acceptsTerms` and `acceptsDataPolicy` in `POST /api/v1/auth/register`, migration 039, Law 1581 of
  2012). Both fields are optional so older app versions keep working.
- Authenticate with email + password (BCrypt) and issue an **HS256 JWT valid for 1 hour**.
  Claims: `sub` (user id), `roles`, `sid` (session id), `iss`, `aud`, `iat`, `nbf`, `exp`, `jti`.
- Record sessions (`user_session`); logout stores the session end. A token whose session was closed
  (logout, account disabled or closed) or expired is rejected with 401 (`ActiveSessionValidator`), and
  `GET /api/v1/auth/session` tells the gateway whether a token's session is still open (204 / 401).
- Lock an account for 15 minutes after 5 wrong passwords within 15 minutes (RF-004b, `login_lockout`):
  the login answers `423 ACCOUNT_LOCKED`, even with the right password, until it expires; a password
  reset lifts it.
- Password recovery with a 6-digit code by email (BCrypt-hashed, 15 min, single use, 5 failed attempts burn it).
  The new password cannot be the current one (`400 SAME_PASSWORD`, checked before the code is spent, so the
  user can try again with another one).
- Profile: read/update name and phone, the contact address (`security.person_address`, ADR-010; empty
  deletes it), change email (asks for the password), change password, close the own account (asks for
  the password and closes every session; an administrator cannot close their own account, `403
  CANNOT_DISABLE_OWN_ACCOUNT`), notification preferences.
- Keep each account's registration date (`app_user.created_at`, migration 036), returned in the users
  list as `createdAt`.
- Administration: list accounts (by role, paginated), create accounts with their role (fixed at
  creation; there is no role change), activate/deactivate (no admin account can be deactivated, and an
  admin cannot deactivate their own account; deactivating closes the user's sessions), and edit the
  permissions of each fixed role (informative: authorization still uses the role in the JWT).
- Publish `UserRegistered` after commit (customer-service creates the client profile,
  notification-service sends the welcome email).
- Serve the internal contact endpoint for notification-service (ADR-011 §8). operations-service also
  uses it to check that an operator account exists before creating its operator row (404 means it
  does not).
- **First administrator** (`AdministratorBootstrapRunner`): at startup, if there is no account with
  role `ADMIN` and `ADMIN_EMAIL` / `ADMIN_PASSWORD` are set, it creates one through the same
  create-account use case (password policy, unique email and document, `UserRegistered`). A production
  database starts empty and public sign-up only creates clients, so this is how the first admin gets
  in. A failure is logged and never stops the service (see `10-devops/production.md`).

## Out of scope (what it does NOT do)

- Does not store vehicles, bookings or anything of another context.
- Does not stop closed-session tokens in the other services by itself: the gateway asks
  `GET /api/v1/auth/session` for them (ADR-006, update 2026-10-21).
- Does not send notifications itself, except the password recovery email.

---

## Endpoints

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/auth/register` | public |
| POST | `/api/v1/auth/login` | public |
| POST | `/api/v1/auth/logout` | token |
| GET | `/api/v1/auth/session` (204 if the token's session is open, 401 if it was closed or expired; used by the gateway) | token |
| POST | `/api/v1/auth/password/forgot` · `/verify` · `/reset` | public |
| GET · PATCH | `/api/v1/users/me` | token |
| GET · PUT | `/api/v1/users/me/address` (`{ "address": "…" }`, up to 200 characters; empty deletes it) | token |
| PUT | `/api/v1/users/me/email` · `/password` | token |
| POST | `/api/v1/users/me/deactivate` | token |
| GET · PUT | `/api/v1/users/me/preferences` (theme, language and the notification switches `notificationsEnabled` = push, `emailRemindersEnabled`, `promotionsEnabled`; PUT is partial: omitted fields keep their value) | token |
| GET · POST | `/api/v1/admin/users` | ADMIN |
| PATCH | `/api/v1/admin/users/{userId}/status` | ADMIN (`403 CANNOT_DISABLE_OWN_ACCOUNT` for their own account, `403 ADMIN_CANNOT_BE_DISABLED` for any admin account) |
| GET | `/api/v1/admin/roles-permissions` | ADMIN (permission catalog and what each fixed role has) |
| PUT | `/api/v1/admin/roles-permissions/{role}` | ADMIN (`400 UNKNOWN_PERMISSION` for ids outside the catalog) |
| GET | `/internal/v1/users/{userId}/contact` (email, first name, active, the switches `pushEnabled`, `emailRemindersEnabled`, `promotionsEnabled`, ADR-011 §12, and the account `language`). Used by notification-service (notices in the account's language) and by operations-service (first names in ratings, ADR-014 §7, and skipping disabled accounts in the automatic assignment) | internal key (`X-Internal-Key`), not routed by the gateway |
| GET | `/internal/v1/users/admins` | internal key; ids of the active `ADMIN` accounts (staff notifications, ADR-011 §10) |

Full contract: [`07-api/contracts/openapi/security-service.yaml`](../../../07-api/contracts/openapi/security-service.yaml).
Errors are RFC 9457 `ProblemDetail` with a stable `code` the frontend translates.

---

## How to run it locally

```bash
cd lavarapido-security-service
./mvnw spring-boot:run           # http://localhost:3001 — Swagger: /swagger-ui.html (dev profile)
curl http://localhost:3001/actuator/health
```

Main variables (from `lavarapido-infra/.env`):

| Variable | Purpose |
|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | SQL Server connection |
| `JWT_SECRET` (≥ 32 bytes), `JWT_ISSUER`, `JWT_AUDIENCE` | Token signing — shared with every service |
| `MAIL_ENABLED`, `MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM` | Recovery email (Gmail or Mailpit) |
| `MESSAGING_ENABLED`, `RABBITMQ_*` | Publish `UserRegistered` |
| `INTERNAL_API_KEY` | Key for `/internal/**` (empty = closed) |

---

## Related documents

- [data-model.md](./data-model.md) · [events.md](./events.md) · [decisions.md](./decisions.md) · [runbook.md](./runbook.md)
- ADR-006 (authentication), ADR-010 (data model vs frontend), ADR-011 §8 (internal contact route)
