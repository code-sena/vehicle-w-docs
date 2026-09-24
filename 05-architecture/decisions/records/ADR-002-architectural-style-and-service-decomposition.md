# ADR-002 — Original Architectural Style and Service Decomposition

| Field | Value |
|---|---|
| **ID** | ADR-002 |
| **Date** | 2026-09-09 |
| **Status** | Superseded by ADR-009 |
| **Authors** | Development team |
| **Reviewers** | Development team |

## Context

The first architecture divided the backend into a larger number of services, closely following the first version of the domain map. That decomposition was useful for identifying ownership, but it created services that were too small for the current academic project and separated concepts that are tightly related in the current data model.

## Original decision

The project initially treated individual domains/schemas as separate backend services. The exact old service list is preserved in Git history and is not the current architecture.

## Why it was superseded

The data model was consolidated so that related schemas are owned by the same service. The revised decomposition is documented in ADR-009. The current model has six services, nine schemas and 43 tables in one physical SQL Server database.

## Consequences

This ADR remains useful as historical traceability only. Current documents must use ADR-009 and the service ownership in `06-data/models.md`.

## Current replacement

See `ADR-009-service-decomposition-revised.md`.
