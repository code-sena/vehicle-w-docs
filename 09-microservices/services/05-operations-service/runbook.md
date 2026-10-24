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
| 409 `BOOKING_IN_PAST` | The booking's end time already passed (ADR-014 §8) | Expected; close it from "Por cerrar" or mark it no-show |
| 409 `OPERATOR_ACCOUNT_DISABLED` | The operator's account is disabled in security-service (A-13) | Expected; enable the account or pick another operator |
| 409 `ASSIGNMENT_BUSY` | Another assignment (manual or automatic) holds the assignment lock | Try again in a few seconds |
| 400 `INVALID_ASSIGNMENT_NOTES` | Assignment notes longer than 300 characters (B-01) | Shorten them |
| 409 `SERVICE_TOO_EARLY` | The operator tried to start more than 15 minutes before the booking (`StartPolicy`) | Expected; the screen shows `startableAt` |
| 409 `BOOKING_NOT_TO_CLOSE` | "Attended" on a booking that is not in the "Por cerrar" list | Expected |
| 503 when the operator starts or finishes | `INTERNAL_API_KEY` empty or different from booking-service (E-01) | Same key in both services |
| A booking is not in "Por cerrar" | The list looks back `FOLLOW_UP_LOOK_BACK_DAYS` (28) days | Expected; older bookings are closed from the bookings screen |
| Finish failed and now the operator can neither finish (`BOOKING_STATE_CONFLICT`) nor start another (`OPERATOR_BUSY`) | Known issue OPS-01: booking became `COMPLETED` but the line stayed `IN_PROGRESS` | Ask the service owner: the line must be completed by hand until OPS-01 is fixed (`15-project-control/risks.md`) |
| 409 `EXECUTION_ALREADY_STARTED` | Reassign or start a service already started | Expected |
| 503 `BOOKING_SERVICE_UNAVAILABLE` | booking-service down or unreachable | Start it; check `BOOKING_SERVICE_URL` |
| No "operator assigned" notification | `MESSAGING_ENABLED=false`, RabbitMQ down or notification-service down | Check the three; the assignment itself is saved |

## Tests

`./mvnw verify`: 72 tests in the CI run of 2026-10-23 (no database needed).

## Useful queries

```sql
-- executions with operator and status
SELECT e.service_execution_id, e.booking_service_id, o.user_id, s.code, e.started_at, e.finished_at, e.quality_rating
FROM execution.service_execution e
JOIN execution.operator o ON o.operator_id = e.operator_id
JOIN execution.execution_status s ON s.execution_status_id = e.execution_status_id
ORDER BY e.service_execution_id DESC;
```
