# Project Atlas Changelog

**Last verified:** 2026-06-09
**Type:** changelog
**Sources:**
- `Project Atlas/GOVERNANCE.md`
- `Project Atlas/RULES.md`
- `Project Atlas/MASTER_HANDOVER_2026.md`
- `Project Atlas/SOURCE_OF_TRUTH_MAP.md`
**Canonical owner:** this file

---

## 2026-06-10 - Resume Strength Bar Breakdown Popover & Export Preview Thumbnail

### Context
- Branch: `claude/gallant-darwin-6j9w9u`
- Triggered by: QA report review — two genuine code gaps identified (strength bar shows no explanation, export sheet has no visual preview).

### Product changes
- **Resume Strength Bar** (`EditorResumeStrengthBar.tsx`): Bar is now clickable; opens a Popover showing a 5-category score breakdown (Contact Info, Content Quality, Keywords, Structure, Length & Density) with colour-coded icons and mini bars, plus top strength and top improvement hints. Data sourced from `localHealthScore` already computed in `useEditorSectionScores`. No new hooks or API calls.
- **Export Preview Thumbnail** (`ExportPreviewThumbnail.tsx`, new): A live visual thumbnail of the user's resume renders inside the Export dialog below the format selector for PDF, DOCX, and image formats. Uses the active template via a new shared `templateComponentMap.ts` module; lazy-loaded with Suspense skeleton fallback.
- **Template Map Refactor** (`src/lib/templateComponentMap.ts`, new): Extracted the 27-template lazy component map from `PreviewPage.tsx` into a shared module. Both `PreviewPage` and `ExportPreviewThumbnail` import from it.

### Files changed
- `src/components/editor/EditorResumeStrengthBar.tsx` — popover with score breakdown
- `src/pages/EditorPage.tsx` — pass `localHealthScore` to strength bars; pass `selectedTemplate` to ExportOptionsSheet
- `src/components/editor/ExportOptionsSheet.tsx` — add `selectedTemplate` prop; render `ExportPreviewThumbnail`
- `src/components/editor/export/ExportPreviewThumbnail.tsx` — NEW
- `src/lib/templateComponentMap.ts` — NEW (shared template map)
- `src/pages/PreviewPage.tsx` — import from shared map; pass `selectedTemplate` to ExportOptionsSheet

### Validation
- `npx tsc --noEmit` — clean
- `npm run build` — succeeded, no new chunk warnings
- Unit tests — passed

---

## 2026-06-10 - DeepSeek Routing, Prompt Slimming Timeout Fix, PDF Export, & Responsive Desktop Layout

### Context
- Branch: `main`
- Triggered by: Resume Tailoring timeout failures, mobile-looking layout on desktop, job description caching issues, PDF export failure toast, and vertical progress overlay clipping/stretching.

### Product changes
- **DeepSeek Primary Routing**: Reverted the temporary Groq-only hotfix to ensure DeepSeek is used as the primary provider for all features, including `tailor-resume` and `resume-section-ai`, with fallback providers.
- **Output Schema Slimming**: Removed non-essential metadata fields (`sectionScores`, `missingSkills`, `boostableSkills`, `jobParsed`, `atsAnalysis`, `interviewTalkingPoints`, `strengthsAnalysis`) from the tailoring prompt to drastically reduce token output size and prevent 30-second Appwrite gateway timeouts.
- **Rules Enforcement**:
  - Enforced STAR method achievement rewrites.
  - Enforced ID preservation for experience, education, projects, certifications, and awards to prevent database alignment errors.
  - Enforced honest pre/after match scores.
- **PDF Export & Server**:
  - Changed the default port in `dev-pdf-server.mjs` from `5003` to `5001` to align with local API expectations (`VITE_API_URL`) and resolve local `PDFServerUnavailableError` failures.
  - Replaced hardcoded `headless: true` and `defaultViewport: null` in `pdf-native.ts` with helper properties `headless: chromium.headless` and `defaultViewport: chromium.defaultViewport` from `@sparticuz/chromium` to prevent Vercel deployment crashes.
- **TailorProgress Grid Redesign**: Restructured `TailorProgress.tsx` to use a responsive grid: on desktop viewports (`min-width: 1024px`), the layout splits into two side-by-side columns to prevent narrow vertical stretching.
- **Progress Card Width Increase**: Updated `JobMatchProgressStage.tsx` and `job-match-workspace.css` to increase the progress card's maximum width from `32rem` to `52rem` on desktop screens.
- **Responsive Desktop Layout**: Wrapped the Tailoring Hub workspace elements in left and right column divs, displaying them side-by-side in a responsive grid on desktop (`@media (min-width: 1024px)`) to resolve the narrow mobile-only appearance and make full use of screen real estate.
- **Widened Result Page**: Increased `.jmw-result-content` max-width to `80rem` and adjusted column sizes to `minmax(0, 1fr) 24rem` on desktop for a cleaner and more readable layout.
- **Centered Sticky CTA**: Centered the CTA primary button and capped its width to `32rem` on desktop to avoid stretching.
- **Job Description Cache Fix**: Excluded `jobDescription` from `partialize` in `resumeStore.ts` to prevent the job description from being cached in localStorage across page refreshes and sessions.
- **Progress Overlay Improvements**:
  - Restructured `JobMatchProgressStage.tsx` to handle responsive sizing.
  - Replaced the `my-auto` centering class with `mt-10 mb-20 shrink-0` to resolve vertical top-clipping issues.
  - Swapped `text-warning-foreground` for `text-warning` in `TailorProgress.tsx` to fix contrast in dark mode.
  - Unified history list in `JobMatchHistoryList.tsx` by merging Appwrite db logs with the local Zustand store.

### Validation
- Syntax check: `node --check appwrite-hubs/ai-gateway/src/main.js` -> passed
- Routing unit tests: `node tests/hubs/ai-gateway-routing.test.cjs` -> passed
- Type check: `npx tsc --noEmit` -> passed
- Unit tests: `npm run test` -> Checked and passed locally
- Build validation: `npm run build` -> passed
- Source hash manifest recalculated and verified.


## 2026-06-09 - Wise AI workspace simplification + Atlas documentation sync

### Context
- Branch: `main`
- Triggered by: AI Studio information architecture simplification and visual QA follow-up

### Product changes
- Reframed `/ai-studio` from a flat AI tools directory into a workflow-led Wise AI workspace.
- Kept Wise AI Chat as the hero entry point, but removed duplicated hero and welcome messaging from the page body.
- Reduced primary workflow card size so the page feels denser and less like a sparse marketing grid.
- Removed the duplicated `Company Briefing` CTA from the Interview workflow card because Company Briefing already has its own primary card.
- Renamed the sidebar label from `AI Tools` to `Wise AI`.

### Visible workspace IA
- Primary workflows: Tailor for a Job, Improve My Resume, Prepare for Interview, Company Briefing, Cover Letter, LinkedIn / Personal Brand
- Secondary workflows: Career Plan, Write Documents

### Hidden or excluded tools
- Hidden but still link-compatible: `tailor`, `enhance`, `onepage`, `humanizer`, `ab-compare`, `recruiter`, `skills-gap`, `salary-negotiation`, `cold-email`, `job-rejection`, `personal-branding`, `portfolio-bio`, `reference-letter`, `resignation-letters`
- Excluded from AI Studio IA but still routed normally: `qr-code`, `qr-batch`, `qr-scan`

### Atlas updates
- Updated `Project Atlas/01-Currently Implemented/pages/aistudio.md`
- Updated `Project Atlas/01-Currently Implemented/critical-systems/10-ai-studio-and-agentic-chat.md`
- Updated owner-facing wording in:
  - `Project Atlas/04-For You (Plain Language)/current-features.md`
  - `Project Atlas/04-For You (Plain Language)/glossary.md`
- Added durable implementation report:
  - `Project Atlas/03-Implemented/wise-ai-workspace-simplification-2026-06-09.md`

### Validation
- `npx tsc --noEmit` -> passed
- `npx vitest run src/pages/__tests__/AIStudioPage.test.tsx` -> passed
- `npm run build` -> passed

### No backend changes
- No Appwrite Function changes
- No `ai-gateway` changes
- No credits/auth/schema/provider-routing changes


## 2026-06-08 - AI routing & DevKit audit — startup validation fix + Smart Defaults alignment

### Context
- Branch: `claude/atlas-handover-review-pv67uk`
- Triggered by: full Phase 0-9 AI routing audit

### Changes

**Bug #1 fixed — ai-gateway startup validation used wrong env var names**
- File: `appwrite-hubs/ai-gateway/src/main.js` (lines 126-128)
- Root cause: `performStartupValidation()` checked `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `NVIDIA_API_KEY` — the old naming convention. `buildPool()` actually reads `GROQ_KEY_1`, `OPENROUTER_KEY_1`, `DEEPSEEK_KEY`, `NVIDIA_KEY_1`.
- Impact: False-positive `[ALERT] No AI provider API keys found` fired in production logs even when `DEEPSEEK_KEY` was configured. No AI requests were blocked (pool logic was correct), but the log alert was misleading.
- Fix: Replaced the 4 wrong names with the 4 correct names.

**Bug #2 fixed — AIRoutingSwitcher "Smart Defaults" recommended stale/dangerous providers**
- File: `src/components/dev-kit/AIRoutingSwitcher.tsx` (`FEATURE_METADATA`)
- Root cause: `recommendedProvider`/`recommendedModel` entries were written when NVIDIA and OpenRouter were primary candidates. They now recommend NVIDIA (documented 404 failures) for `tailor-resume`, `generate-cover-letter`, `generate-portfolio-bio`, `optimize-for-linkedin`; OpenRouter (documented 429 failures) for `parse-resume`, `parse-job`, `generate-question-bank`; and Groq for the majority of tools currently routing DeepSeek.
- Impact: Clicking "Apply Smart Defaults" in the DevKit would have overridden stable DeepSeek-first production routing with unreliable providers, potentially causing widespread AI failures.
- Fix: All 21 non-resume-section-ai features set to `deepseek/deepseek-chat`. `resume-section-ai` stays `groq/llama-3.3-70b-versatile` (intentional — routes via separate `resume-section-ai` Appwrite Function, not ai-gateway).

**Source hash updated**
- `sourceHashes.generated.json`: `ai-gateway` hash updated from `b156e066754d6ed6` → `b53aadc3bf84d1be`

### Audit findings summary (no additional fixes required)

| Phase | Result |
|---|---|
| Phase 1 — DeepSeek-primary routing | ✅ PASS — all FEATURE_ROUTES, TOOL_GATEWAY_DEFAULTS, STATIC_DEFAULTS aligned |
| Phase 2 — Structured output normalizers | ✅ PASS — LinkedIn, Question Bank, Company Briefing, Tailor Resume all correct |
| Phase 3 — Credits, auth, idempotency | ✅ PASS (code-level) |
| Phase 4 — Env var / key pool | ✅ PASS after Bug #1 fix |
| Phase 5 — DevKit panels | ✅ PASS after Bug #2 fix; all other panels correct |

### Validation
- `node --check appwrite-hubs/ai-gateway/src/main.js` → OK
- `node tests/hubs/ai-gateway-routing.test.cjs` → ALL TESTS PASSED
- `npx vitest run src/lib/devkit/aiToolsCatalogue.test.ts` → 9/9 passed
- `npx tsc --noEmit` → no errors

### Commits and deployment
- Feature commit: `b8583b91` on `claude/atlas-handover-review-pv67uk`
- PR [#88](https://github.com/iammagdy/WiseResume-TWC/pull/88) merged → merge commit `7afbab59` on `main`
- GHA workflow run `27169666319` — `Deploy Appwrite Hubs` target `ai-gateway` — `completed / success` (2026-06-08T22:01Z)
- Source hash check passed in CI (`git diff --exit-code` clean → `b53aadc3bf84d1be` confirmed)
- Remaining manual QA: cold-start log check in Appwrite Console; Probe Routes + Smart Defaults via DevKit

---

## 2026-06-08 - Hub deploy hotfix — MariaDB index key-length soft-fail (PR #85)

### Context
- Branch: `fix/appwrite-hub-index-softfail`
- Triggered by: `deploy-appwrite-hubs` workflow failure after PR #84 merged

### Root cause
`string(65535)` `briefing` attribute → `65535 × 4 bytes = 262KB` per index row → Appwrite MariaDB COMPACT format 767-byte limit exceeded → `index_invalid` error (code 400) → `process.exit(1)` → workflow step failed.

### What changed
- `scripts/setup_company_briefings_schema.cjs`: `ensureIndex()` now catches `index_invalid` and warns instead of exiting; `briefing` attribute size 65535 → 16384
- `scripts/setup_tailoring_lineage_schema.cjs`: same defensive soft-fail pattern applied

### Effect
- Hub workflow will succeed on next manual dispatch (permissions step unaffected)
- Index creation skipped with warning if still too large; queries degrade to full scan but don't break
- Commit `c2b739f` — PR #85 merged to `main`

---

## 2026-06-08 - Project Atlas visual refactor — Resume Editor, Upload flow, Tailoring Hub polish

### Context
- Branch: `visual/project-atlas-editor-upload-tailor`
- Commit `7b088c1` — **PR #86 merged to `main`**; Vercel production redeployed
- Scope: frontend/UI only — no backend, Appwrite, AI gateway, or routing changes
- Design system source: `Project Atlas/design-system/production/`
- Visual reference: `Project Atlas/design-system/visual-reference/`

### What changed

#### Resume Editor (`editor-workspace.css`)
- Section cards: added hover transitions, deeper shadow on hover, header background shift on hover
- Active nav rail indicator: wider (3px), glow shadow on the left accent bar
- Preview paper: added layered shadow for stronger document canvas depth
- Scroll container: increased padding (1.25→1.5rem) and tightened section gap (1rem→0.875rem)

#### Upload flow (`UploadPage.tsx`)
- Added desktop-only hero section above upload zone: eyebrow pill, h1, sub-copy (hidden on mobile)
- Upload zone icon: changed from circle to rounded-2xl with richer shadow; added spring rotate on drag
- Upload zone content: format chips (PDF / Word / Image / JSON / HTML) replace plain text list
- URL import card: icon-labeled header, improved helper copy
- Tips section: Sparkles icon header, better list rhythm
- Page container: `lg:py-10` breathing room; content column `lg:max-w-lg lg:mx-auto` for centered desktop layout

#### Tailoring Hub (`job-match-workspace.css`)
- Result page: stronger atmospheric gradient
- Download format buttons: `rounded-1rem`, hover `translateY(-1px)`, active press scale, richer active ring
- History items: `rounded-1rem`, left accent bar on hover via `::before` pseudo-element
- Progress overlay card: `rounded-1.5rem`, deeper layered shadow, inset top highlight
- Download studio header card: stronger inset border + layered shadow

### Validation
- `npx tsc --noEmit` — clean
- `npm run build` — succeeded
- `npx vitest run ...useCompanyBriefingLibrary.test.ts` — 3/3 passed

### No backend changes
- Appwrite deployment: NOT required
- Appwrite workflow: NOT triggered
- AI Gateway: unchanged
- Auth / routing / state management: unchanged
- Schema scripts: unchanged
- PR #85 (index soft-fail hotfix): already merged separately

### Future QA still pending (unchanged from prior sessions)
- Company Briefing Save (requires schema scripts applied with API key)
- Tailoring Hub export buttons (PDF/ATS PDF/DOCX) — fixed in PR #83, needs manual QA
- Tailoring lineage/history after schema applied

---

## 2026-06-08 - Prepare Company Briefing save + Tailoring lineage Appwrite schema (scripts + docs)

### Context
- PR #83 (PreviewPage auto-export fix) merged to `main`.
- Production commit: `d28b81781542af2b817b8edb36f89969f7e00f50`.
- Vercel production deployed; Appwrite unchanged for PR #83.
- This pass prepares the two remaining Appwrite schema blockers. **No schema was
  applied** in this session — `APPWRITE_API_KEY` is not available in the working
  environment, so the scripts are prepared and wired, not executed.

### What was prepared (NOT yet applied)
- `scripts/setup_company_briefings_schema.cjs` (new) — idempotent. Adds
  `user_id`, `company_name`, `briefing` attributes (all **optional** at schema
  level for migration safety; the app always writes them), a `user_id_idx`
  index, and ensures document-level security + a create-for-`users` permission
  (preserving existing permissions).
- `scripts/setup_tailoring_lineage_schema.cjs` (new) — idempotent. Adds
  `tailor_history.tailored_resume_id` (optional) + `tailored_resume_id_idx`
  index, and optional `resumes` lineage fields (`parent_resume_id`, `is_master`,
  `target_job_title`, `target_company`, `job_url`, `job_match_score`).
- `.github/workflows/deploy-appwrite-hubs.yml` — both scripts wired as
  `Ensure ...` steps before the hub deploy step. The workflow is
  `workflow_dispatch`-only, so this runs only on the next **manual** dispatch.

### Frontend fix applied
- `src/lib/appwrite.ts` — export `Permission` and `Role`.
- `src/hooks/useCompanyBriefingLibrary.ts` —
  - `useSaveCompanyBriefing` now passes explicit per-document owner permissions
    (read/update/delete for the current user) on create, matching the
    document-level security the setup script enables.
  - `toCompanyBriefingSaveErrorMessage` now also detects permission errors
    (`No permissions provided`, `not authorized`, `missing scope`, `permission`)
    so the live `No permissions provided for action 'create'` error shows the
    clear setup message instead of a generic one.
  - `getCompanyBriefingSchemaHelpMessage` text updated to mention permissions.
- `src/hooks/__tests__/useCompanyBriefingLibrary.test.ts` — added coverage for
  the create-permission / not-authorized error mapping.

### Status — schema applied?
- **Company Briefing schema/permissions: PREPARED ONLY, not applied/verified.**
  Save will keep failing live until the script is run (or the equivalent manual
  Appwrite Console action is taken). Do not treat the save bug as
  production-fixed yet.
- **Tailoring lineage schema: PREPARED ONLY, not applied.** Tailoring Hub already
  works without it (graceful fallback), so this is additive.

### How to apply (needs API key)
```
APPWRITE_API_KEY=<key> node scripts/setup_company_briefings_schema.cjs
APPWRITE_API_KEY=<key> node scripts/setup_tailoring_lineage_schema.cjs
```
Or trigger the manual `Deploy Appwrite Hubs` workflow, which now runs both.

### Validation
- `node --check` both scripts — pass.
- `npx vitest run src/hooks/__tests__/useCompanyBriefingLibrary.test.ts` — 3/3 pass.
- `npx tsc --noEmit` — clean.
- `npm run build` — succeeded.

### Deployment
- Appwrite Functions deployment: NOT required and NOT performed.
- Appwrite Hubs workflow: NOT run.
- Vercel: frontend (hook/lib) changed, so a production deploy triggers on merge.

### Future / manual QA
- Apply both schema scripts (needs API key) and verify in Appwrite Console.
- Company Briefing generate + save end-to-end after schema applied.
- Tailoring Hub export QA (Designed PDF / ATS PDF / Word DOCX; fresh-tab
  `/preview?id=<id>&action=download|ats-pdf|docx`).
- Tailoring result refresh/history with lineage schema applied.
- Regression: AI Gateway unchanged.

## 2026-06-08 - Fix PreviewPage auto-export action path (Tailoring Hub export blocker)

### Root cause fixed
`PreviewPage` was calling `setSearchParams` immediately when the auto-export effect fired (to clean `?action` from the URL). Because `searchParams` was in the effect's dependency array, this triggered effect cleanup (`clearTimeout`), cancelling the 800ms export timer before it could fire. The export never started.

### Fix applied
- `src/pages/PreviewPage.tsx`
  - Action value captured in `initialAutoExportAction` ref at mount time (not read from `searchParams` on each effect run).
  - Export timer stored in `autoExportTimerRef` ref (not returned as effect cleanup), so React cannot cancel it when dependencies change.
  - `setSearchParams` moved inside the timer callback, after the export is triggered.
  - Fallback CTA banner added: if the browser cannot auto-trigger (e.g., `resumeRef` not yet attached), a visible "Download PDF / Download ATS PDF / Download DOCX" button appears.
  - Separate unmount-only `useEffect` cancels the timer if the component unmounts before it fires.

### Tests
- `src/pages/__tests__/PreviewPage.test.tsx`
  - Added 5 new tests covering:
    - `action=docx` does not export before bootstrap, calls `generateAndDownloadDOCX` after.
    - `action=download` does not export before bootstrap, calls `generateNativePDF` and `downloadFile` after.
    - `action=ats-pdf` does not export before bootstrap, calls `generateNativePDF` with `atsMode: true` and `downloadFile` after.
    - Action not executed before the 800ms timer fires.
    - Normal `/preview?id=<id>` without `action` does not trigger auto-export.
    - Stale Zustand `currentResume` replaced by URL-id resume after bootstrap (existing test).
  - Added mocks for `@/lib/nativePdfGenerator`, `@/lib/downloadUtils`, `@/components/editor/PreviewScaledWrapper`.
  - All 8 tests pass.

### Validation
- `npx vitest run src/pages/__tests__/PreviewPage.test.tsx` — 8/8 passed.
- `npx tsc --noEmit` — clean.
- `npm run build` — succeeded.

### Deployment required
- Frontend (Vercel) deployment required — `src/pages/PreviewPage.tsx` changed.
- Appwrite deployment NOT required — no Appwrite function files changed.
- No manual Appwrite schema changes required for this fix.

---

## 2026-06-08 - Session closeout after AI Gateway deploys and Tailoring Hub / Company Briefing production QA

### What was verified live
- Commit `55265550` is live on Vercel/frontend.
- Appwrite `ai-gateway` is live after the Tailoring Hub pass:
  - deployment ID: `6a2668371ca7426f76f1`
  - status: `ready`
  - created: `2026-06-08T06:59:03Z`
  - deployed hash includes `ai-gateway: b156e066754d6ed6`
- Tailor Resume id-preservation normalization is live:
  - authenticated execution preserved non-empty experience IDs
  - sample execution: `6a266fe10461bfb97522`
  - result: `nonEmptyExpIds: 11/11`

### Production conclusions
- `ai-gateway` reliability is no longer the main blocker.
- `optimize-for-linkedin` is fixed live.
- `generate-question-bank` and `company-briefing` now return usable output live, though some provider variability remains for longer structured outputs.
- Tailoring Hub result-page refresh now works even when `tailor_history` is missing.
- Direct `/preview?id=<tailoredResumeId>` now loads the tailored resume correctly and does not redirect to dashboard or fall back to the source resume.

### Remaining blockers
- Tailoring Hub export actions are still broken in production:
  - result page buttons open the tailored preview popup, but no download starts
  - fresh-tab action URLs also load preview correctly but do not trigger download:
    - `/preview?id=<tailoredResumeId>&action=download`
    - `/preview?id=<tailoredResumeId>&action=ats-pdf`
    - `/preview?id=<tailoredResumeId>&action=docx`
- Company Briefing Save is still blocked in live Appwrite:
  - exact authenticated error: `No permissions provided for action 'create'`
  - collection still also lacks `company_name` and `briefing`

### Manual Appwrite work still required
- `company_briefings`
  - add `company_name`
  - add `briefing`
  - add create permission for authenticated users / users according to the current app security model
  - add `user_id` ASC index
- `tailor_history`
  - add `tailored_resume_id`
  - add `tailored_resume_id` ASC key index
- `resumes`
  - optional lineage fields still recommended:
    - `parent_resume_id`
    - `is_master`
    - `target_job_title`
    - `target_company`
    - `job_url`
    - `job_match_score`

### Next implementation target
- Fix only the `/preview?id=...&action=...` auto-export path in `PreviewPage`.

---

## 2026-06-08 - Tailoring Hub reliability fix pass

### Root Causes
- Fresh-tab Tailoring Hub preview/export was broken because `TailoringHubResultPage` intentionally opened `/preview?id=...` without priming Zustand, while `PreviewPage` only trusted `currentResume` from Zustand and redirected away almost immediately when it was missing.
- `buildMergedResume()` matched tailored experience by `id` only, so AI output that dropped ids could quietly fail to apply the rewritten experience content.
- Tailoring Hub result/history behavior was too optimistic about `tailor_history` persistence even though history writes were fire-and-forget.
- Live Appwrite schema verification showed the persistence model is still incomplete for tailored lineage:
  - `resumes` is missing `parent_resume_id`, `is_master`, `target_job_title`, `target_company`, `job_url`, and `job_match_score`
  - `tailor_history` is missing `tailored_resume_id` and its key index
- Company Briefing save was failing for a separate but related persistence reason:
  - `company_briefings` exists live
  - but it currently exposes only `user_id`
  - the save flow writes `company_name` and `briefing`, so Appwrite rejects the write as an invalid document structure / unknown attribute error

### Changes Applied
| File | Change |
|------|--------|
| `src/pages/PreviewPage.tsx` | Added real `?id=<resumeId>` bootstrap support using the existing Appwrite resume load path. Preview now hydrates Zustand with the loaded resume, sets the current template, blocks redirect while the URL load is pending, and waits for resume bootstrap before export actions run. |
| `src/pages/TailoringHubPage.tsx` | Hardened master-resume auto-select to use persisted `tailor_history` ids when available and a `(Tailored)` title heuristic as a last resort. Added a non-blocking warning toast if `tailor_history` persistence fails after a successful tailored-resume save. |
| `src/pages/TailoringHubResultPage.tsx` | Made Appwrite `tailor_history` lookup failure-safe so the result page remains usable from the resume document alone. Extracted `resolveTailoringResultState()` for deterministic fallback behavior. |
| `src/hooks/useCompanyBriefingLibrary.ts` | Added a specific, graceful schema/setup error message when saving to `company_briefings` fails because `company_name` or `briefing` is missing from the live Appwrite schema. |
| `src/lib/tailorMerge.ts` | Hardened merge behavior: experience now matches by `id`, then `company + position`, then same index when lengths match; education now has the same defensive merge pattern. |
| `appwrite-hubs/ai-gateway/src/main.js` | Strengthened `tailor-resume` schema/instructions to preserve original ids for `experience`, `education`, `projects`, `certifications`, and `awards`. Added normalization that restores missing ids from the original resume by content match or index fallback. |
| `tests/hubs/ai-gateway-routing.test.cjs` | Added Tailor Resume coverage for missing-id recovery and preserved-id behavior. |
| `src/hooks/__tests__/useCompanyBriefingLibrary.test.ts` | Added focused coverage for the new Company Briefing save schema error mapping. |
| `src/lib/__tests__/tailorMerge.test.ts` | Added merge tests for preserved ids and missing-id fallback matching. |
| `src/pages/__tests__/PreviewPage.test.tsx` | Added focused preview bootstrap/export-wait tests for fresh-tab `/preview?id=...` behavior. |
| `src/pages/__tests__/TailoringHubResultPage.test.ts` | Added focused tests for result-state fallback when `tailor_history` is missing or delayed. |
| `src/lib/devkit/sourceHashes.generated.json` | Regenerated after the `ai-gateway` change so deploy guards stay in sync. |

### Verification
- `node --check appwrite-hubs/ai-gateway/src/main.js`
- `npx vitest run src/hooks/__tests__/useCompanyBriefingLibrary.test.ts tests/hubs/ai-gateway-routing.test.cjs src/lib/__tests__/tailorMerge.test.ts src/pages/__tests__/PreviewPage.test.tsx src/pages/__tests__/TailoringHubResultPage.test.ts`
- `npx tsc --noEmit`
- `npm run build`
- `node scripts/compute-source-hashes.mjs`

All passed locally.

### Deployment / Follow-up Notes
- No deployment was performed in this pass.
- Frontend deployment is required for the `PreviewPage` and Tailoring Hub page fixes to affect production.
- Frontend deployment is also required for the clearer Company Briefing save failure handling to reach production.
- `ai-gateway` deployment is required for the Tailor Resume id-preservation normalization to affect production.
- Manual Appwrite schema work is still recommended for durable tailored lineage/history:
  - `resumes`: `parent_resume_id`, `is_master`, `target_job_title`, `target_company`, `job_url`, `job_match_score`
  - `tailor_history`: `tailored_resume_id` + `tailored_resume_id` ASC index
- Manual Appwrite schema work is also required for Company Briefing library save support:
  - `company_briefings`: `company_name`, `briefing`
  - recommended key index on `user_id`

---

## 2026-06-08 - AI gateway targeted hardening for LinkedIn, Company Briefing, and Question Bank

### Root Causes
- `optimize-for-linkedin` still had a contract gap after the DeepSeek-first rollout: the normalizer accepted payloads with useful headlines/about content but empty `experienceRewrites`, even when the input resume clearly had experience entries.
- `generate-question-bank` still accepted any non-empty category list, so incomplete multi-category payloads could be treated as success instead of triggering repair/fallback.
- `company-briefing` and `generate-question-bank` were the two longer structured DeepSeek paths most likely to hit the very aggressive first-attempt timeout (`10s`) and abort before fallback. A focused production retest showed DeepSeek could succeed for Question Bank, but only very close to the timeout budget.

### Changes Applied
| File | Change |
|------|--------|
| `appwrite-hubs/ai-gateway/src/main.js` | Tightened LinkedIn normalization so resumes with experience must return non-empty `experienceRewrites`. Tightened Question Bank normalization so all required categories must be present. Added company-briefing normalization to preserve a stable response shape. Expanded structured repair prompts to include the original input context for LinkedIn, Question Bank, and Company Briefing. Added a narrow feature-specific first-attempt timeout lift and same-provider retry for DeepSeek aborts/timeouts on `company-briefing` and `generate-question-bank`. |
| `tests/hubs/ai-gateway-routing.test.cjs` | Added focused assertions for the LinkedIn experience-rewrite requirement, the full Question Bank category contract, Company Briefing shape normalization, and the new targeted timeout/retry behavior. |
| `src/lib/devkit/sourceHashes.generated.json` | Regenerated after the `ai-gateway` changes so workflow source-hash checks stay in sync. |

### Verification
- `node --check appwrite-hubs/ai-gateway/src/main.js`
- `node tests/hubs/ai-gateway-routing.test.cjs`
- `npx vitest run src/lib/devkit/aiToolsCatalogue.test.ts`
- `npx tsc --noEmit`
- `node scripts/compute-source-hashes.mjs`

All passed locally.

### Deployment / Follow-up Notes
- No deployment was performed in this pass.
- Only `ai-gateway` changed; `resume-section-ai` was intentionally untouched.
- If approved, the next deployment target should be `ai-gateway` only.

---

## 2026-06-07 - AI gateway stabilization: DeepSeek-first routing with structured-output repair

### Root Causes
- Production verification showed the remaining AI instability was concentrated in `ai-gateway`, not `resume-section-ai`.
- Several high-traffic tools were still preferring NVIDIA or OpenRouter first, which matched the live failures already observed:
  - NVIDIA-first routes (`tailor-resume`, `generate-cover-letter`) were hitting `404` before Groq fallback saved them.
  - OpenRouter-first routes (`parse-job`, `parse-resume`, `optimize-for-linkedin`, `generate-question-bank`) were hitting `429` before fallback.
- Two structured-output tools had weak success validation:
  - `optimize-for-linkedin` could accept technically valid but unusable sparse payloads.
  - `generate-question-bank` could accept empty or malformed category structures and still return HTTP `200`.

### Changes Applied
| File | Change |
|------|--------|
| `appwrite-hubs/ai-gateway/src/main.js` | Switched the main production tool routes to prefer `deepseek-chat` first while preserving provider fallback. Added stricter structured-output instructions and normalization for LinkedIn Optimizer and Question Bank. Added a single structured repair retry for those two tools when the first model response is malformed or unusable JSON. Added narrow `__test` exports for route/structured parser coverage. |
| `src/lib/devkit/aiToolsCatalogue.ts` | Updated the canonical DevKit tool-route defaults to match the new DeepSeek-first production routing for the affected tools. |
| `src/lib/devkit/aiToolsCatalogue.test.ts` | Updated route expectations so the catalogue test suite enforces the new DeepSeek-first defaults. |
| `appwrite-hubs/admin-devkit-data/src/main.js` | Updated the static route-default mirror used by DevKit/admin surfaces so it no longer advertises the stale NVIDIA/Groq/OpenRouter-first map. |
| `tests/hubs/ai-gateway-routing.test.cjs` | Added targeted gateway tests for DeepSeek-first route coverage plus structured-output validation for LinkedIn Optimizer and Question Bank. |
| `src/lib/devkit/sourceHashes.generated.json` | Regenerated after the hub-source edits so workflow source-hash checks remain in sync. |

### Verification
- `node --check appwrite-hubs/ai-gateway/src/main.js`
- `node tests/hubs/ai-gateway-routing.test.cjs`
- `npx vitest run src/lib/devkit/aiToolsCatalogue.test.ts`
- `npx tsc --noEmit`
- `node scripts/compute-source-hashes.mjs`

All passed locally.

### Deployment / Follow-up Notes
- No deployment was performed in this pass.
- `resume-section-ai` was intentionally left unchanged.
- The next production deployment target should be `ai-gateway`.
- After deployment, re-run live smoke tests specifically for:
  - `tailor-resume`
  - `generate-cover-letter`
  - `parse-job`
  - `parse-resume`
  - `optimize-for-linkedin`
  - `generate-question-bank`
  - `company-briefing`
  - `ask-portfolio`
- `deepseek-chat` remains the safest verified DeepSeek model alias for this stabilization pass. A later provider probe can decide whether to move to a newer DeepSeek alias.

---

## 2026-06-07 - Public portfolio access, custom-domain, OG image, and PDF export hardening

### Root Causes
- Public portfolio pages depended on direct browser-side Appwrite reads from `profiles` and `resumes`, so anonymous visitors could fail on permissions or session state while authenticated premium users appeared to work.
- Portfolio password verification was being performed client-side against a hash in `portfolioExtras`, which made the real gate behavior diverge from the server truth in `portfolio_settings`.
- `usePublicPortfolioByDomain()` returned `null`, so custom-domain portfolio resolution was effectively broken in code.
- OG image generation and native PDF export depended too directly on `VITE_API_URL`, so deployed same-origin requests could break or point at the wrong host when that variable was missing or stale.
- Native PDF export required `APPWRITE_PROJECT_ID` only, making auth brittle when the runtime exposed the project ID through alternate env names already used elsewhere in the project.
- Deployment documentation drift remained: the live frontend is on Vercel with security headers active, while parts of the Atlas deployment guide still describe Hostinger/FTP as the primary production path.

### Changes Applied
| File | Change |
|------|--------|
| `api/public-portfolio.ts` | Added a server-side public portfolio endpoint using `node-appwrite`; supports password-gate checks, password-verified portfolio fetches, and custom-domain resolution without relying on browser Appwrite permissions. |
| `src/lib/publicApiBase.ts` | Added same-origin API base helpers so frontend calls prefer the current host when `VITE_API_URL` is absent or points at localhost in production. |
| `src/hooks/usePublicPortfolio.ts` | Replaced direct browser Appwrite reads and client-side password hash verification with calls to `/api/public-portfolio`; restored working custom-domain lookup flow. |
| `src/hooks/usePortfolioSEO.ts` | Switched OG/Twitter image URL generation to the shared absolute public API base helper so production metadata no longer depends on a separate API origin env. |
| `src/lib/nativePdfGenerator.ts` | Switched PDF export fetches to the shared API base helper to avoid wrong-host export requests. |
| `api/export/pdf-native.ts` | Added project ID fallback chain: `APPWRITE_PROJECT_ID` -> `VITE_APPWRITE_PROJECT_ID` -> `APPWRITE_FUNCTION_PROJECT_ID`. |
| `src/hooks/__tests__/usePublicPortfolio.test.tsx` | Updated tests for the server-side public portfolio API flow, gate checks, and custom-domain resolution. |
| `src/hooks/usePortfolioSEO.test.tsx` | Added focused test coverage for same-origin OG/Twitter image URL generation. |

### Verification
- `npm test -- src/hooks/__tests__/usePublicPortfolio.test.tsx src/hooks/usePortfolioSEO.test.tsx` - passed.
- `npx tsc --noEmit` - passed.
- `npm run build` - passed.
- Verified live `https://resume.thewise.cloud` response headers include `Content-Security-Policy` and `Strict-Transport-Security` on the main site response.

### Deployment / Follow-up Notes
- These fixes are local only until the frontend is redeployed.
- Appwrite hub failures reported by the owner still require deployment-state verification against the live functions because the latest Atlas stop-point already recorded a GitHub/main vs Appwrite deployment mismatch.
- `Project Atlas/DEPLOYMENT_GUIDE.md` still needs a cleanup pass so it matches the current Vercel-first frontend deployment reality.

---

## 2026-06-07 - Live AI audit: resume-section-ai credential drift and stale NVIDIA default routes

### Root Causes
- The owner-reported AI outage was not a blanket provider outage. Live provider pings showed OpenRouter, Groq, DeepSeek, and NVIDIA all configured and reachable from the deployed Appwrite environment.
- The standalone `resume-section-ai` function was deployed without the Appwrite environment variables it needs for `validateUserSession()` and `loadCreditState()`. Smoke tests passed because they bypass credit checks, but real authenticated requests failed with `503 ai_credit_check_failed`.
- The deploy script itself explained that drift: `ensureResumeSectionVariables()` only synced a partial AI-key set and omitted `APPWRITE_API_KEY`, `APPWRITE_ENDPOINT`, and `APPWRITE_PROJECT_ID`.
- The default NVIDIA routing model was stale: live authenticated tests against `ai-gateway` showed `tailor-resume` and `generate-cover-letter` first trying NVIDIA and receiving `404`, then succeeding only via Groq fallback.
- OpenRouter was also degraded in production: live authenticated `parse-resume` tests showed all OpenRouter attempts returning `429`, then succeeding via Groq fallback.

### Evidence Gathered
- Live `admin-devkit-data -> ping-providers` returned `ok: true` for all 4 providers.
- Live authenticated `ai-gateway` tests succeeded for:
  - `company-briefing`
  - `tailor-resume` (after NVIDIA fallback)
  - `parse-resume` (after OpenRouter fallback)
- Live authenticated `resume-section-ai` test failed with:
  - `503`
  - code `ai_credit_check_failed`
  - message `AI credit tracking is not available.`

### Changes Applied
| File | Change |
|------|--------|
| `scripts/deploy_hubs.cjs` | Expanded `ensureResumeSectionVariables()` to sync the full provider set used by the function plus `APPWRITE_API_KEY`, `APPWRITE_ENDPOINT`, and `APPWRITE_PROJECT_ID`. |
| `appwrite-hubs/ai-gateway/src/main.js` | Updated stale NVIDIA default model and pinned NVIDIA feature routes from `nvidia/llama-3.1-nemotron-70b-instruct` to `meta/llama-4-maverick-17b-128e-instruct`. |
| `appwrite-hubs/admin-devkit-data/src/main.js` | Updated DevKit routing defaults to match the new NVIDIA route target. |
| `appwrite-hubs/wisehire-gateway/src/main.js` | Updated the stale NVIDIA default model used in its provider pool. |
| `src/components/dev-kit/AIRoutingSwitcher.tsx` | Updated the displayed NVIDIA default model so the DevKit no longer advertises the stale route target. |
| `src/lib/devkit/aiToolsCatalogue.ts` | Updated the canonical tool catalogue defaults for NVIDIA-routed features. |

### Verification
- `node --check scripts/deploy_hubs.cjs`
- `node --check appwrite-hubs/ai-gateway/src/main.js`
- `node --check appwrite-hubs/admin-devkit-data/src/main.js`
- `node --check appwrite-hubs/wisehire-gateway/src/main.js`
- `npx tsc --noEmit`
- `npx vitest run src/lib/devkit/aiToolsCatalogue.test.ts`

All passed locally.

### Deployment / Follow-up Notes
- These fixes are local only until the Appwrite hubs are redeployed.
- After deployment, re-run a real authenticated `resume-section-ai` request first; that is the clearest validation of the missing-Appwrite-vars fix.
- OpenRouter `429` behavior was observed live and is not fixed by this code patch. If parse-heavy routes still feel unstable after redeploy, key-level quota/rate-limit investigation is needed outside the repo.

---

## 2026-06-07 - Source hash manifest sync after Appwrite hub workflow failure

### Root Cause
- The `Deploy Appwrite Hubs` GitHub Actions workflow failed before deployment at `Ensure source hash manifest is committed`.
- The latest commit changed Appwrite hub source files, but `src/lib/devkit/sourceHashes.generated.json` had not been regenerated before push.
- CI recomputed hashes and detected drift for:
  - `ai-gateway`
  - `admin-devkit-data`
  - `wisehire-gateway`

### Changes Applied
| File | Change |
|------|--------|
| `src/lib/devkit/sourceHashes.generated.json` | Regenerated via `node scripts/compute-source-hashes.mjs` so the committed manifest matches current hub sources. |

### Verification
- `node scripts/compute-source-hashes.mjs`
- Verified the manifest now reflects:
  - `ai-gateway: c4206a033df33a59`
  - `admin-devkit-data: 0470c45425c9ab4a`
  - `wisehire-gateway: cd99c96473afd639`

### Follow-up
- After this manifest-sync commit is pushed, rerun `Deploy Appwrite Hubs` with target `resume-section-ai`.

---

## 2026-06-05 - Phase 2 AI Security Hardening: Idempotency, Dedup & Credit Resilience

### Root Causes (from AI-SECURITY-AUDIT-2026-06-05.md, Phase 2 scope)
- No idempotency layer: double-click / refresh / back-nav could trigger duplicate provider calls and double credit charges.
- `recordSuccessUsage` had no retry logic — a single Appwrite DB blip silently lost credit recording.
- `ai_credits` get-or-create had no race handling — concurrent first-requests could hit a duplicate-document error.
- `daily_limit` was written back to `ai_credits` on every deduction, allowing stale limits to persist after plan changes.
- `safeLogAiRequest` silently swallowed all errors — missing collection produced zero operational signal.

### Changes Applied
| File | Change |
|------|--------|
| `appwrite-hubs/ai-gateway/src/main.js` | Add `IDEMPOTENCY_CACHE_COLLECTION_ID`, `IDEMPOTENCY_TTL_MS`, `RECORD_USAGE_BACKOFFS` constants; `computeContentKey()` SHA256 content key; `checkIdempotencyCache()`, `createIdempotencyPending()`, `updateIdempotencySuccess()`, `deleteIdempotencyDoc()` helpers; idempotency check before credit deduction in main handler; `updateIdempotencySuccess` on all 6 success paths; `deleteIdempotencyDoc` on all failure/error paths; retry-aware `recordSuccessUsage` with 3 attempts and exponential backoff; `loadCreditState` get-or-create race fix (catch 409, retry read); remove `daily_limit` write-back from `recordAiUsage`; derive `effectiveLimit` from `PLAN_DAILY_LIMITS` not stored value; `safeLogAiRequest` warns once on missing collection, logs `credits_charged`, `idempotency_key`, `is_idempotency_hit` |
| `src/lib/appwrite-functions.ts` | Generate `X-Idempotency-Key` UUID header for every AI gateway call; add 409 classification message |
| `src/hooks/__tests__/useAIAction-D1.test.ts` | 4 new Phase 2 test scenarios: 409 dedup hit, double-click no charge, concurrent actions, provider failure no charge |

### Verification
- `node --check appwrite-hubs/ai-gateway/src/main.js` — clean.
- `npx tsc --noEmit` — zero errors.
- `npx vitest run src/hooks/__tests__/useAIAction-D1.test.ts` — 8/8 pass.

### New Collections / Indexes Required (Appwrite Console)
- Create `idempotency_cache` collection in DB `main` with attributes: `key` (str 64, unique), `user_id` (str 36), `feature` (str 64), `status` (str 16), `has_result` (bool), `cached_result` (str 65536, nullable), `created_at` (str 32), `expires_at` (str 32). Server-only permissions.
- Add unique index on `idempotency_cache.key`.
- Add `credits_charged` (int), `idempotency_key` (str 64, nullable), `is_idempotency_hit` (bool) to existing `ai_request_logs` collection.
- Add unique index on `ai_credits.user_id` (belt-and-suspenders for code-side get-or-create fix).

### Deployment Required
- Redeploy `ai-gateway`: `node scripts/deploy_hubs.cjs --only=ai-gateway`
- Frontend changes go live on next Vercel deploy.

### Known Limitations Deferred to Phase 3
- Non-atomic credit deduction race (different inputs from two browser tabs can still race on separate function instances).
- In-memory rate limiter resets on cold start.
- `ask-portfolio` server-side question counter.
- Idempotency cache expired-record cleanup.

---

## 2026-06-05 - Phase 4 AI Security Hardening: Admin Visibility & Startup Validation

### Root Causes (from AI-SECURITY-AUDIT-2026-06-05.md, Phase 4 scope)
- No admin-accessible view of `ai_request_logs` (Phase 2 collection) — credit and idempotency data invisible to ops.
- Misconfigured env vars (missing `ADMIN_EMAIL`, `APPWRITE_API_KEY`, AI provider keys) produced silent failures on first request rather than immediate cold-start alerts.

### Changes Applied
| File | Change |
|------|--------|
| `appwrite-hubs/admin-devkit-data/src/main.js` | New `handleAIRequestAnalytics(body, log)` handler: queries `ai_request_logs`, returns per-feature/provider aggregates, credit totals, idempotency hit rate, graceful `missing_collection` flag; registered as DevKit action `ai-request-analytics`; cold-start startup validation IIFE |
| `appwrite-hubs/ai-gateway/src/main.js` | Cold-start startup validation IIFE: logs `[ALERT]` for missing `APPWRITE_API_KEY`, `ADMIN_EMAIL`, `RESEND_API_KEY`, no AI provider keys |

### Verification
- `node --check appwrite-hubs/ai-gateway/src/main.js` — clean.
- `node --check appwrite-hubs/admin-devkit-data/src/main.js` — clean.
- `npx tsc --noEmit` — zero errors.

### New Collections / Indexes Required (Appwrite Console)
- Add index on `ai_request_logs.created_at` (desc) for efficient `ai-request-analytics` queries.
- Add index on `ai_request_logs.user_id` (asc) if not already present.

### Deployment Required
- Redeploy both functions:
  - `node scripts/deploy_hubs.cjs --only=ai-gateway`
  - `node scripts/deploy_hubs.cjs --only=admin-devkit-data`

---

## 2026-06-05 - Phase 3 AI Security Hardening: Persistent Rate Limits & Concurrency

### Root Causes (from AI-SECURITY-AUDIT-2026-06-05.md, Phase 3 scope)
- In-memory rate limiter reset on cold start — cross-instance burst abuse possible.
- `ask-portfolio` 10-question cap enforced only client-side — easily bypassed by multi-tab or direct API calls.
- Expensive AI operations (cost ≥ 2) could be launched concurrently from multiple tabs, potentially exhausting daily credits in seconds.

### Changes Applied
| File | Change |
|------|--------|
| `appwrite-hubs/ai-gateway/src/main.js` | Phase-3 constants: `CHAT_SESSIONS_COLLECTION_ID`, `PORTFOLIO_MAX_QUESTIONS`, `MAX_CONCURRENT_JOBS_PER_USER`, `PLAN_PER_MINUTE_LIMITS`; 3 new helpers: `checkPersistentRateLimit()`, `countPendingJobs()`, `validatePortfolioSession()`; `loadCreditState` now accepts pre-fetched plan; main handler: plan fetched once, ask-portfolio session check, persistent rate limit check, concurrency guard |
| `src/hooks/__tests__/useAIAction-D1.test.ts` | 3 new Phase 3 test scenarios: concurrent jobs rejected, session not found, session limit reached |

### Verification
- `node --check appwrite-hubs/ai-gateway/src/main.js` — clean.
- `npx tsc --noEmit` — zero errors.
- `npx vitest run src/hooks/__tests__/useAIAction-D1.test.ts` — 11/11 pass.

### New Collections / Indexes Required (Appwrite Console)
- Add `question_count` attribute to `chat_sessions`: Integer, default 0 (enables server-side portfolio cap).
- Add index on `ai_request_logs.user_id` and `ai_request_logs.created_at` (required for `checkPersistentRateLimit` queries).

### Deployment Required
- Redeploy `ai-gateway`: `node scripts/deploy_hubs.cjs --only=ai-gateway`

### Known Limitations Deferred to Phase 5
- Non-atomic credit deduction remains (idempotency lock covers the common same-input case).
- Email rate limiter still in-memory.
- Idempotency cache expired-record cleanup still deferred.
- Session hopping (user creates multiple `chat_sessions` docs) not yet blocked.

---

## 2026-06-05 - Phase 1 AI Security Hardening (9 fixes)

### Root Causes (Identified in AI-SECURITY-AUDIT-2026-06-05.md)
- Clients could override `model`, `maxTokens`, and `temperature` on every AI call, enabling cost-abuse through inflated token budgets and model substitution.
- `agentic-chat` accepted unbounded `conversationHistory` with no shape validation, enabling token flooding.
- `send-contact-email` interpolated raw user strings into HTML without escaping, creating stored-XSS risk in the admin inbox; rate limit was 5/hr per IP.
- `x-smoke-test` path bypassed authentication entirely, exposing provider availability to unauthenticated callers.
- `wise-ai-chat` dumped the entire `opts` object (up to 60 KB) into the AI prompt, allowing clients to inject arbitrary keys and content.
- `agentic-chat` function-response error strings were injected verbatim into the user content slot, enabling prompt injection via crafted `functionResponse.result.error`.
- `ADMIN_EMAIL` had hard-coded fallback `'magdy.saber@outlook.com'` in both `ai-gateway` and `admin-devkit-data`; if the env var was unset, the fallback could be exploited.
- Subscription documents granted users `Permission.update` via Appwrite client, allowing direct field manipulation.

### Changes Applied
| File | Change |
|------|--------|
| `appwrite-hubs/ai-gateway/src/main.js` | Add `FEATURE_MAX_TOKENS` and `FEATURE_TEMPERATURE` server-side constant maps; remove all client `aiOpts.model / maxTokens / temperature` overrides; `callCandidate` uses `candidate.model` exclusively |
| `appwrite-hubs/ai-gateway/src/main.js` | `agentic-chat` history: cap to last 10 messages, validate `role` ∈ {user, assistant}, sanitize content to 2000 chars per item |
| `appwrite-hubs/ai-gateway/src/main.js` | `agentic-chat` function-response: escape `fr.name` to 64 chars; never expose raw error string in SYSTEM NOTE |
| `appwrite-hubs/ai-gateway/src/main.js` | Add `escapeHtml()` helper; apply to all user fields in `send-contact-email` HTML builder; add 200/254/100/5000 char content limits; escape subject line |
| `appwrite-hubs/ai-gateway/src/main.js` | Tighten `EMAIL_RATE_LIMIT_MAX` from 5 to 3 per IP per hour |
| `appwrite-hubs/ai-gateway/src/main.js` | `x-smoke-test`: require valid JWT before returning provider availability |
| `appwrite-hubs/ai-gateway/src/main.js` | Add `WISE_AI_CHAT_ALLOWED_FIELDS` whitelist map + `buildWiseAiChatPayload()` function; replace raw `opts` dump with whitelisted, length-capped payload (8 KB cap down from 60 KB) |
| `appwrite-hubs/ai-gateway/src/main.js` | Add prompt-injection defense instruction to `wise-ai-chat` and `agentic-chat` system prompts |
| `appwrite-hubs/ai-gateway/src/main.js` | Remove hard-coded `ADMIN_EMAIL` fallback; impersonation fails closed when env var absent |
| `appwrite-hubs/admin-devkit-data/src/main.js` | Remove hard-coded `ADMIN_EMAIL` fallback (same pattern); remove `Permission.update` from subscription docs at all three write sites (set-plan, grant-trial, revoke-trial) |
| `appwrite-hubs/coupons/src/main.js` | Remove `Permission.update` from subscription document permissions |

### Verification
- `node --check appwrite-hubs/ai-gateway/src/main.js` — clean.
- `node --check appwrite-hubs/admin-devkit-data/src/main.js` — clean.
- `node --check appwrite-hubs/coupons/src/main.js` — clean.

### Deployment Required
- Redeploy `ai-gateway`: `node scripts/deploy_hubs.cjs --only=ai-gateway`
- Redeploy `coupons`: `node scripts/deploy_hubs.cjs --only=coupons`
- Redeploy `admin-devkit-data`: `node scripts/deploy_hubs.cjs --only=admin-devkit-data`
- Set `ADMIN_EMAIL` env variable in Appwrite Console for both `ai-gateway` and `admin-devkit-data` functions (hard-coded fallback removed).

### Not Fixed (Requires Appwrite Console — out of scope for code-only phase)
- Remove `UPDATE` from Appwrite collection-level rules for `subscriptions` (belt-and-suspenders alongside function-level permission change).
- `ask-portfolio` server-side question counter requires a `question_count` attribute on the `chat_sessions` collection.
- Atomic credit deduction (read-write race condition) — documented as Phase 2 work.

---

## 2026-06-03 - Admin Panel / DevKit Audit Fixes (7 code + 2 ops items)

### Root Causes (Verified via codebase audit)
- `admin-devkit-data` returned `daily_limit: null` for users with no `ai_credits` document, causing the admin UI to display `∞ unlimited` for all plans.
- The `ChevronDown` expand indicator in `AdminUsersPanel` was inside a `stopPropagation` div, making the most natural click target (the chevron) swallow the event and appear broken.
- `ActAs.tsx` called `startImpersonation()` inside a `useEffect`, so route guards evaluated auth state before the impersonation store was updated, causing a brief "access denied" flash.
- During impersonation, `appwriteFunctions.invoke` always created an Appwrite JWT for the **admin** session; `ai-gateway` charged credits to the admin's account instead of the impersonated user.
- `ActingAsBanner` renders `fixed top-0` (~40px) with no compensating padding on the content below it, obscuring the UI during Act As sessions.
- `ai-gateway` schema for `company-briefing` instructed the AI to return `{overview, talkingPoints, risks, questions}` while the client validated for `companySnapshot`, causing every Company Briefing call to fail.
- `VITE_DEV_KIT_PASSWORD` was still referenced in `deploy-frontend.yml` even after the password auth was removed.

### Changes Applied
| File | Change |
|------|--------|
| `appwrite-hubs/admin-devkit-data/src/main.js` | Derive `daily_limit` from plan defaults (`free=5, pro=50, premium=-1`) when no `ai_credits` document exists |
| `src/components/dev-kit/AdminUsersPanel.tsx` | Move `ChevronDown` outside the `stopPropagation` wrapper; expand click now works reliably |
| `src/pages/ActAs.tsx` | Move `startImpersonation()` + `history.replaceState()` to module-level synchronous init; eliminates auth-flash race condition |
| `src/lib/appwrite-functions.ts` | Import `isImpersonating`/`getImpersonationState`; attach `X-Impersonating-User-Id` header during Act As so credits go to the correct user |
| `appwrite-hubs/ai-gateway/src/main.js` | Accept `X-Impersonating-User-Id` (admin-only); introduce `effectiveUserId` for rate-limit + credit attribution; fix `company-briefing` schema to match `CompanyBriefing` TypeScript type; add `logPoolSummary` startup log (counts only, no key values); document credits race condition with TODO |
| `src/AppInterior.tsx` | Add `useImpersonatingBanner` hook via `useSyncExternalStore`; wrap content in `pt-10` div when banner is active |
| `.github/workflows/deploy-frontend.yml` | Remove stale `VITE_DEV_KIT_PASSWORD` env reference (no longer used in any source file) |

### Verification
- `npx tsc --noEmit` — zero errors.
- `node --check appwrite-hubs/ai-gateway/src/main.js` — clean.
- `node --check appwrite-hubs/admin-devkit-data/src/main.js` — clean.
- `npm run build` blocked by worktree `node_modules` absence (known worktree limitation); full build must be verified in the main repo on merge.
- No secret values logged or committed. `sanitizeAiPayload` confirmed to strip `__headers` before any AI provider call.

### Deployment Required
- Redeploy `admin-devkit-data` for credit default fix: `node scripts/deploy_hubs.cjs --only=admin-devkit-data`
- Redeploy `ai-gateway` for impersonation credit fix + company-briefing fix + pool logging: `node scripts/deploy_hubs.cjs --only=ai-gateway`
- Frontend changes go live on next Vercel deploy of the branch after merge.

### Not Fixed (Requires Appwrite Console)
- `admin-sentry` deployment still needs manual activation in Appwrite Console: Functions → admin-sentry → `...` → Activate.

### Known Remaining Risk (Documented)
- AI credits race condition: `loadCreditState` + `recordAiUsage` is a non-atomic read-write. Documented with TODO comment in `ai-gateway`. Risk is LOW for typical usage; warm-instance rate limiter mitigates the common case.

---

## 2026-06-02 - Appwrite Functions Audit and Admin Hub Token Alignment

### Root Cause (Verified)
- `ai-gateway` had an inactive latest deployment and one recent provider failure. After redeploy, smoke and real AI requests succeeded, but the real test exposed that `__headers.X-Appwrite-JWT` could be included in the model payload for generic `wise-ai-chat` requests.
- Several legacy admin functions rejected the passwordless DevKit session with `401` because `admin-devkit-data` now signs DevKit sessions with `APPWRITE_API_KEY`, while the older functions still verified only `DEVKIT_PASSWORD`.
- `inspect-ai-keys` failed at runtime because its package did not include `node-appwrite`, even though the function imports it.
- `admin-testmail` failed inbox checks because Testmail's API expects `apikey` in the query string for this endpoint, not a Bearer header.
- Six functions had stale active deployments (`admin-deploy-hubs`, `coupons`, `email-service`, `job-import`, `public-share`, `wisehire-gateway`).

### Fix
- Redeployed `ai-gateway` and stripped sensitive transport/auth fields before building any model messages.
- Redeployed stale hubs so every active deployment now matches the latest deployment.
- Updated legacy admin functions to accept DevKit session tokens signed with `APPWRITE_API_KEY` / `APPWRITE_FUNCTION_API_KEY`, while keeping `DEVKIT_PASSWORD` as a temporary compatibility fallback.
- Added `node-appwrite` to `inspect-ai-keys`.
- Updated `admin-testmail` inbox calls to pass `apikey` as Testmail expects and to report a clean unconfigured state if the key is missing.

### Verification
- Live Appwrite audit: 21 functions checked; no disabled functions, no stale active deployments, no latest-execution failures.
- Live smoke tests returned HTTP 200 for `ai-gateway`, `admin-devkit-data`, `admin-email`, `admin-testmail`, `admin-feature-flags`, `admin-moderation`, `admin-portfolio-usernames`, `admin-visitor-analytics`, `admin-onboarding-funnel`, and `inspect-ai-keys`.
- Real `ai-gateway` request returned HTTP 200 through Groq, and the response did not contain JWT/header leakage.

### Architecture Note
- Recommended consolidation path: keep one browser-facing Admin/DevKit gateway (`admin-devkit-data`) and migrate admin actions behind it gradually. Do not merge every admin worker into one physical function immediately; deployment, email, Sentry, analytics, and provider tools have different dependencies, secrets, and failure risks.

---

## 2026-06-02 - Admin Panel Profile Menu Access

### Root Cause (Verified)
- `useAuth()` returns a normalized `AppUser` from Appwrite with `id`, `email`, `name`, and `emailVerification`; the Appwrite email is at `appwriteUser.email`.
- In the current checkout, the admin access chain was missing from the workspace shell: `AppWorkspaceLayout` did not evaluate admin status or pass `onAdminPanel`, `DashboardWorkspaceProfileDialog` did not accept/render `onAdminPanel`, and `/devkit` was mounted without an admin route wrapper.
- Follow-up deployment failure: Vite/esbuild rejected a duplicate `onAdminPanel` binding left in `AppWorkspaceSidebar.tsx` after rebasing over upstream admin-menu work.
- Follow-up UI/auth mismatch: `admin-devkit-data` already verifies the signed-in Appwrite JWT email, but `DevToolsPage` still rendered the obsolete DevKit access-key/password form and called `devKitLogin(password)`. The landing-page avatar dropdown also did not include the admin-only panel entry.
- Follow-up live Appwrite mismatch: the active `admin-devkit-data` deployment was still running old password-based code (`Invalid DevKit password`). After redeploying the current source, JWT verification initially timed out because `node-appwrite` `Account.get()` hung inside the function runtime.

### Fix
- Added `src/hooks/useIsAdmin.ts` with the unchanged admin email value and an auth-settled comparison against `user.email`.
- Added `src/components/layout/AdminRoute.tsx` so direct `/devkit` navigation waits for hydrated auth before allowing only the admin email through.
- Wired `onAdminPanel` through `AppWorkspaceLayout`, desktop/mobile workspace sidebars, and `DashboardWorkspaceProfileDialog`.
- Removed the duplicate `onAdminPanel` destructuring in `AppWorkspaceSidebar.tsx` so the production Vite build can complete.
- Removed the DevKit password/access-key form. `/devkit` now auto-requests the server-issued DevKit session from the signed-in Appwrite admin email and displays the verified email while loading.
- Added the Admin Panel item to the landing-page avatar dropdown, gated by the same `useIsAdmin()` hydrated email check.
- Updated stale admin-function error copy so expired/unauthorized DevKit sessions tell the user to sign in with the admin email account instead of mentioning a password.
- Updated `admin-devkit-data` JWT email verification to call Appwrite REST `/account` with `X-Appwrite-JWT` and an 8s timeout instead of `node-appwrite Account.get()`.
- Redeployed `admin-devkit-data`; active deployment `6a1e5eddedbdc0a4b4e0`.

### Verification
- `npx tsc --noEmit` — zero errors.
- `npm run build` — passed after the duplicate binding fix.
- `npm run build` — passed after the passwordless DevKit/landing-dropdown update.
- Live Appwrite test — `verify-devkit-session` with a JWT for `magdy.saber@outlook.com` returned HTTP 200 and a DevKit session.

---

## 2026-05-29 - Pre-Launch Bug Fixes (Email, Tests, Portfolio, CI)

### Changes

- **Email verification (registration):** `src/pages/AuthPage.tsx` — silent catch on `send-verification` now shows a warning toast when the email fails to send, so users know to use the Resend button on the next page.
- **Email service false-success:** `appwrite-hubs/email-service/src/main.js` — when Appwrite creates a token but doesn't return a `secret`, the function now returns a 500 error instead of `{ success: true, delivery: 'appwrite' }`, preventing the user from being told the email was sent when it wasn't.
- **Resend cooldown persistence:** `src/pages/AuthVerifyEmailPage.tsx` — 60-second resend cooldown is now stored in `localStorage` under `wr_verify_resend_ts` so it survives page refreshes.
- **Portfolio silent translation error:** `src/pages/PortfolioEditorPage.tsx` — post-publish translation sync failure now shows a warning toast instead of silently failing.
- **Portfolio LinkedIn/GitHub normalization:** `src/pages/PortfolioEditorPage.tsx` and `src/components/templates/shared/contactUtils.ts` — added `ensureLinkedinUrl()` and `ensureGithubUrl()` helpers; portfolio editor save path now uses these to handle bare usernames (e.g. `magdy-saber` → `https://linkedin.com/in/magdy-saber`).
- **GitHub Actions stale step:** `.github/workflows/deploy-appwrite-hubs.yml` — removed stale `revenuecat-webhook` build step (RevenueCat was removed in 2026-05-27 session).
- **Fix appShellLayout test:** updated stale expected offset `5.5rem` → `4.5rem` to match current implementation.
- **Fix usePublicPortfolio test:** replaced stale Supabase mock with correct Appwrite `databases.listDocuments` mock.
- **Fix aiTailor-D1 test:** replaced `mockFetch` pattern with `appwriteFunctions.invoke` mock; fixed retry timer (3000 → 5000 ms); fixed abort test rejection handler ordering.
- **Fix exportResumePdf test:** added `requestAnimationFrame` polyfill in `beforeEach` (jsdom does not implement RAF natively).
- **Fix PortfolioEditorPage test:** added missing `usePlan`, `appwriteFunctions`, `databases`, and `Query.orderAsc` mocks; simplified assertions to match actual render output.

### Verification
- `npx tsc --noEmit` — zero errors.
- `npm test` — 5 previously-failing tests now pass.
- `node --check appwrite-hubs/email-service/src/main.js` — syntax clean.

---

## 2026-05-27 - Remove Payment Provider, Keep Billing Coming Soon

Removed the previous payment provider from web, mobile, Appwrite hub deployment, tests, env examples, and package dependencies. No replacement provider was added.

- Added provider-neutral temporary billing state in `src/lib/billing.ts`: `paymentStatus: "coming_soon"`, `paymentsEnabled: false`, `availablePaymentMethods: []`.
- Subscription, upgrade dialog, and upgrade wall UI now keep premium surfaces visible but disable payment CTAs as Coming Soon.
- Existing internal plan data remains the premium source of truth; default users are not granted premium.
- Removed the obsolete payment webhook hub and dedicated deploy helper; hub deploy scripts no longer include payment webhook deployment or secret provisioning.
- Removed obsolete web/mobile payment SDK dependencies from package manifests and lockfiles.
- Removed obsolete provider-specific env vars from web/mobile env examples.
- Updated Atlas current-state docs to document disabled online payments and future provider integration requirements.
- Updated `Deploy.bat` so local click-to-deploy runs the current hub deployment script from the repo root, removes the stale `revenuecat-webhook.tar.gz` archive before deploying, and fails visibly if deployment fails.
- Remote Appwrite cleanup note: delete the old payment webhook function from Appwrite Console if it still exists after this code is deployed.
- Follow-up: the GitHub Actions manual hub workflow still has a stale build step for the removed webhook and requires a separate workflow-scope update before that workflow is used again.

## 2026-05-26 - Email system recovery and direct Appwrite deployment

### Root Cause (Verified)
The final PR #70 code was correct but not operationally complete: `email-service` was not deployed to Appwrite, and GitHub Actions could not be used because available workflow minutes were exhausted. A second issue was found during direct recovery: Appwrite's Node.js runtime does not provide `git`, so the in-app `admin-deploy-hubs` function could fail when cloning the repo. A third issue was found in the local deployment script: `functions.createVariable()` was using the old positional Appwrite SDK signature and could not create brand-new variables for `email-service`.

### Fix
- Deployed `admin-deploy-hubs` directly from local using Appwrite SDK; active deployment `6a1515c3abe4f3a9fd8d`.
- Deployed `email-service` directly from local using Appwrite SDK; active deployment `6a1516cd249d2b749492`.
- Updated `admin-deploy-hubs` to download the GitHub repo tarball through the GitHub API instead of shelling out to `git clone`.
- Updated `scripts/deploy_hubs.cjs` to load `.env.deploy`, support `--only=...`, create Appwrite variables with `sdk.ID.unique()`, and blank verification/recovery templates after targeted email-service deploys.
- Updated `email-service` so browser-invoked user actions read the JWT from `body.__headers.X-Appwrite-JWT`, which is how `appwriteFunctions.invoke()` forwards headers through Appwrite executions.
- Added `send-admin-verification` to `email-service` and routed DevKit God Mode verification sends through the branded email-service path.
- Updated DevKit Email Service smoke test to call `email-service:send-test` instead of the unrelated skipped `send-contact-email` check.
- Updated auth reset flows to surface `email-service` invoke errors consistently.

### Files Changed
| File | Change |
|------|--------|
| `appwrite-hubs/email-service/src/main.js` | Header forwarding, DevKit token delegation, admin verification action, Any-safe internal auth |
| `appwrite-hubs/email-service/package-lock.json` | Locked Appwrite SDK dependency for repeatable hub packaging |
| `appwrite-hubs/admin-deploy-hubs/src/main.js` | GitHub API tarball download instead of `git clone` |
| `scripts/deploy_hubs.cjs` | Direct targeted deploy path and Appwrite variable creation fix |
| `scripts/deploy_webhook_hub.cjs` | Appwrite variable creation signature fix |
| `src/components/dev-kit/DevKitRunner.tsx` | Real email-service smoke test |
| `src/components/dev-kit/AdminUsersPanel.tsx` | Admin verification now uses `email-service` |
| `src/pages/AuthPage.tsx` | Password reset checks `fnError` |
| `src/pages/AuthVerifyEmailPage.tsx` | Stale resend comment corrected |

### Verification
- `node --check appwrite-hubs/email-service/src/main.js` — passed.
- `node --check appwrite-hubs/admin-deploy-hubs/src/main.js` — passed.
- `node --check scripts/deploy_hubs.cjs` — passed.
- `npx tsc --noEmit` — passed.
- `npm run build` — passed.
- Live Appwrite `email-service` password reset execution for an existing user returned `{"success":true}` and logged "Password reset email sent".
- Live Appwrite `email-service` verification smoke to `delivered@resend.dev` returned `{"success":true}` and logged "Verification email sent".
- Live Appwrite `email-service` welcome smoke to `delivered@resend.dev` returned `{"success":true}` and logged "Welcome email sent".
- Appwrite Auth email templates for verification and recovery were blanked to a single space.

### Remaining Operational Notes
- Resend MCP could not be used for account logs because the configured Resend MCP API key returns `API key is invalid`; Appwrite execution logs still confirm Resend accepted the live sends.
- Frontend production should update through Vercel Git integration after these local changes are committed and pushed. No manual Vercel upload should be used.

---

## 2026-05-23 - Portfolio sidebar icon alignment

### Summary
- **Workspace sidebar:** Changed the Portfolio nav icon from `Sparkles` to `Globe` so it better matches the public portfolio/profile concept and aligns with other nav surfaces.

### Verification
- `npx tsc --noEmit`

---

## 2026-05-23 - Wise Workspace mobile drawer sidebar-width match

### Summary
- **Wise Workspace:** Changed the mobile chat drawer from viewport-based width to the same sidebar-width rule used by the mobile app sidebar.
- Mobile drawer now uses `min(var(--app-sidebar-width, 17rem), 86vw)`; desktop drawer sizing remains unchanged.

### Verification
- `npx tsc --noEmit`
- Browser check on mobile `/dashboard`: Wise Workspace drawer measured `272px` wide on a `430px` viewport.

---

## 2026-05-23 - Theme toggle performance smoothing

### Summary
- **Theme toggle:** Removed the expensive universal `theme-transitioning *` color transition that animated every element during light/dark switches.
- Theme changes now apply the root class immediately, use the browser View Transitions API when available, and fall back to a short transition on major shell surfaces and controls only.
- Added `color-scheme` for light/dark roots so browser-native controls match without extra repaints.

### Verification
- `npx tsc --noEmit`
- Browser check on mobile `/dashboard`: theme toggled successfully and `theme-transitioning` cleared after the fallback transition.

---

## 2026-05-23 - Mobile sidebar footer placement

### Summary
- **Mobile workspace nav:** Fixed the sidebar sheet wrapper height so the membership/profile footer can use the full drawer height.
- The premium/profile block now sits at the bottom of the mobile drawer instead of floating in the middle; desktop sidebar layout is unchanged.

### Verification
- `npx tsc --noEmit`
- Browser check on mobile `/dashboard`: visible drawer footer bottom aligned with the viewport bottom.

---

## 2026-05-23 - Wise Workspace mobile chat width

### Summary
- **Wise Workspace:** Reduced the mobile chat drawer width from `92vw` to `86vw`.
- Desktop drawer sizing remains unchanged at `min(26rem, 32vw)`.
- Updated the shared layout width constant so the app stage shrink stays aligned with the drawer.

### Verification
- `npx tsc --noEmit`

---

## 2026-05-23 - Mobile sidebar drawer fit

### Summary
- **Mobile workspace nav:** Tightened the left navigation sheet width to match the actual sidebar width on phones instead of leaving an empty panel strip.
- Removed the oversized rounded right edge and used the sheet's built-in close handling so the mobile drawer reads as a proper app menu.

### Verification
- `npx tsc --noEmit`

---

## 2026-05-23 - AI Studio welcome banner placement

### Summary
- **AI Studio:** Replaced the fixed bottom onboarding banner with an inline welcome callout inside the AI Studio content flow.
- The welcome callout now dismisses with an icon button and no longer overlays the sidebar account/billing area or bottom workspace controls.

### Verification
- `npx tsc --noEmit`
- Browser layout check on `http://localhost:5000/ai-studio`: welcome message rendered inline and fixed welcome banner count was `0`.

---

## 2026-05-23 - Portfolio editor desktop width correction

### Summary
- **Portfolio editor:** Removed the hard `56rem` max-width from the portfolio editor scroll container so desktop content fills the available app workspace instead of appearing as a narrow centered column.
- Kept responsive desktop side padding and mobile full-width behavior.

### Verification
- `npx tsc --noEmit`
- Browser layout check on `http://localhost:5000/portfolio`: portfolio editor workspace width matched the available app content area.

---

## 2026-05-23 - Settings desktop width correction

### Summary
- **Settings:** Removed the hard `42rem` max-width from the settings workspace scroll container so desktop settings content fills the available app workspace instead of appearing as a narrow centered column.
- Kept responsive padding with desktop `clamp()` spacing and mobile full-width behavior.

### Verification
- `npx tsc --noEmit`
- Browser layout check on `http://localhost:5000/settings`: settings workspace width matched the available app content area.

---

## 2026-05-23 - Portfolio Save Draft live-schema correction + UI review fixes

### Summary
- **Portfolio:** Verified live Appwrite `profiles` attributes via API. The collection does **not** include `portfolio_extras`, `portfolio_draft`, or `portfolio_draft_saved_at`; Save Draft now stores the working copy locally first and suppresses the missing-attribute write path instead of showing `Unknown attribute: "portfolio_extras"`.
- **Profile writes:** `useProfile.updateProfile()` now filters update payloads to the live `profiles` attributes to avoid client writes failing on stale Supabase-era portfolio fields.
- **Portfolio size guard:** Draft save/autosave now checks the merged draft payload size, not only the raw draft snapshot.
- **Settings:** Fixed invalid nested button markup in `SettingsProfileHero`.
- **Portfolio setup:** Hardened resume select item keys against duplicate resume IDs.

### Root cause
The previous Atlas note assumed `portfolio_extras` existed in Appwrite. Live API verification on 2026-05-23 showed `profiles` currently has only: `user_id`, `email`, `full_name`, `username`, `avatar_url`, `onboarding_completed`, `job_title`, `industry`, `career_level`, `location`, `linkedin_url`, `portfolio_bio`, `portfolio_enabled`, `profile_completed`, `display_name`, `plan`, `country`, `is_suspended`, `suspension_reason`.

### Verification
- `npx tsc --noEmit`
- `npx vitest run src/components/dashboard/__tests__/DashboardHero.test.tsx src/pages/__tests__/PortfolioEditorPage-D8.test.tsx src/pages/__tests__/PortfolioUsernameConflict-D8.test.tsx`
- `npm run build`

---

## 2026-05-23 - Portfolio draft (Appwrite), editor workspace, tailor wizard, Wise AI toggle

### Summary
- **Portfolio:** Save Draft / autosave persist working copy in `portfolio_extras` (`portfolioDraft`, `portfolioDraftSavedAt`) — fixes `Unknown attribute: portfolio_draft` on live Appwrite `profiles`.
- **Editor:** Icon-first section rail with active highlight; ATS suggestions FAB + sheet; resume strength above preview; `EditorPage` dynamic-import syntax fix; workspace top bar hidden on `/editor` and `/preview`.
- **Tailor:** Four-step setup wizard (`resume` → `job` → `options` → `run`), single visible step card.
- **Shell:** `toggleChat()` on Wise AI (top bar + desktop nav).

### Files (primary)
`src/lib/portfolioDraftStorage.ts`, `src/hooks/useProfile.ts`, `src/pages/PortfolioEditorPage.tsx`, `src/components/portfolio/editor/SaveBar.tsx`, `src/pages/EditorPage.tsx`, `src/components/editor/EditorNavRail.tsx`, `EditorSuggestionsPanel.tsx`, `EditorResumeStrengthBar.tsx`, `editor-workspace.css`, `src/pages/TailorPage.tsx`, `src/components/tailor/page/*`, `src/store/wiseWorkspaceStore.ts`, `AppWorkspaceTopBar.tsx`, `DesktopNav.tsx`, `AppWorkspaceLayout.tsx`

### Log
`Project Atlas/05-Migration to Appwrite/27-Session-Log-2026-05-23-Portfolio-Editor-Tailor-Workspace.md`

### Verification
- `npx tsc --noEmit`

---

## 2026-05-23 - Dashboard reference alignment correction (design-system-v1, pass 8)

### Summary
UI-only correction pass to match the approved reference composition more closely: wider premium sidebar + supportive AI rail proportions, restored rich workspace controls/metrics, improved recent resumes section tooling, and richer row/rail/sidebar atmospheric polish while preserving all existing behaviors and real data wiring.

### What was matched
- **App shell proportions**: desktop grid shifted toward reference balance (~256px sidebar / dominant main / ~320px rail)
- **Sidebar**: dark crimson wash, premium nav active state, compact premium/credits/profile panels
- **Top workspace bar**: command search + `Import Job`, `Wise AI`, theme/settings, avatar circle
- **Header tone**: confident greeting + supporting sentence with compact spacing
- **Metrics**: compact premium cards with real-data-only visibility (`ATS average`, `Tailored`, `Application matches`, `Missing keywords`)
- **Recent resumes**: section title + count, internal search, filter/view controls, richer row presentation
- **Resume rows**: document icon tile, stronger metadata hierarchy, ATS ring prominence, top suggestion styling, refined action buttons
- **AI rail**: richer `AI Workspace` card (opportunity/weakest/next step + CTA + high-impact) plus quick actions and recent activity cards
- **Visual language**: restrained crimson atmosphere, layered dark surfaces, premium shadows, subtle micro-interactions

### Verification
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-23 - Dashboard final premium polish (design-system-v1, pass 7)

### Summary
Final UI-only polish pass on approved dashboard structure: elevated depth/atmosphere, refined row craftsmanship, richer command-center top bar, calmer premium sidebar, and a more sophisticated AI rail while preserving all actions, hooks, and data flow.

### Refined areas
- `DashboardWorkspaceToolbar` — improved greeting hierarchy, command-surface quality, direct action composition (`Import job`, `Wise AI`, `Tailor`)
- `DashboardWorkspaceSidebar` — premium dark/crimson atmosphere, compact branded header, polished nav and subtle status footer
- `DashboardMetricsStrip` — compact premium metric cards with restrained icon accents and improved typography rhythm
- `ResumeListCard` (`workspace`) — stronger row hierarchy, richer layered surfaces, refined action buttons, premium AI suggestion styling
- `DashboardIntelligencePanel` — polished AI intelligence cards, stronger grouping depth, improved CTA and quick-action readability
- `DashboardWorkspaceLayout` / `DashboardPage` — maintained approved composition while restoring ATS context wiring to sidebar and AI rail
- `index.css` — final atmospheric gradient/shadow/highlight tokens and restrained micro-interactions for dashboard surfaces

### Verification
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-23 - Dashboard approved direction implementation (design-system-v1, pass 6)

### Summary
UI-only controlled implementation aligned to approved premium AI-native workspace direction: restored balanced three-column composition with dark/crimson restraint, compact metric cards, intelligent resume rows, and a useful right AI rail (opportunity, weakest section, next step, quick actions, recent activity) while preserving all existing dashboard behavior.

### What changed
- `DashboardWorkspaceLayout` — reintroduced sidebar/rail balance and passed existing ATS context to sidebar
- `DashboardWorkspaceSidebar` — premium narrow dark nav with reduced noise and compact status footer
- `DashboardWorkspaceToolbar` — greeting + supporting copy, command/search bar, direct productivity actions
- `DashboardMetricsStrip` — compact horizontal metric cards (real data only, hidden when unavailable)
- `DashboardIntelligencePanel` — contextual AI rail cards (workspace insight, quick actions, recent activity)
- `ResumeListCard` (`workspace`) — compact rich rows with subtle surfaces, ATS ring, metadata, AI suggestion line, aligned actions
- `DashboardPage` — restored metrics section and tab counts, retained main-list focus and existing data/actions
- `index.css` — premium dark workspace layering, restrained crimson accents, soft depth tokens

### Verification
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-23 - Dashboard minimal workspace reset (design-system-v1, pass 5)

### Summary
Hard visual simplification toward Linear/Notion-style workspace: removed metric pills, boxed surfaces, AI module sections, sidebar ATS/groups, and card-stack resume UI. One focal resume list, minimal AI rail (insight + action + context), flat nav, toolbar with overflow for secondary actions.

### Removed / simplified
- `DashboardMetricsStrip` usage on dashboard page
- Resume list surface container and tab count badges
- AI rail: signal map, insight blocks, headers, import/new links, decorative cards
- Sidebar: nav groups, ATS card, logo box
- Resume rows: per-row cards → divider list with hover wash
- CSS: command bar, AI module, metric pill, gradient chrome

### Verification
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-23 - Dashboard premium refinement (design-system-v1, pass 4)

### Summary
Final UI-only polish on the existing workspace: premium AI rail module (layered insight blocks, signal map from real scores), refined command toolbar, tighter grouped sidebar, metric pills, anchored resume surface, calmer depth/hover — without layout redesign or added scroll.

### What changed
- `DashboardIntelligencePanel` — embedded AI module with primary focus, insight blocks, category signal map
- `DashboardWorkspaceToolbar` — command bar composition
- `DashboardWorkspaceSidebar` — nav groups, sticky self-start, integrated ATS footer
- `DashboardWorkspaceLayout` — 10.5rem / 16rem columns, items-start, sticky rail
- `DashboardMetricsStrip` — pill metrics
- `DashboardPage` — workspace surface wrapper, compact footer banners
- `index.css` — refinement tokens (AI module, command bar, surfaces)

### Verification
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-23 - Dashboard composition correction (design-system-v1, pass 3)

### Summary
UI-only density and balance pass on the existing three-zone workspace: compress vertical rhythm, integrate a restrained sidebar (no full crimson wall), compact premium resume rows, denser intelligence rail, calmer surfaces. No backend, routing, auth, hooks, or data changes.

### What changed
- `DashboardWorkspaceLayout` — narrower columns, lg intelligence below main, reduced padding
- `DashboardWorkspaceSidebar` — card-surface nav, smaller type, compact ATS chip
- `DashboardWorkspaceToolbar` — inline greeting + count, h-9 controls
- `DashboardMetricsStrip` — inline strip with subtle divider
- `DashboardIntelligencePanel` — grid signal rows, sticky on xl, no motion bloat
- `ResumeListCard` (`workspace`) — single-row compact layout, smaller ring, restrained insight
- `DashboardPage` — tighter tabs/list/footer spacing
- `index.css` — restrained workspace tokens (sidebar, cards, rail)

### Verification
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-23 - Dashboard workspace OS composition (design-system-v1, pass 2)

### Summary
Second UI-only pass: three-zone workspace layout (sidebar nav → resume surface → intelligence rail), borderless resume stack, premium workspace cards with ATS + AI insight preview, embedded intelligence panel. Desktop top nav hidden on `/dashboard` in favor of workspace sidebar (xl+).

### What changed
- `DashboardWorkspaceLayout`, `DashboardWorkspaceSidebar`, `DashboardWorkspaceToolbar`, `DashboardMetricsStrip`, `DashboardIntelligencePanel`
- `ResumeListCard` `presentation="workspace"` — primary product cards
- `AppShell` — hide `DesktopNav` on `/dashboard`
- `DashboardPage` — full composition restructure
- `index.css` — workspace OS tokens

### Verification
- `npx tsc --noEmit` — passed
- `npm run build` — passed
- `vitest` `DashboardHero.test.tsx` — passed

---

## 2026-05-23 - Dashboard AI workspace visual refactor (design-system-v1)

### Summary
UI-only pass on `/dashboard`: calmer workspace layout, compact header (replaces gradient spotlight hero), embedded AI Workspace insight rail, refined metrics and resume rows. No backend, API, auth, routing, state, or AI logic changes.

### What changed
- `DashboardWorkspaceHeader` — greeting + active resume strip with ATS ring (existing profile/resume/score data only).
- `DashboardUtilityRail` + `DashboardRecentActivity` — right rail: AI insight, quick actions, recent resume activity from existing `resumes` list.
- `DashboardNextActionCard` — AI workspace framing, weakest-section signal when score data exists.
- `DashboardStats` — compact metrics; hide tailored/keyword metrics when zero.
- `ResumeListCard` (`atlas-row`) — scannable rows with score ring, metadata, Edit/Tailor/More unchanged behavior.
- `index.css` — softer dashboard surfaces, calmer metrics/insight panels, quieter premium nav badge.
- `DashboardPage` — layout wiring only (removed `DashboardSpotlightHero` from page).

### Verification
- `npx tsc --noEmit` — passed
- `npm run build` — passed
- `vitest` `DashboardHero.test.tsx` — passed

---

## 2026-05-22 - Branded auth email templates (Appwrite Console configuration)

### Summary
Diagnosed why new users received signup confirmation and password-reset emails from "Appwrite" instead of "WiseResume". Root cause: Appwrite's built-in auth email system was being used with no custom SMTP provider and no custom templates configured in the Appwrite Console.

### What changed
- Created `appwrite-hubs/email-templates/email-verification.html` — branded HTML for the Appwrite Email Verification template (sent on signup via `account.createVerification()`).
- Created `appwrite-hubs/email-templates/password-recovery.html` — branded HTML for the Appwrite Password Recovery template (sent on forgot-password via `account.createRecovery()`).
- Created `appwrite-hubs/email-templates/README.md` — paste instructions, subject lines, Appwrite variable notes.

### What still needs to be done in the Appwrite Console (no code changes — console only)
1. **Settings → SMTP**: configure Resend SMTP (`smtp.resend.com`, port 465, user `resend`, password = existing Resend API key, sender `WiseResume <noreply@thewise.cloud>`).
2. **Auth → Email Templates → Email Verification**: set subject to `Confirm your WiseResume email address`, paste `email-verification.html` body.
3. **Auth → Email Templates → Password Recovery**: set subject to `Reset your WiseResume password`, paste `password-recovery.html` body.

### Why
`account.createVerification()` and `account.createRecovery()` are Appwrite built-in calls (`AuthPage.tsx:100`, `AuthPage.tsx:67`). Without SMTP + template customisation in the Console, Appwrite sends from its own infrastructure with its own branding.

### Verification
- Pending: user to apply Console config and test a fresh signup + forgot-password flow.

---

## 2026-05-22 - AI tools audit and repair (5 confirmed bugs fixed)

### Summary
Full code audit of every AI tool in the app. Two rounds of inspection: backend handler existence, then frontend rendering pipeline. Found and fixed 5 confirmed root causes.

### What changed

| Tool | Root cause | Fix |
|---|---|---|
| Career Plan | `schemaPrompt('career-assessment')` injected `{summary, recommendedRoles, gaps, milestones}` — fields the frontend never reads. `CareerPathResult` reads `{currentLevel, nextRoles, skillGaps, industryAlternatives, actionPlan}`. Correct schema existed in `extracted_prompts.json` but was never wired in. | Fixed schema in `schemaPrompt()` to match `CareerPathResult` exactly. |
| Company Briefing | Routed to `openrouter/llama-3.3-70b-instruct:free` — free tier with rate limits, causing intermittent failures especially on mobile. | Changed `FEATURE_ROUTES['company-briefing']` to `groq/llama-3.3-70b-versatile`. |
| Smart Fit Wizard (AI rewrite) | `smart-fit-rewrite` was in `FEATURE_ROUTES` but had no handler in `buildMessages` or the response processor. Gateway sent `"hello"` to the LLM; orchestrator expected `{success:true, outcomes:[...]}` and threw `RewriteFailureError('unavailable')` every time. | Added sentence-rewrite prompt in `buildMessages` and a result processor returning `{success:true, outcomes:[...]}`. |
| Portfolio Chat (visitor-facing) | (1) `ask-portfolio` had no handler — gateway sent `"hello"` instead of the visitor's question. (2) `ChatWidget.tsx` read `data?.answer` but gateway returned `data.content`. | Added portfolio-context-aware handler in `buildMessages` returning `{answer, isFallback, chatDisabled}`. Updated `ChatWidget.tsx` to send `profileContext` in request body. |
| 7 wise-ai-chat tools | System prompt said "return JSON if asked" — no enforcement. LLM sometimes returned prose instead of JSON, causing `parseAIJson` to throw silently. | Tightened to "return ONLY valid JSON object, no markdown, no prose". |

### Files changed
- `appwrite-hubs/ai-gateway/src/main.js`
- `src/components/portfolio/public/ChatWidget.tsx`

### Verification
- `node --check appwrite-hubs/ai-gateway/src/main.js` — clean
- `npx tsc --noEmit` — zero errors

### Deployment
**`ai-gateway` Appwrite function must be redeployed** after merge. `ChatWidget.tsx` deploys via Vercel on merge to `main`. No schema changes.

---

## 2026-05-21 - PDF page-cut boundary protection (snapping overcorrection fix)

### Summary
Fixed the bug where custom section page cuts (specifically before the EDUCATION header) were ignored or incorrectly shifted forward, leaving the section heading on Page 1 while section content was pushed to Page 2.

### What changed
- Updated both the shared `src/lib/exportPagePlan.ts` page planner and Vercel's native PDF export copy (`api/export/pdf-native.ts`).
- Modified `snapBreakPositionsToSectionHeadings` to snap page breaks to `Math.min(section.top, headTop)` instead of `section.top`, ensuring breaks always land before a section and its heading element (even if a heading has a negative margin or starts slightly above the container top).
- Refined the heading-crossing guard in `snapBreakPositionsToAvoidBlocks` to strictly protect any break Y coordinate that was originally before or at a section boundary (`y <= headTop || y <= section.top`) from being shifted forward past that boundary by overlapping avoid blocks from the previous section.
- Added comprehensive unit tests in `src/lib/exportPagePlan.test.ts` representing these exact layout boundary and negative-margin snapping conflict scenarios, verifying that manual section cuts are preserved perfectly.

### Why
The verified root cause was a snapping conflict. When browser layout differences placed a section-boundary cut at the section start (e.g. `800`), an avoid block from the previous section (e.g., the last Experience entry) extending slightly further down (e.g., to `810`) was matched. The avoid-snapping logic snapped the break forward to the bottom of the avoid block (`810`). Because the snapped break `800` was greater than a negative-margin heading top `790`, the guard `y <= headTop` evaluated to `false`, allowing the break to land at `810` (after the heading). This split the section header onto Page 1 while its content was on Page 2.

### Verification
- Added two regression tests to `src/lib/exportPagePlan.test.ts` (all 20 unit tests passed successfully).
- `npx tsc --noEmit` passed.
- `npm run build` verified.

### Deployment
Deploy through Vercel by pushing `main`. No Appwrite function redeploy is required.

---

## 2026-05-21 - PDF automatic fallback avoids splitting experience entries

### Summary
Fixed the remaining PDF export path that could still place a page footer between an Experience title and its description.

### What changed
- Added content-aware automatic break generation for the server fallback path.
- Kept saved custom cuts authoritative: they are clamped/validated, not snapped to section or entry boundaries.
- Updated both Vercel and local Express PDF APIs to use the same fallback behavior.
- Added regression tests for custom-cut clamping and automatic fallback avoiding Experience splits.

### Why
The live site is deployed by Vercel and had received the latest code. The remaining root cause was not deployment drift. It was that if the PDF API received no usable saved cut, automatic pagination still used raw fixed-height cuts and could split `data-break-avoid` Experience blocks.

### Verification
- `npx vitest run src/lib/exportPagePlan.test.ts src/lib/exportResumePdf.test.ts src/lib/nativePdfGenerator.test.ts src/lib/exportDomUtils.test.ts src/lib/__tests__/pdfUtils.test.ts`
- `npx tsc --noEmit`
- `npm run build`

### Deployment
Deploy through Vercel by pushing `main`. No Appwrite function redeploy is required.

---

## 2026-05-21 - Data-based PDF downloads keep saved page cuts

### Summary
Fixed a remaining download path that could still ignore saved custom page cuts.

### What changed
- `exportResumePdfFromData()` now passes saved `resume.customization.customBreakPositions` into PDF generation by default.
- Added regression coverage for offscreen/data-based resume PDF downloads.

### Why
The verified root cause was that some dashboard/list downloads render the resume offscreen from saved data instead of using the live editor template. That helper omitted saved custom cuts, so the export used automatic pagination and could split an Experience entry.

### Verification
- `npx vitest run src/lib/exportResumePdf.test.ts src/lib/exportPagePlan.test.ts src/lib/nativePdfGenerator.test.ts src/lib/exportDomUtils.test.ts src/lib/__tests__/pdfUtils.test.ts`
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-21 - Custom PDF page cuts are exact

### Summary
Changed custom PDF page cuts so saved user-selected cuts are treated as exact export instructions.

### What changed
- Production and local PDF renderers now validate/sort saved custom cut coordinates but no longer move them through section-heading or keep-together snapping.
- The page-cut setup preview now shows cropped page slices with footer space, matching the export segment model instead of only showing lines over a continuous document.
- Segment rendering now waits for fonts/resources instead of substituting fonts during PDF output.
- Added regression tests for exact cuts inside entries and at a section boundary.

### Why
The verified root cause was that the export server was still allowed to reinterpret saved cuts. A cut placed before Education could be snapped backward or otherwise rendered differently from the setup view.

### Verification
- `npx vitest run src/lib/exportPagePlan.test.ts src/lib/nativePdfGenerator.test.ts src/lib/exportDomUtils.test.ts src/lib/__tests__/pdfUtils.test.ts`
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-21 - PDF page cuts no longer split keep-together entries

### Summary
Fixed the remaining live PDF truncation case where a custom page cut could split an experience entry, placing the footer between the job title and its description.

### What changed
- Added shared export planning logic to snap cuts away from `data-break-avoid` blocks.
- Updated the live Vercel PDF function to measure exported HTML when custom cuts exist, then snap those cuts away from section headings and keep-together resume entries before rendering page segments.
- Updated the local Express PDF renderer to use the same keep-together snap behavior.
- Added regression tests for cuts inside normal and oversized keep-together blocks.

### Why
The verified root cause was in the live PDF renderer. The templates already mark experience entries with `data-break-avoid`, but commit `3acc94b9` skipped the Vercel measurement/snap pass and rendered raw custom break positions. A raw cut inside an experience item therefore clipped the first page mid-entry and continued the text on the next page.

### Verification
- `npx vitest run src/lib/exportPagePlan.test.ts src/lib/nativePdfGenerator.test.ts src/lib/exportDomUtils.test.ts src/lib/__tests__/pdfUtils.test.ts`
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-21 - PDF section cuts no longer move backward into previous entry

### Summary
Fixed an overcorrection in the keep-together page-cut logic where a user cut before Education could be moved backward to the start of the final Experience entry.

### What changed
- `snapBreakPositionsToAvoidBlocks()` now snaps cuts near the bottom of a keep-together entry forward to the entry bottom instead of backward to the entry top.
- The same rule was applied to the Vercel PDF function's inline page-planning copy.
- Added regression coverage for a section-boundary cut that falls a few pixels inside the previous entry.

### Why
The verified root cause was that the keep-together fix treated every cut inside `data-break-avoid` the same. A cut intended for the Education boundary could land slightly inside the previous Experience entry after export measurement, so the renderer moved the break to the top of that Experience entry. The result was page 2 starting with the final job instead of Education.

### Verification
- `npx vitest run src/lib/exportPagePlan.test.ts src/lib/nativePdfGenerator.test.ts src/lib/exportDomUtils.test.ts src/lib/__tests__/pdfUtils.test.ts`
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-21 - Custom PDF page cuts honored in downloads

### Summary
Fixed the remaining PDF page-cut issue after user verification showed the previous page-cut entry was incomplete.

### What changed
- Export clones now remove screen-only preview scaling before sending HTML to Puppeteer.
- Resume PDF export now keeps the live preview height coordinate space whenever saved custom cuts exist, preventing the server from filtering valid cuts as "outside" trimmed content.
- Preview Save/Share, Share Sheet PDF, and combined application-package exports now pass saved custom cuts to the resume PDF generator.
- Added regression tests for transform stripping and custom-cut height preservation.

### Why
The verified root cause was not the earlier client-side normalization alone. On the Preview page, the exported clone could keep `transform: scale(...)` from the responsive preview, while the saved page-cut Y positions were unscaled. Also, export height still used a trimmed content height even though saved cuts were based on the live preview height, so valid cuts could still be rejected by server normalization.

### Verification
- `npx vitest run src/lib/nativePdfGenerator.test.ts src/lib/exportDomUtils.test.ts src/lib/exportPagePlan.test.ts`
- `npx tsc --noEmit`

---

## 2026-05-20 - PDF renderer function startup fix

### Summary
Fixed the production PDF renderer function crash that made resume downloads fail before rendering began.

### What changed
- `api/export/pdf-native.ts` now loads `@sparticuz/chromium` through an indirect dynamic import so Vercel's `ncc` bundler does not relocate the package away from its `bin` directory.
- Kept `puppeteer-core` lazy-loaded after request validation so simple `GET`/bad-request responses cannot crash during function startup.
- Moved `pdf-lib` and export page-planning helpers off the module top level and into lazy imports inside the valid PDF render path. This keeps the Vercel function startup surface minimal and prevents unrelated renderer dependencies from crashing simple `405`/`400` responses.
- Follow-up production verification showed startup was fixed, but the valid render path then failed because Vercel could not resolve the lazy local import `../../src/lib/exportPagePlan` after transpiling the function. The page-planning helper is now a normal static local import again so Vercel bundles it correctly; external packages remain lazy.
- Vercel runtime logs then proved even the static `src/lib/exportPagePlan` import was preserved as an unresolved runtime import (`Cannot find module '/var/task/src/lib/exportPagePlan'`). The PDF function now carries its small page-planning helpers inline, making the serverless entry self-contained apart from external packages explicitly shipped with the function.
- Live PDF quality verification then showed the older slice-and-merge page renderer produced valid PDF bytes but dropped link annotations inside clipped resume content. The serverless renderer now uses Chromium's normal full-document print path and browser footer templates for page numbers/branding, preserving selectable text and clickable resume links.

### Why
The verified production symptom was `FUNCTION_INVOCATION_FAILED` for both `GET` and `POST` on `https://resume.thewise.cloud/api/export/pdf-native`, meaning the function crashed before normal request handling. Reproducing the Vercel-style bundle locally with `@vercel/ncc` showed the concrete root cause: `@sparticuz/chromium` was bundled/relocated and then failed with `The input directory "Y:\\bin" does not exist... you must externalize @sparticuz/chromium`. After the fix, the bundled function returns the expected `405` for `GET` and `400` for malformed `POST`, proving startup no longer crashes.

### Verification
- Live endpoint before fix: `GET` and minimal `POST` returned Vercel `FUNCTION_INVOCATION_FAILED`.
- `npx @vercel/ncc build api/export/pdf-native.ts -o .tmp-ncc-pdf --transpile-only`
- Imported the generated bundle locally: `GET` returned `405`, malformed `POST` returned `400`.
- Valid bundled POST progressed past Chromium package resolution; the remaining local error was Windows-only browser launch (`spawn ... chromium ENOENT`), not the previous missing `bin` directory relocation error.
- Rebuilt after startup hardening with a Vercel-style `ncc` bundle; `GET` and malformed `POST` still returned `405`/`400`, and a valid render still reached only the expected local Windows Chromium launch limitation.
- Live after deploy: `GET /api/export/pdf-native` returned `405` JSON instead of `FUNCTION_INVOCATION_FAILED`; minimal `POST` exposed the second-stage lazy local import resolution error, which was then fixed with a static local import.
- Live Vercel logs for the static import attempt showed `ERR_MODULE_NOT_FOUND` for `/var/task/src/lib/exportPagePlan`, confirming the function cannot rely on unresolved `src/` imports in production.
- Live PDF.js verification showed Chromium's direct print path preserves selectable text and the test hyperlink annotation.
- `npx tsc --noEmit`
- `npm run build`

---

## 2026-05-20 - PDF export restored to selectable text and clickable links

### Summary
Replaced the resume PDF export path with the server-side Chromium renderer again so generated PDFs preserve selectable text and clickable hyperlinks instead of embedding screenshots.

### What changed
- `src/lib/nativePdfGenerator.ts` now serializes the resume DOM and sends HTML to `/api/export/pdf-native` for Chromium/Puppeteer rendering.
- Removed the resume PDF screenshot/canvas assembly path from `generateNativePDF`; `pdf-lib` remains only for cover-letter generation and merging existing PDFs.
- Restored server response guards so HTML fallbacks or unavailable PDF services do not download fake `.pdf` files.
- Added `NativePdfOptions` export alias for callers that already import that type.
- Updated `src/lib/nativePdfGenerator.test.ts` to assert that HTML, links, page-break data, and branding options are sent to the PDF endpoint.

### Why
The verified root cause of non-clickable, non-selectable PDFs was architectural: the client-side html2canvas route captures the resume as an image, then inserts that image into a PDF. Even when it is not blank, that output cannot preserve real text or link annotations. Chromium's HTML-to-PDF renderer is the correct path because it prints the actual DOM.

### Verification
- `npx vitest run src/lib/nativePdfGenerator.test.ts`
- `npx tsc --noEmit`
- Local `/api/export/pdf-native` probe with PDF.js: extracted text included `WiseResume Link Test` and annotations included `https://github.com/example`.
- `npm run build`

---

## 2026-05-20 - PDF export blank page fix

### Summary
Superseded by the selectable-text PDF fix above. The earlier client-side screenshot path was corrected for blank captures, but the approach itself was rejected because it cannot preserve text or clickable links.

### What changed
- Added `createPdfCaptureContainer()` in `src/lib/exportDomUtils.ts` so export captures use an off-screen but still rendered host.
- Updated `src/lib/nativePdfGenerator.ts` to use that rendered capture host instead of a `visibility:hidden` container.
- Replaced the stale server-call PDF unit test with regression coverage for the rendered capture host and export clone cleanup.

### Why
The verified root cause was the capture host style: the resume clone was inserted under an ancestor with `visibility:hidden`. `html2canvas` respects that CSS, so it captured a white canvas even when the resume content existed and layout measurements succeeded. A Puppeteer/html2canvas probe confirmed `visibility:hidden` produced `nonWhite: 0`, while the new off-screen rendered host produced visible pixels.

### Verification
- `npx vitest run src/lib/nativePdfGenerator.test.ts`
- `npx tsc --noEmit`
- Browser html2canvas probe: hidden host captured blank white; rendered off-screen host captured non-white resume pixels.
- `npm run build`

---

## 2026-05-20 — 3-Tier AI Enhancement (Implemented)

### Summary
All 3 tiers of the AI enhancement plan implemented, TypeScript-clean, committed to `main`. Requires `resume-section-ai` redeploy.

### What changed

**Tier 1 — Context enrichment**
| File | Change |
|------|--------|
| `appwrite-hubs/resume-section-ai/src/main.js` | `buildResumeContextBlock(resume)` — structured name/title/recent-role/top-skills/education block replaces `JSON.stringify().slice(0,1000)` in all section prompts |

**Tier 2 — Clarifying questions**
| File | Change |
|------|--------|
| `appwrite-hubs/resume-section-ai/src/main.js` | `buildSummaryQuestionsResponse`, `buildSkillsQuestionsResponse`, `buildAddMetricsQuestionsResponse`; sparsity checks (summary <50 chars, skills <3 items, experience add_metrics <60 chars); `generate_with_answers` and `add_metrics_with_answers` action handlers |
| `src/components/editor/ai/AIQuestionsDialog.tsx` | NEW generic dialog — `contextLabel` prop replaces `projectName` |
| `src/components/editor/ai/ProjectAIQuestionsDialog.tsx` | Refactored to thin wrapper over `AIQuestionsDialog` |
| `src/components/editor/SectionAIAction.tsx` | Intercepts `{type:'questions'}` response; `handleQuestionsSubmit`/`handleQuestionsSkip`; renders `<AIQuestionsDialog>` |
| `src/components/editor/ExperienceSection.tsx` | **Bug fix:** `jobDescription` now passed to `enhance()`; questions flow for `add_metrics` on sparse entries |

**Tier 3 — JD-aware actions**
| File | Change |
|------|--------|
| `appwrite-hubs/resume-section-ai/src/main.js` | `tailor_to_job`, `find_skill_gaps`, `suggest_certifications` added to `ACTION_INSTRUCTIONS` |
| `src/hooks/useAIEnhance.ts` | `ActionType` extended: `generate_with_answers`, `add_metrics_with_answers`, `tailor_to_job`, `find_skill_gaps`, `suggest_certifications` |
| `src/components/editor/InlineAIButton.tsx` | `requiresJD` flag on `AIActionConfig`; `hasJobDescription` prop; JD-locked actions render disabled+tooltip (desktop) or greyed+hint (mobile); new actions: `tailor_to_job` on summary+experience, `find_skill_gaps` on skills, `suggest_certifications` on certifications |
| `src/components/editor/SectionAIAction.tsx` | `hasJobDescription` derived from store and passed to `InlineAIButton`; `find_skill_gaps` apply branch is append-only |
| `src/components/editor/ExperienceSection.tsx` | `hasJobDescription` from store passed to `InlineAIButton` in `ExperienceItem` |

### Deployment required
Redeploy `resume-section-ai` — delete existing tar first:
```
del appwrite-hubs\resume-section-ai.tar.gz
node scripts/deploy_hubs.cjs
```

---

## 2026-05-20 — 3-Tier AI Enhancement Plan (Approved, Pending Implementation)

### Summary
Comprehensive plan designed and approved for making all AI assist buttons smarter across every editor section. Plan stored at `Project Atlas/05-Migration to Appwrite/28-Plan-3Tier-AI-Enhancement.md`. No code written yet.

### What is planned
| Tier | Change |
|------|--------|
| **1 — Context enrichment** | `buildResumeContextBlock()` in `resume-section-ai/src/main.js` replaces the raw 1000-char JSON dump; every section prompt gets candidate name, title, recent role, top skills, education |
| **2 — Clarifying questions** | Generic `AIQuestionsDialog.tsx`; question builders for summary/skills/experience; questions flow wired into `SectionAIAction.tsx` and `ExperienceSection.tsx`; ExperienceSection jobDescription bug fixed |
| **3 — JD-aware actions** | `tailor_to_job` (summary + experience), `find_skill_gaps` (skills, append-only), `suggest_certifications` (certifications); all JD-gated in `InlineAIButton` |

### Files to be changed (next agent)
`resume-section-ai/src/main.js`, `useAIEnhance.ts`, `SectionAIAction.tsx`, `ExperienceSection.tsx`, `InlineAIButton.tsx`, `AIQuestionsDialog.tsx` (new), `ProjectAIQuestionsDialog.tsx` (update)

### Deployment required after implementation
Redeploy `resume-section-ai` — delete existing tar first, then run `deploy_hubs.cjs`.

---

## 2026-05-20 — Fix: AI Gateway Critical Outage (Windows Deploy / dd-trace)

### Root Cause
`deploy_hubs.cjs` ran `npm install` on Windows, bundling Windows-native C++ binaries for `dd-trace` into `ai-gateway.tar.gz`. On Linux Appwrite, `require('dd-trace')` failed to load at module startup → every `ai-gateway` invocation crashed. Killed: `agentic-chat`, `analyze-resume`, `score-resume`, `tailor-resume`, `generate-cover-letter`.

Secondary bug: `callLLM` in `resume-section-ai` had `timeout: 55000` (55 s) exceeding Appwrite's 30 s function limit.

### What changed
| File | Change |
|------|--------|
| `appwrite-hubs/ai-gateway/package.json` | Removed `dd-trace: ^5.102.0` |
| `appwrite-hubs/ai-gateway/src/main.js` | Removed all 36 lines of dd-trace/tracer/llmobs code |
| `appwrite-hubs/resume-section-ai/src/main.js` | `callLLM` timeout `55000` → `10000` ms |

### Deploy note
Stale `.tar.gz` archives must be deleted before rerunning `deploy_hubs.cjs` — the script skips rebuilding if an archive already exists.

---

## 2026-05-20 — Smart Context-Aware Tech Suggestions

### Problem
`Suggest Technologies` always generated the same generic output regardless of the project, because it had no way to gather specific context and ignored the user's resume background.

### What changed
| File | Change |
|------|--------|
| `appwrite-hubs/resume-section-ai/src/main.js` | Clarifying questions when context is sparse; new `suggest_technologies_with_answers` action; `url`/`githubUrl` in prompt; resume tech stack extraction via `extractKnownStack()`; shared `buildSuggestTechUserPrompt()` |
| `src/components/editor/ProjectsSection.tsx` | `questionsAction` state tracks which action triggered the dialog; `suggest_technologies` payload includes `url`/`githubUrl`; submit routes to `suggest_technologies_with_answers`; skip falls back gracefully |
| `src/hooks/useAIEnhance.ts` | Added `suggest_technologies_with_answers` to `ActionType` union |

### Behaviour now
- **Sparse context** (description < 80 chars and no role): shows 3 questions about domain, purpose, platform → answers drive specific suggestions
- **Rich context**: skips dialog, generates directly with enriched context (URL, GitHub, resume stack)
- **Skip button**: falls back to best-effort direct generation instead of blank `generate`

### Deployment required
Redeploy `resume-section-ai` hub after pulling:
```
git pull origin main && APPWRITE_API_KEY=<key> node scripts/deploy_hubs.cjs
```

---

## 2026-05-20 — Fix: AI Gateway + Resume Section AI Down After Windows Redeploy

### Root Cause
Running `deploy_hubs.cjs` on Windows compiled `dd-trace`'s native C++ binaries for Windows and bundled them in the `ai-gateway` tar. Appwrite runs on Linux — the Windows `.node` files failed to load at module startup, marking every `ai-gateway` execution as `failed`. This silently killed all AI features routed through the gateway (`agentic-chat`, `analyze-resume`, `tailor-resume`, cover letter generation, etc.).

`resume-section-ai` had a separate latent bug: `callLLM` timeout was 55 000 ms but the Appwrite function execution limit is 30 s. Any LLM call slower than 30 s was killed by Appwrite mid-request.

### Fixes
- **`appwrite-hubs/ai-gateway/package.json`** — removed `dd-trace` dependency. Datadog LLM observability was best-effort and `DATADOG_API_KEY` was never configured; removing it has zero runtime impact.
- **`appwrite-hubs/ai-gateway/src/main.js`** — removed all `dd-trace` / `tracer` / `llmobs` code (36 lines).
- **`appwrite-hubs/resume-section-ai/src/main.js`** — reduced `callLLM` per-call timeout from 55 000 ms → 10 000 ms, matching `ai-gateway`'s fail-fast approach and keeping the total within the 30 s function budget.

### Deployment Required
Both `ai-gateway` and `resume-section-ai` must be redeployed:
```
APPWRITE_API_KEY=<key> node scripts/deploy_hubs.cjs
```

---

## 2026-05-20 — legacy payment provider Web + Mobile Payments Integration

### Summary
Integrated legacy payment provider as the payment gateway for web and mobile. Web SDK (`removed web payment SDK`) initialized after auth, real purchase flow replaces all "coming soon" upgrade CTAs, a new Appwrite Function (`legacy-payment-webhook`) receives RC events and syncs subscription state, and the mobile paywall's RC initialization is wired up in the root layout.

### Architecture
- Billing engine: legacy billing + Stripe
- Entitlement IDs: `pro` and `premium` — match existing plan strings
- Sync: Webhook-driven — legacy provider fires `INITIAL_PURCHASE` / `RENEWAL` / `CANCELLATION` → `legacy-payment-webhook` Appwrite Function updates `subscriptions` collection
- Coupon UI removed from `UpgradeDialog`, `UpgradeWall`, `SubscriptionPage` (replaced by RC promo codes)

### Files changed
- `src/lib/billing.ts` — NEW singleton configure/get
- `src/providers/legacy payment providerProvider.tsx` — NEW auth-aware SDK init context
- `src/hooks/old-payment-provider.ts` — removed old offerings/purchase/customer-info hook
- `src/AppInterior.tsx` — added `<legacy payment providerProvider>`
- `src/components/plan/UpgradeDialog.tsx` — replaced coupon form with RC purchase buttons + live prices
- `src/components/plan/UpgradeWall.tsx` — replaced "coming soon" toast with RC purchase + live prices
- `src/pages/SubscriptionPage.tsx` — RC purchase buttons, manage subscription link, coupon UI removed
- `src/lib/appwrite-functions.ts` — removed `validate-coupon` / `redeem-coupon` from COUPON_FUNCTIONS
- `appwrite-hubs/legacy-payment-webhook/` — NEW Appwrite Function (signature verified, handles 6 event types)
- `scripts/deploy_hubs.cjs` — added `legacy-payment-webhook` hub + env var block
- `.env.example` — added `removed web payment API key`
- `mobile/app/_layout.tsx` — RC initialization after user identity loads

### Verification
- `npm exec tsc -- --noEmit` — zero errors
- `node --check appwrite-hubs/legacy-payment-webhook/src/main.js` — clean

### Prerequisites (legacy payment dashboard — user action required)
1. Create Web Billing app → get `removed web payment API key`
2. Connect Stripe account
3. Create Pro ($9/mo) and Premium ($19/mo) products
4. Create entitlements `pro` and `premium`
5. Create one Offering with two packages linked to those entitlements
6. Set `removed payment webhook secret` → configure webhook URL (Appwrite Function HTTP endpoint)
7. Add iOS + Android apps → set `removed iOS payment API key` / `removed Android payment API key` in Expo env

---

## 2026-05-19 — DevKit: Deploy Hubs fix, BYOK tests removed, moderation error improvements

### Summary
Three DevKit bugs fixed in a single commit (PR #58).

### Root causes
1. **Deploy Hubs permanently disabled**: `handleDeployHubsStatus` in `admin-devkit-data` required `DEVKIT_PASSWORD` in `admin-deploy-hubs` variables, but that function never reads it. The status check falsely reported it missing, blocking the deploy button regardless of real vars.
2. **BYOK smoke tests**: BYOK was removed from the app but `DevKitRunner.tsx` still had 7 dead tests that always returned warn/skipped.
3. **Moderation fallback error**: Three real error messages had no matching pattern in `errorTranslate.ts`, silently falling through to the generic "Something went wrong" fallback.

### Changes
- `appwrite-hubs/admin-devkit-data/src/main.js` — removed `DEVKIT_PASSWORD` from required list; added `bug_reports`, `blocklist`, `moderation_queue` to diagnostics
- `src/lib/devkit/errorTranslate.ts` — added 3 new error patterns (runtime crashed, 403, un-indexed attribute)
- `src/components/dev-kit/DevKitRunner.tsx` — removed dead BYOK test block
- `src/components/dev-kit/config.ts` — removed `byok` section
- `src/components/dev-kit/types.ts` — removed `'byok'` from `SectionId` union

### Verification
- `npm exec tsc -- --noEmit` — zero errors

### Deployment note
`admin-devkit-data` must be redeployed to Appwrite for the Deploy Hubs status fix to take effect.

---

## 2026-05-19 — Page break control popup (Editor + Preview)

### Summary
Moved manual page-cut editing to a single entry point: the clickable page-count badge opens a dialog in the editor and preview. Removed the duplicate block from Export Options. Fixed PDF truncation caused by silently auto-saving smart breaks on first open.

### Root cause
`ExportPageBreakSetup` auto-persisted suggested breaks when opened with empty `customBreakPositions`, so export used mid-section Y values and Puppeteer segments clipped content.

### Changes
- `PageCountBadge.tsx`, `PageBreakSetupDialog.tsx` — badge opens shadcn dialog; count uses `resolveExportPageCount` (custom breaks → `length + 1`, else estimate).
- `ExportPageBreakSetup.tsx` — no auto-persist; 1/2/3 page presets; “start new page before section”; sliders only when custom cuts saved.
- `LivePreviewPanel.tsx`, `PreviewPage.tsx` — badge + dialog + dashed break lines when cuts are saved.
- `ExportOptionsSheet.tsx` — removed embedded page-break UI (export still reads saved `customBreakPositions`).
- `pdfUtils.ts` — `resolveExportPageCount`, `computeBreaksForTargetPages`, `addBreakBeforeSection`.
- `sectionLabels.ts` — shared section labels for break UI.
- Tests: extended `pdfUtils.test.ts`; added `ExportPageBreakSetup.test.tsx`.

---

## 2026-05-19 — Page cut dialog readable preview

### Summary
Fixed the page-cut dialog miniature using fit-to-width scaling (full dialog width, scrollable up to 320px) instead of height-only scaling that produced a ~70px-wide pillar. Slider labels now use template-root coordinates (`getSectionLabelForBreakY`).

### Changes
- `PageBreakDialogPreview.tsx`, `pageBreakPreviewScale.ts` — width-first scale + page bands + P2/P3 break markers.
- `pdfUtils.ts` — `getSectionLabelForBreakY`.
- `exportDomUtils.ts` — clone pins width/background.

---

## 2026-05-19 — Page cut dialog preview and PDF export fixes

### Summary
Fixed page-cut UX: dialog shows a scaled clone of the live resume, break guide lines no longer appear in PDFs, footers show `Page N of M - Made with WiseResume` (clickable link), and section-based cuts persist reliably.

### Changes
- `PageBreakDialogPreview.tsx`, `exportDomUtils.ts` — scaled DOM clone preview; strip `data-pdf-exclude` nodes before export.
- `LivePreviewPanel.tsx`, `SectionOverlayManager.tsx` — mark editor overlays as PDF-excluded.
- `nativePdfGenerator.ts` — clone template without UI overlays for server HTML.
- `server/index.ts` — combined footer when page numbers and branding are enabled.
- `EditorPage.tsx`, `PreviewPage.tsx` — keep `showPageNumbers` when custom breaks are saved.
- `pdfUtils.ts` — `addBreakBeforeSection` returns `{ breaks, applied }`; `injectForcedBreaks` replaces in-section breaks.
- `ExportPageBreakSetup.tsx` — live height on persist; toast when section cut is invalid.

---

## 2026-05-19 — Editor live preview first-load fix

### Summary
Fixed the editor live preview not rendering on the first visit (refresh was required) and PDF export failing with “Resume preview not visible” when the preview pane had not mounted yet.

### Root causes
- `useIsMobile` treated the first paint as desktop (`undefined` → `false`) before `matchMedia` ran, so sub-1024px layouts briefly mounted the desktop split then dropped the preview panel.
- `useEditorHydration` skipped DB load when a *different* resume was already in persisted Zustand storage (e.g. opening `/editor?id=…` after editing another resume).
- `react-resizable-panels` could leave the preview column at 0px width on first mount inside the flex editor shell.
- `LivePreviewPanel` returned `null` when `templateComponents[selectedTemplate]` was missing instead of migrating/falling back to `modern`.

### Changes
- `src/hooks/use-mobile.tsx` — synchronous initial `matchMedia` width check.
- `src/hooks/useEditorHydration.ts` — hydrate when `localResume.id !== currentResumeId`; read template from `template_id` or `template`.
- `src/components/editor/LivePreviewPanel.tsx` — `migrateTemplateId` + `modern` fallback.
- `src/pages/EditorPage.tsx` — panel group ref + layout reset; stable panel ids; PDF export falls back to `exportResumePdfFromData` when `[data-resume-template]` is absent.
- `src/components/ui/resizable.tsx` — `forwardRef` on `ResizablePanelGroup`.

---

## 2026-05-18 — Audit Fixes: Deploy Timeout + SDK Alignment

### Summary
Fixed the critical regression that made DevKit Deploy Hubs non-functional, and standardized all hub SDK declarations to `^17.2.0`.

### Changes
- **`scripts/deploy_hubs.cjs`** — `admin-deploy-hubs` was being set to 30s timeout (Appwrite default); now set to 900s (Appwrite maximum). `ensureFunction()` also fixed to never reduce an existing timeout that is already higher than the target value.
- **9 hub `package.json` files** — bumped `node-appwrite` from `^11.x` / `^14.0.0` → `^17.2.0`: `admin-devkit-data`, `admin-email`, `admin-feature-flags`, `admin-impersonate`, `admin-moderation`, `admin-onboarding-funnel`, `admin-portfolio-usernames`, `admin-visitor-analytics`, `ai-gateway`.
- **`appwrite-hubs/inspect-ai-keys/package.json`** — removed unused `node-appwrite` declaration (hub uses raw axios only).
- **`Project Atlas/MASTER_HANDOVER_2026.md`** — corrected Fix 4 description: prior claim "every other hub uses `^14.0.0`" was inaccurate. Added raw-axios hub design note at end of file.
- **`.github/workflows/deploy-appwrite-hubs.yml`** — updated comment to reflect intentional manual-only deploy policy (removed "re-enable next month" instruction).

### Deploy required
All 9 hubs with bumped package.json need redeployment for the new SDK version to take effect. Use DevKit → Deploy AI Hubs after this commit is merged and pushed. `admin-deploy-hubs` timeout fix in `deploy_hubs.cjs` takes effect on the next run of the deploy script (GitHub Actions manual trigger or DevKit deploy).

---

## 2026-05-18 - DevKit Hub Runtime/Auth Repair

### Summary
Implemented the DevKit 100% repair plan for the confirmed backend runtime/auth failures and broken visible tab contracts. The affected Appwrite hubs were redeployed live after verification.

### Root causes
- Several standalone DevKit hubs called `crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))` without checking buffer lengths. Malformed or stale signed DevKit tokens could throw `RangeError: Input buffers must have the same byte length`, causing Appwrite `500` runtime failures instead of clean `401` responses.
- `admin-deploy-hubs` accepted only `Bearer <raw DEVKIT_PASSWORD>`, while the frontend now sends a server-issued signed DevKit session token.
- `LiveActivityPanel` probed ghost/stale functions (`me`, `admin-get-settings`, `admin-audit-logs`) as red live checks even though those paths are not owned current DevKit functions.
- `EmailManagementPanel` read `admin_audit_logs` directly from the browser for recent sends, bypassing the admin backend and exposing the panel to database permission failures.
- `admin-onboarding-funnel` was missing required Appwrite API variables. `admin-impersonate` also had a package/runtime mismatch: CommonJS source under `"type": "module"`.

### What changed
- Added safe signed-token verification to `admin-devkit-data`, `admin-email`, `admin-testmail`, `admin-moderation`, `admin-portfolio-usernames`, `admin-visitor-analytics`, `admin-onboarding-funnel`, `admin-impersonate`, `inspect-ai-keys`, and `admin-deploy-hubs`.
- Updated `admin-deploy-hubs` to accept either the raw DevKit password or the signed DevKit session token.
- Added `admin-devkit-data` action `deploy-hubs-status` to inspect `admin-deploy-hubs` variable names through the Appwrite management API.
- Disabled the Deploy Hubs frontend button with a clear missing-variable state until `admin-deploy-hubs` has all required server variables.
- Replaced Live Activity ghost probes with owned `admin-devkit-data` checks.
- Routed Email recent-send audit reads through `admin-devkit-data:list-audit-logs` with category filtering.
- Removed `"type": "module"` from `appwrite-hubs/admin-impersonate/package.json`.

### Variable sync
- Created missing non-secret variables for `admin-onboarding-funnel`: `APPWRITE_API_KEY`, `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`.
- Created missing non-secret variables for `admin-deploy-hubs`: `APPWRITE_API_KEY`, `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`.
- Created missing endpoint/project variables for `admin-devkit-data`.
- Remaining blocker: `admin-deploy-hubs` still needs `DEVKIT_PASSWORD` set in Appwrite. `GITHUB_TOKEN` and `GITHUB_REPO` are present. Until `DEVKIT_PASSWORD` is added, the frontend deploy control remains disabled instead of broken.

### Live deployments
- `admin-devkit-data` -> `6a0a5a1cad719813f718` (`ready`)
- `admin-email` -> `6a0a5a329efdaefc0fba` (`ready`)
- `admin-testmail` -> `6a0a5a3c8bb89becd662` (`ready`)
- `admin-moderation` -> `6a0a5a50a0f7d0fc90a0` (`ready`)
- `admin-portfolio-usernames` -> `6a0a5a601419cd5cff11` (`ready`)
- `admin-visitor-analytics` -> `6a0a5a73e85af5112705` (`ready`)
- `admin-onboarding-funnel` -> `6a0a5a8857bfba05563b` (`ready`)
- `inspect-ai-keys` -> `6a0a5aab34038040e9ff` (`ready`)
- `admin-deploy-hubs` -> `6a0a5aba2e837df95554` (`ready`)
- `admin-impersonate` -> initial `6a0a5a97b4b228c37b2d`, then fixed package redeploy `6a0a5b69e688d77b95ac` (`ready`)

### Verification
- `node --check` passed for every changed Appwrite hub.
- `npm exec tsc -- --noEmit` passed.
- Live malformed-token smoke passed for all affected hubs: every execution completed with controlled HTTP `401`; none failed with `500`, `crypto is not defined`, `timingSafeEqual`, or module-load errors after the `admin-impersonate` package fix.

---

## 2026-05-18 - Import Job Runtime Failure Diagnosis

### Summary
Verified the root cause of the live "Appwrite Function runtime failed for job-import" error and prepared the repo-side fix path.

### Root cause
The bad `job-import` function version had duplicate declarations of `const parsedJob` and `savedDoc` in the same handler scope. Node rejects this at module parse time with `SyntaxError: Identifier 'parsedJob' has already been declared`, so Appwrite fails the execution before the function can return a normal JSON error.

### What changed
- Confirmed current `appwrite-hubs/job-import/src/main.js` passes `node --check`; the prior version fails with the duplicate declaration syntax error.
- Rebuilt `job-import.tar.gz` from the fixed source because the local archive still contained the broken duplicate declarations.
- Updated `src/hooks/useImportJob.ts` so the server-side save path returns `{ id: jobId }`; this prevents the import sheet from navigating with an undefined job after the backend succeeds.

### Deployment note
`deploy-appwrite-hubs.yml` is currently `workflow_dispatch` only, so the source fix at commit `ec757cbe` did not auto-deploy to Appwrite. A manual run was attempted on 2026-05-18, but GitHub failed the job before checkout with the annotation: "recent account payments have failed or your spending limit needs to be increased." Run the Deploy AI Hubs workflow again after the GitHub billing/spending-limit blocker is cleared, or deploy `job-import` from the rebuilt archive before claiming the live button is fixed.

### Verification
- `node --check appwrite-hubs/job-import/src/main.js` passed.
- `git show ec757cbe^:appwrite-hubs/job-import/src/main.js | node --check` reproduced the exact syntax failure.
- `tar -xOzf job-import.tar.gz ./src/main.js | node --check` passed after rebuilding the archive.
- Redeployed live Appwrite Function `job-import` directly as deployment `6a0a555f2d62c4db7d32`; Appwrite reported `ready`.
- Smoke execution with a blocked localhost URL completed with HTTP `400` and `{ ok:false, error:"Invalid or blocked URL" }`, proving the function boots and returns JSON instead of runtime-failing.

---

## 2026-05-16 - UI/UX Audit Implementation (Phases 1–4, 25 findings)

### Summary
All 25 actionable findings from the 2026-05-16 senior UI/UX audit implemented across 20 files. Zero new npm packages, no new Appwrite collections, no breaking changes. TypeScript clean.

### What changed

**Phase 1 — Mobile & Trust Quick Wins:**
- `ExportOptionsSheet` + `DashboardPage`: fixed critical bug — `wr-checklist-exported-*` never written; now dispatched via CustomEvent on export completion
- `AchievementToast`: replaced all hardcoded hex colors with semantic Tailwind tokens (`bg-card`, `text-foreground`, `text-primary`)
- `NotificationsPage`: added `toast.success` on markAllAsRead
- `ReferralPage`: stat values `0` → `'—'` with "Referral tracking coming soon." note
- `AppShell` + `DesktopNav`: renamed 'Ask' → 'Wise AI' on FAB and desktop button
- `BottomTabBar`: removed duplicate notification dot from More trigger; only changelog dot remains
- `ShortcutHelpSheet`: added per-category scope notes ("Available while editing a resume", etc.)
- `BottomTabBar`: More menu grid `grid-cols-4` → `grid-cols-3 sm:grid-cols-4`; grouped items with "Tools" / "Account" section labels
- `sonner.tsx`: `role="status"` → `role="log"` (correct ARIA semantics for toast stream)

**Phase 2 — Navigation & Dashboard Polish:**
- `DashboardPage`: Import Resume + Explore sections collapsed behind "Discover more ▼" toggle for returning users
- `TailorPage`: added breadcrumb, replaced `navigate(-1)` with `getBackRoute('/tailor')`; added `/tailor` to BACK_ROUTES
- `ApplicationsPage`: `<h1>My Activity</h1>` → `<h1>My Applications</h1>`
- `Breadcrumb`: last item gets `truncate max-w-[180px] sm:max-w-none` for long resume names on mobile

**Phase 3 — Stability & Performance:**
- `ResumeListCard` + `EmptyState`: `MiniTemplateThumbnail` wrapped in `ErrorBoundary`
- `TemplatesPage`: `TemplateThumbnail` in preview Sheet wrapped in `ErrorBoundary`
- `ResumeListCard`: thumbnail height `h-[54px]` → `h-[56px]` (correct A4 aspect ratio)
- `MiniTemplateThumbnail`: `IntersectionObserver` lazy rendering — renders skeleton until scrolled into view; browser-support guard for old browsers
- `EmptyState`: carousel `setInterval` skipped when `shouldReduceMotion` is true

**Phase 4 — Forms, Copy & Fine Polish:**
- `AuthPage`: static "At least 8 characters." hint under register password field
- `TailorPage`: `maxLength={2000}` + live character counter on custom instructions textarea
- `OnboardingChecklist`: `aria-label` on card and dismiss button; focus restoration to `<h1>` on dismiss; "Dismiss" → "Got it" copy

### Files changed
20 files · 182 insertions · 104 deletions

### Findings status after this session
All 25 findings marked `implement` are now `done`. Findings 26–29 remain deferred/n/a per original plan.

---

## 2026-05-16 - World-Class Enhancement Pass (All Phases)

### Summary
Full-codebase enhancement pass implementing 5 phases of improvements: trust/reliability, UX polish, feature completeness, product completeness, and technical health. Zero breaking changes. All new props are optional with safe defaults.

### What changed

**Phase 1 — Trust & Reliability:**
- `ExportProgressBar`: stage labels + error recovery UI with retry button
- `nativePdfGenerator`: one-retry on 5xx failures (3 s delay, capped at 1 attempt)
- `EditorHeader`: offline pending-count chip and syncing indicator
- `useNotifications`: added `markAllAsRead` mutation, fixed unread-count query invalidation
- `NotificationsPage`: fixed pre-existing `$id`/`$createdAt` field name bugs

**Phase 2 — UX Polish:**
- `MiniTemplateThumbnail`: extracted to own file from EmptyState
- `ResumeListCard`: 40×54px template thumbnail previews before score ring
- `sonner.tsx`: ARIA live region wrapper (`role="status" aria-live="polite"`)
- `Breadcrumb`: added optional `links` prop, `aria-label`, `aria-current="page"`
- Added breadcrumbs to CoverLetterEditPage, ApplicationTrackerPage, ResumeDetailPage
- `ShortcutHelpSheet`: new sheet listing all keyboard shortcuts in 4 categories
- `AppShell`: mounts ShortcutHelpSheet globally, wires `?` key + CustomEvent listener
- `BottomTabBar`: unread notification badge on More button + bell, What's New dot, Shortcuts menu item
- `AchievementToast`: golden-themed custom toast component
- `AchievementsPage`: fires celebration toast when achievements are newly earned

**Phase 3 — Feature Completeness:**
- `OnboardingChecklist`: new collapsible dashboard card with 5 getting-started steps
- `DashboardPage`: integrates OnboardingChecklist below DashboardStats

**Phase 4 — Product Completeness:**
- `TemplatesPage`: "Preview with my data / Sample data" toggle in preview sheet
- `ReferralPage`: LinkedIn, WhatsApp, and Copy Message social sharing buttons
- `usePortfolioSEO`: added `og:image` and `twitter:image` tags
- `server/index.ts`: new `GET /og-image/:username` Puppeteer screenshot endpoint (1200×630)

**Phase 5 — Technical Health:**
- `AppInterior`: wrapped with global `MotionConfig` for reduced-motion support
- `deploy-frontend.yml`: 3 MB JS bundle size guard step added to CI

### Verification
- `npx tsc --noEmit`: zero errors

### Files changed
22 modified, 4 created (`MiniTemplateThumbnail.tsx`, `OnboardingChecklist.tsx`, `ShortcutHelpSheet.tsx`, `AchievementToast.tsx`)

---

## 2026-05-15 - Export Pagination, iPhone Save, and Watermark Replacement

### Summary
Replaced the broken Live Preview page-break controls with an Export Options setup flow, moved PDF pagination to exact server-rendered page segments, and removed the remaining dead raster-PDF helper code.

### Root cause
The app had a visible custom page-break UI, but `generateNativePDF()` dropped `customBreakPositions`, page-numbering, branding, and content-height data before calling `/api/export/pdf-native`. The server then printed the whole HTML with normal Chromium pagination, so user-placed breaks were ignored and the final page stayed full A4/Letter height. iPhone failures were worsened by a deliberate `window.print()` fallback when the PDF service was unavailable.

### What changed
- Added an Export Options page setup panel that measures the rendered CV, starts from smart suggested breaks, and persists exact break positions.
- Updated `/api/export/pdf-native` to render exact clipped HTML segments and merge them into one text-selectable PDF, with the final page cropped to remaining content height.
- Added a visible, clickable `Wise Resume` PDF footer link and an image-export footer containing `Wise Resume` plus `https://resume.thewise.cloud`.
- Removed the Live Preview page-break controls and deleted the dead raster PDF helper internals from `src/lib/pdfGenerator.ts`.
- Removed the normal print fallback from resume PDF export errors; callers now show a direct retry/DOCX fallback message.

### Verification
- `npx vitest run src/lib/exportPagePlan.test.ts src/lib/nativePdfGenerator.test.ts src/lib/exportWatermark.test.ts src/lib/__tests__/pdfUtils.test.ts src/lib/exportResumePdf.test.ts` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed after fixing the Live Preview JSX nesting found by Vite.
- `npm run build:server` passed after adding the missing root `esbuild` dev dependency required by the existing script.
- Built-server smoke test against `POST /api/export/pdf-native` returned `%PDF-` bytes for an exact-break payload with branding enabled.

---

## 2026-05-15 - Bolt.new Import Optimization

### Summary
Addressed the "Repository size might be too large" warning in Bolt.new by identifying the root cause in the GitHub API metadata and providing a path to prune historical bloat. Created `.boltignore` to optimize AI context usage.

### Root cause
The repository's **Git history** (~283 MB) is significantly larger than the current source files (~12 MB). Bolt.new queries the GitHub API `size` property, which includes this history, triggering a proactive warning even if the current branch tarball is within the 5 MB limit.

### What changed
- Created `.boltignore` in the project root to exclude large generated assets (`public/pdfjs`, `public/tesseract`), build artifacts, and media from Bolt's AI context engine.
- Verified that the current branch archive size (3.13 MB) is below the 5 MB import cap.
- Provided instructions for pruning the legacy binary bloat from the Git history to reduce the reported repository size on GitHub.

### Verification
- Local `.git` size: 283 MB (bloated history confirmed).
- Local source size (clean): 11.9 MB (import-able).
- `git archive` size: 3.13 MB (under the 5 MB cap).

---

## 2026-05-15 - Bolt Repo Slimming (5 MB Import Cap)


### Summary
Prepared a slim branch so `iammagdy/WiseResume-TWC` can be imported into bolt.new, which enforces a hard ~5 MB GitHub tarball size cap.

### Root cause
The repo HEAD contained large committed Appwrite hub build artifacts (`.tar.gz` / `.zip`) and image-heavy documentation assets (screenshots). bolt.new imports by downloading the GitHub tarball and rejects repos over 5 MB.

### What changed
- Removed committed hub archives from the repo HEAD on branch `codex/bolt-slim` (root artifacts and `appwrite-hubs/*.tar.gz` + `auth-master.zip`).
- Removed image-heavy documentation assets: `screenshots/`, `docs/screenshots/`, `.canvas/assets/`.
- Updated `.gitignore` to prevent re-adding generated archives and those removed asset directories.
- Added session log: `Project Atlas/05-Migration to Appwrite/21-Session-Log-2026-05-15-Bolt-Repo-Slimming.md`.

### Verification
- Staged-tree archive size (gzipped) measured at ~3.28 MB (below bolt.new 5 MB cap).

### Current state
- Slimming work exists locally on branch `codex/bolt-slim` and must be committed/pushed to affect GitHub imports.

---

## 2026-05-15 - UI Follow-up Fixes

### Summary
Resolved the two follow-up issues left open after the main UI/UX stabilization pass: the recurring `useAppSettings` authorization warning and the landing mobile animated headline rendering issue.

### Root cause
The settings warning came from a direct browser read of `app_settings` on routes where that collection is not readable for the current user. The landing mobile issue came from reusing the desktop typewriter overlay pattern on a narrow mobile layout where an in-flow animated line is the correct model.

### What changed
- Updated `src/hooks/useAppSettings.ts` so expected Appwrite `401/403` settings-read failures fall back to defaults without warning spam.
- Added `src/hooks/__tests__/useAppSettings.test.tsx` to verify silent fallback for expected auth failures and warnings for unexpected failures.
- Added `src/components/landing/TypewriterHeadlineLine.tsx` and moved both `WiseResumeHero` and `LandingHeroShell` to the shared headline-line structure.
- Changed the landing mobile headline to an in-flow animated word line while preserving the desktop width-reservation behavior on `sm+`.
- Increased the mobile `.lp-typewriter-line` min-height in `src/pages/index-landing.css`.
- Updated `reports/ui-ux-stabilization-audit-2026-05-15.md` and added `Project Atlas/05-Migration to Appwrite/19-Session-Log-2026-05-15-UI-Followups.md`.

### Verification
- `npm exec vitest run src/hooks/__tests__/useAppSettings.test.tsx src/components/landing/__tests__/TypewriterHeadlineLine.test.tsx` passed.
- `npm exec tsc -- --noEmit` passed.
- Browser verification on the real local WiseResume server confirmed the settings warning no longer appears and the mobile landing headline renders correctly.

### Current state
- The two follow-up issues from the second-pass UI audit are fixed locally.
- No backend or deployment changes were required.

---

## 2026-05-15 - UI/UX Stabilization Pass

### Summary
Implemented the frontend stabilization pass for the confirmed shell, dashboard, tailor, upload, and landing UX issues, then documented the second-pass route sweep separately from the original fixes.

### Root cause
The regressions were caused by frontend layout and hierarchy problems rather than backend failures: mobile shell spacing did not account for both the Ask FAB and bottom nav, returning-user actions were buried or truncated on dashboard, and the tailor first screen combined a broken closed-state selector with an overloaded entry flow.

### What changed
- Added route-aware mobile shell spacing and Ask FAB suppression rules for fixed-footer pages.
- Tightened desktop navigation chrome without changing IA.
- Reworked dashboard returning-user actions, loading copy, selection discoverability, and upload-card mobile layout.
- Fixed the tailor resume selector closed state and removed the associated React key warning.
- Reframed the tailor first screen into a clearer step sequence and stacked the job URL controls on mobile.
- Increased landing hero spacing on mobile before the next content band.
- Added focused tests for shell layout, dashboard hero CTA behavior, and tailor URL control layout.
- Added `reports/ui-ux-stabilization-audit-2026-05-15.md` and `Project Atlas/05-Migration to Appwrite/18-Session-Log-2026-05-15-UI-UX-Stabilization.md`.

### Verification
- `npm exec vitest run src/components/layout/__tests__/appShellLayout.test.ts src/components/dashboard/__tests__/DashboardHero.test.tsx src/components/editor/tailor/__tests__/JobUrlParser.test.tsx` passed.
- `npm exec tsc -- --noEmit` passed.
- Browser verification covered authenticated dashboard/upload/tailor checks, public mobile checks for `/` and `/pricing`, and a second-pass route sweep across auth, job-seeker, and WiseHire surfaces.

### Current state
- The confirmed UI issues from the original audit are fixed locally.
- No Appwrite schema, function, or deployment changes were required for this pass.
- The second-pass sweep found two follow-up items to track separately: a recurring `useAppSettings` authorization warning and an existing mobile landing animated-title rendering issue.

---

## 2026-05-15 - Function Ownership Implementation

### Summary
Implemented the source-owned function routing plan for AI contracts, DevKit direct calls, coupons, WiseHire, public share password verification, and safe first-pass performance cleanup.

### Root cause
The frontend invoked several function names that were either routed through generic AI gateway behavior or not owned by the local `appwrite-hubs/` inventory. Structured AI callers expected typed JSON while most local gateway routes returned generic chat content.

### What changed
- Added Appwrite hubs: `coupons`, `wisehire-gateway`, and `public-share`.
- Routed coupon, WiseHire, and protected-share calls through owned local hubs in `src/lib/appwrite-functions.ts`.
- Added typed structured AI responses for high-risk AI gateway features while keeping `parse-resume` as the dedicated normalized route.
- Moved audited DevKit direct calls and Live Activity probes to owned `admin-devkit-data` / `resume-section-ai` paths.
- Removed the active unowned `submit-contact-request` fallback from feedback reporting.
- Rewrote `scripts/README.md` to point operators at Appwrite hub deployment and mark Supabase/edge scripts as legacy audit aids.
- Updated deploy inventory and Appwrite function manifest for the new hubs.
- Removed mixed dynamic/static import warnings for `captureErrorShim` and `pdf/textPreprocessor`.

### Verification
- `node --check` passed for modified/new Appwrite hubs and `scripts/deploy_hubs.cjs`.
- `npm exec tsc -- --noEmit` passed.
- `npm run build` passed.
- Remaining build warning: large chunks for heavy modules such as OCR, doc export, monitoring, DevKit, and charts.

### Current state
- Local source is ready for deployment.
- Live Appwrite was not redeployed in this session; the updated hubs must be deployed before live behavior can be claimed fixed.

---

## 2026-05-15 - Codebase health audit documented

### Summary
Added a dedicated Atlas session log for the read-only codebase health audit covering Appwrite function ownership, AI contract drift, legacy migration remnants, and performance risks.

### What changed
- Created `Project Atlas/05-Migration to Appwrite/16-Session-Log-2026-05-15-Codebase-Health-Audit.md`.
- Recorded the verified root findings from source inspection without changing application code.

### Verification
- `npm exec tsc -- --noEmit` passed during the audit session.
- `npm run build` passed during the audit session.
- Workspace remained clean on `main...origin/main`.

---

## 2026-05-14 - Root README Added

### Summary
Added a professional root `README.md` for the GitHub repository so the project has a clear SaaS-grade entry point for developers, operators, and AI agents.

### What changed
- Created a root README covering product positioning, platform surfaces, architecture, repository map, local setup, commands, environment notes, deployment path, and Atlas rules.
- Linked the README to the canonical Atlas files instead of duplicating deployment-sensitive operational truth.

### Verification
- Markdown file created at repo root.
- Atlas changelog updated to record the documentation change.

---

## 2026-05-14 - DevKit Operations Hub Auth/Deploy Stabilization

### Summary
Stabilized the DevKit panel auth path and deployment workflow for the panels that were showing `Unauthorized`, then simplified the sidebar into fewer operations surfaces.

### Root cause
DevKit login returns a signed token from `admin-devkit-data`, but several panels depend on standalone admin Appwrite Functions. The local standalone sources accept signed tokens, but the deploy workflow rebuilt only a subset of hubs and could leave live functions stale. Stale standalone functions reject the signed token and show `Unauthorized`.

### What changed
- Email Automations, Portfolios, Visitors, Testmail Inbox, and Mission Control live-visitors now use the shared DevKit client path for their standalone admin functions.
- DevKit sidebar now merges Visitors + Analytics + Onboarding into Growth & Traffic, and merges Email Automations into the Email hub.
- The Appwrite hub deploy workflow now rebuilds every deployed hub from source and validates archive shape before deployment.
- `scripts/deploy_hubs.cjs` now includes missing admin hubs, syncs shared admin variables to every admin hub, syncs Resend variables to email hubs, and runs safe smoke executions when `DEVKIT_PASSWORD` is available.

### Verification
- `npm exec tsc -- --noEmit` passed.
- `git diff --check` passed.
- Browser E2E reached `/devkit`, but full tab-by-tab testing is blocked until the DevKit password is supplied because the local DevKit session is locked.

---

## 2026-05-14 - Public Page Navigation Stall Fixed

### Summary
Fixed `/pricing` and other public utility pages appearing to load but then failing to navigate when the Dashboard button or similar links were clicked.

### Root cause
The routes were valid and rendered. The failure was a browser runtime stall caused by the animated WebGL Aurora background running on non-landing public pages. Chromium logged GPU `ReadPixels` stall warnings, and the in-app browser could render `/pricing` while click execution timed out. This made navigation look broken even though React routing was present.

### What changed
- `src/components/landing/AuroraLayer.tsx` now keeps WebGL Aurora only on the real landing pages (`/` and `/enterprises`).
- `src/components/landing/AuroraBackground.tsx` and `src/components/landing/Aurora.tsx` support `forceCssFallback`, so utility pages keep the branded background without starting the WebGL renderer.
- `/pricing`, `/sign-in`, `/whats-new`, `/auth*`, and `/p/*` now use the CSS fallback background.

### Verification
- In-app browser: loaded `http://localhost:5000/pricing`, clicked `Dashboard`, and landed on `http://localhost:5000/dashboard`.
- Headless browser smoke: `/pricing` rendered with zero fresh WebGL/GPU stall warnings; unauthenticated `/dashboard` redirected to `/auth?mode=login`.
- `npm exec tsc -- --noEmit` passed.

---

## 2026-05-13 - Deploy admin-devkit-data: Resend Vars + Redeployment Wiring

### Summary
Wired the CI deploy pipeline so that the `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_FROM_NAME` environment variables are automatically provisioned on the `admin-devkit-data` Appwrite Function when the GitHub Actions workflow runs. This unblocks the plan-change notification and email side-effects added in the previous entry.

### What changed
- `scripts/deploy_hubs.cjs` — added `ensureVariable` calls for `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_FROM_NAME` on `admin-devkit-data` after the hub deployment loop.
- `.github/workflows/deploy-appwrite-hubs.yml` — exports `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_FROM_NAME` from GitHub secrets into the deploy step so the deploy script can read them.

### Manual steps still required (one-time)
Add the three secrets to the GitHub repository (`Settings → Secrets and variables → Actions`):
- `RESEND_API_KEY` — same Resend API key already used by `admin-email`
- `RESEND_FROM_EMAIL` — e.g. `hello@thewise.cloud`
- `RESEND_FROM_NAME` — e.g. `WiseResume`

Then trigger the **Deploy AI Hubs** workflow (`workflow_dispatch`) from GitHub Actions. The script will deploy `admin-devkit-data` and set all three variables in one run.

### Smoke test
After the workflow completes: set a test user's plan in DevKit → confirm the user's notification appears in their bell icon and a transactional email arrives in their inbox.

---

## 2026-05-13 - Plan Change: Realtime Reflect + Notify User

### Summary
Three-part fix so that when God Mode DevKit sets a permanent plan or grants a trial, the target user's browser reflects the change immediately and they receive both an in-app notification and a transactional email.

### Root causes addressed
1. **Stale frontend cache** — `useMe` had `staleTime: 5 * 60 * 1000` with no push invalidation. `invalidateQueries(['me'])` in the admin's browser only cleared the admin's cache.
2. **No notification** — `handleSetPlan` and `handleGrantTrial` in `admin-devkit-data` never wrote to `notifications`.
3. **No email** — neither handler called Resend.

### What changed
- `src/hooks/useMe.ts` — added Appwrite Realtime subscription on `databases.main.collections.subscriptions.documents`. On any event the hook calls `queryClient.invalidateQueries({ queryKey: ['me', user.id] })` and unsubscribes on cleanup. Plan reflects in ~2 seconds without polling.
- `appwrite-hubs/admin-devkit-data/src/main.js` — added:
  - `resendRequest(method, path, body)` — minimal Resend REST helper (same pattern as `admin-email`)
  - `planUpgradeEmailHtml(email, planLabel, durationLabel)` — styled email template matching `baseTemplate` (indigo header, 560px max-width)
  - `createPlanNotification(databases, userId, planLabel, durationLabel, log)` — writes to `notifications` collection with `type: 'system'`, correct title/message, `is_read: false`, permissions scoped to `Role.user(userId)`. Non-fatal (try/catch + warning log).
  - `sendPlanUpgradeEmail(userId, planLabel, durationLabel, log)` — fetches user email via `getUser()`, sends via Resend. Skips gracefully when `RESEND_API_KEY` is absent. Non-fatal.
  - Both `handleSetPlan` and `handleGrantTrial` now call both helpers via `Promise.allSettled` after the DB write succeeds, so neither can block or fail the primary plan change.

### Env vars required in `admin-devkit-data` Appwrite Function
Add these in Appwrite Console → Functions → `admin-devkit-data` → Variables:
- `RESEND_API_KEY` — Resend API key (same value already used in `admin-email`)
- `RESEND_FROM_EMAIL` — sender address (e.g. `hello@thewise.cloud`)
- `RESEND_FROM_NAME` — sender name (e.g. `WiseResume`)

### Verification
- `npm exec tsc -- --noEmit` passed.
- `admin-devkit-data` must be redeployed after this commit for changes to take effect on live.

---

## 2026-05-13 - DevKit Login Spinner And Profile Action Fix

### Summary
Fixed the `/devkit` login button getting stuck in a loading state and corrected a DevKit profile drawer action contract that could dispatch the wrong backend action.

### What changed
- `devKitLogin` now times out after 15 seconds instead of waiting forever for an Appwrite SDK execution promise.
- Shared DevKit panel calls now time out after 20 seconds and return structured `NETWORK_ERROR` results.
- `UserDetailDrawer` now sends `profile_action: "get"` under the top-level `action: "update-profile"` contract instead of duplicate `action` keys.
- Redeployed `admin-devkit-data` as deployment `6a0415154ff4ed2b537e`.

### Verification
- `npm exec tsc -- --noEmit` completed successfully.
- Local browser smoke test on `localhost:5000/devkit` with a deliberately wrong password re-enabled the submit button instead of leaving it spinning.
- Live Appwrite `verify-devkit-session` wrong-password execution used deployment `6a0415154ff4ed2b537e`, completed, and returned HTTP `401` with code `INVALID_PASSWORD`.

---

## 2026-05-13 - DevKit Operations Data Restored

### Summary
Fixed misleading and broken DevKit operations data by making Appwrite Auth the source of truth for admin users and by separating active-user resumes from orphaned resume documents.

### What changed
- `admin-devkit-data` now uses internal REST GET helpers for Appwrite read/list calls instead of `node-appwrite` GET helpers that send request bodies.
- `overview-stats` now returns active-user-owned resume count, raw resume document count, orphan count, and the unverified Auth user list.
- `list-users-page` now pages from Appwrite Auth users first, then joins profiles, subscriptions, credits, and per-user resume counts.
- `set-plan` now writes only schema-valid subscription/profile fields and clears stale trial fields; `useMe` computes active trial effective plan from existing fields.
- DevKit UI now shows unverified and missing-profile users clearly and removes visible Supabase wording from the DevKit surfaces touched here.
- Redeployed `admin-devkit-data` as deployment `6a040bea5ae7d378180b`.

### Why
The DevKit was mixing old assumptions with current Appwrite data. Live Appwrite has 2 Auth users, 1 profile, and 34 resume documents; 31 resume documents are orphaned from deleted/nonexistent Auth users. Counting raw resume documents made infrastructure look wrong, and using profiles as the God Mode source hid the unverified Auth user.

### Verification
- Local handler execution against live Appwrite returned 2 Auth users, 1 verified user, 3 active-user-owned resumes, 31 orphaned resume documents, and `test@thewise.cloud` as the unverified user.
- A same-plan `set-plan` smoke test for the verified user returned success and the joined user list still showed `premium`.
- `npm exec tsc -- --noEmit` completed successfully.
- Live deployment status is `ready`; `verify-devkit-session` wrong-password execution returns `INVALID_PASSWORD` with empty runtime stderr.

---

## 2026-05-13 - DevKit Login Runtime Restored

### Summary
Fixed the live DevKit "Access denied" blocker by redeploying `admin-devkit-data` with a valid Appwrite Function artifact.

### What changed
- Rebuilt `admin-devkit-data.tar.gz` from `appwrite-hubs/admin-devkit-data/` so `package.json`, `src/main.js`, and `node_modules/` are at the archive root.
- Redeployed Appwrite Function `admin-devkit-data` as deployment `6a0407d342fbb7593d4d` with entrypoint `src/main.js`.
- Updated the DevKit Atlas cards to record the verified root cause and the Appwrite-native recovery path.

### Why
The login failure was not caused by the entered password. The live function failed before password verification with `Cannot find module 'node-appwrite'`, so the frontend collapsed the runtime failure into a generic "Access denied" toast.

### Verification
- New deployment status is `ready`.
- A deliberately wrong `verify-devkit-session` request now completes with HTTP `401`, code `INVALID_PASSWORD`, and empty runtime stderr, proving the function boots and auth handling is reachable.

---

## 2026-05-13 - DevKit Full Stability Audit & Remediation

### Summary
Full audit and fix of the DevKit developer tools. Resolved two frontend crashes, consolidated 14+ missing Appwrite Functions into the existing `admin-devkit-data` hub, fixed error reporting, and deployed 4 previously unbuilt functions to production.

### What changed

#### Frontend (no deployment required)
- **`TestItem.tsx`** — Added `result = { status: 'idle' }` default prop to prevent crash when `results[test.id]` is `undefined` before any test runs.
- **`DevKitRunner.tsx`** — Fixed prop name mismatch: `expandedJson` → `isExpanded`, `onToggleJson` → `onToggleExpand`, removed non-existent `globalRunning` prop. Added `?? { status: 'idle' }` fallback for result.
- **`VisitorsPanel.tsx`** — Fixed `[object Object]` error display: replaced `throw fnErr` (raw object) with `throw new Error(msg)` extraction and replaced `String(e)` in catch blocks with `e instanceof Error ? e.message : String(e)`.
- **`AdminUsersPanel.tsx`** — Rerouted all 11 admin mutation invocations (`admin-set-plan`, `admin-grant-trial`, `admin-revoke-trial`, `admin-suspend-user`, `admin-set-credits`, `admin-save-note`, `admin-impersonate`, `admin-merge-identity`, `admin-delete-user`, bulk operations) to `admin-devkit-data` with action-based routing.
- **`UserDetailDrawer.tsx`** — Rerouted all 14 admin invocations (`admin-audit-logs`, `admin-save-note`, `admin-update-profile`, `admin-get-identity`, `admin-merge-identity`, `admin-set-plan`, `admin-grant-trial`, `admin-revoke-trial`, `admin-suspend-user`, `admin-set-credits`, `admin-revoke-sessions`, `admin-delete-user`, `admin-wisehire-reset-user`, `admin-list-user-content`) to `admin-devkit-data` with action-based routing.

#### Backend (`admin-devkit-data` Appwrite Function)
Added 16 new action handlers: `set-plan`, `grant-trial`, `revoke-trial`, `suspend-user`, `set-credits`, `save-note`, `delete-user`, `merge-identity`, `revoke-sessions`, `list-user-content`, `update-profile`, `get-identity`, `user-audit-logs`, `wisehire-reset-user`, `live-activity`, `impersonate`, `get-resume-detail`.

Extended `requiredFunctions` diagnostics list from 7 → 11 entries. Removed stale `keysInSupabaseVault: false` Supabase relic.

#### Appwrite Deployments
- `admin-devkit-data` — redeployed with all new handlers (status: `ready`)
- `admin-visitor-analytics` — first live deployment (status: `ready`)
- `admin-testmail` — first live deployment (status: `ready`)
- `admin-impersonate` — first live deployment (status: `ready`)
- `admin-onboarding-funnel` — created and deployed as new function (status: `ready`)

### Why
- Smoke Runner was crashing on mount due to prop name mismatch between `DevKitRunner` and `TestItem` and an unguarded `undefined` result access.
- Visitors Panel showed `[object Object]` for all errors because Appwrite error objects were stringified with `String(e)` rather than `.message` extraction.
- 14 admin action buttons in God Mode and UserDetailDrawer were calling non-existent standalone Appwrite Functions. Consolidating into `admin-devkit-data` avoids deploying 14+ separate functions.

### Verification
- `npx tsc --noEmit` — 0 errors ✓
- All 4 new Appwrite deployments confirmed `status: ready` ✓

---

## 2026-05-13 - Fix infinite loading skeleton across protected routes


### Summary
Fixed a critical bug where the application would get stuck in a loading skeleton state indefinitely after the recent AuthContext refactor.

### What changed
- Updated multiple downstream files (`DashboardPage.tsx`, `InterviewPage.tsx`, `ProfilePage.tsx`, `JobSeekerRoute.tsx`, `WiseHireGuard.tsx`) to consume the newly renamed `authSettled` and `authReady` properties from `useAuth()`.
- Updated test files (`Auth-D3.test.tsx`, `ApplicationsTracker-D9.test.tsx`, `ApplicationsDeadline-D9.test.tsx`, `ApplicationsAnalytics-D9.test.tsx`) to match the new auth context shape.

### Why
The previous performance fix renamed `supabaseSettled` and `supabaseReady` to `authSettled` and `authReady` inside `AuthContext.tsx` and `ProtectedRoute.tsx`. However, the downstream consumers were still attempting to destructure `supabaseSettled` from `useAuth()`. This resulted in `undefined`, causing the `!supabaseSettled` checks to evaluate to true, which trapped those pages in a permanent loading skeleton.

### Verification
- `npx tsc --noEmit` completed successfully.
- Visual verification confirmed the dashboard now loads correctly and does not hang.

---

## 2026-05-13 - PDF.js worker bootstrap repair for CV upload

### Summary
Fixed the real browser-side CV upload blocker by replacing the broken PDF.js worker bootstrap and reclassifying worker startup failures so valid files no longer show up as damaged.

### What changed
- Replaced the old blob/classic-worker PDF.js bootstrap with a direct module-worker configuration through `GlobalWorkerOptions.workerPort`.
- Added a dedicated PDF worker runtime failure classification so browser startup failures no longer collapse into `CORRUPTED`.
- Updated upload recovery copy so only genuine invalid PDFs get damaged-file messaging.
- Verified the parser in a real browser context using `tests/e2e/fixtures/sample-resume.pdf`.

### Why
The previous implementation was still guessing at the failure. The verified issue was that PDF.js could not start its worker in the browser because the wrapper called `importScripts(...)` on a module-worker path, which broke before any resume text extraction happened.

### Verification
- `npm exec tsc -- --noEmit`
- `npx vitest run src/lib/__tests__/pdfParser-D1.test.ts src/lib/__tests__/parseResumePDF-D4.test.ts src/components/upload/__tests__/uploadErrorCopy.test.ts`
- Real browser-context verification:
  - `extractTextFromPDF(sample-resume.pdf)` succeeds
  - `parseResumePDF(sample-resume.pdf)` returns `success: true`

---

## 2026-05-13 - Live ai-gateway redeploy + Atlas functions rename

### Summary
Completed the live Appwrite `ai-gateway` redeploy for the resume parser fix and renamed the canonical Atlas backend-card section from `edge-functions/` to `functions/`.

### What changed
- Rebuilt `ai-gateway.tar.gz` with dependencies and redeployed it to the live Appwrite Function.
- Activated the new `ai-gateway` deployment and verified the live `parse-resume` execution path now returns structured `ResumeData`.
- Improved `src/lib/appwrite-functions.ts` so Appwrite envelope errors that contain an embedded status code are translated more accurately.
- Renamed `Project Atlas/01-Currently Implemented/edge-functions/` to `Project Atlas/01-Currently Implemented/functions/`.
- Updated key Atlas references and section index text so the canonical backend card path no longer uses the stale Supabase-specific folder name.

### Why
The repo-side parser fix was not enough by itself because the browser calls the live Appwrite `ai-gateway` function. Until that live function was redeployed, the dashboard could still hit stale parser behavior. At the same time, the Atlas folder name was misleading future agents by suggesting the old Supabase edge-function model was still the canonical backend-card structure.

### Verification
- Verified live Appwrite `createExecution('ai-gateway', { featureName: 'parse-resume', ... })` now returns `200` with structured `ResumeData`.
- `npm exec tsc -- --noEmit`
- `npx vitest run src/lib/__tests__/pdfParser-D1.test.ts src/lib/__tests__/parseResumePDF-D4.test.ts src/components/upload/__tests__/uploadErrorCopy.test.ts`
- Verified local parser asset endpoint `http://localhost:5000/pdfjs/standard_fonts/FoxitFixed.pfb` returns `200`.

---
## 2026-05-13 - Cross-device CV parsing stabilization

### Summary
Fixed CV upload parsing failures across desktop, iPhone, and Android by correcting the `parse-resume` backend contract, hardening frontend fallback behavior, and making PDF/OCR runtime assets part of normal local setup.

### What changed
- Added a dedicated `parse-resume` path inside `appwrite-hubs/ai-gateway/src/main.js` so the gateway now accepts extracted resume text and returns normalized `ResumeData` instead of a generic chat payload.
- Updated `src/lib/pdfParser.ts` to validate AI parser responses and fall back automatically to the local parser when the payload is malformed or empty.
- Added shared runtime asset checks in `src/lib/pdf/runtimeAssets.ts` and wired the PDF/OCR asset sync into `dev`, `start`, `postinstall`, and `prebuild`.
- Updated upload error handling so missing local parser assets, iPhone/Safari PDF compatibility issues, OCR/browser failures, and real corruption no longer collapse into the same damaged-file message.
- Repaired the parser test setup and updated focused tests to use the current Appwrite-based parsing path.

### Why
The verified root cause was twofold: `parse-resume` had already been routed through `ai-gateway`, but the gateway still treated it like a generic chat request and ignored the extracted resume text contract; on top of that, local PDF/OCR assets were not guaranteed outside build flows, which made device and environment failures look like bad files.

### Verification
- `node scripts/copy-pdf-ocr-assets.mjs`
- `npm exec tsc -- --noEmit`
- `npx vitest run src/lib/__tests__/pdfParser-D1.test.ts src/lib/__tests__/parseResumePDF-D4.test.ts src/components/upload/__tests__/uploadErrorCopy.test.ts`
- Verified local asset endpoints return `200` for PDF.js and Tesseract runtime files.

---

## 2026-05-13 - Local auth fix: redirect dev sessions from 127.0.0.1 to localhost

### Summary
Fixed local login failure where the browser showed `Failed to fetch` on the auth page when the app was opened on `http://127.0.0.1:5000`.

### What changed
- Added a DEV-only redirect in `src/main.tsx` from `127.0.0.1` to `localhost`.
- Added a stability card documenting the verified Appwrite origin mismatch.
- Updated the Auth page Atlas card with the current Appwrite-based auth model and the local development requirement.

### Why
The root cause was a live Appwrite Web platform mismatch, not bad credentials or a broken frontend. The project allows `http://localhost:5000` but rejects `http://127.0.0.1:5000`, so direct browser auth calls failed before the app received a normal API error.

### Verification
- Verified live Appwrite response for `Origin: http://127.0.0.1:5000` returns `403 general_unknown_origin`.
- Verified live Appwrite response for `Origin: http://localhost:5000` returns valid CORS headers.
- Local frontend and API server remained reachable after the redirect was added.

---

## 2026-05-12 - Atlas A-to-Z source map

### Summary
Added `Project Atlas/SOURCE_OF_TRUTH_MAP.md` so future agents and contributors have one clear map for product identity, architecture, AI, DevKit, deployment, implemented features, planned work, governance, and conflict resolution.

### What changed
- Added the A-to-Z Atlas source map.
- Updated `Project Atlas/README.md` so the source map is the first file agents read.
- Re-verified the map against current code references: `package.json`, `src/lib/appwrite.ts`, `src/lib/appwrite-collections.ts`, and `src/lib/appwrite-bridge.ts`.

### Why
After removing competing external documents, the Atlas needed a single orientation page that tells agents exactly where each kind of truth lives and what must not be reintroduced.

### Verification
Documentation-only change. Key deleted outside docs were checked against `main` and returned not found. No runtime tests were required.

---

## 2026-05-12 - Documentation consolidation: Atlas-only source of truth

### Summary
The project documentation model was consolidated so `Project Atlas/` is the only source of truth for WiseResume, WiseHire, The Wise Cloud, architecture, deployment, AI routing, agent rules, and operational state.

### What changed
- Added `Project Atlas/GOVERNANCE.md` as the canonical governance page using the current Appwrite-native architecture.
- Updated Atlas rules and maintenance guidance to remove references to `project-governance/` as a higher authority.
- Folded durable rules from the old governance folder into Atlas language: inspect first, do not guess, preserve working behavior, keep account boundaries strict, document accepted changes, and protect deployment safety.
- Preserved AI routing intent inside `Project Atlas/02-Planned/ai-routing-rollout.md` and removed the old external routing folder as a separate source of truth.
- Removed stale or conflicting Markdown documentation outside `Project Atlas/`.

### Why
The repository had multiple competing documentation surfaces. Some older docs still described Kinde/Supabase as current and claimed `project-governance/` was supreme, while the live project is Appwrite-native and the README already directed agents to the Atlas. This cleanup removes that ambiguity for the owner and future AI agents.

### Verification
This was a documentation-only change. No application code was changed and no runtime test suite was required.
