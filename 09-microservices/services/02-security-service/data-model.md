# Data model — Security Service

Schemas `security` and `audit` in the shared SQL Server database `LavaRapido` (one schema owner
per service, ADR-003/ADR-009). Full DDL: `lavarapido-6-services-sqlserver.sql`, section 1.

## Tables

| Table | Purpose |
|---|---|
| `security.person` | Personal data, stored once: document, first/last name, phone, email |
| `security.app_user` | Login account of a person: username, BCrypt hash, active flag, last login |
| `security.role` | `ADMIN`, `OPERATOR`, `CLIENT` (seed 101; fixed per ADR-010) |
| `security.permission`, `security.role_permission` | Permission catalog per role (read-only for now) |
| `security.user_role` | Roles of each account |
| `security.user_session` | One row per login; `revoked_at` on logout. The JWT `sid` points here |
| `security.password_reset_token` | Recovery codes (BCrypt hash, expiry, attempts, used) |
| `security.user_preference` | Language, theme and notification preferences |
| `audit.audit_log` | Audit trail |

`customer.customer.person_id` and `customer.customer.user_id` point to `security.person` /
`security.app_user` **without foreign keys**: each service owns its schema (ADR-003).

## Migrations

Liquibase, changelog table `DATABASECHANGELOG_SECURITY`:
`001-create-security-schemas` · `002-create-security-and-audit-core` ·
`003-create-security-user-preference` · seed `101-seed-security-role`.

## Pending (ADR-010)

Not implemented yet: `security.user_consent` (Law 1581 consent), `security.person_address`, and
splitting the notification preference into push / email reminders / promotions.
