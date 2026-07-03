# Routing & App Shell

**Last verified:** 2026-04-17
**Type:** reference card
**Sources:**
- `src/App.tsx`, `src/AppInterior.tsx`, `src/main.tsx`
- `src/components/layout/` (Header, Sidebar, WiseHireGuard, JobSeekerRoute, FeatureGate)
- `replit.md` (Frontend Architecture, Auth Bridge)
- `project-governance/ARCHITECTURE.md` §3 + §7

**Canonical owner:** `src/AppInterior.tsx` (route registration); `src/components/layout/` (guards).

---

## Boot path

`src/main.tsx` → `<App />` → providers (Kinde, QueryClient, Tooltip, Theme, ErrorBoundary, Sentry init via `src/lib/monitoring.ts`) → `<AppInterior />` which mounts `<BrowserRouter>` + `<Routes>`.

## Layout shell

`src/components/layout/`:
- `Header` — global topbar (logo, nav, notifications, account menu)
- `Sidebar` — primary nav (collapses on mobile)
- `Footer` — public footer
- `WiseHireGuard` — wraps every `/wisehire/*` route, requires `account_type === 'hr'`
- `JobSeekerRoute` — wraps WiseResume routes, rejects `account_type === 'hr'`
- `<FeatureGate>` — reads `app_settings` to enable/disable optional surfaces (`/interview`, `/applications`, `/portfolio`, `/cover-letters`)

## Route registration

All routes live in `src/AppInterior.tsx`. 80 path entries split across 76 page files (some files serve multiple routes — e.g. `AuthPage` covers `/auth` + `/sign-in`; `DevToolsPage` covers `/activity` + `/devkit`). `*` falls through to `NotFound.tsx`.

Cards for each page live under `Project Atlas/01-Currently Implemented/pages/` — see that folder's `README.md`.

## Auth bridge

Kinde issues JWT → frontend exchanges via `token-exchange` Edge Function for a Supabase session. Edge Functions accept the Kinde JWT directly; `requireAuth` middleware (`_shared/authMiddleware.ts`) verifies via `supabase.auth.getUser(token)` (algorithm-agnostic). See critical-system 01.

## Hard rules

- Every `/wisehire/*` route MUST go through `WiseHireGuard`.
- WiseResume protected routes MUST go through `JobSeekerRoute`.
- Public portfolio (`/p/:username`) and share routes (`/share/...`, `/l/:linkId`, `/interview/report/:token`) bypass auth deliberately.
- Mobile-first design is the platform default; WiseHire Phases 1 & 2 are an explicit, time-limited desktop-first exception. → Decision #8.
