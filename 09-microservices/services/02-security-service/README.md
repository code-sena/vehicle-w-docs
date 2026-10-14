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
| Consumed by | Web, mobile, customer-service (`GET /users/me`), notification-service (`/internal/**`) |

---

## Responsibilities (what this service DOES)

- Register clients and let the administrator create accounts (operator, admin) with a temporary password.
- Authenticate with email + password (BCrypt) and issue an **HS256 JWT valid for 1 hour**.
  Claims: `sub` (user id), `roles`, `sid` (session id), `iss`, `aud`, `iat`, `nbf`, `exp`, `jti`.
- Record sessions (`user_session`); logout stores the session end.
- Lock an account for 15 minutes after 5 wrong passwords within 15 minutes (RF-004b, `login_lockout`):
  the login answers `423 ACCOUNT_LOCKED`, even with the right password, until it expires; a password
  reset lifts it.
- Password recovery with a 6-digit code by email (BCrypt-hashed, 15 min, single use, 5 failed attempts burn it).
- Profile: read/update name and phone, change email (asks for the password), change password,
  deactivate the own account, notification preferences.
- Administration: list accounts (by role, paginated), create accounts, activate/deactivate.
- Publish `UserRegistered` after commit (customer-service creates the client profile,
  notification-service sends the welcome email).
- Serve the internal contact endpoint for notification-service (ADR-011 §8).

## Out of scope (what it does NOT do)

- Does not store vehicles, bookings or anything of another context.
- Does not revoke tokens before they expire (ADR-006 trade-off): logout only ends the session record.
- Does not send notifications itself, except the password recovery email.

---

## Endpoints

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/auth/register` | public |
| POST | `/api/v1/auth/login` | public |
| POST | `/api/v1/auth/logout` | token |
| POST | `/api/v1/auth/password/forgot` · `/verify` · `/reset` | public |
| GET · PATCH | `/api/v1/users/me` | token |
| PUT | `/api/v1/users/me/email` · `/password` | token |
| POST | `/api/v1/users/me/deactivate` | token |
| GET · PUT | `/api/v1/users/me/preferences` (theme, language and the notification switches `notificationsEnabled` = push, `emailRemindersEnabled`, `promotionsEnabled`; PUT is partial: omitted fields keep their value) | token |
| GET · POST | `/api/v1/admin/users` | ADMIN |
| PATCH | `/api/v1/admin/users/{userId}/status` | ADMIN |
| GET | `/api/v1/admin/roles-permissions` | ADMIN (permission catalog and what each fixed role has) |
| PUT | `/api/v1/admin/roles-permissions/{role}` | ADMIN (`400 UNKNOWN_PERMISSION` for ids outside the catalog) |
| GET | `/internal/v1/users/{userId}/contact` (email, first name, active and the switches `pushEnabled`, `emailRemindersEnabled`, `promotionsEnabled`, ADR-011 §12). Used by notification-service and by operations-service (first names in ratings, ADR-014 §7) | internal key (`X-Internal-Key`), not routed by the gateway |
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
