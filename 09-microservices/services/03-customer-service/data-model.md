# Data model — Customer Service

Schema `customer` in `LavaRapido` (ADR-003/ADR-009). Full DDL: `lavarapido-6-services-sqlserver.sql`, section 2.

## Tables

| Table | Purpose |
|---|---|
| `customer.vehicle_type` | 6 fixed types (ids 1–6: `CAR`, `SEDAN`, `SUV`, `PICKUP`, `TRUCK`, `MOTO`) with `size_factor` (0.80–1.35, a suggestion for pricing) |
| `customer.customer` | Client profile: `person_id` (unique), `user_id` (unique, the JWT `sub`), display `loyalty_points`, `customer_since` |
| `customer.customer_vehicle` | Vehicle: plate (stored clean and upper-case), type, brand, model, color; soft delete with `deleted_at` |

Rules enforced by the database:
- `ux_customer_vehicle_plate_active`: the plate is unique **only among active vehicles**, so a
  removed vehicle's plate can be registered again.
- `person_id` and `user_id` point to the `security` schema without foreign keys (ADR-003).

## Migrations

Liquibase, changelog table `DATABASECHANGELOG_CUSTOMER`:

| Changeset | What |
|---|---|
| `004-create-customer-schema` | Schema and the 3 tables + update triggers (`updated_at`, `row_version`) |
| `014-add-customer-user-id` | `customer.user_id` + unique index (lookup by the token's user id) |
| `015-add-customer-vehicle-model` | `model` column (ADR-010) |
| seed `102-seed-customer-catalogs` | The 6 vehicle types with fixed ids |
