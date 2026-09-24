# Deployment

**Last updated:** 2026-09-24

The current project environment is local development and testing. There is no staging or production deployment in scope.

## 1. Environments

| Environment | Status | Purpose |
|---|---|---|
| Local | In scope | Development and integration testing with Docker |
| Staging | Out of scope | Not built in this academic version |
| Production | Out of scope | The system is not deployed for real users |

## 2. Runtime components

The local environment contains:

| Component | Role |
|---|---|
| SQL Server | One physical database containing the nine owned schemas |
| RabbitMQ | Asynchronous event broker |
| API Gateway | External HTTP entry point |
| Six backend services | Domain functionality |
| Web application | Angular client |
| Android application | React Native client; development status is separate from backend deployment |
| Mailpit | Local SMTP catcher for password-recovery messages |

The exact application-service ports are configuration details and must be taken from the active Docker/DevOps configuration rather than invented in this document. The API Gateway is the client entry point.

## 3. Logical topology

```text
Angular / React Native
          │
          ▼
     API Gateway
          │
   ┌──────┴─────────────────────────────┐
   │                                    │
   ▼                                    ▼
Six Spring Boot services              RabbitMQ
   │                                    │
   └──────────────┬─────────────────────┘
                  ▼
              SQL Server
                  │
          one physical database
                  │
          nine logical schemas

security-service ──► Mailpit / SMTP
```

## 4. SQL Server deployment

The database is shared physically but separated logically by schema ownership:

- `security`, `audit` → `security-service`
- `customer` → `customer-service`
- `catalog`, `booking` → `booking-service`
- `execution` → `operations-service`
- `promotion`, `payment` → `payment-service`
- `notification` → `notification-service`

Cross-service foreign keys are not used. This keeps the logical service boundaries visible even though the academic environment uses one database instance.

## 5. Service startup order

The application should not rely on a fixed hard-coded startup order beyond infrastructure readiness. At minimum, SQL Server and RabbitMQ must be available before services that depend on them start.

A practical local sequence is:

1. SQL Server
2. RabbitMQ
3. Mailpit
4. `security-service`
5. `customer-service`
6. `booking-service`
7. `operations-service`
8. `payment-service`
9. `notification-service`
10. API Gateway

This sequence follows the current build order from the architecture decision, but services should still perform health/readiness checks rather than assuming another container is ready merely because it started.

## 6. Configuration

Environment-specific values must be external to the source code. Examples include:

- SQL Server connection string
- RabbitMQ host and credentials
- JWT signing secret
- SMTP configuration
- application ports

A committed `.env.example` may document variable names without real secrets. Real credentials must never be committed.

## 7. Storage and backups

SQL Server uses persistent storage in the local Docker environment. The repository's current scope does not define a production backup strategy because production is out of scope.

Payment receipt storage is still a pending implementation decision. Until it is defined, this document does not prescribe a folder path or database storage format.

## 8. Health and verification

Each service should expose a health/readiness endpoint through the implementation used by the team. The gateway is the main entry point for client verification.

Integration checks should cover:

- database connectivity
- RabbitMQ connectivity
- JWT authentication
- service-to-service validation
- booking creation and conflict handling
- payment review

## 9. CI/CD boundary

Jenkins and pipeline configuration belong to `10-devops`. This section only describes what must be available for the architecture to run locally.

## References

- Local environment → `10-devops/local-setup.md`
- Requirements → `04-requirements/non-functional.md`
- Data model → `06-data/models.md`
- Service decomposition → `decisions/records/ADR-009-service-decomposition-revised.md`
