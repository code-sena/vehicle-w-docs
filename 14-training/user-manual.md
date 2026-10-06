# User Manual (web)

> How to use LavaRápido in the browser. Covers the features connected to the backend on
> 2026-10-06; screens still on sample data are marked. Screens: `12-ux-ui/navigation-map.md`.

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

### History, rating and payment
**History** shows your real bookings (active, completed, cancelled) and the operator assigned to
each one. When a booking is **completed** you can rate it once: 1 to 5 stars and an optional
comment (up to 500 characters).

**Pay service** shows the amount of the booking (the points discount stays at 0 until the points
program exists) and the shop's accounts (Nequi, Daviplata, transfer) with their QR and
instructions:
1. Pay from your bank app using the QR or the account number.
2. Choose the account you paid to, type the transaction reference and attach the receipt image
   (up to 8 MB).
3. Send it. The payment stays **in review** until the administrator approves or rejects it.

Only confirmed, in-progress or completed bookings can be paid, and a booking cannot have two
payments in review. Cash is paid at the shop and registered by the administrator.

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
| Operators: active or not, weekly shift, absences | **Operators** (operators are the accounts with role Operator in **Management → Users**) |
| Assign or change the operator of a booking | **Reservations** → booking detail → **Operator assignment**: each operator shows whether they are available or why not (inactive, not on shift, absent, busy). Only before the service starts |
| Review payments | **Payments** → **Verify**: approve, or reject with a reason |
| Register a cash payment | **Payments** → **Manual entry**: the amount is the booking total and it is approved at once |
| Payment accounts and QR | **Settings → Payment methods** |

Promotions, part of the reports and the business data in Settings still use sample data.

---

## Operator

| Task | Where |
|---|---|
| See today's services (or another range) | **assigned services**: booking code, services, vehicle, time and status |
| Start a service | Service detail → **Start Service**. Only on the booking day; you cannot have two services in progress |
| Finish a service | Service detail → **Finish Service**. The client is notified and can rate it |
| See your shift | **My Schedule** (the administrator sets it) |
| See your ratings | **Ratings**: stars and comments from clients, and your average |

---

## If something fails

| You see | Do |
|---|---|
| "Session expired" | Sign in again |
| A message that the time is no longer available | Pick one of the offered times |
| An operator cannot be assigned | The message says why (not on shift, absent, busy, inactive); fix the shift in **Operators** or choose another operator |
| A payment cannot be sent | The booking already has a payment in review or approved, or it is cancelled |
| A generic error | Try again; if it repeats, tell the team with the time it happened |
