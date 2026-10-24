# 07 — API Contracts

> How LavaRápido's services expose their HTTP APIs: conventions, authentication and the OpenAPI
> contract of each service. **Last updated: 2026-10-23**, against `origin/develop` of every service.

---

## Contents

| File | What it answers |
|------|-----------------|
| [`guidelines.md`](./guidelines.md) | Paths, status codes, error format (`ProblemDetail` + `code`), bodies, pagination |
| [`authentication.md`](./authentication.md) | JWT, session check, roles, public endpoints, service-to-service credentials |
| `contracts/openapi/security-service.yaml` | 23 operations: register, login, logout, session check, password recovery, profile, e-mail, password, address, preferences, closing one's own account, user admin, roles and permissions, internal contact and admin list |
| `contracts/openapi/customer-service.yaml` | 7 operations: vehicle types, client vehicles, admin vehicle lookup |
| `contracts/openapi/booking-service.yaml` | 40 operations: catalog, schedule and exceptions, establishment, bays, availability, bookings (client, admin, operator via operations-service), cancellation reasons, day summary, internal routes |
| `contracts/openapi/operations-service.yaml` | 34 operations: operators and profiles, shifts, absences, metrics, assignment (with notes) and candidates, free operators, to-close list, operator services, ratings, inspection report (admin and public link) |
| `contracts/openapi/payment-service.yaml` | 28 operations: payment accounts and methods, payments with receipt, admin review, manual payments, refunds, promotions, loyalty balance, coupon redemption and removal, health |
| `contracts/openapi/notification-service.yaml` | 10 operations: inbox, unread count, read/unread/delete, push tokens, admin notifications, internal app-update notice |
| `contracts/openapi/api-gateway.yaml` | The 6 gateway routes and their `Path` predicates, what is not published, session check, gateway health |
| `contracts/openapi/_shared.yaml`, `_template-service.yaml` | Reference templates for a new contract, not contracts |

142 operations in the six services (140 controller actions plus the two health endpoints of
payment-service), checked one by one against the code.

---

## How the contracts are made

They are **rebuilt from the source code** of `origin/develop`, not exported from running services
(the earlier springdoc/Swashbuckle exports had no error responses, no roles and, in payment, no
security scheme). The code read on 2026-10-23:

| Repository | Commit |
|---|---|
| `security-service` | `113fc4d` |
| `lavarapido-customer-service` | `02cdb46` |
| `lavarapido-booking-service` | `38681b2` |
| `lavarapido-operations-service` | `71df4b2` |
| `lavarapido-payment-service` | `16a6fac` |
| `lavarapido-notification-service` | `0831ce7` |
| `lavarapido-api-gateway` | `3f5eae3` |

What comes from where:

- **Paths, methods, parameters** — `@RequestMapping` + `@Get/Post/Put/Patch/DeleteMapping`,
  `@PathVariable`, `@RequestParam` (`required`, `defaultValue`), `@RequestBody`, multipart parts;
  in .NET `[Route]`, `[HttpX]`, route constraints (`{id:long}`), `[FromQuery]` and `app.MapGet`.
- **Bodies** — the Java records and enums (with `@NotNull`, `@NotBlank`, `@NotEmpty`, `@Size`,
  `@Min`, `@Max`, `@Positive`, `@Email`, `@Pattern`, `@JsonFormat`) and the C# positional records
  (camelCase, non-nullable = required).
- **Success codes** — `@ResponseStatus`, `ResponseEntity.created/noContent/accepted`; in .NET
  `Created(...)`, `NoContent()`.
- **Roles** — the `SecurityConfig` of each Java service (same rule order) and `[Authorize(Roles)]`
  in payment-service, as `x-roles` and `x-access` on every operation.
- **Errors** — every error is a `ProblemDetail` with `code`. Each error response lists its codes in
  `x-codes`; they were traced from the controller method through the use cases, domain objects and
  adapters it calls, and each code's HTTP status is the one its exception gets in the service's
  `ApiExceptionHandler` / `GlobalExceptionHandler`. The full catalogue of every service (also the
  codes no endpoint returns) is in its `info.description` and `x-error-codes`. Some traced codes only
  happen with invalid stored data (a domain check that also runs when a row is read).
- **Descriptions** — a note checked by hand where the behaviour is not visible in the signature
  (today's changes: E-01, E-02, E-07, E-08, E-09, A-01, A-13, A-20, B-01), followed by the method's
  javadoc / XML doc as it is in the code (Spanish).
- `x-source` — controller file and line.

## How the contracts are checked

The same day a separate script, which reads the code line by line and does not share code with the
generator, compared the contracts with `origin/develop`:

| Check | Result |
|---|---|
| Every file is valid YAML and OpenAPI 3.x | 9 of 9 |
| Every `$ref` resolves | 737 of 737 |
| `operationId` unique in each contract; every operation has `responses` | 0 problems |
| `{method + path}` of each contract = the controllers' | 142 = 142 (0 more, 0 fewer) |
| 201 / 202 / 204 of each operation = the code's | 0 differences |
| `/internal/**` declares only `X-Internal-Key`; schemes declared where used | 0 problems |
| Gateway `x-routes` = `application.yml`; every public path routed to its own service; nothing internal published | 6 routes, 131 public operations routed, 0 internal published |

The request and response schemas were also compared with the last springdoc/Swashbuckle export
(2026-10-19/21): same properties in every schema except the new `notes` of the assignment (B-01).

## How to view or update a contract

- View: paste the YAML into https://editor.swagger.io, or open Swagger UI of the running service
  (`http://localhost:300N/swagger-ui.html`, `dev` profile; payment: `http://localhost:3005/swagger`,
  `Development`).
- Update after changing an endpoint: rebuild the contract from the code with the same method and run
  the check above in the same docs change. Do not edit the YAML by hand.

---

## Correlations

| Fed by | Feeds |
|---|---|
| `04-requirements/functional.md` | Endpoints per requirement |
| `06-data/models.md` | Data behind each schema |
| Contracts here | Web services in `Web/src/app/core/services`, the mobile API clients, gateway routes, `11-quality` web slice tests |
