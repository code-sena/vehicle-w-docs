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
| 409 `BOOKING_NOT_PAYABLE` | Booking cancelled, no-show or still `SCHEDULED` | Expected |
| 409 `PAYMENT_ALREADY_REPORTED` / `PAYMENT_ALREADY_APPROVED` | The booking already has an open or approved payment | Expected |
| 400 `INVALID_PAYMENT_ACCOUNT` | Account inactive or missing | Check Admin > Payment accounts |
| 503 `BOOKING_SERVICE_UNAVAILABLE` | booking-service down or unreachable | Start it; check `BOOKING_SERVICE_URL` |
| 413 when reporting a payment | Request body larger than 8 MB (Kestrel limit) | Compress the image |
| 400 `RECEIPT_TOO_LARGE` | The receipt image itself exceeds the domain limit | Compress the image |
| 409 `PROMOTION_ONE_PER_BOOKING` | The booking already has a coupon (one per booking since 2026-10-23, E-09) | Remove it first (`DELETE /api/v1/loyalty/redemptions/{bookingId}/{promotionId}`) |
| 404 `PROMOTION_REDEMPTION_NOT_FOUND` | Removing a coupon that is not on that booking | Expected |
| 400 `INVALID_PROMOTION_DISCOUNT` | Percentage outside 1–99 %, or a fixed discount of zero or less (E-07). A coupon never leaves a booking at 0: the discount is capped so a minimum amount is always due | Fix the promotion |

## Tests

`dotnet test PaymentService.sln`: 151 tests (119 domain + 32 application) in the CI run of
2026-10-23; the 7 integration tests skip themselves without SQL Server.

## Useful queries

```sql
-- payments with status and number of receipts
SELECT p.payment_id, p.booking_id, p.amount, s.code, p.processed_at,
       (SELECT COUNT(*) FROM payment.payment_receipt r WHERE r.payment_id = p.payment_id) AS receipts
FROM payment.payment p JOIN payment.payment_status s ON s.payment_status_id = p.payment_status_id
ORDER BY p.payment_id DESC;
```
