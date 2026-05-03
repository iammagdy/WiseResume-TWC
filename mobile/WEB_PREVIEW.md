# Mobile app — web preview in Replit

The Expo app in `mobile/` can be rendered in Replit's preview pane via
`react-native-web`, so reviewers don't need a physical device or simulator
to look at the screens.

> **Scope.** Web preview exists for **layout review only**. It is not a
> production target — Kinde sign-in, biometrics, push notifications,
> in-app purchases, MMKV persistence, and SecureStore-backed Keychain
> are no-ops or stubbed on web. Always run on a real device for QA of
> auth, payments, or storage flows.

---

## How to start it

A workflow named **`Mobile (Web Preview)`** is preconfigured in this
Repl. To launch it:

1. Open the **Workflows** panel.
2. Click **Run** next to *Mobile (Web Preview)*.
3. When the console prints `Waiting on http://localhost:8080`, switch
   the preview pane's port selector to **`8080`** (mapped externally
   via the standard Replit port table).

Equivalent shell command (from the repo root):

```bash
cd mobile && CI=1 EXPO_NO_TELEMETRY=1 npx expo start --web --port 8080
```

The first cold start takes ~40 s (Metro bundling 1.4 k modules);
subsequent reloads are near-instant thanks to Fast Refresh.

---

## What was changed to make web work

### 1. Dependencies (`mobile/package.json`)

Added the standard Expo web stack:

| Package | Purpose |
| --- | --- |
| `react-native-web@~0.19.10` | DOM renderer for `react-native` primitives |
| `react-dom@18.2.0` | React renderer for the browser |
| `@expo/metro-runtime@~3.2.0` | Fast Refresh + error overlay for the web target |
| `babel-plugin-module-resolver` | Was referenced by `babel.config.js` but missing — required for the `@/` alias on web |
| `ajv@^8.12.0` | Pinned to break a hoist conflict with `ajv-keywords` that crashed `expo export` |

Install with `--legacy-peer-deps` (one transitive peer in
`sonner-native` requires `react-native-svg ≥15.6` while we pin to
`15.2` for SDK 51 compatibility — known and safe).

### 2. `mobile/src/state/queryClient.ts` — MMKV shim

The query-cache persister used `react-native-mmkv` at module scope:

```ts
import { MMKV } from 'react-native-mmkv';
const storage = new MMKV({ id: 'wr.query-cache' }); // ❌ throws on web
```

`react-native-mmkv` is a JSI module with no JS fallback, so this
crashed the bundle as soon as Metro evaluated `_layout.tsx`. It now
detects `Platform.OS === 'web'` and hands back a `localStorage`-backed
adapter; native paths still load MMKV via `require()` so the web
bundle never references it.

### 3. `mobile/app/_layout.tsx`

Added `import '@expo/metro-runtime';` as the very first import. This
is required by Expo Router's web entry-point; it is a no-op on
native.

### 4. `mobile/app.config.ts`

Removed `'expo-web-browser'` from `plugins` — it no longer ships a
config plugin (current SDKs throw `PluginError`). The runtime export
remains untouched.

### 5. `mobile/.env`

Created with placeholder Kinde / Supabase values so `mobile/src/lib/config.ts`
doesn't throw on boot in the preview environment. Real credentials
continue to be supplied by `eas.json` per build profile for actual
device/EAS builds.

---

## Native modules that already had web fallbacks (no change needed)

- `mobile/src/lib/secureStore.ts` — already branches on
  `Platform.OS === 'web'` to use `localStorage`.
- `mobile/app/paywall.tsx` — `react-native-purchases` is loaded via a
  dynamic `import()` inside `try/catch`, so it falls through to the
  static `FALLBACK_OFFERINGS` on web.
- `mobile/src/hooks/usePushRegistration.ts` — gated on
  `Device.isDevice`, which is `false` on web.
- `mobile/src/hooks/useBiometricGate.ts` — `LocalAuthentication.hasHardwareAsync()`
  rejects on web; the hook treats that as "no biometrics available"
  and unlocks immediately.

## Known limitations on web

- **Sign-in is non-functional.** Kinde PKCE through `expo-auth-session`
  needs an in-app browser; on web the flow opens a popup that the
  Replit proxy won't redirect back through. Use the unauthenticated
  onboarding screens to review layout.
- **Query cache persists in `localStorage`** instead of MMKV. It still
  survives reloads, but writes are slower and capped by the browser's
  ~5 MB localStorage quota.
- **No haptics, push, biometric, or RevenueCat purchases.** All
  no-op silently as documented above.
- **Splash screen and native fonts** render via `react-native-web`'s
  best-effort polyfill; small visual differences vs. iOS/Android are
  expected.

---

## Smoke-test commands

**Compile-time check** — verifies Metro can bundle the web target,
catches missing modules and most syntax-level issues:

```bash
cd mobile && npx expo export --platform web --clear
```

Last verified: produces 2 JS bundles (~3.2 MB) + 27 asset files in
`mobile/dist/`.

**Runtime check** — bundling success is necessary but not sufficient:
unconditional native-module calls inside top-level code blow up only
when the bundle actually executes in a browser. After starting the
workflow, confirm the page paints:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:8080/
# expect: 200
```

…and visually verify the screen renders in the preview pane (no red
error overlay).
