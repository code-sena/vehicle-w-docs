# Data model — Security Service

Schemas `security` and `audit` in the shared SQL Server database `LavaRapido` (one owning service per schema, ADR-003/ADR-009): 12 tables, 74 columns. No foreign key leaves these schemas; references to other services are plain columns (last section).

> **Source:** the Liquibase changelogs of `security-service` on `origin/develop` (`b5fe56e`, 2026-10-24), applied in the order of `src/main/resources/db/changelog/db.changelog-master.xml`. The tables below were generated from those changelogs and are checked against them, against the JPA entities and against the ERD (`08-uml/diagrams/source/erd-security.md`) by the script described in `06-data/migration-strategy.md` ("How the docs are checked"). The rationale of each table is in `06-data/models.md`.

## Tables

| Table | Purpose | Created in |
|---|---|---|
| `security.person` | Personal data, stored once: document number (unique), first and last name, phone, email. | 002 |
| `security.app_user` | Login account of a person: username (the e-mail, unique), BCrypt hash, active flag, last login, registration date (`created_at`, 036) and when the Terms and the Data Policy were accepted (039, Law 1581; NULL for accounts created by an administrator or before 039). | 002 |
| `security.role` | The three fixed roles `ADMIN`, `OPERATOR`, `CLIENT` (seed 101, ADR-010). Read-only for the code (`insertable = false, updatable = false`). | 002 |
| `security.permission` | Permission catalog (`VIEW_PANELS`, `CREATE_RECORDS`, `EDIT_DATA`, `DELETE`, seeded by 026). Shown and edited in Management > Roles; authorization still uses the role in the JWT. | 002 |
| `security.role_permission` | Permissions of each fixed role (default rows seeded by 026; `PUT /api/v1/admin/roles-permissions/{role}` replaces the list). | 002 |
| `security.user_role` | Roles of each account (JPA `@JoinTable` of `AppUserJpaEntity`). | 002 |
| `security.user_session` | One row per login; `revoked_at` is set on logout or when the account is disabled. The JWT `sid` claim points here and the gateway asks `GET /api/v1/auth/session` whether it is still open. | 002 |
| `security.password_reset_token` | Recovery codes: BCrypt hash of the 6-digit code, request time, expiry, use time and IP. Failed attempts are counted in memory (`InMemoryResetAttemptCounter`), not in this table. | 002 |
| `audit.audit_log` | Generic audit trail (entity, id, action, JSON before/after). The table exists but nothing writes to it: there is no JPA entity and no audit trigger. | 002 |
| `security.user_preference` | One row per account: theme (4 palettes since 020), language, and the three notification switches (push `notifications_enabled`; e-mail reminders and promotions since 030). | 003 |
| `security.login_lockout` | Recent failed logins of an account and its lockout (RF-004b: 5 failures in 15 minutes lock it 15 minutes). The row is deleted on a successful login or a password reset. | 034 |
| `security.person_address` | Optional contact address of a person (ADR-010), one row per person; clearing the address deletes the row. | 035 |

- Only `user_preference` has a touch trigger; `app_user.created_at`, `login_lockout.updated_at` and `person_address.updated_at` are written by the code.
- Rows deleted physically by the code: `login_lockout` (after a good login or a reset), `person_address` (address cleared) and `role_permission` (the list of a role is replaced).
- A separate `security.user_consent` table (ADR-010) was not built: consent lives in `app_user.terms_accepted_at` / `data_policy_accepted_at` (039).

## Columns, keys and indexes

**Null** = accepts NULL. **Key**: `PK`, `IDENTITY` (starts at 1, step 1), `FK →` a table of this service, `UQ` (unique; *filtered* = only among the rows of its `WHERE`), `→ … (no FK)` = reference to another service. **Since** = migration that added the column. Dates are `DATETIME2(3)` in UTC.

### `security.person`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `person_id` | BIGINT | No | — | PK, IDENTITY | 002 |
| `document_number` | NVARCHAR(20) | No | — | UQ | 002 |
| `first_name` | NVARCHAR(60) | No | — | — | 002 |
| `last_name` | NVARCHAR(60) | No | — | — | 002 |
| `phone` | NVARCHAR(20) | Yes | — | — | 002 |
| `email` | NVARCHAR(120) | Yes | — | — | 002 |

- Constraints: `pk_person` PRIMARY KEY (person_id) · `uq_person_document` UNIQUE (document_number)
- Indexes: —
- Triggers: —

### `security.app_user`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `user_id` | BIGINT | No | — | PK, IDENTITY | 002 |
| `person_id` | BIGINT | No | — | FK → security.person.person_id, UQ | 002 |
| `username` | NVARCHAR(60) | No | — | UQ | 002 |
| `password_hash` | NVARCHAR(255) | No | — | — | 002 |
| `is_active` | BIT | No | `1` | — | 002 |
| `last_login` | DATETIME2(3) | Yes | — | — | 002 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 036 |
| `terms_accepted_at` | DATETIME2(3) | Yes | — | — | 039 |
| `data_policy_accepted_at` | DATETIME2(3) | Yes | — | — | 039 |

- Constraints: `pk_app_user` PRIMARY KEY (user_id) · `uq_app_user_person` UNIQUE (person_id) · `uq_app_user_username` UNIQUE (username) · `fk_app_user_person` FOREIGN KEY (person_id) → security.person (person_id)
- Indexes: —
- Triggers: —

### `security.role`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `role_id` | SMALLINT | No | — | PK, IDENTITY | 002 |
| `code` | NVARCHAR(30) | No | — | UQ | 002 |
| `name` | NVARCHAR(60) | No | — | — | 002 |

- Constraints: `pk_role` PRIMARY KEY (role_id) · `uq_role_code` UNIQUE (code)
- Indexes: —
- Triggers: —

### `security.permission`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `permission_id` | SMALLINT | No | — | PK, IDENTITY | 002 |
| `code` | NVARCHAR(60) | No | — | UQ | 002 |
| `name` | NVARCHAR(80) | No | — | — | 002 |
| `resource` | NVARCHAR(60) | No | — | — | 002 |
| `action` | NVARCHAR(30) | No | — | — | 002 |

- Constraints: `pk_permission` PRIMARY KEY (permission_id) · `uq_permission_code` UNIQUE (code)
- Indexes: —
- Triggers: —

### `security.role_permission`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `role_permission_id` | BIGINT | No | — | PK, IDENTITY | 002 |
| `role_id` | SMALLINT | No | — | FK → security.role.role_id | 002 |
| `permission_id` | SMALLINT | No | — | FK → security.permission.permission_id | 002 |

- Constraints: `pk_role_permission` PRIMARY KEY (role_permission_id) · `uq_role_permission` UNIQUE (role_id, permission_id) · `fk_role_permission_role` FOREIGN KEY (role_id) → security.role (role_id) · `fk_role_permission_permission` FOREIGN KEY (permission_id) → security.permission (permission_id)
- Indexes: —
- Triggers: —

### `security.user_role`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `user_role_id` | BIGINT | No | — | PK, IDENTITY | 002 |
| `user_id` | BIGINT | No | — | FK → security.app_user.user_id | 002 |
| `role_id` | SMALLINT | No | — | FK → security.role.role_id | 002 |

- Constraints: `pk_user_role` PRIMARY KEY (user_role_id) · `uq_user_role` UNIQUE (user_id, role_id) · `fk_user_role_user` FOREIGN KEY (user_id) → security.app_user (user_id) · `fk_user_role_role` FOREIGN KEY (role_id) → security.role (role_id)
- Indexes: —
- Triggers: —

### `security.user_session`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `user_session_id` | BIGINT | No | — | PK, IDENTITY | 002 |
| `user_id` | BIGINT | No | — | FK → security.app_user.user_id | 002 |
| `refresh_token_hash` | NVARCHAR(255) | Yes | — | — | 002 |
| `started_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 002 |
| `expires_at` | DATETIME2(3) | No | — | — | 002 |
| `revoked_at` | DATETIME2(3) | Yes | — | — | 002 |
| `ip_address` | NVARCHAR(45) | Yes | — | — | 002 |
| `user_agent` | NVARCHAR(300) | Yes | — | — | 002 |

- Constraints: `pk_user_session` PRIMARY KEY (user_session_id) · `fk_user_session_user` FOREIGN KEY (user_id) → security.app_user (user_id)
- Indexes: `ix_user_session_user` (user_id)
- Triggers: —

### `security.password_reset_token`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `password_reset_token_id` | BIGINT | No | — | PK, IDENTITY | 002 |
| `user_id` | BIGINT | No | — | FK → security.app_user.user_id | 002 |
| `token_hash` | NVARCHAR(255) | No | — | UQ | 002 |
| `requested_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 002 |
| `expires_at` | DATETIME2(3) | No | — | — | 002 |
| `used_at` | DATETIME2(3) | Yes | — | — | 002 |
| `ip_address` | NVARCHAR(45) | Yes | — | — | 002 |

- Constraints: `pk_password_reset_token` PRIMARY KEY (password_reset_token_id) · `uq_password_reset_token_hash` UNIQUE (token_hash) · `fk_password_reset_token_user` FOREIGN KEY (user_id) → security.app_user (user_id) · `ck_password_reset_token_range` CHECK `expires_at > requested_at`
- Indexes: `ix_password_reset_token_user` (user_id) · `ix_password_reset_token_expires` (expires_at)
- Triggers: —

### `audit.audit_log`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `audit_log_id` | BIGINT | No | — | PK, IDENTITY | 002 |
| `entity` | NVARCHAR(60) | No | — | — | 002 |
| `entity_id` | BIGINT | No | — | — | 002 |
| `action` | NVARCHAR(20) | No | — | — | 002 |
| `previous_data` | NVARCHAR(MAX) | Yes | — | — | 002 |
| `new_data` | NVARCHAR(MAX) | Yes | — | — | 002 |
| `changed_by` | BIGINT | Yes | — | — | 002 |
| `changed_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 002 |

- Constraints: `pk_audit_log` PRIMARY KEY (audit_log_id)
- Indexes: `ix_audit_log_entity` (entity, entity_id) · `ix_audit_log_date` (changed_at)
- Triggers: —

### `security.user_preference`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `user_preference_id` | BIGINT | No | — | PK, IDENTITY | 003 |
| `user_id` | BIGINT | No | — | FK → security.app_user.user_id, UQ | 003 |
| `theme` | NVARCHAR(20) | No | `N'green-light'` | — | 003 |
| `language` | NVARCHAR(5) | No | `N'es'` | — | 003 |
| `notifications_enabled` | BIT | No | `1` | — | 003 |
| `created_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 003 |
| `created_by` | BIGINT | Yes | — | — | 003 |
| `updated_at` | DATETIME2(3) | Yes | — | — | 003 |
| `updated_by` | BIGINT | Yes | — | — | 003 |
| `deleted_at` | DATETIME2(3) | Yes | — | — | 003 |
| `deleted_by` | BIGINT | Yes | — | — | 003 |
| `row_version` | INT | No | `1` | — | 003 |
| `email_reminders_enabled` | BIT | No | `1` | — | 030 |
| `promotions_enabled` | BIT | No | `1` | — | 030 |

- Constraints: `pk_user_preference` PRIMARY KEY (user_preference_id) · `uq_user_preference_user` UNIQUE (user_id) · `fk_user_preference_user` FOREIGN KEY (user_id) → security.app_user (user_id) · `ck_pref_language` CHECK `[language] IN (N'es', N'en', N'fr', N'pt')` · `ck_pref_theme` CHECK `theme IN (N'green-light', N'green-dark', N'pink', N'pink-dark')`
- Indexes: —
- Triggers: `tr_touch_user_preference` (AFTER UPDATE, sets `updated_at` and `row_version`)

### `security.login_lockout`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `user_id` | BIGINT | No | — | PK, FK → security.app_user.user_id | 034 |
| `failed_count` | INT | No | `0` | — | 034 |
| `first_failed_at` | DATETIME2(3) | Yes | — | — | 034 |
| `locked_until` | DATETIME2(3) | Yes | — | — | 034 |
| `updated_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 034 |

- Constraints: `pk_login_lockout` PRIMARY KEY (user_id) · `fk_login_lockout_user` FOREIGN KEY (user_id) → security.app_user (user_id) · `ck_login_lockout_count` CHECK `failed_count >= 0 AND failed_count < 5`
- Indexes: —
- Triggers: —

### `security.person_address`

| Column | Type | Null | Default | Key | Since |
|---|---|---|---|---|---|
| `person_id` | BIGINT | No | — | PK, FK → security.person.person_id | 035 |
| `address` | NVARCHAR(200) | No | — | — | 035 |
| `updated_at` | DATETIME2(3) | No | `SYSUTCDATETIME()` | — | 035 |

- Constraints: `pk_person_address` PRIMARY KEY (person_id) · `fk_person_address_person` FOREIGN KEY (person_id) → security.person (person_id) · `ck_person_address_not_blank` CHECK `LEN(LTRIM(RTRIM(address))) > 0`
- Indexes: —
- Triggers: —

## Triggers

| Trigger | Table | Fires | What it does |
|---|---|---|---|
| `tr_touch_user_preference` | `security.user_preference` | AFTER UPDATE | Sets `updated_at = SYSUTCDATETIME()` and `row_version + 1` on the updated rows (skips nested calls) |

## Seed data

- `101-seed-security-role`: the roles `ADMIN`, `OPERATOR`, `CLIENT` (only the missing ones).
- `026-security-role-permissions` seeds `permission` (4 rows) and the default `role_permission` rows (ADMIN all, OPERATOR `VIEW_PANELS` + `EDIT_DATA`, CLIENT `VIEW_PANELS`). No user account is seeded by Liquibase: the first administrator is created at startup by `AdministratorBootstrapRunner` from `app.bootstrap-admin.*` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, …; empty = nothing is created), and the demo accounts only exist with the `dev` profile (`DevDataSeeder`).

## Migrations

Liquibase, changelog table `DATABASECHANGELOG_SECURITY` (lock table `DATABASECHANGELOGLOCK_SECURITY`), in the order of the master file:

| Order | File | Changesets | Precondition | Rollback | Purpose |
|---|---|---|---|---|---|
| 1 | `001-create-security-schemas.sql` | 2 | onFail:MARK_RAN | No | Schemas `security` and `audit` |
| 2 | `002-create-security-and-audit-core.sql` | 9 | onFail:MARK_RAN | No | Tables `person`, `app_user`, `role`, `permission`, `role_permission`, `user_role`, `user_session`, `password_reset_token` and `audit.audit_log` |
| 3 | `003-create-security-user-preference.sql` | 2 | onFail:MARK_RAN | No | Table `user_preference` (moved from `settings`, ADR-009) and its touch trigger |
| 4 | `020-security-user-preference-palettes.sql` | 1 | onFail:MARK_RAN | No | Theme check and default changed to the 4 web palettes; existing `light`/`dark` rows converted |
| 5 | `023-security-custom-role.sql` | 1 | onFail:MARK_RAN | Yes | Table `custom_role` (custom role catalog). Dropped again by 026 |
| 6 | `seed/101-seed-security-role.sql` | 1 | none | No | Seed: the roles `ADMIN`, `OPERATOR`, `CLIENT` (only the missing ones) |
| 7 | `026-security-role-permissions.sql` | 3 | onFail:MARK_RAN | No | Drops `custom_role`; seeds the 4 permissions and the default permissions of each fixed role |
| 8 | `030-security-user-preference-notification-channels.sql` | 1 | onFail:MARK_RAN | Yes | Columns `email_reminders_enabled` and `promotions_enabled` (default 1) |
| 9 | `034-security-login-lockout.sql` | 1 | onFail:MARK_RAN | Yes | Table `login_lockout` (RF-004b) |
| 10 | `035-security-person-address.sql` | 1 | onFail:MARK_RAN | Yes | Table `person_address` (ADR-010) |
| 11 | `036-security-app-user-created-at.sql` | 2 | onFail:MARK_RAN (1 without) | Yes | Column `app_user.created_at`, backfilled with the first session of existing accounts |
| 12 | `039-security-app-user-legal-consent.sql` | 1 | onFail:MARK_RAN | Yes | Columns `terms_accepted_at` and `data_policy_accepted_at` (Law 1581) |

**Changesets** = `--changeset` blocks in the file; **Precondition** = what Liquibase does when the check fails (`MARK_RAN`: mark as run without executing; `CONTINUE`: skip now and try again on the next update; `HALT`: stop the migration). Numbering and rules: `06-data/migration-strategy.md`.

## References to other services (no FK)

None.
