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
| 409 `SERVICE_TOO_LATE` | More than `START_LATE_LIMIT` (4 h) after the booking's end time (A-12) | Expected; the admin closes it from "Por cerrar" |
| 503 `SECURITY_SERVICE_UNAVAILABLE` | security-service did not answer the account check; the assignment fails closed (A-13) | Start security; the manual assignment is retried with one click, the automatic one by RabbitMQ |
| 503 `NOTIFICATION_NOT_SENT` when sharing an inspection | The broker did not confirm the event, or messaging is off (OPS-08) | Check RabbitMQ and `MESSAGING_ENABLED`; share again |
| 503 `DATABASE_UNAVAILABLE` | The database does not answer (OPS-12) | Check `lavarapido-sqlserver` |
| Messages in `operations-service.booking-confirmed.dlq` | The automatic assignment failed 3 times (booking, security or the database down) (OPS-04) | Fix the cause and assign by hand, or move the message back to the queue in the panel |
| A booking was left without operator after a reschedule and admins got a notice | Expected (E-12): nobody could take it at the new time | Assign somebody by hand |
| False "not started" notices for a booking the admin set `COMPLETED` | Known (medium): the follow-up job still sees its lines open | Close it from "Por cerrar" |
| 409 `BOOKING_NOT_TO_CLOSE` | "Attended" on a booking that is not in the "Por cerrar" list | Expected |
| 503 when the operator starts or finishes | `INTERNAL_API_KEY` empty or different from booking-service (E-01) | Same key in both services |
| A booking is not in "Por cerrar" | The list looks back `FOLLOW_UP_LOOK_BACK_DAYS` (28) days | Expected; older bookings are closed from the bookings screen |
| The operator retries "Terminar" after a timeout | Since OPS-01 the line is saved before calling booking, and a 409 from booking for a step already done is taken as done | Retry; a `COMPLETED` booking with an open line shows in "Por cerrar" |
| 409 `EXECUTION_ALREADY_STARTED` | Reassign or start a service already started | Expected |
| 503 `BOOKING_SERVICE_UNAVAILABLE` | booking-service down or unreachable | Start it; check `BOOKING_SERVICE_URL` |
| No "operator assigned" notification | `MESSAGING_ENABLED=false`, RabbitMQ down or notification-service down | Check the three; the assignment itself is saved |

## Tests

`./mvnw verify`: 110 tests in the CI run of 2026-10-24 (no database needed).

## Useful queries

```sql
-- executions with operator and status
SELECT e.service_execution_id, e.booking_service_id, o.user_id, s.code, e.started_at, e.finished_at, e.quality_rating
FROM execution.service_execution e
JOIN execution.operator o ON o.operator_id = e.operator_id
JOIN execution.execution_status s ON s.execution_status_id = e.execution_status_id
ORDER BY e.service_execution_id DESC;
```
