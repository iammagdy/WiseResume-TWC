# WiseResume — Compressed Project Knowledge Base

## Overview
WiseResume is an AI-powered Progressive Web App (PWA) for comprehensive career management. It enables users to build and tailor resumes with AI, publish public portfolios, practice interview questions, track job applications, and manage career goals. The project aims to provide a robust, AI-enhanced platform for job seekers, with an embedded HR SaaS platform (WiseHire) for recruiters.

## User Preferences
- After every completed task, bug fix, or feature, update the `CHANGELOG.md` with technical, English-only entries detailing changed files, functions, DB migrations, and exact behavior.
- Add plain-language entries for new user-facing features (`current-features.md`), behind-the-scenes improvements (`stability-improvements.md`), or confirmed planned features (`coming-soon.md`) in `Project Atlas/04-For You (Plain Language)/`. Update the "Last verified" timestamp in the edited file.
- Update relevant reference cards in `Project Atlas/01-Currently Implemented/` for new DB columns, critical systems, major features, changed hook patterns, shared cache keys, page behaviors, or stability/infrastructure changes. Update the "Last verified" timestamp on every card touched.
- Update `replit.md` only when architecture, infrastructure, or key patterns (new endpoint, new DB table, new shared cache key, new env var) change, skipping routine bug fixes.
- User wants to avoid manual SQL migrations; prefer `npm run db:push` for schema changes or `apply-rpc-migration.yml` for production.
- User strictly enforces TypeScript strict mode; no `any` casts are allowed.
- User forbids changing primary key column types due to destructive nature and data integrity risks.
- User requires `user.id` to always be the bridge UUID, never the raw Kinde `kp_xxx` ID.
- User prefers that AI credit limits be derived from the plan at runtime, not from the `ai_credits.daily_limit` column.
- User prefers `useMe` as the canonical source for plan/credits, with `['me', user?.id]` as its queryKey.
- All edge functions must have `verify_jwt = false` in `supabase/config.toml`.
- Pricing call-to-actions on the landing page should navigate to `/auth?plan=free|pro|premium`, not directly to `kindeRegister` calls.
- The `pf-*` CSS used by public portfolio pages should remain untouched.
- Glass cleanup is complete, only `glass-pro` data values and `Badge variant="glass"` component variants are intentionally preserved.
- Credit limits should be updated in both `src/lib/planConfig.ts` (PLAN_CREDIT_LIMITS) and `supabase/functions/_shared/planLimits.ts` concurrently.
- BYOK (Bring Your Own Key) credit bypass requires verification of a key in `user_api_keys`, `ai_provider` preference alone is insufficient.
- The `hard-purge` functionality must be protected by `requireAdminAuth`.
- Never invent marketing stats; always source them from `src/pages/Index.tsx`.

## System Architecture

**Project Type:** AI-powered career management PWA with an integrated HR SaaS platform.

**Tech Stack:**
- **Frontend:** React 18, TypeScript 5, Vite 6
- **Styling:** Tailwind CSS, Radix UI, Framer Motion
- **State Management:** Zustand, TanStack Query (React Query)
- **Authentication:** Kinde Auth (JWT verified server-side), custom session JWTs
- **Database:** Neon PostgreSQL via Drizzle ORM (schema: `server/schema.ts`)
- **Backend:** Express.js server (port 5001), Supabase Edge Functions (proxy/legacy fallback)
- **PWA:** Capacitor 8, vite-plugin-pwa
- **Hosting:** Replit (autoscale deployment)
- **Dev Environment:** Replit (Vite on 5000, Express on 5001)

**Key Features:**
- Resume building and AI-powered tailoring to job listings.
- Public portfolio publishing.
- AI interview practice and job application tracking.
- Career goal management.
- **WiseHire:** Embedded HR SaaS platform for recruiters, including AI JD Writer, AI Brief Generator, and a Candidate Pipeline Board.

**Authentication Flow:**
1. Kinde login provides Kinde access token.
2. Client exchanges Kinde JWT for a short-lived WiseResume session JWT via `POST /api/fn/token-exchange`.
3. Server verifies Kinde JWT, creates deterministic UUID, upserts user data in Neon DB, and signs session JWT.
4. Client uses session JWT for all `/api/*` calls; server validates locally. `user.id` is always the derived bridge UUID.

**AI System:**
- **Primary AI Providers:** OpenRouter (gemma) and Groq (llama) free tiers.
- **AI Client:** Centralized in `supabase/functions/_shared/aiClient.ts` for routing to various providers.
- **BYOK Support:** OpenAI, Anthropic, Gemini, Groq, Mistral, xAI, Cohere, OpenRouter, Ollama.
- **Sub-provider Preference:** Stored in `user_preferences.wiseresume_sub_provider` and Zustand `settingsStore` (options: `openrouter | groq | auto`). `auto` mode falls back to Groq if OpenRouter fails.
- **AI Error Handling:** Supabase Edge Function `callAI()` throws `AIError`, which is caught, JSON-formatted, and parsed by the frontend for user-visible toasts.
- **AI Tooling:** `agentic-chat` edge function supports 12 tools for resume manipulation, company briefing, and job tracking.
- **AI Routing Layer:** Unified per-feature AI routing layer planned (OpenRouter + Groq + Gemini with smart fallback, streaming, caching, and admin dashboard) with design docs in `Routing AI Providers/`.

**Subscription & Credits System:**
- Plans: `free`, `pro`, `premium`.
- Daily AI credit limits are derived dynamically from the active subscription plan via `creditUtils.ts`. `ai_credits.daily_limit` column is not used for enforcement.
- BYOK users bypass credit limits if a valid key is provided.

**UI/UX Design System:**
- **Colors:** Deep Indigo primary, Warm Amber accent.
- **Typography:** Inter font.
- **Surfaces:** Solid backgrounds, no glassmorphism (except specific preserved instances).
- **Theme:** Light, Dark, and system themes with `src/hooks/use-theme.ts`.
- **Shadows:** Custom soft shadow scale.
- **Navigation:** DesktopNav and BottomTabBar provide intuitive access to features. Locked tabs trigger upgrade toasts and redirect to `/subscription`.
- **Landing Page Visual System (Bento Collage Redesign):** Warm parchment background, massive clamped headlines, word-by-word/typewriter animations, scattered floating cards, alternating full-width feature sections, scroll animations, no italic text, `lpMode` prop for components. Framer-motion is lazy-loaded to optimize initial load.

**Data Management:**
- **Database Schema:** Defined in `server/schema.ts` using Drizzle ORM.
- **Schema Changes:** `npm run db:push` for schema updates.
- **Analytics Data Lifecycle:** Insert-heavy analytics tables (`portfolio_visits`, `error_log`, `audit_logs`, `admin_audit_log`) are pruned daily with configurable retention periods via a scheduled sweep in the Express server.
- **Trial Resume Lifecycle:** `resumes` table includes `is_trial` and `trial_expires_at` columns. A DB trigger sets `trial_expires_at` on first edit. RLS blocks writes to expired trials. Daily sweep hard-deletes expired trials.

**DevKit (Admin Panel):**
- Password-protected (`DEV_KIT_PASSWORD`).
- Panels for Analytics, Live Activity, Deployment, Audit Log.
- DeploymentPanel shows GitHub commits, env var checks, and Analytics Retention Sweep status.
- Hardening primitives (`useIsMounted()`, `useAbortOnUnmount()`, `useVisibleInterval()`, `unwrapAdminResponse()`, `DevKitPanelBoundary.tsx`) ensure robustness.

**Onboarding Analytics:**
- `audit_logs` table (`category='onboarding'`) captures detailed user actions during onboarding, including path selection, review interactions, completion metrics, and error states.

**Agent Readiness (AI Discovery Surface):**
- Static discovery files (`sitemap.xml`, `robots.txt`, `.well-known/*`) and HTTP headers are provided to enable AI agents to discover, navigate, and authenticate against the API.
- `Accept: text/markdown` returns markdown renderings of public pages for AI consumption.
- WebMCP (`src/hooks/useWebMcp.ts`) integrates with `navigator.modelContext.provideContext()` for agent interactions like `open_pricing`, `start_resume`, etc.

## External Dependencies

- **Kinde Auth:** User authentication and identity management.
- **Neon PostgreSQL:** Primary database for user data, resumes, and application state.
- **Supabase:**
    - Edge Functions: For AI processing, token exchange, API proxies, and other serverless logic.
    - Legacy Fallback: For certain backend services and RLS for client-side Supabase calls.
- **OpenRouter:** AI model routing and access (e.g., `google/gemma-4-26b-a4b-it:free`).
- **Groq:** AI model access (e.g., `llama-3.3-70b-versatile`).
- **Gemini:** AI model access.
- **Proxycurl:** LinkedIn profile import service.
- **Sentry:** Error tracking and performance monitoring.
- **GitHub Actions:** CI/CD for deployments, secret management, and database migrations.
- **dnd-kit:** For Kanban job tracker drag-and-drop functionality.
- **Stripe:** For subscription lifecycle management (mentioned indirectly for `subscriptions` table).
- **Resend:** Email delivery (implied by `RESEND_API_KEY`).
- **OpenAI, Anthropic, Mistral, xAI, Cohere, Ollama:** Supported BYOK (Bring Your Own Key) AI providers.