# Data model — Booking Service

Schemas `catalog` and `booking` in `LavaRapido`. Base DDL: `lavarapido-6-services-sqlserver.sql`,
section 3 (11 tables), plus the ADR-010 changes below.

## Tables

| Table | Purpose |
|---|---|
| `catalog.service_category` | `LAVADO`, `POLICHADO`, `DETALLADO`, `INTERIOR`, `PAQUETES` (combos are services in "Paquetes", ADR-010) |
| `catalog.service` | Service without price (2NF): code, name, description, category, active |
| `catalog.service_price` | Price + estimated minutes per (service, vehicle type), `valid_from`/`valid_to`. **Immutable** (trigger `tr_service_price_immutable`) |
| `booking.establishment` | The shop (single row): contact data plus legal, tax and channel data edited in Settings (032) |
| `booking.business_hour` | One row per weekday (1 = Monday … 7 = Sunday), `is_active`, optional `break_starts_at`/`break_ends_at` |
| `booking.business_hour_exception` | Holiday (closed) or special day (other hours) |
| `booking.bay_status` | `ACTIVE`, `MAINTENANCE`, `INACTIVE` (ADR-010) |
| `booking.service_bay` | Bays with `bay_status_id` |
| `booking.booking_status` | `SCHEDULED`(1), `CONFIRMED`(2), `IN_PROGRESS`(3), `COMPLETED`(4), `CANCELLED`(5), `NO_SHOW`(6) |
| `booking.cancellation_reason` | Catalog of cancellation reasons |
| `booking.booking` | Vehicle, bay, start/end (UTC), status, who booked, reason, notes. No total column: it is computed from its lines |
| `booking.booking_service` | Booking lines; each points to the `service_price` row it was charged with |

Database safety nets:
- `tr_booking_bay_overlap`: two active bookings cannot overlap on the same bay.
- `ck_booking_cancel`: a cancellation reason only with status 5 (`CANCELLED`).
- `ux_service_price_current`: one current price per (service, vehicle type).
- `customer_vehicle_id` and `booked_by` point to other schemas without foreign keys (ADR-003).

## Differences with the base SQL script (ADR-010)

| Change | Why |
|---|---|
| New `booking.bay_status`; `service_bay.is_active` replaced by `bay_status_id` | A bay can be under maintenance |
| `business_hour.break_starts_at` / `break_ends_at` | Lunch break per day |
| Status codes in English | Single language in data; the frontend translates |

## Migrations

Liquibase, changelog table `DATABASECHANGELOG_BOOKING`:
`005-create-booking-schemas` (tables + triggers) · `018-booking-adr-010` ·
seeds `103-seed-catalog` (categories, BASIC/PREMIUM/FULL with prices for the 6 vehicle types),
`104-seed-booking-catalogs` (statuses, cancellation reasons), `109-seed-establishment-schedule`
(shop, weekly hours, 4 bays), `032-booking-establishment-business-data` (legal, tax and channel
columns of the shop) and `110-seed-establishment-business-data` (their example values).
