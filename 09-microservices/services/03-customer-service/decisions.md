# Technical decisions — Customer Service

## The client profile is created on first use if the event did not arrive

**Context:** The profile row needs `person_id`, which only `UserRegistered` carries. Accounts
created before messaging was enabled (or while RabbitMQ was down) had no profile and
"My vehicles" failed.
**Decision:** On the first request without a profile, the service asks security-service
`GET /users/me` with the caller's own token, checks the returned id matches and creates the
profile. The event listener does the same thing ahead of time.
**Consequences:** No manual data fixes; if security-service is down at that moment the answer is
409 `CUSTOMER_NOT_PROVISIONED` and the next request retries.

## Ownership through the token, never through the request

**Decision:** No endpoint receives a customer id: it comes from the JWT `sub`. Another client's
vehicle answers 404 (not 403), so its existence is not revealed.

## Plate unique among active vehicles only

**Decision:** Filtered unique index (`WHERE deleted_at IS NULL`) plus a domain check; the index
catches concurrent registrations (409 `CONFLICT`).
**Consequences:** A sold/removed vehicle can be registered again by its new owner.

## Admin lookup returns the owner's user id

**Decision:** `GET /admin/vehicles` (ADMIN) returns each vehicle with `ownerUserId`, so booking can
notify the right client and the admin screens can show the client's name from security-service.
