# Runbook — Customer Service

## Health

```bash
curl http://localhost:3002/actuator/health      # {"status":"UP"}
```

## Common problems

| Symptom | Likely cause | What to do |
|---|---|---|
| "My vehicles" answers 409 `CUSTOMER_NOT_PROVISIONED` | No profile yet and security-service unreachable | Start security-service; the next request creates the profile |
| 401 on every request | `JWT_SECRET`/issuer/audience differ from security-service | Use the same `.env` |
| 409 `PLATE_ALREADY_REGISTERED` | The plate belongs to another active vehicle | Expected; remove the old vehicle first |
| Profile not created at registration | `MESSAGING_ENABLED=false` or RabbitMQ down | Optional: it is created on first use anyway |
| Startup fails on `localhost:1433` | SQL Server not healthy yet | Wait for `lavarapido-sqlserver` (healthy) and retry |
| 409 `VEHICLE_HAS_ACTIVE_BOOKINGS` when removing a vehicle | The vehicle has active bookings (BIZ-08) | Expected; cancel them first |
| 503 `BOOKING_SERVICE_UNAVAILABLE` when removing a vehicle | booking-service down, `INTERNAL_API_KEY` empty or different, or `BOOKING_SERVICE_URL` not the root of booking (`http://localhost:3003`) | Start booking; same key in both; fix the URL |
| 403 on `/api/v1/vehicles/**` with an admin or operator token | Expected since BIZ-12: those routes are for `CLIENT` only | Staff use `/api/v1/admin/vehicles` |

## Tests

`./mvnw verify`: 83 tests in CI on `main` on 2026-10-27 (`v1.1.1`; no database needed).

## Useful queries

```sql
SELECT c.user_id, v.license_plate, t.code, v.brand, v.model
FROM customer.customer_vehicle v
JOIN customer.customer c ON c.customer_id = v.customer_id
JOIN customer.vehicle_type t ON t.vehicle_type_id = v.vehicle_type_id
WHERE v.deleted_at IS NULL;
```
