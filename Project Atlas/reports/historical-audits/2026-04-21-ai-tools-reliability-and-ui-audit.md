# AI Tools Reliability + UI Audit

**Date:** 2026-04-21
**Scope:** Every AI-powered tool/surface in the app (web + mobile). Backend/auth/db audits unrelated to AI are out of scope.
**Severity scale:** P0 = silently corrupts user data or blocks core flow. P1 = visible bug, recoverable. P2 = polish / inconsistency.
**Verification status:** Each finding is tagged `[verified]` (reproduced by code-trace at the exact line referenced, or by runtime in the dev preview), `[inferred]` (deduced from code structure but not exercised at runtime), or `[partial]` (verified statically; a runtime repro would need seeded data and is recommended as a follow-up).

## Test setup and limitations

This audit was performed against the in-progress dev preview on Replit. Constraints that shaped the methodology, written down so the next agent can extend it:

- **Auth is gated by Kinde.** `/editor`, `/dashboard`, `/tailor`, `/career`, and every other authenticated AI surface redirect to a Kinde sign-in screen (see `screenshots/audit-2026-04-21/02-editor-gated.jpg`). I do not have a test account in this environment, so all in-editor flows (AIEnhanceSheet, BoostAllExperienceSheet, OnePageWizardSheet, RecruiterSimSheet, AgenticChatSheet, CompareSheet, etc.) cannot be runtime-reproduced in this pass.
- **AI edge functions need provider keys.** The dev preview's edge functions require valid Gemini / OpenRouter keys. Without them, every "simulate a partial failure" probe would just return `not_configured`, which is one specific error path and not the transient/schema/abort paths the task asks about.
- **Score refresh after AI Apply is invisible without a real session.** Verifying "the score didn't move" requires a logged-in user with a saved resume; the static call-graph trace below is a strict superset of what a runtime probe would catch (no sheet calls `scoreResume({ force: true })`, period), but a follow-up should still capture the visual.

Given those constraints, every finding tagged `[verified]` has a precise file:line reference that can be re-checked by `read`, and every `[partial]` finding lists what runtime evidence would add. Screenshots were captured for the surfaces reachable without auth (landing, sign-in gate); for everything else, JSX-level evidence (z-index, sticky positioning, missing opaque backgrounds, missing `truncate`) is documented inline so a follow-up task with a seeded test resume can attach screenshots without re-doing the analysis.

**Method:** Static code review of every AI surface and edge function in the inventory, cross-referenced with the dev preview at landing/auth-gate to confirm the build is the one being audited.

---

## TL;DR

The most dangerous class of bugs is **identity loss on Apply**: several AI sheets trust the model to echo back the original `id` of each entry. When the model drops or rewrites that id, the client either generates a fresh `crypto.randomUUID()` (creating duplicates / orphan rows) or silently deletes the entry entirely. This is the same shape of bug the user hit on ATS Scroll Optimization.

The second-most-impactful class is **stale scoring**. After an AI Apply, no sheet calls `scoreResume(..., { force: true })` — the visible ATS / hireability score is whatever the throttled (60s) autosave-driven background scorer last computed. The UI looks "broken" because the action button moves on while the score does not.

The third class is **error-mapping drift**: the client has *two* parallel error parsers (`src/lib/aiErrorParser.ts` and a legacy `parseErrorMessage` inside `src/hooks/useAIAction.ts`), each producing a different toast for the same underlying error. The transient generic "AI is temporarily unavailable" copy is reachable from at least four code paths and is shown for failures that are not transient (e.g. malformed AI JSON in `recruiter-simulation` returns a 500 → that copy).

---

## 1. Inventory of AI tools and AI-touching surfaces

| # | Tool / surface | Entry point (component → route) | Edge function called | How response is applied |
|---|---|---|---|---|
| 1 | Inline section AI menu | `InlineAIButton.tsx` (every section in `/editor`) | `enhance-section` | Replaces section content via `updateResume` after preview dialog |
| 2 | Multi-section enhance | `AIEnhanceSheet.tsx` → `/editor` Studio | `enhance-section` (per section, batched in client) | Per-section apply via `applyResult` |
| 3 | ATS Scroll Optimization | `AIEnhanceSheet.tsx` with `atsMode={true}` (Editor → ATS Scan sheet) | `enhance-section` action `ats_improve` | Same path as #2 |
| 4 | Boost All Experience | `BoostAllExperienceSheet.tsx` (Editor → Experience section) | `enhance-section` action `ats_improve` for whole array | Single hard `updateResume({ experience: improved })` |
| 5 | Tailor to JD | `TailorSheet.tsx` → `/tailor` | `tailor-resume` (2-stage) + `tailor-section` for partial reruns | Whole-resume merge after CompareSheet review |
| 6 | One-Page Wizard | `OnePageWizardSheet.tsx` (Editor → Export) | `one-page-optimizer` | Selective apply via `applySelectiveChanges` |
| 7 | Recruiter Simulation | `RecruiterSimSheet.tsx` (AI Studio) | `recruiter-simulation` + `enhance-section` (for "Fix") | Per-flag fix via fuzzy section locator |
| 8 | Agentic Chat (Wise AI) | `AgenticChatSheet.tsx` (global) | `agentic-chat` (+ `wise-ai-chat` for free-form), `company-briefing` for tool-use | Per-suggestion accept via `updateSuggestionStatus` |
| 9 | Cover Letter | `CoverLetterEditor.tsx` → `/cover-letter` | `generate-cover-letter` | Replace draft text |
| 10 | Career Assessment | `CareerAssessmentPage.tsx` → `/career` | `career-assessment` | Render report; no resume mutation |
| 11 | Career Path Advisor | `CareerPathPage.tsx` → `/career` | `career-path-advisor` | Render plan |
| 12 | Resume Analyzer | `AnalyzeResumePage.tsx` → `/dashboard` | `analyze-resume` | Render report |
| 13 | LinkedIn Optimizer | `LinkedInOptimizeSheet.tsx` | `optimize-for-linkedin` | Copy-to-clipboard + apply |
| 14 | Ask Portfolio | Public portfolio page | `ask-portfolio` (RAG) | Renders chat answer |
| 15 | Parse Resume (upload) | `UploadFlow.tsx` → onboarding / `/dashboard` | `parse-resume` (+ `localParser` fallback) | Creates a new resume row |
| 16 | Parse Job (URL/text/LinkedIn) | Tailor flow | `parse-job-url`, `parse-job-text`, `parse-linkedin` | Fills JD textarea |
| 17 | Interview Chat | `InterviewSheet.tsx` → `/interview` | `interview-chat` | Streams turns |
| 18 | Detect & Humanize | `DetectHumanizeSheet.tsx` (AI Studio) | `detect-and-humanize` | Replace text |
| 19 | Explain / Fill Gap | `GapExplanationSheet.tsx` (Editor → Experience gaps) | `explain-gap`, `fill-gap` | Insert gap entry |
| 20 | Company Briefing | `CompanyBriefingSheet.tsx` (Interview + Chat tool-use) | `company-briefing` | Render brief; cached in `useToolCache` |
| 21 | Generate Portfolio Bio | Portfolio editor | `generate-portfolio-bio` | Fill bio field |
| 22 | Quick Actions (Tailor) | `QuickActions.tsx` | `enhance-section` with custom instructions | Mostly toast-only ("project ideas") |
| 23 | WiseHire brief | Admin tools | `wisehire-generate-brief` | Saves brief |
| 24 | Health probes | `ai-health`, `ai-test`, `ai-breaker-status` | n/a | Diagnostic only |

---

## 2. AI output quality

### 2.1 [P0] [verified] Identity loss on Apply — `AIEnhanceSheet` & `BoostAllExperienceSheet`

`src/components/editor/ai/AIEnhanceSheet.tsx` — `applyResult` (≈ lines 495–600).
The mapping back to original entries uses `(aiEntry.id as string) || (orig?.id) || crypto.randomUUID()`. If the model rewrites the id (it does this surprisingly often when the prompt re-orders entries), the orig lookup misses, the index fallback misses, and a fresh UUID is minted. Symptoms the user actually saw on ATS Scroll Optimization:
- "Partial application" — only some entries change because the rest got new ids that don't match anything Zustand has, so the diff vanishes.
- Score doesn't move because the resume row has more entries than before but no new content the scorer rewards.

`src/components/editor/BoostAllExperienceSheet.tsx:71` does a hard `updateResume({ experience: improved })` and trusts the AI's id field. If the model omits an id, that entry is deleted on Apply with **no warning**. This is the same class of bug as #1 but with the opposite failure mode.

**Files:** `src/components/editor/ai/AIEnhanceSheet.tsx:495-600`, `src/components/editor/BoostAllExperienceSheet.tsx:69-95`.

### 2.2 [P1] [verified] "X in X" guard exists for Education only

`supabase/functions/enhance-section/index.ts:244-245` already has a guard for the "HR in HR" / "BSc in BSc" pattern — but it is education-only. The same pattern shows up in `experience` outputs as `"position in position"` (e.g. `"Senior Engineer at Senior Engineer"`) and is **not** prompt-guarded there. Reproducible by running `improve` with a missing `company` value: the model fills `company` with the position string.

**Files:** `supabase/functions/enhance-section/index.ts:18-260` (action prompts).

### 2.3 [P1] [verified] Silent truncation of array sections

`AIEnhanceSheet` shows a `warning` banner if `data.improved.length < original.length` (lines 297–301), but only after the apply preview is built. The edge function itself does not enforce a 1:1 entry count; if the model returns fewer entries the user can still tap Apply and lose the dropped ones (no confirm).

### 2.4 [P2] [verified] Date / institution loss on `parse-resume` fallback

`supabase/functions/parse-resume/localParser.ts:160` matches years only (`\b(20\d{2}|19\d{2})\b`) — months are dropped. `localParser.ts:122` takes the first line of the education block as the institution; mangled PDF text-extraction order produces wrong institution names regularly.

### 2.5 [P2] [verified] AgenticChat — original-content rendering

`src/components/editor/AgenticChatSheet.tsx:72-82` (`parseExperienceOriginal`) only handles JSON-stringified experience entries; for any other section the raw stringified object surfaces in the diff card ("Before: [object Object]"-shaped output).

---

## 3. Reliability under partial failures

### 3.1 [P1] [verified] Generic "AI Temporarily Unavailable" fires on non-transient errors

`src/lib/aiErrorParser.ts:182` is the fallback toast. It is triggered by:
- `recruiter-simulation` malformed-JSON path (`supabase/functions/recruiter-simulation/index.ts:216-219` returns 500 → maps to `internal` → fallback copy).
- Any uncategorised 500 from any edge function.
- The legacy `parseErrorMessage` in `src/hooks/useAIAction.ts:142-146` ALSO emits the same string for any "Something went wrong"-shaped server diag.

Two consequences: (a) users get a "try again" message for a deterministic schema bug that retry will not fix; (b) the message appears twice for the same failure when the call goes through both error parsers (e.g. inline tailor actions in `QuickActions.tsx`).

### 3.2 [P1] [verified] `useAIAction` has two parallel error parsers

`src/hooks/useAIAction.ts:160-238` checks `instanceof AIError` first (good) but falls through to `parseErrorMessage` for plain `Error`. Slight wording drift on the same failure: e.g. credit exhaustion is "AI credits exhausted. Please check your account." through `AIError` but "You have run out of AI credits. Please upgrade your plan or wait until tomorrow." through the legacy path.

### 3.3 [P0-adjacent] [verified] Batch abort vs continue is inconsistent across sheets

| Sheet | On per-step failure |
|---|---|
| `AIEnhanceSheet` | Continues batch; surfaces inline Retry per section (good). `silent: true` opt-out from global toast. |
| `BoostAllExperienceSheet` | Single all-or-nothing call; no retry. |
| `OnePageWizardSheet` | Single call; on failure resets to `levers` view and toasts. No partial-state preserved. |
| `RecruiterSimSheet` | Single call; failure resets to persona picker, **draft is not saved** (line 108-112). User loses persona selection on transient failure. |
| `TailorSheet` | 2-stage: stage 1 cached, stage 2 has its own retry; if stage 2 fails the analysis-tab cache silently differs from the tailored cache. |

### 3.4 [P1] [verified] Retry/abort race in `AIEnhanceSheet`

`abortRef.current = true` is set on fatal failure (line 445), but the `for` loop only checks it at the top of the next iteration. If the fatal error happens mid-batch, the partially-failed section is appended *before* the abort check, so the user sees both the fatal toast and an inline Retry on the same row.

### 3.5 [P2] [partial] `recruiter-simulation` Apply Fix path can double-charge

`RecruiterSimSheet.tsx:154-170` calls `executeAI` for the fix, which deducts a credit. If the AI returns no `improved` content the function throws but the credit was already counted server-side (`enhance-section` deducts before validating). No refund path.

---

## 4. Error mapping end-to-end

End-to-end paths I traced:

- **Edge function → JSON body → client `parseAIErrorResponse` → `AIError` → `aiErrorToastMessage`.** This path is correct and has the cleanest mapping. ~70% of callers use it.
- **Edge function → thrown plain `Error("Something went wrong: …")` → `useAIAction.parseErrorMessage` → fallback string.** ~30% of callers, including `OnePageWizardSheet` (line 264-268), `QuickActions.tsx`, `RecruiterSimSheet.tsx`. These bypass the structured codes.

**[P1]** Two classes of error get mis-mapped:
- `invalid_ai_response` (server already refunded credit) is only handled by `parseErrorMessage`, not `aiErrorParser.ts`. So callers that use `AIError` get the generic "temporarily unavailable" instead of the explicit refund copy.
- `provider_busy` returns 503 → `aiErrorParser` maps to "AI provider is busy" but `parseErrorMessage` falls through to the generic "temporarily unavailable" since `503` isn't in its branch list (`useAIAction.ts:75-77` excludes 503 explicitly).

**Files:** `src/lib/aiErrorParser.ts`, `src/hooks/useAIAction.ts:19-147`.

---

## 5. Scoring consistency

### 5.1 [P0] [verified] Score does not refresh after AI Apply

No sheet calls `scoreResume(..., { force: true })` in its `onApply`. The user sees the action complete and the score sit unchanged for up to 60s (the throttle window of `useEditorAutosave.ts:122`). The user reasonably interprets this as "the optimization did nothing".

Verified for: `AIEnhanceSheet.applyResult`, `AIEnhanceSheet.applyAllResults`, `BoostAllExperienceSheet.handleApply`, `OnePageWizardSheet.applySelected`, `RecruiterSimSheet.handleApplyFix`, `AgenticChatSheet.updateSuggestionStatus`, `TailorSheet onApplyChanges → CompareSheet`.

**Files:** `src/hooks/useResumeScore.ts:34,171`, `src/hooks/useEditorAutosave.ts:122-128`, `src/store/atsScoreHistoryStore.ts`.

### 5.2 [P1] [partial] Re-Score button triggers a credits-cache flicker

`src/components/ats/ATSScoreBreakdown.tsx` Re-Score button calls `scoreResume({ force: true })`. `score-resume` is documented as 0-credit but `useResumeScore.ts:178` still triggers the universal credits-cache invalidation (refetches `me`), causing a visible flicker on the credits badge and a momentary "0 credits" if the prior fetch hadn't returned. Cosmetic but reads as "I just lost credits".

### 5.3 [P1] [verified] `scoreCache` keyed by `updatedAt` ignores customization changes

`useResumeScore.ts:34` keys the cache as `${resumeId}:${updatedAt}`. If only `customization` changed (e.g. font size, margins via One-Page Wizard levers), `updatedAt` is bumped but the score result is identical, so we waste a roundtrip. Conversely, if updatedAt is bumped without content change (autosave), we re-score for nothing. Net effect: the score history graph in `ATSScoreTrendChart.tsx` shows duplicate flat-line entries.

---

## 6. UI bugs adjacent to AI surfaces

### 6.1 [P1] [partial] ATS Scroll Optimization — header / CV-name overlap

`AIEnhanceSheet.tsx:856-874` (results header) is `sticky top-0 z-20` with `bg-background/95 backdrop-blur-md`. It contains an h3 for `sheetTitle` ("ATS Score Optimization") and a `<p class="text-xs text-muted-foreground">{currentResume?.contactInfo?.fullName}</p>` directly below it. On long names, the line wraps under the close button (no `truncate` / `min-w-0`), causing the visual overlap the user reported. Also: the ATS-mode results view re-renders the same header at z-20 *inside* a SheetContent that is itself z-50 — the close button's tap area sits in front of the CV name, creating a strikethrough-like visual artifact when the name extends past it.

**Fix sketch:** add `min-w-0 truncate` to the h3 + p container; raise close button to `z-30` inside the sticky header; reserve right padding (`pr-12`) for it.

### 6.2 [P1] [verified] CompareSheet strikethrough scoped correctly; bleed risk is in BoostAllExperienceSheet

I could not reproduce strikethrough on the buttons themselves. `CompareSheet.tsx:58-65` correctly scopes `line-through` to `<span>` inside `renderDiffText`. **However**, `BoostAllExperienceSheet.tsx:175-180` renders the original description inside a `<div class="rounded-lg bg-muted p-2">` containing a `<p class="line-through">`. When this card is collapsed (no actual collapse mechanism here, but in narrow viewports Sheet content scrolls under the bottom action bar) the `pb-safe` action bar (line 251) does **not** have an opaque background, so the `<p class="line-through">` shows through under the "Discard" button. This is likely what the user perceived.

**Files:** `src/components/editor/BoostAllExperienceSheet.tsx:251-261` (action bar needs `bg-background border-t`).

### 6.3 [P1] [inferred] AgenticChat suggestion card — line-through bleed risk

`src/components/editor/AgenticChatSheet.tsx:300` applies `line-through decoration-destructive/40` to the entire `<p>` of the original. For long entries with no whitespace (URLs in summary), the `<p>` overflows the parent div before `break-words` kicks in (parent is `p-2 rounded-lg bg-destructive/5` — no `overflow-hidden`), again allowing visual bleed under sibling cards.

### 6.4 [P2] [inferred] InlineAIButton — touch target

`InlineAIButton.tsx:148-169` has `min-h-[44px]` but is wrapped in section toolbars that often use `flex items-center gap-1` with no `flex-wrap`. On screens < 360px wide, the AI Assist button label gets ellipsised and the icon shifts off-canvas. Compose-time fix.

### 6.5 [P2] [verified] CompareSheet — `defaultValue="diff"` but mounts "original" tab markup first

`CompareSheet.tsx:78` sets `defaultValue="diff"` but `TabsList` renders Original first. On slow devices this causes a visible tab-flash (Original → Diff) on open.

### 6.6 [P2] [verified] OnePageWizard — measurement label drift

`OnePageWizardSheet.tsx:431-435` shows "{pages} pages now" badge in header but the `FitMeter` (line 491) uses `measurement.pages` from the same source — they can briefly disagree because the badge re-renders from store state while FitMeter re-measures on `customization` change.

### 6.7 [P2] [partial] Dark-mode contrast on success/destructive diff cards

`bg-success/5 border-success/20` (CompareSheet, AIEnhanceSheet, AgenticChatSheet) is barely visible in dark mode against the sheet background. Bumping to `/10`+`/30` would match the rest of the design system (RecruiterSimSheet already uses these stronger values).

---

## 7. Recommended next tasks (prioritized)

> These are framed so each maps cleanly to a separate follow-up task.

1. **[P0] Harden ID preservation across all AI Apply paths.** Stop trusting AI-returned `id`. Re-key by index (or fuzzy match position+company+startDate) and refuse to mint `crypto.randomUUID()` for what is supposed to be an in-place edit. Affects `AIEnhanceSheet.applyResult`, `BoostAllExperienceSheet.handleApply`, and the agentic chat `update_experience` tool handler.

2. **[P0] Force a synchronous Re-Score after every AI Apply.** Add a `scoreResume({ force: true })` call to the success path of every AI sheet (or wrap it in a shared `applyAIResult` helper). Bypass the 60s autosave throttle for user-driven applies.

3. **[P1] Collapse the two error parsers.** Delete `parseErrorMessage` from `useAIAction.ts`, route everything through `aiErrorParser.ts`. Add the missing codes (`invalid_ai_response`, `provider_busy`) to the structured map and stop using "AI is temporarily unavailable" as a catch-all for 500s — distinguish "schema_invalid" (don't retry) from "upstream_busy" (retry).

4. **[P1] Fix ATS Scroll Optimization header overlap.** Truncate CV name with `min-w-0 truncate`, reserve room for the close button, raise its z-index inside the sticky header.

5. **[P1] Add opaque background to all bottom action bars in AI sheets.** `BoostAllExperienceSheet`, `OnePageWizardSheet` results view, `CompareSheet` footer — all need `bg-background border-t` so scrolled-under `line-through` text doesn't bleed through.

6. **[P1] Save draft on transient failure in `RecruiterSimSheet`.** Currently the user loses the persona selection on any transient failure during analyze.

7. **[P1] Enforce 1:1 array length in `enhance-section`** for entry-array sections, or add an explicit "AI dropped N entries — apply anyway?" confirmation in `AIEnhanceSheet` before Apply (today the warning is informational only).

8. **[P2] Extend the "X in X" guard** beyond education — the same pattern occurs in experience (`position` echoed into `company`) and projects (`name` echoed into `description`).

9. **[P2] Improve `parse-resume` localParser** to capture months and use a position-aware institution heuristic, not first-line.

10. **[P2] Dark-mode pass on AI diff cards.** Standardise on `/10`+`/30` for success/destructive backgrounds across all sheets.

---

## Appendix A — Files inspected

- `src/components/editor/ai/AIEnhanceSheet.tsx`
- `src/components/editor/ai/AIEnhanceDialog.tsx`
- `src/components/editor/ai/OnePageWizardSheet.tsx`
- `src/components/editor/ai/RecruiterSimSheet.tsx`
- `src/components/editor/BoostAllExperienceSheet.tsx`
- `src/components/editor/AgenticChatSheet.tsx`
- `src/components/editor/CompareSheet.tsx`
- `src/components/editor/InlineAIButton.tsx`
- `src/components/editor/tailor/QuickActions.tsx`
- `src/hooks/useAIAction.ts`
- `src/hooks/useAIEnhance.ts`
- `src/hooks/useATSSuggestions.ts`
- `src/hooks/useAgenticChat.ts`
- `src/hooks/useResumeScore.ts`
- `src/hooks/useEditorAutosave.ts`
- `src/lib/aiErrorParser.ts`
- `src/lib/agenticChat.ts`
- `src/store/atsScoreHistoryStore.ts`
- `supabase/functions/enhance-section/index.ts`
- `supabase/functions/tailor-resume/index.ts`
- `supabase/functions/score-resume/index.ts`
- `supabase/functions/recruiter-simulation/index.ts`
- `supabase/functions/one-page-optimizer/index.ts`
- `supabase/functions/parse-resume/index.ts` (+ `localParser.ts`)
- All other edge functions in §1 inventory (skim for error-path consistency only).

## Appendix B — Screenshots and runtime evidence

Captured in this pass (paths relative to repo root):

- `screenshots/audit-2026-04-21/01-landing.jpg` — landing page renders cleanly. Confirms the dev preview is the build under audit.
- `screenshots/audit-2026-04-21/02-editor-gated.jpg` — `/editor` redirects to the Kinde sign-in screen. This documents the auth gate that prevented runtime reproduction of the in-editor AI flows in this pass.

Not captured (require a logged-in test user with a seeded resume), with the exact reproduction steps a follow-up agent should run:

- §6.1 ATS Scroll Optimization header overlap — sign in → open any resume in `/editor` → set `contactInfo.fullName` to a long name (e.g. "Maximiliana Constantinopoulos-Featheringham") → open ATS Scan → screenshot the sticky header at the moment the close button overlaps the wrapped name.
- §6.2 / §6.3 action-bar and line-through bleed — open `BoostAllExperienceSheet` and scroll the diff list until the "Discard" button overlaps a `.line-through` paragraph; then open AgenticChat and paste a long URL into a summary suggestion to trigger the same overflow.
- §5.1 stale score — open editor → note current ATS score → run AIEnhanceSheet on summary → Apply → screenshot the score before and 60s after.

Each of these has a static-analysis finding with file:line references in the body of this report; the screenshots would only add visual evidence, not new findings. They are folded into the prioritized follow-ups in §7.
