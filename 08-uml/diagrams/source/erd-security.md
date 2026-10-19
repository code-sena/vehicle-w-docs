# ER — Schemas security and audit (security-service, 12 tables)

Source: the `LavaRapido` database read on 2026-10-19 (`sys.tables`, `sys.columns`, `sys.foreign_keys`) with every
migration applied (up to 039). The audit block (`created_at`, `created_by`, `updated_at`, `updated_by`,
`deleted_at`, `deleted_by`, `row_version`) is left out to keep the diagram readable; 4 of the 12 tables have it.

```mermaid
erDiagram
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
    app_user {
        bigint user_id PK
        bigint person_id FK
        nvarchar username
        nvarchar password_hash
        bit is_active
        datetime2 last_login "nullable"
        datetime2 terms_accepted_at "nullable"
        datetime2 data_policy_accepted_at "nullable"
    }
    login_lockout {
        bigint user_id PK,FK
        int failed_count
        datetime2 first_failed_at "nullable"
        datetime2 locked_until "nullable"
    }
    password_reset_token {
        bigint password_reset_token_id PK
        bigint user_id FK
        nvarchar token_hash
        datetime2 requested_at
        datetime2 expires_at
        datetime2 used_at "nullable"
        nvarchar ip_address "nullable"
    }
    permission {
        smallint permission_id PK
        nvarchar code
        nvarchar name
        nvarchar resource
        nvarchar action
    }
    person {
        bigint person_id PK
        nvarchar document_number
        nvarchar first_name
        nvarchar last_name
        nvarchar phone "nullable"
        nvarchar email "nullable"
    }
    person_address {
        bigint person_id PK,FK
        nvarchar address
    }
    role {
        smallint role_id PK
        nvarchar code
        nvarchar name
    }
    role_permission {
        bigint role_permission_id PK
        smallint role_id FK
        smallint permission_id FK
    }
    user_preference {
        bigint user_preference_id PK
        bigint user_id FK
        nvarchar theme
        nvarchar language
        bit notifications_enabled
        bit email_reminders_enabled
        bit promotions_enabled
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
    audit_log }o..o| app_user : "changed_by (no FK)"
    app_user }o--|| person : "person_id"
    login_lockout }o--|| app_user : "user_id"
    password_reset_token }o--|| app_user : "user_id"
    person_address }o--|| person : "person_id"
    role_permission }o--|| role : "role_id"
    role_permission }o--|| permission : "permission_id"
    user_preference }o--|| app_user : "user_id"
    user_role }o--|| app_user : "user_id"
    user_role }o--|| role : "role_id"
    user_session }o--|| app_user : "user_id"
```
