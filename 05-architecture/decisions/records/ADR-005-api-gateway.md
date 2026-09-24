# ADR-005 — API Gateway

| Field | Value |
|---|---|
| **ID** | ADR-005 |
| **Date** | 2026-09-24 |
| **Status** | Accepted |
| **Authors** | Development team |
| **Reviewers** | Development team |

## Context

The Angular web client and React Native Android client should not need to know the internal addresses of six backend services. Authentication also needs one edge where anonymous traffic can be rejected before routing.

## Decision

Use a single **API Gateway** as the external HTTP entry point. The current stack uses Spring Cloud Gateway.

The gateway is infrastructure, not a domain service. It routes requests to the six backend services and performs the edge authentication check. Each service still validates the JWT and applies its own authorization/ownership rules.

## Responsibilities

- Route client requests.
- Reject missing/invalid JWTs at the edge.
- Forward the Authorization header.
- Generate or forward a correlation id.
- Apply request/file limits relevant to the API.

## Non-responsibilities

The gateway does not contain booking, payment, assignment or loyalty business rules. It does not become a shared business-logic layer.

## Consequences

Clients have one base URL and internal service addresses remain an implementation detail. The gateway becomes a required component for external traffic, so its health must be checked in the local deployment.

## References

- Security → `ADR-006-authentication-and-authorization.md`
- Deployment → `../deployment.md`
