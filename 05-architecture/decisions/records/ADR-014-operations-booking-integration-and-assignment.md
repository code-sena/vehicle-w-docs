# ADR-014 — Operations: Booking Integration by REST, Operator Provisioning and Manual Assignment

- **ID:** ADR-014
- **Date:** 2026-10-06 (updated 2026-10-09: sections 6 and 7)
- **Status:** Proposed — in use: operations-service is built this way
- **Authors:** Development team

---

## Context

`operations-service` owns the `execution` schema: operators, weekly shifts, absences, one
`service_execution` per booking line, and the client's rating (ADR-009). Everything it works on
belongs to other services:

- The **booking** (date, times, lines, status, owner) is owned by `booking-service`.
- The **operator account** (name, email, role `OPERATOR`) is owned by `security-service`.

`execution.service_execution.booking_service_id` and `execution.operator.user_id` are loose ids
without foreign keys (ADR-003). Three questions had to be answered:

1. How does operations read bookings, and who moves a booking to `IN_PROGRESS` / `COMPLETED`?
2. Where do operator rows come from, if accounts are created in security-service?
3. RF-008 asks for **automatic** assignment by availability. How is the operator chosen today?

**Known constraints:**
- No cross-schema reads or writes (ADR-003); only REST or events between services (ADR-004).
- booking-service is the only writer of `booking.booking` and its status.
- notification-service already listens for `execution.operator_assigned`,
  `execution.service_started` and `execution.service_completed`.

---

## Decision

### 1. Bookings are read and moved by REST to booking-service, with the caller's token

Like booking → customer (ADR-012), operations calls booking-service synchronously and forwards the
caller's JWT, so booking applies its own access rules:

| Caller | booking-service endpoint | Used for |
|---|---|---|
| Admin | `GET /admin/bookings/{id}`, `GET /admin/bookings?from=&to=` | Booking to assign, other bookings of the same day (busy operators), assignments list |
| Operator | `GET /operator/bookings/{id}`, `GET /operator/bookings` | The operator's services |
| Operator | `PATCH /operator/bookings/{id}/status` (`IN_PROGRESS`, `COMPLETED`) | Start and finish a service |
| Client | `GET /bookings/{id}`, `GET /bookings/me` | Rate only an own, `COMPLETED` booking |

booking-service exposes `/api/v1/operator/bookings/**` for this (roles `OPERATOR`, `ADMIN`).
Operations never stores a copy of the booking. If booking does not answer:
503 `BOOKING_SERVICE_UNAVAILABLE`.

### 2. Operator rows are provisioned from security-service

The admin creates the account with role `OPERATOR` in security-service. operations lists those
accounts with `GET /admin/users?role=OPERATOR` (admin's token) and creates the missing
`execution.operator` row the first time the account is listed, or the first time the operator
calls the service. Names and contact are always read from security, never stored.

### 3. Assignment is done by the administrator, with the rules in the domain

`AssignmentPolicy` (pure domain code) returns the reason that blocks an operator, or none:
`OPERATOR_INACTIVE`, `OPERATOR_NOT_ON_SHIFT`, `OPERATOR_ABSENT`, `OPERATOR_BUSY`.

- `GET /admin/assignments/{bookingId}/candidates` lists every operator with that reason, available
  ones first, so the admin sees in advance who can take the booking.
- `PUT /admin/assignments/{bookingId}` checks the same rules (409 with the reason) and creates one
  `service_execution` per booking line, all with the same operator. Only bookings `SCHEDULED` or
  `CONFIRMED` can be assigned; reassigning is allowed while every line is `PENDING`.
- Each assignment (and reassignment) publishes `OperatorAssigned`.

**Automatic assignment (RF-008) is deferred.** When it is built, it will consume
`booking.confirmed` and reuse `AssignmentPolicy` to pick the first candidate.

### 4. Execution and rating

- The operator starts a service only from 15 minutes before the booking time (section 6) and
  cannot run two at once; start and finish move the booking status in booking-service and publish
  `ServiceStarted` / `ServiceCompleted`.
- The client rates a `COMPLETED` booking once (1–5, comment up to 500); the rating is written on
  every line of the booking (`service_execution.quality_rating`), not in a separate table.

### 5. Configuration

| Variable | Default |
|---|---|
| `OPERATIONS_PORT` | `3004` |
| `BOOKING_SERVICE_URL`, `BOOKING_SERVICE_TIMEOUT` | `http://localhost:3003/api/v1`, `3s` |
| `SECURITY_SERVICE_URL`, `SECURITY_SERVICE_TIMEOUT` | `http://localhost:3001/api/v1`, `3s` |
| `SECURITY_INTERNAL_URL`, `INTERNAL_API_KEY` | `http://localhost:3001`, empty (section 7) |
| `BOOKING_ZONE` | `America/Bogota` |


### 6. Start window: from 15 minutes before the booking (added 2026-10-09)

**Problem:** an operator could start a booking of another day or of hours later. The booking showed
as "in progress" long before the car arrived, the timeline of the service was wrong and the client
still received the reminder "your booking is in 1 hour" for a service that had already started.

**Decision:** `StartPolicy` (pure domain code, `operations/domain/service`) allows the start only
from `scheduledStart - 15 min` (`EARLY_START`, in case the client arrives a little early). Before
that, `POST /operator/services/{bookingId}/start` answers 409 `SERVICE_TOO_EARLY`. Every
`OperatorServiceResponse` carries `startableAt` (UTC instant), so the web and the app disable the
"Start" button and show "you can start it from HH:mm" without repeating the rule.

### 7. First names in the ratings through the internal contact (added 2026-10-09)

**Problem:** the operator's ratings showed only the plate as "client", and the client's own ratings
showed no operator. Names live in security-service, and `GET /admin/users?role=OPERATOR` (section 2)
only answers to an administrator's token, so with the operator's or the client's token the names
came back empty.

**Decision:** operations reads the **first name** of the client and of the operator from
security-service's internal contact, `GET /internal/v1/users/{id}/contact`, with the shared key
`X-Internal-Key` (`INTERNAL_API_KEY`), the same endpoint notification-service uses (ADR-011 §8).
`RatingResponse` carries `operatorName` (what the client sees, "served by …") and `clientName` (what
the operator sees next to the plate). Each name is asked once per request, not once per rating.

- Only the first name: enough to recognise the person, without exposing more personal data.
- Without the key, or with security-service down, the names come empty and the screens fall back
  to the plate; the ratings are never blocked.
- New variables: `SECURITY_INTERNAL_URL` (default `http://localhost:3001`, outside `/api/v1` and not
  routed by the gateway) and `INTERNAL_API_KEY`.
---

## Evaluated alternatives

| Alternative | Pros | Cons | Reason for discarding |
|------------|------|------|-----------------------|
| REST with the caller's token — chosen | booking keeps its access rules and the status; no copied data | Operations fails when booking is down (503) | — (chosen) |
| Copy booking data into `execution` from `booking.confirmed` | Works when booking is down | Duplicated mutable data (reschedules, cancellations) that drifts | Same reasons as ADR-012 |
| Operations writes `booking.booking.status` directly | One call less | Breaks schema ownership (ADR-003) | Not allowed |
| Event `ServiceStarted` consumed by booking to move the status | Asynchronous, booking stays the writer | The operator would not see the new status in the same request; extra consumer in booking | Synchronous answer preferred for the operator screen |
| Automatic assignment now | Meets RF-008 | Needs a tie-breaker rule the requirements do not fix yet (`05-architecture/overview.md` §7) | Deferred; manual assignment covers the demo |
| Own operator table with name and email | No call to security | Duplicates identity data | security-service owns identity |

---

## Consequences

**Positive:**
- booking-service stays the only writer of the booking and its status.
- The assignment rules are tested without Spring or SQL Server (`AssignmentPolicyTest`).
- The admin screen shows why each operator is or is not available.

**Negative / Trade-offs:**
- Every assignment reads the whole day of bookings from booking-service (fine for one shop).
- If booking-service is down, the operator cannot start or finish a service.
- RF-008 (automatic) and RF-010 (client chooses the operator) are not covered yet.
- The port variable is `OPERATIONS_PORT`, not `PORT` like the other Java services.

**Impact on the system:**
- Affected services: operations-service, booking-service (`/operator/bookings`), security-service
  (`/admin/users?role=OPERATOR`), notification-service (consumes `execution.*`), api-gateway
  (route to `:3004`).
- Documents updated: `09-microservices/services/05-operations-service/`,
  `09-microservices/service-catalog.md`, `05-architecture/overview.md`,
  `04-requirements/traceability-matrix.md`.

---

## References

- ADR-003 (database strategy), ADR-004 (service communication), ADR-009 (service decomposition),
  ADR-012 (same REST pattern between booking and customer)
- `09-microservices/services/05-operations-service/README.md`, `events.md`, `decisions.md`
- `04-requirements/functional.md` — RF-008 to RF-012, RF-022
