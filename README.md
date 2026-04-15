<div align="center">

<img src="./src/assets/wiseresume-logo-light.webp" alt="The Wise Cloud" width="160" />

<br />

# The Wise Cloud

**Two AI-powered products. One platform. Built for every side of the hiring table.**

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=flat-square)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white&style=flat-square)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white&style=flat-square)](https://vitejs.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-93_Edge_Functions-3ECF8E?logo=supabase&logoColor=white&style=flat-square)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?logo=tailwind-css&logoColor=white&style=flat-square)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-black?logo=framer&logoColor=white&style=flat-square)](https://www.framer.com/motion/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8_PWA-119EFF?logo=capacitor&logoColor=white&style=flat-square)](https://capacitorjs.com/)
[![Kinde Auth](https://img.shields.io/badge/Auth-Kinde-000000?style=flat-square)](https://kinde.com/)

[**Live App →**](https://resume.thewise.cloud) &nbsp;•&nbsp;
[WiseResume](#-wiseresume--ai-career-platform) &nbsp;•&nbsp;
[WiseHire](#-wisehire--ai-hr-saas) &nbsp;•&nbsp;
[Tech Stack](#-tech-stack) &nbsp;•&nbsp;
[Architecture](#-architecture) &nbsp;•&nbsp;
[Getting Started](#-getting-started) &nbsp;•&nbsp;
[Governance](#-governance)

</div>

---

## What is The Wise Cloud?

**The Wise Cloud** is a dual-product AI platform that serves both sides of the job market in a single codebase. **WiseResume** empowers job seekers with an AI career hub — resume builder, interview coach, portfolio, and more. **WiseHire** gives HR teams and recruiters AI-powered screening, candidate briefs, and a hiring pipeline.

Both products share the same authentication (Kinde), database (Supabase PostgreSQL), AI infrastructure, and admin tooling. They are permanently separated by a user `account_type` flag (`job_seeker` | `hr`) set at sign-up. The landing page at `/` presents both via a **"For Job Seekers" / "For Companies"** toggle.

---

## 🎯 WiseResume — AI Career Platform

> *The complete AI toolkit for job seekers, career changers, and high-volume applicants.*

<details open>
<summary><b>Resume Builder</b></summary>
<br>

- **30+ professional templates** with real-time live preview
- **Multi-section editor**: Experience, Education, Skills, Projects, Certifications, Awards, Publications, Languages, Volunteering, and fully custom sections
- **Multiple export formats**: PDF, ATS-optimized PDF, DOCX, Plain Text
- **Resume version history** — snapshot and restore any previous version
- **ATS score analysis** and optimization feedback powered by deterministic scoring (no AI, always fast)

</details>

<details open>
<summary><b>AI Tools (in-editor)</b></summary>
<br>

| Tool | What it does |
|------|-------------|
| **AI Tailor** | Rewrites your resume to match a specific job description with ATS keyword injection |
| **Section Enhance** | Improves individual bullets and section copy |
| **Gap Explainer** | Professionally frames employment gaps |
| **One-Page Optimizer** | Trims content to fit one page without losing impact |
| **ATS Analyzer** | Deep analysis of your resume against a job posting |
| **Resume Parser** | Imports existing PDFs via AI extraction + OCR fallback + regex fallback |
| **Resume from Text** | Converts freeform career notes into a structured resume |

</details>

<details open>
<summary><b>AI Studio</b></summary>
<br>

A dedicated workspace at `/ai-studio` with 16 career tools across three categories:

**Documents**
- Cover Letter Generator — tailored to role + company
- Resignation Letter Generator
- LinkedIn Profile Optimizer

**Research & Coaching**
- Company Briefing — deep-dive research for interview prep (with 7-day caching)
- Career Path Advisor — skill gap analysis and next-step suggestions
- Career Assessment — AI quiz-driven career exploration

**Writing**
- AI Humanizer — makes AI-written text sound natural
- Salary Negotiation Assistant — scripts and talking points
- Cold Email Generator — outreach to recruiters and hiring managers
- **Wise AI Chat** — conversational career assistant (7 use cases, agentic tool calls)

The Wise AI Chat can directly edit your resume via 10 agentic tools: update summary, add/update/delete experience, update skills, add skills, update contact info, add projects, suggest edits, proofread & fix.

</details>

<details open>
<summary><b>AI Interview Coach</b></summary>
<br>

- Voice + text mock interviews powered by **ElevenLabs** and browser Web Speech API
- Job-description-specific question banks
- AI recruiter simulation mode
- Real-time answer feedback and scoring
- Full session transcripts with performance reports

</details>

<details open>
<summary><b>Public Portfolio Builder</b></summary>
<br>

- Converts your resume into a public portfolio at `/p/:username`
- **9+ visual themes** with section visibility toggles
- **AI-generated portfolio bio**
- **AI recruiter chat widget** — visitors can ask the AI questions about you
- **Portfolio analytics** — views, device types, geographic breakdown
- OG image generation for social sharing
- Short link support (`/l/:code`)
- Email obfuscation (bot protection on contact emails)
- SEO noindex option for privacy

</details>

<details open>
<summary><b>Job Application Tracker</b></summary>
<br>

- **Kanban board** + list view: Applied → Screening → Interview → Offer → Hired / Rejected
- **Job description parsing** from a URL or pasted text
- Match scoring between your resume and the job description
- Activity streaks and engagement metrics
- Drag-and-drop with full keyboard accessibility

</details>

<details open>
<summary><b>More Features</b></summary>
<br>

- **QR Codes** — generate QR codes for your resume and portfolio, batch export, QR scanner
- **Achievements** — gamified milestone tracking with progress badges
- **Analytics Dashboard** — resume view tracking and application success metrics
- **Referral Program** — share and earn
- **Guides & Examples** — curated career content library
- **What's New** — public product changelog at `/whats-new`
- **BYOK (Bring Your Own Key)** — use your own API keys for 9 AI providers (OpenAI, Anthropic, Gemini, Groq, Mistral, xAI, Cohere, OpenRouter, Ollama)
- **Biometric Lock** — FaceID / TouchID via WebAuthn for extra privacy
- **Offline Mode** — works without internet, auto-syncs on reconnect
- **Coupon & Trial System** — admin-granted trials, coupon code redemption

</details>

### WiseResume Pricing

| Feature | Free | Pro ($9/mo) | Premium ($19/mo) |
|---------|------|-------------|------------------|
| Resumes | 1 | Unlimited | Unlimited |
| Daily AI Credits | 5 | 100 | Unlimited |
| Interview Coach | — | ✓ | ✓ |
| AI Studio | Limited | ✓ | ✓ |
| Cover & Resignation Letters | — | ✓ | ✓ |
| Portfolio Analytics | — | — | ✓ |
| Custom Branding | — | — | ✓ |
| White-label PDF Export | — | — | ✓ |
| BYOK | ✓ | ✓ | ✓ |

---

## 🏢 WiseHire — AI HR SaaS

> *Invite-only AI hiring platform for recruiters, HR managers, and talent acquisition teams.*

**Current status**: Pre-launch. Invite-only sign-up. Waitlist active at `/waitlist`. Enterprise inquiries at `/enterprise`.

<details open>
<summary><b>Core AI Tools</b></summary>
<br>

| Tool | What it does |
|------|-------------|
| **AI Job Description Writer** | Generates a full, structured JD from a 2-sentence brief |
| **AI Candidate Brief Generator** | Match score, strengths, concerns, suggested interview questions, employment notes |
| **Bulk Resume Screener** | Screens up to 50 CVs simultaneously with ranked AI summaries |
| **Bias Reduction Mode (CV Masking)** | Automatically redacts names, photos, and schools to reduce unconscious bias |
| **AI Outreach Email Writer** | Generates personalized candidate outreach emails |

</details>

<details open>
<summary><b>Hiring Workflow</b></summary>
<br>

- **Candidate Pipeline Board** — Kanban: Shortlisted → Contacted → Interviewing → Offer Sent → Hired / Rejected
- **Interview Scorecard** — pre-populated from AI brief questions; shareable read-only link
- **Scorecard Templates** — reusable question banks by role category
- **Candidate Notes** — threaded team notes (general, highlight, concern), pinned notes
- **Pipeline Event History** — full audit trail of every stage change
- **Roles Manager** — active and archived job roles with status tracking
- **Clients Manager** — for agency and multi-client recruiting workflows

</details>

<details open>
<summary><b>Talent & Analytics</b></summary>
<br>

- **Talent Pool** — searchable database of opted-in WiseResume job seekers
- **Talent Search** — filter by skills, experience level, availability
- **HR Analytics Dashboard** — hiring funnel metrics, time-to-offer, source tracking
- **Shareable Reports** — read-only public links for candidate briefs and scorecards

</details>

<details open>
<summary><b>Enterprise</b></summary>
<br>

Available at [/enterprise](https://resume.thewise.cloud/enterprise):

- SSO / SCIM provisioning
- Custom AI model fine-tuning on your company's hiring data
- ATS / HRIS integrations
- Dedicated Customer Success Manager
- 99.9% SLA and uptime guarantee
- Advanced security, compliance, and audit logging
- Unlimited seats and custom contract pricing

</details>

### WiseHire Pricing

| Tier | Price | Roles | Briefs | Seats | AI |
|------|-------|-------|--------|-------|-----|
| **Starter** | $49/mo | 3 active | 5/day (30/mo cap) | 1 | BYOK required |
| **Professional** | $149/mo | Unlimited | 50/day | 3 | Platform AI included |
| **Business** | $399/mo | Unlimited | Unlimited | 10 | Platform AI + Analytics |
| **Enterprise** | Custom | Unlimited | Unlimited | Unlimited | Custom AI + SSO + SLA |

**No free tier.** Post-trial with no active plan shows a Contact Us lockout screen.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript 5 |
| **Build** | Vite 6 (HMR, code splitting, lazy loading) |
| **Styling** | Tailwind CSS + Radix UI primitives + shadcn/ui |
| **Animation** | Framer Motion 12 (transitions, landing page animations) |
| **State** | Zustand (global/persistent) + TanStack Query v5 (server state) |
| **Auth** | Kinde Auth → Supabase via JWT token bridge |
| **Database** | Supabase PostgreSQL with Row Level Security on all tables |
| **Backend** | 93 Supabase Edge Functions (Deno runtime) |
| **File Storage** | Supabase Storage (avatars, resumes, portfolios, candidate CVs) |
| **Email** | Resend (transactional + admin notifications) |
| **AI Providers** | OpenRouter, Groq, Gemini, OpenAI, Anthropic, Mistral, xAI, Cohere, Ollama |
| **Voice** | ElevenLabs (interview coach voice-to-text) |
| **Mobile / PWA** | Capacitor 8 (biometrics, haptics, deep links, offline sync) |
| **Testing** | Vitest |

### AI Routing Priority Chain

All AI calls flow through a shared `callAI()` client with an 8-step priority chain:

1. User BYOK — direct providers (OpenAI, Anthropic, Groq, Mistral, xAI, Cohere)
2. User BYOK — OpenRouter (any model slug)
3. User BYOK — Ollama (self-hosted)
4. User BYOK — Gemini
5. Platform OpenRouter (best available free model, ranked by context × parameters)
6. Platform Groq fallback (Llama 3.3 70B)
7. Legacy Gemini key
8. Abort — all steps exhausted

BYOK users bypass platform credit deduction at steps 1–4. Platform credits are enforced atomically at the database level (fail-closed on DB error).

---

## 🏗 Architecture

```
The Wise Cloud
├── Frontend (React 18 SPA, Vite)
│   ├── WiseResume routes  (/dashboard, /editor, /interview, /ai-studio, /portfolio, …)
│   └── WiseHire routes    (/wisehire/dashboard, /wisehire/pipeline, /wisehire/briefs, …)
│
├── Auth Layer
│   ├── Kinde Auth (OAuth, magic links, SSO)
│   └── token-exchange edge function (Kinde JWT → Supabase JWT, deterministic UUID v5)
│
├── Backend (Supabase)
│   ├── PostgreSQL — 40+ tables, RLS on every table, 50+ RPCs
│   ├── Storage buckets — avatars, resumes, portfolios, candidate-resumes
│   └── Edge Functions (Deno) — 93 functions across 6 categories:
│       ├── AI & Content Generation (WiseResume)  — 21 functions
│       ├── WiseHire AI                            — 12 functions
│       ├── Resume Parsing & Import                — 4 functions
│       ├── Interview & Voice                      — 3 functions
│       ├── Portfolio & Public                     — 7 functions
│       ├── Admin & Dev Kit                        — 27 functions
│       └── Utility (auth, billing, notifications) — 19 functions
│
└── CI/CD
    ├── deploy.yml              — Frontend → Hostinger
    └── deploy-edge-functions.yml — Edge Functions → Supabase
```

### Dual-Product Separation

Both products share infrastructure but are permanently separated by `profiles.account_type`:

- `job_seeker` → WiseResume app (`/dashboard`, `/editor`, etc.) via `JobSeekerRoute` guard
- `hr` → WiseHire app (`/wisehire/*`) via `WiseHireGuard`

Users cannot switch account types after sign-up. Admin-managed via the Dev Kit.

### Security Model

- **Authentication**: Every authenticated endpoint enforces four layers in order: JWT auth → rate limit → atomic credit check → payload size guard
- **Database**: All tables use Row Level Security. No table is accessible without proper auth. Explicit block policies on `credit_transactions`, `subscriptions`, `ai_credits`, and `rpc_rate_limits`
- **BYOK**: API keys stored with AES-GCM-256 encryption, per-user salt
- **Credit system**: Atomic deduction via `atomic_attempt_and_deduct_credit` RPC (fail-closed on DB error)
- **WiseHire AI**: All functions fail-closed — requests are blocked if the rate limiter is unreachable

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Kinde](https://kinde.com/) account (auth)
- A [Supabase](https://supabase.com/) project (database + edge functions)

### 1. Clone & Install

```bash
git clone https://github.com/iammagdy/wiseresume-74945019.git
cd wiseresume-74945019
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Fill in your `.env`:

```
VITE_KINDE_CLIENT_ID=       # Your Kinde application client ID
VITE_KINDE_DOMAIN=          # Your Kinde domain (e.g. yourapp.kinde.com)
VITE_SUPABASE_URL=          # Your Supabase project URL
VITE_SUPABASE_PUBLISHABLE_KEY=  # Your Supabase anon key
```

> **Replit users**: All four vars are pre-configured in `.replit [userenv.shared]`. The app runs with zero additional setup — just hit **Run**.

### 3. Start the Dev Server

```bash
npm run dev
# → http://localhost:5000
```

### 4. Deploy Edge Functions (optional)

```bash
# Requires SUPABASE_ACCESS_TOKEN set in your environment
bash scripts/deploy-functions.sh
```

---

## 📁 Project Structure

```
├── src/
│   ├── pages/              # All page components (WiseResume + WiseHire)
│   │   └── wisehire/       # WiseHire-specific pages
│   ├── components/         # Shared UI components
│   │   ├── landing/        # Marketing landing page sections
│   │   ├── wisehire/       # WiseHire-specific components
│   │   └── dev-kit/        # Admin panel components
│   ├── hooks/              # React hooks
│   ├── store/              # Zustand stores
│   ├── lib/                # Utilities, edge function clients, auth bridge
│   └── integrations/supabase/  # Auto-generated Supabase types (do not edit)
├── supabase/
│   ├── functions/          # 93 edge functions (Deno)
│   │   └── _shared/        # Shared middleware, AI client, rate limiter
│   └── migrations/         # SQL migration files
├── project-governance/     # Architecture, product, and branding rules
├── specs/                  # Technical specifications
├── wise-templates/         # Resume template definitions
└── scripts/                # Deploy and maintenance scripts
```

---

## 📋 Governance

All contributors (human or AI) must follow the governance rules in `project-governance/`. These take precedence over everything else.

| Document | Purpose |
|----------|---------|
| [`CONSTITUTION.md`](./project-governance/CONSTITUTION.md) | Supreme rules for development and AI agents |
| [`PRODUCT.md`](./project-governance/PRODUCT.md) | Product scope, quality standards, and tier limits |
| [`ARCHITECTURE.md`](./project-governance/ARCHITECTURE.md) | Technical constraints, security rules, and full infrastructure inventory |
| [`BRANDING.md`](./project-governance/BRANDING.md) | Approved names (WiseResume, WiseHire, Wise AI, The Wise Cloud) and UI guidelines |
| [`WORKFLOW.md`](./project-governance/WORKFLOW.md) | How we build, test, and deploy |

**Notes for AI agents:**
- `legacy-docs/` is preserved for historical context only — do not treat it as current architecture
- `src/integrations/supabase/types.ts` is auto-generated — never edit it manually
- All WiseHire tables use `profiles.id` (not `auth.users.id`) as the `owner_id` FK
- All edge functions require `verify_jwt = false` in `supabase/config.toml`
- Read `AGENTS.md` in the root directory for CLI execution constraints

---

## 📄 License

Copyright © The Wise Cloud. All rights reserved.  
Proprietary and confidential. Unauthorized use, copying, or distribution is strictly prohibited.
