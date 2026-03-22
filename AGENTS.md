# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## First-read constraints (from repository governance)
- Treat the current codebase as the source of truth; `legacy-docs/` is historical context only.
- Auth architecture is **Kinde only** with a Kinde→Supabase token bridge; do not reintroduce legacy Supabase-auth patterns.
- Backend/data architecture is **Supabase only** (Postgres + Edge Functions + RLS).
- Do not manually modify:
  - `src/integrations/supabase/types.ts`
  - `src/integrations/supabase/client.ts`
  - `.env`
  - `supabase/config.toml`
  - lockfiles (`package-lock.json`, `bun.lock`)
- Branch discipline from governance: work on the user-specified branch; do not create new branches unless explicitly asked.

## Common commands
Run from repository root:

```bash
npm install
```

```bash
npm run dev
```
- Vite dev server (default local dev flow).

```bash
npm run start
```
- Runs Vite on `0.0.0.0:3000` (useful for device/network testing).

```bash
npm run build
```
- Production build to `dist/`.

```bash
npm run build:dev
```
- Development-mode build.

```bash
npm run preview
```
- Preview built app.

```bash
npm run lint
```
- ESLint across repo.

```bash
npm run test
```
- Run full Vitest suite once (`vitest run`).

```bash
npm run test:watch
```
- Watch mode for iterative testing.

```bash
npm run test:coverage
```
- Coverage run (V8 provider, HTML/JSON/text output).

Single-test patterns (Vitest):

```bash
npx vitest run src/path/to/file.test.ts
```

```bash
npx vitest run -t "test name fragment"
```

## Architecture map (high-level)

### 1) Frontend shell and runtime
- Stack: React 18 + TypeScript + Vite + Tailwind + Radix UI.
- App entrypoint is `src/main.tsx`:
  - mounts React app
  - registers PWA service worker (`virtual:pwa-register`)
  - adds global error/unhandled rejection logging
  - applies native CSS class when running via Capacitor.

### 2) Routing and app shells
- Routing is centralized in `src/App.tsx` using React Router.
- Pattern:
  - public routes (`/`, `/auth`, `/p/:username`, `/share/:token`, etc.)
  - protected routes wrapped by `ProtectedRoute` + `AppShell`.
- `src/components/layout/AppShell.tsx` is the main authenticated UX container:
  - mobile/desktop nav, route title handling, offline banners
  - floating Wise AI entrypoint
  - session/bridge error banner handling.

### 3) Auth + data access pipeline (critical)
- Auth provider chain in `App.tsx`: `KindeProvider` → `AuthProvider`.
- `src/contexts/AuthContext.tsx` manages:
  - Kinde auth state
  - exchanging Kinde token for Supabase JWT
  - bridge readiness (`supabaseReady`) and periodic refresh.
- Token bridge logic in `src/lib/supabaseBridge.ts`:
  - calls edge function `token-exchange`
  - stores short-lived Supabase JWT + user ID in local storage/memory
  - exposes refresh and error-state helpers.
- All Supabase DB calls should use `src/integrations/supabase/safeClient.ts`:
  - injects bridge JWT into requests
  - retries once on 401 after token refresh
  - dispatches `app:session-expired` if refresh fails.
- Edge function calls should use `src/integrations/supabase/edgeFunctions.ts` with the same auth/refresh behavior.

### 4) State model: server vs local
- Server state: React Query (`QueryClientProvider` in `App.tsx`), with feature hooks in `src/hooks/` (`useResumes`, `useProfile`, etc.).
- Local/client state: Zustand stores in `src/store/`:
  - `resumeStore` for active resume editing/session state
  - `settingsStore`, `offlineSyncStore`, and feature-specific stores.
- `resumeStore` is persisted to localStorage (hydration-aware), while canonical persisted entities live in Supabase.

### 5) Offline/PWA behavior
- Vite PWA plugin uses `injectManifest` with service worker in `public/custom-sw.js`.
- Service worker strategy:
  - navigation: network-first
  - Supabase REST: network-first with short cache
  - Supabase functions: network-only
  - font/static caching for performance.
- Offline reconciliation path is implemented in `src/hooks/useOfflineSync.ts`:
  - queues pending local resume updates
  - on reconnect, compares `updated_at` with server
  - newer server wins on conflict; otherwise pushes local changes.

### 6) Backend layout
- `supabase/migrations/`: schema and RLS evolution.
- `supabase/functions/`: large AI and app workflow surface (tailoring, parsing, interview, portfolio, notifications, token exchange, etc.).
- Shared frontend constants currently point to one Supabase project (`src/lib/supabaseConstants.ts`), with edge functions using the same base URL.

## Environment and integration notes
- Required local env values are documented in `README.md` (`VITE_KINDE_*`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; optional BYOK keys).
- README declares governance docs in `project-governance/` as mandatory for contributors/agents; follow them before non-trivial changes.
- `QUICK_START.md` is for Android/Play Store release flow (Capacitor + Gradle), not daily web feature development.
