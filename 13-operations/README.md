# 13 — Operations

> How the system is kept running: how problems are detected, how the team responds, and what
> availability is promised. The system runs on the team's machines (no production environment
> yet), so the commitments here are sized for development, demos and review sessions.

---

## Availability commitment (RNF-002)

| Indicator (SLI) | Objective (SLO) |
|---|---|
| Every service answers `UP` on `/actuator/health` | During every review session and demo |
| The core flows work end to end: sign-up → login → vehicle → booking → notification → operator assignment → start/finish → rating → payment with receipt → admin approval | Verified before every review session |

There is no SLA with an external customer: the project is academic.

**Before a review session (checklist):**
1. `docker compose up -d` and wait for `lavarapido-sqlserver` to be healthy (`payment-migrate` must end with exit code 0).
2. Start the services (payment-service with `dotnet run`, it is not in the compose file yet); all health checks `UP` on 3001–3006 and 8080 (see `observability.md`).
3. Run the core flow once with the demo accounts (client, admin and operator). The operator needs a weekly shift that covers the booking time, or the assignment fails with `OPERATOR_NOT_ON_SHIFT`.
4. RabbitMQ dead-letter queues empty.

---

## Contents

| File | What it answers |
|------|-----------------|
| [`observability.md`](./observability.md) | What logs, health checks and panels exist, and how to read them |
| [`incident-management.md`](./incident-management.md) | What to do when something breaks |

---

## Backup and recovery

All data lives in the `LavaRapido` database (Docker volume `sqlserver-data`). Back it up before
risky changes (migrations by hand, demos with real data):

```bash
docker exec lavarapido-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C \
  -Q "BACKUP DATABASE LavaRapido TO DISK = '/var/opt/mssql/backup/LavaRapido.bak' WITH INIT"
docker cp lavarapido-sqlserver:/var/opt/mssql/backup/LavaRapido.bak ./LavaRapido.bak
```

Restore: copy the file back into the container and run `RESTORE DATABASE LavaRapido FROM DISK = …
WITH REPLACE` with the services stopped. `docker compose down -v` **deletes** the volume and every
record.

---

## Correlations

| Section | Relationship |
|---------|--------------|
| `10-devops/` | How the system is started (local, Docker) |
| `09-microservices/services/*/runbook.md` | Symptoms and fixes per service |
| `04-requirements/non-functional.md` | RNF-002 (availability), RNF-005 (observability) |
