# ADRs — Architecture Decision Records

ADRs document important architectural decisions. Each file = one decision.

## How to create an ADR

1. Copy `_template-adr.md`
2. Name it `ADR-NNN-short-title.md` (e.g.: `ADR-001-message-broker.md`)
3. Fill it in completely — especially the evaluated alternatives
4. Once accepted, the status is **permanent** (it is not deleted, it is "Superseded" by another ADR)

## Possible statuses

- `Proposed` — under discussion
- `Accepted` — approved by the team
- `Rejected` — evaluated and discarded (document why)
- `Superseded` — superseded by ADR-NNN (indicate which one)

## ADR register

| # | Title | Status | Date |
|---|-------|--------|------|
| 001 | [Documentation language](records/ADR-001-documentation-language.md) | Accepted | [date] |
| 002 | [Architectural style and service decomposition](records/ADR-002-architectural-style-and-service-decomposition.md) | Accepted | 2026-09-10 |
| 003 | [Database strategy](records/ADR-003-database-strategy.md) | Accepted | 2026-09-10 |
| 004 | [Communication between services](records/ADR-004-service-communication.md) | Accepted | 2026-09-10 |
| 005 | [API Gateway](records/ADR-005-api-gateway.md) | Accepted | 2026-09-10 |
| 006 | [Authentication and authorization](records/ADR-006-authentication-and-authorization.md) | Accepted | 2026-09-10 |
| 007 | [Internal architecture of the services](records/ADR-007-internal-service-architecture.md) | Accepted | 2026-09-10 |
| 008 | [Payment verification by QR and receipt](records/ADR-008-payment-verification.md) | Accepted | 2026-09-10 |

> Add rows here as you create ADRs in `records/`

## Reading order

ADR-002 and ADR-003 are the ones the rest depend on: they define how many services there
are and how the data is separated. Both follow the data model in `06-data`, which the whole
team built.

Four decisions are worth knowing before reading the architecture, because they are where
this project departs from the usual microservices description:

- **One service per schema**, ten in total (ADR-002).
- **The services share one SQL Server database**, with no foreign keys crossing between
  schemas (ADR-003).
- **The eighteen cross-schema references are validated by the application** before writing
  (ADR-004).
- **There is no payment gateway.** The customer pays outside the system and the
  administrator verifies the receipt (ADR-008).