# Payment Service

> Owner of the **payments of a booking, the shop's payment accounts (with their QR), the receipts
> and their review**. It also owns the promotions and the loyalty ledger tables. It owns the
> `payment` and `promotion` schemas (ADR-009).

---

## Location in the architecture

| Field | Value |
|-------|-------|
| Number in catalog | 06 |
| Local port | 3005 (`PAYMENT_PORT`) |
| Repository | `lavarapido-payment-service` |
| Stack | **.NET 8 · ASP.NET Core · EF Core** · layers Domain / Application / Infrastructure / Api (same hexagonal idea as ADR-007) |
| DB engine | SQL Server — schemas `payment`, `promotion` (Liquibase run by Docker, changelog table `DATABASECHANGELOG_PAYMENT`) |
| Communicates with | booking-service (REST, with the caller's token), RabbitMQ (publishes payment, coupon and loyalty events) |
| Consumed by | Web, mobile |

This is the only service that is not Spring Boot. It keeps the same contract as the others: JWT
HS256 from security-service, RFC 9457 errors with a stable `code`, `/actuator/health`, and it
reads `lavarapido-infra/.env`.

---

## Responsibilities (what this service DOES)

- **Payment accounts:** the shop's accounts per method (`EFECTIVO`, `NEQUI`, `DAVIPLATA`,
  `TRANSFERENCIA`) with holder, number, QR image and instructions. Clients only see active accounts
  of methods that require a receipt.
- **QR payment with receipt (ADR-008):** the client pays from their bank app and reports the
  payment with the receipt image. The amount is the booking total returned by booking-service minus
  the coupons already applied (`PaymentPolicy.AmountDue`), never a value sent by the browser. The
  payment goes straight to `IN_REVIEW`. A transaction reference already used on another booking is
  rejected (409 `TRANSACTION_REFERENCE_REUSED`).
- **Since 2026-10-24:** the screens read the amount due and the applied coupon from the server
  (`GET /api/v1/loyalty/redemptions/{bookingId}`, BIZ-02); a percentage coupon stores its percentage and
  cap and is recalculated with today's booking total, a FIXED one keeps its amount (migration 022,
  BIZ-05); approving a payment whose amount no longer matches what is due answers 409 `AMOUNT_CHANGED`
  (BIZ-01); migration 023 allows one open payment per booking and a unique reference among live
  payments (A-16); the admin queue is paged with `?page=&size=` (`{items,page,size,totalElements,
  totalPages}`, without images, `hasReceiptImage`; without those parameters the old array is kept,
  E-10); `PaymentDto.bookingCancelled` tells the admin to refund or reject (BIZ-07); the admin can
  register cash on an inactive account (C-04); missing ids answer 400 `VALIDATION_ERROR` (BIZ-13).
- **Review:** the admin approves or rejects (with a reason, max 200 characters) a payment in
  review, and can refund an approved one (the loyalty points of that booking are reversed).
- **Manual payment:** the admin registers a payment received at the shop (cash or a verified
  transfer); it is approved at once with the amount due.
- **Promotions (coupons):** the admin creates, edits, pauses and deletes (soft delete) coupons with a
  percentage or fixed discount, dates, limits and `RequiredPoints`, and sees their use
  (`/admin/promotions/metrics`: redemptions and savings of the current promotions). The client sees
  the coupons in force, marked unlocked or locked by points, and applies one to a booking before
  paying (`POST /api/v1/loyalty/redeem`).
- **Loyalty points:** an approved payment credits the points of the booking's services to the ledger
  (`EARNED`), a refund reverses them (`REVERSED`); points are never spent. The client reads the
  balance with `GET /api/v1/loyalty/balance`.
- Publish `payment.confirmed`, `payment.rejected`, `payment.refunded`, `payment.promotion_redeemed`
  and `payment.loyalty_points_earned` after commit ([events.md](./events.md)).
- Only bookings `CONFIRMED`, `IN_PROGRESS` or `COMPLETED` can be paid, and a booking has at most
  one approved payment (unique index).

## Out of scope (what it does NOT do)

- Does not compute prices: the total comes from booking-service.
- Does not use `promotion.promotion_service` or `promotion.promotion_customer` yet (the tables exist).
- Does not consume events.
- No file storage: QR and receipt are stored as images (data URL) in the database.

---

**Correlation:** `CorrelationIdMiddleware` reads `X-Correlation-Id` from the gateway (or creates one),
returns it in the response, adds it to the log scope and forwards it to booking-service with the user's
token, like the Java services (`cross-cutting.md` §4).

## Endpoints

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/payment-accounts` | token |
| POST | `/api/v1/payments` (report payment with receipt) | CLIENT |
| GET | `/api/v1/payments/me` (`?from=&to=` booking dates, `?service=`; newest booking first — RF-015) | CLIENT |
| GET | `/api/v1/payments/{id}` (own payment) | CLIENT |
| GET | `/api/v1/payments/me/bookings` (each booking: latest payment status and `payable`, so the screens do not repeat the rule) | CLIENT |
| GET | `/api/v1/admin/payments` (`?status=PENDING\|IN_REVIEW\|APPROVED\|REJECTED\|REFUNDED`; with `page`/`size` a page without images) | ADMIN |
| GET | `/api/v1/admin/payments/{id}` · `/admin/payments/amount-due?bookingId=` | ADMIN |
| POST | `/api/v1/admin/payments` (manual payment) | ADMIN |
| POST | `/api/v1/admin/payments/{id}/approve` · `/reject` · `/refund` | ADMIN |
| GET · POST | `/api/v1/admin/payment-accounts` | ADMIN |
| PUT | `/api/v1/admin/payment-accounts/{id}` | ADMIN |
| GET | `/api/v1/admin/payment-methods` | ADMIN |
| GET · POST | `/api/v1/admin/promotions` · GET `/admin/promotions/metrics` | ADMIN |
| PUT · DELETE | `/api/v1/admin/promotions/{id}` · PATCH `/admin/promotions/{id}/active` | ADMIN |
| GET | `/api/v1/loyalty/balance` · `/loyalty/promotions` | CLIENT |
| POST | `/api/v1/loyalty/redeem` (`{bookingId, code}`) | CLIENT |
| GET · DELETE | `/api/v1/loyalty/redemptions/{bookingId}` (amount due and coupon) · `/loyalty/redemptions/{bookingId}/{promotionId}` (remove it) | CLIENT |
| GET | `/health`, `/actuator/health` | public — check SQL Server and answer 503 `DOWN` within 3 s when it does not respond |

Through the gateway these paths are routed to `:3005` (`ROUTE_PAYMENT_URL`).
Full contract: [`07-api/contracts/openapi/payment-service.yaml`](../../../07-api/contracts/openapi/payment-service.yaml)
(Swagger UI at `/swagger` in the `Development` environment).

---

## How to run it locally

```bash
# 1. tables (once): from lavarapido-infra
docker compose up -d                 # includes payment-migrate (Liquibase)

# 2. service
cd lavarapido-payment-service
dotnet run --project src/PaymentService.Api      # http://localhost:3005 — Swagger: /swagger
```

| Variable | Default | Purpose |
|---|---|---|
| `PAYMENT_PORT` | `3005` | HTTP port |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` | `localhost`, `1433`, `LavaRapido`, `sa`, — | SQL Server (or `ConnectionStrings__PaymentDb` complete) |
| `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE` | —, `lavarapido-security-service`, `lavarapido-api` | Verify tokens (the service does not start without `JWT_SECRET`) |
| `BOOKING_SERVICE_URL` | `http://localhost:3003/api/v1` | Booking total, status and owner |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:4200` | CORS |
| `MESSAGING_ENABLED`, `RABBITMQ_*` | `false` | Publish events (otherwise a null publisher drops them) |

The repository also has its own `docker-compose.yml` (SQL Server on `1434`, database
`lavado_vehicular`) to test only the migrations. The running service uses the shared `LavaRapido`
database on `1433`.

---

## Related documents

- [data-model.md](./data-model.md) · [events.md](./events.md) · [decisions.md](./decisions.md) · [runbook.md](./runbook.md)
- ADR-013 (.NET stack and architecture), ADR-008 (payment verification), ADR-003 (database), ADR-009 (decomposition)
