# ADR-014 — Operations: Booking Integration by REST, Operator Provisioning and Manual Assignment

- **ID:** ADR-014
- **Date:** 2026-10-06 (updated 2026-10-09: sections 6 to 8; 2026-10-14: sections 9 and 10; 2026-10-23: section 11)
- **Status:** Accepted (2026-10-23) — operations-service is built this way and released in `v1.0.0`
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

*Update 2026-10-23 (E-01):* those operator routes also require `X-Internal-Key`, and the gateway no
longer routes them, so only operations-service — which checks the assignment and the start window —
can move a booking forward. Without `INTERNAL_API_KEY` the operator cannot start or finish (503).

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
`booking.confirmed` and reuse `AssignmentPolicy` to pick the first candidate. *(Built on 2026-10-14,
section 10.)*

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

### 8. A booking whose time has passed cannot be assigned (added 2026-10-09)

**Problem:** a booking that nobody started or closed stays `CONFIRMED` after its date. The admin
could still assign it, and the operator received "new service assigned for 02/10" a week later.

**Decision:** `PUT /admin/assignments/{bookingId}` answers 409 `BOOKING_IN_PAST` when the booking's
end time has already passed (`scheduledEnd <= now`). A booking that is running right now can still be
assigned. The screens translate the code and tell the admin to mark it as no-show or cancel it.
Closing old bookings automatically (no-show) is a pending improvement. *(Built on 2026-10-21,
section 11.)*

### 9. The vehicle inspection report lives in operations-service (added 2026-10-14)

**Problem:** the inspection report of long services (phases, findings and photos) was kept in the
administrator's browser (localStorage and IndexedDB). The public link only opened in that browser,
the client could only get a text summary, and the rules (which bookings allow a report, when it can
be edited, the summary) were written in the web screen.

**Decision:** an `InspectionReport` aggregate in operations-service, next to the execution of the
same booking. Migration 033 adds `inspection_report`, `inspection_phase`, `inspection_finding` and
`inspection_photo` (photos as `VARBINARY`, JPEG or PNG up to 2 MB, at most 5 per finding).

- The aggregate owns the rules: only bookings of 180 minutes or more that are confirmed, in progress
  or completed; it is edited only while the booking is confirmed or in progress (409
  `INSPECTION_NOT_EDITABLE`); a finding on a pending phase moves it to in progress; the summary and the
  masked plate of the public link are computed here.
- The booking status comes from booking-service with the admin's token, as for assignments (§1).
- The public link uses a random 32-byte token. `GET /api/v1/public/inspections/{token}` and its
  photos need no session and answer 404 while the report is not published; a photo is only served
  through the report it belongs to.
- **Notify the client:** `POST /admin/inspections/{bookingId}/share` (published report only) publishes
  `InspectionShared` (`execution.inspection_shared`) with the summary and the token. notification-service
  writes the `INSPECTION_REPORT` notice (inbox, push and email) with the public link
  (`WEB_URL` + `/report/{token}`). The text is no longer built by the web screen.

**Consequences:** the link works from any device; reports created before this change stay only in
the browser that created them (they were never on a server). Photos make the database grow: about
200 KB each after the screen compresses them.

### 10. Automatic assignment and the client's choice of operator (added 2026-10-14)

**Problem:** RF-008 asks the system to assign an operator by availability and RF-010 lets the client
choose one. Every booking waited for the administrator, and operations only read bookings with the
token of the user calling it — a `booking.confirmed` event has no user behind it.

**Decision:**

- **Service-to-service reads:** booking-service exposes `GET /internal/v1/bookings?from=&to=` and
  `GET /internal/v1/bookings/{id}`, outside `/api/v1` (the gateway does not route them) and protected
  by the shared key `X-Internal-Key` (`INTERNAL_API_KEY`), the same mechanism as security-service
  (ADR-011 §8). They return the booking without vehicle data, so customer-service is not called.
- **RF-008:** operations consumes `booking.confirmed` (queue `operations-service.events`). If the
  booking has no operator yet, it keeps the operators that `AssignmentPolicy` allows (active, on shift,
  not absent, not busy) whose security account is still active, and `AutoAssignmentPolicy` picks the
  client's choice if it is among them, otherwise the one with the fewest bookings that day, then the
  lowest id. It then publishes `OperatorAssigned` as the admin assignment does. A rescheduled booking
  keeps its operator. If nobody is free nothing is assigned and the "booking without operator" alert
  (ADR-011 §14) still warns the admins. `AUTO_ASSIGN_ENABLED=false` turns it off.
- **RF-010:** `GET /api/v1/operators/available?date=&time=&minutes=` lists, for any signed-in user, the
  operators free for that slot with only their first name and rating. The client sends
  `preferredOperatorId` when creating the booking; booking-service does not store it, it travels in
  `BookingConfirmed` and operations honours it only if that operator is still free.
- The administrator can still change the operator as before (§1).

**Consequences:** most bookings get an operator without the admin; the listener never retries
forever (it logs and leaves the booking unassigned); without `INTERNAL_API_KEY` there is no automatic
assignment nor list of free operators.

### 11. Bookings nobody closed, assignment notes and account checks (added 2026-10-23)

**Problem:** a booking can end without anybody registering it: nobody was assigned, or the operator
worked and forgot "Iniciar"/"Terminar". It stayed `CONFIRMED` or `IN_PROGRESS` for ever and the
reminders and dashboards were wrong.

**Decision (follow-up job, `FollowUpService`, every `FOLLOW_UP_INTERVAL` = 5 min):**

- It reviews the bookings of the last `FOLLOW_UP_LOOK_BACK_DAYS` (28) days. `FollowUpPolicy` gives one
  of three reasons: `NO_OPERATOR` (confirmed, no operator, end + `BOOKING_EXPIRY_GRACE_MINUTES` (60)
  passed), `NOT_STARTED` (with operator, never started, its end time passed) or `NOT_FINISHED` (started,
  never finished, end + margin passed).
- `NO_OPERATOR`: nobody could attend it, so operations closes it as no-show through booking's
  `POST /internal/v1/bookings/{id}/no-show` (`X-Internal-Key`).
- With an operator it is **never** closed alone: the operator may have washed the car. Operations
  publishes `ServiceNotStarted` or `ServiceNotFinished` once per booking (`follow_up_notice_at`,
  migration 040) and notification warns the operator and every administrator.
- The administrator sees them in `GET /api/v1/admin/assignments/to-close` ("Por cerrar") and closes one
  as attended with `POST /api/v1/admin/assignments/{bookingId}/attended`, which moves booking to
  `COMPLETED` step by step without `ServiceCompleted` (the client would get "pick it up" hours later);
  anything else answers 409 `BOOKING_NOT_TO_CLOSE`. Or the admin marks it no-show from the bookings
  screen.
- 28 days because the VM can stay off for weeks; the web loads 30 days and the mobile 29, so the
  card always shows them.

**Other rules added on 2026-10-23:**

| Change | Rule |
|---|---|
| Assignment notes (B-01) | `PUT /admin/assignments/{bookingId}` accepts optional `notes` (≤ 300 characters, else 400 `INVALID_ASSIGNMENT_NOTES`), stored in `service_execution.assignment_notes` (migration 042). Reassigning without notes clears them. The operator's list (`OperatorServiceResponse`) does not return them yet |
| Disabled account (A-13) | A manual assignment to an operator whose security account is disabled answers 409 `OPERATOR_ACCOUNT_DISABLED`, and the candidates list shows that reason. If security does not answer, the account is taken as active |
| Reschedule (E-12) | The automatic assignment keeps the previous operator only if they still fit the new time (shift, absences, overlaps, active account); otherwise it picks a free one. With nobody free the booking keeps the previous operator |
| Concurrency | Manual and automatic assignment take `sp_getapplock`; if another assignment holds it, 409 `ASSIGNMENT_BUSY` ("try again") |

**Known gaps (2026-10-23):** `finish` and `start` call booking before saving their own row, so a
failure between both leaves booking `COMPLETED` and the line `IN_PROGRESS` (OPS-01); start, finish and
rating do not take the assignment lock (OPS-03). Both are in `15-project-control/risks.md`.
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
- ~~RF-008 (automatic) and RF-010 (client chooses the operator) are not covered yet.~~ Covered since
  2026-10-14 (section 10).
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
