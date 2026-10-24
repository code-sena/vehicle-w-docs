# ER — Schemas security and audit (security-service, 12 tables)

Source: the Liquibase changelogs of `security-service` on `origin/develop` (`b5fe56e`, 2026-10-24), every changeset applied (last structural file: `039-security-app-user-legal-consent.sql`). Each entity lists all its columns except the standard audit block, which is in the table under the diagram. Types are the SQL Server base type; lengths, precision and defaults are in `09-microservices/services/02-security-service/data-model.md`. `PK`, `FK` and `UK` (unique, alone or filtered) are the database keys; "nullable" marks columns that accept NULL. One relationship per foreign key, labelled with its column.

```mermaid
erDiagram
    person {
        bigint person_id PK
        nvarchar document_number UK
        nvarchar first_name
        nvarchar last_name
        nvarchar phone "nullable"
        nvarchar email "nullable"
    }
    app_user {
        bigint user_id PK
        bigint person_id FK, UK
        nvarchar username UK
        nvarchar password_hash
        bit is_active
        datetime2 last_login "nullable"
        datetime2 terms_accepted_at "nullable"
        datetime2 data_policy_accepted_at "nullable"
    }
    role {
        smallint role_id PK
        nvarchar code UK
        nvarchar name
    }
    permission {
        smallint permission_id PK
        nvarchar code UK
        nvarchar name
        nvarchar resource
        nvarchar action
    }
    role_permission {
        bigint role_permission_id PK
        smallint role_id FK
        smallint permission_id FK
    }
    user_role {
        bigint user_role_id PK
        bigint user_id FK
        smallint role_id FK
    }
    user_session {
        bigint user_session_id PK
        bigint user_id FK
        nvarchar refresh_token_hash "nullable"
        datetime2 started_at
        datetime2 expires_at
        datetime2 revoked_at "nullable"
        nvarchar ip_address "nullable"
        nvarchar user_agent "nullable"
    }
    password_reset_token {
        bigint password_reset_token_id PK
        bigint user_id FK
        nvarchar token_hash UK
        datetime2 requested_at
        datetime2 expires_at
        datetime2 used_at "nullable"
        nvarchar ip_address "nullable"
    }
    audit_log {
        bigint audit_log_id PK
        nvarchar entity
        bigint entity_id
        nvarchar action
        nvarchar previous_data "nullable"
        nvarchar new_data "nullable"
        bigint changed_by "nullable"
        datetime2 changed_at
    }
    user_preference {
        bigint user_preference_id PK
        bigint user_id FK, UK
        nvarchar theme
        nvarchar language
        bit notifications_enabled
        bit email_reminders_enabled
        bit promotions_enabled
    }
    login_lockout {
        bigint user_id PK, FK
        int failed_count
        datetime2 first_failed_at "nullable"
        datetime2 locked_until "nullable"
    }
    person_address {
        bigint person_id PK, FK
        nvarchar address
    }
    app_user |o--|| person : "person_id"
    role_permission }o--|| role : "role_id"
    role_permission }o--|| permission : "permission_id"
    user_role }o--|| app_user : "user_id"
    user_role }o--|| role : "role_id"
    user_session }o--|| app_user : "user_id"
    password_reset_token }o--|| app_user : "user_id"
    user_preference |o--|| app_user : "user_id"
    login_lockout |o--|| app_user : "user_id"
    person_address |o--|| person : "person_id"
```

## Audit columns

The standard block is `created_at`, `created_by`, `updated_at`, `updated_by`, `deleted_at`, `deleted_by`, `row_version` (`06-data/modeling-conventions.md`).

| Table | Audit columns |
|---|---|
| `security.person` | — |
| `security.app_user` | created_at |
| `security.role` | — |
| `security.permission` | — |
| `security.role_permission` | — |
| `security.user_role` | — |
| `security.user_session` | — |
| `security.password_reset_token` | — |
| `audit.audit_log` | — |
| `security.user_preference` | all seven |
| `security.login_lockout` | updated_at |
| `security.person_address` | updated_at |

## References to other services

None: this service owns every table its columns point to.
