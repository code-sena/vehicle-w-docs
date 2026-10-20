# 12 — UX/UI

> How LavaRápido looks and is navigated. The web app (Angular 21) is the reference
> implementation; the mobile app follows the same three role areas.

---

## Contents

| Path | What it answers |
|------|-----------------|
| [`navigation-map.md`](./navigation-map.md) ⭐ | Every route, its role and guard, which backend service feeds each screen (API / Partial / Local), main flows, navigation rules and gaps |
| [`design-system.md`](./design-system.md) | Colors and the 4 themes, typography, spacing, breakpoints, buttons, feedback, modals, error messages |
| [`mockup/`](./mockup/) | Static HTML mockups made before the Angular app: auth, client and operator screens (see `mockup/README.md`) |

The mockups are the original design reference; where they and the Angular app differ, the
app wins and `navigation-map.md` describes the app.

---

## UX rules

- Business rules live in the backend; screens show what the API answers.
- Every backend error is shown through its translated `API_ERRORS.<code>` text, in 4 languages.
- Destructive actions ask for confirmation.
- Theme and language belong to the **account**, not the device (RF-019/020): the web and the app
  read and save them through `/users/me/preferences`, so they follow the user to any device.

---

## Correlations

| Fed by | Feeds |
|---|---|
| `04-requirements/user-stories.md` | Screens and flows |
| `07-api/contracts/openapi/` | Data shown on each screen |
| This section | `14-training/user-manual.md` |
