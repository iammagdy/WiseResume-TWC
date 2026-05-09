## 2026-05-09 — Task #11: NVIDIA NIM model dropdown updated to 5 Mistral/Gemma models

### What changed

#### Updated: `src/lib/devkit/aiTestSlotModels.ts`
- Added `NVIDIA_LLM_MODELS` (exported `ReadonlyArray<{ label, value }>`) with exactly five entries: `mistral-medium-3-instruct`, `mistral-large-3-675b-instruct-2512`, `mistral-nemotron`, `gemma-3n-e4b-it`, `gemma-3n-e2b-it`.
- Changed `FALLBACK_AI_TEST_DEFAULT_MODELS.nvidia` from `'nvidia/llama-3.1-nemotron-70b-instruct'` to `'mistral-medium-3-instruct'`.

#### Updated: `src/components/dev-kit/AIKeysPanel.tsx`
- Imported `NVIDIA_LLM_MODELS` from `aiTestSlotModels`.
- Changed local `DEFAULT_MODELS.nvidia` from `'nvidia/llama-3.1-nemotron-70b-instruct'` to `'mistral-medium-3-instruct'`.
- Replaced the free-text `<input>` for NVIDIA slots with a `<select>` dropdown populated by `NVIDIA_LLM_MODELS`. Other providers (OpenRouter, Groq, DeepSeek) keep the free-text input. The dropdown sends the model `value` (ID) to the backend, not the label.

#### Updated: `src/components/dev-kit/DevKitRunner.tsx`
- `ai-engine-nvidia` test item `label` changed from `'Engine · NVIDIA (Nemotron 70B)'` to `'Engine · NVIDIA NIM (Mistral Medium 3)'`.
- `description` updated from `…(nvidia/llama-3.1-nemotron-70b-instruct)…` to `…(mistral-medium-3-instruct)…`.

#### Updated: `appwrite-hubs/inspect-ai-keys/src/main.js`
- Changed `DEFAULT_MODELS.nvidia` from `'nvidia/llama-3.1-nemotron-70b-instruct'` to `'mistral-medium-3-instruct'`.
- Added `NVIDIA_VALID_MODELS` constant (the same five IDs) so stale saved overrides are normalized to the new default at response time — prevents the panel from receiving an unrecognised model ID that would leave the `<select>` with no matching option.

#### Client-side normalization added: `src/components/dev-kit/AIKeysPanel.tsx` (load function)
- When building draft values after fetch, any NVIDIA slot whose resolved value is not in `NVIDIA_LLM_MODELS` is coerced to `'mistral-medium-3-instruct'` — guards against stale DB overrides that survived the backend normalization step.

---

## 2026-05-09 — Task #19: Datadog LLM Observability added to AI gateway

### What changed

#### Updated: `appwrite-hubs/ai-gateway/src/main.js`
- Added `dd-trace` v5 import and tracer initialisation at module level (`ddTrace.init({ logInjection: false })`).
- `enableLLMObs()` function: called once per cold start; reads `DD_API_KEY` and `DD_SITE` from `process.env`, then calls `tracer.llmobs.enable({ mlApp: 'wiseresumeai', agentlessEnabled: true, ddApiKey, site })`. Agentless mode is required — Appwrite Functions cannot run a Datadog agent sidecar. If `DD_API_KEY` is absent, LLMObs is silently skipped and all AI calls continue working normally.
- `flushDD()` async helper: calls `llmobs.flush()` + awaits `tracer.flush()` wrapped in a promise. Called before every `res.json()` return so spans are not lost when the container exits.
- **Email route** (`send-email`, `send-contact-email`): not traced as LLM spans (as specified). `flushDD()` still called before each return.
- **AI route**: when LLMObs is enabled, the `axios.post` call is wrapped in `llmobs.trace({ kind: 'llm', name: featureName, modelName: model, modelProvider: provider }, async (span) => { ... })`. Annotations:
  - Before the call: `llmobs.annotate(span, { inputData: messages, metadata: { temperature, max_tokens, feature_name }, tags: { feature_name, provider, model } })`.
  - On success: `llmobs.annotate(span, { outputData: [{ content, role: 'assistant' }], metrics: { input_tokens, output_tokens, total_tokens } })`.
  - On error: `span.setTag('error', err)` + `span.setTag('error.message', err.message)`, then the error is surfaced via the normal `aiError` path → `res.json({ status: 'error', ... }, 500)`.
  - If LLMObs is not enabled, the AI call is executed directly without any observability overhead (same behaviour as before).
- Traces appear in Datadog LLM Observability > Traces grouped by `ml_app: wiseresumeai`, tagged with `feature_name`, `provider`, and `model`.

#### Updated: `appwrite-hubs/ai-gateway/package.json`
- Added `"dd-trace": "^5.102.0"` to dependencies.

#### Rebuilt: `appwrite-hubs/ai-gateway.tar.gz`
- Deployment archive rebuilt from updated source including `node_modules/dd-trace`.

### New Appwrite Function Variables required
- `DD_API_KEY` — Datadog API key (already in Appwrite global variables per task spec).
- `DD_SITE` — Datadog site (e.g. `datadoghq.com`); optional, defaults to `datadoghq.com`.

---

## 2026-05-09 — Task #14: Testmail DevKit integration — dev email catch-all + inbox viewer

### What changed

#### New: `appwrite-hubs/admin-testmail/src/main.js` + `package.json`
New Appwrite Function `admin-testmail`. Auth: `Authorization: Bearer <DEVKIT_PASSWORD>`.

- **`sendAppEmail({ to, subject, html, text, tag })`** helper: reads `EMAIL_TEST_MODE` from `process.env`; when `true`, replaces `to` with `{TESTMAIL_NAMESPACE}.{tag}@inbox.testmail.app` before calling Resend. Returns `{ sentTo, originalTo, testMode, tag, messageId }`.
- **`testmail-inbox` module**: fetches `https://api.testmail.app/api/json?namespace=…&limit=50` with optional `&tag=…` filter. Normalises each email to `{ id, subject, from, to, receivedAt, tag, html, text }`. Returns `{ emails, total, namespace, testMode }`.
- **`testmail-send-test` module**: calls `sendAppEmail` with a branded welcome email (tag: `welcome`) and returns the metadata so the DevKit panel can confirm delivery.

#### Updated: `appwrite-hubs/admin-email/src/main.js`
- Added `sendAppEmail({ to, subject, html, text, tag })` helper (mirrors `admin-testmail`).
- `handleEmailAction` now calls `sendAppEmail` instead of `resendRequest` directly. Each action is assigned a tag: `signup` (confirmation), `magic-link`, `otp`, `reset-password`, `custom`.
- Return shape unchanged (`{ email, message_id }`).
- New optional variables: `EMAIL_TEST_MODE`, `TESTMAIL_NAMESPACE` (default `ajku9`).

#### New: `src/components/dev-kit/TestmailInboxPanel.tsx`
DevKit panel for the Testmail inbox. Registered under Communications in the DevToolsPage sidebar as `testmail` / title "Testmail".

- Tag filter chips: all, welcome, signup, reset-password, otp, magic-link.
- Scrollable email list, each row collapsible to show HTML preview (sandboxed `dangerouslySetInnerHTML`) or text fallback.
- Refresh button + "Send test email" button (invokes `testmail-send-test`).
- `EMAIL_TEST_MODE` status badge (green when ON, amber when OFF).
- Uses `DevKitErrorCard`, `devKitAuthHeaders`, `unwrapAdminResponse`, `useIsMounted` — consistent with all other DevKit panels.

#### Updated: `src/pages/DevToolsPage.tsx`
- Imported `TestmailInboxPanel` and `Inbox` icon.
- Added `{ id: 'testmail', title: 'Testmail', icon: Inbox }` to the Communications panel group.
- Added `case 'testmail': return wrap('Testmail Inbox', <TestmailInboxPanel />)` to `renderPanel()`.

### New Appwrite Function Variables required
- `TESTMAIL_NAMESPACE` — e.g. `ajku9` (already in Appwrite, used as default fallback)
- `TESTMAIL_API_KEY` — Testmail API key (already in Appwrite)
- `EMAIL_TEST_MODE` — set to `"true"` in dev/staging to redirect emails to Testmail inbox

## 2026-05-09 — Task #6: admin-devkit-data packaged for Appwrite deployment

### What changed
- `appwrite-hubs/admin-devkit-data/` — Existing Appwrite Function source confirmed complete. Contains `src/main.js` (Node.js 18, ~700 lines) and `package.json` (deps: `node-appwrite ^11.1.1`, `axios ^1.4.0`). Handles 5 actions: `mission-control`, `analytics`, `observability`, `live-activity`, `edge-fn-drift`. Auth via `Authorization: Bearer <DEVKIT_PASSWORD>`.
- `appwrite-hubs/admin-devkit-data.tar.gz` — **New** deployment archive created from the function directory (with `node_modules` after `npm install`). Upload this zip to Appwrite Console → Functions → `admin-devkit-data` → Deployments → Create Deployment. Entrypoint: `src/main.js`.
- `Project Atlas/01-Currently Implemented/edge-functions/admin-devkit-data.md` — Updated to reflect Appwrite migration: new source file path, removed Supabase/Deno references, documented all 5 current actions and required Function Variables.

### Deploy outcome
- Function created via Appwrite REST API: ID `admin-devkit-data`, runtime `node-18.0`, project `69fd362b001eb325a192` (fra).
- Deployment `69ffc4207cb8e8e3ab99` built, activated (status `ready`), entrypoint `src/main.js`.
- All required Function Variables (`DEVKIT_PASSWORD`, `APPWRITE_API_KEY`, `GITHUB_TOKEN`, `RESEND_API_KEY`, `OPENROUTER_KEY_1`, `OPENROUTER_KEY_2`, `GROQ_KEY_1`) are inherited automatically from Appwrite project-level global variables — no per-function variable configuration needed.
- Live verification: POST to the function returns `401 {"success":false,"error":"Unauthorized"}` — proves the function is running and auth guard is active (not "Function not found").

---

## 2026-05-09 — Task #9: NVIDIA NIM key slots added to AI Keys admin panel

### What changed
- `appwrite-hubs/inspect-ai-keys/src/main.js` — **New** Appwrite Function (`inspect-ai-keys`). Validates admin auth (`Authorization: Bearer <DEVKIT_PASSWORD>`). Reads `OPENROUTER_KEY_1/2/3`, `GROQ_KEY_1/2/3`, `DEEPSEEK_KEY`, and `NVIDIA_KEY_1/2/3` from `process.env`. Masks each key to last-4-chars format (`••••XXXX`). Reads/writes per-slot model overrides to `app_settings.ai_test_slot_models` (stored as JSON string). When `provider + slot + model` present in body, saves the override before returning. Response shape: `{ success, keys: [{ provider, slot, hint, present, model }], defaultModels, slotModels, modelCatalogRefreshedAt }`.
- `appwrite-hubs/inspect-ai-keys/package.json` — Node.js 18 manifest; dep: `node-appwrite ^11.1.1`.
- `src/components/dev-kit/AIKeysPanel.tsx` — **New** DevKit panel. Shows all 4 providers in columns (OpenRouter=blue, Groq=orange, DeepSeek=purple, NVIDIA NIM=green). Each of the 12 slots shows key presence indicator (✓/✗), masked key hint, active test model, and an inline text input + Save button for model override. Dirty-tracking prevents spurious saves. Per-slot save/error status icons shown inline. Save POSTs to `inspect-ai-keys` with `{ provider, slot, model }`.
- `src/pages/DevToolsPage.tsx` — Added `AIKeysPanel` import; added `{ id: 'ai-keys', title: 'AI Keys', icon: KeyRound }` to the AI & Testing panel group; added `case 'ai-keys'` to `renderPanel()`; added `KeyRound` to lucide-react imports.

### Deploy notes
Deploy the new `inspect-ai-keys` function to Appwrite Console (project `69fd362b001eb325a192`, fra). Set `DEVKIT_PASSWORD` and `APPWRITE_API_KEY` in its Function Variables (same values as `admin-devkit-data`). NVIDIA slots will show "not set" until `NVIDIA_KEY_1/2/3` are added to Function Variables.

---

## 2026-05-09 — Feature: NVIDIA NIM integrated as fourth AI provider + DevKit engine test card

### What changed
- `appwrite-hubs/ai-gateway/src/main.js` — Added `NVIDIA_DEFAULT_MODEL = 'nvidia/llama-3.1-nemotron-70b-instruct'` constant. Added `nvidia: 'https://integrate.api.nvidia.com/v1/chat/completions'` to `BASES`. Extended pool-building loop to read `NVIDIA_KEY_1`, `NVIDIA_KEY_2`, `NVIDIA_KEY_3` from `process.env`. Extended `defaultModel` ternary to return `NVIDIA_DEFAULT_MODEL` when provider is `'nvidia'`. NVIDIA uses the same OpenAI-compatible request shape; no other changes needed.
- `src/lib/devkit/aiTestSlotModels.ts` — Added `'nvidia'` to `AITestProvider` union and `AI_TEST_PROVIDERS` array. Added `nvidia: 'nvidia/llama-3.1-nemotron-70b-instruct'` to `FALLBACK_AI_TEST_DEFAULT_MODELS`. Extended `isProvider()` guard and `providerDisplayName()` (returns `'NVIDIA NIM'`).
- `src/components/dev-kit/AITestSlotModelsCard.tsx` — Added `nvidia` entries to `PROVIDER_COLOR` (`text-green-400`) and `PROVIDER_BG` (`bg-green-500/10 border-green-500/20`). Updated slot badge from "9 slots" to "12 slots". Changed grid from `sm:grid-cols-3` to `sm:grid-cols-2 lg:grid-cols-4` to accommodate four providers.
- `src/components/dev-kit/DevKitRunner.tsx` — Added `ai-engine-nvidia` test in the `'ai'` section; invokes `edgeFunctions.invoke('ai-test', { body: { wiseresumeSubProvider: 'nvidia' } })` and surfaces `engine`, `model`, `latencyMs`, `response`. Extended `friendlyAIKeyError` to recognise NVIDIA key errors (`nvidia`, `integrate.api.nvidia.com`, `invalid api key`/`401`/`unauthorized`).

### Provider details
- Endpoint: `https://integrate.api.nvidia.com/v1/chat/completions` (OpenAI-compatible)
- Default model: `nvidia/llama-3.1-nemotron-70b-instruct`
- Key env vars: `NVIDIA_KEY_1`, `NVIDIA_KEY_2`, `NVIDIA_KEY_3` (set in Appwrite Function Variables)
- Load-balanced alongside OpenRouter, Groq, and DeepSeek in the random pool

---

## 2026-05-09 — Deployment: all 6 Appwrite AI Hub Functions live + Hostinger frontend synced

### What changed
- All 6 Appwrite Functions deployed and active in project `69fd362b001eb325a192` (region: fra):
  - `ai-gateway` — AI Gateway Hub (routes ~24 AI feature names)
  - `auth-master` — Auth Master Hub (Appwrite auth utilities)
  - `admin-email` — Admin Email Hub (transactional email via Resend)
  - `admin-feature-flags` — Admin Feature Flags Hub
  - `admin-moderation` — Admin Moderation Hub
  - `admin-portfolio-usernames` — Admin Portfolio Usernames Hub
- Hostinger static frontend synced via FTP to `resume/` (all build assets in `dist/`)
- GitHub `main` branch fully synced with Replit workspace (SHA `f2fe47c7`)

### Files changed
- `.github/workflows/deploy-frontend.yml` — FTP probe made non-fatal (`continue-on-error: true`); added `ftp:passive-mode true` and longer timeouts for reliable Hostinger sync from GitHub Actions
- `scripts/deploy_hubs.cjs` — rewritten for node-appwrite SDK v24: uses `File` object (not file path string) for `createDeployment`; covers all 6 hub IDs; `ensureFunction` auto-creates missing functions with `node-18.0` runtime; entrypoint fixed to `src/main.js`

### SDK fix
node-appwrite v24 removed `InputFile.fromPath()`. New pattern: `new File([fs.readFileSync(path)], filename, { type: 'application/gzip' })` passed as the `code` param to `functions.createDeployment({ functionId, code, activate, entrypoint })`.

---

## 2026-05-09 — Fix: unsafe date formatting causing site-wide white-screen crashes

### Problem
Calling `format(new Date(value), ...)` or `formatDistanceToNow(new Date(value), ...)` where `value` is `null`, `undefined`, or an unparseable string throws `RangeError: Invalid time value`, crashing the React tree at that ErrorBoundary. This caused white-screen page crashes on the Resume Detail page and any other route that renders dates from data that may be absent or malformed.

### New file
- `src/lib/dateUtils.ts` — appended two safe wrappers (existing resume-date utilities preserved):
  - `safeFormatDate(value, fmt, fallback?)` — wraps `date-fns` `format`; returns `fallback` (default `'—'`) instead of throwing when `value` is null/undefined/invalid.
  - `safeFormatDistanceToNow(value, opts?, fallback?)` — wraps `date-fns` `formatDistanceToNow`; same guard. Both accept `string | number | Date | null | undefined` and validate with `isValid()` before delegating.

### Files changed (call sites replaced)
- `src/pages/ResumeDetailPage.tsx` — `formatDistanceToNow(new Date(dbResume.updated_at), ...)` → `safeFormatDistanceToNow(dbResume.updated_at, ...)`
- `src/pages/ApplicationsPage.tsx` — two `format(new Date(...), ...)` calls on `applied_at` / `deadline` → `safeFormatDate`
- `src/pages/ApplicationTrackerPage.tsx` — same two fields → `safeFormatDate`
- `src/pages/JobDetailPage.tsx` — `format(new Date(job.posted_date), ...)` → `safeFormatDate`
- `src/pages/AnalyticsPage.tsx` — `formatDistanceToNow(new Date(stats.lastUpdated), ...)` → `safeFormatDistanceToNow`; unused `format` import removed
- `src/components/dashboard/ResumeListCard.tsx` — `formatDistanceToNow(new Date(resume.$updatedAt || ...), ...)` → `safeFormatDistanceToNow`
- `src/components/cover-letter/CoverLetterCard.tsx` — `formatDistanceToNow(new Date(letter.created_at), ...)` → `safeFormatDistanceToNow`
- `src/components/wisehire/pipeline/CandidateDetailPanel.tsx` — two calls (`ev.moved_at`, `candidate.created_at`) → `safeFormatDistanceToNow`
- `src/components/wisehire/outreach/OutreachHistory.tsx` — `email.created_at` → `safeFormatDistanceToNow`
- `src/components/wisehire/notes/CandidateNotes.tsx` — `note.created_at` → `safeFormatDistanceToNow`
- `src/components/wisehire/jd-writer/JDLibrary.tsx` — `role.updated_at` → `safeFormatDistanceToNow`
- `src/components/wisehire/dashboard/RecentBriefs.tsx` — `brief.created_at` → `safeFormatDistanceToNow`
- `src/components/wisehire/dashboard/RecentActivity.tsx` — `ev.moved_at` → `safeFormatDistanceToNow`

All bare `date-fns` imports for `format`/`formatDistanceToNow` replaced with imports from `@/lib/dateUtils`.

---

## 2026-05-09 — New Appwrite Functions: admin-moderation + admin-portfolio-usernames

### Files created
- `appwrite-hubs/admin-moderation/package.json` — Node.js 18 manifest; dep: `node-appwrite ^11.1.1`.
- `appwrite-hubs/admin-moderation/src/main.js` — Multi-action Appwrite Function (~210 lines):
  - `list_bug_reports` — paginates `bug_reports` collection with optional `status_filter` (open/in-progress/resolved/wont-fix/all); returns `{ bug_reports: BugReport[], total }`.
  - `update_bug_report` — patches `status` and/or `private_note` on a bug report document by `report_id`.
  - `list_blocklist` — lists all `blocklist` entries (type: email/user_id/pattern, value, reason, added_at); returns `{ entries }`.
  - `add_blocklist` — creates a blocklist entry with type validation; returns `{ ok, id }`.
  - `remove_blocklist` — deletes a blocklist entry by `entry_id`.
  - `list_moderation_queue` — paginates `moderation_queue` with optional `status_filter` (pending/approved/removed/all).
  - `review_queue_item` — sets queue item status to `approved` or `removed`; when `suspend_user: true`, calls Appwrite Users API `updateStatus(userId, false)` to disable the reported account.
- `appwrite-hubs/admin-moderation/README.md` — action reference table, required collection attribute specs (bug_reports, blocklist, moderation_queue), Function Variable table, Console + CLI deploy steps.
- `appwrite-hubs/admin-portfolio-usernames/package.json` — Node.js 18 manifest; dep: `node-appwrite ^11.1.1`.
- `appwrite-hubs/admin-portfolio-usernames/src/main.js` — Multi-action Appwrite Function (~420 lines):
  - `directory_list` — paginated list of profiles with a username; supports `search` (parallel full-text queries on email/full_name/username merged in memory), `sort` (newest/oldest/username_asc/username_desc), `page`, `per_page`.
  - `directory_rename` — validates uniqueness and reserved status, then writes new username to `profiles`.
  - `directory_toggle_enabled` — flips `portfolio_enabled` for a user.
  - `directory_release` — clears `username` and disables portfolio; accepts single `user_id` or bulk `user_ids` array.
  - `directory_bulk_disable` — sets `portfolio_enabled = false` for a list of user IDs.
  - `rules_get` — returns global `username_rules` doc (defaults if missing) plus all per-user `username_rules_overrides` with joined profile snippets.
  - `rules_update` — upserts the `username_rules` global doc (`$id = "global"`).
  - `rules_override_upsert` / `rules_override_delete` — upsert/delete a per-user rule override.
  - `reserved_list` / `reserved_add` / `reserved_delete` — CRUD on `username_reserved` (doc `$id` = the username).
  - `exclusive_list` / `exclusive_add` / `exclusive_delete` — CRUD on `username_exclusive`; list joins profile snippets.
  - `premium_list` / `premium_add` / `premium_delete` — CRUD on `username_premium` (price_cents, currency, status, note); list joins assigned-user profile.
  - `premium_assign` — marks a premium handle as `assigned`, writes `assigned_to_user_id` + `assigned_at`, and also sets the username on the user's `profiles` doc with `portfolio_enabled: true`.
  - `user_search` — parallel full-text search on email/full_name/username (≥2 chars); merges and deduplicates results.
- `appwrite-hubs/admin-portfolio-usernames/README.md` — full action/response table for all 19 actions, complete attribute specs for all 6 collections, Function Variable table, deploy steps.

### What this unblocks
`ModerationPanel` (bug inbox, blocklist, moderation queue with user suspension) and `PortfolioUsernamesPanel` (directory with search/sort/pagination, rename, enable/disable/release, rules + per-user overrides, reserved/exclusive/premium username management with user search) have been failing with "Function not found" since the Supabase cutover.

---

## 2026-05-09 — New Appwrite Functions: admin-email + admin-feature-flags

### Files created
- `appwrite-hubs/admin-email/package.json` — Node.js 18 manifest; dep: `node-appwrite ^11.1.1`.
- `appwrite-hubs/admin-email/src/main.js` — Multi-module Appwrite Function (~310 lines):
  - `resend-stats / stats` — reads `RESEND_AUDIENCE_*` Function Variables, fetches audience name and contact count from Resend API for each configured audience, fetches recent sent broadcasts with open/click rate metrics; returns `StatsResponse` (audiences, checklist, recentBroadcasts) matching `EmailAutomationsPanel`.
  - `resend-stats / lookup` — searches an email across all configured Resend audiences; returns `{ foundIn: string[] }`.
  - `resend-stats / add` | `remove` — upserts / removes a contact from a named Resend audience via `RESEND_AUDIENCE_<KEY>` variable.
  - `resend-sync` — reads all `profiles` from Appwrite DB and bulk-upserts into `RESEND_AUDIENCE_ALL_USERS`; returns `{ total, added, failed }`.
  - `email-actions` — sends transactional emails via Resend `POST /emails`: `resend_confirmation`, `send_magic_link`, `send_otp` (generates 6-digit code), `send_password_reset`, `send_custom` (admin-composed); returns `{ email, message_id }`.
  - All email templates are inline HTML using a shared `baseTemplate()` helper with WiseResume branding.
- `appwrite-hubs/admin-email/README.md` — deploy guide (Console + CLI), full variable table (RESEND_API_KEY, RESEND_FROM_*, RESEND_AUDIENCE_*, APPWRITE_API_KEY), all module/action request + response shapes.
- `appwrite-hubs/admin-feature-flags/package.json` — Node.js 18 manifest; dep: `node-appwrite ^11.1.1`.
- `appwrite-hubs/admin-feature-flags/src/main.js` — CRUD Appwrite Function (~180 lines):
  - `list` — fetches all flag documents from `feature_flags` collection, sorted by name; returns empty array (not error) if collection doesn't exist yet.
  - `upsert` — slugifies `name`, looks up existing document by name query, updates if found else creates; clamps `percentage_rollout` to 0–100; returns `{ flag: FeatureFlag }` matching panel type.
  - `delete` — finds document by name, deletes it; returns `{ deleted: name }`.
  - `FeatureFlag` shape: `id`, `name`, `description`, `enabled_globally`, `enabled_plans[]`, `enabled_user_ids[]`, `percentage_rollout`, `kill_switch_function`, `updated_by`, `updated_at`.
- `appwrite-hubs/admin-feature-flags/README.md` — deploy guide, variable table, full `feature_flags` collection attribute spec (types, nullable, indexes), request/response examples.

### What this unblocks
`EmailAutomationsPanel` (Resend audience stats, contact lookup, audience management, broadcast stats, all-users sync) and `EmailManagementPanel` (resend confirmation, send magic link, OTP, password reset, custom email) call `admin-email`. `FeatureFlagsPanel` (list/upsert/delete flags) calls `admin-feature-flags`. All three panels have been failing with "Function not found" since the Supabase cutover.

---

## 2026-05-09 — New Appwrite Functions: admin-visitor-analytics + admin-onboarding-funnel

### Files created
- `appwrite-hubs/admin-visitor-analytics/package.json` — Node.js 18 manifest; depends on `node-appwrite ^11.1.1`.
- `appwrite-hubs/admin-visitor-analytics/src/main.js` — Multi-action Appwrite Function (~290 lines) implementing:
  - `live-count` — counts unique `anon_id`s with activity in the last 5 minutes; returns `{ liveCount, topCountries }` (top-level, no `data` wrapper, matching `MissionControlPanel` expectation).
  - `kpis` — aggregates today + range page-views, unique visitors, device/browser breakdown, top country from `visitor_events`.
  - `country-dist` — visit counts grouped by 2-letter country code.
  - `top-pages` — most visited page paths with session count.
  - `click-targets` — most-clicked `data-track` elements; optionally filtered by `page`.
  - `sections` — most-viewed page sections with unique-visitor count.
  - `sessions` — paginated (50/page) session list built by grouping events; returns `{ sessions, total, page }`.
  - `cohort` — unique visitors grouped by ISO week label.
  - `journey` — all events for a `session_id` or `anon_id`, sorted chronologically.
- `appwrite-hubs/admin-visitor-analytics/README.md` — deploy guide (Console + CLI), variable table, collection schema, action reference.
- `appwrite-hubs/admin-onboarding-funnel/package.json` — Node.js 18 manifest; depends on `node-appwrite ^11.1.1`.
- `appwrite-hubs/admin-onboarding-funnel/src/main.js` — Single-action Appwrite Function (~220 lines):
  - Accepts `{ days, granularity }` from `OnboardingFunnelPanel`.
  - Fetches `audit_logs` documents with `category = 'onboarding'` in the requested rolling window.
  - Computes per-step unique-user funnel (`started → path_selected → review_opened → completed`).
  - Computes `methodBreakdown` (CV upload / LinkedIn / manual), `skipRates` (skip events ÷ users that reached the step), `saveFailures` (grouped error messages), and a time-series `series` array bucketed by day or week with all gaps filled as 0.
  - Sets `truncated: true` when event volume ≥ 9 999.
- `appwrite-hubs/admin-onboarding-funnel/README.md` — deploy guide, variable table, collection schema, funnel-step reference.

### What this unblocks
`VisitorsPanel` and the `MissionControlPanel` live-count call `admin-visitor-analytics`. `OnboardingFunnelPanel` calls `admin-onboarding-funnel`. Both panels have been failing with "Function not found" since the Supabase cutover. Once these functions are deployed in Appwrite Console (project `69fd362b001eb325a192`, fra), both panels become operational.

---

## 2026-05-09 — New Appwrite Function: admin-devkit-data

### Files created
- `appwrite-hubs/admin-devkit-data/package.json` — Node.js 18 package manifest; depends on `node-appwrite ^11.1.1` and `axios ^1.4.0`.
- `appwrite-hubs/admin-devkit-data/src/main.js` — full multi-action Appwrite Function (5 actions, ~430 lines). Implements:
  - `mission-control` — GitHub latest-commit fetch, production site ping, OpenRouter/Groq/Resend provider health pings, Appwrite DB connectivity check, secrets inventory from Function Variables, last 10 errors from `error_log`, last 5 admin actions from `admin_audit_logs`.
  - `analytics` — range-bucketed (today/7d/30d/90d/all) aggregations over `usage_events`, `ai_usage_logs`, `portfolio_visits`, `profiles`; returns full `PremiumAnalyticsData` shape including `rangeKpis`, `activitySeries`, `dauRollingSeries`, `newVsReturning`, `heatmap`, `topFeaturesRanged`, `topReferrers`, `deviceBreakdown`, `countryRanking`.
  - `observability` → `get_telemetry` (aggregates `edge_function_logs` into per-function p50/p95/error-rate/sparkline rows), `get_error_stream` (filters `error_log` by since/function_name/severity), `mark_reviewed` (updates a document in `error_log`).
  - `live-activity` → `usage_events`, `error_log`, `contact_requests` resources.
  - `edge-fn-drift` — lists all deployed Appwrite Functions; returns count, oldest/newest deploy timestamps, count older than 30 days.
- `appwrite-hubs/admin-devkit-data/README.md` — deploy instructions (Console + CLI), full variable table, request/response shapes for all 5 actions, collection-permission matrix.

### What this unblocks
Mission Control, Analytics, Observability, and Live Activity panels all call `admin-devkit-data`. Until now every call returned "Function with the requested ID could not be found". Once this function is deployed in Appwrite Console (project `69fd362b001eb325a192`, fra), all four panels will become functional.

---

## 2026-05-09 — DevKit: error messages migrated from Supabase → Appwrite references

### Files changed
- `src/lib/devkit/errorTranslate.ts` — replaced `SUPABASE_DIRECTIVE` constant with `APPWRITE_DIRECTIVE` (project ID `69fd362b001eb325a192`, fra region); rewrote all six existing error patterns so every `humanMessage`, `hint`, and `aiPromptHead` references Appwrite Functions and the Appwrite Console instead of Supabase/Kinde; added a new seventh pattern matching "Function with the requested ID could not be found" which tells the admin the Appwrite Function is not yet deployed; added an eighth pattern for Appwrite Database collection/document not found; JSDoc on `ErrorContext.function` field updated from "Supabase Edge Function name" to "Appwrite Function name".
- `src/components/dev-kit/EmailManagementPanel.tsx` — inline "RESEND_API_KEY is not configured" warning now directs admin to Appwrite Console → Functions → admin-email → Variables (was Supabase dashboard → Edge Functions → Secrets).
- `src/components/dev-kit/EmailAutomationsPanel.tsx` — audience-unconfigured link changed from `https://supabase.com/dashboard` / "Supabase Edge Function Secrets" to `https://cloud.appwrite.io` / "Appwrite Function Variables".

### What this fixes
Every "Copy AI fix prompt" in a DevKit error card was telling the AI assistant to check "production Supabase (project ref jnsfmkzgxsviuthaqlyy)". Supabase has been fully decommissioned. The prompts now correctly reference Appwrite and give actionable steps (deploy via Appwrite Console, update Appwrite Function Variables). Two panel-level UI strings also referenced Supabase and are now corrected.

---

## 2026-05-09 — DevKit: per-panel crash boundaries + MissionControl initial-render guard

### Files changed
- `src/pages/DevToolsPage.tsx` — added `DevKitPanelBoundary` import; `renderPanel()` now wraps every panel case in `<DevKitPanelBoundary panelName="…">` via a local `wrap()` helper; a single panel crash no longer takes down the whole DevKit shell — the sidebar, header, and all other tabs stay live; the boundary shows the error name, stack trace, component stack, timestamp, and a "Copy full error" button so crashes can be reported precisely.
- `src/components/dev-kit/MissionControlPanel.tsx` — initial-render guard changed from `!data && loading` to `!data && (loading || !error)` — the skeleton now shows on the very first render tick (before the `useEffect` fires and sets `loading: true`) so the full UI never renders with `data === null`.

### Bug fixed
Production error `TypeError: Cannot read properties of undefined (reading 'data')` was crashing one or more DevKit panels and propagating to the global error boundary, which made it look like the whole `/devkit` route was down. Root cause: no `DevKitPanelBoundary` was scoped to individual panels in `renderPanel()`, so any panel-level throw reached React's root. The boundary is now applied to all 20 panels.

## 2026-05-09 — DevKit: all hidden panels wired + Cmd+K palette + session context

### Files changed
- `src/pages/DevToolsPage.tsx` — full rewrite: wrapped in `DevKitSessionProvider`; replaced local `isAuthenticated` state with `useDevKitSession()` `isUnlocked`; password and passkey login both call `unlock()` so all panels receive a live session token; auto-unlock from remembered session via `loadRememberedToken()`; sidebar reorganised into 7 labelled groups; all 20 panels imported and rendered; Cmd+K command palette (⌘K / Ctrl+K) with live search; session lock countdown warning; mobile "More" sheet shows all panels in a grid grouped by category; `MissionControlPanel` receives correct `onNavigate` handler with tab-to-id map; panel count badge in sidebar footer.
- `src/components/dev-kit/AITestSlotModelsCard.tsx` — new component; reads per-slot AI test model config via `fetchAITestSlotModels()` helper; displays OpenRouter / Groq / DeepSeek slot models with override-vs-default label; "Manage in AI Radar" button deep-links to ai panel via `onNavigateToKeys` prop; handles loading / error / refresh states.

### Previously hidden panels now connected (12 total)
`AnalyticsPanel`, `VisitorsPanel`, `LiveActivityPanel`, `MissionControlPanel`, `ObservabilityPanel`, `EmailManagementPanel`, `EmailAutomationsPanel`, `FeatureFlagsPanel`, `ModerationPanel`, `OnboardingFunnelPanel`, `PortfolioUsernamesPanel`, `DevKitRunner`.

### Root cause of panels being hidden
`DevKitSessionProvider` was never mounted anywhere in the app. Panels that call `useDevKitSession()` would have thrown "must be used within DevKitSessionProvider" at runtime. Now the provider wraps the entire DevTools shell.
