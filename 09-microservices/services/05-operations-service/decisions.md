# Technical decisions — Operations Service

## Operators are provisioned from security-service

**Decision:** The operator account (name, email, role) lives in security-service. The first time
an account with role `OPERATOR` is listed, or calls the service, a row is created in
`execution.operator`, the same way customer-service creates the client profile.
**Consequences:** There is no "create operator" endpoint here; the admin creates the account with
role `OPERATOR` in user management.

## One execution per booking line

**Decision:** Assigning a booking creates (or reassigns) one `service_execution` per booking line,
all with the same operator. The status the operator sees is that of the most delayed line.
Reassigning is only allowed while every line is `PENDING`.

## Assignment rules are pure domain code

**Decision:** `AssignmentPolicy` returns the blocking reason (`OPERATOR_INACTIVE`,
`OPERATOR_NOT_ON_SHIFT`, `OPERATOR_ABSENT`, `OPERATOR_BUSY`) or none. The same rules power the
assignment (409 with the reason) and the candidates list, so the admin sees in advance who can
take a booking.

## Assignments are serialized with a lock

**Date:** 2026-10-21
**Context:** The admin could assign by hand exactly while the automatic assignment chose the same
operator for another booking at the same time; both checks saw the operator free. Rare, but it would
leave one operator with two services at once.
**Decision:** `assign` and `autoAssign` take `sp_getapplock` on `operations-assignment` (transaction
owner, exclusive, 10 s) before reading the operator's other bookings, the same way booking-service
locks its schedule. The statement first reads one row of `execution.execution_status` so the
transaction is really open (the JDBC driver opens it at the first read; without it the lock is
refused with `-999`).
**Consequences:** Assignments run one after the other, which is negligible for the shop's volume.

## "Unassigned" is counted by operations

**Date:** 2026-10-21
**Context:** The admin home and the bookings screen counted the bookings without an operator each in
its own way, and the numbers did not match.
**Decision:** `GET /api/v1/admin/assignments/unassigned` returns the count and the ids with one rule:
`SCHEDULED` or `CONFIRMED`, end time still ahead, no execution line. The web uses it on both screens
and, only if operations does not answer, applies the same rule to the data it already has.

## A booking in the past cannot be assigned

**Decision:** Assigning answers 409 `BOOKING_IN_PAST` once the booking's end time has passed, so an
operator never gets a "new service" for a date that is already gone (ADR-014 §8).

## Booking status is moved by booking-service

**Decision:** Starting and finishing a service call booking-service
(`PATCH /operator/bookings/{id}/status`) with the operator's token; booking keeps ownership of the
booking status. A service can only be started from 15 minutes before the booking time
(`StartPolicy`, ADR-014 §6); before that the answer is 409 `SERVICE_TOO_EARLY`.

## Rating stored with the execution

**Decision:** The rating is a set of columns in `service_execution` (1–5, once, only when the
booking is `COMPLETED`). There is no separate rating table (`06-data/models.md`, decision 3).

## A booking with an operator is never closed as no-show by itself

**Date:** 2026-10-21
**Context:** An operator can attend a car and forget to press Start. Marking it `NO_SHOW` would tell
the client's history, the reports and the operator's metrics something false, and `NO_SHOW` is final.
**Decision:** `FollowUpPolicy` (pure domain code) sorts an ended booking: no operator → `NO_SHOW`
through booking-service; with an operator and not started, or started and not finished → the admin's
**To close** list plus one notice to the operator and the admins (`follow_up_notice_at`, migration
040; starting the service clears it, so a later "not finished" notice can still go out). The admin's
**Attended** completes the lines without start or end time instead of inventing them.
**Consequences:** No false no-shows. A service closed by the admin counts as done and as revenue but
not for punctuality or worked hours, which is the honest reading of what is known.

## Port variable

The port is read from `OPERATIONS_PORT` (default 3004), not from `PORT` like the other Java
services. Keep it in mind when overriding the port with an environment variable.
