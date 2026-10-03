# ADR-012 — Booking: Vehicle Resolution by REST to Customer Service

- **ID:** ADR-012
- **Date:** 2026-10-02
- **Status:** Accepted
- **Authors:** Development team

---

## Context

`booking-service` stores the customer's vehicle on each booking, but only as a loose column:
`booking.customer_vehicle_id` (ADR-009, ADR-010). It never stores a copy of the vehicle data,
because the vehicle is owned by `customer-service` and the single-schema-ownership rule forbids
cross-schema foreign keys and duplicated mutable data.

That loose id creates an open question: **how does booking get the vehicle data it needs?**

The booking flow needs three things at different moments:

1. **At creation** (`POST /api/v1/bookings`): the `vehicleTypeId` of the vehicle, to look up the
   current prices of the requested services (`RF-006`) and to decide whether the caller may book
   *that* vehicle.
2. **At creation** (`POST /api/v1/admin/bookings`): the same `vehicleTypeId` for an admin, who
   books on behalf of any client (the vehicle is not the admin's).
3. **At read** (`GET /api/v1/bookings/me`, `GET /api/v1/admin/bookings`): the vehicle fields that
   `BookingResponse` shows (`licensePlate`, `licensePlateFormatted`, `vehicleType`, `brand`,
   `model`, ...), per booking.

A second question is who owns the booking: the model stores `booked_by` (the `user_id` that
created it) but **not** the owner of the vehicle (`ownerUserId`) — that id is only known by
`customer-service`. The frontend shows "my bookings" to the client = `booked_by == caller`; the
admin panel shows the owner id per booking.

**Known constraints:**
- `customer-service` owns `customer.customer_vehicle`; booking must not read it directly
  (ADR-003).
- Vehicles are private: a client must not see or book another client's vehicle; the ownership
  check cannot live in booking because booking has no vehicle data.
- Everything runs with a single JWT per request; `X-Correlation-Id` spans services so a request
  can be traced in logs (cross-cutting.md §4, ADR-005).
- Events are the preferred path for async knowledge (ADR-004), but booking needs the vehicle
  *synchronously* inside the create request (pricing depends on it), so an event would only
  delay the decision, not answer it.

---

## Decision

### 1. Booking resolves the vehicle by synchronous REST call to customer-service

`booking-service` implements a `CustomerDirectory` port with a REST client adapter
(`CustomerServiceDirectory`) that calls the customer-service API, always re-forwarding the
caller's Bearer token (taken from `SecurityContextHolder`):

| Port method | Endpoint called on customer-service | Used by |
|---|---|---|
| `ownVehicle(vehicleId)` | `GET /api/v1/vehicles/{id}` (authenticated as the caller) | client create/read; **404 → `Optional.empty()`** and the booking flow answers `404 VEHICLE_NOT_FOUND` (the vehicle does not exist **or** belongs to another client — same response on purpose, to avoid leaking vehicle existence) |
| `ownVehicles()` | `GET /api/v1/vehicles` (authenticated as the caller) | client "my bookings" ownership check |
| `vehiclesByIds(ids)` | `GET /api/v1/admin/vehicles?ids={ids}` (ADMIN role, chunks of up to 100) | admin create and read; the response is `OwnedVehicleResponse{vehicle, ownerUserId}`, so the owner id is resolved here |

The `X-Correlation-Id` from the incoming request (MDC key set by `CorrelationIdFilter`) is
forwarded on these outbound calls (cross-cutting.md §4), so the two services log the same id.

Any non-404 failure of the customer-service (timeout, 5xx, unparseable body) becomes
`503 CUSTOMER_SERVICE_UNAVAILABLE`: it is not the caller's fault and must not be reported as a
4xx of the booking request.

### 2. Booking is owned by `booked_by`; `ownerUserId` is resolved, not stored

The booking row keeps only `customer_vehicle_id` and `booked_by`. At read time the vehicle is
re-resolved per booking via the directory:
- Admin reads resolve the owners in one batch (`vehiclesByIds`).
- Client reads check the caller's own vehicle list; a stale or foreign vehicle degrades
  gracefully (`vehicle = null` in history) instead of breaking lists.

### 3. No shared DTO: the contract is the customer-service OpenAPI

Booking does not import customer-service code. Its REST client maps the JSON shapes
(`VehicleResponse` flat, and `OwnedVehicleResponse{vehicle{...}, ownerUserId}` for the admin
endpoint) into booking's own `VehicleSnapshot` domain record. This is the usual resilience
boundary between services; a field added to the customer response is ignored by booking until
it explicitly maps it.

### 4. Configuration

The base URL and timeouts come from `app.customer-service.base-url` / `app.customer-service.timeout`
(`CUSTOMER_SERVICE_URL`, `CUSTOMER_SERVICE_TIMEOUT` in `lavarapido-infra/.env.example`), with
local defaults. The zone of the bookable hours is configured separately via `app.booking.zone`
(`BOOKING_ZONE`).

---

## Consequences

**Positive:**
- No cross-service table reads and no duplicated vehicle data (ADR-003 holds).
- Ownership is validated by the owner of the data (`customer-service`), with its existing rules
  (`GET /vehicles/{id}` returns the vehicle of the token's `sub` only).
- Same identity and correlation id in both services' logs for one request.
- A deleted vehicle degrades gracefully (`vehicle = null` in history) instead of breaking lists.

**Negative / trade-offs:**
- A synchronous dependency: if the customer-service is down, booking cannot create a booking
  (503). This is acceptable because pricing *requires* the vehicle type; the alternative would be
  caching vehicle types in booking, which duplicates mutable data.
- N+1-ish reads: client lists resolve the caller's vehicles once (`ownVehicles`) and match; admin
  lists resolve in one batch (`vehiclesByIds`, chunks of 100). Sizes today (a single customer's
  bookings, or one day of admin bookings) keep this fine; a cache is the upgrade path if a list
  ever grows.
- The two customer endpoints (`/vehicles/{id}` and `/admin/vehicles?ids=`) must both exist; the
  admin one was added for this purpose (customer-service `AdminVehicleController`,
  `LookupVehiclesUseCase`).

---

## Alternatives considered

| Alternative | Why it was discarded |
|---|---|
| Send the `vehicleTypeId` in `CreateBookingRequest` | Client-side data is not trusted; the server must derive the type from a vehicle it can verify belongs to the caller |
| Event with vehicle data at registration/customer-service | Vehicle data is mutable and the booking needs it inside the request, synchronously; an event would duplicate data or be stale |
| Store a snapshot of the vehicle in booking | Duplicates mutable data and diverges when the client edits the vehicle (plate, type, brand) |
| Have booking own a `vehicle_type` copy for pricing | Duplicates a catalog of `customer-service`; pricing must use the customer's real type id |
| GraphQL/registry of resolvers | Overkill for one relationship; REST on the owner is simpler and matches the gateway model |

---

## References

- ADR-003 (database strategy — single schema owner, no cross-schema FK), ADR-004 (service
  communication), ADR-009 (service decomposition), ADR-010 (data model vs frontend alignment)
- `05-architecture/cross-cutting.md` — correlation id (§4), error code conventions
- `06-data/models.md` — booking schema, `customer_vehicle_id` column
- Customer-service `CustomerVehicleController` and `AdminVehicleController` — the two endpoints
  consumed by this adapter