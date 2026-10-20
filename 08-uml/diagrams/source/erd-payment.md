# ER — Schemas promotion and payment (payment-service, 12 tables)

Source: the `LavaRapido` database read on 2026-10-19 (`sys.tables`, `sys.columns`, `sys.foreign_keys`) with every
migration applied (up to 039). The audit block (`created_at`, `created_by`, `updated_at`, `updated_by`,
`deleted_at`, `deleted_by`, `row_version`) is left out to keep the diagram readable; 12 of the 12 tables have some or all of these columns.

```mermaid
erDiagram
    loyalty_movement_type {
        smallint loyalty_movement_type_id PK
        nvarchar code
        nvarchar name
        smallint sign
        smallint display_order
        bit is_active
    }
    loyalty_transaction {
        bigint loyalty_transaction_id PK
        bigint customer_id
        smallint loyalty_movement_type_id FK
        bigint booking_id "nullable"
        int points
        int balance_after
        date expires_on "nullable"
        nvarchar description "nullable"
        int sequence_no
    }
    payment {
        bigint payment_id PK
        bigint booking_id
        smallint payment_account_id FK
        smallint payment_status_id FK
        decimal amount
        datetime2 processed_at "nullable"
        bigint approved_by "nullable"
        nvarchar rejection_reason "nullable"
    }
    payment_account {
        smallint payment_account_id PK
        smallint payment_method_type_id FK
        nvarchar account_holder
        nvarchar account_number "nullable"
        nvarchar qr_image_url "nullable"
        nvarchar instructions "nullable"
        bit is_active
    }
    payment_method_type {
        smallint payment_method_type_id PK
        nvarchar code
        nvarchar name
        bit requires_account
        bit requires_receipt
        smallint display_order
        bit is_active
    }
    payment_receipt {
        bigint payment_receipt_id PK
        bigint payment_id FK
        nvarchar file_url
        nvarchar transaction_reference "nullable"
        decimal reported_amount "nullable"
        datetime2 uploaded_at
        bigint uploaded_by
        datetime2 reviewed_at "nullable"
        bigint reviewed_by "nullable"
        nvarchar review_comment "nullable"
    }
    payment_status {
        smallint payment_status_id PK
        nvarchar code
        nvarchar name
        bit is_final
        smallint display_order
        bit is_active
    }
    booking_promotion {
        bigint booking_promotion_id PK
        bigint booking_id
        int promotion_id FK
        decimal applied_amount
    }
    discount_type {
        smallint discount_type_id PK
        nvarchar code
        nvarchar name
        smallint display_order
        bit is_active
    }
    promotion {
        int promotion_id PK
        nvarchar code
        nvarchar name
        nvarchar description "nullable"
        smallint discount_type_id FK
        decimal discount_value
        decimal max_discount_amount "nullable"
        decimal min_purchase_amount
        bit is_public
        int min_completed_booking
        date valid_from
        date valid_to
        int max_redemptions "nullable"
        int max_redemptions_per_customer "nullable"
        bit is_active
        decimal price "nullable"
        int duration_minutes "nullable"
        nvarchar icon "nullable"
        bit featured
        nvarchar benefits "nullable"
        int required_points
    }
    promotion_customer {
        bigint promotion_customer_id PK
        int promotion_id FK
        bigint customer_id
        datetime2 assigned_at
        bigint assigned_by "nullable"
    }
    promotion_service {
        int promotion_service_id PK
        int promotion_id FK
        int service_id
    }
    loyalty_transaction }o--|| loyalty_movement_type : "loyalty_movement_type_id"
    payment }o--|| payment_account : "payment_account_id"
    payment }o--|| payment_status : "payment_status_id"
    payment_account }o--|| payment_method_type : "payment_method_type_id"
    payment_receipt }o--|| payment : "payment_id"
    booking_promotion }o--|| promotion : "promotion_id"
    promotion }o--|| discount_type : "discount_type_id"
    promotion_customer }o--|| promotion : "promotion_id"
    promotion_service }o--|| promotion : "promotion_id"
```

References to other services have no foreign key (ADR-003); they are kept by the code:

| Column | Points to | Owner |
|---|---|---|
| `payment.loyalty_transaction.customer_id` | `security.app_user` (holds the user id of the customer; the column keeps its first name) | security-service |
| `payment.loyalty_transaction.booking_id` | `booking.booking` | booking-service |
| `payment.payment.booking_id` | `booking.booking` | booking-service |
| `payment.payment.approved_by` | `security.app_user` | security-service |
| `payment.payment_receipt.uploaded_by` | `security.app_user` | security-service |
| `payment.payment_receipt.reviewed_by` | `security.app_user` | security-service |
| `promotion.booking_promotion.booking_id` | `booking.booking` | booking-service |
| `promotion.promotion_customer.customer_id` | `customer.customer` (table ready; the code does not use it yet) | customer-service |
| `promotion.promotion_customer.assigned_by` | `security.app_user` | security-service |
| `promotion.promotion_service.service_id` | `catalog.service` (table ready; the code does not use it yet) | booking-service |
