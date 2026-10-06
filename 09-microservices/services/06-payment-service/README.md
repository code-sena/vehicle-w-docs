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
| Communicates with | booking-service (REST, with the caller's token) |
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
  payment with the receipt image. The amount is the booking total returned by booking-service,
  never a value sent by the browser. The payment goes straight to `IN_REVIEW`.
- **Review:** the admin approves or rejects (with a reason, max 200 characters) a payment in
  review, and can refund an approved one.
- **Manual payment:** the admin registers a payment received at the shop (cash or a verified
  transfer); it is approved at once with the booking total.
- Only bookings `CONFIRMED`, `IN_PROGRESS` or `COMPLETED` can be paid, and a booking has at most
  one approved payment (unique index).

## Out of scope (what it does NOT do)

- Does not compute prices: the total comes from booking-service.
- Promotions and loyalty points: the tables exist (`promotion.*`, `payment.loyalty_*`) but there are
  no endpoints yet.
- Does not publish events yet: the domain raises `PaymentApproved`, `PaymentRejected`,
  `PaymentRefunded`, but they are not sent to RabbitMQ (see [events.md](./events.md)).
- No file storage: QR and receipt are stored as images (data URL) in the database.

---

## Endpoints

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/payment-accounts` | token |
| POST | `/api/v1/payments` (report payment with receipt) | CLIENT |
| GET | `/api/v1/payments/me` | CLIENT |
| GET | `/api/v1/admin/payments` (`?status=PENDING\|IN_REVIEW\|APPROVED\|REJECTED\|REFUNDED`) | ADMIN |
| POST | `/api/v1/admin/payments` (manual payment) | ADMIN |
| POST | `/api/v1/admin/payments/{id}/approve` · `/reject` · `/refund` | ADMIN |
| GET · POST | `/api/v1/admin/payment-accounts` | ADMIN |
| PUT | `/api/v1/admin/payment-accounts/{id}` | ADMIN |
| GET | `/api/v1/admin/payment-methods` | ADMIN |
| GET | `/health`, `/actuator/health` | public |

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

The repository also has its own `docker-compose.yml` (SQL Server on `1434`, database
`lavado_vehicular`) to test only the migrations. The running service uses the shared `LavaRapido`
database on `1433`.

---

## Related documents

- [data-model.md](./data-model.md) · [events.md](./events.md) · [decisions.md](./decisions.md) · [runbook.md](./runbook.md)
- ADR-013 (.NET stack and architecture), ADR-008 (payment verification), ADR-003 (database), ADR-009 (decomposition)
