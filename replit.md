# WiseResume — Full Project Knowledge Base

## What the Project Is
WiseResume is an AI-powered career management PWA. Production URL: https://resume.thewise.cloud. Users can build resumes, tailor them to job listings with AI, publish a public portfolio, practice interview questions, track job applications, and manage their career goals.

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript 5 + Vite 5 |
| Styling | Tailwind CSS + Radix UI + Framer Motion |
| State | Zustand + TanStack Query (React Query) |
| Auth | Kinde Auth (https://thewisecloud.kinde.com) |
| Database | Supabase PostgreSQL (project ref: jnsfmkzgxsviuthaqlyy) |
| Backend | Supabase Edge Functions (Deno runtime) |
| PWA | Capacitor 8 + vite-plugin-pwa |
| Package Manager | npm |
| Hosting | Hostinger (manual deploy via deploy.yml GitHub Action) |
| Dev environment | Replit (port 5000, npm run dev) |

## Project Structure
- `src/` — Core frontend code (components, hooks, lib, pages, store)
- `src/lib/edgeFunctions.ts` — Multipart/FormData-capable Edge Function client (file uploads)
- `src/integrations/supabase/edgeFunctions.ts` — JSON Edge Function client (standard AI calls)
- `supabase/` — Edge functions and database migrations
- `server/` — Server-side utilities (db.ts for Neon Postgres connection if needed)
- `public/` — Static assets and PWA manifest
- `specs/` — Technical specifications
- `project-governance/` — Architecture documentation
- `wise-templates/` — Resume templates

## Fresh Import Setup (New Replit from GitHub)

When you import this repo into a fresh Replit, the app will start and run correctly **with zero additional configuration** — all four frontend env vars (`VITE_KINDE_CLIENT_ID`, `VITE_KINDE_DOMAIN`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) are already embedded in `.replit [userenv.shared]`.

**Optional — only needed for admin/DevKit features:**
1. Add `SUPABASE_ACCESS_TOKEN` as a Replit secret (your Supabase personal access token from https://supabase.com/dashboard/account/tokens). This enables `bash scripts/deploy-functions.sh` and `bash scripts/refresh-devkit-secrets.sh` to work from the Replit shell.

**Quick verification after import:**
1. Hit "Run" — the app should load at the preview URL with no console warnings about missing vars.
2. Click "Sign In" — Kinde auth page should open.
3. Navigate to `/devkit` — should redirect to Kinde login (not a blank page or error).

All Supabase edge function secrets (`ADMIN_EMAILS`, `DEV_KIT_PASSWORD`, AI keys, etc.) are already deployed to the production Supabase project and do not need to be re-provisioned on import.

## Infrastructure & Secrets
- Supabase project ref: `jnsfmkzgxsviuthaqlyy`
- GitHub repo: `iammagdy/wiseresume-74945019`
- `SUPABASE_ACCESS_TOKEN` is set in Replit — enables direct management API calls (secrets, SQL, etc.) without GitHub Actions
- Edge function secrets are in Supabase (not Vault): `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `DEV_KIT_PASSWORD`, `KINDE_DOMAIN`, + others (15 total)
- `SUPABASE_DB_PASSWORD` is in GitHub Actions — but `db-migration.yml` is **KNOWN BROKEN** due to migration history conflicts (migrations were applied manually and aren't tracked by the Supabase CLI). Use `apply-rpc-migration.yml` instead for SQL changes.
- Deployment trigger: POST to `https://api.github.com/repos/iammagdy/wiseresume-74945019/actions/workflows/deploy-edge-functions.yml/dispatches` with `{"ref":"main"}` using the repo PAT
- Platform merges don't trigger GitHub Actions webhooks — always use `workflow_dispatch` via API after edge function code changes

## Edge Function Status (last verified: 2026-04-13)
All functions deployed to Supabase project `jnsfmkzgxsviuthaqlyy`. Verified via:
```
npx supabase functions deploy wise-ai-chat --project-ref jnsfmkzgxsviuthaqlyy --use-api
npx supabase secrets list --project-ref jnsfmkzgxsviuthaqlyy
```
Secrets confirmed present: `OPENROUTER_API_KEY` ✓, `GROQ_API_KEY` ✓, `GEMINI_API_KEY` ✓

Smoke test (unauthenticated → correct 401):
```
POST /functions/v1/wise-ai-chat    → 401 {"error":"unauthorized","message":"Authentication required."}
POST /functions/v1/company-briefing → 401 {"error":"Missing sub claim (unauthorized)"}
```
Both functions are live. Auth rejection on unsigned requests confirms deployment is active.

### wise-ai-chat full fix (deployed 2026-04-13, HTTP 200 verified)

**Root causes of "AI is temporarily unavailable":**

1. **Timeout cascade**: function tried ~10 models × 15s each → exceeded Supabase's 60s limit → unparseable gateway timeout → client showed generic error.

2. **verify_jwt misconfiguration**: `wise-ai-chat` was missing from `supabase/config.toml`'s function list, so `verify_jwt` defaulted to `true`. Supabase's function gateway tried to verify user ES256 JWTs with the HS256 secret → rejected all real user tokens with "Invalid JWT" before the function code ran.

3. **Auth middleware algorithm mismatch**: `authMiddleware.ts` only verified HS256 tokens. Fixed to delegate verification to `supabase.auth.getUser(token)` which handles any algorithm and is always authoritative.

4. **deductCredits parameter mismatch**: `deductCredits.ts` called `increment_ai_usage` with `p_cost` and `p_skip_limit_check` parameters that don't exist in the DB function (which only takes `p_user_id`). This caused every successful AI response to fail with a generic 500.

**Fixes applied:**
- `aiClient.ts`: `PER_MODEL_TIMEOUT_MS` 15s→8s, max 3 models/provider, outer timer 90s→40s
- `wise-ai-chat/index.ts`: DOMException/unknown AIError → 429 "AI is busy" 
- `supabase/config.toml`: added `[functions.wise-ai-chat] verify_jwt = false`
- Management API: `PATCH /functions/wise-ai-chat` with `{"verify_jwt":false}` (config.toml not propagated by `--use-api`)
- `authMiddleware.ts`: replaced jose HS256/JWKS verification with `supabase.auth.getUser(token)`
- `deductCredits.ts`: fixed RPC call to only pass `p_user_id`; BYOK users skip deduction

**Smoke test result (2026-04-13):**
```
POST /functions/v1/wise-ai-chat  →  HTTP 200
{"content":"{\"formal\":\"...\",...}","providerUsed":"wiseresume/groq:llama-3.3-70b-versatile","fallbackUsed":false}
```

## Dev Server
- Host: `0.0.0.0`
- Port: `5000`
- Command: `npm run dev`
- All hosts allowed for Replit proxy compatibility

## Environment Variables
See `.env.example`. Key variables:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anonymous key
- `VITE_KINDE_CLIENT_ID` — Kinde client ID
- `VITE_KINDE_DOMAIN` — Kinde domain

## Wise AI — Recent Feature History

### Phase 1 (Task #8, complete)
- DB-backed chat sessions (`chat_sessions`, `chat_messages` tables)
- Chat history sidebar in `AgenticChatSheet`
- `delete_experience` tool
- Auth-transition session clearing

### Phase 2 (complete)
- **New tools in `agentic-chat`**: `get_company_briefing` (#11) + `open_job_tracker` (#12)
- **"Add with AI" button** in `ExperienceSection`: Bot-icon triggers pre-filled AI chat via `chatTriggerStore` (Zustand) → EditorPage forwards message as `chatInitialMessage`
- **Frontend tool handlers**: `useAgenticChat` exports `pendingAction`; `AgenticChatSheet` handles briefing (opens `CompanyBriefingSheet` with cache check) and job tracker (navigates to `/applications`)

### Phase 3 (complete)
- **`tool_cache` DB table**: `(user_id, tool_name, cache_key, output JSONB, expires_at)` — 7-day TTL; unique index for upsert
- **`useToolCache` hook** (`src/hooks/useToolCache.ts`): `getCache<T>`, `setCache`, `deleteCache`, `getCacheAge` — RLS-safe
- **Cache-reuse UI** in `AgenticChatSheet`: inline card shows cached briefing age → "View Saved Briefing" or "Generate Fresh"
- **`CompanyBriefingSheet` new props**: `initialCompanyName`, `initialBriefing`, `onBriefingGenerated` — auto-generates when name provided without cached data; fires `onBriefingGenerated` for cache write

## AI System
- **Primary AI**: OpenRouter (`google/gemma-4-26b-a4b-it:free`) + Groq (`llama-3.3-70b-versatile`) — both free tiers
- **Central AI client**: `supabase/functions/_shared/aiClient.ts`
  - `callWiseresumeAI(subProvider, ...)` — routes to OpenRouter or Groq
  - `callAI(...)` — top-level dispatcher, priority order: new BYOK providers → OpenRouter BYOK → Ollama → Gemini BYOK → WiseResume managed AI → legacy Gemini key
- **BYOK (Bring Your Own Key)**: Supports OpenAI, Anthropic, Gemini, Groq, Mistral, xAI, Cohere, OpenRouter, Ollama
- **Sub-provider preference**: Stored in `user_preferences.wiseresume_sub_provider` and Zustand `settingsStore`. Options: `openrouter | groq | auto`
- **Auto mode**: tries OpenRouter first, falls back to Groq on failure

## Auth System
- **Auth provider**: Kinde Auth
- **Bridge**: After Kinde login, a `token-exchange` Supabase edge function exchanges the Kinde JWT for a bridge UUID stored in Supabase. `user.id` in the app is ALWAYS the bridge UUID — never the raw Kinde `kp_xxx` ID.
- **useMe hook** (queryKey: `['me', user?.id]`): Canonical source of truth for plan, credits, preferences. Calls the `me` edge function.
- **Auth guard**: All Supabase queries are gated on `enabled: !!user` — since `user` is null until the bridge settles, this naturally prevents UUID-type errors.

## Subscription & Credits System
- **Plans**: `free`, `pro`, `premium`
- **Daily AI credit limits** (plan-authoritative, derived at runtime — never trust stored `daily_limit` column):
  - `premium` → unlimited (stored as -1 sentinel, shown as ∞)
  - `pro` → 30/day
  - `free` → 5/day
- **`creditUtils.ts`** (`supabase/functions/_shared/creditUtils.ts`): Always derives the daily limit from the user's current active subscription plan. The `ai_credits.daily_limit` column is NOT used for limit enforcement — only `daily_usage` and `usage_date` are read. This prevents downgrade/trial-expiry escalation.
- **SQL RPC**: `upsert_ai_credits_limit` — applied to production DB via management API
- **PlanAvatar badge**: `hasBadge = showLabel` only (not based on plan tier alone)

## Design System
- **Colors**: Deep Indigo (HSL 239 84% 67%) primary, Warm Amber (HSL 38 92% 50%) accent
- **Typography**: Inter only
- **Surfaces**: Solid backgrounds — NO glassmorphism, NO backdrop-filter except `backdrop-blur-sm` on nav
- **Theme**: Light (`#FFFFFF`) + Dark (`#111111`) + system. Hook: `src/hooks/use-theme.ts`
- **Shadows**: Custom scale — `shadow-soft-sm` through `shadow-soft-xl`
- **Glass classes**: All removed across 50+ pages/components. `glass-pro` (portfolio data value) and `Badge variant="glass"` (component variant) are intentionally preserved.
- **SkyWallpaper**: Removed (was THREE.js animated background)
- **Portfolio CSS (`pf-*`)**: Untouched — used only on public portfolio pages

## Navigation (Post-Task #101 UX Audit)
**DesktopNav** (`src/components/layout/DesktopNav.tsx`):
- Brand text is a `<Link to="/">` with `aria-label`
- Settings icon button in the right action row
- Locked tabs (AI Tools, Activity): show upgrade toast AND navigate to `/subscription`
- Search: uses `open-command-palette` custom event (not synthetic KeyboardEvent)

**BottomTabBar** (`src/components/layout/BottomTabBar.tsx`):
- Tabs: Home, Editor, AI Tools, Activity, More (5 tabs)
- "More" opens an animated bottom sheet with 10 secondary pages: Portfolio, QR Code, Notifications, Analytics, Achievements, Referral, Help, Subscription, Pricing, What's New
- All routes reachable in ≤2 taps
- Locked tabs show upgrade toast AND navigate to `/subscription`

**CommandPalette**: Listens for `open-command-palette` custom event

## Key Pages & Components
| File | Purpose |
|---|---|
| `src/pages/Index.tsx` | Landing page — all marketing stats live here (never invent them) |
| `src/pages/DashboardPage.tsx` | Main dashboard — responsive grid, trust banner always visible |
| `src/pages/AuthPage.tsx` | Login/register — reads `?plan=` query param, saves intent to sessionStorage |
| `src/pages/SubscriptionPage.tsx` | Plan management (authenticated only) |
| `src/pages/PricingPage.tsx` | Public pricing page `/pricing` — works for unauthenticated visitors and authenticated users |
| `src/pages/WhatsNewPage.tsx` | Public changelog timeline `/whats-new` — curated product milestones |
| `src/components/dev-kit/` | Admin DevKit — Analytics, Live Activity, Deployment, Audit Log tabs |
| `src/store/settingsStore.ts` | Zustand — theme + AI sub-provider, persisted in localStorage |
| `src/hooks/useMe.ts` | Canonical plan/credits hook |

## DevKit (Admin Panel)
- Password-protected (`DEV_KIT_PASSWORD` in Supabase secrets)
- Tabs: Analytics, Live Activity, Deployment, Audit Log, + others
- **DeploymentPanel**: Shows last 5 GitHub commits via `admin-github-status` edge function, env var checklist via `admin-env-check`, links to Supabase + GitHub
- **admin-github-status**: Proxies GitHub API using `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` secrets — recently fixed (token was stale)
- **LiveActivityPanel**: 30s auto-refresh, last 50 `usage_events`, edge function health cards

## Edge Functions
All registered in `supabase/config.toml` with `verify_jwt = false`. Key functions:
- `me` — returns plan, credits, preferences for current user
- `token-exchange` — Kinde JWT → bridge UUID, writes audit log
- `redeem-coupon` — coupon codes, calls `upsert_ai_credits_limit` RPC after redemption
- `validate-api-key` — validates all 9 BYOK providers
- `admin-github-status` — proxies GitHub commits API for DevKit
- `admin-env-check` — returns boolean presence of required env vars
- All AI-facing functions use `callAI` from `_shared/aiClient.ts`

## Sentry Source Map Upload (Production)
Production builds generate **hidden** source maps (`sourcemap: 'hidden'` in `vite.config.ts`). The `.js.map` files are NOT served publicly — they are uploaded to Sentry during the CI/CD build and then deleted from `dist/`. This enables readable stack traces in the Sentry dashboard without exposing source maps to end users.

The Sentry upload step is gated on `SENTRY_AUTH_TOKEN` being present in the build environment. If the secret is absent, the build succeeds normally without uploading.

**Required GitHub Actions secrets (add via repo Settings → Secrets):**
| Secret | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL (must be present at build time — Vite inlines it statically) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anonymous/publishable key |
| `VITE_KINDE_CLIENT_ID` | Kinde application client ID — required for KindeProvider to initialise |
| `VITE_KINDE_DOMAIN` | Kinde domain (e.g. `https://thewisecloud.kinde.com`) — required for KindeProvider to initialise |
| `VITE_SENTRY_DSN` | Sentry DSN for browser error tracking — get from Sentry project Settings → Client Keys (DSN) |
| `SENTRY_AUTH_TOKEN` | Sentry auth token with `project:releases` and `org:read` scopes. Generate at https://sentry.io/settings/account/api/auth-tokens/ |
| `SENTRY_ORG` | Your Sentry organization slug (e.g. `thewise-cloud`) |
| `SENTRY_PROJECT` | Your Sentry project slug (e.g. `wiseresume`) |

The release name is set from `VITE_SENTRY_RELEASE` env var → `GITHUB_SHA` → `'local'` (fallback).

## CI/CD Workflows (`.github/workflows/`)
| Workflow | Purpose |
|---|---|
| `deploy.yml` | Deploy frontend to Hostinger (passes Sentry secrets for source map upload) |
| `deploy-edge-functions.yml` | Deploy all Supabase edge functions |
| `set-supabase-secrets.yml` | Push secrets to Supabase — GITHUB_PAT required (hard fails if missing) |
| `refresh-devkit-github-token.yml` | Dedicated workflow to sync GITHUB_TOKEN to Supabase — PAT required, verifies post-push |
| `apply-rpc-migration.yml` | Apply any SQL file via management API — bypasses broken CLI migration |
| `db-migration.yml` | ⚠️ KNOWN BROKEN — duplicate key conflict in supabase_migrations. Use `apply-rpc-migration.yml` instead |

Replit shell shortcuts (`SUPABASE_ACCESS_TOKEN` already configured as Replit secret):
```bash
bash scripts/refresh-devkit-secrets.sh <GITHUB_PAT>  # refresh GitHub secrets in Supabase
bash scripts/deploy-functions.sh                      # redeploy all edge functions
```

## Database
- Supabase PostgreSQL with RLS on all tables
- 40+ tables, 50+ RPCs, 2 edge functions (`verify-dev-kit`, `weekly-digest`)
- Subscription system: `free`/`pro`/`premium` plans with coupon/discount codes, trial grants
- Soft deletes: `resumes.deleted_at` and `profiles.is_deleted`
- Auth: `safe_uid()` and `get_clerk_user_id()` both return `auth.uid()`
- All RLS policies use: `get_clerk_user_id() = user_id OR safe_uid() = user_id`
- **Never manually write SQL migrations** — use `npm run db:push` for schema changes or `apply-rpc-migration.yml` for production

## Known Rules & Constraints
- **Never invent marketing stats** — always source from `src/pages/Index.tsx`
- **No `any` casts** — TypeScript strict mode enforced
- **Never change primary key column types** — destructive and breaks existing data
- **`user.id` = bridge UUID only** — never raw Kinde `kp_xxx` ID
- **`creditUtils.ts`**: Derive daily limit from plan at runtime — never trust `ai_credits.daily_limit` column
- **`useMe` is canonical** for plan/credits — queryKey: `['me', user?.id]`
- **All edge functions** need `verify_jwt = false` in `supabase/config.toml`
- **Pricing CTAs** on landing → `/auth?plan=free|pro|premium` (not direct `kindeRegister` calls)
- **Portfolio `pf-*` CSS**: Never touch — used by public portfolio pages
- **Glass cleanup**: Complete — only `glass-pro` data value and `Badge variant="glass"` are preserved intentionally
- **Credit limits**: Canonical values in `src/lib/planConfig.ts` (PLAN_CREDIT_LIMITS) AND `supabase/functions/_shared/planLimits.ts` — update both together
- **BYOK bypass**: `creditUtils.ts` verifies key exists in `user_api_keys` before granting unlimited credits — ai_provider pref alone is insufficient
- **hard-purge**: Protected by `requireAdminAuth` — never callable without admin auth

## Security Audit (2026-04-14 → 2026-04-17)
- **Pricing consistency**: `planConfig.ts` exports `PLAN_CREDIT_LIMITS` (free:5, pro:100, premium:∞). UI now reads from this constant. Server uses `_shared/planLimits.ts` (matching values). Both show 100 credits for Pro.
- **hard-purge auth**: Added `requireAdminAuth` to `hard-purge/index.ts`. Previously had no authentication — any caller could delete any user's data.
- **BYOK key validation**: `creditUtils.ts` now verifies a key row exists in `user_api_keys` before granting unlimited credits. Previously, setting `ai_provider` preference alone was sufficient to bypass limits.
- **Offline sync conflict**: `useOfflineSync.ts` now shows an explicit toast warning when local changes are discarded due to server conflict (server-wins strategy).
- **DB indexes migration**: `20260416000000_add_performance_indexes.sql` adds indexes on all high-traffic columns (user_id foreign keys, ai_credits usage_date, rate limits, etc.).
- **RLS hardening** (`20260417000000_security_audit_rls_and_hardening.sql`): Explicit block policies added to `credit_transactions` (clients: SELECT only; INSERT/UPDATE/DELETE blocked), `subscriptions` (SELECT only; lifecycle managed by Stripe via service_role), `ai_credits` (UPDATE policy idempotently removed), `rpc_rate_limits` (all client access blocked; only accessible via SECURITY DEFINER RPCs). Avatar storage bucket now enforces `image/*` MIME types server-side with 5 MB cap.
- **Portfolio SEO privacy** (`20260417000001_portfolio_noindex_and_rpc_update.sql`): `seo_noindex BOOLEAN` column added to `portfolio_settings`. `get_public_portfolio` RPC updated to return `seoNoindex` flag. `usePortfolioSEO.ts` now injects `<meta name="robots" content="noindex, nofollow">` when true.
- **Structured observability** (`_shared/logger.ts`): JSON-formatted Edge Function logger with DEBUG/INFO/WARN/ERROR levels, correlation fields, and structured error serialization. Adopted in `creditUtils.ts` and `authMiddleware.ts`. All Edge Function logs are captured by Supabase Dashboard and exportable to external aggregators.
- **Dead code removed**: `_shared/deductCredits.ts` deleted (no longer imported anywhere after Task #9 credit-enforcement refactor).

## UI Components (Design System Details)
- **Buttons**: Clean solid fills, indigo primary, outline with border, no glow shadows
- **Cards**: Solid `bg-card` with `border-border` + `shadow-soft` (no `glass-elevated`)
- **Inputs/Textarea**: `bg-input` with border, indigo focus ring (`ring-primary/20`)
- **Overlays** (Dialog, Sheet, Drawer, AlertDialog): Solid `bg-background`, `shadow-soft-xl`, `bg-black/50` overlay
- **Popover/Tooltip/Dropdown**: Solid `bg-popover` with border, `shadow-soft-lg`
- **Tabs**: `bg-muted` container, active tab `bg-background` with `shadow-soft-sm`
- **DesktopNav**: Clean `bg-background/95` + `backdrop-blur-sm`, theme toggle (Sun/Moon), `h-14`
- **BottomTabBar**: `bg-background/95`, clean indigo active pill, no `glass-surface`
- **AppShell**: `bg-background` (solid), no `bg-transparent`; mobile header `bg-background`

## DevKit Analytics & Monitoring Hub
- **AnalyticsPanel** (`src/components/dev-kit/AnalyticsPanel.tsx`): Page views (all time + today), active users today vs yesterday with delta arrow, top 10 features bar chart (recharts), portfolio views aggregate, new signups last 14 days sparkline, geographic distribution bar chart, AI credits today vs yesterday.
- **LiveActivityPanel** (`src/components/dev-kit/LiveActivityPanel.tsx`): Real-time 30s auto-refresh feed of last 50 usage_events, edge function health cards (green/amber/red status dots), manual "Run health check" button.
- **DeploymentPanel** (`src/components/dev-kit/DeploymentPanel.tsx`): Last 5 GitHub commits from main branch via `admin-github-status` edge function, "Last deployed" timestamp, env var checklist via `admin-env-check` edge function (boolean presence only).

## Landing Page Visual System (Bento Collage Redesign)
- Landing page (`src/pages/Index.tsx`) always renders with a warm parchment background (`#F5F0EB`) via `data-theme="landing"` and scoped CSS custom properties (`--lp-bg`, `--lp-brand`, `--lp-card-white`, `--lp-card-muted`, `--lp-card-dark`, etc.)
- Dark mode has zero visual effect on the landing page — `color-scheme: light` and all colors are hardcoded via `--lp-*` variables
- Hero: massive clamped headline (`clamp(56px, 9vw, 110px)`, weight 800, -0.03em tracking) with word-by-word entrance animation (staggered 80ms, starting 150ms) and a typewriter cycling subheadline (55ms/char, 1600ms hold, then erase/cycle)
- Bento collage: 6 scattered floating cards positioned behind the headline (hidden on mobile) with scale/opacity entrance animation (staggered 100ms, starting 400ms)
- CTA pulse: `lp-pulse` keyframe animation triggers at 1600ms after mount
- Feature sections: alternating full-width bands (brand indigo / warm beige / near-black / brand tint), each using `FeatureSection` with `bandColor` prop
- Scroll animations: `.lp-animate` / `.lp-visible` CSS classes driven by IntersectionObserver; staggered children via inline `transitionDelay`
- No italic text anywhere on the landing page (`font-style: normal !important`)
- `FeatureTicker`, `Footer` all support `lpMode` prop to use `--lp-*` variables

## Kanban Job Tracker (Task #5 — Completed)
- Board view toggle added to `ApplicationsPage.tsx` — List (default) / Board view, persisted to `localStorage('activity-view')`
- `src/components/applications/KanbanCard.tsx` — Draggable card: `useDraggable` on a GripVertical handle, company initial avatar (deterministic color hash), deadline countdown badge, reminder/resume/letter indicators, 3-dot dropdown (View details, Job posting, Delete). Click body navigates to `/application/:id`.
- `src/components/applications/QuickAddInline.tsx` — Inline add form inside columns: Company + Job Title + URL, auto-focus, Escape/click-outside dismiss, calls `createApplication.mutateAsync`.
- `src/components/applications/KanbanColumn.tsx` — Droppable column (`useDroppable`), colour-coded header + count badge, `+ Add` button opens QuickAddInline, drag-over ring highlight, Rejected column collapses to a slim droppable target by default.
- `src/components/applications/KanbanBoard.tsx` — `DndContext` with PointerSensor (distance:8) + TouchSensor (delay:200ms), all-app `useJobApplications()`, optimistic `localCards` state with server sync + rollback on error, 6 columns, `DragOverlay` with simplified card preview.
- Dependencies: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` installed.

## WiseHire — AI HR SaaS Platform (Phases 10–12)

WiseHire is a separate HR SaaS product embedded in the same Replit workspace. HR users (`profiles.account_type = 'hr'`) access it at `/wisehire/*` routes, guarded by `WiseHireGuard`.

### Phase 10 — AI JD Writer (US8) — COMPLETE
- **Edge function**: `wisehire-write-jd` — HR guard, plan check, BYOK check (Starter needs OpenAI/Anthropic key), rate limit 10/day, AI prompt, JSON parse, optional role upsert
- **Hook**: `useJDs.ts` — TanStack Query: list roles with jd_text, mutations: saveJD, createRole, deleteJD
- **Components**: `JDSkeleton.tsx`, `JDWriterForm.tsx`, `JDInlineEditor.tsx`, `JDLibrary.tsx`
- **Page**: `JDWriterPage.tsx` (at `/wisehire/jd-writer`) — tab layout: Write + Saved JDs

### Phase 11 — AI Brief Generator (US7) — COMPLETE
- **Edge function**: `wisehire-generate-brief` — candidate fetch, BYOK check, rate limit (Starter: 5/day+30/mo; Pro: 50/day), AI evaluation prompt, brief insert with share_token
- **Hook**: `useBriefs.ts` + `useBrief.ts` — brief list + single brief fetch; `revokeShareToken` mutation
- **Lib**: `briefPdfExport.ts` — browser print API for PDF export
- **Components**: `BriefSkeleton.tsx`, `BriefForm.tsx`, `BriefOutput.tsx` (score ring SVG), `BriefShareModal.tsx`
- **Pages**: `BriefGeneratorPage.tsx` (`/wisehire/briefs`), `BriefViewPage.tsx` (`/wisehire/briefs/:briefId`), `PublicBriefPage.tsx` (`/share/brief/:shareToken`) — no-auth public view

### Phase 12 — Candidate Pipeline Board (US9) — COMPLETE
- **Lib**: `pipelineDragDrop.ts` — `createDragHandlers(dragStateRef, onDrop)` → HTML5 drag event handlers
- **Hook**: `usePipeline.ts` + `useCandidateHistory.ts` — 6 PIPELINE_STAGES constant; optimistic stage updates; `addCandidate` inserts as 'shortlisted'; pipeline events logging
- **Components**: `PipelineSkeleton.tsx`, `PipelineColumn.tsx`, `CandidateCard.tsx`, `KeyboardPipelineMover.tsx`, `CandidateDetailPanel.tsx`, `AddCandidateSheet.tsx`, `PipelineBoard.tsx`
- **Page**: `PipelinePage.tsx` (`/wisehire/pipeline`) — role filter + board + detail panel slide-over

### WiseHireShell Nav (updated)
JD Writer, Brief Generator, Pipeline are now live (comingSoon flags removed).

## Bug Fixes (Post-Redesign Audit)
- **AuthContext `user.id`**: Now uses only the bridge UUID (from `token-exchange`), never the raw Kinde ID (`kp_xxx`). If bridge hasn't settled, `user` is null to prevent UUID type errors.
- **Data query gating**: All hooks with `enabled: !!user` naturally wait for the bridge since `user` is null until bridge provides a UUID.
- **Edge function fixes**: 6 functions (recruiter-simulation, optimize-for-linkedin, one-page-optimizer, career-path-advisor, career-assessment, generate-resignation-letter) fixed `user.id` → `userId` from `requireAuth`.
- **Parse-resume merge**: `mergeParseResults` now preserves certifications, awards, publications, volunteering, hobbies, and projects from pass 2.
- **Local parser alignment**: `localParser.ts` project output now matches full Project interface (role, startDate, endDate, technologies, description).
- **Hardcoded keys removed**: `supabaseConstants.ts` and `client.ts` no longer contain hardcoded Supabase URL or anon key fallbacks. Both now require env vars, with console errors if missing.
- **Audit log reliability**: `token-exchange` function `logExchange` is now async/awaited, ensuring audit records are written before the edge function response completes.
