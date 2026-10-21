# User Manual (web and mobile)

> How to use LavaRápido in the browser and in the Android app (both have the same features).
> Covers what is connected to the backend on 2026-10-20; what still uses sample or local data is
> marked. Screens: `12-ux-ui/navigation-map.md`.

---

## Everyone

| Task | How |
|---|---|
| Create an account (clients) | Home → **Register**. Fill your data; the password must meet the rules shown (8+ characters, an uppercase letter, a number, a special character). You receive a welcome email |
| Sign in | Home → **Sign in** with email and password. You land on your area (client, operator or administrator) |
| Forgot password | Sign in → **Forgot password** → enter your email → type the 6-digit code you receive (valid 15 minutes) → choose a new password. The code is burnt after 5 wrong attempts |
| Profile | Menu → **Profile**: edit your data and your address (saved in your account, the same on the web and the app), change your password, deactivate your account (asks for your password; administrators do not have this option) |
| Change your email | **Profile → Email**, confirmed with your current password. From then on you sign in with the new email; the old one no longer works |
| Notifications | Bell / **Notifications**: newest first, in tabs by type, with filters for read/unread and dates; mark one or all as read (or one as unread); delete. Clicking a notification opens its detail and marks it read; when the notice belongs to a section, the detail has a **Go to...** button (history, home, assigned services or bookings) |
| Notification channels | **Settings → Notifications**: **Push** (phone notifications), **Booking reminders by email** and **Promotions** (unlocked coupons by email and push). They are saved in your account; the inbox always receives everything |
| Theme and language | **Settings**: 4 palettes and Spanish, English, French, Portuguese. Saved in your account, so they follow you to any device. Notifications and emails also arrive in that language (the ones already received keep their original language) |
| Sign out | Menu → **Sign out**. The session also ends after 1 hour |

---

## Client

### Register a vehicle
**My vehicles** → **Add** → plate and type (car, sedan, SUV, pickup, truck, motorcycle) are
required; brand, model and color are optional. The plate format is checked for the vehicle type
and a plate cannot be registered twice. You can edit or remove your vehicles.

### Book a wash
1. **Book** → choose the vehicle (prices change with the vehicle type).
2. Choose one or more services: you see price, duration and the **loyalty points** each one adds
   ("Adds N points"); the summary shows the total points you will earn.
3. Choose a date: you see the free times (closed days show none).
4. Optionally choose an **operator** among the ones free at that time (first name and rating). With
   **No preference** the shop assigns one; if the one you chose is no longer free when we confirm,
   another free operator is assigned.
5. Confirm. The booking is **confirmed immediately** with a free bay, and you get a notification
   and an email.
6. If someone took that time a second before you, you are offered other free times of the same day.

You receive reminders **24 hours and 1 hour before** (inbox, push and, if you keep that switch on,
email). Once your service starts, the pending reminders stop.

### Cancel
In **History** (or on the payment screen of the booking) → **Cancel** and confirm; no reason is asked.
Only possible while the booking can still be changed (**before the service starts**). The web and the
app have no screen for the client to change the date: to move a booking, the client asks the shop and
the administrator reschedules it. Prices of a booking do not change if the catalog changes later.

### Pay a booking
In **History**, **Pay** appears only on bookings that can still be paid (not paid yet and without a
payment in review). The screen shows the amount due and the shop's accounts (Nequi, Daviplata,
transfer) with their QR and instructions:

1. Optional: type a **coupon code** you unlocked with your points; the discount is applied to the
   amount due (one coupon per booking).
2. Pay from your bank app using the QR or the account number. The QR is the shop's account; it does
   not expire.
3. Attach the receipt (JPG or PNG), type the transaction reference (8 to 12 letters or numbers) and
   the **amount you actually paid** (it comes filled with the amount due; change it only if you
   transferred a different amount — the administrator compares both).
4. While something is missing, the list under the button tells you what. Send it: the payment stays
   **in review** until the administrator approves or rejects it (with the reason). You get the result
   in the inbox and by email.
5. Once the payment is **approved**, the screen only shows the booking summary: the method, QR,
   receipt and pay steps disappear and the coupon (if one was used) can no longer be removed.

**Cash:** choose **Cash** and confirm. Nothing is sent from the app: you pay at the shop when you pick
up your vehicle, and the administrator records the payment, which is approved at once.

### Loyalty points and coupons
Each paid booking adds the points of its services when the administrator **approves the payment**
(you get "You earned N points"). When your points reach a promotion, you get **"You have a coupon to
redeem!"** with its code (inbox and, if Promotions is on, email and push). Your balance and the
available coupons are on the dashboard. A refunded payment takes its points back.

### History and rating
**History** shows your real bookings, newest first (filters: all, active, completed, cancelled), the
payment status of each one (pending, in review, paid, rejected, refunded) and the operator assigned.
Clicking a booking opens its detail (services, date and time, vehicle, total, payment status and
rating) with a **Go to payment** button, except for cancelled or no-show bookings. When a booking is
**completed** you can rate it once: 1 to 5 stars and an optional comment (up to 500 characters). Your
rating shows who served you ("Served by Juan Camilo").

---

## Administrator

| Task | Where |
|---|---|
| See and filter bookings | **Reservations**. The dashboard lists the **bookings without operator** |
| Close a booking nobody registered | Dashboard → **To close** (only shown when there is something): bookings whose time ended with an operator who did not press Start, or started and not finished. Press **Attended** if the car was washed (it counts in reports and in the operator's services) or **No-show** if the client did not come. A booking that never had an operator becomes no-show by itself one hour after its end |
| Book for a client | **Reservations → New** → search the vehicle by plate → services → date/time. The bay is assigned automatically |
| Move a booking forward | Booking detail → **Start** → **Complete**; or **No show**; or **Cancel** (the client is notified) |
| Business hours, lunch break, exceptions (holidays, closed days) | **Schedule**. In an exception that opens, the closing time must be after the opening time |
| Bays (active / maintenance / inactive) | **Schedule → Bays**. Only active bays are used for new bookings; two vehicles at the same time never share a bay |
| Services, prices per vehicle type and **loyalty points** per service | **Management → Services** |
| Promotions (coupons) | **Management → Promotions**: code, discount %, points needed to unlock it, start date; pause or resume from its card |
| Users and roles: create, activate or deactivate; permissions per role | **Management → Users / Roles** (accounts are deactivated, never deleted). The users table has the **Enabled** and **Disabled** filters and a search box; the user type is only shown, it is not changed from the list. Nobody deactivates their own account, and an administrator account cannot be deactivated |
| Your notices | **Notifications** (same inbox as the other roles; the administrator does not write notices from the web or the app) |
| Operators: active or not, weekly shift, absences | **Operators** (operators are the accounts with role Operator in **Management → Users**) |
| Operator specialty and skills | **Operators** → an operator → **Skills and certifications → Edit**: specialty and up to 10 skills, each certified, expert or advanced. Saving replaces the list |
| Assign or change the operator of a booking | New bookings are **assigned automatically** to the operator the client chose or to the free one with fewest bookings that day. To change it: **Reservations** → booking detail → **Operator assignment**: each operator shows whether they are available or why not (inactive, not on shift, absent, busy). Only before the service starts and while its time has not passed |
| Review payments | **Payments** → **Verify**: you see the amount due and the amount the client reports; approve, or reject with a reason. Approving credits the client's points |
| Refund a payment | **Payments** → an approved payment → **Refund**. The money is returned outside the system (same account or cash); the client is notified and the points are reversed |
| Register a cash payment | **Payments** → **Manual entry**: the amount is the booking total and it is approved at once |
| Business data | **Settings → Business data**: four cards (general information, location and contact, tax information, official channels), each edited with its pencil and **Apply**, then **Save changes**. The system ships without a real business, so empty fields show **To be completed** until the business that adopts it fills them. Saved in the system, so the web and the app show the same data. Legal name, tax ID and address are required; the phone needs at least 7 digits |
| Payment accounts and QR | **Settings → Payment methods** |
| Operator's week | **Operators** → an operator: services finished this week and the change against last week, punctuality (started at most 10 minutes late), revenue of the finished services and worked hours against the weekly shift. "—" means there is no data yet |
| Vehicle inspection | **Reservations** → a booking of 3 hours or more → **Inspection**: fill the 5 phases with findings and photos (up to 5 per finding), **Publish** and copy the link, then **Notify client** (inbox, push and email with the summary and the link). The client opens the link from any device without logging in; the plate shows masked. In the mobile app: booking detail → **Inspection**; photos come from the camera or the gallery, are shrunk on the phone before uploading, and the link is shared with the phone's share menu |

**Notices you receive** (inbox and push, never email): new, rescheduled and cancelled bookings,
**"Booking without operator"** when a booking starts in less than 2 hours — or started less than 1
hour ago — and nobody is assigned, and **"Service not registered"** when a booking with an operator
ended and nobody pressed Start (or Finish): close it from **To close**.


---

## Operator

| Task | Where |
|---|---|
| See today's services (or another range) | **Assigned services** / **My schedule**: booking code, services, vehicle, time and status |
| Start a service | **Start**. Enabled from **15 minutes before** the booking time; before that the button tells you from what time you can start. You cannot have two services in progress |
| Finish a service | **Finish**. The client is notified and can rate it |
| See your shift | **My Schedule** (the administrator sets it) |
| See your finished services | **Service history**: newest first; clicking a row opens its detail and, if the client rated it, a **Go to ratings** button |
| See your ratings | **Ratings**: stars, comments, the client's name and plate, and your average |
| Notices | You are told when a service is assigned to you, rescheduled, cancelled or given to someone else (inbox and push), and **"Did you attend this service?"** when its time ended and you did not press Start |
| You forgot to press Start | If you see it the same day, press **Start** and then **Finish** in **Assigned services** (it is recorded as late); otherwise tell the administrator, who closes it as attended |

---

## If something fails

| You see | Do |
|---|---|
| "Session expired" | Sign in again |
| A message that the time is no longer available | Pick one of the offered times |
| An operator cannot be assigned | The message says why (not on shift, absent, busy, inactive, or the booking's time has passed); fix the shift in **Operators**, choose another operator, or mark an old booking as no-show |
| "You cannot start this service yet" | Wait until 15 minutes before the booking time |
| A payment cannot be sent | The booking already has a payment in review or approved, it is cancelled, or the reference was already used |
| A coupon is rejected | It is not unlocked yet (not enough points), paused, not started, or already used on this booking |
| No email arrives | Check spam; check the switches in **Settings → Notifications**. The notice is always in the inbox |
| "Too many failed attempts" when logging in | After 5 wrong passwords in 15 minutes the account is locked for 15 minutes. Wait, or use **Forgot your password?**: resetting it unlocks the account at once |
| A generic error | Try again; if it repeats, tell the team with the time it happened |
