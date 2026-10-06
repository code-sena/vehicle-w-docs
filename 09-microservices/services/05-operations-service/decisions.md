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

## Booking status is moved by booking-service

**Decision:** Starting and finishing a service call booking-service
(`PATCH /operator/bookings/{id}/status`) with the operator's token; booking keeps ownership of the
booking status. A service can only be started on its booking day (shop time zone).

## Rating stored with the execution

**Decision:** The rating is a set of columns in `service_execution` (1–5, once, only when the
booking is `COMPLETED`). There is no separate rating table (`06-data/models.md`, decision 3).

## Port variable

The port is read from `OPERATIONS_PORT` (default 3004), not from `PORT` like the other Java
services. Keep it in mind when overriding the port with an environment variable.
