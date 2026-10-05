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
| `contracts/openapi/notification-service.yaml` | Inbox, unread count, push tokens, admin notifications |
| `contracts/openapi/api-gateway.yaml` | Gateway health and routing table |
| `contracts/openapi/_shared.yaml`, `_template-service.yaml` | Templates, not contracts |

The four service contracts were **exported from the running services** on 2026-10-04
(`GET /v3/api-docs`, dev profile) and converted to YAML, with the gateway (`http://localhost:8080`)
and the direct port as servers. They match the code at that date.

---

## How to view or update a contract

- View: paste the YAML into https://editor.swagger.io, or open Swagger UI of the running service
  (`http://localhost:300N/swagger-ui.html`, dev profile).
- Update after changing an endpoint: start the service with the dev profile, download
  `/v3/api-docs`, convert to YAML and replace the file in the same PR as the code.

---

## Correlations

| Fed by | Feeds |
|---|---|
| `04-requirements/functional.md` | Endpoints per requirement |
| `06-data/models.md` | Data behind each schema |
| Contracts here | Web services in `Web/src/app/core/services`, gateway routes, `11-quality` web slice tests |
