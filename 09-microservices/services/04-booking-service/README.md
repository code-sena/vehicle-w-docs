# Booking Service

> Owner of the **service catalog, the shop's schedule, the bays and the bookings**.
> It owns the `catalog` and `booking` schemas (ADR-009).

---

## Location in the architecture

| Field | Value |
|-------|-------|
| Number in catalog | 04 |
| Local port | 3003 |
| Repository | `lavarapido-booking-service` |
| Stack | Spring Boot 4 · Java 21 · Maven · hexagonal (ADR-007) |
| DB engine | SQL Server — schemas `catalog`, `booking` (Liquibase, changelog table `DATABASECHANGELOG_BOOKING`) |
| Communicates with | customer-service (REST, with the caller's token), RabbitMQ (publishes booking events) |
| Consumed by | Web, mobile, notification-service (through events) |

---

## Responsibilities (what this service DOES)

- **Catalog:** categories and services with a price and duration **per vehicle type**
  (`catalog.service_price`). Prices are immutable: changing one closes the current row and
  inserts a new one, so an existing booking keeps the price it was made with (INV-BOOK-008).
- **Schedule:** weekly business hours with an optional break (ADR-010), holidays and special
  days (`business_hour_exception`), and bays with status `ACTIVE` / `MAINTENANCE` / `INACTIVE`.
- **Availability (RF-006):** free start times of a day for a set of services and a vehicle type,
  on a 30-minute grid, inside the opening hours, outside the break, not in the past, and with at
  least one active bay free for the whole duration.
- **Bookings:** created already `CONFIRMED` with a bay when one is free; otherwise nothing is
  saved and up to 5 alternative times of the same day are returned (409 `SLOT_UNAVAILABLE`) with
  the `reason`: `CLOSED_DAY`, `OUTSIDE_HOURS`, `TIME_PASSED` or `NO_FREE_BAY`
  (`AvailabilityPolicy.whyUnavailable`). The code stays the same so older apps keep working.
  A vehicle cannot hold two overlapping bookings. A client can cancel their booking only before the
  start time (RF-007); the client is not asked for a reason, the booking stores `CUSTOMER_REQUEST`.
  The admin reschedules bookings (`PUT /admin/bookings/{id}`, CU29), books for a client, and moves
  bookings through `IN_PROGRESS`, `COMPLETED`, `NO_SHOW` or `CANCELLED` (choosing a reason from
  `cancellation_reason`; `CUSTOMER_REQUEST` when none is sent). The API also has a client reschedule
  (`PUT /bookings/{id}`), but the web and the app do not use it.
- **Schedule history:** every change of the weekly hours, exceptions and bays is recorded in
  `booking.schedule_history` (`GET /api/v1/admin/schedule/history`).
- **Establishment:** the shop's public data (name, address, contact).
- Publish `BookingConfirmed` / `BookingCancelled` after commit. A new booking may carry the client's
  `preferredOperatorId` (RF-010): it is not stored, it travels in the event for operations-service.
- **Internal routes (ADR-014 §10):** `GET /internal/v1/bookings?from=&to=` and `/internal/v1/bookings/{id}`
  for operations-service, only with `X-Internal-Key` (`INTERNAL_API_KEY`), not routed by the gateway.

## Out of scope (what it does NOT do)

- Does not store vehicles or personal data: it asks customer-service.
- Does not assign operators or track the wash itself (operations-service, :3004); it only exposes
  `/operator/bookings` so operations can read bookings and move them to `IN_PROGRESS` / `COMPLETED`.
- Does not charge or redeem points (payment-service, :3005); the points columns exist but stay 0.
- Does not send notifications: notification-service reacts to its events.

---

## Endpoints

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/catalog/categories` · `/catalog/services?vehicleTypeId=` | public |
| GET | `/api/v1/schedule/business-hours` · `/schedule/exceptions` · `/establishment` | public |
| GET | `/api/v1/bookings/availability?date=&vehicleTypeId=&serviceIds=` | token |
| POST | `/api/v1/bookings` | client |
| GET | `/api/v1/bookings/me` · `/bookings/{id}` · `/bookings/cancellation-reasons` | client |
| PUT · POST | `/api/v1/bookings/{id}` (reschedule, not used by the web or the app) · `/bookings/{id}/cancel` (no body needed, reason `CUSTOMER_REQUEST`) | client |
| GET · POST | `/api/v1/admin/bookings` (`?from=&to=&status=`) | ADMIN |
| GET | `/api/v1/admin/schedule/history` (changes of hours, exceptions and bays) | ADMIN |
| GET | `/api/v1/admin/bookings/day-summary` (`?date=`, default today in the shop zone): bookings of the day vs the day before, for the admin home | ADMIN |
| GET · PUT | `/api/v1/admin/bookings/{id}` | ADMIN |
| PATCH | `/api/v1/admin/bookings/{id}/status` | ADMIN |
| GET · POST · PUT · DELETE · PATCH | `/api/v1/admin/catalog/services[/{id}[/status]]` | ADMIN |
| PUT | `/api/v1/admin/schedule/business-hours` | ADMIN |
| POST · PUT · DELETE | `/api/v1/admin/schedule/exceptions[/{id}]` | ADMIN |
| GET · POST · PUT · DELETE | `/api/v1/admin/bays[/{id}]` | ADMIN |
| GET · PUT | `/api/v1/admin/establishment` (business data of Settings; the domain validates it) | ADMIN |
| GET | `/api/v1/operator/bookings` · `/operator/bookings/{id}` | OPERATOR, ADMIN (used by operations-service) |
| PATCH | `/api/v1/operator/bookings/{id}/status` | OPERATOR, ADMIN (used by operations-service) |

Full contract: [`07-api/contracts/openapi/booking-service.yaml`](../../../07-api/contracts/openapi/booking-service.yaml).
Dates are local shop dates (`yyyy-MM-dd`) and times `HH:mm` in `America/Bogota`; responses also
carry the UTC instants.

---

## How to run it locally

```bash
cd lavarapido-booking-service
./mvnw spring-boot:run           # http://localhost:3003 — Swagger: /swagger-ui.html (dev profile)
```

| Variable | Default | Purpose |
|---|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | — | SQL Server |
| `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE` | — | Verify tokens |
| `CUSTOMER_SERVICE_URL` | `http://localhost:3002/api/v1` | Vehicle ownership |
| `BOOKING_ZONE` | `America/Bogota` | Shop time zone |
| `BOOKING_SLOT_MINUTES` | `30` | Availability grid |
| `BOOKING_MAX_DAYS_AHEAD` | `60` | How far ahead clients can book |
| `MESSAGING_ENABLED`, `RABBITMQ_*` | `false` | Publish booking events |

---

## Related documents

- [data-model.md](./data-model.md) · [events.md](./events.md) · [decisions.md](./decisions.md) · [runbook.md](./runbook.md)
- ADR-009 (decomposition), ADR-010 (bay status, break, English status codes)
