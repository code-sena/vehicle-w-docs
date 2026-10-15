# Operations Service

> Owner of the **operators, their shifts and absences, the assignment of an operator to a booking,
> the execution of the wash and the client's rating**. It owns the `execution` schema (ADR-009).

---

## Location in the architecture

| Field | Value |
|-------|-------|
| Number in catalog | 05 |
| Local port | 3004 (`OPERATIONS_PORT`) |
| Repository | `lavarapido-operations-service` |
| Stack | Spring Boot 4 · Java 21 · Maven · hexagonal (ADR-007) |
| DB engine | SQL Server — schema `execution` (Liquibase, changelog table `DATABASECHANGELOG_OPERATIONS`) |
| Communicates with | booking-service (REST, with the caller's token), security-service (REST: admin token for operators, internal key for first names in ratings), RabbitMQ (publishes execution events) |
| Consumed by | Web, mobile, notification-service (through events) |

---

## Responsibilities (what this service DOES)

- **Operators:** every account with role `OPERATOR` in security-service gets a row in
  `execution.operator` the first time it is listed or calls the service. The admin can activate
  or deactivate it.
- **Shifts and absences:** one weekly shift per day (`operator_availability`, replaced as a whole)
  and dated absences (`operator_absence`) that cannot overlap.
- **Assignment (RF-008/009):** the admin assigns or changes the operator of a booking while it is
  `SCHEDULED` or `CONFIRMED` and its time has not passed (409 `BOOKING_IN_PAST`, ADR-014 §8). `AssignmentPolicy` checks: operator active, on shift for the whole
  booking, not absent, and not busy with another booking at the same time. The candidates endpoint
  returns every operator with the reason that blocks them, if any.
- **Execution (RF-010/011):** the operator starts the service only from 15 minutes before the
  booking time (`StartPolicy`, 409 `SERVICE_TOO_EARLY`; each service carries `startableAt` for the
  screens) and finishes it; the service moves the booking to `IN_PROGRESS` / `COMPLETED` in booking-service. An operator
  cannot run two services at once.
- **Ratings (RF-012):** the client rates a completed booking once (1 to 5 stars, comment up to 500
  characters); the operator sees their ratings and the average. Each rating carries the client's
  and the operator's first name (security-service internal contact, ADR-014 §7).
- **Operator metrics (RF-023):** for a week (Monday to Sunday) the admin sees how many bookings the
  operator finished and the change against the previous week, punctuality (started at most 10 minutes
  after the booked time; EXCELLENT ≥ 90 %, GOOD ≥ 70 %), revenue of the finished bookings, worked hours
  (start to finish) against the hours of the weekly shift, and occupancy. `OperatorMetricsCalculator`
  is pure domain code; it counts per booking, not per service line, and returns `null` instead of
  inventing a value (no previous week, nothing started, no shift). No table of its own: it reads the
  executions and the bookings it already has.
- **Automatic assignment (RF-008, ADR-014 §10):** on `booking.confirmed` the booking gets the operator
  the client chose (RF-010) if still free, otherwise the free one with the fewest bookings that day.
  Reads the booking through booking-service's internal routes (`INTERNAL_API_KEY`); skips accounts
  disabled in security. `AUTO_ASSIGN_ENABLED=false` leaves it to the admin.
- **Free operators for the client (RF-010):** `GET /api/v1/operators/available` with only the first name
  and the rating. The client also sees who serves each of their bookings (`GET /api/v1/operators/my-bookings`,
  first name only, bookings that already have an operator).
- **Operator profile:** the admin edits the specialty and up to 10 skills, each `CERTIFIED`, `EXPERT` or
  `ADVANCED` (`operator_profile`, `operator_skill`, migration 037). Saving replaces the whole list.
- **Vehicle inspection report (ADR-014 §9):** for bookings of 3 hours or more the admin records 5
  phases with findings and photos, publishes the report and shares it with the client. The public
  link (`/report/{token}`) needs no session. Sharing publishes `InspectionShared`; notification-service
  writes the notice with the link.
- **Team summary:** for the operators list, `TeamSummaryCalculator` adds up the team: operators and
  active ones, available today (active, on shift today and with no absence touching the day), absent
  today, bookings finished this week with the change against the previous week, and the weighted average
  rating. The screens only show it.
- Publish `OperatorAssigned`, `ServiceStarted`, `ServiceCompleted` after commit.

## Out of scope (what it does NOT do)

- Does not store bookings, bays or prices: it reads them from booking-service.
- Does not create accounts or store names: names and contact come from security-service.
- Does not charge (payment-service) or send notifications (notification-service reacts to its events).

---

## Endpoints

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/admin/operators` | ADMIN |
| PATCH | `/api/v1/admin/operators/{id}/status` | ADMIN |
| GET | `/api/v1/admin/operators/summary` (`?week=`, default this week) | ADMIN |
| GET | `/api/v1/admin/operators/{id}/metrics` (`?week=` any date of the week, default this week) | ADMIN |
| GET | `/api/v1/admin/operators/profiles` (specialty and skills of every operator) | ADMIN |
| PUT | `/api/v1/admin/operators/{id}/profile` (`specialty`, `skills[{name, level}]`; replaces the list) | ADMIN |
| PUT | `/api/v1/admin/operators/{id}/availability` (whole week) | ADMIN |
| GET · POST | `/api/v1/admin/operators/{id}/absences` (`?from=&to=`) | ADMIN |
| DELETE | `/api/v1/admin/operators/{id}/absences/{absenceId}` | ADMIN |
| GET | `/api/v1/admin/assignments` (`?from=&to=`, default today) | ADMIN |
| PUT | `/api/v1/admin/assignments/{bookingId}` | ADMIN |
| GET | `/api/v1/admin/assignments/{bookingId}/candidates` | ADMIN |
| GET · POST | `/api/v1/admin/inspections/{bookingId}` (state · start) | ADMIN |
| PATCH | `/api/v1/admin/inspections/{bookingId}/phases/{phase}` | ADMIN |
| POST · DELETE | `/api/v1/admin/inspections/{bookingId}/findings[/{findingId}]` (multipart, up to 5 photos) | ADMIN |
| POST | `/api/v1/admin/inspections/{bookingId}/publish` · `/share` | ADMIN |
| GET | `/api/v1/admin/inspections/{bookingId}/photos/{photoId}` | ADMIN |
| GET | `/api/v1/public/inspections/{token}` · `/public/inspections/{token}/photos/{photoId}` | public (published reports only) |
| GET | `/api/v1/operators/available` (`?date=&time=HH:mm&minutes=`) | any signed-in user |
| GET | `/api/v1/operators/my-bookings` (operator first name per booking) | CLIENT |
| GET | `/api/v1/operator/services` (`?from=&to=`, default today) | OPERATOR |
| POST | `/api/v1/operator/services/{bookingId}/start` · `/finish` | OPERATOR |
| GET | `/api/v1/operator/ratings` | OPERATOR |
| GET | `/api/v1/ratings/me` | CLIENT |
| POST | `/api/v1/ratings/{bookingId}` | CLIENT |

Through the gateway these paths are routed to `:3004` (`ROUTE_OPERATIONS_URL`).
Full contract: [`07-api/contracts/openapi/operations-service.yaml`](../../../07-api/contracts/openapi/operations-service.yaml)
(Swagger UI in the `dev` profile: `/swagger-ui.html`).

---

## How to run it locally

```bash
cd lavarapido-operations-service
./mvnw spring-boot:run           # http://localhost:3004 — Swagger: /swagger-ui.html (dev profile)
```

| Variable | Default | Purpose |
|---|---|---|
| `OPERATIONS_PORT` | `3004` | HTTP port (note: not `PORT` like the other Java services) |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | — | SQL Server |
| `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE` | — | Verify tokens |
| `BOOKING_SERVICE_URL` | `http://localhost:3003/api/v1` | Read bookings and move their status |
| `SECURITY_SERVICE_URL` | `http://localhost:3001/api/v1` | Operator names (`/admin/users?role=OPERATOR`) |
| `SECURITY_INTERNAL_URL` | `http://localhost:3001` | Internal contact for first names in ratings (not routed by the gateway) |
| `INTERNAL_API_KEY` | empty | Shared key for `/internal/**`; empty = ratings without names |
| `BOOKING_SERVICE_TIMEOUT`, `SECURITY_SERVICE_TIMEOUT` | `3s` | REST timeouts |
| `BOOKING_ZONE` | `America/Bogota` | Shifts, absences and dates are read in this zone |
| `MESSAGING_ENABLED`, `RABBITMQ_*` | `false` | Publish execution events |

---

## Related documents

- [data-model.md](./data-model.md) · [events.md](./events.md) · [decisions.md](./decisions.md) · [runbook.md](./runbook.md)
- ADR-014 (booking integration, operator provisioning, manual assignment), ADR-004 (communication), ADR-009 (decomposition)
