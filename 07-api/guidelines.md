# REST Guidelines

> The conventions the built services follow. A new endpoint must look like the existing ones.
> Checked against security, customer, booking and notification on 2026-10-04.

---

## Paths

| Rule | Example |
|---|---|
| Version in the path | `/api/v1/...` |
| Plural nouns, kebab-case | `/api/v1/vehicle-types`, `/api/v1/schedule/business-hours` |
| The caller's own data under `/me` | `GET /api/v1/users/me`, `GET /api/v1/bookings/me` |
| Administration under `/api/v1/admin/**` (role `ADMIN`) | `PATCH /api/v1/admin/users/{id}/status` |
| Actions that are not CRUD: a sub-resource verb, `POST` | `POST /api/v1/bookings/{id}/cancel`, `POST /api/v1/notifications/read-all` |
| State changes of one field: `PATCH .../status` | `PATCH /api/v1/admin/bookings/{id}/status` |
| Service-to-service only: `/internal/v1/**`, never routed by the gateway | `GET /internal/v1/users/{id}/contact` |

Each path prefix belongs to exactly one service; the gateway routes by prefix
(`09-microservices/services/01-api-gateway/README.md`).

## Methods and status codes

| Code | When |
|---|---|
| 200 | Read or update with a body |
| 201 | Created (`POST` of a new resource) |
| 204 | Success without body (logout, delete) |
| 400 | `VALIDATION_ERROR` or a domain rule on the input (`INVALID_*`) |
| 401 | Missing, invalid or expired token |
| 403 | Authenticated but wrong role |
| 404 | Does not exist **or belongs to another user** (ownership is not revealed) |
| 409 | Conflict with the current state (`SLOT_UNAVAILABLE`, `PLATE_ALREADY_REGISTERED`, booking already started) |
| 503 | A service it depends on did not answer (`DependencyUnavailableException`) |
| 500 | `INTERNAL_ERROR`; details only in the log |

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

- `code` is stable and in English (`UPPER_SNAKE_CASE`); the web translates it with
  `API_ERRORS.<code>` in its 4 languages. `detail` is for developers, not for the screen.
- Validation errors add `errors: { "<field>": "<message>" }`.
- Extra fields only when the client can act on them (`alternatives`, and `reason` so the screen can
  say "closed that day" or "outside the opening hours" instead of "that time was taken").
- Never include stack traces (`server.error.include-stacktrace: never`).

## Bodies

- JSON, field names in camelCase, English.
- Dates `YYYY-MM-DD`, times `HH:mm` in the shop's time zone (`America/Bogota`) for schedules and
  availability; instants in ISO-8601 UTC (`2026-10-01T14:00:00Z`).
- Money as decimal numbers in Colombian pesos (no cents in the catalog).
- Ids are numbers. Status values are the English codes (`CONFIRMED`, `ACTIVE`).
- Request DTOs are validated with Bean Validation; business rules are validated in the domain.

## Pagination

Lists that can grow use `?page=0&size=20` (0-based) and answer:

```json
{ "items": [...], "page": 0, "size": 20, "totalElements": 57, "totalPages": 3 }
```

Used by `GET /api/v1/admin/users` and `GET /api/v1/notifications`. Small catalogs (vehicle types,
services, bays) return a plain array.

## Security

Bearer JWT on every non-public endpoint → [`authentication.md`](./authentication.md).

## Contracts

`contracts/openapi/<service>.yaml` are **exported from the running services** (springdoc,
`/v3/api-docs`, dev profile), so they match the code. Re-export after changing an endpoint.
`_shared.yaml` and `_template-service.yaml` are kept as reference templates only.

## Correlations

- Gateway routes → `09-microservices/services/01-api-gateway/README.md`
- Error translation in the web → `12-ux-ui/design-system.md`
