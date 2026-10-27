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
| 409 `PAYMENT_ALREADY_REPORTED` / `PAYMENT_ALREADY_APPROVED` | The booking already has an open or approved payment (one open payment per booking is also enforced by an index since migration 023, A-16) | Expected |
| 409 `TRANSACTION_REFERENCE_REUSED` | The reference is already used by another live payment (indexed view `v_live_transaction_reference`, 023). The view also blocks the same reference on an in-person payment of the same booking (known, low) | Use the real reference |
| 409 `AMOUNT_CHANGED` when approving | The amount reported no longer matches what is due today (the booking total or the coupon changed; BIZ-01) | Reject the payment so the client reports the new amount |
| 400 `VALIDATION_ERROR` | A required id (`bookingId`, `paymentAccountId`) missing in the body (BIZ-13) | Send it |
| The admin queue is slow or payment restarts for memory | The web still asks `GET /admin/payments` without `page`/`size`: up to 200 payments with their receipt images every 45 s (known, high) | Use the paged queue (`?page=0&size=20`) |
| 400 `INVALID_PAYMENT_ACCOUNT` | Account inactive or missing | Check Admin > Payment accounts |
| 503 `BOOKING_SERVICE_UNAVAILABLE` | booking-service down or unreachable | Start it; check `BOOKING_SERVICE_URL` |
| 413 when reporting a payment | Request body larger than 8 MB (Kestrel limit) | Compress the image |
| 400 `RECEIPT_TOO_LARGE` | The receipt image itself exceeds the domain limit | Compress the image |
| 409 `PROMOTION_ONE_PER_BOOKING` | The booking already has a coupon (one per booking since 2026-10-23, E-09) | Remove it first (`DELETE /api/v1/loyalty/redemptions/{bookingId}/{promotionId}`) |
| 404 `PROMOTION_REDEMPTION_NOT_FOUND` | Removing a coupon that is not on that booking | Expected |
| 400 `INVALID_PROMOTION_DISCOUNT` | Percentage outside 1–99 %, or a fixed discount of zero or less (E-07). A coupon never leaves a booking at 0: the discount is capped so a minimum amount is always due | Fix the promotion |

## Tests

`dotnet test PaymentService.sln`: 264 tests (142 domain + 61 application + 44 API + 17 integration)
in CI on `main` on 2026-10-27 (`v1.1.2`). Since 2026-10-27 the 17 integration tests run in CI in the job
"Pruebas de integración", against SQL Server 2022 as a service container with the Liquibase migrations
applied (0 skipped); on a machine without a database 12 of them skip themselves.

## Useful queries

```sql
-- payments with status and number of receipts
SELECT p.payment_id, p.booking_id, p.amount, s.code, p.processed_at,
       (SELECT COUNT(*) FROM payment.payment_receipt r WHERE r.payment_id = p.payment_id) AS receipts
FROM payment.payment p JOIN payment.payment_status s ON s.payment_status_id = p.payment_status_id
ORDER BY p.payment_id DESC;
```
