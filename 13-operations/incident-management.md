# Incident Management

> An incident is anything that stops the system from working as expected — in a demo, a review
> session (RNF-002) or while the team develops. The project runs on the team's machines (no
> production yet), so this playbook is sized for a small academic team: short, concrete, and
> pointing to the tools that actually exist.

---

## Severity classification

| Level | Definition | Example | Response |
|-------|------------|---------|----------|
| **P0** | Nothing works | SQL Server down, every service fails at startup, login impossible | Stop everything else |
| **P1** | A core flow is broken | Booking fails, "My vehicles" fails, notifications not created, an operator cannot be assigned or start a service, a payment cannot be reported or approved | Same day, before the next review |
| **P2** | Secondary feature broken, workaround exists | Emails not arriving but the inbox works; push not sent | Within the sprint |
| **P3** | Cosmetic | Untranslated text, wrong icon color | Backlog |

---

## Roles

| Role | Who | Responsibility |
|------|-----|----------------|
| Incident lead | Whoever detects it, or the owner of the affected service | Coordinates, keeps the team chat updated, decides when it is resolved |
| Service owner | Team member who owns the service (see `09-microservices/service-catalog.md`) | Diagnoses and fixes |

---

## Response playbook

### 1. Detect

- Someone sees an error in the web (translated `API_ERRORS.*` message), a 500, or a service that
  does not start.
- Check the health of everything:
  ```bash
  docker ps                                             # sqlserver / rabbitmq / mailpit healthy?
  for p in 3001 3002 3003 3004 3005 3006 8080; do echo "$p $(curl -s localhost:$p/actuator/health)"; done
  ```

### 2. Classify and tell the team

Post in the team chat: what fails, severity, who is looking at it.

### 3. Diagnose

| Look at | For |
|---|---|
| Terminal / `docker logs` of the failing service | The first `ERROR` / `Caused by` line |
| Browser DevTools → Network | Which call failed, its status and its `code` |
| `ng serve` console | `ECONNREFUSED` = the target service is not running |
| RabbitMQ panel (http://localhost:15672) | Queues growing, messages in a `.dlq` |
| Database (DBeaver / sqlcmd) | The data the flow reads or writes |
| Service runbook | Known symptoms and fixes: `09-microservices/services/<NN-service>/runbook.md` |

Frequent causes already seen in this project:

| Symptom | Cause |
|---|---|
| Service fails with "TCP connection to localhost:1433 failed" | Started before SQL Server was healthy |
| "Login failed for user 'sa'" with the right password | A native Windows SQL Server is also on port 1433 and answers instead of the container: stop the `MSSQLSERVER` service and restart the services |
| Every call answers 401 | Different `JWT_SECRET` between services |
| "Port … already in use" | An instance is still running |
| Times shifted 5 hours | JVM time zone (fixed in booking-service: JVM runs in UTC) |
| Booking emails only in the inbox | `INTERNAL_API_KEY` missing or different |
| `./mvnw` cannot read `distributionUrl` | `maven-wrapper.properties` without final newline |
| Payment screens fail, every other screen works | payment-service not running (it is not in the compose file; start it with `dotnet run`) or its tables missing (`payment-migrate` did not run) |
| Payment routes fail only with `--profile app` | The `api-gateway` container has no `ROUTE_PAYMENT_URL` and falls back to `localhost:3005` inside the container |
| Operator list empty / cannot assign | No account with role `OPERATOR`, or the operator has no shift for that time (`OPERATOR_NOT_ON_SHIFT`) |
| 503 `BOOKING_SERVICE_UNAVAILABLE` from operations or payment | booking-service down or `BOOKING_SERVICE_URL` wrong |

### 4. Mitigate

Get the flow working again first (restart the service, fix the `.env`, start the missing
container), then fix the root cause in code with a branch and a PR.

### 5. Resolve and record

Post the cause and the fix in the chat. For P0/P1 write a short post-mortem.

---

## Post-mortem (P0 and P1)

Blameless, one page, kept in `13-operations/postmortems/YYYY-MM-DD-<title>.md`:

```markdown
# <date> — <what failed>
**Severity:** P0/P1   **Duration:** …   **Affected:** <flow / service>
## What happened (timeline)
## Root cause
## How it was fixed
## What we change so it does not happen again (owner, date)
```

---

## Communication channels

| Channel | Use |
|---------|-----|
| Team chat | Incident notice, progress, resolution |
| GitHub issue / PR | The code fix, linked from the post-mortem |

---

## Correlations

- Observability (logs, health, broker) → `13-operations/observability.md`
- Runbooks → `09-microservices/services/<NN-service>/runbook.md`
- Local setup and common issues → `10-devops/local-setup.md`
