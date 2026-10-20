# ER — Schemas catalog and booking (booking-service, 13 tables)

Source: the `LavaRapido` database read on 2026-10-19 (`sys.tables`, `sys.columns`, `sys.foreign_keys`) with every
migration applied (up to 039). The audit block (`created_at`, `created_by`, `updated_at`, `updated_by`,
`deleted_at`, `deleted_by`, `row_version`) is left out to keep the diagram readable; 12 of the 13 tables have some or all of these columns.

```mermaid
erDiagram
    bay_status {
        smallint bay_status_id PK
        nvarchar code
        nvarchar name
        bit accepts_bookings
        smallint display_order
    }
    booking {
        bigint booking_id PK
        bigint customer_vehicle_id
        smallint service_bay_id FK "nullable"
        datetime2 scheduled_start
        datetime2 scheduled_end
        smallint booking_status_id FK
        bigint booked_by
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
    }
    booking_status {
        smallint booking_status_id PK
        nvarchar code
        nvarchar name
        bit is_final
        smallint display_order
        bit is_active
    }
    business_hour {
        smallint business_hour_id PK
        smallint day_of_week
        time opens_at
        time closes_at
        bit is_active
        time break_starts_at "nullable"
        time break_ends_at "nullable"
    }
    business_hour_exception {
        int business_hour_exception_id PK
        date exception_date
        bit is_closed
        time opens_at "nullable"
        time closes_at "nullable"
        nvarchar reason
    }
    cancellation_reason {
        smallint cancellation_reason_id PK
        nvarchar code
        nvarchar name
        bit is_customer_fault
        smallint display_order
        bit is_active
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
        bit singleton
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
    schedule_history {
        bigint schedule_history_id PK
        nvarchar entity_type
        nvarchar title
        nvarchar detail "nullable"
        datetime2 changed_at
        bigint changed_by "nullable"
    }
    service_bay {
        smallint service_bay_id PK
        nvarchar code
        nvarchar name
        smallint bay_status_id FK
    }
    service {
        int service_id PK
        nvarchar code
        nvarchar name
        nvarchar description "nullable"
        smallint service_category_id FK
        bit is_active
        int loyalty_points
    }
    service_category {
        smallint service_category_id PK
        nvarchar code
        nvarchar name
        nvarchar description "nullable"
        smallint display_order
        bit is_active
    }
    service_price {
        bigint service_price_id PK
        int service_id FK
        smallint vehicle_type_id
        decimal price
        smallint estimated_minutes
        date valid_from
        date valid_to "nullable"
    }
    booking }o--o| service_bay : "service_bay_id"
    booking }o--|| booking_status : "booking_status_id"
    booking }o--o| cancellation_reason : "cancellation_reason_id"
    booking_service }o--|| booking : "booking_id"
    booking_service }o--|| service_price : "service_price_id"
    service_bay }o--|| bay_status : "bay_status_id"
    service }o--|| service_category : "service_category_id"
    service_price }o--|| service : "service_id"
```

References to other services have no foreign key (ADR-003); they are kept by the code:

| Column | Points to | Owner |
|---|---|---|
| `booking.booking.customer_vehicle_id` | `customer.customer_vehicle` | customer-service |
| `booking.booking.booked_by` | `security.app_user` | security-service |
| `booking.schedule_history.changed_by` | `security.app_user` | security-service |
| `catalog.service_price.vehicle_type_id` | `customer.vehicle_type` | customer-service |
