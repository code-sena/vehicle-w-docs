# 07 — API Contracts

> How LavaRápido's services expose their HTTP APIs: conventions, authentication and the OpenAPI
> contract of each service.

---

## Contents

| File | What it answers |
|------|-----------------|
| [`guidelines.md`](./guidelines.md) | Paths, status codes, error format (RFC 9457 + `code`), bodies, pagination |
| [`authentication.md`](./authentication.md) | JWT, roles, public endpoints, service-to-service credentials |
| `contracts/openapi/security-service.yaml` | Accounts, login, recovery, profile, preferences, user admin |
| `contracts/openapi/customer-service.yaml` | Vehicle types, client vehicles, admin vehicle lookup |
| `contracts/openapi/booking-service.yaml` | Catalog, schedule, establishment, bays, availability, bookings |
| `contracts/openapi/operations-service.yaml` | Operators, shifts, absences, assignment and candidates, operator services, ratings |
| `contracts/openapi/payment-service.yaml` | Payment accounts with QR, payments with receipt, admin review, manual payments, payment methods |
| `contracts/openapi/notification-service.yaml` | Inbox, unread count, push tokens, admin notifications |
| `contracts/openapi/api-gateway.yaml` | Gateway health and routing table |
| `contracts/openapi/_shared.yaml`, `_template-service.yaml` | Templates, not contracts |

The service contracts were **exported from the running services** and converted to YAML, with the
gateway (`http://localhost:8080`) and the direct port as servers:

| Contract | Source | Date |
|---|---|---|
| security, customer, booking, notification | `GET /v3/api-docs` (springdoc, dev profile) | 2026-10-04/05 |
| operations | `GET /v3/api-docs` (springdoc, dev profile) on `:3004` | 2026-10-06 — includes `OperatorServiceResponse.startable`, which was still uncommitted in `lavarapido-operations-service` that day |
| payment | `GET /swagger/v1/swagger.json` (Swashbuckle, `Development`) on `:3005` | 2026-10-06 — OpenAPI 3.0.1; Swashbuckle does not declare the bearer security scheme, but every path except the health checks requires a JWT |

---

## How to view or update a contract

- View: paste the YAML into https://editor.swagger.io, or open Swagger UI of the running service
  (`http://localhost:300N/swagger-ui.html`, dev profile; payment: `http://localhost:3005/swagger`).
- Update after changing an endpoint: start the service with the dev profile, download
  `/v3/api-docs` (payment: `/swagger/v1/swagger.json`), convert to YAML and replace the file in the
  same PR as the code.

---

## Correlations

| Fed by | Feeds |
|---|---|
| `04-requirements/functional.md` | Endpoints per requirement |
| `06-data/models.md` | Data behind each schema |
| Contracts here | Web services in `Web/src/app/core/services`, gateway routes, `11-quality` web slice tests |
