# 13 — Operations

> How the system is kept running: how problems are detected, how the team responds, and what
> availability is promised. The system runs on the team's machines and on an academic demo server
> (an Azure VM turned on on demand, `10-devops/production.md`); there is no production service for
> real customers, so the commitments here are sized for development, demos and review sessions.

---

## Availability commitment (RNF-002)

| Indicator (SLI) | Objective (SLO) |
|---|---|
| Every service answers `UP` on `/actuator/health` | During every review session and demo |
| The core flows work end to end: sign-up → login → vehicle → booking → notification → operator assignment → start/finish → rating → payment with receipt → admin approval | Verified before every review session |

There is no SLA with an external customer: the project is academic.

**Before a review session (checklist):**
1. `docker compose up -d` and wait for `lavarapido-sqlserver` to be healthy (`payment-migrate` must end with exit code 0).
2. Start the services (`docker compose --profile app up -d`, or each one from its folder); all health checks `UP` on 3001–3006 and 8080 (see `observability.md`). For a review on the Azure server, ask the project lead to turn the VM on and check `PUBLIC_URL`.
3. Run the core flow once with the demo accounts (client, admin and operator). The operator needs a weekly shift that covers the booking time, or the assignment fails with `OPERATOR_NOT_ON_SHIFT`.
4. RabbitMQ dead-letter queues (`notification-service.events.dlq`, `customer-service.events.dlq`, `operations-service.booking-confirmed.dlq`) empty, and no old `operations-service.events` queue left (operations deletes it on start). In `notification.pending_delivery`, no rows with 5 failed attempts.
5. On the server: the last line of `~/lavarapido/backups/backup.log` is a `VERIFICACIÓN | OK` of today (see below).
6. `INTERNAL_API_KEY` is set: without it the operator cannot start or finish a service (503, E-01).

---

## Contents

| File | What it answers |
|------|-----------------|
| [`observability.md`](./observability.md) | What logs, health checks and panels exist, and how to read them |
| [`incident-management.md`](./incident-management.md) | What to do when something breaks |

---

## Backup and recovery

All data lives in the `LavaRapido` database (Docker volume `sqlserver-data`).
`docker compose down -v` **deletes** the volume and every record; `docker compose stop` (or `down`
without `-v`) keeps it.

### On the Azure server: the scripts of `lavarapido-infra/deploy`

They read `DB_PASSWORD` from `.env.production` and pass it to `sqlcmd` through `SQLCMDPASSWORD`, so
the password never appears in the command line or in the history.

| When | What runs | Where it is set |
|---|---|---|
| Every day at 23:00 UTC (6 p.m. in Colombia), if the VM is on | `backup-db.sh` then `verify-backup.sh` | `crontab` of `azureuser`, written by `setup-server.sh` (`# lavarapido-backup`) |
| 5 minutes after every boot | `backup-db.sh` then `verify-backup.sh` | same, `@reboot sleep 300` |
| Before every update | `backup-db.sh pre-update` (if it fails, the update stops); the last 10 `pre-update` are kept apart from the 14 regular ones | `update-server.sh` |
| By hand | any of the three | commands below |

```bash
bash ~/lavarapido/lavarapido-infra/deploy/backup-db.sh        # full backup now
bash ~/lavarapido/lavarapido-infra/deploy/verify-backup.sh    # restore the newest one as LavaRapido_verificacion, check it, drop it
ls -lt ~/lavarapido/backups/*.bak.gz | head                     # 14 regular (BACKUP_KEEP) + 10 pre-update (BACKUP_KEEP_LABELED)
tail -20 ~/lavarapido/backups/backup.log                        # what ran and how it ended
grep FALLÓ ~/lavarapido/backups/backup.log                      # only the failures
```

- `backup-db.sh`: `BACKUP DATABASE … WITH INIT, CHECKSUM` and `RESTORE VERIFYONLY … WITH CHECKSUM`
  inside the container, copies it out, gzips it as `LavaRapido-<UTC>.bak.gz` (mode 600) and keeps the
  last 14. The database uses the `SIMPLE` recovery model (set by `db-init`), so there are no log
  backups: a restore goes back to the moment of a full backup.
- `verify-backup.sh`: the backup counts as good only if it restores under another name, has tables
  (no more than the real database) and its users and bookings can be read.
- Each run writes one line to `~/lavarapido/backups/backup.log`:
  `fecha UTC | RESPALDO/VERIFICACIÓN/RESTAURACIÓN | OK/FALLÓ/CANCELADA | detalle | usuario`.

**Restore** (never automatic: it erases what happened after the backup, so a person decides):

```bash
# 1. look inside a backup without touching the real database
bash ~/lavarapido/lavarapido-infra/deploy/restore-db.sh ~/lavarapido/backups/<file>.bak.gz --as LavaRapido_prueba
# 2. replace LavaRapido with that backup (in a terminal: ssh -t). It takes the deploy lock (waits up to
#    20 min for an update), shows the backup date and the steps, asks to type RESTAURAR, backs up the
#    current state, stops the services, restores (SINGLE_USER … RESTORE WITH REPLACE, CHECKSUM), runs
#    payment-migrate (docker start -a) and starts the services again — also if a step fails
bash ~/lavarapido/lavarapido-infra/deploy/restore-db.sh ~/lavarapido/backups/<file>.bak.gz
```

The Java services re-apply their newer Liquibase changesets when they start, and since 2026-10-24
(E-20) `restore-db.sh` reruns `payment-migrate` itself; if that step fails the database stays
restored, the services are up and the log says to retry with
`sudo docker start -a lavarapido-payment-migrate`. A test database made with `--as` is dropped with
`DROP DATABASE [LavaRapido_prueba]`.

**Known gap (M1, open):** the backup of the current state is a regular one, so the retention of 14 can
delete the very file being restored when it is the 14th regular backup; then `gunzip` fails and that
backup is lost. Until it is fixed, copy the file to restore aside first
(`cp <file> ~/restore-me.bak.gz`) or restore a `pre-update` backup.

### Rolling back an update (`rollback.sh`, since 2026-10-24)

`update-server.sh` tags the running images as `lavarapido/<service>:prev` before building (not while
`backups/update-pending` says the last update failed, so `:prev` stays the last version that worked).
When an update leaves a service broken:

```bash
ssh -t … bash ~/lavarapido/lavarapido-infra/deploy/rollback.sh            # every service with a :prev
ssh -t … bash ~/lavarapido/lavarapido-infra/deploy/rollback.sh web        # only some
```

It takes the same lock as the updates, lists each service with the date of its `:prev`, asks to type
`VOLVER` (needs a terminal), retags `:prev` as `:local`, recreates only those containers
(`--no-build --no-deps`), waits up to 8 minutes for them to be healthy and writes a line in
`~/lavarapido/backups/deploy.log`. It does **not** touch the database nor the repositories: if the bad
version applied a migration the old one does not support, also restore the `pre-update` backup.

**Known gaps (open):** it uses the current Compose file and Caddyfile with the old images, so a
contract change between versions (the web moving from port 80 to 8080, a new variable) leaves the
service down (M3); `update-server.sh` run by hand does not take the lock, so it can collide with
`boot-update.sh` or the workflow (M4). Both are in `15-project-control/risks.md`.

The backups stay on the VM disk: they cover a bad migration or a human error, not the loss of the VM.
To keep a copy outside, from a member's PC:
`scp -i ~/.ssh/lavarapido_azure "azureuser@<server IP>:~/lavarapido/backups/*.bak.gz" .`

### On a development machine

The scripts above are for the server (they read `.env.production` and use `sudo`). Locally, from
`lavarapido-infra` (Git Bash), the same commands they run, with the password taken from `.env`:

```bash
export MSYS_NO_PATHCONV=1          # Git Bash on Windows: keep the /opt/... and /var/... paths as written
export SQLCMDPASSWORD="$(grep '^DB_PASSWORD=' .env | cut -d= -f2-)"
docker exec lavarapido-sqlserver mkdir -p /var/opt/mssql/backup
docker exec -e SQLCMDPASSWORD lavarapido-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b \
  -Q "BACKUP DATABASE [LavaRapido] TO DISK = N'/var/opt/mssql/backup/LavaRapido.bak' WITH INIT, CHECKSUM"
docker cp lavarapido-sqlserver:/var/opt/mssql/backup/LavaRapido.bak ./LavaRapido.bak
```

Restore locally with the services stopped and SQL Server running (Ctrl+C in each service, or for
the containers `docker compose stop security-service customer-service booking-service operations-service notification-service payment-service api-gateway`),
in the same terminal (the two `export` above still set):

```bash
docker cp ./LavaRapido.bak lavarapido-sqlserver:/var/opt/mssql/backup/LavaRapido.bak
docker exec -u 0 lavarapido-sqlserver chown mssql /var/opt/mssql/backup/LavaRapido.bak
docker exec -e SQLCMDPASSWORD lavarapido-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b \
  -Q "ALTER DATABASE [LavaRapido] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; RESTORE DATABASE [LavaRapido] FROM DISK = N'/var/opt/mssql/backup/LavaRapido.bak' WITH REPLACE, CHECKSUM; ALTER DATABASE [LavaRapido] SET MULTI_USER"
docker compose up -d payment-migrate        # re-applies the payment changelogs, then start the services
unset SQLCMDPASSWORD
```

---

## Correlations

| Section | Relationship |
|---------|--------------|
| `10-devops/` | How the system is started (local, Docker) |
| `09-microservices/services/*/runbook.md` | Symptoms and fixes per service |
| `04-requirements/non-functional.md` | RNF-002 (availability), RNF-005 (observability) |
