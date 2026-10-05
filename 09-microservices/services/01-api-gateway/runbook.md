# Runbook — API Gateway

**Service:** api-gateway · **Port:** 8080 · **Repository:** `lavarapido-api-gateway`
**Last updated:** 2026-10-04

---

## 1. Quick facts

| Item | Value |
|---|---|
| Start | `./mvnw spring-boot:run` (or the `api-gateway` service in `lavarapido-infra/docker-compose.yml`) |
| Health | `GET http://localhost:8080/actuator/health` |
| Depends on | The 4 services it routes to (it starts without them; their routes fail until they are up) |
| Database / broker | None |

---

## 2. Check health

```bash
curl -s localhost:8080/actuator/health                 # {"status":"UP",...}
curl -s localhost:8080/api/v1/catalog/services         # public route through booking-service
for p in 3001 3002 3003 3006; do echo "$p $(curl -s localhost:$p/actuator/health)"; done
```

---

## 3. Known symptoms

| Symptom | Cause | Fix |
|---|---|---|
| A route answers 500/502 with "Connection refused" in the log | The target service is not running | Start it; check `ROUTE_*_URL` |
| 404 on a path that works on the service directly | Path not in the route predicates (or it is `/internal/**`, never routed on purpose) | Add the path to the route in `application.yml`, restart |
| Browser: CORS error | Web origin not in `CORS_ALLOWED_ORIGINS` | Add it (comma separated), restart |
| Browser: duplicated `Access-Control-Allow-Origin` | A new route without the `RemoveResponseHeader` filters | Copy the three filters to the route |
| 401 on every protected call | Token invalid for the services (`JWT_SECRET` differs between services) — the gateway does not validate tokens | Same `JWT_SECRET` in every service |
| "Port 8080 already in use" | Another instance or program on 8080 | Stop it or set `GATEWAY_PORT` |

---

## 4. Routine operations

| Task | How |
|---|---|
| Point the web to the gateway | Today the web `proxy.conf.json` targets each service directly (3001–3006). To go through the gateway, replace those entries with one `/api` entry targeting `http://localhost:8080` |
| Add a service | New route block in `application.yml` + test in `GatewayRoutesTest` |
| Run the tests | `./mvnw test` (22 tests; starts fake HTTP servers, no other service needed) |

---

## Correlations

- Routes and design → `README.md`, `decisions.md`
- Incidents → `13-operations/incident-management.md`
