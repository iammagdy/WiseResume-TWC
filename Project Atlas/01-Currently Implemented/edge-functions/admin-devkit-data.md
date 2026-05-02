# admin-devkit-data

  **Last verified:** 2026-05-02
  **Type:** reference card
  **Sources:**
  - `supabase/functions/admin-devkit-data/index.ts`
  - `supabase/config.toml` (JWT verification flag)
  - `supabase/functions/_shared/adminAuth.ts`
  - `project-governance/ARCHITECTURE.md` §7

  **Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

  ---

  **Environment detection (Task #24, 2026-05-02):** `isDevEnvironment` is now driven by the explicit `WISE_ENV` Supabase Edge Function secret (`'production'` ⇒ prod, anything else ⇒ dev). The legacy `!Deno.env.get('DENO_DEPLOYMENT_ID')` heuristic is only consulted when `WISE_ENV` is unset. **Operational requirement:** set `WISE_ENV=production` on the production Supabase project and `WISE_ENV=dev` on any non-prod Supabase projects so the panel never silently falls back to a runtime detail.

  **What it does:** Merged Admin DevKit data function. Routes on `body.action`:
  - `'analytics'` — platform analytics aggregates (users, resumes, tailors, revenue).
  - `'observability'` — edge function metrics + error stream. Sub-routes on `body.obs_action` to avoid collision with the outer discriminator.
  - `'live-activity'` — real-time active user feed and recent events.
  - `'mission-control'` — platform-wide health checks, system status, and ops signals.
  - `'github-status'` — latest GitHub Actions workflow runs and deployment status.

  Replaces five former standalone functions: `admin-analytics`, `admin-observability`, `admin-live-activity`, `admin-mission-control`, `admin-github-status`.

  **Auth:** `requireAdminAuth` (admin DevKit password, all actions).

  **Routing discriminator:** `body.action: 'analytics' | 'observability' | 'live-activity' | 'mission-control' | 'github-status'`
  **Observability sub-discriminator:** `body.obs_action` (used only when `action = 'observability'`)

  **Related:**
  - `Project Atlas/01-Currently Implemented/edge-functions/README.md`
  - `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md`
  - `src/components/dev-kit/AnalyticsPanel.tsx`
  - `src/components/dev-kit/OverviewPanel.tsx`
  - `src/components/dev-kit/ObservabilityPanel.tsx`
  - `src/components/dev-kit/LiveActivityPanel.tsx`
  - `src/components/dev-kit/UserDetailDrawer.tsx`
  - `src/components/dev-kit/MissionControlPanel.tsx`
  - `src/components/dev-kit/DeploymentPanel.tsx`
