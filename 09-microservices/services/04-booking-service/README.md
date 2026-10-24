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
  (`PUT /bookings/{id}`): since 2026-10-24 the client can only change the date and time; other services
  answer 409 `BOOKING_SERVICES_LOCKED` (BIZ-01). The admin can still change the services.
- **Since 2026-10-24:** a service price must be greater than 0 (400 `INVALID_PRICE`, CHECK of migration
  044, BIZ-04); `@Version` on `row_version` plus the trigger fix of migration 045 give optimistic locking
  (stale version → 409 `CONFLICT`, BIZ-09); a frozen price is kept only for the same vehicle type
  (BIZ-06); weekly hours, exceptions and bay states that leave active bookings outside answer 409
  `SCHEDULE_CONFLICTS_BOOKINGS` with `conflictingBookings` and `bookingCodes` (BIZ-10); a 4xx from
  customer keeps its code and a database outage answers 503 `BOOKING_SERVICE_UNAVAILABLE` (BIZ-13);
  `/api/v1/bookings/**` is for `CLIENT` only, except `availability` and `cancellation-reasons`, also open
  to ADMIN (BIZ-12); seed 113 clears the sample "Express Car Wash" data (E-19).
- **Expired bookings:** booking's own expiry job (`ExpiredBookingsJob`, `closeExpired`) was removed on
  2026-10-24 (B-07). A booking is never closed by booking itself: operations-service knows whether it had an operator and, only when it never had
  one, asks `POST /internal/v1/bookings/{id}/no-show`; booking checks the margin again (409
  `BOOKING_NOT_EXPIRED` otherwise). A booking with an operator is resolved by the admin.
- The operator's lists (`/operator/bookings`) leave out cancelled and no-show bookings.
- **Schedule history:** every change of the weekly hours, exceptions and bays is recorded in
  `booking.schedule_history` (`GET /api/v1/admin/schedule/history`).
- **Establishment:** the shop's public data (name, address, contact).
- Publish `BookingConfirmed` / `BookingCancelled` (with `reasonCode`) / `BookingStatusChanged` after commit. A new booking may carry the client's
  `preferredOperatorId` (RF-010): it is not stored, it travels in the event for operations-service.
- **Internal routes (ADR-014 §10):** `GET /internal/v1/bookings?from=&to=` and `/internal/v1/bookings/{id}`
  for operations-service, and `GET /internal/v1/bookings/active-count?customerVehicleId=` for
  customer-service (BIZ-08), only with `X-Internal-Key` (`INTERNAL_API_KEY`), not routed by the gateway.

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
| GET | `/api/v1/bookings/availability?date=&vehicleTypeId=&serviceIds=` | CLIENT, ADMIN (BIZ-12: OPERATOR gets 403) |
| POST | `/api/v1/bookings` | CLIENT only (403 for ADMIN and OPERATOR since BIZ-12) |
| GET | `/api/v1/bookings/me` · `/bookings/{id}` | CLIENT only |
| GET | `/api/v1/bookings/cancellation-reasons` | CLIENT, ADMIN (the admin booking form uses it) |
| PUT · POST | `/api/v1/bookings/{id}` (reschedule, not used by the web or the app) · `/bookings/{id}/cancel` (no body needed, reason `CUSTOMER_REQUEST`) | client |
| GET · POST | `/api/v1/admin/bookings` (`?from=&to=&status=`) | ADMIN |
| POST | `/internal/v1/bookings/{id}/no-show` (a confirmed booking past its end and margin that never had an operator) | internal key (operations-service) |
| GET | `/internal/v1/bookings/active-count?customerVehicleId=` (active bookings of a vehicle, BIZ-08) | internal key (customer-service) |
| GET | `/api/v1/admin/schedule/history` (changes of hours, exceptions and bays) | ADMIN |
| GET | `/api/v1/admin/bookings/day-summary` (`?date=`, default today in the shop zone): bookings of the day vs the day before, for the admin home | ADMIN |
| GET · PUT | `/api/v1/admin/bookings/{id}` | ADMIN |
| PATCH | `/api/v1/admin/bookings/{id}/status` | ADMIN |
| GET · POST · PUT · DELETE · PATCH | `/api/v1/admin/catalog/services[/{id}[/status]]` | ADMIN |
| PUT | `/api/v1/admin/schedule/business-hours` | ADMIN |
| POST · PUT · DELETE | `/api/v1/admin/schedule/exceptions[/{id}]` | ADMIN |
| GET · POST · PUT · DELETE | `/api/v1/admin/bays[/{id}]` | ADMIN |
| GET · PUT | `/api/v1/admin/establishment` (business data of Settings; the domain validates it) | ADMIN |
| GET | `/api/v1/operator/bookings` · `/operator/bookings/{id}` | OPERATOR, ADMIN **and** `X-Internal-Key`: only operations-service calls them, the gateway does not route them (E-01) |
| PATCH | `/api/v1/operator/bookings/{id}/status` | OPERATOR, ADMIN **and** `X-Internal-Key` (only operations-service, E-01) |

Full contract: [`07-api/contracts/openapi/booking-service.yaml`](../../../07-api/contracts/openapi/booking-service.yaml).
Dates are local shop dates (`yyyy-MM-dd`) and times `HH:mm` in `America/Bogota`; responses also
carry the UTC instants.

---

## How to run it locally

```bash
cd lavarapido-booking-service
./mvnw spring-boot:run           # http://localhost:3003 — Swagger: /swagger-ui.html (dev profile)
./mvnw verify                    # 95 tests (CI run of 2026-10-24), no database needed
```

| Variable | Default | Purpose |
|---|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | — | SQL Server |
| `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE` | — | Verify tokens |
| `CUSTOMER_SERVICE_URL` | `http://localhost:3002/api/v1` | Vehicle ownership |
| `BOOKING_ZONE` | `America/Bogota` | Shop time zone |
| `BOOKING_SLOT_MINUTES` | `30` | Availability grid |
| `BOOKING_MAX_DAYS_AHEAD` | `60` | How far ahead clients can book |
| `BOOKING_EXPIRY_GRACE_MINUTES` | `60` | How long after its end a booking without operator can become no-show (operations-service reads the same variable). `BOOKING_EXPIRY_CHECK_ENABLED` and `BOOKING_EXPIRY_CHECK_INTERVAL` no longer exist (B-07) |
| `MESSAGING_ENABLED`, `RABBITMQ_*` | `false` | Publish booking events |

---

## Related documents

- [data-model.md](./data-model.md) · [events.md](./events.md) · [decisions.md](./decisions.md) · [runbook.md](./runbook.md)
- ADR-009 (decomposition), ADR-010 (bay status, break, English status codes)
