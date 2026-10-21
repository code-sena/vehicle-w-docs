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

## Bookings nobody closed: the system only decides when it is sure

**Date:** 2026-10-21
**Context:** A booking whose client never came stayed `CONFIRMED` forever. The first version (same
day) closed every open booking as `NO_SHOW` one hour after its end. A review by the team found the
flaw: if the operator washed the car and forgot to press Start, the system recorded that the client
did not come, the service disappeared from the reports and the operator's numbers, and `NO_SHOW` is
final, so nobody could fix it.
**Decision:** booking-service cancels by itself only a `SCHEDULED` booking (reason `EXPIRED`, which
only the system uses). A `CONFIRMED` one is decided by operations-service, which knows the
assignments: without an operator it asks booking to make it `NO_SHOW` (`POST
/internal/v1/bookings/{id}/no-show`, `Booking.markUnattended` checks the margin again); with an
operator it goes to the admin's **To close** list, where the admin picks Attended or No-show. Paid
or not, nothing is refunded automatically.
**Consequences:** A forgotten Start no longer turns into a false no-show. Bookings with an operator
need one click from the admin, and the operator and the admins are notified so it happens the same
day. The hour of margin (`BOOKING_EXPIRY_GRACE_MINUTES`) is shared by both services.
