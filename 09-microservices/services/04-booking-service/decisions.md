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

The JDBC driver opens the SQL Server transaction only at the first read, so a lock requested first
was refused (`-999`, no transaction yet). Since 2026-10-21 the lock statement reads one row of
`booking.booking_status` before `sp_getapplock`. `BEGIN TRANSACTION` was not used because in that
mode it leaves an extra transaction level open after the commit.

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

## Bookings nobody closed are closed by the system

**Date:** 2026-10-21
**Context:** A booking whose client never came stayed `CONFIRMED` forever. It kept counting as
"unassigned" on the admin screens and, while open, the operator and the bay looked busy.
**Decision:** A scheduled job (`ExpiredBookingsJob`, every 5 minutes) closes the bookings still
`SCHEDULED` or `CONFIRMED` one hour after their end (`BOOKING_EXPIRY_GRACE_MINUTES`). `CONFIRMED`
becomes `NO_SHOW`, even if it was paid (refunds stay a decision of the admin). `SCHEDULED` is
cancelled with the reason `EXPIRED` (`Venció sin confirmarse`), which only the system uses. The job
takes the schedule lock and logs a warning if a run fails; the next run tries again.
**Consequences:** The hour of margin leaves time for a late client or an operator who finishes late.
The operator is free again because operations only blocks an operator by overlapping times.
