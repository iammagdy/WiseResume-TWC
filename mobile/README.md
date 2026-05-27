# WiseResume Mobile

Native iOS + Android client for WiseResume, built with **Expo SDK 51** and
**Expo Router**. Talks to the same Supabase project, Kinde tenant, and AI
providers as the web app — there is no second backend.

## Stack at a glance

| Concern              | Choice                                              |
| -------------------- | --------------------------------------------------- |
| Framework            | Expo SDK 51 (React Native 0.74, new architecture)   |
| Navigation           | Expo Router (file-based, typed routes)              |
| Data                 | TanStack Query + MMKV-persisted cache               |
| Auth                 | Kinde PKCE (`expo-auth-session`) → Supabase bridge  |
| Storage              | `expo-secure-store` for tokens, `MMKV` for caches   |
| Push                 | Expo Notifications → `register-push-token` edge fn  |
| Payments             | Disabled; upgrade UI is marked Coming Soon          |
| Deep links           | `applinks:` + Android App Links (`/.well-known/`)   |
| OTA                  | EAS Update                                          |
| Crash + perf         | Sentry React Native                                 |

## First-time setup

```bash
cd mobile
cp .env.example .env       # fill in Supabase / Kinde keys
npm install                # heavy — ~3 minutes the first time
npx expo prebuild --clean  # only needed if you want native ios/ android folders
npm run ios                # or `npm run android`
```

The web app's `vite` dev server is unrelated; you can run both at once.

## Required environment

All values live in `.env` and are exposed to the binary via `EXPO_PUBLIC_*`.
See `.env.example` for the full list. Every key is **required** in production
except Sentry (which silently disables itself). Online payments are
currently disabled and shown as Coming Soon.

## Authentication

Kinde is the same identity provider as on the web. The flow is:

1. Mobile binary opens a system browser via `expo-auth-session` (PKCE).
2. Kinde redirects to `wiseresume://auth/callback` (custom scheme) **or**
   `https://resume.thewise.cloud/auth/callback` (universal link).
3. We POST the Kinde access token to the existing `token-exchange` edge
   function and receive a WiseResume bridge JWT.
4. The bridge JWT is stored in **expo-secure-store** (iOS Keychain /
   Android Keystore-backed) and attached as `Authorization: Bearer` on
   every PostgREST + edge-function call.

There is **never** a Supabase-issued user session on the device — the
bridge JWT is the only credential.

## Universal links / deep links

Add the same paths to both `apple-app-site-association` and
`assetlinks.json` under the web app's `public/.well-known/` (already
shipped). Replace the `TEAMID_PLACEHOLDER` and Play signing SHA-256 with
real values once the Apple Developer team and Play Console signing
certificates are provisioned.

## Push notifications

The mobile binary registers an Expo push token on every cold-start via
the new `register-push-token` edge function. Server-side fan-out goes
through `send-push` (authenticated via the `EDGE_INTERNAL_TOKEN`
service-to-service secret). Per-category opt-ins are stored on the row
itself so the user always controls what they receive.

## Payments

Online payments are disabled for now. The paywall remains visible with
plan previews, but upgrade actions are marked Coming Soon. Server-side
plan data remains the source of truth through the `me` endpoint.

## Building

```bash
# Internal dev / smoke
npm run build:dev          # eas build --profile development
npm run build:preview      # internal distribution APK / TestFlight
npm run build:prod         # store builds (auto-incremented buildNumber)

# Submit
npm run submit:ios         # uploads to App Store Connect
npm run submit:android     # uploads to Play Console internal track
```

EAS profiles are defined in `eas.json`. Per-environment env vars are
injected by EAS at build time — never bundle production secrets into the
repo.

## OTA updates

`runtimeVersion: { policy: 'appVersion' }` keeps OTA bundles compatible
within the same store-released marketing version. Native code changes
require a store submission; pure JS/TS changes can ship via
`npm run update`.

## Troubleshooting

* **"PDF renderer failed (404)"** — set `PDF_RENDERER_URL` in the
  Supabase project secrets to your headless-Chromium endpoint. The
  `export-*-pdf` functions need it.
* **"Push registration failed"** — only fires on real devices.
  Simulators / emulators silently no-op.
* **"Kinde did not return an access token"** — the redirect URI in the
  Kinde "Native" application config must match exactly the value
  printed by `getRedirectUri()` (open the dev menu → Logs).

## Phase 2 (deferred until Phase 1 ships)

* Inline section editing for resumes, cover letters, resignation letters.
* Rich PDF preview inside the app (currently we hand back a signed URL).
* Apple Sign-In + Google One-Tap on Android.
* Live Activities / Dynamic Island for in-progress applications.
