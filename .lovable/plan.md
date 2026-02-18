

# WiseResume Full Analysis: AI Features, Database, and Codebase Health

## Part 1: AI Features Map

### Complete AI Feature Inventory (20 Edge Functions)

```text
+-------------------------------+-----------------------------+----------------------------+--------------------+
| AI Feature                    | Edge Function               | Client Entry Points        | DB Tables Used     |
+-------------------------------+-----------------------------+----------------------------+--------------------+
| Resume Scoring (deterministic)| score-resume                | useResumeScore,            | ai_usage_logs      |
|                               | (NO AI model - pure logic)  | DashboardPage, EditorPage  |                    |
+-------------------------------+-----------------------------+----------------------------+--------------------+
| Section Enhancement           | enhance-section             | useAIEnhance,              | ai_usage_logs,     |
|                               |                             | SectionAIAction,           | ai_credits         |
|                               |                             | AIEnhanceSheet,            |                    |
|                               |                             | ATSScanSheet, QuickActions |                    |
+-------------------------------+-----------------------------+----------------------------+--------------------+
| Resume Analysis (job match)   | analyze-resume              | aiAnalysis.ts,             | ai_usage_logs      |
|                               |                             | AnalyzeJobSheet            |                    |
+-------------------------------+-----------------------------+----------------------------+--------------------+
| Smart Tailoring               | tailor-resume               | aiTailor.ts,               | ai_usage_logs,     |
|                               |                             | TailorSheet, AIStudioPage  | tailor_history     |
+-------------------------------+-----------------------------+----------------------------+--------------------+
| Cover Letter Generation       | generate-cover-letter       | aiTailor.ts,               | ai_usage_logs,     |
|                               |                             | CoverLetterGenerator       | cover_letters      |
+-------------------------------+-----------------------------+----------------------------+--------------------+
| Agentic Chat                  | agentic-chat                | agenticChat.ts,            | ai_usage_logs      |
|                               |                             | AgenticChatSheet           |                    |
+-------------------------------+-----------------------------+----------------------------+--------------------+
| Interview Practice            | interview-chat              | useVoiceInterview,         | ai_usage_logs,     |
|                               |                             | InterviewPage              | interview_sessions |
+-------------------------------+-----------------------------+----------------------------+--------------------+
| Career Path Advisor           | career-path-advisor         | careerPath.ts,             | ai_usage_logs      |
|                               |                             | CareerPathSheet            |                    |
+-------------------------------+-----------------------------+----------------------------+--------------------+
| Career Assessment             | career-assessment           | useCareerAssessment,       | ai_usage_logs,     |
|                               |                             | CareerPage                 | career_assessments |
+-------------------------------+-----------------------------+----------------------------+--------------------+
| AI Detector + Humanizer       | detect-and-humanize         | AIDetectorSheet            | ai_usage_logs      |
+-------------------------------+-----------------------------+----------------------------+--------------------+
| LinkedIn Optimizer            | optimize-for-linkedin       | LinkedInOptimizerSheet     | ai_usage_logs      |
+-------------------------------+-----------------------------+----------------------------+--------------------+
| One-Page Optimizer            | one-page-optimizer          | OnePageWizardSheet         | ai_usage_logs      |
+-------------------------------+-----------------------------+----------------------------+--------------------+
| Recruiter Simulation          | recruiter-simulation        | RecruiterSimSheet          | ai_usage_logs      |
+-------------------------------+-----------------------------+----------------------------+--------------------+
| Proofread Resume              | proofread-resume            | useProofread,              | ai_usage_logs      |
|                               |                             | ProofreadSheet             |                    |
+-------------------------------+-----------------------------+----------------------------+--------------------+
| Gap Explainer                 | explain-gap                 | GapExplainerSheet          | ai_usage_logs      |
+-------------------------------+-----------------------------+----------------------------+--------------------+
| Gap Filler                    | fill-gap                    | GapFillerSheet             | ai_usage_logs      |
+-------------------------------+-----------------------------+----------------------------+--------------------+
| Parse Resume (upload)         | parse-resume                | UploadPage                 | ai_usage_logs      |
+-------------------------------+-----------------------------+----------------------------+--------------------+
| Parse LinkedIn                | parse-linkedin              | LinkedInImportSheet        | ai_usage_logs      |
+-------------------------------+-----------------------------+----------------------------+--------------------+
| Parse Job URL                 | parse-job-url               | JobUrlParser               | ai_usage_logs      |
+-------------------------------+-----------------------------+----------------------------+--------------------+
| Resignation Letter            | generate-resignation-letter | ResignationLetterNewPage   | ai_usage_logs,     |
|                               |                             |                            | resignation_letters|
+-------------------------------+-----------------------------+----------------------------+--------------------+
```

### Non-AI Edge Functions (4)

| Function | Purpose |
|----------|---------|
| manage-api-keys | CRUD encrypted user API keys |
| ai-health | Health check endpoint |
| send-bug-report | Email bug reports via Resend |
| send-feature-request | Email feature requests |
| send-push-notification | Web push via VAPID |
| elevenlabs-scribe-token | ElevenLabs voice token |
| generate-headshot | AI headshot (image gen) |
| generate-portfolio-bio | Portfolio bio generation |
| track-portfolio-view | Analytics counter |

---

## Part 2: Inconsistencies and Issues Found

### Issue 1: Deprecated `getUserGeminiKey()` still called (CLEANUP - APPROVED)

**File:** `src/lib/aiProvider.ts` (stub), `src/pages/ResignationLetterEditPage.tsx` (caller)
**Problem:** `getUserGeminiKey()` always returns `undefined`. ResignationLetterEditPage still passes `userGeminiKey: getUserGeminiKey()` in its fetch body. This sends `userGeminiKey: undefined` which is harmless but dead code.
**Fix:** Remove the import and the `userGeminiKey` field from the fetch body in ResignationLetterEditPage. Remove the function from aiProvider.ts.

### Issue 2: Dead store fields `geminiApiKey` and `elevenlabsApiKey` (CLEANUP - APPROVED)

**File:** `src/store/settingsStore.ts`
**Problem:** These fields exist in the interface and defaults but are excluded from persistence (line 191) and are never read meaningfully. Keys migrated to server-side `user_api_keys` table.
**Fix:** Remove the fields, their setter actions, and update the interface. Keep the `partialize` exclusion logic harmless by removing the destructure of already-gone fields.

### Issue 3: Inconsistent credit deduction patterns

**Problem:** AI credit tracking happens in 3 different ways across features:
1. **useAIAction wrapper** (used by `useAIEnhance`): checks credits, executes, deducts via `incrementUsage.mutate()`, shows toast
2. **Direct `incrementUsage.mutate()`** (used by `AIEnhanceSheet`): manual deduction after success
3. **No deduction at all** (used by `aiAnalysis.ts`, `agenticChat.ts`, `careerPath.ts`, `aiTailor.ts`): these call `trackGeminiUsage()` (client-side free-tier counter only) but never call `incrementUsage` to deduct from the `ai_credits` table

**Impact:** Many AI operations (analyze, tailor, career path, chat, cover letter) don't deduct credits from the database. Only enhance operations do. This means the daily credit limit shown in the UI doesn't accurately reflect usage.
**Recommendation (PROPOSAL ONLY):** Flag as tech debt. All AI service functions should route through `useAIAction` for consistent credit tracking. This is a behavioral change and should be addressed in a dedicated sprint.

### Issue 4: Dual rate limiting (FLAGGED PER YOUR REQUEST)

**Client-side:** `src/lib/rateLimiter.ts` (in-memory, provider-aware, 245 lines)
**Server-side:** `supabase/functions/_shared/rateLimiter.ts` (DB-based, per-user)
**Status:** Both active. Client-side provides early rejection before network round-trip. Server-side is authoritative. Flagged as tech debt -- keep both for now as defense-in-depth.

### Issue 5: `trackGeminiUsage()` is a semi-dead function

**Problem:** `trackGeminiUsage()` in `src/lib/aiProvider.ts` only increments a Zustand counter (`geminiDailyUsage`) for Gemini free-tier users. It's called from 9 files. Since keys moved server-side, the client doesn't know the user's tier until the settings store is loaded. The function still has a purpose for the free-tier daily counter UI, so it should be kept but noted as a candidate for server-side consolidation.
**Recommendation:** No change now. Flag for future: move daily usage tracking to the server (it's already done via `ai_usage_logs`).

---

## Part 3: Database Schema Analysis

### Tables in Use -- Summary

| Table | Used By | Status |
|-------|---------|--------|
| resumes | Core data, Editor, Dashboard, all AI features | Active, healthy |
| profiles | Settings, Portfolio, auth trigger | Active, healthy |
| ai_credits | useAICredits, increment_ai_usage RPC | Active but under-utilized (see Issue 3) |
| ai_usage_logs | All edge functions via rateLimiter | Active, healthy |
| cover_letters | CoverLettersPage, CoverLetterEditPage | Active |
| resignation_letters | ResignationLettersPage | Active |
| interview_sessions | InterviewPage, useInterviewHistory | Active |
| career_assessments | CareerPage, useCareerAssessment | Active |
| job_applications | ApplicationsPage | Active |
| jobs | JobDetailPage, useJobs | Active |
| resume_versions | VersionHistorySheet | Active |
| resume_shares | ShareSheet, SharePage | Active |
| share_comments | SharePage comments | Active |
| tailor_history | TailorHistorySheet | Active |
| notifications | NotificationsPage | Active |
| bug_reports | BugReportDialog | Active |
| feature_requests | FeatureRequestDialog | Active |
| push_subscriptions | PushNotificationSettings | Active |
| user_api_keys | manage-api-keys edge function | Active |
| user_preferences | Settings sync (biometric, defaults) | Active |

### Schema Observations (PROPOSAL ONLY - no changes)

1. **ai_credits table lacks UPDATE RLS policy**: Users can INSERT and SELECT but cannot UPDATE their own credits. The `increment_ai_usage` RPC uses SECURITY DEFINER to bypass this, which is correct. However, if any future feature needs direct updates, a policy would be needed.

2. **No foreign key from ai_credits.user_id to auth.users**: This is intentional per project guidelines (no FK to auth.users). The RPC handles integrity.

3. **tailor_history.job_description is nullable but tailor_history.job_title is NOT NULL**: Minor inconsistency -- a tailor always has a job description. Proposal: make `job_description` NOT NULL in a future migration if desired.

4. **feature_requests has no SELECT policy**: Users can create feature requests but cannot view their own. This is likely intentional (admin-only viewing) but worth noting.

---

## Part 4: Codebase Cleanup Candidates

### Files to Clean Up (approved changes)

| File | Action | Reason |
|------|--------|--------|
| `src/lib/aiProvider.ts` | Remove `getUserGeminiKey()` function | Always returns undefined; deprecated stub |
| `src/pages/ResignationLetterEditPage.tsx` | Remove `getUserGeminiKey` import and usage | Dead code sending undefined |
| `src/store/settingsStore.ts` | Remove `geminiApiKey`, `elevenlabsApiKey` fields and their setters | Dead fields, keys stored server-side |

### Files Flagged as Tech Debt (no changes now)

| File | Issue | Priority |
|------|-------|----------|
| `src/lib/rateLimiter.ts` | Redundant with server-side limiter (245 lines) | Low -- keep as defense-in-depth |
| `src/lib/aiProvider.ts` | `trackGeminiUsage()` is semi-dead; 9 call sites | Low -- still serves free-tier counter |
| `src/lib/geminiKeyValidator.ts` | Makes direct API calls to Google from client; could leak key in network logs | Medium -- should move to edge function |
| `src/hooks/useAIAction.ts` | Not used by most AI features; only useAIEnhance wraps it | Medium -- should be adopted universally |

### Large Files That Could Benefit From Splitting (future, not now)

| File | Lines | Suggestion |
|------|-------|------------|
| `src/pages/PreviewPage.tsx` | 700+ | Extract bottom action bar into its own component |
| `src/pages/EditorPage.tsx` | Very large | Extract section routing/lazy loading logic |
| `src/lib/rateLimiter.ts` | 245 | Three full rate-limit profiles could be config objects |

---

## Part 5: Implementation Steps

### Step 1: Remove `getUserGeminiKey()` dead code
- Delete the function from `src/lib/aiProvider.ts`
- Remove import and `userGeminiKey` usage from `src/pages/ResignationLetterEditPage.tsx`

### Step 2: Clean up dead store fields
- Remove `geminiApiKey`, `elevenlabsApiKey`, `setGeminiApiKey`, `setElevenlabsApiKey` from `src/store/settingsStore.ts`
- Update the `partialize` function to remove destructuring of deleted fields

### Step 3: Verify no regressions
- Confirm ResignationLetterEditPage still generates letters correctly
- Confirm settings store initializes without errors
- Confirm AI provider detection still works

---

## Part 6: Remaining Tech Debt Summary

| Item | Risk | Recommendation |
|------|------|----------------|
| Inconsistent credit deduction (Issue 3) | Users may exceed limits without deduction | Adopt `useAIAction` wrapper for all AI calls |
| `geminiKeyValidator.ts` sends key from client | Key visible in browser network tab | Move validation to edge function |
| `trackGeminiUsage()` semi-dead | Confusing code, 9 call sites for minimal value | Server-side daily tracking via ai_usage_logs |
| Client-side rate limiter | 245 lines of redundant logic | Remove once confident in server-side limits |

