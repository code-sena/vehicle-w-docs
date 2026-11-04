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
| Consumed by | Web, mobile; booking-service (internal `/internal/v1/payments/bookings/{bookingId}/reported` with `X-Internal-Key`, and the events `payment.reported` / `payment.confirmed`, since 2026-10-26) |

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
- Publish `payment.reported` (since 2026-10-26), `payment.confirmed`, `payment.rejected`, `payment.refunded`,
  `payment.promotion_redeemed` and `payment.loyalty_points_earned` after commit ([events.md](./events.md)).
- **Payment at booking (2026-10-26, ADR-021):** when the client reports a payment with a receipt
  (`POST /payments` → `Payment.ReportWithReceipt`, also when reporting again after a rejection) it publishes
  the integration event `PaymentReported` (`payment.reported`; usual envelope `{eventId, eventType,
  aggregateId, occurredAt, version, payload}`, payload `paymentId`, `bookingId`, `customerUserId`, `amount`).
  A payment the admin registers in person does not publish it. booking-service consumes it so the
  DIGITAL booking no longer expires.
- **Internal route (2026-10-26):** `GET /internal/v1/payments/bookings/{bookingId}/reported` → 200
  `{"bookingId":123,"reported":true}`; `reported` is true when the booking has a payment `IN_REVIEW` or
  `APPROVED`. Only with `X-Internal-Key` = `INTERNAL_API_KEY` (`InternalApiKeyAuthenticationHandler`,
  constant-time comparison): without the key or with a wrong one → 401; a user JWT is not accepted.
  The gateway does not route it. Until then payment validated no internal key. booking-service
  (`PaymentDeadlineJob`) asks it before cancelling a booking with `PAYMENT_TIMEOUT`.
- Only bookings `CONFIRMED`, `IN_PROGRESS` or `COMPLETED` can be paid, and a booking has at most
  one approved payment (unique index). Reporting or approving the payment of a cancelled booking
  (for example, one cancelled with `PAYMENT_TIMEOUT`) answers 409 `BOOKING_NOT_PAYABLE`
  (`BookingPaymentGuard.EnsureBookingIsPayable`).

## Out of scope (what it does NOT do)

- Does not compute prices: the total comes from booking-service.
- Does not use `promotion.promotion_service` or `promotion.promotion_customer` yet (the tables exist).
- Does not consume events (booking-service consumes `payment.reported` and `payment.confirmed`).
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
| GET | `/api/v1/admin/payments` (`?status=PENDING\|IN_REVIEW\|APPROVED\|REJECTED\|REFUNDED`). With `?page=0&size=20` (E-10, 2026-10-24) it answers `{items, page, size, totalElements, totalPages}` without receipt images, with `hasReceiptImage` and `bookingCancelled`; without them, the old array (up to 200, with images). The image is read with `GET /admin/payments/{id}` | ADMIN |
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
| GET | `/api/v1/loyalty/redemptions/{bookingId}` (amount due `amountDue` and the applied coupon, BIZ-02; another client's booking → 404 `BOOKING_NOT_FOUND`) | CLIENT |
| DELETE | `/api/v1/loyalty/redemptions/{bookingId}/{promotionId}` (remove the coupon, E-08) | CLIENT |
| GET | `/internal/v1/payments/bookings/{bookingId}/reported` (booking has a payment in review or approved; for `PaymentDeadlineJob`) | internal key (booking-service), not routed by the gateway |
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
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` | `localhost`, `1433`, `LavaRapido`, `sa`, — | SQL Server (or `ConnectionStrings__PaymentDb` complete). Since `v1.1.3` the service does not start without `DB_PASSWORD` when there is no `ConnectionStrings__PaymentDb` |
| `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE` | —, `lavarapido-security-service`, `lavarapido-api` | Verify tokens (the service does not start without `JWT_SECRET`) |
| `BOOKING_SERVICE_URL` | `http://localhost:3003/api/v1` | Booking total, status and owner |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:4200` | CORS |
| `INTERNAL_API_KEY` | empty | Key of `/internal/**` (`X-Internal-Key`); empty → those routes answer 401. Required in `docker-compose.prod.yml` |
| `MESSAGING_ENABLED`, `RABBITMQ_*` | `false` | Publish events (otherwise a null publisher drops them). Since `v1.1.3`, with messaging on and a RabbitMQ that is not on `localhost`, `RABBITMQ_USERNAME` and `RABBITMQ_PASSWORD` are required (the service does not start); `guest` is only used against a local RabbitMQ |

The repository also has its own `docker-compose.yml` (SQL Server 2022 on `1434`, database
`LavaRapidoPaymentIT`, the same image and name as the CI job "Pruebas de integración" since `v1.1.3`;
password `MSSQL_SA_PASSWORD` from the repository's `.env`, copied from `.env.example`) to test only the
migrations and the integration tests. The running service uses the shared `LavaRapido`
database on `1433`.

---

## Related documents

- [data-model.md](./data-model.md) · [events.md](./events.md) · [decisions.md](./decisions.md) · [runbook.md](./runbook.md)
- ADR-013 (.NET stack and architecture), ADR-008 (payment verification), ADR-003 (database), ADR-009 (decomposition), ADR-021 (digital payment deadline)
