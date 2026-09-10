# ADR-005 — API Gateway

| Field | Value |
|-------|-------|
| **ID** | ADR-005 |
| **Date** | 2026-09-10 |
| **Status** | Accepted |
| **Authors** | Juan Camilo Guilombo  — [role] |
| **Reviewers** | Brayan Patiño, Merari Urbano, Juan Camilo Guilombo — Development team |

---

## Context

With ten backend services (ADR-002), the Angular web client and the React Native mobile
client would otherwise need to know the address of every one of them, repeat the
authentication handling twice, and change every time a service moves. Both clients consume
the same API, so the problem would be solved twice.

`01-context/glossary.md` already defines an API Gateway as the single entry point that
routes requests to the corresponding services, so the component is expected. What is not
decided is which technology implements it and, more importantly, what it is responsible
for. The scaffold suggests Kong with Redis for caching and rate limiting, which is not this
project's stack.

**Known constraints:**

- Java 21 + Spring Boot is the backend stack. Anything else is a new technology for a
  three-person team.
- Everything runs in local Docker. No public exposure, no real traffic.
- RNF-004.1 requires a valid JWT on private endpoints; RNF-004.5 requires each role to
  reach only its own endpoints.
- Service-to-service calls do not pass through the gateway (ADR-004).
- Customers upload payment receipt images (ADR-008), so the entry point has to handle file
  uploads.

---

## Decision

**We decided:** use **Spring Cloud Gateway** as the single entry point for the web and
mobile clients.

### What the gateway does

| Responsibility | Detail |
|----------------|--------|
| Single entry point | The clients know one address; the services are not addressed directly |
| Routing | By path prefix, one per service: `/api/security/**`, `/api/audit/**`, `/api/settings/**`, `/api/customers/**`, `/api/catalog/**`, `/api/reservas/**`, `/api/execution/**`, `/api/promotions/**`, `/api/payments/**`, `/api/notifications/**` |
| Authentication at the edge | Rejects a request with a missing, invalid or expired JWT before it reaches any service (RNF-004.1) |
| CORS | Configured here, so each service does not repeat it |
| Correlation id | Generates one per incoming request and passes it downstream, so a request can be followed across services |
| File uploads | Lets receipt images through to `payment-service`, with a size limit configured at this level |
| Access log | Method, path, status and correlation id to standard output (RNF-005) |

### What the gateway does not do

| Not a responsibility | Where it belongs |
|----------------------|------------------|
| Role and permission checks | Each service — it knows which roles its own endpoints allow (RNF-004.5), and internal calls never pass through the gateway |
| Business logic or validation | The owning service |
| Composing responses from several services | The client, or the service that owns the flow. This is not a BFF |
| Storing data or caching | Nothing. The gateway is stateless and has no schema of its own |
| Talking to RabbitMQ | Only the services publish and consume events |
| Storing receipt images | `payment-service` — the gateway only forwards the upload |

**Justification:**

- **Spring Cloud Gateway is the same stack the team already uses.** Routes are Java and
  YAML configuration, it runs in the same Docker setup as everything else, and nobody has
  to learn a new product. Kong or NGINX would be one more technology to install and
  explain, for a system with no public traffic.
- **Authentication at the edge, authorization in the service.** Checking the token twice is
  not duplicated work: the gateway stops anonymous traffic early, and the service still has
  to check it because services call each other directly, without passing through the
  gateway (ADR-004). If only the gateway validated, every internal call would be
  unauthenticated.
- **The gateway stays thin on purpose.** The moment it composes responses or validates
  business rules, it becomes a service that has to change every time any domain changes,
  and the ten boundaries stop meaning anything.

---

## Evaluated alternatives

| Alternative | Pros | Cons | Reason for discarding |
|-------------|------|------|-----------------------|
| **A — Spring Cloud Gateway (chosen)** | Same stack and language as the services; no new tooling; routes live in the repository | Another Spring Boot application to run and configure | — (chosen) |
| **B — Kong** | Production-grade features out of the box | A new product to learn, plus its own database; features the project does not need without public traffic | Cost of learning it is not justified for an academic project |
| **C — NGINX as reverse proxy** | Lightweight and well known | Custom JWT validation needs Lua or a module; the team has no experience with it | Adds friction exactly where we need control |
| **D — No gateway; clients call each service directly** | Nothing extra to build | Both clients would hardcode ten addresses and repeat CORS and authentication | Contradicts `01-context/glossary.md` and duplicates work in two clients |

---

## Consequences

**Positive:**

- The Angular and React Native clients use a single base URL and one authentication flow,
  even though there are ten services behind it.
- Unauthenticated traffic is stopped once, at the edge, instead of in ten places.
- A request can be followed end to end through the correlation id, which is the only
  tracing this project has (RNF-005).

**Negative / Trade-offs:**

- If the gateway is down, the whole system is unreachable for the clients. Acceptable in a
  local academic environment; in production it would need more than one instance.
- Ten routes to keep registered. A missing route looks exactly like a broken feature.
- Receipt uploads pass through the gateway, so its request size limit becomes a
  configuration detail that can break a working feature if it is forgotten.

**Impact on the system:**

- Affected services: all ten are reached through the gateway.
- Documents that must be updated: `09-microservices/services/01-api-gateway/`, which still
  describes Kong and Redis from the scaffold.

---

## Pending decisions

- **Rate limiting is not adopted for now.** There is no public exposure and no real
  traffic. If the project is ever deployed, this is the first thing to add here.
- The maximum size accepted for a receipt image, agreed with `payment-service` (ADR-008).
- HTTPS termination: RNF-004.8 only requires HTTPS outside the team's machines, and there
  is no such environment yet.

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| The gateway slowly accumulates business logic because it is convenient | Medium | High | The "what it does not do" table is the reference; anything that needs domain knowledge goes to the owning service |
| A service is called directly and skips the gateway during development | Medium | Medium | Clients reach services through the gateway; direct ports are for debugging only |
| The token is validated only at the gateway and internal calls end up unauthenticated | Medium | High | Every service validates the JWT itself as well (ADR-006) |
| An upload fails only in the Docker environment because of a size limit | Medium | Low | The limit is documented in `deployment.md` and set in both the gateway and `payment-service` |

---

## References

- API Gateway as single entry point → `01-context/glossary.md`
- Backend stack → `01-context/overview.md`
- JWT and role requirements → `04-requirements/non-functional.md` (RNF-004)
- Service list → ADR-002
- Service-to-service calls do not pass through the gateway → ADR-004
- Receipt upload flow → ADR-008
- Related to: ADR-006 (authentication and authorization)