# WiseResume Current Production State Snapshot

**Last Verified:** 2026-09-03
**Status:** `WHATS_NEW_IMPLEMENTED_LOCAL_BROWSER_VERIFIED / VERCEL_PREVIEW_READY_REMOTE_QA_PENDING` (Audit Baseline: `FULL_FUNCTIONALITY_AUDIT_P1_CLOSEOUT_COMPLETE`, Billing: `BILLING_CHECKOUT_DISABLED`) — Redesigned customer-facing `/whats-new` and `/ar/whats-new` experiences implemented on branch `feat/whats-new-revamp`. Shipped history reconciled through 2026-09-03 (40 verified releases):
* **What's New Page Full Revamp & Shipped-History Reconciliation (2026-09-03):** `WHATS_NEW_IMPLEMENTED_LOCAL_BROWSER_VERIFIED / VERCEL_PREVIEW_READY_REMOTE_QA_PENDING` — Transformed `/whats-new` and `/ar/whats-new` from an un-scannable 9,427px chronological feed into a modern, responsive release hub. Features: Latest Highlights (top 3 September releases: More Reliable Native PDF Exports, Asynchronous LinkedIn Profile Optimization, and Instant Tailoring Cancellation), dual Type (`All` | `New` | `Improved` | `Fixed`) and Product Area (`All Areas` | `Resume & Portfolio` | `AI & Tailoring` | `Jobs & Career` | `Platform` | `Security & Legal`) filters, Month Jump selectors, clean monthly section dividers, and progressive disclosure for the older 2025 archive. Strictly qualified all public customer-facing copy against production evidence: removed unmeasured bandwidth/battery claims, eliminated "across all templates" / "pixel-perfect" PDF absolutes, qualified autosave to factual Appwrite read deduplication, tempered tailoring cancellation to client lifecycle clearing, and framed portfolio contact around Turnstile spam prevention. Assigned explicit `updateType: 'new' | 'improved' | 'fixed'` across all 40 releases (19 new, 16 improved, 5 fixed). Full test suite (7 files, 49 tests) and production build passed cleanly. Local browser QA verified across all 8 matrix combinations (Desktop 1440px & Mobile 390px x EN LTR & AR RTL x Light & Dark) with 0 console errors and 0px horizontal overflow. Remote Vercel Preview browser QA pending deployment verification.
* **AI Studio LinkedIn Optimizer Async Remediation & Production Verification (2026-09-03):** `AI_STUDIO_LINKEDIN_408_P1_DEPLOYED_PRODUCTION_VERIFIED` — PR #278 merged into `main` (`ba32c3bfbd9514db2f5dd9c44ec8770f47d36e16`) following backend-first rollout. Targeted `ai-gateway` deployed via GitHub Actions workflow run `33739650073` (deployment ID `6a993f8a964aa9a65327`, status `ready`). Live pre-merge probe verified `X-AI-Result-Only: true` returned 503 `result_unavailable` in 633ms without provider execution or credit deduction. Automatic Vercel Production deployment `8JwoQdtnRGsJ6KV7rnqDVg6xgM3G` completed `READY`. Live authenticated browser QA on `https://wiseresume.app/ai-studio/linkedin` executed real LinkedIn optimization: initial execution created asynchronously (`async: true`), seamlessly routed through server-owned `X-AI-Result-Only: true` polling fallback (with 409 `request_in_progress` handling), completed in 9.1s with zero HTTP 408 timeouts. Complete structured output contract verified (4 tailored headlines, short/medium/long About sections, experience rewrites, 10 suggested skills, 10 keywords, 5 actionable tips). UI verified: leaves loading state, Copy All works, Word DOCX download verified with downloaded file `LinkedIn_Profile_Ahmed_Hassan.docx` (9,786 bytes). Usage accounting verified: The server recorded one unit of AI usage for accounting (`daily_usage` 10 -> 11, `total_usage` 135 -> 136). The Ultimate entitlement remained unlimited; no finite quota was reduced or exhausted. Result-only cached reads verified 0 additional usage. In-flight client cancellation verified clean with zero unhandled error toasts. Pro metered verification status preserved as `NOT_LIVE_METERED_VERIFIED`. No new schema migration was introduced by PR #278. The approved targeted `ai-gateway` deployment re-ran the workflow's normal idempotent schema/permission provisioners; existing required attributes/indexes were reported as already present (`APPWRITE_PRODUCT_SCHEMA_CHANGE = NO`).
* **Native PDF Export P1 Remediation (2026-09-03):** `PDF_EXPORT_P1_DEPLOYED_PRODUCTION_VERIFIED` — PR #276 merged and deployed via Vercel Production deployment `3rZbgn2aGhWC739Bu4UgBMh2ni11` (`READY` at `2026-09-03T08:21:41Z`, Vercel Production Node 24.x ESM runtime). Bootstrap probes verified: `GET /api/export/pdf-native` returns HTTP 405 (`{"error":"method_not_allowed"}`), unauthenticated POST returns HTTP 401 (`{"error":"unauthorized"}`). Authenticated production browser QA verified real downloaded PDF files across 5 distinct surfaces: Designed PDF (30,349 bytes, `%PDF-`, 1 page, valid), ATS-Focused PDF (31,560 bytes, `%PDF-`, 1 page, valid), Preview Page PDF (119,994 bytes, `%PDF-`, 1 page, valid), Cover Letter PDF (23,901 bytes, `%PDF-`, 1 page, valid), and Tailoring Hub Result PDF (23,447 bytes, `%PDF-`, 1 page, valid). Other PDF paths (1-Page wizard, Combined PDF, Share drawer) are `TRANSPORT_PATH_RESTORED / UI_SURFACE_NOT_INDIVIDUALLY_REVERIFIED`. Root cause status: `ROOT_CAUSE_PRODUCTION_CONFIRMED_BY_REMEDIATION`.
* **Full End-to-End Functionality & Production Audit (2026-09-02 / Updated 2026-09-03):** `FULL_FUNCTIONALITY_AUDIT_P1S_RESOLVED` — Both critical P1 product defects identified by the 2026-09-02 full functionality audit — Native PDF Export and AI Studio LinkedIn Optimizer HTTP 408 — are now production verified as resolved. Stage 1 (Public & Static) verified 24 public routes, 14 protected guards, 15 viewports, 0 error leaks, and 0 TODOs. Stage 2 (Authenticated Browser Lifecycle QA) verified Dashboard (40 resumes), Resume Creation (guided intake), Tailoring Hub full lifecycle, Remote Jobs & Fast Tailor, Cover Letter generation and DB save, AI Studio tools (Company Briefing, LinkedIn Optimizer, Enhance), Portfolio editor (7 tabs) and anonymous public portfolio view, Settings & Notifications, Arabic / RTL layout, and mobile 390px containment. Real downloads verified for Word Document (`.docx`, 9.2 KB), JSON Backup (`.json`, 1.4 KB), 4K Image (`.png`, 937 KB), Native LinkedIn Word DOCX (`.docx`, 9.8 KB), and all 5 tested PDF export surfaces.
* **Phase 2 Optimizations (P2-1, P2-2, P2-3A, P2-3B):** `DEPLOYED_PASS_WITH_BROWSER_QA_PENDING` — All four planned Phase 2 optimization workstreams merged to `main` and deployed to production on Vercel:
  - P2-1 (`useMe` 15s -> 5m poll interval) merged in PR #265 (`541698e`).
  - P2-2 (Autosave cache direct reconciliation / deduplication) merged in PR #267 (`19f2ea4`).
  - P2-3A (Shared Tailoring execution poll interval 750ms -> 1500ms) merged in PR #269 (`f10ac60`).
  - P2-3B (Tailoring client lifecycle cancellation across all 6 entry points & fallback abort hardening) merged in PR #271 (`9ce48abb`), documentation reconciled in PR #272 (`13a7996a`). All 35 tests pass across suites. In-flight boundary: `IN_FLIGHT_APPWRITE_WRITE_NOT_CLIENT_CANCELLABLE`. Authenticated browser QA remains `BLOCKED_AUTHENTICATED_RUNTIME_QA`.
* **P1 Pre-Load-Test Stabilization:** `P1_DEPLOYED_VERIFIED_READY` — Product PR #263 merged into `main` at `176df210c6c1ed5a7e05a2cdeea94e792522c819`; documentation closeout PR #264 merged at `ff8eee9633cc9bcfbaa91741e1e627586745d2bf`. Targeted `email-service` deployment and production runtime verification were completed successfully. P1-1 (Public contact form) routed to `email-service` (`execute: ["any"]`) with Turnstile & durable `email_rate_limits` checks. P1-2 (Custom domain scan) fail-closed with 501 `custom_domains_not_supported`.
* **What's New Remediation (PR #260):** `VERIFIED_READY` — PR #260 (`fix/whats-new-timeline-locale-routing`, HEAD `e9aed13d44f49bde1fe5fffbf7653241208abfba`) merged into `main` at merge SHA `4126c445c6c387057380f3d1279c0973c41b30a4`. Production Vercel deployment `dpl_9T8y4dZqVXoULMCVdLWvWUhvJkcK` completed with status `READY`. Live visual verification confirmed by owner on `https://wiseresume.app/whats-new` and `https://wiseresume.app/ar/whats-new`.
* **Paddle Domain Review & Activation Outcome:**
  - Historical site-readiness state: `PADDLE_DOMAIN_REVIEW_SITE_READY` (PR #256 merged @ `1ee534aeb0fce2844f5d03e2ba1ca755f056491b`; deployment `8Fo4XQe7PLPvQM39xggzPeXUKTYB`; 17/17 live Playwright verification).
  - Current provider-review outcome: `PADDLE_APPLICATION_REJECTED_CATEGORY_AUP`. On 2026-08-31, Paddle notified owner that wiseresume.app was categorized as "Other/Resume/CV Builders", which is not supported under Paddle's Acceptable Use Policy. Paddle offered an appeal option. Production checkout remains strictly disabled; appeal or alternative provider evaluation is an owner decision.
* **Billing Safety State:** Production billing remains strictly disabled (`BILLING_CHECKOUT_ENABLED=false`). Payment baseline state preserved: `P4_CATALOG_RECONCILIATION_SUCCESS` (run `33376804507`) and `P4_PREFLIGHT_SAFE_BUT_ORIGIN_UNVERIFIED` (run `33376897666`). Zero checkouts/payments created.

**Repository:** `iammagdy/WiseResume-TWC`
**Production:** `https://wiseresume.app`

## P2-3B Tailoring Client Lifecycle Reconciliation (Merged & Deployed) — 2026-09-02

* **Workstream Status:** `P2_3B_DEPLOYED_PASS_WITH_BROWSER_QA_PENDING`.
* **Merge Commit:** [`9ce48abb90e51decc56cd754ca9d52a1f267b050`](https://github.com/iammagdy/WiseResume-TWC/commit/9ce48abb90e51decc56cd754ca9d52a1f267b050) (`main`).
* **Merged PR:** [PR #271](https://github.com/iammagdy/WiseResume-TWC/pull/271) (Merged at `2026-09-02T09:09:08Z`, reviewed head `f6c2976374e7424792a22b1c68c0b973b319d227`).
* **Vercel Production Deployment:** **`SUCCESS`** (`Deployment has completed`, deployment URL: `https://vercel.com/iam-magdy/wise-resume-twc/5FH2EX8T5EVgPf4mNg5ZDsm8VgH8`).
* **Appwrite Deployment:** **`NOT REQUIRED / NOT PERFORMED`** (Frontend-only lifecycle reconciliation and client-side transport hardening).
* **Baseline SHA before merge:** [`1718fe7704de550fdfc402fbe85ab0331311b384`](https://github.com/iammagdy/WiseResume-TWC/commit/1718fe7704de550fdfc402fbe85ab0331311b384).
* **Six-Caller Production Inventory & Corrective Pass:**
  1. `src/pages/TailoringHubPage.tsx`: Full-page route; unmount cleanup and intermediate post-await guards added after `createDocument` (blocking `addTailorHistory`) and after `invalidateAiCreditQueries` (blocking toast/navigation). Stale finally protected via request ownership.
  2. `src/pages/TailorPage.tsx`: Full-page workspace; unmount cleanup added; resume selector is disabled during active tailoring (`isTailoring || isApplying`). Stale `finally` race resolved via request ownership (`ownsCurrentRequest && !abort.signal.aborted`) so early cancel followed by immediate retry cannot have Request A clear Request B's active UI state.
  3. `src/components/editor/TailorSheet.tsx`: Editor drawer; unmount and close (`open=false`) cleanup resets transient active-run state (`setIsTailoring(false); setProgress(null)`), preventing reopened sheet from remaining stuck in tailoring. Stale finally protected via request ownership.
  4. `src/components/landing/QuickTailorSheet.tsx`: Landing sheet; dedicated component unmount cleanup (`useEffect(() => () => { abortRef.current?.abort(); abortRef.current = null; }, [])`) guarantees in-flight requests abort if the component unmounts while `open=true`. Synchronously resets active `processing` step and progress on close; rapid reopen within <300ms immediately reconciles step, preventing sheet from reopening stuck on processing.
  5. `src/pages/RemoteJobsPage.tsx`: Fast Tailor action; `AbortController` instantiated and `signal` passed; unmount aborts; intermediate post-await guards added after `generateCoverLetter` (suppressing cover-letter failure toast when abandoned) and after `invalidateAiCreditQueries` (blocking query invalidation, toast, and navigation). Stale finally protected via request ownership.
  6. `src/components/dashboard/SetTargetJobSheet.tsx`: Target job sheet; `AbortController` instantiated and `signal` passed; unmount and close (`open=false`) resets transient state (`phase` back to `'input'`, `progress` cleared, `isSavingMatch` cleared); nested save `finally` and outer `finally` protected via request ownership (`abortRef.current === abort`).
* **Shared Fallback Transport Hardening:**
  - In `src/lib/appwrite-functions.ts`: Added `throwIfAborted(signal)` immediately after synchronous `await functions.createExecution(...)` in `waitForTailorResult`.
  - Proves: In-flight abort while fallback request is resolving cleanly throws `request_cancelled` (499) and discards the late result rather than surfacing it.
* **Authoritative Semantic Boundary & Classification Tag:**
  - `IN_FLIGHT_APPWRITE_WRITE_NOT_CLIENT_CANCELLABLE`: Client abort prevents new client-side Tailoring side effects from being initiated after cancellation is observed. It stops Tailoring polling/waiting and drops late Tailoring results. It cannot cancel an Appwrite database/function HTTP operation that was already issued before the abort boundary, unless that specific API accepts and honors the AbortSignal.
* **Validation & Test Coverage:**
  - `src/lib/__tests__/appwrite-functions.tailoring.test.ts` (8/8 passing).
  - `src/pages/__tests__/RemoteJobsPage.test.tsx` (5/5 passing).
  - `src/pages/__tests__/TailoringHubPage-recovery.test.tsx` (5/5 passing).
  - `src/pages/__tests__/tailoring-client-lifecycle.test.tsx` (10/10 passing).
  - `src/lib/__tests__/aiTailor-D1.test.ts` (7/7 passing).
  - Total: 35 passing tests across tailoring test suites.
  - `tsc --noEmit`: 0 errors.
  - Production build: clean in 38.72s.
* **Runtime QA Status:** `BLOCKED_AUTHENTICATED_RUNTIME_QA`.
* **Deployment Impact:** Frontend-only release; Appwrite deployment not required / not performed.

---

## P2-3A Tailoring Execution Polling Optimization (Merged & Deployed) — 2026-09-02

* **Workstream Status:** `P2_3A_DEPLOYED_PASS_WITH_BROWSER_QA_PENDING`.
* **Merge Commit:** [`f10ac6064bb834eaf45ddeb049580496cf29bfbd`](https://github.com/iammagdy/WiseResume-TWC/commit/f10ac6064bb834eaf45ddeb049580496cf29bfbd) (`main`). PR #269 merged at `2026-09-02T08:04:41Z` (reviewed head `bda24ae38681eb8378fecd3d9b2fb5b0a7e35e55`).
* **Deployment Status:**
  - Vercel Production: `SUCCESS` (`Deployment has completed`, deployment URL: `https://vercel.com/iam-magdy/wise-resume-twc/FumbCPpW68kSEGZNivKe9MSgJjjf`).
  - Appwrite Functions: `NOT REQUIRED / NOT PERFORMED` (client-side transport constant change only).
* **Problem Solved & Root Cause:**
  - `src/lib/appwrite-functions.ts` previously polled `functions.getExecution(functionId, executionId)` every 750ms.
  - Polling at 750ms created elevated client-to-Appwrite HTTP chatter: ~40 reads per 30-second illustrative execution (up to 100 reads on 75s timeout).
* **Implementation Details:**
  - Changed `TAILOR_EXECUTION_POLL_MS` from `750` to `1_500` (1.5 seconds) in `src/lib/appwrite-functions.ts`.
  - Preserved: 75s frontend timeout, initial async execution creation, terminal status handling, synchronous result retrieval with `X-Tailor-Result-Only: true`, and 401/403/404 fallback recovery (`waitForTailorResult`).
* **Request Impact (`THEORETICAL_STATIC_REQUEST_COUNT` / `THEORETICAL_UPPER_BOUND`):**
  - Expected normal status read reduction: ~50% (30-second illustrative execution ~40 reads -> ~20 reads; 60-second theoretical normal-path execution ~80 reads -> ~40 reads; 75s timeout ~100 reads -> ~50 reads).
  - Fallback `waitForTailorResult` traffic is a separate path and is not reduced by this change.
  - Expected small completion-detection latency increase; production user-perceived impact remains unverified because authenticated runtime/browser QA was not available.
* **Cancellation Finding:**
  - `P2_3B_CALLER_LIFECYCLE_CANCELLATION_AUDIT_REQUIRED` (Historical finding — subsequently resolved by P2-3B, merged/deployed via PR #271): caller lifecycle across multiple entry points (`TailoringHubPage`, `TailorSheet`, `TailorPage`, `QuickTailorSheet`, etc.) required separate reconciliation.
  - Semantic boundary: Aborting client signal stops browser polling; does not stop running serverless function on Appwrite.
* **Validation & Test Coverage:**
  - `src/lib/__tests__/appwrite-functions.tailoring.test.ts` (7/7 passing).
  - `src/lib/__tests__/aiTailor-D1.test.ts` (7/7 passing).
  - `src/pages/__tests__/TailoringHubPage-recovery.test.tsx` (3/3 passing).
  - `tsc --noEmit`: 0 errors.
  - Production build: clean (0 sourcemaps).
* **Runtime QA Status:** `BLOCKED_AUTHENTICATED_RUNTIME_QA`.
* **Deployment Status:** Appwrite not required / not performed.

---

## P2-2 Autosave Cache Invalidation Optimization (Merged & Deployed) — 2026-09-02

* **Workstream Status:** `P2_2_DEPLOYED_PASS_WITH_BROWSER_QA_PENDING`.
* **Merge Commit:** [`19f2ea4402bd5ac0ad7d312b9bfbbb163e8531a2`](https://github.com/iammagdy/WiseResume-TWC/commit/19f2ea4402bd5ac0ad7d312b9bfbbb163e8531a2) (`main`). PR #267 merged at `2026-09-02T07:34:15Z` (reviewed head `eb11a5e0236b90c1b3cd83e9c207b4e4e1e321ec`).
* **Deployment Status:**
  - Vercel Production: `SUCCESS` (`Deployment has completed`, deployment URL: `https://vercel.com/iam-magdy/wise-resume-twc/A4WFtfvCSnoAeN5K1AaJqCTYA3oF`).
  - Appwrite Functions: `NOT REQUIRED / NOT PERFORMED` (client-side React Query optimization only).
* **Problem Solved & Root Cause:**
  - `updateResume.onSuccess` previously called broad query invalidations (`['resumes']` and `['resume', data.$id]`).
  - Active global observer `<CommandPalette />` (`['resumes', user.id]`) and active editor observer `EditorPage` (`['resume', targetId]`) triggered 2 redundant network read requests (`listDocuments` of 50 resumes + `getDocument` of the active resume) on every 3-second debounced cloud save.
  - Eliminated the 1:2 write-to-read amplification (3 Appwrite HTTP requests per autosave reduced to 1 write).
* **Implementation Details:**
  - `reconcileUpdatedResume`: Pure helper to replace matching document by `$id`, insert authoritative document when `$id` is absent, sort `$updatedAt` descending, and truncate list to maximum 50 items (preserving server `Query.limit(50)` contract).
  - Detail cache: Reconciles `['resume', updatedDoc.$id]` directly via `queryClient.setQueryData`, eliminating `getDocument` refetches.
  - List cache: Patches user's exact `['resumes', user.id]` query via `queryClient.setQueryData` (if cache exists), enforces ownership guard (`!exists && updatedDoc.user_id !== user.id` blocks insertion), preserves `$updatedAt` descending order, caps to 50 items, and synchronizes persisted cache via `writePersistedCache(\`resumes:${user.id}`, reconciled)`. Does not fabricate list cache if none exists.
  - Omitted active refetch invalidations (`invalidateQueries`) as direct authoritative cache reconciliation provides fresh data synchronously.
* **Validation & Test Coverage:**
  - `src/hooks/__tests__/useResumes.autosaveOptimization.test.tsx` (8/8 passing).
  - Existing resume suites: `useResume.editorStartup.test.tsx` (5/5 passing), `useResumes.template.test.ts` (7/7 passing).
  - `tsc --noEmit`: 0 errors.
  - Production build: clean (0 sourcemaps).
* **Runtime QA Status:** `BLOCKED_AUTHENTICATED_RUNTIME_QA` (static proof via automated unit tests and TanStack Query semantics).

## P2-1 useMe Polling Optimization (Merged & Deployed) — 2026-09-01

* **Workstream Status:** `DEPLOYED_PASS_WITH_BROWSER_QA_PENDING`.
* **Merge Commit:** [`541698e675bece621529fc3f7b868fad3a419eb6`](https://github.com/iammagdy/WiseResume-TWC/commit/541698e675bece621529fc3f7b868fad3a419eb6) (`main`). PR #265 merged at `2026-09-01T13:48:10Z` (reviewed head `d0441355dcc0919d87cb640ddc0009e0b9727399`).
* **Deployment Status:**
  - Vercel Production: `SUCCESS` (`Deployment has completed`, deployment URL: `https://vercel.com/iam-magdy/wise-resume-twc/H5d3Nf9yV8nDr2ucUECYWQari7ba`).
  - Appwrite Functions: `NOT REQUIRED / NOT PERFORMED` (client-side React Query optimization only).
* **Change Summary & Theoretical Impact:**
  - In `src/hooks/useMe.ts`: Relaxed `refetchInterval: 15 * 1000` to `refetchInterval: 5 * 60 * 1000` (5 minutes = 300,000ms).
  - Expected static request pattern for a continuously visible active tab: approximately 480 top-level browser Appwrite HTTP requests/hour before the change versus approximately 24/hour after the change, representing an expected theoretical reduction of approximately 95% (`EXPECTED_STATIC_REQUEST_REDUCTION`). Authenticated production runtime traffic was not measured in this phase. Background-tab interval polling is not enabled.
  - Preserved 5-minute interval as safety net for provider-only lifecycle changes (e.g. RevenueCat in `revenuecat_subscription_state` while client Realtime listens to `subscriptions`).
  - Preserved `staleTime: 60 * 1000`, `refetchOnWindowFocus: true`, and Realtime WebSocket listener on `subscriptions.documents`.
  - Added dedicated unit test suite `src/hooks/__tests__/useMe.test.tsx` (5/5 passing).
* **Production Runtime QA Status:**
  - Authenticated Browser QA: `BLOCKED_AUTHENTICATED_RUNTIME_QA` (no test user credentials in workspace; customer credentials not permitted).
  - AI Credit Runtime QA: `AI_CREDIT_RUNTIME_QA_NOT_PERFORMED`.
  - Fake-timer unit tests verify the exact 300s interval and Realtime invalidation.

## P1 Pre-Load-Test Stabilization (Deployed & Production-Verified) — 2026-09-01

* **Workstream Status:** `DEPLOYED_VERIFIED_READY` (`P1_DEPLOYED_VERIFIED_READY`) — PR #263 merged into `main` at `176df210c6c1ed5a7e05a2cdeea94e792522c819`; documentation PR #264 merged into `main` at `ff8eee9633cc9bcfbaa91741e1e627586745d2bf`; targeted Appwrite `email-service` deployed; production runtime security, custom-domain 501 fail-close, and full owner happy-path delivery verified in live production.
* **Owner Confirmation Recorded:** `OWNER_VERIFIED_PORTFOLIO_CONTACT_HAPPY_PATH`
  - Logged-out browser submission: **PASS**
  - Cloudflare Turnstile positive path: **PASS**
  - Actual inbox delivery to intended owner email: **PASS**
  - Correct in-app `portfolio_message` owner notification: **PASS**
  - Notification persistence after refresh/reopen: **PASS**
* **Owner Decision Recorded:** `OWNER_APPROVED_TEMPORARY_CUSTOM_DOMAIN_BETA_DISABLE` — Incomplete WiseResume custom-domain portfolio beta remains fail-closed with HTTP 501 until intentionally implemented using an indexed, server-owned lookup.
* **Scope & Boundary Limits:** Broader application scalability has **NOT** been verified. P2/P3 findings remain untouched and unresolved for a subsequent authorized phase.
* **Deployment & Verification Details:**
  - Appwrite Deployment: `DEPLOYED` — Workflow run `33508861238` succeeded in 1m45s. Deployment ID: `6a96c79aa3c6c53e6cdf` (status `ready`). Targeted hub: `email-service` (`execute: ["any"]`).
  - Vercel Production: `DEPLOYED` — Deployment `4u755CpdjZ8dY3Qjamk6ksyDLs7t` (status `success`).
  - Runtime Browser QA: `VERIFIED` — Logged-out public portfolio loads at `https://wiseresume.app/p/magdy` with HTTP 200, no auth redirect, contact form and honeypot present.
  - Custom-Domain Fail-Close: `VERIFIED` — `GET /api/public-portfolio?mode=domain&domain=example.com` returns HTTP 501 Not Implemented with `{"error":"custom_domains_not_supported"}` instantaneously. Normal `/p/magdy` verified working immediately afterward.
  - Security Negative Paths: `VERIFIED` — Tested live against deployed `email-service`: generic action (`send-contact-email`) and wrong message type (`type: 'bug'`) rejected with HTTP 400; missing Turnstile rejected with HTTP 403 `{"error":"Security check required."}`; invalid Turnstile token rejected via Cloudflare Turnstile API with HTTP 403 `{"error":"Security check failed. Please try again."}`; honeypot trap silently returns HTTP 200 without email dispatch.
  - Trusted Client IP: Trusted `x-appwrite-client-ip` runtime value verified; value redacted from documentation.
  - Delivery Contract & Inbox: `VERIFIED` (Confirmed by owner inbox receipt).
  - Owner In-App Notification: `VERIFIED` (Confirmed by owner notification tray inspection and persistence).
* **P1-1 Public Portfolio Contact Form & Routing Isolation:**
  - Dedicated Public Route: Created isolated action `send-portfolio-contact-email` routed to public `email-service` hub (`execute: ["any"]`), invoked exclusively from `PortfolioContactForm`. Action override guard in `src/lib/appwrite-functions.ts` spreads `action: 'send-portfolio-contact-email'` after `...finalPayload` to prevent caller payload override.
  - Preserved Generic Routing: Restored `send-contact-email` inside `AI_HUB_FUNCTIONS` in `src/lib/appwrite-bridge.ts`, ensuring generic feedback, bug reports, auto-crash reports (`src/lib/sendFeedback.ts`), and username requests (`UsernameRequestDialog.tsx`) continue routing through `ai-gateway` with full crash deduplication and persistence.
  - Execution Boundary: `ai-gateway` execution boundary remains strictly authenticated (`execute: ["users"]`).
  - Trusted Client IP: Extracted exclusively from `req.headers['x-appwrite-client-ip']` (injected at Appwrite Cloud infrastructure gateway). Caller-supplied `body?.__headers` and spoofable proxy headers (`x-forwarded-for`, `x-real-ip`) are strictly ignored. Missing platform IP falls back to `unknown`.
  - Cloudflare Turnstile & Honeypot: Validates Turnstile tokens as an additional abuse-control layer (with fallback to user session JWTs). Honeypot field (`website`) silently succeeds without invoking email dispatch or notifications.
  - Narrow Security Boundary: `email-service` accepts only `action: 'send-portfolio-contact-email'` and `msgType: 'portfolio_contact'`. Generic contact, bug, feature, or crash actions are strictly rejected with HTTP 400.
  - Rate-Limit Concurrency Semantics: Concurrency-safe persistent limiter using deterministic hourly time-bucket document IDs (`sha256("pf_contact:" + rateKey + ":" + hourBucket).slice(0, 32)`). Limits abuse to `3 portfolio-contact submissions per rate identity per fixed hourly bucket`. Documents are initialized at zero with window expiration, and quota slots are reserved solely via Appwrite's server-side atomic attribute increment endpoint (`incrementDocumentAttribute(..., max=3)`). Eliminates mutable window reset races completely without introducing Redis or new backends.
  - Portfolio owner resolved server-side from `profiles`; email delivered via Resend with `reply_to: visitorEmail`; in-app notification created with permissions strictly scoped to `Role.user(ownerUserId)`.
  - Updated `scripts/deploy_hubs.cjs` to ensure `TURNSTILE_SECRET_KEY` is provided to `email-service` without logging secret values.
  - Recomputed `src/lib/devkit/sourceHashes.generated.json` for CI deployment gate compliance.
* **P1-2 Custom Domain Public Scan:**
  - Fail-closed `GET /api/public-portfolio?mode=domain` with HTTP `501 Not Implemented` (`custom_domains_not_supported`) without scanning unindexed profile documents.
  - Immediate `null` return in `findProfileByCustomDomain` prevents any 5,000-document offset loops. Standard username portfolio lookups (`/p/:username`) are unaffected.
  - Custom domain beta disable is owner-approved and active in production code.
* **Validation Evidence:**
  - 17/17 hub tests passed (`tests/hubs/email-service-portfolio-contact.test.cjs`, `email-service-verification.test.cjs`, `appwrite-function-policy.test.cjs`).
  - 59/59 Vitest tests passed across all relevant suites.
  - `node --check appwrite-hubs/email-service/src/main.js` passed cleanly.
  - `npx tsc --noEmit` passed with 0 errors.
  - `npm run build` passed (0 sourcemaps).
  - `git diff --check` passed cleanly.
* **Deployment & Rollback Controls:**
  - Appwrite: GitHub Actions workflow `.github/workflows/deploy-appwrite-hubs.yml` with input `target: email-service`. No `target=all`.
  - Frontend Rollback: Repository-controlled only (`git revert on main → normal Vercel deployment from main`). No manual Vercel dashboard rollback.

## What's New Product Updates Hub & Public Locale Routing (PR #260) — 2026-09-01

* **Workstream Verdict:** `VERIFIED_READY` (PR #260 merged into `main` at commit `4126c445c6c387057380f3d1279c0973c41b30a4`; Vercel Production deployment `dpl_9T8y4dZqVXoULMCVdLWvWUhvJkcK` completed with status `READY`).
* **PR Details:**
  * PR: `#260`
  * Branch: `fix/whats-new-timeline-locale-routing`
  * PR Head: `e9aed13d44f49bde1fe5fffbf7653241208abfba`
  * Merge SHA: `4126c445c6c387057380f3d1279c0973c41b30a4`
  * Production Vercel Deployment: `dpl_9T8y4dZqVXoULMCVdLWvWUhvJkcK` (`READY`)
  * Production URL: `https://wiseresume.app`
* **Owner Live Manual Verification (Production Confirmation):**
  * Live `/whats-new` visually looked correct.
  * Live `/ar/whats-new` visually looked correct.
  * Month timeline visually looked correct.
  * Visual presentation approved by owner.
* **Automated & Local Pre-Merge Validation Evidence:**
  * Locale authority and storage override invariants proven via automated tests (`publicLocaleRouting.test.ts`, `LocaleProvider.test.tsx`).
  * 47/47 Vitest passed across 7 locale and content test files.
  * `npm run test:i18n` passed (11 namespaces), `npm run test:i18n:coverage` passed (13 surfaces).
  * `npx tsc --noEmit` passed (0 errors), `npm run build` passed (47.84s, 0 sourcemaps), `git diff --check` passed.
* **Remediation Delivered:**
  * Timeline navigation derives dynamically from the current reconciled 34-item public release dataset with normalized `YYYY-MM` month keys (eliminating stale list and 2026 month hiding).
  * Public route locale authority enforced on `/whats-new` (English LTR) and `/ar/whats-new` (Arabic RTL), while preserving authenticated user preference for private routes.
* **Governance System Added:**
  * Permanent What's New evaluation section added to `Project Atlas/RULES.md` (Section 9).
  * Operational skill created at `Project Atlas/skills/whats-new-maintenance.md`.
  * Mandatory What's New closeout gate added to `Project Atlas/skills/documentation-closeout.md`.
  * Registered in `Project Atlas/skills/SKILLS_INDEX.md` and `Project Atlas/SOURCE_OF_TRUTH_MAP.md`.
  * Merged into `main` via PR #261 at merge SHA `2744eb1bd374d50fdaa699cb8045d49de94e169f`.

## Payments Phase P4 Paddle Domain Review Readiness & Legal Accuracy Hardening — 2026-08-31

* **Verdict:** `PADDLE_DOMAIN_REVIEW_SITE_READY` (PR #256 merged into `main` at commit `1ee534aeb0fce2844f5d03e2ba1ca755f056491b`; Vercel Production deployment `8Fo4XQe7PLPvQM39xggzPeXUKTYB` succeeded; Playwright Chromium live production QA passed 17/17 tests).
* **PR #255 Merged:** Commit `bb6b7def3a60c193b11428d9c50249d4ae7d133f`.
* **PR #256 Merged:** Commit `1ee534aeb0fce2844f5d03e2ba1ca755f056491b` (Legal accuracy hardening for Paddle domain review).
* **Vercel Production Deployment:** Deployment ID `8Fo4XQe7PLPvQM39xggzPeXUKTYB` on merge SHA `1ee534aeb0fce2844f5d03e2ba1ca755f056491b` completed with status `SUCCESS` (`Deployment has completed`). Alias: `https://wiseresume.app`.
* **Real Production Browser QA Evidence (Playwright Chromium):**
  - Live Target Host: `https://wiseresume.app`
  - Routes Tested: `/`, `/pricing`, `/terms`, `/privacy`, `/refund-policy`, `/ar/terms`, `/ar/privacy`, `/ar/refund-policy` (8 routes, 17 test cases, 100% PASS).
  - Exercised Combinations: Desktop 1280x800, Mobile ~390x844, English LTR, Arabic RTL (`dir="rtl"`), Light mode, Dark mode, persistent legal footer links, direct public access (no auth redirect), and contact dialog modal trigger (`[role="dialog"]`). No horizontal scroll overflow.
  - Verified Content Accuracy: August 31, 2026 dates live across Privacy, Terms, and Refund policies; Terms cancellation references Paddle purchase communications/support (no "cancel from Settings" claim); no "Data Protection Officer" claims; conditional statutory withdrawal rights; Paddle MOR disclosures.
* **Paddle Reviewer Matrix Verification:**
  - Product Description: `PASS`
  - Pricing: `PASS` ($5/mo Pro, $10/mo Ultimate)
  - Features: `PASS`
  - Terms: `PASS`
  - Privacy: `PASS`
  - Refund: `PASS`
  - Footer / Navigation Links: `PASS`
  - WiseResume Brand: `PASS`
  - HTTPS: `PASS`
  - Logged-Out Access: `PASS`
* **GitHub Check Evidence for PR #256:**
  - PR Validation: `PASS` (Job `99468908403`)
  - Security Validation: `UNVERIFIED` as a standalone status check context
  - TestSprite Current State: `fail` / `No tests detected` (standard pre-check state)
* **Paddle Application Outcome:** `PADDLE_APPLICATION_REJECTED_CATEGORY_AUP` (Decision received 2026-08-31: Paddle rejected account activation citing "Other/Resume/CV Builders" category under Acceptable Use Policy. Site readiness remains `PADDLE_DOMAIN_REVIEW_SITE_READY`. Appeal is an owner option; no provider migration decision made; production checkout remains strictly disabled).
* **Billing Safety State:** `BILLING_CHECKOUT_ENABLED=false` preserved. Production billing remains strictly disabled. Production Paddle Default payment link is NOT configured yet. Zero checkouts/payments created.
* **Preserved Payment Baseline State:** Live catalog reconciliation run `33376804507` (`P4_CATALOG_RECONCILIATION_SUCCESS`) and read-only preflight audit run `33376897666` (`P4_PREFLIGHT_SAFE_BUT_ORIGIN_UNVERIFIED`).


## Payments Phase P3 RevenueCat Production webhook routing verified — 2026-08-30

* **Verdict:** `P3_PRODUCTION_WEBHOOK_ROUTING_CONFIG_VERIFIED_WITH_TEST_TRANSPORT_EVIDENCE`.
* **Outbound Webhook Routing:**
  - Destination URL: `https://revenuecat-webhook.wiseresume.app`
  - Environment Scope: `Both Production and Sandbox` (Updated by owner in RevenueCat Dashboard).
  - Authorization: `AUTH_HEADER_PRESENT` (`Authorization: Bearer <secret>`, value never exposed).
  - Event Filters: Unchanged (7 supported events: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `UNCANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, `PRODUCT_CHANGE`).
  - Duplicate Webhook: `NONE` (Exactly 1 WiseResume Appwrite outbound webhook exists).
* **TEST Transport Verification:** Official RevenueCat `TEST` event handled cleanly by deployed `revenuecat-webhook` (`6a941e0dbd0c2cf9ce40`, Node-22, status `ready`). Response: HTTP 200 (`{ status: 'success', data: { ok: true, outcome: 'acknowledged', code: 'test_acknowledged', mutated: false } }`).
* **Database & Safety Boundary:** `revenuecat_event_ledger` 2 -> 2 (unchanged), `revenuecat_subscription_state` 2 -> 2 (unchanged). Zero entitlement mutations, zero credit mutations, zero checkouts, zero Production payments.
* **Important Delivery Boundary:** `PRODUCTION_DELIVERY_NOT_YET_PROVEN` — Outbound webhook configuration and official authenticated TEST transport are verified. No genuine Production lifecycle event has been executed yet.
* **Current Safety State:** `BILLING_CHECKOUT_ENABLED=false` preserved. `BILLING_CHECKOUT_PROVIDER_READY=false`. `BILLING_CHECKOUT_ENVIRONMENT=sandbox`. `BILLING_ACCESS_ENVIRONMENT` unconfigured. Frontend `paymentsEnabled: false`. Production billing remains strictly disabled.
* **Next action:** PLAN — but do not execute — one controlled Production Pro smoke transaction phase (under separate owner authorization).

## Payments Phase P2 Appwrite targeted deployment complete — 2026-08-30

* **Verdict:** `P2_TARGETED_DEPLOYMENT_VERIFIED_WITH_WARNINGS`. Workflow `33310801069` on target `billing-checkout,revenuecat-webhook` succeeded on `main` (`ba5a785ee54a84194fac8630af3370f9f3a9ccf0`).
* **Appwrite Deployments:**
  - `billing-checkout`: Active deployment ID `6a941dfe80f78ba25dbf`, Node-22, status `ready`. `BILLING_PRODUCTION_PADDLE_API_KEY` presence confirmed (value never exposed). Four Production catalog IDs synced (`pri_01m192gqtw1cxrkctafjcahmfe`, `pro_01m1924dqce7nd69khnakxftzw`, `pri_01m192m6bwzvarmcr05c78by7r`, `pro_01m192jr9nzd6k5ysa6yhk5aq7`).
  - `revenuecat-webhook`: Active deployment ID `6a941e0dbd0c2cf9ce40`, Node-22, status `ready`. Deployed source hash parity confirmed (`704b896e0460187b21d84e1f42f208088baf4c3d128971f0c114137435e27cdd`). `REVENUECAT_WEBHOOK_AUTH_SECRET` presence confirmed.
* **Schema Reconciliation:** `SCHEMA_RECONCILIATION_SUCCEEDED` — RevenueCat provider-state schemas and billing checkout schemas reported ready. No schema mutation was observed or reported.
* **Historical Run Note:** Initial P2 workflow `33309686634` failed pre-deploy at Step 7 due to stale manifest before PR #248 merged; no Appwrite Functions deployed in that run.
* **Safety Boundary:** `BILLING_CHECKOUT_ENABLED=false` preserved. `BILLING_CHECKOUT_PROVIDER_READY=false`. `BILLING_CHECKOUT_ENVIRONMENT=sandbox`. `BILLING_ACCESS_ENVIRONMENT` unconfigured. Frontend `paymentsEnabled: false`. DB counts: `revenuecat_event_ledger` 2/2, `revenuecat_subscription_state` 2/2. Zero checkouts or payments created. Production billing remains disabled.
* **Historical Warning:** [RESOLVED BY P3] RevenueCat Production webhook configuration and official TEST transport verified; genuine Production lifecycle delivery remains unproven until P4.
* **Next action:** [COMPLETED / SUPERSEDED BY P3] Outbound RevenueCat webhook environment scope updated to Both Production and Sandbox; verified via official TEST transport.

## Payments Phase P2 Appwrite source hash manifest recovery (PR #248 MERGED @ ba5a785e) — 2026-08-30

* **Verdict:** `SOURCE_HASH_RECOVERY_MERGED_TO_MAIN`. Source hash manifest recomputed locally via `node scripts/compute-source-hashes.mjs` and merged via PR #248 (`ba5a785e`).
* **Root Cause:** PR #247 modified `appwrite-hubs/revenuecat-webhook/src/main.js` without updating `src/lib/devkit/sourceHashes.generated.json`. Workflow `33309686634` (`target=billing-checkout,revenuecat-webhook`) failed pre-deploy at Step 7.
* **Historical boundary for run 33309686634:** 0 Appwrite Functions deployed in run `33309686634`. `BILLING_CHECKOUT_ENABLED=false` preserved. Production billing remained disabled.
* **Next action:** [COMPLETED] PR #248 merged to main (`ba5a785e`) and subsequent NEW Phase P2 targeted deployment run `33310801069` succeeded.

## Payments Phase P1 Production billing repository wiring (PR #247 MERGED @ 78c0afc9) — 2026-08-30

* **Verdict:** `P1_PRODUCTION_BILLING_WIRING_MERGED_TO_MAIN`. Repository-side Production billing wiring was committed (`134c0288`), PR #247 opened and merged into `main` at merge SHA `78c0afc9c9bdc7c962d57f6fee1c8ad20e408526`.
* **Changes in PR #247 (10 files changed):**
  - `appwrite-hubs/revenuecat-webhook/src/main.js`: `PRODUCT_TO_PLAN` additively extended with Production price IDs (`pri_01m192gqtw1cxrkctafjcahmfe → pro`, `pri_01m192m6bwzvarmcr05c78by7r → premium`). Sandbox entries preserved.
  - `.github/workflows/deploy-appwrite-hubs.yml`: `BILLING_PRODUCTION_PADDLE_API_KEY` (from GitHub Secret) and 4 Production catalog ID env vars wired into deploy step.
  - `scripts/deploy_hubs.cjs`: `ensureBillingCheckoutVariables` and `run()` pre-deploy guard extended to fail closed if Production billing is configured without `BILLING_PRODUCTION_PADDLE_API_KEY`.
  - `tests/hubs/`: Updated unit & deployment regression tests (6/6 billing-checkout-deployment, 7/7 deployment-hardening, 11/11 revenuecat-webhook).
* **Historical boundary for P1:** PR #247 merged; initial P2 workflow `33309686634` failed pre-deploy due to stale manifest; 0 Appwrite Functions deployed in P1; `BILLING_CHECKOUT_ENABLED=false`; `paymentsEnabled: false`; Production billing remained strictly disabled. Zero secret values exposed.
* **Next action:** [COMPLETED / SUPERSEDED BY P2 DEPLOYMENT] PR #248 merged to main and Phase P2 targeted deployment run `33310801069` succeeded.

## Payments Production billing readiness audit complete — 2026-08-30

* **Verdict:** `PRODUCTION_BILLING_READINESS_WITH_BLOCKERS`. Read-only audit completed.
* **Backend Readiness (Historical Audit State):** Repository-side `billing-checkout` and `revenuecat-webhook` implementation, schema contracts, security bounds, and resolution logic passed the audit evidence available at that time. End-to-end Production readiness was not proven because Production RevenueCat webhook routing and a controlled Production transaction remained unverified.
* **Blockers (Historical Audit State):** [RESOLVED / SUPERSEDED BY P1/P2] Production Paddle API key, catalog price/product IDs, workflow secrets, and revenuecat-webhook mappings were wired in P1/P2. Current remaining blocker: Production RevenueCat webhook routing verification (`UNVERIFIED` / `OWNER_ACTION_REQUIRED`) and owner authorization for controlled Production transaction.
* **Historical boundary at audit time:** Production billing was disabled; zero secret values were exposed and zero Production mutations had been performed during that audit.
* **Report:** [`reports/2026-08-30-production-billing-readiness-audit-closeout.md`](./reports/2026-08-30-production-billing-readiness-audit-closeout.md)

## Payments Ultimate Sandbox end-to-end lifecycle verified — 2026-08-30

* **Verdict:** `ULTIMATE_SANDBOX_END_TO_END_VERIFIED`. Complete end-to-end verification succeeded.
* **Webhook Execution:** Succeeded with HTTP 200 (`INITIAL_PURCHASE -> processed`).
* **Database State:** Genuine `revenuecat_event_ledger` and `revenuecat_subscription_state` documents created (`plan=premium`, `entitlement_id=premium`, `environment=SANDBOX`, `status=active`).
* **Plan & Credits:** Resolved to Ultimate (`premium`) with unlimited (Infinity) daily AI credits; persistence verified.
* **Gate & Production Safety:** `BILLING_CHECKOUT_ENABLED=false` verified; Production billing strictly disabled; protected fixtures untouched.
* **Report:** [`reports/2026-08-30-ultimate-sandbox-end-to-end-verified-closeout.md`](./reports/2026-08-30-ultimate-sandbox-end-to-end-verified-closeout.md)

## Payments Pro Sandbox end-to-end lifecycle verified — 2026-08-30

* **Verdict:** `PRO_SANDBOX_END_TO_END_VERIFIED`. Complete end-to-end verification succeeded.
* **Webhook Execution:** Execution `6a93f45d25b5a94613f5` succeeded with HTTP 200 (`INITIAL_PURCHASE -> processed`).
* **Database State:** Genuine `revenuecat_event_ledger` and `revenuecat_subscription_state` documents created (`plan=pro`, `entitlement_id=pro`, `environment=SANDBOX`, `status=active`).
* **Plan & Credits:** Resolved to Pro with 50 daily AI credits; persistence verified.
* **Gate & Production Safety:** `BILLING_CHECKOUT_ENABLED=false` verified; Production billing strictly disabled.
* **Report:** [`reports/2026-08-30-pro-sandbox-end-to-end-verified-closeout.md`](./reports/2026-08-30-pro-sandbox-end-to-end-verified-closeout.md)

## Payments Sandbox Paddle credential wiring & deployment — 2026-08-30

* **Verdict:** `SANDBOX_PADDLE_CREDENTIAL_WIRED_RUNTIME_READY_FOR_CONTROLLED_RETRY`. Following owner configuration of `BILLING_SANDBOX_PADDLE_API_KEY` in GitHub Repository Secrets, PR [#238](https://github.com/iammagdy/WiseResume-TWC/pull/238) merged at `4cec8a5a11f4910234bfde7d4be9f008abdf4cc8`.
* **Deployment & Verification:** Targeted workflow `33300882649` deployed only `billing-checkout` (Active deployment: `6a93e5480fd534667144` on Node-22). Live variable presence of `BILLING_SANDBOX_PADDLE_API_KEY` was confirmed via safe metadata without exposing secret values.
* **Current boundary:** `BILLING_CHECKOUT_ENABLED=false` remains preserved. Production billing remains disabled. Scopes remain `databases.write`, `documents.read`, `documents.write`. No checkout, provider transaction, RevenueCat ingestion, or entitlement/credit mutation occurred.
* **Next action:** Separate owner authorization is required for exactly one controlled Pro Sandbox diagnostic retry. Checkout must be disabled immediately on any failure.
* **Report:** [`reports/2026-08-30-sandbox-paddle-credential-wired-closeout.md`](./reports/2026-08-30-sandbox-paddle-credential-wired-closeout.md)

## Payments reserve-stage diagnostic deployment — 2026-08-28

* **Verdict:** `DIAGNOSTIC_RUNTIME_READY_FOR_CONTROLLED_RETRY`. PR #229 merged at `88b411af877d9cd33a098508f27e0ef9f080e849`; workflow `33206687391` deployed only `billing-checkout`, which is Active as `6a91ea0e63105206adf6` on Node-22.
* **Diagnostic contract:** Unexpected `AppwriteCheckoutStore.reserve()` failures now preserve the existing HTTP 500 `checkout_unavailable` public response and write only a fixed allowlisted reserve stage to the internal Function execution log. Typed checkout errors remain unchanged. No raw error, stack, request/header, account identifier, provider data, credential, or environment value is logged by this diagnostic.
* **Current boundary:** `BILLING_CHECKOUT_ENABLED=false` remains preserved; provider readiness was not changed. No checkout, Paddle transaction, RevenueCat ingestion/configuration, Appwrite entitlement/credit/provider-state mutation, or Production billing activation occurred. The root cause remains `UNPROVEN`.
* **Next action:** Owner authorization is required for exactly one controlled Pro Sandbox retry that may temporarily enable checkout and must disable it immediately on failure. The retry is diagnostic evidence only; it does not establish provider or lifecycle success without independent evidence.

## Payments final Sandbox billing completion mission — 2026-08-28

* **Verdict:** `SANDBOX_RUNTIME_READY_SAFE_PROVIDER_CREDENTIAL_REQUIRED`. The public Sandbox/Test Mode UI, explicit Sandbox/Production server isolation, server-owned checkout contract, additive checkout schema, and targeted `billing-checkout` deployment are complete. PR #225 merged at `1abe49349d0998f13709c7af9d80164435b5069e`; PR #226 merged at `5f57d990fa16686d7ee57a341885e57aa347d9e8`.
* **Deployment:** Workflow `33135870481` succeeded; exactly `billing-checkout` was deployed and reached ready deployment `6a90f1babbd3925c3583`. Vercel Production deployment `6134499586` succeeded for the merged product commit.
* **Credential boundary:** No provider credential value was retrieved or used. Local Sandbox provider-key presence was absent; remote Appwrite billing-variable values remain `UNVERIFIED` because the safe metadata path was unavailable and generic deployment variable helpers read values. No provider-authenticated request or transaction was performed.
* **QA:** Focused and full local validation passed; live public Pricing QA passed in English and Arabic RTL. Real Pro/Ultimate E2E, RevenueCat ingestion, Appwrite lifecycle mutation, post-purchase limits/persistence, upgrade, cancellation, expiration, billing issue, and Manage Billing remain `UNVERIFIED`.
* **Security:** The prior exposed Paddle Sandbox API-key warning remains unresolved and owner-accepted. Production billing remains disabled.
* **Report:** [`reports/2026-08-28-public-sandbox-billing-e2e-closeout.md`](./reports/2026-08-28-public-sandbox-billing-e2e-closeout.md)

## Payments Phase 2C Sandbox lifecycle QA — 2026-08-26

* **Verified Pro path:** The existing QA fixture `6a8d5e4c0029004e93c3` has an active Paddle Sandbox Pro subscription represented in RevenueCat by one active Pro entitlement and one Sandbox `PURCHASES_INITIAL_PURCHASE` event. Appwrite has one processed matching `INITIAL_PURCHASE` ledger record and one active `revenuecat_subscription_state` record with `plan=pro`, `entitlement_id=pro`, the approved Pro price, and `will_renew=true`.
* **WiseResume result:** The provider-state row is the exact current Pro source; legacy `subscriptions` has no row for the QA user. The authenticated Arabic RTL UI still shows Pro, `50 / 50` workspace credits, Active status, and `0 / 50` daily usage after navigation/refresh verification.
* **Lifecycle boundary:** Repository-controlled fake-store tests pass 12/12 for TEST no-mutation, Ultimate normalization, lifecycle transitions, duplicate idempotency, stale-event rejection, resolver precedence, and schema contracts. Live duplicate replay, stale events, cancellation, billing issue, expiration, and Ultimate activation remain `UNVERIFIED` because no provider mutation, fabricated event, entitlement grant, or second payment is allowed.
* **Security warning:** A prior RevenueCat app-list response exposed plaintext Paddle Sandbox API-key fields. Values were not copied, stored, printed, reread, or recorded. The owner declined rotation; this remains `UNRESOLVED_SECURITY_WARNING`, and the phase is not fully secure. No further credential-bearing provider view/API was opened after the warning.
* **Evidence:** [`reports/2026-08-26-payments-phase2c-lifecycle-qa.md`](./reports/2026-08-26-payments-phase2c-lifecycle-qa.md)

## Payments Phase 2C sidebar overflow correction — 2026-08-26

* **Frontend merge/deployment:** PR [#216](https://github.com/iammagdy/WiseResume-TWC/pull/216) merged normally into `main` at `82d3640c743442db304c50cb57a229648685b59a`. GitHub Production deployment `6101175755` for that commit completed with `success` at `2026-08-26T09:44:10Z` through the normal Vercel main-branch path; no manual deployment occurred.
* **UI result:** The corrective two-file change makes the navigation region the single sidebar vertical scroll owner and keeps the membership/account footer outside the scroll region. Arabic RTL desktop QA at approximately 1526×811 showed the account/profile control, Manage billing, Pro card, and AI credits `50 / 50` all reachable. Plan & billing opened `/subscription`, which showed Pro, Active, and daily usage `0 / 50`. Dark and light desktop checks showed no visually apparent horizontal clipping.
* **QA boundary:** English LTR and reduced mobile-viewport QA remain `UNVERIFIED` because the connected live UI did not expose the feature-flagged locale switch and the available browser controls did not support viewport resizing. No billing/account mutation was performed. Detailed evidence is in [`reports/2026-08-26-sidebar-pr216-production-closeout.md`](./reports/2026-08-26-sidebar-pr216-production-closeout.md).
* **Payment boundary:** This older sidebar closeout statement is superseded by the later Phase 2C lifecycle entry above. The existing Paddle Sandbox automatic Pro transaction/subscription, RevenueCat Pro entitlement/event, Appwrite ledger/provider state, and WiseResume Pro resolution are now verified. Do not repeat payment, grant entitlement, or mutate provider configuration.

## Payments Phase 2B session closeout — 2026-08-23

* **Runtime:** Targeted workflow `32659598098` succeeded from `8e9476fbc9a58118fc13b5eec80505a0ca97d1f3` with exactly `revenuecat-webhook,coupons,ai-gateway,admin-devkit-data`; all selected Functions are enabled with latest Appwrite deployments `ready`. The API `live` flag is `false` for each and is not treated as an inferred Production-live claim.
* **Provider-state schema:** `revenuecat_subscription_state` and `revenuecat_event_ledger` are live, server-only, uniquely indexed, and at zero documents. Existing `subscriptions` was not destructively changed.
* **Custom domain:** `revenuecat-webhook.wiseresume.app` resolves through the required CNAME to `fra.cloud.appwrite.io`, but strict TLS fails hostname validation because the presented certificate SAN is `t.sni-820-default.ssl.fastly.net`; the insecure route diagnostic returns HTTP `421`. Current blocker: `APPWRITE_CUSTOM_DOMAIN_SSL_PENDING`.
* **Provider boundary:** No RevenueCat Sandbox webhook or Production webhook was created; no lifecycle events were sent; no real customer subscription state was used; checkout remains disabled and Production payments remain inactive.
* **Credential warning:** A Paddle Sandbox API key was unintentionally exposed by a tool/MCP result during read-only inspection. The secret value is never recorded. Rotation is `ROTATION DEFERRED BY OWNER` and must occur before further provider activation or Production payment work.
* **Next action:** Re-check strict TLS and Appwrite certificate status first in a new session. If pending, stop. If valid, run the three transport smoke tests, then create a Sandbox-only RevenueCat webhook and use only a dedicated non-real test fixture for lifecycle verification.
* **Report:** [`reports/2026-08-23-payments-session-closeout.md`](./reports/2026-08-23-payments-session-closeout.md)

## Sentry production fixes — merged and deployed (2026-08-20)

* **Scope:** The minimal fixes for the Dashboard declaration-order crash, older-browser visitor IDs/web-vitals registration, and Appwrite Realtime heartbeat lifecycle handling were merged in PR #198. The browser Appwrite SDK is `26.2.0`, keeping heartbeat socket-state protection in maintained SDK code rather than a private application override. Current Applications source parity was verified; WISE-RESUME-13 and WISE-RESUME-Q received no speculative fixes.
* **Merge / deployment:** PR #198 merged at `2026-08-20T10:55:06Z` with commit `39c58a338eef75581b910741f932233a2defde63`. GitHub deployment record `6000810045` for environment `Production` completed successfully at `2026-08-20T10:57:02Z`; its Vercel target URL was `https://wise-resume-6fh0vfr31-iam-magdy.vercel.app`. The canonical site returned HTTP 200 with a Vercel cache hit and a last-modified time of `2026-08-20T10:57:27Z`.
* **Validation:** Six focused Vitest files passed with 32 tests; `npx tsc --noEmit`, `npm run build`, the no-sourcemap check, and `git diff --check` passed before merge. Existing Vite large-chunk warnings are advisory. No Appwrite deployment occurred or was required because no Appwrite function, schema, permission, or configuration changed.
* **Browser:** `/` **PASS** — landing rendered normally. `/dashboard` **PASS** — authenticated upload/import succeeded with a synthetic PDF, showed `Import complete!`, and persisted `Synthetic QA Candidate`. `/applications` **PASS_WITH_WARNINGS** — the workspace stabilized with tracker, filters, and activity and no `t is not defined` error. `/editor` **PASS_WITH_WARNINGS** — safely redirected to `/dashboard` without a resume context and did not produce a fatal error. `/tailoring-hub/result/__sentry_audit__` **PASS** — reached the explicit `Tailored resume unavailable` deleted-result terminal state without a blank root or visible Realtime exception. Live tailoring subscription updates were not exercised.
* **Sentry:** The latest read-only 7-day unresolved production query returned only WISE-RESUME-13 with 1 event and 0 users; its first and last seen timestamps were approximately two days before this verification. A direct 7-day aggregation for WISE-RESUME-16 found 5 events, all between `2026-08-19T21:06:53Z` and `2026-08-19T21:07:16Z`, before the deployment. No post-deployment recurrence was observed, and no Sentry issue was resolved, ignored, assigned, or otherwise changed.
* **QA artifact:** The authorized browser QA created a synthetic production resume named `Synthetic QA Candidate` in the Premium Tester account. Delete it manually if desired; no deletion was performed in this closeout.
* **Report:** [`reports/2026-08-20-sentry-production-fixes-local.md`](./reports/2026-08-20-sentry-production-fixes-local.md)

## Full post-change regression audit (2026-08-15)

* **Verdict:** `PASS_WITH_WARNINGS`. The final matrix covers all 111 source-declared routes: 46 `PASS`, 14 `PASS_WITH_WARNING`, 1 `PRODUCT_BUG`, 26 `FIXTURE_BLOCKED`, 18 `ACCESS_BLOCKED`, 5 `EXPECTED_REDIRECT`, and 1 `EXPECTED_UNDEPLOYED_BACKEND_BEHAVIOR`. No fatal console errors or unexpected network failures were observed on navigated routes. The required `ENVIRONMENT_ISSUE` route count is 0; mobile viewport and full dark-theme verification remain audit-level environment limitations, not inferred passes.
* **Proven regression:** `/share/:token` showed a blank page during slow/missing lookup because `SharePage.tsx` returned `null` while `usePublicResume` was loading and retrying. PR #188 merged the scoped `ShareSkeleton` fix and focused regression test into `main`; post-deployment verification of `/share/__invalid__` and `/ar/share/__invalid__` showed the skeleton transiently and then the explicit `Resume Not Found` terminal state, with no blank root or fatal console error.
* **Runtime:** The former `/devkit` `ReferenceError: module is not defined` was not reproduced after PR #185 and the authorized deployment. `/devkit` reached a live terminal state with all 24 panels marked `LIVE`; App Overview and Onboarding reached terminal states. `/devkit2` Command Home rendered live summary data; other v2 hubs explicitly remain Step 2 placeholders.
* **Deployment boundary:** Runs `31871663976`, `31875957559`, and `31879539590` failed before function deployment while PR #189 and PR #191 were being validated. Authorized run `31880840961` then passed the repository-controlled preflight/setup gates and deployed exactly the four approved functions. It also performed authorized repository-controlled production setup/configuration mutations: creation of `admin_reset_request_nonces`, `pdf_export_rate_limits`, and `pdf_export_active_leases`; selected function-variable synchronization; auth-template configuration; recovery-template synchronization; and `fn_deployed_hashes` updates. No other function was deployed. No manual Console mutation, `target=all`, unrelated mutation, permission broadening, unauthorized data mutation, or secret disclosure occurred. PR #189 corrected the repository/model-shape bug by reading `collection.$permissions`; PR #191 reconciled the complete live application-attribute contract as optional while preserving server-only fail-closed semantics. Vercel production remained `READY`; no manual Vercel deployment was performed.
* **PRs:** #188 — [fix(share): render loading state for public share lookups](https://github.com/iammagdy/WiseResume-TWC/pull/188) — merged into `main`; its final reviewed head was `9e13bb649b9f90965895adbdfce61f3648b774bf`, with implementation commit `49a2a9d33698f2dd143f747553fbe4005288898a` and merge commit `888ac4cdb13aea3728eb966db521918b1bf57db5`. #189 — [fix(appwrite): read Collection permissions from `$permissions`](https://github.com/iammagdy/WiseResume-TWC/pull/189) — merged into `main` with merge commit `fd88f91c13003764eac45955dbff8d92586b77bd`; its reviewed head was `7ef73c275181a594cb2856cfee4433cb5ce7c073`. #191 — [fix(appwrite): reconcile complete runtime receipts contract](https://github.com/iammagdy/WiseResume-TWC/pull/191) — merged into `main` with final main SHA `b6cf2aa07ce94f160e048a8a02e86aaa0db7293b`; its squashed implementation commit reconciles all existing application attributes as optional while preserving types, indexes, defaults, and server-only security assertions. Applicable PR checks passed; TestSprite remained the known non-applicable `No tests detected` warning.
* **Report:** [`reports/2026-08-15-full-post-change-regression-audit.md`](./reports/2026-08-15-full-post-change-regression-audit.md)

## Targeted Appwrite deployment and post-deployment verification (2026-08-15)

* **Workflow:** Run `31880840961` completed successfully from main commit `b6cf2aa07ce94f160e048a8a02e86aaa0db7293b`; exact target input was `ai-gateway,admin-devkit-data,admin-onboarding-funnel,email-service`. Conditional schema/setup preflight passed. No `target=all`, Console deployment, manual setup, or manual Vercel deployment was used.
* **Appwrite function parity:** Function IDs are the four target IDs (the deployment helper maps these hubs directly). All four were enabled, reached `ready`, and showed `In Sync` in the production DevKit inventory. Source hashes are the committed manifest values and match the deployed state.

| Function ID | Deployment ID | Source/deployed SHA-256 | Status |
|---|---|---|---|
| `ai-gateway` | `6a80467d45db108d5cab` | `158da0749573c9c2d7e173c256ee0d77f64c783536fcf920693ed1bb0715fafe` | `ready`, `In Sync` |
| `admin-devkit-data` | `6a804687cfea6415139d` | `6d23504f47c53d72354ca2bb2a46e6bb695b2df0e5442d99d708b7f9075e8804` | `ready`, `In Sync` |
| `admin-onboarding-funnel` | `6a8046923ac36d1cc638` | `efe2a22802e679c8d87e3089c8d284c26563b8c573f9b31b7db8440a0c57553c` | `ready`, `In Sync` |
| `email-service` | `6a80469d1ee51e0246e0` | `744f82a1bd0f4dc9679a9cd30dc56b6195def4f0449f857df6e1bcf510a0548a` | `ready`, `In Sync` |

* **DevKit:** `/devkit` left the admin-session/loading lifecycle and reached a live terminal state with all 24 panels marked `LIVE`. App Overview and Onboarding reached terminal states. Data Integrity and Users reported explicit backend unavailable/error states rather than fake zeroes. AI Health separated transport reachability from completion/key/model health; mixed slots displayed `Degraded / Mixed`; traffic reported the actual 50-record sample with 44 attributed and 6 Unknown/Unattributed. Observability showed a truthful empty state.
* **Public share:** `/share/__invalid__` and `/ar/share/__invalid__` both showed `ShareSkeleton` transiently and then reached `Resume Not Found`; no blank root or fatal console error was observed.
* **Email and route QA:** Read-only architecture and Console evidence proved that `send-verification` makes exactly one Appwrite `POST /account/verifications/email` request, does not call Resend directly, and depends on Appwrite’s configured Custom SMTP transport and Verification template. The live pre-fix template had blank subject/body fields and no saved `{{redirect}}` placeholder; this was a `PRODUCT REGRESSION / DEPLOYMENT CONFIG BUG` caused by repository-controlled template blanking. PR #194 merged the managed-template contract fix, and narrow authorized run `31882493172` targeted only `email-service`, created deployment `6a804f862b4138bc1b06`, and synchronized the functional Verification/recovery templates. The post-deployment Console view remained on a spinner, but the workflow log recorded successful PATCH completion. No approved QA identity/inbox was available, so the end-to-end inbox/link/confirmation lifecycle is `FIXTURE_BLOCKED`; no production email verification is claimed. The Email panel configuration check remained nonterminal with no console output and no send/reset action, classified as `TEST/AUTOMATION ISSUE or EXPECTED LIMITATION`, not a proven product/backend failure. A read-only 22-route HTTP smoke check returned the expected WiseResume shell and no fatal markers for every tested route; unknown-route server 404 semantics and mobile/full dark-theme coverage remain unverified. Unrelated pre-existing `coupons` and `public-share` drift was observed and intentionally not changed.
* **Final verdict for this email-verification workstream:** `FIXTURE_BLOCKED`. The proven repository-controlled blank Verification-template regression was fixed in PR #194 and applied by the narrow `email-service` run `31882493172`; however, no approved safe QA identity/inbox was available to prove message receipt, usable link resolution, Appwrite confirmation, or onboarding routing. This is not a deployment failure. No owner action is required for the completed deployment, but end-to-end email verification must not be described as production-verified until a safe fixture is supplied.

## Email verification safety audit and narrow correction (2026-08-15)

* **Architecture:** `appwrite-hubs/email-service/src/main.js` uses Appwrite’s official verification lifecycle: authenticated user JWT, exactly one `POST /account/verifications/email`, Appwrite-owned token, and Appwrite Custom SMTP/template delivery. It does not call Resend directly for verification.
* **Pre-fix live state:** Appwrite Auth > Templates > Verification showed blank subject and message fields with no saved `{{redirect}}`; Custom SMTP remained enabled with Resend transport metadata. The repository deployment helper had been setting the Verification subject/message to whitespace and logging that Resend was the branded verification sender. No separate proven mechanism transformed the blank Appwrite template into a usable verification message.
* **Classification:** `PRODUCT_REGRESSION / DEPLOYMENT CONFIG BUG`. PR #194 (`fix/email-verification-template-sync`) merged the shared managed-template contract and focused regression tests. The fix validates the redirect placeholder and prevents both deployment helpers from blanking the required template.
* **Narrow correction:** Authorized run `31882493172` targeted `email-service` only, created deployment `6a804f862b4138bc1b06`, reached ready status, synchronized the managed Verification and recovery templates, and updated the email-service deployment hash record. No other function was deployed.
* **QA boundary:** No approved safe QA identity/inbox was available. The requested signup/resend-to-inbox/link/confirmation/Appwrite-verified/onboarding sequence is therefore `FIXTURE_BLOCKED`; no verification token, link, secret, or real-user credential was used or recorded. The Appwrite Console post-deployment view remained a spinner, while the workflow log recorded successful template PATCH completion.
* **Email panel:** The non-destructive configuration check remained nonterminal with no browser-console output and no send/reset action. This is classified as `TEST/AUTOMATION ISSUE or EXPECTED LIMITATION`, not as a proven backend or product failure.

## AI runtime receipts schema contract remediation (2026-08-15; final live-contract reconciliation)

* **Status:** `MERGED_AND_LIVE_VERIFIED`. PR #187 established the earlier six-required-attribute hypothesis, but the subsequent live metadata and workflow evidence showed that contract was not truthful. PR #191 (`fix/appwrite-runtime-receipts-final-preflight` → `main`) superseded it and merged as `b6cf2aa07ce94f160e048a8a02e86aaa0db7293b`; the authorized targeted deployment later passed the reconciled preflight and completed successfully.
* **Failed workflows:** Runs `31871663976` and `31875957559` stopped at the security assertion; run `31879539590` passed the `$permissions` gate and stopped at the first attribute mismatch: `request_id: required false (expected true)`. These three runs deployed no functions. Authorized run `31880840961` passed the corrected preflight and deployed exactly the four approved functions.
* **Security finding:** The current live `ai_runtime_receipts` collection was observed with `permissions=[]` and `documentSecurity=false`, so the reported server-only assertion failure is not reproducible from the present state. The exact historical failing operand and drift origin are `UNKNOWN`.
* **Contract finding:** The deterministic repository mismatch was the inverse of the earlier PR #187 assumption: the live `ai_runtime_receipts` application contract is all-optional for its existing string, integer, and boolean attributes. The six disputed fields are populated by writers, but writer population does not prove `required=true`. PR #191 changed only those six required flags back to optional; all other attribute types, sizes, defaults, and indexes remain unchanged.
* **Safety:** Server-only behavior remains enforced; diagnostics expose only permissions-array status, permission count, and document-security value. No automatic production security repair, permission broadening, or collection replacement was added.
* **Validation:** Focused suite passed with 8 tests; relevant Node syntax checks, `npx tsc --noEmit`, and `git diff --check` passed. PR Validation, Security validation, Vercel, and Vercel Preview Comments passed. TestSprite failed only with the known non-applicable `No tests detected` warning.
* **Deployment boundary:** The schema contract preflight passed in authorized run `31880840961`. The approved workflow performed the documented repository-controlled setup/configuration mutations, including idempotent collection setup and auth-template/configuration synchronization; it did not perform a manual Console mutation, permission broadening, unauthorized data mutation, or secret/environment disclosure. The four targeted functions subsequently deployed successfully with the exact parity recorded in the post-deployment section above.

## DevKit production crash hotfix (2026-08-15)

* **Status:** `MERGED_AND_PRODUCTION_VERIFIED`. PR #185 (`fix/devkit-module-boundary-hotfix` → `main`) matched head `46dc76f16a037d86a73d11b74f27a7e15ad744c6` and merged with commit `fe68327897ad95e924fb2941bcc5af44d156895e`.
* **Root cause:** Browser code imported the CommonJS Appwrite hub runtime `appwrite-hubs/admin-devkit-data/src/completion-health.js`, whose `module.exports` was evaluated in the browser and caused `ReferenceError: module is not defined` on `/devkit`.
* **Fix:** Frontend code now uses browser-safe ESM `src/lib/devkit/completionHealth.ts`; the deployable backend CommonJS classifier remains unchanged, preserving identical slot-health semantics.
* **Validation:** Focused DevKit suite passed with 1 file / 10 tests; `npx tsc --noEmit`, `git diff --check`, relevant backend `node --check` commands, and `npm run build` passed. Existing Vite large-chunk warnings remain non-blocking.
* **Checks:** PR Validation, Vercel preview, and Vercel Preview Comments passed. TestSprite Pre-Check failed only with the known non-applicable `No tests detected` warning.
* **Boundary:** The former browser crash was absent in post-deployment `/devkit` verification. No manual Vercel deployment or unrelated Appwrite deployment occurred; only the four authorized targets were deployed. No schema/permission change, secret/environment change, account change, or production-data change occurred.
* **Report:** [`reports/devkit/2026-08-15-module-boundary-hotfix.md`](./reports/devkit/2026-08-15-module-boundary-hotfix.md)

## DevKit Phase 1 PR #184 merge closeout (2026-08-15)

* **Verdict:** `MERGED_AND_PRODUCTION_VERIFIED_WITH_WARNINGS`. PR #184 head `04251b41f6661e1eb33f8f034cfa52b119e5a8bc` was merged into `main` with merge commit and final remote `main` SHA `9ff1f14a353cc2a82d95bee722e2e4f54f4f6580`.
* **Checks:** PR Validation, Security Validation, Vercel, and Vercel Preview Comments passed. TestSprite Pre-Check failed only with the known non-applicable `No tests detected` warning.
* **Deployment boundary:** The Phase 1 behavior was verified through the authorized targeted deployment and live DevKit checks. The automatic PR Vercel preview was not used as production deployment authorization; no unrelated function, schema, permission, secret, environment, account, or production-data change occurred.
* **Deployment result:** The four formerly pending candidates—`ai-gateway`, `admin-devkit-data`, `admin-onboarding-funnel`, and `email-service`—were deployed only through authorized run `31880840961` and verified ready/In Sync. Unrelated pre-existing drift was left unchanged. Do not use `target=all`.
* **Report:** [`reports/devkit/2026-08-15-phase1-merge.md`](./reports/devkit/2026-08-15-phase1-merge.md)

## DevKit live verification closeout (2026-08-14)

* **Verdict:** `LIVE_PARTIALLY_VERIFIED_WITH_CONFIRMED_MISMATCHES`. The authenticated production DevKit was read in a live session without any mutation. Core panels loaded or returned explicit states, but App Overview and Onboarding remained skeleton/unavailable, so their analytics values were not verified independently.
* **Confirmed live observations:** Data Integrity displayed 44 Auth Users versus 33 Verified plus 10 Unverified; AI Health displayed 44 attributed calls under a `last 50 calls` label; AI Health provider pings were successful while AI Keys marked OpenRouter Slot 1 `Rate Limited`; and Appwrite Functions marked `ai-gateway` and `admin-devkit-data` `Needs Redeploy` because source/deployed hashes differed.
* **Verified scope:** Visitor Deep Dive explicitly disclosed a 5,000-event cap; Observability showed explicit empty states; Diagnostics reported 47 healthy, 0 warning, 0 broken, and 0 not configured; Mission Control and Diagnostics confirmed deployed/reachable posture but do not replace source-hash parity.
* **Finding classifications:** P1-01 `CONFIRMED_CODE_ONLY`; P1-02 `DOWNGRADED`; P2-01 `CONFIRMED_CODE_ONLY`; P2-02 `CONFIRMED_LIVE`; P2-03 `CONFIRMED_CODE_ONLY`; P2-04 `CONFIRMED_CODE_ONLY`; P2-05 `DOWNGRADED`.
* **Evidence boundary:** Direct independent equality for every protected Function aggregate was not established because raw response bodies were not replayed or retained. No code, Appwrite, schema, permission, environment, secret, deployment, account, production-data, or destructive DevKit action was changed.
* **Report:** [`reports/devkit/2026-08-14-live-data-verification.md`](./reports/devkit/2026-08-14-live-data-verification.md)

## DevKit Phase 1 fix branch (2026-08-14)

* **Status:** `IMPLEMENTED_VALIDATED_NOT_DEPLOYED`. Branch `fix/devkit-phase1-live-data`, implementation commit `c1600bc0a176b6af4911aefa94cfd82364532ea6`, created from clean `main`.
* **Scope:** Exact unverified Auth totals with an explicitly labelled ten-user sample; null-preserving backend failure semantics; effective-plan zero preservation; separate AI transport reachability and stored completion/key/model health; truthful actual usage sample and Unknown/Unattributed rows; bounded App Overview and Onboarding terminal states.
* **Validation:** Focused Phase 1 suite passed with 1 file and 4 tests; `npx tsc --noEmit`, changed-hub `node --check`, `git diff --check`, and `npm run build` passed. Existing Vite large-chunk warnings remain non-blocking.
* **Deployment drift:** Production read-only inspection confirmed `ai-gateway` and `admin-devkit-data` `Needs Redeploy`. `ai-gateway` is legacy PR #181 debt; `admin-devkit-data` has PR #181 drift plus this branch’s new changes. `admin-onboarding-funnel` was live `In Sync` before this branch and now requires a targeted deploy for its new backend error propagation. `email-service` remains a PR #181 targeted candidate, but distinct live parity was not visible in the fresh Functions slice; visible `admin-email` was `In Sync`.
* **Future targeted deploys:** `ai-gateway`, `admin-devkit-data`, `admin-onboarding-funnel`, and the PR #181 `email-service` candidate after exact-ID/status confirmation. No `target=all` operation is approved.
* **Boundary:** No PR, merge, deployment, Appwrite change, schema/permission change, secret/environment change, account change, production-data change, or destructive DevKit action occurred.
* **Report:** [`reports/devkit/2026-08-14-phase1-fix.md`](./reports/devkit/2026-08-14-phase1-fix.md)

## 1. System Overview

WiseResume is a full-stack, Appwrite-native application for resume building, AI tailoring, cover letter generation, and portfolio publishing.

```txt
[Client Browser]
  |
  +-- Vercel: React 18 / TypeScript 5 / Vite 6 SPA
  |
  +-- Appwrite Cloud (fra.cloud.appwrite.io)
      +-- Appwrite Auth
      +-- Appwrite Databases (main)
      +-- Appwrite Storage
      +-- Appwrite Functions
          +-- ai-gateway
          +-- resume-section-ai
          +-- job-import
          +-- portfolio, admin, email, and jobs hubs
```

## 2. Current Stack and Architecture

* **Frontend:** React 18, TypeScript 5, Vite 6, Tailwind CSS, Radix UI, shadcn/ui, TanStack Query, and Zustand.
* **Frontend hosting:** Vercel. The current production deployment is `dpl_J5Bhtano4s4yGk8BqJVZ2SEGRGaX` for documentation-only commit `e7e92aba0261a5e587c766654dc9bf601732072d`; it is `READY` and owns the production aliases. The latest verified code-bearing deployment remains `dpl_Hvot534UMdVDKrLwtDNuQHpiMigr` for product commit `51271e0a5ff355e5d5ad5c6078c7357b50f50f42`.
* **Backend:** Appwrite Cloud Databases, Storage, and Serverless Functions.
* **Authentication:** Appwrite Auth exclusively.
* **Email verification:** `EMAIL_VERIFICATION_PRODUCTION_VERIFIED`. An authenticated user requests verification through `email-service` and Appwrite's official lifecycle; Appwrite owns the token and completion state, Custom SMTP uses Resend transport, and the configured Verification template supplies `{{redirect}}`. There is no custom parallel verification-token system, and manual Appwrite verification is not part of the normal flow.
* **AI:** Most product AI features route through the server-side `ai-gateway`. The explicitly documented standalone exceptions are `resume-section-ai` and `job-import`; browser code must never call provider APIs directly.
* **AI routing:** Current Tailoring production evidence used DeepSeek `deepseek-chat`. Provider pools and fallback rules are defined server-side; do not infer one universal order for every feature.
* **Payments/billing:** Disabled / Coming Soon.
* **WiseHire:** Secondary and deprioritized.
* **Owner-scoped collections:** `user_preferences`, `jobs`, and `job_applications` use document security, collection-level user create permission, and owner-only document read/update/delete permissions.
* **Realtime CSP:** The active frontend CSP allows `wss://fra.cloud.appwrite.io`.
* **Visitor country:** Browser tracking does not call GeoJS. Server-side enrichment may use Appwrite request metadata; unknown country is acceptable.
* **Workspace Broadcasts:** `broadcasts` is server-only with empty collection permissions. Authenticated clients call the JWT-validated Vercel endpoint `GET /api/broadcasts`; owner-only publish/expire actions run through `admin-devkit-data`.

## 3. Current Product Status

* **Jobs ownership boundary:** `VERIFIED_WITH_RESIDUAL_QA`. A focused two-owner production check proved saved-job account isolation and authorized cleanup across reloads. It does not close tracker deletion, broader Saved Jobs rendering, deleted-resume tombstone, populated Jobs UI, LinkedIn, or the `0 remote jobs / Not yet synced` diagnosis.

* **Critical functionality smoke sequence:** `CLOSED`; follow-up export, owner-permission, Realtime, GeoJS, Premium Cover Letter, and Tailoring content-integrity work is documented and closed.
* **Performance Phase 1:** Closed. Its retained authenticated Broadcast `active` schema warning was resolved and production verified on 2026-07-24.
* **Performance Phase 2:** Editor startup closed with a retained cold-run warning.
* **Performance Phase 3:** Closed for approved scope, but Public Portfolio cold-mobile LCP remains `5.860 s` median against the `<4.0 s` target.
* **Performance Phase 4 timing/recovery:** Bounded provider timing, async execution, result-only recovery, duplicate prevention, idempotency, and exactly-once charging are production verified.
* **Tailoring current status:** `VERIFIED_READY`. Project identity, chronology, current state, and URLs are now preserved at both gateway and frontend merge boundaries. One controlled production action created child resume `6a62910a0013a37009a3`, retained both source projects and their exact metadata, materially rewrote both descriptions, charged exactly two credits, and survived refresh, direct reopen, and export-preview rendering.
* **Premium Cover Letter:** Generation, save, update, durable persistence, owner permissions, and one two-credit charge are proven. The exact original browser refresh/reopen trace was not retained.
* **Broadcast current status:** `PASS_WITH_WARNINGS`. The HTTP 400 is removed in production, authenticated workspace requests return 200, public standalone routes remain silent, and server-side active/expiry filtering plus dismissal are covered by focused tests. Production contains zero Broadcast records, so no real announcement was mutated for live visibility testing.
* **Performance sequence:** `CLOSED_WITH_PORTFOLIO_LCP_WARNING`; the remaining known performance warning is Public Portfolio cold-mobile LCP.
* **Email verification recovery:** `CLOSED`. One controlled resend was accepted by Appwrite through `email-service` (HTTP `200`), reached Resend with status `delivered`, was confirmed by the owner, and completed through the actual WiseResume verification action. Appwrite then marked the user verified, routed to onboarding, and the welcome email was delivered. LinkedIn first-time and existing-user production verification remain pending; Jobs QA is separate and retains its own evidence/status.

* **Email/password login:** `PRODUCTION_LOGIN_VERIFIED_WITH_UNVERIFIED_FAILURE_PATHS`. PR #183 is merged into `main` at `4bea728dba622ae2124d0192241cc7b26bdf6076`; its two login-fix commits `f29e612f` and `1f38dbb` are contained in `main`. Production served the merged AuthPage/AuthBold behavior. Authorized credentials redirected to the dashboard, and a deliberately invalid non-user pair displayed only the generic invalid-credential message. The confirmed root cause was generic masking of every Appwrite login failure as invalid credentials. The merged fix classifies safe failure categories, reconciles submit-time DOM values, trims email only, and preserves passwords exactly. Rate-limit, network/service, and unknown-auth-error paths were not intentionally triggered in production and remain `UNVERIFIED`; historical autofill/password-manager causation remains `UNCONFIRMED`.

## 4. Deployment State

* **Current Vercel deployment:** Atlas identifies documentation-only deployment `dpl_J5Bhtano4s4yGk8BqJVZ2SEGRGaX` as `READY` with production aliases. The canonical site returned HTTP 200 from Vercel and served AuthPage/AuthBold chunks containing the merged classifier and submit-time input markers. The public response does not expose a commit SHA, so runtime-to-Git mapping is supported by served bundle markers rather than a public header. Live successful-login and invalid-credential checks passed; rate-limit/network/service/unknown paths remain unverified.
* **Frontend code:** Commit `51271e0a5ff355e5d5ad5c6078c7357b50f50f42` remains the latest verified code-bearing deployment (`dpl_Hvot534UMdVDKrLwtDNuQHpiMigr`, `READY`).
* **Broadcast Appwrite target:** `admin-devkit-data` only.
* **Workflow:** `.github/workflows/deploy-appwrite-hubs.yml`, run `30051406249`.
* **Active deployment:** `6a629b8351abe36cd0c3`, status `ready`.
* **Source hash:** `21a8df1890e76655c36e403fc8c17813de11db4e22d6b77ecaba8a2539e97e02`.
* **Schema:** `broadcasts` has eight attributes total, zero collection permissions, `documentSecurity: false`, zero documents, and an idempotent post-apply plan of zero.
* **Parity:** Deployed `admin-devkit-data` source matches the repository implementation.
* **Email-verification deployment context:** PR #194 merged the repository-controlled functional Appwrite Verification/recovery template fix. Authorized run `31882493172` targeted exactly `email-service`, created deployment `6a804f862b4138bc1b06`, reached ready status, and synchronized the managed templates. The final inbox/link/confirmation lifecycle remains `FIXTURE_BLOCKED` because no approved safe QA identity/inbox was available; this documentation closeout initiated no additional Appwrite or Vercel deployment.

## 5. Operational Rules

1. Pushes to `main` may trigger Vercel through Git integration. Do not change Vercel settings or environment variables without explicit authorization.
2. Appwrite functions deploy through `.github/workflows/deploy-appwrite-hubs.yml` or `scripts/deploy_hubs.cjs`.
3. Never use `target=all`; deploy only explicitly approved function targets.
4. Production is Vercel plus Appwrite. Hostinger deployment material is historical unless the owner explicitly assigns a separate legacy-domain task.
5. Do not replace Appwrite Auth/backend architecture, reactivate billing, change AI routing/models/credits, or alter schemas/permissions without a scoped owner-approved task.

## 6. Evidence

* [`WHERE_WE_STOPPED.md`](./WHERE_WE_STOPPED.md)
* [`deployment/current-deployment.md`](./deployment/current-deployment.md)
* [`reports/performance/production-performance-audit-2026-07-22.md`](./reports/performance/production-performance-audit-2026-07-22.md)
* [`reports/performance/performance-phase-4-tailoring-remediation-2026-07-23.md`](./reports/performance/performance-phase-4-tailoring-remediation-2026-07-23.md)
* [`qa/production-stabilization/tailoring-meaningful-production-verification-2026-07-23.md`](./qa/production-stabilization/tailoring-meaningful-production-verification-2026-07-23.md)
* [`qa/production-stabilization/broadcast-schema-production-verification-2026-07-24.md`](./qa/production-stabilization/broadcast-schema-production-verification-2026-07-24.md)
