# ER — Schemas catalog and booking (booking-service, 13 tables)

Source: the Liquibase changelogs of `lavarapido-booking-service` on `origin/develop` (`5dd6794`, 2026-10-24), every changeset applied (last structural file: `045-booking-row-version-optimistic-lock.sql`). Each entity lists all its columns except the standard audit block, which is in the table under the diagram. Types are the SQL Server base type; lengths, precision and defaults are in `09-microservices/services/04-booking-service/data-model.md`. `PK`, `FK` and `UK` (unique, alone or filtered) are the database keys; "nullable" marks columns that accept NULL. One relationship per foreign key, labelled with its column.

```mermaid
erDiagram
    service_category {
        smallint service_category_id PK
        nvarchar code UK
        nvarchar name
        nvarchar description "nullable"
        smallint display_order
        bit is_active
    }
    service {
        int service_id PK
        nvarchar code UK
        nvarchar name
        nvarchar description "nullable"
        smallint service_category_id FK
        bit is_active
        int loyalty_points
    }
    service_price {
        bigint service_price_id PK
        int service_id FK
        smallint vehicle_type_id "customer.vehicle_type, no FK"
        decimal price
        smallint estimated_minutes
        date valid_from
        date valid_to "nullable"
    }
    establishment {
        smallint establishment_id PK
        nvarchar legal_name
        nvarchar trade_name
        nvarchar tax_id
        nvarchar address
        nvarchar phone "nullable"
        nvarchar email "nullable"
        nvarchar logo_url "nullable"
        bit singleton UK
        nvarchar business_type "nullable"
        date founded_on "nullable"
        nvarchar legal_representative "nullable"
        nvarchar legal_representative_document "nullable"
        nvarchar website "nullable"
        nvarchar tax_regime "nullable"
        nvarchar ciiu_activity "nullable"
        nvarchar dian_resolution "nullable"
        nvarchar invoice_prefix "nullable"
        nvarchar invoice_range "nullable"
        nvarchar instagram "nullable"
        nvarchar facebook "nullable"
        nvarchar support_line "nullable"
        nvarchar service_hours_note "nullable"
    }
    business_hour {
        smallint business_hour_id PK
        smallint day_of_week UK
        time opens_at
        time closes_at
        bit is_active
        time break_starts_at "nullable"
        time break_ends_at "nullable"
    }
    business_hour_exception {
        int business_hour_exception_id PK
        date exception_date UK
        bit is_closed
        time opens_at "nullable"
        time closes_at "nullable"
        nvarchar reason
    }
    service_bay {
        smallint service_bay_id PK
        nvarchar code UK
        nvarchar name
        smallint bay_status_id FK
    }
    booking_status {
        smallint booking_status_id PK
        nvarchar code UK
        nvarchar name
        bit is_final
        smallint display_order
        bit is_active
    }
    cancellation_reason {
        smallint cancellation_reason_id PK
        nvarchar code UK
        nvarchar name
        bit is_customer_fault
        smallint display_order
        bit is_active
    }
    booking {
        bigint booking_id PK
        bigint customer_vehicle_id "customer.customer_vehicle, no FK"
        smallint service_bay_id FK "nullable"
        datetime2 scheduled_start
        datetime2 scheduled_end
        smallint booking_status_id FK
        bigint booked_by "security.app_user, no FK"
        smallint cancellation_reason_id FK "nullable"
        int points_redeemed
        decimal points_discount_amount
        nvarchar notes "nullable"
    }
    booking_service {
        bigint booking_service_id PK
        bigint booking_id FK
        bigint service_price_id FK
        smallint quantity
        int loyalty_points "nullable"
    }
    bay_status {
        smallint bay_status_id PK
        nvarchar code UK
        nvarchar name
        bit accepts_bookings
        smallint display_order
    }
    schedule_history {
        bigint schedule_history_id PK
        nvarchar entity_type
        nvarchar title
        nvarchar detail "nullable"
        datetime2 changed_at
        bigint changed_by "nullable, security.app_user, no FK"
    }
    service }o--|| service_category : "service_category_id"
    service_price }o--|| service : "service_id"
    service_bay }o--|| bay_status : "bay_status_id"
    booking }o--o| service_bay : "service_bay_id"
    booking }o--|| booking_status : "booking_status_id"
    booking }o--o| cancellation_reason : "cancellation_reason_id"
    booking_service }o--|| booking : "booking_id"
    booking_service }o--|| service_price : "service_price_id"
```

## Audit columns

The standard block is `created_at`, `created_by`, `updated_at`, `updated_by`, `deleted_at`, `deleted_by`, `row_version` (`06-data/modeling-conventions.md`).

| Table | Audit columns |
|---|---|
| `catalog.service_category` | all seven |
| `catalog.service` | all seven |
| `catalog.service_price` | all seven |
| `booking.establishment` | all seven |
| `booking.business_hour` | all seven |
| `booking.business_hour_exception` | all seven |
| `booking.service_bay` | all seven |
| `booking.booking_status` | all seven |
| `booking.cancellation_reason` | all seven |
| `booking.booking` | all seven |
| `booking.booking_service` | all seven |
| `booking.bay_status` | all seven |
| `booking.schedule_history` | — |

## References to other services

They have no foreign key (ADR-003); the code keeps them consistent.

| Column | Points to | Owner |
|---|---|---|
| `catalog.service_price.vehicle_type_id` | `customer.vehicle_type` | customer-service |
| `booking.booking.customer_vehicle_id` | `customer.customer_vehicle` | customer-service |
| `booking.booking.booked_by` | `security.app_user` | security-service |
| `booking.schedule_history.changed_by` | `security.app_user` | security-service |
