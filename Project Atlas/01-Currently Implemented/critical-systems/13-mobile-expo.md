# 13 · Mobile (Expo)

**Status:** Implemented (Phase 1 · in `mobile/`)
**Last verified:** 2026-05-02

The native iOS + Android client lives at the repo root in `mobile/` and
is built with **Expo SDK 51** + **Expo Router**. It is a separate app
from the web build but talks to the **same** Supabase project, Kinde
tenant, and AI providers — there is no second backend.

This card replaces the previous `13-mobile-capacitor.md` (Task #30,
deleted by Task #34). Capacitor scaffolding is fully gone from the web
repo; see the CHANGELOG entry for the complete file-by-file deletion
list.

## Repo layout

```
mobile/
  app.config.ts           # env-driven Expo config (bundle id, scheme, plugins)
  eas.json                # development / preview / production build profiles
  package.json            # SDK 51 deps, scripts (start, build:*, submit:*)
  tsconfig.json           # strict TS, path alias @/*
  babel.config.js         # expo preset + module-resolver + reanimated plugin
  metro.config.js         # standard Expo metro
  .env.example            # all required EXPO_PUBLIC_* keys
  app/                    # file-based routes (Expo Router)
    _layout.tsx           # bootstraps QueryClient, ThemeProvider, SafeArea, gesture handler
    index.tsx             # bridge identity → /(tabs) or /(auth)
    (auth)/               # onboarding, sign-in
    (tabs)/               # dashboard, resumes, tracker, interview, profile
    resume/               # [id], new
    job/                  # [id], new
    interview/            # [track], new
    cover-letter/         # index, new, [id]
    resignation-letter/   # index, new, [id]
    settings.tsx
    paywall.tsx
    +not-found.tsx
  src/
    lib/                  # config, supabase, auth (Kinde PKCE bridge), api, secureStore
    theme/                # tokens.ts (mirrors Tailwind), ThemeProvider.tsx
    state/                # queryClient (MMKV-persisted), settingsStore, authStore
    components/ui/        # Button, Input, Card, Screen, EmptyState
    hooks/                # useMe, useResumes, usePushRegistration, useBiometricGate
  README.md / QA.md / store/README.md
```

## Auth bridge

Kinde is the identity provider for both web and mobile. The native
flow:

1. `lib/auth.ts` opens a system browser via `expo-auth-session` (PKCE)
   pointed at `${KINDE_DOMAIN}/oauth2/auth`.
2. Callback returns to `wiseresume://auth/callback` (custom scheme) or
   the universal-link equivalent at `https://resume.thewise.cloud/...`.
3. We POST the resulting Kinde access token to the existing
   `token-exchange` edge function and receive a WiseResume **bridge
   JWT** (the same one the web app uses).
4. The bridge JWT is stored in **expo-secure-store** (Keychain on iOS,
   Keystore on Android) under `wr.bridge.token`. The decoded identity
   is stored at `wr.bridge.user`. Every PostgREST + Edge Function call
   reads it via `secureStorage.getItem` and attaches
   `Authorization: Bearer <jwt>`.

There is **never** a Supabase-issued user session on the device. The
bridge JWT is the only credential — the same security model as the
web client (see `01-auth-bridge.md`).

## Backend additions

Ten new edge functions ship with this card, all `verify_jwt = false`
so they own their own auth (most call `requireAuth` from the shared
middleware; `send-push` and `revenuecat-webhook` use service-to-service
secrets):

| Function                       | Auth                                  | Purpose                                                  |
| ------------------------------ | ------------------------------------- | -------------------------------------------------------- |
| `register-push-token`          | bridge JWT                            | Upsert Expo push token + per-category prefs              |
| `send-push`                    | `EDGE_INTERNAL_TOKEN` header          | Server-to-server fan-out via Expo push API               |
| `revenuecat-webhook`           | `REVENUECAT_WEBHOOK_AUTH_TOKEN`       | Reconcile entitlements into `subscriptions` table        |
| `mobile-config`                | none (public read)                    | Min-supported / latest version, banner, feature flags    |
| `export-resume-pdf`            | bridge JWT                            | Server-side PDF render via `PDF_RENDERER_URL`            |
| `export-cover-letter-pdf`      | bridge JWT                            | Same renderer, cover-letter payload                      |
| `export-resignation-letter-pdf`| bridge JWT                            | Same renderer, resignation-letter payload                |
| `export-portfolio-pdf`         | bridge JWT                            | Same renderer, portfolio payload                         |
| `interview-next-question`      | bridge JWT                            | Pulls next question per track (bank or fallback seeds)   |
| `interview-grade-answer`       | bridge JWT (charges 1 credit)         | AI-graded STAR feedback, refunds on AI failure           |

The four `export-*-pdf` functions share `_shared/pdfRenderer.ts`
which delegates rendering to a headless-Chromium service at
`PDF_RENDERER_URL` (we explicitly do **not** ship Chromium inside an
edge function), uploads the bytes to the `exports` Storage bucket, and
returns a 1-hour signed URL. Web continues to use its existing
client-side html2canvas + jsPDF pipeline; this server path exists
specifically so the mobile binary can avoid shipping a WebView purely
for PDF rendering.

## New tables

Migration `20260601000000_mobile_device_tokens_and_versions.sql` adds:

* **`device_push_tokens`** — `(user_id, token)` unique, columns for
  platform, app_version, device_id, locale, `notification_prefs jsonb`
  (per-category opt-in), `last_seen_at`, `revoked_at`. RLS: users can
  only read/write their own rows; service role bypasses for fan-out.
* **`mobile_app_versions`** — per-platform manifest read by
  `mobile-config`: `min_supported_version`, `latest_version`,
  `release_notes`, `is_force_update`, optional `banner_message` +
  `banner_severity`. Public-read RLS so anonymous app cold-starts work.
  Seeded with `1.0.0` rows for both platforms so the endpoint never
  returns a "no row" branch on day one.

Both tables are **additive** — no existing column types are touched
(per the project convention against PK type changes).

## Universal links

`public/.well-known/apple-app-site-association` and
`public/.well-known/assetlinks.json` declare the bundle id
`com.wiseresume.app` and the Android package as link handlers for
`/auth/callback`, `/r/*`, `/p/*`, `/job/*`, `/cover-letter/*`, and
`/dashboard*`. Both files contain placeholder identifiers
(`TEAMID_PLACEHOLDER`, `REPLACE_WITH_PLAY_APP_SIGNING_SHA256`) that
must be replaced with real values once the Apple Developer team and
Play Console signing certs are provisioned.

## In-app purchases

RevenueCat manages products and entitlements. The mobile binary
purchases via `react-native-purchases`; RevenueCat then posts to
`revenuecat-webhook`, which writes the resolved plan into the same
`subscriptions` table the web checkout uses. The `me` endpoint stays
the single read path, so plan changes take effect on the next refresh
on both surfaces.

## Push notifications

`hooks/usePushRegistration.ts` runs once after sign-in: requests
permission, retrieves an Expo push token, and POSTs it to
`register-push-token`. Server-side fan-out goes through `send-push`,
which honors the per-category `notification_prefs` column so users
control exactly which channels they receive.

## What's *not* in this card (Phase 2 — deferred)

* Inline section editing for resumes, cover letters, resignation
  letters (current detail screens are read-only with title edit only).
* In-app rich PDF preview (we hand back a signed URL today).
* Apple Sign-In / Google One-Tap.
* Live Activities, Dynamic Island, watchOS / Wear OS companions.
* Maestro / cloud-device farm runs (Phase 1 ships with a Detox
  scaffold under `mobile/e2e/` covering the six P1 flows; the suite
  runs on a developer workstation, not in Replit).
* EAS project init, store assets, screenshot generation — these run on
  a developer's Mac with the Apple Developer + Play Console accounts.
