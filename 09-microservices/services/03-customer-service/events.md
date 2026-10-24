# Events — Customer Service

## Consumed

| Event | Routing key | Queue | What it does |
|---|---|---|---|
| `UserRegistered` | `security.user_registered` | `customer-service.events` (DLQ `customer-service.events.dlq`) | Creates the client profile for accounts with role `CLIENT`; idempotent (an existing profile is left untouched) |

Invalid messages go straight to the dead-letter queue; other failures are retried and then dead-lettered.

## Published

None on RabbitMQ yet. The domain raises `CustomerProvisioned`, `VehicleRegistered`,
`VehicleUpdated`, `VehicleRemoved` and `LoyaltyPointsChanged`, which today are only logged by
`LoggingDomainEventPublisher` (no consumer needs them).

## Synchronous calls

| Direction | Call | Why |
|---|---|---|
| customer → security | `GET /api/v1/users/me` with the client's token | Read `personId` to create a missing profile |
| booking → customer | `GET /api/v1/vehicles/{id}` and `/vehicles` with the client's token | Vehicle ownership (INV-BOOK-002) and type for the price |
| booking → customer | `GET /api/v1/admin/vehicles?ids=` with the admin's token | Vehicles and owners in the admin booking list |
| customer → booking | `GET /internal/v1/bookings/active-count?customerVehicleId=` with `X-Internal-Key` (`BOOKING_SERVICE_URL`, the root of booking; `BOOKING_SERVICE_TIMEOUT` 3 s) | Before removing a vehicle: with active bookings 409 `VEHICLE_HAS_ACTIVE_BOOKINGS`; without the key or with booking down 503 `BOOKING_SERVICE_UNAVAILABLE` (BIZ-08, 2026-10-24) |
