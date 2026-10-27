# 07 — API Contracts

> How LavaRápido's services expose their HTTP APIs: conventions, authentication and the OpenAPI
> contract of each service. **Last updated: 2026-10-27** (booking: input validation, alternatives per vehicle and `bookedBy`; 2026-10-26: payment at booking in booking and payment), against `origin/develop` of every service and, for the booking changes of 2026-10-27, `main` (`506feca`, `v1.1.1`).

---

## Contents

| File | What it answers |
|------|-----------------|
| [`guidelines.md`](./guidelines.md) | Paths, status codes, error format (`ProblemDetail` + `code`), bodies, pagination |
| [`authentication.md`](./authentication.md) | JWT, session check, roles, public endpoints, service-to-service credentials |
| `contracts/openapi/security-service.yaml` | 23 operations: register, login, logout, session check, password recovery, profile, e-mail, password, address, preferences, closing one's own account, user admin, roles and permissions, internal contact and admin list |
| `contracts/openapi/customer-service.yaml` | 7 operations: vehicle types, client vehicles (role `CLIENT`; retiring one asks booking-service for active bookings), admin vehicle lookup |
| `contracts/openapi/booking-service.yaml` | 41 operations: catalog, schedule and exceptions, establishment, bays, availability, bookings (client only, admin, operator via operations-service), cancellation reasons, day summary, internal routes (including the active bookings of a vehicle) |
| `contracts/openapi/operations-service.yaml` | 34 operations: operators and profiles, shifts, absences, metrics, assignment (with notes) and candidates, free operators, to-close list, operator services, ratings, inspection report (admin and public link) |
| `contracts/openapi/payment-service.yaml` | 30 operations: payment accounts and methods, payments with receipt, admin review (optionally paged), manual payments, refunds, promotions, loyalty balance, coupon redemption, amount due and removal, health, internal "payment reported" check for booking-service |
| `contracts/openapi/notification-service.yaml` | 10 operations: inbox, unread count, read/unread/delete, push tokens, admin notifications, internal app-update notice |
| `contracts/openapi/api-gateway.yaml` | The 6 gateway routes and their `Path` predicates, what is not published, session check, rate limit on `/api/v1/auth/**`, client IP, timeouts, gateway health |
| `contracts/openapi/_shared.yaml`, `_template-service.yaml` | Reference templates for a new contract, not contracts |

145 operations in the six services (143 controller actions plus the two health endpoints of
payment-service), checked one by one against the code.

---

## How the contracts are made

They are **rebuilt from the source code** of `origin/develop`, not exported from running services
(the earlier springdoc/Swashbuckle exports had no error responses, no roles and, in payment, no
security scheme). The code read on 2026-10-24 (booking and payment on 2026-10-26; the booking changes
of 2026-10-27 — `serviceIds` with `maxItems: 10` and no `null` items, `bookedBy` only in the staff views,
400 `VALIDATION_ERROR` on `PUT /admin/schedule/business-hours`, alternatives without the vehicle's other
bookings — were edited by hand in `booking-service.yaml` after checking them on `main`, commit `506feca`):

| Repository | Commit |
|---|---|
| `security-service` | `b5fe56e` |
| `lavarapido-customer-service` | `3181cae` |
| `lavarapido-booking-service` | `db156cb` |
| `lavarapido-operations-service` | `37e32ff` |
| `lavarapido-payment-service` | `d94cde5` |
| `lavarapido-notification-service` | `c5429ad` |
| `lavarapido-api-gateway` | `c8b607a` |

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
  happen with invalid stored data (a domain check that also runs when a row is read). Codes the
  `ApiExceptionHandler` sets itself are in the catalogue too (`BOOKING_SERVICE_UNAVAILABLE` in
  booking and `DATABASE_UNAVAILABLE` in operations when the database does not answer, BIZ-13).
- **Descriptions** — a note checked by hand where the behaviour is not visible in the signature
  (2026-10-23: E-01, E-02, E-07, E-08, E-09, A-01, A-13, A-20, B-01; 2026-10-24: BIZ-02, BIZ-05,
  BIZ-08, BIZ-12, A-12, A-16, SEC-04, SEC-05, SEC-07, SEC-12, E-10), followed by the method's
  javadoc / XML doc as it is in the code (Spanish).
- `x-source` — controller file and line.

## How the contracts are checked

The same day a separate script, which reads the code line by line and does not share code with the
generator, compared the contracts with `origin/develop`:

| Check | Result |
|---|---|
| Every file is valid YAML and OpenAPI 3.x | 9 of 9 |
| Every `$ref` resolves | 767 of 767 |
| `operationId` unique in each contract; every operation has `responses` | 0 problems |
| `{method + path}` of each contract = the controllers' | 145 = 145 (0 more, 0 fewer) |
| 201 / 202 / 204 of each operation = the code's | 0 differences |
| `/internal/**` declares only `X-Internal-Key`; schemes declared where used | 0 problems |
| Gateway `x-routes` = `application.yml`; every public path routed to its own service; nothing internal published | 6 routes, 132 public operations routed, 0 internal published |
| Roles: the rules read from each `SecurityConfig.java` (in order, with their `String[]` constants) = the generator's; `x-access`/`x-roles` of every Java operation = what those rules give; exception → HTTP status of each `ApiExceptionHandler` = the generator's | 0 differences (115 operations, 29 rules) |

On 2026-10-23 the request and response schemas were also compared with the last springdoc/Swashbuckle
export (2026-10-19/21): same properties in every schema except the new `notes` of the assignment
(B-01). The fields added since (`startableUntil`, `notes` of the operator's services, `discountType`
and `discountValue` of the client's promotions, `hasReceiptImage` and `bookingCancelled` of a
payment, the amount due of a booking) come from the code of 2026-10-24.

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
