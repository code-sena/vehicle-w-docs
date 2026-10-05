# Navigation Map

> The screen structure of the web app (Angular 21, `Web/src/app`), how screens connect, and which
> backend service feeds each one. Source of truth: `app.routes.ts` and each feature's
> `*-routing-module.ts`. The mobile app (React Native / Expo) mirrors the same three role areas and calls security,
customer and booking directly (ports 3001–3003, configurable with `EXPO_PUBLIC_*` variables).

---

## Frontend route structure

```
/                                   → Landing (public): services and prices from the catalog
├── /auth                           → (guestGuard: a signed-in user is sent to their home)
│   ├── /                           → Login
│   ├── /register                   → Client sign-up
│   └── /forgot-password            → Password recovery (email → code → new password)
│
├── /client                         → (authGuard, role CLIENT)
│   ├── /                           → Dashboard: vehicles, next booking, shop address
│   ├── /reserve                    → Book a wash (vehicle → service → date/time → confirm)
│   ├── /vehicles                   → My vehicles
│   ├── /history                    → Service history
│   ├── /payment                    → Pay a booking
│   ├── /notifications              → Notification inbox
│   ├── /profile                    → Profile
│   └── /configuration              → Preferences (theme, language), help center
│
├── /operator                       → (authGuard, role OPERATOR)
│   ├── /                           → Home: today's services, unread notifications
│   ├── /tasks                      → Tasks
│   ├── /assigned-services          → Assigned services
│   ├── /schedule                   → My schedule
│   ├── /service-history            → Service history
│   ├── /qualifications             → Ratings
│   ├── /notifications              → Notification inbox
│   ├── /profile                    → Profile
│   └── /settings                   → Preferences
│
├── /admin                          → (authGuard, role ADMIN)
│   ├── /                           → Dashboard
│   ├── /reservations               → Bookings
│   ├── /reservations/:id/inspection→ Vehicle inspection with photos (in development, not merged)
│   ├── /schedule                   → Business hours, exceptions and bays
│   ├── /management                 → Users, roles, services (catalog), promotions
│   ├── /operators                  → Operators
│   ├── /operators/:id              → Operator detail
│   ├── /operators/:id/calendar     → Operator calendar
│   ├── /payments                   → Payments review
│   ├── /reports                    → Reports
│   ├── /notifications              → Notification inbox + manual notifications
│   ├── /profile                    → Profile
│   └── /settings                   → Business data, payment methods
│
└── /report/:token                  → Public read-only inspection report (in development, not merged)
```

---

## Screen map

Status: **API** = reads and writes the backend · **Partial** = some data still local ·
**Local** = still on local/mock data because its service is not built yet.

| Screen | Route | Role | Backend service | Status |
|--------|-------|------|-----------------|--------|
| Landing | `/` | Public | booking (catalog prices) | API |
| Login / Register / Recovery | `/auth/**` | Public | security | API |
| Client dashboard | `/client` | CLIENT | customer (vehicles), booking (stats, next booking, establishment) | API |
| Book a wash | `/client/reserve` | CLIENT | customer (vehicles), booking (catalog, availability, booking) | API |
| My vehicles | `/client/vehicles` | CLIENT | customer | API |
| Service history | `/client/history` | CLIENT | booking (active, completed, cancelled bookings) | API (ratings wait for operations) |
| Pay a booking | `/client/payment` | CLIENT | booking (amount, points discount, cancel); payment (incomplete) | Partial — the receipt upload and payment state are still local until payment-service |
| Notifications (all roles) | `*/notifications` | any | notification | API |
| Profile (all roles) | `*/profile` | any | security | API |
| Preferences — theme, language | `*/configuration`, `*/settings` | any | — (browser `localStorage`) | Local — **gap**: stored per browser, not per account, so a second account on the same device inherits them. Required: load/save through `/users/me/preferences` (RF-019/020) |
| Operator area | `/operator/**` | OPERATOR | operations (planned) | Local (except notifications and profile) |
| Admin dashboard | `/admin` | ADMIN | booking (bookings, bays) | Partial (operator and payment widgets local) |
| Bookings | `/admin/reservations` | ADMIN | booking, customer (plate lookup), security (client names) | API (operator assignment local) |
| Schedule and bays | `/admin/schedule` | ADMIN | booking | API |
| Management — users | `/admin/management` | ADMIN | security | API |
| Management — services | `/admin/management` | ADMIN | booking (catalog, prices per vehicle type) | API |
| Management — roles, promotions | `/admin/management` | ADMIN | — / payment (planned) | Local (roles are fixed, ADR-010) |
| Operators, calendar | `/admin/operators/**` | ADMIN | operations (planned) | Local |
| Payments | `/admin/payments` | ADMIN | payment (incomplete) | Local |
| Reports | `/admin/reports` | ADMIN | booking | Partial |
| Settings — business data | `/admin/settings` | ADMIN | booking (establishment, fields pending ADR-010) | Local |

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

---

## Navigation rules

| Rule | Description |
|------|-------------|
| Authentication | `/client`, `/operator`, `/admin` require a session (`authGuard`); without one → `/auth?returnUrl=…` |
| Authorization | Each area declares its role (`data.roles`); a signed-in user of another role is sent to their own home. This is UX only: the backend enforces the roles |
| Guests only | `/auth/**` (`guestGuard`): a signed-in user is sent to their home |
| Confirmation | Destructive actions (delete, cancel, deactivate) open a confirmation dialog |
| Errors | Backend errors carry a `code`, translated through `API_ERRORS.<code>` in the 4 languages |
| 404 | **Gap:** there is no wildcard (`**`) route — an unknown URL renders nothing. A 404 page is pending |

---

## Correlations

- Design system → `12-ux-ui/design-system.md`
- Mockups → `12-ux-ui/mockup/`
- API contracts → `07-api/contracts/openapi/`
- Roles and permissions → `00-governance/security-policy.md`
