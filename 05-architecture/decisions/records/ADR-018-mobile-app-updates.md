# ADR-018 — Mobile App Updates: EAS Update by Fingerprint and a Mandatory APK

- **ID:** ADR-018
- **Date:** 2026-10-23 (records the mechanism built between 2026-10-16 and 2026-10-21; updated 2026-10-24: automatic OTA with `cd.yml`)
- **Status:** Accepted
- **Authors:** Development team

---

## Context

The Android app (`LavadoVehicular-Movil`, Expo SDK 57, React Native) is not in Google Play: it is
installed from an APK that the web offers at `/app/LavaRapidoVehicular.apk`. Users must get fixes
without reinstalling by hand every time, but a JavaScript update that expects a native module the
installed APK does not have crashes the app.

**Known constraints:**
- No Play Store account; distribution is the APK on the server (ADR-016).
- EAS (Expo Application Services) free tier for builds and over-the-air updates.
- Native changes (new packages, permissions, icon) can only arrive in a new APK.

---

## Decision

**We decided:** two channels, chosen by what changed.

| Change | Channel | How it reaches the phone |
|---|---|---|
| Screens and logic only (JavaScript) | **EAS Update**, channel `preview` (`npm run publish:update -- "what changed"`) | `app.json`: `runtimeVersion.policy = "fingerprint"`, `updates.checkAutomatically = "ON_LOAD"`, `fallbackToCacheTimeout = 0`. The app checks on every start without blocking it; when an update is downloaded it offers "restart now", otherwise it applies on the next start |
| Native change | **New APK** (`eas build -p android --profile preview`, then `npm run publish:apk -- "what changed"`) | `scripts/publish-apk.mjs` runs `deploy/publish-apk.sh` on the server: replaces the APK in one move, writes `/app/version.json` (`versionCode`, size, date, notes) and calls `POST /internal/v1/notifications/app-update`, so notification-service sends `APP_UPDATE_AVAILABLE` (inbox and push) once per `versionCode` |

- **Fingerprint:** the runtime version is a hash of the native project
  (`fingerprint.config.js` skips the `version` of `app.json`), so an update only reaches APKs with the
  same native code, and the visible version can change in an update without cutting it off.
- **Mandatory APK:** at start, `AppUpdatesCheck` reads `/app/version.json`; if its `versionCode` is
  greater than the installed one, the app shows a full-screen modal that cannot be dismissed and only
  offers the download. While a newer APK exists, OTA updates are not offered (they would not match).
  Since 2026-10-24 the check also runs when the app returns to the foreground (MOV-14), and
  `deploy/publish-apk.sh` escapes the release notes so `version.json` is always valid JSON.
- Builds: profile `preview` (APK, `autoIncrement`, `EXPO_PUBLIC_API_URL` pointing to the Azure
  server); `appVersionSource: remote`. Since MOV-08 the `production` profile has the same HTTPS URL
  and channel, and `config.ts` refuses an `http` or local URL outside `__DEV__`.
- **Automatic OTA (`.github/workflows/cd.yml`, merged to `develop` on 2026-10-24, not run yet):** on a
  push to `main` (not for `.md`/`docs/` only) or by hand, it publishes only from `main`. Job `check`
  repeats `tsc` and jest. Job `publish` needs the `EXPO_TOKEN` secret (fails clearly without it), reads
  the channel and URL from `eas.json` (`build.preview`, URL must be https), resolves the fingerprint
  with `expo-updates runtimeversion:resolve` and compares it with the runtime of the EAS build whose
  `versionCode` is in `/app/version.json` (if the VM is off, with the last finished build of the
  channel, and warns). Same fingerprint → `eas update --channel preview --environment preview
  --non-interactive`; different → it shows `eas fingerprint:compare` and fails asking for a new APK,
  which is still built and published by hand. The checkout uses `core.autocrlf true`, because the
  fingerprint hashes `eas.json`, `google-services.json` and `.gitignore` byte by byte and the APKs
  are built on Windows (CRLF).

**Justification:** most changes are JavaScript and arrive in seconds without a reinstall; the
fingerprint makes the incompatible case impossible instead of relying on people bumping a version
number; the mandatory APK guarantees native fixes are not skipped.

---

## Evaluated alternatives

| Alternative | Pros | Cons | Reason for discarding |
|------------|------|------|-----------------------|
| EAS Update by fingerprint + mandatory APK — chosen | Fast JS fixes; no incompatible update; native fixes enforced | Two commands to remember; EAS account needed | — (chosen) |
| Only new APKs | One mechanism | Every typo fix needs a download and install | Too slow for the review cycle |
| `runtimeVersion` = app version (`appVersion` policy) | Simple | A forgotten version bump sends incompatible JS to old APKs | Fingerprint removes the human step |
| Google Play with in-app updates | Store-managed updates | Developer account and review times | Out of budget and scope |
| Optional APK notice | Less intrusive | Users stay on old native code that newer JS no longer supports | Mandatory is safer |

---

## Consequences

**Positive:**
- A JavaScript fix reaches every installed APK of the same native build on its next start.
- The web, the inbox and push all announce a new APK.

**Negative / Trade-offs:**
- If the server is off, `version.json` cannot be read and the APK check is skipped silently.
- `app.json` still sets `usesCleartextTraffic: true` for local development over HTTP (H-14).
- MOV-08 changed `eas.json`, so the fingerprint changed: the first release to `main` will fail its CD
  until a new APK is built and published. An APK built on Linux or macOS would make the CD fail too
  (safe failure). MOV-11 (`app.config.js`) is left out on purpose: it would change the fingerprint and
  cut OTA updates to the installed APK 1.1.0 before the exposition.

**Impact on the system:**
- Affected: `LavadoVehicular-Movil`, `lavarapido-infra/deploy/publish-apk.sh`, notification-service
  (`APP_UPDATE_AVAILABLE`), the web landing page (download button and QR).
- Documents: `10-devops/production.md`, `08-uml/diagrams/source/seq-app-update.md`.

---

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| A JS update relies on a native change and is published as OTA | Low | High | The fingerprint changes and the update does not reach the old APK |
| A user without internet at start keeps an old version | Medium | Low | The update is applied at the next start with connection |

---

## References

- `LavadoVehicular-Movil/app.json`, `eas.json`, `fingerprint.config.js`, `src/app/providers/AppUpdatesCheck.tsx`
- `lavarapido-infra/deploy/publish-apk.sh`; `LavadoVehicular-Movil/.github/workflows/cd.yml`
- Expo: runtime versions and fingerprint policy — https://docs.expo.dev/eas-update/runtime-versions/
- Related to: ADR-011 (notifications), ADR-016 (deployment), ADR-017 (CI/CD)
