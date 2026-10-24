# ADR-019 — Frontend Architecture: Feature-Based MVVM (Web, Zoneless) and a Layered Mobile App

- **ID:** ADR-019
- **Date:** 2026-10-23 (records the structure of `Front-end-proyecto-web` after the MVVM refactor
  released in `v1.0.0`, and of `LavadoVehicular-Movil`)
- **Status:** Accepted
- **Authors:** Development team

---

## Context

ADR-007 fixes the hexagonal structure of the backend services, but nothing recorded how the two
clients are organised. The web grew to three roles (client, operator, admin) and about forty
screens; components called HTTP services, decided business rules and touched the template at the
same time, which made them hard to test without a browser. The mobile app has the same three roles
plus authentication. Reviewers asked which pattern each client follows (findings C-01, C-02).

**Known constraints:**
- Angular 21 (web) and React Native with Expo SDK 57 (mobile), TypeScript in both.
- Tests must run in CI without a browser or a device (Vitest + jsdom on the web, jest-expo on mobile).
- Every request goes through the API gateway; no client talks to a service directly in production.
- Four languages (es, en, fr, pt) on both clients.

---

## Decision

**We decided:** both clients are organised **by feature (role)** and split each screen into
**View, ViewModel and Model**; the web runs **zoneless** with signals.

### Web (`Front-end-proyecto-web`)

```
src/app/
├── core/       models (backend types), services (one per microservice, HTTP to the gateway),
│               guards (by role), interceptors (token, closed session → login), constants, utils
├── features/   landing · auth · client · operator · admin · public-report · not-found
│   └── <feature>/pages/<screen>/            VIEW: <screen>.ts + .html + .scss
│       <feature>/viewmodels/<screen>.viewmodel.ts   VIEWMODEL: state (signals) and actions
│       <feature>/services/                  stores shared by the screens of a role (admin)
└── shared/     components, dialogs, pipes and viewmodels used by the three roles
```

- **View:** shows the ViewModel state and forwards events; opens dialogs and navigates; never calls
  `core/services` nor decides rules.
- **ViewModel:** an `@Injectable()` registered in the `providers` of its page, so it lives and dies
  with the screen; keeps state in signals, is the only one that talks to `core/services` and the
  stores, and reports results through `FeedbackService`. 36 ViewModels on 2026-10-23.
- **Model:** `core/models` and `core/services`.
- **Zoneless:** Angular 21 without `zone.js`; the view repaints when a signal changes. State changed
  outside a signal (for example in a dialog's `afterClosed`) needs `markForCheck`.
- Behaviour tests target the ViewModels, without rendering the screen (146 tests on 2026-10-23).

### Mobile (`LavadoVehicular-Movil`)

```
src/
├── app/       config (i18n), providers (account preferences, push, updates — ADR-018), theme
├── core/      api (HTTP client and base URL), navigation, services (one per microservice), storage
│              (session in SecureStore on the phone)
├── modules/   auth · client · operator · admin, each with screens, components, viewmodels,
│              hooks, models, services and types
└── shared/    common components (feedback, forms, screen, ui), i18n, layouts, hooks, validators
```

- Layers depend downwards only: `modules` use `core` and `shared`; `core` knows no screen.
- Screens keep only rendering; their state and calls live in the module's ViewModel hooks
  (`useXxxViewModel`, 21 files in `viewmodels/` on 2026-10-23).
- The jest-expo tests (13, added 2026-10-23) cover validators and the booking, payment and login
  services.

**Justification:** the same three roles exist in both clients, so organising by role keeps each
team member in one folder; separating the ViewModel lets the rules be tested without a browser or a
phone; signals without `zone.js` give predictable change detection and smaller bundles.

---

## Evaluated alternatives

| Alternative | Pros | Cons | Reason for discarding |
|------------|------|------|-----------------------|
| Feature-based MVVM, zoneless web — chosen | Testable ViewModels; one folder per role; clear rule "views do not call services" | More files per screen; zoneless needs care with code outside signals | — (chosen) |
| Components that call services directly (the web before the refactor) | Fewer files | Rules mixed with templates; tests need the DOM | Hard to test and review |
| NgRx / Redux store for everything | Central state, devtools | Much boilerplate for a project this size | Signals and a few stores are enough |
| Layers by technical type at the top (`components/`, `services/`) | Familiar | A role's screens spread over many folders | Feature folders scale better with three roles |

---

## Consequences

**Positive:**
- Reviews can check one rule per layer; ViewModels are unit-tested in CI.
- Both clients share the vocabulary (View, ViewModel, Model, one service per microservice).

**Negative / Trade-offs:**
- Web tests are still thin in places: some screens have no ViewModel test and CI does not measure
  coverage (F-02, H-03).
- The admin reports are computed in the browser from the loaded stores (accepted risk H-16, ADR-020).
- The web keeps the session in `localStorage` (accepted risk H-18, ADR-006).

**Impact on the system:**
- Affected: `Front-end-proyecto-web`, `LavadoVehicular-Movil`.
- Documents: `12-ux-ui/navigation-map.md`, `11-quality/testing-strategy.md`, `05-architecture/overview.md`.

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| A view starts calling a service again | Medium | Low | Review rule in the README of the web; tests on the ViewModel |
| A zoneless screen does not repaint after an async callback | Medium | Medium | Keep state in signals; `markForCheck` where a callback sets plain fields; check in the browser |

---

## References

- `Front-end-proyecto-web/README.md` ("Arquitectura: por features + MVVM")
- `LavadoVehicular-Movil/README.md` ("Estructura")
- Related to: ADR-005 (all calls through the gateway), ADR-006 (session storage), ADR-007 (backend structure), ADR-018 (mobile updates)
