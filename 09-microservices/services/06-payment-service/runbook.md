# Runbook — Payment Service

## Health

```bash
curl http://localhost:3005/actuator/health      # {"status":"UP"}
curl http://localhost:3005/health               # {"status":"ok"}
```

## Common problems

| Symptom | Likely cause | What to do |
|---|---|---|
| Does not start: `JWT_SECRET is not set` | `lavarapido-infra/.env` not found or empty | Fill `JWT_SECRET`, or set it as an environment variable |
| Address already in use (3005) | Another instance is running | Stop it or set `PAYMENT_PORT` |
| `Invalid object name 'payment.payment'` | Migrations not applied | `docker compose up -d` in `lavarapido-infra` (runs `payment-migrate`) |
| 400 `BOOKING_NOT_PAYABLE` | Booking cancelled, no-show or still `SCHEDULED` | Expected |
| 409 `PAYMENT_ALREADY_REPORTED` / `PAYMENT_ALREADY_APPROVED` | The booking already has an open or approved payment | Expected |
| 400 `INVALID_PAYMENT_ACCOUNT` | Account inactive or missing | Check Admin > Payment accounts |
| 503 `BOOKING_SERVICE_UNAVAILABLE` | booking-service down or unreachable | Start it; check `BOOKING_SERVICE_URL` |
| 413 when reporting a payment | Receipt image larger than 8 MB | Compress the image |

## Useful queries

```sql
-- payments with status and number of receipts
SELECT p.payment_id, p.booking_id, p.amount, s.code, p.processed_at,
       (SELECT COUNT(*) FROM payment.payment_receipt r WHERE r.payment_id = p.payment_id) AS receipts
FROM payment.payment p JOIN payment.payment_status s ON s.payment_status_id = p.payment_status_id
ORDER BY p.payment_id DESC;
```
