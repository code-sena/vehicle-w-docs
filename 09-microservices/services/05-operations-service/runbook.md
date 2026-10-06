# Runbook — Operations Service

## Health

```bash
curl http://localhost:3004/actuator/health      # {"status":"UP"}
```

## Common problems

| Symptom | Likely cause | What to do |
|---|---|---|
| `Port 3004 was already in use` | Another instance is running | Stop it or set `OPERATIONS_PORT` |
| Operator list empty | No account with role `OPERATOR` in security-service | Create one in Admin > Users |
| 409 `OPERATOR_NOT_ON_SHIFT` | The operator has no shift covering the whole booking | Set the weekly shift in Admin > Operators |
| 409 `OPERATOR_ABSENT` / `OPERATOR_BUSY` | Absence or another booking at that time | Expected; check the candidates list |
| 409 `BOOKING_NOT_ASSIGNABLE` | The booking is not `SCHEDULED` / `CONFIRMED` | Expected |
| 409 `SERVICE_NOT_TODAY` | The operator tried to start a service on another day | Expected |
| 409 `EXECUTION_ALREADY_STARTED` | Reassign or start a service already started | Expected |
| 503 `BOOKING_SERVICE_UNAVAILABLE` | booking-service down or unreachable | Start it; check `BOOKING_SERVICE_URL` |
| No "operator assigned" notification | `MESSAGING_ENABLED=false`, RabbitMQ down or notification-service down | Check the three; the assignment itself is saved |

## Useful queries

```sql
-- executions with operator and status
SELECT e.service_execution_id, e.booking_service_id, o.user_id, s.code, e.started_at, e.finished_at, e.quality_rating
FROM execution.service_execution e
JOIN execution.operator o ON o.operator_id = e.operator_id
JOIN execution.execution_status s ON s.execution_status_id = e.execution_status_id
ORDER BY e.service_execution_id DESC;
```
