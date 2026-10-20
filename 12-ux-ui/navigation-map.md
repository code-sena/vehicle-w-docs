# Navigation Map

> The screen structure of the web app (Angular 21, `Web/src/app`), how screens connect, and which
> backend service feeds each one. Source of truth: `app.routes.ts` and each feature's
> `*-routing-module.ts`. The mobile app (React Native / Expo) mirrors the same three role areas and calls
the API Gateway (`:8080`, `EXPO_PUBLIC_API_URL`), including the admin inspection report (`AdminInspection`
screen, photos from the camera or the gallery); it has no landing or public report. Each service can be pointed at directly while
debugging (`EXPO_PUBLIC_CUSTOMER_API_URL`, `…_BOOKING_…`, `…_OPERATIONS_…`, `…_PAYMENT_…`, `…_NOTIFICATION_…`).

---

## Frontend route structure

```
/                                   → Landing (public): services and prices from the catalog, FAQ
├── /auth                           → (guestGuard: a signed-in user is sent to their home)
│   ├── /                           → Login
│   ├── /register                   → Client sign-up
│   └── /forgot-password            → Password recovery (email → code → new password)
│
├── /client                         → (authGuard, role CLIENT)
│   ├── /                           → Dashboard: vehicles, next booking, points and coupons, shop address
│   ├── /reserve                    → Book a wash (vehicle → service → date/time → confirm)
│   ├── /vehicles                   → My vehicles
│   ├── /history                    → Booking history, newest first (click → detail → Go to payment)
│   ├── /payment                    → Pay a booking
│   ├── /notifications              → Notification inbox
│   ├── /profile                    → Profile
│   └── /configuration              → Preferences (theme, language), help center
│
├── /operator                       → (authGuard, role OPERATOR)
│   ├── /                           → Home: today's services, unread notifications
│   ├── /tasks                      → Redirects to /operator/assigned-services
│   ├── /assigned-services          → Assigned services
│   ├── /schedule                   → My schedule
│   ├── /service-history            → Service history, newest first (click → detail → Go to ratings)
│   ├── /qualifications             → Ratings
│   ├── /notifications              → Notification inbox
│   ├── /profile                    → Profile
│   └── /settings                   → Preferences
│
├── /admin                          → (authGuard, role ADMIN)
│   ├── /                           → Dashboard
│   ├── /reservations               → Bookings
│   ├── /reservations/:id/inspection→ Vehicle inspection with photos (5 phases, findings, publish, share)
│   ├── /schedule                   → Business hours, exceptions and bays
│   ├── /management                 → Users, roles, services (catalog), promotions
│   ├── /operators                  → Operators
│   ├── /operators/:id              → Operator detail
│   ├── /operators/:id/calendar     → Operator calendar
│   ├── /payments                   → Payments review
│   ├── /reports                    → Reports
│   ├── /notifications              → Notification inbox
│   ├── /profile                    → Profile
│   └── /settings                   → Business data, payment methods
│
├── /report/:token                  → Public read-only inspection report (no session)
└── /**                             → Not found page
```

---

## Screen map

Status: **API** = reads and writes the backend · **Partial** = some data still local ·
**Local** = still on local/mock data because its service is not built yet.

| Screen | Route | Role | Backend service | Status |
|--------|-------|------|-----------------|--------|
| Landing | `/` | Public | booking (catalog prices) | API |
| Login / Register / Recovery | `/auth/**` | Public | security | API |
| Client dashboard | `/client` | CLIENT | customer (vehicles), booking (stats, next booking, establishment), operations, payment (points and coupons) | API |
| Book a wash | `/client/reserve` | CLIENT | customer (vehicles), booking (catalog, availability, booking) | API |
| My vehicles | `/client/vehicles` | CLIENT | customer | API |
| Service history | `/client/history` | CLIENT | booking (bookings, cancel), payment (my payments), operations (ratings) | API |
| Pay a booking | `/client/payment` | CLIENT | booking (amount, cancel); payment (accounts with QR, report with receipt, my payments, coupon redeem) | API (once the payment is approved only the summary is shown) |
| Notifications (all roles) | `*/notifications` | any | notification | API |
| Profile (all roles) | `*/profile` | any | security | API |
| Preferences — theme, language | `*/configuration`, `*/settings` | any | security (`/users/me/preferences`) | API (`localStorage` only remembers the last choice for screens without a session) |
| Operator area | `/operator/**` | OPERATOR | operations (services, start/finish, ratings), notification, security | API (`/operator/tasks` only redirects to assigned services) |
| Admin dashboard | `/admin` | ADMIN | booking (bookings, bays), operations, payment | API |
| Bookings | `/admin/reservations` | ADMIN | booking, customer (plate lookup), security (client names), operations (assignment, candidates) | API |
| Vehicle inspection | `/admin/reservations/:id/inspection` | ADMIN | operations (report, phases, findings with photos, publish, share) | API |
| Public inspection report | `/report/:token` | Public | operations (published report and photos) | API |
| Schedule and bays | `/admin/schedule` | ADMIN | booking | API |
| Management — users | `/admin/management` | ADMIN | security | API |
| Management — services | `/admin/management` | ADMIN | booking (catalog, prices per vehicle type) | API |
| Management — roles, promotions | `/admin/management` | ADMIN | security (role permissions); payment (promotions, loyalty) | API (ADR-015: roles fixed with editable permissions; promotions are redeemable coupons gated by loyalty points) |
| Operators, calendar | `/admin/operators/**` | ADMIN | operations (operators, shifts, absences) | API |
| Payments | `/admin/payments` | ADMIN | payment (review, approve/reject, manual payment) | API |
| Reports | `/admin/reports` | ADMIN | booking, payment | Partial |
| Settings — business data | `/admin/settings` | ADMIN | booking (`/admin/establishment`); payment (payment accounts and QR) | API |

---

## Responsive design

Every screen is checked at 360 px (phone) and 768 px (tablet) with no horizontal overflow
(SCSS mixins `mobile` ≤ 768 px and `tablet` ≤ 1024 px). Check of 2026-10-17: 60 web screens and
26 mobile screens, no overflow.

---

## Main user flows

### Flow 1 — Sign-up and first login

```
Landing (/) ──► Register (/auth/register) ──► security creates the account
                                                 │  UserRegistered (RabbitMQ)
                                                 ├─► customer: client profile
                                                 └─► notification: welcome (inbox + email)
Login (/auth) ── valid ──► /client (or /operator, /admin by role)
             └─ invalid ─► same screen, generic error (does not reveal if the email exists)
```

**Related HUs:** HU-AUTH-001, HU-AUTH-002

### Flow 2 — Book a wash (RF-005, RF-006)

```
/client/reserve
  1. choose a vehicle         → prices reload for its vehicle type
  2. choose a service         → price and duration of that type
  3. choose a date            → free times from booking-service (closed day / no times shown)
  4. confirm
       ├─ bay free  → booking CONFIRMED + bay → summary modal → /client/payment
       │              notification: "booking confirmed" (inbox + email), reminders scheduled
       └─ slot taken (409) → up to 5 alternative times of that day are offered
```

**Related HUs:** HU-BOOK-001

### Flow 3 — Admin books for a client and moves the booking

```
/admin/reservations → New booking → search vehicle by plate → services → date/time → save
Booking detail → Start (IN_PROGRESS) → Complete (COMPLETED)
              → No show (NO_SHOW) / Cancel (CANCELLED, client notified)
Edit / cancel only while the backend says the booking is still changeable (RF-007)
```

**Related HUs:** HU-BOOK-002, HU-ADMIN-001

### Flow 4 — Password recovery (RF-003)

```
/auth/forgot-password: email → 6-digit code by email → new password → login
```

**Related HUs:** HU-AUTH-003

### Flow 5 — Notification detail and "Go to..."

```
*/notifications → click a notification (or "View detail") → detail dialog, marked as read
  └─ notice with its own section → button "Go to ..." → client: history or home ·
     operator: assigned services or home · admin: bookings or home
     (system messages without a section only show "Close")
```

The same table is used for push notifications in the app (`notificationRoutes.ts`) and in the web
(`shared/dialogs/notification-models/notification-target.ts`).

### Flow 6 — History detail

```
/client/history (newest first) → click a booking → booking detail → "Go to payment" → /client/payment?booking=:id
                                 (not shown for cancelled or no-show bookings)
/operator/service-history (newest first) → click a row → service detail → "Go to ratings" (only if rated)
```

---

## Navigation rules

| Rule | Description |
|------|-------------|
| Authentication | `/client`, `/operator`, `/admin` require a session (`authGuard`); without one → `/auth?returnUrl=…` |
| Authorization | Each area declares its role (`data.roles`); a signed-in user of another role is sent to their own home. This is UX only: the backend enforces the roles |
| Guests only | `/auth/**` (`guestGuard`): a signed-in user is sent to their home |
| Confirmation | Destructive actions (delete, cancel, deactivate) open a confirmation dialog |
| Errors | Backend errors carry a `code`, translated through `API_ERRORS.<code>` in the 4 languages |
| 404 | The wildcard route (`**`) opens the not-found page, with a link to the home of each role |

---

## Correlations

- Design system → `12-ux-ui/design-system.md`
- Mockups → `12-ux-ui/mockup/`
- API contracts → `07-api/contracts/openapi/`
- Roles and permissions → `00-governance/security-policy.md`
