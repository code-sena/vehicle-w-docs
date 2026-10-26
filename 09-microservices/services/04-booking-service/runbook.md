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
| 400 `INVALID_PAYMENT_MODE` | A client booked without `paymentMode` or with a value other than `DIGITAL`/`CASH` (old app build) | Update the web or the app; the admin may omit it |
| 409 `CASH_BOOKING_LIMIT` | The client already has `BOOKING_CASH_ACTIVE_LIMIT` (1) active cash bookings | Expected: pay digitally, or wait until the cash booking is completed, cancelled or no-show |
| A DIGITAL booking was cancelled with `PAYMENT_TIMEOUT` | No payment reported before `payment_deadline` and payment-service confirmed it has none (ADR-021) | Expected; the client books again. Logs of `PaymentDeadlineJob` |
| Log "not cancelled this round: PAYMENT_SERVICE_UNAVAILABLE" | payment-service down, `PAYMENT_SERVICE_URL` wrong or a different `INTERNAL_API_KEY` (401) | Start payment, check the URL and the key; the job retries every `BOOKING_PAYMENT_EXPIRY_INTERVAL` and cancels nothing meanwhile |
| A paid DIGITAL booking still shows `paymentReported=false` | The notice `payment.reported` was lost (no Outbox) or is in `booking.payment-events.dlq` | Nothing to do: before cancelling, the job asks payment and marks it. Check the DLQ in RabbitMQ |

## Tests

`./mvnw verify`: 133 tests on 2026-10-26, after the payment at booking (no database needed).

## Useful queries

```sql
-- bookings with status (scheduled_start is UTC: subtract 5 hours for Colombia)
SELECT b.booking_id, s.code, b.scheduled_start, b.service_bay_id, b.customer_vehicle_id
FROM booking.booking b JOIN booking.booking_status s ON s.booking_status_id = b.booking_status_id
ORDER BY b.scheduled_start DESC;
```
