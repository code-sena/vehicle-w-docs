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
| 503 `CUSTOMER_SERVICE_UNAVAILABLE` | customer-service down or unreachable | Start it; check `CUSTOMER_SERVICE_URL` |
| No "booking confirmed" notification | `MESSAGING_ENABLED=false`, RabbitMQ down or notification-service down | Check the three; the booking itself is saved |
| Times shifted by 5 hours | Old build without the UTC fix | Rebuild/restart the service |
| 409 `BAY_HAS_BOOKINGS` when deleting a bay | The bay has upcoming bookings | Move or cancel them first |

## Useful queries

```sql
-- bookings with status (scheduled_start is UTC: subtract 5 hours for Colombia)
SELECT b.booking_id, s.code, b.scheduled_start, b.service_bay_id, b.customer_vehicle_id
FROM booking.booking b JOIN booking.booking_status s ON s.booking_status_id = b.booking_status_id
ORDER BY b.scheduled_start DESC;
```
