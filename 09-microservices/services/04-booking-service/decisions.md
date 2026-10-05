# Technical decisions — Booking Service

## Bookings are confirmed immediately (RF-006)

**Decision:** If a bay is free for the whole duration the booking is saved as `CONFIRMED` with
that bay (lowest free bay number). If none is free, nothing is saved and the answer is 409
`SLOT_UNAVAILABLE` with up to 5 free times of the same day, closest first.

## Price frozen by reference

**Decision:** Each booking line points to the immutable `service_price` row. A price change
closes the row (`valid_to`) and inserts a new one; if the row was created the same day it is
soft-deleted instead (`valid_to > valid_from` constraint).
**Consequences:** Rescheduling keeps the original price of the services that stay.

## The schedule is locked while booking

**Decision:** Creating or rescheduling takes `sp_getapplock` on `booking-schedule` for the
transaction, then checks availability. Two clients asking for the same slot are served one after
the other. The `tr_booking_bay_overlap` trigger is the last safety net.

## Availability is computed in the backend

**Decision:** `AvailabilityPolicy` (pure domain code) returns the slots; the frontend only paints
them. Rules: 30-minute grid, inside the day's hours (exception overrides the weekly hours), not
crossing the break, not in the past (shop time zone), at least one active bay free.

## The JVM runs in UTC; the shop zone is applied explicitly

**Context:** With `hibernate.jdbc.time_zone=UTC`, `TIME` columns were shifted 5 hours when the JVM
ran in Colombian time.
**Decision:** `TimeZone.setDefault(UTC)` at startup; dates and times shown to people use
`BOOKING_ZONE` (`America/Bogota`).

## Booking code derived from the id

**Decision:** `RES-` + the zero-padded id (e.g. `RES-000123`); no extra column.
