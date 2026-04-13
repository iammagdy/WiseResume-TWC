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
- `supabase/` — Edge functions and database migrations
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

### wise-ai-chat timeout fix (deployed 2026-04-13)
Root cause of "AI is temporarily unavailable": function was attempting up to ~10 models with a
15 s/model timeout → exceeded Supabase's 60 s function limit → unparseable gateway-timeout
response → client showed generic "AI is temporarily unavailable" fallback.

Fix (`aiClient.ts` + `wise-ai-chat/index.ts`):
- `PER_MODEL_TIMEOUT_MS`: 15 s → 8 s
- Model list capped: 3 per provider max (worst case: 3×8s OR + 3×8s Groq + 5s discovery = ~53s)
- Outer abort timer: 90 s → 40 s (returns clean 429 before Supabase kills function)
- DOMException/unknown AIError → 429 rate_limit ("AI is busy" toast instead of generic error)

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

## CI/CD Workflows (`.github/workflows/`)
| Workflow | Purpose |
|---|---|
| `deploy.yml` | Deploy frontend to Hostinger |
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

## Bug Fixes (Post-Redesign Audit)
- **AuthContext `user.id`**: Now uses only the bridge UUID (from `token-exchange`), never the raw Kinde ID (`kp_xxx`). If bridge hasn't settled, `user` is null to prevent UUID type errors.
- **Data query gating**: All hooks with `enabled: !!user` naturally wait for the bridge since `user` is null until bridge provides a UUID.
- **Edge function fixes**: 6 functions (recruiter-simulation, optimize-for-linkedin, one-page-optimizer, career-path-advisor, career-assessment, generate-resignation-letter) fixed `user.id` → `userId` from `requireAuth`.
- **Parse-resume merge**: `mergeParseResults` now preserves certifications, awards, publications, volunteering, hobbies, and projects from pass 2.
- **Local parser alignment**: `localParser.ts` project output now matches full Project interface (role, startDate, endDate, technologies, description).
- **Hardcoded keys removed**: `supabaseConstants.ts` and `client.ts` no longer contain hardcoded Supabase URL or anon key fallbacks. Both now require env vars, with console errors if missing.
- **Audit log reliability**: `token-exchange` function `logExchange` is now async/awaited, ensuring audit records are written before the edge function response completes.
