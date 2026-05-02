# admin-devkit-data

  **Last verified:** 2026-05-02 (Task #29 — AI cost attribution branch)
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
  - `'ai-cost'` — **AI invocation attribution** (Task #29, 2026-05-02). Read-only aggregates over `ai_usage_logs` for a given range (today / 7d / 30d / 90d / all). Calls 5 service-role aggregate RPCs in parallel (`get_ai_usage_daily_totals`, `get_ai_usage_window_total`, `get_ai_usage_top_users`, `get_ai_usage_by_feature`, `get_ai_usage_by_provider` — all defined in `supabase/migrations/20260524000000_ai_usage_attribution_rpcs.sql`) and resolves up to 10 top-user emails via `auth.admin.getUserById` in parallel. "Cost" is expressed as **invocation count**, not USD — the schema does not store per-call dollar or token amounts today and re-modelling that is intentionally out of scope. The DevKit panel `AICostPanel.tsx` labels this honestly with a blue disclaimer banner. Returns `{success, data: {range, bucket, totals: {current, previous}, distinctUsers, dailySeries, topUsers, byFeature, byProvider, generatedAt}}`.

  Replaces five former standalone functions: `admin-analytics`, `admin-observability`, `admin-live-activity`, `admin-mission-control`, `admin-github-status`.

  **Auth:** `requireAdminAuth` (admin DevKit password, all actions).

  **Routing discriminator:** `body.action: 'analytics' | 'observability' | 'live-activity' | 'mission-control' | 'github-status' | 'ai-cost'`
  **Observability sub-discriminator:** `body.obs_action` (used only when `action = 'observability'`)

  **Related:**
  - `Project Atlas/01-Currently Implemented/edge-functions/README.md`
  - `Project Atlas/01-Currently Implemented/critical-systems/06-admin-dev-kit.md`
  - `src/components/dev-kit/AnalyticsPanel.tsx`
  - `src/components/dev-kit/AICostPanel.tsx` (Task #29)
  - `src/components/dev-kit/OverviewPanel.tsx`
  - `src/components/dev-kit/ObservabilityPanel.tsx`
  - `src/components/dev-kit/LiveActivityPanel.tsx`
  - `src/components/dev-kit/UserDetailDrawer.tsx`
  - `src/components/dev-kit/MissionControlPanel.tsx`
  - `src/components/dev-kit/DeploymentPanel.tsx`
  - `supabase/migrations/20260524000000_ai_usage_attribution_rpcs.sql` (Task #29)
