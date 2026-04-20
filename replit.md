# WiseResume — Full Project Knowledge Base

### Overview
WiseResume is an AI-powered Progressive Web App (PWA) designed for comprehensive career management. It enables users to create and tailor resumes for specific job listings using AI, publish public portfolios, practice interview questions, track job applications, and manage career goals. The project aims to provide a robust, AI-driven platform for job seekers, with future expansion into an HR SaaS product (WiseHire).

### User Preferences
- **Documentation Rules**: After every completed task, bug fix, or feature, the following documentation updates are mandatory:
    - Add an entry to `CHANGELOG.md` detailing technical changes (files, functions, DB migrations, behavior) in English, without plain-language explanations.
    - Add a plain-language entry to `Project Atlas/04-For You (Plain Language)/` in the appropriate file (`current-features.md`, `stability-improvements.md`, or `coming-soon.md`), focusing on user benefits without jargon or file names. Update the "Last verified" timestamp.
    - Update relevant reference cards in `Project Atlas/01-Currently Implemented/` (e.g., database tables, critical systems, hooks, pages, stability fixes). Update the "Last verified" timestamp on touched cards.
    - Update `replit.md` only for changes in architecture, infrastructure, or key patterns (new endpoint, DB table, shared cache key, env var), skipping routine bug fixes.
- **No `any` casts** — TypeScript strict mode enforced.
- **Never change primary key column types** — destructive and breaks existing data.
- **Never invent marketing stats** — always source from `src/pages/Index.tsx`.
- **`user.id` = bridge UUID only** — never raw Kinde `kp_xxx` ID.
- **`creditUtils.ts`**: Derive daily limit from plan at runtime — never trust `ai_credits.daily_limit` column.
- **`useMe` is canonical** for plan/credits — queryKey: `['me', user?.id]`.
- **All edge functions** need `verify_jwt = false` in `supabase/config.toml`.
- **Pricing CTAs** on landing → `/auth?plan=free|pro|premium` (not direct `kindeRegister` calls).
- **Portfolio `pf-*` CSS**: Never touch — used by public portfolio pages.
- **Glass cleanup**: Complete — only `glass-pro` data value and `Badge variant="glass"` are preserved intentionally.
- **Credit limits**: Canonical values in `src/lib/planConfig.ts` (PLAN_CREDIT_LIMITS) AND `supabase/functions/_shared/planLimits.ts` — update both together.
- **BYOK bypass**: `creditUtils.ts` verifies key exists in `user_api_keys` before granting unlimited credits — ai_provider pref alone is insufficient.
- **hard-purge**: Protected by `requireAdminAuth` — never callable without admin auth.

### System Architecture

**Tech Stack:**
- **Frontend**: React 18, TypeScript 5, Vite 6
- **Styling**: Tailwind CSS, Radix UI, Framer Motion
- **State Management**: Zustand, TanStack Query (React Query)
- **Authentication**: Kinde Auth (JWT verified server-side via JWKS)
- **Database**: Neon PostgreSQL via Drizzle ORM (schema: `server/schema.ts`)
- **Backend**: Express.js server (`server/index.ts`, port 5001)
- **PWA**: Capacitor 8, vite-plugin-pwa
- **Hosting**: Replit (autoscale deployment)

**Authentication Flow:**
Users log in via Kinde, receiving a Kinde access token. The client exchanges this token with the Express server at `POST /api/fn/token-exchange`. The server verifies the Kinde JWT, derives a deterministic UUID for the user, upserts profile data in Neon DB, and signs a short-lived session JWT. This session JWT is then used for all subsequent `/api/*` calls and validated locally by the server.

**Core Features & Implementations:**
- **AI Career Management**: Resume building, AI tailoring, public portfolios, interview practice, job tracking, career goal management.
- **AI System**: Utilizes OpenRouter and Groq as primary AI providers (free tiers), with a central AI client (`supabase/functions/_shared/aiClient.ts`) for dispatching calls. Supports "Bring Your Own Key" (BYOK) for various providers (OpenAI, Anthropic, Gemini, Groq, etc.).
- **AI Error Handling**: A structured error chain from Supabase Edge Function to user-facing toasts, with frontend and backend utilities for parsing and handling `AIError` types.
- **Agentic Chat**: Multi-turn AI assistant with persistent sessions and tool-calling capabilities (e.g., `update_summary`, `get_company_briefing`, `open_job_tracker`). Tools leverage a `tool_cache` DB table for output caching.
- **Subscription & Credits**: `free`, `pro`, `premium` plans with daily AI credit limits derived dynamically from the user's active plan.
- **Design System**: Features a consistent UI with Deep Indigo primary and Warm Amber accent colors, Inter typography, solid backgrounds (no glassmorphism except for specific components), custom shadow scales, and light/dark/system themes.
- **Navigation**: `DesktopNav` and `BottomTabBar` provide intuitive access to features. Locked tabs display upgrade toasts and navigate to the subscription page.
- **Admin DevKit**: A password-protected admin panel with tabs for Analytics, Live Activity, Deployment, and Audit Log. Features include GitHub commit status, environment variable checks, AI provider status, and analytics retention sweep status.
- **Server-side LinkedIn Importer**: `POST /api/linkedin-profile` endpoint leveraging Proxycurl for structured profile data import, with rate limiting and quota management.
- **Kanban Job Tracker**: Board view for job applications with draggable cards, inline quick add, and optimistic updates with server sync.
- **WiseHire (HR SaaS Platform)**: A separate product for HR users, embedded in the same workspace, featuring an AI JD Writer, AI Brief Generator, and Candidate Pipeline Board.
- **WebMCP Integration**: Agent discovery surface via static files (`sitemap.xml`, `robots.txt`, `.well-known/*`) and HTTP headers for AI agents, along with WebMCP `navigator.modelContext` integration for skill registration.
- **Analytics Data Lifecycle**: Daily pruning of insert-heavy analytics tables (`portfolio_visits`, `error_log`, `audit_logs`, `admin_audit_log`) with configurable retention and BRIN indexing for performance.

**Project Structure:**
- `src/`: Frontend code (components, hooks, lib, pages, store).
- `supabase/`: Edge functions and database migrations.
- `server/`: Express.js backend code.
- `public/`: Static assets and PWA manifest.
- `specs/`: Technical specifications.
- `project-governance/`: Architecture documentation.
- `wise-templates/`: Resume templates.

### External Dependencies
- **Kinde Auth**: For user authentication and identity management.
- **Neon PostgreSQL**: Managed database service.
- **Drizzle ORM**: For interacting with the PostgreSQL database.
- **Supabase**: Used for Edge Functions, RLS, and as a legacy proxy for some client-side calls.
- **Proxycurl**: For LinkedIn profile data import.
- **OpenRouter**: AI provider for various language models.
- **Groq**: AI provider for various language models.
- **Gemini**: AI provider for various language models.
- **Sentry**: For error tracking and performance monitoring.
- **GitHub**: For version control, CI/CD, and DevKit integration.
- **Stripe**: For subscription and payment management (implied by `credit_transactions` and `subscriptions` management).
- **Vite**: Frontend build tool.
- **Tailwind CSS**: Utility-first CSS framework.
- **Radix UI**: UI component library.
- **Framer Motion**: Animation library.
- **Zustand**: State management library.
- **TanStack Query (React Query)**: Data fetching and caching library.
- **Capacitor**: PWA container for native app features.