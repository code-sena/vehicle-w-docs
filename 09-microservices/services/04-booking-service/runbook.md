# Runbook — Booking Service

## Health

```bash
curl http://localhost:3003/actuator/health      # {"status":"UP"}
```

## Common problems

| Symptom | Likely cause | What to do |
|---|---|---|
| A day shows no times / "closed" | Weekday inactive (Sunday by default) or a closed exception | Check Admin > Schedule; add a special-day exception if needed |
| 409 `SLOT_UNAVAILABLE` | All active bays busy at that time | Expected; the answer includes alternative times |
| 409 `VEHICLE_ALREADY_BOOKED` | The vehicle already has an overlapping booking | Expected |
| 409 `SERVICE_NOT_AVAILABLE_FOR_VEHICLE` | The service has no price for that vehicle type | Add the price in Admin > Management > Services |
| 503 `CUSTOMER_SERVICE_UNAVAILABLE` | customer-service down or unreachable (a 4xx from customer is passed through with its own code since BIZ-13) | Start it; check `CUSTOMER_SERVICE_URL` |
| 503 `BOOKING_SERVICE_UNAVAILABLE` | booking's own database does not answer (BIZ-13) | Check `lavarapido-sqlserver` |
| 409 `BOOKING_SERVICES_LOCKED` | A client tried to change the services when rescheduling; clients can only change date and time (BIZ-01) | Expected; the admin can change the services |
| 409 `CONFLICT` | The booking changed meanwhile (optimistic lock `@Version`, BIZ-09) | Reload and try again |
| 400 `INVALID_PRICE` | Service price 0 or less (BIZ-04) | Use a price greater than 0 |
| 409 `SCHEDULE_CONFLICTS_BOOKINGS` | The new week, exception or bay state leaves active bookings outside (`conflictingBookings`, `bookingCodes`; BIZ-10) | Move or cancel those bookings first. A very old booking outside the schedule can block any weekly change (known, low) |
| 403 on `/api/v1/bookings/**` with an admin or operator token | Expected since BIZ-12 (except `availability` and `cancellation-reasons` for ADMIN) | Staff use `/api/v1/admin/bookings` |
| Writes queue up and answer 409 `SCHEDULE_BUSY` while customer is slow | The schedule lock is held during the call to customer (known, medium) | Check customer-service |
| No "booking confirmed" notification | `MESSAGING_ENABLED=false`, RabbitMQ down or notification-service down | Check the three; the booking itself is saved |
| Times shifted by 5 hours | Old build without the UTC fix | Rebuild/restart the service |
| 409 `BAY_HAS_BOOKINGS` when deleting a bay | The bay has upcoming bookings | Move or cancel them first |
| 401 on `/api/v1/operator/bookings/**` | Called without `X-Internal-Key` (E-01: only operations-service may call it) or with a different key | Same `INTERNAL_API_KEY` in booking and operations |
| 401 on `/internal/**` | `INTERNAL_API_KEY` empty (routes closed) or different | Same key in every service |

## Tests

`./mvnw verify`: 95 tests in the CI run of 2026-10-24 (no database needed).

## Useful queries

```sql
-- bookings with status (scheduled_start is UTC: subtract 5 hours for Colombia)
SELECT b.booking_id, s.code, b.scheduled_start, b.service_bay_id, b.customer_vehicle_id
FROM booking.booking b JOIN booking.booking_status s ON s.booking_status_id = b.booking_status_id
ORDER BY b.scheduled_start DESC;
```
