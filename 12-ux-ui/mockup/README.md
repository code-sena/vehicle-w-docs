# Mockups

> Static HTML mockups of the system's main screens, grouped by role. Each screen lives in
> its own `view-*` folder with a self-contained `index.html` (inline styles, no build step)
> that mirrors the real app's color palette, typography and CSS classes.

## Structure

```
mockup/
├── client/     → Screens for the customer role
└── operator/   → Screens for the operator role
```

## Shared screens: Profile and Settings

The **Operator** and **Client** roles use the exact same Profile and Settings screens in the
real app — there is no role-specific variant of either one. For that reason:

- `view-profile` and `view-settings` only exist under `mockup/client/`.
- `mockup/operator/` does **not** have its own `view-profile` or `view-settings` folder.

When implementing or reviewing these two screens, use the ones under `mockup/client/` as the
reference for both roles.

## Dashboard

Each role's dashboard/home screen is role-specific and lives under its own folder:
`mockup/client/view-dashboard` and `mockup/operator/view-dashboard`.
