# Product Governance

## 1. Platform Identity

The Wise Cloud platform hosts two distinct products on the same codebase and infrastructure:

* **WiseResume** — an AI-powered career platform for job seekers, students, and professionals.
* **WiseHire** — an AI-powered HR SaaS tool for recruiters, hiring managers, and HR teams.

Both products share the same authentication (Kinde), database (Supabase), AI infrastructure, admin tooling (dev kit), and deployment. They are permanently separated by a user `account_type` flag (`job_seeker` | `hr`) set at sign-up. Users cannot switch account types after creation.

The landing page at the root URL presents both products via a toggle: **"For Job Seekers"** (WiseResume, default) and **"For Companies"** (WiseHire).

---

## 2. WiseResume — Product Scope

**Target Audience**: Job seekers, career changers, students, new graduates, and high-volume applicants. Optimized for non-technical users.

**Focus**: An AI career platform — not a general document editor. Keep the product lightweight, fast, and easy to understand.

### Core Features (as of 2026-04-15)

**Resume Builder**
* Multi-section editor: Header, Experience, Education, Skills, Projects, Certifications, Awards, Publications, Languages, Volunteering, and custom sections
* 30+ professional resume templates
* Real-time preview with live editing
* ATS score analysis and optimization feedback
* Resume version history
* Multiple export formats: PDF, ATS PDF, DOCX, Plain Text

**AI Tools**
* **AI Tailor** (`tailor-resume`): Rewrites resume sections to match a specific job description
* **AI Section Enhancement** (`enhance-section`, `tailor-section`): Improves individual resume bullets
* **AI Gap Explainer** (`explain-gap`, `fill-gap`): Helps address and frame employment gaps
* **One-Page Optimizer** (`one-page-optimizer`): Shrinks content to fit a single page without losing impact
* **ATS Analyzer** (`analyze-resume`, `score-resume`): Scores resume against ATS systems and job descriptions
* **Resume Parser** (`parse-resume`): Imports existing PDFs with AI extraction + OCR fallback + regex fallback

**AI Studio** (`/ai-studio`)
* Cover Letter Generator (`generate-cover-letter`)
* Resignation Letter Generator (`generate-resignation-letter`)
* LinkedIn Optimizer (`optimize-for-linkedin`)
* Company Briefing (`company-briefing`) — research tool for interview prep
* Career Advisor (`career-path-advisor`, `career-assessment`) — career path and skill gap analysis
* AI Humanizer (`detect-and-humanize`) — makes AI-written text sound human
* Salary Negotiation Assistant (`wise-ai-chat`) — scripts and talking points for salary discussions
* Cold Email Generator (`wise-ai-chat`) — outreach emails to recruiters and hiring managers
* Wise AI Chat (`wise-ai-chat`, `agentic-chat`) — general career AI assistant (7 use cases total)

**Public Portfolio Builder**
* Converts resume data into a public portfolio website at `/p/:username`
* 9+ visual themes
* Section visibility toggles
* AI-generated portfolio bio (`generate-portfolio-bio`)
* AI recruiter chat widget on public portfolios (`ask-portfolio`)
* Portfolio analytics (views, device, location)
* Short links (`resolve-short-link`)
* OG image generation for social sharing (`og-image`)
* Email obfuscation (bot protection on public portfolio contact emails)

**AI Interview Coach** (`/interview`)
* Voice + text mock interviews
* Job-description-specific question generation (`generate-question-bank`)
* AI recruiter simulation (`recruiter-simulation`)
* Real-time answer feedback
* Session transcripts and scoring
* ElevenLabs voice integration (`elevenlabs-scribe-token`)

**Job Application Tracker** (`/applications`)
* Kanban-style board: Applied → Screening → Interview → Offer → Hired / Rejected
* Job description parsing from URL (`parse-job-url`) or text (`parse-job-text`)
* Activity streaks and engagement metrics
* Match scoring between resume and job description

**Career Assessment** (`/career`)
* Career path advisor
* Skill gap analysis
* AI-generated career suggestions

**Achievements** (`/achievements`)
* Gamified milestone tracking
* Progress badges

**Analytics** (`/analytics`)
* Resume view tracking
* Application success metrics

**Onboarding** (`/onboarding`)
* 6-step flow: Welcome, Professional Identity, Background, Location/Socials, Celebration, Entry Points
* localStorage draft saving with recovery
* Skip-with-banner pattern for incomplete profiles

**Settings** (`/settings`)
* AI key management — BYOK for multiple providers (OpenAI, Anthropic, Gemini, Groq, Mistral, xAI, Cohere, OpenRouter, Ollama)
* Theme preferences
* Profile editing
* Account management

**Subscription** (`/subscription`)
* Three tiers: Free, Pro ($9/mo), Premium ($19/mo)
* Early Access model — no live payment gateway yet
* Coupon code redemption
* Trial management (admin-granted)

### WiseResume Tier Limits

| Feature | Free | Pro | Premium |
|---------|------|-----|---------|
| Daily AI Credits | 5 | 100 | Unlimited |
| Resumes | 1 | Unlimited | Unlimited |
| Interview Coach | — | ✓ | ✓ |
| AI Studio | Limited | ✓ | ✓ |
| Custom Branding | — | — | ✓ |
| Analytics | — | — | ✓ |
| BYOK | ✓ | ✓ | ✓ |

---

## 3. WiseHire — Product Scope

**Target Audience**: HR managers, recruiters, talent acquisition specialists, and founders at small-to-medium companies who need to screen candidates faster and more fairly.

**Focus**: An AI HR SaaS tool — not an applicant tracking system (ATS) in the traditional sense. WiseHire produces qualitative AI assessments, not just keyword matching.

**Release Status**: Invite-only Early Access as of 2026-04-23. No open sign-ups. Waitlist active. Phase 1 is fully shipped end-to-end. Phase 2 and Phase 3 have **edge functions and frontend pages built but their backing database tables have not been migrated yet** — those features will fail at runtime until the missing migrations land. See AUDIT-2026-04.md item A5 and ARCHITECTURE.md §9 for the route/function/table inventory and the Phase 2/3 gap.

### WiseHire Features (phased delivery)

**Phase 1 — MVP (shipped, end-to-end working)**
All features below have a live edge function, frontend page or component, and an applied DB migration:
* Landing page toggle with full WiseHire theme switch
* Waitlist (pre-launch gate) — `wisehire-waitlist-join`, `admin-wisehire-waitlist`, table `wisehire_waitlist`
* Invite-only sign-up via admin-generated signed URL (HMAC-SHA256, 72h) — `wisehire-validate-invite`, `wisehire-validate-early-access`, `admin-wisehire-invite`, table `wisehire_invites`
* Dedicated WiseHire onboarding (5-step, company-focused) — `wisehire-complete-signup`, tables `wisehire_companies` + `profiles.account_type`
* AI Candidate Brief Generator — match score, strengths, concerns, interview questions, employment notes — `wisehire-generate-brief`, tables `wisehire_candidates` + `wisehire_candidate_briefs`
* AI Job Description Writer — full JD from 2-sentence input — `wisehire-write-jd`, table `wisehire_roles`
* Candidate Pipeline Board — Kanban: Shortlisted → Contacted → Interviewing → Offer Sent → Hired / Rejected — table `wisehire_pipeline_events`
* 7-day Professional trial auto-granted on account creation
* WiseHire subscription page (Early Access, no payment gateway)
* Dev kit enhancements: account type badges, waitlist panel, WiseHire invite email

**Phase 2 — partially shipped (edge + frontend code present; DB migrations missing)**
The following features have an edge function and a frontend route, but the tables they read/write are NOT in `supabase/migrations/`. These code paths will fail at runtime until the migrations land:
* Bulk resume screening — `wisehire-bulk-screen` (route `/wisehire/bulk-screen`); references `wisehire_bulk_screen_jobs` (no migration found).
* Bias Reduction Mode — `wisehire-mask-cvs` (route `/wisehire/mask-cvs`).
* Interview Scorecard — frontend pages `ScorecardPage`, `ScorecardTemplatesPage`, `PublicScorecardPage`; references `wisehire_scorecards`, `wisehire_scorecard_templates`, `wisehire_candidate_notes` (no migrations found).
* Outreach emails — `wisehire-send-outreach`; references `wisehire_outreach_emails` (no migration found).
* Public share routes for read-only reports — `/share/brief/:shareToken`, `/share/scorecard/:shareToken`.

**Phase 3 — partially shipped (edge + frontend code present; DB migrations missing)**
* Talent Pool — `wisehire-talent-search`, `wisehire-talent-view`, frontend `TalentPoolPage`; references `talent_pool_profiles`, `talent_pool_views` (no migrations found).
* HR Analytics Dashboard — frontend route `/wisehire/analytics` (`WiseHireAnalyticsPage`).
* Job-seeker apply flow — `wisehire-apply`; references `wisehire_applications` (no migration found).
* Public job board for published roles — **NOT shipped.** No `/jobs`, `/jobs/:companySlug`, or `/jobs/:companySlug/:roleSlug` routes exist in `src/AppInterior.tsx`. Only the legacy `/job/:id` job-application detail route (a private WiseResume page) is live, and a `RedirectJobRoute` helper that maps `/jobs/:id → /job/:id`. A first-party public job board therefore remains **planned**, not shipped.
* Portfolio view notifications for job seekers — not yet shipped (planned).

**Phase 4 — planned**
* Team collaboration and multi-seat accounts
* Enterprise features (SSO, API access)

### WiseHire Tier Structure

| Tier | Key | Price | Limits |
|------|-----|-------|--------|
| Starter | `wisehire_starter` | $49/mo | 3 roles, 5 briefs/day (30/mo cap), 1 seat, BYOK required |
| Professional | `wisehire_professional` | $149/mo | Unlimited roles & briefs, 50/day, 3 seats, platform AI |
| Business | `wisehire_business` | $399/mo | Unlimited, 10 seats, analytics, branded reports |
| Enterprise | `wisehire_enterprise` | Custom | SSO, API, unlimited seats, dedicated support |

**No free tier for WiseHire.** Post-trial with no active plan shows a "Contact Us" lockout screen.

---

## 4. Product Quality Rules (Both Products)

### AI Output Quality
* AI outputs MUST be professional, relevant, contextual, and non-generic.
* WiseResume AI: outputs must feel customized to the user's real background and target jobs. Must be ATS-friendly.
* WiseHire AI: candidate briefs and JDs must be specific to the actual resume and role — never generic templates.
* **No Fake Intelligence**: You MUST NOT implement fake demo intelligence, fake ATS scores, fake production behavior, or misleading placeholders in real user flows.

### Trust & Polish
* Both products MUST feel polished, trustworthy, and production-grade.
* WiseResume: beginner-friendly, accessible to non-technical users.
* WiseHire: professional and efficient, designed for desktop-first HR workflows.

### Platform Quality (WiseResume)
* Mobile-first quality is MANDATORY (fully responsive starting at `xs` / 375px; no horizontal scrolling).
* Desktop quality is MANDATORY.
* Accessibility is MANDATORY (WCAG AA minimum).
* Performance is MANDATORY.
* Bottom tab bar navigation is the primary in-app navigation on mobile.
* No blank screens during data fetching — always use matching skeleton components.

### Platform Quality (WiseHire — documented exceptions)
* **Desktop-first Phase 1 and 2** — This is a documented, time-limited exception to the mobile-first rule (see Decision #8). WiseHire Phase 1/2 targets desktop HR workflows. Mobile support deferred to Phase 3.
* Accessibility is MANDATORY (WCAG AA minimum). The pipeline board MUST have a keyboard-accessible alternative to drag-and-drop.
* No blank screens during data fetching — always use matching skeleton components.
* Fail-closed AI — all WiseHire AI edge functions block requests when the rate limiter is unreachable.
* No free tier — post-trial lockout shows "Contact Us" screen.

### Stable Export
* Resume preview layout must stay clean and printable with no strange colors or backgrounds in export views.
* Export/download behavior (PDF, DOCX) must remain stable and must not be broken.
* WiseHire Candidate Brief PDF export must produce a clean, one-page, shareable document.

### Scalability
* Scalability for future subscriptions, AI credits, BYOK, and ecosystem expansion MUST be considered in all technical decisions.
* WiseHire multi-seat (Phase 4) must be forward-compatible with Phase 1 schema design.
