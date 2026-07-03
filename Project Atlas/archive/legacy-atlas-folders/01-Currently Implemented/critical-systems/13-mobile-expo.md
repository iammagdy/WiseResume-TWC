# 13 · Mobile (Expo)

**Status:** Implemented (Phase 1 · in `mobile/`)
**Last verified:** 2026-05-08

The native iOS + Android client lives at the repo root in `mobile/` and is built with **Expo SDK 51** + **Expo Router 3.5**. It is a separate app from the web build but talks to the **same** Supabase project, Kinde tenant, and AI providers — there is no second backend.

This card replaces the previous `13-mobile-capacitor.md` (deleted by Task #34). Capacitor scaffolding is fully gone from the web repo.

## Repo layout (verified 2026-05-08)

```
mobile/
  app.config.ts           # env-driven Expo config (bundle id, scheme, plugins)
  eas.json                # development / preview / production build profiles
  package.json            # SDK 51 deps
  app/                    # 26 file-based routes (Expo Router)
  src/                    # 20 source files (lib, hooks, state, theme, components)
  README.md / QA.md / store/README.md
```

### Routes (`mobile/app/`, 26 files)

| Route | File | Purpose |
|---|---|---|
| `/` | `index.tsx` | Bridge identity → `/(tabs)` or `/(auth)` |
| `(auth)/_layout.tsx` | layout | Auth stack wrapper |
| `(auth)/onboarding.tsx` | onboarding screen | First-run carousel |
| `(auth)/sign-in.tsx` | sign-in | Kinde PKCE flow trigger |
| `(tabs)/_layout.tsx` | layout | Tab bar wrapper |
| `(tabs)/dashboard.tsx` | tab | Quick stats + jump-back-in |
| `(tabs)/resumes.tsx` | tab | Resume list |
| `(tabs)/tracker.tsx` | tab | Job application tracker |
| `(tabs)/interview.tsx` | tab | Interview practice entry |
| `(tabs)/profile.tsx` | tab | Profile + settings shortcut |
| `_layout.tsx` (root) | layout | QueryClient, ThemeProvider, SafeArea, gesture handler |
| `+not-found.tsx` | screen | 404 |
| `settings.tsx` | screen | Settings |
| `paywall.tsx` | screen | Coming Soon payment screen |
| `resume/new.tsx`, `resume/[id].tsx` | screens | Create / view resume (read-only Phase 1) |
| `cover-letter/index.tsx`, `new.tsx`, `[id].tsx` | screens | Cover-letter list / create / view |
| `resignation-letter/index.tsx`, `new.tsx`, `[id].tsx` | screens | Resignation-letter list / create / view |
| `interview/new.tsx`, `interview/[track].tsx` | screens | Interview track picker + active session |
| `job/new.tsx`, `job/[id].tsx` | screens | Add / view job application |

### Source (`mobile/src/`, 20 files)

| Area | File | Purpose |
|---|---|---|
| **lib** | `config.ts` | EXPO_PUBLIC_* env reader + asserts |
|  | `supabase.ts` | Supabase JS client bound to bridge JWT |
|  | `auth.ts` | Kinde PKCE + token-exchange + secureStore persistence |
|  | `api.ts` | Typed wrapper around `mobile-api` consolidated router |
|  | `secureStore.ts` | expo-secure-store helpers (`wr.bridge.token`, `wr.bridge.user`) |
| **state** | `queryClient.ts` | TanStack Query client (MMKV-persisted) |
|  | `authStore.ts` | Auth state (user, token, signed-in flag) |
|  | `settingsStore.ts` | Local preferences mirror |
| **theme** | `tokens.ts` | Color / type tokens mirroring web Tailwind theme |
|  | `ThemeProvider.tsx` | Light/dark theme provider |
| **hooks** | `useMe.ts` | Mobile equivalent of web `useMe` |
|  | `useResumes.ts` | Resume list query |
|  | `usePushRegistration.ts` | Permission + Expo push token registration |
|  | `useBiometricGate.ts` | FaceID/TouchID lock |
| **components** | `BiometricLockOverlay.tsx` | Lock overlay UI |
| **components/ui** | `Button.tsx`, `Input.tsx`, `Card.tsx`, `Screen.tsx`, `EmptyState.tsx` | Primitive UI parts |

## Auth bridge

Kinde is the identity provider for both web and mobile.

1. `lib/auth.ts` opens a system browser via `expo-auth-session` (PKCE) → `${KINDE_DOMAIN}/oauth2/auth`.
2. Callback returns to `wiseresume://auth/callback` (custom scheme) or universal-link `https://resume.thewise.cloud/...`.
3. POST the resulting Kinde access token to the existing `token-exchange` edge function → receive a WiseResume **bridge JWT**.
4. The bridge JWT is stored in **expo-secure-store** (Keychain / Keystore) under `wr.bridge.token`. Decoded identity in `wr.bridge.user`. Every PostgREST + Edge Function call attaches `Authorization: Bearer <jwt>`.

There is **never** a Supabase-issued user session on the device.

## Backend additions (consolidated 2026-05)

Mobile-only paths now route through 2 edge functions instead of the original 10:

| Function | Auth | Purpose |
|---|---|---|
| `mobile-api` | bridge JWT | **Consolidated router**: `register-push-token`, `export-pdf {kind,id}` (resume / cover-letter / resignation-letter / portfolio), `interview-next-question`, `interview-grade-answer` |
| `mobile-config` | none (public) | Min-supported / latest version, banner, feature flags |
| `send-push` | `EDGE_INTERNAL_TOKEN` | Server-to-server fan-out via Expo Push API |
| `export-portfolio-pdf` | bridge JWT | Server-side render via `PDF_RENDERER_URL` (shared with web) |

The PDF export path delegates rendering to a headless-Chromium service at `PDF_RENDERER_URL` — we explicitly do NOT ship Chromium inside an edge function. Bytes are uploaded to the `exports` Storage bucket; mobile receives a 1-hour signed URL.

## DB tables (mobile-introduced)

Migration `20260601000000_mobile_device_tokens_and_versions.sql` adds:

- **`device_push_tokens`** — `(user_id, token)` unique; `platform`, `app_version`, `device_id`, `locale`, `notification_prefs jsonb` (per-category opt-in), `last_seen_at`, `revoked_at`. RLS: users own their rows; service role bypasses for fan-out.
- **`mobile_app_versions`** — per-platform manifest read by `mobile-config`: `min_supported_version`, `latest_version`, `release_notes`, `is_force_update`, optional `banner_message` + `banner_severity`. Public-read RLS so anonymous cold-starts work. Seeded with `1.0.0` rows for both platforms.

Migration `20260601100000_interview_audio_bucket.sql` adds the `interview-audio` Storage bucket for voice interview recordings.

Both tables are **additive** — no existing column types are touched.

## Universal links

`public/.well-known/apple-app-site-association` and `public/.well-known/assetlinks.json` declare bundle id `com.wiseresume.app` and the Android package as link handlers for `/auth/callback`, `/r/*`, `/p/*`, `/job/*`, `/cover-letter/*`, `/dashboard*`. Both files contain placeholder identifiers (`TEAMID_PLACEHOLDER`, `REPLACE_WITH_PLAY_APP_SIGNING_SHA256`) that must be replaced once Apple / Play certs are provisioned.

## In-app purchases

Online payments are disabled. The mobile paywall shows plan previews with a disabled Coming Soon action. Existing server-side plan data remains the source of truth through the `me` endpoint.

## Push notifications

`hooks/usePushRegistration.ts` runs once after sign-in: requests permission, retrieves an Expo push token, POSTs it to `mobile-api` `register-push-token`. Server-side fan-out goes through `send-push`, honoring per-category `notification_prefs`.

## What's *not* in this card (Phase 2 — deferred)

- Inline section editing for resumes, cover letters, resignation letters (current detail screens are read-only with title edit only).
- In-app rich PDF preview (we hand back a signed URL today).
- Apple Sign-In / Google One-Tap.
- Live Activities, Dynamic Island, watchOS / Wear OS companions.
- Maestro / cloud-device farm runs (Phase 1 ships with a Detox scaffold under `mobile/e2e/`; suite runs on a developer workstation, not in Replit).
- EAS project init, store assets, screenshot generation — these run on a developer's Mac with the Apple Developer + Play Console accounts.
