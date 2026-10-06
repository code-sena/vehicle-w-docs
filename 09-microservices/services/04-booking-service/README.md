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
  saved and up to 5 alternative times of the same day are returned (409 `SLOT_UNAVAILABLE`).
  A vehicle cannot hold two overlapping bookings. Clients can reschedule or cancel only before
  the start time (RF-007); the admin moves bookings through `IN_PROGRESS`, `COMPLETED`, `NO_SHOW`
  or `CANCELLED`.
- **Establishment:** the shop's public data (name, address, contact).
- Publish `BookingConfirmed` / `BookingCancelled` after commit.

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
| PUT · POST | `/api/v1/bookings/{id}` (reschedule) · `/bookings/{id}/cancel` | client |
| GET · POST | `/api/v1/admin/bookings` (`?from=&to=&status=`) | ADMIN |
| GET · PUT | `/api/v1/admin/bookings/{id}` | ADMIN |
| PATCH | `/api/v1/admin/bookings/{id}/status` | ADMIN |
| GET · POST · PUT · DELETE · PATCH | `/api/v1/admin/catalog/services[/{id}[/status]]` | ADMIN |
| PUT | `/api/v1/admin/schedule/business-hours` | ADMIN |
| POST · PUT · DELETE | `/api/v1/admin/schedule/exceptions[/{id}]` | ADMIN |
| GET · POST · PUT · DELETE | `/api/v1/admin/bays[/{id}]` | ADMIN |
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
