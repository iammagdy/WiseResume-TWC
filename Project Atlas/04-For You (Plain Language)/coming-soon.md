# What's Coming Soon

**Last verified:** 2026-05-02
**Audience:** you (the owner). No code, no jargon, no technical paths.
**Sources (governance — supreme):**
- `project-governance/CONSTITUTION.md` § 7 (WiseHire governance)
- `project-governance/DECISIONS.md` (especially Decision #8 — desktop-first carve-out for WiseHire Phases 1 & 2)
- `specs/001-wisehire-hr-platform/spec.md` (WiseHire phase plan)
- `specs/002-wise-ai-agent-evolution/spec.md` (Wise AI agent phases)
- `Routing AI Providers/README.md` plus the ten numbered planning docs in that folder (`01-current-state.md` through `10-risks-and-rollback.md`)
- `docs/ai_features_design.md` (eight planned AI features)

---

These are things the team has **agreed to build**. They have written specs. They are not built yet.

## WiseResume on your phone — coming to the App Store and Google Play

We rebuilt the mobile app from scratch using a different toolkit (Expo) so it
feels truly native — fast taps, smooth scrolling, real push notifications, Face
ID / fingerprint lock, and proper "open in app" links from emails. It uses the
same login as the website (your Kinde account), the same resumes, the same
saved jobs, the same AI providers — there is no second version of your data.

**What's in the first release:**
- Sign in with your existing WiseResume account.
- Browse and read your resumes, save jobs, draft cover letters and resignation
  letters, and practice interviews out loud (the AI listens and grades you).
- Export any document as a PDF straight from your phone.
- Get push reminders for interview prep and follow-ups, with per-category
  on/off switches.
- Subscribe to Pro through Apple or Google (handled by RevenueCat); we keep
  the website checkout too.
- Lock the app with Face ID or fingerprint when you step away.

**What's deferred to the next release** (we want the first one in store review
before we add more): inline section editing on phone, in-app rich PDF preview,
"Sign in with Apple" / "Sign in with Google" one-tap buttons, and Live
Activities / Dynamic Island. The previous experimental Capacitor build has
been removed from the codebase.

## WiseHire — Phases 2, 3, 4

**Phase 2 — pipeline depth.** Bigger bulk screening (background jobs), polish for the bias reduction mode, reusable scorecard templates, drip outreach emails, and calendar integration with Google and Outlook for interview scheduling.

**Phase 3 — talent pool, analytics, mobile.** A bigger talent pool (job seekers can opt in to be discoverable), deeper analytics dashboards, and **WiseHire on mobile**. WiseHire today is desktop-first on purpose; Phase 3 lifts that.

**Phase 4 — multi-seat and enterprise.** Multiple HR users per company (1 seat on Starter, 3 on Pro, 10 on Business, unlimited on Enterprise), role-based permissions inside the company, single sign-on (SSO), automatic user provisioning (SCIM), custom AI per company, a 99.9% uptime guarantee, and an optional white-label.

## Wise AI — Phases 2 & 3 (continued)

Some of this already shipped (the "Add with AI" button, the company briefing tool, the cache that stops the AI from re-doing the same research). What's still planned:
- A wider toolset (more page actions the AI can take on your behalf).
- Streaming responses (text appears as it's written, instead of all at once).
- Memory across sessions — the AI remembers what you discussed last week.
- The AI proactively suggests improvements instead of waiting to be asked.

## AI routing rollout

Today the platform load-balances across 4 AI providers (OpenRouter, Groq, DeepSeek, and NVIDIA NIM — added 2026-05-09) in a random pool. Planned: a smarter router where every feature picks the right provider for the job (e.g. "use the fast cheap one for grammar fixes, use the smart expensive one for cover letters"), with streaming, caching, and a dashboard so we can see what's working.

## Eight more AI features (designed, not built)

A design doc spells out 8 future AI features:
1. Cover Letter v2 — multi-tone variants side by side.
2. Real-time ATS suggestions panel — fixes appear as you type.
3. Interview performance dashboard — review your mock interviews over time.
4. Skill gap analyzer with a curated learning path.
5. Public portfolio chat that personalises based on the visitor.
6. Bulk section booster — rewrite all bullet points at once.
7. AI job match scoring with confidence and reasons.
8. Custom interview question bank for practice.

---

## What's NOT here on purpose

These are **not** in the plan. They have been considered and either **rejected** or are still in `under-discussion.md`:

- A free tier for WiseHire — explicitly rejected. Post-trial means "Contact Us", not a free downgrade.
- Replacing the deterministic resume scorer with an AI model — explicitly rejected.
- Letting users switch between job seeker and HR account types after signup — explicitly rejected.
