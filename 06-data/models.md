# Data Models per Service

**Last updated:** 2026-10-20 (rules checked against the code) — 2026-10-15: ADR-010 (bay status, daily break, vehicle model, customer user id, business data, address, operator specialty), ADR-011 (device tokens, processed events, booking reminders), the login lockout (RF-004b), the account registration date and the vehicle inspection report, as applied by the services' migrations.

The system is split into **six microservices over nine schemas**, all inside a single SQL
Server 2016+ instance. Every schema has exactly one owning service; a service may own more
than one schema (ADR-009). **No service has a foreign key into another service's schemas** —
the 26 places where one service's data needs another's are documented as plain columns at
the end of this file, and integrity there is the application's job, not the
database's.

This deviates from the letter of "one physical database per service" (see
`modeling-conventions.md` for why), but keeps the part that actually matters: nothing here
joins across service boundaries, and a service's tables can be read, migrated, or replaced
without another service knowing.

Every domain table (not the shared `security`/`audit` core) carries the same seven audit
columns — documented once in `modeling-conventions.md` instead of repeated in every table
below.

---

## Services

| Service | Schemas it owns | Tables |
|---------|-----------------|--------|
| `security-service` | [`security`](#01-security), [`audit`](#02-audit) | 12 |
| `customer-service` | [`customer`](#03-customer) | 3 |
| `booking-service` | [`catalog`](#04-catalog), [`booking`](#05-booking) | 13 |
| `operations-service` | [`execution`](#06-execution) | 11 |
| `payment-service` | [`promotion`](#07-promotion), [`payment`](#08-payment) | 12 |
| `notification-service` | [`notification`](#09-notification) | 6 |

57 tables in total. The `settings` schema no longer exists: `establishment` moved to
`booking` and `user_preference` to `security`; the loyalty ledger moved from `customer` to
`payment` (see each table's modeling decisions).

---

## 01. security

**Owning service:** `security-service`

**DB Engine:** SQL Server 2016+

**Engine justification:**

- Shared core schema, identical across every team project on this assignment; the instructor supplies the reference DDL and every service authenticates against it.
- Relational modeling fits an access-control graph (users ↔ roles ↔ permissions) far better than a document store would.

### Table: `person`

**Purpose:** Personal identity data for anyone the system knows about — customers walked up to the counter, staff, or both.

```sql
CREATE TABLE [security].person (
    person_id       BIGINT       IDENTITY(1,1) NOT NULL,
    document_number NVARCHAR(20) NOT NULL,
    first_name      NVARCHAR(60) NOT NULL,
    last_name       NVARCHAR(60) NOT NULL,
    phone           NVARCHAR(20)  NULL,
    email           NVARCHAR(120) NULL,
    CONSTRAINT pk_person PRIMARY KEY (person_id),
    CONSTRAINT uq_person_document UNIQUE (document_number)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `person_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `document_number` | NVARCHAR(20) | No | National ID number. The only hard uniqueness guarantee that a person is not registered twice. | Unique |
| `first_name` | NVARCHAR(60) | No | Given name(s). | — |
| `last_name` | NVARCHAR(60) | No | Family name(s). | — |
| `phone` | NVARCHAR(20) | Yes | Contact phone, optional (a person registered without contact info still has a valid row). | — |
| `email` | NVARCHAR(120) | Yes | Contact email, optional. | — |

**Modeling decisions:**

1. Deliberately separate from `app_user`: a walk-in customer can be registered here without ever getting login credentials. This also lets the same human be both a customer and an operator without duplicating their name/phone in two places.

---

### Table: `app_user`

**Purpose:** Login credentials, one row per account, one account per `person`.

```sql
CREATE TABLE [security].app_user (
    user_id       BIGINT        IDENTITY(1,1) NOT NULL,
    person_id     BIGINT        NOT NULL,
    username      NVARCHAR(60)  NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    is_active     BIT           NOT NULL CONSTRAINT df_app_user_active DEFAULT 1,
    last_login    DATETIME2(3)  NULL,
    created_at    DATETIME2(3)  NOT NULL DEFAULT SYSUTCDATETIME(),   -- migration 036
    terms_accepted_at       DATETIME2(3) NULL,                       -- migration 039
    data_policy_accepted_at DATETIME2(3) NULL,                       -- migration 039
    CONSTRAINT pk_app_user PRIMARY KEY (user_id),
    CONSTRAINT uq_app_user_person UNIQUE (person_id),
    CONSTRAINT uq_app_user_username UNIQUE (username),
    CONSTRAINT fk_app_user_person FOREIGN KEY (person_id) REFERENCES [security].person(person_id)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `user_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `person_id` | BIGINT | No | The human behind this account. | FK → `security.person.person_id`, Unique |
| `username` | NVARCHAR(60) | No | Login handle. | Unique |
| `password_hash` | NVARCHAR(255) | No | Hash only — the plaintext password is never stored or logged. | — |
| `is_active` | BIT | No | Soft on/off switch for the account, independent of `person.deleted_at`. | — |
| `last_login` | DATETIME2(3) | Yes | Last successful authentication, for activity checks. | — |
| `created_at` | DATETIME2(3) | No | Registration date, shown in **Management → Users**. | Set once on insert, never updated |
| `terms_accepted_at` | DATETIME2(3) | Yes | When the person accepted the Terms and Conditions while signing up (web or app checkbox). | NULL for older and admin-created accounts |
| `data_policy_accepted_at` | DATETIME2(3) | Yes | When the person accepted the Personal Data Processing Policy (Law 1581 of 2012 proof of authorization). | NULL for older and admin-created accounts |

**Modeling decisions:**

1. 1-to-1 with `person` by design, not by convention: `person_id` is `UNIQUE`, so the database itself rejects a second account for the same human.
2. `terms_accepted_at` and `data_policy_accepted_at` came with migration 039: the sign-up forms asked for both boxes but nothing was stored. They are columns of the account rather than a separate `user_consent` table because only one version of each document exists; a table with the document version is the step if the texts start changing.
3. `created_at` came with migration 036. Before it the users list showed the last login as if it were the registration date. Accounts that already existed got their first session as registration date (or the migration date if they never signed in), because `audit_log` had no rows to recover the real one.

---

### Table: `role`

**Purpose:** The three system roles.

```sql
CREATE TABLE [security].[role] (
    role_id SMALLINT     IDENTITY(1,1) NOT NULL,
    code    NVARCHAR(30) NOT NULL,
    name    NVARCHAR(60) NOT NULL,
    CONSTRAINT pk_role PRIMARY KEY (role_id),
    CONSTRAINT uq_role_code UNIQUE (code)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `role_id` | SMALLINT | No | Surrogate primary key (IDENTITY). | PK |
| `code` | NVARCHAR(30) | No | Machine-readable value. Seeded with `ADMIN`, `OPERATOR`, `CLIENT`. | Unique |
| `name` | NVARCHAR(60) | No | Human-readable label shown in the UI. | — |

---

### Table: `permission`

**Purpose:** Granular permissions, expressed as a (resource, action) pair.

```sql
CREATE TABLE [security].[permission] (
    permission_id SMALLINT     IDENTITY(1,1) NOT NULL,
    code          NVARCHAR(60) NOT NULL,
    name          NVARCHAR(80) NOT NULL,
    resource      NVARCHAR(60) NOT NULL,
    [action]      NVARCHAR(30) NOT NULL,
    CONSTRAINT pk_permission PRIMARY KEY (permission_id),
    CONSTRAINT uq_permission_code UNIQUE (code)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `permission_id` | SMALLINT | No | Surrogate primary key (IDENTITY). | PK |
| `code` | NVARCHAR(60) | No | Machine-readable value, e.g. `booking.cancel`. | Unique |
| `name` | NVARCHAR(80) | No | Human-readable label. | — |
| `resource` | NVARCHAR(60) | No | What the permission applies to, e.g. `booking`. | — |
| `action` | NVARCHAR(30) | No | What can be done to it, e.g. `cancel`. | — |

---

### Table: `role_permission`

**Purpose:** Many-to-many join between roles and permissions.

```sql
CREATE TABLE [security].role_permission (
    role_permission_id BIGINT   IDENTITY(1,1) NOT NULL,
    role_id            SMALLINT NOT NULL,
    permission_id      SMALLINT NOT NULL,
    CONSTRAINT pk_role_permission PRIMARY KEY (role_permission_id),
    CONSTRAINT uq_role_permission UNIQUE (role_id, permission_id),
    CONSTRAINT fk_role_permission_role FOREIGN KEY (role_id) REFERENCES [security].[role](role_id),
    CONSTRAINT fk_role_permission_permission FOREIGN KEY (permission_id) REFERENCES [security].[permission](permission_id)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `role_permission_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `role_id` | SMALLINT | No | The role. | FK → `security.role.role_id` |
| `permission_id` | SMALLINT | No | The permission granted to that role. | FK → `security.permission.permission_id` |

**Modeling decisions:**

1. A plain join table instead of a comma-separated list on `role`: 1NF forbids repeating groups, and this shape lets the app query "does this role have permission X" with an index instead of string parsing.
2. **Both tables existed since the original schema but had no code reading or writing them until ADR-015 (changeset `026`, 2026-10-07).** A short-lived parallel catalog (`security.custom_role`, free-text name + comma-separated permission text, changeset `023`) was built and then removed in the same development session once this was noticed — see ADR-015. `permission` is seeded with four generic codes (`VIEW_PANELS`, `CREATE_RECORDS`, `EDIT_DATA`, `DELETE`; the `booking.cancel`-style code above is illustrative of the column's intended shape, not what is actually seeded) and `role_permission` with sensible per-role defaults. The admin screen (Gestión > Roles) picks one of the three fixed roles and edits its permission set; **this has no effect yet on real authorization**, which still comes from the JWT's role claim alone (ADR-006).

---

### Table: `user_role`

**Purpose:** Many-to-many join between users and roles.

```sql
CREATE TABLE [security].user_role (
    user_role_id BIGINT   IDENTITY(1,1) NOT NULL,
    user_id      BIGINT   NOT NULL,
    role_id      SMALLINT NOT NULL,
    CONSTRAINT pk_user_role PRIMARY KEY (user_role_id),
    CONSTRAINT uq_user_role UNIQUE (user_id, role_id),
    CONSTRAINT fk_user_role_user FOREIGN KEY (user_id) REFERENCES [security].app_user(user_id),
    CONSTRAINT fk_user_role_role FOREIGN KEY (role_id) REFERENCES [security].[role](role_id)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `user_role_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `user_id` | BIGINT | No | The account. | FK → `security.app_user.user_id` |
| `role_id` | SMALLINT | No | A role that account holds. | FK → `security.role.role_id` |

**Modeling decisions:**

1. Many-to-many rather than a single `role_id` on `app_user`, because the same person can be both `OPERATOR` and `CLIENT`.

---

### Table: `user_session`

**Purpose:** Open refresh-token sessions.

```sql
CREATE TABLE [security].user_session (
    user_session_id    BIGINT        IDENTITY(1,1) NOT NULL,
    user_id            BIGINT        NOT NULL,
    refresh_token_hash NVARCHAR(255) NULL,
    started_at         DATETIME2(3)  NOT NULL CONSTRAINT df_session_started DEFAULT SYSUTCDATETIME(),
    expires_at         DATETIME2(3)  NOT NULL,
    revoked_at         DATETIME2(3)  NULL,
    ip_address         NVARCHAR(45)  NULL,
    user_agent         NVARCHAR(300) NULL,
    CONSTRAINT pk_user_session PRIMARY KEY (user_session_id),
    CONSTRAINT fk_user_session_user FOREIGN KEY (user_id) REFERENCES [security].app_user(user_id)
);
```

**Indexes:**

| Name | Fields | Type | Justification |
|------|--------|------|----------------|
| `ix_user_session_user` | `user_id` | Non-unique | List a user's open sessions. |

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `user_session_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `user_id` | BIGINT | No | The account this session belongs to. | FK → `security.app_user.user_id` |
| `refresh_token_hash` | NVARCHAR(255) | Yes | Hash of the refresh token — never the raw token. | — |
| `started_at` | DATETIME2(3) | No | When the session was opened, UTC. | — |
| `expires_at` | DATETIME2(3) | No | When the session stops being valid, UTC. | — |
| `revoked_at` | DATETIME2(3) | Yes | Set to log the user out early (all devices) without deleting the row, so the access trail survives. | — |
| `ip_address` | NVARCHAR(45) | Yes | IP the session was opened from, for suspicious-access checks. | — |
| `user_agent` | NVARCHAR(300) | Yes | Client/browser string, same purpose. | — |

**Modeling decisions:**

1. `revoked_at` instead of a physical `DELETE`: logging out needs to invalidate the session without losing the audit trail of when and from where it was opened.

---

### Table: `password_reset_token`

**Purpose:** Password-recovery tokens (ERF1.3 / CU03).

```sql
CREATE TABLE [security].password_reset_token (
    password_reset_token_id BIGINT        IDENTITY(1,1) NOT NULL,
    user_id                 BIGINT        NOT NULL,
    token_hash              NVARCHAR(255) NOT NULL,
    requested_at            DATETIME2(3)  NOT NULL CONSTRAINT df_prt_requested DEFAULT SYSUTCDATETIME(),
    expires_at              DATETIME2(3)  NOT NULL,
    used_at                 DATETIME2(3)  NULL,
    ip_address              NVARCHAR(45)  NULL,
    CONSTRAINT pk_password_reset_token PRIMARY KEY (password_reset_token_id),
    CONSTRAINT uq_password_reset_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_password_reset_token_user FOREIGN KEY (user_id) REFERENCES [security].app_user(user_id),
    CONSTRAINT ck_password_reset_token_range CHECK (expires_at > requested_at)
);
```

**Indexes:**

| Name | Fields | Type | Justification |
|------|--------|------|----------------|
| `ix_password_reset_token_user` | `user_id` | Non-unique | List a user's outstanding reset tokens. |
| `ix_password_reset_token_expires` | `expires_at` | Non-unique | Sweep/expire stale tokens. |

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `password_reset_token_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `user_id` | BIGINT | No | The account requesting recovery. | FK → `security.app_user.user_id` |
| `token_hash` | NVARCHAR(255) | No | Hash of the token sent by email/SMS — the raw token is never persisted, same pattern as `password_hash`. | Unique |
| `requested_at` | DATETIME2(3) | No | When the reset was requested, UTC. | — |
| `expires_at` | DATETIME2(3) | No | Hard cutoff after which the token can no longer be redeemed. | — |
| `used_at` | DATETIME2(3) | Yes | NULL while still redeemable; set once, on redemption, to block replay. | — |
| `ip_address` | NVARCHAR(45) | Yes | IP the reset was requested from. | — |

**Modeling decisions:**

1. No `created_by` / `updated_by` / `row_version`: this is a short-lived security artifact generated and consumed once, not a domain entity an administrator edits — same treatment as `user_session`.
2. Pending confirmation against the instructor's shared core before this ships — see the note in the section README.

---

### Table: `user_preference`

**Purpose:** Per-user preferences: theme, language and the notification channels the user wants
(push, booking-reminder email, promotions). notification-service reads the channels through the
internal contact endpoint and applies them when sending (ADR-011 §12).

```sql
CREATE TABLE [security].user_preference (
    user_preference_id    BIGINT       IDENTITY(1,1) NOT NULL,
    user_id               BIGINT       NOT NULL,   -- same schema since ADR-009: real FK
    theme                 NVARCHAR(20) NOT NULL CONSTRAINT df_pref_theme DEFAULT N'green-light',
    [language]            NVARCHAR(5)  NOT NULL CONSTRAINT df_pref_lang DEFAULT N'es',
    notifications_enabled BIT          NOT NULL CONSTRAINT df_pref_notif DEFAULT 1,
    email_reminders_enabled BIT        NOT NULL CONSTRAINT df_pref_email_reminders DEFAULT 1,  -- migration 030
    promotions_enabled    BIT          NOT NULL CONSTRAINT df_pref_promotions DEFAULT 1,       -- migration 030
    created_at            DATETIME2(3) NOT NULL CONSTRAINT df_pref_created DEFAULT SYSUTCDATETIME(),
    created_by            BIGINT       NULL,
    updated_at            DATETIME2(3) NULL,
    updated_by            BIGINT       NULL,
    deleted_at            DATETIME2(3) NULL,
    deleted_by            BIGINT       NULL,
    row_version           INT          NOT NULL CONSTRAINT df_pref_rv DEFAULT 1,
    CONSTRAINT pk_user_preference PRIMARY KEY (user_preference_id),
    CONSTRAINT uq_user_preference_user UNIQUE (user_id),
    CONSTRAINT fk_user_preference_user FOREIGN KEY (user_id) REFERENCES [security].app_user(user_id),
    CONSTRAINT ck_pref_theme CHECK (theme IN (N'green-light', N'green-dark', N'pink', N'pink-dark')),  -- migration 020
    CONSTRAINT ck_pref_language CHECK ([language] IN (N'es', N'en', N'fr', N'pt'))
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `user_preference_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `user_id` | BIGINT | No | Owning account. | Unique, FK → `security.app_user.user_id` |
| `theme` | NVARCHAR(20) | No | One of the four palettes: `green-light`, `green-dark`, `pink`, `pink-dark` (migration 020). | `ck_pref_theme` |
| `language` | NVARCHAR(5) | No | `es`, `en`, `fr` or `pt` — the four languages RF-020 asks for. | `ck_pref_language` |
| `notifications_enabled` | BIT | No | Push notifications to the user's phones ("Notificaciones push"). The in-app inbox is always filled. | — |
| `email_reminders_enabled` | BIT | No | Booking reminders by email ("Recordatorios por email"). Default 1 (migration 030). | — |
| `promotions_enabled` | BIT | No | Promotion alerts — unlocked coupons — by email and push ("Promociones y ofertas"). Default 1 (migration 030). | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. Kept out of `app_user` on purpose: these are UI preferences, not security data. Merging them would mean reading the credentials table every time someone switches theme.
2. **Moved from `settings` to `security` (ADR-009).** Theme and language are one more attribute of the user, and `security-service` already owns everything else about the user. Being in the same schema as `app_user`, `user_id` now carries a real foreign key.
3. `language` accepts four values, not two: RF-020 asks for Spanish, English, French and Portuguese.

---

### Table: `login_lockout`

**Purpose:** Failed logins of an account and its lockout (RF-004b, migration 034): 5 wrong passwords within 15 minutes lock the account for 15 minutes.

```sql
CREATE TABLE [security].login_lockout (
    user_id         BIGINT       NOT NULL,
    failed_count    INT          NOT NULL DEFAULT 0,
    first_failed_at DATETIME2(3) NULL,
    locked_until    DATETIME2(3) NULL,
    updated_at      DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_login_lockout PRIMARY KEY (user_id),
    CONSTRAINT fk_login_lockout_user FOREIGN KEY (user_id) REFERENCES [security].app_user(user_id),
    CONSTRAINT ck_login_lockout_count CHECK (failed_count >= 0 AND failed_count < 5)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `user_id` | BIGINT | No | The account. | PK, FK → `security.app_user` |
| `failed_count` | INT | No | Wrong passwords inside the current 15-minute window. | 0–4 (the fifth locks and resets it) |
| `first_failed_at` | DATETIME2(3) | Yes | Start of the window (first failure). | — |
| `locked_until` | DATETIME2(3) | Yes | Until when the account is locked; NULL when it is not. | — |
| `updated_at` | DATETIME2(3) | No | Last change. | — |

**Modeling decisions:**

1. Out of `app_user` so a failed attempt never touches the credentials row; the row only exists while there are recent failures or a lock, and it is deleted on a successful login or a password reset.
2. While locked, not even the right password gets in (`423 ACCOUNT_LOCKED`). An email that does not exist is never locked and keeps the generic `INVALID_CREDENTIALS`: the trade-off is that an attacker could tell a real account by its lock, accepted at this scale.
3. Failures are saved even though the login answers an error (`@Transactional(noRollbackFor = …)`).

### Table: `person_address`

**Purpose:** The contact address of a person (ADR-010, migration 035). Before it the profile kept the address only in the browser or the phone.

```sql
CREATE TABLE [security].person_address (
    person_id  BIGINT        NOT NULL,
    address    NVARCHAR(200) NOT NULL,
    updated_at DATETIME2(3)  NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_person_address PRIMARY KEY (person_id),
    CONSTRAINT fk_person_address_person FOREIGN KEY (person_id) REFERENCES [security].person(person_id),
    CONSTRAINT ck_person_address_not_blank CHECK (LEN(LTRIM(RTRIM(address))) > 0)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `person_id` | BIGINT | No | The person. | PK, FK → `security.person` |
| `address` | NVARCHAR(200) | No | Contact address, trimmed. | Not blank |
| `updated_at` | DATETIME2(3) | No | Last change. | — |

**Modeling decisions:**

1. Its own table so `person`, part of the shared core, is not altered. One row per person; saving an empty address deletes the row instead of storing a blank value.
2. Registration still does not ask for it: the service is given at the shop. It is an optional profile field read and written through `GET/PUT /api/v1/users/me/address`.

---

## 02. audit

**Owning service:** `security-service` (planned to be written by database triggers; as of 2026-10-20 no trigger or service writes to it, so the table is empty)

**DB Engine:** SQL Server 2016+

**Engine justification:**

- Same physical database as every other schema; a single cross-cutting log makes more sense as one more schema than as a separate engine.
- JSON columns cover the fact that each audited entity has a different shape, without needing a document database just for this.

### Table: `audit_log`

**Purpose:** Single change-history table for the entire system.

```sql
CREATE TABLE [audit].audit_log (
    audit_log_id  BIGINT         IDENTITY(1,1) NOT NULL,
    entity        NVARCHAR(60)   NOT NULL,
    entity_id     BIGINT         NOT NULL,
    [action]      NVARCHAR(20)   NOT NULL,
    previous_data NVARCHAR(MAX)  NULL,
    new_data      NVARCHAR(MAX)  NULL,
    changed_by    BIGINT         NULL,
    changed_at    DATETIME2(3)   NOT NULL CONSTRAINT df_audit_log_changed_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_audit_log PRIMARY KEY (audit_log_id)
);
```

**Indexes:**

| Name | Fields | Type | Justification |
|------|--------|------|----------------|
| `ix_audit_log_entity` | `entity, entity_id` | Non-unique | Look up the change history for one specific row. |
| `ix_audit_log_date` | `changed_at` | Non-unique | Time-ordered browsing of the log. |

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `audit_log_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `entity` | NVARCHAR(60) | No | Logical entity name, e.g. `booking.booking`. | — |
| `entity_id` | BIGINT | No | Primary key of the changed row inside that entity. | — |
| `action` | NVARCHAR(20) | No | `INSERT` / `UPDATE` / `DELETE` (or the specific business action). | — |
| `previous_data` | NVARCHAR(MAX) | Yes | Row state before the change, as JSON. | — |
| `new_data` | NVARCHAR(MAX) | Yes | Row state after the change, as JSON. | — |
| `changed_by` | BIGINT | Yes | Who made the change. | — |
| `changed_at` | DATETIME2(3) | No | When, UTC. | — |

**Modeling decisions:**

1. One generic table instead of `booking_history`, `payment_history`, etc.: canceling a booking, approving a payment, and updating a price are all the same kind of event — *something changed* — so every history query starts from the same place.
2. `previous_data`/`new_data` are `NVARCHAR(MAX)` JSON, not typed columns, because every entity has a different shape and one fixed schema can't fit all of them.
3. **Status (2026-10-20):** the audit triggers and the `sp_set_session_context` call that would fill `changed_by` were never built (`05-architecture/cross-cutting.md` §1). Who changed a row and when is kept today by the audit block of each table.

---

## 03. customer

**Owning service:** `customer-service`

**DB Engine:** SQL Server 2016+

**Engine justification:**

- Relational fits the 1-customer-to-many-vehicles relationship naturally. (The loyalty ledger that used to live here moved to `payment`, ADR-009.)

### Table: `vehicle_type`

**Purpose:** Motorcycle, car, SUV, truck.

```sql
CREATE TABLE [customer].vehicle_type (
    vehicle_type_id SMALLINT     IDENTITY(1,1) NOT NULL,
    code            NVARCHAR(30) NOT NULL,
    name            NVARCHAR(60) NOT NULL,
    size_factor     DECIMAL(4,2) NOT NULL,
    display_order   SMALLINT     NOT NULL CONSTRAINT df_vtype_order DEFAULT 0,
    is_active       BIT          NOT NULL CONSTRAINT df_vtype_active DEFAULT 1,
    created_at      DATETIME2(3) NOT NULL CONSTRAINT df_vtype_created DEFAULT SYSUTCDATETIME(),
    created_by      BIGINT       NULL,
    updated_at      DATETIME2(3) NULL,
    updated_by      BIGINT       NULL,
    deleted_at      DATETIME2(3) NULL,
    deleted_by      BIGINT       NULL,
    row_version     INT          NOT NULL CONSTRAINT df_vtype_rv DEFAULT 1,
    CONSTRAINT pk_vehicle_type PRIMARY KEY (vehicle_type_id),
    CONSTRAINT uq_vehicle_type_code UNIQUE (code),
    -- added (not in 06-data)
    CONSTRAINT ck_vehicle_type_size_factor CHECK (size_factor > 0)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `vehicle_type_id` | SMALLINT | No | Surrogate primary key (IDENTITY). | PK |
| `code` | NVARCHAR(30) | No | Seeded with `MOTO`, `AUTOMOVIL`, `CAMIONETA`, `CAMION`. | Unique |
| `name` | NVARCHAR(60) | No | Label shown to the user. | — |
| `size_factor` | DECIMAL(4,2) | No | Reference multiplier only (e.g. a truck is roughly double a car). | — |
| `display_order` | SMALLINT | No | Sort order in pickers. | — |
| `is_active` | BIT | No | Soft on/off switch. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. `size_factor` never drives an actual charge — it only seeds a suggested price when an admin creates a new tariff. The real price lives explicitly in `catalog.service_price`; if the app computed price from this factor, there would be two sources of truth for the same number.
2. `ck_vehicle_type_size_factor` (`size_factor > 0`) was added with ADR-009: a zero or negative factor would suggest nonsensical tariffs.

---

### Table: `customer`

**Purpose:** The customer record.

```sql
CREATE TABLE [customer].[customer] (
    customer_id    BIGINT       IDENTITY(1,1) NOT NULL,
    person_id      BIGINT       NOT NULL,   -- [security].person
    user_id        BIGINT       NULL,       -- [security].app_user = JWT subject (changeset 014)
    loyalty_points INT          NOT NULL CONSTRAINT df_customer_points DEFAULT 0,   -- display copy, truth = [payment].loyalty_transaction (ADR-009)
    customer_since DATE         NOT NULL CONSTRAINT df_customer_since DEFAULT CAST(SYSUTCDATETIME() AS DATE),
    created_at     DATETIME2(3) NOT NULL CONSTRAINT df_customer_created DEFAULT SYSUTCDATETIME(),
    created_by     BIGINT       NULL,
    updated_at     DATETIME2(3) NULL,
    updated_by     BIGINT       NULL,
    deleted_at     DATETIME2(3) NULL,
    deleted_by     BIGINT       NULL,
    row_version    INT          NOT NULL CONSTRAINT df_customer_rv DEFAULT 1,
    CONSTRAINT pk_customer PRIMARY KEY (customer_id),
    CONSTRAINT uq_customer_person UNIQUE (person_id),
    CONSTRAINT ck_customer_points CHECK (loyalty_points >= 0)
);
```

**Indexes:**

| Name | Fields | Type | Justification |
|------|--------|------|----------------|
| `ux_customer_user` | `user_id` `WHERE user_id IS NOT NULL AND deleted_at IS NULL` | Unique, filtered | One profile per account; the profile is looked up by the token's subject. |

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `customer_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `person_id` | BIGINT | No | The underlying human. | Unique, No FK — owned by `security.person`, see the cross-service contract below. |
| `user_id` | BIGINT | Yes | The login account (`security.app_user`), equal to the JWT `sub`. Added by customer-service changeset 014. | Unique (filtered), No FK |
| `loyalty_points` | INT | No | Display copy of the balance, as originally planned. **Not kept in sync as of ADR-015 (2026-10-07):** the implemented balance is always read live from `payment.loyalty_transaction.balance_after` (`GET /api/v1/loyalty/balance`, payment-service); no event consumer updates this column, so it stays at its default `0` and should not be read by any screen. See the Modeling decisions note below. | — |
| `customer_since` | DATE | No | Date they became a customer. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. Does not repeat name or phone — those already live in `security.person`. Duplicating them would violate 3NF and guarantee that, sooner or later, a phone number gets updated in one table and goes stale in the other.
2. `loyalty_points` is a controlled denormalization: it could always be derived by summing `loyalty_transaction`, but doing that on every screen would be slow. The cached value must stay reconcilable against the ledger.
3. **`loyalty_points` is a display copy since ADR-009; as implemented (ADR-015), it is simply unused.** The plan was for `customer-service` to update it from loyalty events (`LoyaltyPointsEarned` / `LoyaltyPointsRedeemed`) and for every screen to read the ledger only for redemption decisions. In practice, both the client dashboard's balance and the redemption check read `payment.loyalty_transaction.balance_after` directly (live, via payment-service's own endpoint) — there turned out to be no case where the cached copy would have saved a real round trip, so the event plumbing to keep it in sync was never built. The column stays in the schema (dropping it needs its own two-phase migration per the rules below) but always reads `0`.
4. **`user_id` (changeset 014):** the token carries the user id, not the person id, so the profile is found by `user_id`. It is nullable only because rows created before the change had none.

---

### Table: `customer_vehicle`

**Purpose:** A customer's vehicles.

```sql
CREATE TABLE [customer].customer_vehicle (
    customer_vehicle_id BIGINT       IDENTITY(1,1) NOT NULL,
    customer_id         BIGINT       NOT NULL,
    license_plate       NVARCHAR(10) NOT NULL,
    vehicle_type_id     SMALLINT     NOT NULL,
    brand               NVARCHAR(50) NULL,
    model               NVARCHAR(50) NULL,   -- ADR-010 (changeset 015)
    color               NVARCHAR(30) NULL,
    created_at          DATETIME2(3) NOT NULL CONSTRAINT df_cveh_created DEFAULT SYSUTCDATETIME(),
    created_by          BIGINT       NULL,
    updated_at          DATETIME2(3) NULL,
    updated_by          BIGINT       NULL,
    deleted_at          DATETIME2(3) NULL,
    deleted_by          BIGINT       NULL,
    row_version         INT          NOT NULL CONSTRAINT df_cveh_rv DEFAULT 1,
    CONSTRAINT pk_customer_vehicle PRIMARY KEY (customer_vehicle_id),
    CONSTRAINT fk_customer_vehicle_customer FOREIGN KEY (customer_id) REFERENCES [customer].[customer](customer_id),
    CONSTRAINT fk_customer_vehicle_type FOREIGN KEY (vehicle_type_id) REFERENCES [customer].vehicle_type(vehicle_type_id)
);
```

**Indexes:**

| Name | Fields | Type | Justification |
|------|--------|------|----------------|
| `ux_customer_vehicle_plate_active` | `license_plate` `WHERE deleted_at IS NULL` | Unique, filtered | Plate unique only while not soft-deleted — lets a deleted plate be re-registered. |
| `ix_customer_vehicle_customer` | `customer_id` | Non-unique | List a customer's vehicles. |

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `customer_vehicle_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `customer_id` | BIGINT | No | Owning customer. | FK → `customer.customer.customer_id` |
| `license_plate` | NVARCHAR(10) | No | Unique only among vehicles that aren't soft-deleted — see the filtered index below. | — |
| `vehicle_type_id` | SMALLINT | No | Category used for pricing. | FK → `customer.vehicle_type.vehicle_type_id` |
| `brand` | NVARCHAR(50) | Yes | Optional. | — |
| `model` | NVARCHAR(50) | Yes | Optional (ADR-010: the registration form asks for it). | — |
| `color` | NVARCHAR(30) | Yes | Optional. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. 1NF: one vehicle per row. A customer with three cars gets three rows, never one row with plates concatenated by commas.
2. Plate uniqueness is enforced with a *filtered* unique index (`WHERE deleted_at IS NULL`) instead of a plain `UNIQUE` constraint, so a car that was sold to someone else, or a mistaken entry that got soft-deleted, doesn't permanently block that plate from ever being re-registered.

---

## 04. catalog

**Owning service:** `booking-service` (together with `booking`)

**DB Engine:** SQL Server 2016+

**Engine justification:**

- Pure relational data (services, prices, categories) with strict integrity rules (immutability, no-overlap) that are far easier to enforce with SQL constraints and triggers than in application code alone.

### Table: `service_category`

**Purpose:** Wash, polish, detailing, interior treatment — groups services for the customer-facing screen.

```sql
CREATE TABLE [catalog].service_category (
    service_category_id SMALLINT      IDENTITY(1,1) NOT NULL,
    code          NVARCHAR(30)  NOT NULL,
    name          NVARCHAR(60)  NOT NULL,
    [description] NVARCHAR(200) NULL,
    display_order SMALLINT      NOT NULL CONSTRAINT df_scat_order DEFAULT 0,
    is_active     BIT           NOT NULL CONSTRAINT df_scat_active DEFAULT 1,
    created_at    DATETIME2(3)  NOT NULL CONSTRAINT df_scat_created DEFAULT SYSUTCDATETIME(),
    created_by    BIGINT        NULL,
    updated_at    DATETIME2(3)  NULL,
    updated_by    BIGINT        NULL,
    deleted_at    DATETIME2(3)  NULL,
    deleted_by    BIGINT        NULL,
    row_version   INT           NOT NULL CONSTRAINT df_scat_rv DEFAULT 1,
    CONSTRAINT pk_service_category PRIMARY KEY (service_category_id),
    CONSTRAINT uq_service_category_code UNIQUE (code)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `service_category_id` | SMALLINT | No | Surrogate primary key (IDENTITY). | PK |
| `code` | NVARCHAR(30) | No | Seeded with `LAVADO`, `POLICHADO`, `DETALLADO`, `INTERIOR`. | Unique |
| `name` | NVARCHAR(60) | No | Label. | — |
| `description` | NVARCHAR(200) | Yes | Optional longer text. | — |
| `display_order` | SMALLINT | No | Sort order. | — |
| `is_active` | BIT | No | Soft on/off switch. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

---

### Table: `service`

**Purpose:** A service the shop offers.

```sql
CREATE TABLE [catalog].[service] (
    service_id          INT            IDENTITY(1,1) NOT NULL,
    code                NVARCHAR(30)   NOT NULL,
    name                NVARCHAR(100)  NOT NULL,
    [description]       NVARCHAR(MAX)  NULL,
    service_category_id SMALLINT       NOT NULL,
    is_active           BIT            NOT NULL CONSTRAINT df_service_active DEFAULT 1,
    loyalty_points      INT            NOT NULL CONSTRAINT df_service_loyalty_points DEFAULT 0,   -- ADR-015, changeset 022
    created_at          DATETIME2(3)   NOT NULL CONSTRAINT df_service_created DEFAULT SYSUTCDATETIME(),
    created_by          BIGINT         NULL,
    updated_at          DATETIME2(3)   NULL,
    updated_by          BIGINT         NULL,
    deleted_at          DATETIME2(3)   NULL,
    deleted_by          BIGINT         NULL,
    row_version         INT            NOT NULL CONSTRAINT df_service_rv DEFAULT 1,
    CONSTRAINT pk_service PRIMARY KEY (service_id),
    CONSTRAINT uq_service_code UNIQUE (code),
    CONSTRAINT fk_service_category FOREIGN KEY (service_category_id) REFERENCES [catalog].service_category(service_category_id)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `service_id` | INT | No | Surrogate primary key (IDENTITY). | PK |
| `code` | NVARCHAR(30) | No | Machine-readable code. | Unique |
| `name` | NVARCHAR(100) | No | Label. | — |
| `description` | NVARCHAR(MAX) | Yes | Longer description. | — |
| `service_category_id` | SMALLINT | No | Which category it belongs to. | FK → `catalog.service_category.service_category_id` |
| `is_active` | BIT | No | Soft on/off switch. | — |
| `loyalty_points` | INT | No | Points the customer earns per unit of this service when its booking's payment is approved (ADR-015). Admin-editable in Gestión > Servicios; not a flat COP-based rate. | `>= 0` |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. Deliberately has no `price` column. Price depends on the service *and* the vehicle type — washing a motorcycle and washing a truck are the same service at different prices. Putting price here would force three separate services ("Basic wash — motorcycle", "— car", "— SUV") instead of one service with three tariffs.
2. **`loyalty_points` (ADR-015, changeset `022`) lives here, not on `service_price`.** Unlike price, it does not vary by vehicle type, so one column per service is enough. There is no historical row to freeze it against (no `service_price`-like immutable row exists for points): `booking-service` reads the live value when it builds each booking line, the same way it already reads the line's `code`/`name` live from `catalog.service` rather than from a frozen copy. A later change to a service's points can change what an already-placed, still-unpaid booking is worth; this is accepted as a minor, low-stakes inconsistency rather than adding a second immutable-row mechanism just for this field.

---

### Table: `service_price`

**Purpose:** The price and duration for one (service, vehicle type) pair, with an effective date range.

```sql
CREATE TABLE [catalog].service_price (
    service_price_id  BIGINT        IDENTITY(1,1) NOT NULL,
    service_id        INT           NOT NULL,
    vehicle_type_id   SMALLINT      NOT NULL,   -- [customer].vehicle_type
    price             DECIMAL(12,2) NOT NULL,
    estimated_minutes SMALLINT      NOT NULL,
    valid_from        DATE          NOT NULL,
    valid_to          DATE          NULL,
    created_at        DATETIME2(3)  NOT NULL CONSTRAINT df_sprice_created DEFAULT SYSUTCDATETIME(),
    created_by        BIGINT        NULL,
    updated_at        DATETIME2(3)  NULL,
    updated_by        BIGINT        NULL,
    deleted_at        DATETIME2(3)  NULL,
    deleted_by        BIGINT        NULL,
    row_version       INT           NOT NULL CONSTRAINT df_sprice_rv DEFAULT 1,
    CONSTRAINT pk_service_price PRIMARY KEY (service_price_id),
    CONSTRAINT fk_service_price_service FOREIGN KEY (service_id) REFERENCES [catalog].[service](service_id),
    CONSTRAINT ck_service_price_price CHECK (price >= 0),
    CONSTRAINT ck_service_price_minutes CHECK (estimated_minutes > 0),
    CONSTRAINT ck_service_price_range CHECK (valid_to IS NULL OR valid_to > valid_from)
);
```

**Indexes:**

| Name | Fields | Type | Justification |
|------|--------|------|----------------|
| `ux_service_price_current` | `service_id, vehicle_type_id` `WHERE valid_to IS NULL AND deleted_at IS NULL` | Unique, filtered | At most one current tariff per (service, vehicle type) — filtered so a soft-deleted tariff doesn't block a new one. |
| `ix_service_price_vehicle_type` | `vehicle_type_id` | Non-unique | Cross-service lookup support for `catalog.service_price.vehicle_type_id`. |

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `service_price_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `service_id` | INT | No | The service being priced. | FK → `catalog.service.service_id` |
| `vehicle_type_id` | SMALLINT | No | The vehicle type this price applies to. | No FK — owned by `customer.vehicle_type`, see the cross-service contract below. |
| `price` | DECIMAL(12,2) | No | The tariff. | — |
| `estimated_minutes` | SMALLINT | No | Expected duration, used for scheduling. | — |
| `valid_from` | DATE | No | Start of the effective date range. | — |
| `valid_to` | DATE | Yes | End of the effective date range; NULL = currently in force. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. Exists as its own table (2NF): price depends on the *whole* key (service + vehicle type), not on service alone — storing it on `service` would be a partial dependency.
2. **The row is immutable once created.** `price`, `service_id`, `vehicle_type_id`, and `valid_from` are never updated — enforced by the `tr_service_price_immutable` trigger. `booking.booking_service` freezes the price it charged by pointing straight at this row; an `UPDATE` here would silently rewrite what a booking from three months ago actually cost. Raising a price means closing the current row (`valid_to = today`) and inserting a new one.
3. A filtered unique index (`ux_service_price_current`) guarantees at most one *current* tariff per (service, vehicle type) pair. There is no trigger for overlapping historical ranges: `CatalogService` always closes the current row before inserting the new one.

---

## 05. booking

**Owning service:** `booking-service` (together with `catalog`)

**DB Engine:** SQL Server 2016+

**Engine justification:**

- The scheduling core: overlap rules, immutable price references, and derived totals are exactly the kind of integrity relational constraints and triggers are built for.

### Table: `establishment`

**Purpose:** The wash shop's own business data: what goes on the receipt header, the logo, the contact screen, and the legal, tax and channel data the admin edits in **Settings → Business data** (migration 032).

```sql
CREATE TABLE [booking].establishment (
    establishment_id SMALLINT      IDENTITY(1,1) NOT NULL,
    legal_name       NVARCHAR(150) NOT NULL,
    trade_name       NVARCHAR(150) NOT NULL,
    tax_id           NVARCHAR(30)  NOT NULL,
    [address]        NVARCHAR(200) NOT NULL,
    phone            NVARCHAR(20)  NULL,
    email            NVARCHAR(120) NULL,
    logo_url         NVARCHAR(500) NULL,
    -- migration 032
    business_type                 NVARCHAR(100) NULL,
    founded_on                    DATE          NULL,
    legal_representative          NVARCHAR(150) NULL,
    legal_representative_document NVARCHAR(30)  NULL,
    website                       NVARCHAR(200) NULL,
    tax_regime                    NVARCHAR(150) NULL,
    ciiu_activity                 NVARCHAR(150) NULL,
    dian_resolution               NVARCHAR(60)  NULL,
    invoice_prefix                NVARCHAR(10)  NULL,
    invoice_range                 NVARCHAR(30)  NULL,
    instagram                     NVARCHAR(100) NULL,
    facebook                      NVARCHAR(150) NULL,
    support_line                  NVARCHAR(30)  NULL,
    service_hours_note            NVARCHAR(150) NULL,
    singleton        BIT           NOT NULL CONSTRAINT df_establishment_singleton DEFAULT 1,
    created_at       DATETIME2(3)  NOT NULL CONSTRAINT df_establishment_created DEFAULT SYSUTCDATETIME(),
    created_by       BIGINT        NULL,
    updated_at       DATETIME2(3)  NULL,
    updated_by       BIGINT        NULL,
    deleted_at       DATETIME2(3)  NULL,
    deleted_by       BIGINT        NULL,
    row_version      INT           NOT NULL CONSTRAINT df_establishment_rv DEFAULT 1,
    CONSTRAINT pk_establishment PRIMARY KEY (establishment_id),
    CONSTRAINT uq_establishment_singleton UNIQUE (singleton),
    CONSTRAINT ck_establishment_singleton CHECK (singleton = 1)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `establishment_id` | SMALLINT | No | Surrogate primary key (IDENTITY). | PK |
| `legal_name` | NVARCHAR(150) | No | Registered legal name. | — |
| `trade_name` | NVARCHAR(150) | No | Name shown to customers. | — |
| `tax_id` | NVARCHAR(30) | No | Tax ID (NIT). | — |
| `address` | NVARCHAR(200) | No | Physical address. | — |
| `phone` | NVARCHAR(20) | Yes | Contact phone. | — |
| `email` | NVARCHAR(120) | Yes | Contact email. | — |
| `logo_url` | NVARCHAR(500) | Yes | Logo shown in the admin panel and the customer app. | — |
| `business_type` | NVARCHAR(100) | Yes | Kind of business, e.g. "Lavado y Detailing Automotriz". | — |
| `founded_on` | DATE | Yes | Foundation date. | Not in the future (app rule) |
| `legal_representative` / `legal_representative_document` | NVARCHAR(150) / NVARCHAR(30) | Yes | Legal representative and their ID document. Admin only, never public. | — |
| `website` | NVARCHAR(200) | Yes | Website. | — |
| `tax_regime` / `ciiu_activity` / `dian_resolution` | NVARCHAR(150) / NVARCHAR(150) / NVARCHAR(60) | Yes | Tax information for invoices. Admin only. | — |
| `invoice_prefix` / `invoice_range` | NVARCHAR(10) / NVARCHAR(30) | Yes | Invoice numbering authorized by DIAN. Admin only. | — |
| `instagram` / `facebook` / `support_line` | NVARCHAR(100) / NVARCHAR(150) / NVARCHAR(30) | Yes | Official channels, shown to customers. | — |
| `service_hours_note` | NVARCHAR(150) | Yes | Free text for the hours shown on the contact screen; the real hours that drive availability are `business_hour`. | — |
| `singleton` | BIT | No | Always `1`. Exists purely so the CHECK constraint below can enforce a single row. | Unique |

**Modeling decisions:**

1. `singleton UNIQUE` + `CHECK (singleton = 1)` makes "exactly one establishment" a database guarantee, not an app convention — a second `INSERT` fails outright instead of relying on someone remembering not to add one.
2. Optional in principle: this data could live in a config file instead. It's a table so an admin can change the logo or phone from the panel without a redeploy.
3. **Moved from `settings` to `booking` (ADR-009).** The establishment is the shop itself: its business hours, their exceptions and its wash bays already live in this schema. `payment-service` reads the tax id and logo for receipts, but reading a value does not make it the owner.
4. **Legal, tax and channel columns (migration 032).** Until then the admin's **Business data** form lived only in the browser or the phone. All new columns are nullable; the rules (legal name, tax id and address required, phone with at least 7 digits, valid email, foundation date not in the future) live in the `Establishment` domain record, not in the screens. The public `GET /establishment` exposes only the contact and channel columns; the legal representative and the tax data are read through `GET /admin/establishment`. The example values are seeded by `seed/110`.

---

### Table: `business_hour`

**Purpose:** Opening hours by day of week.

```sql
CREATE TABLE [booking].business_hour (
    business_hour_id SMALLINT     IDENTITY(1,1) NOT NULL,
    day_of_week      SMALLINT     NOT NULL,
    opens_at         TIME(0)      NOT NULL,
    closes_at        TIME(0)      NOT NULL,
    -- ADR-010: pausa de almuerzo, opcional y dentro de la jornada
    break_starts_at  TIME(0)      NULL,
    break_ends_at    TIME(0)      NULL,
    is_active        BIT          NOT NULL CONSTRAINT df_bh_active DEFAULT 1,
    break_starts_at  TIME(0)      NULL,   -- optional daily break (ADR-010)
    break_ends_at    TIME(0)      NULL,
    created_at       DATETIME2(3) NOT NULL CONSTRAINT df_bh_created DEFAULT SYSUTCDATETIME(),
    created_by       BIGINT       NULL,
    updated_at       DATETIME2(3) NULL,
    updated_by       BIGINT       NULL,
    deleted_at       DATETIME2(3) NULL,
    deleted_by       BIGINT       NULL,
    row_version      INT          NOT NULL CONSTRAINT df_bh_rv DEFAULT 1,
    CONSTRAINT pk_business_hour PRIMARY KEY (business_hour_id),
    CONSTRAINT uq_business_hour_day UNIQUE (day_of_week),
    CONSTRAINT ck_business_hour_day CHECK (day_of_week BETWEEN 1 AND 7),
    CONSTRAINT ck_business_hour_range CHECK (closes_at > opens_at),
    CONSTRAINT ck_business_hour_break CHECK (
        (break_starts_at IS NULL AND break_ends_at IS NULL) OR
        (break_starts_at IS NOT NULL AND break_ends_at IS NOT NULL
            AND break_starts_at > opens_at AND break_ends_at < closes_at AND break_ends_at > break_starts_at)
    )
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `business_hour_id` | SMALLINT | No | Surrogate primary key (IDENTITY). | PK |
| `day_of_week` | SMALLINT | No | 1–7. | Unique |
| `opens_at` | TIME(0) | No | Opening time. | — |
| `closes_at` | TIME(0) | No | Closing time. | — |
| `break_starts_at` | TIME(0) | Yes | Start of the daily lunch break (ADR-010); only when a break exists. | Both or neither; inside the opening hours (`ck_business_hour_break`) |
| `break_ends_at` | TIME(0) | Yes | End of the daily lunch break. | idem |
| `is_active` | BIT | No | Whether the shop opens that weekday (`false` = closed day; the hours are kept). Sunday is seeded inactive. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. Deliberately does not store a bay count. An earlier version repeated `concurrent_bays` on all seven rows — always the same number — which violates 3NF, since bay capacity has nothing to do with the day of week. Capacity is now obtained by counting active `service_bay` rows.
2. **Lunch break added (ADR-010, changeset `018`).** The shop closes for lunch some days; without these two columns availability would offer slots at noon every day. A CHECK constraint keeps the break inside the shift (both null, or both set and strictly between `opens_at` and `closes_at`).

---

### Table: `business_hour_exception`

**Purpose:** Holidays, maintenance closures, special hours — days that don't follow the normal schedule.

```sql
CREATE TABLE [booking].business_hour_exception (
    business_hour_exception_id INT           IDENTITY(1,1) NOT NULL,
    exception_date             DATE          NOT NULL,
    is_closed                  BIT           NOT NULL CONSTRAINT df_bhe_closed DEFAULT 1,
    opens_at                   TIME(0)       NULL,
    closes_at                  TIME(0)       NULL,
    reason                     NVARCHAR(120) NOT NULL,
    created_at                 DATETIME2(3)  NOT NULL CONSTRAINT df_bhe_created DEFAULT SYSUTCDATETIME(),
    created_by                 BIGINT        NULL,
    updated_at                 DATETIME2(3)  NULL,
    updated_by                 BIGINT        NULL,
    deleted_at                 DATETIME2(3)  NULL,
    deleted_by                 BIGINT        NULL,
    row_version                INT           NOT NULL CONSTRAINT df_bhe_rv DEFAULT 1,
    CONSTRAINT pk_business_hour_exception PRIMARY KEY (business_hour_exception_id),
    CONSTRAINT uq_business_hour_exception_date UNIQUE (exception_date),
    CONSTRAINT ck_bhe_hours CHECK (
        (is_closed = 1 AND opens_at IS NULL AND closes_at IS NULL) OR
        (is_closed = 0 AND opens_at IS NOT NULL AND closes_at IS NOT NULL AND closes_at > opens_at)
    )
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `business_hour_exception_id` | INT | No | Surrogate primary key (IDENTITY). | PK |
| `exception_date` | DATE | No | The date affected. | Unique |
| `is_closed` | BIT | No | Whether the shop is fully closed that day. | — |
| `opens_at` | TIME(0) | Yes | Special opening time, only when not closed. | — |
| `closes_at` | TIME(0) | Yes | Special closing time, only when not closed. | — |
| `reason` | NVARCHAR(120) | No | Why the day is different. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. Without this table, `business_hour` alone would let the system book slots on a public holiday just because it's a normal weekday. Colombia has 18 public holidays a year.
2. A CHECK constraint enforces the shape: closed days carry no hours, special hours require both `opens_at` and `closes_at`.

---

### Table: `bay_status`

**Purpose:** The possible states of a wash bay (ADR-010 replaced `service_bay.is_active` with this catalog).

```sql
CREATE TABLE [booking].bay_status (
    bay_status_id    SMALLINT     IDENTITY(1,1) NOT NULL,
    code             NVARCHAR(30) NOT NULL,
    name             NVARCHAR(60) NOT NULL,
    accepts_bookings BIT          NOT NULL CONSTRAINT df_baystatus_accepts DEFAULT 0,
    display_order    SMALLINT     NOT NULL CONSTRAINT df_baystatus_order DEFAULT 0,
    created_at       DATETIME2(3) NOT NULL CONSTRAINT df_baystatus_created DEFAULT SYSUTCDATETIME(),
    created_by       BIGINT       NULL,
    updated_at       DATETIME2(3) NULL,
    updated_by       BIGINT       NULL,
    deleted_at       DATETIME2(3) NULL,
    deleted_by       BIGINT       NULL,
    row_version      INT          NOT NULL CONSTRAINT df_baystatus_rv DEFAULT 1,
    CONSTRAINT pk_bay_status PRIMARY KEY (bay_status_id),
    CONSTRAINT uq_bay_status_code UNIQUE (code)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `bay_status_id` | SMALLINT | No | Surrogate primary key (IDENTITY). ⚠️ Seeded `1 = ACTIVE`, `2 = MAINTENANCE`, `3 = INACTIVE` (changeset `018`) — availability and confirmation only count bays whose status accepts bookings. | PK |
| `code` | NVARCHAR(30) | No | `ACTIVE`, `MAINTENANCE`, `INACTIVE`. | Unique |
| `name` | NVARCHAR(60) | No | Label. | — |
| `accepts_bookings` | BIT | No | Whether bays in this state can receive bookings (`ACTIVE` = 1, the rest = 0). | — |
| `display_order` | SMALLINT | No | Sort order. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. **Created by ADR-010** (changeset `018`). The old `service_bay.is_active` boolean could not express "under maintenance": an inactive bay was indistinguishable from one the shop simply does not use today. A catalog of states (`ACTIVE`, `MAINTENANCE`, `INACTIVE`) gives the admin screen an explicit switch, and `accepts_bookings` says who counts for slot availability without confusing state with usage.

---

### Table: `service_bay`

**Purpose:** The shop's physical wash bays.

```sql
CREATE TABLE [booking].service_bay (
    service_bay_id SMALLINT     IDENTITY(1,1) NOT NULL,
    code           NVARCHAR(20) NOT NULL,
    name           NVARCHAR(60) NOT NULL,
    bay_status_id  SMALLINT     NOT NULL CONSTRAINT df_bay_status DEFAULT 1,   -- ADR-010: estado desde bay_status (1 = ACTIVE)
    created_at     DATETIME2(3) NOT NULL CONSTRAINT df_bay_created DEFAULT SYSUTCDATETIME(),
    created_by     BIGINT       NULL,
    updated_at     DATETIME2(3) NULL,
    updated_by     BIGINT       NULL,
    deleted_at     DATETIME2(3) NULL,
    deleted_by     BIGINT       NULL,
    row_version    INT          NOT NULL CONSTRAINT df_bay_rv DEFAULT 1,
    CONSTRAINT pk_service_bay PRIMARY KEY (service_bay_id),
    CONSTRAINT uq_service_bay_code UNIQUE (code),
    CONSTRAINT fk_service_bay_status FOREIGN KEY (bay_status_id) REFERENCES [booking].bay_status(bay_status_id)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `service_bay_id` | SMALLINT | No | Surrogate primary key (IDENTITY). | PK |
| `code` | NVARCHAR(20) | No | Short code, e.g. `BAHIA-1`. | Unique |
| `name` | NVARCHAR(60) | No | Label. | — |
| `bay_status_id` | SMALLINT | No | Current state: `ACTIVE`, `MAINTENANCE` or `INACTIVE`. | FK → `booking.bay_status.bay_status_id` |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. Beyond counting capacity, a real bay row lets the database itself block two bookings from occupying the same bay at the same time — a plain counter could never do that.
2. **Status moved to the `bay_status` catalog (ADR-010).** `is_active` was dropped: availability and confirmation only consider bays whose status is `ACTIVE`; a bay under maintenance keeps its row and its history.

---

### Table: `booking_status`

**Purpose:** The six booking states.

```sql
CREATE TABLE [booking].booking_status (
    booking_status_id SMALLINT     IDENTITY(1,1) NOT NULL,
    code          NVARCHAR(30) NOT NULL,
    name          NVARCHAR(60) NOT NULL,
    is_final      BIT          NOT NULL CONSTRAINT df_bstatus_final DEFAULT 0,
    display_order SMALLINT     NOT NULL CONSTRAINT df_bstatus_order DEFAULT 0,
    is_active     BIT          NOT NULL CONSTRAINT df_bstatus_active DEFAULT 1,
    created_at    DATETIME2(3) NOT NULL CONSTRAINT df_bstatus_created DEFAULT SYSUTCDATETIME(),
    created_by    BIGINT       NULL,
    updated_at    DATETIME2(3) NULL,
    updated_by    BIGINT       NULL,
    deleted_at    DATETIME2(3) NULL,
    deleted_by    BIGINT       NULL,
    row_version   INT          NOT NULL CONSTRAINT df_bstatus_rv DEFAULT 1,
    CONSTRAINT pk_booking_status PRIMARY KEY (booking_status_id),
    CONSTRAINT uq_booking_status_code UNIQUE (code)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `booking_status_id` | SMALLINT | No | Surrogate primary key (IDENTITY). ⚠️ ID `5` is `CANCELLED` and is hard-coded as a literal inside `ck_booking_cancel` and `tr_booking_bay_overlap` — never re-seed this table with a different order. | PK |
| `code` | NVARCHAR(30) | No | `SCHEDULED`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW` (English codes, ADR-010; ids 1–6 fixed). | Unique |
| `name` | NVARCHAR(60) | No | Label. | — |
| `is_final` | BIT | No | Whether this status accepts further changes. | — |
| `display_order` | SMALLINT | No | Sort order. | — |
| `is_active` | BIT | No | Soft on/off switch. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

---

### Table: `cancellation_reason`

**Purpose:** Why a booking was cancelled.

```sql
CREATE TABLE [booking].cancellation_reason (
    cancellation_reason_id SMALLINT     IDENTITY(1,1) NOT NULL,
    code              NVARCHAR(30) NOT NULL,
    name              NVARCHAR(60) NOT NULL,
    is_customer_fault BIT          NOT NULL CONSTRAINT df_creason_fault DEFAULT 0,
    display_order     SMALLINT     NOT NULL CONSTRAINT df_creason_order DEFAULT 0,
    is_active         BIT          NOT NULL CONSTRAINT df_creason_active DEFAULT 1,
    created_at        DATETIME2(3) NOT NULL CONSTRAINT df_creason_created DEFAULT SYSUTCDATETIME(),
    created_by        BIGINT       NULL,
    updated_at        DATETIME2(3) NULL,
    updated_by        BIGINT       NULL,
    deleted_at        DATETIME2(3) NULL,
    deleted_by        BIGINT       NULL,
    row_version       INT          NOT NULL CONSTRAINT df_creason_rv DEFAULT 1,
    CONSTRAINT pk_cancellation_reason PRIMARY KEY (cancellation_reason_id),
    CONSTRAINT uq_cancellation_reason_code UNIQUE (code)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `cancellation_reason_id` | SMALLINT | No | Surrogate primary key (IDENTITY). | PK |
| `code` | NVARCHAR(30) | No | `CUSTOMER_REQUEST`, `SCHEDULE_CONFLICT`, `VEHICLE_ISSUE`, `SHOP_ISSUE`, `LATE_ARRIVAL` (customer fault), `OTHER` (seed `104`); `EXPIRED` (seed `112`), used only by the system when it closes a booking nobody confirmed, never offered to the admin. | Unique |
| `name` | NVARCHAR(60) | No | Label. | — |
| `is_customer_fault` | BIT | No | Distinguishes reasons attributable to the customer, used for reporting and penalty decisions. | — |
| `display_order` | SMALLINT | No | Sort order. | — |
| `is_active` | BIT | No | Soft on/off switch. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

---

### Table: `booking`

**Purpose:** The booking itself — the core of the system.

```sql
CREATE TABLE [booking].booking (
    booking_id             BIGINT        IDENTITY(1,1) NOT NULL,
    customer_vehicle_id    BIGINT        NOT NULL,   -- [customer].customer_vehicle
    service_bay_id         SMALLINT      NULL,
    scheduled_start        DATETIME2(3)  NOT NULL,
    scheduled_end          DATETIME2(3)  NOT NULL,
    booking_status_id      SMALLINT      NOT NULL,
    booked_by              BIGINT        NOT NULL,   -- [security].app_user
    cancellation_reason_id SMALLINT      NULL,
    points_redeemed        INT           NOT NULL CONSTRAINT df_booking_points DEFAULT 0,
    points_discount_amount DECIMAL(12,2) NOT NULL CONSTRAINT df_booking_pdisc DEFAULT 0,
    notes                  NVARCHAR(300) NULL,
    created_at             DATETIME2(3)  NOT NULL CONSTRAINT df_booking_created DEFAULT SYSUTCDATETIME(),
    created_by             BIGINT        NULL,
    updated_at             DATETIME2(3)  NULL,
    updated_by             BIGINT        NULL,
    deleted_at             DATETIME2(3)  NULL,
    deleted_by             BIGINT        NULL,
    row_version            INT           NOT NULL CONSTRAINT df_booking_rv DEFAULT 1,
    CONSTRAINT pk_booking PRIMARY KEY (booking_id),
    CONSTRAINT fk_booking_bay FOREIGN KEY (service_bay_id) REFERENCES [booking].service_bay(service_bay_id),
    CONSTRAINT fk_booking_status FOREIGN KEY (booking_status_id) REFERENCES [booking].booking_status(booking_status_id),
    CONSTRAINT fk_booking_cancellation FOREIGN KEY (cancellation_reason_id) REFERENCES [booking].cancellation_reason(cancellation_reason_id),
    CONSTRAINT ck_booking_range CHECK (scheduled_end > scheduled_start),
    CONSTRAINT ck_booking_cancel CHECK (cancellation_reason_id IS NULL OR booking_status_id = 5),
    CONSTRAINT ck_booking_points CHECK (
        (points_redeemed = 0 AND points_discount_amount = 0) OR
        (points_redeemed > 0 AND points_discount_amount > 0)
    )
);
```

**Indexes:**

| Name | Fields | Type | Justification |
|------|--------|------|----------------|
| `ix_booking_start_status` | `scheduled_start, booking_status_id` | Non-unique | Availability search: find open slots by date/time and status. |
| `ix_booking_customer_vehicle` | `customer_vehicle_id` | Non-unique | Cross-service lookup support for `booking.booking.customer_vehicle_id`. |
| `ix_booking_bay_start` | `service_bay_id, scheduled_start` | Non-unique | Overlap check used by `tr_booking_bay_overlap`. |
| `ix_booking_booked_by` | `booked_by` | Non-unique | Cross-service lookup support for `booking.booking.booked_by`. |

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `booking_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `customer_vehicle_id` | BIGINT | No | Which vehicle. | No FK — owned by `customer.customer_vehicle`, see the cross-service contract below. |
| `service_bay_id` | SMALLINT | Yes | NULL while still `SCHEDULED`; assigned on confirmation (today every booking is confirmed with a bay when created). | FK → `booking.service_bay.service_bay_id` |
| `scheduled_start` | DATETIME2(3) | No | Start of the slot, UTC. | — |
| `scheduled_end` | DATETIME2(3) | No | End of the slot, UTC. | — |
| `booking_status_id` | SMALLINT | No | Current status. | FK → `booking.booking_status.booking_status_id` |
| `booked_by` | BIGINT | No | Who created the booking. | No FK — owned by `security.app_user`, see the cross-service contract below. |
| `cancellation_reason_id` | SMALLINT | Yes | Only set when `booking_status_id = 5` (CANCELLED). | FK → `booking.cancellation_reason.cancellation_reason_id` |
| `points_redeemed` | INT | No | Loyalty points redeemed against this booking. | — |
| `points_discount_amount` | DECIMAL(12,2) | No | The peso amount those points are worth. Both this and `points_redeemed` must be zero, or both greater than zero. | — |
| `notes` | NVARCHAR(300) | Yes | Free-text note. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. No `total` column: the total is derived from `booking_service` + its prices, minus `booking_promotion` and `points_discount_amount`. Storing it would be a derived value that can silently drift from its inputs.
2. `points_redeemed` / `points_discount_amount` exist because, without them, redeeming points lowered the customer's balance but never actually reduced what they paid — the redemption never reached the bill.
3. `tr_booking_bay_overlap` blocks two active bookings from sharing a bay and a time window; a cancelled booking frees the bay.

---

### Table: `booking_service`

**Purpose:** The services included in a booking.

```sql
CREATE TABLE [booking].booking_service (
    booking_service_id BIGINT       IDENTITY(1,1) NOT NULL,
    booking_id         BIGINT       NOT NULL,
    service_price_id   BIGINT       NOT NULL,   -- same service since ADR-009: real FK
    quantity           SMALLINT     NOT NULL CONSTRAINT df_bsvc_qty DEFAULT 1,
    created_at         DATETIME2(3) NOT NULL CONSTRAINT df_bsvc_created DEFAULT SYSUTCDATETIME(),
    created_by         BIGINT       NULL,
    updated_at         DATETIME2(3) NULL,
    updated_by         BIGINT       NULL,
    deleted_at         DATETIME2(3) NULL,
    deleted_by         BIGINT       NULL,
    row_version        INT          NOT NULL CONSTRAINT df_bsvc_rv DEFAULT 1,
    CONSTRAINT pk_booking_service PRIMARY KEY (booking_service_id),
    CONSTRAINT uq_booking_service UNIQUE (booking_id, service_price_id),
    CONSTRAINT fk_booking_service_booking FOREIGN KEY (booking_id) REFERENCES [booking].booking(booking_id),
    CONSTRAINT ck_booking_service_qty CHECK (quantity > 0),
    CONSTRAINT fk_booking_service_price FOREIGN KEY (service_price_id) REFERENCES [catalog].service_price(service_price_id)
);
```

**Indexes:**

| Name | Fields | Type | Justification |
|------|--------|------|----------------|
| `ix_booking_service_price` | `service_price_id` | Non-unique | Supports the foreign key to `catalog.service_price` and price lookups. |

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `booking_service_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `booking_id` | BIGINT | No | Owning booking. | FK → `booking.booking.booking_id` |
| `service_price_id` | BIGINT | No | The exact tariff row in force when this was booked. | FK → `catalog.service_price.service_price_id` |
| `quantity` | SMALLINT | No | How many times this service was requested. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. Resolves the many-to-many between booking and service: a booking can include exterior wash and polish; a service appears in many bookings.
2. It never copies the price — it points at the exact `service_price` row in force at booking time. As long as `service_price` stays immutable, the tariff stays frozen without duplicating the number.
3. **The price reference is a real foreign key since ADR-009.** `catalog` and `booking` are owned by the same service (`booking-service`), so this is the one foreign key in the model that crosses two schemas. It is also the reason the two contexts were grouped: a booking does not exist without a current price to freeze.

---

## 06. execution

**Owning service:** `operations-service`

**DB Engine:** SQL Server 2016+

**Engine justification:**

- Scheduling-style integrity again (overlap prevention for operators), the same reasoning as `booking` — a natural fit for relational constraints and triggers.

### Table: `execution_status`

**Purpose:** Execution states, distinct from booking states.

```sql
CREATE TABLE [execution].execution_status (
    execution_status_id SMALLINT     IDENTITY(1,1) NOT NULL,
    code          NVARCHAR(30) NOT NULL,
    name          NVARCHAR(60) NOT NULL,
    is_final      BIT          NOT NULL CONSTRAINT df_estatus_final DEFAULT 0,
    display_order SMALLINT     NOT NULL CONSTRAINT df_estatus_order DEFAULT 0,
    is_active     BIT          NOT NULL CONSTRAINT df_estatus_active DEFAULT 1,
    created_at    DATETIME2(3) NOT NULL CONSTRAINT df_estatus_created DEFAULT SYSUTCDATETIME(),
    created_by    BIGINT       NULL,
    updated_at    DATETIME2(3) NULL,
    updated_by    BIGINT       NULL,
    deleted_at    DATETIME2(3) NULL,
    deleted_by    BIGINT       NULL,
    row_version   INT          NOT NULL CONSTRAINT df_estatus_rv DEFAULT 1,
    CONSTRAINT pk_execution_status PRIMARY KEY (execution_status_id),
    CONSTRAINT uq_execution_status_code UNIQUE (code)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `execution_status_id` | SMALLINT | No | Surrogate primary key (IDENTITY). | PK |
| `code` | NVARCHAR(30) | No | `PENDING`, `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `WITH_ISSUE` (seed 105, fixed ids 1–5; the code never sets `PAUSED` or `WITH_ISSUE` today). | Unique |
| `name` | NVARCHAR(60) | No | Label. | — |
| `is_final` | BIT | No | Whether this status accepts further changes. | — |
| `display_order` | SMALLINT | No | Sort order. | — |
| `is_active` | BIT | No | Soft on/off switch. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. Kept separate from `booking_status` because the two levels genuinely diverge: a booking can be `IN_PROGRESS` while one of its services is finished and another hasn't started.

---

### Table: `operator`

**Purpose:** The operator (wash staff member).

```sql
CREATE TABLE [execution].operator (
    operator_id INT          IDENTITY(1,1) NOT NULL,
    user_id     BIGINT       NOT NULL,   -- [security].app_user
    hired_on    DATE         NOT NULL,
    is_active   BIT          NOT NULL CONSTRAINT df_operator_active DEFAULT 1,
    created_at  DATETIME2(3) NOT NULL CONSTRAINT df_operator_created DEFAULT SYSUTCDATETIME(),
    created_by  BIGINT       NULL,
    updated_at  DATETIME2(3) NULL,
    updated_by  BIGINT       NULL,
    deleted_at  DATETIME2(3) NULL,
    deleted_by  BIGINT       NULL,
    row_version INT          NOT NULL CONSTRAINT df_operator_rv DEFAULT 1,
    CONSTRAINT pk_operator PRIMARY KEY (operator_id),
    CONSTRAINT uq_operator_user UNIQUE (user_id)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `operator_id` | INT | No | Surrogate primary key (IDENTITY). | PK |
| `user_id` | BIGINT | No | The account this operator logs in with. | Unique, No FK — owned by `security.app_user`, see the cross-service contract below. |
| `hired_on` | DATE | No | Start date. | — |
| `is_active` | BIT | No | Soft on/off switch. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. Hangs off `app_user`, not `person`: an admin creates the login when hiring someone, so an operator *always* has credentials. Personal details are reached through `app_user.person_id`.
2. Deliberately does not also store `person_id` — that would be a transitive dependency (`operator → app_user → person`) and a second path to the same data that could drift out of sync. Note the asymmetry with `customer`, which does store `person_id` directly, because a customer can exist without ever getting an account.

---

### Table: `operator_availability`

**Purpose:** Weekly working hours per operator.

```sql
CREATE TABLE [execution].operator_availability (
    operator_availability_id INT          IDENTITY(1,1) NOT NULL,
    operator_id INT          NOT NULL,
    day_of_week SMALLINT     NOT NULL,
    starts_at   TIME(0)      NOT NULL,
    ends_at     TIME(0)      NOT NULL,
    is_active   BIT          NOT NULL CONSTRAINT df_oavail_active DEFAULT 1,
    created_at  DATETIME2(3) NOT NULL CONSTRAINT df_oavail_created DEFAULT SYSUTCDATETIME(),
    created_by  BIGINT       NULL,
    updated_at  DATETIME2(3) NULL,
    updated_by  BIGINT       NULL,
    deleted_at  DATETIME2(3) NULL,
    deleted_by  BIGINT       NULL,
    row_version INT          NOT NULL CONSTRAINT df_oavail_rv DEFAULT 1,
    CONSTRAINT pk_operator_availability PRIMARY KEY (operator_availability_id),
    CONSTRAINT uq_operator_availability UNIQUE (operator_id, day_of_week),
    CONSTRAINT fk_operator_availability_operator FOREIGN KEY (operator_id) REFERENCES [execution].operator(operator_id),
    CONSTRAINT ck_oavail_day CHECK (day_of_week BETWEEN 1 AND 7),
    CONSTRAINT ck_oavail_range CHECK (ends_at > starts_at)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `operator_availability_id` | INT | No | Surrogate primary key (IDENTITY). | PK |
| `operator_id` | INT | No | The operator. | FK → `execution.operator.operator_id` |
| `day_of_week` | SMALLINT | No | 1–7. | — |
| `starts_at` | TIME(0) | No | Start of the shift. | — |
| `ends_at` | TIME(0) | No | End of the shift. | — |
| `is_active` | BIT | No | Soft on/off switch. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. `business_hour` says when the shop is open; it says nothing about who's actually on shift. Without this table there's no basis — automatic or manual — for assigning anyone.

---

### Table: `operator_absence`

**Purpose:** One-off absences that override the weekly availability.

```sql
CREATE TABLE [execution].operator_absence (
    operator_absence_id INT           IDENTITY(1,1) NOT NULL,
    operator_id INT           NOT NULL,
    starts_at   DATETIME2(3)  NOT NULL,
    ends_at     DATETIME2(3)  NOT NULL,
    reason      NVARCHAR(120) NOT NULL,
    created_at  DATETIME2(3)  NOT NULL CONSTRAINT df_oabs_created DEFAULT SYSUTCDATETIME(),
    created_by  BIGINT        NULL,
    updated_at  DATETIME2(3)  NULL,
    updated_by  BIGINT        NULL,
    deleted_at  DATETIME2(3)  NULL,
    deleted_by  BIGINT        NULL,
    row_version INT           NOT NULL CONSTRAINT df_oabs_rv DEFAULT 1,
    CONSTRAINT pk_operator_absence PRIMARY KEY (operator_absence_id),
    CONSTRAINT fk_operator_absence_operator FOREIGN KEY (operator_id) REFERENCES [execution].operator(operator_id),
    CONSTRAINT ck_oabs_range CHECK (ends_at > starts_at)
);
```

**Indexes:**

| Name | Fields | Type | Justification |
|------|--------|------|----------------|
| `ix_operator_absence_operator` | `operator_id, starts_at` | Non-unique | Overlap check used by `tr_operator_absence_overlap`. |

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `operator_absence_id` | INT | No | Surrogate primary key (IDENTITY). | PK |
| `operator_id` | INT | No | The operator. | FK → `execution.operator.operator_id` |
| `starts_at` | DATETIME2(3) | No | Start of the absence, UTC. | — |
| `ends_at` | DATETIME2(3) | No | End of the absence, UTC. | — |
| `reason` | NVARCHAR(120) | No | Sick leave, permit, vacation, etc. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. `tr_operator_absence_overlap` blocks two overlapping absences for the same operator from ever being registered.

---

### Table: `service_execution`

**Purpose:** The actual execution of one booking line item.

```sql
CREATE TABLE [execution].service_execution (
    service_execution_id BIGINT        IDENTITY(1,1) NOT NULL,
    booking_service_id   BIGINT        NOT NULL,   -- [booking].booking_service
    operator_id          INT           NOT NULL,
    execution_status_id  SMALLINT      NOT NULL,
    started_at           DATETIME2(3)  NULL,
    finished_at          DATETIME2(3)  NULL,
    quality_rating       SMALLINT      NULL,
    quality_comment      NVARCHAR(500) NULL,
    rated_at             DATETIME2(3)  NULL,
    is_comment_visible   BIT           NOT NULL CONSTRAINT df_sexec_visible DEFAULT 1,
    follow_up_notice_at  DATETIME2(3)  NULL,                          -- migración 040
    created_at           DATETIME2(3)  NOT NULL CONSTRAINT df_sexec_created DEFAULT SYSUTCDATETIME(),
    created_by           BIGINT        NULL,
    updated_at           DATETIME2(3)  NULL,
    updated_by           BIGINT        NULL,
    deleted_at           DATETIME2(3)  NULL,
    deleted_by           BIGINT        NULL,
    row_version          INT           NOT NULL CONSTRAINT df_sexec_rv DEFAULT 1,
    CONSTRAINT pk_service_execution PRIMARY KEY (service_execution_id),
    CONSTRAINT uq_service_execution_booking_service UNIQUE (booking_service_id),
    CONSTRAINT fk_service_execution_operator FOREIGN KEY (operator_id) REFERENCES [execution].operator(operator_id),
    CONSTRAINT fk_service_execution_status FOREIGN KEY (execution_status_id) REFERENCES [execution].execution_status(execution_status_id),
    CONSTRAINT ck_sexec_rating CHECK (quality_rating IS NULL OR quality_rating BETWEEN 1 AND 5),
    CONSTRAINT ck_sexec_range CHECK (finished_at IS NULL OR started_at IS NULL OR finished_at >= started_at),
    CONSTRAINT ck_sexec_comment CHECK (quality_comment IS NULL OR quality_rating IS NOT NULL),
    CONSTRAINT ck_sexec_rated CHECK (
        (quality_rating IS NULL AND rated_at IS NULL) OR
        (quality_rating IS NOT NULL AND rated_at IS NOT NULL)
    )
);
```

**Indexes:**

| Name | Fields | Type | Justification |
|------|--------|------|----------------|
| `ix_service_execution_operator` | `operator_id, started_at` | Non-unique | Lookups of an operator's executions (busy check, metrics). |

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `service_execution_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `booking_service_id` | BIGINT | No | The line item being executed. | Unique, No FK — owned by `booking.booking_service`, see the cross-service contract below. |
| `operator_id` | INT | No | Who is doing it. | FK → `execution.operator.operator_id` |
| `execution_status_id` | SMALLINT | No | Current status. | FK → `execution.execution_status.execution_status_id` |
| `started_at` | DATETIME2(3) | Yes | When work began, UTC. | — |
| `finished_at` | DATETIME2(3) | Yes | When work ended, UTC. | — |
| `quality_rating` | SMALLINT | Yes | 1–5, set by the customer. | — |
| `quality_comment` | NVARCHAR(500) | Yes | Written feedback. | `ck_sexec_comment` |
| `rated_at` | DATETIME2(3) | Yes | When the rating was given; must be set together with `quality_rating`, never one without the other. | — |
| `is_comment_visible` | BIT | No | Lets an admin hide an inappropriate comment without deleting it. | — |
| `follow_up_notice_at` | DATETIME2(3) | Yes | When the operator and the admins were told the service ended and nobody registered it (so it is told once). Starting the service clears it. A line closed by the admin as attended is `COMPLETED` with `started_at` / `finished_at` empty. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. Tracked per line item, not per booking: if a booking includes wash and polish, each can have its own operator, its own timing, and its own rating. Attaching this to the whole booking would lose that detail.
2. An operator cannot run two services at once. There is no trigger for it (`tr_service_execution_overlap` was planned but never created): `AssignmentPolicy` rejects a busy operator (`OPERATOR_BUSY`) and `OperationsService.start` refuses to start a service while the operator has another one in progress.
3. **Rating is stored here, not in a `rating` table.** `02-domain` models `Rating` as an aggregate; physically it is these three columns, because a rating cannot exist without the service line it rates, and rating per line is what RF-023 needs for the average rating per operator. Rating is optional: an unrated line keeps all three columns NULL, and `ck_sexec_rated` / `ck_sexec_comment` keep them consistent (no date without a score, no comment without a score). Reports average with `AVG(quality_rating * 1.0)`: `AVG` ignores NULLs, and the `* 1.0` avoids SQL Server's integer truncation of the average. Never `COALESCE(quality_rating, 0)`.

---

### Tables: `inspection_report`, `inspection_phase`, `inspection_finding`, `inspection_photo`

**Purpose:** The vehicle inspection report of long services (ADR-014 §9, migration 033): one report per
booking, its 5 phases, the findings of each phase and their photos. The client reads it through a
public link with a random token.

```sql
CREATE TABLE [execution].inspection_report (
    inspection_report_id BIGINT        IDENTITY(1,1) NOT NULL,
    booking_id           BIGINT        NOT NULL,   -- booking.booking, no FK
    booking_code         NVARCHAR(20)  NULL,
    vehicle              NVARCHAR(120) NULL,
    plate                NVARCHAR(15)  NULL,
    services             NVARCHAR(300) NULL,
    booking_date         DATE          NOT NULL,
    booking_time         TIME(0)       NOT NULL,
    duration_minutes     INT           NOT NULL,
    public_token         NVARCHAR(64)  NOT NULL,
    is_published         BIT           NOT NULL DEFAULT 0,
    published_at         DATETIME2(3)  NULL,
    created_at / created_by / updated_at / updated_by / row_version,
    CONSTRAINT uq_inspection_report_booking UNIQUE (booking_id),
    CONSTRAINT uq_inspection_report_token UNIQUE (public_token)
);
CREATE TABLE [execution].inspection_phase (      -- unique (inspection_report_id, phase)
    inspection_phase_id, inspection_report_id, phase, [status], started_at, finished_at
);
CREATE TABLE [execution].inspection_finding (    -- soft delete (deleted_at)
    inspection_finding_id, inspection_report_id, phase, area NVARCHAR(120), severity NVARCHAR(10),
    note NVARCHAR(500), created_at, created_by, deleted_at, deleted_by
);
CREATE TABLE [execution].inspection_photo (
    inspection_photo_id, inspection_finding_id, content_type NVARCHAR(30), content VARBINARY(MAX),
    size_bytes INT, created_at, created_by
);
```

**Data dictionary (main columns):**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `inspection_report.booking_id` | BIGINT | No | The booking. | Unique; no FK — owned by `booking.booking` |
| `inspection_report.booking_code` … `duration_minutes` | — | — | Copy of the booking taken when the report starts, so the public link never asks booking-service. | — |
| `inspection_report.public_token` | NVARCHAR(64) | No | Random 32-byte token (base64url) of the public link; never the booking id or code. | Unique |
| `inspection_report.is_published` / `published_at` | BIT / DATETIME2(3) | No / Yes | The public link answers only when published. | Set together (`ck_inspreport_published`) |
| `inspection_phase.phase` / `status` | NVARCHAR(20) | No | `RECEPTION`, `EXTERIOR`, `INTERIOR`, `ENGINE`, `DELIVERY` / `PENDING`, `IN_PROGRESS`, `DONE`. | CHECK |
| `inspection_finding.severity` | NVARCHAR(10) | No | `INFO`, `MINOR`, `MAJOR`. | CHECK |
| `inspection_photo.content_type` / `size_bytes` | NVARCHAR(30) / INT | No | `image/jpeg` or `image/png`, up to 2 MB. | CHECK |

**Modeling decisions:**

1. The report is an aggregate: phases and findings change only through `InspectionReport`, which owns the rules (long bookings only, editable while the vehicle is at the shop, the summary).
2. Photos in the database (`VARBINARY(MAX)`) instead of a file store: one service, one backup, and the screens already compress them (~200 KB). They are read apart from the findings so listing a report never loads the binaries.
3. `booking_id` is a cross-service reference without FK (ADR-004), like `service_execution.booking_service_id`.

---

### Tables: `operator_profile`, `operator_skill`

**Purpose:** The operator's specialty and skills shown in the operator's card (ADR-010, migration 037). The screens showed them empty because they were not stored.

```sql
CREATE TABLE [execution].operator_profile (
    operator_id INT          NOT NULL,
    specialty   NVARCHAR(80) NULL,
    updated_at  DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by  BIGINT       NULL,
    CONSTRAINT pk_operator_profile PRIMARY KEY (operator_id),
    CONSTRAINT fk_operator_profile_operator FOREIGN KEY (operator_id) REFERENCES [execution].operator(operator_id)
);
CREATE TABLE [execution].operator_skill (
    operator_skill_id INT          IDENTITY(1,1) NOT NULL,
    operator_id       INT          NOT NULL,
    name              NVARCHAR(60) NOT NULL,
    skill_level       NVARCHAR(12) NOT NULL,
    display_order     SMALLINT     NOT NULL,
    CONSTRAINT pk_operator_skill PRIMARY KEY (operator_skill_id),
    CONSTRAINT fk_operator_skill_operator FOREIGN KEY (operator_id) REFERENCES [execution].operator(operator_id),
    CONSTRAINT uq_operator_skill_name UNIQUE (operator_id, name),
    CONSTRAINT ck_operator_skill_level CHECK (skill_level IN ('CERTIFIED', 'EXPERT', 'ADVANCED'))
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `operator_profile.operator_id` | INT | No | The operator. | PK, FK → `execution.operator` |
| `operator_profile.specialty` | NVARCHAR(80) | Yes | Specialty, e.g. "Detailing". | — |
| `operator_profile.updated_by` | BIGINT | Yes | Administrator who saved it. | No FK — `security.app_user` |
| `operator_skill.name` | NVARCHAR(60) | No | Skill name. | Unique per operator |
| `operator_skill.skill_level` | NVARCHAR(12) | No | `CERTIFIED`, `EXPERT` or `ADVANCED`. | CHECK |
| `operator_skill.display_order` | SMALLINT | No | Order in the card. | — |

**Modeling decisions:**

1. ADR-010 proposed a `specialty` column in `execution.operator`; it went to its own table so the operator row (created on the fly for every `OPERATOR` account) does not change, and the skills need a child table anyway.
2. Saving replaces the whole list: the old skills are deleted before inserting the new ones, which keeps `uq_operator_skill_name` simple. At most 10 skills, checked by `OperatorProfile` in the domain.

---

## 07. promotion

**Owning service:** `payment-service` (together with `payment`)

**DB Engine:** SQL Server 2016+

**Engine justification:**

- Relational eligibility logic (public/private, thresholds, per-customer assignment) maps directly onto foreign keys and simple joins.

### Table: `discount_type`

**Purpose:** Percentage or fixed amount.

```sql
CREATE TABLE [promotion].discount_type (
    discount_type_id SMALLINT     IDENTITY(1,1) NOT NULL,
    code          NVARCHAR(30) NOT NULL,
    name          NVARCHAR(60) NOT NULL,
    display_order SMALLINT     NOT NULL CONSTRAINT df_dtype_order DEFAULT 0,
    is_active     BIT          NOT NULL CONSTRAINT df_dtype_active DEFAULT 1,
    created_at    DATETIME2(3) NOT NULL CONSTRAINT df_dtype_created DEFAULT SYSUTCDATETIME(),
    created_by    BIGINT       NULL,
    updated_at    DATETIME2(3) NULL,
    updated_by    BIGINT       NULL,
    deleted_at    DATETIME2(3) NULL,
    deleted_by    BIGINT       NULL,
    row_version   INT          NOT NULL CONSTRAINT df_dtype_rv DEFAULT 1,
    CONSTRAINT pk_discount_type PRIMARY KEY (discount_type_id),
    CONSTRAINT uq_discount_type_code UNIQUE (code)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `discount_type_id` | SMALLINT | No | Surrogate primary key (IDENTITY). | PK |
| `code` | NVARCHAR(30) | No | `PERCENT` or `FIXED`. | Unique |
| `name` | NVARCHAR(60) | No | Label. | — |
| `display_order` | SMALLINT | No | Sort order. | — |
| `is_active` | BIT | No | Soft on/off switch. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

---

### Table: `promotion`

**Purpose:** A promotion: code, discount, eligibility, and usage limits.

```sql
CREATE TABLE [promotion].promotion (
    promotion_id                 INT            IDENTITY(1,1) NOT NULL,
    code                         NVARCHAR(30)   NOT NULL,
    name                         NVARCHAR(100)  NOT NULL,
    [description]                NVARCHAR(300)  NULL,
    discount_type_id             SMALLINT       NOT NULL,
    discount_value               DECIMAL(12,2)  NOT NULL,
    max_discount_amount          DECIMAL(12,2)  NULL,
    min_purchase_amount          DECIMAL(12,2)  NOT NULL CONSTRAINT df_promo_minpurchase DEFAULT 0,
    is_public                    BIT            NOT NULL CONSTRAINT df_promo_public DEFAULT 1,
    min_completed_booking        INT            NOT NULL CONSTRAINT df_promo_minbooking DEFAULT 0,
    valid_from                   DATE           NOT NULL,
    valid_to                     DATE           NOT NULL,
    max_redemptions              INT            NULL,
    max_redemptions_per_customer INT            NULL,
    is_active                    BIT            NOT NULL CONSTRAINT df_promo_active DEFAULT 1,
    -- package display (ADR-010 amended, ADR-015 — changeset 017): marketing copy for the card,
    -- no effect on the discount actually applied
    price                         DECIMAL(12,2)  NULL,
    duration_minutes              INT            NULL,
    icon                          NVARCHAR(40)   NULL,
    featured                      BIT            NOT NULL CONSTRAINT df_promo_featured DEFAULT 0,
    benefits                      NVARCHAR(600)  NULL,
    -- loyalty gate (ADR-015 — changeset 018, payment-service numbering)
    required_points               INT            NOT NULL CONSTRAINT df_promo_required_points DEFAULT 0,
    created_at                   DATETIME2(3)   NOT NULL CONSTRAINT df_promo_created DEFAULT SYSUTCDATETIME(),
    created_by                   BIGINT         NULL,
    updated_at                   DATETIME2(3)   NULL,
    updated_by                   BIGINT         NULL,
    deleted_at                   DATETIME2(3)   NULL,
    deleted_by                   BIGINT         NULL,
    row_version                  INT            NOT NULL CONSTRAINT df_promo_rv DEFAULT 1,
    CONSTRAINT pk_promotion PRIMARY KEY (promotion_id),
    CONSTRAINT uq_promotion_code UNIQUE (code),
    CONSTRAINT fk_promotion_discount_type FOREIGN KEY (discount_type_id) REFERENCES [promotion].discount_type(discount_type_id),
    CONSTRAINT ck_promo_value CHECK (discount_value > 0),
    CONSTRAINT ck_promo_range CHECK (valid_to >= valid_from),
    CONSTRAINT ck_promo_minbooking CHECK (min_completed_booking >= 0),
    -- added (not in 06-data)
    CONSTRAINT ck_promo_max_discount CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
    -- added (not in 06-data)
    CONSTRAINT ck_promo_max_redemptions CHECK (max_redemptions IS NULL OR max_redemptions > 0),
    -- added (not in 06-data)
    CONSTRAINT ck_promo_max_per_customer CHECK (max_redemptions_per_customer IS NULL OR max_redemptions_per_customer > 0),
    -- added (not in 06-data)
    CONSTRAINT ck_promo_per_customer_le_total CHECK (max_redemptions IS NULL OR max_redemptions_per_customer IS NULL OR max_redemptions_per_customer <= max_redemptions),
    CONSTRAINT ck_promo_required_points CHECK (required_points >= 0)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `promotion_id` | INT | No | Surrogate primary key (IDENTITY). | PK |
| `code` | NVARCHAR(30) | No | Machine-readable code. | Unique |
| `name` | NVARCHAR(100) | No | Label. | — |
| `description` | NVARCHAR(300) | Yes | Longer description. | — |
| `discount_type_id` | SMALLINT | No | Percentage or fixed (`PERCENT`/`FIXED`, seed `015`). The real discount applied at redemption, independent of `price` below. | FK → `promotion.discount_type.discount_type_id` |
| `discount_value` | DECIMAL(12,2) | No | The discount amount, or the percentage (1–100; 100 = free) when `discount_type_id` is `PERCENT`. | `> 0` |
| `max_discount_amount` | DECIMAL(12,2) | Yes | Cap on a percentage discount, optional. | — |
| `min_purchase_amount` | DECIMAL(12,2) | No | Minimum spend to qualify. | — |
| `is_public` | BIT | No | `1` = open to eligible customers automatically; `0` = only customers listed in `promotion_customer`. | — |
| `min_completed_booking` | INT | No | With `is_public = 1`, how many finished bookings a customer needs before this unlocks — `0` means everyone qualifies. | — |
| `valid_from` | DATE | No | Start of the validity window. | — |
| `valid_to` | DATE | No | End of the validity window. | — |
| `max_redemptions` | INT | Yes | Overall usage cap, optional. | — |
| `max_redemptions_per_customer` | INT | Yes | Per-customer usage cap, optional. | — |
| `is_active` | BIT | No | Soft on/off switch. | — |
| `price` | DECIMAL(12,2) | Yes | Marketing price shown on the package card. Display only — never used to compute what the customer is charged. | — |
| `duration_minutes` | INT | Yes | Marketing duration shown on the card. | — |
| `icon` | NVARCHAR(40) | Yes | Icon name for the card (rendered as an actual icon in the picker, not shown as text — ADR-015). | — |
| `featured` | BIT | No | Shows the "Destacada" badge. | — |
| `benefits` | NVARCHAR(600) | Yes | One line per benefit (`\n`-joined); display text only, no rules of its own. | — |
| `required_points` | INT | No | Loyalty-point threshold (`payment.loyalty_transaction.balance_after`) the customer must have accumulated before this coupon is redeemable. `0` = no point gate (ADR-015). | `>= 0` |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. Eligibility is resolved by combining `is_public` and `min_completed_booking`: public + 0 reaches everyone; public + N unlocks only for customers who've already finished N bookings; private (`is_public = 0`) reaches only the customers explicitly listed in `promotion_customer`. This is how the same mechanism covers both "everyone gets 10% off this month" and "loyal customers get a better deal". **Status (2026-10-20):** the code reads neither column nor `promotion_customer`; every active promotion in its dates is offered to every customer and only `required_points` decides whether it is unlocked.
2. No usage counter here — it's derived by counting `booking_promotion` rows, to avoid a second number that can drift from the source of truth.
3. Four checks were added with ADR-009 so that a limit, when present, is meaningful: `max_discount_amount`, `max_redemptions` and `max_redemptions_per_customer` must be positive, and the per-customer limit can't exceed the total limit.
4. **`price`/`duration_minutes`/`icon`/`featured`/`benefits` (ADR-010 amended, ADR-015) are purely cosmetic**, added so the admin screen can show a promotion as a package-style card. They coexist with `discount_type_id`/`discount_value`, which are the columns that actually get applied — nothing in the schema keeps the two in sync (a promotion's displayed price and its real percentage discount can say different things), which ADR-015 accepts as a known trade-off.
5. **`required_points` (ADR-015) gates redemption, it does not spend points.** A customer's loyalty points are never debited for redeeming a promotion; accumulating them past this threshold is what makes the coupon redeemable at all.

---

### Table: `promotion_service`

**Purpose:** Restricts a promotion to specific services.

```sql
CREATE TABLE [promotion].promotion_service (
    promotion_service_id INT          IDENTITY(1,1) NOT NULL,
    promotion_id INT          NOT NULL,
    service_id   INT          NOT NULL,   -- [catalog].service
    created_at   DATETIME2(3) NOT NULL CONSTRAINT df_psvc_created DEFAULT SYSUTCDATETIME(),
    created_by   BIGINT       NULL,
    updated_at   DATETIME2(3) NULL,
    updated_by   BIGINT       NULL,
    deleted_at   DATETIME2(3) NULL,
    deleted_by   BIGINT       NULL,
    row_version  INT          NOT NULL CONSTRAINT df_psvc_rv DEFAULT 1,
    CONSTRAINT pk_promotion_service PRIMARY KEY (promotion_service_id),
    CONSTRAINT uq_promotion_service UNIQUE (promotion_id, service_id),
    CONSTRAINT fk_promotion_service_promotion FOREIGN KEY (promotion_id) REFERENCES [promotion].promotion(promotion_id)
);
```

**Indexes:**

| Name | Fields | Type | Justification |
|------|--------|------|----------------|
| `ix_promotion_service_service` | `service_id` | Non-unique | Cross-service lookup support for `promotion.promotion_service.service_id` (added with ADR-009). |

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `promotion_service_id` | INT | No | Surrogate primary key (IDENTITY). | PK |
| `promotion_id` | INT | No | The promotion. | FK → `promotion.promotion.promotion_id` |
| `service_id` | INT | No | A service it applies to. | No FK — owned by `catalog.service`, see the cross-service contract below. |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. Absence of rows is the convention for "applies to every service" — no restriction row means no restriction.

---

### Table: `promotion_customer`

**Purpose:** Assigns a promotion directly to one customer.

```sql
CREATE TABLE [promotion].promotion_customer (
    promotion_customer_id BIGINT       IDENTITY(1,1) NOT NULL,
    promotion_id INT          NOT NULL,
    customer_id  BIGINT       NOT NULL,   -- [customer].customer
    assigned_at  DATETIME2(3) NOT NULL CONSTRAINT df_pcust_assigned DEFAULT SYSUTCDATETIME(),
    assigned_by  BIGINT       NULL,       -- [security].app_user
    created_at   DATETIME2(3) NOT NULL CONSTRAINT df_pcust_created DEFAULT SYSUTCDATETIME(),
    created_by   BIGINT       NULL,
    updated_at   DATETIME2(3) NULL,
    updated_by   BIGINT       NULL,
    deleted_at   DATETIME2(3) NULL,
    deleted_by   BIGINT       NULL,
    row_version  INT          NOT NULL CONSTRAINT df_pcust_rv DEFAULT 1,
    CONSTRAINT pk_promotion_customer PRIMARY KEY (promotion_customer_id),
    CONSTRAINT uq_promotion_customer UNIQUE (promotion_id, customer_id),
    CONSTRAINT fk_promotion_customer_promotion FOREIGN KEY (promotion_id) REFERENCES [promotion].promotion(promotion_id)
);
```

**Indexes:**

| Name | Fields | Type | Justification |
|------|--------|------|----------------|
| `ix_promotion_customer_customer` | `customer_id` | Non-unique | List the promotions assigned to one customer. |
| `ix_promotion_customer_assigned_by` | `assigned_by` | Non-unique | Cross-service lookup support for `promotion.promotion_customer.assigned_by` (added with ADR-009). |

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `promotion_customer_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `promotion_id` | INT | No | The promotion. | FK → `promotion.promotion.promotion_id` |
| `customer_id` | BIGINT | No | The customer it's assigned to. | No FK — owned by `customer.customer`, see the cross-service contract below. |
| `assigned_at` | DATETIME2(3) | No | When it was assigned, UTC. | — |
| `assigned_by` | BIGINT | Yes | Who assigned it. | No FK — owned by `security.app_user`, see the cross-service contract below. |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. The mechanism behind personalized promotions for frequent customers, used together with `is_public = 0` on `promotion`.

---

### Table: `booking_promotion`

**Purpose:** Which promotion was applied to which booking, and exactly how much it discounted.

```sql
CREATE TABLE [promotion].booking_promotion (
    booking_promotion_id BIGINT        IDENTITY(1,1) NOT NULL,
    booking_id     BIGINT        NOT NULL,   -- [booking].booking
    promotion_id   INT           NOT NULL,
    applied_amount DECIMAL(12,2) NOT NULL,
    created_at     DATETIME2(3)  NOT NULL CONSTRAINT df_bpromo_created DEFAULT SYSUTCDATETIME(),
    created_by     BIGINT        NULL,
    updated_at     DATETIME2(3)  NULL,
    updated_by     BIGINT        NULL,
    deleted_at     DATETIME2(3)  NULL,
    deleted_by     BIGINT        NULL,
    row_version    INT           NOT NULL CONSTRAINT df_bpromo_rv DEFAULT 1,
    CONSTRAINT pk_booking_promotion PRIMARY KEY (booking_promotion_id),
    CONSTRAINT uq_booking_promotion UNIQUE (booking_id, promotion_id),
    CONSTRAINT fk_booking_promotion_promotion FOREIGN KEY (promotion_id) REFERENCES [promotion].promotion(promotion_id),
    CONSTRAINT ck_bpromo_amount CHECK (applied_amount > 0)
);
```

**Indexes:**

| Name | Fields | Type | Justification |
|------|--------|------|----------------|
| `ix_booking_promotion_booking` | `booking_id` | Non-unique | Find the promotions applied to one booking. |

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `booking_promotion_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `booking_id` | BIGINT | No | The booking. | No FK — owned by `booking.booking`, see the cross-service contract below. |
| `promotion_id` | INT | No | The promotion applied. | FK → `promotion.promotion.promotion_id` |
| `applied_amount` | DECIMAL(12,2) | No | The actual peso amount discounted, frozen at application time. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. `applied_amount` is stored because a promotion can change or expire later — what a booking was actually discounted that day is a historical fact, not something that should be recomputed if the promotion's terms change tomorrow.

---

## 08. payment

**Owning service:** `payment-service` (together with `promotion`)

**DB Engine:** SQL Server 2016+

**Engine justification:**

- Relational fits the payment/receipt state machine and its filtered-index and anti-fraud guarantees; nothing here needs document flexibility.
- It also holds the loyalty ledger since ADR-009 (append-only, needs to sum reliably): points are money-equivalent and follow the same ledger discipline.

### Table: `payment_method_type`

**Purpose:** Cash, Nequi, Daviplata, bank transfer.

```sql
CREATE TABLE [payment].payment_method_type (
    payment_method_type_id SMALLINT     IDENTITY(1,1) NOT NULL,
    code             NVARCHAR(30) NOT NULL,
    name             NVARCHAR(60) NOT NULL,
    requires_account BIT          NOT NULL CONSTRAINT df_pmt_account DEFAULT 1,
    requires_receipt BIT          NOT NULL CONSTRAINT df_pmt_receipt DEFAULT 1,
    display_order    SMALLINT     NOT NULL CONSTRAINT df_pmt_order DEFAULT 0,
    is_active        BIT          NOT NULL CONSTRAINT df_pmt_active DEFAULT 1,
    created_at       DATETIME2(3) NOT NULL CONSTRAINT df_pmt_created DEFAULT SYSUTCDATETIME(),
    created_by       BIGINT       NULL,
    updated_at       DATETIME2(3) NULL,
    updated_by       BIGINT       NULL,
    deleted_at       DATETIME2(3) NULL,
    deleted_by       BIGINT       NULL,
    row_version      INT          NOT NULL CONSTRAINT df_pmt_rv DEFAULT 1,
    CONSTRAINT pk_payment_method_type PRIMARY KEY (payment_method_type_id),
    CONSTRAINT uq_payment_method_type_code UNIQUE (code)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `payment_method_type_id` | SMALLINT | No | Surrogate primary key (IDENTITY). | PK |
| `code` | NVARCHAR(30) | No | `EFECTIVO`, `NEQUI`, `DAVIPLATA`, `TRANSFERENCIA`. | Unique |
| `name` | NVARCHAR(60) | No | Label. | — |
| `requires_account` | BIT | No | Whether a `payment_account` must exist for this method. | — |
| `requires_receipt` | BIT | No | `0` only for cash; every QR-based method requires an uploaded receipt. | — |
| `display_order` | SMALLINT | No | Sort order. | — |
| `is_active` | BIT | No | Soft on/off switch. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

---

### Table: `payment_account`

**Purpose:** One row per payment method — this is where the shop's QR image lives.

```sql
CREATE TABLE [payment].payment_account (
    payment_account_id     SMALLINT      IDENTITY(1,1) NOT NULL,
    payment_method_type_id SMALLINT      NOT NULL,
    account_holder         NVARCHAR(120) NOT NULL,
    account_number         NVARCHAR(50)  NULL,
    qr_image_url           NVARCHAR(500) NULL,
    instructions           NVARCHAR(300) NULL,
    is_active              BIT           NOT NULL CONSTRAINT df_pacct_active DEFAULT 1,
    created_at             DATETIME2(3)  NOT NULL CONSTRAINT df_pacct_created DEFAULT SYSUTCDATETIME(),
    created_by             BIGINT        NULL,
    updated_at             DATETIME2(3)  NULL,
    updated_by             BIGINT        NULL,
    deleted_at             DATETIME2(3)  NULL,
    deleted_by             BIGINT        NULL,
    row_version            INT           NOT NULL CONSTRAINT df_pacct_rv DEFAULT 1,
    CONSTRAINT pk_payment_account PRIMARY KEY (payment_account_id),
    CONSTRAINT fk_payment_account_method FOREIGN KEY (payment_method_type_id) REFERENCES [payment].payment_method_type(payment_method_type_id)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `payment_account_id` | SMALLINT | No | Surrogate primary key (IDENTITY). | PK |
| `payment_method_type_id` | SMALLINT | No | Which method this account is for. | FK → `payment.payment_method_type.payment_method_type_id` |
| `account_holder` | NVARCHAR(120) | No | Name on the account. | — |
| `account_number` | NVARCHAR(50) | Yes | Account number, optional. | — |
| `qr_image_url` | NVARCHAR(500) | Yes | The QR code shown to the customer. | — |
| `instructions` | NVARCHAR(300) | Yes | Text shown alongside the QR. | — |
| `is_active` | BIT | No | Soft on/off switch. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. Cash also gets a row here, with no QR, purely so `payment` can always point to *some* account and never needs a special case for the cash path.

---

### Table: `payment_status`

**Purpose:** The five payment states.

```sql
CREATE TABLE [payment].payment_status (
    payment_status_id SMALLINT     IDENTITY(1,1) NOT NULL,
    code          NVARCHAR(30) NOT NULL,
    name          NVARCHAR(60) NOT NULL,
    is_final      BIT          NOT NULL CONSTRAINT df_pstatus_final DEFAULT 0,
    display_order SMALLINT     NOT NULL CONSTRAINT df_pstatus_order DEFAULT 0,
    is_active     BIT          NOT NULL CONSTRAINT df_pstatus_active DEFAULT 1,
    created_at    DATETIME2(3) NOT NULL CONSTRAINT df_pstatus_created DEFAULT SYSUTCDATETIME(),
    created_by    BIGINT       NULL,
    updated_at    DATETIME2(3) NULL,
    updated_by    BIGINT       NULL,
    deleted_at    DATETIME2(3) NULL,
    deleted_by    BIGINT       NULL,
    row_version   INT          NOT NULL CONSTRAINT df_pstatus_rv DEFAULT 1,
    CONSTRAINT pk_payment_status PRIMARY KEY (payment_status_id),
    CONSTRAINT uq_payment_status_code UNIQUE (code)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `payment_status_id` | SMALLINT | No | Surrogate primary key (IDENTITY). ⚠️ ID `3` is `APPROVED` and is hard-coded as a literal inside the `ux_payment_one_approved_per_booking` filtered index — never re-seed this table with a different order. | PK |
| `code` | NVARCHAR(30) | No | `PENDING`, `IN_REVIEW`, `APPROVED`, `REJECTED`, `REFUNDED`. | Unique |
| `name` | NVARCHAR(60) | No | Label. | — |
| `is_final` | BIT | No | Whether this status accepts further changes. | — |
| `display_order` | SMALLINT | No | Sort order. | — |
| `is_active` | BIT | No | Soft on/off switch. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

---

### Table: `payment`

**Purpose:** One payment attempt for a booking.

```sql
CREATE TABLE [payment].payment (
    payment_id         BIGINT        IDENTITY(1,1) NOT NULL,
    booking_id         BIGINT        NOT NULL,   -- [booking].booking
    payment_account_id SMALLINT      NOT NULL,
    payment_status_id  SMALLINT      NOT NULL,
    amount             DECIMAL(12,2) NOT NULL,
    processed_at       DATETIME2(3)  NULL,
    approved_by        BIGINT        NULL,       -- [security].app_user
    rejection_reason   NVARCHAR(200) NULL,
    created_at         DATETIME2(3)  NOT NULL CONSTRAINT df_payment_created DEFAULT SYSUTCDATETIME(),
    created_by         BIGINT        NULL,
    updated_at         DATETIME2(3)  NULL,
    updated_by         BIGINT        NULL,
    deleted_at         DATETIME2(3)  NULL,
    deleted_by         BIGINT        NULL,
    row_version        INT           NOT NULL CONSTRAINT df_payment_rv DEFAULT 1,
    CONSTRAINT pk_payment PRIMARY KEY (payment_id),
    CONSTRAINT fk_payment_account FOREIGN KEY (payment_account_id) REFERENCES [payment].payment_account(payment_account_id),
    CONSTRAINT fk_payment_status FOREIGN KEY (payment_status_id) REFERENCES [payment].payment_status(payment_status_id),
    CONSTRAINT ck_payment_amount CHECK (amount > 0)
);
```

**Indexes:**

| Name | Fields | Type | Justification |
|------|--------|------|----------------|
| `ix_payment_booking` | `booking_id` | Non-unique | Find all payment attempts for a booking. |
| `ix_payment_status` | `payment_status_id` | Non-unique | Filter/queue payments by status (e.g. the admin review queue). |
| `ux_payment_one_approved_per_booking` | `booking_id` `WHERE payment_status_id = 3 AND deleted_at IS NULL` | Unique, filtered | At most one APPROVED payment per booking — filtered so rejected attempts don't block it. |
| `ix_payment_approved_by` | `approved_by` | Non-unique | Cross-service lookup support for `payment.payment.approved_by` (added with ADR-009). |

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `payment_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `booking_id` | BIGINT | No | The booking being paid for. | No FK — owned by `booking.booking`, see the cross-service contract below. |
| `payment_account_id` | SMALLINT | No | Which account/method the customer paid to. | FK → `payment.payment_account.payment_account_id` |
| `payment_status_id` | SMALLINT | No | Current status. | FK → `payment.payment_status.payment_status_id` |
| `amount` | DECIMAL(12,2) | No | The amount expected. | — |
| `processed_at` | DATETIME2(3) | Yes | When it was reviewed, UTC. | — |
| `approved_by` | BIGINT | Yes | Who approved it. | No FK — owned by `security.app_user`, see the cross-service contract below. |
| `rejection_reason` | NVARCHAR(200) | Yes | Why it was rejected, when it was. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. A booking can have several payment rows — a rejected attempt followed by an approved one are two separate rows, not one row overwritten. A filtered unique index guarantees at most one `APPROVED` row per booking.
2. No `payment_method_type_id` here: the method is reached through `payment_account`. Storing both would be a transitive dependency that could let a payment claim "Nequi" while pointing at the Daviplata account.

---

### Table: `payment_receipt`

**Purpose:** The proof of payment the customer uploads.

```sql
CREATE TABLE [payment].payment_receipt (
    payment_receipt_id    BIGINT        IDENTITY(1,1) NOT NULL,
    payment_id            BIGINT        NOT NULL,
    file_url              NVARCHAR(500) NOT NULL,
    transaction_reference NVARCHAR(100) NULL,
    reported_amount       DECIMAL(12,2) NULL,
    uploaded_at           DATETIME2(3)  NOT NULL CONSTRAINT df_preceipt_uploaded DEFAULT SYSUTCDATETIME(),
    uploaded_by           BIGINT        NOT NULL,   -- [security].app_user
    reviewed_at           DATETIME2(3)  NULL,
    reviewed_by           BIGINT        NULL,       -- [security].app_user
    review_comment        NVARCHAR(300) NULL,
    created_at            DATETIME2(3)  NOT NULL CONSTRAINT df_preceipt_created DEFAULT SYSUTCDATETIME(),
    created_by            BIGINT        NULL,
    updated_at            DATETIME2(3)  NULL,
    updated_by            BIGINT        NULL,
    deleted_at            DATETIME2(3)  NULL,
    deleted_by            BIGINT        NULL,
    row_version           INT           NOT NULL CONSTRAINT df_preceipt_rv DEFAULT 1,
    CONSTRAINT pk_payment_receipt PRIMARY KEY (payment_receipt_id),
    CONSTRAINT fk_payment_receipt_payment FOREIGN KEY (payment_id) REFERENCES [payment].payment(payment_id),
    CONSTRAINT ck_preceipt_amount CHECK (reported_amount IS NULL OR reported_amount > 0),
    CONSTRAINT ck_preceipt_review CHECK (
        (reviewed_at IS NULL AND reviewed_by IS NULL) OR
        (reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
    )
);
```

**Indexes:**

| Name | Fields | Type | Justification |
|------|--------|------|----------------|
| `ix_payment_receipt_payment` | `payment_id` | Non-unique | Find the receipt(s) for a payment. |
| `ix_payment_receipt_reference` | `transaction_reference` | Non-unique | Antifraud check: detect the same receipt reference reused across payments. |
| `ix_payment_receipt_reviewed_by` | `reviewed_by` | Non-unique | Cross-service lookup support for `payment.payment_receipt.reviewed_by` (added with ADR-009). |
| `ix_payment_receipt_uploaded_by` | `uploaded_by` | Non-unique | Cross-service lookup support for `payment.payment_receipt.uploaded_by` (added with ADR-009). |

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `payment_receipt_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `payment_id` | BIGINT | No | The payment this receipt supports. | FK → `payment.payment.payment_id` |
| `file_url` | NVARCHAR(500) | No | The uploaded image/file. | — |
| `transaction_reference` | NVARCHAR(100) | Yes | Reference number printed on the receipt — the anti-fraud check target. | — |
| `reported_amount` | DECIMAL(12,2) | Yes | What the receipt claims was paid, checked against `payment.amount`. | — |
| `uploaded_at` | DATETIME2(3) | No | When it was uploaded, UTC. | — |
| `uploaded_by` | BIGINT | No | Who uploaded it. | No FK — owned by `security.app_user`, see the cross-service contract below. |
| `reviewed_at` | DATETIME2(3) | Yes | When staff reviewed it, UTC. | — |
| `reviewed_by` | BIGINT | Yes | Who reviewed it. | No FK — owned by `security.app_user`, see the cross-service contract below. |
| `review_comment` | NVARCHAR(300) | Yes | Reviewer's note. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. Kept separate from `payment` because a rejected payment can get a corrected receipt uploaded next — both stay on record. If the receipt were a column on `payment`, the second upload would overwrite the first.
2. The index on `transaction_reference` makes the reuse check fast: `BookingPaymentGuard` rejects a reference already used on another booking (409 `TRANSACTION_REFERENCE_REUSED`). It is not a unique index, because the same booking may report the same reference again after a rejection. This is the antifraud control that replaces a real payment gateway.

---

### Table: `loyalty_movement_type`

**Purpose:** The four kinds of point movement.

```sql
CREATE TABLE [payment].loyalty_movement_type (
    loyalty_movement_type_id SMALLINT     IDENTITY(1,1) NOT NULL,
    code          NVARCHAR(30) NOT NULL,
    name          NVARCHAR(60) NOT NULL,
    sign          SMALLINT     NOT NULL,
    display_order SMALLINT     NOT NULL CONSTRAINT df_lmt_order DEFAULT 0,
    is_active     BIT          NOT NULL CONSTRAINT df_lmt_active DEFAULT 1,
    created_at    DATETIME2(3) NOT NULL CONSTRAINT df_lmt_created DEFAULT SYSUTCDATETIME(),
    created_by    BIGINT       NULL,
    updated_at    DATETIME2(3) NULL,
    updated_by    BIGINT       NULL,
    deleted_at    DATETIME2(3) NULL,
    deleted_by    BIGINT       NULL,
    row_version   INT          NOT NULL CONSTRAINT df_lmt_rv DEFAULT 1,
    CONSTRAINT pk_loyalty_movement_type PRIMARY KEY (loyalty_movement_type_id),
    CONSTRAINT uq_loyalty_movement_type_code UNIQUE (code),
    CONSTRAINT ck_loyalty_movement_sign CHECK (sign IN (-1, 1))
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `loyalty_movement_type_id` | SMALLINT | No | Surrogate primary key (IDENTITY). | PK |
| `code` | NVARCHAR(30) | No | Seeded with `EARNED`, `REDEEMED`, `EXPIRED`, `ADJUSTED` (015) and `REVERSED` (020, points given back when a payment is refunded). The code writes only `EARNED` and `REVERSED`. | Unique |
| `name` | NVARCHAR(60) | No | Label. | — |
| `sign` | SMALLINT | No | `1` or `-1` — whether the movement adds or subtracts points. | — |
| `display_order` | SMALLINT | No | Sort order. | — |
| `is_active` | BIT | No | Soft on/off switch. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. **Moved from `customer` to `payment` (ADR-009).** Loyalty points are the equivalent of money and follow the same ledger discipline as payments, so the ledger and its movement types belong to `payment-service`.

---

### Table: `loyalty_transaction`

**Purpose:** The loyalty-points ledger — every movement, in order.

```sql
CREATE TABLE [payment].loyalty_transaction (
    loyalty_transaction_id   BIGINT        IDENTITY(1,1) NOT NULL,
    customer_id              BIGINT        NOT NULL,   -- security.app_user.user_id, not customer.customer_id — see note below (ADR-015)
    loyalty_movement_type_id SMALLINT      NOT NULL,
    booking_id               BIGINT        NULL,   -- [booking].booking
    points                   INT           NOT NULL,
    balance_after            INT           NOT NULL,   -- source of truth for the balance (ADR-009)
    expires_on               DATE          NULL,
    [description]            NVARCHAR(200) NULL,
    created_at               DATETIME2(3)  NOT NULL CONSTRAINT df_ltx_created DEFAULT SYSUTCDATETIME(),
    created_by               BIGINT        NULL,
    updated_at               DATETIME2(3)  NULL,
    updated_by               BIGINT        NULL,
    deleted_at               DATETIME2(3)  NULL,
    deleted_by               BIGINT        NULL,
    row_version              INT           NOT NULL CONSTRAINT df_ltx_rv DEFAULT 1,
    CONSTRAINT pk_loyalty_transaction PRIMARY KEY (loyalty_transaction_id),
    CONSTRAINT fk_loyalty_transaction_type FOREIGN KEY (loyalty_movement_type_id) REFERENCES [payment].loyalty_movement_type(loyalty_movement_type_id),
    CONSTRAINT ck_loyalty_points CHECK (points <> 0),
    CONSTRAINT ck_loyalty_balance CHECK (balance_after >= 0)
);
```

**Indexes:**

| Name | Fields | Type | Justification |
|------|--------|------|----------------|
| `ix_loyalty_transaction_customer` | `customer_id, created_at` | Non-unique | Build a customer's points history in order. |
| `ix_loyalty_transaction_booking` | `booking_id` | Non-unique | Find the ledger entries a booking generated. |

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `loyalty_transaction_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `customer_id` | BIGINT | No | Owning customer. **As implemented (ADR-015), this holds `security.app_user.user_id`** (the same id booking-service already exposes as `ownerUserId`), not `customer.customer_id` — see Modeling decision 4 below. | No FK — cross-service. |
| `loyalty_movement_type_id` | SMALLINT | No | What kind of movement this was. | FK → `customer.loyalty_movement_type.loyalty_movement_type_id` |
| `booking_id` | BIGINT | Yes | The booking that generated it, when there is one. | No FK — owned by `booking.booking`; NULL for manual adjustments and expirations, see the cross-service contract below. |
| `points` | INT | No | Signed amount of this single movement. | — |
| `balance_after` | INT | No | Running balance right after this movement — lets any past balance be reconstructed without replaying the whole ledger. | — |
| `expires_on` | DATE | Yes | Expiry date for earned points, if any. | — |
| `description` | NVARCHAR(200) | Yes | Free-text note. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. Without this table, `customer.loyalty_points` would be a number with no origin — if a customer disputes their balance, there is nothing to point to. `balance_after` turns the ledger into an audit trail, not just a sum.
2. **Moved from `customer` to `payment` (ADR-009), and it is the source of truth for every loyalty balance.** Only `payment-service` writes it. The current balance of a customer is the `balance_after` of their latest row.
3. `customer_id` lost its foreign key in the move: `customer.customer` now belongs to another service. It keeps its index, like every other cross-service reference.
4. **`customer_id` holds `user_id`, not `customer.customer_id` (ADR-015, 2026-10-07).** Every other cross-service contract a customer appears in (`booking.booking.customer_vehicle_id` → vehicle → owner, exposed as `ownerUserId`; the whole `customer-service` vehicle API, keyed by `userId` from the JWT) already identifies the customer by their security `user_id`, and no endpoint anywhere exposes `customer.customer_id` to another service. Requiring the "correct" id here would need a new customer-service lookup endpoint for an id nothing else needs; `payment-service` uses the id it can already get from `booking-service`'s `BookingResponse.ownerUserId` instead. `customer.customer.user_id` (added by changeset `014`) is the column that would back that lookup if it is ever built.

---

## 09. notification

**Owning service:** `notification-service`

**DB Engine:** SQL Server 2016+

**Engine justification:**

- Simple relational fan-out (one row per user per event); no benefit from a different engine at this scale.

### Table: `notification_type`

**Purpose:** The eleven events that generate a notification.

```sql
CREATE TABLE [notification].notification_type (
    notification_type_id SMALLINT     IDENTITY(1,1) NOT NULL,
    code          NVARCHAR(40) NOT NULL,
    name          NVARCHAR(80) NOT NULL,
    display_order SMALLINT     NOT NULL CONSTRAINT df_ntype_order DEFAULT 0,
    is_active     BIT          NOT NULL CONSTRAINT df_ntype_active DEFAULT 1,
    created_at    DATETIME2(3) NOT NULL CONSTRAINT df_ntype_created DEFAULT SYSUTCDATETIME(),
    created_by    BIGINT       NULL,
    updated_at    DATETIME2(3) NULL,
    updated_by    BIGINT       NULL,
    deleted_at    DATETIME2(3) NULL,
    deleted_by    BIGINT       NULL,
    row_version   INT          NOT NULL CONSTRAINT df_ntype_rv DEFAULT 1,
    CONSTRAINT pk_notification_type PRIMARY KEY (notification_type_id),
    CONSTRAINT uq_notification_type_code UNIQUE (code)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `notification_type_id` | SMALLINT | No | Surrogate primary key (IDENTITY). | PK |
| `code` | NVARCHAR(40) | No | E.g. `BOOKING_CREATED`, `PAYMENT_CONFIRMED`, `INSPECTION_REPORT`; `APP_UPDATE_AVAILABLE` comes from migration 038 (new APK published). | Unique |
| `name` | NVARCHAR(80) | No | Label. | — |
| `display_order` | SMALLINT | No | Sort order. | — |
| `is_active` | BIT | No | Soft on/off switch. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

---

### Table: `notification`

**Purpose:** A notification sent to a user.

```sql
CREATE TABLE [notification].notification (
    notification_id      BIGINT        IDENTITY(1,1) NOT NULL,
    user_id              BIGINT        NOT NULL,   -- [security].app_user
    notification_type_id SMALLINT      NOT NULL,
    title                NVARCHAR(120) NOT NULL,
    [message]            NVARCHAR(500) NOT NULL,
    reference_entity     NVARCHAR(40)  NULL,
    reference_id         BIGINT        NULL,
    is_read              BIT           NOT NULL CONSTRAINT df_notif_read DEFAULT 0,
    read_at              DATETIME2(3)  NULL,
    sent_at              DATETIME2(3)  NOT NULL CONSTRAINT df_notif_sent DEFAULT SYSUTCDATETIME(),
    created_at           DATETIME2(3)  NOT NULL CONSTRAINT df_notif_created DEFAULT SYSUTCDATETIME(),
    created_by           BIGINT        NULL,
    updated_at           DATETIME2(3)  NULL,
    updated_by           BIGINT        NULL,
    deleted_at           DATETIME2(3)  NULL,
    deleted_by           BIGINT        NULL,
    row_version          INT           NOT NULL CONSTRAINT df_notif_rv DEFAULT 1,
    CONSTRAINT pk_notification PRIMARY KEY (notification_id),
    CONSTRAINT fk_notification_type FOREIGN KEY (notification_type_id) REFERENCES [notification].notification_type(notification_type_id),
    CONSTRAINT ck_notification_read CHECK (
        (is_read = 0 AND read_at IS NULL) OR
        (is_read = 1 AND read_at IS NOT NULL)
    )
);
```

**Indexes:**

| Name | Fields | Type | Justification |
|------|--------|------|----------------|
| `ix_notification_user_unread` | `user_id, is_read` | Non-unique | Unread-count / inbox queries. |
| `ix_notification_user_date` | `user_id, sent_at` | Non-unique | Time-ordered notification history per user. |

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `notification_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `user_id` | BIGINT | No | Recipient. | No FK — owned by `security.app_user`, see the cross-service contract below. |
| `notification_type_id` | SMALLINT | No | What kind of event triggered it. | FK → `notification.notification_type.notification_type_id` |
| `title` | NVARCHAR(120) | No | Rendered title, as actually sent. | — |
| `message` | NVARCHAR(500) | No | Rendered body, as actually sent. | — |
| `reference_entity` | NVARCHAR(40) | Yes | What the notification is about, e.g. `booking`. | — |
| `reference_id` | BIGINT | Yes | The specific row, e.g. `145` — lets tapping the notification deep-link to the right screen. | — |
| `is_read` | BIT | No | Read flag. | — |
| `read_at` | DATETIME2(3) | Yes | When it was read; must be set together with `is_read = 1`. | — |
| `sent_at` | DATETIME2(3) | No | When it was sent, UTC. | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block — see `modeling-conventions.md`. | — |

**Modeling decisions:**

1. Stores the title and message already rendered, not a template reference: if tomorrow's wording for "Payment approved" changes, yesterday's notifications should keep saying what they actually said. History is never rewritten. Since ADR-011 §15 the text is rendered in the language of the recipient's account at sending time, so the table still has no language column.

---

### Table: `device_token`

**Purpose:** Phones that receive push notifications — one Expo push token per installed app (ADR-011).

```sql
CREATE TABLE [notification].device_token (
    device_token_id BIGINT        IDENTITY(1,1) NOT NULL,
    user_id         BIGINT        NOT NULL,   -- [security].app_user
    token           NVARCHAR(200) NOT NULL,
    platform        NVARCHAR(10)  NOT NULL,
    is_active       BIT           NOT NULL CONSTRAINT df_dtoken_active DEFAULT 1,
    last_seen_at    DATETIME2(3)  NOT NULL CONSTRAINT df_dtoken_seen DEFAULT SYSUTCDATETIME(),
    created_at      DATETIME2(3)  NOT NULL CONSTRAINT df_dtoken_created DEFAULT SYSUTCDATETIME(),
    created_by      BIGINT        NULL,
    updated_at      DATETIME2(3)  NULL,
    updated_by      BIGINT        NULL,
    deleted_at      DATETIME2(3)  NULL,
    deleted_by      BIGINT        NULL,
    row_version     INT           NOT NULL CONSTRAINT df_dtoken_rv DEFAULT 1,
    CONSTRAINT pk_device_token PRIMARY KEY (device_token_id),
    CONSTRAINT uq_device_token_token UNIQUE (token),
    CONSTRAINT ck_device_token_platform CHECK (platform IN (N'ANDROID', N'IOS'))
);
```

**Modeling decisions:**

1. A user can have several phones; a token that Expo reports as invalid is deactivated instead of deleted, so the history of who received what stays readable. Migration 016.

---

### Table: `processed_event`

**Purpose:** Ids of the events already consumed, so a redelivered event creates nothing (idempotent consumer, ADR-011).

```sql
CREATE TABLE [notification].processed_event (
    processed_event_id BIGINT       IDENTITY(1,1) NOT NULL,
    event_id           NVARCHAR(64) NOT NULL,
    event_type         NVARCHAR(60) NOT NULL,
    processed_at       DATETIME2(3) NOT NULL CONSTRAINT df_pevent_processed DEFAULT SYSUTCDATETIME(),
    created_at         DATETIME2(3) NOT NULL CONSTRAINT df_pevent_created DEFAULT SYSUTCDATETIME(),
    created_by         BIGINT       NULL,
    updated_at         DATETIME2(3) NULL,
    updated_by         BIGINT       NULL,
    deleted_at         DATETIME2(3) NULL,
    deleted_by         BIGINT       NULL,
    row_version        INT          NOT NULL CONSTRAINT df_pevent_rv DEFAULT 1,
    CONSTRAINT pk_processed_event PRIMARY KEY (processed_event_id),
    CONSTRAINT uq_processed_event_event UNIQUE (event_id)
);
```

**Modeling decisions:**

1. Written in the same transaction as the notifications the event produced; the unique `event_id` makes a concurrent duplicate fail and roll back. Migration 017.

---

### Table: `booking_reminder`

**Purpose:** Booking reminders scheduled from `BookingConfirmed` — one per booking and lead time (24 h and 1 h by default). ADR-011 §7.

```sql
CREATE TABLE [notification].booking_reminder (
    booking_reminder_id BIGINT       IDENTITY(1,1) NOT NULL,
    booking_id          BIGINT       NOT NULL,   -- [booking].booking
    user_id             BIGINT       NOT NULL,   -- [security].app_user (the client)
    booking_code        NVARCHAR(20) NULL,
    scheduled_start     DATETIME2(3) NOT NULL,
    lead_minutes        INT          NOT NULL,
    remind_at           DATETIME2(3) NOT NULL,
    sent_at             DATETIME2(3) NULL,
    created_at          DATETIME2(3) NOT NULL CONSTRAINT df_breminder_created DEFAULT SYSUTCDATETIME(),
    created_by          BIGINT       NULL,
    updated_at          DATETIME2(3) NULL,
    updated_by          BIGINT       NULL,
    deleted_at          DATETIME2(3) NULL,
    deleted_by          BIGINT       NULL,
    row_version         INT          NOT NULL CONSTRAINT df_breminder_rv DEFAULT 1,
    CONSTRAINT pk_booking_reminder PRIMARY KEY (booking_reminder_id),
    CONSTRAINT uq_booking_reminder_lead UNIQUE (booking_id, lead_minutes),
    CONSTRAINT ck_booking_reminder_lead CHECK (lead_minutes > 0)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `booking_reminder_id` | BIGINT | No | Surrogate primary key (IDENTITY). | PK |
| `booking_id` | BIGINT | No | The booking. | No FK — owned by `booking.booking` |
| `user_id` | BIGINT | No | The client to remind. | No FK — owned by `security.app_user` |
| `booking_code` | NVARCHAR(20) | Yes | Shown in the message (`RES-000123`). | — |
| `scheduled_start` | DATETIME2(3) | No | Booking start, UTC. | — |
| `lead_minutes` | INT | No | How long before the start the reminder goes out. | > 0; unique with `booking_id` |
| `remind_at` | DATETIME2(3) | No | `scheduled_start - lead_minutes`, UTC. | Indexed while pending |
| `sent_at` | DATETIME2(3) | Yes | When it was sent (or discarded because the booking time had passed). | — |
| `created_at / updated_at / deleted_at / created_by / updated_by / deleted_by / row_version` | — | — | Standard audit block; `deleted_at` = cancelled booking. | — |

**Modeling decisions:**

1. notification-service does not query bookings: everything it needs travels in `BookingConfirmed`. A reschedule arrives as a new `BookingConfirmed` and reuses the same rows (unique `booking_id, lead_minutes`). Migration 019.
2. The email address is not stored; it is read from security-service when the reminder is sent (ADR-011 §8).

---

### Table: `booking_tracking`

**Purpose:** The last known state of each booking, as the events told it — used to notify staff (operator and admin) without querying booking-service or operations-service. ADR-011 §13–14.

```sql
CREATE TABLE [notification].booking_tracking (
    booking_id          BIGINT       NOT NULL,   -- [booking].booking
    booking_code        NVARCHAR(20) NULL,
    customer_user_id    BIGINT       NULL,       -- [security].app_user (the client)
    operator_user_id    BIGINT       NULL,       -- [security].app_user (the assigned operator)
    scheduled_start     DATETIME2(3) NULL,
    is_cancelled        BIT          NOT NULL CONSTRAINT df_btracking_cancelled DEFAULT 0,
    updated_at          DATETIME2(3) NOT NULL CONSTRAINT df_btracking_updated DEFAULT SYSUTCDATETIME(),
    unassigned_alert_at DATETIME2(3) NULL,       -- migration 031
    CONSTRAINT pk_booking_tracking PRIMARY KEY (booking_id)
);
```

**Data dictionary:**

| Column | Type | Nullable | Description | Constraints |
|--------|------|----------|--------------|-------------|
| `booking_id` | BIGINT | No | The booking; also the primary key (one row per booking). | PK; no FK — owned by `booking.booking` |
| `booking_code` | NVARCHAR(20) | Yes | Shown in the messages (`RES-000123`). | — |
| `customer_user_id` | BIGINT | Yes | The client who booked. | No FK — owned by `security.app_user` |
| `operator_user_id` | BIGINT | Yes | User of the operator assigned last (`OperatorAssigned`); `NULL` while nobody is assigned. | No FK — owned by `security.app_user` |
| `scheduled_start` | DATETIME2(3) | Yes | Booking start, UTC, from the last `BookingConfirmed`. | — |
| `is_cancelled` | BIT | No | Set by `BookingCancelled`. | — |
| `updated_at` | DATETIME2(3) | No | Last event applied to the row, UTC. | — |
| `unassigned_alert_at` | DATETIME2(3) | Yes | When the admins were told the booking starts in less than 2 hours with no operator (`ADMIN_BOOKING_UNASSIGNED`); `NULL` = not alerted yet. | — |

**Modeling decisions:**

1. A read model fed only by events (`BookingConfirmed`, `BookingCancelled`, `OperatorAssigned`). Comparing a new `BookingConfirmed` with the stored `scheduled_start` tells a new booking from a rescheduled one, and `operator_user_id` says which operator to notify. Migration 027.
2. No standard audit block: the row is overwritten by each event and carries no business history — the notifications it produced are the history.
3. `unassigned_alert_at` keeps the scheduled task from repeating the alert on every run. Migration 031 (next global number: 032).

---

## Cross-service contract (no FK, by design)

28 columns point at a table in another schema, and **26 of them point at a table owned by a
different service** (seven added after ADR-009: `customer.user_id`, and the `user_id` / `booking_id`
references of the new notification tables, `booking_tracking` included). That is one more than before ADR-009: `loyalty_transaction.customer_id`
used to stay inside `customer` and now crosses from `payment` to `customer-service`. None of them has a foreign key — integrity across the boundary is the
application's job, validated before it writes (ADR-004). Every one of them is indexed so
joins done in application code, or in reporting queries, stay fast.

| Column | Points at | Owned by |
|--------|-----------|----------|
| `customer.customer.person_id` | `security.person` | `security-service` |
| `catalog.service_price.vehicle_type_id` | `customer.vehicle_type` | `customer-service` |
| `booking.booking.customer_vehicle_id` | `customer.customer_vehicle` | `customer-service` |
| `booking.booking.booked_by` | `security.app_user` | `security-service` |
| `execution.operator.user_id` | `security.app_user` | `security-service` |
| `execution.service_execution.booking_service_id` | `booking.booking_service` | `booking-service` |
| `promotion.promotion_service.service_id` | `catalog.service` | `booking-service` |
| `promotion.promotion_customer.customer_id` | `customer.customer` | `customer-service` |
| `promotion.promotion_customer.assigned_by` | `security.app_user` | `security-service` |
| `promotion.booking_promotion.booking_id` | `booking.booking` | `booking-service` |
| `payment.payment.booking_id` | `booking.booking` | `booking-service` |
| `payment.payment.approved_by` | `security.app_user` | `security-service` |
| `payment.payment_receipt.uploaded_by` | `security.app_user` | `security-service` |
| `payment.payment_receipt.reviewed_by` | `security.app_user` | `security-service` |
| `payment.loyalty_transaction.customer_id` | `security.app_user` (not `customer.customer` — ADR-015) | `security-service` |
| `payment.loyalty_transaction.booking_id` | `booking.booking` | `booking-service` |
| `notification.notification.user_id` | `security.app_user` | `security-service` |
| `customer.customer.user_id` | `security.app_user` | `security-service` |
| `notification.device_token.user_id` | `security.app_user` | `security-service` |
| `notification.booking_reminder.booking_id` | `booking.booking` | `booking-service` |
| `notification.booking_reminder.user_id` | `security.app_user` | `security-service` |
| `notification.booking_tracking.booking_id` | `booking.booking` | `booking-service` |
| `notification.booking_tracking.customer_user_id` | `security.app_user` | `security-service` |
| `notification.booking_tracking.operator_user_id` | `security.app_user` | `security-service` |
| `booking.schedule_history.changed_by` | `security.app_user` | `security-service` |
| `execution.inspection_report.booking_id` | `booking.booking` | `booking-service` |

The other two stay inside one service since ADR-009 and carry a real foreign key:

| Column | Points at | Why it can have a FK |
|--------|-----------|----------------------|
| `security.user_preference.user_id` | `security.app_user` | Same schema since `user_preference` moved out of `settings` |
| `booking.booking_service.service_price_id` | `catalog.service_price` | Both schemas belong to `booking-service` |

Business rules the database can't enforce on its own, that the application must:

- A service line can be rated only once its `service_execution` is `COMPLETED` (and the booking `COMPLETED`), at most once,
  and only by the customer who owns the booking (INV-007). Rating is optional.
- `booking.points_discount_amount` would match that booking's `REDEEMED` movement in
  `payment.loyalty_transaction` if a direct points-to-cash redemption were ever built; as of
  ADR-015 it is not — it stays `0` on every booking. Points instead gate which promotions a
  customer can redeem (`promotion.promotion.required_points`), recorded in `promotion.booking_promotion`
  with an `EARNED` movement crediting the ledger, never a `REDEEMED` one that debits it.
- `customer.loyalty_points` was planned as a display copy of the latest `balance_after` in
  `payment.loyalty_transaction`, but as implemented (ADR-015) nothing writes it — every screen
  reads the ledger live via payment-service instead. See Modeling decision 3 on `customer.customer`.
- A booking can't fall outside `business_hour` (accounting for `business_hour_exception`).
- The assigned operator must be available per `operator_availability`, with no overlapping
  row in `operator_absence`.

---

## Migration strategy

See `migration-strategy.md`.

## Relationship diagrams

One entity-relationship diagram per service, generated from the database on 2026-10-19, lives in
`08-uml/diagrams/source/erd-*.md` (`08-uml/diagram-index.md`, ER-01 to ER-06). Cross-service references
are listed in a table under each diagram, not drawn, for the same reason they have no FK here.

## Correlations

- Domain entities that map to these tables → `02-domain/entities-and-rules.md`
- Saga and Outbox pattern for distributed consistency → `05-architecture/pattern-guide.md`
- Data for each service in detail → `09-microservices/services/<service>/data-model.md`
- How data is accessed via API → `07-api/contracts/openapi/`
