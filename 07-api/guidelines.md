# REST Guidelines

> The conventions the built services follow. A new endpoint must look like the existing ones.
> Checked against the controllers of the six services on `origin/develop`, 2026-10-23.

---

## Paths

| Rule | Example |
|---|---|
| Version in the path | `/api/v1/...` |
| Plural nouns, kebab-case | `/api/v1/vehicle-types`, `/api/v1/schedule/business-hours` |
| The caller's own data under `/me` | `GET /api/v1/users/me`, `GET /api/v1/bookings/me`, `GET /api/v1/payments/me` |
| Administration under `/api/v1/admin/**` (role `ADMIN`) | `PATCH /api/v1/admin/users/{userId}/status` |
| The operator's work under `/api/v1/operator/**` (role `OPERATOR`) | `POST /api/v1/operator/services/{bookingId}/start` |
| Actions that are not CRUD: a sub-resource verb, `POST` | `POST /api/v1/bookings/{id}/cancel`, `POST /api/v1/notifications/read-all`, `POST /api/v1/admin/payments/{id}/approve` |
| State changes of one field: `PATCH .../status` (or `.../active`) | `PATCH /api/v1/admin/bookings/{id}/status`, `PATCH /api/v1/admin/promotions/{id}/active` |
| Service-to-service only: `/internal/v1/**`, never routed by the gateway | `GET /internal/v1/users/{userId}/contact` |
| Public link without session: `/api/v1/public/**` | `GET /api/v1/public/inspections/{token}` |

Each path prefix belongs to exactly one service; the gateway routes by prefix
(`contracts/openapi/api-gateway.yaml`).

## Methods and status codes

| Code | When |
|---|---|
| 200 | Read, or an update or action that returns the resource |
| 201 | Created (`POST` of a new resource), with `Location` when the controller builds it (`ResponseEntity.created`, `Created(...)`) |
| 202 | `POST /api/v1/auth/password/forgot` (always, whether the e-mail exists or not) |
| 204 | Success without body (logout, session check, password change, deletes, refund, share inspection, attended) |
| 400 | `VALIDATION_ERROR` (Bean Validation), `BAD_REQUEST` (malformed JSON, missing or wrongly typed parameter) or a domain rule on the input (`INVALID_*`, `EMAIL_DOMAIN_NOT_ALLOWED`, `PROMOTION_ONE_PER_BOOKING`…) |
| 401 | Missing, invalid or expired token, closed session, wrong password at login (`INVALID_CREDENTIALS`), missing `X-Internal-Key` on `/internal/**` |
| 403 | Authenticated but wrong role; also an account action that is never allowed (`ACCOUNT_DISABLED`, `CANNOT_DISABLE_OWN_ACCOUNT`, `ADMIN_CANNOT_BE_DISABLED`) |
| 404 | Does not exist **or belongs to another user** (ownership is not revealed) |
| 409 | Conflict with the current state (`SLOT_UNAVAILABLE`, `PLATE_ALREADY_REGISTERED`, `OPERATOR_BUSY`, `OPERATOR_ACCOUNT_DISABLED`, `PAYMENT_ALREADY_APPROVED`, a booking already started) or a database constraint (`CONFLICT`, `DATA_CONFLICT`) |
| 423 | `ACCOUNT_LOCKED` (login lockout, RF-004b) |
| 503 | A service it depends on did not answer (`CUSTOMER_SERVICE_UNAVAILABLE`, `BOOKING_SERVICE_UNAVAILABLE`), or a health check whose database is down |
| 500 | `INTERNAL_ERROR`; details only in the log |

No endpoint answers 429 today: there is no rate limiting in the gateway or the services. The exact
codes of every operation are in its contract (`responses` and their `x-codes`).

## Errors — RFC 9457 `ProblemDetail` + `code`

```json
{
  "type": "about:blank",
  "title": "Conflict",
  "status": 409,
  "detail": "No service bay is free at the requested time",
  "instance": "/api/v1/bookings",
  "code": "SLOT_UNAVAILABLE",
  "alternatives": ["10:30", "11:00", "14:00"],
  "reason": "NO_FREE_BAY"
}
```

- `code` is stable and in English (`UPPER_SNAKE_CASE`); the web and the app translate it in their 4
  languages. `detail` is for developers, not for the screen (English in the Java services, Spanish in
  payment-service).
- Validation errors add `errors: { "<field>": "<message>" }`.
- Extra fields only when the client can act on them: `alternatives` and `reason` (`CLOSED_DAY`,
  `OUTSIDE_HOURS`, `TIME_PASSED`, `NO_FREE_BAY`) with `SLOT_UNAVAILABLE`, `violations` with
  `WEAK_PASSWORD`.
- The Java services add `code` even to the errors Spring MVC raises itself (`BAD_REQUEST`,
  `NOT_FOUND`, `METHOD_NOT_ALLOWED`…), and the security filters answer the same format (`UNAUTHORIZED`,
  `FORBIDDEN`).
- payment-service: the exceptions of the code become `ProblemDetail` with `code`
  (`GlobalExceptionHandler`), but two answers come from ASP.NET itself and have **no** `code`: the
  automatic `[ApiController]` validation (400 `ValidationProblemDetails` with `errors`) and the JWT
  middleware (401/403 with an empty body).
- Each contract lists its whole catalogue (code → HTTP status → exception and operations) in
  `info.description` and `x-error-codes`.
- Never include stack traces (`server.error.include-stacktrace: never`, gateway
  `spring.web.error.include-message: never`).

## Bodies

- JSON, field names in camelCase, English (payment-service: System.Text.Json camelCase by default).
- Dates `YYYY-MM-DD`, times `HH:mm` in the shop's time zone (`America/Bogota`) for schedules,
  availability and booking start and end; instants in ISO-8601 UTC (`2026-10-01T14:00:00Z`).
- Money as decimal numbers in Colombian pesos.
- Ids are numbers. Status values are the English codes (`CONFIRMED`, `ACTIVE`, `IN_REVIEW`).
- Request DTOs are validated with Bean Validation (Java) or the `[ApiController]` model validation
  (.NET); business rules are validated in the domain.
- Images travel as data URLs in JSON (payment receipts and QR codes, up to 8 MB per request) or as
  `multipart/form-data` (inspection photos: `photos`, JPEG/PNG up to 2 MB each, at most 5).

## Pagination

Two lists are paged, with `?page=0&size=20` (0-based, those are the defaults) and this body:

```json
{ "items": [...], "page": 0, "size": 20, "totalElements": 57, "totalPages": 3 }
```

| Endpoint | Size limit |
|---|---|
| `GET /api/v1/admin/users` | `size` is clamped to 1–100 |
| `GET /api/v1/notifications` | `page < 0`, `size < 1` or `size > 100` answers 400 `INVALID_PAGE` |

Every other list returns a plain array (catalogs, bookings, payments, operators…). In the contracts
the paged bodies are `PageResponseOfUserResponse` and `PageResponseOfNotificationResponse`.

## Security

Bearer JWT on every non-public endpoint; `X-Internal-Key` on `/internal/**` →
[`authentication.md`](./authentication.md).

## Contracts

`contracts/openapi/<service>.yaml` are **rebuilt from the code** of `origin/develop` and checked
against it (`README.md`, "How the contracts are checked"). Rebuild and check them after changing an
endpoint. `_shared.yaml` and `_template-service.yaml` are reference templates only.

## Correlations

- Gateway routes → `contracts/openapi/api-gateway.yaml`, `09-microservices/services/01-api-gateway/README.md`
- Error translation in the web → `12-ux-ui/design-system.md`
