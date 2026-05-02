# Mobile (Capacitor 8)

**Last verified:** 2026-05-02
**Type:** deep dive
**Sources:**
- `capacitor.config.ts`
- `vite.config.ts` (mobile mode handling in `define`)
- `src/AppInterior.tsx` (lazy DevToolsPage swap)
- `src/pages/DevToolsStub.tsx`
- `scripts/check-mobile-bundle.mjs`
- `package.json` (`build:mobile`, `mobile:sync`, `mobile:open:*` scripts)
- `docs/mobile.md`
- `.gitignore` (`ios/`, `android/`)
- `replit.md` (Mobile entry under Tech Stack)

**Canonical owner:** `docs/mobile.md` (developer-facing workflow); this card is the architecture reference.

---

## What it is

Wise Resume ships a native iOS + Android shell via Capacitor 8 wrapping the same Vite-built web app served from Hostinger. There is no separate mobile UI — the existing responsive web layout is the mobile UI. The native dependencies declared in `package.json` are: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/app`, `@capacitor/browser`, `@capacitor/haptics`, `@capacitor/splash-screen`, `@capacitor/status-bar`, plus `@capgo/capacitor-native-biometric` for Touch/Face ID.

## Native scaffolds are derivative artifacts

`ios/` and `android/` are gitignored. The flow is:

```
npx cap add ios       # Mac only
npx cap add android   # any OS with Android Studio
```

Decision recorded in CHANGELOG (Task #30): scaffolds are reproducible from `capacitor.config.ts`, and committing them couples the repo to per-developer CocoaPods/Gradle lockfile churn. Treat them like `dist/`.

## Build pipeline

| Script | What it does |
| --- | --- |
| `npm run build:mobile` | `tsc --noEmit && vite build --mode mobile && check-no-sourcemaps && check-mobile-bundle` |
| `npm run mobile:sync` | `build:mobile && cap sync` — copies the verified `dist/` into the native projects |
| `npm run mobile:open:ios` | `cap open ios` — opens `ios/App/App.xcworkspace` in Xcode |
| `npm run mobile:open:android` | `cap open android` — opens `android/` in Android Studio |

**Never** use `npm run build` for mobile — it does not strip the admin DevKit. CI lint should reject any `cap sync` invocation that wasn't preceded by `build:mobile`.

## DevKit exclusion contract

Three layers, all required:

1. **`vite.config.ts`** — when `mode === 'mobile'`, the `define` block adds `'import.meta.env.VITE_DISABLE_DEVKIT': '"true"'`. Vite/Rollup performs static replacement at parse time.
2. **`src/AppInterior.tsx`** — the lazy `DevToolsPage` import is wrapped in `import.meta.env.VITE_DISABLE_DEVKIT === "true" ? import("./pages/DevToolsStub") : import("./pages/DevToolsPage")`. Because the conditional resolves to a constant at build time, dead-code-elimination drops the unused branch entirely. The `DevToolsPage-*.js` chunk and its `dev-kit/*Panel-*.js` siblings are never emitted into `dist/assets/` for a mobile build.
3. **`scripts/check-mobile-bundle.mjs`** — post-build verifier. Walks every emitted chunk and fails the build (exit 1) if (a) any of ~15 forbidden filename patterns appear or (b) any DevKit-only string literal is found inside a JS payload (`DEV_KIT_PASSWORD`, `admin-devkit-data`, `admin-ai-routing`, etc.). The substring scan catches anyone who wires a non-lazy DevKit import from a non-DevKit module and bypasses the lazy-swap.

The `/devkit` route remains routable in mobile builds — it lands on `DevToolsStub` ("Admin tools unavailable" + back-to-app link) so the SPA never throws a Suspense boundary if a deep link hits the binary.

## Production runtime wiring

The mobile binary talks to **production Supabase** (`VITE_SUPABASE_URL`) and **production Kinde** (`VITE_KINDE_DOMAIN`, `VITE_KINDE_CLIENT_ID`) baked in at `vite build --mode mobile` time. There is no Express proxy on mobile. `apiFnUrl()` automatically routes to `${VITE_SUPABASE_URL}/functions/v1/<name>` whenever `import.meta.env.DEV` is false, which is true for any `vite build` (including `--mode mobile`). The Supabase Edge Function CORS allow-list (`supabase/functions/_shared/cors.ts`) already permits the production web origin; native calls use the Capacitor WebView's origin, which Supabase treats as a non-browser caller and accepts based on the function's `verify_jwt = false` flag.

## Live-reload for native dev (optional)

`capacitor.config.ts` carries a clearly-marked, commented-out override block:

```ts
server: {
  androidScheme: 'https',
  // url: 'http://192.168.1.100:5000',
  // cleartext: true,
}
```

Uncomment and replace the IP with the developer machine's LAN address (NOT `localhost` — the simulator/emulator can't reach it), then `npx cap sync` and `npm run dev`. The override must never be committed uncommented; the production binary must use the bundled `dist/` payload.

## What this card does NOT cover

- **App Store / Play Console submission** — separate task.
- **Push notifications** — out of scope for the Capacitor finish-up; the `@capacitor/app` plugin is the only event hook currently wired.
- **Mobile-specific UI** — the existing responsive web layout is reused as-is.
- **OAuth deep-link handling** — Kinde sign-in opens via `@capacitor/browser` and round-trips through the Capacitor WebView; the existing `@kinde-oss/kinde-auth-react` flow handles this without mobile-specific code.
