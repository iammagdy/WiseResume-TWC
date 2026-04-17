# What Wise Cloud Can Do Today

**Last verified:** 2026-04-17
**Audience:** you (the owner). No code, no jargon, no technical paths.
**Sources (governance — supreme):**
- `project-governance/PRODUCT.md` § 2 (WiseResume) and § 3 (WiseHire)
- `project-governance/CONSTITUTION.md` § 7 (WiseHire governance)
- `project-governance/CHANGELOG.md` and `CHANGELOG.md` (most recent shipped changes)
- `project-governance/ARCHITECTURE.md` (current architecture invariants the body relies on for "behind the scenes" claims)

---

## Two products, one platform

Wise Cloud is two products that share the same plumbing:

- **WiseResume** — for job seekers. Build resumes, write cover letters, prep for interviews, build a public portfolio.
- **WiseHire** — for HR teams. Write job descriptions, screen candidates, run interview pipelines, manage talent.

A user picks which side they belong to when they sign up. **They cannot switch later.** This is by design — it stops job seekers seeing HR tools and HR users seeing job seeker tools.

---

## What WiseResume can do today

**Build and edit a resume.** Drag, drop, reorder sections. AI helps with summaries, bullet points, skills suggestions. 30+ templates. Real-time preview, ATS score analysis, version history, exports to PDF, ATS-friendly PDF, DOCX, and plain text.

**Tailor a resume to a specific job.** Paste a job description, get a tailored version that matches the keywords. Costs 2 AI credits.

**Generate cover letters and resignation letters.** AI writes a first draft you can edit. Cover letters cost 2 credits; resignation letters cost 1.

**Score a resume against a job.** This is a deterministic check (no AI involved, no credits charged) — it reads the resume and the job description and gives you a match score.

**Practice interviews.** Talk to an AI interviewer using your microphone (or text if you prefer). Get a transcript, a score, and a shareable report link.

**Track applications.** A Kanban board: Applied → Screening → Interview → Offer → Hired or Rejected.

**Build a public portfolio.** Pick a username, get a public link. Recruiters can chat with an AI version of you on that page. Each portfolio can opt out of search engine indexing.

**AI Studio.** Sixteen AI-powered writing tools in one place — cold emails, salary negotiation scripts, personal branding, skills gap analysis, and more.

**Bring Your Own Key (BYOK).** If you have your own AI provider account (OpenAI, Anthropic, Gemini, Groq, Mistral, xAI, Cohere, OpenRouter, or a self-hosted Ollama), plug in the key. We use your key, and we don't deduct credits from your account.

### WiseResume pricing

| Plan | Price | Daily AI credits |
|---|---|---|
| Free | $0 | 5 |
| Pro | $9/mo | 100 |
| Premium | $19/mo | Unlimited |

(Prices and credit limits per `project-governance/PRODUCT.md` § 2.)

---

## What WiseHire can do today (Phase 1 — invite-only)

**Sign up by invite.** HR teams need an invite link from us (or an early-access code). The link works for 72 hours then expires.

**Onboarding.** A short five-step setup: company name, size, role types, monthly hiring volume, first role.

**Write a job description with AI.** Type two sentences, get a polished JD.

**Generate a candidate brief.** Upload a CV plus the JD, get a brief with a match score, strengths, concerns, suggested interview questions, and notes on the candidate's employment history.

**Screen up to 50 CVs at once.** Bulk upload, ranked output.

**Interview scorecards.** Pre-filled with questions from the brief.

**Bias Reduction Mode.** Strips names, photos, and schools from CVs before you read them.

**Pipeline (Kanban).** Shortlisted → Contacted → Interviewing → Offer Sent → Hired / Rejected.

**Talent Pool.** Search WiseResume job seekers who opted in to be discoverable.

**Outreach emails.** Send candidate emails through the platform.

**Public role share links.** Candidates can apply directly via a public link.

**Analytics.** Hiring funnel, time-to-offer, source tracking.

### WiseHire pricing

| Plan | Price | What you get |
|---|---|---|
| Starter | $49/mo | 3 active roles, 5 candidate briefs/day (capped at 30/month), 1 seat, BYOK required |
| Professional | $149/mo | Unlimited roles & briefs (50/day), 3 seats, platform AI |
| Business | $399/mo | Unlimited roles & briefs, 10 seats, platform AI plus advanced analytics |
| Enterprise | Custom | Unlimited everything, SSO, SLA, custom AI |

7-day Professional trial auto-granted on HR signup. **No free tier** — post-trial means "Contact Us", not a degraded free experience.

(All prices, limits, and the no-free-tier rule are stated in `project-governance/PRODUCT.md` § 3 and in `project-governance/CONSTITUTION.md` § 7.2.)

---

## What we do behind the scenes (so you don't have to)

- **Data privacy.** All data is locked per user — HR users only see their own candidates, job seekers only see their own resumes.
- **AI fallback.** If our preferred AI provider is slow or down, we automatically try the next one — no error to the user.
- **Cost control.** Daily credit limits are enforced **before** the AI call, so a stuck API can never run up a bill.
- **Encryption.** BYOK keys are encrypted with a per-user key.
- **Soft delete.** Deleted resumes and accounts can be recovered for 30 days. Hard delete is admin-only.
- **Public portfolio privacy.** Each portfolio can opt out of search engine indexing.
- **Live admin dashboard.** A password-protected admin panel shows analytics, user management, audit logs, and system health.

---

For the engineering-level view of any of these features, see the "Currently Implemented" folder of this Atlas.
