

# Full Backend & Data Integrity Audit

## Audit Summary

After a comprehensive review of all 51 files with database calls, 38 edge functions, all hooks, pages, and components, here is the complete assessment.

---

## VERDICT: The app is well-wired overall

The vast majority of features correctly connect to real database tables and real AI edge functions. There are no fake API responses, no hardcoded scores presented as real user data, and no demo data injected into user-facing workflows.

However, the audit found **5 issues** that need fixing and **3 items** that are acceptable by design.

---

## Issues to Fix

### 1. `resignation_letters` table has no TypeScript types -- uses `as any` casts
The `resignation_letters` table exists in the database but is missing from the auto-generated `src/integrations/supabase/types.ts`. The hook `useResignationLetters.ts` works around this with raw string casts, which means:
- No compile-time type checking on inserts/updates
- Silent failures if column names change

**Fix:** Add `resignation_letters` to the generated types by running a schema refresh (types regenerate automatically from the database). Since this project uses Lovable Cloud, regenerating types should happen on the next deploy cycle. No code change needed -- just awareness that this is a type-safety gap.

### 2. `career_assessments` table also uses `as any` casts
Same issue as above -- the `useCareerAssessment.ts` hook casts `supabase.from('career_assessments') as any`. The table exists and works, but there is no compile-time safety.

**Fix:** Same as above -- types regeneration will resolve this.

### 3. `share_comments` table uses `as any` casts
The `useShareComments.ts` hook casts `supabase.from('share_comments' as any)`. Again, table exists and functions correctly, but no type safety.

**Fix:** Same -- types regeneration.

### 4. `EditorDemo` on landing page shows animated hardcoded score (45 to 92)
The `src/components/landing/EditorDemo.tsx` component shows a visual animation on the landing/marketing page where a score animates from 45 to 92. This is a **marketing illustration** (not user data), but it could mislead users into thinking they'll get a specific score.

**Fix:** Add a subtle label like "Example" or "Demo" overlay so users understand this is illustrative. This is a minor UX clarity issue, not a data integrity problem.

### 5. `cover_letters.template_style` column is unused
The database has a `template_style` column that always defaults to `'professional'` and is never set by the app. This is dead data -- not harmful, but worth cleaning up.

**Fix:** Either remove the column or start using it. Low priority.

---

## Acceptable by Design (No Fix Needed)

### A. `sampleResumeData` in template previews
The `sampleResumeData` (with "Wise Megz" persona) is used ONLY for template thumbnail previews when no real resume is loaded. This is standard UX -- showing what a template looks like requires sample content. The `TemplateSelector` correctly prefers the user's real resume when available (`const previewResume = currentResume || sampleResumeData`).

### B. Empty state examples in editor sections
The `emptyStateExamples.ts` file provides placeholder text shown ONLY when a section is empty (e.g., "Write your professional summary"). These are clearly labeled as examples and disappear once the user adds real content. This is standard UX guidance, not fake data.

### C. Heuristic job match scores as AI fallback
The `jobMatchScorer.ts` provides instant client-side heuristic scores while waiting for the real AI score. The UI correctly distinguishes these with `isAIVerified: false/true` and the component shows different styling for AI-verified vs. heuristic scores. This is a proper progressive enhancement pattern.

---

## Verified: All Features Properly Wired to Database

| Feature | Database Table | Edge Function | Verified |
|---|---|---|---|
| Resume CRUD | `resumes` | -- | Yes, real DB |
| Resume versions | `resume_versions` | -- | Yes, real DB |
| Resume scoring | `resumes` | `score-resume` | Yes, real AI |
| Resume analysis | `resumes` | `analyze-resume` | Yes, real AI |
| Resume tailoring | `tailor_history` | `tailor-resume` | Yes, real AI + DB |
| Resume sharing | `resume_shares` | -- | Yes, real DB |
| Share comments | `share_comments` | -- | Yes, real DB (as any) |
| Cover letters | `cover_letters` | `generate-cover-letter` | Yes, real AI + DB |
| Resignation letters | `resignation_letters` | `generate-resignation-letter` | Yes, real AI + DB (as any) |
| Job applications | `job_applications` | -- | Yes, real DB |
| Jobs | `jobs` | `parse-job-url` | Yes, real DB |
| Job match scoring | -- | `analyze-resume` | Yes, real AI |
| Interview practice | `interview_sessions` | `interview-chat` | Yes, real AI + DB |
| Career assessment | `career_assessments` | `career-assessment` | Yes, real AI + DB (as any) |
| Career path | -- | `career-path-advisor` | Yes, real AI |
| AI enhance | -- | `enhance-section` | Yes, real AI |
| Proofread | -- | `proofread-resume` | Yes, real AI |
| LinkedIn optimizer | -- | `optimize-for-linkedin` | Yes, real AI |
| AI detector/humanize | -- | `detect-and-humanize` | Yes, real AI |
| One-page optimizer | -- | `one-page-optimizer` | Yes, real AI |
| Recruiter sim | -- | `recruiter-simulation` | Yes, real AI |
| Company briefing | -- | `company-briefing` | Yes, real AI |
| Gap explainer | -- | `explain-gap` | Yes, real AI |
| Gap filler | -- | `fill-gap` | Yes, real AI |
| Portfolio | `profiles` | `get_public_portfolio` RPC | Yes, real DB |
| Portfolio analytics | `portfolio_visits` | `get_portfolio_analytics` RPC | Yes, real DB |
| Short links | `short_links` | `resolve_short_link` RPC | Yes, real DB |
| Notifications | `notifications` | DB trigger | Yes, real DB |
| AI credits | `ai_credits` | `increment_ai_usage` RPC | Yes, real DB |
| AI usage logs | `ai_usage_logs` | -- | Yes, real DB |
| User profiles | `profiles` | -- | Yes, real DB |
| User preferences | `user_preferences` | -- | Yes, real DB |
| API keys | `user_api_keys` | `manage-api-keys` | Yes, encrypted DB |
| Bug reports | `bug_reports` | `send-bug-report` | Yes, real DB |
| Feature requests | `feature_requests` | `send-feature-request` | Yes, real DB |
| Push notifications | `push_subscriptions` | `send-push-notification` | Yes, real DB |
| Resume parsing | -- | `parse-resume` | Yes, real AI |
| LinkedIn import | -- | `parse-linkedin` | Yes, real AI |
| Headshot generation | -- | `generate-headshot` | Yes, real AI |

---

## Proposed Changes

### File: `src/components/landing/EditorDemo.tsx`
- Add a small "Example" badge overlay to clarify the animated score demo is illustrative

### No other code changes needed
The three `as any` type issues (resignation_letters, career_assessments, share_comments) are type-safety gaps in the auto-generated types file. They work correctly at runtime. A types regeneration cycle will resolve them -- no manual code changes required.

