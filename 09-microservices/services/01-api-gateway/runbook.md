# Runbook — API Gateway

**Service:** api-gateway · **Port:** 8080 · **Repository:** `lavarapido-api-gateway`
**Last updated:** 2026-10-24

---

## 1. Quick facts

| Item | Value |
|---|---|
| Start | `./mvnw spring-boot:run` (or the `api-gateway` service in `lavarapido-infra/docker-compose.yml`) |
| Health | `GET http://localhost:8080/actuator/health` |
| Depends on | The 6 services it routes to (it starts without them; their routes fail until they are up) |
| Database / broker | None |

---

## 2. Check health

```bash
curl -s localhost:8080/actuator/health                 # {"status":"UP",...}
curl -s localhost:8080/api/v1/catalog/services         # public route through booking-service
for p in 3001 3002 3003 3004 3005 3006; do echo "$p $(curl -s localhost:$p/actuator/health)"; done
```

---

## 3. Known symptoms

| Symptom | Cause | Fix |
|---|---|---|
| A route answers 500/502 with "Connection refused" in the log | The target service is not running | Start it; check `ROUTE_*_URL` |
| 404 on a path that works on the service directly | Path not in the route predicates (or it is `/internal/**`, never routed on purpose) | Add the path to the route in `application.yml`, restart |
| Browser: CORS error | Web origin not in `CORS_ALLOWED_ORIGINS` | Add it (comma separated), restart |
| Browser: duplicated `Access-Control-Allow-Origin` | A new route without the `RemoveResponseHeader` filters | Copy the three filters to the route |
| 401 on every protected call | Token invalid for the services (`JWT_SECRET` differs between services) — the gateway does not validate signatures | Same `JWT_SECRET` in every service |
| 401 right after a logout, a password change or recovery, or a disabled account | Expected: `SessionCheckFilter` asked security-service and the session is closed (answer cached 30 s), whatever the scheme (`Bearer`, `bearer`, `BEARER`…; SEC-01) | Log in again |
| 429 `RATE_LIMITED` on `/api/v1/auth/**` (with `Retry-After`) | More than `AUTH_RATE_LIMIT_REQUESTS` (60) requests per minute from one IP (SEC-04) | Wait the seconds of `Retry-After`. If it hits every user at once, the log line "Demasiadas peticiones… desde X" shows `172.x`: the real client IP is not arriving (check `TRUSTED_PROXIES`, Caddy) |
| 500 after about 60 s (photo upload, report download) | `ROUTE_READ_TIMEOUT` (60 s) or `ROUTE_CONNECT_TIMEOUT` (5 s) passed (SEC-16) | Check the slow service; raise the timeout only if the operation really needs it |
| Calls slow by ~3 s, or closed sessions still pass | security-service does not answer: the session check waits `SESSION_CHECK_TIMEOUT` and lets the call go (fail-open) | Start security-service; check the gateway's security URL |
| 404 on `/api/v1/operator/bookings/**` | Expected since 2026-10-23 (E-01): only operations-service calls those booking routes, inside the network | Use `/api/v1/operator/services/**` (operations) |
| "Port 8080 already in use" | Another instance or program on 8080 | Stop it or set `GATEWAY_PORT` |

---

## 4. Routine operations

| Task | How |
|---|---|
| Web through the gateway | Already done: the web `proxy.conf.json` has one `/api` entry targeting `http://localhost:8080`. If every API call fails from `ng serve`, check that the gateway is running |
| Add a service | New route block in `application.yml` + test in `GatewayRoutesTest` |
| Run the tests | `./mvnw verify` (62 tests in the CI run of 2026-10-24; starts fake HTTP servers, no other service needed) |

---

## Correlations

- Routes and design → `README.md`, `decisions.md`
- Incidents → `13-operations/incident-management.md`
