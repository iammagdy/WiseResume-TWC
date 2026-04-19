# WiseResume — Compressed Project Knowledge Base

## Overview
WiseResume is an AI-powered career management Progressive Web App (PWA) designed to help users build resumes, tailor them to job listings using AI, publish public portfolios, practice interview questions, track job applications, and manage career goals. It also includes WiseHire, an embedded HR SaaS platform for AI-powered job description writing, brief generation, and candidate pipeline management. The project aims to provide comprehensive career tools for individuals and robust HR solutions for businesses, leveraging AI for enhanced efficiency and effectiveness.

## User Preferences
- Documentation Rules — MANDATORY After Every Task:
  - Add an entry to `CHANGELOG.md` (technical, English only) after every completed task, bug fix, or feature, detailing changes.
  - Add a plain-language entry to `Project Atlas/04-For You (Plain Language)/` (current-features.md, stability-improvements.md, or coming-soon.md) for user-facing changes, improvements, or planned features.
  - Update relevant reference cards in `Project Atlas/01-Currently Implemented/` (database-tables, critical-systems, frontend-layer, pages, stability-fixes) for architectural or system-level changes.
  - Update `replit.md` only when architecture, infrastructure, or key patterns change (new endpoint, new DB table, new shared cache key, new env var), skipping for routine bug fixes.

## System Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript 5 + Vite 6
- **Styling**: Tailwind CSS + Radix UI + Framer Motion
- **State Management**: Zustand + TanStack Query (React Query)
- **Authentication**: Kinde Auth (JWT verified server-side via JWKS)
- **Database**: Neon PostgreSQL via Drizzle ORM (schema: `server/schema.ts`)
- **Backend**: Express.js server (`server/index.ts`)
- **PWA**: Capacitor 8 + vite-plugin-pwa
- **Hosting**: Replit (autoscale deployment)
- **Dev Environment**: Replit (Vite on port 5000, Express API on port 5001)

### Auth Flow
User logs in via Kinde, client calls `POST /api/fn/token-exchange` (Express server). Server verifies Kinde JWT, derives deterministic UUID, upserts profile data in Neon DB, and signs a short-lived session JWT. Client stores and uses this session JWT for all `/api/*` calls.

### Project Structure
- `src/`: Core frontend code (components, hooks, lib, pages, store)
- `server/`: Express.js backend logic and DB utilities
- `supabase/`: Edge functions and database migrations
- `public/`: Static assets, PWA manifest, and AI discovery files
- `specs/`: Technical specifications
- `project-governance/`: Architecture documentation
- `wise-templates/`: Resume templates

### AI Error Handling
AI errors flow from Supabase Edge Function to `callAI()`, throwing `AIError`, caught by edge function, and returned as JSON for frontend parsing and user-visible toast messages. Robust error parsing layers exist across the frontend and backend.

### AI System
- **Primary AI Providers**: OpenRouter and Groq (free tiers).
- **Central AI client**: `supabase/functions/_shared/aiClient.ts` handles routing to various providers.
- **BYOK (Bring Your Own Key)**: Supports OpenAI, Anthropic, Gemini, Groq, Mistral, xAI, Cohere, OpenRouter, Ollama.
- **Sub-provider preference**: Stored in `user_preferences.wiseresume_sub_provider` and Zustand `settingsStore` (options: `openrouter | groq | auto`). `auto` mode defaults to OpenRouter, falls back to Groq.

### Auth System
Kinde Auth is the primary provider. A `token-exchange` Supabase edge function bridges Kinde JWTs to a unique bridge UUID, which is consistently used as `user.id` within the application. The `useMe` hook is the canonical source of truth for user plans, credits, and preferences.

### Subscription & Credits System
- **Plans**: `free`, `pro`, `premium`.
- **Daily AI credit limits**: Dynamically derived from the active subscription plan (e.g., `premium` is unlimited, `pro` has 30/day, `free` has 5/day). `creditUtils.ts` ensures limits are plan-authoritative.

### Design System
- **Colors**: Deep Indigo primary, Warm Amber accent.
- **Typography**: Inter typeface.
- **Surfaces**: Solid backgrounds, no glassmorphism.
- **Theme**: Light (`#FFFFFF`), Dark (`#111111`), and system preference support.
- **Shadows**: Custom soft shadow scale.
- **Removed**: Glass classes (except intentional `glass-pro` and `Badge variant="glass"`), SkyWallpaper (animated background).

### Navigation
- **DesktopNav**: Brand text is a link, settings icon, locked tabs show upgrade toast and navigate to `/subscription`, search uses command palette.
- **BottomTabBar**: 5 tabs (Home, Editor, AI Tools, Activity, More), "More" opens a sheet with 10 secondary pages. All routes reachable in ≤2 taps.

### Key Pages & Components
- `src/pages/Index.tsx`: Landing page.
- `src/pages/DashboardPage.tsx`: Main user dashboard.
- `src/pages/AuthPage.tsx`: Login/register, handles plan query param.
- `src/pages/SubscriptionPage.tsx`: Plan management.
- `src/pages/PricingPage.tsx`: Public pricing page.
- `src/components/dev-kit/`: Admin DevKit.
- `src/store/settingsStore.ts`: Zustand store for theme and AI provider.
- `src/hooks/useMe.ts`: Canonical plan/credits hook.

### DevKit (Admin Panel)
Password-protected, providing analytics, live activity, deployment status, and audit logs. Features include GitHub commit status, environment variable checks, and analytics retention sweep status. Hardening primitives (`useIsMounted`, `useAbortOnUnmount`, `unwrapAdminResponse`, `DevKitPanelBoundary`) are enforced for robust panel development.

### LinkedIn Importer
`POST /api/linkedin-profile` endpoint uses Proxycurl to import LinkedIn profiles. It includes rate limiting (5 req/min, 50/month) and handles various error codes for invalid URLs, authentication, quotas, and upstream failures.

### WiseHire — AI HR SaaS Platform
Integrated HR platform with dedicated routes (`/wisehire/*`), guarded by `WiseHireGuard`.
- **AI JD Writer**: `wisehire-write-jd` edge function, `useJDs.ts` hook, `JDWriterPage.tsx` for writing and managing job descriptions.
- **AI Brief Generator**: `wisehire-generate-brief` edge function, `useBriefs.ts` hook, `BriefGeneratorPage.tsx` and `PublicBriefPage.tsx` for generating and sharing candidate briefs.
- **Candidate Pipeline Board**: HTML5 drag-and-drop based board, `usePipeline.ts` hook, `PipelinePage.tsx` for managing candidate stages.

### Agent Readiness — AI Discovery Surface
The marketing site publishes static discovery files (`sitemap.xml`, `robots.txt`, `.well-known/*`) and HTTP headers to enable AI agents (Cloudflare AI, ChatGPT, Claude) to read, navigate, and authenticate against the API. Markdown responses are provided for `Accept: text/markdown` requests.

### Landing Page Performance
Optimizations include single Supabase client, lazy loading Framer Motion, use of `usePrefersReducedMotion`, and `@fontsource/*` for font loading.

### Kanban Job Tracker
A Kanban board view for job applications with draggable cards, inline quick add, droppable columns, and optimistic updates with server sync.

### Trial Resume Lifecycle
Introduced `is_trial` and `trial_expires_at` columns in `resumes` table. A DB trigger sets `trial_expires_at` on first edit, and RLS blocks updates to expired trials. Daily sweeps hard-delete expired trials.

## External Dependencies

- **Kinde Auth**: User authentication and identity management.
- **Neon PostgreSQL**: Primary database, managed by Replit.
- **Supabase**: Edge Functions for serverless logic, authentication token exchange, and RPCs. Legacy fallbacks and some client-side RLS also use Supabase.
- **Proxycurl**: Used by the LinkedIn importer to fetch public profile data.
- **OpenRouter**: AI model aggregation service for various LLMs.
- **Groq**: AI inference provider for fast LLM responses.
- **Gemini**: Google's AI models.
- **Sentry**: Error tracking and performance monitoring.
- **GitHub**: For CI/CD workflows, source code management, and DevKit integration.
- **Tailwind CSS**: Utility-first CSS framework.
- **Radix UI**: Unstyled UI components.
- **Framer Motion**: Animation library.
- **Zustand**: State management library.
- **TanStack Query (React Query)**: Data fetching and caching.
- **Capacitor**: PWA wrapper for native features.
- **@dnd-kit**: Drag and drop library for Kanban board.