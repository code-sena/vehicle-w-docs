# 06 — Data

How the Vehicle Washing Service Management System stores, structures, and migrates its data.

## The rule everything else follows

> **Each microservice owns its data.** No service reaches into another service's tables
> directly — it asks over an API, or reacts to an event.

In practice, that means the 58 tables in this system (audit 1, booking 10, catalog 3, customer 3,
execution 11, notification 7, payment 7, promotion 5, security 11) are split across 9 SQL Server schemas
owned by 6 microservices (ADR-009) — **every schema has exactly one owning service**, and
**no foreign key crosses from one service's schemas into another's**. Where one service
genuinely needs another's data (26 columns, listed at the end of `models.md`), it's a plain,
indexed column with no FK, validated by the application instead of the database. See
`modeling-conventions.md` for why we run this as schemas inside one instance rather than six
separate physical databases, and what that trade-off costs us.

## What's in this folder

### [`models.md`](./models.md) ⭐
The full schema, service by service: DB engine, every table's DDL, its data dictionary, its
indexes, and the reasoning behind the non-obvious decisions (why a column is immutable, why a
FK is missing on purpose, why a value is denormalized). The services' Liquibase changelogs are the
source of truth: if they and this file ever disagree, the changelogs win and this file is out of
date. There is no global SQL script (see `migration-strategy.md`). Checked against the changelogs on
2026-10-24: 0 differences.

### [`data-dictionary.md`](./data-dictionary.md) ⭐
The fields that are easy to get wrong across services: status codes with hard-coded IDs,
flags that only make sense in combination (`is_public` + `min_completed_booking`,
`points_redeemed` + `points_discount_amount`), and columns whose name alone doesn't say what
they mean.

### [`modeling-conventions.md`](./modeling-conventions.md)
Naming, the standard audit block, soft delete, UTC timestamps, surrogate keys — the rules
that are supposed to look the same in every schema.

### [`normalization-assessment.md`](./normalization-assessment.md)
Where the model normalizes strictly (and why), and the handful of places it deliberately
doesn't — each one named, with the reason and the guard that keeps it from drifting.

### [`migration-strategy.md`](./migration-strategy.md)
How each service versions its schema with Liquibase (one changelog per service, one shared
numbering for the Java services and its own for payment-service), every migration file with its
precondition and rollback, the next free numbers, the IDs that must never be re-seeded out of order,
and how to make a breaking change without downtime.

## SQL or NoSQL?

All six services currently run on the same engine (SQL Server), not because every service
needs a relational model, but because the data itself — accounts, bookings, payments,
loyalty points — is relational by nature: fixed shape, real transactions, lots of joins within
a service. If a future service needed something else (a document store for flexible product
metadata, or a cache), nothing about the schema-per-service boundary
would need to change to add it — see `models.md`'s engine note for each service.

## How consistency works without a shared database

Without cross-schema foreign keys, consistency between services is **eventual**, not
transactional. Two patterns cover the gap where it matters:

- **Saga pattern** for multi-step flows that touch more than one service — a chain of
  compensating actions if a later step fails. (Approving a payment and crediting its loyalty points
  happen in the same service and transaction, so they do not need it.)
- **Outbox pattern** to guarantee an event is published if and only if the transaction that
  triggered it actually committed.

**Today neither is implemented**: events are published right after the commit (a crash between
commit and publish can lose one event — accepted risk, ADR-004), consumers are idempotent
(`notification.processed_event`, customer profile checks), and failed messages go to
dead-letter queues. Details → `05-architecture/pattern-guide.md`.

## Correlations with other sections

| This section is fed by… | And feeds into… |
|---|---|
| `02-domain/entities-and-rules.md` — the domain entities | The tables in `models.md` |
| `05-architecture/` — engine decisions per service | The `DB Engine` line in each service section of `models.md` |
| `models.md` | `07-api/contracts/openapi/` — what each service exposes over its API |
| `models.md` | `08-uml/` — diagrams |
| `models.md` | `09-microservices/services/<service>/data-model.md` (every column, key, index, trigger and migration of that service) |

## What this section answers

- What data does each microservice own, and in which engine?
- Why does a given table look the way it does — what would break if it were simpler?
- How does the schema change without breaking a service that's already running?
- Who is the "owner" of any given piece of data, and how does every other service reach it?
