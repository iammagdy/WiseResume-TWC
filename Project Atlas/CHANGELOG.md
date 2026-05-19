# Project Atlas Changelog

**Last verified:** 2026-05-20
**Type:** changelog
**Sources:**
- `Project Atlas/GOVERNANCE.md`
- `Project Atlas/RULES.md`
- `Project Atlas/MASTER_HANDOVER_2026.md`
- `Project Atlas/SOURCE_OF_TRUTH_MAP.md`
**Canonical owner:** this file

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

## 2026-05-20 — RevenueCat Web + Mobile Payments Integration

### Summary
Integrated RevenueCat as the payment gateway for web and mobile. Web SDK (`@revenuecat/purchases-js`) initialized after auth, real purchase flow replaces all "coming soon" upgrade CTAs, a new Appwrite Function (`revenuecat-webhook`) receives RC events and syncs subscription state, and the mobile paywall's RC initialization is wired up in the root layout.

### Architecture
- Billing engine: RC Billing + Stripe
- Entitlement IDs: `pro` and `premium` — match existing plan strings
- Sync: Webhook-driven — RC fires `INITIAL_PURCHASE` / `RENEWAL` / `CANCELLATION` → `revenuecat-webhook` Appwrite Function updates `subscriptions` collection
- Coupon UI removed from `UpgradeDialog`, `UpgradeWall`, `SubscriptionPage` (replaced by RC promo codes)

### Files changed
- `src/lib/revenuecat.ts` — NEW singleton configure/get
- `src/providers/RevenueCatProvider.tsx` — NEW auth-aware SDK init context
- `src/hooks/useRevenueCat.ts` — NEW offerings, purchase, getCustomerInfo hook
- `src/AppInterior.tsx` — added `<RevenueCatProvider>`
- `src/components/plan/UpgradeDialog.tsx` — replaced coupon form with RC purchase buttons + live prices
- `src/components/plan/UpgradeWall.tsx` — replaced "coming soon" toast with RC purchase + live prices
- `src/pages/SubscriptionPage.tsx` — RC purchase buttons, manage subscription link, coupon UI removed
- `src/lib/appwrite-functions.ts` — removed `validate-coupon` / `redeem-coupon` from COUPON_FUNCTIONS
- `appwrite-hubs/revenuecat-webhook/` — NEW Appwrite Function (signature verified, handles 6 event types)
- `scripts/deploy_hubs.cjs` — added `revenuecat-webhook` hub + env var block
- `.env.example` — added `VITE_REVENUECAT_WEB_API_KEY`
- `mobile/app/_layout.tsx` — RC initialization after user identity loads

### Verification
- `npm exec tsc -- --noEmit` — zero errors
- `node --check appwrite-hubs/revenuecat-webhook/src/main.js` — clean

### Prerequisites (RC dashboard — user action required)
1. Create Web Billing app → get `VITE_REVENUECAT_WEB_API_KEY`
2. Connect Stripe account
3. Create Pro ($9/mo) and Premium ($19/mo) products
4. Create entitlements `pro` and `premium`
5. Create one Offering with two packages linked to those entitlements
6. Set `REVENUECAT_WEBHOOK_SECRET` → configure webhook URL (Appwrite Function HTTP endpoint)
7. Add iOS + Android apps → set `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` in Expo env

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
