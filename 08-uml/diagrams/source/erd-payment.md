# ER — Schemas promotion and payment (payment-service, 12 tables)

Source: the Liquibase changelogs of `lavarapido-payment-service` on `origin/develop` (`16a6fac`, 2026-10-23), every changeset applied (last structural file: `021-promotion-one-per-booking.sql`). Each entity lists all its columns except the standard audit block, which is in the table under the diagram. Types are the SQL Server base type; lengths, precision and defaults are in `09-microservices/services/06-payment-service/data-model.md`. `PK`, `FK` and `UK` (unique, alone or filtered) are the database keys; "nullable" marks columns that accept NULL. One relationship per foreign key, labelled with its column.

```mermaid
erDiagram
    discount_type {
        smallint discount_type_id PK
        nvarchar code UK
        nvarchar name
        smallint display_order
        bit is_active
    }
    promotion {
        int promotion_id PK
        nvarchar code UK
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
    promotion_service {
        int promotion_service_id PK
        int promotion_id FK
        int service_id "catalog.service, no FK"
    }
    promotion_customer {
        bigint promotion_customer_id PK
        int promotion_id FK
        bigint customer_id "customer.customer, no FK"
        datetime2 assigned_at
        bigint assigned_by "nullable, security.app_user, no FK"
    }
    booking_promotion {
        bigint booking_promotion_id PK
        bigint booking_id UK "booking.booking, no FK"
        int promotion_id FK
        decimal applied_amount
    }
    payment_method_type {
        smallint payment_method_type_id PK
        nvarchar code UK
        nvarchar name
        bit requires_account
        bit requires_receipt
        smallint display_order
        bit is_active
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
    payment_status {
        smallint payment_status_id PK
        nvarchar code UK
        nvarchar name
        bit is_final
        smallint display_order
        bit is_active
    }
    payment {
        bigint payment_id PK
        bigint booking_id UK "unique among active rows, booking.booking, no FK"
        smallint payment_account_id FK
        smallint payment_status_id FK
        decimal amount
        datetime2 processed_at "nullable"
        bigint approved_by "nullable, security.app_user, no FK"
        nvarchar rejection_reason "nullable"
    }
    payment_receipt {
        bigint payment_receipt_id PK
        bigint payment_id FK
        nvarchar file_url
        nvarchar transaction_reference "nullable"
        decimal reported_amount "nullable"
        datetime2 uploaded_at
        bigint uploaded_by "security.app_user, no FK"
        datetime2 reviewed_at "nullable"
        bigint reviewed_by "nullable, security.app_user, no FK"
        nvarchar review_comment "nullable"
    }
    loyalty_movement_type {
        smallint loyalty_movement_type_id PK
        nvarchar code UK
        nvarchar name
        smallint sign
        smallint display_order
        bit is_active
    }
    loyalty_transaction {
        bigint loyalty_transaction_id PK
        bigint customer_id "security.app_user, no FK"
        smallint loyalty_movement_type_id FK
        bigint booking_id "nullable, booking.booking, no FK"
        int points
        int balance_after
        date expires_on "nullable"
        nvarchar description "nullable"
        int sequence_no
    }
    promotion }o--|| discount_type : "discount_type_id"
    promotion_service }o--|| promotion : "promotion_id"
    promotion_customer }o--|| promotion : "promotion_id"
    booking_promotion }o--|| promotion : "promotion_id"
    payment_account }o--|| payment_method_type : "payment_method_type_id"
    payment }o--|| payment_account : "payment_account_id"
    payment }o--|| payment_status : "payment_status_id"
    payment_receipt }o--|| payment : "payment_id"
    loyalty_transaction }o--|| loyalty_movement_type : "loyalty_movement_type_id"
```

## Audit columns

The standard block is `created_at`, `created_by`, `updated_at`, `updated_by`, `deleted_at`, `deleted_by`, `row_version` (`06-data/modeling-conventions.md`).

| Table | Audit columns |
|---|---|
| `promotion.discount_type` | all seven |
| `promotion.promotion` | all seven |
| `promotion.promotion_service` | all seven |
| `promotion.promotion_customer` | all seven |
| `promotion.booking_promotion` | all seven |
| `payment.payment_method_type` | all seven |
| `payment.payment_account` | all seven |
| `payment.payment_status` | all seven |
| `payment.payment` | all seven |
| `payment.payment_receipt` | all seven |
| `payment.loyalty_movement_type` | all seven |
| `payment.loyalty_transaction` | all seven |

## References to other services

They have no foreign key (ADR-003); the code keeps them consistent.

| Column | Points to | Owner |
|---|---|---|
| `promotion.promotion_service.service_id` | `catalog.service` | booking-service |
| `promotion.promotion_customer.customer_id` | `customer.customer` | customer-service |
| `promotion.promotion_customer.assigned_by` | `security.app_user` | security-service |
| `promotion.booking_promotion.booking_id` | `booking.booking` | booking-service |
| `payment.payment.booking_id` | `booking.booking` | booking-service |
| `payment.payment.approved_by` | `security.app_user` | security-service |
| `payment.payment_receipt.uploaded_by` | `security.app_user` | security-service |
| `payment.payment_receipt.reviewed_by` | `security.app_user` | security-service |
| `payment.loyalty_transaction.customer_id` | `security.app_user` (the client's user id, ADR-015) | security-service |
| `payment.loyalty_transaction.booking_id` | `booking.booking` | booking-service |
