# What Wise Cloud Can Do Today

**Last verified:** 2026-05-02 (Task #30)

## Mobile builds are now buildable in minutes (2026-05-02)
**What was the situation:** Wise Resume had been *partially* configured for mobile (the Capacitor wrap) for some time, but no one had ever produced a working app you could actually install on a phone. There was no recipe, no script, and no safety net — and worse, if anyone *had* built it, the mobile binary would have shipped the admin tools panel inside it (a security and clutter problem on a user's phone).
**What changed:** The repo now has a one-command path to a usable mobile build (`npm run mobile:sync`) and a short, written guide that walks any developer with a Mac (for iPhone) or Android Studio (for Android) through producing a TestFlight or Play-Console internal-testing build in minutes. The build automatically rips the admin tools panel out of the mobile app — there's now a verifier that fails the build if even one trace of the admin panel sneaks back in. The native iOS and Android project folders are no longer part of the repo (they're regenerated on demand) so we never get tangled in per-developer Xcode/Android Studio quirks.
**Catch:** The mobile binary itself still has to be produced on a Mac (for iOS) or a machine with Android Studio — no developer environment can build a real iPhone or Android app on its own. What this work delivers is everything that goes *up to* that final IDE step.

## See where AI calls are coming from (2026-05-02)
**What was the situation:** When you opened the admin desk, there was no way to see *which users* were spending the most AI credits, *which features* were generating the most AI calls (cover letters? tailoring? interview prep?), or *which AI providers* (OpenRouter, Groq, DeepSeek, or someone using their own key) were doing the work. You could see total credit usage in aggregate but couldn't pin it to a person or a feature.
**What changed:** The admin desk now has a new "AI Cost" panel under the Monitor section. Pick a window (Today / Last 7 days / Last 30 days / Last 90 days / All time) and you instantly see four headline numbers — total AI calls in that window, how many different users made at least one call, the busiest feature, and the busiest provider — plus three ranked lists: the 10 highest-spending users (with their email when we have it), spend grouped by feature, and spend grouped by provider. The page refreshes itself every two minutes while it's open.
**What you'll notice:** A "Coins" icon in the admin sidebar between Analytics and Onboarding. A blue banner at the top of the panel is honest about what's measured: the database doesn't store dollar amounts per AI call today, so this view counts AI invocations (the same unit the credit pool charges) — one row = one AI call. If we ever start storing per-call dollar amounts, the same panel will start showing them too.

## Pick a look for your cover letter (2026-05-02)
**What was the situation:** Every generated cover letter came out in the same plain layout. There was no way to make a letter feel more polished, more compact, or more creative — and there was no way to change the look after the letter was saved.
**What changed:** Four cover-letter styles are now available: **Classic** (the familiar plain serif look), **Modern** (sans-serif with a coloured header band), **Compact** (smaller text and tighter spacing for fitting on one page), and **Creative** (a two-column header with the recipient's address sitting beside yours). You pick the style on the "Generate" screen before creating a letter, and you can change it any time afterwards from the letter's edit screen — the preview updates instantly and the PDF download uses the same look. Cover letters created before today still display exactly as they did before; the new style picker only kicks in once you choose one. Each card in your cover letter list now shows a small badge with the chosen style so it's easy to tell them apart at a glance.
**What you'll notice:** A row of four labelled tiles on both the "New cover letter" and "Edit cover letter" screens. Tapping a tile switches the preview to that style; the chosen style is saved and used for the PDF. Older letters display a no-badge, plain layout — no surprises.

## Email verification, welcome email & password reset (2026-04-26)
**What was the situation:** Anyone who signed up with an email and password could immediately use the platform with zero confirmation that the email address was real. There was no welcome message when someone joined, and there was no "forgot my password" option that sent a branded email.
**What changed:** Three things now happen for new email/password sign-ups:
1. A branded verification email lands in their inbox the moment they register. Until they click the link, they see a "Check your inbox" screen and cannot access the platform. They can request another email from that same screen if the first one goes missing.
2. A welcome email is sent after they verify, introducing the platform features.
3. A "Forgot password?" link on the sign-in page sends a branded reset email with a secure one-click link. Google and Apple sign-in users are unaffected — they skip verification entirely since their identity is already confirmed.
**What you'll notice:** The user list will only contain people with confirmed email addresses going forward. Existing users are not affected — everyone already signed up is treated as verified.

## Admin tools: better user identity + force-set usernames (2026-04-26)
**What was the situation:** When you opened any user in the Admin desk and looked at their Identity section, it showed a scrambled placeholder email like `kp_448838b3...@kinde.placeholder` instead of who the person actually is. There was no sign-up date, no last sign-in, and nothing that helped you tell users apart. Also, trying to assign a short portfolio username (like a single letter or number) triggered a confusing "AI is temporarily unavailable" error that had nothing to do with AI at all.
**What changed:** Three things were fixed:
1. You can now type any portfolio username in the admin panel — one letter, a number, a symbol — and save it without errors. The system only blocks you if another user already owns that exact username. The user automatically receives an in-app notification when you change their username.
2. The Identity card now shows the real Kinde email (when available), the user's contact email, when they signed up ("Joined"), and when they last signed in — making it much easier to identify users who haven't added their name.
3. The user list now shows the real email for all users, not just the special collision accounts — so users without a name are still identifiable by email.
**What you'll notice:** Users in the admin desk now have meaningful identity information. Short or custom usernames can be assigned freely. The old "AI" error is gone — admin errors now show plain, accurate messages.

## One-click demo resume for admins (2026-04-20)
**What was the situation:** When testing AI Studio with a brand-new admin account, there were no resumes attached, and the AI chat tool stays inactive until you pick one. That made it hard to verify chat, tailoring, cover letters, or interview prep without first manually filling in a resume.
**What changed:** The admin Settings area now has a "Create sample resume" button that instantly seeds a realistic demo resume — three jobs, an education entry, a dozen skills, a certification, a project, and a volunteering line — into the admin account.
**What you'll notice:** After clicking, the demo resume appears in the resume picker on the AI Studio page right away, so chat, tailoring, and the other AI tools are immediately usable. A small note appears next to the button if you already have one, reminding you that another click adds another copy.

## Preview tailored resume before applying (2026-04-19)
**What was the situation:** After tailoring a resume to a job, the only way to see the polished result rendered with your template was to click "Apply Changes", which spent a slot to create a new resume copy.
**What changed:** A new "Preview" button now sits next to "Apply" on the tailor results screen. Tap it to open a full preview of the tailored resume — same template, same colours — without saving anything yet.
**What you'll notice:** You can flip section toggles on and off, open the preview to check how it actually looks, and only commit to a new tailored copy once you're happy.

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

## Filter and search the AI provider activity log (2026-04-18)
**What was the situation:** The AI Provider admin tab showed a flat list of the most recent 50 model switches and provider tests. Once activity built up, it was hard to answer questions like "who switched the Groq model yesterday?" or "show me only failed Gemini tests".
**What changed:** The recent-activity panel now has filter chips for the provider and the type of action, a toggle for failed tests only, a search box for the actor's email, and a "Load more" button so admins can scroll back through the full history instead of just the last 50 rows.
**What you'll notice:** When you open the AI Provider tab as an admin, the activity log at the bottom has a new row of filter controls and stays snappy even with thousands of audit entries because the filtering happens on the server.

---

For the engineering-level view of any of these features, see the "Currently Implemented" folder of this Atlas. For the **stability and performance work** that's happening behind the scenes — faster editor, smarter AI fallback, automatic cleanup of old analytics data — see the [stability improvements](./stability-improvements.md) sibling doc.
