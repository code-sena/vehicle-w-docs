# User Manual (web)

> How to use LavaRápido in the browser. Covers the features connected to the backend on
> 2026-10-04; screens still on sample data are marked. Screens: `12-ux-ui/navigation-map.md`.

---

## Everyone

| Task | How |
|---|---|
| Create an account (clients) | Home → **Register**. Fill your data; the password must meet the rules shown. You receive a welcome email |
| Sign in | Home → **Sign in** with email and password. You land on your area (client, operator or administrator) |
| Forgot password | Sign in → **Forgot password** → enter your email → type the 6-digit code you receive → choose a new password. The code is burnt after 5 wrong attempts |
| Profile | Menu → **Profile**: edit your data, change your password or email, deactivate your account (asks for your password) |
| Notifications | Bell / **Notifications**: unread first; mark one or all as read |
| Theme and language | **Settings / Configuration**: 4 palettes and Spanish, English, French, Portuguese. *Today they are remembered by the browser, not by your account* |
| Sign out | Menu → **Sign out**. The session also ends after 1 hour |

---

## Client

### Register a vehicle
**My vehicles** → **Add** → plate and type (car, sedan, SUV, pickup, truck, motorcycle) are
required; brand, model and color are optional. The plate format is checked for the vehicle type
and a plate cannot be registered twice. You can edit or remove your vehicles.

### Book a wash
1. **Book** → choose the vehicle (prices change with the vehicle type).
2. Choose one or more services: you see price and duration.
3. Choose a date: you see the free times (closed days show none).
4. Confirm. The booking is **confirmed immediately** with a bay, and you get a notification and an
   email.
5. If someone took that time a second before you, you are offered up to 5 other times of the same
   day.

You receive reminders **24 hours and 1 hour before** (inbox, push and email).

### Change or cancel
From the dashboard or the booking detail: change date/time or services, or cancel with a reason.
Only possible **before the service starts**. Prices of a booking do not change if the catalog
changes later.

### History and payment
**History** shows your real bookings (active, completed, cancelled). **Pay** shows the real
amount of the booking (with the points discount) and lets you cancel it; uploading the receipt
still works only in the browser until the payment service is ready. Ratings arrive with the
operations service.

---

## Administrator

| Task | Where |
|---|---|
| See and filter bookings | **Reservations** |
| Book for a client | **Reservations → New** → search the vehicle by plate → services → date/time |
| Move a booking forward | Booking detail → **Start** → **Complete**; or **No show**; or **Cancel** (the client is notified) |
| Business hours, lunch break, closed days | **Schedule** |
| Bays (active / maintenance / inactive) | **Schedule → Bays** |
| Services and prices per vehicle type | **Management → Services** |
| Users: create, change role, deactivate | **Management → Users** (accounts are deactivated, never deleted) |
| Send a notification to users | **Notifications** |

Operators, payments, promotions, reports and business settings still use sample data.

---

## If something fails

| You see | Do |
|---|---|
| "Session expired" | Sign in again |
| A message that the time is no longer available | Pick one of the offered times |
| A generic error | Try again; if it repeats, tell the team with the time it happened |
