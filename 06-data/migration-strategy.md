# Migration Strategy

**Last checked:** 2026-10-26, against `origin/develop` of the six service repositories (security
`b5fe56e`, customer `3181cae`, booking `db156cb`, operations `37e32ff`, payment `d94cde5`,
notification `3f99df4`).

## Source of truth: the Liquibase changelogs

The data model **is** the set of Liquibase changelogs of the six services. There is one SQL Server
database, `LavaRapido`; `lavarapido-infra` creates it empty (`db-init`: `CREATE DATABASE` if it does
not exist, recovery model `SIMPLE`) and every service then creates and migrates **only its own
schemas** (ADR-009). `06-data/models.md`, each service's `data-model.md` and the ER diagrams in
`08-uml/diagrams/source/erd-*.md` describe the result and are checked against the changelogs
(last section).

There is no global script. `lavarapido-6-services-sqlserver.sql`, the one-file DDL the team used
before the services had changelogs, is **not in any repository**, is not maintained and does not
contain the later changes; do not use it to create or compare a database. Several changelog headers
still mention it: they explain why every structural changeset has a `MARK_RAN` precondition (a
database created from that script converges instead of failing), and are historical.

## Tool: Liquibase, one changelog per service

Liquibase with **SQL-formatted changelogs** (`--liquibase formatted sql`, one `--changeset` per unit
of change). Each service keeps its history in its **own changelog tables**, so the six migrate the
same database independently:

| Service | Master file | Changelog tables | Who runs it |
|---|---|---|---|
| security-service | `src/main/resources/db/changelog/db.changelog-master.xml` | `DATABASECHANGELOG_SECURITY`, `DATABASECHANGELOGLOCK_SECURITY` | Spring Boot at startup |
| customer-service | `src/main/resources/db/changelog/db.changelog-master.xml` | `DATABASECHANGELOG_CUSTOMER`, `DATABASECHANGELOGLOCK_CUSTOMER` | Spring Boot at startup |
| booking-service | `src/main/resources/db/changelog/db.changelog-master.xml` | `DATABASECHANGELOG_BOOKING`, `DATABASECHANGELOGLOCK_BOOKING` | Spring Boot at startup |
| operations-service | `src/main/resources/db/changelog/db.changelog-master.xml` | `DATABASECHANGELOG_OPERATIONS`, `DATABASECHANGELOGLOCK_OPERATIONS` | Spring Boot at startup |
| notification-service | `src/main/resources/db/changelog/db.changelog-master.xml` | `DATABASECHANGELOG_NOTIFICATION`, `DATABASECHANGELOGLOCK_NOTIFICATION` | Spring Boot at startup |
| payment-service (.NET) | `db/changelog/db.changelog-master.yaml` | `DATABASECHANGELOG_PAYMENT`, `DATABASECHANGELOGLOCK_PAYMENT` | `payment-migrate` container (`liquibase/liquibase:4.29`, `lavarapido-infra/docker-compose.yml`), once, before the service starts |

- In the Java services `spring.liquibase.change-log` and `database-change-log-table` are set in
  `application.yml`, and `spring.jpa.hibernate.ddl-auto: validate` makes Hibernate check at startup
  that the JPA entities match the tables (a missing column stops the service).
- payment-service does not run Liquibase itself; EF Core only maps the tables (no EF migrations).
- Files run **in the order of the master file**, not alphabetically: schema first, then later
  changes, then seeds (security runs seed `101` before `026`, which needs the roles; notification
  runs seed `108` before the later type inserts).

## Numbering

- The five Java services share **one global sequence**: structural files `001`–`099` and seed files
  `101`–`199` (in `seed/`). A number belongs to one file in one service only.
- payment-service has **its own sequence** (`changes/001`…), independent of the global one: its
  numbers repeat global ones (both have a `021`), and the changeset ids (`pay-0NN-…`) and its
  changelog table keep them apart.
- Numbers that are not in the list below (structure `006`, `008`, `009`, `011`–`013`, `046`; seeds `106`,
  `107`, `114`, `115`) were never used by a changelog. Do not fill gaps: always take the next free number.

Current values (2026-10-26, `origin/develop`):

- Java structure high-water mark: **049** (`booking-service`, `049-booking-payment-mode-deadline`) — next free structure number: **050**.
- Java seed high-water mark: **117** (`booking-service`, `seed/117-seed-payment-timeout-cancellation-reason`) — next free seed number: **118**.
- payment-service high-water mark: **023** (`023-payment-one-open-and-unique-reference`) — next free payment number: **024**.

A number taken by a branch that is not merged yet is also taken: before creating a file, run
`git fetch` and check `origin/develop` (and the open branches) of the five Java repositories.

## Every file today

Generated from the master files (order, number of changesets, precondition, rollback). Totals: 78
files and 166 changesets (security 12/25, customer 4/11, booking 18/48, operations 6/21,
notification 15/22, payment 23/39).

<!-- migrations:start -->
**security-service** — `src/main/resources/db/changelog/db.changelog-master.xml`, table `DATABASECHANGELOG_SECURITY`

| Order | File | Changesets | Precondition | Rollback | Purpose |
|---|---|---|---|---|---|
| 1 | `001-create-security-schemas.sql` | 2 | onFail:MARK_RAN | No | Schemas `security` and `audit` |
| 2 | `002-create-security-and-audit-core.sql` | 9 | onFail:MARK_RAN | No | Tables `person`, `app_user`, `role`, `permission`, `role_permission`, `user_role`, `user_session`, `password_reset_token` and `audit.audit_log` |
| 3 | `003-create-security-user-preference.sql` | 2 | onFail:MARK_RAN | No | Table `user_preference` (moved from `settings`, ADR-009) and its touch trigger |
| 4 | `020-security-user-preference-palettes.sql` | 1 | onFail:MARK_RAN | No | Theme check and default changed to the 4 web palettes; existing `light`/`dark` rows converted |
| 5 | `023-security-custom-role.sql` | 1 | onFail:MARK_RAN | Yes | Table `custom_role` (custom role catalog). Dropped again by 026 |
| 6 | `seed/101-seed-security-role.sql` | 1 | none | No | Seed: the roles `ADMIN`, `OPERATOR`, `CLIENT` (only the missing ones) |
| 7 | `026-security-role-permissions.sql` | 3 | onFail:MARK_RAN | No | Drops `custom_role`; seeds the 4 permissions and the default permissions of each fixed role |
| 8 | `030-security-user-preference-notification-channels.sql` | 1 | onFail:MARK_RAN | Yes | Columns `email_reminders_enabled` and `promotions_enabled` (default 1) |
| 9 | `034-security-login-lockout.sql` | 1 | onFail:MARK_RAN | Yes | Table `login_lockout` (RF-004b) |
| 10 | `035-security-person-address.sql` | 1 | onFail:MARK_RAN | Yes | Table `person_address` (ADR-010) |
| 11 | `036-security-app-user-created-at.sql` | 2 | onFail:MARK_RAN (1 without) | Yes | Column `app_user.created_at`, backfilled with the first session of existing accounts |
| 12 | `039-security-app-user-legal-consent.sql` | 1 | onFail:MARK_RAN | Yes | Columns `terms_accepted_at` and `data_policy_accepted_at` (Law 1581) |

**customer-service** — `src/main/resources/db/changelog/db.changelog-master.xml`, table `DATABASECHANGELOG_CUSTOMER`

| Order | File | Changesets | Precondition | Rollback | Purpose |
|---|---|---|---|---|---|
| 1 | `004-create-customer-schema.sql` | 7 | onFail:MARK_RAN | No | Schema `customer`, tables `vehicle_type`, `customer`, `customer_vehicle`, filtered unique plate index and the 3 touch triggers |
| 2 | `014-add-customer-user-id.sql` | 2 | onFail:MARK_RAN | No | Column `customer.user_id` and filtered unique index `ux_customer_user` |
| 3 | `015-add-customer-vehicle-model.sql` | 1 | onFail:MARK_RAN | No | Column `customer_vehicle.model` |
| 4 | `seed/102-seed-customer-catalogs.sql` | 1 | onFail:MARK_RAN | No | Seed: the 6 vehicle types with fixed ids 1–6 |

**booking-service** — `src/main/resources/db/changelog/db.changelog-master.xml`, table `DATABASECHANGELOG_BOOKING`

| Order | File | Changesets | Precondition | Rollback | Purpose |
|---|---|---|---|---|---|
| 1 | `005-create-booking-schemas.sql` | 22 | onFail:MARK_RAN | No | Schemas `catalog` and `booking`, their 11 base tables, `tr_service_price_immutable`, `tr_booking_bay_overlap` and 7 touch triggers |
| 2 | `018-booking-adr-010.sql` | 3 | onFail:MARK_RAN | No | Table `bay_status` with its 3 rows; `service_bay.is_active` replaced by `bay_status_id`; daily break in `business_hour` (ADR-010) |
| 3 | `021-booking-schedule-history.sql` | 1 | onFail:MARK_RAN | Yes | Table `schedule_history` (log of schedule and bay changes) |
| 4 | `022-booking-catalog-loyalty-points.sql` | 1 | onFail:MARK_RAN | Yes | Column `catalog.service.loyalty_points` |
| 5 | `024-booking-revert-bay-operator.sql` | 1 | onFail:MARK_RAN | Yes | Drops `service_bay.operator_id` if an earlier local attempt created it (otherwise MARK_RAN) |
| 6 | `032-booking-establishment-business-data.sql` | 1 | onFail:MARK_RAN | Yes | 14 nullable columns with the legal, tax and channel data of `establishment` |
| 7 | `043-booking-service-loyalty-points.sql` | 2 | onFail:MARK_RAN (1 without) | Yes | Column `booking_service.loyalty_points` (A-09: points frozen when booking) and its backfill from the current catalog |
| 8 | `044-booking-service-price-positive.sql` | 1 | onFail:MARK_RAN | Yes | Check `ck_service_price_positive` (BIZ-04: the current price is greater than 0); created `WITH NOCHECK` if a current price is already 0 |
| 9 | `045-booking-row-version-optimistic-lock.sql` | 1 | onFail:MARK_RAN | Yes | `ALTER TRIGGER tr_touch_booking` (BIZ-09, E-11): it no longer bumps `row_version` when the `UPDATE` already changed it (Hibernate `@Version`); `updated_at` is still set |
| 10 | `049-booking-payment-mode-deadline.sql` | 2 | onFail:MARK_RAN | Yes | Columns `booking.payment_mode` (NVARCHAR, check `ck_booking_payment_mode`: `DIGITAL`/`CASH`), `payment_deadline` and `payment_reported_at` (payment contract of the booking: cash limit and digital payment deadline) and the filtered index `ix_booking_payment_pending` |
| 11 | `seed/103-seed-catalog.sql` | 3 | onFail:MARK_RAN | No | Seed: 5 categories, services `BASIC`, `PREMIUM`, `FULL` and their 18 prices (6 vehicle types) |
| 12 | `seed/104-seed-booking-catalogs.sql` | 2 | onFail:MARK_RAN | No | Seed: the 6 booking states (fixed ids) and 6 cancellation reasons |
| 13 | `seed/109-seed-establishment-schedule.sql` | 3 | onFail:MARK_RAN | No | Seed: the establishment row, the weekly hours (Sunday closed) and 4 bays (bay 4 in maintenance) |
| 14 | `seed/110-seed-establishment-business-data.sql` | 1 | onFail:MARK_RAN | No | Seed: example values for the 032 columns |
| 15 | `seed/111-clear-example-business-data.sql` | 1 | onFail:MARK_RAN | No | Empties the example values of 110 again (only if they are still the examples) |
| 16 | `seed/112-seed-expired-cancellation-reason.sql` | 1 | onFail:MARK_RAN | Yes | Seed: cancellation reason `EXPIRED` |
| 17 | `seed/113-clear-example-establishment.sql` | 1 | onFail:MARK_RAN | Yes | Removes the example business of 109 (legal and trade name, tax id, address, phone, e-mail; E-19), only the values still equal to the example |
| 18 | `seed/117-seed-payment-timeout-cancellation-reason.sql` | 1 | onFail:MARK_RAN | Yes | Seed: cancellation reason `PAYMENT_TIMEOUT` (system only: a DIGITAL booking without a payment report after its deadline) |

**operations-service** — `src/main/resources/db/changelog/db.changelog-master.xml`, table `DATABASECHANGELOG_OPERATIONS`

| Order | File | Changesets | Precondition | Rollback | Purpose |
|---|---|---|---|---|---|
| 1 | `007-create-execution-schema.sql` | 11 | onFail:MARK_RAN | No | Schema `execution`, tables `execution_status`, `operator`, `operator_availability`, `operator_absence`, `service_execution`, `tr_operator_absence_overlap` and 4 touch triggers |
| 2 | `033-execution-inspection-report.sql` | 5 | onFail:MARK_RAN | Yes | Tables `inspection_report`, `inspection_phase`, `inspection_finding`, `inspection_photo` and `tr_touch_inspection_report` (ADR-014 §9) |
| 3 | `037-execution-operator-profile.sql` | 2 | onFail:MARK_RAN | Yes | Tables `operator_profile` and `operator_skill` (ADR-010) |
| 4 | `040-execution-follow-up-notice.sql` | 1 | onFail:MARK_RAN | Yes | Column `service_execution.follow_up_notice_at` (service that ended without being registered) |
| 5 | `042-execution-assignment-notes.sql` | 1 | onFail:MARK_RAN | Yes | Column `service_execution.assignment_notes` (B-01: the admin's notes for the operator) |
| 6 | `seed/105-seed-execution-status.sql` | 1 | onFail:MARK_RAN | No | Seed: the 5 execution states with fixed ids |

**payment-service** — `db/changelog/db.changelog-master.yaml`, table `DATABASECHANGELOG_PAYMENT`

| Order | File | Changesets | Precondition | Rollback | Purpose |
|---|---|---|---|---|---|
| 1 | `changes/001-create-schema-promotion.sql` | 1 | onFail:MARK_RAN | Yes | Schema `promotion` |
| 2 | `changes/002-create-schema-payment.sql` | 1 | onFail:MARK_RAN | Yes | Schema `payment` |
| 3 | `changes/003-promotion-discount-type.sql` | 1 | none | Yes | Table `discount_type` |
| 4 | `changes/004-promotion-promotion.sql` | 1 | none | Yes | Table `promotion` |
| 5 | `changes/005-promotion-promotion-service.sql` | 1 | none | Yes | Table `promotion_service` |
| 6 | `changes/006-promotion-promotion-customer.sql` | 1 | none | Yes | Table `promotion_customer` |
| 7 | `changes/007-promotion-booking-promotion.sql` | 1 | none | Yes | Table `booking_promotion` |
| 8 | `changes/008-payment-payment-method-type.sql` | 1 | none | Yes | Table `payment_method_type` |
| 9 | `changes/009-payment-payment-account.sql` | 1 | none | Yes | Table `payment_account` |
| 10 | `changes/010-payment-payment-status.sql` | 1 | none | Yes | Table `payment_status` |
| 11 | `changes/011-payment-payment.sql` | 1 | none | Yes | Table `payment` and the filtered unique index of one approved payment per booking |
| 12 | `changes/012-payment-payment-receipt.sql` | 1 | none | Yes | Table `payment_receipt` |
| 13 | `changes/013-payment-loyalty-movement-type.sql` | 1 | none | Yes | Table `loyalty_movement_type` |
| 14 | `changes/014-payment-loyalty-transaction.sql` | 1 | none | Yes | Table `loyalty_transaction` |
| 15 | `changes/015-seed-reference-data.sql` | 6 | onFail:HALT (5 without) | Yes | Seed: discount types, 4 payment methods, the cash account, the 5 payment states (one INSERT each, so `APPROVED` = 3, checked with `onFail:HALT`) and 4 movement types |
| 16 | `changes/016-payment-images-as-data.sql` | 1 | onFail:MARK_RAN | Yes | `payment_account.qr_image_url` and `payment_receipt.file_url` to `NVARCHAR(MAX)` (images as data URL) |
| 17 | `changes/017-promotion-package-fields.sql` | 2 | none | Yes | Discount type `PACKAGE` and the package columns of `promotion` (`price`, `duration_minutes`, `icon`, `featured`, `benefits`) |
| 18 | `changes/018-promotion-required-points.sql` | 2 | onFail:MARK_RAN (1 without) | Yes | Column `promotion.required_points` and its check |
| 19 | `changes/019-verify-catalog-ids.sql` | 3 | onFail:HALT | Yes | Checks only (`onFail:HALT`): payment state ids 1–5 and the discount and movement codes the code needs |
| 20 | `changes/020-loyalty-reversal-and-sequence.sql` | 5 | onFail:MARK_RAN (3 without) | Yes | Movement type `REVERSED`; column `loyalty_transaction.sequence_no` (backfilled, then NOT NULL) and unique index per client |
| 21 | `changes/021-promotion-one-per-booking.sql` | 1 | onFail:CONTINUE | Yes | Unique index `ux_booking_promotion_one_per_booking` (E-09: one coupon per booking; `onFail:CONTINUE` if duplicates exist) |
| 22 | `changes/022-redemption-discount-percent.sql` | 2 | onFail:MARK_RAN (1 without) | Yes | Columns `booking_promotion.discount_percent` and `max_discount_amount` with their checks (BIZ-05) and their backfill from the promotion for percentage coupons |
| 23 | `changes/023-payment-one-open-and-unique-reference.sql` | 3 | onFail:HALT, onFail:CONTINUE (1 without) | Yes | A-16: older duplicate open payments rejected; unique index `ux_payment_one_open_per_booking` (`onFail:HALT`); indexed view `v_live_transaction_reference` (`onFail:CONTINUE` if a reference is already repeated) |

**notification-service** — `src/main/resources/db/changelog/db.changelog-master.xml`, table `DATABASECHANGELOG_NOTIFICATION`

| Order | File | Changesets | Precondition | Rollback | Purpose |
|---|---|---|---|---|---|
| 1 | `010-create-notification-schema.sql` | 5 | onFail:MARK_RAN | No | Schema `notification`, tables `notification_type` and `notification` and their 2 indexes |
| 2 | `016-create-notification-device-token.sql` | 2 | onFail:MARK_RAN | No | Table `device_token` (ADR-011) |
| 3 | `017-create-notification-processed-event.sql` | 1 | onFail:MARK_RAN | No | Table `processed_event` (idempotency, ADR-011) |
| 4 | `019-create-notification-booking-reminder.sql` | 1 | onFail:MARK_RAN | No | Table `booking_reminder` and its filtered index of due reminders |
| 5 | `seed/108-seed-notification-type.sql` | 1 | none | No | Seed: 12 notification types (`MERGE`, only the missing ones) |
| 6 | `seed/116-seed-notification-booking-no-show-type.sql` | 1 | none | Yes | Seed: notification type `BOOKING_NO_SHOW` (A-11) |
| 7 | `025-notification-promotion-redeemed-type.sql` | 1 | onFail:MARK_RAN | No | Type `PROMOTION_REDEEMED` |
| 8 | `027-notification-staff-notifications.sql` | 2 | onFail:MARK_RAN (1 without) | 1 of 2 | Table `booking_tracking` and 6 staff types (`OPERATOR_SERVICE_*`, `ADMIN_BOOKING_*`) |
| 9 | `028-notification-payment-refunded-type.sql` | 1 | onFail:MARK_RAN | No | Type `PAYMENT_REFUNDED` |
| 10 | `029-notification-loyalty-and-inspection-types.sql` | 1 | none | No | Types `LOYALTY_POINTS_EARNED` and `INSPECTION_REPORT` |
| 11 | `031-notification-unassigned-booking-alert.sql` | 2 | onFail:MARK_RAN (1 without) | 1 of 2 | Column `booking_tracking.unassigned_alert_at` and type `ADMIN_BOOKING_UNASSIGNED` |
| 12 | `038-notification-app-update-type.sql` | 1 | none | Yes | Type `APP_UPDATE_AVAILABLE` |
| 13 | `041-notification-service-not-registered-types.sql` | 1 | none | Yes | Types `OPERATOR_SERVICE_NOT_REGISTERED` and `ADMIN_SERVICE_NOT_REGISTERED` |
| 14 | `047-notification-pending-delivery.sql` | 1 | onFail:MARK_RAN | Yes | Table `pending_delivery` (OPS-05, E-14: push and e-mail deliveries with retries) and its filtered index |
| 15 | `048-notification-pending-delivery-nvarchar.sql` | 1 | onFail:MARK_RAN | Yes | Columns `pending_delivery.channel` and `language` to NVARCHAR (Hibernate reads text as NCHAR); drops and re-creates `uq_pending_delivery_channel` and `ck_pending_delivery_channel` |
<!-- migrations:end -->

## How a changeset looks

```sql
--liquibase formatted sql
-- A-09: los puntos de fidelización de cada línea de reserva se congelan al reservar, como el precio.

--changeset lavarapido:booking-043-booking-service-loyalty-points
--comment: Puntos que valía el servicio al reservar
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID('booking.booking_service') AND name = 'loyalty_points'
ALTER TABLE [booking].booking_service ADD loyalty_points INT NULL;
--rollback ALTER TABLE [booking].booking_service DROP COLUMN loyalty_points;
```

- Java services: author `lavarapido`, id `<service>-<number>-<what>` (operations `040` and `042` use
  the schema name: `execution-040-…`). payment-service: author `merari` (and `lavarapido` in
  `pay-016`), id `pay-<number>-<what>`, attribute `dbms:mssql`.
- Triggers and other multi-statement bodies use `splitStatements:false`.
- A header comment (in Spanish, like the code) says why the change exists.

## Preconditions

| Behaviour | Where | What it means |
|---|---|---|
| `onFail:MARK_RAN` + `expectedResult:0` (the object does not exist yet) | Every structural changeset of the Java services, payment `001`, `002`, `016`, `018`, `020` and the column changeset of `022` | If the schema, table, column, index or trigger already exists, the changeset is marked as run without executing. A database migrated by hand converges instead of failing |
| `onFail:MARK_RAN` + `expectedResult:1` | security `026` (drop `custom_role`), booking `024` (drop `service_bay.operator_id`), booking `045` (`ALTER TRIGGER tr_touch_booking`), notification `048` (`channel` still VARCHAR), booking seeds `110`, `111` and `113` | Run only when the thing to drop or update is there |
| `onFail:MARK_RAN` + seed check `SELECT COUNT(*) … = 0` | Seeds `102`, `103`, `104`, `105`, `109`, `112`, `117`, security `026` seeds | Insert only into an empty table, so a seeded database does not break the `UNIQUE (code)` constraints |
| `onFail:CONTINUE` | payment `021` (`ux_booking_promotion_one_per_booking`) and `023` (`v_live_transaction_reference`) | If some booking already has two coupons, the index is **not** created and Liquibase tries again on the next update. Find them with `SELECT booking_id, COUNT(*) FROM [promotion].booking_promotion GROUP BY booking_id HAVING COUNT(*) > 1`. Likewise, if a transaction reference is already repeated among live payments, the view is not created; the query that finds them is in the header of `023` |
| `onFail:HALT` | payment `015` (`APPROVED` must be id 3), `019` (payment status ids 1–5, discount and movement codes) and `023` (no booking with two open payments left after its first changeset) | Stops the whole migration: the code, `ux_payment_one_approved_per_booking` and `ux_payment_one_open_per_booking` depend on those values |
| No precondition | security `101` (idempotent `WHERE NOT EXISTS`) and `036` backfill; booking `043` backfill (`WHERE loyalty_points IS NULL`); notification type inserts `108`, `027`, `029`, `031`, `038`, `041`, `116` (idempotent `MERGE … WHEN NOT MATCHED`); payment `003`–`014`, five of the six changesets of `015`, `017`, the check of `018`, three changesets of `020`, the backfill of `022` and the first changeset of `023` (rejects older duplicate open payments) | Idempotent by their own SQL, or (payment) guarded only by the changelog table |

## Rollback

Changesets carry a `--rollback` block from the `021`–`023` era on, so the old rule "forward-only, no
rollback blocks" no longer holds:

- **payment-service:** all 39 changesets have one.
- **Java services:** every structural file numbered `021` or higher has one, except security `026`
  and the notification type inserts of `025`, `027` (second changeset), `028`, `029` and `031`
  (second changeset). Files before `021` (`001`–`020` and seeds `101`–`111`) have none. The
  **Rollback** column of the table above gives the exact count per file.
- Data backfills use `--rollback SELECT 1;` (nothing to undo).
- Spring Boot never rolls back. To undo, run the Liquibase CLI against the service's changelog
  table (for example `liquibase rollback-count 1 --changelog-file=db/changelog/db.changelog-master.xml --database-changelog-table-name=DATABASECHANGELOG_BOOKING`), then deploy code that no longer needs the change.

New changesets must have a precondition (Java) and a `--rollback`.

## Triggers

There is no generic trigger generator. Each changeset that creates an edited table also creates its
`tr_touch_<table>` trigger (`AFTER UPDATE`: `updated_at = SYSUTCDATETIME()`, `row_version + 1`).
There are 16: `security.user_preference`; the three `customer` tables; `catalog.service`,
`service_price`; `booking.establishment`, `business_hour`, `business_hour_exception`, `service_bay`,
`booking`; `execution.operator`, `operator_availability`, `operator_absence`, `service_execution`,
`inspection_report`. Booking `045` changed `tr_touch_booking`: it still sets `updated_at`, but bumps
`row_version` only when the `UPDATE` did not (Hibernate `@Version` already does it). Three business triggers live with their tables: `tr_service_price_immutable` and
`tr_booking_bay_overlap` (booking `005`) and `tr_operator_absence_overlap` (operations `007`).
notification-service and payment-service have no triggers.

## Seed data that is easy to break

- `booking_status` (ids 1–6, seed `104`), `bay_status` (1–3, `018`) and `execution_status` (1–5,
  seed `105`) are inserted with `SET IDENTITY_INSERT … ON`. `booking_status_id = 5` (`CANCELLED`) is
  hard-coded in `ck_booking_cancel`, and 1–3 (active) in `tr_booking_bay_overlap`.
- `payment_status` is inserted **one row per INSERT** so the ids are 1–5 in order; `APPROVED = 3` is
  hard-coded in `ux_payment_one_approved_per_booking` and in the code (`PaymentStatusIds`), and
  `015`/`019` stop the migration if it is not so.
- `discount_type` and `loyalty_movement_type` are **not** relied on by id: SQL Server can skip
  IDENTITY values after a restart, so payment-service resolves them by code at startup
  (`CatalogIds`).
- Vehicle types (`102`) have fixed ids 1–6 that the price seed `103` uses.
- No seed contains users or passwords: the first administrator is created at startup by
  security-service from `app.bootstrap-admin.*`, and demo accounts exist only with the `dev` profile.

## Rules

```
✓ Every new changeset: a header comment, a precondition (Java services) and a --rollback
✓ One changeset per logical change; seeds in seed/ with a 1xx number (catalog rows that belong to
  a structural change, like bay_status in 018 or a new notification type, may go with it)
✓ Take the next free number of the right sequence and check origin/develop first
✓ Add the change to models.md, the service's data-model.md and its ERD in the same docs change
✗ Never edit a changeset that already ran anywhere (Liquibase stops on the checksum mismatch)
✗ Never DROP a column or table while running code still reads it: stop reading it first, drop it
  in the next release (two phases, below)
```

## Compatible changes (one changeset)

Nullable columns, `NOT NULL` columns with a valid `DEFAULT`, and new indexes ship as a single
changeset (SQL Server has no `CONCURRENTLY`; expect a short lock on large tables):

```sql
--changeset lavarapido:booking-0NN-booking-customer-note
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID('booking.booking') AND name = 'customer_note'
ALTER TABLE [booking].booking ADD customer_note NVARCHAR(300) NULL;
--rollback ALTER TABLE [booking].booking DROP COLUMN customer_note;
```

## Incompatible changes (two phases)

Example: renaming `payment.payment_receipt.transaction_reference` to `reference_code` without
downtime.

```sql
--changeset merari:pay-0NN-receipt-reference-code dbms:mssql
-- Phase 1 (release N): add the new column, backfill it, deploy code that writes both
ALTER TABLE [payment].payment_receipt ADD reference_code NVARCHAR(100) NULL;
UPDATE [payment].payment_receipt SET reference_code = transaction_reference;
--rollback ALTER TABLE [payment].payment_receipt DROP COLUMN reference_code;

--changeset merari:pay-0NN-drop-transaction-reference dbms:mssql
-- Phase 2 (release N+1, once no running code reads the old column): drop it
ALTER TABLE [payment].payment_receipt DROP COLUMN transaction_reference;
--rollback ALTER TABLE [payment].payment_receipt ADD transaction_reference NVARCHAR(100) NULL;
```

The same applies to any column that changes type or meaning: each phase is its own changeset so
they can ship in different releases.

## How the docs are checked

On 2026-10-26 a script rebuilt the final model from the 78 files above (166 changesets: `CREATE`,
`ALTER … ADD/DROP/ALTER COLUMN`, `DROP TABLE`, indexes, triggers and their `ALTER`, and the indexed
view, in master order) — 58 tables, 681 columns, 44 indexes that are not constraints (one of them on
the view), 19 triggers, 1 view — and compared it with:

- `06-data/models.md` (every `CREATE TABLE` block, its constraints, indexes, triggers and data
  dictionary), each `data-model.md` (type, NULL, default and IDENTITY of every column, every
  constraint, index, trigger and migration file), each ERD (every attribute, key, relationship and
  audit column) and this file: **0 differences**;
- the JPA entities (`@Table`, `@Column`, `@JoinColumn`, `@JoinTable`) of the five Java services and
  the EF Core configuration of payment-service (`ToTable`, `HasColumnName`, `HasAuditColumns`):
  **0 mapped columns missing from the database**. Columns that no entity maps (for example
  `promotion.is_public`, the whole `audit.audit_log`) are listed in the tables' notes.

Repeat the check after every merged migration.
