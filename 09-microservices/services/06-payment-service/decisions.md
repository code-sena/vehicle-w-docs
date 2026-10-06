# Technical decisions — Payment Service

## Stack: .NET instead of Spring Boot

**Decision:** payment-service is ASP.NET Core (.NET 8) with EF Core, in four projects (Domain,
Application, Infrastructure, Api). It keeps the shared contract: JWT HS256 with the same secret,
issuer and audience; RFC 9457 errors with `code`; `/actuator/health`; reads
`lavarapido-infra/.env` (`EnvFile.Load`).
**Consequences:** Liquibase runs in a container (`payment-migrate`), not on startup. The port is
`PAYMENT_PORT`, not `PORT`.

## The amount comes from booking-service

**Decision:** When a payment is reported or registered, the amount is the booking total returned
by booking-service with the caller's token. The browser never sends the amount.

## Reported payments go straight to review

**Decision:** A client payment is created `PENDING`, the receipt is attached and it moves to
`IN_REVIEW` in the same operation. A booking cannot have two open payments
(409 `PAYMENT_ALREADY_REPORTED`) nor a second approved one (409 `PAYMENT_ALREADY_APPROVED`,
backed by the unique index).

## Manual payments are approved at once

**Decision:** The admin registers a payment received at the shop; it goes through the same states
(receipt `manual:registrado-por-admin` → review → approved) in one transaction, so the history is
the same as a reviewed payment.

## Images stored as data URLs

**Decision:** Until there is file storage, the account QR and the receipt are stored as data URLs
in `NVARCHAR(MAX)` columns (migration 016). The request body limit is 8 MB.
