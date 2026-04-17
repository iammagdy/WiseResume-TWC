# Glossary — Wise Cloud in Plain English

**Last verified:** 2026-04-17
**Audience:** you (the owner). No code, no jargon, no technical paths.
**Sources (governance — supreme):**
- `project-governance/CONSTITUTION.md` (definitions of account types, WiseHire scope)
- `project-governance/PRODUCT.md` § 2 and § 3 (pricing, plan, credit definitions)
- `project-governance/ARCHITECTURE.md` (Rules A–C, fail-closed/fail-open semantics, soft-delete defaults)
- `project-governance/DECISIONS.md` (canonical reasoning behind defined terms like implicit OAuth, soft delete, no-free-tier trial)

If you ever read a card in this Atlas and don't know a word, look it up here first.

---

**Account type.** Whether a user signed up as a job seeker (WiseResume) or as an HR user (WiseHire). Set at signup. **Cannot be changed.**

**AI credit.** A unit that gets consumed every time the platform calls an AI on behalf of a user. Free users get 5 per day, Pro users get 100, Premium users get unlimited (shown as ∞). Credits reset daily. Some AI tools cost 2 credits (cover letters, tailoring); the resume scorer costs 0 (it doesn't use AI).

**AI Studio.** The page that holds 16 AI-powered writing tools in one place — cold emails, salary negotiation scripts, personal branding, etc.

**Atlas.** This folder — the engineering reference for the whole platform.

**Audit log.** A record of every important action an admin or the system took. Lives in the admin dashboard.

**BYOK — Bring Your Own Key.** Users can plug in their own AI provider key (OpenAI, Anthropic, Gemini, etc.). When they do, we use their key, and we don't deduct credits from their account. Their key is encrypted before being stored.

**Cascade / fallback chain.** If the first AI provider is slow or returns an error, we automatically try the next one in order. The user just sees a slightly slower response — they don't see an error.

**Coupon.** A code a user can redeem for credits or a plan upgrade.

**Dev Kit / DevKit.** The password-protected admin panel. Used to manage users, look at analytics, run health checks, manage coupons, and more.

**Edge function.** A small backend program that runs on Supabase. The platform has 93 of them. Each one does one job (e.g. "generate a cover letter", "list users", "validate an invite").

**Fail closed.** If something can't be checked safely, the request is **blocked**. Used for cost-sensitive things (credit checks). The opposite is "fail open" — let it through to keep the site responsive — used for things like public portfolio views.

**Four-Layer Security.** Every AI request goes through four checks in this order: (1) is the user logged in? (2) are they within their rate limit? (3) do they have a credit available? (4) is their request payload reasonable? If any fails, the request is blocked.

**JWT.** A signed token that proves a user is who they say they are. Issued by Kinde (our auth provider), accepted by our backend.

**Kinde.** The third-party service we use for sign-in / sign-up. Handles passwords, email verification, social login.

**Migration.** A SQL file that changes the database schema (adds a table, adds a column, changes a permission rule). The platform has 158 of them. They run in order.

**Onboarding.** The short setup flow a new user goes through after signing up. WiseResume has 6 steps; WiseHire has 5.

**Pipeline.** The Kanban board WiseHire users see for their candidates: Shortlisted → Contacted → Interviewing → Offer Sent → Hired / Rejected.

**Plan.** A user's subscription tier. WiseResume has Free / Pro / Premium. WiseHire has Starter / Professional / Business / Enterprise.

**Portfolio.** A public web page (a personalised link with the user's chosen username) a job seeker can publish to show off their resume, projects, and bio.

**Rate limit.** A cap on how often something can happen. Two layers: per-IP (cheap pre-filter) and per-user-per-day (the credit system).

**Resend.** The third-party service we use to send emails (welcome emails, magic links, outreach emails, etc.).

**RLS — Row Level Security.** A database feature that locks every row to its owner. Even if a user got past every other check, the database itself would refuse to show them another user's data.

**RPC.** A database helper function. The platform has 23 of them. They wrap common database actions safely (e.g. "deduct a credit atomically").

**Score-resume.** A specific tool that scores how well a resume matches a job description. **It does not use AI** and **does not cost credits.** This is a hard rule (Rule B).

**Soft delete.** When a user deletes something, it doesn't get wiped — it gets hidden and kept for 30 days, so it can be recovered. Hard delete (actual erasure) is admin-only.

**Source of truth.** The one canonical place a fact lives. For user identity + plan + credits + preferences, there's a single helper used everywhere; for AI routing, there's a single shared client. The Atlas always points to the source of truth instead of copying the fact.

**Stripe.** The payment processor. Handles subscriptions and webhook events. (Not yet wired up for live WiseHire payments.)

**Supabase.** The backend platform — Postgres database, authentication helper, storage buckets, and edge functions all in one.

**Tailor.** Take a resume and rework it to match a specific job description. Costs 2 credits.

**Talent Pool.** A list of WiseResume job seekers who opted in to be visible to HR users. WiseHire users can search it.

**Trial.** A free 7-day Professional-tier trial granted automatically to new HR signups. After it ends, the user must convert or contact us — there is no free fallback.

**WiseHire.** The HR-side product. Has its own dedicated section of the app.

**WiseResume.** The job seeker product. The default experience of the app.

---

If a word is missing here that you keep seeing, ask me to add it.
