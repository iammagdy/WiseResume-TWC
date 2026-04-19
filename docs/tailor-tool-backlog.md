# Tailor Tool — Backlog & Health Audit

This file combines three documents for future reference:
1. **Task #51** — Fix All Tailor Tool Bugs and Flow Gaps
2. **Task #52** — Enhance the Tailor Tool to Outperform Competitors
3. **WiseResume / WiseHire Backend Audit** — the full health report delivered April 18, 2026

---

# Part 1 — Fix All Tailor Tool Bugs and Flow Gaps

## What & Why

The Tailor Tool is the most important feature in the app — it takes a user's resume and rewrites it to perfectly match a job they want to apply for. During a full audit, we found 11 logic/code bugs, 8 UI problems, several areas that need polish, and two broken bridges in the user journey that prevent the tool from feeling finished. This task fixes all of them.

---

### Functional Bugs (code problems that cause wrong or broken behavior)

**Bug 1 — Users lose a credit when the AI fails mid-way through section regeneration**
When a user clicks "Regenerate" on a single section (like just the Summary or just Skills), the app charges 1 credit immediately. If the AI then fails to respond, the credit is gone and nothing was improved. The refund code exists in the file but is never called. Fix: call the refund when an AI or parse error occurs.

**Bug 2 — The auto-retry does the opposite of what it's supposed to**
When the tailor fails due to a temporary glitch, it's supposed to automatically try again once. Due to a one-character mistake in the logic (`!code` instead of `code`), generic failures skip the retry entirely, while they should be retried. Fix: correct the condition so temporary errors get one automatic retry.

**Bug 3 — Regenerating the Projects section sends almost no information to the AI**
When a user asks to regenerate their Projects section, the app only sends the project names to the AI — not the descriptions, technologies, or role. The AI can't improve what it can't see. Fix: send the full project data (name, description, technologies, role) so the AI can actually rewrite it meaningfully.

**Bug 4 — Regenerating the Education section silently breaks the data**
When a user regenerates Education, the AI's response is written to a field called `description` on each education entry — but that field doesn't exist in the education data structure. The result is that the changes appear to work but actually go nowhere. Fix: map the AI's response back to the correct education fields.

**Bug 5 — Every tailor request runs the same rate-limit check twice**
Two different rate-limit functions are called back-to-back with identical settings on every tailor request. This is redundant, adds unnecessary server load, and can cause confusing error messages if only one passes. Fix: remove the duplicate check.

**Bug 6 — "Retry Score" button charges full price (2 credits) instead of just retrying the score**
When the ATS score fails to calculate, a "Retry Score" button appears. Clicking it re-runs the entire tailoring process — three AI stages, 2 credits — even though the resume was already tailored correctly. Users think they're just recalculating a number, but they're paying for a full redo. Fix: make the retry button only re-request the score calculation, not the full pipeline.

**Bug 7 — The "Key Improvements" list shows `[object Object]` instead of real text**
After tailoring, there's a "Key Improvements" section that should list what the AI changed. Instead, the items render as `[object Object]` because the code tries to display a data object as if it were plain text. Fix: render the `description` field from each change item instead of the raw object.

**Bug 8 — Copy as plain text omits Projects, Certifications, and Awards**
When a user copies their tailored resume as plain text (to paste into an online application form), Projects, Certifications, and Awards are missing from the copied text — even when those sections were tailored. Fix: include all tailored sections in the plain text output.

**Bug 9 — Very long job descriptions break the navigation after tailoring**
When tailoring finishes, the app navigates to a new page and passes the full job description in the URL. Job descriptions can be 3,000–5,000+ characters; browsers cut off URLs at around 2,000. This causes the job description to be silently truncated or the navigation to fail. Fix: store the job description in app memory (already available via Zustand state) instead of putting it in the URL.

**Bug 10 — Clicking "Re-tailor" resets any sections the user had turned off**
A user might untick Education or Awards before re-tailoring because those sections aren't relevant to their target job. When they click Re-tailor, the app resets all sections back to "on" and ignores what the user configured. Fix: preserve the user's section selection when re-tailoring.

**Bug 11 — A redundant `|| true` causes unnecessary screen flicker every 200ms**
During tailoring, the progress animation updates every 200ms. A leftover `|| true` in a condition means the animation update fires on every tick regardless of whether anything changed, causing unnecessary re-renders throughout the tailoring wait. Fix: remove the `|| true` so updates only fire when the step actually changes.

---

### UI/UX Bugs (visual and interaction problems that confuse or frustrate users)

**UX Bug 1 — Intensity selector shows icons only, no labels**
In the results view, the Light / Moderate / Aggressive selector uses a lightning bolt, gauge, and flame icon — with no text. First-time users have no way to know what these mean. Fix: add the text labels ("Light", "Moderate", "Aggressive") under each icon.

**UX Bug 2 — No loading indicator on individual section regeneration**
When a user clicks regenerate on a section card, the card shows no visual change until the AI finishes (which takes several seconds). It looks like the click didn't register. Fix: show a spinner or "Regenerating…" label on the specific card while the AI is working.

**UX Bug 3 — Cache restore banner shows irrelevant previous results**
If a user tailored their resume yesterday for Company A and opens the tailor tool today planning to target Company B, they see a banner saying "You have unsaved tailor results. Restore?" — offering results from the wrong job. Fix: only show the restore banner if the cached job description matches the current one, or clearly label which job the cache is from.

**UX Bug 4 — Skills tab "Add skill" changes the original resume instead of the tailored version**
When a user opens the Skills tab and clicks "Add" or "Boost" on a suggested skill, that change is applied directly to their master/original resume rather than the tailored copy they're reviewing. This can permanently modify the resume they didn't intend to change. Fix: apply skill additions to the tailored result in the review state, not the live original resume.

**UX Bug 5 — "Full view" button and auto-navigation after tailoring both go to the same place**
After tailoring, the sheet automatically navigates to the full Tailor page. But there's also a "Full view" button in the header that does the same thing. Having both is confusing and redundant. Fix: remove the auto-navigation; let the user stay in the sheet to review results and use the Full view button if they want the expanded layout.

**UX Bug 6 — No formatted resume preview before applying changes**
After reviewing the tailored sections, the user has no way to see what the finished, designed resume will look like before they click Apply. They click Apply, a new resume is created in their list, and they have to go find it and open it to see the result. This is the biggest gap in the flow. Fix: add a "Preview" button in the results view that opens a formatted render of the tailored resume in the existing preview panel/modal.

**UX Bug 7 — After applying, there's no direct path to download**
When Apply is clicked and the new tailored resume is created, the user sees a success toast. But the only way to get to that resume is to close the tailor view, navigate to the home screen, find the new resume in the list, open it, and then download it. Fix: add a "Open & Download" button to the success state that navigates directly to the newly created resume in the editor, ready to export.

**UX Bug 8 — Compare Changes uses wrong baseline when restoring from cache**
The side-by-side comparison (Compare Changes button) shows original vs tailored. But when the result is restored from cache rather than freshly tailored, the `originalResume` reference may not be populated correctly, causing the comparison to show the wrong original. Fix: ensure the original resume is always saved alongside the cached tailor result so the comparison is always accurate.

---

### Polish

**Polish 1 — Section scores use a naive weighting formula**
The overall score shown when sections are toggled on/off uses a simple "divide by 7" formula. Toggling off Awards reduces your score by the same amount as toggling off Experience, which is not realistic. Fix: weight the score reduction by the actual ATS impact of each section (Experience and Skills have the highest weight; Awards and Certifications have the lowest).

**Polish 2 — The warning "Score couldn't be calculated" message is misleading**
It says "Our servers are experiencing high demand." The score failing to calculate is usually an AI JSON parsing issue, not server load. Fix: update the message to say the score couldn't be calculated this time, with a simple retry option that doesn't re-charge credits.

---

### Broken Flow Bridges

**Bridge 1 — No preview before committing**
The gap: user reviews text snippets → clicks Apply → must navigate away to see what the resume looks like.
The fix: surface the formatted resume preview directly within the tailor results view so users can confirm they like the output before creating the new copy.

**Bridge 2 — No direct download after applying**
The gap: tailored resume is created → success toast disappears → user is left in the tailor view with no path to their new resume.
The fix: replace the disappearing toast with a persistent success card that shows the new resume title with buttons to open it in the editor or go directly to download/export.

---

## Done Looks Like

- All 11 code bugs are fixed and behave as described in each fix above
- All 8 UI/UX bugs are resolved with the described corrections
- Section regeneration (projects, education) produces accurate, high-quality rewrites
- Credits are never silently lost on AI failures
- Intensity selector shows text labels
- Section regeneration shows a per-card loading state
- Cache restore banner is context-aware and not misleading
- Skill additions in the Skills tab go to the tailored version, not the original
- Key Improvements list shows real text
- Plain text copy includes all sections
- After applying, a persistent card offers direct access to the new resume
- Preview button shows a formatted render of the tailored resume before applying

## Relevant Files

- `src/lib/aiTailor.ts`
- `src/components/editor/TailorSheet.tsx`
- `src/pages/TailorPage.tsx`
- `supabase/functions/tailor-resume/index.ts`
- `supabase/functions/tailor-section/index.ts`
- `src/components/editor/tailor/SectionChangeCard.tsx`
- `src/components/editor/tailor/ScoreComparison.tsx`
- `src/components/editor/tailor/SmartSkillSuggestions.tsx`
- `src/components/editor/tailor/KeywordMatchBar.tsx`
- `src/components/editor/tailor/TailorProgress.tsx`

---

# Part 2 — Enhance the Tailor Tool to Outperform Competitors

## What & Why

After fixing all the existing bugs, this task adds a set of new capabilities that make the Tailor Tool genuinely better than the most popular resume tools on the market (Jobscan, Teal, Rezi, Kickresume). Each enhancement fills a specific gap identified in the competitive analysis.

---

**Enhancement 1 — Show sections as they finish (streaming reveal)**
Right now, a user stares at a loading screen for 20–40 seconds and then everything appears at once. Instead, results should appear section by section as the AI finishes each one — Summary appears first, then Skills, then Experience, etc. This makes the wait feel much shorter and more dynamic.

**Enhancement 2 — Live ATS re-score when toggling sections**
When a user ticks/unticks sections before applying, the overall score shown should update in real time to reflect the actual keyword impact of those sections — not a rough estimate.

**Enhancement 3 — Inline bullet editing with keyword highlighting**
In the Experience section of the results, each rewritten bullet should be editable directly in the results view. As the user types, matched job keywords are highlighted in real time so they can see which keywords they've kept, added, or removed.

**Enhancement 4 — Saved job descriptions library**
Users who apply to many jobs should be able to save job descriptions with a label (company + title) and come back to tailor against them without re-pasting.

**Enhancement 5 — ATS system targeting**
Different companies use different software to screen resumes (Workday, Greenhouse, Lever, iCIMS, Taleo). Let users optionally select which ATS they think the company uses. The AI prompt will then optimize specifically for that system's known parsing behavior.

**Enhancement 6 — Transparent score breakdown panel**
When a user sees their ATS score jump from 38% to 76%, they should be able to click it and see exactly why: which keywords matched, which are still missing, in a clear visual breakdown.

**Enhancement 7 — One-click job application tracking**
After a user applies their tailored resume, offer a one-tap option to immediately add this application to the application tracker. Pre-fill company, job title, date, and link to the tailored resume automatically.

**Enhancement 8 — Multi-resume tailoring (tailor from a different base)**
Add a resume picker inside the tailor flow so a user can say "tailor my Software Engineer resume for this job" without having to first navigate away and switch resumes.

**Enhancement 9 — Version history with named snapshots**
Each tailoring run creates a version. Let users give each version a name (e.g., "Meta Senior Engineer - aggressive") and see a history of all previous tailoring runs for that resume with their scores. They can restore any previous version with one click.

**Enhancement 10 — "What's still missing" actionable gap card**
After tailoring, show a clearly separated card titled "Still not a perfect match" that lists the specific skills or qualifications from the job description that the AI could not add because they don't appear anywhere in the resume. Each item shows why it matters and suggests how to address it.

**Enhancement 11 — Export tailored resume directly from the results view**
Add a "Download PDF" button directly in the tailor results view so users can export the tailored resume without having to navigate to the editor first.

---

## Done Looks Like

- Tailor results appear section by section as they complete, not all at once
- ATS score updates in real time as sections are toggled on/off
- Each rewritten bullet in Experience is editable inline with live keyword highlighting
- A "Saved Jobs" panel lets users save and reload job descriptions
- An optional ATS system selector (Workday / Greenhouse / Lever / iCIMS / Other) is visible in the tailor settings area
- Clicking the ATS score opens a breakdown showing exactly which keywords matched and which didn't
- After applying, a one-tap option creates an application tracker entry pre-filled with job info
- A resume picker inside the tailor flow lets users select which resume to tailor without leaving
- Tailor history is named and browsable; any version can be restored
- A "Still not a perfect match" card after tailoring shows genuine skill gaps with actionable advice
- A Download PDF button is available directly in the tailor results view

## Relevant Files

- `src/lib/aiTailor.ts`
- `src/components/editor/TailorSheet.tsx`
- `src/pages/TailorPage.tsx`
- `src/store/resumeStore.ts`
- `supabase/functions/tailor-resume/index.ts`
- `src/components/editor/tailor/BulletComparison.tsx`
- `src/components/editor/tailor/SectionChangeCard.tsx`
- `src/components/editor/tailor/ScoreComparison.tsx`
- `src/components/editor/tailor/KeywordMatchBar.tsx`
- `src/components/editor/tailor/TailorHistorySheet.tsx`

---

# Part 3 — WiseResume / WiseHire Backend Health Audit

**Audit date:** April 18, 2026
**Scope:** Supabase edge functions, auth integration, DevKit, database schema, data integrity, Replit-side server proxy.

---

## Architecture Overview

| Layer | Tech |
|---|---|
| Front-end | React + Vite (port 5000) |
| App server | Express on Replit (port 5001), proxies `/api/*` |
| Auth provider (users) | Kinde (`@kinde-oss/kinde-auth-react`) |
| Auth bridge | Express `/api/fn/token-exchange` + Supabase `token-exchange` edge fn → mints a Supabase JWT keyed by Kinde `sub` for RLS-aware DB access |
| Auth provider (admins) | DevKit — self-contained password auth (`verify-dev-kit`), separate from Kinde |
| Edge functions | 94 functions in repo, 98 deployed on Supabase |
| Database (live) | Supabase Postgres (used by edge functions + RLS) |
| Database (Replit dev/server routes) | Neon Postgres via Drizzle (`DATABASE_URL`) |

**Key strength:** the recent migration moved every client-side Supabase function call behind the Express proxy at `/api/fn/:fnName`. Anonymous keys no longer leave the server.

**Key risk:** the project now runs two databases — Supabase (canonical, used by edge functions) and Neon (used by the Express server's direct routes). If both are written to, drift is inevitable. This is the single largest architectural issue to resolve.

---

## Edge Function Audit

### Repo ↔ Deployment Drift

**Deployed but NOT in repo (4 — "ghost functions"):**
- `clerk-webhook` — leftover from a previous Clerk auth integration. Should be removed (Kinde is the active provider).
- `fetch-github-projects` — already flagged in `EDGE_FUNCTION_AUDIT.md` as orphan; still deployed.
- `proofread-resume` — no source in repo, so any change must be re-deployed manually.
- `send-bug-report` — same, no source in repo.

### Confirmed Orphan Functions (no caller anywhere)

| Function | Recommendation |
|---|---|
| `wisehire-apply` | Remove — superseded by direct candidate insertion in `wisehire-bulk-screen` flow. |
| `send-feature-request` | Remove (UI uses `send-contact-email`). |
| `send-contact-inquiry` | Remove (UI uses `send-contact-email`). |
| `generate-store-screenshots` | Mark as CI-only or delete. |
| `hard-purge` | Keep — invoked manually via Supabase dashboard for GDPR purge. |
| `admin-check-access` | Keep — used as an internal helper by other admin functions. |

---

## Database Schema Audit

### Missing Constraints / Column Issues

| Table.Column | Issue | Recommendation |
|---|---|---|
| `profiles.email` | Nullable, no `UNIQUE` | Add `UNIQUE` after backfilling. |
| `subscriptions.user_id` | No `UNIQUE` | Add `UNIQUE(user_id)` — currently enforced only at app layer. |
| `resumes.(user_id, is_primary)` | No partial unique index | Add `CREATE UNIQUE INDEX ON resumes(user_id) WHERE is_primary = true`. |
| `ai_credits.(user_id, usage_date)` | No `UNIQUE` | Add — every "increment usage" today relies on `ON CONFLICT` against this pair. |
| `portfolio_visits.username` | Text FK to mutable username | Switch to `portfolio_id uuid` FK to avoid orphan analytics on rename. |
| `portfolio_interactions.portfolio_username` | Same | Same fix. |
| `portfolio_short_links.portfolio_username` | Same | Same fix. |
| `wisehire_candidates.tags` | `ARRAY` (untyped) | Type as `text[] DEFAULT '{}'::text[]`. |

### Tables Expected but Not Found

- **Cover letters** (`generate-cover-letter`) — no `cover_letters` table. If users want to revisit/edit, this needs persistence.
- **Resignation letters** (`generate-resignation-letter`) — no `resignation_letters` table. Same concern.
- **Push notifications** — no `push_subscriptions` table to store device tokens.

---

## Issues / Risks Summary (priority order)

| # | Severity | Issue |
|---|---|---|
| 1 | High | Two-database architecture (Supabase + Neon) with no automated reconciliation. |
| 2 | High | 4 deployed functions have no source in the repo. |
| 3 | High | `subscriptions.user_id` not `UNIQUE` — risk of duplicate subscription rows. |
| 4 | Medium | Drizzle schema covers only 10/25 tables — server routes against the other 15 lose type safety. |
| 5 | Medium | `portfolio_*` tables FK on mutable `username` instead of `portfolio_id` — analytics break on rename. |
| 6 | Medium | 6 confirmed orphan edge functions still deployed (cost + attack surface). |
| 7 | Medium | No `cover_letters` / `resignation_letters` tables — generated content is ephemeral. |
| 8 | Low | DevKit re-sends raw password on every admin call. Switch to short-lived signed token. |
| 9 | Low | `profiles.email` nullable, not unique. |
| 10 | Low | `wisehire_candidates.tags` untyped `ARRAY` rather than `text[]`. |
| 11 | Low | 94 edge functions = noisy deployment surface; consider grouping admin endpoints. |

---

## What Is Working Well

- Client → server proxy migration is complete. No Supabase keys ship to the browser anymore.
- Kinde + Supabase bridge is clean and isolated to `supabaseBridge.ts` / `AuthContext.tsx`.
- DevKit is well-separated and crash-isolated via `DevKitPanelBoundary`.
- FK and index design on existing tables is solid.
- Documented audit (`EDGE_FUNCTION_AUDIT.md`) is in place.

---

## Suggested Next Actions (in order)

1. Pick one canonical DB (Supabase or Neon) and stop writing to the other from the Express server.
2. Pull the 4 ghost edge functions back into the repo (or delete them on Supabase).
3. Delete the 4 confirmed-orphan functions: `wisehire-apply`, `send-feature-request`, `send-contact-inquiry`, `clerk-webhook`.
4. Add the missing constraints in a single migration.
5. Backfill `server/schema.ts` with Drizzle definitions for the remaining tables.
6. Decide whether cover letters and resignation letters should be persisted; if yes, add tables.

---

## What Was Already Resolved (Tasks #1–#2, April 18 2026)

- Canonical DB decision documented: **Supabase** is canonical; Neon is dev-mirror only.
- Migration `20260418195800_schema_hardening.sql` applied — subscriptions+ai_credits UNIQUE, partial unique on `resumes(is_primary)`, email uniqueness, `wisehire_candidates.tags` text[].
- Migration `20260418195801_portfolio_id_columns.sql` applied — adds `portfolio_id uuid` to portfolio tables.
- Migration `20260418195802_letters_persistence.sql` applied — adds `cover_letters` and `resignation_letters` with RLS owner-only policies.
- Orphan functions `wisehire-apply`, `send-feature-request`, `send-contact-inquiry` deleted from repo.

## What Still Needs Human Action

1. Update `generate-cover-letter` and `generate-resignation-letter` to INSERT generated content into the new tables.
2. Cut over portfolio analytics readers to read `portfolio_id` instead of username column, then drop legacy username FK.
3. Delete the 4 ghost functions (`clerk-webhook`, `fetch-github-projects`, `proofread-resume`, `send-bug-report`) from the Supabase dashboard.
4. DevKit raw-password-per-call → short-lived signed token (deferred — touches all 27 admin functions).
