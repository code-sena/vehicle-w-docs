# Design System

> The visual language of the web app as implemented in `Web/src/styles.scss`,
> `Web/src/styles/_variables.scss`, `_mixins.scss` and `_breakpoints.scss`.
> Stack: Angular 21 + Angular Material 21 + ngx-translate (es, en, fr, pt).

---

## Design tokens

### Themes

Colors are CSS custom properties on `body`, so a theme switch only changes the class of `body`.
The user picks the theme in Configuration. **Requirement (RF-019):** the theme belongs to the account — each user (each email) gets their own theme back when signing in, even on a shared browser. **Today** it is stored in the browser (`localStorage`, key `theme`, shared by every account on that device) and security-service's `/users/me/preferences` is not used yet; it also only accepts `light`/`dark` while the web has `green-light`, `green-dark`, `pink`, `pink-dark` (TD-002).

| Theme class | Look |
|---|---|
| *(default)* — green light | Primary teal on a light background |
| `green-dark` | Same teal on dark surfaces |
| `pink` | Primary pink on a light background |
| `pink-dark` | Pink on dark surfaces |

### Colors (green light, default)

```css
--primary:        #2ec4b6;   /* main actions, active states */
--primary-hover:  #229990;
--primary-text:   #0e7a70;   /* primary color used as text (contrast on white) */
--primary-soft:   rgba(46, 196, 182, 0.15);   /* chips, selected rows */
--sidebar:        #104039;

--bg:             #f5f6f8;   /* page */
--bg-soft:        #F9FBFB;
--card:           #ffffff;
--border:         #e6eaea;

--text:           #1a1a2e;
--text-secondary: #5f6f75;
--text-muted:     #6f8089;

--success: #0e7a70;  --success-soft: #E0EBEA;   /* confirmed, completed */
--warning: #B45309;  --warning-soft: #FEF3C7;   /* pending, maintenance, attention */
--error:   #D32F2F;  --error-soft:   #FFEBEE;   /* error, cancelled */
--neutral-badge: #67777E;  --neutral-badge-soft: #EDF2F2;
```

In the dark themes the same names take dark values (e.g. `--bg: #1a1a1a`, `--card: #2a2a2a`,
`--text: #ffffff`, `--error: #ff6b6b`). **Components must use the variables, never fixed hex
values**, so they work in the four themes.

SCSS constants in `_variables.scss` (`$color-primary: #29AEA0`, `$color-dark`, `$color-gray`…)
are older static values; new styles should prefer the CSS variables above.

### Typography

```scss
$font-family: 'Plus Jakarta Sans', sans-serif;   // Google Fonts, weights 400–700

$fs-h1: 32px;  $fs-h2: 24px;  $fs-h3: 20px;
$fs-subtitle: 16px;  $fs-body: 14px;  $fs-caption: 12px;
$fw-regular: 400;  $fw-medium: 500;  $fw-semibold: 600;  $fw-bold: 700;
$lh-heading: 1.3;  $lh-body: 1.5;
```

Use the mixins instead of raw sizes: `heading-1`, `heading-2`, `heading-3`, `subtitle`,
`body-text`, `body-text-bold`, `caption-text`. Icons: Material Icons (`<mat-icon>`).

### Spacing, radius and breakpoints

```scss
$padding-page: 40px 48px;
$border-radius: 16px;      // cards, dialogs
$border-radius-sm: 10px;   // inputs, chips

$mobile: 768px;  $tablet: 1024px;  $desktop: 1280px;   // mixins: @include mobile / tablet
```

---

## Components

### Buttons

| Class | Use |
|-------|-----|
| `btn-primary` | Main action of the view (one per view) |
| `btn-outline` | Secondary actions (export, clear filters, retry) |
| `btn-icon` | Icon-only actions in tables and cards (edit, view, delete); always with `aria-label` |
| `btn-icon--danger` | Destructive icon action — always behind a confirmation dialog |

Disabled while a request is running (`[disabled]="saving"`), so a double click cannot submit twice.

### Forms

- Reactive or template-driven forms with the labels from the translation files.
- Errors appear under the field (`form-field__error`, red with an icon) and only after the user
  tried to submit or left the field.
- Validation that protects data lives in the backend; the form only guides the user. A backend
  error comes back with a `code` and is shown translated (`API_ERRORS.<code>`).
- Prices are always shown with the `copPrice` pipe (`35000` → `$35.000`), whatever the language.

### Feedback

| Component | When |
|-----------|------|
| `FeedbackService.success / info / error` (`status-modal`) | Result of an action ("Booking created", error with its translated message) |
| `ConfirmModal` | Destructive or irreversible actions (delete, cancel, deactivate); `danger: true` styles the confirm button in red |
| `app-empty-state` (`variant: 'empty' \| 'filtered'`) | A list with no data, or no results for the current filters — with a call to action |
| Inline "Loading…" text | While a list loads |
| Status pills (`status-pill--<status>`) and `badge` | Booking, bay, payment and user states |

All dialogs open with `panelClass: 'custom-dialog'` and share `shared/dialogs/_dialog-base.scss`.

### Shared building blocks (`Web/src/app/shared`)

| Component | Purpose |
|---|---|
| `sidebar` | Role menu (client, operator, admin) |
| `notifications` | The notification inbox used by the three roles |
| `profile-card`, `settings-panel` | Profile and preferences (theme, language, help center) |
| `stepper`, `password-requirements`, `auth-card`, `auth-side-panel` | Auth and registration screens |
| `empty-state`, `coming-soon`, `back-button` | Common states and navigation |
| `dialogs/*` | Modals: confirm, status, service, schedule exception, register vehicle, notification detail… |

---

## UX patterns

### Principles

1. **Confirm before destroying:** delete, cancel and deactivate always open a confirmation dialog.
2. **The backend decides, the screen shows:** prices, free times and whether a booking can still
   be changed come from the API (`changeable`); the frontend does not recompute business rules.
3. **Empty state as a guide:** a screen without data explains what to do next.
4. **One language at a time:** every text comes from `assets/i18n/{es,en,fr,pt}.json`.

### Error handling (as implemented)

| Scenario | What the app does |
|----------|-------------------|
| Network error (status 0) | Error message `API_ERRORS.NETWORK_ERROR` |
| 401 on a protected call | `auth-interceptor` ends the session and returns to login with the previous URL |
| 403 | Error message `API_ERRORS.FORBIDDEN` |
| 409 `SLOT_UNAVAILABLE` (booking) | The alternative times returned by the backend are offered |
| Any other error with a known `code` | Its translated message |
| Unknown code | `API_ERRORS.UNEXPECTED` — the user never sees a raw key or stack trace |
| Unknown route | **Gap:** no 404 page yet |

---

## Accessibility guide (minimums)

| Aspect | Minimum required |
|--------|-----------------|
| Text contrast | WCAG AA (4.5:1 normal text). `--primary-text` exists because `--primary` on white is too light for text |
| Keyboard navigation | All interactive elements reachable with Tab |
| Form labels | Every field has a visible label |
| Icon buttons | `aria-label` (translated) on every icon-only button |
| Visible focus | Do not remove the focus outline |

---

## Correlations

- Navigation map → `12-ux-ui/navigation-map.md`
- Mockups → `12-ux-ui/mockup/`
- UX non-functional requirements (RNF-008 compatibility, RNF-009 usability, RNF-010 localisation) → `04-requirements/non-functional.md`
