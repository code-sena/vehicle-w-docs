# ADR-003 — Database Strategy

| Field | Value |
|-------|-------|
| **ID** | ADR-003 |
| **Date** | 2026-09-10 |
| **Status** | Accepted |
| **Authors** | Juan Camilo Guilombo  — [role] |
| **Reviewers** | Brayan Patiño, Merari Urbano, Juan Camilo Guilombo — Development team |

---

## Context

ADR-002 defines ten backend services. Each of them needs to persist data, and the standard
microservices answer is one database per service. The scaffold this repository is based on
assumes exactly that: `05-architecture/README.md` states that a shared database destroys
service independence, and the original `06-data/models.md` called it mandatory.

That is not what this project does. The data model the team built in `06-data` defines
**one SQL Server database with ten schemas and 43 tables**, and it is already precise about
how the separation works:

- 29 foreign keys, every one of them inside its own schema.
- **Zero foreign keys crossing between schemas.**
- 18 columns that reference another schema, each with an index and a comment naming the
  owning service, validated by the application.

`security` and `audit` are the shared core supplied by the instructor and are identical
across the ten projects of the ficha, so they are not ours to restructure.

**Known constraints:**

- One SQL Server instance running in Docker on each team member's machine. No cloud, no
  managed database service, no budget.
- Reporting (RF-023) needs data from several schemas.
- Three part-time developers. Every extra database is another container, another set of
  credentials and another migration chain.
- The system does not start without seed data: there is no booking without the `AGENDADA`
  status row.

---

## Decision

**We decided:** the system uses **one SQL Server database, separated by schema, one schema
per service**, exactly as defined in `06-data`.

| Rule | How |
|------|-----|
| One schema per service | `security`, `audit`, `settings`, `customer`, `catalog`, `reserva`, `execution`, `promotion`, `payment`, `notification` |
| One database user per service | Permissions only on its own schema |
| No foreign keys between schemas | A cross-schema column carries an index and a comment, never an FK |
| Cross-schema references are validated by the application | Against the owning service, before writing (ADR-004) |
| Integrity inside a schema | Foreign keys, `CHECK` constraints, filtered indexes and triggers |
| Identifiers | `IDENTITY(1,1)` integers, not UUIDs |
| Text | `NVARCHAR`, so accents and ñ are stored correctly |
| Timestamps | `DATETIME2(3)`, always UTC, written with `SYSUTCDATETIME()` |
| Audit block | Every domain table carries `created_at/by`, `updated_at/by`, `deleted_at/by` and `row_version` |
| Deletion | Logical: `deleted_at` is filled and the row stops counting. Nothing is physically deleted |
| Concurrency | Optimistic locking through `row_version`, incremented by a trigger |
| Change history | One `audit.audit_log` table written by a trigger per domain table, storing the old and new values as JSON |
| Migrations | One Liquibase changelog per service, limited to its own schema |

**Justification:**

- **The boundary is enforced, not agreed.** A database user per schema plus zero
  cross-schema foreign keys means the database itself rejects a service that reaches into
  a domain that is not its own. That is a stronger guarantee than a naming convention.
- **Separate databases would break the shared core.** `security` and `audit` are used by
  every other schema through references and through the audit trigger; splitting them into
  their own database would mean the trigger can no longer write, and the instructor's DDL
  would have to be modified.
- **It matches the environment.** Ten SQL Server containers on a student laptop is not
  realistic, and there is no environment where the operational independence of separate
  databases would pay off.
- **Reports need to read across schemas.** RF-023 asks for figures that live in `reserva`,
  `execution` and `payment` at the same time. With one database that is a query; with ten
  it would need replication.

---

## Evaluated alternatives

| Alternative | Pros | Cons | Reason for discarding |
|-------------|------|------|-----------------------|
| **A — One database, one schema per service, no cross-schema FKs (chosen)** | The boundary is enforced by permissions; one container to run; reporting stays possible; matches the instructor's core | The database is a shared coupling point; referential integrity between services depends on application code | — (chosen) |
| **B — Database per service** | Full independence; each service could evolve its storage on its own | Ten SQL Server instances locally; the shared core and its audit trigger stop working; reporting would need replication | The cost is real and the benefit only appears in a production deployment that is out of scope |
| **C — One database with foreign keys across schemas** | The database would guarantee every reference | Deploying or changing one service would affect the others; it is the option `06-data` explicitly rejected | Would turn the ten services back into one coupled block |
| **D — One database with a single schema** | Simplest possible option | Any service could read and write anything; the ten boundaries would exist only on paper | Loses the ownership model the whole project is built on |

---

## Consequences

**Positive:**

- Each service owns exactly one schema, so the ownership rule is easy to check in a review.
- Every domain table carries the same audit block, so "who changed this and when" has one
  answer across the whole system.
- `row_version` gives optimistic locking without any extra infrastructure, which is what
  RNF-003 needs for two administrators editing the same booking.
- The team runs one database container, so the local setup required by RNF-007 stays
  reproducible.

**Negative / Trade-offs:**

- **A booking and its payment can no longer be written in one transaction.** They live in
  different schemas owned by different services, so the consistency between them is the
  application's responsibility. RNF-003 currently states the opposite and has to be
  corrected.
- Nothing in the database prevents an orphan reference: a payment can point to a booking
  that does not exist if the application does not validate first.
- A badly designed migration can affect every service, because there is one database.
- Two seed identifiers are frozen: `reserva_status.CANCELADA = 5` and
  `payment_status.APPROVED = 3` are written as literals inside constraints and indexes.
  Changing them breaks the database.

**Impact on the system:**

- Affected services: all ten.
- Documents that must be updated:
  - `04-requirements/non-functional.md` — RNF-003 requires a payment and its booking to be
    written in the same transaction, which this model cannot provide.
  - `05-architecture/cross-cutting.md` — audit block, logical deletion and optimistic
    locking are now cross-cutting rules.

---

## Pending decisions

- Where the initialisation script lives: the database, the ten schemas and the ten users
  have to exist before any service can run its migrations. See `deployment.md`.
- Whether `password_reset_token` is already part of the instructor's shared core. If it is,
  our definition has to be aligned instead of duplicated (`06-data`, section 19).

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| A service queries another schema because it is faster than calling the API | High | Medium | One database user per service, with permissions only on its own schema |
| A cross-schema reference is written without validating it and leaves an orphan row | High | High | The eighteen references are listed in `06-data`, section 16; each is validated against its owning service before writing |
| Someone renumbers the seed catalogs and breaks the constraints that use literal IDs | Medium | High | The seed inserts use `SET IDENTITY_INSERT` with explicit IDs; the two frozen values are documented in `06-data`, section 17 |
| Two services' migrations conflict on the same database | Medium | Medium | One changelog per service, limited to its schema, reviewed in the Pull Request (RNF-006.1) |

---

## References

- Schemas, tables, constraints, triggers and seed data → `06-data/MODELO-DE-DATOS.md`
- Cross-service references → `06-data/MODELO-DE-DATOS.md`, section 16
- SQL Server technical notes → `06-data/MODELO-DE-DATOS.md`, section 18
- Concurrency and integrity requirements → `04-requirements/non-functional.md` (RNF-003)
- Versioned migrations → `04-requirements/non-functional.md` (RNF-006.3)
- Service list → ADR-002
- Related to: ADR-004 (service communication)