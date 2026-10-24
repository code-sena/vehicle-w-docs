# Runbook — Security Service

## Health

```bash
curl http://localhost:3001/actuator/health      # {"status":"UP"}
```

## Common problems

| Symptom | Likely cause | What to do |
|---|---|---|
| Fails at startup: `JWT_SECRET ... at least 32 bytes` | Missing or short secret | Set `JWT_SECRET` in `lavarapido-infra/.env` |
| Fails at startup: TCP connection to `localhost:1433` failed | SQL Server not up yet | `docker compose up -d`, wait for `lavarapido-sqlserver` to be **healthy**, start again |
| `Port 3001 was already in use` | Another instance is running | Stop it or set `PORT` |
| Every other service answers 401 | Different `JWT_SECRET` / issuer / audience between services | Use the same `.env` for all services |
| Recovery email does not arrive | `MAIL_ENABLED=false` (code only in the log), wrong Gmail app password, or spam folder | Check `MAIL_*`; with Mailpit see http://localhost:8025 |
| Welcome email / client profile missing after registering | `MESSAGING_ENABLED=false` or RabbitMQ down | Enable messaging; customer-service still creates the profile on first use |
| notification gets 401 on `/internal/**` | `INTERNAL_API_KEY` differs or is empty | Same key in both services |
| No Swagger and no demo accounts locally | No default profile since 2026-10-23 (E-05), or `DEMO_*_PASSWORD` empty | Start with `-Dspring-boot.run.profiles=dev` and set the `DEMO_*_PASSWORD` you need in `.env` |
| 400 `EMAIL_DOMAIN_NOT_ALLOWED` on sign-up, account creation or email change | The domain is not in `ALLOWED_EMAIL_DOMAINS` (default `gmail.com`) | Expected; login and recovery are not affected |
| 423 `ACCOUNT_LOCKED` | 5 wrong passwords in 15 minutes | Wait 15 minutes or reset the password |
| The user is logged out on other devices | Expected after a password change (other sessions) or recovery (all), or a role removed from `security.user_role` (E-02) | Log in again |

## Tests

`./mvnw verify`: 171 tests in the CI run of 2026-10-23 (no database needed).

## Logs

Each line carries the service name and `X-Correlation-Id` (`[security-service,<id>]`); personal
data (emails, tokens, codes) is never logged.
