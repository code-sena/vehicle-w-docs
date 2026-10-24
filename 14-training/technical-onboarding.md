# Technical Onboarding

> Guide for a developer joining LavaRápido. Goal: the whole system running on your machine on
> day 1 and a first PR by day 3. If something here is wrong, fixing it is your first contribution.

---

## Day 1 — Run the system

### Install

- [ ] JDK 21, Git, Docker Desktop, Node.js (LTS) + npm, an IDE (IntelliJ / VS Code)
- [ ] Access to the GitHub repositories (ask the team lead)

### Start everything (details: `10-devops/local-setup.md`)

1. Clone `lavarapido-infra`, the six services, `lavarapido-api-gateway` and the web, side by side.
2. In `lavarapido-infra`: copy `.env.example` to `.env` and ask a teammate for the real values
   **in private** (`DB_PASSWORD`, `JWT_SECRET`, `INTERNAL_API_KEY`, mail). Never commit `.env`.
3. `docker compose up -d` → wait until `lavarapido-sqlserver` is healthy.
4. Each Java service: `./mvnw spring-boot:run` (security 3001, customer 3002, booking 3003,
   operations 3004, notification 3006, gateway 8080); security-service has no default profile, so start
   it with `./mvnw spring-boot:run -Dspring-boot.run.profiles=dev` (E-05). Liquibase creates the
   tables on first start. Without `INTERNAL_API_KEY` the operator cannot start or finish services (503).
   payment (.NET 8, port 3005): `dotnet run --project src/PaymentService.Api`; its tables are
   created by the `payment-migrate` container of step 3.
5. Web: `npm install`, then `npm start` (port 4200). Mobile app (optional): `npm install`, copy
   `.env.example` to `.env.local`, then `npx expo start` and open it with Expo Go on the same network.
6. Check:
   ```bash
   for p in 3001 3002 3003 3004 3005 3006 8080; do echo "$p $(curl -s localhost:$p/actuator/health)"; done
   ```
7. Sign in with a demo account of the `dev` profile (`admin@gmail.com`, `operador@gmail.com`,
   `cliente@gmail.com`): each one exists only if you set its `DEMO_ADMIN_PASSWORD`,
   `DEMO_OPERATOR_PASSWORD` or `DEMO_CLIENT_PASSWORD` in `.env` (no password is in the code). Then
   book a wash. New accounts must use an allowed email domain (`ALLOWED_EMAIL_DOMAINS`, `gmail.com`).

### Read (in this order)

1. `01-context/overview.md` — what we are building (20 min)
2. `05-architecture/overview.md` — services, data ownership, communication (30 min)
3. `05-architecture/hexagonal-architecture.md` — how every service is organised (20 min)
4. `00-governance/git-conventions.md` — branches, commits, PRs (15 min)

---

## Day 2 — Understand the domain and your service

- [ ] `02-domain/entities-and-rules.md` and `02-domain/domain-events.md`
- [ ] `04-requirements/user-stories.md` — stories of the current sprint
- [ ] `01-context/glossary.md`
- [ ] `09-microservices/services/<NN-your-service>/` — README, data model, events, decisions, runbook
- [ ] Run its tests: `./mvnw test` — all green
- [ ] Open Swagger UI (`http://localhost:300N/swagger-ui.html`, dev profile) and call an endpoint
      with a token from `POST /api/v1/auth/login`

---

## Day 3 — First contribution

1. Pick a small item (a `technical-backlog.md` entry marked 0.5–1 SP, or a doc fix).
2. Branch from `develop`: `feat/<description>` or `fix/<description>`.
3. Test first (`11-quality/tdd-guide.md`): domain test → use case test → web slice test.
4. `./mvnw test` green; Conventional Commit title `type(scope): description`.
5. PR to `develop` with the template; one approval.

---

## The five things to understand first

1. **One schema owner per service** — never read another service's tables; ask its API or listen
   to its events (`06-data/models.md`, cross-service contract).
2. **Hexagonal** — `domain` has no Spring/JPA; use cases in `application`; controllers, JPA,
   RabbitMQ and REST clients are adapters in `infrastructure`.
3. **Every service validates the JWT** — the gateway only routes; roles come from the `roles`
   claim (`CLIENT`, `OPERATOR`, `ADMIN`).
4. **Events after commit** — `carwash.events` exchange, consumers idempotent, failures to `.dlq`.
5. **Business rules live in the backend** — the web shows what the API answers and translates
   error `code`s (`API_ERRORS.<code>`), it does not re-implement rules.

---

## Conventions

| Item | Rule |
|---|---|
| Identifiers, commits, branches | English |
| Code comments | Spanish |
| Documentation (this repository) | English (ADR-001) |
| Times | Stored in UTC; booking times interpreted in `America/Bogota` |
| Errors | RFC 9457 `ProblemDetail` with a `code` |
| New column/table | Liquibase changeset in the owning service + `06-data/models.md` |

---

## FAQ

**Can I change the database by hand?** Only to explore. Every real change is a Liquibase
changeset (`06-data/migration-strategy.md`).

**A service does not start.** Usually SQL Server was not healthy yet, or a port is busy. See the
service runbook and `10-devops/local-setup.md` (common issues).

**Every call answers 401.** `JWT_SECRET` differs between services or the token expired (1 hour).

**Where is the API contract?** `07-api/contracts/openapi/<service>.yaml`, exported from the running
services.

**Where do I ask?** In the team chat; do not stay blocked more than an hour.

---

## Correlations

- Setup → `10-devops/local-setup.md`
- TDD → `11-quality/tdd-guide.md`
- Git → `00-governance/git-conventions.md`
- Services → `09-microservices/service-catalog.md`
