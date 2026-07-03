# The Wise Cloud — Full App Brief
> **Purpose of this document:** A complete, factual reference for LLM brainstorming sessions. Everything here is sourced directly from the live codebase and Appwrite database — no placeholders or assumptions.

---

## 1. What Is This App?

**The Wise Cloud** is a dual-product SaaS platform deployed at `thewise.cloud`:

| Product | Audience | Core Value |
|---|---|---|
| **WiseResume** | Individual job seekers | AI-powered resume building, ATS optimization, portfolio, and career tools |
| **WiseHire** | Recruiters / HR teams | Candidate pipeline, bulk screening, JD writing, talent pool |

Both products share the same codebase, authentication system, and AI infrastructure. Access is gated by account type (`account_type` field on the profile).

---

## 2. Tech Stack (Production)

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui (Radix UI) |
| State | Zustand + TanStack Query |
| Auth & Database | Appwrite Cloud (Frankfurt region — `fra.cloud.appwrite.io`) |
| AI Backend | Appwrite Serverless Functions (`ai-gateway`) |
| API Server | Express.js (port 5001) — PDF export via Puppeteer, URL proxy, portfolio view tracking |
| Hosting | Hostinger (static frontend via FTP deploy) + Appwrite Cloud (backend) |
| CI/CD | GitHub Actions — auto-deploy on push to `main` |
| AI Providers | Groq (Llama 3.3), NVIDIA (Nemotron 70B), DeepSeek, OpenRouter |

---

## 3. Pages & Routes

### 3a. Public / Landing (no auth required)

| Route | Page | Description |
|---|---|---|
| `/` | `Index.tsx` | Main landing page — job seeker focused |
| `/enterprises` | `Index.tsx` | Landing page variant — enterprise/B2B focused |
| `/p/:username` | `PublicPortfolioPage.tsx` | Public-facing portfolio for any user who has a username set and portfolio enabled |
| `/share/:token` | `SharePage.tsx` | Public view of a shared resume via share token |
| `/l/:linkId` | `ShortLinkPage.tsx` | Redirect/view for shortened portfolio links |
| `/wallpaper` | `WallpaperPage.tsx` | App screenshot / marketing background capture page |

### 3b. Auth

| Route | Page | Description |
|---|---|---|
| `/auth` | `AuthPage.tsx` | Sign in, sign up, and magic link |
| `/auth/callback` | `AuthCallbackPage.tsx` | Handles OAuth and magic link redirects from Appwrite |
| `/auth/verify-email` | `AuthVerifyEmailPage.tsx` | Email verification landing |
| `/auth/reset-password` | `AuthResetPasswordPage.tsx` | Password reset flow |

### 3c. WiseResume Core (requires auth)

| Route | Page | Description |
|---|---|---|
| `/dashboard` | `DashboardPage.tsx` | Central hub — resume list, stats, recent activity, quick actions |
| `/editor` | `EditorPage.tsx` | Main resume builder and live editor. Accepts `?id=` for a specific resume |
| `/preview` | `PreviewPage.tsx` | Full-screen live resume preview |
| `/upload` | `UploadPage.tsx` | Import existing resume via PDF/DOCX; AI parses it into structured data |
| `/templates` | `TemplatesPage.tsx` | Browse and apply resume templates/styles |
| `/profile` | `ProfilePage.tsx` | User profile and career history |
| `/settings` | `SettingsPage.tsx` | Theme, AI provider preferences, account management |
| `/subscription` | `SubscriptionPage.tsx` | Plan management and billing |
| `/notifications` | `NotificationsPage.tsx` | In-app notification center |

### 3d. AI & Career Tools (requires auth)

| Route | Page | Description |
|---|---|---|
| `/ai-studio` | `AIStudioPage.tsx` | Hub for all AI-powered tools |
| `/ai-studio/:tool` | `AIStudioPage.tsx` | Deep-link to a specific tool (e.g. `/ai-studio/tailor`) |
| `/tailor` / `/tailor/:resumeId` | `TailorPage.tsx` | Match a resume to a specific job description |
| `/interview` | `InterviewPage.tsx` | AI Interview Coach — mock interviews via voice/text |
| `/career` | `CareerPage.tsx` | Career path advisor and roadmap generator |
| `/analytics` | `AnalyticsPage.tsx` | Resume performance metrics and application activity |

### 3e. Application Tracking (requires auth)

| Route | Page | Description |
|---|---|---|
| `/applications` | `ApplicationsPage.tsx` | Kanban board and list for tracking job applications |
| `/application/:id` | `ApplicationTrackerPage.tsx` | Detailed view of one job application |
| `/job/:id` | `JobDetailPage.tsx` | Saved job description viewer |

### 3f. Letters & Portfolio (requires auth)

| Route | Page | Description |
|---|---|---|
| `/cover-letters` | `CoverLettersPage.tsx` | List of all generated cover letters |
| `/cover-letter/new` | `CoverLetterNewPage.tsx` | New cover letter creation flow |
| `/cover-letter/edit/:id` | `CoverLetterEditPage.tsx` | Edit an existing cover letter |
| `/resignation-letters` | `ResignationLettersPage.tsx` | List of resignation letters |
| `/resignation-letter/new` | `ResignationLetterNewPage.tsx` | New resignation letter creation |
| `/resignation-letter/edit/:id` | `ResignationLetterEditPage.tsx` | Edit existing resignation letter |
| `/portfolio` | `PortfolioEditorPage.tsx` | Editor for the user's public professional portfolio |

### 3g. QR & Sharing (requires auth)

| Route | Page | Description |
|---|---|---|
| `/qr-code` | `QrCodePage.tsx` | QR code generator for a resume or portfolio |
| `/qr-batch` | `QrBatchPage.tsx` | Bulk QR code generation |
| `/qr-scan` | `QrScanPage.tsx` | QR code scanner |

### 3h. WiseHire — Recruiter Tools (requires `account_type: recruiter`)

| Route | Page | Description |
|---|---|---|
| `/enterprise` | `EnterprisePage.tsx` | WiseHire info/landing page |
| `/wisehire/signup` | `WiseHireSignupPage.tsx` | Recruiter account request / signup |
| `/wisehire/dashboard` | `WiseHireDashboardPage.tsx` | Recruiter main dashboard |
| `/wisehire/pipeline` | `PipelinePage.tsx` | ATS pipeline — Kanban for applicants |
| `/wisehire/jd-writer` | `JDWriterPage.tsx` | AI job description generator |
| `/wisehire/briefs` | `BriefGeneratorPage.tsx` | AI candidate briefing document generator |
| `/wisehire/bulk-screen` | `BulkScreenPage.tsx` | Bulk screening of many candidates against a role |
| `/wisehire/talent-pool` | `TalentPoolPage.tsx` | Database of potential candidates with AI matching |

### 3i. Admin (password-protected)

| Route | Page | Description |
|---|---|---|
| `/devkit` | `DevToolsPage.tsx` | Internal admin dashboard — 24 panels (see Section 6) |
| `/act-as` | `ActAs.tsx` | Admin-only user impersonation tool |

---

## 4. AI Features & Tools

All AI calls are routed through a single Appwrite Function called `ai-gateway`. The browser **never** calls AI providers directly. The gateway handles provider routing, rate limiting, credit tracking, and observability.

### 4a. AI Provider Routing Strategy

| Provider | Models | Used For |
|---|---|---|
| **NVIDIA** | Nemotron 70B | Quality-critical tasks (cover letters, tailoring) |
| **Groq** | Llama 3.3 | Latency-sensitive tasks (chat, SmartFit rewrites) |
| **DeepSeek** | DeepSeek R1 | Reasoning & analysis (resume analysis, fix suggestions) |
| **OpenRouter** | Various | Fallback routing |

### 4b. WiseResume AI Actions

| Action | What It Does |
|---|---|
| `parse-resume` | Extracts structured JSON from raw resume text (PDF/DOCX upload flow) |
| `analyze-resume` | Compares resume against a job description — returns skill gaps and a match score |
| `score-resume` | Deterministic ATS score across pillars: keyword optimization, content quality, section structure |
| `tailor-resume` | Rewrites resume sections to align with a specific job description |
| `smart-fit-rewrite` | Optimizes individual bullet points for length and impact |
| `optimize-for-linkedin` | Suggests LinkedIn profile improvements based on resume data |
| `generate-cover-letter` | Creates professional cover letters in a chosen tone |
| `generate-resignation-letter` | Drafts a resignation letter |
| `generate-portfolio-bio` | Writes a bio for the user's public portfolio page |
| `agentic-chat` / `wise-ai-chat` | Conversational resume editing — user can ask questions or request bulk changes in natural language |
| `recruiter-simulation` | Mock interview environment — simulates a recruiter asking questions |
| `ask-portfolio` | Visitor-facing chat on public portfolios — answers questions about the candidate on their behalf |

### 4c. WiseHire AI Actions

| Action | What It Does |
|---|---|
| `wisehire-write-jd` | Generates a full job description from a single sentence or role title |
| `wisehire-bulk-screen` | Analyzes many candidates against a role's criteria simultaneously |
| `wisehire-generate-brief` | Produces candidate briefing documents for hiring managers |
| `wisehire-talent-search` | AI matching of candidates in the talent pool to open roles |

### 4d. AI Credit System

- Every user has an `ai_credits` document tracking `daily_usage`, `daily_limit`, `total_usage`, and `usage_date`
- Limits are enforced server-side in the `ai-gateway` function before any LLM call is made
- Plans control the daily limit (free < pro < premium)

---

## 5. Database Schema (Appwrite — Database ID: `main`)

All data lives in Appwrite Cloud, project `69fd362b001eb325a192`. Complex nested objects are stored as **stringified JSON** strings inside document attributes.

### Core Collections

#### `profiles`
The central user record. One document per user.
| Field | Type | Notes |
|---|---|---|
| `user_id` | string | Appwrite Auth user ID |
| `email` | string | |
| `full_name` | string | |
| `username` | string | Used for `/p/:username` public portfolio URL |
| `avatar_url` | string | URL to Appwrite Storage avatar |
| `account_type` | string | `job_seeker` or `recruiter` |
| `onboarding_completed` | boolean | |
| `portfolio_sections` | JSON string | Array of portfolio section configs |
| `portfolio_enabled` | boolean | Controls public portfolio visibility |

#### `resumes`
| Field | Type | Notes |
|---|---|---|
| `user_id` | string | Owner |
| `title` | string | Resume name (e.g. "Software Engineer Resume") |
| `template` | string | Template ID |
| `content` | JSON string | Full resume data object |
| `summary` | string | Professional summary text |
| `experience` | JSON string | Array of work experience entries |
| `education` | JSON string | Array of education entries |
| `skills` | JSON string | Array of skill strings |
| `is_master` | boolean | Marks the primary/base resume |

#### `job_applications`
| Field | Type | Notes |
|---|---|---|
| `user_id` | string | |
| `job_title` | string | |
| `company` | string | |
| `status` | string | `saved` / `applied` / `screening` / `interview` / `offer` / `rejected` |
| `applied_at` | datetime | |

#### `cover_letters`
| Field | Type | Notes |
|---|---|---|
| `user_id` | string | |
| `job_title` | string | |
| `company` | string | |
| `content` | string | Full letter text |
| `tone` | string | e.g. `professional`, `friendly`, `confident` |
| `template_style` | string | |
| `resume_id` | string | Linked resume document ID |

#### `ai_credits`
| Field | Type | Notes |
|---|---|---|
| `user_id` | string | |
| `daily_usage` | integer | Resets daily |
| `daily_limit` | integer | Set by plan |
| `total_usage` | integer | Lifetime total |
| `usage_date` | string | Date of current daily window |

#### `subscriptions`
| Field | Type | Notes |
|---|---|---|
| `user_id` | string | |
| `plan` | string | `free` / `pro` / `premium` |
| `effective_plan` | string | Computed plan including active trials |
| `trial_expires_at` | datetime | |

#### `visitor_events`
| Field | Type | Notes |
|---|---|---|
| `user_id` | string | Portfolio owner |
| `event_type` | string | e.g. `page_view`, `chat_sent` |
| `path` | string | URL path visited |
| `metadata` | JSON string | Additional context |

### Supporting Collections

| Collection | Purpose |
|---|---|
| `chat_sessions` | Stores AI chat conversation sessions |
| `chat_messages` | Individual messages within a chat session |
| `tailor_history` | History of resume tailoring operations |
| `career_assessments` | Career advisor session results |
| `resignation_letters` | Stored resignation letter documents |
| `notifications` | In-app notification records |
| `broadcasts` | Admin-sent broadcast messages to users |
| `feature_flags` | Platform-wide feature toggle documents |
| `portfolio_settings` | Extended portfolio configuration per user |
| `portfolio_visits` | Aggregated portfolio visitor analytics |
| `short_links` | Shortened portfolio/resume link records |
| `social_links` | Social media links attached to portfolios |
| `jobs` | Saved job descriptions |

### WiseHire Collections

| Collection | Purpose |
|---|---|
| `wisehire_candidates` | Candidate records in the recruiter pipeline |
| `wisehire_roles` | Open job roles created by a recruiter |
| `wisehire_companies` | Company profiles linked to recruiter accounts |
| `wisehire_scorecards` | AI-generated candidate evaluation scorecards |
| `wisehire_accounts` | Provisioned WiseHire account records |

### Admin / Ops Collections

| Collection | Purpose |
|---|---|
| `admin_audit_logs` | Full audit trail of all admin DevKit actions |
| `admin_sessions` | Active DevKit session tokens |
| `admin_user_notes` | Internal notes written by admins about users |
| `ai_usage_logs` | Detailed per-call AI usage records |
| `error_log` | Application error tracking |
| `edge_function_logs` | Appwrite function invocation logs |

### Storage Buckets

| Bucket | Purpose |
|---|---|
| `avatars` | User profile photos and headshots |

---

## 6. Admin DevKit — Internal Dashboard (`/devkit`)

A password-protected admin interface with 24 panels across 4 groups. Authenticated using a server-issued short-lived session token (not a regular Appwrite user session). Supports biometric login (FaceID/TouchID) after initial password entry.

### Operations Hub (8 panels)

| Panel | What It Does |
|---|---|
| **Diagnostics** | Health checks for auth, database, functions, and AI providers. Source of truth for deployment readiness |
| **Mission Control** | High-level operational dashboard for navigating critical areas |
| **Observability** | System performance and health metrics |
| **Live Activity** | Real-time feed of system usage events and function health |
| **Growth & Traffic** | Visitor tracking, analytics, and onboarding funnel performance |
| **Smoke Runner** | Runs automated smoke tests to verify system stability |
| **Analytics** | Detailed platform usage analytics |
| **Onboarding Funnel** | Tracks drop-off points in the user onboarding flow |

### Command Center (4 panels)

| Panel | What It Does |
|---|---|
| **Infrastructure** | Global stats (user count, resume count), orphaned data cleanup, maintenance tasks |
| **God Mode (Users)** | Manage any user account — profile, subscription, AI credits, plan overrides, impersonation |
| **Database X-Ray** | Deep inspection of database schema and document-level data integrity |
| **Feature Control** | Toggle platform-wide feature flags and maintenance mode (Maintenance, AI Tailoring, AI Chat, Public Portfolios) |

### AI Command Center (1 panel)

| Panel | What It Does |
|---|---|
| **AI Center** | Controls AI model routing, trips circuit breakers per provider, monitors AI usage and latency |

### Support & Business Ops (7 panels)

| Panel | What It Does |
|---|---|
| **Moderation** | Content moderation queue and user reports |
| **Email** | Transactional email hub, automations, and Testmail inbox |
| **Email Automations** | Manage automated email sequences |
| **Coupons** | Create and audit discount/promo codes |
| **Portfolios** | Manage public portfolio usernames and audit logs |
| **WiseHire Waitlist** | Approve or dismiss enterprise waitlist signups; approval auto-provisions an Appwrite recruiter account |
| **History** | Searchable audit trail of all admin actions |

---

## 7. Appwrite Functions (Serverless Backend)

| Function | Role |
|---|---|
| `ai-gateway` | Unified AI router — all LLM calls go through here. Handles provider selection, credit enforcement, observability |
| `ai-health` | Monitors provider availability and model status |
| `admin-devkit-data` | Serves all DevKit admin panel data. Requires session token auth on every call |
| `admin-feature-flags` | CRUD for the `feature_flags` collection |

---

## 8. Feature Flags (Live Toggles)

The following platform-wide toggles are managed in the `feature_flags` collection and surfaced in the **Feature Control** DevKit panel:

| Flag | What It Controls |
|---|---|
| **Maintenance Mode** | Locks the app for all non-admin users |
| **AI Tailoring** | Enables/disables the resume tailoring AI feature |
| **AI Chat** | Enables/disables the agentic chat feature |
| **Public Portfolios** | Enables/disables the `/p/:username` public portfolio pages |

Custom feature flags can be created via the Feature Control panel and checked in code via `useFeatureFlag(flagKey)`.

---

## 9. Plan & Subscription Tiers

Subscription data lives in the `subscriptions` collection. The `effective_plan` field is a computed value that accounts for active trials.

| Plan | Access Level |
|---|---|
| `free` | Basic resume builder, limited AI credits per day |
| `pro` | Higher AI credit limit, advanced templates, cover letters |
| `premium` | Maximum AI credits, all features including portfolio and interview coach |
| `recruiter` | WiseHire access — pipeline, bulk screening, JD writer, talent pool |

---

## 10. App Schema (Architecture Diagram)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                               │
│                                                                     │
│  ┌──────────────────────┐     ┌──────────────────────────────────┐  │
│  │   WiseResume (React) │     │     WiseHire (React)             │  │
│  │   /dashboard         │     │     /wisehire/*                  │  │
│  │   /editor            │     │     Pipeline, JD Writer,         │  │
│  │   /ai-studio         │     │     Bulk Screen, Talent Pool     │  │
│  │   /portfolio         │     └──────────────────────────────────┘  │
│  │   /applications      │                                           │
│  └──────────────────────┘                                           │
│            │                          │                             │
└────────────┼──────────────────────────┼─────────────────────────────┘
             │                          │
             ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     APPWRITE CLOUD (Frankfurt)                      │
│                   Project: 69fd362b001eb325a192                     │
│                                                                     │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────────────────┐    │
│  │     Auth     │  │  Database   │  │   Serverless Functions  │    │
│  │  (Sessions,  │  │  (main DB)  │  │                         │    │
│  │  OAuth,      │  │  96 collec- │  │  ai-gateway  ──────────────►AI│
│  │  Magic Link) │  │  tions      │  │  ai-health              │    │
│  └──────────────┘  └─────────────┘  │  admin-devkit-data      │    │
│                                     │  admin-feature-flags    │    │
│  ┌──────────────┐                   └─────────────────────────┘    │
│  │   Storage    │                                                   │
│  │  (avatars    │                                                   │
│  │   bucket)    │                                                   │
│  └──────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              EXPRESS API SERVER (port 5001 — Replit dev only)       │
│   • PDF export via Puppeteer                                        │
│   • SSRF-hardened URL proxy (/api/fetch-url)                        │
│   • Portfolio view tracking                                         │
└─────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AI PROVIDERS (via ai-gateway only)               │
│   NVIDIA Nemotron 70B  │  Groq Llama 3.3  │  DeepSeek  │ OpenRouter│
└─────────────────────────────────────────────────────────────────────┘
```

---

## 11. Key Design Decisions & Constraints

1. **AI calls never originate from the browser** — everything goes through Appwrite Functions. No AI API keys are exposed via `VITE_*` env vars.
2. **Appwrite is the only backend** — no Supabase, Firebase, or custom DB. All data queries use the Appwrite SDK.
3. **Nested data is stringified JSON** — Appwrite's document model doesn't support deep nesting, so arrays of objects (experience, education, skills) are stored as JSON strings and parsed client-side.
4. **Plan logic is computed client-side** — `effective_plan` in the `subscriptions` collection is computed in `useMe` by evaluating `trial_expires_at` against the current date.
5. **Public portfolio is fully public** — `/p/:username` is accessible without auth and includes a visitor-facing AI chat (`ask-portfolio`).
6. **DevKit is not a normal user session** — it uses its own short-lived token system, completely separate from Appwrite user auth.
7. **PDF export runs server-side** — Puppeteer on the Express server renders the resume to PDF; the browser never generates the PDF directly.

---

*Generated: 2026-05-14 — sourced directly from live codebase and Appwrite project `69fd362b001eb325a192`*
