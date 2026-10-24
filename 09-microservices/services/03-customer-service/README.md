# Customer Service

> Owner of the **client profile and the client's vehicles**. It owns the `customer` schema.

---

## Location in the architecture

| Field | Value |
|-------|-------|
| Number in catalog | 03 |
| Local port | 3002 |
| Repository | `lavarapido-customer-service` |
| Stack | Spring Boot 4 · Java 21 · Maven · hexagonal (ADR-007) |
| DB engine | SQL Server — schema `customer` (Liquibase, changelog table `DATABASECHANGELOG_CUSTOMER`) |
| Communicates with | security-service (`GET /users/me`), RabbitMQ (consumes `security.user_registered`) |
| Consumed by | Web, mobile, booking-service (vehicle ownership and type) |

---

## Responsibilities (what this service DOES)

- Create the client profile (`customer.customer`) when an account registers — from the
  `security.user_registered` event, or on the client's first request if the event never arrived
  (it reads `personId` from security-service with the client's own token).
- Register, edit, list and remove (soft delete) the client's vehicles. Since 2026-10-24 a vehicle with
  active bookings cannot be removed: customer asks booking `GET /internal/v1/bookings/active-count`
  (409 `VEHICLE_HAS_ACTIVE_BOOKINGS`; 503 `BOOKING_SERVICE_UNAVAILABLE` without the key or with booking
  down, BIZ-08). `/api/v1/vehicles/**` is for `CLIENT` only (BIZ-12), and a stored plate longer than
  the current rule no longer breaks the lists (E-16).
- Validate the plate format by vehicle type (car `ABC123`, motorcycle `ABC12D`) and keep plates
  unique among all active vehicles.
- Expose the vehicle-type catalog (`CAR`, `SEDAN`, `SUV`, `PICKUP`, `TRUCK`, `MOTO`).
- Let the administrator (and booking-service with the admin's token) look up vehicles by id or
  plate together with their owner's `userId`.

## Out of scope (what it does NOT do)

- Does not store personal data (name, email, phone): those live in `security.person`.
- Does not compute prices: `size_factor` is only a suggestion for the admin; prices live in
  `catalog.service_price` (booking-service).
- Does not hold the real loyalty balance: `loyalty_points` was planned as a display copy, but nothing
  updates it today; payment-service owns the ledger and answers the balance.

---

## Endpoints

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/vehicle-types` | public |
| GET · POST | `/api/v1/vehicles` | client token (own vehicles only) |
| GET · PUT · DELETE | `/api/v1/vehicles/{id}` | client token — another client's vehicle is 404 |
| GET | `/api/v1/admin/vehicles?ids=1,2` or `?plate=ABC123` | ADMIN or OPERATOR — vehicle + `ownerUserId` |

Full contract: [`07-api/contracts/openapi/customer-service.yaml`](../../../07-api/contracts/openapi/customer-service.yaml).

---

## How to run it locally

```bash
cd lavarapido-customer-service
./mvnw spring-boot:run           # http://localhost:3002 — Swagger: /swagger-ui.html (dev profile)
./mvnw verify                    # 82 tests (CI run of 2026-10-24), no database needed
```

| Variable | Purpose |
|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | SQL Server connection |
| `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE` | Verify tokens (same values as security-service) |
| `SECURITY_SERVICE_URL` | Default `http://localhost:3001/api/v1` |
| `MESSAGING_ENABLED`, `RABBITMQ_*` | Consume `security.user_registered` |
| `BOOKING_SERVICE_URL`, `BOOKING_SERVICE_TIMEOUT`, `INTERNAL_API_KEY` | Root of booking-service (default `http://localhost:3003`), `3s`, and the shared key, to check active bookings before removing a vehicle (BIZ-08) |

---

## Related documents

- [data-model.md](./data-model.md) · [events.md](./events.md) · [decisions.md](./decisions.md) · [runbook.md](./runbook.md)
