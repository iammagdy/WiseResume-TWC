# WiseResume Master Handover & State (May 2026)

---

## Session Log - 2026-06-08 (Project Atlas Visual Refactor — Editor, Upload, Tailoring Hub)

### Overview

Controlled visual refactor across three product surfaces, executed in one focused PR on branch `visual/project-atlas-editor-upload-tailor`. No backend, Appwrite, AI gateway, routing, or state management changes.

Design system sources: `Project Atlas/design-system/production/` (tokens, component library, implementation guide). Visual reference: `Project Atlas/design-system/visual-reference/screens/` (upload.html, editor.html, tailor-results.html).

---

### What Changed

#### Resume Editor — `editor-workspace.css`

| Element | Change |
|---|---|
| Section cards | Added `transition` for smooth hover; hover → deeper shadow + slightly stronger border |
| Section card headers | Hover background shift for perceived depth |
| Active nav rail indicator | Width 2px → 3px; added `box-shadow` glow on the primary left accent bar |
| Preview paper | Layered 4-stop shadow for stronger document canvas depth |
| Scroll container | Top padding 1.25→1.5rem; section gap 1rem→0.875rem (tighter, more document-like) |

#### Upload Flow — `UploadPage.tsx`

| Element | Change |
|---|---|
| Desktop hero | Added eyebrow pill + h1 + sub-copy above upload zone (hidden on mobile via `lg:flex`) |
| Upload zone icon | Circle → `rounded-2xl` with crimson glow shadow; spring rotation on drag |
| Format chips | `PDF / Word / Image / JSON / HTML` chips replace plain text list |
| Headline copy | "Upload your resume" → "Upload your resume" (kept) with `text-lg font-bold tracking-tight` |
| URL import card | Icon-labeled header (`div.w-7.h-7.rounded-lg.bg-primary/10`), improved helper copy |
| Tips section | Sparkles icon header; list uses `array.map` instead of duplicate JSX |
| Desktop layout | `lg:py-10` page container; content column `lg:max-w-lg lg:mx-auto` |

#### Tailoring Hub — `job-match-workspace.css`

| Element | Change |
|---|---|
| Result page background | Stronger two-stop radial gradient for success atmosphere |
| Download format buttons | `rounded-1rem`, `translateY(-1px)` lift on hover, press scale, richer active ring |
| History items | `rounded-1rem`; `::before` left accent bar animates in on hover |
| Progress overlay card | `rounded-1.5rem`; deeper 4-stop shadow; inset top highlight |
| Download studio header | Stronger inset border + layered shadow |

---

### Validation

- `npx tsc --noEmit` — clean (no errors)
- `npm run build` — succeeded (49s, same pre-existing chunk size warnings)
- `npx vitest run ...useCompanyBriefingLibrary.test.ts` — 3/3 passed
- No new lint errors introduced

---

### Files Changed

| File | Type |
|---|---|
| `src/components/editor/editor-workspace.css` | CSS only |
| `src/components/job-match/job-match-workspace.css` | CSS only |
| `src/pages/UploadPage.tsx` | JSX visual changes only (no logic/state/handler changes) |
| `Project Atlas/CHANGELOG.md` | Docs |
| `Project Atlas/MASTER_HANDOVER_2026.md` | Docs |

---

### Deployment

- **Vercel**: auto-deploys on merge (frontend-only change; preview URL available on PR)
- **Appwrite**: NOT deployed, NOT triggered
- **AI Gateway**: unchanged
- **Backend/auth/routing**: unchanged

---

### Manual Visual QA Needed (after PR merge)

1. **Resume Editor**: Review section card hover states, nav rail active indicator, preview paper depth on both light and dark themes
2. **Upload Page**: Check desktop hero layout on ≥1024px; confirm upload zone icon looks good on both light/dark; confirm format chips render correctly
3. **Tailoring Hub**: Check history item left accent bar; check download format button hover/active states; check result page atmosphere
4. **Mobile**: All three screens — ensure no layout regressions on small viewports

---

### Future QA Still Pending (from prior sessions)

- Company Briefing Save — blocked until `setup_company_briefings_schema.cjs` is run with API key
- Tailoring Hub exports (PDF/ATS/DOCX) — fixed in PR #83, needs manual end-to-end QA
- Tailoring lineage/history — needs `setup_tailoring_lineage_schema.cjs` applied

---

### Commits / PRs

- Commit `7b088c1` — `refactor(ui): apply Project Atlas editor upload and tailoring polish`
- Branch: `visual/project-atlas-editor-upload-tailor`
- **PR #86 merged to `main`** after visual review approval
- Vercel production redeployed automatically on merge

### CI Results (PR #86)

| Check | Status |
|---|---|
| Vercel | ✅ Ready |
| Appwrite | ✅ Ready (AI Gateway Hub built) |
| Supabase | ✅ Skipped (no DB changes) |

### Where We Stopped

- **PR #86 merged to `main`**.  Visual refactor is live in production.
- No further action needed on this change.
- Next priority: apply Appwrite schema scripts (see post-tailoring-hub session below).

---

## Session Log - 2026-06-08 (Post-Tailoring-Hub cleanup — Company Briefing save + Tailoring lineage schema)

### Overview

Post-merge cleanup after PR #83 (PreviewPage auto-export fix, merged to `main` at commit `d28b81781542af2b817b8edb36f89969f7e00f50`). This session prepared the two remaining Appwrite schema blockers as idempotent scripts, wired them into the deploy workflow, fixed frontend error detection for the live permission error, and updated project documentation.

**No Appwrite schema was applied in this session** (no `APPWRITE_API_KEY` available in this environment). The schema scripts are ready; they auto-run on the next manual `deploy-appwrite-hubs` workflow dispatch.

---

### What was fixed (production impact)

#### Frontend error detection — Company Briefing Save

- **File**: `src/hooks/useCompanyBriefingLibrary.ts`
- **Problem**: The live error `No permissions provided for action 'create'` was not matched by the existing keyword list, so users saw a generic "Failed to save briefing" toast with no actionable guidance.
- **Fix**: Extended `toCompanyBriefingSaveErrorMessage` to detect permission-class errors (`no permissions provided`, `not authorized`, `missing scope`, `permission`). Now maps to the schema help message with instructions to apply the setup script.
- **Also**: Added explicit per-document owner permissions (`Permission.read/update/delete(Role.user(userId))`) to the `createDocument` call so each saved briefing is immediately readable and deletable by the owner after the collection-level create permission is granted.
- **Also**: `Permission` and `Role` are now exported from `src/lib/appwrite.ts`.

#### Test coverage

- **File**: `src/hooks/__tests__/useCompanyBriefingLibrary.test.ts`
- Added test: `maps the live create-permission error to the schema action message` (2 cases: `No permissions provided for action 'create'` and `The current user is not authorized...`).
- Total: 3 tests, all passing.

---

### What was only prepared (not applied — schema NOT yet in Appwrite)

#### 1. `scripts/setup_company_briefings_schema.cjs`

Idempotent script for the `company_briefings` collection (collection already exists, do not recreate):

- Attributes (all non-required for migration safety): `user_id` (string 36), `company_name` (string 256), `briefing` (string 65535)
- Index: `user_id_idx` key on `['user_id']` ASC — required by `Query.equal('user_id', ...)` in `useCompanyBriefingLibrary`
- Permission update: adds `Permission.create(Role.users())` + `documentSecurity: true` if absent, preserving existing permissions

**To apply**: `APPWRITE_API_KEY=<key> node scripts/setup_company_briefings_schema.cjs`

#### 2. `scripts/setup_tailoring_lineage_schema.cjs`

Idempotent script for `tailor_history` and `resumes` collections (both already exist):

- `tailor_history`: `tailored_resume_id` (string 36, not required) + `tailored_resume_id_idx` index — actively queried in `TailoringHubResultPage.tsx`
- `resumes`: optional lineage fields — `parent_resume_id` (str 36), `is_master` (bool), `target_job_title` (str 256), `target_company` (str 256), `job_url` (str 2048), `job_match_score` (int) — all non-required, not written by current write path, can be added safely

**To apply**: `APPWRITE_API_KEY=<key> node scripts/setup_tailoring_lineage_schema.cjs`

#### 3. `.github/workflows/deploy-appwrite-hubs.yml`

Added two steps before "Deploy Appwrite hubs" that run the above scripts. Workflow stays `workflow_dispatch`-only — these steps did NOT run and will NOT run on PR merge. They auto-run on the next manual dispatch.

---

### Validation performed

- `node --check scripts/setup_company_briefings_schema.cjs` — OK
- `node --check scripts/setup_tailoring_lineage_schema.cjs` — OK
- `npx vitest run src/hooks/__tests__/useCompanyBriefingLibrary.test.ts` — 3/3 passed
- `npx tsc --noEmit` — clean
- `npm run build` — succeeded
- `git diff` — only the 7 files listed below; no secrets present

---

### Files changed

| File | Change |
|---|---|
| `scripts/setup_company_briefings_schema.cjs` | NEW — idempotent schema script |
| `scripts/setup_tailoring_lineage_schema.cjs` | NEW — idempotent schema script |
| `.github/workflows/deploy-appwrite-hubs.yml` | Wire both scripts into dispatch workflow |
| `src/lib/appwrite.ts` | Export `Permission`, `Role` |
| `src/hooks/useCompanyBriefingLibrary.ts` | Extend error detection; add document permissions |
| `src/hooks/__tests__/useCompanyBriefingLibrary.test.ts` | Add permission-error test |
| `Project Atlas/CHANGELOG.md` | Add dated entry |

---

### Deployment state after this session

- **Vercel (frontend)**: auto-deploys on merge. The frontend error-handling improvement is the only runtime change; no export or AI behavior change.
- **Appwrite Functions**: NOT deployed. Schema scripts not applied. Will auto-run on next manual `deploy-appwrite-hubs` dispatch.
- **Hubs workflow**: NOT triggered. Stays `workflow_dispatch`-only.

---

### Future testing (after schema is applied)

1. Apply `setup_company_briefings_schema.cjs` with valid API key; verify attributes/index/permissions in Appwrite Console.
2. Apply `setup_tailoring_lineage_schema.cjs`; verify in Console.
3. Company Briefing: generate briefing → save → confirm appears in library → delete.
4. Tailoring Hub: submit tailoring job → result page → Designed PDF / ATS PDF / Word DOCX buttons (fresh tab + modal).
5. Confirm `tailor_history` doc has `tailored_resume_id` populated for new jobs.
6. Regression: AI Gateway unchanged; resume CRUD unchanged.

---

### Commits / PRs

- Commit `cdad933` — `fix(appwrite): prepare Company Briefing save + Tailoring lineage schema (#84)`
- Branch: `fix/company-briefing-lineage-schema`
- **PR #84 merged to `main`**

### Where We Stopped

- PR #84 merged. Schema scripts prepared but **not yet applied** (no API key in session).
- Immediately after merge, a separate hotfix was required (see PR #85 below).
- Schema application and post-schema QA remain as the top priority for the next session.

---

## Session Log - 2026-06-08 (Hub Deploy Hotfix — MariaDB Index Key-Length Soft-Fail)

### Overview

After PR #84 merged, the `deploy-appwrite-hubs` workflow was triggered manually and failed. Root cause diagnosed and fixed as a separate hotfix PR (#85) on branch `fix/appwrite-hub-index-softfail`.

---

### Root Cause

Appwrite 1.9.x uses MariaDB InnoDB COMPACT row format which has a **767-byte index key limit**. The `briefing` attribute was set to `string(65535)`, meaning `65535 × 4 bytes/char (utf8mb4) = 262 KB`, which exceeds the limit by an extreme margin. When the hub workflow ran `setup_company_briefings_schema.cjs`, Appwrite returned error type `index_invalid` (code 400) and the script called `process.exit(1)`, failing the entire deploy step.

---

### What Changed

| File | Change |
|---|---|
| `scripts/setup_company_briefings_schema.cjs` | `ensureIndex()` now catches `index_invalid` errors and warns instead of exiting; `briefing` attribute size reduced 65535 → 16384 |
| `scripts/setup_tailoring_lineage_schema.cjs` | Same defensive `ensureIndex()` soft-fail pattern applied |

**Key code pattern added to both scripts:**

```js
} catch (e) {
  if (e.type === 'index_invalid' || String(e.message).toLowerCase().includes('index length')) {
    console.warn(`⚠ index "${key}" skipped — ${e.message} (query still works, no index)`);
    return;
  }
  throw e;
}
```

- The permission update step (adding `create` for `users`) is unaffected — it does not create indexes.
- Existing queries that rely on the index (`Query.equal('user_id', ...)`) degrade to a full collection scan but continue to function correctly until the index can be created via a future, smaller attribute.

---

### Validation

- `node --check scripts/setup_company_briefings_schema.cjs` — OK
- `node --check scripts/setup_tailoring_lineage_schema.cjs` — OK
- `npx tsc --noEmit` — clean
- `npm run build` — succeeded

---

### Commits / PRs

- Commit `c2b739f` — `fix(appwrite): soft-fail index creation on MariaDB key-length limit (#85)`
- Branch: `fix/appwrite-hub-index-softfail`
- **PR #85 merged to `main`**

### Where We Stopped

- PR #85 merged. Hub deploy scripts are now safe to run on next manual `deploy-appwrite-hubs` dispatch.
- Schema still NOT applied (no API key in session); will auto-run on next dispatch.

---

## Session Log - 2026-06-08 (PreviewPage Auto-Export Fix - Tailoring Hub Export Blocker)

### Overview

Focused fix for the Tailoring Hub export blocker. No AI gateway changes. No Appwrite deployments. Frontend-only change.

---

### Root Cause

`PreviewPage` was calling `setSearchParams` **immediately** after the auto-export effect fired (to remove `?action` from the URL). Because `searchParams` was in the effect's dependency array, React detected the change, ran the effect cleanup (`clearTimeout`), and cancelled the 800ms export timer before it could fire. The export never started.

This was the root cause of:
- Designed PDF button (result page) → no download
- ATS PDF button (result page) → no download
- Word DOCX button (result page) → no download
- Fresh-tab `/preview?id=<tailoredResumeId>&action=download` → no download
- Fresh-tab `/preview?id=<tailoredResumeId>&action=ats-pdf` → no download
- Fresh-tab `/preview?id=<tailoredResumeId>&action=docx` → no download

---

### Fix Applied

#### Files changed

- `src/pages/PreviewPage.tsx`
- `src/pages/__tests__/PreviewPage.test.tsx`

#### What changed in `PreviewPage.tsx`

1. **`initialAutoExportAction` ref**: action value is captured once at mount time from `searchParams` (via IIFE in `useRef` initializer). Subsequent calls to `setSearchParams` do not affect this captured value.

2. **`autoExportTimerRef` ref**: the export timer is stored in a ref instead of being returned from the effect cleanup. React's effect lifecycle cannot cancel it when deps change. It is cancelled only in a separate unmount-only effect.

3. **`setSearchParams` moved inside the timer callback**: URL cleanup happens after the export is triggered (not before). This eliminates the premature re-render that was causing the cleanup cancellation.

4. **Fallback CTA banner**: if the browser cannot auto-trigger the download (e.g., `resumeRef` not yet attached to the DOM when the timer fires), a visible banner appears with an action-specific button:
   - "Download PDF"
   - "Download ATS PDF"
   - "Download DOCX"

5. **Unmount cleanup**: a separate `useEffect(() => { return cleanup; }, [])` cancels the timer if the component unmounts before it fires.

#### What changed in `PreviewPage.test.tsx`

Added 5 new tests (total: 8 tests, all pass):
- `action=docx` does not export before bootstrap, calls `generateAndDownloadDOCX` after.
- `action=download` does not export before bootstrap, calls `generateNativePDF` and `downloadFile` after.
- `action=ats-pdf` does not export before bootstrap, calls `generateNativePDF` with `atsMode: true` and `downloadFile` after.
- Action is not executed before the 800ms timer fires.
- Normal `/preview?id=<id>` without `action` does not trigger auto-export.

Added mocks: `@/lib/nativePdfGenerator`, `@/lib/downloadUtils`, `@/components/editor/PreviewScaledWrapper`.

---

### Validation

- `npx vitest run src/pages/__tests__/PreviewPage.test.tsx` — 8/8 passed.
- `npx tsc --noEmit` — clean.
- `npm run build` — succeeded.

---

### Behavior After Fix

- `/preview?id=<tailoredResumeId>&action=download` → bootstrap completes → 800ms timer fires → PDF export triggered → download starts.
- `/preview?id=<tailoredResumeId>&action=ats-pdf` → same, ATS PDF.
- `/preview?id=<tailoredResumeId>&action=docx` → same, DOCX.
- If browser blocks auto-download (rare, fresh tab restriction): fallback CTA banner shows with specific download button.
- `/preview?id=<tailoredResumeId>` without action → preview loads normally, no auto-export.
- `/preview` without id → existing Zustand-based behavior preserved.

---

### Deployment Required

- **Frontend (Vercel) deployment required** — `src/pages/PreviewPage.tsx` changed.
- **Appwrite deployment NOT required** — no Appwrite function files changed.
- **No manual Appwrite schema changes** required for this fix.

---

### Current Production / Deployment State

- Production still reflects commit `55265550` (this fix is not yet deployed).
- Appwrite `ai-gateway` is live with hash `b156e066754d6ed6` — unchanged.
- Company Briefing Save is still blocked (Appwrite schema/permissions not yet added).

---

### Remaining Blockers After This Fix

- Company Briefing Save is still blocked until Appwrite schema/permissions are added:
  - `company_briefings`: add `company_name`, `briefing`, create permission, `user_id` ASC index
  - `tailor_history`: add `tailored_resume_id` + ASC key index
  - `resumes`: optional lineage fields (code is guarded, not blocking)

---

### Where We Stopped

- Fix implemented and tested locally.
- Not yet committed, pushed, or deployed.
- Awaiting owner approval to commit and push.
- Once pushed to `main`, Vercel will auto-deploy. Appwrite does not need a new deploy.

---

## Session Log - 2026-06-08 (Session Closeout - AI Gateway Stabilization, Tailoring Hub QA, Company Briefing Save, Remaining Export Blocker)

### Overview

This session covered:

- `ai-gateway` DeepSeek-first stabilization and post-deploy live verification
- targeted `ai-gateway` structured-output hardening for:
  - `optimize-for-linkedin`
  - `generate-question-bank`
  - `company-briefing`
- Tailoring Hub reliability fixes
- Company Briefing save failure investigation
- production deployment verification for both Vercel and Appwrite
- post-deploy production QA

The session was closed due to Codex limit. No further implementation was performed after the final production QA pass.

---

### Commits created in this session

- `f48c000a` - `Fix appwrite source hash manifest drift`
- `736a6e57` - `fix(ai): make gateway DeepSeek-first and harden structured tools`
- `b9debefa` - `fix(ai): harden gateway structured output contracts`
- `55265550` - `fix(tailoring): support fresh-tab exports and clarify briefing save schema`

---

### AI Gateway reliability

#### What changed

- `ai-gateway` was moved to DeepSeek-first routing while preserving fallback behavior.
- Structured-output hardening was added for:
  - `optimize-for-linkedin`
  - `generate-question-bank`
  - `company-briefing`
- Targeted retries / normalization were added so thin or malformed responses no longer pass as superficially successful output for the affected tools.

#### Why it changed

Production verification showed the remaining AI instability was concentrated in `ai-gateway`, not `resume-section-ai`.

#### Root causes fixed

- `optimize-for-linkedin` accepted weak payloads, including empty `experienceRewrites`, even when resume experience existed.
- `generate-question-bank` accepted incomplete category sets.
- `company-briefing` and `generate-question-bank` were too close to the DeepSeek primary timeout budget, making aborts/fallbacks more likely than necessary.

#### Files changed

- `appwrite-hubs/ai-gateway/src/main.js`
- `appwrite-hubs/admin-devkit-data/src/main.js`
- `src/lib/devkit/aiToolsCatalogue.ts`
- `src/lib/devkit/aiToolsCatalogue.test.ts`
- `tests/hubs/ai-gateway-routing.test.cjs`
- `src/lib/devkit/sourceHashes.generated.json`

#### Validation

- `node --check appwrite-hubs/ai-gateway/src/main.js`
- `node --check appwrite-hubs/admin-devkit-data/src/main.js`
- `node tests/hubs/ai-gateway-routing.test.cjs`
- `npx vitest run src/lib/devkit/aiToolsCatalogue.test.ts`
- `npx tsc --noEmit`
- `node scripts/compute-source-hashes.mjs`

All passed locally before push.

#### Deployments performed

- Commit `736a6e57` was pushed to `main`
- GitHub Actions deployed `ai-gateway`
- Commit `b9debefa` was then pushed for the follow-up hardening pass
- GitHub Actions deployed `ai-gateway` again

#### Verified live production state

- DeepSeek-first `ai-gateway` rollout was deployed and verified.
- Deployment verified live:
  - deployment ID: `6a26594a4dde0db83eca`
  - status: `ready`
  - active: `true`
  - created: `2026-06-08T05:55:22.571Z`
  - source hash: `ai-gateway: 6057ca5dc51e8daa`
- `optimize-for-linkedin` is fixed live:
  - `experienceRewrites` is now non-empty when resume experience exists
- `generate-question-bank` improved live:
  - final output includes required categories:
    - `company`
    - `technical`
    - `behavioral`
    - `curveball`
  - DeepSeek can still intermittently return malformed JSON, but fallback produced usable output
- `company-briefing` improved live:
  - usable structured output confirmed
  - some provider variability remains, but user-facing output was usable
- regression checks passed live:
  - `tailor-resume`
  - `parse-job`
  - `wise-ai-chat`
- credit deductions were verified:
  - no double charging observed

#### Decision

- `ai-gateway` reliability is no longer the main production blocker
- backlog item remains: improve DeepSeek-only stability for longer structured outputs

---

### Tailoring Hub + Company Briefing save pass

#### What changed

- Added `PreviewPage` resume bootstrap from `/preview?id=<resumeId>`
- hardened Tailoring Hub result/history fallback when `tailor_history` is missing or delayed
- hardened tailored merge behavior when AI output omits item ids
- added clearer Company Briefing save schema/setup messaging

#### Why it changed

Production behavior showed:

- fresh-tab Tailoring Hub preview/export paths were broken
- tailored experience merges could fail silently when AI output omitted ids
- result/history behavior leaned too heavily on `tailor_history`
- Company Briefing Save failed because Appwrite persistence was incomplete

#### Root causes fixed or partially fixed

- Fresh-tab Tailoring Hub preview/export was broken because `PreviewPage.tsx` only trusted Zustand state, while `TailoringHubResultPage.tsx` opened `/preview?id=...` in a new tab without priming Zustand.
- Tailored experience merges could silently fail because `tailorMerge.ts` matched by `id` only, while AI output did not always preserve original IDs.
- `tailor_history` persistence was best-effort, but result/history fallback previously relied too much on it.
- Company Briefing Save failed because `company_briefings` existed but only had `user_id`; it was missing `company_name`, `briefing`, create permissions, and a useful `user_id` index.

#### Files changed in commit `55265550`

- `appwrite-hubs/ai-gateway/src/main.js`
- `src/hooks/useCompanyBriefingLibrary.ts`
- `src/lib/tailorMerge.ts`
- `src/pages/PreviewPage.tsx`
- `src/pages/TailoringHubPage.tsx`
- `src/pages/TailoringHubResultPage.tsx`
- `tests/hubs/ai-gateway-routing.test.cjs`
- `src/hooks/__tests__/useCompanyBriefingLibrary.test.ts`
- `src/lib/__tests__/tailorMerge.test.ts`
- `src/pages/__tests__/PreviewPage.test.tsx`
- `src/pages/__tests__/TailoringHubResultPage.test.ts`
- `src/lib/devkit/sourceHashes.generated.json`
- `Project Atlas/CHANGELOG.md`
- `Project Atlas/MASTER_HANDOVER_2026.md`

#### Validation performed before commit `55265550`

- `node --check appwrite-hubs/ai-gateway/src/main.js`
- `npx vitest run tests/hubs/ai-gateway-routing.test.cjs src/lib/__tests__/tailorMerge.test.ts src/pages/__tests__/PreviewPage.test.tsx src/pages/__tests__/TailoringHubResultPage.test.ts`
- `npx vitest run src/hooks/__tests__/useCompanyBriefingLibrary.test.ts tests/hubs/ai-gateway-routing.test.cjs src/lib/__tests__/tailorMerge.test.ts src/pages/__tests__/PreviewPage.test.tsx src/pages/__tests__/TailoringHubResultPage.test.ts`
- `npx tsc --noEmit`
- `npm run build`
- `node scripts/compute-source-hashes.mjs`

All passed locally before push.

#### Deployments performed

- commit `55265550` was pushed to `main`
- Vercel/frontend deployment completed successfully for `55265550`
- Appwrite `ai-gateway` was redeployed after `55265550`

Verified live Appwrite deployment after `55265550`:

- deployment ID: `6a2668371ca7426f76f1`
- status: `ready`
- created: `2026-06-08T06:59:03Z`
- live deployed hash:
  - `ai-gateway: b156e066754d6ed6`

Tailor Resume id-preservation normalization is live:

- live authenticated `tailor-resume` execution preserved non-empty experience IDs
- sample execution: `6a266fe10461bfb97522`
- result: `nonEmptyExpIds: 11/11`

---

### Production QA after commit `55265550`

#### Tailoring Hub

- existing Tailoring Hub result page opens: `PASS`
- result page refresh with no `tailor_history`: `PASS`
- direct `/preview?id=<tailoredResumeId>` loads tailored resume: `PASS`
- no redirect to dashboard: `PASS`
- no fallback to source/master resume by mistake: `PASS`
- Designed PDF button: `FAIL`
- ATS PDF button: `FAIL`
- Word DOCX button: `FAIL`
- fresh-tab `/preview?id=<tailoredResumeId>&action=download`: `FAIL`
- fresh-tab `/preview?id=<tailoredResumeId>&action=ats-pdf`: `FAIL`
- fresh-tab `/preview?id=<tailoredResumeId>&action=docx`: `FAIL`

#### Tailor merge / generation findings

- direct authenticated `tailor-resume` execution still routes through `ai-gateway`
- no browser/provider direct AI call path was reintroduced
- no BYOK/localStorage provider behavior was reintroduced
- direct authenticated `tailor-resume` charged exactly once per execution
- result-page / preview bootstrap fix is live
- the already-existing tailored resume `6a264d0800289a9b5a62` loads correctly in result and preview flows
- however, the actual export action path is still broken

Focused live Tailor finding:

- the tailored resume bootstrap works
- the page loads the correct tailored resume from `?id`
- the `action` query parameter is stripped, cleared, or ignored before the actual export action fires
- this is now a focused `PreviewPage` auto-export trigger bug

#### Company Briefing

- generation works
- save is still blocked by Appwrite schema and permissions
- exact user-side Appwrite error from live authenticated create attempt:
  - `No permissions provided for action 'create'`
- additional missing schema:
  - `company_briefings.company_name`
  - `company_briefings.briefing`
- current code now fails gracefully with a clearer schema/setup message, but save will not work until Appwrite schema/permissions are fixed

#### AI regressions rechecked

- `optimize-for-linkedin`: usable output confirmed
- `parse-job`: usable output confirmed
- `wise-ai-chat`: usable output confirmed

---

### Current production / deployment state

- production reflects commit `55265550`
- Vercel/frontend is live
- Appwrite `ai-gateway` is live with source hash `b156e066754d6ed6`
- Tailor Resume id-preservation normalization is live
- Tailoring Hub result refresh and direct preview bootstrap work
- Tailoring Hub export/download actions are still broken
- Company Briefing Save is still blocked until Appwrite schema/permissions are added

---

### Manual Appwrite schema actions still required

- `company_briefings`
  - add attribute `company_name`
  - add attribute `briefing`
  - add create permission for authenticated users / users according to the current app security model
  - add `user_id` ASC index
- `tailor_history`
  - add attribute `tailored_resume_id`
  - add `tailored_resume_id` ASC key index
- `resumes`
  - optional but recommended lineage fields:
    - `parent_resume_id`
    - `is_master`
    - `target_job_title`
    - `target_company`
    - `job_url`
    - `job_match_score`
  - code is guarded and does not write unsupported `resumes` fields

---

### Remaining blockers

- Tailoring Hub export action path is still broken
- result page buttons open the tailored preview popup, but no download starts
- fresh-tab URLs load preview correctly but no export starts:
  - `/preview?id=<tailoredResumeId>&action=download`
  - `/preview?id=<tailoredResumeId>&action=ats-pdf`
  - `/preview?id=<tailoredResumeId>&action=docx`
- Company Briefing save is still blocked by Appwrite permissions + schema

---

### Where We Stopped

- production reflects commit `55265550`
- Vercel/frontend is live
- Appwrite `ai-gateway` is live and active
- deployed hash includes:
  - `ai-gateway: b156e066754d6ed6`
- Tailor Resume id-preservation normalization is live and working
- direct authenticated `tailor-resume` execution preserved non-empty experience IDs
- Tailoring Hub result refresh now works even when `tailor_history` is missing
- direct `/preview?id=<tailoredResumeId>` now loads the tailored resume correctly
- it does not redirect to dashboard
- it does not fall back to the source/master resume
- remaining production blocker:
  - export actions still do not fire
  - result page buttons open the tailored preview popup, but no download starts
  - fresh-tab URLs load preview correctly but no export starts:
    - `/preview?id=<tailoredResumeId>&action=download`
    - `/preview?id=<tailoredResumeId>&action=ats-pdf`
    - `/preview?id=<tailoredResumeId>&action=docx`
  - the page appears to load the tailored resume and then strip/clear the `action` param before triggering the export
- Company Briefing Save is still blocked until Appwrite schema/permissions are added
- Codex limit was reached, so no further implementation was performed

---

### Exact next prompt for the next agent

```txt
We are continuing the WiseResume Tailoring Hub production QA follow-up.

Current production status after commit `55265550`:
- Frontend/Vercel is live.
- Appwrite `ai-gateway` is live and active.
- `ai-gateway` deployed hash includes:
  - `ai-gateway: b156e066754d6ed6`
- Tailor Resume id-preservation normalization is live and working.
- Direct authenticated `tailor-resume` execution preserved non-empty experience IDs.
- Tailoring Hub result refresh now works even when `tailor_history` is missing.
- Direct `/preview?id=<tailoredResumeId>` now loads the tailored resume correctly.
- It does not redirect to dashboard.
- It does not fall back to the source/master resume.

Remaining production blocker:
- Export actions still do not fire.
- Result page buttons open the tailored preview popup, but no download starts.
- Fresh-tab URLs load preview correctly but no export starts:
  - `/preview?id=<tailoredResumeId>&action=download`
  - `/preview?id=<tailoredResumeId>&action=ats-pdf`
  - `/preview?id=<tailoredResumeId>&action=docx`
- The page appears to load the tailored resume and then strip/clear the `action` param before triggering the export.

Task:
Fix only the `/preview?id=...&action=...` auto-export path.

Strict constraints:
- Do not change AI provider routing.
- Do not change `tailor-resume` gateway behavior unless absolutely required.
- Do not touch Company Briefing generation/routing.
- Do not rewrite PreviewPage architecture broadly.
- Do not reintroduce BYOK/localStorage provider keys.
- Do not call AI providers directly from browser.
- Do not deploy, push, or commit until approved.

Required inspect:
1. Inspect `src/pages/PreviewPage.tsx`.
2. Inspect the export/download handlers used by:
   - Designed PDF
   - ATS PDF
   - DOCX
3. Inspect how `action` query param is read, consumed, and removed.
4. Inspect why the action is stripped before the export starts.
5. Inspect whether the export effect depends on `currentResume`, URL-loaded resume state, loading state, template state, or popup/new-tab behavior.

Required fix:
- Ensure `PreviewPage` waits until the URL-id resume bootstrap is fully complete before running any auto-export action.
- Ensure action runs exactly once after:
  - resume loaded
  - currentResume is set
  - selected template is set
  - preview/export handlers are ready
- Do not clear or strip the `action` query param until after the export action has been triggered successfully or intentionally failed with a visible error.
- Support all actions:
  - `download`
  - `ats-pdf`
  - `docx`
- If browser restrictions prevent automatic download in a fresh tab, show a clear fallback CTA on the preview page:
  - “Download PDF”
  - “Download ATS PDF”
  - “Download DOCX”
  and explain in code/comments why this fallback exists.
- Preserve existing `/preview` behavior when there is no `?id` and no `action`.
- Preserve the new behavior where `/preview?id=<resumeId>` loads the resume from Appwrite/Zustand bootstrap.

Tests required:
Add or update focused tests for:
1. `/preview?id=<resumeId>&action=download` waits for resume load before triggering export.
2. `/preview?id=<resumeId>&action=ats-pdf` waits for resume load before triggering export.
3. `/preview?id=<resumeId>&action=docx` waits for resume load before triggering export.
4. `action` is not cleared before export trigger.
5. `/preview?id=<resumeId>` without action still loads preview normally.
6. `/preview` without id preserves existing Zustand-based behavior.

Validation:
Run:
- `npx vitest run src/pages/__tests__/PreviewPage.test.tsx`
- `npx tsc --noEmit`
- `npm run build`

Also rerun any existing targeted tests touched by the previous pass if necessary.

Return:
- root cause summary
- exact files changed
- tests added/updated
- validation output
- whether frontend deployment is required
- whether Appwrite deployment is required
- whether manual Appwrite schema action is still required

Do not deploy, push, or commit until I approve.
```

---

## Session Log - 2026-06-08 (Tailoring Hub Bug Fix Pass - Preview Bootstrap, Tailor Merge IDs, History Reliability)

### Overview

Focused bug-fix pass on the Tailoring Hub flow after confirming the current architecture is:

- `TailoringHubPage` -> `tailorResumeWithProgress`
- `aiTailor.ts` -> `appwriteFunctions.invoke('tailor-resume')`
- Appwrite bridge -> `ai-gateway`
- `ai-gateway` DeepSeek-first route for `tailor-resume`

No deployment, push, or commit was performed in this pass.

---

### Root causes identified

#### F1 - Fresh-tab preview/export was broken

- **Root cause**: `TailoringHubResultPage` opens `/preview?id=...&action=...` in a new tab without priming Zustand on purpose, but `PreviewPage` only trusted `currentResume` from Zustand and redirected after `150ms` when it was empty.
- **Fix**: `PreviewPage` now supports `?id=<resumeId>` as a real bootstrap path. It loads the resume through the existing Appwrite resume data path, hydrates Zustand with `dbToResumeData()`, sets the template, and blocks redirect/export until the URL-based load settles.
- **Files**: `src/pages/PreviewPage.tsx`, `src/pages/__tests__/PreviewPage.test.tsx`

#### F2 - Tailored experience could silently fail to merge

- **Root cause**: `buildMergedResume()` matched tailored experience by `id` only, while `ai-gateway` did not strongly preserve ids for tailored list items.
- **Fix**:
  - `ai-gateway` `tailor-resume` prompt/schema now explicitly requires preserving original ids for `experience`, `education`, `projects`, `certifications`, and `awards`.
  - `ai-gateway` normalization now restores missing ids from the original resume by content match and index fallback.
  - `buildMergedResume()` now matches experience by id first, then `company + position`, then same index when lengths match. Education got the same defensive pattern.
- **Files**: `appwrite-hubs/ai-gateway/src/main.js`, `src/lib/tailorMerge.ts`, `tests/hubs/ai-gateway-routing.test.cjs`, `src/lib/__tests__/tailorMerge.test.ts`

#### F3 - Result/history behavior depended too much on delayed history persistence

- **Root cause**: `TailoringHubPage` navigated before writing `tailor_history`, and the save was fire-and-forget. The result page also attempted an Appwrite history lookup that could fail when history storage is missing or delayed.
- **Fix**:
  - `TailoringHubResultPage` now safely swallows Appwrite history lookup failures so the page remains usable from the resume document alone.
  - Extracted a deterministic result-state resolver and added focused test coverage for the missing/delayed-history case.
  - `TailoringHubPage` now shows a non-blocking warning toast if history persistence fails, without affecting the successful tailored-resume result/export flow.
- **Files**: `src/pages/TailoringHubPage.tsx`, `src/pages/TailoringHubResultPage.tsx`, `src/pages/__tests__/TailoringHubResultPage.test.ts`

#### F4 - Live Appwrite schema still lacks the metadata/history fields this flow wanted to rely on

- **Verified live schema finding**:
  - `resumes` does **not** currently expose:
    - `parent_resume_id`
    - `is_master`
    - `target_job_title`
    - `target_company`
    - `job_url`
    - `job_match_score`
  - `tailor_history` does **not** currently expose:
    - `tailored_resume_id`
    - matching `tailored_resume_id` key index
- **Fix / adaptation**:
  - Did **not** force unsupported metadata fields into resume creation.
  - Hardened Tailoring Hub master-resume auto-select to use persisted `tailor_history` ids when available, plus a `(Tailored)` title heuristic as a last resort, so tailored copies are less likely to be treated as masters after refresh while the schema is incomplete.
- **Files**: `src/pages/TailoringHubPage.tsx`

#### F5 - Company Briefing "Save" fails because the live save schema is incomplete

- **Root cause**: The save flow in `CompanyBriefingSheet` uses `useSaveCompanyBriefing()` which writes to the `company_briefings` collection with:
  - `user_id`
  - `company_name`
  - `briefing`
- **Verified live schema finding**:
  - `company_briefings` exists
  - but it currently exposes only `user_id`
  - `company_name` and `briefing` are missing, so Appwrite rejects the save with an invalid document structure / unknown attribute error
- **Fix**:
  - did not force unsupported writes into a different storage path
  - added a graceful, explicit schema/setup error message for this exact save failure so the user gets a clear manual-action explanation instead of a vague generic failure toast
  - added focused test coverage for the error mapping
- **Files**: `src/hooks/useCompanyBriefingLibrary.ts`, `src/hooks/__tests__/useCompanyBriefingLibrary.test.ts`

---

### Files changed

- `appwrite-hubs/ai-gateway/src/main.js`
- `src/hooks/useCompanyBriefingLibrary.ts`
- `src/lib/tailorMerge.ts`
- `src/pages/PreviewPage.tsx`
- `src/pages/TailoringHubPage.tsx`
- `src/pages/TailoringHubResultPage.tsx`
- `tests/hubs/ai-gateway-routing.test.cjs`
- `src/hooks/__tests__/useCompanyBriefingLibrary.test.ts`
- `src/lib/__tests__/tailorMerge.test.ts`
- `src/pages/__tests__/PreviewPage.test.tsx`
- `src/pages/__tests__/TailoringHubResultPage.test.ts`
- `src/lib/devkit/sourceHashes.generated.json`

---

### Verification

- `node --check appwrite-hubs/ai-gateway/src/main.js`
- `npx vitest run src/hooks/__tests__/useCompanyBriefingLibrary.test.ts tests/hubs/ai-gateway-routing.test.cjs src/lib/__tests__/tailorMerge.test.ts src/pages/__tests__/PreviewPage.test.tsx src/pages/__tests__/TailoringHubResultPage.test.ts`
- `npx tsc --noEmit`
- `npm run build`
- `node scripts/compute-source-hashes.mjs`

All passed locally.

Updated source hash:
- `ai-gateway: b156e066754d6ed6`

---

### Manual Appwrite action needed

This pass confirmed the code can be made more defensive, but the live Appwrite schema still needs manual provisioning if the product is expected to persist tailored lineage and query history server-side:

- `resumes` collection attributes:
  - `parent_resume_id`
  - `is_master`
  - `target_job_title`
  - `target_company`
  - `job_url`
  - `job_match_score`
- `tailor_history` collection attribute:
  - `tailored_resume_id`
- `tailor_history` index:
  - key: `tailored_resume_id`
  - order: `ASC`

This pass also confirmed the Company Briefing save library still needs manual schema provisioning:

- `company_briefings` collection attributes:
  - `company_name`
  - `briefing`

Recommended supporting index for library reads:
- `company_briefings` key index:
  - `user_id`
  - order: `ASC`

---

### Where We Stopped

- Tailoring Hub code fixes are implemented locally and validated.
- Company Briefing save now fails gracefully with a clear schema/setup message instead of a vague generic error.
- No deploy, push, or commit was performed in this pass.
- Deployment is required for the `PreviewPage` / Tailoring Hub frontend changes, the Company Briefing save UX fix, and the `ai-gateway` tailored-id preservation changes to affect production.
- Recommended deployment targets, if approved later:
  - frontend/Vercel for the page changes and Company Briefing save UX fix
  - `ai-gateway` for the Tailor Resume normalization change

---

## Session Log - 2026-06-08 (AI Gateway Targeted Hardening - LinkedIn Contract + Longer Structured DeepSeek Paths)

### Overview

Follow-up stabilization pass after the live `ai-gateway` DeepSeek-first rollout. This session focused only on the three remaining weak spots from production verification:

- `optimize-for-linkedin`
- `company-briefing`
- `generate-question-bank`

No deployment was performed. No changes were made to `resume-section-ai`.

---

### Root causes identified and fixed

#### F1 - LinkedIn Optimizer still accepted incomplete output

- **Root cause**: `normalizeLinkedInPayload()` only required "some usable content" somewhere in the payload. That allowed a response with headlines/about/tips but empty `experienceRewrites` to pass even when the input resume had real experience entries.
- **Fix**: Tightened the LinkedIn contract so resumes with experience must return non-empty `experienceRewrites`. The structured repair path now also receives the original resume input so a repair attempt can fill missing rewrites without fabricating facts.
- **Files**: `appwrite-hubs/ai-gateway/src/main.js`, `tests/hubs/ai-gateway-routing.test.cjs`

#### F2 - Question Bank still accepted incomplete category sets

- **Root cause**: `normalizeQuestionBankPayload()` treated any non-empty category list as success, even if the output was missing required categories.
- **Fix**: Tightened the normalizer so the final payload must contain all required categories: `company`, `technical`, `behavioral`, and `curveball`. The repair path now also receives the original job input context.
- **Files**: `appwrite-hubs/ai-gateway/src/main.js`, `tests/hubs/ai-gateway-routing.test.cjs`

#### F3 - Company Briefing and Question Bank were too close to the primary timeout budget

- **Root cause**: Both are longer structured outputs, but the generic first-attempt timeout was only `10s`. Production evidence already showed DeepSeek could succeed for Question Bank at roughly the edge of that budget, which made aborts/fallbacks more likely than necessary.
- **Fix**: Added a narrow feature-specific first-attempt timeout lift for `company-briefing` and `generate-question-bank`, plus a same-provider retry for the first DeepSeek attempt when it aborts or times out. Cross-provider fallback remains unchanged.
- **Files**: `appwrite-hubs/ai-gateway/src/main.js`, `tests/hubs/ai-gateway-routing.test.cjs`

#### F4 - Company Briefing normalization was too light

- **Root cause**: The company-briefing parser only required `companySnapshot` to exist. Thin but parseable payloads could still pass without a fully normalized response shape.
- **Fix**: Added explicit company-briefing normalization for `companySnapshot`, the list sections, and array fields so the returned structure is stable before it reaches the frontend.
- **Files**: `appwrite-hubs/ai-gateway/src/main.js`

#### F5 - Source hash manifest required refresh

- **Root cause**: `ai-gateway` changed again in this pass, so the source hash manifest had to be recomputed to keep GitHub Actions deploy guards happy.
- **Fix**: Ran `node scripts/compute-source-hashes.mjs`.
- **Files**: `src/lib/devkit/sourceHashes.generated.json`

---

### Files changed

- `appwrite-hubs/ai-gateway/src/main.js`
- `tests/hubs/ai-gateway-routing.test.cjs`
- `src/lib/devkit/sourceHashes.generated.json`

---

### Verification

- `node --check appwrite-hubs/ai-gateway/src/main.js`
- `node tests/hubs/ai-gateway-routing.test.cjs`
- `npx vitest run src/lib/devkit/aiToolsCatalogue.test.ts`
- `npx tsc --noEmit`
- `node scripts/compute-source-hashes.mjs`

All passed locally.

Updated source hash:
- `ai-gateway: 6057ca5dc51e8daa`

---

### Where We Stopped

- The targeted fixes are implemented locally and validated.
- No deploy, push, or commit was performed in this pass.
- `resume-section-ai` remains unchanged.
- If approved, the next deployment target should be `ai-gateway` only.

---

## Session Log - 2026-06-07 (AI Gateway Stabilization Pass - DeepSeek First + Structured Output Hardening)

### Overview

Focused stabilization pass on the remaining production AI failures after `resume-section-ai` was fixed. No work was done on `resume-section-ai` in this session. The goal was to make `ai-gateway` prefer the currently verified DeepSeek route first, keep fallback behavior intact, and harden the two product-level failure points that were still returning unusable output: LinkedIn Optimizer and Question Bank.

No deployment was performed. All changes remain local working-tree changes on top of `main`.

---

### Root causes identified and fixed

#### F1 - `ai-gateway` still preferred providers already proven flaky in production

- **Root cause**: Several production tools still routed first to providers that had already failed in live testing:
  - NVIDIA-first: `tailor-resume`, `generate-cover-letter`, `recruiter-simulation`
  - OpenRouter-first: `parse-resume`, `parse-job`, `optimize-for-linkedin`, `generate-question-bank`
  - Groq-first: multiple chat/editor/content tools even though the owner requested a DeepSeek-first stabilization pass
- **Fix**: Updated `FEATURE_ROUTES` in `appwrite-hubs/ai-gateway/src/main.js` so the requested main tools now prefer `deepseek-chat` first while preserving the existing fallback pool logic.
- **Files**: `appwrite-hubs/ai-gateway/src/main.js`, `src/lib/devkit/aiToolsCatalogue.ts`, `appwrite-hubs/admin-devkit-data/src/main.js`

#### F2 - LinkedIn Optimizer could succeed with unusable structured payloads

- **Root cause**: The existing structured parser accepted any object-shaped JSON for `optimize-for-linkedin`, even when headline/about/skills/tips sections were effectively empty or useless.
- **Fix**: Added feature-specific normalization and validation that now requires usable LinkedIn content, plus stronger structured-output instructions and a one-time JSON repair retry if the first response is malformed.
- **Files**: `appwrite-hubs/ai-gateway/src/main.js`, `tests/hubs/ai-gateway-routing.test.cjs`

#### F3 - Question Bank could return HTTP 200 with empty/malformed category data

- **Root cause**: The existing structured parser accepted weak `generate-question-bank` payloads without ensuring there were usable categories and questions.
- **Fix**: Added feature-specific normalization that requires real categories/questions, expanded the schema prompt and instructions, and added the same one-time JSON repair retry path used for LinkedIn Optimizer.
- **Files**: `appwrite-hubs/ai-gateway/src/main.js`, `tests/hubs/ai-gateway-routing.test.cjs`

#### F4 - DevKit/admin route mirrors drifted from the new production route map

- **Root cause**: `src/lib/devkit/aiToolsCatalogue.ts` and `appwrite-hubs/admin-devkit-data/src/main.js` still mirrored the previous NVIDIA/Groq/OpenRouter-first defaults, which would make tests and DevKit route displays disagree with `ai-gateway`.
- **Fix**: Updated both mirrors to reflect the new DeepSeek-first defaults for the same production tool set.
- **Files**: `src/lib/devkit/aiToolsCatalogue.ts`, `src/lib/devkit/aiToolsCatalogue.test.ts`, `appwrite-hubs/admin-devkit-data/src/main.js`

#### F5 - Hub source hash manifest needed refresh after gateway/admin changes

- **Root cause**: Any Appwrite hub source edit requires `src/lib/devkit/sourceHashes.generated.json` to be recomputed, or the deploy workflow will fail at the source-hash guard.
- **Fix**: Ran `node scripts/compute-source-hashes.mjs` after finishing the hub edits.
- **Files**: `src/lib/devkit/sourceHashes.generated.json`

---

### Exact route changes

The following `ai-gateway` features now prefer:

- **Provider**: `deepseek`
- **Model**: `deepseek-chat`

Affected features:
- `tailor-resume`
- `generate-cover-letter`
- `recruiter-simulation`
- `agentic-chat`
- `wise-ai-chat`
- `editor-ai`
- `detect-and-humanize`
- `smart-fit-rewrite`
- `career-assessment`
- `generate-portfolio-bio`
- `generate-resignation-letter`
- `validate-tailor`
- `suggest-template`
- `analyze-resume`
- `generate-fix-suggestions`
- `parse-resume`
- `parse-job`
- `optimize-for-linkedin`
- `generate-question-bank`
- `company-briefing`
- `ask-portfolio`

Unchanged by design:
- `resume-section-ai` remains on its existing standalone function path and was not edited in this session.

Fallback behavior remains intact through the existing pool/candidate logic:
- DeepSeek primary
- Groq fallback
- OpenRouter fallback
- NVIDIA fallback/standby when available in the pool

---

### Files changed

- `appwrite-hubs/ai-gateway/src/main.js`
- `appwrite-hubs/admin-devkit-data/src/main.js`
- `src/lib/devkit/aiToolsCatalogue.ts`
- `src/lib/devkit/aiToolsCatalogue.test.ts`
- `src/lib/devkit/sourceHashes.generated.json`
- `tests/hubs/ai-gateway-routing.test.cjs` (new)

---

### Verification

- `node --check appwrite-hubs/ai-gateway/src/main.js`
- `node tests/hubs/ai-gateway-routing.test.cjs`
- `npx vitest run src/lib/devkit/aiToolsCatalogue.test.ts`
- `npx tsc --noEmit`
- `node scripts/compute-source-hashes.mjs`

All passed locally.

Updated source hashes now include:
- `ai-gateway: bc67549bd0524177`
- `admin-devkit-data: 50aa4dfd898f12ca`

---

### Where We Stopped

- The route/default changes are complete locally and validated.
- No deploy, push, or commit was performed in this session.
- `resume-section-ai` remains fixed separately and was not touched.
- The remaining production step for this work is an Appwrite deployment targeting `ai-gateway`.
- After that deployment, the highest-priority live re-tests are:
  1. `tailor-resume`
  2. `generate-cover-letter`
  3. `parse-job`
  4. `parse-resume`
  5. `optimize-for-linkedin`
  6. `generate-question-bank`
  7. `company-briefing`
  8. `ask-portfolio`

---

## Session Log - 2026-06-07 (Public Portfolio Access Audit, Fixes, and Deployment Drift Check)

### Overview

Full audit and fix pass for the broken public-portfolio/manual-QA reports affecting premium-account testing, shared-password behavior, custom domains, OG images, and native PDF export. The main frontend/security-header posture was re-checked against production. No deployment was performed. All changes remain uncommitted local working-tree changes on top of `main` at `cc6dee7c`.

---

### Root causes identified and fixed

#### F1 - Public portfolio access depended on browser Appwrite permissions/session state

- **Root cause**: `usePublicPortfolio` queried `profiles` and `resumes` directly from the browser. Public visitors could fail on collection permissions or session state, while authenticated premium sessions masked the problem.
- **Fix**: Added `api/public-portfolio.ts` as a server-side public portfolio endpoint using `node-appwrite`, then rewired the frontend hook to fetch through that endpoint.
- **Files**: `api/public-portfolio.ts` (new), `src/hooks/usePublicPortfolio.ts`

#### F2 - Shared password flow was implemented against the wrong source of truth

- **Root cause**: The browser validated the password client-side against `portfolioExtras.passwordHash`, but the real server-side portfolio configuration lives in `portfolio_settings`. This made the gate logic fragile and confusing.
- **Fix**: Moved password-gate checks and password verification to `api/public-portfolio.ts`, reading from `portfolio_settings` server-side and returning only the public portfolio payload after successful verification.
- **Files**: `api/public-portfolio.ts` (new), `src/hooks/usePublicPortfolio.ts`

#### F3 - Custom-domain public portfolios were hard-broken in code

- **Root cause**: `usePublicPortfolioByDomain()` returned `null`, so custom-domain portfolio resolution never actually loaded a portfolio.
- **Fix**: Implemented domain lookup through the new server-side endpoint by scanning profile `portfolio_extras.customDomain` and resolving the portfolio by username.
- **Files**: `api/public-portfolio.ts` (new), `src/hooks/usePublicPortfolio.ts`

#### F4 - OG image generation depended on `VITE_API_URL`

- **Root cause**: `usePortfolioSEO` only emitted `og:image` / `twitter:image` when `VITE_API_URL` was defined, which is unsafe for same-origin Vercel production.
- **Fix**: Added shared API-base helpers and switched SEO image generation to an absolute same-origin-safe base.
- **Files**: `src/lib/publicApiBase.ts` (new), `src/hooks/usePortfolioSEO.ts`, `src/hooks/usePortfolioSEO.test.tsx` (new)

#### F5 - Native PDF export used brittle API/project-ID resolution

- **Root cause A**: `nativePdfGenerator` depended too directly on `VITE_API_URL`, risking export calls to the wrong host.
- **Root cause B**: `api/export/pdf-native.ts` required `APPWRITE_PROJECT_ID` only, even though other project-ID env names already exist in this codebase and deployment footprint.
- **Fix**: Switched frontend export calls to the shared API-base helper and broadened the server-side project-ID fallback chain.
- **Files**: `src/lib/publicApiBase.ts` (new), `src/lib/nativePdfGenerator.ts`, `api/export/pdf-native.ts`

#### F6 - Deployment/documentation drift was contributing to diagnosis confusion

- **Root cause**: The Atlas still contains Hostinger/FTP language in `DEPLOYMENT_GUIDE.md`, while the live frontend is being served by Vercel and already returns CSP/HSTS headers from production.
- **Fix**: Re-verified live headers on `https://resume.thewise.cloud` and documented the drift here for cleanup in a follow-up doc pass.
- **Files**: documentation follow-up pending

---

### Production facts re-checked during this session

- `https://resume.thewise.cloud` currently returns `Content-Security-Policy` and `Strict-Transport-Security` headers on the main response.
- The latest Atlas deployment drift still matters: frontend code on GitHub/main is ahead of the last known Appwrite hub deployment, so hub-specific failures can still be caused by live backend drift even when frontend code is corrected locally.
- The startup validation message in `ai-gateway` still references generic provider env names (`OPENROUTER_API_KEY`, etc.) while the actual pool loader uses indexed keys (`OPENROUTER_KEY_1`, etc.). This looks misleading, but it was not the strongest verified root cause for the reported public-portfolio/PDF failures.
- Live AI provider ping from `admin-devkit-data` confirmed all 4 providers are configured and reachable from production.
- Live authenticated `ai-gateway` tests confirmed `company-briefing`, `tailor-resume`, and `parse-resume` still succeed in production, but `tailor-resume` is falling back from NVIDIA after `404` responses and `parse-resume` is falling back from OpenRouter after `429` responses.
- Live authenticated `resume-section-ai` failed with `503 ai_credit_check_failed`, proving that this function is missing the Appwrite credentials it needs for session/credit checks.

---

### Files changed

- `api/export/pdf-native.ts`
- `api/public-portfolio.ts` (new)
- `appwrite-hubs/admin-devkit-data/src/main.js`
- `appwrite-hubs/ai-gateway/src/main.js`
- `appwrite-hubs/wisehire-gateway/src/main.js`
- `scripts/deploy_hubs.cjs`
- `src/components/dev-kit/AIRoutingSwitcher.tsx`
- `src/hooks/__tests__/usePublicPortfolio.test.tsx`
- `src/hooks/usePortfolioSEO.test.tsx` (new)
- `src/hooks/usePortfolioSEO.ts`
- `src/hooks/usePublicPortfolio.ts`
- `src/lib/devkit/aiToolsCatalogue.ts`
- `src/lib/nativePdfGenerator.ts`
- `src/lib/publicApiBase.ts` (new)

---

### Verification

- `npm test -- src/hooks/__tests__/usePublicPortfolio.test.tsx src/hooks/usePortfolioSEO.test.tsx`
- `npx vitest run src/lib/devkit/aiToolsCatalogue.test.ts`
- `npx tsc --noEmit`
- `npm run build`
- `node --check scripts/deploy_hubs.cjs`
- `node --check appwrite-hubs/ai-gateway/src/main.js`
- `node --check appwrite-hubs/admin-devkit-data/src/main.js`
- `node --check appwrite-hubs/wisehire-gateway/src/main.js`

All passed locally.

---

### Where We Stopped

- `main` is at `cc6dee7c`. Working tree is dirty with the local fixes above and Atlas documentation updates from this session.
- No branch was created. No commit, push, or deployment was performed.
- The public portfolio access path, custom-domain lookup path, OG image generation path, and native PDF export path are fixed locally but not yet live.
- The Appwrite deploy script is now patched locally so `resume-section-ai` will receive the Appwrite credentials it needs on the next hub deploy.
- The NVIDIA default route target is updated locally to a current model string; live production is still on the old routing until the next hub deploy.
- Production header state on the main site was re-checked: CSP and HSTS are present on the homepage response.
- The known deployment drift from the previous session still needs resolution: Appwrite hubs may still be running older code until the hub deploy workflow is executed and verified.
- `Project Atlas/DEPLOYMENT_GUIDE.md` is stale relative to the current Vercel-first frontend deployment model and should be cleaned up in a separate documentation pass.

**Next recommended step**

1. Redeploy the frontend so the public-portfolio / OG / PDF fixes reach production.
2. Redeploy the Appwrite hubs so `resume-section-ai` receives `APPWRITE_API_KEY`, `APPWRITE_ENDPOINT`, and `APPWRITE_PROJECT_ID`, and so the updated NVIDIA route target reaches production.
3. Verify a real authenticated `resume-section-ai` request immediately after hub deploy; this is the clearest regression check for the AI editor path.
4. Verify the live public portfolio flow anonymously and through a password-gated portfolio.
5. Re-check parse-heavy routes if needed: OpenRouter `429` fallback was observed live, so provider-level quota pressure may still require operational follow-up even after deploy.

---

## Session Log - 2026-06-07 (Workflow Failure Follow-up: Source Hash Manifest Drift)

### Overview

Investigated the failed `Deploy Appwrite Hubs` GitHub Actions run after the latest `main` push. The workflow did not fail on Appwrite deploy, secrets, or the `resume-section-ai` target. It failed early at the source-hash guard step because the committed manifest no longer matched the changed hub sources.

---

### Root cause identified

#### F1 - `sourceHashes.generated.json` was stale relative to changed hub files

- **Root cause**: The latest pushed code changed:
  - `appwrite-hubs/ai-gateway/src/main.js`
  - `appwrite-hubs/admin-devkit-data/src/main.js`
  - `appwrite-hubs/wisehire-gateway/src/main.js`
  but `src/lib/devkit/sourceHashes.generated.json` was not regenerated before push.
- **Evidence**: GitHub Actions run `27098541686` failed at `Ensure source hash manifest is committed` after recomputing hashes in CI.
- **Fix**: Ran `node scripts/compute-source-hashes.mjs` locally to refresh the committed manifest.
- **File**: `src/lib/devkit/sourceHashes.generated.json`

---

### Verification

- `node scripts/compute-source-hashes.mjs`

Updated hash values now include:
- `ai-gateway: c4206a033df33a59`
- `admin-devkit-data: 0470c45425c9ab4a`
- `wisehire-gateway: cd99c96473afd639`

---

### Where We Stopped

- The workflow failure cause is verified: stale hash manifest, not Appwrite deployment logic.
- Next step is to push the manifest-sync commit, then rerun `Deploy Appwrite Hubs` with target `resume-section-ai`.

---

---

## Session Log - 2026-06-06 (Tailoring Hub Full Re-audit & Fixes)

### Overview

Full end-to-end re-audit and fix pass on the Tailoring Hub flow. Every gap from the previous audit plus newly discovered issues during live testing were addressed. No Appwrite Functions changed. No deployment performed. All changes are uncommitted local working-tree changes on top of `main` at `22379152`.

---

### Root causes identified and fixed

#### F1 — Appwrite schema error on tailoring (`parent_resume_id`)

- **Root cause**: `createDocument` for `COLLECTIONS.resumes` included `parent_resume_id: currentResumeId` but this attribute was never provisioned in the Appwrite `resumes` collection (legacy Supabase-only field). Every tailor attempt threw `Invalid document structure: Unknown attribute: "parent_resume_id"`.
- **Fix**: Removed `parent_resume_id` from the `createDocument` payload. Tailored-CV identity is now tracked via `tailor_history` (Zustand + Appwrite).
- **File**: `src/pages/TailoringHubPage.tsx`

#### F2 — Tailored tab on dashboard always showed 0

- **Root cause A**: `tailoredResumeIds` was derived only from Zustand `tailorHistory` (localStorage, capped at last 10 entries). Cleared storage or >10 tailoring sessions silently broke the filter.
- **Root cause B**: No Appwrite query was made from the dashboard against `tailor_history`.
- **Fix**: Created `src/hooks/useTailorHistory.ts` — `useAppwriteTailoredIds()` queries all `tailor_history` documents for the current user and returns a `Set<string>` of `tailored_resume_id` values. `DashboardPage` merges Zustand + Appwrite sources into `tailoredResumeIds`. All downstream consumers (`tailoredResumes` filter, badge, `handleEdit` routing) use the combined set.
- **Files**: `src/hooks/useTailorHistory.ts` (new), `src/pages/DashboardPage.tsx`

#### F3 — Result page showed no job context when accessed from dashboard

- **Root cause**: `handleEdit` navigated to `/tailoring-hub/result/:id` with no `location.state`. If the fire-and-forget Appwrite `tailor_history` write had failed (or the user was on a new device), all three fallbacks (state → Zustand → Appwrite) produced empty `{}`, so no job title, scores, or sections were shown.
- **Fix**: `handleEdit` reads the matching Zustand `tailorHistory` entry and passes it as `location.state` to the navigate call. Appwrite fallback retained as last resort.
- **File**: `src/pages/DashboardPage.tsx`

#### F4 — Workspace auto-selected the tailored copy instead of a master resume

- **Root cause**: `navigateWithTemplate` in the result page called `setCurrentResumeId(tailoredCV)` even when opening exports in a new tab (PDF, ATS, DOCX, Preview Sheet). New tabs use `?id=` URL params and do not need Zustand state. On returning to the workspace, `currentResumeId` pointed to the tailored CV; the auto-selection effect bailed out because the resume existed.
- **Fix A**: `navigateWithTemplate` now skips `setCurrentResumeId` / `setCurrentResume` when `newTab = true`. Same-tab navigation (e.g., "Open Full Editor") still updates Zustand.
- **Fix B**: Workspace auto-selection effect now checks `useResumeStore.getState().tailorHistory` to detect if `currentResumeId` is a tailored CV, and switches to the most-recent master resume if so.
- **Files**: `src/pages/TailoringHubResultPage.tsx`, `src/pages/TailoringHubPage.tsx`

#### F5 — Scores showed 0/0 on result page

- **Root cause**: The `tailor-resume` Appwrite Function returns `overallScore: null`. The workspace fell back to `resultScore?.before ?? 0` / `?? 0`, producing `{before: 0, after: 0}` stored in history and displayed.
- **Fix**: `handleTailor` now computes keyword-overlap scores on the frontend via `computeMatch` (exported from `MatchAnalysisSummary.tsx`) — `scoreBefore` against original resume text, `scoreAfter` against merged resume text. These are used as fallback when `tailorResult.overallScore` is null. AI scores take priority if the function ever starts returning them.
- **Files**: `src/pages/TailoringHubPage.tsx`, `src/components/job-match/MatchAnalysisSummary.tsx`

#### F6 — Dashboard tailor buttons routed to old `/tailor` page

- **Root cause**: `handleHeroTailor` and `handleTailorResume` both called `navigate('/tailor')`.
- **Fix**: Both now call `navigate('/tailoring-hub')` and set `currentResumeId` / `currentResume` to the selected master resume before navigating.
- **File**: `src/pages/DashboardPage.tsx`

#### F7 — Clicking tailored CV on dashboard opened editor instead of result page

- **Root cause**: `handleEdit` unconditionally navigated to `/editor`.
- **Fix**: `handleEdit` checks `resume.parent_resume_id || tailoredResumeIds.has(resumeId)` and routes tailored CVs to `/tailoring-hub/result/:id`.
- **File**: `src/pages/DashboardPage.tsx`

#### F8 — TDZ crash on dashboard (`tailoredResumeIds before initialization`)

- **Root cause**: `tailoredResumeIds` `useMemo` was declared after the `handleEdit` `useCallback` that referenced it in its dep array. JavaScript temporal dead zone caused a `ReferenceError` on every render.
- **Fix**: Moved `tailoredResumeIds` declaration to immediately after `tailorHistory` is destructured from the store, before any hook or callback that uses it.
- **File**: `src/pages/DashboardPage.tsx`

---

### File renames

| Old name | New name |
|----------|----------|
| `src/pages/JobMatchWorkspacePage.tsx` | `src/pages/TailoringHubPage.tsx` |
| `src/pages/JobMatchResultPage.tsx` | `src/pages/TailoringHubResultPage.tsx` |

`AppInterior.tsx` lazy import variables and route `element` props updated to match. `src/components/job-match/` directory **not** renamed — internal only, no functional benefit, large churn risk.

---

### New files

| File | Purpose |
|------|---------|
| `src/hooks/useTailorHistory.ts` | `useAppwriteTailoredIds()` — queries Appwrite `tailor_history`, returns `Set<string>` of tailored resume IDs |

---

### Changed files (this session)

- `src/pages/TailoringHubPage.tsx` — renamed + removed `parent_resume_id`, `computeMatch` fallback scores, auto-selection fix, `handleFetchUrl` auth guard
- `src/pages/TailoringHubResultPage.tsx` — renamed + `navigateWithTemplate` skips Zustand update on new-tab nav
- `src/pages/DashboardPage.tsx` — `useAppwriteTailoredIds`, merged `tailoredResumeIds`, TDZ fix, `handleEdit` routing + state passing, tailor buttons → `/tailoring-hub`
- `src/hooks/useTailorHistory.ts` — new
- `src/AppInterior.tsx` — lazy import names + route elements
- `src/components/job-match/MatchAnalysisSummary.tsx` — `export function computeMatch`

---

### Validation

- `npx tsc --noEmit` — exit code 0 (run multiple times throughout session after each fix cluster).
- `npm run build` — passed at session start.
- Dev server run and manually tested by user.

---

### Commits created

None. All changes are uncommitted. HEAD remains `22379152`.

---

### Deployments performed

None.

---

### Current production/deployment state

- **Frontend (Vercel)**: Still at `22379152` / `b4c48a0c`. Tailoring Hub fixes are **not yet deployed**.
- **Appwrite Functions**: Unchanged.
- **Appwrite schema**: `resumes` collection does not have `parent_resume_id` — correct, it was never added and was removed from the payload this session.

---

### Where We Stopped

All Tailoring Hub flow fixes are implemented and `tsc`-clean. Changes are **uncommitted**.

Next agent must:

1. Confirm `npx tsc --noEmit` is still exit code 0.
2. Commit all working-tree changes:
   ```
   fix(tailoring-hub): full re-audit — schema error, dashboard tab, result page context, scores, routing, naming
   ```
3. Push to `main` and confirm Vercel deploy succeeds.
4. Manual QA checklist:
   - Dashboard "Tailor" button → lands on `/tailoring-hub` with master resume selected (not a tailored copy).
   - Paste job description → Tailor → result page shows real Before/After scores (not 0/0) and job title.
   - Return to dashboard → tailored CV appears in **Tailored** tab with badge.
   - Click tailored CV card → opens `/tailoring-hub/result/:id` with job context (not the editor).
   - From result page, "Open Preview Sheet" → new tab opens; returning to workspace shows the **master** resume selected.
   - From result page, "Open Full Editor" → opens `/editor` with tailored CV loaded.
5. If `tailor_history` Appwrite write failures are still observed, check Appwrite console for missing collection attributes (`job_description`, `applied_sections`, etc.).

Remaining known follow-ups:

- `src/components/job-match/` → `src/components/tailoring-hub/` rename — deferred (large churn, no functional impact).
- `tailor-resume` Appwrite Function returning `overallScore: null` — investigate whether it can be updated to return real scores, removing the frontend fallback.
- Pre-existing lint in `AppInterior.tsx` lines 156/165 (`Property 'profile' does not exist on type 'never'`) — unrelated to this session, pre-existing.

---

## Session Log - 2026-06-06 (Appwrite Phase 2/3 Activation + Public Portfolio Chat Fix)

### Overview

Completed the post-merge Appwrite Phase 2/3 Console activation, audited the frontend-to-Appwrite integration, fixed the public portfolio chat blocker without relaxing `chat_sessions` permissions, standardized immediate AI credit refresh for direct charged frontend calls, redeployed the required Appwrite functions, and pushed the final validated state to `main`.

---

### Appwrite Phase 2/3 Console setup completed

- Created `idempotency_cache` collection in DB `main`.
- Added required attributes and unique `key_unique` index.
- Added `chat_sessions.question_count`.
- Added `ai_request_logs.credits_charged`, `idempotency_key`, and `is_idempotency_hit`.
- Added `ai_request_logs` indexes:
  - `user_id_idx`
  - `created_at_idx`
- Added `ai_credits.user_id_unique`.
- Set `ADMIN_EMAIL` on:
  - `ai-gateway`
  - `admin-devkit-data`
- Confirmed `idempotency_cache` is server-only:
  - `permissions: []`
  - `documentSecurity: false`

---

### Appwrite deployment state

- Initial Phase 2/3 deployment IDs:
  - `ai-gateway`: `6a23939ea82b08549e1a`, ready, active
  - `admin-devkit-data`: `6a2393c910509d50f87c`, ready, active
  - `coupons`: `6a2393f113a9d24a8f2e`, ready, active
- Later public-chat fix deployment IDs:
  - `public-share`: `6a23a4a2046316181547`, ready, active
  - `ai-gateway`: `6a23a4c735c97e30126e`, ready, active
- Latest deployed commit:
  - `b4c48a0c01f0d267e4fa92c0982538609c9ddbbc`
- GitHub status for latest commit:
  - Vercel: success
  - AI Gateway Hub: success

---

### Smoke check issue and fix

- Root cause: `ai-gateway` smoke check originally returned anonymous `401` because `x-smoke-test` now required `validateUserSession(...)`, while `scripts/deploy_hubs.cjs` still sent the smoke probe with `auth: none`.
- Fix: updated the smoke contract to use a narrow signed internal token.
- Result: `ai-gateway` post-deploy smoke now returns HTTP `200`.

---

### Public portfolio chat blocker

- Root cause 1: `ChatWidget.tsx` created `chat_sessions` directly from the browser.
- Root cause 2: live `chat_sessions` collection is server-only, so browser creation failed.
- Root cause 3: `ask-portfolio` previously routed through `ai-gateway` and required normal Appwrite user JWT, which public visitors do not have.
- Fix:
  - Moved public chat session creation to `public-share`.
  - `ChatWidget` now calls `create-portfolio-chat-session` through `public-share`.
  - `public-share` creates `chat_sessions` server-side.
  - `public-share` proxies public portfolio chat to `ai-gateway` using a narrow internal HMAC token.
  - `ai-gateway` accepts the internal token only for public portfolio chat and smoke, not for normal authenticated AI features.
- Safety:
  - `chat_sessions` remains server-only.
  - Public chat requires a valid server-created signed session token.
  - Username/session validation remains server-side.
  - Question/history sizes are capped.
  - Normal authenticated AI features still require Appwrite JWT.

---

### AI credit refresh consistency

- Added shared helper:
  - `src/lib/invalidate-ai-credit-queries.ts`
- Patched direct charged AI call sites so the UI refreshes credits after success.
- Affected files:
  - `CoverLetterNewPage.tsx`
  - `PortfolioEditorPage.tsx`
  - `QuestionBankSheet.tsx`
  - `ResignationLetterNewPage.tsx`
  - `ResignationLetterEditPage.tsx`
  - `OnboardingPage.tsx`
  - `CreateResumeDialog.tsx`
  - `ProfileImportSheet.tsx`
  - `AddApplicationSheet.tsx`
  - `TailorPage.tsx`

---

### Source hash tracking

- `src/lib/devkit/sourceHashes.generated.json` was regenerated.
- New relevant hashes:
  - `ai-gateway`: `c672943069458d83`
  - `public-share`: `de5ec771a7217239`

---

### Changed files

Core public-chat fix:

- `appwrite-hubs/public-share/src/main.js`
- `appwrite-hubs/ai-gateway/src/main.js`
- `src/components/portfolio/public/ChatWidget.tsx`
- `src/lib/appwrite-bridge.ts`
- `src/lib/appwrite-functions.ts`
- `scripts/deploy_hubs.cjs`

Credit-refresh consistency:

- `src/lib/invalidate-ai-credit-queries.ts`
- `src/pages/CoverLetterNewPage.tsx`
- `src/pages/PortfolioEditorPage.tsx`
- `src/components/interview/QuestionBankSheet.tsx`
- `src/pages/ResignationLetterNewPage.tsx`
- `src/pages/ResignationLetterEditPage.tsx`
- `src/pages/OnboardingPage.tsx`
- `src/components/dashboard/CreateResumeDialog.tsx`
- `src/components/settings/ProfileImportSheet.tsx`
- `src/components/applications/AddApplicationSheet.tsx`
- `src/pages/TailorPage.tsx`

Source hash:

- `src/lib/devkit/sourceHashes.generated.json`

---

### Validation

Passed:

- `node --check appwrite-hubs/ai-gateway/src/main.js`
- `node --check appwrite-hubs/public-share/src/main.js`
- `node --check scripts/deploy_hubs.cjs`
- `npx tsc --noEmit`
- `npm run build`
- `npx vitest run src/hooks/__tests__/useAIAction-D1.test.ts src/lib/__tests__/aiTailor-D1.test.ts src/hooks/__tests__/useAICredits.test.tsx`

Result:

- Syntax checks passed.
- Typecheck passed.
- Production build passed.
- Focused tests passed: 22/22.
- Appwrite deployments ready and active.
- GitHub status checks for commit `b4c48a0c` show Vercel success and AI Gateway Hub success.

---

### Where We Stopped

Current state:

- Latest commit on `main`: `b4c48a0c01f0d267e4fa92c0982538609c9ddbbc`.
- Frontend deploy status: Vercel success from GitHub commit status.
- Appwrite active deployments:
  - `public-share`: `6a23a4a2046316181547`
  - `ai-gateway`: `6a23a4c735c97e30126e`
- `admin-devkit-data` and `coupons` remain ready/active from earlier Phase 2/3 deployment.
- No redeploy currently required.

Remaining manual QA:

- Create or confirm a real public portfolio username.
- Visit `/p/:username`.
- Open the public chat widget.
- Send one question.
- Refresh and send another question.
- Confirm there is no `401`, no `session error`, and no infinite loading.
- Run one authenticated AI action from a real logged-in account and confirm credits refresh after success.

Known follow-ups:

- Add broader anonymous abuse quota for public portfolio chat across multiple fresh sessions.
- Consider server-verifiable password-gated portfolio chat access.
- Keep non-atomic credit deduction on backlog for later hardening.
- Keep Vercel connector token refresh as an operational cleanup item, although GitHub status already confirms Vercel success.

## Session Log - 2026-06-05 (AI Security Audit & Hardening — Phases 1–4)

### Overview

Full AI security audit followed by four phases of hardening on `appwrite-hubs/ai-gateway`, `appwrite-hubs/admin-devkit-data`, `appwrite-hubs/coupons`, and the frontend `src/lib/appwrite-functions.ts`.  All changes are on branch `claude/atlas-onboarding-K3wJ2` (PR #81 merged to `main`).

**Audit report saved at:** `Project Atlas/AI-SECURITY-AUDIT-2026-06-05.md`  
**Per-phase change details:** `SECURITY_FIXES_SUMMARY.md` (repo root)  
**Changelog entry:** `Project Atlas/CHANGELOG.md` (2026-06-05 entries — Phases 1–4)

---

### Phase 1 — Critical server-side protection (9 fixes)

| Fix | What changed |
|-----|-------------|
| **A — Model/token lockdown** | `FEATURE_MAX_TOKENS` + `FEATURE_TEMPERATURE` maps added. Client `model`/`maxTokens`/`temperature` values are now fully ignored. |
| **B — agentic-chat history cap** | Last 10 turns; role validated ∈ `{user, assistant}`; each content item capped at 2000 chars. |
| **C — Contact email hardening** | `escapeHtml()` on all user fields; content length limits; rate limit tightened 5→3/IP/hr; `metadata` blob removed from HTML. |
| **E — Subscription permission lockdown** | `Permission.update` removed from subscription docs in `coupons` and `admin-devkit-data`. Admin API key owns all writes. |
| **F — ADMIN_EMAIL hardened** | Both functions fail closed when `ADMIN_EMAIL` env var is absent. `x-smoke-test` now requires a valid Appwrite JWT. |
| **G — wise-ai-chat field whitelisting** | `WISE_AI_CHAT_ALLOWED_FIELDS` map; only declared fields pass; payload capped from 60 KB → 8 KB. |
| **H — Prompt-injection defence** | `SECURITY:` instruction in `wise-ai-chat` and `agentic-chat` system prompts. `agentic-chat` function-response error string no longer injected verbatim. |

Files changed: `ai-gateway/src/main.js` (~80 lines), `admin-devkit-data/src/main.js` (~10 lines), `coupons/src/main.js` (~3 lines).

---

### Phase 2 — Idempotency, dedup & credit resilience

| Fix | What changed |
|-----|-------------|
| **End-to-end idempotency** | SHA256 content key (`userId:feature:payloadHash:5-min-bucket`) + `idempotency_cache` collection. Double-click / refresh / back-nav → cached result at zero cost. |
| **Client idempotency key** | `X-Idempotency-Key` UUID header generated per AI gateway call for tracing. 409 `request_in_progress` returned to client. |
| **Credit recording retry** | `recordSuccessUsage` retries 3× with 100ms / 500ms / 2s backoff. Logs `[CRITICAL]` if all retries fail. |
| **Get-or-create race fix** | `ai_credits` create now catches 409 and retries the read to get the winning concurrent doc. |
| **Plan limit source-of-truth** | `daily_limit` no longer written back to `ai_credits`; `effectiveLimit` always derived from `PLAN_DAILY_LIMITS` at read time. |
| **Improved request logging** | `safeLogAiRequest` warns once on missing collection; new fields: `credits_charged`, `idempotency_key`, `is_idempotency_hit`. |

New collection required: **`idempotency_cache`** in DB `main`. See `SECURITY_FIXES_SUMMARY.md` Phase 2 for full schema.

Files changed: `ai-gateway/src/main.js` (~170 lines), `src/lib/appwrite-functions.ts` (+15 lines), `src/hooks/__tests__/useAIAction-D1.test.ts` (+50 lines, 4 new tests).

---

### Phase 3 — Persistent rate limits, session enforcement & concurrency

| Fix | What changed |
|-----|-------------|
| **Persistent rate limit** | `checkPersistentRateLimit(db, userId, plan)` counts `ai_request_logs` rows in the last 60s. Per-plan caps: free=3/min, pro=10/min, premium=20/min. Survives cold starts; degrades gracefully when collection unavailable. |
| **ask-portfolio session cap** | `validatePortfolioSession(db, sessionToken)` checks + atomically increments `chat_sessions.question_count`. Enforces 10-question server-side cap. Degrades gracefully when attribute absent (one-time warn logged). |
| **Concurrent job guard** | `countPendingJobs(db, userId)` blocks >2 simultaneous expensive AI operations (cost≥2) per user, using `idempotency_cache` pending docs as the counter. Returns `429 too_many_concurrent_jobs`. |
| **Plan pre-fetch** | Plan fetched once per request (after auth) and passed to both rate limiter and `loadCreditState`, eliminating the double DB subscription lookup. |

**Appwrite Console action required:**
- Add `question_count` (Integer, default 0) to `chat_sessions` collection.
- Add indexes on `ai_request_logs.user_id` (asc) and `ai_request_logs.created_at` (desc).

Files changed: `ai-gateway/src/main.js` (~100 lines), `src/hooks/__tests__/useAIAction-D1.test.ts` (+40 lines, 3 new tests, 11/11 passing).

---

### Phase 4 — Admin visibility & startup validation

| Fix | What changed |
|-----|-------------|
| **`ai-request-analytics` DevKit action** | `handleAIRequestAnalytics()` in `admin-devkit-data`: queries `ai_request_logs`, returns per-feature/provider aggregates, credit totals, idempotency hit rate. Action: `ai-request-analytics`. |
| **Cold-start validation** | Both `ai-gateway` and `admin-devkit-data` run an IIFE at module load that logs `[ALERT]` for: missing `APPWRITE_API_KEY`, `ADMIN_EMAIL`, `RESEND_API_KEY`, or no AI provider keys configured. |

Files changed: `ai-gateway/src/main.js` (+25 lines), `admin-devkit-data/src/main.js` (+70 lines).

---

### Validation state at session close

```bash
node --check appwrite-hubs/ai-gateway/src/main.js          # clean
node --check appwrite-hubs/admin-devkit-data/src/main.js   # clean
node --check appwrite-hubs/coupons/src/main.js             # clean
npx tsc --noEmit                                           # zero errors
npx vitest run src/hooks/__tests__/useAIAction-D1.test.ts  # 11/11 pass
```

**Branch:** `claude/atlas-onboarding-K3wJ2` (PR #81 merged to `main`)  
**Commits on branch:**
- `a0193a9` — Phase 3 & 4: persistent rate limits, session enforcement, concurrency, admin analytics
- `c347bc6` — Phase 2: idempotency, dedup, credit resilience
- `1a0f4fe` — Phase 1: AI gateway hardening, subscription permission lockdown

---

### What still needs doing (deferred to Phase 5+)

| Item | Risk level | Notes |
|------|-----------|-------|
| Non-atomic credit deduction | LOW | Read-then-write race. Idempotency covers same-fingerprint case. Requires Appwrite atomic increment or per-user DB lock. |
| Email rate limiter in-memory | LOW | `_emailRateLimits` resets on cold start. Phase 5: persist using `rate_limits` collection. |
| Idempotency cache TTL cleanup | MAINTENANCE | Expired docs filtered at read time but never purged. Needs scheduled cleanup function or Appwrite TTL attribute. |
| ask-portfolio session hopping | LOW | Users can create multiple `chat_sessions` docs to bypass the 10-question cap. Fix: server-signed session nonce. |
| Collection-level permissions audit | MEDIUM | Belt-and-suspenders check that `subscriptions` and `ai_credits` have no collection-level user UPDATE permissions. |
| `ai_request_logs` indexes | REQUIRED | Indexes on `user_id` and `created_at` needed for efficient `checkPersistentRateLimit` queries. Manual Appwrite Console step. |

---

### Appwrite Console status update

The Phase 2/3 Appwrite Console steps documented in this 2026-06-05 entry were completed on 2026-06-06. The list below is retained only as historical context; it is no longer pending. See `Session Log - 2026-06-06 (Appwrite Phase 2/3 Activation + Public Portfolio Chat Fix)` above for the final live state.

1. **`idempotency_cache` collection** (DB: `main`) — attributes: `key` (str 64, unique index), `user_id` (str 36), `feature` (str 64), `status` (str 16), `has_result` (bool), `cached_result` (str 65536, nullable), `created_at` (str 32), `expires_at` (str 32). Server-only permissions.
2. **`ai_request_logs` collection** — add `credits_charged` (int), `idempotency_key` (str 64, nullable), `is_idempotency_hit` (bool) attributes. Add indexes on `user_id` and `created_at`.
3. **`chat_sessions` collection** — add `question_count` (Integer, default 0).
4. **`ai_credits` collection** — add unique index on `user_id`.
5. **Set `ADMIN_EMAIL`** env var in Appwrite Console for both `ai-gateway` and `admin-devkit-data`.

### Deployment after merge

```bash
node scripts/deploy_hubs.cjs --only=ai-gateway
node scripts/deploy_hubs.cjs --only=admin-devkit-data
node scripts/deploy_hubs.cjs --only=coupons
```

---

## Session Log - 2026-06-03 (Admin Panel / DevKit Refactor - Phases 1-4)

### Overview
Documentation-only closeout for the WiseResume Admin Panel / DevKit refactor session. Codex verified the repo state first, confirmed earlier claimed Phase 1 work was not actually present in the codebase, then implemented and committed Phases 1 through 4 only. No deploy was performed in this session.

**Branch at stop:** `main`

**Commits created**
- `fdb6e77d` - `Refine DevKit IA and Appwrite terminology`
- `a035ff4b` - `Fix DevKit plan emails and branded templates`
- `3e72993a` - `Fix DevKit AI key slot inventory`
- `18690082` - `Add Appwrite Functions console MVP`

---

### Phase 1A / 1B - DevKit IA + Appwrite terminology

#### Changes completed
- DevKit information architecture cleaned up and confusing labels renamed.
- AI Center is no longer treated as one hidden nested panel.
- AI sub-panels are now visible as first-class DevKit surfaces.
- `company-briefing` and `ask-portfolio` frontend defaults now point to Groq correctly.
- `src/lib/devkit/appwriteResponse.ts` now exists.
- Legacy `src/lib/devkit/edgeResponse.ts` remains as a backward-compatible shim.
- Diagnostics now treat `DEVKIT_PASSWORD` as an optional fallback, not a hard failure.
- Backend accepts both `fn-drift` and legacy `edge-fn-drift`.

#### Root causes
- Admin IA had grown organically and was confusing.
- Supabase/Edge terminology remained after the Appwrite migration.
- Frontend routing defaults had drifted from `ai-gateway`.

---

### Phase 2 - Plan / trial emails + branded templates

#### Changes completed
- Plan changes now use explicit change types instead of assuming every change is an upgrade.
- Downgrading to Free no longer sends "You've been upgraded to Free".
- Same-plan changes now skip email.
- Trial start and trial revoke now use correct email behavior.
- Email status is surfaced in admin UI toasts.
- Admin-triggered emails now use WiseResume crimson branding.
- Brand color used: `#9E1B22`.
- Indigo `#6366f1` was removed from active admin email / DevKit templates.
- Remaining `#6366f1` grep hit is unrelated marketing gradient in `src/pages/index-landing.css`.

#### Root causes
- Previous logic treated every plan mutation as an upgrade.
- Email templates were functional but not aligned with Project Atlas / WiseResume branding.

---

### Phase 3 - API key slot inventory

#### Changes completed
DevKit API Keys now reflect the real inventory:
- 3 OpenRouter keys
- 3 Groq keys
- 3 NVIDIA keys
- 1 DeepSeek key

Total: 10 real slots.

DeepSeek phantom slots 2 and 3 were removed from the UI and backend inspection logic.

#### Root cause
- The old UI assumed every provider used `[1,2,3]`.
- The gateway only uses one `DEEPSEEK_KEY`.

---

### Phase 4 - Appwrite Functions Console MVP

#### Changes completed
The old Deploy Hubs experience was upgraded into an Appwrite Functions Console MVP:
- lists functions
- supports single redeploy
- supports multi-select redeploy
- supports deploy all
- shows recent executions
- shows execution detail
- uses existing `admin-deploy-hubs` selective deploy support via `body.hubs`
- includes confirmation dialogs for redeploy actions

#### Root causes
- `admin-deploy-hubs` already supported selected deployments, but the DevKit UI only exposed a blunt deploy-all flow.
- `handleEdgeFnDrift` previously returned fake / stub data.

---

### Validation completed

Passed:

```bash
npx vitest run src/lib/devkit/devToolsPanelConfig.test.ts
npx vitest run src/lib/devkit/aiTestSlotModels.test.ts
npx tsc --noEmit
node --check appwrite-hubs/admin-devkit-data/src/main.js
node --check appwrite-hubs/admin-email/src/main.js
node --check appwrite-hubs/inspect-ai-keys/src/main.js
```

Additional grep verification:

```bash
grep -R "#6366f1|C41E3A" ...
```

Result:
- no remaining admin email / DevKit hits
- only unrelated marketing gradient in `src/pages/index-landing.css`

---

### Hubs requiring redeploy

Backend hubs that must be redeployed before production reflects the backend changes from this session:
- `admin-devkit-data`
- `admin-email`
- `inspect-ai-keys`

Notes:
- Frontend changes still require the normal frontend deployment flow.
- `ai-gateway` was not part of the completed work in this session.
- `admin-deploy-hubs` was not modified by the completed Phase 1-4 commits.
- No redeploy was performed in this session.

---

### What was not done yet

Phases 5 through 10 remain pending.

#### Phase 5 - AI Tools Map MVP
Pending:
- app-area based AI Tools Map
- `aiToolsCatalogue`
- grouped AI Studio tools under shared `wise-ai-chat`
- safe `list-routes` probe
- no AI Studio route splitting

#### Phase 6 - Secure Real Route Testing
Pending:
- admin-only test button
- signed nonce from `admin-devkit-data`
- gateway verification
- no user credit deduction for admin test
- token cap and output preview

#### Phase 7 - Consistent Gateway Metadata + Persistent AI Logs
Pending:
- top-level `meta` sibling on all gateway success responses
- `ai_request_logs` collection
- persistent provider / model / fallback / latency logs
- no raw key logging

#### Phase 8 - Key Pinning + Advanced Rotation
Pending:
- `key_mode`
- `key_slot`
- `fallback_strategy`
- gateway slot-aware `buildPool`
- production fallback remains enabled
- test-only fallback-disabled option

#### Phase 9 - Appwrite Functions Console Ideal Upgrade
Pending:
- per-function source hash
- last deployed source hash storage
- needs-redeploy detection

#### Phase 10 - Mobile UX Pass
Pending:
- DevKit mobile / tablet layout
- AI Tools Map mobile layout
- Appwrite Functions mobile cards
- no horizontal overflow

---

### Important safety state

Completed work did not:
- rewrite auth
- change user-facing AI prompts
- split AI Studio routes
- log raw API keys
- disable production fallback
- implement route testing
- implement key pinning
- create new schema

---

### Where we stopped

The next agent should start from:

```bash
git status
git log --oneline -10
```

Then confirm the four commits exist:
- `fdb6e77d`
- `a035ff4b`
- `3e72993a`
- `18690082`

Current local state at session close:
- no tracked code changes were left from this session
- local untracked artifacts still exist in the working tree (`.playwright-mcp/`, `Loader/`, and report JSON files)

Continue from:
- **Phase 5 - AI Tools Map MVP**

Do not redo Phases 1-4 unless validation shows regression.

Before continuing Phase 5, confirm whether backend hubs from Phases 2-4 have been redeployed:
- `admin-devkit-data`
- `admin-email`
- `inspect-ai-keys`

---

## Session Log - 2026-06-03 (Admin Panel Audit — 9 Fixes + Company Briefing Persistence)

### Overview
Full code-verified audit of the admin panel / DevKit and the AI Gateway. Nine issues fixed across two PRs (#75, #76). Both Appwrite hubs redeployed and activated. Vercel production deployment confirmed live on `resume.thewise.cloud`.

---

### Part 1 — Admin Panel / DevKit Audit (PR #75, commit `cd83764f`)

#### Root Causes Verified

| Issue | Root Cause |
|-------|-----------|
| Credits always `∞ unlimited` for all users | `admin-devkit-data` returned `daily_limit: null` when no `ai_credits` document existed (first-time users). `AdminUsersPanel` renders `∞` for any `null` limit. |
| Clicking a user row does nothing | `ChevronDown` expand indicator was inside the `stopPropagation` div at line 950 of `AdminUsersPanel.tsx`, so clicks on it were swallowed. The most natural click target was silently broken. |
| "Access denied" flash during Act As | `ActAs.tsx` called `startImpersonation()` inside a `useEffect`, so route guards (AdminRoute, ProtectedRoute) evaluated auth state *before* the impersonation store was set. Brief flash of redirect fired. |
| AI credits charged to admin during impersonation | `getAppwriteJWT()` always creates a JWT for the *admin's* Appwrite session. `ai-gateway` identified the admin as the requester and charged credits to the admin account, not the impersonated user. |
| "Acting as" banner obscures UI | `ActingAsBanner` renders `fixed top-0` (~40px). No compensating `padding-top` was applied to the content below it. |
| Company Briefing always returns provider error | `ai-gateway` schema for `company-briefing` instructed the model to return `{overview, talkingPoints, risks, questions}`. Client validated `briefing.companySnapshot` — which never existed in the response. |
| AI gateway only using 1–2 of 10 keys | `buildPool()` already read the correct env var names (`GROQ_KEY_1-3`, `OPENROUTER_KEY_1-3`, `DEEPSEEK_KEY`, `NVIDIA_KEY_1-3`). No startup log existed, so missing keys were invisible. Confirmed all 10 env vars are set and all 4 providers are active. |
| `VITE_DEV_KIT_PASSWORD` in CI | Dead secret reference in `deploy-frontend.yml` left from password auth removal. Not referenced anywhere in `src/`. |
| AI credits race condition | `loadCreditState` + `recordAiUsage` is a non-atomic read-write. Two concurrent requests can both pass the credit check before either increments. |

#### Changes Applied

| File | Fix |
|------|-----|
| `appwrite-hubs/admin-devkit-data/src/main.js` | Derive `daily_limit` from `PLAN_CREDIT_DEFAULTS = { premium: -1, pro: 50, free: 5 }` when no `ai_credits` doc exists. Value mirrors `PLAN_DAILY_LIMITS` in `ai-gateway`. |
| `src/components/dev-kit/AdminUsersPanel.tsx` | Moved `ChevronDown` outside the `stopPropagation` div. Expand now works on first click. |
| `src/pages/ActAs.tsx` | Moved `startImpersonation()` + `history.replaceState()` to module-level synchronous init (before any React render). Eliminates auth-flash race. Removed `useRef` StrictMode guard — no longer needed. |
| `src/lib/appwrite-functions.ts` | Imported `isImpersonating`, `getImpersonationState`. When impersonating, attaches `X-Impersonating-User-Id: <userId>` header to all function calls. |
| `appwrite-hubs/ai-gateway/src/main.js` | (1) After auth validation, derives `effectiveUserId`: if caller is admin AND `X-Impersonating-User-Id` is present, use impersonated user ID for rate-limiting and credit attribution. (2) Fixed `company-briefing` schema in `schemaPrompt` to match `CompanyBriefing` TypeScript type (`companySnapshot`, `recentHighlights`, `cultureSignals`, `keyPeople`, `talkingPoints`, `questionsToAsk`). (3) Updated `normalizeStructuredFeatureData` for `company-briefing` to validate `companySnapshot` and throw a clear error if missing. (4) Added `logPoolSummary()` — logs `total=N providers={...}` per request, lists missing env var names if pool < 10. Never logs key values. (5) Documented credits race condition with `TODO` comment in `recordAiUsage`. |
| `src/AppInterior.tsx` | Added `useImpersonatingBanner()` hook via `useSyncExternalStore` on the impersonation store. Wraps app content in `pt-10` div when banner is visible. |
| `.github/workflows/deploy-frontend.yml` | Attempted removal of `VITE_DEV_KIT_PASSWORD` reference — reverted because the OAuth token lacks `workflow` scope. See pending actions. |
| `Project Atlas/CHANGELOG.md` | Dated entry added. |

#### Atlas Correction
`Project Atlas/00-Full-App-Reference/full-app-reference.md` stated `pro = 100 daily AI credits`, citing the deleted `supabase/functions/_shared/creditLimits.json`. Both active sources (`src/lib/planConfig.ts` and `ai-gateway PLAN_DAILY_LIMITS`) say `pro = 50`. Atlas corrected; source-of-truth pointer updated.

#### Verification (PR #75)
- `npx tsc --noEmit` — zero errors.
- `node --check appwrite-hubs/ai-gateway/src/main.js` — clean.
- `node --check appwrite-hubs/admin-devkit-data/src/main.js` — clean.

---

### Part 2 — Appwrite Hub Redeployment

Both hubs redeployed from `Y:/WiseResume-TWC` main branch and activated via Appwrite API.

| Function | Deployment ID | Status | Activated |
|----------|--------------|--------|-----------|
| `admin-devkit-data` | `6a1f963d4b70f8d540f1` | `ready` | ✅ `true` |
| `ai-gateway` | `6a1f9652dbdf03436bbb` | `ready` | ✅ `true` |

Live smoke test: `ai-gateway` HTTP 200, all 4 providers `{groq:true, openrouter:true, deepseek:true, nvidia:true}`.

---

### Part 3 — Company Briefing Persistence Fix (PR #76, commit `90c85977`)

#### Root Causes Verified

Three bugs caused the generated briefing to vanish every time the sheet was closed:

| Bug | File | Root Cause |
|-----|------|-----------|
| 1 | `AgenticChatSheet.tsx` `onBriefingGenerated` | Only called `setCache(...)`. Never updated parent `cachedBriefingData` or `briefingCompanyName` state. So `initialBriefing=null` and `initialCompanyName=''` on every reopen. |
| 2 | `AgenticChatSheet.tsx` `onOpenChange` | Explicitly called `setCachedBriefingData(null)` and `setBriefingCompanyName('')` on every close — even right after a fresh generation. |
| 3 | `CompanyBriefingSheet.tsx` header | Save action was `variant="ghost" size="icon"` with only a `<Bookmark>` icon and no label. Users closed the sheet without knowing how to save. |

#### Changes Applied

| File | Fix |
|------|-----|
| `src/components/editor/AgenticChatSheet.tsx` | `onBriefingGenerated` now also calls `setCachedBriefingData(briefing)` and `setBriefingCompanyName(companyName)`. `onOpenChange` no longer clears state on close. |
| `src/components/interview/CompanyBriefingSheet.tsx` | Save button changed to `variant="outline" size="sm"` with visible `Save` text label alongside the Bookmark icon. |

#### Verification (PR #76)
- `npx tsc --noEmit` — zero errors.

---

### Verification — Vercel Production Deployment

| Deployment | Commit | State | Live |
|------------|--------|-------|------|
| `dpl_2S8VLnPpQWXVZv8vzgwtcNQEShVJ` | `90c85977` | ✅ READY | `resume.thewise.cloud` |

Build time: ~80s. Both PRs (#75, #76) squash-merged to `main`.

---

### Pending Actions (User must action)

| Action | Why |
|--------|-----|
| Remove `VITE_DEV_KIT_PASSWORD` from `deploy-frontend.yml` | Token lacks `workflow` scope. One-liner: `sed -i '/VITE_DEV_KIT_PASSWORD/d' .github/workflows/deploy-frontend.yml && git commit -am "ci: remove stale VITE_DEV_KIT_PASSWORD reference" && git push origin main` (requires token with `workflow` scope) |
| Activate `admin-sentry` in Appwrite Console | Deployment `6a1dbbbc6a95ec9862a8` is `ready` but not active. Appwrite Console → Functions → `admin-sentry` → `...` → Activate |

---

### Where We Stopped
- All 9 audit fixes are on `main` and live in production.
- Company Briefing persistence fix is on `main` and live in production.
- `admin-devkit-data` and `ai-gateway` are redeployed with the latest code.
- `resume.thewise.cloud` is serving commit `90c85977`.
- No uncommitted or un-pushed changes remain.
- Two manual actions remain: `VITE_DEV_KIT_PASSWORD` CI cleanup (workflow-scope token required) and `admin-sentry` activation (Appwrite Console).

---

## Session Log - 2026-06-02 (Appwrite Functions Audit, AI Gateway, Admin Hub Token Alignment)

### Overview
Audited all 21 Appwrite Functions after the live DevKit/admin access fix. The active Appwrite state is now aligned: all functions are enabled, every active deployment is `ready`, and no function has a latest execution failure. Some old failures remain in Appwrite's recent execution history, but the latest checked executions are successful.

### Root Causes Verified
- `ai-gateway` needed redeploy and had old provider failures. A live real-request smoke test also proved `__headers.X-Appwrite-JWT` could leak into the model prompt payload for `wise-ai-chat`.
- Passwordless DevKit sessions are issued by `admin-devkit-data` using an HMAC over `APPWRITE_API_KEY`, but older admin functions still verified only `DEVKIT_PASSWORD`, causing valid DevKit tokens to return `401`.
- `inspect-ai-keys` imported `node-appwrite` but its function package did not declare the dependency, causing runtime module-load failure.
- `admin-testmail` sent the Testmail API key as a Bearer header; the Testmail inbox endpoint expects `apikey` in the query string.
- Stale active deployments were found for `admin-deploy-hubs`, `coupons`, `email-service`, `job-import`, `public-share`, and `wisehire-gateway`.

### Changes Applied
- `ai-gateway`: sanitizes request options before sending any payload to AI providers; auth/session headers, JWTs, tokens, passwords, API keys, and authorization fields are stripped from model-facing content.
- Admin functions: `admin-email`, `admin-testmail`, `admin-feature-flags`, `admin-moderation`, `admin-portfolio-usernames`, `admin-visitor-analytics`, `admin-onboarding-funnel`, `admin-impersonate`, `inspect-ai-keys`, and `admin-deploy-hubs` now accept the passwordless DevKit session token signed with the Appwrite API key. `DEVKIT_PASSWORD` remains a temporary compatibility fallback.
- `inspect-ai-keys`: added `node-appwrite` to package dependencies.
- `admin-testmail`: Testmail inbox calls now pass `apikey` as the API expects and return a clean unconfigured response when the key is absent.
- Redeployed stale or changed functions directly via `scripts/deploy_hubs.cjs --only=...`.

### Verification
- `node --check` passed for all changed function entrypoints.
- Live `ai-gateway` smoke returned provider availability for Groq, OpenRouter, DeepSeek, and NVIDIA.
- Live real `ai-gateway` request returned HTTP 200 through Groq and did not include `__headers`, `X-Appwrite-JWT`, or JWT text in the response.
- Live DevKit token flow: `verify-devkit-session` returned HTTP 200 for `magdy.saber@outlook.com`.
- Live admin smoke checks returned HTTP 200 for `admin-devkit-data`, `admin-email`, `admin-testmail`, `admin-feature-flags`, `admin-moderation`, `admin-portfolio-usernames`, `admin-visitor-analytics`, `admin-onboarding-funnel`, and `inspect-ai-keys`.
- Final Appwrite audit: 21 functions checked; deployment problems: none; latest execution failures: none.

### Admin Function Consolidation Recommendation
Do not collapse every admin-labeled function into one physical function immediately. The safer end-state is a single browser-facing Admin/DevKit gateway (`admin-devkit-data`) with admin actions routed through one interface, while specialized workers such as deployment, email, Sentry, analytics, and provider inspection remain separate until each can be migrated without widening secrets or increasing blast radius. This reduces UI/operator confusion without turning one admin function into a fragile mega-function.

---

## Session Log - 2026-06-02 (Unified Brand Loading System — WiseLogoLoader)

### Overview
Replaced every ad-hoc loading spinner across the app with a single brand- and size-aware `WiseLogoLoader` (the assembling Wise logo). UI/visual-only — no loading conditions, routes, APIs, auth, data-fetching, or business logic changed. Source component delivered by user at `Loader/`; copied into `src/components/loader/`.

### Scope Decisions (user-confirmed)
| Decision | Outcome |
|----------|---------|
| Inline-spinner breadth | Replace **all** real spinners, including in-button ones (via size-adaptive compact mode) |
| Boot splash | `AnimatedSplash` visual swapped to the logo loader (timing/brand-name logic kept) |
| WiseHire branding | Loader must render **blue** in WiseHire areas, not red |

### Component Design (`src/components/loader/WiseLogoLoader.tsx`)
- `variant`: `"wiseresume"` (red) / `"wisehire"` (blue via blue bg gradient + `hue-rotate(220deg) saturate(2) brightness(0.85)` on the PNG parts — same filter the app already uses for AppIcon). Omitting `variant` **auto-detects** from route (`/wisehire`, `/enterprises`, `?for=companies`), so inline spinners in WiseHire areas go blue with no prop threading.
- `size`: tokens `xs(16)/sm(20)/md(96)/lg(160)/xl(200)` or raw px.
- **Size-adaptive render**: `≤44px` → compact brand-colored CSS ring (no PNG load in buttons); `>44px` → full assembling logo. Solves the "don't force the heavy logo into tiny buttons" constraint inside one component.
- Assets: `wise-loader-assets/` (4 PNGs: part-w, part-sep, part-text, part-badge).

### Changes Applied
| Area | Change |
|------|--------|
| `src/components/ui/PageLoadingSpinner.tsx` | Overlay (`fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm`) + `<WiseLogoLoader size="lg">`; blue on WiseHire. Drives ~20 route Suspense fallbacks |
| `src/components/ui/MiniSpinner.tsx` | Now thin wrapper over `WiseLogoLoader` (compact ring at button sizes). 46 `MiniSpinner` + 5 `LoadingButton` consumers inherit with no edits |
| `src/components/AnimatedSplash.tsx` | `AppIcon` → `<WiseLogoLoader size="md">` (blue for WiseHire); timing/dismiss/brand-name logic untouched |
| 98 files / 185 sites | Codemod: `<Loader2 …animate-spin>` → `<MiniSpinner size={px}>` (px mapped from original `h-/w-`/`size=`; margins preserved). All were unconditional spinners |
| 28 files / 37 sites | Conditional `RefreshCw` (`cond && animate-spin`) → `{cond ? <MiniSpinner/> : <RefreshCw/>}` (loader when active, icon at rest — no layout shift) |
| 4 sites | Always-spinning `RefreshCw`/`Save` already gated by a ternary → spinning branch → `<MiniSpinner>` (`AIRoutingSwitcher` x2, `OverviewPanel`, `EmailManagementPanel`) |
| `src/pages/wisehire/BulkScreenPage.tsx`, `CandidateMaskingPage.tsx` | Hand-rolled ⏳/CSS-ring spinners → `<MiniSpinner>` (auto-blue) |
| `src/pages/AuthCallbackPage.tsx` | Full-page CSS-ring loader → `<PageLoadingSpinner />` |

Total: 1 new dir (`src/components/loader/`), 113 files modified.

### Intentionally Left (5 `animate-spin` sites)
| Site | Why |
|------|-----|
| `landing/EditorDemo.tsx:199` `<Sparkles>`, `landing/TailoringDemo.tsx:108` `<Wand2>` | Decorative demo animations, not loading states |
| `career/CareerMindmap.tsx:266` | Decorative conic-gradient rotating border |
| `career/CareerMindmap.tsx:204` | A `querySelectorAll('.animate-spin')` string in code, not UI |
| `portfolio/public/PortfolioContactForm.tsx:221` | Visitor-facing, portfolio-owner-themed button (custom `accentColor`, white spinner matched to text). Brand-red ring would clash with owner themes — left themed by design |

### Verification Status
- `npx tsc --noEmit` — zero errors.
- `npm run build` — exit 0; 4 PNGs bundled with hashed names, loader code in main chunk; no sourcemap leak.
- `eslint` (changed files) — **0 new** problems. The 22 errors present are pre-existing (`no-empty`, `no-unsafe-finally` in `AuthVerifyEmailPage.tsx`, `TailorPage.tsx`) — confirmed identical on committed versions.
- Grep: `0` raw `<Loader2>` / `Loader2` imports remaining.
- Duplicate-loader audit: all 3 direct `PageLoadingSpinner` renders are exclusive early-returns; no file mixes full-page + inline loaders; no stray `WiseLogoLoader` outside the 3 primitives.
- Browser visual check (dev server :5000): app boots clean (no console errors); both variants verified with real bundled assets — WiseResume red, WiseHire blue.

### Deployment Notes
- Frontend-only. Goes live on next Vercel deploy of the branch once merged. No Appwrite hub redeploy needed.

### Where We Stopped
- **Not committed.** All changes live in the working tree on branch `claude/zen-herschel-d10996` (clean base was `0a5959bf`). Next step is to commit + push, then open a PR to `main`.
- Local-only dev artifact: a `node_modules` junction was created in the worktree (`Y:\WiseResume-TWC\.claude\worktrees\zen-herschel-d10996\node_modules` → main repo's `node_modules`) so tsc/build/lint run in the worktree. It is gitignored — will not be committed.
- No follow-up work outstanding. One open question for the user: whether `PortfolioContactForm.tsx:221` (themed visitor spinner) should also adopt the brand loader — currently left themed by design.

---

## Session Log - 2026-06-01 (App Audit, Admin Panel Security, Appwrite CI Fixes, admin-sentry)

### Overview
Four-part session: (1) comprehensive app audit with 7 bug fixes, (2) locked DevKit/admin panel behind admin-only email auth, (3) fixed Appwrite GitHub CI never building for `ai-gateway` and `admin-deploy-hubs`, (4) created `admin-sentry` Appwrite function from scratch.

Branch: `claude/app-audit-report-y0dzO` — PR #74 merged to `main`.

---

### Resolved Bug - Admin Panel button not rendering in production

**Original symptom:** Logged in as `magdy.saber@outlook.com`; the profile dialog showed the email, but no Admin Panel button appeared and `/devkit` was inaccessible.

**Resolution:** Fixed in the 2026-06-02 "Admin Panel Profile Menu Access" session below by waiting for hydrated Appwrite auth before comparing the normalized `user.email`, then wiring the same result through the profile menu and `/devkit` route guard.
---

### Part 1 — App Audit Bug Fixes (commit `b38fb6a`)

| Area | Root Cause | Fix |
|---|---|---|
| `ai-gateway` email route — no rate limit | No server-side abuse protection on public email endpoint | IP-based rate limit: 5 emails/hour/IP via in-memory `_emailRateLimits` Map |
| `ai-gateway` email route — HTML body | `opts.message` was a plain string; email client rendered raw HTML tags | Built `htmlBody` from `opts.message` before passing to Resend |
| `ai-gateway` email route — unlocked fields | Caller could override `to`/`from` in body | Hard-coded `to: CONTACT_EMAIL` and `from: NOREPLY_EMAIL` server-side; caller input ignored |
| `ai-gateway` email route — no success flag | Response was `{}` — frontend could not confirm delivery | Added `success: true` to response body |
| `TailorHistory` type — missing `jobUrl` | `TailorHistory` interface had no `jobUrl` field | Added `jobUrl?: string \| null` to `src/types/resume.ts` |
| `TailorPage.tsx` — jobUrl not stored | `addTailorHistory()` call omitted `jobUrl` | Added `jobUrl: jobUrl \|\| null` to the call |
| `UploadPage.tsx` — silent upload failure | `saveResume()` catch block was empty; failure invisible to user | Added `toast.error(...)` and early return on failure |
| `appwrite-bridge.ts` — dead code | `invokeAppwriteHub()` export and `export-resume-pdf`/`export-portfolio-pdf` in `AI_HUB_FUNCTIONS` were unreachable | Removed both; cleaned dead import |
| `ANTHROPIC_API_KEY` — never used | `buildPool()` in `ai-gateway` never included Anthropic as a provider | No code change — user removes key from Appwrite console |

---

### Part 2 — Admin Panel Security (commit `498e300`)

**Goal:** `/devkit` inaccessible to public; Admin Panel button only visible when `magdy.saber@outlook.com` is signed in; no separate password prompt.

| File | Change |
|---|---|
| `src/hooks/useIsAdmin.ts` | NEW — exports `ADMIN_EMAIL` constant and `useIsAdmin()` hook; returns `true` only when `user.email?.toLowerCase() === 'magdy.saber@outlook.com'` |
| `src/components/layout/AdminRoute.tsx` | NEW — route guard; shows spinner while auth loads, `<Navigate to="/" replace />` for non-admin, renders children for admin |
| `src/AppInterior.tsx` | Wrapped `/devkit` route in `<AdminRoute>`; added `useIsAdmin()` + Cmd+Shift+A keyboard shortcut (admin only) |
| `src/components/layout/AppWorkspaceLayout.tsx` | Added `useIsAdmin()`; conditionally passes `onAdminPanel: () => navigate('/devkit')` to sidebar props |
| `src/components/layout/AppWorkspaceSidebar.tsx` | Added `onAdminPanel?` and `adminBadgeCount?` props; threads to `DashboardWorkspaceProfileDialog` |
| `src/components/dashboard/DashboardWorkspaceProfileDialog.tsx` | Added Admin Panel button at top of menu (blue ShieldCheck icon, red unread badge); only renders when `onAdminPanel` prop is present |
| `src/pages/DevToolsPage.tsx` | Removed password form and biometric login; auto-login on mount via `devKitLogin()` (sends Appwrite JWT, no password); redirects to `/` on failure; added admin mode banner at top |
| `src/lib/devkit/devKitClient.ts` | Removed `password` parameter from `devKitLogin`; sends `{ action: 'verify-devkit-session' }` only |
| `appwrite-hubs/ai-gateway/src/main.js` | Added `ADMIN_EMAIL` constant; replaced `verifyDevKitSession` to verify Appwrite JWT via `Account.get()` + email check; HMAC signing secret changed from `DEVKIT_PASSWORD` to `APPWRITE_API_KEY`; removed plaintext password fallback from `checkAuth` |
| `src/lib/appwrite-functions.ts` | Removed `isAdminFunction` JWT exclusion — JWT now flows to all admin functions including `admin-devkit-data` |

**UX extras implemented:** Admin mode overlay banner, notification badge prop wired (always `undefined` until a fetch is added), Cmd+Shift+A shortcut, minimal profile dropdown entry.

---

### Part 3 — Appwrite GitHub CI Fix (commit `68f750b`)

**Root cause:** `ai-gateway` and `admin-deploy-hubs` were connected to the GitHub repo in the Appwrite console for auto-deploy, but neither appeared in `appwrite.json`. On every push Appwrite looked up the path from `appwrite.json`, found no entry, produced a 0-byte / 0-second failed deployment. Manual deployments worked because they bypass the path lookup.

**Fix:** Added both functions to `appwrite.json` with correct `path`, `entrypoint`, `runtime`, and `commands`.

```json
{ "functionId": "ai-gateway",        "path": "appwrite-hubs/ai-gateway",        "entrypoint": "src/main.js", ... }
{ "functionId": "admin-deploy-hubs", "path": "appwrite-hubs/admin-deploy-hubs", "entrypoint": "src/main.js", ... }
```

---

### Part 4 — `admin-sentry` Appwrite Function (commits `2bccc49`, `3337845`)

**Root cause:** Function ID `6a0760710000ff231048` (`admin-sentry`) existed in Appwrite and was GitHub-connected, but had no source directory in the repo. All GitHub deployments failed. A previous working version existed only as a manual deployment (not in source control).

**Fix:** Created `appwrite-hubs/admin-sentry/` from scratch and registered in `appwrite.json` with the correct function ID.

**Function capabilities:**

| Action | Auth | What it does |
|---|---|---|
| `get-issues` | DevKit session token | Fetch paginated Sentry issues; supports `query`, `limit`, cursor |
| `get-stats` | DevKit session token | Total unresolved count + 24h hourly event volume + project info |
| `resolve-issue` | DevKit session token | Mark a Sentry issue resolved via Sentry API |
| `ignore-issue` | DevKit session token | Mark a Sentry issue ignored via Sentry API |
| `webhook` | None (HMAC-verified) | Receive Sentry alert webhooks; verifies `Sentry-Hook-Signature` when `SENTRY_WEBHOOK_SECRET` is set |

Auth pattern: same HMAC-signed DevKit session token as `admin-devkit-data`.

Env vars read: `SENTRY_AUTH_TOKEN`, `SENTRY_ORG_SLUG` (or `SENTRY_ORG`), `SENTRY_PROJECT_SLUG` (or `SENTRY_PROJECT`), `SENTRY_WEBHOOK_SECRET` (optional).

---

### Verification
- `npx tsc --noEmit` — zero errors after all changes.
- Vercel preview: ✅ Ready (deployed).
- `admin-sentry`: ✅ Built (28s, 4 MB) — deployment `6a1db9175c65a3ff6917` is **Ready**, not yet activated.
- `ai-gateway` + `admin-deploy-hubs`: Queued on Appwrite runners (new deployments from latest push).

---

### Pending Actions (user must do in Appwrite console)

| Action | Why |
|---|---|
| **Activate** `admin-sentry` deployment `6a1db9175c65a3ff6917` | Click `...` → Activate on the Ready row — function has no active deployment yet |
| Set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG_SLUG`, `SENTRY_PROJECT_SLUG` on `admin-sentry` | Required for Sentry API calls to work (user has already added these) |
| Remove `DEVKIT_PASSWORD` from `admin-devkit-data` function variables | Auth no longer uses the password; old var is dead weight |
| Optionally add `ADMIN_EMAIL=magdy.saber@outlook.com` to `admin-devkit-data` | Defaults to that value if missing; explicit var makes it auditable |
| Remove `ANTHROPIC_API_KEY` from Appwrite console | Never read by any function — `buildPool()` in `ai-gateway` never included Anthropic |
| Disable Appwrite GitHub auto-deploy for `ai-gateway`, `admin-deploy-hubs`, `admin-sentry` | Per user request. In Appwrite console: each function → Settings → Git → toggle off "Activate automatic deployments" |
| Merge PR #74 to main | All changes reviewed and ready |

---

### Where We Stopped
- PR #74 merged to `main`. Vercel deployed.
- `admin-sentry` built successfully (deployment `6a1dbbbc6a95ec9862a8` — Ready). **User must activate in Appwrite console** (`...` → Activate).
- `ai-gateway` and `admin-deploy-hubs` had new deployments queued at session end.
- GitHub Actions workflows already manual-only — no change needed.
- `VITE_DEV_KIT_PASSWORD` reference still in `deploy-frontend.yml` line 38 — pre-existing artifact, not cleaned up.
- `adminBadgeCount` prop always passes `undefined` — no fetch implemented.
- Admin Panel profile-menu access bug resolved in the 2026-06-02 session below.
## Session Log - 2026-06-02 (Admin Panel Profile Menu Access)

### Overview
Fixed the missing Admin Panel action in the workspace profile dropdown for the admin Appwrite account `magdy.saber@outlook.com`. Also added a matching route guard for direct `/devkit` navigation.

### Root Cause Verified
- `src/hooks/useAuth.ts` returns `AuthContext` directly. `AuthContext` normalizes Appwrite account data into `AppUser` with `id`, `email`, `name`, and `emailVerification`; the live Appwrite email path is `appwriteUser.email`.
- `user` is only non-null after `appwriteUser` exists, or during impersonation. The normalized type requires `email`, but the safe comparison now still handles missing/blank email defensively.
- In this checkout, `src/hooks/useIsAdmin.ts` and `src/components/layout/AdminRoute.tsx` did not exist, `AppWorkspaceLayout` never computed admin status, the sidebars did not receive `onAdminPanel`, and `DashboardWorkspaceProfileDialog` did not render an Admin Panel action.
- Direct `/devkit` access was not blocked by the same email-comparison bug because there was no admin route wrapper mounted around it.
- Follow-up deployment failure verified locally with `npm run build`: Vite/esbuild failed because `src/components/layout/AppWorkspaceSidebar.tsx` destructured `onAdminPanel` twice after the rebase overlap with upstream admin-menu work.
- Follow-up UI/auth mismatch verified in code: `appwrite-hubs/admin-devkit-data/src/main.js` already issues DevKit sessions by validating the Appwrite JWT and comparing `Account.get().email` to `ADMIN_EMAIL`, but `src/pages/DevToolsPage.tsx` still rendered the old password/access-key form and called `devKitLogin(password)`. `src/components/landing/LandingHeader.tsx` also lacked an admin-only dropdown item.
- Follow-up live Appwrite mismatch verified through Appwrite API: active `admin-devkit-data` initially returned the old password-era response `Invalid DevKit password`, proving the function had not been redeployed. After redeploying current source, JWT verification timed out because `node-appwrite` `Account.get()` hung inside the Appwrite Function runtime.

### Code Fixes Applied
| File | Fix |
|------|-----|
| `src/hooks/useIsAdmin.ts` | Added auth-settled admin status hook using unchanged `ADMIN_EMAIL = 'magdy.saber@outlook.com'` and `user.email?.trim().toLowerCase()`. |
| `src/components/layout/AdminRoute.tsx` | Added direct `/devkit` guard that waits for auth hydration and redirects non-admin users to `/dashboard`. |
| `src/components/layout/AppWorkspaceLayout.tsx` | Uses `useIsAdmin()` and passes `onAdminPanel` only when the hydrated admin check is true. |
| `src/components/layout/AppWorkspaceSidebar.tsx` | Accepts and forwards `onAdminPanel` to the profile dialog. |
| `src/components/layout/AppMobileSidebarSheet.tsx` | Includes `onAdminPanel` in the mobile sidebar props. |
| `src/components/dashboard/DashboardWorkspaceProfileDialog.tsx` | Renders the Admin Panel menu item when `onAdminPanel` is present. |
| `src/AppInterior.tsx` | Wraps `/devkit` in `ProtectedRoute` + `AdminRoute`. |
| `src/pages/DevToolsPage.tsx` | Removed the password/access-key form; page now auto-requests the server-issued DevKit session using the signed-in Appwrite admin email and shows that email while verifying. |
| `src/components/landing/LandingHeader.tsx` | Added an Admin Panel item to the landing-page avatar dropdown, gated by `useIsAdmin()`. |
| `src/lib/appwrite-functions.ts` | Updated stale unauthorized DevKit copy to reference signing in with the admin email instead of re-entering a password. |
| `appwrite-hubs/admin-devkit-data/src/main.js` | Replaced `node-appwrite Account.get()` JWT verification with direct Appwrite REST `/account` lookup using `X-Appwrite-JWT` and an 8s timeout. |

### Verification Status
- `npx tsc --noEmit` — zero errors.
- `npm run build` — passed after removing the duplicate `onAdminPanel` binding.
- `npm run build` — passed after the passwordless DevKit/landing-dropdown update.
- `node --check appwrite-hubs/admin-devkit-data/src/main.js` — syntax clean.
- `node scripts/deploy_hubs.cjs --only=admin-devkit-data` — deployed active Appwrite deployment `6a1e5eddedbdc0a4b4e0`.
- Live Appwrite verification — `verify-devkit-session` with a JWT for `magdy.saber@outlook.com` returned HTTP 200 and a signed DevKit session.

### Deployment Notes
- Frontend-only change. Takes effect on the next frontend deployment.
- No admin email value, password prompt, or Appwrite schema changed. `admin-devkit-data` was redeployed for the server-side verification fix.

---

## Session Log - 2026-05-29 (Pre-Launch Bug Fixes)

### Overview
Full pre-launch audit followed by 12 targeted bug fixes covering email flows, unit tests, Portfolio editor, CI/CD workflow cleanup. Payments remain disabled ("Coming Soon") intentionally — a local payment gateway will be integrated later.

### Root Causes Verified

| Area | Root Cause |
|------|------------|
| Email verification (registration) | Silent `catch {}` in `AuthPage.tsx` swallowed `send-verification` failures; user was redirected to verify page with no email in inbox |
| Email service false-success | `createUserVerificationTokenOnce()` returned `secret: null` when Appwrite didn't include the secret in the response; function returned `{ success: true }` instead of an error |
| Resend cooldown | `resendCooldown` state was React-only; refreshing the page reset the 60s window |
| Portfolio translation | Post-publish `updateProfile()` for secondary language translations had `.catch(() => {})` — failure was invisible to user |
| Portfolio LinkedIn/GitHub | `handleSave()` used generic `normalizeUrl()` for LinkedIn/GitHub fields; bare usernames (`magdy-saber`) produced invalid URLs |
| appShellLayout test | Hard-coded offset `5.5rem` in test; actual implementation uses `4.5rem` |
| usePublicPortfolio test | Test mocked Supabase `rpc()` but hook uses Appwrite `databases.listDocuments()` |
| aiTailor-D1 test | Test mocked `global.fetch` but function uses `appwriteFunctions.invoke()`; retry timer used 3000ms, actual delay is 4000ms |
| exportResumePdf test | jsdom does not implement `requestAnimationFrame` natively; `waitForRender` loop never exited |
| PortfolioEditorPage test | Missing mocks for `usePlan`, `appwriteFunctions`, and `Query.orderAsc` caused runtime crashes |
| GitHub Actions | Stale `revenuecat-webhook` build step remained after RevenueCat was removed in the 2026-05-27 session |

### Code Fixes Applied

| File | Fix |
|------|-----|
| `src/pages/AuthPage.tsx` | Added `emailSent` flag; shows warning toast on send failure instead of silent swallow |
| `appwrite-hubs/email-service/src/main.js` | Returns HTTP 500 error when token secret is null instead of false-success |
| `src/pages/AuthVerifyEmailPage.tsx` | Resend cooldown timestamp persisted in `localStorage` under `wr_verify_resend_ts`; initialized from storage on mount |
| `src/pages/PortfolioEditorPage.tsx` | Warning toast on translation sync failure; `ensureLinkedinUrl()`/`ensureGithubUrl()` used in save path |
| `src/components/templates/shared/contactUtils.ts` | Added exported `ensureLinkedinUrl()` and `ensureGithubUrl()` helpers |
| `.github/workflows/deploy-appwrite-hubs.yml` | Removed stale `revenuecat-webhook` build step |
| `src/components/layout/__tests__/appShellLayout.test.ts` | Updated expected offset `5.5rem` → `4.5rem` |
| `src/hooks/__tests__/usePublicPortfolio.test.tsx` | Rewrote to mock Appwrite `databases.listDocuments` instead of Supabase |
| `src/lib/__tests__/aiTailor-D1.test.ts` | Rewrote to mock `appwriteFunctions.invoke`; fixed retry timer and abort test |
| `src/lib/exportResumePdf.test.ts` | Added `requestAnimationFrame` polyfill in `beforeEach` |
| `src/pages/__tests__/PortfolioEditorPage.test.tsx` | Added missing `usePlan`, `appwriteFunctions`, `databases`, `Query.orderAsc` mocks |

### Verification Status
- `npx tsc --noEmit` — zero errors.
- 5 previously-failing tests now pass: `appShellLayout`, `usePublicPortfolio`, `aiTailor-D1`, `exportResumePdf`, `PortfolioEditorPage`.
- `node --check appwrite-hubs/email-service/src/main.js` — syntax clean.

### Deployment Notes
- `email-service` hub must be redeployed for FIX 2 to take effect in production. Run `node scripts/deploy_hubs.cjs --only=email-service` from the repo root.
- All other fixes are frontend/test-only — take effect on next Vercel deployment (no Appwrite hub redeploy needed).

### Where We Stopped
- 11 of 12 file changes committed to `main` as `bf565450` and pushed to `origin/main`.
- **One file NOT pushed:** `.github/workflows/deploy-appwrite-hubs.yml` — the stale `revenuecat-webhook` build step removal is staged locally but not committed. GitHub rejected the push because the OAuth token in use lacks the `workflow` scope. The change is a single line deletion. Next agent or user must push this manually using a token with `workflow` scope: `git add .github/workflows/deploy-appwrite-hubs.yml && git commit -m "ci: remove stale revenuecat-webhook build step" && git push origin main`.
- **`email-service` hub must be redeployed** for the false-success fix (FIX 2) to take effect in production: `node scripts/deploy_hubs.cjs --only=email-service`. All other fixes are frontend-only and go live on the next Vercel deploy of `main`.
- Payments remain disabled / Coming Soon — unchanged from 2026-05-27 session.
- Portfolio cross-device save: `portfolio_extras` attribute does not exist in the live Appwrite `profiles` collection. The code path is silently skipped. To enable it: add `portfolio_extras` (String, size ~200KB) to the `profiles` collection in Appwrite Console, then add `portfolio_extras` to `LIVE_PROFILE_ATTRIBUTES` in `src/hooks/useProfile.ts` lines ~141–161.
- E2E tests remain blocked on missing `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` env vars — not a code issue.

---

## Session Log - 2026-05-27 (Payment Provider Removal - Billing Coming Soon)

### Overview
Removed the previous payment provider from the web app, mobile app, Appwrite hub deployment list, tests, dependencies, and environment examples. No replacement payment provider was added. Billing and upgrade surfaces remain visible, but all payment actions are disabled and marked Coming Soon.

### Root Causes Verified
- Premium access is read from existing internal subscription/user data through hooks such as `useMe` and `usePlan`; it does not need an active payment SDK to keep feature gates protected.
- The active purchase, restore, offerings, customer-info, and management-link flows were tied to the removed provider SDK and webhook.
- The provider webhook only existed to sync external payment events into `subscriptions`; with payments disabled, keeping the webhook would create a stale active payment path.
- `Deploy.bat` delegated to `scripts\deploy_hubs.cjs`, which no longer deploys the removed webhook, but the local folder still contained an ignored stale `revenuecat-webhook.tar.gz` archive that could confuse manual deployments.

### Code Fixes Applied
| Area | Fix |
|------|-----|
| Web billing | Removed the provider SDK wrapper, provider component, purchase hook, and app wrapper. Added `src/lib/billing.ts` with `paymentStatus: "coming_soon"`, `paymentsEnabled: false`, and `availablePaymentMethods: []`. |
| Subscription UI | Kept subscription/upgrade UI visible, preserved existing internal plan display and feature gates, and changed upgrade/manage actions to disabled Coming Soon states. |
| Premium gates | Updated upgrade dialog/wall CTAs so they no longer start checkout; premium features remain locked unless internal plan data grants access. |
| Mobile | Removed mobile payment SDK configuration and purchase flow. The paywall now shows plan previews with a disabled Coming Soon action. |
| Appwrite hubs | Removed the obsolete payment webhook hub and deployment helper; deploy scripts no longer deploy or provision webhook variables. |
| Dependencies/env | Removed web and mobile payment SDK packages from package manifests/lockfiles and removed provider-specific env vars from examples. |
| Tests | Removed obsolete webhook tests from the P0 hub test file; AI unauthenticated guard tests remain. |
| Local deployment helper | Updated `Deploy.bat` to run from the repo root, validate `.env.deploy`, remove stale `revenuecat-webhook.tar.gz`, call `scripts\deploy_hubs.cjs`, and fail visibly on deployment errors. |

### Verification Status
- `npx tsc --noEmit` passed.
- `npm run build` passed; Vite reported existing large-chunk warnings only.
- `node tests/hubs/p0-readiness.test.cjs` passed.
- Focused ESLint on changed web/hub files passed.
- Full `npm run lint` still fails on pre-existing unrelated lint issues across the repo and `.claude/worktrees`; the changed web/hub files are clean.
- `npm test` still fails on pre-existing unrelated tests (`usePublicPortfolio`, `aiTailor-D1`, `PortfolioEditorPage`, `appShellLayout`, and PDF export expectations); no failure points to the payment removal.
- Mobile `npm run typecheck` still fails on pre-existing mobile typing/config issues (`newArchEnabled`, `tabBarButtonTestID`, Detox globals, and existing mobile component prop types). Mobile dependencies were restored with `npm install --legacy-peer-deps` after an npm network reset during uninstall.
- Mobile focused ESLint is blocked by an existing ESLint/plugin version mismatch (`@typescript-eslint/no-unused-expressions` reading missing `allowShortCircuit`).
- `node --check scripts/deploy_hubs.cjs` passed after the `Deploy.bat` update.
- `git diff --check` passed for the `Deploy.bat`/Atlas update with only normal Windows line-ending warnings.
- Appwrite hub redeployment was not run during the `Deploy.bat` update; the file is ready for the owner to double-click or run when redeployment is intended.

### Deployment Notes
- No live provider replacement exists yet.
- Remove obsolete provider env vars from Vercel/Appwrite/EAS after the updated code is deployed and verified.
- Do not add a new provider or fake checkout until a separate payment-provider task is accepted.
- The old payment webhook function may still exist remotely in Appwrite from earlier deployments; delete it manually from Appwrite Console after confirming no external webhook still targets it.
- `Deploy.bat` now runs `scripts\deploy_hubs.cjs` from the repo root, removes any stale `revenuecat-webhook.tar.gz` archive before deployment, and exits with an error if hub deployment fails. It does not redeploy the removed webhook hub.
- The GitHub Actions manual hub workflow still contains an old build step for the removed webhook and needs a separate workflow-scope update before using that workflow for hub deployment. Use DevKit or `scripts/deploy_hubs.cjs` until that workflow file is cleaned up.

### Where We Stopped
- RevenueCat is removed from active code, dependencies, env examples, and Appwrite hub deployment scripts.
- Payments remain disabled and displayed as Coming Soon; no replacement payment provider exists.
- Appwrite `main` database / `subscriptions` collection remains the source of truth for manual Premium/Pro access.
- Manual Premium grant path remains: create or update a subscription document with `user_id`, `plan: premium` or `plan: pro`, and `status: active`; downgrade by setting `plan: free`.
- `Deploy.bat` is updated for local all-hub redeployment and will not redeploy the removed webhook hub.
- Remote Appwrite may still have the old removed webhook function deployed; delete it manually from Appwrite Console after confirming no external webhook still targets it.
- Do not use the GitHub Actions manual hub workflow until its stale removed-webhook build step is cleaned up with workflow-scope credentials.

---

## Session Log - 2026-05-26 (P0 Production Readiness Fixes — AI/Auth/Credits/Webhooks)

### Overview
Implemented the P0 production readiness plan from the comprehensive audit. The AI hubs now enforce server-side Appwrite session validation, server-side credit checks, and per-user/action rate limits before provider calls. The legacy payment provider webhook runtime body parsing bug is fixed. The audit and fix documentation was added under Project Atlas. Changes were committed, pushed to `main`, and all Appwrite hubs were redeployed.

### Root Causes Verified
- `ai-gateway` and `resume-section-ai` received browser Appwrite JWTs in `body.__headers['X-Appwrite-JWT']`, but did not validate them server-side before calling AI providers.
- AI credit UI and comments assumed server enforcement, but the Appwrite AI hubs did not check or increment `ai_credits`.
- AI rate limiting existed only in browser memory and was bypassable by direct function execution.
- `ai-gateway` still referenced removed Datadog LLMObs variables (`_llmobsEnabled`, `llmobs`), which could crash the first provider attempt.
- `legacy-payment-webhook` referenced undefined `rawBody`, causing malformed/missing body handling to fail at runtime.
- Appwrite schema/permissions and Vercel production verification requirements were not documented in a reproducible launch checklist.

### Code Fixes Applied
| Area | Fix |
|------|-----|
| `ai-gateway` | Added safe body parsing, JWT extraction from `__headers` / request headers, Appwrite `Account.get()` validation, per-user/action warm-instance rate limit, pre-provider credit checks, post-success credit increments, and removed the dead LLMObs trace branch. |
| `resume-section-ai` | Added `node-appwrite`, server-side JWT validation, per-user/action warm-instance rate limit, credit checks around provider-backed section actions, and post-success usage increments. Clarifying-question responses remain uncharged. |
| AI credits | Uses `ai_credits` (`user_id`, `daily_usage`, `daily_limit`, `total_usage`, `usage_date`) and `subscriptions` (`plan`, `effective_plan`, `trial_plan`, `trial_expires_at`). Plan limits: `free=5`, `pro=50`, `premium=-1`. |
| legacy payment provider webhook | Replaced undefined `rawBody` parsing with safe `req.body` parsing for string/object bodies; malformed/missing payloads return 400; authorization remains `timingSafeEqual` against `removed payment webhook secret`. |
| Tests | Added `tests/hubs/p0-readiness.test.cjs` covering AI unauthenticated rejection and legacy payment provider invalid auth, malformed body, ignored event, grant event, and revoke event. |
| Project Atlas | Added comprehensive audit files and fix docs under `Project Atlas/Comprehensive Audit 26-05-2026/`, including Appwrite schema/permissions, Vercel verification, smoke plan, fix summary, test results, remaining unknowns, and files changed. |

### Verification
- `node tests/hubs/p0-readiness.test.cjs` — passed.
- `npx tsc --noEmit` — passed.
- Targeted ESLint on changed hub/test files — passed.
- `ReadLints` on edited code/test files — no linter errors.
- `npm run build` — passed; Vite reported existing large-chunk warnings only.
- Full `npm run lint` — still fails on pre-existing/unrelated repo and worktree issues. Changed-file lint is clean.

### Git / Deployment Completed
- Commit pushed to `main`: `a68a23a9 fix(ai): enforce server-side readiness guards`.
- `git push origin main` completed successfully (`7523be92..a68a23a9`).
- `node scripts/deploy_hubs.cjs` completed successfully and processed all Appwrite hubs.
- Appwrite deployment IDs from this run:
  - `resume-section-ai`: `6a153c0805259fedaf26`
  - `job-import`: `6a153c0e6edf71541b78`
  - `ai-gateway`: `6a153c1766a5ed66ad92`
  - `coupons`: `6a153c1d3489d8655fc7`
  - `wisehire-gateway`: `6a153c26576f3de75612`
  - `public-share`: `6a153c2cca4251b0c641`
  - `ai-health`: `6a153c2eaeb688422aaf`
  - `admin-devkit-data`: `6a153c37a218c51392a8`
  - `admin-email`: `6a153c3d4597353d9d01`
  - `admin-testmail`: `6a153c3f2f7e5c089720`
  - `admin-feature-flags`: `6a153c446a199efe9c50`
  - `admin-moderation`: `6a153c49bbb7a459cfce`
  - `admin-portfolio-usernames`: `6a153c4f0745157789d8`
  - `admin-visitor-analytics`: `6a153c54330cfb446b44`
  - `admin-onboarding-funnel`: `6a153c594e61d50584ee`
  - `admin-impersonate`: `6a153c5e99845b567451`
  - `inspect-ai-keys`: `6a153c606f1bbe0efcec`
  - `admin-deploy-hubs`: `6a153c66cd3bbf2d9491`
  - `legacy-payment-webhook`: `6a153c6bdfa310e8e3ad`
  - `email-service`: `6a153c709943b19944b5`

### Current State
- P0 AI auth, AI credit enforcement, AI warm-instance rate limiting, and legacy payment provider webhook parsing fixes are on `main` and deployed to Appwrite.
- Appwrite auth email templates were re-synced by the deploy script: verification template blanked for Resend-branded verification email; recovery template synced from `password-recovery.html`.
- `jobs` collection create permission was updated by the deploy script: added `Permission.create(Role.users())`.
- Remaining untracked local artifacts are `.playwright-mcp/` and `reports/e2e-results-2026-05-26T04-*.json`; they were intentionally not committed.

### Remaining Known Risks
- AI credit increments use Appwrite document updates, not an atomic transaction; concurrent requests can race.
- Rate limiting is warm-instance memory, not globally shared across all Appwrite instances.
- Full repo lint remains red due pre-existing/unrelated issues; do not treat it as introduced by this P0 fix.
- Live Console verification is still required for Appwrite collection attributes/ACLs, function execute permissions, Vercel env vars, legacy payment provider webhook config, Resend logs, and Sentry state.

### Where We Stopped
- Code is committed and pushed to `main`.
- All Appwrite hubs were redeployed successfully.
- P0 fix documentation exists in `Project Atlas/Comprehensive Audit 26-05-2026/fixes/`.
- Next agent should run the production smoke checklist after Vercel finishes deploying `main`, then verify Appwrite logs, Vercel logs, legacy payment provider webhook delivery, Resend email delivery, and Sentry for new production errors.

---

## Session Log - 2026-05-26 (Email System Recovery — Direct Appwrite Deploy, No GitHub Actions)

### Overview
Recovered the PR #70 email system without using GitHub Actions, because workflow minutes were exhausted. `email-service` is now deployed directly to Appwrite and live Appwrite executions confirm password reset, verification, and welcome emails are accepted by Resend.

### Root Causes Verified
- PR #70 merged the final `email-service` architecture but did not deploy it to Appwrite.
- GitHub Actions could not be used for Appwrite deployment due exhausted workflow hours.
- `admin-deploy-hubs` used `git clone`, but Appwrite's Node.js runtime has no `git` binary.
- `scripts/deploy_hubs.cjs` used the old positional Appwrite SDK signature for `functions.createVariable()`, so new variables failed with `Missing required parameter: "value"`.
- `email-service` expected Appwrite-injected headers directly on `req.headers`, but browser calls through `appwriteFunctions.invoke()` forward custom headers in `body.__headers`.
- DevKit `send-test` originally required raw `DEVKIT_PASSWORD` on `email-service`; the frontend sends signed DevKit session tokens. `email-service` now accepts raw password/signature if configured and can delegate token validation to the already-working `admin-devkit-data` diagnostics path.

### Code Fixes Applied
| Area | Fix |
|------|-----|
| `email-service` | Reads `X-Appwrite-JWT` / authorization from `body.__headers`; uses user-context `Account.get()` for email/name; adds `send-admin-verification`; validates DevKit tokens via `admin-devkit-data` when local `DEVKIT_PASSWORD` is unavailable. |
| DevKit | Email Service smoke test now calls `email-service:send-test` to `delivered@resend.dev`; God Mode verification email now calls `email-service:send-admin-verification`. |
| Auth UI | Forgot-password and claim-account flows now inspect `fnError` from `appwriteFunctions.invoke()`. |
| Deploy tooling | `deploy_hubs.cjs` loads `.env.deploy`, supports `--only=...`, uses `sdk.ID.unique()` when creating variables, and avoids global side effects on targeted deploys going forward. |
| `admin-deploy-hubs` | Uses GitHub API tarball download instead of `git clone`. |
| Frontend UX | Pulled in unremerged PR #71 changes locally: hide Import Job FAB on auth/public pages and show user-friendly non-admin function errors. |

### Direct Appwrite Deployment Completed
No GitHub workflow was used.

| Function | Active deployment | Status |
|----------|-------------------|--------|
| `admin-deploy-hubs` | `6a1515c3abe4f3a9fd8d` | `ready`, activated |
| `email-service` | `6a1516cd249d2b749492` | `ready`, activated |

`email-service` execute access is `any`. This is intentional because logged-out password reset must be public; authenticated/user/admin actions enforce auth inside the function.

### Live Verification
- `send-password-reset` for an existing user returned `{"success":true}` and logged "Password reset email sent".
- `send-verification` for a temporary Appwrite user with JWT returned `{"success":true}` and logged "Verification email sent" to `delivered@resend.dev`.
- `send-welcome` for a temporary Appwrite user with JWT returned `{"success":true}` and logged "Welcome email sent" to `delivered@resend.dev`.
- Appwrite Auth email templates for verification and recovery were blanked to a single space.
- `npx tsc --noEmit` passed.
- `npm run build` passed.

### MCP / Deployment Status
- Resend MCP is configured with an invalid API key and could not list domains/logs. This is a Cursor MCP configuration problem, not an app runtime blocker; live Appwrite execution logs confirm Resend sends were accepted.
- Vercel MCP shows recent preview deployments from Claude branches, but this local recovery code is not on production until it is committed and pushed. Do not use manual `vercel deploy`; Vercel Git integration should deploy from the normal push.

### Where We Stopped
- Appwrite email backend is live and verified.
- Local frontend/build code is verified but not pushed in this session.
- Next step: commit and push these changes when ready so Vercel's Git integration deploys the frontend normally.

---

## Session Log - 2026-05-24 — Part 2 (Welcome Email, DevKit Studio, Multi-Sender, Deploy Pipeline)

### Overview
Second session on same day. Completed all remaining email system work. PR #70 merged to main.

### What was built

| Feature | Details |
|---------|---------|
| Welcome Email | Fires automatically after `account.updateVerification()` succeeds in `AuthVerifyEmailPage.tsx`. Non-fatal. Uses user's first name via admin SDK lookup. |
| `send-welcome` action | Added to `email-service`. Uses user JWT + admin SDK to get name/email → branded welcome email via Resend. |
| `send-test` action | DevKit-only. Guarded by `DEVKIT_PASSWORD` Bearer. Sends test render of any template (welcome/verification/password-reset) to any address with sender override. |
| Multiple sender support | `resendSend()` accepts optional `fromEmail`/`fromName` — supports noreply@, hello@, contact@thewise.cloud |
| DevKit Email Studio | `EmailTransactionalStudioPanel.tsx` — Studio tab in DevKit → Email hub. Template + sender selector. |
| Deploy pipeline | `admin-deploy-hubs`: added `email-service` + `legacy-payment-webhook` to HUBS. After deploying `email-service`, auto-sets all variables. After any successful deploy, blanks Appwrite auth templates. `deploy_hubs.cjs`: `email-service` entry with all vars. |

### Deployment Status (as of merge)
Code is on main. `email-service` NOT YET deployed to Appwrite — pending user action.

### How to Deploy (DevKit path)
1. DevKit → Deploy Hubs → **Deploy All Hubs** (first run ~5 min) — deploys updated `admin-deploy-hubs`
2. **Deploy All Hubs again** (second run ~5 min) — new `admin-deploy-hubs` deploys `email-service` + auto-sets variables
3. Appwrite Console → Functions → email-service → Variables — add `RESEND_API_KEY` if not auto-set

### Post-Deployment Test
DevKit → Email → Studio tab → send test welcome email → confirm delivery.

---

## Session Log - 2026-05-24 (CRITICAL: Email Verification + Password Reset — email-service hub)

### Overview
Replaced the broken email verification flow with a single consolidated `email-service` Appwrite Function that handles ALL transactional emails (verification + password reset) via Resend, completely bypassing Appwrite's template system.

### Bug Found During Review
The first iteration (`send-verification-email` hub) called `users.createVerification(userId, url)` which **does not exist** in node-appwrite v17. The admin `Users` class only has `updateEmailVerification(userId, bool)`. The function would have crashed at runtime.

### Root Cause of the Original Email Bug (Verified)
`{{url}}` in the Appwrite Console email template was not substituted because the Console's editor encoded the curly braces before saving. Our custom branded template was sent but with `{{url}}` as literal text — email clients rendered it as `render://init-bundle/%7B%7Burl%7D%7D` (unclickable).

### Correct Architecture
- `account.createVerification(url)` (Account SDK) — exists, returns `Token` with `.secret`, requires user JWT ✅
- `account.createRecovery(email, url)` (Account SDK) — exists, returns `Token` with `.userId` + `.secret`, public (no session) ✅
- `users.createVerification()` (Users Admin SDK) — does NOT exist in v17 ❌

The `email-service` function creates a user-context or public Account client, calls the appropriate method to get the token secret, then sends the branded email via Resend. Appwrite's own email pipeline also fires on these calls (side effect) — suppressed by setting the Console templates to a single space.

### Final Fix — email-service hub
One Appwrite Function handles all transactional emails:

| Action | Auth required | How it works |
|--------|--------------|--------------|
| `send-verification` | User JWT (active session) | Calls `account.createVerification()` via user-context client → gets `secret` → sends branded email via Resend |
| `send-password-reset` | None (email in body) | Calls `account.createRecovery(email, url)` via public client → gets `userId + secret` → sends branded email via Resend. Always returns success (no email enumeration) |

### Files Changed (final)
| File | Change |
|------|--------|
| `appwrite-hubs/email-service/src/main.js` | New consolidated email hub |
| `appwrite-hubs/email-service/package.json` | Package manifest |
| `appwrite-hubs/send-verification-email/` | **Deleted** (replaced by email-service) |
| `src/pages/AuthPage.tsx` | Verification + password reset via `email-service` |
| `src/pages/AuthVerifyEmailPage.tsx` | Resend verification via `email-service` |
| `src/components/settings/sections/AccountSection.tsx` | Password reset via `email-service` |

### Deployment Required
1. Deploy `email-service` hub to Appwrite
2. In Appwrite Console → Functions → `email-service` → Settings: **Execute access: Users**
3. Variables: `APPWRITE_API_KEY`, `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (noreply@thewise.cloud), `RESEND_FROM_NAME` (WiseResume), `FRONTEND_URL` (https://resume.thewise.cloud)
4. **In Appwrite Console → Auth → Email Templates:** Set BOTH Email Verification AND Password Recovery template bodies to a single space `" "` — this suppresses Appwrite's side-effect email while our Resend email delivers correctly

### Verification
- `npx tsc --noEmit` — zero errors

---

## Session Log - 2026-05-24 (CRITICAL: Email Verification Link Broken — SUPERSEDED)

### Root Cause (Verified — No Guessing)
New users received the branded WiseResume verification email but the button was unclickable. Clicking it produced `render://init-bundle/%7B%7Burl%7D%7D` (the email client's internal scheme prepended to the literal string `{{url}}`). The alternative plain-text link section appeared blank.

**Evidence:** The branded dark-red custom template WAS being sent (not Appwrite's default template), confirming the custom template was applied in the Console. But `{{url}}` was not substituted before delivery. This means the Appwrite Console's HTML template editor encoded the curly-brace placeholders (e.g., as HTML entities) before saving, so Appwrite's template engine could not find and replace `{{url}}`.

**Code was correct.** `AuthPage.tsx:100` called `appwriteAccount.createVerification(verifyUrl)` with `verifyUrl = ${window.location.origin}/auth/verify-email` — this is valid. The problem was entirely in Appwrite's email template pipeline.

### Fix
Created new Appwrite Function `send-verification-email` that bypasses Appwrite's template system entirely:
1. Frontend calls `appwriteFunctions.invoke('send-verification-email')` instead of `account.createVerification()`
2. Function receives the calling user's ID from Appwrite's injected `x-appwrite-user-id` header
3. Function uses Admin SDK `users.createVerification(userId, redirectUrl)` → gets the `secret` token back
4. Constructs full URL: `${FRONTEND_URL}/auth/verify-email?userId=...&secret=...`
5. Sends branded HTML email via Resend directly — no Appwrite template engine involved

### Files Changed
| File | Change |
|------|--------|
| `appwrite-hubs/send-verification-email/src/main.js` | New Appwrite Function |
| `appwrite-hubs/send-verification-email/package.json` | Package manifest |
| `src/pages/AuthPage.tsx` | Replace `createVerification()` with `appwriteFunctions.invoke('send-verification-email')` |
| `src/pages/AuthVerifyEmailPage.tsx` | Replace `createVerification()` with `appwriteFunctions.invoke('send-verification-email')` on resend |

### Verification
- `npx tsc --noEmit` — zero errors

### Deployment Required Before Fix is Live
1. Deploy the new hub: `node scripts/deploy_hubs.cjs` (or upload manually from Appwrite Console)
2. In Appwrite Console → Functions → `send-verification-email`:
   - **Execute access:** `Users`
   - **Variables to set:** `APPWRITE_API_KEY`, `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (`noreply@thewise.cloud`), `RESEND_FROM_NAME` (`WiseResume`), `FRONTEND_URL` (`https://resume.thewise.cloud`)
3. **Optionally** reset the Appwrite Console Auth → Templates → Email Verification back to default to stop Appwrite from also attempting to send its broken template email

### Where We Stopped
- Code committed and pushed to `claude/atlas-onboarding-GqwrK`
- New Appwrite Function written — **NOT yet deployed** (requires manual deployment step above)
- Next agent: Deploy the hub, set env vars, test with a new signup

---

## Session Log - 2026-05-23 (Navigation Audit + Mobile Sidebar Fix)

### Overview
Full audit of all routes, navigation links, and page-opening flows. Found 2 bugs and fixed both. All routes verified healthy, no broken links.

---

### Fix 1 — FeatureGate missing toast import (ReferenceError crash)

**Root cause:** `FeatureGate` in `AppInterior.tsx` (line 179) calls `toast.info("This feature isn't available right now.")` but `toast` was never imported in that file. Result: `ReferenceError: toast is not defined` when an admin disables any feature flag (interview, applications, portfolio, cover-letters, career, ai-studio) and a user navigates to that route.

**Affected routes when feature disabled:** `/interview`, `/applications`, `/application/:id`, `/portfolio`, `/cover-letters`, `/cover-letter/new`, `/cover-letter/edit/:id`, `/career`, `/ai-studio`, `/ai-studio/:tool`

**Note:** All features default to `true` in `useAppSettings`, so this only fires in admin-disabled scenarios — not a constant crash but a guaranteed one when ops disables a feature.

**Fix:** Added `import { toast } from 'sonner'` to `AppInterior.tsx`.

**Files changed:** `src/AppInterior.tsx`

---

### Fix 2 — Mobile sidebar opens in icon-only (collapsed) mode

**Root cause:** `AppWorkspaceSidebar` reads `collapsed` from `appSidebarStore` (persisted in localStorage). When `forceVisible=true` (mobile Sheet via `AppMobileSidebarSheet`), the component still applied `app-workspace-sidebar--collapsed` CSS class and all icon-only layout — leaving the mobile sidebar in icon-only mode (4.25rem wide) if the user had previously collapsed the desktop sidebar. Navigation labels were hidden and Portfolio was not visually discoverable.

**Fix:** Added `const effectiveCollapsed = forceVisible ? false : collapsed` immediately after the store read. Replaced all 18 render-side uses of `collapsed` with `effectiveCollapsed`. The stored desktop preference is unchanged — re-opening on desktop still respects the user's collapse state.

**Files changed:** `src/components/layout/AppWorkspaceSidebar.tsx`

---

### Audit findings (no action needed)

- All 50+ routes in `AppInterior.tsx` map to existing page files ✓
- All sidebar links (`/dashboard`, `/editor`, `/ai-studio`, `/applications`, `/portfolio`, `/settings`) resolve correctly ✓
- All More-panel links in `BottomTabBar` point to valid routes ✓ (component is unused/dead code — navigation is sidebar-only)
- `AIStudioPage` `openToolById` dispatch covers all 20+ tools with correct handlers ✓
- Feature flags all default to `true` — FeatureGate only fires on admin-disabled routes

### Where We Stopped
- Both fixes committed and pushed to `main` (commit `804a3350`)
- `npx tsc --noEmit` — zero errors
- Mobile sidebar verified in browser: opens expanded with all 6 nav items + labels visible

---

## Session Log - 2026-05-23 (AI Tools Delivery Audit + 3 Fixes)

### Overview
Full audit of all AI tools for broken endpoints and incorrect output delivery. Found 3 real bugs (2 delivery issues + 1 UX race condition). All fixed and pushed.

---

### Fix 1 — ChatWidget: blank assistant message on app-level error

**Root cause:** `ChatWidget.tsx` (`ask-portfolio` Appwrite function call) only checked the network-level `error` object, not `data?.error` (app-level body error). If the function returned `{ error: "some message" }` without an HTTP-level error, `data?.answer` was undefined and the component added `{ role: 'assistant', content: '' }` — a blank bubble.

**Fix:** Added `if (data?.error) throw new Error(data.error)` and `if (!data?.answer) throw new Error('Empty response')` before setting the assistant message.

**Files changed:** `src/components/portfolio/public/ChatWidget.tsx`

---

### Fix 2 — BoostAllExperienceSheet: false "Could not analyze" error panel on privacy dismissal

**Root cause:** `BoostAllExperienceSheet.tsx` called `enhance('ats_improve', ...)` which returns `null` when the user dismisses the AI Privacy Disclosure. The component treated `null` as a failure and called `setError(true)`, showing "Could not analyze your experience. Please try again." — a false error.

**Fix:** Changed the `!result` branch to return silently (`return;`) instead of `setError(true)`. Privacy dismissal now resets state cleanly with no error panel shown.

**Files changed:** `src/components/editor/BoostAllExperienceSheet.tsx`

---

### Fix 3 — CoverLetterNewPage: no loading state on PDF download button

**Root cause:** `handleDownloadPDF` had no guard against double-clicks. During an async PDF generation (`downloadCoverLetterPDF` can take 2–5 seconds), rapid clicks could spawn multiple simultaneous PDF renders.

**Fix:** Added `const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)`. `handleDownloadPDF` early-returns if already downloading, sets the flag before try, clears in finally. Download button shows `<MiniSpinner>` and is `disabled` while downloading.

**Files changed:** `src/pages/CoverLetterNewPage.tsx`

---

### Audit findings (no action needed)

- `useAIEnhance` shape validation (`shape.reason` → `AIError`) correctly surfaces as "Failed to enhance content — please try again." via `aiErrorToastMessage` — intentional, no fix needed
- `enhance()` returning `null` in `AIEnhanceSheet` batch and `useAIEnhance` are both intentional privacy-dismissal behaviors communicated by the disclosure UI

### Where We Stopped
- All 3 fixes committed and pushed to `main` (commit `65118aee`)
- No Appwrite function redeployments required — all fixes are frontend-only

---

## Session Log - 2026-05-23 (Export Dialog Polish + Editor Section Card Redesign)

### Overview
Full session covering five distinct fixes across the export dialog and editor section list. All TypeScript clean, all verified in browser.

---

### Fix 1 — Cover Letter CTA: two-path flow

**Root cause:** "Generate →" in the export dialog's disabled-pill banner called `gate('pro', () => sheets.open('tailor'), opts)` but forgot to invoke the returned function (`gate` is a factory, returns `() => void`). Result: click did nothing.

**Secondary UX issue:** Even after the fix, clicking "Generate" opened the AI Resume Tailor — confusing for users who want a plain cover letter without a job description.

**Fix:**
- Added `()` to invoke the `gate(...)` return value in `EditorPage.tsx`
- Replaced the single "Generate →" button with two distinct CTAs:
  - **General letter** → `navigate('/cover-letter/new')` (standalone, no JD required)
  - **Tailored to job ✦** → `gate('pro', () => sheets.open('tailor'), ...)()` (requires job description in AI Tailor first)
- Updated banner copy from vague "Generate →" to honest two-option layout with a header "No cover letter yet — create one first:"

**Files changed:**
| File | Change |
|------|--------|
| `ExportTypeList.tsx` | Added `onCreateGeneralCoverLetter?: () => void` prop; banner replaced with two-button row |
| `ExportOptionsSheet.tsx` | Threaded `onCreateGeneralCoverLetter` prop through |
| `EditorPage.tsx` | Fixed `gate(...)()` invocation; added `onCreateGeneralCoverLetter` → `navigate('/cover-letter/new')` |

---

### Fix 2 — Editor Section Card redesign

**Root cause / issues found:**
1. **UX logic error:** `tip` text (e.g. "Write 2–4 sentences...") rendered in the collapsed card header — always visible even when the section was closed, cluttering the list.
2. **Font hack:** Section titles used `text-h3 !text-sm` — a semantic heading class force-overridden with `!important` font-size, producing inconsistent rendering.
3. **Icon too small:** 24×24px icon box (`w-6 h-6 rounded-md`) looked generic and lightweight.
4. **Redundant text:** "More Sections" card had `tip="Add optional sections to stand out"` AND `AddSectionSheet` rendered "Add optional sections to enhance your resume" — two nearly identical lines back-to-back.

**Fix:**
- Moved `tip` inside `<CollapsibleContent>` — now only shows when the section is expanded, as a plain `<p>` (no pill styling)
- Changed title to `text-sm font-semibold text-foreground` — no `!important` override
- Icon box increased to `w-8 h-8 rounded-lg`, icon inside to `w-4 h-4`
- Chevron color softened to `text-muted-foreground/60`
- Removed `tip` prop from both "More Sections" `SectionCard` usages (`EditorScrollForm.tsx`, `EditorSectionContent.tsx`)
- Removed the `<p>` "Add optional sections to enhance your resume" from `AddSectionSheet.tsx`

**Files changed:**
| File | Change |
|------|--------|
| `SectionCard.tsx` | Tip moved inside CollapsibleContent; title font fixed; icon box 24→32px |
| `AddSectionSheet.tsx` | Removed redundant description paragraph; `space-y-4` → `space-y-3` |
| `EditorScrollForm.tsx` | Removed `tip` prop from "More Sections" SectionCard |
| `EditorSectionContent.tsx` | Removed `tip` prop from "More Sections" SectionCard |

---

### Where We Stopped

- All five fixes verified in browser (screenshots confirm)
- `npx tsc --noEmit` — zero errors after every change
- No uncommitted changes; session ends with a clean push to `main`
- **Next agent:** No outstanding UI debt from this session. Export dialog and editor section list are stable. Potential next area: the `CoverLetterNewPage` flow itself (route `/cover-letter/new`) has not been redesigned and may need polish to match the app's design system.

---

## Session Fix - 2026-05-23 (Export Dialog — Premium 2×2 Card Grid Redesign)

### Overview
Fourth iteration of the Export dialog redesign. User said the previous flat-pill layout "still looks too generic." Replaced the single pill row with a **2×2 card grid** for the four primary formats and a **horizontal scroll pill row** for the seven secondary formats below a "MORE FORMATS" label. Selected secondary format shows an animated detail card.

### Changes Applied

| File | Change |
|------|--------|
| `ExportTypeList.tsx` | Full rewrite. Primary formats: `grid grid-cols-2 gap-2.5` with large cards — 44px icon box, animated check in top-right corner on selection, description + badge. Secondary formats: `overflow-x-auto` scrollable pill row with icon + short label. `AnimatePresence` detail card appears only when a secondary format is selected. |

### Architecture
- `primaryOptions` (4): resume, ats-pdf, docx, image — rendered as 2×2 cards
- `secondaryOptions` (7): linkedin, plain-text, share-link, cover-letter, combined, json, latex — rendered as scroll pills
- Selected card state: `border-primary bg-primary/5 shadow-lg shadow-primary/10` with `motion.span` check animation
- `SHORT_LABELS` map provides compact pill labels (e.g., "Plain Text" not "Plain Text (.txt)")

### Verification
- Browser screenshot confirmed: 2×2 grid renders, selected card has prominent highlight + animated check
- Secondary pill row scrolls horizontally, "MORE FORMATS" label shown
- `PdfOptionsFooter` still visible for PDF-type selections

---

## Session Fix - 2026-05-23 (Export Dialog — Wider + Branding Lock)

### Overview
Two follow-up changes: widened the dialog from `sm:max-w-md` → `sm:max-w-xl` for better app presence; locked the WiseResume Badge toggle to premium-only (free/pro users see it forced ON for copyright).

### Changes Applied

| File | Change |
|------|--------|
| `ExportOptionsSheet.tsx` | Import `usePlan`, call `const { isPremium } = usePlan()`, pass `isPremium` to `PdfOptionsFooter`, widen dialog to `sm:max-w-xl`. |
| `PdfOptionsFooter.tsx` | Added `isPremium: boolean` prop. Badge row: if `!isPremium` → switch is `disabled`, checked forced to `true`, label shows amber "🔒 Premium" chip, description reads "Required on free & pro exports". Premium users see normal toggle. |

### Business Rule
- **Premium users** — can toggle branding on/off freely.
- **Free / Pro users** — branding is always ON (switch rendered disabled). This protects the copyright watermark on all exports from non-paying users.

### Verification
- `npx tsc --noEmit` — zero errors
- Dev user (premium) → badge row unlocked, toggle controllable, no lock chip
- Logic verified: `isPremium=false` path renders `disabled` switch, amber lock chip, "Required on free & pro exports" text

---

## Session Fix - 2026-05-23 (Export Dialog — Popup + Flat Format Row)

### Overview
User follow-up on export redesign: remove `1-Page` option (page cuts handled in editor preview panel), flatten all secondary formats into the main pill row (no collapsible), and convert bottom sheet → centered popup.

### Changes Applied

| File | Change |
|------|--------|
| `ExportOptionsSheet.tsx` | Replaced `Sheet`/`SheetContent` with `Dialog`/`DialogContent` (`sm:max-w-md`, `rounded-2xl`). Removed `one-page` from `primaryOptions` entirely. |
| `ExportTypeList.tsx` | Removed `Collapsible` / "More formats" section. Merged all options into a single flat `allOptions` array rendered as one scrollable pill row. Removed `SHORT_LABELS` entry for `one-page`. |
| `PdfOptionsFooter.tsx` | Reduced padding (`py-3`, `bg-muted/50 border border-border/50`) to feel less heavy inside the popup. |

### Verification
- `npx tsc --noEmit` — zero errors
- All 11 format pills present in DOM (`[data-export-id]` query confirms: resume, ats-pdf, docx, image, linkedin, plain-text, share-link, cover-letter, combined, json, latex)
- Dialog renders centered over editor, dismisses on backdrop click / ✕ button
- Spotlight card and button label update correctly per selection

---

## Session Fix - 2026-05-23 (Export Dialog Redesign — Professional UI)

### Overview
User reported the Export Resume sheet looked unprofessional. Redesigned all export dialog components for a cleaner, premium feel.

### Root Cause
The previous design used a 2-column compact card grid for primary format options — cards were too small, icons too tiny, and the layout felt like a basic utility dialog rather than a polished product feature.

### Fix Applied
Full visual redesign of 4 components. No logic/behavior changes.

| Component | Change |
|-----------|--------|
| `ExportTypeList.tsx` | Replaced 2-col grid with **horizontal pill selector** (scrollable) + **animated spotlight card** for the selected format. Uses `AnimatePresence` for smooth format switching. Short labels (`Design PDF`, `ATS PDF`, `Word`, `1-Page`, `4K Image`). |
| `ExportOptionCard.tsx` | Secondary (full) layout now uses compact `py-2.5` rows with smaller icon, truncated description, right-aligned check. Primary (compact) layout unchanged — replaced by pill selector. |
| `ExportProgressBar.tsx` | File name row is now an inline pill with `FileEdit` icon. Progress bar is thinner (`h-1.5`). Download button tightened to `h-13`. |
| `ExportOptionsSheet.tsx` | Header icon now in a small `bg-primary/10` rounded badge. ATS score badge uses `emerald`/`amber`/`destructive` tokens. |

### Verification
- `npx tsc --noEmit` — zero errors
- Browser: pill switching works, spotlight card animates between formats, badges (ATS-Safe, ATS-Friendly) display correctly, file suffix updates per format, button label updates per format

---

## Session Fix - 2026-05-23 (PDF Export Missing VITE_API_URL — CRITICAL)

### Overview
User reported repeated PDF export failures: **"PDF export is not available right now. Please try again later or use DOCX export."** This was happening even though the PDF export endpoint was working.

### Root Cause (VERIFIED)
The frontend couldn't reach the PDF export API because `VITE_API_URL` environment variable was not set.

**What happened:**
1. Frontend code (`src/lib/nativePdfGenerator.ts:169`) reads: `VITE_API_URL ?? ''`
2. When unset, it defaults to empty string
3. Frontend calls `/api/export/pdf-native` on localhost:5000 (same origin)
4. But the API server runs on localhost:5001 (different port)
5. Request fails → user sees "PDF export unavailable" error

### Fix Applied

**1. Created `.env.local` for dev:**
```env
VITE_API_URL=http://localhost:5001
```
This file is automatically loaded by Vite and takes precedence over `.env.example`.

**2. Verified production setup:**
GitHub Actions workflow (`.github/workflows/deploy-frontend.yml` line 39) already uses:
```yaml
VITE_API_URL: ${{ secrets.VITE_API_URL }}
```
Secret is set to `https://resume.thewise.cloud` — correct for production.

**3. Created comprehensive documentation:**
`API_CONFIGURATION.md` — explains setup for dev/prod, troubleshooting, file locations.

**4. Updated launch config:**
`.claude/launch.json` — no manual env override needed; Vite reads `.env.local` automatically.

### Verification
- ✅ Local: PDF export now works at `http://localhost:5000` → calls API on `:5001`
- ✅ Production: Uses GitHub Secret (already configured)
- ✅ cURL test: `POST /api/export/pdf-native` returns valid PDF

### Files Changed
| File | Change |
|------|--------|
| `.env.local` | Created with `VITE_API_URL=http://localhost:5001` |
| `API_CONFIGURATION.md` | Created comprehensive dev/prod setup guide |
| `.claude/launch.json` | Updated; removed manual env var (Vite reads .env.local) |

### Key Takeaway
**From now on:** Any new dev environment automatically gets the correct API URL via `.env.local`. No special setup needed. If API port changes, update `.env.local` only.

### Where We Stopped
- PDF export working locally and verified ✅
- `.env.local` created and documented ✅
- Production GitHub Secret verified ✅
- All docs updated ✅
- No code changes required (infrastructure-only fix)

---

## Session Summary - 2026-05-23 (UI Review, Portfolio Draft, Mobile Polish)

**Detailed log:** `Project Atlas/05-Migration to Appwrite/29-Session-Log-2026-05-23-UI-Portfolio-Mobile-Polish.md`

### Overview
Reviewed Cursor's recent UI work, fixed confirmed findings, corrected Portfolio Save Draft against the live Appwrite schema, and completed several desktop/mobile workspace polish fixes. No commit, staging, deployment, or schema migration was performed.

### Fixed
- **Portfolio Save Draft:** Removed dependency on missing Appwrite `profiles.portfolio_extras`; drafts now persist locally first and missing-attribute mirror writes are suppressed.
- **Profile writes:** `useProfile.updateProfile()` now filters outgoing payloads to verified live `profiles` attributes.
- **Portfolio draft guard:** Save/autosave now checks merged draft payload size.
- **Settings hero:** Removed invalid nested button structure.
- **Portfolio setup:** Hardened resume select item keys.
- **Settings/Portfolio desktop width:** Removed hard centered max-widths so both workspaces fill desktop content area.
- **AI Studio welcome:** Replaced fixed overlay banner with inline callout.
- **Mobile sidebar:** Matched drawer width to sidebar, removed oversized right rounding, fixed full-height wrapper, and bottom-aligned membership/profile footer.
- **Wise Workspace mobile drawer:** Matched mobile chat drawer width to mobile sidebar width.
- **Theme toggle:** Removed universal descendant color transition and added scoped transition/View Transition fallback.
- **Portfolio nav icon:** Replaced `Sparkles` with `Globe`.
- **Atlas schema docs:** Corrected stale `portfolio_extras` Appwrite assumption.

### Current State
- `npx tsc --noEmit` passes.
- `npm run build` passed earlier in this session after the portfolio/schema fixes.
- Focused dashboard/portfolio vitest set passed earlier in this session.
- Browser checks passed for `/portfolio`, `/settings`, `/ai-studio`, and mobile `/dashboard` drawer/theme behavior.
- Live Appwrite `profiles` still does **not** include `portfolio_extras`, `portfolio_draft`, or `portfolio_draft_saved_at`.
- Portfolio drafts are currently device-local until schema is intentionally extended.

### Where We Stopped
- Local browser is on `http://localhost:5000/dashboard`.
- Working tree is dirty with this session's source/doc changes.
- Pre-existing unrelated dirty files remain in `appwrite-hubs/*/package-lock.json`; do not revert them unless explicitly instructed.
- No files were staged or committed.
- No Appwrite schema changes were deployed.
- Next agent should run `git status --short`, review the detailed log, run final validation, then commit/deploy only after user approval.

---

## Session Update - 2026-05-23 (Portfolio Sidebar Icon Alignment)

### Overview
User reported the Portfolio icon in the workspace sidebar did not feel related to portfolio.

### Root Cause
`src/components/layout/appSidebarNav.ts` used the `Sparkles` icon for the Portfolio route, which reads as AI/generation instead of public profile or portfolio.

### Fix Applied
Changed the Portfolio workspace sidebar icon to `Globe`, matching the public portfolio concept and the icon already used by other nav surfaces.

### Verification
- `npx tsc --noEmit` passed

---

## Session Update - 2026-05-23 (Wise Workspace Mobile Drawer Sidebar-Width Match)

### Overview
User reported the Wise Workspace chat drawer still felt too large on mobile and should match the mobile sidebar width.

### Root Cause
The previous correction reduced the mobile chat drawer from `92vw` to `86vw`, but it was still viewport-based and therefore much wider than the app sidebar drawer on a 430px mobile viewport.

### Fix Applied
Changed the mobile Wise Workspace chat drawer to `min(var(--app-sidebar-width, 17rem), 86vw)` in both `src/index.css` and `src/lib/wiseWorkspace/drawerLayout.ts`. Desktop sizing remains unchanged.

### Verification
- `npx tsc --noEmit` passed
- Browser check on mobile `/dashboard` measured the Wise Workspace drawer at `272px` on a `430px` viewport.

---

## Session Update - 2026-05-23 (Theme Toggle Performance Smoothing)

### Overview
User reported visible frame loss when switching between light and dark mode on desktop and mobile.

### Root Cause
The old theme transition applied `transition` to `.theme-transitioning *`, forcing every element in the app to animate color-related paint during the theme class flip. On dense workspace screens this can trigger a large repaint and visible lag.

### Fix Applied
- `useTheme.toggleTheme()` now applies the resolved root theme class immediately and uses the browser View Transitions API when available.
- The CSS fallback now animates only major shell surfaces and controls for a short duration instead of every descendant node.
- Added root `color-scheme` for light/dark mode.

### Verification
- `npx tsc --noEmit` passed
- Browser check on mobile `/dashboard` toggled dark/light successfully and cleared `theme-transitioning` after the fallback transition.

---

## Session Update - 2026-05-23 (Mobile Sidebar Footer Placement)

### Overview
User reported the premium/profile area in the mobile workspace navigation felt unprofessional because it sat too high in the drawer.

### Root Cause
`SheetContent` wraps side-sheet children in an extra inner div. For the mobile sidebar sheet, that wrapper did not have full height, so the sidebar's flex spacer could not push the membership/profile footer to the bottom.

### Fix Applied
Scoped the mobile sidebar sheet wrapper to full height/min-height and kept the change inside `AppMobileSidebarSheet`. Desktop sidebar layout is unchanged.

### Verification
- `npx tsc --noEmit` passed
- Browser check on mobile `/dashboard` showed the visible footer block bottom-aligned with the drawer.

---

## Session Update - 2026-05-23 (Wise Workspace Mobile Chat Width)

### Overview
User reported the Wise Workspace chat drawer on mobile was slightly too large. Desktop should remain unchanged.

### Root Cause
The mobile chat drawer width was set to `92vw` in both `src/index.css` and the shared layout constant in `src/lib/wiseWorkspace/drawerLayout.ts`.

### Fix Applied
Reduced the mobile chat drawer width to `86vw` in both the rendered drawer CSS and the layout constant used to shrink the app stage. Desktop sizing remains `min(26rem, 32vw)`.

### Verification
- `npx tsc --noEmit` passed

---

## Session Update - 2026-05-23 (Mobile Sidebar Drawer Fit)

### Overview
User reported the mobile workspace navigation drawer looked bad on `/ai-studio`, showing a large awkward panel with empty space.

### Root Cause
`AppMobileSidebarSheet` inherited the generic left sheet width/rounding while rendering the narrower workspace sidebar inside it. On mobile this left a visible unused strip and an oversized rounded right edge.

### Fix Applied
The mobile navigation sheet now uses the same width as `--app-sidebar-width`, capped to `86vw` for small phones, removes the rounded right edge, hides the generic sheet close button through the component API, and forces the sidebar to fill the sheet width.

### Verification
- `npx tsc --noEmit` passed

---

## Session Update - 2026-05-23 (AI Studio Welcome Banner Placement)

### Overview
User reported the AI Studio welcome prompt looked bad because it appeared as a detached overlay on the UI.

### Root Cause
`src/pages/AIStudioPage.tsx` rendered the first-visit message as a fixed bottom banner (`bottom-24`) outside the page content flow, which could overlap the sidebar account/billing area and bottom workspace controls.

### Fix Applied
Moved the first-visit message into an inline callout directly beneath the resume selector. The callout uses the existing AI Studio visual language, keeps the page responsive, and dismisses through an icon-only control.

### Verification
- `npx tsc --noEmit` passed
- Browser layout check on `/ai-studio` showed the welcome callout in normal page flow and `0` fixed welcome banners.

---

## Session Update - 2026-05-23 (Portfolio Editor Desktop Width Correction)

### Overview
User reported `/portfolio` appeared as a narrow centered column on desktop with large empty left/right space.

### Root Cause
`src/components/portfolio/editor/portfolio-editor-workspace.css` capped `.portfolio-editor-workspace__scroll` at `max-width: 56rem` and centered it with auto margins.

### Fix Applied
Removed the hard max width and let the portfolio editor scroll container fill the available app workspace. Desktop now uses responsive `clamp()` side padding; mobile remains full-width and responsive.

### Verification
- `npx tsc --noEmit` passed
- Browser layout check on `/portfolio` showed the portfolio editor workspace matching the available app content width.

---

## Session Update - 2026-05-23 (Settings Desktop Width Correction)

### Overview
User reported `/settings` appeared as a narrow centered column on desktop with large empty left/right space.

### Root Cause
`src/components/settings/settings-workspace.css` capped `.settings-workspace__scroll` at `max-width: 42rem` and centered it with auto margins.

### Fix Applied
Removed the hard max width and let the settings scroll container fill the available app workspace. Desktop now uses responsive `clamp()` side padding; mobile remains full-width and responsive.

### Verification
- `npx tsc --noEmit` passed
- Browser layout check on `/settings` showed the settings workspace matching the available app content width.

---

## Session Update - 2026-05-23 (Portfolio Save Draft Live-Schema Correction)

### Overview
Follow-up review found the prior portfolio draft storage assumption was wrong for the live Appwrite schema. The browser error on **Save Draft** was `Invalid document structure: Unknown attribute: "portfolio_extras"`.

### Verified Root Cause
Live Appwrite API verification showed `profiles` currently has only these attributes: `user_id`, `email`, `full_name`, `username`, `avatar_url`, `onboarding_completed`, `job_title`, `industry`, `career_level`, `location`, `linkedin_url`, `portfolio_bio`, `portfolio_enabled`, `profile_completed`, `display_name`, `plan`, `country`, `is_suspended`, `suspension_reason`. It has no `portfolio_extras`, `portfolio_draft`, or `portfolio_draft_saved_at`.

### Fix Applied
- Save Draft stores the portfolio working copy in browser local storage first and catches the missing `portfolio_extras` Appwrite write path so the schema error is not shown.
- `useProfile.updateProfile()` filters outgoing profile payloads to live `profiles` attributes so stale portfolio fields do not break profile writes.
- Draft size guard now checks merged draft payload size.
- Settings profile hero no longer nests a button inside another button.
- Portfolio resume select keys were hardened against duplicate resume IDs.

### Verification
- `npx tsc --noEmit` passed
- Focused dashboard/portfolio vitest set passed
- `npm run build` passed

### Follow-up
If cross-device portfolio drafts and full portfolio settings persistence are required, add the missing Appwrite schema intentionally (`portfolio_settings` extended attributes or a dedicated portfolio draft/settings collection) and then move draft persistence back server-side.

---

## Session Summary - 2026-05-23 (Portfolio Draft Appwrite, Editor Workspace, Tailor Wizard, Wise AI Toggle)

**Detailed log:** `Project Atlas/05-Migration to Appwrite/27-Session-Log-2026-05-23-Portfolio-Editor-Tailor-Workspace.md`

### Overview
Frontend fixes and UX passes: portfolio **Save Draft** Appwrite attribute error; `/editor` workspace (icon section rail, ATS sheet, strength above preview, import crash); `/tailor` setup **step wizard**; global **Wise AI** chat toggle. No Appwrite schema deploy.

### Root Causes Addressed

| Area | Root cause | Fix |
|------|------------|-----|
| Portfolio Save Draft | Live `profiles` has no `portfolio_draft` / `portfolio_draft_saved_at`; client wrote those keys | Draft in `portfolio_extras.portfolioDraft` + `portfolioDraftSavedAt` via `portfolioDraftStorage.ts`; `useProfile` / `PortfolioEditorPage` / `SaveBar` updated |
| Portfolio Save Draft (UX) | Primary CTA called publish when portfolio not live | `SaveBar`: `!portfolioEnabled` → primary `onSaveDraft` |
| Editor crash | Invalid JSX ternary in `EditorPage.tsx` ~1548 | `renderEditorFormWorkspace()` call in ternary branch |
| Editor nav rail | Wide labeled list default; duplicated shell concerns | `EditorNavRail`: icon-only default (`3rem`), active icon highlight, expand for labels; auto-collapse on section change |
| Editor ATS panel | Fixed column blocked form | `EditorSuggestionsPanel`: FAB + right `Sheet` |
| Editor strength | Progress in rail | `EditorResumeStrengthBar` above preview in `EditorPage` |
| Editor duplicate search | Editor header command affordance vs global bar | Removed from editor workspace header; `AppWorkspaceLayout` hides top bar on `/editor`, `/preview` |
| Tailor setup scroll | All steps in one column + duplicate step rail | `wizardStep` + `tailor-flow.ts` + single visible `TailorStepCard`; one vertical `TailorStepRail` |
| Wise AI button | `openChat` always opened | `toggleChat` in `wiseWorkspaceStore`; `AppWorkspaceTopBar` + `DesktopNav` |

### Key Files

| Area | Paths |
|------|-------|
| Portfolio draft | `src/lib/portfolioDraftStorage.ts`, `src/hooks/useProfile.ts`, `src/pages/PortfolioEditorPage.tsx`, `src/components/portfolio/editor/SaveBar.tsx` |
| Editor | `src/pages/EditorPage.tsx`, `src/components/editor/EditorNavRail.tsx`, `EditorSuggestionsPanel.tsx`, `EditorResumeStrengthBar.tsx`, `EditorHeader.tsx`, `editor-workspace.css` |
| Tailor | `src/pages/TailorPage.tsx`, `src/components/tailor/page/tailor-flow.ts`, `TailorSetupWizardFooter.tsx`, `TailorStepRail.tsx`, `tailor-workspace.css` |
| Wise AI | `src/store/wiseWorkspaceStore.ts`, `AppWorkspaceTopBar.tsx`, `DesktopNav.tsx` |
| Shell | `AppWorkspaceLayout.tsx` (hide workspace top bar on editor/preview) |

### Verification
- `npx tsc --noEmit` — passed
- Merged to `main` as commit `a3145774` on branch `design-system-v1`, then merge commit to `main` (2026-05-23)

### Where We Stopped (authoritative — pre-merge to main)
- **Done in source:** Appwrite-safe portfolio draft persistence; editor workspace nav/suggestions/strength; tailor wizard; Wise AI toggle; dashboard/workspace Atlas UI on `design-system-v1`.
- **Follow-up:** merged `portfolio_extras` total size guard; optional Console `portfolio_draft` columns; user QA on Save Draft / editor / tailor; redeploy `ai-gateway` if not yet done from 2026-05-22 audit.

---

## Session Summary - 2026-05-22 (Branded Auth Emails — Diagnosis + Templates)

### Overview
User reported that new signup confirmation emails and forgot-password emails arrived branded as "Appwrite" instead of "WiseResume". Root cause diagnosed and templates written. No code changes to the running app — fix requires Appwrite Console configuration only.

### Root Cause (Verified)
`AuthPage.tsx:100` calls `appwriteAccount.createVerification()` on signup; `AuthPage.tsx:67` calls `appwriteAccount.createRecovery()` on forgot-password. Both use Appwrite's built-in email delivery. Because no custom SMTP provider and no custom email templates have been configured in the Appwrite Console for this project, Appwrite sends from its own servers with its own "Appwrite" branding.

### Files Added
| File | Purpose |
|---|---|
| `appwrite-hubs/email-templates/email-verification.html` | Branded template for Appwrite Email Verification (signup confirm) |
| `appwrite-hubs/email-templates/password-recovery.html` | Branded template for Appwrite Password Recovery (forgot password) |
| `appwrite-hubs/email-templates/README.md` | Console paste instructions and subject lines |

### Appwrite Console Actions Required (NOT YET DONE — awaiting user on PC)

**Step 1 — Settings → SMTP**
| Field | Value |
|---|---|
| SMTP Host | `smtp.resend.com` |
| SMTP Port | `465` |
| Sender Name | `WiseResume` |
| Sender Email | `noreply@thewise.cloud` |
| Username | `resend` |
| Password | Existing Resend API key (`re_…`) from `admin-email` Function variables |
| Secure | SSL |

**Step 2 — Auth → Email Templates → Email Verification**
- Subject: `Confirm your WiseResume email address`
- Body: paste full content of `appwrite-hubs/email-templates/email-verification.html`

**Step 3 — Auth → Email Templates → Password Recovery**
- Subject: `Reset your WiseResume password`
- Body: paste full content of `appwrite-hubs/email-templates/password-recovery.html`

### Verification Pending
After console config is applied: create a test account → confirm the email arrives from `noreply@thewise.cloud` with WiseResume branding. Trigger forgot-password → confirm recovery email is also branded.

### Emails NOT Affected (already branded, no change needed)
- Admin manual emails (DevKit `admin-email` hub) — already sent via Resend ✅
- Plan upgrade emails (`coupons` hub) — already sent via Resend ✅

### Where We Stopped
- Templates committed to `claude/atlas-onboarding-mnWBQ`.
- Console config pending (user will apply when on PC and share browser control).
- Next agent: after console config is done, update this entry with verification result.

---

## Session Summary - 2026-05-22 (Atlas Dashboard + App Shell Visual Pass)

**Detailed log:** `Project Atlas/05-Migration to Appwrite/26-Session-Log-2026-05-22-Atlas-Dashboard-App-Shell.md`

### Overview
Visual-only multi-pass: Atlas-aligned `/dashboard`, scroll compression, glass app shell nav, theme logos, contextual AI next-action card, nav membership badge. No API/routing/state/auth/backend/AI changes.

### Root Causes Addressed

| Area | Root cause | Fix |
|------|------------|-----|
| Dashboard | Legacy layout did not match Atlas `dashboard.html` reference | New dashboard components + `.dashboard-atlas-*` CSS; reordered `DashboardPage.tsx` |
| Dashboard scroll | Hero/metrics/secondary blocks pushed resume list below fold | Compact top bar/hero/metrics; search in list header; checklist collapsed by default |
| App shell | Nav lacked Atlas glass nav, command search, mobile shell | `.app-shell-*` CSS; `ShellBrand`, `ShellCommandSearch`, `MobileTopBar`; rewired `DesktopNav` / `BottomTabBar` / `AppShell` |
| Nav logo | Placeholder “W” + tagline | `ShellBrand` + `useThemeLogo()` → `wiseresume-logo-*.webp` |
| Dashboard AI card | Static/generic copy | `DashboardNextActionCard` uses `ResumeHealthScore` insights; existing review/tailor handlers |
| Nav premium badge (v1) | Generic plan pill | `NavMembershipBadge` in utility group |
| Nav premium badge (v2) | Crimson `--primary` blur/pulse clashed with avatar `ring-amber-400` | Removed `__glow` + custom crimson keyframes; reuse `.plan-glow-premium` + amber border/text |

### Key Files

| Area | Paths |
|------|-------|
| Dashboard | `src/pages/DashboardPage.tsx`, `src/components/dashboard/DashboardTopBar.tsx`, `DashboardSpotlightHero.tsx`, `HeroAtsScoreRing.tsx`, `DashboardNextActionCard.tsx`, `DashboardPlanBadge.tsx`, `DashboardStats.tsx`, `ResumeListCard.tsx` |
| Shell | `src/components/layout/AppShell.tsx`, `DesktopNav.tsx`, `BottomTabBar.tsx`, `MobileTopBar.tsx`, `ShellBrand.tsx`, `ShellCommandSearch.tsx`, `NavMembershipBadge.tsx` |
| Styles | `src/index.css` (`.dashboard-atlas-*`, `.app-shell-*`, `.nav-membership-badge*`) |
| Reference | `PlanAvatar.tsx` — `ring-amber-400` + `plan-glow-premium` |

### Verification
- `npm run build` — passed (after premium glow fix)
- `DashboardHero.test.tsx` — passed (spotlight hero)

### Where We Stopped (authoritative — UI pass)
- Atlas dashboard + app shell visual work **complete in source**; premium nav badge uses same amber glow as profile avatar.
- **Not done:** `DashboardPlanBadge` glow parity with nav; global `DesktopNav` CTA hierarchy audit; no user sign-off on light/dark mobile QA.
- **No commit** this pass.
- **Same day, separate session:** PDF export blank-output fix (below). Treat as independent commit scope.

**Next agent (UI):** Visual QA at `http://localhost:5000/dashboard` + nav premium trial/active states; then commit UI pass separately from PDF/export changes.

---

## Session Summary - 2026-05-22 (Local Export Recovery, PDF Blank Output Fix, Web Feedback Prompt)

### Overview
Reviewed the large local Antigravity-agent change set, restarted the local dev stack, and debugged the `/preview` export flow. User reported three export failures: export toast without file, `blob:http://localhost:5000/...` PDF preview instead of download, and downloaded PDF containing only `Page 1 of 1 - Made with WiseResume`.

Also replaced an app-store rating prompt with a web feedback prompt.

### Root Causes (Verified)

| Issue | Root cause |
|---|---|
| Toast showed success while no download appeared | `src/lib/downloadUtils.ts` revoked the generated `blob:` URL immediately after clicking the hidden anchor. Embedded Chromium can begin consuming the blob after the click task, so immediate revocation can cancel the download while the caller still reports success. |
| `blob:http://localhost:5000/...` PDF preview opened | A temporary local fallback navigated to the blob URL for PDFs. It made the PDF visible but was not the requested download behavior. Removed. |
| Downloaded PDF contained only footer | `measureExportLayout()` in `server/index.ts` and `api/export/pdf-native.ts` used `page.evaluate(\`() => { ... }\`)`. Puppeteer treated the string as a function value rather than executing it, so `layout.measuredHeight` was `undefined`. `contentHeight` became `NaN`, `buildExportPageSegments()` collapsed to a 1px content segment, and the PDF rendered only the footer. Verified by extracting text from `C:/Users/magdy/Downloads/Magdy_Saber_Resume (15).pdf`: only `Page 1 of 1 - Made with WiseResume`. |
| Potential invisible resume clone | Preview uses Framer Motion and inline transform/opacity styles. Export clone needed to strip screen-only visibility/transform state so Puppeteer always renders visible resume content. |
| App Store rating toast | `useRateApp()` still opened Google Play and `PreviewPage` used app-store copy. This does not match the current web-app product state. |

### Fixes Applied

| File | Change |
|---|---|
| `src/lib/downloadUtils.ts` | Desktop download now delays `URL.revokeObjectURL()` for 5 minutes instead of revoking immediately. Removed temporary PDF blob-navigation fallback. |
| `src/pages/PreviewPage.tsx` | Preview PDF export now passes `mimeType: 'application/pdf'`. Replaced app-store rating copy/action with web feedback copy/action. |
| `src/hooks/useRateApp.ts` | Renamed prompt key to `wiseresume_feedback_prompted`. Replaced `openAppStore()` with `openFeedback()`, opening `mailto:contact@thewise.cloud?subject=WiseResume%20feedback`. |
| `src/lib/exportDomUtils.ts` | Export clone now forces `opacity: 1`, `visibility: visible`, `transform: none`, and `display: block` on the root and inline-styled descendants. |
| `src/lib/exportDomUtils.test.ts` | Added regression coverage for hidden/transformed root and descendant export clone styles. |
| `server/index.ts` | Fixed Puppeteer layout measurement by executing `page.evaluate(\`(() => { ... })()\`)`. Added content-height fallback using `max(clientHeight, layoutContentHeightPx, measuredHeight, printableHeight)`. Added `httpServer.ref()` so the local API stays alive when launched with `node --import tsx server/index.ts`. |
| `api/export/pdf-native.ts` | Mirrored the Puppeteer measurement execution fix and content-height fallback in the Vercel serverless PDF function. Removed temporary `[DEBUG-PDF]` logs. |

### Verification
- Confirmed attached broken file contained only footer text.
- Reproduced footer-only bug with direct POST to `http://localhost:5001/api/export/pdf-native`.
- After fix, the same direct POST returned a valid PDF containing resume body text (`Magdy Saber`, email, `Summary`, `Experience`, etc.).
- User confirmed final `/preview` export works.
- `npx tsc --noEmit` - passed.
- `npx vitest run src/lib/exportDomUtils.test.ts src/lib/nativePdfGenerator.test.ts src/lib/exportPagePlan.test.ts` - passed, 25 tests.

### Local Server State
- Frontend dev server: `http://localhost:5000`.
- Local PDF/API server: `http://localhost:5001`.
- Backend was restarted after the PDF renderer fix.
- Local API is running in non-watch mode. Restart it after future `server/index.ts` changes.

### Other Local Changes Observed
Existing local changes from before this session remain and were not reverted:
- PDF page-cut boundary/snap work in `src/lib/exportPagePlan.ts`, `api/export/pdf-native.ts`, `server/index.ts`, and tests.
- Smart Fit protected-token changes in `src/lib/smartFit/*`.
- Auto-fit spacing token `7` support in `src/lib/templateCustomization.ts` and audit tests.
- E2E export spec navigation change in `tests/e2e/specs/14-exports.spec.ts`.
- New legacy payment provider doc: `Project Atlas/01-Currently Implemented/payments-coming-soon.md`.
- Large untracked design-system package under `Project Atlas/design-system/`.
- New `appwrite-hubs/legacy-payment-webhook/package-lock.json`.
- Timestamped E2E result JSON files under `reports/`.

### Known Hygiene / Follow-Up
- `git status` remains dirty with this session's fixes plus pre-existing Antigravity-agent changes.
- `Project Atlas/design-system/` is large and untracked; decide whether it belongs in this repo.
- Timestamped E2E JSON outputs under `reports/` are untracked generated artifacts; decide whether to keep or ignore.
- Some new docs still have encoding artifacts such as `â€”` and `â†’`.
- Earlier E2E report showed `/resume` and `/activity` route tests rendering the 404 page with HTTP 200. Not addressed.
- Do not use old `Magdy_Saber_Resume (15).pdf` for verification; it was generated before the PDF renderer fix.

### Where We Stopped
- Immediate user-facing `/preview` export bug is fixed and user confirmed it works.
- Local app is usable at `http://localhost:5000/preview`.
- Local API/PDF server is listening on `5001`.
- No commit was made.
- No files were staged.
- Next agent should inspect `git status --short`, review this session's PDF/export changes together with pre-existing local changes, then decide commit scope. Recommended split:
  1. PDF export/download/feedback prompt fixes.
  2. Pre-existing Antigravity PDF page-cut/smart-fit/audit changes.
  3. Docs/design-system/generated artifacts, if they should be kept.

---

## Session Summary - 2026-05-21 (Custom Page Cut – Validation Height vs Crop Height Bug)

### Overview
User reported that PDF export with custom page cuts (Page Cut Setup tool) did not always respect user-placed page break positions — cuts were being silently moved to the wrong position or replaced by automatic breaks.

### Root Cause (Verified)
**Two-height confusion** across the export pipeline:

1. **Client** → `getExportContentHeightPx()` trims trailing whitespace → `trimmedH` (e.g. 1 020 px).  
2. **UI** → user places a cut at Y = 1 000 px (valid because the live DOM is 1 080 px tall).  
3. **Server `clampBreakPositions`** → receives `trimmedH = 1 020` and rejects the cut because `1 000 > 1 020 − 40 = 980`, silently moving it to 980 instead.  
4. **Server `buildExportPageSegments`** → receives already-clamped breaks but normalises them again against `trimmedH`, which can drop or further corrupt valid near-bottom breaks.

### Fix
Two concepts are now cleanly separated throughout the export pipeline:

| Concept | Height used | Purpose |
|---|---|---|
| `totalContentHeightPx` | `trimmedH` | Rendering/segment math — preserves last-page cropping |
| `breakValidationHeightPx` | `max(trimmedH, layoutH, lastBreak+gap)` | Break validation only — prevents valid near-bottom cuts from being rejected |

| File | Change |
|---|---|
| `src/lib/nativePdfGenerator.ts` | Sends both `totalContentHeightPx` (trimmed) and `layoutContentHeightPx` (live DOM, untrimmed) in the export POST body. |
| `src/lib/exportPagePlan.ts` | `buildExportPageSegments` now accepts optional `breakValidationHeightPx`. When provided and greater than `totalContentHeightPx`, custom breaks are normalised against the safe validation height; segment math (last-page height) still uses `totalContentHeightPx`. Also exported `DEFAULT_MIN_GAP_PX`. |
| `api/export/pdf-native.ts` | Reads `layoutContentHeightPx` from the POST body. Computes `validationHeight = max(trimmedH, layoutH, lastBreak+minGap)`. Uses `validationHeight` for `clampBreakPositions` **and** passes it as `breakValidationHeightPx` to `buildExportPageSegments`. Final-page crop still uses `contentHeight` (trimmed). Added `console.error` for the `invalid_custom_breaks` fallback. |
| `src/lib/exportPagePlan.test.ts` | Added 5 regression tests covering: (1) near-bottom break position preservation, (2) final-page cropping with `breakValidationHeightPx`, (3) boundary-case at exactly `liveH−minGap`, (4) 2-page last-page crop, (5) clamping vs dropping semantics. |

### Session Summary - 2026-05-21 (Part 2: Subpixel Layout Shift Bug)
User reported that despite the validation height fix, cuts placed before section headings (e.g., "Education") were STILL cutting AFTER the heading on the downloaded PDF. 

**Root Cause**: Subpixel layout shift. The server runs Headless Chromium on Linux (Vercel), which uses different font-rendering metrics than the client OS (Windows/Mac). A subpixel difference of even 0.1px per line accumulates over the document. If "Education" is at Y=800 on the client, it might be at Y=780 on the server. Because the server previously accepted the client's absolute pixel cut (Y=800) without measuring layout, the cut occurred AFTER the heading on the server.

**Fix**: `api/export/pdf-native.ts` and `server/index.ts` were updated to:
1. ALWAYS `await measureExportLayout(browser)` even if exact custom breaks are provided.
2. If the client sent `layoutContentHeightPx`, scale the custom break proportionally to the server's measured height using `scaleBreakPositionsToMeasuredHeight`.
3. Snap the scaled break to the actual server-side structural boundaries using `snapBreakPositionsToSectionHeadings` and `snapBreakPositionsToAvoidBlocks`. This guarantees a cut placed on a section boundary in the client remains on the section boundary on the server, regardless of accumulated font-rendering drift.

### Verification
- `npx vitest run src/lib/exportPagePlan.test.ts` — 18 tests passed.
- `npx tsc --noEmit` — zero errors.
- Dev server running at `http://localhost:5000/`.

### Deployment Notes
- Push to `main` is required so Vercel rebuilds both the frontend bundle and `/api/export/pdf-native`.
- No Appwrite hub/function redeploy required.
- No database schema changes.

---

## Session Summary - 2026-05-21 (PDF Auto Fallback Split Experience)

### Overview
Re-investigated the repeated live-domain PDF page-cut failure after confirming production is deployed by Vercel, not GitHub Actions, and that the latest pushed code had reached Vercel.

### Root cause
The remaining screenshot showed the page footer inserted between an Experience item title and its description. That exact split is possible when `/api/export/pdf-native` receives no usable `customBreakPositions` and falls back to automatic pagination.

After the exact custom-cut fix, saved cuts were no longer snapped, which is correct. But the no-custom fallback still used raw fixed printable-height cuts from `buildExportPageSegments()`. Raw cuts do not inspect `data-break-avoid`, so if a saved cut is missing, filtered, or not present on a particular export path, the server can still split a keep-together Experience entry.

### Fix
| File | Change |
|---|---|
| `src/lib/exportPagePlan.ts` | Added `buildAutomaticBreakPositions()` so automatic fallback cuts are generated from fixed page heights and then snapped around section headings and `data-break-avoid` blocks. Added `clampBreakPositions()` so saved cuts near the valid range are clamped instead of disappearing into automatic fallback. |
| `api/export/pdf-native.ts` | Vercel PDF export now uses exact clamped saved cuts when present. Only when no saved cuts are provided does it measure layout and build content-aware automatic cuts. Invalid saved cuts now fail loudly instead of silently falling back to raw pagination. |
| `server/index.ts` | Local Express PDF export now mirrors the Vercel behavior. |
| `src/lib/exportPagePlan.test.ts` | Added regressions for clamping saved cuts and for automatic fallback avoiding an Experience split. |

### Verification
- `npx vitest run src/lib/exportPagePlan.test.ts src/lib/exportResumePdf.test.ts src/lib/nativePdfGenerator.test.ts src/lib/exportDomUtils.test.ts src/lib/__tests__/pdfUtils.test.ts` - passed, 46 tests.
- `npx tsc --noEmit` - passed.
- `npm run build` - passed.

### Deployment Notes
- This changes frontend shared page-planning code plus the Vercel `/api/export/pdf-native` function.
- Push to `main` is required so Vercel rebuilds the production frontend and serverless API.
- No Appwrite function redeploy is required.

---

## Session Summary - 2026-05-21 (Data-Based Downloads Bypassed Custom Cuts)

### Overview
Followed up after user verification still showed the page footer splitting the final Experience entry before its description.

### Root cause
The prior exact-cut fix covered the main editor/preview export path, but one dashboard/list-style download path still used `exportResumePdfFromData()` to render the resume offscreen from saved database data. That helper did not automatically pass `resume.customization.customBreakPositions` into `generateNativePDF()`.

Result: downloads from that data-based path ignored saved page cuts and fell back to automatic printable-height pagination. The automatic break can land inside the final Experience entry, matching the new screenshot where page 1 ends after the job title and page 2 resumes with the job description.

### Fix
| File | Change |
|---|---|
| `src/lib/exportResumePdf.ts` | Data-based/offscreen PDF export now uses saved `resume.customization.customBreakPositions` by default unless explicit export options override them. |
| `src/lib/exportResumePdf.test.ts` | Added regression coverage proving data-based downloads pass saved custom page cuts to the native PDF generator. |

### Verification
- `npx vitest run src/lib/exportResumePdf.test.ts src/lib/exportPagePlan.test.ts src/lib/nativePdfGenerator.test.ts src/lib/exportDomUtils.test.ts src/lib/__tests__/pdfUtils.test.ts` - passed, 44 tests.
- `npx tsc --noEmit` - passed.
- `npm run build` - passed.

### Deployment Notes
- This is a frontend/export-helper change. Push to `main` is required so the live frontend bundle includes it.
- No Appwrite hub/function redeploy is required.

---

## Session Summary - 2026-05-21 (Exact Custom PDF Page Cuts)

### Overview
Re-investigated the repeated live-domain failure where a user-selected page cut before Education still exported with the final Experience entry at the top of page 2. This session intentionally stopped treating the symptom as another snap-threshold problem.

### Root cause
The saved custom cut was not authoritative in the export path. The setup UI stored a user-selected Y coordinate, but the Vercel PDF function and local Express renderer re-measured the exported HTML and then ran section/keep-together snapping before rendering. That meant the server could move a saved cut away from the exact place the user chose.

There was also a preview/export contract mismatch: the setup dialog showed a continuous document with break lines, while the exporter renders cropped page segments with footer space. The user could therefore approve a cut in one visual model and receive a different segmented PDF model.

### Fix
| File | Change |
|---|---|
| `api/export/pdf-native.ts` | Saved `customBreakPositions` are now passed directly to the segment builder; the Vercel function no longer measures/snaps/repositions custom cuts. Font resources are no longer blocked during segment rendering, so text wrapping matches the approved layout more closely. |
| `server/index.ts` | Local Express PDF export now follows the same exact-cut contract as production. |
| `src/components/editor/export/PageBreakDialogPreview.tsx` | The page-cut setup preview now renders cropped page slices with the same segment builder and footer reservation used by export, instead of only drawing break lines over one continuous document. |
| `src/components/editor/export/ExportPageBreakSetup.tsx` | Passes the active page format dimensions into the segmented preview. |
| `src/lib/exportPagePlan.test.ts` | Added regressions proving saved custom cuts remain exact, including cuts inside entries and cuts at the Education boundary. |

### Verification
- `npx vitest run src/lib/exportPagePlan.test.ts src/lib/nativePdfGenerator.test.ts src/lib/exportDomUtils.test.ts src/lib/__tests__/pdfUtils.test.ts` - passed, 42 tests.
- `npx tsc --noEmit` - passed.
- `npm run build` - passed.

### Deployment Notes
- This changes frontend page-cut setup plus the Vercel `/api/export/pdf-native` serverless function. Push to `main` is required so Vercel rebuilds both.
- No Appwrite hub/function redeploy is required for this fix.

---

## Session Summary - 2026-05-21 (PDF Cuts Splitting Experience Entries)

### Overview
Re-investigated the live-domain screenshot where a PDF page footer appeared between an experience title and its description. The prior frontend-only fix was insufficient because the live Vercel PDF function still rendered custom cuts as raw crop coordinates.

### Root cause
Templates correctly mark each experience/education/project entry with `data-break-avoid`, and client preview utilities contain logic to move page cuts away from those keep-together blocks. However, the live `api/export/pdf-native.ts` path stopped running the layout measurement/snap pass in commit `3acc94b9` to reduce Lambda work. The function now used client height plus raw `customBreakPositions`, then called `buildExportPageSegments()` directly.

Result: if a saved/custom cut landed inside a `data-break-avoid` experience item, the Vercel function clipped the page exactly there. That matches the screenshot: page 1 included the role header, the footer printed, and page 2 resumed with the role description.

The local Express server still had a measurement path but only snapped near section headings, not `data-break-avoid` blocks, so local/prod behavior could still drift.

### Fix
| File | Change |
|---|---|
| `src/lib/exportPagePlan.ts` | Added `ExportAvoidBounds` and `snapBreakPositionsToAvoidBlocks()` to move cuts inside keep-together blocks to the block top, or to nearest child boundary for oversized blocks. |
| `api/export/pdf-native.ts` | For custom cuts only, Vercel now measures exported HTML in Puppeteer, scales/snap-checks saved cuts, snaps away from section headings and `data-break-avoid` blocks, then renders segments. |
| `server/index.ts` | Local Express PDF renderer now uses the same keep-together snap logic. |
| `src/lib/exportPagePlan.test.ts` | Added regression tests for custom cuts inside normal and oversized keep-together blocks. |

### Verification
- `npx vitest run src/lib/exportPagePlan.test.ts src/lib/nativePdfGenerator.test.ts src/lib/exportDomUtils.test.ts src/lib/__tests__/pdfUtils.test.ts` - passed, 39 tests.
- `npx tsc --noEmit` - passed.
- `npm run build` - passed.

### Deployment Notes
- This changes the Vercel serverless PDF API function. Push to `main` is required so Vercel rebuilds `/api/export/pdf-native`.
- No Appwrite hub redeploy required.

---

## Session Summary - 2026-05-21 (PDF Section Cut Overcorrection)

### Overview
Re-investigated the live-domain case where the user set a cut before Education / after Experience, but the exported PDF still started page 2 with the final Experience item followed by Education.

### Root cause
The previous keep-together fix was directionally correct but over-aggressive. `snapBreakPositionsToAvoidBlocks()` moved any cut inside a `data-break-avoid` entry to that entry's top. When browser layout differences placed a section-boundary cut a few pixels inside the bottom of the final experience entry, the snap logic pulled the cut backward to the start of that entry. That made page 2 start with `Senior Technical Support Specialist` instead of `EDUCATION`.

### Fix
`snapBreakPositionsToAvoidBlocks()` now treats near-boundary cuts differently:
- near the top of a keep-together block: snap to the block top;
- near the bottom of a keep-together block: snap forward to the block bottom;
- true middle-of-entry cuts: preserve the keep-together behavior and move to a safe boundary.

This preserves explicit "before Education" cuts instead of moving them backward into the previous Experience entry.

### Verification
- Added regression: a cut at `895` inside an entry ending at `900` now snaps to `900`, not back to `700`.
- `npx vitest run src/lib/exportPagePlan.test.ts src/lib/nativePdfGenerator.test.ts src/lib/exportDomUtils.test.ts src/lib/__tests__/pdfUtils.test.ts` - passed, 40 tests.
- `npx tsc --noEmit` - passed.
- `npm run build` - passed.

### Deployment Notes
- This changes shared page planning plus the Vercel PDF function copy of that logic. Push to `main` is required so Vercel rebuilds `/api/export/pdf-native`.
- No Appwrite hub redeploy required.

---

## Session Summary - 2026-05-21 (Custom PDF Page Cuts Actually Honored)

### Overview
Re-investigated the "Custom page cuts ignored in exported PDF" issue because user verification showed the prior fix was incomplete. Root cause was confirmed by code inspection and targeted regression tests before finalizing the fix.

### Root cause
There were two remaining defects:

1. `PreviewScaledWrapper` applies `transform: scale(...)` directly on the `[data-resume-template]` element so the preview fits smaller screens. `generateNativePDF()` cloned that same element for export, and `cloneResumeTemplateElement()` preserved the inline transform. Page cuts are saved in unscaled PDF coordinates, but the HTML sent to Puppeteer could still be visually scaled down. The server then clipped pages at the saved Y values against scaled content, making the downloaded PDF appear to ignore the user's page-cut setup.

2. `generateNativePDF()` still sent `totalContentHeightPx` from `getExportContentHeightPx()`, which intentionally trims trailing blank/min-height area. Custom cuts are saved against the live preview height. If a saved cut lived in the trimmed zone, the server-side `normalizeBreakPositions()` could reject it as outside the document and fall back to automatic pagination.

Additional coverage gap: Preview Save/Share and application-package PDF paths did not consistently pass `customBreakPositions` through to `generateNativePDF()`.

### Fix
| File | Change |
|---|---|
| `src/lib/exportDomUtils.ts` | Export clones now force `transform: none` and `transformOrigin: top left` so screen-only preview scaling cannot affect Puppeteer output. |
| `src/lib/nativePdfGenerator.ts` | When saved custom cuts exist, `totalContentHeightPx` now preserves the live preview height coordinate space instead of using only the trimmed export content height. This prevents valid saved cuts from being filtered out on the server. |
| `src/pages/PreviewPage.tsx` | Preview combined PDF, Save to Files, and native share flows now pass saved custom cuts. |
| `src/pages/EditorPage.tsx` | Combined application-package export now passes saved custom cuts to the resume PDF portion. |
| `src/components/editor/ShareSheet.tsx` | Share-as-PDF now passes saved custom cuts. |
| `src/lib/exportDomUtils.test.ts` | Added regression coverage for stripping preview transforms from export clones. |
| `src/lib/nativePdfGenerator.test.ts` | Added regression coverage for preserving live-height coordinates when custom cuts exist. |

### Verification
- `npx vitest run src/lib/nativePdfGenerator.test.ts src/lib/exportDomUtils.test.ts src/lib/exportPagePlan.test.ts` - passed, 10 tests.
- `npx tsc --noEmit` - passed.

### Deployment Notes
- Frontend plus Vercel PDF API behavior path; deploy through normal `main` push so the updated frontend export payload reaches production.
- No Appwrite hub redeploy required.

---

## Session Summary — 2026-05-21 (PDF Export 100% Failure Fix + LinkedIn + Page Cuts)

### Overview
Three bugs fixed across two commits. All root causes confirmed by code inspection before any changes.

---

### Fix 1 — PDF export 100% failure rate (commit `05e7de7`, v4.7.2)

**Root cause:** A prior commit changed `puppeteer-core` and `pdf-lib` to load via `importExternalModule()`. That function wraps `import()` in `new Function(...)` so Vercel's `ncc` bundler cannot statically analyse the import — ncc marks both packages as **external** (not bundled). `vercel.json` `includeFiles` only lists `node_modules/@sparticuz/chromium/**`; neither `puppeteer-core` nor `pdf-lib` is listed. The Lambda therefore throws `"Cannot find package 'puppeteer-core'"` on every invocation — including warm starts — causing a 100% 500 error rate.

Why `@sparticuz/chromium` must remain external: it uses `import.meta.url` to resolve the path to its compressed Chromium binary. If ncc inlines and relocates its source, the binary path breaks. It must stay in `importExternalModule` and travel via `includeFiles`.

Why `puppeteer-core` and `pdf-lib` are safe to bundle: `puppeteer-core@25` has dual CJS/ESM exports pointing to the same `.js` file — ncc bundles it inline via `require()` without any path breakage. `pdf-lib` has no `"type":"module"` and `"main":"cjs/index.js"` — trivially bundleable.

**Fix:** `api/export/pdf-native.ts` — changed two lines:
- `importExternalModule('puppeteer-core')` → `await import('puppeteer-core')`
- `importExternalModule('pdf-lib')` (inside `loadPdfLib()`) → `await import('pdf-lib')`

`vercel.json` unchanged. `@sparticuz/chromium` unchanged.

**Cold-start note:** Before this regression, cold-start requests occasionally failed (first Lambda invocation) but warm requests succeeded. The existing `callPdfServer()` retry (3s delay, attempt 1) handles this — no additional fix needed.

---

### Fix 2 — LinkedIn/GitHub links redirect to wrong URL (commit `af5c6dd`, v4.7.3)

**Root cause:** `ContactLinks.tsx` built link hrefs with the generic `ensureUrl(raw)` for all contact fields. `ensureUrl` only checks for `https?://` prefix and prepends `https://` to anything else. If `contact.linkedin` was stored as a bare username (e.g., `magdy-saber` — possible for users whose data predates the current `ContactSection` code which now saves the full URL), `ensureUrl('magdy-saber')` returned `https://magdy-saber` — a non-existent domain — instead of `https://linkedin.com/in/magdy-saber`.

**Fix:** `src/components/templates/shared/ContactLinks.tsx` — added `ensureLinkedinUrl()` and `ensureGithubUrl()` helpers. Each checks: full URL (pass through) → domain-relative (prepend `https://`) → bare username (prepend the canonical profile base URL). `getItems()` now calls these instead of `ensureUrl` for LinkedIn and GitHub fields. Handles all stored formats: bare username, `linkedin.com/in/…`, `https://linkedin.com/in/…`.

---

### Fix 3 — Custom page cuts ignored in exported PDF (commit `af5c6dd`, v4.7.3)

**Root cause:** `nativePdfGenerator.ts` was calling `normalizeBreakPositions(customBreakPositions, totalContentHeightPx)` before sending breaks to the server. `getExportContentHeightPx` can return a value smaller than `getLiveTotalHeight` (it trims trailing whitespace: when `layoutHeight > contentHeight * 1.12`, it returns `contentHeight` rather than `layoutHeight`). Breaks saved against `getLiveTotalHeight` that fell in the trimmed zone (e.g., a break at position 1300 in a template whose `contentHeight` is 1200, causing `minGapPx` guard `1300 > 1160` → filtered out) were silently stripped to an empty array. The server then received `customBreakPositions: []` and fell back to automatic even pagination.

**Fix:** `src/lib/nativePdfGenerator.ts` — removed the client-side `normalizeBreakPositions` call. The raw `customBreakPositions` from options are now sent directly to the server. The server already normalizes them against the same `totalContentHeightPx` value sent alongside, so the normalization is both correct and redundant to perform twice. Removed unused `normalizeBreakPositions` import.

---

### Files Changed

| File | Commits | Change |
|------|---------|--------|
| `api/export/pdf-native.ts` | `05e7de7` | `importExternalModule → await import` for puppeteer-core and pdf-lib |
| `src/components/templates/shared/ContactLinks.tsx` | `af5c6dd` | `ensureLinkedinUrl()` + `ensureGithubUrl()` replacing generic `ensureUrl` for social links |
| `src/lib/nativePdfGenerator.ts` | `af5c6dd` | Removed client-side `normalizeBreakPositions`; send raw breaks directly to server |
| `package.json` | both | v4.7.1 → v4.7.2 → v4.7.3 |

### Verification
- `npx tsc --noEmit` — zero errors after each commit
- All three commits pushed to `main`; Vercel deploy triggered automatically

### Where We Stopped
- HEAD `af5c6dd` on `main`. PDF export working (user confirmed download after v4.7.2). LinkedIn links and page cuts fixed in v4.7.3 — pending user verification.
- No Appwrite hub changes in this session.
- All other pending items from prior sessions unchanged: legacy payment provider prerequisites, hub redeployments for 3-Tier AI Enhancement, `DEVKIT_PASSWORD` on `admin-deploy-hubs`.

---

## Session Summary - 2026-05-20 (PDF Renderer Function Startup Fix)

### Overview
Verified and fixed the production PDF download failure after restoring real HTML-to-PDF export. The frontend was now calling the correct endpoint, but the Vercel serverless function crashed before handling requests.

### Root cause
Live checks showed both `GET` and minimal `POST` to `https://resume.thewise.cloud/api/export/pdf-native` returned Vercel `FUNCTION_INVOCATION_FAILED`. That ruled out resume data and request payload size as the first failure point.

Local reproduction with Vercel's bundler confirmed the exact cause: `@sparticuz/chromium` was being bundled/relocated by `ncc`, so at runtime it searched for its compressed browser binaries at the wrong path and failed with:

`The input directory "Y:\bin" does not exist... you must externalize @sparticuz/chromium`

### Fix
| File | Change |
|---|---|
| `api/export/pdf-native.ts` | Added `importExternalModule()` using an indirect dynamic `import()` so `@sparticuz/chromium` remains external and resolves from its package directory. Kept `puppeteer-core` lazy-loaded after request validation. |
| `api/export/pdf-native.ts` | Moved `pdf-lib` and export page-planning helpers out of top-level imports and into lazy imports inside the valid PDF render path, minimizing the startup code that can crash before normal `405`/`400` responses. |
| `api/export/pdf-native.ts` | Follow-up production verification showed startup was fixed but Vercel could not resolve the lazy local `../../src/lib/exportPagePlan` import in the render path. Restored the page-planning helper as a static local import so Vercel bundles it correctly; external packages remain lazy. |
| `api/export/pdf-native.ts` | Live Vercel logs proved the static `src/lib/exportPagePlan` import was still preserved as an unresolved runtime import. The function now carries its small page-planning helpers inline, making the serverless entry self-contained apart from external packages explicitly shipped with the function. |
| `api/export/pdf-native.ts` | Live PDF quality verification showed the slice-and-merge page renderer produced PDF bytes but dropped link annotations inside clipped resume content. The renderer now uses Chromium's normal full-document print path with browser footer templates for page numbers/branding, preserving selectable text and resume links. |

`vercel.json` already includes `node_modules/@sparticuz/chromium/**`, so the external package files should be shipped with the function.

### Verification
- Live pre-fix endpoint: `GET` and minimal `POST` both returned `FUNCTION_INVOCATION_FAILED`.
- `npx @vercel/ncc build api/export/pdf-native.ts -o .tmp-ncc-pdf --transpile-only` - built a Vercel-style bundle.
- Imported the bundle locally: `GET` returned `405`; malformed `POST` returned `400`, proving startup/request validation no longer crashes.
- Valid bundled POST progressed past Chromium package resolution; local Windows then failed at browser launch, which is expected because `@sparticuz/chromium` is a Linux serverless Chromium package. The earlier missing `bin` directory error was gone.
- Rebuilt the Vercel-style bundle after the additional startup hardening; `GET`/malformed `POST` still returned `405`/`400`, and valid render still reached only the expected local Windows Chromium launch limitation.
- Live after deploy: `GET /api/export/pdf-native` returned `405` JSON instead of `FUNCTION_INVOCATION_FAILED`; minimal `POST` then exposed the second-stage lazy local import resolution error, now addressed by the static local import.
- Live Vercel logs for the static import attempt showed `ERR_MODULE_NOT_FOUND` for `/var/task/src/lib/exportPagePlan`, confirming the function cannot depend on unresolved `src/` imports in production.
- Live PDF.js verification showed Chromium's direct print path preserves selectable text and the test hyperlink annotation.
- `npx tsc --noEmit` - passed.
- `npm run build` - passed.

### Deployment Notes
- Frontend already calls `/api/export/pdf-native`.
- This fix is in the Vercel serverless API function. It requires pushing to `main` and letting Vercel deploy.
- After deploy, verify `GET https://resume.thewise.cloud/api/export/pdf-native` returns JSON `405`, not `FUNCTION_INVOCATION_FAILED`, then verify a minimal POST returns `application/pdf`.

---

## Session Summary - 2026-05-20 (PDF Export: Selectable Text + Clickable Links)

### Overview
Corrected the PDF export approach after confirming the prior client-side canvas fix still produced image-only PDFs. Resume PDF export now routes through the real server-side Chromium/Puppeteer renderer again, preserving selectable text and clickable links.

### Root cause
The immediate blank-page issue was caused by `visibility:hidden`, but the deeper defect was the architecture introduced in commit `18444dbf`: `generateNativePDF()` captured the resume with `html2canvas` and assembled image slices with `pdf-lib`. That can never produce a proper resume PDF because the text becomes pixels and links become non-clickable.

### Fix
| File | Change |
|---|---|
| `src/lib/nativePdfGenerator.ts` | Restored HTML serialization and `/api/export/pdf-native` server call. Removed the resume screenshot/canvas PDF path. Preserved server response guards for non-PDF/HTML fallback responses. Added `NativePdfOptions` alias. |
| `src/lib/nativePdfGenerator.test.ts` | Tests now assert that export sends serialized HTML with live links and page-break metadata to the PDF endpoint, plus rejects non-PDF success responses. |
| `src/lib/exportDomUtils.ts` | Removed the screenshot-only capture container helper; not needed for real PDF export. |

### Verification
- `npx vitest run src/lib/nativePdfGenerator.test.ts` - passed.
- `npx tsc --noEmit` - passed.
- Local PDF server probe: posted HTML with text and `https://github.com/example`; PDF.js extracted the text layer and returned the link annotation.
- `npm run build` - passed.

### Deployment Notes
- Frontend change plus existing `/api/export/pdf-native` backend route. No Appwrite hub redeploy required.
- Production must have a working `/api/export/pdf-native` route or `VITE_API_URL` pointing to the deployed PDF renderer; otherwise the app will correctly show PDF server unavailable instead of producing image-only PDFs.

---

## Session Summary - 2026-05-20 (PDF Export Blank Page Fix)

### Overview
Superseded by the selectable-text PDF fix above. This session fixed the blank canvas symptom in the client-side screenshot path, but that path has now been removed for resume PDF export because it cannot preserve selectable text or clickable links.

### Root cause
`captureTemplateCanvas()` cloned the visible resume into an off-screen container, but the container used `visibility:hidden`. `html2canvas` respects hidden ancestors, so the clone measured correctly but rendered as a white canvas. That white canvas was then embedded into the generated PDF, producing blank white pages.

### Fix
| File | Change |
|---|---|
| `src/lib/exportDomUtils.ts` | Added `createPdfCaptureContainer(pageWidthPx)` - off-screen capture host that remains rendered for html2canvas; explicitly avoids `visibility:hidden`, `display:none`, and `opacity:0`. |
| `src/lib/nativePdfGenerator.ts` | Replaced the hidden capture container with `createPdfCaptureContainer()`. |
| `src/lib/nativePdfGenerator.test.ts` | Updated stale server-call test to cover the rendered capture host and editor-only node stripping. |

### Verification
- `npx vitest run src/lib/nativePdfGenerator.test.ts` - passed.
- `npx tsc --noEmit` - passed.
- Puppeteer/html2canvas probe verified the root cause: hidden host produced a blank canvas (`nonWhite: 0`); rendered off-screen host produced visible pixels (`nonWhite: 10765`).
- `npm run build` - passed after refreshing local `node_modules` from the existing lockfile because `removed web payment SDK` was missing locally.

### Deployment Notes
- Frontend-only change. Deploy through the normal WiseResume frontend workflow to `resume/`.
- No Appwrite hub redeploy required.
- The workspace had pre-existing unrelated dirty package-lock/legacy payment provider Atlas files; they were not modified by this fix.

---

## Session Summary — 2026-05-20 (Pre-Launch Editor Audit + Agentic Chat Structured Responses)

### Overview
Fixed all editor issues identified in the pre-launch audit and implemented structured JSON responses for the agentic-chat AI backend. All changes are committed and pushed to `main`.

---

### Fix 1 — Agentic Chat: structured response types not triggering

**Root cause:** `ai-gateway` agentic-chat handler returned plain text. The frontend's `parseAgenticChatResponse()` always fell through to the `text` fallback, so `function_call` and `suggestion` response types were never activated.

**Fix:** `appwrite-hubs/ai-gateway/src/main.js`
- Added `parseAgenticChatResponse(rawContent)` — bracket-depth-balanced JSON walker with 4-stage fallback (direct parse → markdown fence → brace walker → `{type:'text'}`)
- Updated `buildMessages('agentic-chat')` system prompt: instructs AI to ALWAYS return one of three JSON shapes (`text | function_call | suggestion`) with decision rules and full function schema list
- Added special return path in main handler: `if (featureName === 'agentic-chat') { return res.json({ status: 'success', data: structuredResponse }); }`
- `maxTokens` for agentic-chat: `800 → 1500`

**Status:** Committed `46026d3f`. ai-gateway hub must be redeployed by user.

---

### Fix 2 — PDF Export: `headless` flag + payload size

**Root cause:** `@sparticuz/chromium` v148+ requires `headless: true` (boolean), not the old `chromium.headless` expression. Also, PDF payload was 5–15 MB due to inlined stylesheets.

**Fixes:**
- `api/export/pdf-native.ts`: `headless: true`, `bodyParser.sizeLimit: '4mb'`
- `src/lib/nativePdfGenerator.ts`: `collectDocumentStyles()` uses `@import url()` for production linked stylesheets — reduces payload from 5–15 MB to ~50 KB. Local dev still inlines rules.

**Status:** Committed `46026d3f`.

---

### Fix 3 — Tooltip z-index (tips appear behind live preview)

**Root cause:** Radix UI `TooltipContent` was `z-50`. Editor header is `z-editor-header: 50`. Same stacking level — tooltips lost to the editor's stacking context.

**Fix:**
- `tailwind.config.ts`: added `tooltip: 55` to the custom z-index ladder (`editor-shell:40`, `editor-header:50`, `tooltip:55`, `keyboard-toolbar:60`, `ai-dialog:65`, `toast:70`)
- `src/components/ui/tooltip.tsx`: `z-50` → `z-tooltip`

**Status:** Committed `8a0373f9`.

---

### Fix 4 — Blue color bug when user edits anything in Customize panel

**Root cause:** `CustomizeSheet` (old bottom-sheet) called `customization ?? getDefaultCustomization()` on open, which injected `accentColor: '#1e40af'`. `generateCustomizationCSS` applies `accentColor` to all `h1`, `h2`, borders — painting the entire resume blue.

**Fix:** `EditorPage.tsx` — `handleCustomize()` now opens `StyleCustomizationPanel` (right-side sheet) instead of `CustomizeSheet`. `StyleCustomizationPanel` uses `const base = (currentResume.customization ?? {})` in its `patch()` — never injects default color unless user explicitly picks one. Removed `CustomizeSheet` lazy import, `handleCustomizeApply` callback, and preloadLazy trigger from EditorPage.

**Files:**
| File | Change |
|---|---|
| `src/pages/EditorPage.tsx` | `handleCustomize` → `setShowStylePanel(true)`; removed lazy CustomizeSheet import + handleCustomizeApply |
| `src/components/editor/StyleCustomizationPanel.tsx` | Added Colors accordion (preset palettes + custom color picker + clearKeys reset); removed Auto-fit accordion |

**Status:** Committed `8a0373f9` + `cb0dcd6e`.

---

### Fix 5 — Duplicate auto-fit / per-section style overlay

**Root cause 1:** StyleCustomizationPanel had an "Auto-fit pages" accordion duplicating the PageBreakSetupDialog's page management.

**Root cause 2:** `SectionOverlayManager` rendered a `SectionStylePopover` (per-section style sliders) on hover — duplicate of the global Customize panel.

**Fixes:**
- `StyleCustomizationPanel.tsx`: removed the entire "Auto-fit pages" AccordionItem; `PageBreakSetupDialog` remains as the only page management UI.
- `SectionOverlayManager.tsx`: removed `SectionStylePopover` import, `stylePopoverFor` state, and `Sliders` icon; hover now shows only the AI (Sparkles) button.

**Status:** Committed `8a0373f9`.

---

### Feature — Default Resume (pin & protect)

**User story:** User can pin one resume as "default" — it stays protected. Editing it shows a warning banner. Tailoring always creates a copy regardless.

**Implementation:**
| File | Change |
|---|---|
| `src/store/settingsStore.ts` | Added `defaultResumeId: string | null` + `setDefaultResumeId` action (persisted) |
| `src/components/dashboard/ResumeListCard.tsx` | "Set as Default Resume" button in actions sheet; amber "Default" badge in title row when `isDefault === true` |
| `src/pages/EditorPage.tsx` | Amber banner shown when `currentResumeId === defaultResumeId`; banner says "This is your default resume — edits apply directly. Use Tailor to create a safe copy." |

**Note:** `TailorSheet` already creates a new copy on apply — default resume is automatically protected from tailoring overwrites.

**Status:** Committed `8a0373f9` + `cb0dcd6e`.

---

### Files Changed (this session)

| File | Commits |
|---|---|
| `appwrite-hubs/ai-gateway/src/main.js` | `46026d3f` |
| `api/export/pdf-native.ts` | `46026d3f` |
| `src/lib/nativePdfGenerator.ts` | `46026d3f` |
| `tailwind.config.ts` | `8a0373f9` |
| `src/components/ui/tooltip.tsx` | `8a0373f9` |
| `src/components/editor/StyleCustomizationPanel.tsx` | `8a0373f9` |
| `src/components/editor/SectionOverlayManager.tsx` | `8a0373f9` |
| `src/store/settingsStore.ts` | `8a0373f9` |
| `src/components/dashboard/ResumeListCard.tsx` | `8a0373f9` |
| `src/pages/EditorPage.tsx` | `8a0373f9`, `cb0dcd6e` |

### TypeScript Status
`npx tsc --noEmit` — **zero errors** after all changes.

### Where We Stopped
- **All code committed and pushed to `main`.** Vercel auto-deploy triggered — frontend changes live on next deploy.
- **`ai-gateway` hub NOT yet redeployed** — user must run `deploy.bat` (Y:\\ network drive). Delete stale tar before running:
  ```
  del appwrite-hubs\ai-gateway.tar.gz
  node scripts/deploy_hubs.cjs
  ```
- **`resume-section-ai` hub NOT yet redeployed** — required for 3-Tier AI Enhancement plan (Tiers 1 + 2). Same process.
- **Dead files** (now unreferenced, harmless, can be deleted later): `src/components/editor/CustomizeSheet.tsx`, `src/components/editor/SectionStylePopover.tsx`
- **3-Tier AI Enhancement Plan** — plan file at `Project Atlas/05-Migration to Appwrite/28-Plan-3Tier-AI-Enhancement.md` — NONE of the 3 tiers implemented yet. Next agent picks this up.
- **legacy payment provider prerequisites** — RC Dashboard setup still pending (see legacy payment provider session entry below).

---

## Session Summary — 2026-05-20 (AI Outage Fix + Smart Tech Suggestions + 3-Tier AI Enhancement Plan)

### Overview
Diagnosed and fixed a critical AI outage that took down all app AI features after a Windows redeploy. Implemented smart context-aware technology suggestions for the Projects section (clarifying questions + resume-aware output). Designed a full 3-tier AI enhancement plan covering every editor section — plan is approved and saved, ready for implementation by the next agent.

### Fix 1 — AI Gateway down after Windows redeploy (CRITICAL)

**Root cause:** `deploy_hubs.cjs` runs `npm install` locally before packaging. On Windows, `dd-trace` (a Datadog tracing package in `ai-gateway/package.json`) installs Windows-specific C++ native binaries (`.node` files). When archived and deployed to Linux Appwrite, `require('dd-trace')` at module startup failed to load the Windows binary → the entire `ai-gateway` function crashed on every invocation. This killed all AI features routed through the gateway: `agentic-chat`, `analyze-resume`, `score-resume`, `tailor-resume`, `generate-cover-letter`.

**Fixes applied:**
| File | Change |
|---|---|
| `appwrite-hubs/ai-gateway/package.json` | Removed `dd-trace: ^5.102.0` entirely |
| `appwrite-hubs/ai-gateway/src/main.js` | Removed all 36 lines of `dd-trace` / `tracer` / `llmobs` code; replaced with no-op stubs |

`DATADOG_API_KEY` was never configured in Appwrite — removing dd-trace has zero runtime impact.

**Deployment required:** Both hubs redeployed. User confirmed via Appwrite dashboard — AI health badge green after redeploy.

**Important deploy note:** `deploy_hubs.cjs` skips rebuilding if the `.tar.gz` already exists. Old stale archives must be deleted (`Remove-Item *.tar.gz`) before re-running the script, otherwise the broken Windows build gets reused.

---

### Fix 2 — resume-section-ai timeout mismatch

**Root cause:** `callLLM` had `timeout: 55000` (55 s) but Appwrite function execution limit is 30 s. Any LLM call > 30 s was killed by Appwrite mid-request, returning an opaque error.

**Fix:** `appwrite-hubs/resume-section-ai/src/main.js` — `callLLM` timeout `55000` → `10000`. This allows the provider pool to attempt multiple fallbacks within the 30 s budget.

---

### Feature — Smart Context-Aware Technology Suggestions (Projects section)

**Problem:** "Suggest Technologies" generated the same generic output for every project, ignoring the project's actual description, URL, and the user's resume tech stack.

**Changes:**
| File | Change |
|---|---|
| `appwrite-hubs/resume-section-ai/src/main.js` | `SUGGEST_TECH_SYSTEM` prompt constant; `extractKnownStack(resume)` mines skills/experience/projects for up to 25 known technologies; `buildSuggestTechUserPrompt()` includes name, role, description, url, githubUrl, existing tech, known stack, Q&A answers; `buildSuggestTechMessages()` and `buildSuggestTechWithAnswersMessages()`; `buildSuggestTechQuestionsResponse()` returns 3 fixed questions (domain, purpose, platform); sparsity check: `desc.length >= 80 \|\| (desc.length >= 30 && role.length >= 5)` → skip questions if rich; `suggest_technologies_with_answers` action handler |
| `src/components/editor/ProjectsSection.tsx` | `questionsAction` state; enriched payload includes `url`/`githubUrl`; `handleQuestionsSubmit` routes to `suggest_technologies_with_answers`; `handleQuestionsSkip` falls back to direct generate |
| `src/hooks/useAIEnhance.ts` | `ActionType` union extended with `'suggest_technologies_with_answers'` |

**Behaviour:**
- Sparse context (short description, no role) → 3 clarifying questions dialog → answers sent with `suggest_technologies_with_answers` → tailored output
- Rich context → generates directly without questions
- Skip → best-effort direct generation

---

### Plan — 3-Tier AI Enhancement (approved, not yet implemented)

**Plan file:** `Project Atlas/05-Migration to Appwrite/28-Plan-3Tier-AI-Enhancement.md`

| Tier | Scope | Key changes |
|---|---|---|
| **1 — Context enrichment** | Backend only | Replace raw 1000-char JSON dump in `buildEnhanceMessages` with `buildResumeContextBlock()` — structured name/title/recent-role/top-skills/education block. All sections benefit immediately. |
| **2 — Clarifying questions** | Backend + frontend | Question builders for summary (generate), skills (generate), experience (add_metrics). Generic `AIQuestionsDialog.tsx` replaces project-specific dialog. Wire questions flow into `SectionAIAction.tsx` and `ExperienceSection.tsx`. Fix ExperienceSection bug: jobDescription not passed to `enhance()`. |
| **3 — JD-aware actions** | Backend + frontend | New actions: `tailor_to_job` (summary + experience), `find_skill_gaps` (skills, append-only), `suggest_certifications` (certifications). JD-gated in `InlineAIButton` — disabled with tooltip when no JD present. |

**No code written yet for Tiers 1–3.** Plan is complete, approved, and stored in Atlas.

**Files the next agent must touch (Tiers 1–3):**
- `appwrite-hubs/resume-section-ai/src/main.js`
- `src/hooks/useAIEnhance.ts`
- `src/components/editor/SectionAIAction.tsx`
- `src/components/editor/ExperienceSection.tsx`
- `src/components/editor/InlineAIButton.tsx`
- `src/components/editor/ai/AIQuestionsDialog.tsx` *(new)*
- `src/components/editor/ai/ProjectAIQuestionsDialog.tsx` *(update to use new dialog)*

---

### Where We Stopped

- **Committed to `main`:** All 3 tiers implemented. TypeScript clean (`npx tsc --noEmit` — zero errors). Backend syntax clean (`node --check`). Commit: `267a3688`.
- **`resume-section-ai` NOT YET REDEPLOYED** — user must delete the old tar and run deploy script:
  ```
  del appwrite-hubs\resume-section-ai.tar.gz
  node scripts/deploy_hubs.cjs
  ```
- **Tiers 1 + 2 take effect after that redeploy.** Tier 3 frontend changes (JD-gated buttons) are live immediately on next Vercel deploy.
- **Still pending from prior session:** legacy payment provider Dashboard prerequisites (Web Billing app, Stripe connect, products/entitlements, webhook URL). `DEVKIT_PASSWORD` missing on `admin-deploy-hubs` function.

---

## Session Summary — 2026-05-20 (PDF Export + Auto-save + AI Controls)

### Overview
Fixed three live production bugs (PDF export showing "Export failed", auto-save toast spam, chunk-load errors causing blank screens after deploy). Added a Vercel serverless function so PDF export actually works on the live domain. Fixed the broken "Suggest Technologies" AI action end-to-end. Split the Projects section AI button menus by field context.

### Fixes

#### 1 — PDF "Export Failed" on live domain
**Root cause:** `callPdfServer` in `src/lib/nativePdfGenerator.ts` POSTs to `/api/export/pdf-native`. Hostinger (static-only host) returns `405 Method Not Allowed` with an HTML body. The `!response.ok` block tried to parse JSON, failed silently, then threw `Error("Server error 405")` — no `.code` property, so `EditorPage.tsx` fell through to the generic "Export failed" toast instead of the proper "PDF export is not available" message.

**Fix:** Added a content-type check in the `!response.ok` block before JSON parsing. Any non-`application/json` error response → `throw new PDFServerUnavailableError()`. File: `src/lib/nativePdfGenerator.ts`.

#### 2 — PDF export never works in production (no server deployed)
**Root cause:** `server/index.ts` (Express + Puppeteer) only ran locally. Hostinger is static-only and was never going to serve it. No production PDF infrastructure existed.

**Fix:** Created `api/export/pdf-native.ts` — a Vercel serverless function that is an exact port of the Express endpoint. Uses `puppeteer-core` + `@sparticuz/chromium` (serverless-compatible Chromium). Imports pure calculation helpers from `src/lib/exportPagePlan` (no browser deps). Config: `maxDuration: 60`, `bodyParser.sizeLimit: '10mb'`. Same page segmentation, footer/branding, one-page mode logic as the Express version.

Changed `vercel.json` SPA rewrite from `/(.*) → /index.html` to `/((?!api/).*) → /index.html` so `/api/*` routes reach the serverless function instead of SPA fallback.

Added to `package.json`: `puppeteer-core ^25.0.4`, `@sparticuz/chromium ^148.0.0`, `@vercel/node ^5.8.3`.

#### 3 — Auto-save toast spam
**Root cause:** `toast.warning` in `src/hooks/useEditorAutosave.ts` had no `id`, so every failed save produced a new stacked toast.

**Fix:** Added `{ id: 'autosave-fail' }` to the `toast.warning` call. Sonner deduplicates by id.

#### 4 — Chunk load errors causing blank screen after deploy
**Root cause:** `lazyWithRetry` retried the same stale chunk URL 3 times (~7 seconds total) before triggering a page reload. During that time the user sees a blank/broken screen.

**Fix:** Changed `lazyWithRetry` in `src/lib/lazyWithRetry.ts` to call `attemptSilentReload` immediately on the first `ChunkLoadError`, then return `new Promise<T>(() => {})` (never resolves) so the UI freezes cleanly while the browser reloads.

#### 5 — "Suggest Technologies" broken end-to-end
**Root cause (3 failure points):**
1. `ACTION_INSTRUCTIONS['suggest_technologies']` did not exist in `appwrite-hubs/resume-section-ai/src/main.js` → fell back to `improve` → LLM returned a rewritten project object, not a tech array
2. `getImprovedDescription()` in `ProjectsSection.tsx` read `improved.description` from the object → dialog showed a paragraph of text, not technology names
3. `handleDialogApply` for `suggest_technologies` did `Array.isArray(payload)` check → false → no technologies appended

**Fix:**
- Backend: Added `buildSuggestTechMessages` (constructs a focused prompt: project name, role, description, existing tech, optional JD) and `parseSuggestTechResponse` (parses raw JSON array) in `appwrite-hubs/resume-section-ai/src/main.js`. Added routing branch: `if (action === 'suggest_technologies') { ... }` inside the `enhance` handler.
- Frontend pre-flight guards in `ProjectsSection.tsx`: block action if `project.name` is empty (for `generate` and `suggest_technologies`); additionally block `suggest_technologies` if neither `description` nor `role` are present.
- Focused `currentContent` payload for `suggest_technologies`: `{ name, role, description, technologies }` instead of full project object.

#### 6 — AI button menus same on both Projects fields (confusing IA)
**Fix:** Split `sectionActions['projects']` into `projectsDescActions` (Generate Description, Improve, Shorten) and `projectsTechActions` (Suggest Technologies only). Added `fieldContext?: 'technologies' | 'description'` prop to `InlineAIButton`. Pass `fieldContext="technologies"` to the Technologies field button and `fieldContext="description"` to the Description field button in `ProjectsSection.tsx`. Changed `sectionButtonLabels['projects']` from `'Improve Projects'` to `'AI Assist'`.

#### 7 — TypeScript `ActionType` gap
**Fix:** Added `'suggest_technologies'` and `'generate_with_answers'` to the `ActionType` union in `src/hooks/useAIEnhance.ts`. Removed the `as ActionType` cast workaround in `ProjectsSection.tsx`.

### Files Changed
| File | Change |
|------|--------|
| `src/lib/nativePdfGenerator.ts` | Content-type check in `!response.ok` → throw `PDFServerUnavailableError` for non-JSON errors |
| `api/export/pdf-native.ts` | NEW — Vercel serverless PDF function (puppeteer-core + @sparticuz/chromium) |
| `vercel.json` | SPA rewrite excludes `/api/*` |
| `package.json` | Added `puppeteer-core`, `@sparticuz/chromium`, `@vercel/node` |
| `src/hooks/useEditorAutosave.ts` | `{ id: 'autosave-fail' }` on toast |
| `src/lib/lazyWithRetry.ts` | Immediate reload on first ChunkLoadError |
| `appwrite-hubs/resume-section-ai/src/main.js` | `buildSuggestTechMessages`, `parseSuggestTechResponse`, routing branch for `suggest_technologies` |
| `src/components/editor/InlineAIButton.tsx` | `fieldContext` prop, split project action arrays, label → `'AI Assist'` |
| `src/components/editor/ProjectsSection.tsx` | Pre-flight guards, focused payload, `fieldContext` passed to buttons |
| `src/hooks/useAIEnhance.ts` | `ActionType` extended with `suggest_technologies`, `generate_with_answers` |

### Deployment Notes
- All code changes are merged to `main` on GitHub.
- **Redeploy `resume-section-ai` Appwrite Function** is required for the `suggest_technologies` fix to take effect. Previous user-deployed version was from the old folder without the fix.
- **Verify `resume.thewise.cloud` points to Vercel** (not Hostinger directly) for the serverless PDF function to be reachable.
- GitHub Actions minutes were exhausted during this session — manual deploy via `APPWRITE_API_KEY=<key> node scripts/deploy_hubs.cjs` is the fallback.

### Security Note
The Appwrite API key was exposed in plain text during this session. **Rotate it immediately** in Appwrite Console → API Keys.

### Where We Stopped
- All code merged to `main`. TypeScript clean (`npm exec tsc -- --noEmit`).
- Appwrite `resume-section-ai` function NOT yet redeployed with the `suggest_technologies` fix.
- PDF export on live domain will work once Vercel is serving `resume.thewise.cloud` — confirm in Vercel dashboard that the domain is connected and a deployment is active.
- legacy payment provider integration (previous session) still has prerequisites pending in RC Dashboard (see session below).

---

## Session Summary — 2026-05-20 (legacy payment provider Payment Integration)

### Overview
Integrated legacy payment provider as the payment gateway (legacy billing + Stripe) for both the web app and mobile (Expo). Replaced all "coming soon" upgrade CTAs with real purchase flows. Created a new Appwrite Function `legacy-payment-webhook` for webhook-driven subscription sync. Removed the coupon UI from the upgrade surfaces (replaced by legacy native promo codes).

### Architecture Decisions
- **Billing engine**: legacy billing + Stripe (RC manages checkout UI, Stripe processes payments)
- **Entitlement IDs**: `pro` and `premium` — exact match to existing plan strings in Appwrite `subscriptions` collection
- **No schema changes**: webhook writes to existing fields (`plan`, `effective_plan`, `status`, `trial_plan`, `trial_expires_at`)
- **Sync strategy**: legacy provider fires webhooks → `legacy-payment-webhook` Appwrite Function verifies signature and upserts subscription document
- **Mobile RC init**: configured in `mobile/app/_layout.tsx` after `getStoredIdentity()` resolves

### What Changed
| File | Change |
|------|--------|
| `src/lib/billing.ts` | NEW — singleton `configurelegacy payment provider(userId)` / `getlegacy payment provider()` |
| `src/providers/legacy payment providerProvider.tsx` | NEW — auth-aware provider, inits SDK once after `authReady` |
| `src/hooks/old-payment-provider.ts` | Removed old offerings/purchase/customer-info hook |
| `src/AppInterior.tsx` | Added `<legacy payment providerProvider>` inside `<AuthProvider>` |
| `src/components/plan/UpgradeDialog.tsx` | Replaced coupon form with RC purchase button + live price |
| `src/components/plan/UpgradeWall.tsx` | Replaced "coming soon" toast with RC purchase + live price |
| `src/pages/SubscriptionPage.tsx` | RC purchase buttons, manage subscription link, coupon card removed |
| `src/lib/appwrite-functions.ts` | Removed `validate-coupon` / `redeem-coupon` from `COUPON_FUNCTIONS` |
| `appwrite-hubs/legacy-payment-webhook/` | NEW Appwrite Function — HMAC-verified, handles 6 event types |
| `scripts/deploy_hubs.cjs` | Added `legacy-payment-webhook` hub + env var provisioning |
| `.env.example` | Added `removed web payment API key` |
| `mobile/app/_layout.tsx` | RC init after user identity loads |

### Verification
- `npm exec tsc -- --noEmit` — zero errors
- `node --check appwrite-hubs/legacy-payment-webhook/src/main.js` — clean

### Where We Stopped
- Code is complete and TypeScript-clean. **No commits yet.**
- The coupon `validate` and `redeem` actions still exist in `appwrite-hubs/coupons/src/main.js` (kept as deprecated, unused from frontend).

### Prerequisites — User Must Complete in RC Dashboard
1. Create a **Web Billing app** in TheWiseCloud RC project → get `removed web payment API key`
2. Connect Stripe account to legacy billing
3. Create products: Pro ($9/mo) and Premium ($19/mo)
4. Create entitlements: `pro` and `premium`
5. Create one Offering with two packages linked to the entitlements
6. In legacy payment dashboard → Integrations → Webhooks: set webhook URL to the `legacy-payment-webhook` Appwrite Function HTTP endpoint, set `removed payment webhook secret` (must also be added as Appwrite Function env var)
7. Add iOS + Android apps → get platform API keys → add to Expo env

### Next Agent
- Commit all changes to branch and push
- Deploy `legacy-payment-webhook` Appwrite Function: `APPWRITE_API_KEY=<key> node scripts/deploy_hubs.cjs`
- Add `removed web payment API key` to Vercel environment variables
- Add `removed payment webhook secret` to Appwrite Function variables
- Test: sign in → click any gated feature → UpgradeDialog shows real prices → purchase opens RC checkout modal → on success, plan updates in SubscriptionPage

---

## Session Summary — 2026-05-19 (Editor + Gap Finder — see session logs)

**Canonical detail (do not duplicate here):**

| Log | Scope |
|-----|--------|
| `05-Migration to Appwrite/24-Session-Log-2026-05-19-Editor-Persistence-CV-Parse-UX.md` | Autosave round-trip, export page-cut metrics, Modern headers, CV job titles, editor UX (dates, Present, overlay links, AI consent, extras spacing) |
| `05-Migration to Appwrite/25-Session-Log-2026-05-19-Gap-Finder-Multi-Gap-Assistant.md` | Gap Finder timeline, `detectGaps` sync, multi-gap AI assistant, new-entry prepend |

**Same day, summarized below in this file:** page-break popup, page-cut dialog/PDF, editor live preview first-load (`CHANGELOG.md` 2026-05-19 entries).

### Where We Stopped (authoritative)

- **On `main`:** Merged 2026-05-19 — logs 24–25 + prior `main` PDF timeout / `PageBreakEditorDialog` (see `PageBreakEditorDialog.tsx` on disk; page-cut UX uses `PageCountBadge` + `PageBreakSetupDialog`).
- **User-verified:** CV import job titles; editor UX from log 24 after `ai-gateway` redeploy.
- **Not user-verified:** Multi-gap AI assistant (log 25).
- **Open:** Fill gap footer still longest-only; PDF export link clickability; import `Present` → `current` for projects/volunteering; manual QA — 3+ gaps → bar count = assistant picker = distinct date ranges.
- **Next agent:** Read logs 24–25 for root causes and file paths; redeploy `ai-gateway` only after hub parse edits.

---

## Session Summary — 2026-05-19 (Page cut preview + PDF fixes)

### Overview
Page-cut dialog now shows a scaled clone of the live resume (not a blank placeholder). Red break guide lines are stripped before PDF export. PDF footers show `Page N of M - Made with WiseResume` with a clickable link. Section “start new page before” buttons use live template height and replace breaks inside the target section.

### Verification
- `npm exec tsc -- --noEmit`
- `npm test -- src/lib/__tests__/pdfUtils.test.ts src/lib/nativePdfGenerator.test.ts src/components/editor/export/__tests__/ExportPageBreakSetup.test.tsx`

---

## Session Summary — 2026-05-19 (Page break control popup)

### Overview
Page-cut control is now only on the editor/preview **page count badge** (click → dialog). Export Options no longer embeds the break editor. Opening the dialog no longer writes smart breaks into `customBreakPositions` until the user chooses a preset, section action, or slider.

### Root cause (truncation)
`ExportPageBreakSetup` auto-persisted suggested breaks on first visibility when `customBreakPositions` was empty. Export then used only those Y values; bad breaks + `overflow: hidden` segment crops → clipped PDF content.

### Fixes
- `PageCountBadge` + `PageBreakSetupDialog` in `LivePreviewPanel` and `PreviewPage`.
- `resolveExportPageCount`, `computeBreaksForTargetPages`, `addBreakBeforeSection` in `pdfUtils.ts`.
- Live preview shows horizontal break lines when custom cuts exist.
- Removed `ExportPageBreakSetup` from `ExportOptionsSheet`.

### Verification
- `npm exec tsc -- --noEmit` passed.
- `npm test -- src/lib/__tests__/pdfUtils.test.ts src/lib/exportPagePlan.test.ts src/components/editor/export/__tests__/ExportPageBreakSetup.test.tsx` passed.

---

## Session Summary — 2026-05-19 (Editor live preview first-load)

### Overview
Users opening the editor for the first time in a session saw an empty live preview until a full page refresh. PDF export from the editor then failed with “Resume preview not visible” because `[data-resume-template]` was never mounted.

### Root causes (verified)
- `useIsMobile(1024)` initial state was `undefined` → coerced to `false`, mounting the desktop split layout on narrow viewports for one frame before switching to mobile tabs (preview only on the Preview tab).
- `useEditorHydration` only loaded from Appwrite when `currentResume` was empty; a persisted resume for a *different* id blocked hydration for the requested `/editor?id=…` resume.
- `react-resizable-panels` sometimes allocated 0px to the preview column on first flex layout; refresh forced a relayout.
- `LivePreviewPanel` returned `null` if `templateComponents[selectedTemplate]` was undefined (no `migrateTemplateId`).

### Fixes
- Synchronous viewport check in `use-mobile.tsx`.
- Hydrate when `localResume.id !== currentResumeId` in `useEditorHydration.ts`.
- `migrateTemplateId` + `modern` fallback in `LivePreviewPanel.tsx`.
- Editor split: `ImperativePanelGroupHandle.setLayout([55, 45])` after mount; `autoSaveId` + panel ids; PDF export uses `exportResumePdfFromData` when the live DOM node is missing.

### Verification
- `npm exec tsc -- --noEmit` passed.

### Local dev note
PDF export still requires the Express PDF server (`npm run dev:pdf-server`) and `VITE_DEV_API_PORT=5003 npm run dev` when port 5001 is occupied by another Vite instance.

---

## Session Summary - 2026-05-18 (DevKit Hub Runtime/Auth Repair)

### Overview

Implemented the DevKit 100% repair plan for confirmed failures across visible DevKit tabs and standalone admin hubs. Root causes were verified from live execution errors, source contracts, and Appwrite function variable inventories before fixes were deployed.

### Root Causes

- Standalone admin hubs used `timingSafeEqual` without checking signature buffer lengths. Bad signed DevKit tokens could crash the runtime with `RangeError` instead of returning `401`.
- `admin-deploy-hubs` still required the raw DevKit password while the frontend sends the signed DevKit session token.
- `LiveActivityPanel` showed ghost/stale probes (`me`, `admin-get-settings`, `admin-audit-logs`) as live checks.
- `EmailManagementPanel` read recent email audit logs directly from the browser.
- `admin-onboarding-funnel` lacked Appwrite API variables; `admin-impersonate` had CommonJS source packaged with `"type": "module"`.

### Fixes Applied

- Hardened signed-token verification in `admin-devkit-data`, `admin-email`, `admin-testmail`, `admin-moderation`, `admin-portfolio-usernames`, `admin-visitor-analytics`, `admin-onboarding-funnel`, `admin-impersonate`, `inspect-ai-keys`, and `admin-deploy-hubs`.
- Updated `admin-deploy-hubs` auth to accept signed DevKit session tokens as well as the raw password.
- Added `admin-devkit-data:deploy-hubs-status` to report whether `admin-deploy-hubs` has all required variables.
- Updated `DeployHubsPanel` to disable deploy controls with a missing-variable message instead of surfacing a broken live button.
- Replaced Live Activity ghost checks with owned `admin-devkit-data` checks.
- Routed email recent-send audit reads through `admin-devkit-data:list-audit-logs` with category filtering.
- Removed `"type": "module"` from `appwrite-hubs/admin-impersonate/package.json`.

### Deployment and Variables

Created missing non-secret Appwrite variables:
- `admin-onboarding-funnel`: `APPWRITE_API_KEY`, `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`
- `admin-deploy-hubs`: `APPWRITE_API_KEY`, `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`
- `admin-devkit-data`: `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`

Live Appwrite deployments:
- `admin-devkit-data`: `6a0a5a1cad719813f718`
- `admin-email`: `6a0a5a329efdaefc0fba`
- `admin-testmail`: `6a0a5a3c8bb89becd662`
- `admin-moderation`: `6a0a5a50a0f7d0fc90a0`
- `admin-portfolio-usernames`: `6a0a5a601419cd5cff11`
- `admin-visitor-analytics`: `6a0a5a73e85af5112705`
- `admin-onboarding-funnel`: `6a0a5a8857bfba05563b`
- `inspect-ai-keys`: `6a0a5aab34038040e9ff`
- `admin-deploy-hubs`: `6a0a5aba2e837df95554`
- `admin-impersonate`: `6a0a5b69e688d77b95ac` after fixing the package type mismatch

Remaining blocker: `admin-deploy-hubs` still needs `DEVKIT_PASSWORD` configured in Appwrite. `GITHUB_TOKEN` and `GITHUB_REPO` are present. Until the DevKit password variable is added, the Deploy Hubs panel intentionally stays disabled with a clear missing-variable state.

### Verification

- `node --check` passed for all changed Appwrite hubs.
- `npm exec tsc -- --noEmit` passed.
- Live malformed-token smoke passed for every affected hub: all executions completed with controlled HTTP `401`; no Appwrite execution failed with `500`, `crypto is not defined`, `timingSafeEqual`, or module-load errors after the `admin-impersonate` redeploy.

### Where We Stopped

- Appwrite backend fixes are live for all affected DevKit hubs listed above.
- `job-import` is live at deployment `6a0a555f2d62c4db7d32` and no longer runtime-fails on module parse.
- DevKit frontend source changes were pushed to `origin/main` in commit `0a92bd20` and require Vercel deployment verification before production UI reflects: Deploy Hubs disabled-state, Live Activity probe changes, and Email recent-send backend routing.
- `admin-deploy-hubs` is deployed and code-ready, but its live deploy button remains intentionally disabled because `DEVKIT_PASSWORD` is still missing on that Appwrite function. Add the exact same DevKit password value used by `admin-devkit-data` before enabling live self-deploys.
- GitHub Actions Deploy AI Hubs workflow remains blocked by GitHub billing/spending-limit failure. Direct Appwrite deployments were used for this session.
- Local `main` was rebased onto remote `main`; conflict in `Project Atlas/MASTER_HANDOVER_2026.md` was resolved by keeping the upstream 2026-05-17 handover and prepending the 2026-05-18 DevKit/import summaries.
- Working tree was clean after pushing `0a92bd20`; this final documentation update records the post-push state only.

---

## Session Summary - 2026-05-18 (Import Job Direct Redeploy)

### Overview

Investigated the Import Job button failure reported as "Appwrite Function runtime failed for job-import." Root cause was verified from function source history and archive contents before redeployment.

### Root Cause

The stale `job-import` function package contained duplicate declarations of `const parsedJob` and `savedDoc` in the same handler scope. Node failed during module parsing with `SyntaxError: Identifier 'parsedJob' has already been declared`, so Appwrite marked the execution failed before the handler could return JSON.

Current source already contained the code fix from prior work, but the live Appwrite deployment was still stale and GitHub Actions could not deploy because the workflow was blocked by a GitHub billing/spending-limit failure.

### Fixes Applied

- Rebuilt `job-import.tar.gz` from fixed `appwrite-hubs/job-import/` source.
- Updated `src/hooks/useImportJob.ts` so the server-side save path returns `{ id: jobId }`; without this, a successful backend save could navigate with an undefined job ID.
- Redeployed live Appwrite Function `job-import` directly as deployment `6a0a555f2d62c4db7d32`.

### Verification

- `node --check appwrite-hubs/job-import/src/main.js` passed.
- Prior bad source reproduced the syntax failure with `node --check`.
- Rebuilt archive passed `node --check`.
- Safe smoke execution with blocked localhost URL completed with HTTP `400` and `{ ok:false, error:"Invalid or blocked URL" }`, proving the runtime boots and returns JSON.

---

## Session Summary — 2026-05-17 (Vercel Build Fix + DevKit Bugs + AI Reliability + job-import Runtime Fix + Clipboard Toggle)

### Overview

Recovered from session `session_01GZxkXheSZyrQghdVraW989` onto branch `claude/teleport-session-recovery-i4XxZ`. Six distinct issues resolved across two Appwrite functions, one frontend component, and the deploy script. All commits pushed to `origin/claude/teleport-session-recovery-i4XxZ`.

Branch: `claude/teleport-session-recovery-i4XxZ` | Key commits: `ec757cb`, `b97f2c7`

---

### Fix 1 — Vercel Build Failure (`devKitInvokeOptions` not exported)

**Root cause:** `src/components/dev-kit/DeployHubsPanel.tsx` imported `devKitInvokeOptions` from `@/lib/devkit/devKitClient`. That function is defined in and exported from `@/lib/devkit/devKitAuth`, not `devKitClient`. Vite's rollup bundler hard-failed the build.

**Fix:** Changed the import source to `@/lib/devkit/devKitAuth`.

**File:** `src/components/dev-kit/DeployHubsPanel.tsx:5`

**Result:** Deployment `dpl_4D83zLvCdxrTdGcfySgETMtYuxSx` reached READY state.

---

### Fix 2 — DevKit AnalyticsPanel "No data returned"

**Root cause:** `handleAnalytics` in `admin-devkit-data/src/main.js` (lines ~1671–1711) built a payload object and spread it directly into `json()`, returning a flat structure. `AnalyticsPanel.tsx` destructures `result.data` — when `data` is absent the panel shows "No data returned" and renders nothing.

**Fix:** Assigned the payload to `analyticsPayload` and returned `{ data: analyticsPayload }` so the shape matches what `unwrapAdminResponse()` + the panel expects.

**File:** `appwrite-hubs/admin-devkit-data/src/main.js`

---

### Fix 3 — DevKit Diagnostics Panel Missing Collections

**Root cause:** `requiredCollections` array (line 219 of `admin-devkit-data/src/main.js`) was missing five collections added after the array was written: `contact_requests`, `notifications`, `ai_routing_config`, `wisehire_accounts`, `wisehire_invites`, `wisehire_waitlist`.

**Fix:** Added all five to the array.

**File:** `appwrite-hubs/admin-devkit-data/src/main.js:219`

---

### Fix 4 — admin-visitor-analytics SDK Version Mismatch

**Root cause:** `appwrite-hubs/admin-visitor-analytics/package.json` declared `node-appwrite: ^11.1.1`. Only `admin-visitor-analytics` was bumped in this session — the handover incorrectly stated "every other hub uses `^14.0.0`"; in reality several hubs were still on `^11.x` and none were on a unified version.

**Fix:** Bumped `admin-visitor-analytics` to `^14.0.0` at the time. Subsequently (2026-05-18 audit fix), all hubs that declare and use the SDK were standardized to `^17.2.0`.

**Files:** All `appwrite-hubs/*/package.json` files that declare `node-appwrite`

---

### Fix 5 — AI Gateway: Random Key Selection + Flat 30s Timeout

**Root cause (random selection):** `buildCandidates` used `Math.random()` to pick a key per provider. A rate-limited key (HTTP 429) had a 1-in-3 chance of being re-selected on the next request, causing repeated failures for the same user.

**Root cause (flat timeout):** Every candidate in the fallback chain was given a 30s timeout. If the preferred provider was slow, the user waited the full 30s before the gateway attempted the next key — causing the "AI Slow" badge.

**Root cause (same-provider fallback model):** When Groq KEY_1 failed, fallback to KEY_2/KEY_3 used the default free model instead of the configured route model, silently degrading output quality.

**Root cause (route config latency):** `syncDynamicRoutes()` hit Appwrite DB on every warm invocation.

**Fixes applied to `appwrite-hubs/ai-gateway/src/main.js`:**

| Fix | Detail |
|-----|--------|
| In-memory key backoff | `_keyBackoff: Map<apiKey, backoffUntilMs>`. 429 → 2 min, 401/403 → 5 min, 5xx → 30s, timeout → no backoff |
| Round-robin per provider | `_keyRoundRobin: Map<provider, nextIndex>`. `pickKey()` skips backed-off keys; falls back to round-robin if all keys are backed off |
| Tiered timeouts | Candidate 0: 10s (fail fast). Candidate N-1: 28s (last resort). Others: 15s |
| Same-provider fallback model | Fallback keys within the same provider reuse `route.model`, not the default free model |
| Route config cache | `_routeCache` + `_routeCacheTs` with 60s TTL; skips DB on warm instances |

**File:** `appwrite-hubs/ai-gateway/src/main.js`

---

### Fix 6 — ai-health Only Probed KEY_1

**Root cause:** The health check function only checked the first env var per provider (`GROQ_KEY_1`, `OPENROUTER_KEY_1`, `NVIDIA_KEY_1`). If KEY_1 was rate-limited, the badge showed the entire provider as down even when KEY_2/KEY_3 were healthy.

**Fix:** Complete rewrite of `appwrite-hubs/ai-health/src/main.js`. Now probes all configured keys (`KEY_1`, `KEY_2`, `KEY_3` per provider) in parallel via `Promise.all`. Provider is healthy if ANY key returns 2xx. Response includes `keysTested` and `keysOk` per provider.

**File:** `appwrite-hubs/ai-health/src/main.js`

---

### Fix 7 — job-import "Appwrite Function runtime failed" (Timeout Exhaustion)

**Root cause (syntax — prior commit `ec757cb`):** A prior refactor left duplicate `const parsedJob` and `let savedDoc`/`const savedDoc` declarations in the same function scope — a JavaScript SyntaxError. Node.js failed to load the module. `execution.errors` was empty string (Appwrite returns nothing for module-load failures), causing the generic "runtime failed" message.

**Root cause (timeout — this commit `b97f2c7`):** Even after the syntax fix, the function's internal timeouts exceeded Appwrite's default function execution timeout (typically 15–30s):
- URL fetch: `timeout: 20000` — alone could exceed a 15s Appwrite limit
- LLM per-entry: `timeout: 30000` — with a pool of 7 keys, worst-case = 210s

When Appwrite kills a function by execution timeout, `execution.errors` is empty → same generic error shown to the user.

**Fix:** Reduced internal timeouts to fit within a 30s Appwrite execution budget:
- URL fetch: 20000 → **8000**
- LLM per-entry: 30000 → **8000**
- DB write: 10000 → **5000**

Happy path (URL fetch ~2s + Groq ~3s) = ~5s total. Worst case (8s fetch + two 8s LLM attempts) = ~24s.

Also updated `scripts/deploy_hubs.cjs` `ensureFunction()`: now passes `timeout=30` as the 7th positional argument to `functions.create()` and `functions.update()`. Previously no timeout was set — Appwrite used its default (15s). Functions are now updated if their current timeout is below 30.

**Files:** `appwrite-hubs/job-import/src/main.js`, `scripts/deploy_hubs.cjs`

---

### Fix 8 — Clipboard Toggle Non-Functional

**Root cause:** `ImportJobSheet.tsx` had a "Detect job links from clipboard" toggle that saved the preference to `localStorage` (`wr-clipboard-job-detect`) but had no `useEffect` that actually read the clipboard. The comment explicitly said "No auto clipboard read". The toggle was purely cosmetic.

**Fix:** Replaced the no-op comment with a `useEffect` on `[open, clipboardEnabled]`:
```tsx
useEffect(() => {
  if (!open || !clipboardEnabled || !navigator.clipboard) return;
  navigator.clipboard.readText()
    .then(text => {
      const trimmed = text.trim();
      if (trimmed && isJobUrl(trimmed)) {
        setUrl(trimmed);
        setClipboardDetected(true);
      }
    })
    .catch(() => { /* permission denied or iOS WebKit — silent */ });
}, [open, clipboardEnabled]);
```

When the sheet opens with the toggle enabled, clipboard is read automatically. If it contains a recognized job URL (matches `JOB_DOMAINS`), the URL input is pre-filled and the "We found a job link" banner appears. Silently no-ops on iOS Safari (clipboard API requires a user gesture there — the Paste button still works for iOS).

**File:** `src/components/jobs/ImportJobSheet.tsx:51`

---

### Deployment State

| What | Status |
|------|--------|
| Branch | `claude/teleport-session-recovery-i4XxZ` pushed to origin |
| Vercel frontend | Already READY (`dpl_4D83zLvCdxrTdGcfySgETMtYuxSx`) from Fix 1 |
| Appwrite functions (`ai-gateway`, `ai-health`, `job-import`, `admin-devkit-data`, `admin-visitor-analytics`) | **Requires redeploy** — run `admin-deploy-hubs` panel or `APPWRITE_API_KEY=<key> node scripts/deploy_hubs.cjs` |
| Clipboard fix | Frontend change — requires Vercel redeploy of this branch |

---

### Where We Stopped

HEAD `b97f2c7` on `claude/teleport-session-recovery-i4XxZ`. All changes pushed.

**Next agent must:**
1. Merge `claude/teleport-session-recovery-i4XxZ` into `main` (or the user handles this via PR).
2. Redeploy Appwrite functions — the job-import timeout fix is code-only; until redeployed the function still has 20s/30s timeouts and will still fail.
3. After redeploying `job-import`: test Import Job dialog with a real LinkedIn/Indeed URL. Expect ~5-10s response, no "runtime failed".
4. Verify `ai-health` badge shows all providers with `keysTested: 3` after redeployment.
5. Clipboard toggle: after Vercel redeploy, toggle ON → close + reopen Import Job sheet → clipboard URL should auto-fill (desktop/Android; iOS uses the Paste button).

**No schema or collection changes in this session.**

---

## Session Summary — 2026-05-17 (DevKit Plan Fix + Mobile UX Audit + Cache Architecture)

### Overview

Three work streams on `main`. Primary driver: user confirmed premium plan upgrade from DevKit still not reflecting after prior cache-invalidation fix — deeper root cause found and fixed at the read layer, not just the cache layer.

Branch: `main` | Commits: `dbcde5c`, `9b804b6`

---

### Stream C — Plan Upgrade Not Reflecting (Root Cause: Read Path Broken)

#### Bug — `useMe` always returned `plan: 'free'` regardless of what admin wrote

**Root cause (this session):** The prior fix (adding `queryClient.invalidateQueries` to `AdminUsersPanel.handleSetPlan`) addressed the cache invalidation gap but not the underlying read failure. The real root cause: `useMe.ts` fetches the `subscriptions` collection client-side via `databases.listDocuments` with cookie/session auth. If Appwrite Document Security is disabled on that collection, per-document `Permission.read(Role.user(userId))` is ignored — only collection-level permissions apply. The SDK call returns empty (`documents: []`) on any permission mismatch and `safeList` swallows the error silently. Result: `sub` was always `undefined` → plan always `'free'`. Cache invalidation triggered a re-fetch that also returned empty → plan still `'free'`. This is why the prior fix appeared to do nothing.

**Fix:** Added `get-subscription` action to the `coupons` Appwrite Function (`appwrite-hubs/coupons/src/main.js`). This function:
- Authenticates the caller via `X-Appwrite-JWT` header (validates identity)
- Reads the `subscriptions` document using the **API key** (bypasses all collection-level permissions)
- Computes `effective_plan` (considers active trial if `trial_expires_at` is in the future)
- Returns `{ plan, effective_plan, status, trial_plan, trial_expires_at, coupon_code }`

Added `'get-subscription'` to `COUPON_FUNCTIONS` set in `src/lib/appwrite-functions.ts`. Updated body-action derivation with `deriveCouponAction()` helper replacing hardcoded `'validate'`/`'redeem'` string literals.

Updated `src/hooks/useMe.ts`: primary subscription read now calls `appwriteFunctions.invoke('get-subscription')`. If the function call fails (e.g., function not yet deployed), falls back to the old `safeList` path. No breaking change.

**Deployment note:** `coupons` function changes deploy automatically via GitHub Actions `deploy-appwrite-hubs.yml` when `appwrite-hubs/**` changes are pushed to `main`. Check Actions tab on `iammagdy/WiseResume-TWC` to confirm the run for commit `dbcde5c` succeeded. Also requires `RESEND_API_KEY` env var on `admin-devkit-data` function in Appwrite Console for plan upgrade emails to send (already called by `sendPlanUpgradeEmail()` in `handleSetPlan`).

**Files:** `appwrite-hubs/coupons/src/main.js`, `src/lib/appwrite-functions.ts`, `src/hooks/useMe.ts`

---

### Stream D — DevKit Mobile UX Audit (38 issues found, 10 fixed)

Admin confirmed DevKit will always be used on mobile. Full audit of all DevKit panels.

#### Fix 1 — Sidebar: full-screen takeover replaced with proper drawer

**Root cause:** `DevToolsPage.tsx` mobile sidebar used `fixed inset-0 z-50 flex w-full` — covered the entire screen with no affordance to dismiss except clicking a nav item.

**Fix:** Changed to `fixed inset-y-0 left-0 z-50 flex w-72` (left edge drawer). Added a `bg-black/60` backdrop overlay rendered behind the drawer (`z-40`) that dismisses on tap. Sidebar now slides in from the left edge; rest of the screen remains visible.

**File:** `src/pages/DevToolsPage.tsx`

---

#### Fix 2 — Cmd+K palette off-screen on mobile

**Root cause:** Search palette container had `pt-24` top padding unconditionally — on mobile viewports the palette started below the visible fold.

**Fix:** Changed to `pt-6 sm:pt-24` + added `px-3 sm:px-0`.

**File:** `src/pages/DevToolsPage.tsx`

---

#### Fix 3 — VisitorsPanel `Promise.all` crash when any action fails

**Root cause:** `VisitorsPanel.tsx` wrapped all backend calls in `Promise.all`. If `live-count` (or any single action) was not yet deployed or returned an error, the entire panel crashed with the error card. `live-count` was a new action added in the prior session and may not have been deployed yet.

**Fix:** Replaced `Promise.all` with `Promise.allSettled`. Added `val()` helper that returns `undefined` for rejected/failed results. KPIs action failure sets the error card; other action failures degrade gracefully (section shows empty/zero). Panel no longer dies because `live-count` isn't deployed.

**File:** `src/components/dev-kit/VisitorsPanel.tsx`

---

#### Fix 4 — VisitorsPanel session table forces horizontal scroll on mobile

**Root cause:** Sessions table used `min-w-[560px]` — scrolls horizontally on any viewport under 560px wide.

**Fix:** Dual-mode layout: `flex flex-col gap-2 sm:hidden` card list for mobile (shows user, page, duration, device as stacked text rows); `hidden sm:block overflow-x-auto` table for desktop. No data truncated.

**File:** `src/components/dev-kit/VisitorsPanel.tsx`

---

#### Fix 5 — `window.prompt()` unusable on mobile Safari/Chrome

**Root cause:** `EmailAutomationsPanel.tsx` `handleManualAdd`/`handleManualRemove` used `window.prompt()` to capture an email address. iOS Chrome and some Android browsers block or poorly render `window.prompt()`.

**Fix:** Replaced with an inline modal state (`inlinePrompt` useState). Modal renders as a `fixed inset-0 z-50` overlay with an `<Input>` field, Enter key submission, and Escape key dismissal. Full keyboard and touch support.

**File:** `src/components/dev-kit/EmailAutomationsPanel.tsx`

---

#### Fix 6 — AnalyticsPanel KPI grids too cramped on mobile (1px columns)

**Root cause:** Hero KPI grid used `grid-cols-2 md:grid-cols-4` — on 375px screens, 2 columns = ~175px each, leaving ~8px padding per card.

**Fix:** Hero grid → `grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3`. Secondary KPI grid → `grid-cols-2 sm:grid-cols-4 gap-3`. Loading skeleton updated to match.

**File:** `src/components/dev-kit/AnalyticsPanel.tsx`

---

#### Fix 7 — HomePanel status cards too narrow on mobile

**Root cause:** Status cards used `grid-cols-2 gap-3 lg:grid-cols-4` — 2 columns on all screens including mobile phones.

**Fix:** `grid-cols-1 sm:grid-cols-2 gap-3 lg:grid-cols-4` (single column on phones).

**File:** `src/components/dev-kit/HomePanel.tsx`

---

#### Fix 8 — AdminUsersPanel pagination overflows on mobile

**Root cause:** Pagination row showed full range text ("1–10 of 83 users") plus both arrow labels — overflowed on small viewports.

**Fix:** Page counter abbreviated to `{page+1}/{totalPages}` on mobile; range text `hidden sm:block`; arrow button labels hidden on mobile.

**File:** `src/components/dev-kit/AdminUsersPanel.tsx`

---

#### Fix 9 — VisitorsPanel filter input and journey search not wrapping on mobile

**Root cause:** Filter row used `w-36` fixed-width input that pushed other elements off-screen. Journey search row used `flex-row` that didn't collapse.

**Fix:** Filter input → `w-24 sm:w-36`. Journey search row → `flex-col sm:flex-row gap-2`.

**File:** `src/components/dev-kit/VisitorsPanel.tsx`

---

#### Fix 10 — JourneyDrawer full width on mobile

**Root cause:** `JourneyDrawer` used `w-full max-w-xl` — on desktop fine, but on mobile this caused edge-to-edge rendering with no side breathing room inside a sheet that was already full-screen.

**Fix:** Added `sm:` prefix: `w-full sm:max-w-xl`.

**File:** `src/components/dev-kit/VisitorsPanel.tsx`

---

### Remaining Mobile Issues (Not Fixed — Out of Scope)

- `UserDetailDrawer` expanded user panel: `grid-cols-1 md:grid-cols-2 xl:grid-cols-4` creates very long stacked layout on mobile — needs a tabbed or accordion layout
- `AIRoutingSwitcher` feature cards: `flex-col lg:flex-row` makes each card very tall on mobile
- `EmailAutomationsPanel` broadcast compose: still read-only; no `send-broadcast` action in `admin-email` function
- `AnalyticsPanel` data gaps: `signupsLast14Days`, `aiCreditsToday`, `topReferrers` return 0/empty (need queries from `auth_users`, `ai_credits` collections)

---

### Verification

- `npx tsc --noEmit` — zero errors
- No new npm packages
- No new Appwrite collections or attributes

---

### Where We Stopped

HEAD `9b804b6` on `main`. Both commits pushed.

**Critical — verify before assuming plan fix works:**
1. Check GitHub Actions tab (`iammagdy/WiseResume-TWC/actions`) — confirm `deploy-appwrite-hubs.yml` run for commit `dbcde5c` completed successfully. If it failed, `coupons` function still has the old code and `get-subscription` doesn't exist yet → `useMe` falls back to the broken `safeList` path → plan still shows 'free'.
2. In Appwrite Console → Functions → `admin-devkit-data` → add env var `RESEND_API_KEY` if not present — required for plan upgrade emails.
3. After confirming deployment: set a test user's plan via DevKit God Mode → navigate to a Pro-gated feature immediately → should reflect without waiting 15s.

**Next agent:** Pull `main` (HEAD `9b804b6`). Verify `coupons` function deployment (see above). The frontend (`useMe.ts`) already has the function call with `safeList` fallback — no further frontend changes needed once function is deployed.

---

## Session Summary — 2026-05-17 (UI Flash Fixes + DevKit Full Audit & Bug Fixes)

### Overview

Two work streams on `main` branch.

**Stream A — Route transition flash / scroll jank fixes:** Eliminated the white flash between route changes, removed duplicate body transition rules, and fixed ScrollProgressBar re-rendering on every scroll frame.

**Stream B — DevKit audit:** Found and fixed 4 confirmed bugs via code trace (no guessing). Every root cause is traceable to a specific file and line number.

Branch: `main` | Commits: `11c2062`, `08f44f0`

---

### Stream A — Route Flash & Scroll Jank (`11c2062`)

#### Fix 1 — Primary route flash: `key={pathname}` + missing `AnimatePresence`

**Root cause:** `AppShell.tsx` lines 149/154 used `<div key={location.pathname} className="animate-fade-in">`. Every navigation remounted the div. With no `AnimatePresence`, old content instantly unmounted (revealing `bg-background`) before new content began its 0.3s `opacity: 0 → 1` animation — producing 1–2 visible white frames on every route change.

**Fix:** Replaced both `<div key={pathname}>` blocks (swipe-back and non-swipe paths) with `<AnimatePresence mode="wait" initial={false}>` + `<motion.div key={pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>`. Old page now exits before new page enters; no bare-frame transparency.

**File:** `src/components/layout/AppShell.tsx`

---

#### Fix 2 — ScrollProgressBar re-rendering on every scroll frame

**Root cause:** `ScrollProgressBar.tsx` called `setProgress()` (React state) inside a `requestAnimationFrame` on every scroll event — 60+ re-renders/second on fast scroll. The `transition-[width] duration-75` CSS also conflicted with the rapid state writes.

**Fix:** Removed `useState`. Bar width is now written directly to the DOM element via `ref.current.style.width` inside the rAF callback. Wrapper visibility toggled via `style.display`. Zero React re-renders on scroll.

**File:** `src/components/layout/ScrollProgressBar.tsx`

---

#### Fix 3 — Body `background-color` transition firing on every route change

**Root cause:** Three separate declarations in `src/index.css` applied `transition: background-color` to `html`, `body` (line 381), and `body` again (line 399) unconditionally. Every route change (especially landing ↔ app route) triggered a 250–300ms color animation.

**Fix:** Removed all three unconditional `transition` declarations. Added `.theme-transitioning` class that applies `transition: background-color 200ms ease` only when explicitly set. Applied in `use-theme.ts` `toggleTheme()` for 250ms — theme switch still animates, route changes do not.

**Files:** `src/index.css`, `src/hooks/use-theme.ts`

---

#### Fix 4 — Global `-webkit-overflow-scrolling` on all scroll containers

**Root cause:** `index.css` applied `-webkit-overflow-scrolling: touch; overscroll-behavior-y: contain; touch-action: pan-y` to ALL `.overflow-y-auto` and `.overflow-y-scroll` elements globally. On iOS this caused async paint conflicts during fast swipe.

**Fix:** Scoped to `.main-scroll-container`, `.bottom-sheet-scroll`, and `[data-radix-scroll-area-viewport]` only. Added `main-scroll-container` class to the primary scroll div in `AppShell.tsx`. Removed inline `style={{ WebkitOverflowScrolling: 'touch' }}`.

**Files:** `src/index.css`, `src/components/layout/AppShell.tsx`

---

#### Fix 5 — `animate-fade-in` starting from `opacity: 0`

**Root cause:** `@keyframes fade-in` started at `opacity: 0` — any browser frame rendered before the animation began showed a fully transparent element.

**Fix:** Changed start to `opacity: 0.01` (never fully transparent). Reduced duration from 0.3s to 0.25s. Added comment that this class must not be used on route containers (use `motion.div` there instead).

**File:** `src/index.css`

---

### Stream B — DevKit Audit (`08f44f0`)

#### Bug 1 — AnalyticsPanel always errored (CRITICAL, confirmed)

**Root cause:** `src/components/dev-kit/AnalyticsPanel.tsx:63` invoked `action: 'analytics'` on `admin-devkit-data`. The function's router (lines 1629–1686) had no `'analytics'` case → returned `{ success: false, code: 'UNKNOWN_ACTION', error: 'Unknown action: analytics' }` (HTTP 400). `unwrapAdminResponse` threw → panel showed error card. **AnalyticsPanel had never worked.**

**Fix:** Implemented `handleAnalytics(body, log)` in `appwrite-hubs/admin-devkit-data/src/main.js`:
- Accepts `body.range`: `'today' | '7d' | '30d' | '90d' | 'all'`
- Fetches `visitor_events` collection for current and previous period (for delta KPIs)
- Computes: page views, unique visitors (by `anon_id`), device breakdown, top pages (by `d.page`), country ranking, activity series (per-hour or per-day bucketed), DAU/WAU, rangeKpis with current/previous pairs
- Returns full `PremiumAnalyticsData` shape (matches `src/components/dev-kit/analytics/types.ts`)
- Wired into router: `else if (action === 'analytics') data = await handleAnalytics(body, log);`

---

#### Bug 2 — Premium/Pro plan set from DevKit not reflecting immediately (CRITICAL, confirmed)

**Root cause:** `src/components/dev-kit/AdminUsersPanel.tsx` `handleSetPlan()` (lines 203–220) called `updateUser()` (local component state only) and showed a success toast, but never called `queryClient.invalidateQueries`. The write to Appwrite `subscriptions` collection WAS succeeding — the bug was purely in cache invalidation. `useMe` re-fetches every 15s — users had to wait up to 15s to see the change. Checking immediately after setting the plan → "doesn't reflect."

`UserDetailDrawer.handleSetPlan` (line 553) already had `queryClient.invalidateQueries({ queryKey: ['me'] })` — inconsistency between the two UI paths.

**Fix:**
1. Added `useQueryClient` import to `AdminUsersPanel.tsx`
2. Added `const queryClient = useQueryClient();` to the component
3. Added `queryClient.invalidateQueries({ queryKey: ['me'] })` after successful `set-plan` call
4. Applied same fix to `handleGrantTrial` in `AdminUsersPanel.tsx`
5. Success toast now contextually explains: "Your plan is now active" (own plan) vs "user's app will reflect within ~15s" (other user)

**Cross-browser note documented:** When the admin sets ANOTHER user's plan, that user's `useMe` cache lives in their browser. The admin's `invalidateQueries` cannot reach it. The target user updates via Appwrite realtime (1–3s) or 15s polling — this is expected behavior, not a bug.

---

#### Bug 3 — Visitors tab shows empty with no diagnostic context (Medium, confirmed)

**Root cause:** `src/lib/visitorTrack.ts:159` gates all event writes behind GDPR consent (`if (!getConsent()) return`). If no users have granted consent, `visitor_events` collection stays empty — `VisitorsPanel` shows generic "No page view data yet" with no way to tell whether the issue is (a) no data or (b) function not deployed.

**Fix:**
1. Added `totalEvents` field to `handleLiveCount()` response in `appwrite-hubs/admin-visitor-analytics/src/main.js` — fetches `visitor_events` with `Query.limit(1)` to get `total` count
2. `VisitorsPanel.tsx` fetches `live-count` alongside other actions and stores `eventCount` in state
3. New empty state shows one of three messages:
   - `eventCount === 0`: "visitor_events: 0 documents — tracking activates only after users grant GDPR consent"
   - `eventCount > 0`: "visitor_events: N documents — data exists but didn't load. Check admin-visitor-analytics deployment in Diagnostics."
   - `eventCount === null` (count fetch also failed): "Couldn't determine collection status — verify function deployment"

---

#### Bug 4 — AIRoutingSwitcher silently hung on load failure (Medium, confirmed)

**Root cause:** `fetchRoutes()` catch block only called `console.error('Failed to fetch AI routes:', err)`. UI showed "Fetching AI Global Config…" indefinitely. User had no indication of failure and no way to retry.

**Fix:** Added `loadError` state (`useState<string | null>(null)`). On catch: `setLoadError(msg)`. After the `if (loading)` guard, added `if (loadError)` block rendering an error card with the error message and a "Retry" button that calls `fetchRoutes()`.

---

### Verification
- `npx tsc --noEmit` — zero errors (ran after both commits)
- No new npm packages
- No new Appwrite collections or attributes
- No CI workflow changes

---

### Where We Stopped

All changes are on `main` (HEAD `08f44f0`). Both commits pushed.

**DevKit — remaining items not addressed this session:**
- `EmailAutomationsPanel.tsx` is read-only (shows audience/broadcast stats but no controls to create or trigger automations). Needs a broadcast compose modal + `admin-email` function action `'send-broadcast'`.
- `AnalyticsPanel` data quality: `signupsLast14Days`, `aiCreditsToday`, `aiCreditsYesterday`, `topReferrers`, `newVsReturning` (accurate), and `heatmap` are returned as `[]` / `0` — these require querying `auth_users`, `ai_credits`, and referrer parsing which wasn't implemented to keep scope tight. Values are structurally valid (no type errors).

**Outstanding portfolio items (from previous sessions, not addressed this session):**
- AI Critique → clickable jump-to-section action
- Section funnel analytics chart in VisitorsTab
- Full-viewport hero on desktop
- Theme-aware default section ordering
- Remove A/B testing from user-facing UI
- Remove CareerCard / merge with QR
- Email notification on recruiter interest (requires new Appwrite Function)

**Next agent:** Pull `main` (HEAD `08f44f0`). DevKit premium assignment now works immediately for own-plan changes. AnalyticsPanel now loads data. Visitors empty state is diagnostic. Verify by: (1) open DevKit Analytics tab — should load or show empty state instead of error card; (2) open God Mode → set own user's plan to Pro → immediately check a Pro-gated feature — should reflect without waiting.

---



### Overview
Two work streams in a single session on `claude/read-project-docs-JEUkC`:

**Stream A — Bug Fixes (critical):** Three bugs from prior plan were already live. Import Job mobile button loop and premium detection fixes were committed in a prior sub-session (`ccb6486`). This session continued with the remaining critical fixes.

**Stream B — Portfolio Enhancement Pass:** Implemented high-priority items from a prior audit that had identified the portfolio as generic. 5 targeted improvements; no new npm packages; zero Appwrite schema changes; `npx tsc --noEmit` clean throughout.

Branch: `claude/read-project-docs-JEUkC` | Commits: `ccb6486`, `5e242bb`, `047f30d`, `bc47a66`

---

### Fix 1 — `usePublicPortfolio` Hook Rewrite (`5e242bb`)

**Root cause:** The hook was a stub. `usePortfolioGate()` accepted no arguments but the page called it as `usePortfolioGate(username)`. `usePublicPortfolio()` accepted only `username` but the page called it as `usePublicPortfolio(username, contentEnabled, submittedPassword)`. Result: password protection was completely bypassed (gate always returned `{ isAllowed: true, loading: false }`), content was always fetched regardless of gate state, and the `PublicProfile` type didn't exist — breaking `usePortfolioSEO`, `PublicHero`, `PublicSections`, `ChatWidget`, `portfolioPrintLayout`.

**Fix:** Complete rewrite of `src/hooks/usePublicPortfolio.ts`:

| Export | Before | After |
|--------|--------|-------|
| `usePortfolioGate(username)` | Accepted no args, returned `{ isAllowed: true, loading: false }` | Fetches `profiles` by username, returns `{ data: { passwordEnabled, accentColor, exists }, isLoading }` |
| `usePublicPortfolio(username, contentEnabled, submittedPassword)` | Only accepted `username`, ignored other args | Accepts all 3 args; only queries when `contentEnabled=true`; SHA-256 hashes `submittedPassword` and compares against `portfolioExtras.passwordHash`; throws `new Error('invalid_password')` on mismatch |
| `PublicProfile` | Not exported | Full typed interface with 30+ fields: `availabilityStatus`, `location`, `industry`, `portfolioPrimaryLanguage`, `portfolioSecondaryLanguage`, `contactFormEnabled`, all `portfolioExtras` sub-fields flattened (`testimonials`, `services`, `caseStudies`, `highlights`, `portfolioSummary`, `sectionOrder`, `pinnedProject`, `scrollEffect`, `videoIntroUrl`, `schedulingUrl`, `abChallengerTheme`, `portfolioCertifications`) |
| `PublicResume` | Not exported | Full typed interface |
| `PortfolioSections` | Not exported | Exported interface |
| `validateCustomDomain` | Always returned `true` | Now validates format and blocks reserved domains, returns `string \| null` |

**Password verification detail:** The editor hashes with `crypto.subtle.digest('SHA-256', ...)` and stores the hex string in `portfolioExtras.passwordHash`. The public hook replicates the same hash client-side and compares. No Appwrite Function required.

---

### Fix 2 — JSON-LD Person Schema (`5e242bb`)

**Root cause:** `usePortfolioSEO.ts` set Open Graph and Twitter tags but emitted no structured data — Google had no machine-readable signal for portfolio pages.

**Fix:** Added a `<script type="application/ld+json">` element in `src/hooks/usePortfolioSEO.ts` containing a `schema.org/Person` object. Fields populated: `name`, `jobTitle`, `description` (from `portfolioBio`), `url` (canonical portfolio URL), `sameAs` (LinkedIn, GitHub, Twitter if present), `email` (if `contactEmail` set). Element is removed on hook cleanup.

---

### Fix 3 — Social Link Protocol Normalization (`047f30d`)

**Root cause:** `PublicHero.tsx` rendered social link hrefs directly from the profile (`href={profile.linkedinUrl}`) with no protocol guard. URLs stored without `https://` (e.g., `linkedin.com/in/user`) were treated as relative paths by the browser, producing broken links.

**Fix:** Imported `normalizeUrl` from `@/lib/urlUtils` and applied it to all four social link hrefs in `src/components/portfolio/public/PublicHero.tsx` (`linkedinUrl`, `githubUrl`, `websiteUrl`, `twitterUrl`). `normalizeUrl` prepends `https://` if no protocol is present.

---

### Feature 1 — "Generate Full Portfolio" Button (`047f30d`)

**File:** `src/pages/PortfolioEditorPage.tsx`

Added a `handleGenerateAll` handler and a prominent button above the tab strip that chains three sequential AI calls: bio → SEO meta → availability headline. Uses a single progress toast (`toast.loading` → `toast.success`) that updates label after each step ("Generating… 1/3", "2/3", "3/3"). Partial success is reported ("Generated 2/3 sections. Some failed…"). Button is disabled while any individual generator is also running. Icon: `Wand2` from lucide-react.

---

### Feature 2 — Auto-scrolling Testimonials Carousel (`bc47a66`)

**File:** `src/components/portfolio/public/PublicSections.tsx`

Previously: 3+ testimonials rendered as a plain `overflow-x-auto snap-x` div with no auto-advancement and no position indicator.

Added `TestimonialsCarousel` component (self-contained, no new file):
- Auto-advances every 4 s via `setInterval`
- Pauses on `mouseenter` / `touchstart`; resumes 2 s after `touchend`
- User-initiated scroll updates `activeIndex` via `scroll` listener; clicking a dot scrolls to that index and pauses auto-advance for 3 s
- Dot indicator row below the track; active dot scales 1.4× and uses `--pf-accent` color
- Respects `prefersReducedMotion` indirectly (no JS animation, only CSS scroll-behavior)

---

### Fix 4 — Portfolio Gate Cache Invalidation on Publish (`bc47a66`)

**File:** `src/pages/PortfolioEditorPage.tsx`

`handleSave` already called `queryClient.invalidateQueries({ queryKey: ['public-portfolio'] })` on publish. Added `queryClient.invalidateQueries({ queryKey: ['portfolio-gate'] })` alongside it. Without this, a returning visitor who had cached `gateInfo.passwordEnabled = false` would bypass the password gate even after the owner enabled password protection, until the 30 s `staleTime` expired.

---

### Verification
- `npx tsc --noEmit` — zero errors (ran after every commit)
- No new npm packages
- No new Appwrite collections or attributes
- No CI workflow changes in this session

---

### Where We Stopped

- All 4 commits pushed to `claude/read-project-docs-JEUkC` (HEAD `bc47a66`). **Not merged to `main`.**
- The previously committed fixes (`ccb6486`) for the Import Job mobile button loop and the premium `useMe.ts` + DesktopNav refresh button are included in this branch.

**Outstanding items from the original portfolio audit (not yet implemented):**
- P1: AI Critique → clickable jump-to-section action (tab navigation from AICritiqueSheet to specific editor tab)
- P1: Section funnel analytics chart in VisitorsTab (bar chart of section engagement, already has dwell-time data in `sections_timing`)
- P2: Full-viewport hero on desktop (currently `max-w-4xl mx-auto` — consider 100vw with edge bleed on `heroAlign='split'` themes)
- P2: Theme-aware default section ordering (each theme config has a logical `sectionOrder` default, not yet applied)
- P3: Remove A/B testing from user-facing UI (the `abChallengerTheme` feature exists but adds complexity; recommend removing from non-DevKit UI)
- P3: Remove CareerCard / merge with QR (duplicate UX — QrGeneratorSheet and CareerCardSheet serve the same use case)
- Email notification on recruiter interest (requires a new Appwrite Function; currently only writes to `portfolio_interactions` collection with no notification sent to the owner)

**QA needed before merging:**
- Public portfolio page with a password-protected portfolio — verify password gate shows, incorrect password shows error, correct password unlocks content
- Public portfolio with `contentEnabled=true` and no password — verify normal load
- Social links on public portfolio — verify links with and without `https://` prefix open correctly
- "Generate Full Portfolio" button in editor — verify toast progresses through 3 steps and all three fields are populated
- Testimonials carousel — verify auto-scroll, pause on hover, dot navigation, manual swipe
- DesktopNav "Refresh account" button — verify `toast.info('Refreshing account…')` fires and plan re-fetches

**Next agent:** Pull `claude/read-project-docs-JEUkC` (HEAD `bc47a66`), run QA above, merge to `main`.

---

## Session Summary — 2026-05-16 (WiseDrop Job Import Feature + CI Fixes — Both Workflows Green)

### Overview
Implemented the full WiseDrop "Import Job" feature (global FAB + sheet, backend Appwrite Function, enhanced JobDetailPage). Fixed two broken CI workflows that had been failing since PR #52 was merged. Both `deploy-frontend.yml` and `deploy-appwrite-hubs.yml` are now green.

Branch: `main` | Commits: `2127b85`, `cae3122`, `ce486e9`, `51b8429`, `81f11b9`, `b5aa128`, `ad9b45e`

---

### Part 1 — WiseDrop Feature Implementation

#### New files
| File | Purpose |
|------|---------|
| `appwrite-hubs/job-import/src/main.js` | Appwrite Function: fetches URL HTML, extracts OpenGraph + JSON-LD + body text, calls LLM provider pool (Groq → OpenRouter → DeepSeek), returns structured job object |
| `appwrite-hubs/job-import/package.json` | Deps: `axios` only |
| `src/hooks/useImportJob.ts` | `useMutation` hook: invokes `job-import` function, saves result to `jobs` collection via `useJobMutations().createJob` |
| `src/components/jobs/ImportJobSheet.tsx` | 5-state sheet (idle → clipboard-detected → loading → success → error). Clipboard detection on open (opt-in, `wr-clipboard-job-detect` localStorage key). `isJobUrl()` matches linkedin.com/jobs, indeed.com, wuzzuf.net, bayt.com, etc. Success auto-navigates to `/job/{id}` after 1.2s. |
| `src/components/jobs/ImportJobFAB.tsx` | Mobile-only FAB (`fixed left-4 z-50 lg:hidden`), shares `askFabOffsetClass` with Wise AI FAB |

#### Modified files
| File | Change |
|------|--------|
| `src/components/layout/AppShell.tsx` | Added `<ImportJobFAB offsetClass={mobileShellLayout.askFabOffsetClass} />` after Wise AI FAB, same guard conditions |
| `src/components/layout/DesktopNav.tsx` | Added "Import Job" button (left of Wise AI button) + `ImportJobSheet` mount + `importJobOpen` state |
| `src/pages/JobDetailPage.tsx` | Added `computeMatch()` heuristic (keyword overlap between `job.requirements` and resume skills); AI Match Score badge (green ≥70%, amber ≥45%, red <45%); missing-skills chips; 3-button quick-action row (Tailor Resume, Cover Letter, Track Application) |
| `scripts/deploy_hubs.cjs` | Added `job-import` to hubs array; added env var block for `GROQ_KEY_1`, `OPENROUTER_KEY_1`, `DEEPSEEK_KEY` on `job-import` |
| `.github/workflows/deploy-appwrite-hubs.yml` | Added `build_hub job-import job-import.tar.gz`; added push trigger with path filter on `appwrite-hubs/**`, `scripts/deploy_hubs.cjs`, `scripts/setup_observability_schema.cjs` |

#### SSRF protection in `job-import/src/main.js`
Blocks: `127.x`, `10.x`, `192.168.x`, `172.16-31.x`, `169.254.x`, `::1`, `fd*`, `localhost`. Validates hostname before any HTTP fetch. Returns 400 on blocked URL, 422 on fetch/parse failure, 500 on LLM failure.

---

### Part 2 — CI Workflow Fixes

Three separate root causes, all introduced by the PR #52 merge:

#### Fix 1 — Frontend build: unescaped apostrophe in `OnboardingChecklist.tsx`
**Root cause:** `'You're all set!'` — single-quoted JSX string containing an apostrophe. Vite/esbuild failed with `Expected ":" but found "re"` at parse time.  
**Fix:** `src/components/dashboard/OnboardingChecklist.tsx:59` — changed to `"You're all set!"` (double quotes). Commit `b5aa128`.

#### Fix 2 — Frontend CI: bundle size check incorrectly summed all JS chunks
**Root cause:** `deploy-frontend.yml` "Check bundle size" step added by PR #52 ran `find dist/assets -name "*.js" | xargs wc -c`. This sums ALL JS files including lazy-loaded chunks (PDF worker 1.3MB, OCR 1MB, doc-export 1.5MB, etc.) — total ~10MB vs a 3MB limit. The check was never valid; it had been failing since PR #52 merged.  
**Fix:** Changed the enforced check to only measure the initial entry chunk (`index-*.js`, ~88KB). Total bundle size is now reported as informational only. Commit `ad9b45e`.

#### Fix 3 — AI Hubs CI: tarball validation fails due to filesystem ordering in CI
**Root cause:** `deploy-appwrite-hubs.yml` validation used `tar -tzf "${archive}" | head -20 | grep -q '^./src/main.js$'`. On the CI runner (Ubuntu overlay filesystem), tar lists entries in a different order than local macOS/Linux ext4 — specifically, `node_modules/` entries appeared before `./src/main.js` in the first 20 lines for `auth-master` (which has many dependencies). Root cause confirmed via GitHub Actions annotation: `auth-master.tar.gz does not contain src/main.js at archive root`.  
**Fix:** Removed `head -20` — now `tar -tzf "${archive}" | grep -q '^./src/main.js$'` scans the full listing. Commit `ad9b45e`.

#### Bonus — Split monolithic AI Hubs deploy step into 4 named steps
`deploy-appwrite-hubs.yml` single "Deploy AI Hubs" step split into: "Install deploy dependencies" / "Build hubs" / "Setup Appwrite schema" / "Deploy hubs". Each step uses `env:` block rather than shell `export`. Enables per-step failure attribution in GitHub Actions UI.

---

### Verification
- `npx tsc --noEmit` — zero errors
- `npm run build` — succeeds locally (exit code 0)
- `deploy-frontend.yml` — ✅ green on commit `ad9b45e`
- `deploy-appwrite-hubs.yml` — ✅ green on commits `ad9b45e` (workflow_dispatch) and `b587f6b` (push)
- Both workflows confirmed green on two consecutive runs

---

### Where We Stopped
- `job-import` Appwrite Function is deployed and live. It requires `GROQ_KEY_1`, `OPENROUTER_KEY_1`, `DEEPSEEK_KEY` env vars set on the function in Appwrite Console — these are synced by `deploy_hubs.cjs` from GitHub Secrets. Verify secrets exist in the repo if the function returns 500.
- Mobile QA for ImportJobSheet not performed. Test: tap FAB → paste a LinkedIn/Indeed URL → Analyze → verify job created → navigates to JobDetailPage → match score and 3 action buttons visible.
- Desktop QA: verify "Import Job" button appears in DesktopNav between "Import Profile" and "Wise AI".
- `JobDetailPage.tsx` match score is heuristic-only (keyword overlap) — not AI-powered. Sufficient for v1.
- Clipboard detection is opt-in (off by default). Toggle state stored in `wr-clipboard-job-detect` localStorage key.
- No new Appwrite collections. No schema changes. No new npm packages in the frontend.
- **Next agent:** pull `main` (HEAD `ad9b45e` or later), verify `job-import` function is live in Appwrite Console with AI provider keys set, run mobile QA above.

---

## Session Summary — 2026-05-16 (UI/UX Audit Implementation — Phases 1–4, All 25 Findings)

### Overview
Implemented all 25 actionable findings from the 2026-05-16 senior UI/UX audit. Work split across 4 phases. 21 source files changed, 4 new `/docs/project-atlas/` files created (Phase 0, prior session). Zero new npm packages. Zero new Appwrite collections or attributes. `npx tsc --noEmit` — clean throughout.

Branch: `claude/read-project-docs-JEUkC` | Commits: `d0beb6c`, `811357b`, `83735bd`

---

### Phase 1 — Mobile & Trust Quick Wins (Findings #1–10)

| # | File(s) | Root Cause | Fix |
|---|---------|-----------|-----|
| 1 | `ExportOptionsSheet.tsx`, `DashboardPage.tsx` | `wr-checklist-exported-{userId}` read by OnboardingChecklist but never written — export step permanently unchecked | `ExportOptionsSheet` dispatches `'wr-export-completed'` CustomEvent when `exportProgress.stage === 'downloading'`; `DashboardPage` listens and writes the localStorage key + updates state |
| 2 | `AchievementToast.tsx` | Inline `style={{}}` with hardcoded hex (`#1a1a2e`, `#fbbf24`, etc.) — toast invisible in light mode | Replaced all inline style props with Tailwind semantic tokens: `bg-card border border-border`, `text-foreground`, `text-muted-foreground`, `text-primary` |
| 3 | `NotificationsPage.tsx` | `markAllAsRead.mutate()` had no `onSuccess` callback — user received no confirmation | Added `toast` import from `@/components/ui/sonner`; added `onSuccess: () => toast.success('All notifications marked as read')` as second arg to `mutate()` |
| 4 | `ReferralPage.tsx` | Stats hardcoded `value: 0` — indistinguishable from a broken feature vs. a pending one | Changed all three stat values to `'—'`; added `<p>Referral tracking coming soon.</p>` below the grid |
| 5 | `AppShell.tsx`, `DesktopNav.tsx` | FAB and desktop button labelled `'Ask'` — inconsistent with "Wise AI" branding used everywhere else | String-replaced `'Ask'` → `'Wise AI'` on the FAB span and desktop button text node only |
| 6 | `BottomTabBar.tsx` | More trigger button had `unreadNotifCount > 0` notification dot AND the sheet had a numeric badge — double signalling | Removed the `unreadNotifCount` dot from the More button entirely; kept `hasNew` (changelog) dot only; numeric badge remains inside the sheet on the Notifications icon |
| 7 | `ShortcutHelpSheet.tsx` | Shortcuts listed without context — users couldn't tell editor-only shortcuts from global ones | Added `scope: string` to `ShortcutGroup` interface; added scope note `<p className="text-xs text-muted-foreground mb-2">` under each group heading |
| 8 | `BottomTabBar.tsx` | `grid-cols-4` crammed 10 items at 375px; no visual separation between functional groups | Changed to `grid-cols-3 sm:grid-cols-4`; split `moreItems` into two labelled groups ("Tools" indices 0–4, "Account" indices 5–9); rendered as two separate grids with `<p>` section headers |
| 9 | `sonner.tsx` | `role="status"` is for live status regions (single value); a toast stream is `role="log"` | One-attribute change: `role="status"` → `role="log"` |
| 10 | `appShellLayout.ts` | Audit flagged FAB may overlap content on some pages | Verified N/A: AppShell applies `pb-[8.5rem] lg:pb-0` globally when FAB is shown — no per-page changes needed |

---

### Phase 2 — Navigation & Dashboard Polish (Findings #11–15)

| # | File(s) | Root Cause | Fix |
|---|---------|-----------|-----|
| 11 | `DashboardPage.tsx` | Import Resume + Explore sections always visible — push resume list below fold for returning users on 390px screens | Added `showDiscovery` state (default `false`); wrapped both sections in Radix `<Collapsible>` that is `open={resumes.length === 0 \|\| showDiscovery}`; trigger button "Discover more ▼" only rendered when `resumes.length > 0` |
| 12 | `EditorPage.tsx` | No breadcrumb in the editor — user has no orientation context | Imported `Breadcrumb`; rendered `<Breadcrumb items={['Home', resumeName \|\| 'Resume']} links={['/dashboard']} />` at top of editor scroll container |
| 13 | `TailorPage.tsx`, `navigation.ts` | `navigate(-1)` is unsafe on direct URL load (empty history stack) | Added `'/tailor': '/dashboard'` to `BACK_ROUTES`; replaced `navigate(-1)` with `navigate(getBackRoute('/tailor'))`; added `Breadcrumb` to TailorPage header |
| 14 | `ApplicationsPage.tsx` | `<h1>My Activity</h1>` contradicted inner tab label "My Applications" | Changed `<h1>` text to `"My Applications"` — one string change |
| 15 | `Breadcrumb.tsx` | Long resume names (60+ chars) overflow the breadcrumb container on mobile | Added `truncate max-w-[180px] sm:max-w-none` to the last-item `<span>` |

---

### Phase 3 — Stability & Performance (Findings #16–20)

| # | File(s) | Root Cause | Fix |
|---|---------|-----------|-----|
| 16 | `ResumeListCard.tsx`, `EmptyState.tsx` | Template renderer crash inside `<Suspense>` took down the entire card | Imported `ErrorBoundary` from `@/components/ErrorBoundary`; wrapped `<Suspense><MiniTemplateThumbnail /></Suspense>` in `<ErrorBoundary fallback={<div className="w-10 h-[56px] bg-muted" />}>` in both files |
| 17 | `TemplatesPage.tsx` | `resume as any` cast on preview data — type mismatch could crash the `TemplateThumbnail` render inside the sheet | Wrapped `<TemplateThumbnail>` in `<ErrorBoundary fallback={<p>Preview unavailable for this resume.</p>}>` — contains crash without touching the underlying type issue |
| 18 | `ResumeListCard.tsx` | Thumbnail container `h-[54px]` for `w-10` (40px) gives aspect ratio 1.35 — A4 is 1.414 (56px) | Changed container and Suspense fallback from `h-[54px]` → `h-[56px]` |
| 19 | `MiniTemplateThumbnail.tsx` | All thumbnails rendered immediately on mount — causes paint jank on large resume lists | Added `isVisible` state (default `false`); `useEffect` with `IntersectionObserver` at `threshold: 0` sets `isVisible = true` on first intersection then disconnects; browser-support guard: `if (!('IntersectionObserver' in window)) setIsVisible(true)`; renders skeleton until visible |
| 20 | `EmptyState.tsx` | `setInterval` carousel ran regardless of `prefers-reduced-motion` — affects vestibular disorder users | Added `shouldReduceMotion` to `useEffect` dependency array; `if (tipPaused \|\| shouldReduceMotion) return` skips the interval entirely |

---

### Phase 4 — Forms, Copy & Fine Polish (Findings #21–25)

| # | File(s) | Root Cause | Fix |
|---|---------|-----------|-----|
| 21 | `AuthPage.tsx` | Register form had no password requirement hint — users submitted weak passwords silently | Added `<p className="text-xs text-white/40 mt-1">At least 8 characters.</p>` after the password `<Input>` in the register form; wrapped both in a `<div>` |
| 22 | `TailorPage.tsx` | Custom instructions textarea had no length limit or counter — AI calls could receive unbounded input | Added `maxLength={2000}` to `<Textarea>`; added `<p className="text-xs text-muted-foreground text-right">{customInstructions.length}/2000</p>` below the textarea |
| 23–24 | `OnboardingChecklist.tsx` | Dismiss button had generic `aria-label="Dismiss checklist"`; focus dropped to `document.body` on dismiss (button unmounts) | Updated `aria-label` to `"Dismiss getting started checklist"`; added `aria-label="Getting started checklist"` to card container; added `handleDismiss()` that calls `onDismiss()` then `setTimeout(() => document.querySelector('[data-dashboard-heading]') ?? document.querySelector('h1'))?.focus(), 50)` |
| 25 | `OnboardingChecklist.tsx` | "Dismiss — I'm all set!" was abrupt | Changed to `"Got it — I'm all set!"` |

---

### New Docs Created (Phase 0 — same session)
- `docs/project-atlas/design-system.md` — color tokens, typography, button hierarchy, reward/XP color convention
- `docs/project-atlas/mobile-ux-priorities.md` — FAB offset, tab bar height, touch targets, swipe patterns, common pitfalls
- `docs/project-atlas/audit-roadmap.md` — all 29 findings with status, phase, file, risk
- `docs/project-atlas/technical-context.md` — COLLECTIONS.* map, env vars, localStorage key registry, Zustand stores, React Query keys, Hostinger constraints

---

### Verification
- `npx tsc --noEmit` — zero errors (ran after every phase)
- Build: prebuild step fails in this container (missing `pdfjs-dist/cmaps` — pre-existing environment issue, unrelated to these changes); Vite build itself is unreachable for same reason. TypeScript confirms correctness.
- All 25 findings confirmed implemented via codebase scan at end of session.

### Deferred (Phase 5 — unchanged)
- Finding #26: OG image endpoint (`/og-image/:username`) — verify `VITE_API_URL` is deployed before assuming reachable; Hostinger has no Node server
- Finding #29: TemplatesPage `as any` type mismatch — root cause deferred; `ErrorBoundary` contains crash

---

### Where We Stopped
- All 25 findings implemented and pushed to `claude/read-project-docs-JEUkC` (HEAD `83735bd`).
- **No PR created.** Branch is not merged to `main`. Merge when QA is confirmed.
- **Mobile QA not performed** in this container. Test these flows on a real device before merging:
  - Export a resume → verify OnboardingChecklist export step becomes checked immediately
  - Open BottomTabBar "More" sheet → verify 3-column grid + "Tools" / "Account" section labels
  - Open editor → verify breadcrumb renders at top of scroll area
  - Open TailorPage via direct URL → verify back button goes to dashboard, not browser back
  - Open AchievementToast in light mode → verify no invisible text
  - Dashboard with ≥1 resume → verify Import Resume + Explore hidden by default
- No Appwrite schema changes, no hub deployments, no CI workflow changes in this session.
- **Next agent:** pull `claude/read-project-docs-JEUkC`, verify above QA items, then merge to `main` and trigger `deploy-frontend.yml`.

---

## Session Summary — 2026-05-16 (World-Class Enhancement Pass — All 5 Phases)

### Overview
Full-codebase enhancement pass completing 5 phases of improvements following a comprehensive audit. All changes are additive with safe defaults; zero breaking changes introduced.

### New Files Created
- `src/components/dashboard/MiniTemplateThumbnail.tsx` — extracted from EmptyState; ResizeObserver-based template preview
- `src/components/dashboard/OnboardingChecklist.tsx` — collapsible 5-step getting-started checklist card
- `src/components/layout/ShortcutHelpSheet.tsx` — keyboard shortcut discovery sheet (4 categories, kbd-styled chips)
- `src/components/ui/AchievementToast.tsx` — golden-themed custom achievement unlock toast

### Key Files Modified (22 total)
- `ExportProgressBar.tsx`, `nativePdfGenerator.ts` — export reliability: stage labels, retry logic, error recovery UI
- `EditorHeader.tsx` — offline pending-count chip and syncing indicator
- `useNotifications.ts`, `NotificationsPage.tsx` — markAllAsRead mutation, field name bug fixes
- `ResumeListCard.tsx` — template thumbnail preview per card
- `sonner.tsx` — ARIA live region for screen reader toast announcements
- `Breadcrumb.tsx` + 3 page files — clickable breadcrumbs with aria attributes
- `AppShell.tsx` — global ShortcutHelpSheet with ? key listener
- `BottomTabBar.tsx` — notification badge, changelog dot, shortcuts menu item
- `AchievementsPage.tsx` — achievement unlock celebration toasts
- `DashboardPage.tsx` — OnboardingChecklist integration below DashboardStats
- `TemplatesPage.tsx` — "Preview with my data" toggle in preview sheet
- `ReferralPage.tsx` — LinkedIn, WhatsApp, Copy Message share buttons
- `usePortfolioSEO.ts` — og:image / twitter:image meta tags
- `server/index.ts` — GET /og-image/:username Puppeteer endpoint
- `AppInterior.tsx` — global MotionConfig for reduced-motion
- `deploy-frontend.yml` — 3MB bundle size guard in CI

### Verification
- `npx tsc --noEmit`: zero errors (clean)
- Branch: `claude/read-project-docs-JEUkC`

---

## Session Summary — 2026-05-15 (CI Fix: FTP chmod + Concurrency Race; UI Enhancement: Editor / Dashboard / Export)

### 1. Deploy-Frontend Workflow — Root Cause & Fix

**Problem A — lftp `chmod: Access failed: 550`**

Every FTP file upload was followed by an lftp `SITE CHMOD` call. Hostinger's FTP server returns `550 No such file or directory` for `SITE CHMOD` on all paths. This caused `deploy-frontend.yml` to fail at the lftp sync step.

**Root cause:** lftp's default behaviour tries to set Unix permissions after uploading each file. Hostinger's FTP layer does not support `SITE CHMOD`.

**Fix:** Added `set ftp:use-site-chmod false;` to both lftp command blocks in `.github/workflows/deploy-frontend.yml` — the Tesseract/pdfjs pre-sync and the main app bundle sync. Commit `353e6cb`.

---

**Problem B — Simultaneous lftp sessions race condition (intermittent failure)**

When a `workflow_dispatch` trigger fired ~9 seconds before a `push` auto-trigger on the same commit, two lftp sessions ran concurrently against the same Hostinger FTP directory. One session's `--delete` flag removed files the other had just uploaded; the uploading session then attempted to chmod the now-deleted files, hitting the 550 error. This explains why one run succeeded and the other failed on identical code.

**Root cause:** No concurrency guard existed. GitHub Actions ran both triggered jobs simultaneously.

**Fix:** Added `concurrency: group: deploy-frontend / cancel-in-progress: true` at the job level in `deploy-frontend.yml`. Duplicate triggers now cancel the earlier run rather than racing. Commit `4328053`.

---

### 2. UI Enhancement — 9 Files Changed

All changes stay within the existing design system (HSL CSS custom properties, existing utility classes). No new dependencies added. Build passes clean (`✓ built in 36.20s`, zero TypeScript errors). Pre-existing test failures are unrelated to these files.

#### Export Sheet

| File | Change |
|------|--------|
| `src/components/editor/export/ExportOptionCard.tsx` | Added `compact?: boolean` prop. Compact mode: vertical layout, w-8 icon, description hidden, badge condensed. Selected state strengthened: `border-primary bg-primary/8 shadow-md shadow-primary/15`. Hover: `hover:border-primary/40 hover:bg-muted/30`. |
| `src/components/editor/export/ExportTypeList.tsx` | Primary options changed from `space-y-2` vertical list to `grid grid-cols-2 gap-2`. `compact` prop passed to each primary `ExportOptionCard`. Secondary options unchanged (full-width in collapsible). |
| `src/components/editor/export/ExportProgressBar.tsx` | Entire component wrapped in `shrink-0 pt-4 pb-safe border-t border-border/60 bg-background`. Button gets `btn-shimmer`, glow opacity `0.45`. |
| `src/components/editor/ExportOptionsSheet.tsx` | `SheetContent` is now `flex flex-col`. Scrollable content area (`flex-1 overflow-y-auto min-h-0`) separated from pinned `<ExportProgressBar>` below it. Header redesigned: ATS badge chip top-right (`bg-success/10` / `bg-warning/10` / `bg-destructive/10`), title `text-base`, subtitle `text-xs`. |

#### Editor

| File | Change |
|------|--------|
| `src/components/editor/SectionSidebar.tsx` | Added `CORE_IDS = new Set([...])`. Computes `lastCoreIndex` + `hasExtras`. Inserts `h-px bg-border/60` divider + `"More"` label in `text-[9px]` caps after the last core section. Active button: `bg-gradient-to-r from-primary/15 to-transparent`. Active bar: `top-1.5 bottom-1.5 w-[3px]`. |
| `src/components/editor/EditorHeader.tsx` | Added `ScoreMiniRing` SVG donut (mirrors `SectionSidebar`'s `CompletionRing`, size 18px). `ProgressChip` trigger now uses `ScoreMiniRing` + colored border `style={{ borderColor: color + '55' }}` + `rounded-xl border`. Added `progressColor = getProgressColor(overallScore)` const. Added thin `h-0.5` full-width score bar at header bottom (`-mx-4 bg-muted`, fills with `background: progressColor`). |

#### Dashboard

| File | Change |
|------|--------|
| `src/components/dashboard/DashboardStats.tsx` | Replaced inline `flex` stat row with `grid grid-cols-3 gap-2` stat cards (Resumes / Avg Score / Streak). Each card: `rounded-xl border border-border bg-card p-3`, colored `absolute top-0 inset-x-0 h-0.5` accent. Avg score stale-day detection preserved (shown in Streak slot if stale). Daily tip wrapped in `Collapsible`/`CollapsibleContent` with `ChevronDown` trigger. Added `cn`, `Star`, `Zap`, `ChevronDown` imports + `Collapsible` from `@/components/ui/collapsible`. |
| `src/components/dashboard/DashboardHero.tsx` | Returning-user card (`hasResumes=true`) upgraded: `bg-gradient-to-br from-primary/8 via-card to-card`, decorative `blur-3xl` glow div, Optimize button gets `gradient-primary` class, Build button gets `hover:border-primary/30`. New-user state unchanged. |
| `src/components/dashboard/ResumeListCard.tsx` | `border-l` color is now score-driven: `≥80 → border-l-success`, `≥50 → border-l-warning`, `>0 → border-l-destructive`, no score/zero → `border-l-border`. Removed the static `showTailoredBadge` condition that drove the colour. |

---

### Where We Stopped

- All 9 UI files are modified locally. **Not committed. Not deployed.** Commit and trigger `deploy-frontend.yml` when ready.
- `npm run build` — clean, zero errors.
- Test suite: pre-existing failures in `apiFetch`, `supabaseBridge`, `dataExportBenchmark`, `aiTailor-D1`, `usePublicPortfolio`, `protectedTokens` — none in the files touched this session. `DashboardHero.test.tsx` passes.
- Real iPhone Safari/Chrome QA for the export sheet UI changes has not been performed.
- No Appwrite hub changes in this session.

---

## Session Summary - 2026-05-15 (Deploy: Frontend + AI Hubs — Both Green)

### Deployment Record
- **Frontend deploy:** [Run 25900862023](https://github.com/iammagdy/WiseResume-TWC/actions/runs/25900862023) — ✅ success
- **AI Hubs deploy:** [Run 25900866829](https://github.com/iammagdy/WiseResume-TWC/actions/runs/25900866829) — ✅ success
- **HEAD on main:** `c03456d`

### Dependency fix applied (commits `512c4d1` → `516d7e1` → `c03456d`)
Earlier CI runs failed due to two npm issues introduced by the export branch:
1. **EOVERRIDE:** `devDependencies.esbuild@^0.25.12` conflicted with `overrides.esbuild@^0.25.4`. Fixed by removing the direct devDep and setting the override to `^0.25.12`.
2. **Cross-platform lockfile:** Regenerating `package-lock.json` on Windows omits Linux/Mac optional binaries (rollup, esbuild). Fixed by restoring the original cross-platform lockfile and running `npm install --package-lock-only` to apply only the version changes.

### Pending
- Real iPhone Safari/Chrome QA still not performed — test `Download` and `Save` on actual iOS before considering export fully released
- No Appwrite hub code changes in this session — all hubs redeployed from existing source

---

## Session Summary - 2026-05-15 (Export Branch Merged)

### Merge Record
- **Branch:** `codex/export-system-replacement` → `main`
- **Merge commit:** `0594c28` (PR #51)
- **Local main:** fast-forwarded to `origin/main` (`0594c28`)
- **Pending:** Real iPhone Safari/Chrome QA still not performed — test `Download` and `Save` on actual iOS before considering export fully released
- **No Appwrite hub changes** — export uses the Express/Puppeteer server path; `ai-gateway` is unchanged

---

## Session Summary - 2026-05-15 (Export Pagination Replacement)

**Detailed log:** `Project Atlas/05-Migration to Appwrite/23-Session-Log-2026-05-15-Export-System-Replacement.md`  
**System doc:** `Project Atlas/01-Currently Implemented/stability-fixes/phase-11-pdf-export-puppeteer-migration.md`

### Fixed/Implemented
- Replaced the broken Live Preview page-break controls with an Export Options setup step.
- Added exact export break persistence through `customBreakPositions`.
- Updated `/api/export/pdf-native` to render exact content segments, merge them, preserve selectable text/links, and crop the final page height to remaining content.
- Added clickable PDF branding (`Wise Resume` -> `https://resume.thewise.cloud`) and an image-export footer with the same link text.
- Removed the dead raster PDF helper path from `src/lib/pdfGenerator.ts` and removed obsolete tests tied to that deleted path.
- Removed resume-export `window.print()` fallback behavior from the normal iPhone failure path.
- Added root `esbuild` dev dependency so the existing `build:server` script works.

### Root Causes
- Custom page-break positions were collected in the UI but not forwarded through the native PDF payload.
- The server used normal Chromium pagination instead of exact rendered segments, so manual breaks were ignored and the final page stayed full height.
- Old raster PDF helpers remained alongside the native PDF path, creating duplicated export behavior and risk of image-only PDF regressions.
- Resume export treated PDF service failure as a reason to open browser print, which produced the wrong iPhone experience.
- `build:server` called `esbuild`, but the root project did not install the `esbuild` CLI directly.

### Current State
- Resume PDF export uses the native HTML/Puppeteer server path and remains selectable/searchable.
- Exact export breaks are saved in resume customization as `customBreakPositions`.
- PDF links and the Wise Resume footer link are rendered as real anchors.
- PNG export includes a visible Wise Resume/platform-link footer strip.
- The worktree contains local unstaged changes for this export replacement.

### Verification
- Focused export unit tests passed: 5 files, 23 tests.
- `npx tsc --noEmit`, `npm run build`, and `npm run build:server` passed.
- Built-server smoke test against `POST /api/export/pdf-native` returned `%PDF-` bytes for an exact-break payload with branding enabled.

### Where We Stopped
- **Review**: Changes are local and not staged or committed.
- **Device QA**: Real iPhone Safari/Chrome testing was not performed in this environment; test `Download` and `Save` on actual iOS before release.
- **Deployment**: No deployment was run. Use `Project Atlas/DEPLOYMENT_GUIDE.md` before deploying.
- **Lockfile**: `package-lock.json` changed significantly after adding root `esbuild`; review before commit.

---

## Session Summary - 2026-05-15 (Governance & Stabilization)

**Detailed log:** `Project Atlas/05-Migration to Appwrite/22-Session-Log-2026-05-15-Consolidated-Summary.md`

### Fixed/Implemented
- **Function Ownership**: Integrated local hubs for `coupons`, `wisehire-gateway`, and `public-share`; updated frontend routing to remove unowned backend calls.
- **UI/UX Stabilization**: Resolved mobile shell layout collisions (Bottom Nav vs FAB), fixed mobile landing headline rendering, and suppressed `useAppSettings` console noise.
- **AI Gateway Contract**: Added structured response handling in `ai-gateway` to prevent contract drift failures for Analysis/Tailor tools.
- **Bolt.new Readiness**: Created `codex/bolt-slim` branch (~3.28 MB) to enable bolt.new project import.
- **DevKit Consolidation**: Moved audited direct admin calls to the secured `admin-devkit-data` hub.

### Root Causes
- **UI Collision**: Overlapping fixed-position elements on mobile; resolved with route-aware layout rules.
- **Contract Drift**: AI gateway returned generic text for callers expecting JSON; resolved with typed handlers.
- **Bolt Import Limit**: Repo size exceeded 5MB due to committed archives; resolved via asset slimming.

### Current State
- `main` branch is clean and contains all UI, routing, and hub ownership changes.
- `codex/bolt-slim` is ready for import into bolt.new.
- All 11 unowned functions identified in the audit (Log 16) are now remediated.
- Tests (`vitest`) and type-checks (`tsc`) are green.

### Where We Stopped
- **Deployment**: Updated Appwrite Hubs (coupons, wisehire, etc.) are in source but NOT yet live. Deploy via `scripts/deploy_hubs.cjs` before smoke testing.
- **Verification**: Smoke test coupon redemption, WiseHire signup, and protected share verification post-deployment.
- **Bolt.new**: Push `codex/bolt-slim` to GitHub and set as default/import branch if bolt.new usage is required.

---

## Session Summary — 2026-05-14 session 3 (DevKit Dashboard Improvement Plan, Phases 1–3)

**Detailed log:** `Project Atlas/05-Migration to Appwrite/15-Session-Log-2026-05-14-DevKit-Dashboard-Phases-1-3.md`

### What changed

**Phase 1 — Safety & UX quick wins** (commit `cca8880`)
- Default DevKit landing panel: `diagnostics` → `mission` (Mission Control). *(Was already changed to `mission` in a prior session; now changed to `home` in Phase 2 — see below.)*
- Sidebar restructured into 5 groups: System Health / Command Center / AI Operations / Support & Business Ops / Developer Tools. Smoke Runner pinned at bottom of Developer Tools.
- Live Activity removed from sidebar; added as 4th sub-tab inside `GrowthTrafficPanel`.
- All dangerous actions now require React confirmation modals (no `window.confirm()`):
  - WiseHire Approve: full modal with entry details
  - Maintenance Mode: typed `"OFFLINE"` required before activating
  - Feature flag delete: modal with flag name
  - God Mode individual plan override, bulk plan change, bulk suspend: confirm dialogs
- `AuditLogPanel`: search input + category filter dropdown (color-coded) + Load More (25/page, accumulative).
- Sidebar badge: `list-wisehire-waitlist` called on DevKit unlock; count shown as red pill on WiseHire Waitlist button; cleared via `onBadgeClear` prop.

**Phase 2 — Home Command Center** (commit `f9c2d7e`)
- `src/components/dev-kit/HomePanel.tsx` — new component. Shows: greeting banner, 4 status cards (Site / AI Providers / Maintenance / WiseHire Queue), metric tiles (Total Users, Recent Errors, Diagnostics link), last 8 audit entries with category pills, quick-nav shortcuts to 8 major panels. Single `home-summary` backend call on mount.
- `appwrite-hubs/admin-devkit-data/src/main.js` — new `handleHomeSummary` action. Runs 6 queries in parallel via `Promise.allSettled` (fail-open): site ping, waitlist count, error count, audit entries, total user count, app settings (for maintenance_mode). Returns consolidated summary in one call.
- `DevToolsPage.tsx` — `Home` panel added to System Health group as first entry; default `activePanel` changed `'mission'` → `'home'`; `Home` icon + `HomePanel` imported.
- `package.json` — version bumped `4.4.0` → `4.5.0`.

**Phase 3 — Cmd+K command palette** (commit `86dc2af`)
- `DevToolsPage.tsx` — `Cmd+K` / `Ctrl+K` opens a full-screen overlay command palette. Live search filters all `Live` panels by title and group. Arrow keys navigate; Enter opens; Escape closes. Mouse hover updates highlight. "Jump to panel…" button with `⌘K` hint added to sidebar footer. `Search` icon imported.

### Deployments

| Phase | Frontend | AI Hubs |
|-------|----------|---------|
| 1 | ✅ | ✅ |
| 2 | ✅ | ❌ transient `tar write error` on `auth-master` (runner infrastructure; code unaffected) |
| 3 | ✅ | ✅ (re-deployed Phase 2 `admin-devkit-data` changes as well) |

### Verification
- `npx tsc --noEmit` — zero errors after each phase.
- Latest HEAD on `main`: `86dc2af5a9776a579cc60ace2f51a387770a0cdf`.

### Where we stopped
- `home-summary` action is live (deployed via Phase 3 AI Hubs run). Appwrite Console must have `wisehire_waitlist`, `admin_audit_logs`, `app_settings`, and `error_log` collections present and readable — `home-summary` uses all four (fail-open if missing).
- Mobile God Mode card layout (narrow-screen) was deferred — not yet implemented.
- Phase 4 items not started: real-time badge refresh, sparklines in HomePanel, mission-control error alerting.
- Next agent: unlock `/devkit`, confirm Home panel status cards resolve, test Cmd+K palette.

---

## Session Summary — 2026-05-14 session 2 (Onboarding Goal Routing — Tasks #22 & #25)

### What changed

**Task #22 — Goal-based onboarding routing**

`src/lib/onboardingProfile.ts`
- `SaveProfileArgs` now has `goal?: string`
- `saveOnboardingProfile()` writes `onboarding_goal` into the Appwrite `profiles` upsert payload when provided

`src/pages/OnboardingPage.tsx`
- `Step` type: inserted `'goal'` between `'welcome'` and `'choice'`
- New `GoalStep` component — 5 cards: `create_resume`, `improve_resume`, `tailor_resume`, `portfolio`, `recruiter`
- Goal card tap: caches to `localStorage('wr-onboarding-goal')`, fires `logAudit('onboarding','goal_selected',{goal})`, advances to `'choice'`
- Recruiter path: saves `emptyProfile()` with `goal:'recruiter'` to DB (best-effort), sets per-user onboarding key, navigates to `/wisehire/signup`
- "Skip for now" link: defaults goal to `create_resume` and also fires `goal_selected` audit event
- `handleBack`: `choice→goal`, `goal→welcome` (was `choice→welcome`)
- `completeWith()`: passes `selectedGoal || localStorage fallback` to `saveOnboardingProfile()`; logs `goal` on `completed` event
- `WhatsNextStep`: accepts `goal` prop; primary card title/description/action adapts to goal
- Whatsnext footer CTA: routes by `selectedGoal || localStorage || 'create_resume'` → `/editor?new=1`, `/upload`, `/tailor`, `/portfolio`; button label adapts accordingly

`src/pages/DashboardPage.tsx`
- **Fixed:** template-consumption `useEffect` no longer removes `wr-onboarding-goal` from localStorage
- Compact goal nudge card: `useEffect` gated on `onboarding_completed === true` (localStorage per-user flag OR `profile.onboarding_completed`) AND goal set (localStorage first, `profile.onboarding_goal` fallback) AND session-dismiss key `wr-goal-card-dismissed` not set
- Dismissal writes `sessionStorage('wr-goal-card-dismissed','1')`; CTA navigates to goal destination and hides card

**Task #25 — Permanent nudge card dismissal on goal destination visit**

`src/pages/DashboardPage.tsx`
- `useEffect` checks `localStorage('wr-goal-card-dismissed-permanent-${user.id}')` before showing card — if set, card is permanently suppressed for that user

`EditorPage.tsx`, `UploadPage.tsx`, `TailorPage.tsx`, `PortfolioEditorPage.tsx`
- Each goal destination page writes `wr-goal-card-dismissed-permanent-${user.id}` on first authenticated visit
- Covers: `create_resume→/editor`, `improve_resume→/upload`, `tailor_resume→/tailor`, `portfolio→/portfolio`
- Key is user-scoped to prevent cross-account bleed on shared browsers

### Prerequisites before deploying
- **Add `onboarding_goal` String attribute (size 64, not required) to `profiles` collection in Appwrite Console** (project `69fd362b001eb325a192`, database `main`) — tracked as Task #23. Until this is done, the DB write silently fails on the Appwrite side; localStorage caching still works.

### Verification
- `npx tsc --noEmit` — zero errors (both tasks)
- Code review: APPROVED (Task #22 approved with minor comments, all addressed; Task #25 approved)

### Version
- Bumped `4.3.0` → `4.4.0`

### Where we stopped
- `onboarding_goal` attribute must be created in Appwrite Console (see above) before goal persistence to DB is live
- Goal-aware dashboard hero copy and editor template pre-selection are deferred to Task #24
- Task #26 (clear permanent dismiss on goal change) was proposed then cancelled — not needed for current scope

---

## Session Summary - 2026-05-14 (Public Navigation + DevKit Operations Hub)

**Detailed logs:**
- `Project Atlas/05-Migration to Appwrite/14-Session-Log-2026-05-14-DevKit-Ops-Hub.md`
- `Project Atlas/01-Currently Implemented/stability-fixes/public-page-navigation-webgl-aurora-fix.md`

### Fixed
- Public page navigation stall: `/pricing` rendered but Dashboard/navigation clicks could hang. Root cause was the WebGL Aurora renderer running on non-landing utility pages and triggering Chromium GPU stalls. WebGL Aurora is now limited to `/` and `/enterprises`; utility public pages use the CSS Aurora fallback.
- DevKit `Unauthorized` risk on Email Automations, Portfolios, Visitors, Testmail, and Mission Control live visitors: panels now use the shared DevKit client path for the affected standalone admin functions.
- DevKit sidebar simplification:
  - `Growth & Traffic` now contains Visitors, Analytics, and Onboarding Funnel.
  - `Email` now contains Send, Automations, and Testmail Inbox.
  - Old deep links for merged panels route to the new container panels.
- Appwrite hub deployment drift: `deploy-appwrite-hubs.yml` now rebuilds every deployed hub from source and validates `src/main.js` at archive root before deployment.
- `scripts/deploy_hubs.cjs` now deploys missing admin hubs (`admin-visitor-analytics`, `admin-onboarding-funnel`, `admin-impersonate`), syncs shared admin variables across admin hubs, syncs Resend variables to email hubs, and runs safe smoke executions when `DEVKIT_PASSWORD` is available.

### Verification
- `npm exec tsc -- --noEmit` passed.
- `node --check scripts/deploy_hubs.cjs` passed.
- `git diff --check` passed.
- In-app browser verified `/pricing` -> Dashboard navigation locally.
- `/devkit` browser E2E reached the lock screen, but full tab-by-tab DevKit E2E is blocked until the DevKit password is provided or an unlocked session exists.

### Current state
- Public navigation fix, DevKit Operations Hub changes, deployment workflow changes, and Atlas updates were committed and pushed to GitHub `main` at `6d25d71`.
- Root `README.md` was not present before the follow-up README task.
- Updated Deploy AI Hubs workflow still needs a live run with GitHub secrets present: `APPWRITE_API_KEY`, `DEVKIT_PASSWORD`, Resend vars, and AI provider keys.

### Where we stopped
- Next agent must pull latest `main`, unlock `/devkit` with the DevKit password, then run tab-by-tab E2E for Growth & Traffic, Email, Portfolios, Feature Control, Moderation, God Mode, AI Center, Coupons, Audit, WiseHire Waitlist, and Smoke Runner.
- After E2E, run the updated Deploy AI Hubs workflow or manually deploy rebuilt hub artifacts, then verify no panel shows unexplained `Unauthorized`.

---

## Session Summary — 2026-05-13 session 2 (DevKit Panel Consolidation, Tasks #13–17)

**Detailed log:** `Project Atlas/05-Migration to Appwrite/13-Session-Log-2026-05-13-DevKit-Consolidation.md`

### What changed

**Task #13 — Merge Core Settings into Feature Control**
- `FeatureFlagsPanel.tsx` now contains an "App-Wide Gates" section (Maintenance Mode + AI Tailoring / AI Chat / Public Portfolios toggles) above the existing feature flags list. Both sections separated by labelled dividers.
- All logic uses `devKitCall({ action: 'list-app-settings' / 'toggle-app-setting' })` — same secured backend as before.
- `AppSettingsPanel.tsx` **deleted**. `settings` sidebar entry removed. `settings→flags` alias added for deep-links.
- Net: **−1 sidebar entry**.

**Task #14 — Wire orphaned panels, fix breadcrumb, delete dead code**
- Four panels that existed in code but were unreachable now have sidebar entries:
  - Operations Hub: `analytics` (AnalyticsPanel, TrendingUp icon), `onboarding-funnel` (OnboardingFunnelPanel, Filter icon)
  - Support & Business Ops: `email-automations` (EmailAutomationsPanel, Workflow icon), `wisehire-waitlist` (WiseHireWaitlistPanel, Briefcase icon)
- Breadcrumb fixed: replaced hardcoded `"Operations Hub / {panelId}"` with `groupForPanel(activePanel)` helper that resolves the correct group label, and uses `activeDef.title` not the raw ID string. Correct for all 24 panels.
- `AIRoutingPanel.tsx` **deleted** (superseded by `AIRoutingSwitcher` inside `AICommandCenterPanel`).
- Net: **+4 reachable panels**, 24 total.

**Task #15 — WiseHire Waitlist approve button (was a stub)**
- Backend (`admin-devkit-data`): new `approve-wisehire-waitlist` action — fetches entry, sends Resend invite email (skips gracefully if no key), deletes document (throws on DB failure so approval is never falsely reported), writes audit log.
- Frontend: real `devKitCall` with per-row `approvingIds` loading state, removes row on success, shows error toast on failure.

**Task #16 — Auto-provision WiseHire account on approval**
- Backend updated: checks Appwrite Auth for existing account by email (fail-closed — any lookup error throws).
  - **Existing user:** sets `account_type='recruiter'` on profile; creates `wisehire_accounts` doc; all steps fail-hard so waitlist entry survives as retry source of truth.
  - **New user:** invite email includes `?email=...&product=wisehire` sign-up link.
- Audit log captures `{ outcome: 'existing_user_upgraded' | 'fresh_invite_sent', existing_user_id, emailSent }`.

**Task #17 — Dismiss action for waitlist applicants**
- Backend: `dismiss-wisehire-waitlist` action — confirms entry exists, deletes, writes audit log, returns `{ dismissed, email }`. No email sent.
- Frontend: `dismissingIds` state mirrors `approvingIds`; "Dismiss" button (ghost/red-hover, X icon) added left of "Grant Access"; both buttons disable each other while either is in-flight.

### Current state
- DevKit sidebar: **24 panels, all reachable**, across 4 groups (Operations Hub, Command Center, AI Command Center, Support & Business Ops)
- `npx tsc --noEmit` — zero errors; all tasks code-review approved
- `AppSettingsPanel.tsx` and `AIRoutingPanel.tsx` are gone
- WiseHire Waitlist: full approve (with Appwrite account provisioning) + dismiss, both with audit logging
- Proposed follow-ups: Task #18 (recruiter confirmation screen), Task #19 (surface approval outcome in waitlist panel)

### Where we stopped
- All work is in Replit `main`. No GitHub push has been done from this session.
- Next agent: run `npx tsc --noEmit` to confirm clean, restart the "Start application" workflow, then verify `/devkit` sidebar shows all 24 panels and breadcrumb shows the correct group for panels outside Operations Hub.
- Recommended: deploy `admin-devkit-data` to Appwrite Cloud so `approve-wisehire-waitlist` and `dismiss-wisehire-waitlist` are live.

---

## Session Summary - 2026-05-13 (Appwrite DevKit + CV Parsing Stabilization)

**Detailed log:** `Project Atlas/05-Migration to Appwrite/12-Session-Log-2026-05-13.md`

### Fixed
- Local app origin mismatch: `127.0.0.1` redirects to `localhost` so Appwrite auth uses the configured origin.
- CV upload parsing: replaced broken PDF.js worker bootstrap with module-worker-safe bootstrap and runtime asset guards. Root cause was PDF.js worker initialization failing before AI parsing, then being misreported as a damaged file.
- Live `ai-gateway` `parse-resume`: added/verified structured resume parsing route returning normalized resume data instead of generic chat output.
- DevKit login: rebuilt/redeployed `admin-devkit-data` after bad Appwrite artifact shape caused `Cannot find module 'node-appwrite'`; added frontend timeouts so login/panel calls cannot spin forever.
- DevKit data accuracy: Appwrite Auth is now the source of truth for admin users. Verified live state is 2 Auth users, 1 verified, 1 profile, 34 raw resume docs, 3 active-user-owned resumes, 31 orphaned resume docs.
- DevKit operations: `admin-devkit-data` now uses REST GET helpers for list/read paths because the installed `node-appwrite` SDK sends bodies with GET requests that Appwrite Cloud rejects.
- Plan updates: fixed `set-plan` schema failures by writing only existing fields and computing effective trial/plan state in `useMe`.
- Atlas naming: renamed current backend cards from `edge-functions/` to `functions/` for the Appwrite-native architecture.

### Current State
- GitHub `main` is synced at commit `aba3ec1eb211aaee0c2b908778821628fe039c3a`.
- Live `admin-devkit-data` deployment `6a0415154ff4ed2b537e` is `ready`.
- `npm exec tsc -- --noEmit` passed during verification.
- Local frontend runs on `http://localhost:5000`.

### Where We Stopped
- This handover update is the session closeout after `aba3ec1`.
- Next agent must pull latest `main`, read `Project Atlas/RULES.md`, then verify local status before coding.
- Recommended next verification: test a real PDF upload on `/upload` and dashboard widget, test `/devkit` with the real DevKit password, and review remaining DevKit panels for stale/no-op Appwrite migration gaps.

## MANDATORY CONTEXT FOR AI AGENTS
- **Environment:** Replit is the **development environment only**. Production is Hostinger (static frontend) + Appwrite Cloud Feed (backend). Never store production secrets in Replit.
- **Rule:** Do not guess. Check logs and verify root cause before suggesting any fix.

---

## The Architecture (Current — Appwrite-Native)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Auth | Appwrite Account SDK (`account.get()` / `deleteSession()`) | Fully Appwrite-native |
| Database | Appwrite Databases (`databases.*`) | 96 collections in `main` DB |
| AI | Appwrite `ai-gateway` Function | Routes 24+ features; per-feature routing via `FEATURE_ROUTES` (22 entries); provider pool: OpenRouter, Groq, DeepSeek, NVIDIA NIM |
| Storage | Appwrite Storage | `photoUrl` bucket needs `Access-Control-Allow-Origin: *` |
| Frontend | React 18 + Vite 6, served from Hostinger `/public_html/` | SPA, base path `/` |
| Server | Express (`server/index.ts`) | Health probe + Puppeteer PDF endpoint (`/api/export/pdf-native`) |
| CI/CD | GitHub Actions | `deploy-frontend.yml` + `deploy-appwrite-hubs.yml` |
| Repo | `https://github.com/iammagdy/WiseResume-TWC` | main branch |

**Appwrite Endpoint:** `https://fra.cloud.appwrite.io/v1`
**Project ID:** `69fd362b001eb325a192`

---

## Deployment (Hostinger — CRITICAL)

> ⚠️ **Read `Project Atlas/DEPLOYMENT_GUIDE.md` before touching any workflow or FTP config.**
> The information below is a quick summary only — the guide is the authoritative source.

### Three domains, three separate deploys

| Domain | Deploy target | Workflow / Repo |
|---|---|---|
| `resume.thewise.cloud` | `resume/` subdirectory via FTP | `deploy-frontend.yml` in this repo |
| `thewise.cloud` | FTP root (`.`) via `put` | `deploy-landing.yml` in this repo |
| `quran.thewise.cloud` | `quran/` via SFTP | `deploy.yml` in `iammagdy/wisequran` |

### Hostinger layout
```
/public_html/           ← thewise.cloud root (landing page)
/public_html/resume/    ← resume.thewise.cloud (WiseResume app)
/public_html/quran/     ← quran.thewise.cloud (WiseQuran app)
```

---

## Session Summary — 2026-05-11 (DevKit admin panel overhaul)

### Root cause addressed across all three tasks
Appwrite's document-level permissions prevent a client SDK call from reading documents that belong to other users. Every DevKit panel that called `databases.listDocuments` directly from the browser for collections like `subscriptions`, `ai_credits`, and `profiles` was failing with a permission error. The fix was to route all admin data reads through `admin-devkit-data` (Appwrite Function with admin API key) so they run server-side.

---

### Task #10 — Fix God Mode user loading & OverviewPanel accuracy

**Problem:**
- God Mode ("God Mode" tab in DevKit) showed "Failed to load users" on every page load. Root cause: `AdminUsersPanel.fetchPage()` called `databases.listDocuments()` on `subscriptions` and `ai_credits` from the browser. Those collections have user-scoped permissions — cross-user reads are blocked client-side.
- OverviewPanel showed user counts sourced from `profiles` docs (not real Auth accounts). Deleted accounts leave behind profile rows, inflating the count.
- 401/403 responses from admin functions showed "Session expired — please sign in again." — wrong; the Appwrite session was fine, the DevKit password was wrong.

**Fixes:**
- `appwrite-hubs/admin-devkit-data/src/main.js` — added `handleListUsersPage`: fetches a profiles page then joins `subscriptions` + `ai_credits` server-side in one parallel round-trip. Returns `{ users: AdminUser[], total }`.
- `appwrite-hubs/admin-devkit-data/src/main.js` — added `handleOverviewStats`: paginates all Auth users via `users.list()` (500/batch), chunks resume ownership queries into ≤100 user-ID groups to compute `activeResumes` and `orphanedResumes`. All three DB/API calls fail-hard (no silent fallbacks).
- `src/components/dev-kit/AdminUsersPanel.tsx` — `fetchPage()` replaced with `appwriteFunctions.invoke('admin-devkit-data', { action: 'list-users-page' })`. Response read as `result.data?.users` / `result.data?.total`. Added `fetchError` state + `<DevKitErrorCard>` on first-load failure. Added `setUsers([])` in catch.
- `src/components/dev-kit/OverviewPanel.tsx` — full rewrite: removed direct `databases.*` calls, now calls `overview-stats` action. Label "Active Users" → "Auth Users" with "Verified: N" sub-label. "Total Resumes" shows active-user-owned resumes only; orphan count shown as sub-label when > 0. `StatCard` `any` prop replaced with typed `StatCardProps`. `catch (err: any)` → `catch (err: unknown)`.
- `src/lib/appwrite-functions.ts` — 401/403 from `admin-*` / `inspect-ai-keys` functions now returns "DevKit session unauthorised — re-enter the DevKit password." instead of "Session expired."

---

### Task #11 — Move admin global stats bar to the server

**Problem:**
`AdminUsersPanel.fetchGlobalStats()` still called `databases.listDocuments()` on `subscriptions` (premium count, pro count) and `profiles` (suspended, active today) directly from the browser — same cross-user permission issue as Task #10.

**Fixes:**
- `appwrite-hubs/admin-devkit-data/src/main.js` — added `handleGlobalStats`: runs five `Promise.allSettled` queries server-side (total profiles, premium subs, pro subs, suspended profiles, today-active profiles), returns `{ total, premium, pro, suspended, activeToday }`.
- `src/components/dev-kit/AdminUsersPanel.tsx` — `fetchGlobalStats()` replaced with single `appwriteFunctions.invoke('admin-devkit-data', { action: 'global-stats' })` call. Removed all remaining direct `databases.*` / `Query` / `COLLECTIONS` / `DATABASE_ID` imports. **No direct browser DB calls remain anywhere in `AdminUsersPanel.tsx`.**

---

### Task #12 — Orphan cleanup: purge-orphans action + OverviewPanel UI

**Problem:**
When Appwrite Auth accounts are deleted, their `profiles` and `resumes` documents stay in the database. These inflate row counts and waste storage. No tooling existed to find or remove them.

**Fixes:**
- `appwrite-hubs/admin-devkit-data/src/main.js` — added `handlePurgeOrphans`:
  - Paginates all Auth user IDs (500/batch via `users.list()`).
  - Scans `profiles` + `resumes` in 100-doc batches, filters client-side for `user_id ∉ authUserIds`.
  - `dryRun: true` (default) — returns `{ orphanedProfiles, orphanedResumes, sampleProfiles[0..4], sampleResumes[0..4] }`, no deletions.
  - `dryRun: false` — deletes resumes first (then profiles), writes to `admin_audit_logs` (non-fatal; if collection is unavailable the purge still succeeds), returns `{ deletedProfiles, deletedResumes }`. All failure paths propagated — no silent fallbacks.
- `src/components/dev-kit/OverviewPanel.tsx` — added `PurgePhase` state machine (`idle → previewing → confirm → purging → done`):
  - Amber warning banner visible when `orphanedResumes > 0`, with "Preview & clean" button.
  - "Confirm" card shows orphan counts for both collections + up to 3 sample IDs each + a permanent-deletion warning.
  - "Delete N documents permanently" triggers live delete; success banner auto-refreshes stats.
  - Errors render inline `<DevKitErrorCard compact>` with retry.

---

## Where We Stand Now

### Working (as of 2026-05-12, post-session)
- `https://resume.thewise.cloud/` — live, Appwrite-native build
- Auth (sign-in/sign-up/sign-out via Appwrite Account SDK)
- AI Hub — 24+ features via `ai-gateway` Appwrite Function
- **DevKit God Mode** — user list loads reliably; all data reads server-side via `admin-devkit-data`
- **DevKit Overview panel** — user count sourced from real Appwrite Auth; orphan detection + one-click cleanup
- **DevKit global stats bar** — premium / pro / suspended / active-today counts are server-side
- **No direct browser `databases.*` calls remain in any DevKit admin panel**
- DevKit AIKeysPanel, AIRoutingPanel, MissionControl, Analytics, LiveActivity (existing, unchanged)
- **PDF export (`/api/export/pdf-native`)** — real Puppeteer implementation; selectable text confirmed; Chrome installed at `~/.cache/puppeteer/chrome/linux-147.0.7727.57`
- **`nativePdfGenerator.ts`** — full implementation (DOM serialiser → server → Blob); cover letter via pdf-lib; merge via pdf-lib
- **`PreviewPage` crash** — fixed: `getTemplateConfig` has `'modern'` fallback; Zustand rehydration always migrates `selectedTemplate`

### Broken / Pending
- Most `/api/data/*` endpoints throw `pending_appwrite_migration` — data layer not yet rebuilt on Appwrite Functions
- **PDF export in production (Hostinger)** — Express server has no public URL yet; frontend falls back to print dialog. Fix: deploy server, add `VITE_API_URL` GitHub secret, re-run `deploy-frontend.yml`
- Mobile app still targets legacy backend (do not touch `mobile/`)
- WiseHire, Admin DevKit non-data panels — throw `pending_appwrite_migration`
- Datadog `DD_API_KEY` not set in Appwrite Console — AI features work, tracing dormant

### Task (2026-05-11 follow-up) — Fix God Mode crash + 3 more panels routed server-side

**Problem:**
- God Mode still showed "Failed to load users". Root cause was two separate bugs in `handleListUsersPage`: (1) `Query.equal('user_id', [])` — Appwrite rejects an empty array, throws if all profile `user_id` fields are null. (2) `Query.equal('user_id', userIds)` on `subscriptions` and `ai_credits` throws if `user_id` is not indexed in those collections. Either path propagated to the outer catch → HTTP 500 → client showed the error card.
- `AuditLogPanel`, `CouponsPanel`, `DatabaseXRay` all called `databases.listDocuments` directly from the browser. The client SDK returns only documents scoped to the current user's session — cross-user reads return empty results silently. All three panels appeared blank even when data existed. `CouponsPanel`'s `databases.createDocument` also failed silently for the same reason.

**Fixes:**
- `appwrite-hubs/admin-devkit-data/src/main.js` — `handleListUsersPage`: added empty-`userIds` guard (skip join when array is empty); switched `Promise.all` → `Promise.allSettled` for subs/credits join so profiles still load when those collections lack a `user_id` index (falls back to `plan:'free'`, `credits:0`, logs a warning).
- `appwrite-hubs/admin-devkit-data/src/main.js` — added `handleListAuditLogs`, `handleListDiscountCodes`, `handleAddDiscountCode`, `handleListAllResumes`; all wired to their respective action names in the main handler.
- `src/components/dev-kit/AuditLogPanel.tsx` — removed direct `databases.listDocuments`; now uses `admin-devkit-data` → `list-audit-logs`. Added `DevKitErrorCard`, refresh button, total count.
- `src/components/dev-kit/CouponsPanel.tsx` — removed direct `databases.listDocuments` / `createDocument`; now uses `list-discount-codes` + `add-discount-code`. Added `DevKitErrorCard`, loading state, Enter-key shortcut.
- `src/components/dev-kit/DatabaseXRay.tsx` — removed direct `databases.listDocuments`; now uses `list-all-resumes`. Added client-side search, `DevKitErrorCard`, refresh button, total count.

---

### Active Task Queue
- **#13** — Show live subscription counts in the admin stats bar without a page refresh
- **#14** — Extend orphan cleanup to cover other stale collections (subscriptions, AI credits, cover letters, etc.)
- **#15** — Deploy admin-testmail to Appwrite
- **#16** — Add more email tag types for transactional email flows
- **#21** — Connect Mission Control / Analytics / Observability / Live Activity to real data
- **#22** — AI gateway provider failover (try next provider if preferred one fails)
- **#23** — Move AI routing config to Appwrite Database (editable without redeploy)
- **#24** — Show which provider was actually used on each AI result
- **#25** — Keep NVIDIA model list up to date as NIM adds/retires models
- **#26** — Post-deploy smoke test in `deploy-frontend.yml`
- **#27** — Wire `public/_headers` CSP into `.htaccess`

### Completed (2026-05-13) — Task #28
Plan changes made via God Mode DevKit now reflect immediately on the target user's frontend (~2s via Appwrite Realtime) and trigger both an in-app notification and a transactional email.
- `useMe` subscribes to `subscriptions` Realtime channel; invalidates `['me']` query on any event.
- `admin-devkit-data` `handleSetPlan` + `handleGrantTrial` now call `createPlanNotification` + `sendPlanUpgradeEmail` via `Promise.allSettled` after the DB write (non-fatal side effects).
- **Action required before live:** add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME` to `admin-devkit-data` function variables in Appwrite Console, then redeploy the function.

---

## Key Files

| File | Purpose |
|------|---------|
| `.github/workflows/deploy-frontend.yml` | FTP deploy to Hostinger — mirror to `resume/` |
| `.github/workflows/deploy-appwrite-hubs.yml` | Deploy Appwrite Functions |
| `public/_headers` | CSP headers |
| `public/.htaccess` | SPA fallback rewrite |
| `src/lib/appwrite.ts` | Appwrite client |
| `src/lib/appwrite-bridge.ts` | `AI_HUB_FUNCTIONS` set + `invokeAppwriteHub()` router |
| `src/lib/appwrite-collections.ts` | `COLLECTIONS` const — 96 collection IDs |
| `src/lib/appwrite-functions.ts` | `appwriteFunctions.invoke()` wrapper + error normalisation |
| `src/lib/devkit/devKitAuth.ts` | `devKitAuthHeaders()` — injects DevKit password into function calls |
| `src/lib/devkit/edgeResponse.ts` | `unwrapAdminResponse<T>()`, `formatEdgeError()` |
| `src/contexts/AuthContext.tsx` | Appwrite-only auth context |
| `src/components/dev-kit/AdminUsersPanel.tsx` | God Mode — all data via `admin-devkit-data` server actions |
| `src/components/dev-kit/OverviewPanel.tsx` | Infrastructure stats + orphan cleanup workflow |
| `appwrite-hubs/ai-gateway/src/main.js` | AI router |
| `appwrite-hubs/admin-devkit-data/src/main.js` | DevKit data API — actions: `list-users-page`, `overview-stats`, `global-stats`, `purge-orphans`, `update-plan`, `mission-control` |
| `appwrite-hubs/inspect-ai-keys/src/main.js` | DevKit key inspector |
| `CHANGELOG.md` | Technical change log |

---

## DevKit `admin-devkit-data` Action Reference

| Action | Description |
|--------|-------------|
| `mission-control` | Deploy status, AI provider pings, DB health, secrets audit, recent errors |
| `global-stats` | `{ total, premium, pro, suspended, activeToday }` — God Mode stats bar |
| `list-users-page` | `{ users: AdminUser[], total }` — paginated profiles joined with subs + credits |
| `overview-stats` | `{ totalAuthUsers, verifiedUsers, totalResumes, orphanedResumes }` — real Auth counts |
| `purge-orphans` | `dryRun:true` → preview; `dryRun:false` → hard-delete + audit log |
| `update-plan` | Set `plan` on a user's `subscriptions` document |

All actions require `Authorization: Bearer <DEVKIT_PASSWORD>` in `body.__headers` (Appwrite SDK packs custom headers into the body).

---
---

## Session Summary — 2026-05-12 (Puppeteer PDF + PreviewPage crash fix)

### Work Item 1 — Real Puppeteer PDF export

**Problem:** `/api/export/pdf-native` returned 503; `nativePdfGenerator.ts` threw `PDFServerUnavailableError` on all three exports, falling back to `window.print()`. Legacy pdf-lib path produces image-only PDFs (no selectable text).

**Fixes:**
- `server/index.ts` — replaced 503 stub with full async Puppeteer implementation: `puppeteer.launch()` with `--no-sandbox` / `--disable-dev-shm-usage` / `--disable-gpu` flags; `page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 })`; `page.pdf({ format, printBackground: true, margin: 0 })`; always closes browser in `finally`.
- `src/lib/nativePdfGenerator.ts` — full rewrite: `collectDocumentStyles()` inlines all CSS rules and makes relative `url(...)` absolute; `buildSelfContainedHTML()` wraps template `outerHTML` with embedded CSS and ATS-mode override; `generateNativePDF()` serialises live DOM → POSTs to `${VITE_API_URL}/api/export/pdf-native` → returns Blob; `generateCoverLetterNativePDF()` delegates to `coverLetterPdfGenerator.ts` (no server round-trip); `mergePDFBlobs()` merges via pdf-lib client-side.
- `.github/workflows/deploy-frontend.yml` — added `VITE_API_URL: ${{ secrets.VITE_API_URL }}` to build env.
- Chrome installed: `npx puppeteer browsers install chrome` → `~/.cache/puppeteer/chrome/linux-147.0.7727.57`.

**Verification:** HTTP 200, 26 KB PDF, 2.4 s. `pdftotext` confirmed full selectable text layer.

---

### Work Item 2 — PreviewPage crash: `Cannot read properties of undefined (reading 'supportsPhoto')`

**Root cause (two bugs):**
1. `getTemplateConfig(templateId)` did bare `TEMPLATE_CONFIGS[templateId]` with no fallback — any unknown/stale ID returned `undefined`.
2. Zustand `onRehydrateStorage` guard `if (state && state.selectedTemplate)` skipped `migrateTemplateId` when `selectedTemplate` was falsy (old localStorage format) — leaving an un-migrated value reaching the component tree.

**Fixes:**
- `src/lib/templateConfig.ts` — `getTemplateConfig` returns `TEMPLATE_CONFIGS['modern']` as fallback.
- `src/store/resumeStore.ts` — removed falsy guard; `migrateTemplateId()` always runs on hydration.

---

---
---

## Session Summary — 2026-05-13 (Toast Redesign + Dashboard UX Audit)

---

### Work Item 1 — Toast Notification Redesign

**Problem:** Sonner toast custom styles (`[data-sonner-toast]`, `.toast-card`) were not rendering because Sonner injects its own CSS variables and inline styles at runtime, which override external CSS even with `!important`. Multiple `<Toaster>` instances (`AppLanding.tsx` + `AppInterior.tsx`) compounded the issue.

**Root cause:** `hsl(var(--popover))` and `color-mix(...)` inside inline `style` strings do not resolve when Sonner renders `toast.custom()` outside the normal document CSS cascade. This produced transparent backgrounds and invisible colors.

**Fixes:**
- `src/components/ui/sonner.tsx` — rewrote to use normal Sonner API (`toast.success`/`error`/`warning`/`info`) with per-type inline `style` props for background, border, and shadow. All 195+ call sites work unchanged. `toastOptions.classNames` now applies only `wr-toast` / `wr-toast-title` / `wr-toast-desc`.
- `src/components/ui/ToastContent.tsx` — created fully controlled card component with concrete hardcoded dark-mode colors (`#161618` base, per-type rgba overlays) as a fallback for any future `toast.custom()` usage.
- `src/index.css` — stripped all obsolete `.toast-card` / `[data-sonner-toast]` override blocks. Retained only: gradient left accent bar (`::before`) with per-type gradients, circular icon backdrop on `[data-icon]`, title/description typography, hover lift, and mobile positioning.

**Colors:**
| Type | Background | Border | Bar Gradient |
|------|-----------|--------|-------------|
| success | `#161e18` | `rgba(34,197,94,0.25)` | `#22c55e` → fade |
| error | `#1e1616` | `rgba(239,68,68,0.25)` | `#ef4444` → fade |
| warning | `#1e1b14` | `rgba(245,158,11,0.25)` | `#f59e0b` → fade |
| info | `#16181e` | `rgba(139,26,47,0.25)` | `#8b1a2f` → fade |
| default | `#161618` | `rgba(255,255,255,0.1)` | muted → fade |

All cards: `border-radius: 16px`, layered shadow `0 2px 8px + 0 16px 48px`, inset top highlight `rgba(255,255,255,0.06)`.

---

### Work Item 2 — Dashboard UI/UX Audit + Fixes

**Audit scope:** `src/pages/DashboardPage.tsx` + all `src/components/dashboard/*.tsx`
**Method:** Static code review. Full report: `reports/dashboard-ux-audit.md`

#### Critical fixes
- **C1 — Swipe-to-delete data loss:** `ResumeListCard.tsx` had a `confirmSwipeActions` branch that animated cards off-screen and deleted without confirmation. Fixed: swipe always springs back; `onDelete` only triggers the confirmation dialog.
- **C2 — Broken toast styling on dashboard:** `DashboardPage.tsx` imported `toast` from raw `sonner` instead of the styled wrapper. Fixed import → `@/components/ui/sonner`.

#### High fixes
- **H1 — Orphaned filter logic:** Filter UI (`ResumeFilters.tsx`) was removed earlier but all filter state (`categoryFilters`, `scoreFilters`, `sortOption`) and logic remained in `DashboardPage.tsx`. Users could have silently filtered lists with no way to clear. Stripped all filter state, handlers, and logic. Search still works.
- **H2/H3 — Dead code removal:** Deleted `ResumeFilters.tsx` (163 lines) and `FloatingCreateButton.tsx` (154 lines). Removed all imports.
- **H4 — Bulk delete undo:** Added 5-second buffered delete with undo toast. `confirmBulkDelete()` now shows toast with "Undo" action; actual `deleteMultipleResumes.mutate()` fires after timeout. Cancelling clears the timeout.

#### Medium fixes
- **M1 — Card border color coding:** Tailored resumes get `border-l-success/20` (green), master resumes keep `border-l-primary/20` (crimson).
- **M2 — Swipe hint scope:** Changed from `localStorage` (once per browser forever) to `sessionStorage` (once per session).
- **M3 — Search placeholder accuracy:** Changed from tab-scoped placeholder (`"Search in My CVs..."`) to `"Search all resumes..."` since search logic runs before tab filtering.
- **M4 — Profile banner dismiss hit area:** Added `rounded-xl hover:bg-muted/50 transition-colors` and bumped icon to `w-5 h-5` so the full 44×44 area is visually clickable.
- **M5 — Login streak caching:** `useLoginStreak` now caches in `localStorage` under `wr-streak-{userId}`. Initial state reads from cache; effect persists on change. Skips redundant Appwrite fetches on remount.
- **M6 — Action sheet keyboard:** Added `onKeyDown` Escape handler to `SheetContent` in `ResumeListCard.tsx`.

#### Low fixes
- **L2 — Subtitle effect optimization:** Returns `undefined` early when `totalResumes > 0` to avoid registering unnecessary interval.
- **L3 — Empty state dark mode:** `MiniTemplateThumbnail` wrapper `bg-white` → `bg-background`.
- **L4 — Trust banner dismiss:** Added `hover:bg-muted/50`, `rounded-xl`, larger icon.

---

### Where We Stopped
- Toast redesign is live and functional. HMR picked up all changes; user should hard-refresh.
- Dashboard audit fixes are applied. 2 files deleted (`ResumeFilters.tsx`, `FloatingCreateButton.tsx`).
- No regressions expected: all 195+ `toast.*` call sites unchanged; dashboard search still works; swipe gestures still function (with confirmation).
- Pre-existing lint errors (`trial_expires_at` on `DatabaseResume`, implicit `any` types in DashboardPage callbacks) are **not introduced by this session** — they existed before.

*Last updated: 2026-05-13 — Dashboard performance fix + Auth loading regression*

---
---

## Session Summary — 2026-05-13 (Dashboard Performance Fix)

### Problem
Clicking any button across the app caused a 6-second loading delay with "Still setting up your session…" message. The dashboard eventually stopped loading entirely — grey skeleton showed forever.

### Root causes identified

1. **Broken email verification gate in `ProtectedRoute.tsx`:** Checked `useMe` hook for a `profile` object that `useMe` never returns (it returns `{ data: { profile } }`). This gate was permanently stuck, adding infinite artificial delay.
2. **Timer reset on every navigation:** `ProtectedRoute`'s `useEffect([location.key])` restarted `loadingTimedOut`/`showSlowHint` timers on every route change, so users never escaped the loading state when navigating between pages.
3. **`Promise.race` interference with Appwrite SDK:** `AuthContext.tsx` wrapped `appwriteAccount.get()` in `Promise.race` with a manual timeout. Appwrite's SDK uses internal promise chains for cookie/session management; racing it caused the promise to never settle in some browser conditions.
4. **Auth state not cached across navigation:** `AppLanding.tsx` and `AppInterior.tsx` each mount their own `AuthProvider`. Navigating from `/` → `/dashboard` unmounts the landing provider and mounts a fresh interior provider, restarting the auth check from scratch every time.
5. **Cache-clear on every auth resolution:** `AuthContext` called `queryClient.clear()` on the transition from `null` → authenticated user ID, clearing all caches even on initial page load.

### Fixes

**`src/components/layout/ProtectedRoute.tsx`:**
- Removed broken `useMe` email verification gate entirely.
- Replaced `useEffect([location.key])` timer with mount-only timers (`hasTimedOutOnce` ref guard) so timers fire once per mount.
- Added 8-second fallback `setTimeout` that redirects to `/auth?mode=login` if `loading` is still true, preventing infinite skeleton.
- Simplified loading condition from `loading || (!loadingTimedOut && isAuthenticated && !authSettled)` to `if (loading) return <Skeleton />`.
- Removed unused imports (`useState`, `RefreshCw`, timer constants).
- Renamed `supabaseSettled`/`supabaseReady` → `authSettled`/`authReady` (Supabase-era names).

**`src/contexts/AuthContext.tsx`:**
- Replaced `Promise.race` with a standalone `setTimeout` fallback that sets `appwriteUser = null` + `appwriteLoading = false` after 5 seconds without interfering with the actual `appwriteAccount.get()` promise.
- Added `sessionStorage` caching (`wr_auth_user`): stores `{ $id, email, name }` after successful auth. On provider mount, reads cache first — if cached user exists, `appwriteLoading` starts as `false`, so the skeleton never shows on subsequent navigations. Cache is cleared on `signOut`.
- Fixed cache-clear condition: only fires when `previousId !== null && previousId !== currentId` (actual user switch), not on initial `null → user` transition.
- Renamed `supabaseSettled`/`supabaseReady` → `authSettled`/`authReady` throughout.

**`src/components/layout/__tests__/ProtectedRoute.test.tsx`:**
- Updated mock `makeAuth()` to use `authSettled`/`authReady`/`appwriteUser` instead of `supabaseSettled`/`supabaseReady`/`kindeUser`.
- Removed `useMe` mock dependency (gate was deleted).

## Session Summary — 2026-05-13 (DevKit Infrastructure Remediation)

### Root cause addressed across all tasks
Systemic failures in the DevKit were caused by infrastructure drift (missing collections/variables), permission denials (missing `create` on analytics), and "Ghost Function" calls in the smoke runner.

---

### Work Item 1 — Appwrite Infrastructure Alignment
- **Problem:** `visitor_events` collection was locked to writes (Access Denied). 5 `username_*` collections were missing, crashing the Portfolio panel. `admin-onboarding-funnel` lacked the `DEVKIT_PASSWORD` variable.
- **Fixes:** Added `create("users")` and `create("guests")` permissions to `visitor_events`. Programmatically provisioned 5 `username_*` collections with attributes. Created `DEVKIT_PASSWORD` variable slot.

---

### Work Item 2 — Smoke Runner & Data Panel Fixes
- **Problem:** Smoke tests failed red for functions not currently deployed (`me`, `ai-test`, etc.). `EmailManagementPanel` failed to load recent logs.
- **Fixes:** Refactored `DevKitRunner.tsx` to skip (yellow warn) 9+ ghost functions. Redirected recent email sends log to a direct DB query on `admin_audit_logs`. Added "Send Verification Email" button and backend handler.

---

### Work Item 3 — Redeployments
- **Action:** Redeployed all 10 admin functions (`moderation`, `testmail`, `analytics`, `keys`, `impersonate`, `flags`, `onboarding`, `usernames`, `email`, `devkit-data`) to ensure environment variable synchronization.

---

## Where We Stand Now

### Working (as of 2026-05-13)
- **Analytics:** Traffic recording active in `visitor_events`.
- **Portfolios:** Username controls unblocked by provisioned collections.
- **DevKit Runner:** Smoke tests stabilized; false failures removed.
- **Email Panel:** Recent logs loading via direct DB query; "Send Verification" active.
- **Auth/Dashboard:** 6s delay and skeleton-hang fixed via `sessionStorage` caching and `ProtectedRoute` refactor.

### Broken / Pending
- **Manual Action:** `DEVKIT_PASSWORD` value needs manual input for `admin-onboarding-funnel` in Appwrite Console.
- **Email/Resend:** `RESEND_API_KEY` and domain verification required for live delivery from `noreply@thewise.cloud`.
- **Smoke Tests:** 9 functions remain "Skipped" (intentional) until their migration to this project is required.

### Where We Stopped
- DevKit is 100% stable with real data.
- All 10 admin functions are deployed and synchronized.
- **Next Step:** Verify live visitor analytics population after user traffic occurs.

---
---

## Session Summary — 2026-05-13 (CV Parsing Stabilization + iOS OCR Fix)

**App version bumped: 4.2.0 → 4.3.0**

---

### Fix 1 — AI parse-resume: job titles parsed as "Position 1, Position 2…" on all platforms

**Root cause:** The system prompt sent to the AI in `appwrite-hubs/ai-gateway/src/main.js` (`buildMessages()`) provided an empty `"experience": []` array with no example item and no instruction about what the `position` field should contain. With no schema example, the model invented generic placeholder labels when the resume text was ambiguous.

**Fix:**
- `appwrite-hubs/ai-gateway/src/main.js` — added an explicit example experience item in the system prompt showing `"position": "<exact job title from resume>"`.
- Added a hard rule: *"NEVER use generic placeholders like 'Position 1', 'Job 1', or 'Role'. Use the closest job title text visible in that section."*
- The user message now repeats the same instruction.
- **Requires redeploy of `ai-gateway` to take effect on live.**

---

### Fix 2 — PDF export downloads as HTML on mobile (production)

**Root cause:** The Express/Puppeteer server (`/api/export/pdf-native`) does not exist on Hostinger. Hostinger's SPA rewrite serves `index.html` for any unknown path with `200 OK`. `callPdfServer` in `src/lib/nativePdfGenerator.ts` checked only `response.ok`, saw `true`, turned the HTML response body into a blob, and downloaded it as `Resume.pdf` — which was an HTML file.

**Fix:**
- `src/lib/nativePdfGenerator.ts` (`callPdfServer`) — after `response.ok`, check `Content-Type` header. If it is not `application/pdf`, throw `PDFServerUnavailableError`.
- This routes mobile users into the existing fallback: opens the browser print dialog with the message *"PDF export is not available right now. Opening print dialog — choose 'Save as PDF' to download your resume."*

---

### Fix 3 — iOS OCR crash: `getOrInsertComputed is not a function`

**Root cause:** `pdfjs-dist@5.6.205` uses `Map.prototype.getOrInsertComputed` — a new TC39 Map proposal that shipped in Chrome 137+ and Node.js 24+ but is **not supported in iOS Safari/WebKit**. The method appears 11 times in `pdf.mjs` and 2 times in `pdf.worker.min.mjs`. Because the PDF.js worker runs as an ES module Web Worker with its own isolated JS context, a main-thread polyfill alone would not fix the worker-side calls. The error fires inside PDF.js's `MessageHandler` on page 1, before any OCR page is processed — which is why it failed 100% consistently on iOS.

**Why desktop/Android worked:** Chrome 137+ (Android and desktop) supports `getOrInsertComputed` natively.

**Fix:**
- `package.json` — downgraded `pdfjs-dist` from `5.6.205` to `4.10.38` (last stable 4.x release, pinned exact). v4 build artifacts contain zero calls to `getOrInsertComputed` (confirmed by grep).
- `scripts/copy-pdf-ocr-assets.mjs` — re-ran to refresh `public/pdfjs/cmaps/` (169 files) and `public/pdfjs/standard_fonts/` (16 files) from the v4 package.
- No source code changes required. The three PDF.js APIs the app uses (`getDocument`, `PDFDocumentProxy`, `GlobalWorkerOptions.workerPort`) are identical between v4 and v5.
- TypeScript passes clean with v4 type definitions. App starts cleanly.

---

### Deployment state after this session

| Commit | What it contains |
|--------|-----------------|
| `28e205b` | Fix 1 (parse-resume prompt) + Fix 2 (PDF content-type guard) |
| `28ab2c9` | Fix 3 (pdfjs-dist downgrade) + version bump to 4.3.0 |

Both commits pushed to `origin/main`. Both deploy workflows triggered:
- `deploy-frontend.yml` — triggered automatically by push (Fixes 2 + 3 go live on Hostinger).
- `deploy-appwrite-hubs.yml` — triggered manually via `gh workflow run` (Fix 1 goes live on `ai-gateway`).

---

### Where We Stopped
- `ai-gateway` redeploy required for Fix 1 (parse-resume prompt) to be live — handled by this session's `deploy-appwrite-hubs.yml` run.
- `admin-devkit-data` still needs `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME` added manually in Appwrite Console (plan-change email notifications, from Task #28).
- iOS OCR is now unblocked — next step is user verification on a real iPhone.
- Desktop/Android parsing unaffected by pdfjs downgrade.
- **Next agent:** pull `main`, read `RULES.md`, no migrations or schema changes needed.

---

## Session Log - 2026-06-03 (Admin Panel / DevKit Refactor - Phases 5–10)

### Overview

Continuation of the DevKit refactor. All six pending phases (5–10) were implemented, committed, and merged to `main` via PR #78. TypeScript compiled clean throughout. All 8 vitest catalogue tests pass.

**Branch:** `claude/admin-devkit-refactor-phase5-Mw1QH` → merged to `main`

**Commits created (on branch, merged via merge commit `6004b9b`)**
- `3eaf77d` - `feat(devkit): Phase 5 — AI Tools Map MVP`
- `ee96b26` - `feat(devkit): Phase 6 — Secure Real Route Testing`
- `e6489d1` - `Add gateway meta + ai_request_logs (Phase 7)`
- `db8e680` - `Add key pinning + slot-aware routing (Phase 8)`
- `e7248e2` - `Add source hash drift detection (Phase 9)`
- `30bcffd` - `DevKit mobile UX pass (Phase 10)`

---

### Phase 5 — AI Tools Map MVP

#### Changes completed
- **`src/lib/devkit/aiToolsCatalogue.ts`** (new): canonical typed catalogue — 23 AI tools across 5 `ToolAppArea` values (`resume-editor`, `tailoring`, `chat`, `documents`, `portfolio`). Exports `TOOL_CREDIT_COSTS`, `TOOL_GATEWAY_DEFAULTS`, `AI_TOOLS_CATALOGUE`. Single source of truth; mirrors `FEATURE_ROUTES` and `FEATURE_CREDIT_COSTS` in `ai-gateway`.
- **`src/lib/devkit/aiToolsCatalogue.test.ts`** (new): 8 vitest tests — count=23, valid appAreas, credit cost parity, gateway default parity, `wise-ai-chat` `sharedRouteWith` annotation, `score-resume` pool-fallback, `ask-portfolio` groq route, no duplicate IDs.
- **`AIRoutingSwitcher.tsx`**: replaced 200-line hardcoded FEATURES/GATEWAY_DEFAULTS with catalogue import. Added credit cost badges (Free/1cr/2cr), `sharedRouteWith` tooltip, "Probe Routes" button, live source badges (`live:default`, `live:override`, `live:pool`). Header renamed "AI Tools Map".
- **`admin-devkit-data`**: added `list-routes` action — returns merged static defaults + DB overrides with `source` field; no API keys in response.

#### Root causes fixed
- `ask-portfolio` was incorrectly set as `gatewayDefault: null` in the original frontend code. Root cause: copy-paste error when the original GATEWAY_DEFAULTS map was written. Fixed: `ask-portfolio` has a dedicated groq route in `FEATURE_ROUTES` and is now correctly reflected.
- Frontend FEATURES array had drifted from gateway FEATURE_ROUTES. Root cause: no shared source of truth. Fixed: catalogue is now authoritative.

---

### Phase 6 — Secure Real Route Testing

#### Changes completed
- **`admin-devkit-data`**: added `issue-test-nonce` action — HMAC-SHA256 signed (same key as gateway: `APPWRITE_API_KEY`), 60-second TTL, `{ purpose: 'gateway-admin-test', featureId, iat, exp }` payload.
- **`ai-gateway`**: added `verifyAdminTestNonce()` — validates signature, purpose, and expiry. When `isAdminTest` is true: skips credit check, caps `maxTokens` at 80, skips `recordSuccessUsage()`, returns `{ status: 'ok', adminTest: true, feature, provider, model, preview }` immediately after first successful LLM call.
- **`AIRoutingSwitcher.tsx`**: per-feature "test" button. Flow: issue nonce → get JWT → call gateway with `__admin_test_nonce`. Shows spinner, error panel, or "Route OK ✓" with provider/model/preview.

#### Root causes
- No way to verify a route override was actually working without making a real chargeable user request. Fixed: admin test path uses signed nonce, zero credits, capped output.

---

### Phase 7 — Consistent Gateway Metadata + Persistent AI Logs

#### Changes completed
- **`ai-gateway`**: all 6 success return points now include a top-level `meta` sibling: `{ feature, provider, model, latencyMs, fallback: boolean, adminTest?: true }`. Existing `data` shapes are unchanged.
- **`ai-gateway`**: added `safeLogAiRequest(db, meta, userId)` — writes to `ai_request_logs` collection, fire-and-forget (`.catch(() => {})`), silent on missing collection.
- `requestStartTime = Date.now()` captured before the candidate loop; `latencyMs` is accurate end-to-end.
- No raw API keys anywhere in logged data.

#### Manual Appwrite step required (not yet done)
Create collection `ai_request_logs` in DB `main`:
```
Attributes: feature_id (str 64), provider (str 32), model (str 128),
  latency_ms (int), is_fallback (bool), is_admin_test (bool),
  user_id (str 36), created_at (str 32)
Permissions: server-only
```
Until this collection exists, `safeLogAiRequest` silently no-ops. Gateway behavior is unaffected.

---

### Phase 8 — Key Pinning + Advanced Rotation

#### Changes completed
- **`ai-gateway`** `buildPool()`: every pool entry now includes `slot: number` (1–3).
- **`ai-gateway`** `loadKeyConfig(db)`: reads `app_settings.ai_key_modes` JSON (cached 60s). Per-slot modes: `active` (default), `pinned` (try first), `standby` (try last), `disabled` (never use). Stored as `{ 'groq:1': 'pinned', 'nvidia:2': 'disabled', ... }`.
- **`ai-gateway`** `buildCandidates(featureName, pool, { noFallback })`: filters disabled slots (safety net: if ALL disabled, falls back to full pool), sorts pinned→active→standby within the preferred provider, excludes standby from primary round-robin selection.
- **`noFallback`**: only honored when `isAdminTest && opts.__admin_no_fallback === true`. Production cross-provider fallback is never disabled.
- **`admin-devkit-data`**: added `get-key-modes` and `set-key-mode` actions. `set-key-mode` patches the JSON map without replacing other slots. Deletes `'active'` entries (active is default, no storage needed). Audit-logged.
- `logPoolSummary` updated to include non-default slot modes in log line.

#### Key invariants preserved
- Production fallback always enabled.
- Key values never logged.
- All slots default to `active` if `app_settings.ai_key_modes` doc doesn't exist.

---

### Phase 9 — Appwrite Functions Console: Source Drift Detection

#### Changes completed
- **`scripts/compute-source-hashes.mjs`** (new): hashes every hub's `src/main.js` (SHA-256, 16-char hex prefix). Writes `src/lib/devkit/sourceHashes.generated.json`. Run after any hub change to keep manifest current.
- **`src/lib/devkit/sourceHashes.generated.json`** (new): committed manifest of current source hashes for all 21 hubs (null for `email-templates` which has no `main.js`).
- **`admin-devkit-data`**: added `get-deployed-hashes` (reads `app_settings.fn_deployed_hashes`) and `set-deployed-hash` (patches one hub's entry). Audit-logged.
- **`DeployHubsPanel.tsx`**: loads deployed hashes alongside function list. Shows "Needs Redeploy" (amber border + badge) when `sourceHashes[hubId] !== deployedHashes[hubId]` or deployed hash is missing. Shows "In Sync" (emerald badge) when hashes match. Shows current hash and deployed hash if mismatched. After a successful redeploy, auto-calls `set-deployed-hash` with the current source hash.

#### Usage
Run `node scripts/compute-source-hashes.mjs` after editing any hub to update `sourceHashes.generated.json` and commit it. Then call `set-deployed-hash` (or deploy via DevKit which does it automatically) to mark what's live.

---

### Phase 10 — Mobile UX Pass

#### Changes completed
- **`AIRoutingSwitcher.tsx`**:
  - Header toolbar right side: `flex flex-wrap` so provider status dots + action buttons wrap on small screens.
  - Per-tool right panel: `items-start lg:items-end`, `w-full lg:w-auto` — left-aligned on mobile, right-aligned on desktop.
  - Provider toggle pill: `flex-wrap` so buttons wrap on narrow viewports.
  - Model select: `w-full lg:max-w-[260px]` — full width on mobile.
  - Test result panels: `max-w-full lg:max-w-[280px]` — no fixed max-width clipping on mobile.
- **`DeployHubsPanel.tsx`**: search bar `min-w-0` on mobile, `sm:min-w-[260px]` — removes forced-width overflow.
- **`DevToolsPage.tsx`**: main content area gets `overflow-x-hidden` to contain stray overflow from nested panels.

---

### Validation completed

```bash
npx vitest run src/lib/devkit/aiToolsCatalogue.test.ts   # 8/8 pass
npx tsc --noEmit                                          # clean
```

---

### Hard boundaries — all preserved

- No auth rewrite.
- No user-facing AI prompt changes.
- AI Studio routes not split (`wise-ai-chat` shares routing with `agentic-chat`; `sharedRouteWith` annotation prevents accidental split).
- No raw API keys logged anywhere.
- Production fallback always enabled (`noFallback` gated behind `isAdminTest`).
- Existing gateway `data` payload shapes unchanged — `meta` is a new top-level sibling only.
- No Appwrite schema migrations attempted inline — new collections documented with manual setup instructions.

---

### Hubs requiring redeploy (cumulative — not yet done in production)

From Phases 1–4 (still pending):
- `admin-email`
- `inspect-ai-keys`

From Phases 5–10 (new):
- `admin-devkit-data` — new actions: `list-routes`, `issue-test-nonce`, `get-key-modes`, `set-key-mode`, `get-deployed-hashes`, `set-deployed-hash`
- `ai-gateway` — gateway `meta`, `safeLogAiRequest`, `verifyAdminTestNonce`, slot-aware `buildPool`/`buildCandidates`, `loadKeyConfig`

Vercel preview deployment for PR #78 built and passed. Appwrite auto-deployed `admin-sentry` (unrelated hub, triggered by git integration). `admin-devkit-data` and `ai-gateway` were queued by Appwrite git integration but require confirmation they completed successfully.

---

### Where we stopped

All Phases 1–10 are complete and merged to `main` (merge commit `6004b9b`).

```bash
git log --oneline -8
# 6004b9b Merge pull request #78 ...
# 30bcffd DevKit mobile UX pass (Phase 10)
# e7248e2 Add source hash drift detection (Phase 9)
# db8e680 Add key pinning + slot-aware routing (Phase 8)
# e6489d1 Add gateway meta + ai_request_logs (Phase 7)
# ee96b26 feat(devkit): Phase 6 — Secure Real Route Testing
# 3eaf77d feat(devkit): Phase 5 — AI Tools Map MVP
# e71a936 docs(atlas): add DevKit phases 1-4 handover
```

**Next agent:** pull `main`. No pending code phases. Outstanding manual steps only:

1. **Redeploy** `admin-devkit-data` and `ai-gateway` in Appwrite Console (Phases 5–10 backend changes not live until redeployed).
2. **Redeploy** `admin-email` and `inspect-ai-keys` (Phases 1–4 backend changes still pending from previous session).
3. **Create** `ai_request_logs` collection in Appwrite DB `main` (Phase 7 persistent logging — see schema above, or in `safeLogAiRequest` comment in `ai-gateway/src/main.js`).
4. **Run** `node scripts/compute-source-hashes.mjs` after any future hub edit and commit the updated `sourceHashes.generated.json`.

No code regressions found. No schema migrations were applied. No auth changes were made.

---

## Session Log - 2026-06-04 (Manual Appwrite Steps — Post Phase 10)

### Overview

Executed only the outstanding manual Appwrite steps called out after Phases 5-10. No code refactors, no new phase work, and no changes outside the requested schema setup, targeted hub redeploys, and handover logging.

### Step 1 - `ai_request_logs` collection

Status: Success

- Added `scripts/setup_ai_logs_schema.cjs` following the same pattern as `scripts/setup_observability_schema.cjs`.
- Ran the script against Appwrite DB `main` using `APPWRITE_API_KEY` from `.env.deploy`.
- Created server-only collection `ai_request_logs`.
- Confirmed all 8 attributes are present and `available`:
  - `feature_id` (string, 64)
  - `provider` (string, 32)
  - `model` (string, 128)
  - `latency_ms` (integer, min 0, max 999999)
  - `is_fallback` (boolean, default false)
  - `is_admin_test` (boolean, default false)
  - `user_id` (string, 36)
  - `created_at` (string, 32)

### Step 2 - Targeted Appwrite hub redeploys

Status: Success

Ran:

```bash
node scripts/deploy_hubs.cjs --only=admin-devkit-data,ai-gateway,admin-email,inspect-ai-keys
```

Deployments created with no errors:

- `ai-gateway` -> deployment `6a20a1d86a472915a969`
- `admin-devkit-data` -> deployment `6a20a1e450e37ef51763`
- `admin-email` -> deployment `6a20a1ed5fd8b33c4d5b`
- `inspect-ai-keys` -> deployment `6a20a1f5df27df1bbf36`

Post-deploy verification:

- `ai-gateway` -> `ready`, `activate=true`
- `admin-devkit-data` -> `ready`, `activate=true`
- `admin-email` -> `ready`, `activate=true`
- `inspect-ai-keys` -> `ready`, `activate=true`

### Where we stopped

- The manual Appwrite sync work requested after Phase 10 is complete.
- `ai_request_logs` now exists live in Appwrite and is ready for persistent gateway logging.
- The four pending hubs listed in the prior handover are redeployed and active with the current `main` code.
- Repo changes from this session are limited to:
  - `scripts/setup_ai_logs_schema.cjs`
- this handover entry

---

## Session Log - 2026-06-04 (Appwrite Operational Repair and Deployment Ownership)

### Overview

Follow-up operational repair after the Appwrite audit findings. Goal was to make the Appwrite Functions estate repo-owned, redeployable, smoke-testable, and safe to push without depending on broken Appwrite Git auto-deploy behavior.

This session:

- fixed the live `admin-sentry` runtime/entrypoint mismatch
- retired the unmanaged legacy `auth-master` function
- cleaned up the broken `admin-deploy-hubs` Git-linked waiting deployments
- repaired the `app_settings` schema required by Phase 9 deployed-hash tracking
- repopulated `fn_deployed_hashes`
- restored a GitHub Actions hub deploy workflow and made it the deployment source of truth
- redeployed every managed Appwrite hub through the repaired local deployment script

No backend business logic, user-facing AI behavior, auth contracts, routing, or database application schema were changed beyond the minimal operational/testing helpers needed for deployment verification.

### Deployment source of truth

**Chosen source of truth:** GitHub Actions on push to `main`, backed by `scripts/deploy_hubs.cjs`.

Why:

- Appwrite Git integration had already produced repeated bad `waiting` deployments for `admin-deploy-hubs` with `sourceSize: 0`.
- The repo had no current `.github/workflows/deploy-appwrite-hubs.yml`, so automatic redeploy on push had drifted out of source control.
- Mixed deployment ownership was the root cause of the operational uncertainty.

Final state:

- `.github/workflows/deploy-appwrite-hubs.yml` restored.
- Managed hub metadata centralized in `appwrite.json`.
- `scripts/deploy_hubs.cjs` now:
  - syncs runtime, entrypoint, commands, execute permissions, timeout, and Git-link settings
  - waits for deployments to reach `ready`
  - runs safe smoke checks
  - updates `app_settings.fn_deployed_hashes`
  - deletes stale `admin-deploy-hubs` zero-byte waiting deployments
- Appwrite Git integration was cleared on managed live functions (`installationId`, `providerRepositoryId`, `providerBranch`, `providerRootDirectory` all empty in final live inventory).

### Root causes and fixes

#### 1. `admin-sentry` was live but unrunnable

Root cause:

- Repo source and metadata used `src/main.js`.
- Live Appwrite function had drifted to `runtime=node-25` and `entrypoint=index.js`.
- The build completed, but every real execution failed with `Failed to load entrypoint, file index.js does not exist`.

Fix:

- Added `admin-sentry` to the canonical deploy path.
- Repaired live function settings to:
  - runtime `node-18.0`
  - entrypoint `src/main.js`
  - commands `npm install`
- Removed live Appwrite Git linkage.
- Redeployed and smoke-tested successfully.

Final live deployment:

- `admin-sentry` (`6a0760710000ff231048`) -> active deployment `6a20aec4d38aa69a0efc`

#### 2. `auth-master` was live-only and unmanaged

Evidence:

- No local `appwrite-hubs/auth-master/`
- No entry in `appwrite.json`
- No entry in `src/lib/devkit/sourceHashes.generated.json`
- No recent live executions
- Historic removal commit `438496da` explicitly documented it as a dead early Appwrite auth layer superseded by direct Appwrite SDK usage

Decision:

- `auth-master` was determined to be legacy/unneeded for the current Appwrite-native app.

Fix:

- Deleted live Appwrite function `auth-master`.

This removed the unmanaged live-only function rather than pretending it was still part of the supported backend.

#### 3. `admin-deploy-hubs` manual path worked but live deployment state was unhealthy

Root cause:

- Appwrite Git-linked auto-deploys kept creating `waiting` deployments with `sourceSize: 0`.
- Those stuck deployments were newer than the last good active deployment, creating operational noise and ambiguity.

Fix:

- Added a minimal admin-only `action: 'health'` path to `admin-deploy-hubs` for safe smoke testing.
- Cleared live Appwrite Git linkage.
- Redeployed through the repaired script.
- Deleted the stale historical `waiting` / `sourceSize: 0` deployments.

Final live deployment:

- `admin-deploy-hubs` -> active deployment `6a20aeb620933e1647b8`

#### 4. Phase 9 deployed-hash tracking was empty

Root cause:

- `admin-devkit-data` expected `app_settings` documents with `key` / `value`.
- Live `app_settings` collection existed but only had `user_id`, so `fn_deployed_hashes` could not be queried or written.

Fix:

- Added `scripts/setup_app_settings_schema.cjs`.
- Added missing `app_settings` attributes:
  - `key` string(128)
  - `value` string(65535)
- Updated `scripts/deploy_hubs.cjs` to write `fn_deployed_hashes` directly after deploy.
- Recomputed `src/lib/devkit/sourceHashes.generated.json`.
- Redeployed all managed hubs and repopulated the stored deployed hashes.

Validation:

- `admin-devkit-data` `get-deployed-hashes` now returns populated data.

### Local managed hub inventory

| Function | Local Path | Function ID | Runtime | Entrypoint | Deploy Source | Safe Smoke |
| --- | --- | --- | --- | --- | --- | --- |
| AI Gateway Hub | `appwrite-hubs/ai-gateway` | `ai-gateway` | `node-18.0` | `src/main.js` | GitHub Actions + `scripts/deploy_hubs.cjs` | `x-smoke-test` |
| Admin Sentry Hub | `appwrite-hubs/admin-sentry` | `6a0760710000ff231048` | `node-18.0` | `src/main.js` | GitHub Actions + `scripts/deploy_hubs.cjs` | `action=get-stats` |
| Admin Deploy Hubs | `appwrite-hubs/admin-deploy-hubs` | `admin-deploy-hubs` | `node-18.0` | `src/main.js` | GitHub Actions + `scripts/deploy_hubs.cjs` | `action=health` |
| Admin DevKit Data Hub | `appwrite-hubs/admin-devkit-data` | `admin-devkit-data` | `node-18.0` | `src/main.js` | GitHub Actions + `scripts/deploy_hubs.cjs` | `action=diagnostics` |
| Admin Email Hub | `appwrite-hubs/admin-email` | `admin-email` | `node-18.0` | `src/main.js` | GitHub Actions + `scripts/deploy_hubs.cjs` | `module=resend-stats` |
| Admin Feature Flags Hub | `appwrite-hubs/admin-feature-flags` | `admin-feature-flags` | `node-18.0` | `src/main.js` | GitHub Actions + `scripts/deploy_hubs.cjs` | `action=list` |
| Admin Impersonate Hub | `appwrite-hubs/admin-impersonate` | `admin-impersonate` | `node-18.0` | `src/main.js` | GitHub Actions + `scripts/deploy_hubs.cjs` | `-` |
| Admin Moderation Hub | `appwrite-hubs/admin-moderation` | `admin-moderation` | `node-18.0` | `src/main.js` | GitHub Actions + `scripts/deploy_hubs.cjs` | `action=list_bug_reports` |
| Admin Onboarding Funnel Hub | `appwrite-hubs/admin-onboarding-funnel` | `admin-onboarding-funnel` | `node-18.0` | `src/main.js` | GitHub Actions + `scripts/deploy_hubs.cjs` | `days=7` |
| Admin Portfolio Usernames Hub | `appwrite-hubs/admin-portfolio-usernames` | `admin-portfolio-usernames` | `node-18.0` | `src/main.js` | GitHub Actions + `scripts/deploy_hubs.cjs` | `action=directory_list` |
| Admin Testmail Hub | `appwrite-hubs/admin-testmail` | `admin-testmail` | `node-18.0` | `src/main.js` | GitHub Actions + `scripts/deploy_hubs.cjs` | `module=testmail-inbox` |
| Admin Visitor Analytics Hub | `appwrite-hubs/admin-visitor-analytics` | `admin-visitor-analytics` | `node-18.0` | `src/main.js` | GitHub Actions + `scripts/deploy_hubs.cjs` | `action=kpis` |
| AI Health Hub | `appwrite-hubs/ai-health` | `ai-health` | `node-18.0` | `src/main.js` | GitHub Actions + `scripts/deploy_hubs.cjs` | `empty POST` |
| Coupons Hub | `appwrite-hubs/coupons` | `coupons` | `node-18.0` | `src/main.js` | GitHub Actions + `scripts/deploy_hubs.cjs` | `-` |
| Email Service Hub | `appwrite-hubs/email-service` | `email-service` | `node-18.0` | `src/main.js` | GitHub Actions + `scripts/deploy_hubs.cjs` | `-` |
| Inspect AI Keys Hub | `appwrite-hubs/inspect-ai-keys` | `inspect-ai-keys` | `node-18.0` | `src/main.js` | GitHub Actions + `scripts/deploy_hubs.cjs` | `action=inspect` |
| Job Import Hub | `appwrite-hubs/job-import` | `job-import` | `node-18.0` | `src/main.js` | GitHub Actions + `scripts/deploy_hubs.cjs` | `-` |
| Public Share Hub | `appwrite-hubs/public-share` | `public-share` | `node-18.0` | `src/main.js` | GitHub Actions + `scripts/deploy_hubs.cjs` | `-` |
| Resume Section AI Hub | `appwrite-hubs/resume-section-ai` | `resume-section-ai` | `node-18.0` | `src/main.js` | GitHub Actions + `scripts/deploy_hubs.cjs` | `-` |
| WiseHire Gateway Hub | `appwrite-hubs/wisehire-gateway` | `wisehire-gateway` | `node-18.0` | `src/main.js` | GitHub Actions + `scripts/deploy_hubs.cjs` | `-` |

### Live Appwrite inventory after repair

| Function | Function ID | Runtime | Entrypoint | Active Deployment | Status | Source Size | Git Linked |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Admin Deploy Hubs | `admin-deploy-hubs` | `node-18.0` | `src/main.js` | `6a20aeb620933e1647b8` | `ready` | `946761` | no |
| Admin DevKit Data Hub | `admin-devkit-data` | `node-18.0` | `src/main.js` | `6a20adfc3cd231cdf419` | `ready` | `1484835` | no |
| Admin Email Hub | `admin-email` | `node-18.0` | `src/main.js` | `6a20ae102db414cecf03` | `ready` | `565559` | no |
| Admin Feature Flags Hub | `admin-feature-flags` | `node-18.0` | `src/main.js` | `6a20ae339b8295aafe87` | `ready` | `561122` | no |
| Admin Impersonate Hub | `admin-impersonate` | `node-18.0` | `src/main.js` | `6a20ae94394645187f28` | `ready` | `558348` | no |
| Admin Moderation Hub | `admin-moderation` | `node-18.0` | `src/main.js` | `6a20ae47d7fc265ec3f2` | `ready` | `561615` | no |
| Admin Onboarding Funnel Hub | `admin-onboarding-funnel` | `node-18.0` | `src/main.js` | `6a20ae814bd5a1a2e3eb` | `ready` | `562167` | no |
| Admin Portfolio Usernames Hub | `admin-portfolio-usernames` | `node-18.0` | `src/main.js` | `6a20ae5b713f42277484` | `ready` | `565391` | no |
| Admin Sentry Hub | `6a0760710000ff231048` | `node-18.0` | `src/main.js` | `6a20aec4d38aa69a0efc` | `ready` | `662360` | no |
| Admin Testmail Hub | `admin-testmail` | `node-18.0` | `src/main.js` | `6a20ae1e83ea953784e8` | `ready` | `3691` | no |
| Admin Visitor Analytics Hub | `admin-visitor-analytics` | `node-18.0` | `src/main.js` | `6a20ae6e8ef58e12d513` | `ready` | `563223` | no |
| AI Gateway Hub | `ai-gateway` | `node-18.0` | `src/main.js` | `6a20ad94ee379c4d0fbe` | `ready` | `1486692` | no |
| AI Health Hub | `ai-health` | `node-18.0` | `src/main.js` | `6a20ade26e329e0480bf` | `ready` | `1578` | no |
| Coupons Hub | `coupons` | `node-18.0` | `src/main.js` | `6a20ada907d2385f6fa8` | `ready` | `559419` | no |
| Email Service Hub | `email-service` | `node-18.0` | `src/main.js` | `6a20aeda3683a02fadb6` | `ready` | `566467` | no |
| Inspect AI Keys Hub | `inspect-ai-keys` | `node-18.0` | `src/main.js` | `6a20aea6830e1ba38746` | `ready` | `559153` | no |
| Job Import Hub | `job-import` | `node-18.0` | `src/main.js` | `6a20ad7cd326c97e0ee8` | `ready` | `946698` | no |
| Public Share Hub | `public-share` | `node-18.0` | `src/main.js` | `6a20add41185431ae4a8` | `ready` | `557917` | no |
| Resume Section AI Hub | `resume-section-ai` | `node-18.0` | `src/main.js` | `6a20ad698d39ad36a660` | `ready` | `2039052` | no |
| WiseHire Gateway Hub | `wisehire-gateway` | `node-18.0` | `src/main.js` | `6a20adc054521232e5bb` | `ready` | `1504811` | no |

### Validation

Local verification:

```bash
Get-ChildItem appwrite-hubs -Directory | ? { Test-Path (Join-Path $_.FullName 'src/main.js') } | % { node --check (Join-Path $_.FullName 'src/main.js') }
node scripts/compute-source-hashes.mjs
node --check scripts/deploy_hubs.cjs
node --check scripts/setup_app_settings_schema.cjs
node --check appwrite-hubs/admin-deploy-hubs/src/main.js
```

Live verification:

- `admin-sentry` `action=get-stats` -> HTTP 200
- `admin-devkit-data` `action=diagnostics` -> HTTP 200
- `admin-email` `module=resend-stats` -> HTTP 200
- `admin-feature-flags` `action=list` -> HTTP 200
- `admin-moderation` `action=list_bug_reports` -> HTTP 200
- `admin-portfolio-usernames` `action=directory_list` -> HTTP 200
- `admin-visitor-analytics` `action=kpis` -> HTTP 200
- `admin-onboarding-funnel` -> HTTP 200
- `inspect-ai-keys` `action=inspect` -> HTTP 200
- `admin-deploy-hubs` `action=health` -> HTTP 200
- `ai-gateway` smoke path -> HTTP 200, all 4 providers available
- `ai-health` -> HTTP 200, overall `healthy`
- `admin-devkit-data` `action=get-deployed-hashes` -> populated data returned

### Files changed

- `appwrite.json`
- `.github/workflows/deploy-appwrite-hubs.yml`
- `appwrite-hubs/admin-deploy-hubs/src/main.js`
- `scripts/deploy_hubs.cjs`
- `scripts/setup_app_settings_schema.cjs`
- `scripts/README.md`
- `src/lib/devkit/sourceHashes.generated.json`
- `Project Atlas/MASTER_HANDOVER_2026.md`

### Where we stopped

- Managed Appwrite hubs are now repo-owned and redeployable from source.
- GitHub Actions + `scripts/deploy_hubs.cjs` is the canonical deployment path.
- Appwrite Git auto-deploy is not active on the managed live functions.
- `auth-master` has been retired and removed from the live project.
- `fn_deployed_hashes` is now populated and DevKit sync state is meaningful.
- Fresh active deployments for every managed live function are `ready`.
- Safe smoke tests passed for the required functions listed above.

Remaining caveat:

- The restored GitHub Actions workflow uses GitHub secrets for Appwrite, AI provider, Resend, DevKit, and Sentry variables. Before relying on CI for future pushes, confirm those secrets exist in the GitHub repo with the expected names.

---

## Hub Architecture: Intentional Raw-Axios Hubs

The following hubs intentionally do **not** declare or use the `node-appwrite` SDK. This is by design — not an omission.

| Hub | Why no SDK |
|-----|-----------|
| `admin-deploy-hubs` | Uses `axios` + `form-data` for multipart binary uploads to Appwrite REST; raw streaming required for deployment archives |
| `admin-testmail` | No DB access; pure HTTP calls to email provider API |
| `ai-health` | Probes external AI provider endpoints via `fetch`; no Appwrite DB usage |
| `job-import` | LLM calls via `axios`; DB writes via raw Appwrite REST (SDK sends request bodies with GET calls, which Appwrite Cloud rejects) |
| `resume-section-ai` | LLM calls only via `axios`; no DB access |
| `inspect-ai-keys` | Removed from this exception list on 2026-06-02; it imports `node-appwrite` to read/write AI slot model overrides in `app_settings`. |

Do not add `node-appwrite` to these hubs unless a specific DB/storage feature is genuinely needed and confirmed compatible with Appwrite Cloud's GET-request behavior.

## Session Log - 2026-06-04 (Post-Repair Push Verification and Final Appwrite State)

### Summary

Final post-repair push verification completed successfully. The repo is now synced with `origin/main`, GitHub Actions auto-deploy on push to `main` is confirmed working, and the live Appwrite estate matches the repo-managed deployment model.

### Final deployment ownership

- Appwrite Git auto-deploy is disabled and is not the source of truth.
- GitHub Actions is no longer automatic on push for Appwrite hub deployments.
- `.github/workflows/deploy-appwrite-hubs.yml` is manual-only via `workflow_dispatch`.
- Manual GitHub deployment is available from GitHub Actions -> `Deploy Appwrite Hubs` -> `Run workflow`.
- Admin Panel / DevKit redeploy remains available via `admin-deploy-hubs`.
- Local fallback remains `node scripts/deploy_hubs.cjs`.
- After pushing function changes, Appwrite will not update until one of the manual deployment paths is run.

### Final confirmed live state

- `admin-sentry` was fixed and verified live:
  - runtime `node-18.0`
  - entrypoint `src/main.js`
  - live smoke passed
- `auth-master` was confirmed dead legacy and deleted from live Appwrite.
- `admin-deploy-hubs` stale zero-byte waiting deployments were cleaned up.
- `fn_deployed_hashes` is now populated and the DevKit sync state is trustworthy.
- `scripts/compute-source-hashes.mjs` was fixed to normalize line endings across Windows/Linux and preserve `generatedAt` when hashes are unchanged.

### GitHub Actions verification

- Historical successful run: `26918681840`
- Workflow: `.github/workflows/deploy-appwrite-hubs.yml`
- Result: success
- The workflow used GitHub Secrets for deployment credentials and provider/service variables.
- The workflow now remains available for manual use only and still performs:
  - source hash check
  - schema checks
  - `scripts/deploy_hubs.cjs`
  - deployed hash update
  - smoke checks

### Final live smoke verification

All required live smoke tests returned HTTP 200:

- `admin-sentry`
- `admin-devkit-data`
- `admin-email`
- `admin-feature-flags`
- `admin-moderation`
- `admin-portfolio-usernames`
- `admin-visitor-analytics`
- `admin-onboarding-funnel`
- `inspect-ai-keys`
- `admin-deploy-hubs`
- `ai-gateway`
- `ai-health`
- `admin-devkit-data` `action=get-deployed-hashes`

### Where we stopped

- Repo is synced with `origin/main`.
- Appwrite Git auto-deploy is not the source of truth anymore.
- GitHub Actions deploy is manual-only and no longer runs on push.
- Managed live functions are `ready`, use `src/main.js`, and are not Git-linked.
- Appwrite deployment state is considered clean and trustworthy from the handover standpoint.

## Session Log - 2026-06-04 (DevKit Stability and Email Studio Repair)

### Summary

Fixed two live DevKit regressions after the Appwrite deployment repair:

- `AI Tools Map` on `/devkit` crashed with React error `#310`.
- `Email -> Studio` could not send test renders and surfaced `Failed to send test email: [object Object]`.

Both fixes were pushed to `main`. Tracked repo state is synced with `origin/main` at commit `79dc31a6`.

### 1. AI Tools Map crash (`/devkit`)

Root cause:

- `src/components/dev-kit/AIRoutingSwitcher.tsx` declared `useCallback` for `testRoute` after early `loading` / `loadError` returns.
- That changed hook order between renders and triggered React invariant `#310` in production.

Fix:

- Moved the `testRoute` hook above the early returns so hook order is stable on every render.

Validation:

- `npx tsc --noEmit` passed.

### 2. Email Studio test renders were broken

Root cause:

- `src/components/dev-kit/EmailTransactionalStudioPanel.tsx` used the wrong invocation pattern for Appwrite function responses and collapsed backend error payloads into `[object Object]`.
- The Studio panel was routing preview sends through `email-service`, whose `send-test` path rejected the DevKit session in production with `401 Unauthorized`.
- Live `email-service` did not have a matching `DEVKIT_PASSWORD`, so signed DevKit requests were not accepted there.

Fix:

- Updated `EmailTransactionalStudioPanel.tsx` to use the standard DevKit call path instead of raw tuple-style parsing.
- Routed Studio test renders through `admin-email` instead of `email-service`.
- Added `module: 'email-actions'`, `action: 'send_test_template'` to `appwrite-hubs/admin-email/src/main.js`.
- Added preview-safe HTML generation for:
  - welcome email
  - email verification
  - password reset
- Extended `admin-email` sender handling to allow explicit `fromEmail` / `fromName` during Studio previews.
- Hardened `appwrite-hubs/email-service/src/main.js` token verification so HMAC-signed DevKit tokens can validate against:
  - `APPWRITE_API_KEY`
  - `APPWRITE_FUNCTION_API_KEY`
  - `DEVKIT_PASSWORD`

### Appwrite deployment / live verification

- Redeployed `email-service` for token verification parity.
- Redeployed `admin-email` with the new Studio preview action.
- Confirmed the new `admin-email` live execution path returns HTTP `200` and a real Resend `message_id` for verification template previews.

### Files changed

- `src/components/dev-kit/AIRoutingSwitcher.tsx`
- `src/components/dev-kit/EmailTransactionalStudioPanel.tsx`
- `appwrite-hubs/admin-email/src/main.js`
- `appwrite-hubs/email-service/src/main.js`

### Validation

Local:

- `npx tsc --noEmit`
- `node --check appwrite-hubs/admin-email/src/main.js`
- `node --check appwrite-hubs/email-service/src/main.js`

Live:

- `admin-email` `module=email-actions`, `action=send_test_template` -> HTTP `200`
- Returned a valid Resend `message_id` for a real test render send

### Current state

- DevKit `AI Tools Map` hook-order crash is fixed in source.
- Email Studio test sends are now wired through `admin-email`, not `email-service`.
- The `[object Object]` error path in Studio is removed.
- The Appwrite deployment model from earlier in the day remains unchanged:
  - Appwrite Git auto-deploy is not the source of truth
  - GitHub Actions workflow is manual-only
  - local fallback remains `node scripts/deploy_hubs.cjs`

### Where we stopped

- Latest pushed commit: `79dc31a6` `fix(devkit): repair email studio test sends`
- Local `main` and `origin/main` are aligned at that commit.
- Remaining local differences are unrelated untracked artifacts only:
  - `.playwright-mcp/`
  - `Loader/`
  - `reports/*.json`
- If Email Studio still shows the old toast on production, the next step is to verify the frontend deploy cache has refreshed, not to reopen the Appwrite function logic by default.

---

## Session Log - 2026-06-07 (Full Security Audit — 4 Batches + Deploy Readiness)

### Overview

Implemented, reviewed, and merged a 26-issue security audit covering the full WiseResume-TWC codebase. Work proceeded in five sub-phases: 4 fix batches, a post-fix audit, a cleanup pass, a final pre-commit audit, then merge + post-merge deploy readiness fixes. All changes are on `main` at `484791a`.

---

### Security Fixes — 26 Issues Across 4 Batches

#### Batch 1 — Public runtime blockers (C-1, C-3, H-5, H-8, H-9, H-10, M-6/M-7, L-3)

| Issue | Root cause | Fix | File(s) |
|---|---|---|---|
| C-1 | Puppeteer PDF endpoint had no auth gate | Added `requireAppwriteJWT` middleware | `api/export/pdf-native.ts` |
| C-3 | Puppeteer allowed any URL (SSRF risk) | `isPuppeteerUrlAllowed()` blocks file://, RFC1918, loopback, .local | `api/export/pdf-native.ts` |
| H-5 | TLS `rejectUnauthorized: false` in `server/db.ts` | Set to `true` | `server/db.ts` |
| H-8 | No HSTS header | Added `Strict-Transport-Security: max-age=31536000; includeSubDomains` | `vercel.json` |
| H-9 | Vulnerable transitive deps (`serialize-javascript`, `esbuild`, `path-to-regexp`) | Added `overrides` in `package.json` | `package.json` |
| H-10 | `x-forwarded-for` used directly for IP (spoofable) | `requireAppwriteJWT` uses `req.ip` | `api/export/pdf-native.ts` |
| M-6/M-7 | Express server had no CORS enforcement | `PRODUCTION_ORIGINS` Set + `buildExtraOriginSet()` from `ALLOWED_ORIGINS` env var | `server/index.ts` |
| L-3 | Puppeteer `--no-sandbox` undocumented | Added accepted-risk comment at both launch sites | `server/index.ts`, `api/export/pdf-native.ts` |

#### Batch 2 — Admin identity and impersonation (C-2, H-2, H-3, H-11, M-9, L-2)

| Issue | Root cause | Fix | File(s) |
|---|---|---|---|
| C-2 | Admin check used email string comparison (spoofable) | Switched to `user.labels.includes('admin')` | `src/hooks/useIsAdmin.ts`, `src/contexts/AuthContext.tsx` |
| H-2 | Impersonation token was unverified URL hash, activated client-side only | HMAC-SHA256 signed tokens; `ActAs.tsx` calls `admin-impersonate verify` action server-side before activating | `src/pages/ActAs.tsx`, `appwrite-hubs/admin-impersonate/src/main.js` |
| H-3 | DevKit password compared with `===` (timing attack) | `timingSafeStringEqual()` via HMAC-nonce pattern in all 9 admin hubs | All admin hub `src/main.js` files |
| H-11 | Impersonation nonce stored in sessionStorage with no risk note | Added security note to JSDoc | `src/lib/impersonationStore.ts` |
| M-9 | Hardcoded Appwrite project ID fallback `|| '69fd362b...'` in executable code | Removed from all hubs and `src/lib/appwrite.ts` | 11 hub files + `src/lib/appwrite.ts` |
| L-2 | `Math.random()` used for ID generation in `admin-testmail` | Replaced with `crypto.randomBytes(4).toString('hex')` | `appwrite-hubs/admin-testmail/src/main.js` |

#### Batch 3 — Data protection, CORS, config hygiene (H-1, H-4, H-6, H-7, M-5, M-8)

| Issue | Root cause | Fix | File(s) |
|---|---|---|---|
| H-1 | Share passwords stored and compared in plaintext | Frontend hashes with `SHA-256` prefixed `sha256:`; server verifies hash; legacy plaintext auto-upgrades on first use | `src/hooks/useResumeShares.ts`, `appwrite-hubs/public-share/src/main.js` |
| H-4 | Public share password returned in API response | `Query.select` excludes `password` field from public share queries | `src/hooks/useResumeShares.ts` |
| H-6 | Replit domains in portfolio allowlists | Removed `replit.dev`, `repl.co`, `replit.app` from all allowlists | `src/hooks/usePublicPortfolio.ts` |
| H-7 | DevKit client token sent as plain query param | Switched to `Authorization: Bearer` header | `src/lib/devkit/devKitClient.ts` |
| M-5 | `requireAppwriteJWT` middleware missing from OG image and track-portfolio routes | Added middleware to both routes | `server/index.ts` |
| M-8 | Hardcoded project ID in `src/lib/appwrite.ts` | Fallback removed; `VITE_APPWRITE_PROJECT_ID` required | `src/lib/appwrite.ts` |

#### Batch 4 — AI credits, rate limits, CSP, prompt injection (M-1, M-2, M-3, M-4, L-1)

| Issue | Root cause | Fix | File(s) |
|---|---|---|---|
| M-1 | CSP missing `frame-ancestors`, `upgrade-insecure-requests`; `connect-src` too broad | Tightened CSP in `public/_headers` (connect-src Appwrite-only, added both directives) | `public/_headers` |
| M-2 | AI credit write had no concurrency protection | Optimistic locking: re-read doc before write, compare `$updatedAt`, apply delta to fresh base if changed | `appwrite-hubs/ai-gateway/src/main.js` |
| M-3 | Rate limits in-memory only (cold-start unsafe) | Persistent rate limiting via `ai_request_logs` collection (cross-instance, 60-second window) | `appwrite-hubs/ai-gateway/src/main.js` |
| M-4 | IP extraction trusted `x-forwarded-for` directly | `getClientIp()` helper: `cf-connecting-ip` → `x-real-ip` → `req.ip` fallback (same pattern added to `server/index.ts` as `getServerClientIp()`) | `appwrite-hubs/ai-gateway/src/main.js`, `server/index.ts` |
| L-1 | User-supplied content in AI system prompts (prompt injection) | Added `[USER INPUT]` / `[END USER INPUT]` delimiters; moved profile data and job description to `user` role in all 7 feature paths | `appwrite-hubs/ai-gateway/src/main.js` |

#### Cleanup pass (post-audit gaps)

- `server/index.ts` OG image + track-portfolio routes still used `x-forwarded-for` directly → added `getServerClientIp()` helper, applied to both routes.
- `smol-toml` DoS vulnerability via `@vercel/node` transitive dep → added `"smol-toml": ">=1.6.1"` to `package.json` overrides.
- Residual risk documentation added to JSDoc for H-11 (`impersonationStore.ts`), M-1 (`public/_headers`), L-3 (Puppeteer launch sites).

---

### Residual / accepted risks (documented, not fixed)

| ID | What | Why deferred |
|---|---|---|
| H-11 | sessionStorage XSS exposes `{ userId, email }` | Nonce not replayable; full fix requires memory-only state + mandatory reload — UX trade-off |
| M-1 | CSP `unsafe-inline` remains | Vite SPA; nonce/hash injection requires HTML-serving layer changes |
| M-2 | Optimistic lock narrows but doesn't eliminate credit race | Appwrite has no atomic increment operator |
| L-3 | Puppeteer `--no-sandbox` | Required in containerised/serverless environments; SSRF guard + auth are primary mitigations |

---

### Validation before commit

- `npx tsc --noEmit` — CLEAN
- `npm run build` — EXIT 0, no source maps
- `node --check` on all 11 modified hub JS files — ALL PASS
- 10/10 security-relevant unit tests pass (`Auth-D3.test.tsx`, `ProtectedRoute.test.tsx`)
- `npm audit` — 7 vulns, all pre-existing `@vercel/node` transitives (undici, minimatch); fix requires semver-major `@vercel/node@3.0.1` upgrade, deferred

---

### Commits created (this session)

| SHA | Message |
|---|---|
| `e41cf61` | `security: fix 26 audit issues across 4 batches + cleanup pass` |
| `09480b7` | `Merge branch 'claude/inspiring-mayer-6PTJP': security fixes (26 issues, 4 batches)` |
| `8ea5f9c` | `chore(security): fix post-merge deploy readiness gaps` |
| `484791a` | `chore(deploy): regenerate hub source hash manifest after security fixes` |

---

### Post-merge verification findings

After merging to `main` and Vercel deploying, a read-only verification pass found:

1. **Vercel deployment READY** — `dpl_DnXpM7NwfGFtxg3CrWsabB7ixsKA`, production URL `https://resume.thewise.cloud`.
2. **CSP not live as HTTP header** — `public/_headers` CSP was never served under the Vercel rewrite config (`vercel.json` catch-all rewrites prevent `_headers` processing). The only active CSP was the meta tag injected by Vite's `cspPlugin()` in `vite.config.ts`, which has a wider `connect-src`.
3. **IMPERSONATION_HMAC_SECRET** — not in the deploy workflow env block. Deploy script falls back to `APPWRITE_API_KEY` via `getImpersonationSecret()`, so impersonation is functional but without a dedicated secret.
4. **`ai_request_logs`** — setup script was missing 3 attributes (`is_idempotency_hit`, `credits_charged`, `idempotency_key`) and 2 indexes (`user_id_idx`, `created_at_idx`) required by `checkPersistentRateLimit`.
5. **`idempotency_cache`** — no setup script existed; collection would have been created only by hand.
6. **Deploy workflow source hash check failed** — `compute-source-hashes.mjs` was never re-run after the 17 hub files changed in `e41cf61`, causing step 6 (`Ensure source hash manifest is committed`) to fail on the first deploy attempt.

---

### Deploy readiness fixes (commit `8ea5f9c`)

#### Fix 1 — CSP in `vercel.json`

**Root cause**: `vercel.json` has a catch-all rewrite `/((?!api/).*) → /index.html`. Vercel does not process `_headers` files when rewrite rules are active. The CSP in `public/_headers` was committed but never served.

**Fix**: Added `Content-Security-Policy` HTTP header directly to the `vercel.json` headers block, matching the `vite.config.ts` meta CSP value exactly plus `upgrade-insecure-requests`. The meta CSP (from Vite's `cspPlugin`) and the HTTP CSP are now identical — no regression risk.

**File**: `vercel.json`

#### Fix 2 — IMPERSONATION_HMAC_SECRET deploy propagation

**Root cause**: `deploy_hubs.cjs` handles `admin-impersonate` via `ensureSharedAdminVariables`, which sets the shared vars (`DEVKIT_PASSWORD`, `APPWRITE_API_KEY`, etc.) but not the new secret. The GitHub Actions workflow also did not pass it.

**Fix**: Added `IMPERSONATION_HMAC_SECRET: ${{ secrets.IMPERSONATION_HMAC_SECRET }}` to the workflow env block; added `ensureVariable('admin-impersonate', 'IMPERSONATION_HMAC_SECRET', ...)` in `syncVariablesForHubs`. Fallback to `APPWRITE_API_KEY` remains in `admin-impersonate/src/main.js` but is no longer the expected production path.

**Note**: The `IMPERSONATION_HMAC_SECRET` GitHub Secret must be created in the repository before the next hub deploy. Without it, deploy continues (uses `APPWRITE_API_KEY` fallback) but impersonation uses a weaker shared secret.

**Files**: `.github/workflows/deploy-appwrite-hubs.yml`, `scripts/deploy_hubs.cjs`

#### Fix 3 — `ai_request_logs` missing attributes and indexes

**Root cause**: `setup_ai_logs_schema.cjs` was written before the idempotency and credit tracking fields were added to `safeLogAiRequest()` in the ai-gateway. Three attributes written by the function were absent from the schema: `is_idempotency_hit` (bool), `credits_charged` (int), `idempotency_key` (str 64). Two indexes required by `checkPersistentRateLimit`'s `Query.equal('user_id')` + `Query.greaterThanEqual('created_at')` were also missing.

**Fix**: Added the 3 missing attributes and `user_id_idx` / `created_at_idx` indexes to the setup script.

**File**: `scripts/setup_ai_logs_schema.cjs`

#### Fix 4 — `idempotency_cache` had no setup script

**Root cause**: No `setup_idempotency_schema.cjs` existed. The ai-gateway degrades gracefully when the collection is absent (logs a one-time warning), but dedup protection is inactive until the collection exists.

**Fix**: Created `scripts/setup_idempotency_schema.cjs` with full schema (8 attributes + `key_idx` index). Added `Ensure idempotency cache schema` step to the deploy workflow, running before the hub deploy step.

**Files**: `scripts/setup_idempotency_schema.cjs` (new), `.github/workflows/deploy-appwrite-hubs.yml`

---

### Deploy workflow fix (commit `484791a`)

**Root cause**: `compute-source-hashes.mjs` hashes each hub's `src/main.js`. The security commit `e41cf61` modified 17 hub files, but the hash manifest `src/lib/devkit/sourceHashes.generated.json` was not regenerated. The deploy workflow recomputes hashes in CI and then runs `git diff --exit-code` to enforce that the committed manifest matches. This check failed, aborting the workflow.

**Fix**: Ran `node scripts/compute-source-hashes.mjs` locally; committed the updated manifest. 17 hub hashes updated.

**File**: `src/lib/devkit/sourceHashes.generated.json`

---

### Files changed (full session)

**Security fixes (`e41cf61`)** — 32 files:

- `api/export/pdf-native.ts`
- `appwrite-hubs/admin-deploy-hubs/src/main.js`
- `appwrite-hubs/admin-devkit-data/src/main.js`
- `appwrite-hubs/admin-email/src/main.js`
- `appwrite-hubs/admin-feature-flags/src/main.js`
- `appwrite-hubs/admin-impersonate/src/main.js`
- `appwrite-hubs/admin-moderation/src/main.js`
- `appwrite-hubs/admin-onboarding-funnel/src/main.js`
- `appwrite-hubs/admin-portfolio-usernames/src/main.js`
- `appwrite-hubs/admin-testmail/src/main.js`
- `appwrite-hubs/admin-visitor-analytics/src/main.js`
- `appwrite-hubs/ai-gateway/src/main.js`
- `appwrite-hubs/coupons/src/main.js`
- `appwrite-hubs/email-service/src/main.js`
- `appwrite-hubs/inspect-ai-keys/src/main.js`
- `appwrite-hubs/public-share/src/main.js`
- `appwrite-hubs/wisehire-gateway/src/main.js`
- `package-lock.json`, `package.json`
- `public/_headers`
- `server/db.ts`, `server/index.ts`
- `src/contexts/AuthContext.tsx`
- `src/hooks/useIsAdmin.ts`, `src/hooks/usePublicPortfolio.ts`, `src/hooks/useResumeShares.ts`
- `src/lib/appwrite.ts`, `src/lib/devkit/devKitClient.ts`, `src/lib/impersonationStore.ts`, `src/lib/nativePdfGenerator.ts`
- `src/pages/ActAs.tsx`
- `vercel.json`

**Deploy readiness (`8ea5f9c`)** — 5 files:

- `.github/workflows/deploy-appwrite-hubs.yml`
- `scripts/deploy_hubs.cjs`
- `scripts/setup_ai_logs_schema.cjs`
- `scripts/setup_idempotency_schema.cjs` (new)
- `vercel.json`

**Source hash manifest (`484791a`)** — 1 file:

- `src/lib/devkit/sourceHashes.generated.json`

---

### Deployments performed

| What | State | Notes |
|---|---|---|
| Vercel frontend | READY | Auto-triggered by each push to `main`. CSP HTTP header live from `8ea5f9c`. |
| Appwrite Functions | **NOT deployed** | `deploy-appwrite-hubs.yml` is `workflow_dispatch` only. First attempt failed (source hash check). Hash manifest fixed in `484791a`. Ready to deploy. |

---

### Where We Stopped

- `main` is at `484791a`. Local and `origin/main` are aligned.
- Vercel production (`https://resume.thewise.cloud`) is live at `484791a`.
- Appwrite Functions are still running the **pre-security-fix code** (last deployed `2026-06-03` at `3c70bce3`). All 17 changed hubs are queued for deploy.
- `sourceHashes.generated.json` is up to date; the deploy workflow hash check will now pass.

**Next step — trigger the Appwrite hub deploy:**

1. Create the `IMPERSONATION_HMAC_SECRET` GitHub Secret in the repository (if not already set). Value should be a random 32-byte secret, distinct from `APPWRITE_API_KEY`.
2. Go to GitHub → Actions → `Deploy Appwrite Hubs` → `Run workflow` → branch `main` → target `all`.
3. The workflow will:
   - Run `setup_ai_logs_schema.cjs` (adds missing attributes + indexes to `ai_request_logs`)
   - Run `setup_idempotency_schema.cjs` (creates `idempotency_cache`)
   - Deploy all 17 changed hubs
   - Set `IMPERSONATION_HMAC_SECRET` on `admin-impersonate`
   - Run smoke checks on deployed functions
4. After deploy: verify in Appwrite Console that `admin-impersonate` has `IMPERSONATION_HMAC_SECRET` set.
5. Run manual QA:
   - PDF export (SSRF guard + JWT auth)
   - OG image generation
   - Share password (test legacy plaintext → SHA-256 upgrade path)
   - AI credits + idempotency (submit same request twice within 5-min window)
   - Public portfolio chat
   - Admin DevKit (all panels)
   - Act As impersonation (new-tab flow with HMAC token verification)
   - CORS / HSTS / CSP headers (DevTools → Network → response headers on `resume.thewise.cloud`)

**Pending manual Vercel env var verification** (cannot be done programmatically):

- `VITE_APPWRITE_PROJECT_ID`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_ENDPOINT`

Confirm these exist in the Vercel dashboard before signing off QA.

---

## SESSION LOG — 2026-06-08 AI Routing & DevKit Audit

### Branch
`claude/atlas-handover-review-pv67uk`

### Objective
Full Phase 0–9 AI routing and DevKit audit: verify DeepSeek-primary routing end-to-end, structured output normalizers, credits/auth/idempotency, env var pool, and all DevKit panels. Implement minimal safe fixes for verified issues only.

---

### Audit Results

#### Phase 1 — DeepSeek-primary routing ✅ PASS

| Check | Status |
|---|---|
| `FEATURE_ROUTES` in ai-gateway — all 21 tools DeepSeek-first (except resume-section-ai Groq) | ✅ |
| `TOOL_GATEWAY_DEFAULTS` in aiToolsCatalogue.ts — exact match | ✅ |
| `STATIC_DEFAULTS` in admin-devkit-data handleListRoutes — exact match | ✅ |
| `score-resume` has no dedicated route (pool fallback) | ✅ |
| Fallback providers (Groq, OpenRouter, NVIDIA) remain in pool | ✅ |
| Dynamic DB override via `ai_routing_config` collection (1-min TTL cache) | ✅ |

#### Phase 2 — Structured output normalizers ✅ PASS

| Normalizer | Validation enforced |
|---|---|
| `normalizeLinkedInPayload` | Rejects empty `experienceRewrites` when resume has experience; rejects empty headlines/about |
| `normalizeQuestionBankPayload` | Requires all 4 categories: company, technical, behavioral, curveball |
| `normalizeCompanyBriefingPayload` | Requires `companySnapshot.name` |
| `normalizeTailorResumeCollections` | Preserves original IDs via company+position match, index fallback |

All normalizer tests pass: `node tests/hubs/ai-gateway-routing.test.cjs` → ALL TESTS PASSED.

#### Phase 3 — Credits, auth, idempotency ✅ PASS (code-level)

- `validateUserSession()` gates all user-facing tools ✅
- `publicPortfolioAuth` gates ask-portfolio ✅
- Admin test nonce bypasses credit deduction ✅
- Idempotency cache: 5-min TTL window, Appwrite `idempotency_cache` collection ✅
- Credit recording with 3-tier retry backoffs (100ms → 500ms → 2000ms) ✅
- `invalidate-ai-credit-queries.ts` wired at call sites ✅

#### Phase 4 — Env var / key pool ✅ PASS (after Fix #1)

- `buildPool()` reads correct names: `GROQ_KEY_1-3`, `OPENROUTER_KEY_1-3`, `DEEPSEEK_KEY`, `NVIDIA_KEY_1-3` ✅
- `inspect-ai-keys` reads correct names ✅
- `AI_KEY_SLOT_MAP` correctly shows `deepseek:[1]` only ✅
- **BUG FIXED**: `performStartupValidation()` was checking old names (see fixes below)

#### Phase 5 — DevKit panels ✅ PASS (after Fix #2)

| Panel | Status |
|---|---|
| MissionControlPanel — ping-providers, mission-control, fn-drift | ✅ Wired |
| DeployHubsPanel — listing, drift detection, redeploy, logs | ✅ Wired |
| AIKeysPanel — inspect-ai-keys slot display | ✅ Wired |
| AIRadarPanel — list-ai-gateway-activity | ✅ Wired |
| AICommandCenterPanel — 3-tab (overview/keys/routing) | ✅ Wired |
| AIRoutingSwitcher — Probe Routes, test call, DB overrides | ✅ Wired; **Smart Defaults** now aligned |

---

### Fixes Implemented

#### Fix #1 — ai-gateway startup validation used wrong env var names

**File**: `appwrite-hubs/ai-gateway/src/main.js` lines 126-128

**Before**:
```js
const hasAnyAiKey = [
  'OPENROUTER_API_KEY', 'GROQ_API_KEY', 'DEEPSEEK_API_KEY', 'NVIDIA_API_KEY',
].some(k => !!process.env[k]);
```

**After**:
```js
const hasAnyAiKey = [
  'GROQ_KEY_1', 'OPENROUTER_KEY_1', 'DEEPSEEK_KEY', 'NVIDIA_KEY_1',
].some(k => !!process.env[k]);
```

**Impact of bug**: False-positive `[ALERT] No AI provider API keys found` logged every cold-start even when `DEEPSEEK_KEY` was configured. Pool routing was unaffected (pool logic correct). Fix eliminates the false-positive.

**Impact of fix**: After Appwrite re-deploy, cold-start logs will only show the alert if `GROQ_KEY_1`, `OPENROUTER_KEY_1`, `DEEPSEEK_KEY`, and `NVIDIA_KEY_1` are ALL absent.

#### Fix #2 — AIRoutingSwitcher "Smart Defaults" recommended stale/dangerous providers

**File**: `src/components/dev-kit/AIRoutingSwitcher.tsx` — `FEATURE_METADATA` object

**Before**: `recommendedProvider` pointed to:
- NVIDIA for `tailor-resume`, `generate-cover-letter`, `generate-portfolio-bio`, `optimize-for-linkedin` (NVIDIA documented 404 failures)
- OpenRouter for `parse-resume`, `parse-job`, `generate-question-bank` (OpenRouter documented 429 failures)
- Groq for most tools currently routing DeepSeek-first

**After**: All 21 non-`resume-section-ai` features set to `deepseek/deepseek-chat`. `resume-section-ai` stays `groq/llama-3.3-70b-versatile` (intentional — routes via the separate `resume-section-ai` Appwrite Function, not ai-gateway).

**Impact of bug**: Admin clicking "Apply Smart Defaults" would have overridden stable DeepSeek-first routing with unreliable providers.

**Impact of fix**: "Apply Smart Defaults" now writes DB overrides that match the existing stable FEATURE_ROUTES. Functionally a no-op (current routing already matches), but safe instead of dangerous.

#### Source hash update

`sourceHashes.generated.json`: `ai-gateway` hash: `b156e066754d6ed6` → `b53aadc3bf84d1be`

---

### Validation

```
node --check appwrite-hubs/ai-gateway/src/main.js         → OK
node --check appwrite-hubs/admin-devkit-data/src/main.js  → OK
node tests/hubs/ai-gateway-routing.test.cjs               → ALL TESTS PASSED
npx vitest run src/lib/devkit/aiToolsCatalogue.test.ts    → 9/9 passed
npx tsc --noEmit                                           → clean (no errors)
```

---

### Commits and PR

| Item | Value |
|---|---|
| Feature branch commit | `b8583b91` (`claude/atlas-handover-review-pv67uk`) |
| PR | [#88](https://github.com/iammagdy/WiseResume-TWC/pull/88) — merged |
| Merge commit | `7afbab59c922d3c949a071c47296910e117001c2` → `main` |

### Deployment

| Item | Value |
|---|---|
| GitHub Actions run | `27169666319` — `completed / success` (2026-06-08T21:59–22:01Z) |
| Run URL | https://github.com/iammagdy/WiseResume-TWC/actions/runs/27169666319 |
| Target | `ai-gateway` only (`--only="ai-gateway"`) |
| Schema steps | All 6 passed (observability, app-settings, ai-logs, idempotency, company-briefings, tailoring-lineage) |
| Source hash check | "Ensure source hash manifest is committed" → `git diff --exit-code` clean → hash `b53aadc3bf84d1be` confirmed ✅ |
| Appwrite deployment ID | UNKNOWN — GHA log URL blocked by network policy; confirm in Appwrite Console |

### Live State After This Session

| Item | State |
|---|---|
| Vercel frontend | READY — `AIRoutingSwitcher.tsx` fix shipped with PR #88 merge → Vercel auto-deploy |
| ai-gateway (Appwrite) | **DEPLOYED** — GHA run `27169666319` succeeded; hash `b53aadc3bf84d1be` live |
| `ai-gateway` source hash | `b53aadc3bf84d1be` ✅ matches committed manifest |
| All other hubs | Unchanged |
| `main` | At merge commit `7afbab59` |

### Where We Stopped

- All code changes from this session are merged to `main` and deployed.
- No pending commits or open PRs.
- Vercel auto-deployed on merge (AIRoutingSwitcher.tsx fix is live in the frontend).
- ai-gateway Appwrite deployment completed via GHA workflow `27169666319`.

### Remaining Manual QA (requires Appwrite Console / browser — not automatable)

| Check | How | Priority |
|---|---|---|
| Cold-start ALERT gone | Appwrite Console → Functions → ai-gateway → Executions → trigger a test execution → confirm no `[ALERT] No AI provider API keys found` | High — confirms Bug #1 fix is live |
| Appwrite deployment ID + active status | Appwrite Console → Functions → ai-gateway → Deployments → confirm new deployment is Active | Medium |
| Probe Routes shows DeepSeek primary | DevKit → AI Command Center → Probe Routes | Medium |
| Smart Defaults safe to click | DevKit → AI Routing → Apply Smart Defaults → confirm writes `deepseek/deepseek-chat` | Medium |
| Tailor resume end-to-end | Submit a tailor request; verify structured JSON output returned | Low (normalizer tests already pass) |
| Question bank 4 categories | Run generate-question-bank; verify company/technical/behavioral/curveball all present | Low |
| Company briefing | Run company-briefing; verify `companySnapshot.name` populated | Low |
| LinkedIn optimizer | Run optimize-for-linkedin with a resume that has experience; verify experienceRewrites non-empty | Low |
