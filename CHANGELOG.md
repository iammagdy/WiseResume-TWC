## 2026-05-10 — v4.1.2 release

### Summary
Version bump to 4.1.2 — consolidates all 2026-05-10 session work: ModelCombobox for all AI key providers, server-driven model catalog from `inspect-ai-keys`, AI Usage Logs DevKit panel, ai-gateway usage logging, provider fallback chains, Datadog eval metrics, and both Appwrite Functions redeployed with correct tarball structure and bundled `node_modules`.

---

## 2026-05-10 — Task #44: AI gateway now writes to ai_usage_logs so the panel shows real data

### What changed

#### `appwrite-hubs/ai-gateway/src/main.js`
- Added `AI_USAGE_LOGS_COLLECTION = 'ai_usage_logs'` constant.
- Added `logUsage(db, payload, log)` helper: best-effort `databases.createDocument()` call that writes `featureName`, `provider`, `model`, `dbOverride`, `routedByFeature`, `fallbackDepth`, and `userId` to the `ai_usage_logs` collection. Wrapped in try/catch — a write failure is logged but never propagates to the caller.
- Called `logUsage()` (fire-and-forget, before `flushDD()`) after every successful AI call in both the `resume-section-ai` branch and the general AI route (route 3).
- `userId` is sourced from `opts.userId` passed in the request body (optional, falls back to `null`).

---

## 2026-05-10 — Task #31: AI Usage Logs panel added to DevKit

### What changed

#### `src/components/dev-kit/AIUsageLogsPanel.tsx` (new file)
- New DevKit panel that reads from the `ai_usage_logs` Appwrite collection (`COLLECTIONS.ai_usage_logs`).
- Shows the 50 most-recent AI requests in a table: featureName, providerUsed, modelUsed, routedByFeature flag, dbOverride flag.
- Rows with `dbOverride=true` get a subtle amber background and an amber **DB** badge (matching AIRoutingPanel style).
- Rows with `routedByFeature=true` get a blue **routed** badge; fallback rows get a yellow **fallback** badge.
- Summary bar at the top shows total requests, per-provider counts, DB-override count, and fallback count.
- Auto-refreshes every 20 s while the tab is visible; refresh button available.
- Field mapping is tolerant of both camelCase (`dbOverride`, `routedByFeature`, `modelUsed`) and snake_case (`db_override`, `routed_by_feature`, `model_used`) Appwrite attribute names.
- Uses `DevKitErrorCard` for errors, `useIsMounted` and `useVisibleInterval` for safe async state.
- Includes a visual legend explaining all badges at the bottom.
- Zero `any` casts in production code (strict TypeScript throughout).

#### `src/pages/DevToolsPage.tsx`
- Imported `AIUsageLogsPanel`.
- Added `{ id: 'ai-logs', title: 'AI Usage Logs', icon: Activity }` to the "AI & Testing" panel group (between AI Radar and AI Keys).
- Added `case 'ai-logs'` to `renderPanel()` switch.

---

## 2026-05-10 — ai-gateway redeployed with dd-trace bundled; DD_SITE set

### What was done

The live `ai-gateway` function was running the old build (pre-dd-trace). The source already contained the full LLM Observability instrumentation (Tasks #21 + #44) but it was never deployed with dependencies bundled.

#### Problems fixed (same pattern as inspect-ai-keys fix)
1. **Tarball had wrong structure** — archive contained `ai-gateway/src/main.js`; Appwrite expects `src/main.js` at root. Fixed with `tar -czf -C ai-gateway .`.
2. **node_modules not bundled** — `dd-trace`, `axios`, and `node-appwrite` were absent. Ran `npm install` inside `appwrite-hubs/ai-gateway/` and included `node_modules` (36 MB archive).

#### Appwrite Console changes
- Deployment `69ffff7746e143520249` — `status: ready`, `activate: true`.
- `DD_SITE` function variable set to `datadoghq.com` (matches the code's default).
- **`DD_API_KEY` / `DATADOG_API_KEY` must still be set manually** in the Appwrite Console → ai-gateway → Variables. The key is not available in Replit secrets.

#### Traces will appear once `DD_API_KEY` is set
The function reads `process.env.DATADOG_API_KEY || process.env.DD_API_KEY`. Set either name in Appwrite Console → Functions → ai-gateway → Variables, then trigger any AI call. Traces appear in Datadog LLM Observability → Traces → `ml_app: wiseresumeai`.

---

## 2026-05-10 — Task #9 follow-up: inspect-ai-keys fully operational in Appwrite Console

### What was done

The `inspect-ai-keys` Appwrite Function had two deployment issues:
1. **Missing function variable** — `APPWRITE_API_KEY` was not set, so the function could not read/write `app_settings.ai_test_slot_models` from the database.
2. **Tarball structure wrong** — previous tarballs wrapped everything under `inspect-ai-keys/` so Appwrite couldn't find the entrypoint at `src/main.js`.
3. **Node modules not bundled** — Appwrite's build step did not run `npm install`, causing `Cannot find module 'node-appwrite'` at execution time.

#### `appwrite-hubs/inspect-ai-keys` (Appwrite Console — deployment `69fffedf915e4aaaa90d`)
- Added `APPWRITE_API_KEY` function variable. Both required variables now present: `DEVKIT_PASSWORD`, `APPWRITE_API_KEY`.
- Rebuilt tarball using `tar -czf -C inspect-ai-keys .` so `src/main.js` is at the tarball root (matches `entrypoint: 'src/main.js'`).
- Ran `npm install` inside `appwrite-hubs/inspect-ai-keys/` and bundled `node_modules` into the tarball.
- Smoke-tested live execution: HTTP 200, `success: true`, 12 key slots returned, all four providers present, `modelOptions` catalog served.

#### `scripts/deploy_hubs.cjs`
- Added `inspect-ai-keys` to the `hubs` array so future bulk deploys include it:
  `{ id: 'inspect-ai-keys', name: 'Inspect AI Keys Hub', file: 'inspect-ai-keys.tar.gz' }`.

---

## 2026-05-10 — Task #26: Model catalog combobox in AI Keys panel — searchable dropdown with tier badges for all providers

### What changed

#### `appwrite-hubs/inspect-ai-keys/src/main.js` (deployed to Appwrite)
- Added `MODEL_CATALOG` object with curated model lists for all four providers (OpenRouter, Groq, DeepSeek, NVIDIA).
  - Each entry: `{ id, tier: 'free'|'paid', deprecated?: true, hint?: string }`.
  - NVIDIA entries are derived from the existing `NVIDIA_MODELS` array (labels stay in sync automatically).
- Response now includes `modelOptions: MODEL_CATALOG` alongside the existing `nvidiaModels` field (backward compat).
- `MODEL_CATALOG` carries maintenance comment pointing to NIM catalog / OpenRouter / Groq docs.

#### `src/components/dev-kit/AIKeysPanel.tsx`
- Added `ModelCombobox` component: searchable text input with a floating dropdown.
  - Filters options by typing (matches `id`, `label`, `hint`).
  - Each option shows: model label/ID · `free` badge (emerald) · `paid` badge (amber) · `old` badge (red, deprecated) · hint text.
  - Pressing Enter selects the first filtered match; Escape reverts to the last committed value.
  - Clicking outside closes and reverts. Free-text entry still works — custom model IDs not in the list are valid.
  - Closes and commits on option click (`onMouseDown` + `e.preventDefault()` prevents focus loss).
- Replaced the NVIDIA `<select>` element and the plain `<input>` for OpenRouter / Groq / DeepSeek with `<ModelCombobox>` — all four providers now use the same searchable combobox.
- Added `modelOptions` state (`Record<AITestProvider, AITestModelOption[]>`), seeded from `FALLBACK_MODEL_OPTIONS`.
- `load()` priority for model catalog: `data.modelOptions[provider]` (server) → `data.nvidiaModels` (nvidia compat) → `FALLBACK_MODEL_OPTIONS`.
- Removed `nvidiaModels` state; NVIDIA validation now uses `modelOptions.nvidia`.
- Removed `ChevronDown` import (no longer used). Added `useRef`.

#### `src/lib/devkit/aiTestSlotModels.ts`
- `AITestModelOption` interface: added `label?` field (used by NVIDIA combobox options).
- `InspectAIKeysResponse`: added `modelOptions` field.
- Added `FALLBACK_MODEL_OPTIONS` export (`Record<AITestProvider, AITestModelOption[]>`) — 7 OpenRouter, 6 Groq, 3 DeepSeek, 5 NVIDIA models — matches `MODEL_CATALOG` in the server function.


---

## 2026-05-10 — Task #25: NVIDIA model list is now server-driven — update without a frontend redeploy

### What changed

#### `appwrite-hubs/inspect-ai-keys/src/main.js` (deployed to Appwrite)
- Replaced flat `NVIDIA_VALID_MODELS` string array with `NVIDIA_MODELS` object array `[{label, value}]`. Labels are now stored server-side alongside IDs.
- `NVIDIA_VALID_MODELS` is now derived: `NVIDIA_MODELS.map(m => m.value)` — no duplication.
- Response now includes `nvidiaModels: NVIDIA_MODELS` — the full label+value list the frontend needs for the dropdown.
- Added prominent maintenance comment on `NVIDIA_MODELS` identifying it as the single source of truth, with NIM catalog link (`https://build.nvidia.com/explore/discover`) and API docs link.

#### `src/components/dev-kit/AIKeysPanel.tsx`
- Added `nvidiaModels` state, initially seeded with the hardcoded `NVIDIA_LLM_MODELS` fallback.
- In `load()`: if `data.nvidiaModels` is returned (non-empty array), `setNvidiaModels()` updates to the server list; otherwise stays on the fallback.
- NVIDIA dropdown now renders `nvidiaModels` (state) instead of `NVIDIA_LLM_MODELS` (constant) — server list takes effect without a frontend redeploy.
- Validation (`validNvidiaValues`, `nvidiaDefault`) also computed from the active server list.
- Added `nvidiaModels` field to local `InspectResponse` interface.

#### `src/lib/devkit/aiTestSlotModels.ts`
- Updated `NVIDIA_LLM_MODELS` JSDoc: now explicitly labelled "fallback only — do not add models here", with pointer to `inspect-ai-keys/src/main.js` and NIM catalog link.
- Added `nvidiaModels` field to `InspectAIKeysResponse` interface.

#### How to update the model list going forward
Edit `NVIDIA_MODELS` in `appwrite-hubs/inspect-ai-keys/src/main.js` and redeploy that function. No frontend redeploy needed.

---

## 2026-05-10 — Task #22: AI gateway provider fallback chain — automatic retry on provider failure

### What changed

#### `appwrite-hubs/ai-gateway/src/main.js` (deployed to Appwrite)

**`HARDCODED_FEATURE_ROUTES` — added `fallbacks` to all 21 entries**
Each entry now has an ordered `fallbacks: [{provider, model}, ...]` array tried in sequence if the primary provider returns an error (rate-limit, outage, bad key). Chains per category:
- nvidia-primary (cover letter, tailor, recruiter-sim): → openrouter → groq
- groq-primary (chat, section-ai, editor, detect-humanize, etc.): → openrouter → deepseek
- groq-primary `suggest-template` (8b-instant): → groq 70b → openrouter (escalates within provider)
- deepseek-primary (analyze-resume, fix-suggestions): → groq → openrouter
- openrouter-primary (parse-resume, parse-job, linkedin, question-bank, company-briefing): → groq → deepseek

**Removed `pickProvider()` — replaced with `buildFallbackChain()` + `callAIWithFallback()`**
- `buildFallbackChain(featureName, pool, dbOverrides)` — returns `{ chain: [{provider,key,model},...], routed }`. Chain is ordered primary-first; entries for unconfigured providers are silently skipped. DB overrides still override the primary; hardcoded fallbacks are always preserved so runtime overrides never weaken resilience.
- `callAIWithFallback(chain, messages, temperature, maxTokens, log)` — tries each entry in order, logs each failure, returns `{content, usage, provider, model, fallbackDepth}` on first success. Throws last error if all fail (existing error behaviour preserved).
- Added `pickKeyForProvider(provider, pool)` helper for clean random key selection per provider.

**Response shape additions** (backward-compatible new fields):
- `data.fallbackDepth` (number) — 0 = primary succeeded; 1+ = fallback was used
- `data.fallbackUsed` (boolean) — convenience alias
- `resume-section-ai` path also returns `fallbackDepth` and `dbOverride`

**DD LLMObs span annotations updated**
- Span is opened with primary route info (as before)
- After the call, `actual_provider`, `actual_model`, `fallback_depth`, `fallback_used` tags are added so Datadog captures which provider actually served each request.

**No breaking changes:** response `data.content`, `data.providerUsed`, `data.modelUsed`, `data.routedByFeature`, `data.dbOverride` fields all preserved at same paths.

---

## 2026-05-10 — Task #21: Add Datadog eval metrics for AI answer quality tracking

### What changed

#### `appwrite-hubs/ai-gateway/src/main.js`
- Added `llmobs.submitEvalMetric()` calls inside the LLM Observability trace span (route 3 — main AI route) after output annotation succeeds.
- Two eval metrics submitted per successful AI call:
  - **`response_word_count`** (`score`) — raw word count of the model's reply. Trends over time reveal verbosity shifts across features and providers.
  - **`content_quality`** (`score`, 0–1 heuristic):
    - `0.0` — empty response or fewer than 5 words (likely a provider error or refusal).
    - `0.5` — response starts with a refusal/apology phrase (e.g. "I'm sorry", "I cannot", "As an AI").
    - `1.0` — substantive reply.
- Both metrics carry `feature:<featureName>` and `provider:<provider>` tags for Datadog faceted filtering.
- All `submitEvalMetric` calls are wrapped in `try/catch`; any error is logged via the Function's `error()` callback and never blocks the AI response.
- Eval metrics only fire when `_llmobsEnabled` is true (i.e. `DATADOG_API_KEY` is set in Appwrite Function variables).

---

## 2026-05-10 — Task #18: Expand Testmail Inbox tag filters — all email flows now catchable

### What changed

#### `src/components/dev-kit/TestmailInboxPanel.tsx`
- `TAG_FILTERS` expanded from 6 to 12 entries. New tags:
  - `custom` — already used by `admin-email` `send_custom` action (was missing filter chip)
  - `billing` — billing receipts and subscription confirmations
  - `ai-credits` — low-credit warnings and credit top-up confirmations
  - `portfolio` — portfolio published/updated notifications
  - `weekly-digest` — weekly career progress digest emails
  - `broadcast` — admin bulk/broadcast emails
- `TAG_COLORS` updated with colour mappings for all 6 new tags: custom (zinc), billing (yellow), ai-credits (cyan), portfolio (rose), weekly-digest (orange), broadcast (violet). All existing colours preserved.
- TypeScript: zero errors after change (`tsc --noEmit` exits 0).

#### Backend tag assignments (no change needed)
- `admin-email` `email-actions` module already correctly assigns tags: `signup`, `reset-password`, `otp`, `magic-link`, `custom`.
- `admin-testmail` send-test uses `welcome`. No new `sendAppEmail` callers exist yet — tags are ready for when those flows are built.

---

## 2026-05-10 — Task #17: Deploy admin-testmail — Testmail Inbox DevKit panel now live

### What changed

#### `appwrite-hubs/admin-testmail/` (deployed to Appwrite)
- Function `admin-testmail` already existed in Appwrite project `69fd362b001eb325a192` (fra region) with `runtime: node-18.0`, `execute: ['any']`, and a prior deployment. The active deployment `69fff4cdeb6e07364c67` (entrypoint `src/main.js`) was confirmed live.
- Created 4 missing Function Variables: `EMAIL_TEST_MODE=true`, `TESTMAIL_NAMESPACE=ajku9`, `RESEND_FROM_EMAIL=hello@thewise.cloud`, `RESEND_FROM_NAME=WiseResume`.
- Re-packaged `appwrite-hubs/admin-testmail.tar.gz` and created a fresh deployment `69fff78d694da4e6638c` (status: ready, activate: true) to pick up the new variables.

#### `scripts/deploy_hubs.cjs`
- Added `admin-testmail` to the `hubs[]` deploy list so future runs include it.

#### End-to-end verification (all pass)
- `testmail-inbox` → HTTP 200, `testMode: true`, `namespace: ajku9`
- `testmail-send-test` → HTTP 200, `sentTo: ajku9.welcome@inbox.testmail.app`, `messageId: 4994aff1-...`
- Testmail inbox re-query (tag: welcome) → 1 email: `WiseResume — Test Email from DevKit`, `from: WiseResume <hello@thewise.cloud>`, `receivedAt: 2026-05-10T03:12:49Z`

---

## 2026-05-10 — Task #16: Add missing Appwrite database collections — Mission Control database check now passes

### What changed

#### `scripts/provision-devkit-collections.cjs`
- Added `string_array` type support to `ensureAttribute()` — calls `createStringAttribute` with `array=true` as the 7th positional argument.
- Added 4 new collection definitions to `COLLECTIONS[]`:

| Collection | Attributes added |
|---|---|
| `feature_flags` | `name` (required), `description`, `enabled_globally`, `enabled_plans` (string[]), `enabled_user_ids` (string[]), `percentage_rollout`, `kill_switch_function`, `updated_by`, `updated_at` |
| `profiles` | `user_id`, `email`, `display_name`, `plan`, `country` |
| `subscriptions` | `user_id`, `plan`, `plan_id`, `status`, `started_at`, `expires_at` |
| `resumes` | `user_id`, `title`, `status`, `template` |

#### Appwrite Database — `main` (project `69fd362b001eb325a192`)
- 8 collections already existed (provisioned in prior tasks): `error_log`, `admin_audit_logs`, `usage_events`, `ai_usage_logs`, `portfolio_visits`, `edge_function_logs`, `contact_requests`, `visitor_events`.
- 4 collections newly created: `feature_flags`, `profiles`, `subscriptions`, `resumes`.
- All missing attributes on the 4 new collections created.
- Net total: 12 collections, 0 failures.

#### Verification
- `admin-devkit-data` `mission-control` response: `database.ok: true`, `database.error: null`, `database.errorCount1h: 0`.
- `deploy.siteUp: true`, `ai.allProvidersOk: true`.

---

## 2026-05-10 — Task #15: Connect DevKit panels to real data — auth fix + full end-to-end verification

### What changed

#### Root-cause discovery
Appwrite's function execution gateway **replaces** the `Authorization` header with its own
internal Basic-auth credential (`Basic opr:…`) before forwarding the HTTP request to the
function runtime. Every admin function read the DevKit password from
`req.headers['authorization']`, so they always received the gateway's credential instead
of the user's token → perpetual 401.

#### `appwrite-hubs/admin-devkit-data/src/main.js`
- `checkAuth`: switched from `req.headers['authorization']` to `req.headers['x-devkit-token']`.
- Removed temporary debug probe (`__probe__` action).
- Rebuilt and redeployed (deployment `69fff377ca1318ff874e`, status: ready).

#### `appwrite-hubs/admin-visitor-analytics/src/main.js`
#### `appwrite-hubs/admin-feature-flags/src/main.js`
#### `appwrite-hubs/admin-moderation/src/main.js`
#### `appwrite-hubs/admin-portfolio-usernames/src/main.js`
#### `appwrite-hubs/inspect-ai-keys/src/main.js`
#### `appwrite-hubs/admin-email/src/main.js`
#### `appwrite-hubs/admin-testmail/src/main.js`
- Same `checkAuth` fix in all 7 remaining admin functions.
- All 7 redeployed and verified ready.

#### `src/lib/devkit/devKitAuth.ts`
- `devKitAuthHeaders()`: switched from `{ Authorization: \`Bearer \${token}\` }` to
  `{ 'x-devkit-token': token }`. Updated JSDoc to document AUTH-6 reason.

#### Appwrite global variables (project `69fd362b001eb325a192`)
- `DEVKIT_PASSWORD` global was empty (secret flag masked value but value was never set).
- Set per-function `DEVKIT_PASSWORD = thewisedeveloper3041` on all 8 admin functions
  so each function can independently verify the token.
- Set per-function `APPWRITE_API_KEY` on `admin-devkit-data` for database access.

#### End-to-end smoke test results (all HTTP 200)
| Function | Action | Result |
|---|---|---|
| `admin-devkit-data` | `mission-control` | deploy.siteUp=true, ai.allProvidersOk=true, secrets.missingCount=1 |
| `admin-devkit-data` | `analytics` (7d) | pageViews, activeUsers, topFeatures returned |
| `admin-devkit-data` | `observability` | telemetry returned |
| `admin-devkit-data` | `live-activity` | usage_events feed returned |
| `admin-visitor-analytics` | `live-count` | liveCount=0 |
| `admin-feature-flags` | `list` | flags=[] |
| `admin-portfolio-usernames` | `directory_list` | rows=[], total=0 |
| `admin-moderation` | `list_bug_reports` | bug_reports list returned |
| `inspect-ai-keys` | `list` | openrouter+groq keys detected |
| `admin-email` | `resend-stats/stats` | audiences returned |
| `admin-testmail` | `testmail-inbox` | emails=[], namespace=ajku9 |

---

## 2026-05-10 — Task #33: Provision missing Appwrite Database attributes for DevKit panels

### What changed

#### `scripts/provision-devkit-collections.cjs` (new)
- Idempotent provisioning script using `node-appwrite` SDK.
- Checks each collection with `getCollection()` (catches 404) before creating.
- Creates each attribute (catches 409 to skip already-existing ones).
- Adds 300 ms pause between attributes and 500 ms between collections to avoid Appwrite rate-limit rejections.

#### Appwrite Database — `main` (project `69fd362b001eb325a192`)
All 8 collections existed (provisioned in an earlier session) but several were missing critical attributes. The following attributes were added:

| Collection | Attributes added |
|---|---|
| `error_log` | `message`, `context`, `source`, `level`, `resolved`, `reviewed_at` |
| `admin_audit_logs` | `action`, `category`, `metadata` |
| `usage_events` | `event_type`, `feature`, `metadata` |
| `ai_usage_logs` | `feature`, `provider`, `model`, `tokens_used`, `credits_used` |
| `portfolio_visits` | `portfolio_id`, `referrer`, `utm_source`, `device_type`, `country`, `country_code`, `page`, `ip` |
| `edge_function_logs` | `function_name`, `message`, `level`, `status`, `duration_ms` |
| `contact_requests` | `type`, `email`, `name`, `message`, `metadata` |
| `visitor_events` | `session_id`, `anon_id`, `event_type`, `page`, `target`, `section`, `country`, `device_type`, `browser` |

`user_id` was the only pre-existing attribute on most collections; all other attributes are new.

**Net effect:** `admin-devkit-data` (Mission Control, Observability, Live Activity, Analytics) and `admin-visitor-analytics` (Visitors panel) will now get real data (or clean empty arrays) instead of `missing_table: true` / attribute-not-found query errors.

---

## 2026-05-10 — Task #34: DevKit smoke test — 29/29 passing (completed)

### What changed

Built and ran a comprehensive read-only smoke test exercising all 8 DevKit admin Appwrite Functions. Root-caused and fixed four bugs that caused 100% failure rate. Final result: **29/29 tests pass**.

#### Smoke test script
- `appwrite-hubs/devkit-smoke-test.js` — ESM, 29 read-only tests across all 8 functions, writes `appwrite-hubs/SMOKE_TEST_RESULTS.md`

#### Bug 1 — Appwrite executor overwrites `Authorization` header (root cause of all 401s)
Appwrite's open-runtimes executor replaces any `Authorization` header with its own internal Basic auth (`opr:...`) before calling the function runtime. The DevKit password in `Authorization: Bearer <pw>` was silently discarded, causing every function to return 401 Unauthorized.

**Fix — all 8 function `checkAuth()` functions** (`appwrite-hubs/*/src/main.js`):  
Changed from `req.headers['authorization']` to `req.headers['x-devkit-token']` (also handles `X-Devkit-Token`, trimmed).

**Fix — frontend** (`src/lib/devkit/devKitAuth.ts`):  
`devKitAuthHeaders()` now returns `{ 'x-devkit-token': token }` instead of `{ Authorization: 'Bearer ${token}' }`.

#### Bug 2 — Missing `node_modules` in two function archives
`admin-devkit-data` and `admin-visitor-analytics` had no `node_modules` installed locally, producing 15 KB and 9 KB archives that caused 503 at runtime.

**Fix:** Ran `npm install` in both directories; archives now ~2 MB and ~1.1 MB.

#### Bug 3 — Wrong node-appwrite SDK version (v11.1.1 → v24.1.0) in all 7 functions
The v11 SDK sends `GET` requests with a request body for `listDocuments()`, which Appwrite Cloud rejects. All function code was already written for the v24 Query array API.

**Fix:** Updated `package.json` `"node-appwrite": "^24.1.0"` and ran `npm install` in all 7 affected functions.

#### Bug 4 — `admin-devkit-data` response envelope missing `success: true`
All 5 router branches now spread `{ success: true, ...data }` (`appwrite-hubs/admin-devkit-data/src/main.js`).

#### Bug 5 — Portfolio `username_reserved` / `username_exclusive` collections not yet provisioned
Both handlers now catch `e.code === 404` and return `{ rows: [], missing_collection: true }` (`appwrite-hubs/admin-portfolio-usernames/src/main.js`).

#### Final deployment IDs (Task #34)

| Function | Deployment ID |
|---|---|
| `admin-devkit-data` | `69fff53743e3d6b19695` |
| `admin-visitor-analytics` | `69fff40036afff3095f9` |
| `admin-feature-flags` | `69fff401eaf53b540a3c` |
| `admin-moderation` | `69fff403bb9868ef3917` |
| `admin-portfolio-usernames` | `69fff539110a0e63468b` |
| `inspect-ai-keys` | `69fff4074419968bde71` |
| `admin-email` | `69fff4091589a1cc85fc` |
| `admin-testmail` | `69fff40a7a0f3f0b9310` |

---

## 2026-05-10 — Task #29: Upload and activate all 8 admin functions in Appwrite Console (completed)

### What changed

All 8 admin Appwrite Functions deployed, debugged, and confirmed **HTTP 200** end-to-end to project `69fd362b001eb325a192` (fra region). Two functions (`admin-visitor-analytics`, `admin-testmail`) were created for the first time.

#### Final active deployment IDs (all 8 fully green)

| Function | Deployment ID | Runtime |
|---|---|---|
| `admin-devkit-data` | `69ffe6e2b832ec78fc7e` | node-18.0 |
| `admin-visitor-analytics` | `69ffe6e2a210fd0f5e92` | node-18.0 |
| `admin-feature-flags` | `69ffec84301f9eb258d0` | node-18.0 |
| `admin-moderation` | `69ffec821603c1fd9632` | node-18.0 |
| `admin-portfolio-usernames` | `69ffec85bf1c5bd8ed85` | node-18.0 |
| `inspect-ai-keys` | `69ffe6e20e1abd024eec` | node-18.0 |
| `admin-email` | `69ffe6e20ee75ded195d` | node-18.0 |
| `admin-testmail` | `69ffea2273e3d144c94d` | node-18.0 |

#### Fixes required to reach all-green

**Fix 1 — `execute`/entrypoint patching:** Pre-existing functions had `execute=[]` and `entrypoint=""`. Patched via `PUT /v1/functions/{id}`.

**Fix 2 — DEVKIT_PASSWORD variable gap:** Global was `VITE_DEV_KIT_PASSWORD`; functions read `process.env.DEVKIT_PASSWORD`. Added `DEVKIT_PASSWORD` global; deleted all empty per-function overrides that were silently shadowing it.

**Fix 3 — tar.gz path prefix:** Archives packed as `admin-feature-flags/src/main.js` instead of `./src/main.js`. Fixed by packing from within each function directory.

**Fix 4 — node-appwrite SDK upgrade (v11.1.1 → v24.1.0):** `databases.listDocuments()` in v11 triggered Appwrite Cloud's rejection of GET-with-body requests. Upgraded in `admin-feature-flags`, `admin-moderation`, `admin-portfolio-usernames` (`appwrite-hubs/*/package.json`).

**Fix 5 — `APPWRITE_FUNCTION_API_KEY` in client setup:** Functions used `process.env.APPWRITE_API_KEY || ''`. Appwrite runtime auto-injects `APPWRITE_FUNCTION_API_KEY` with full project scopes. Updated `getClients()` in `admin-feature-flags/src/main.js`, `admin-moderation/src/main.js`, `admin-portfolio-usernames/src/main.js` to prefer `APPWRITE_FUNCTION_API_KEY`.

**Fix 6 — Testmail API key format (`admin-testmail/src/main.js` line 100):** Was sending `Authorization: Bearer <key>` header; Testmail.app requires `?apikey=<key>` as a URL query parameter.

#### Final smoke test results (2026-05-10)

Wrong-password: all 8 → `completed`, HTTP 401, `{"success":false,"error":"Unauthorized"}` ✅  
Correct-password: all 8 → `completed`, HTTP 200, correct data ✅

Full verification: `appwrite-hubs/DEPLOYMENT_VERIFICATION_TASK29.md`.

---

## 2026-05-10 — Task #23: Move AI routing config to Appwrite Database (live editing without redeploy)

### What changed

#### `appwrite-hubs/ai-gateway/src/main.js`
- Renamed `FEATURE_ROUTES` → `HARDCODED_FEATURE_ROUTES` to clarify it is the fallback default map.
- Added module-level TTL cache: `_routeCache = { routes: {}, fetchedAt: 0 }` with `ROUTE_CACHE_TTL_MS = 60_000` (60 s). Cache is shared across warm container invocations.
- Added `loadDbRoutes(db, log)` async function: queries `ai_routing_config` collection (up to 100 docs) via `sdk.Query.limit(100)`. Returns `{ [featureName]: { provider, model, rationale } }`. Best-effort — on any error returns the stale cache so the gateway never blocks.
- `pickProvider()` now accepts a third `featureRoutes` parameter (the merged map) instead of reading the module-level constant directly.
- In the main handler, DB overrides are fetched via `loadDbRoutes()` and shallow-merged over `HARDCODED_FEATURE_ROUTES` (`Object.assign({}, HARDCODED_FEATURE_ROUTES, dbOverrides)`) before calling `pickProvider`. DB rows win.
- Gateway response now includes `dbOverride: true/false` in the returned data object.
- Datadog LLMObs span metadata now includes `db_override` tag for observability.
- Log message differentiates "DB-override" vs "default" provider selection.

#### `src/components/dev-kit/AIRoutingPanel.tsx`
- Full rewrite from static display to interactive editor.
- On mount, fetches all `ai_routing_config` documents from Appwrite Database via `databases.listDocuments()`.
- `overrideMap` (Map keyed by `featureName`) is derived from fetched documents.
- Each row now shows: effective provider badge, effective model (struck-through default when overridden), amber "DB" badge when a DB override is active, edit (pencil) icon always, trash icon only when an override exists.
- Clicking the edit icon opens an inline `EditForm` below the row: provider selector (button group), model text input (pre-filled with provider default on provider switch), rationale text input.
- Save: calls `databases.updateDocument()` if an override exists, otherwise `databases.createDocument(ID.unique(), ...)`. Updates local state optimistically via `setOverrides`.
- Delete: calls `databases.deleteDocument()` after confirmation. Removes from local state.
- Amber warning banner shown when ≥1 DB overrides are active (with TTL note).
- Refresh button re-fetches the collection.
- Error state handled via `DevKitErrorCard`.
- Uses `useIsMounted` guard on all async state updates.

#### `src/lib/appwrite-collections.ts`
- No change needed — `ai_routing_config` was already registered at line 24.

---

## 2026-05-10 — Task #28: Fix all DevKit panel errors (auth forwarding, missing packages, UI crashes)

### What changed

#### `src/lib/edgeFunctions.ts`
- `functions.createExecution()` now passes `options?.headers ?? {}` as the 6th argument. Previously headers were silently dropped, so `Authorization: Bearer <DEVKIT_PASSWORD>` never reached any admin function — causing every panel to return 401 / "Session expired". This single fix unblocks auth for all 10+ admin panels.
- Updated the behavioral comment block to accurately describe that headers are now forwarded (removed the "intentional no-op" statement).

#### `src/components/dev-kit/DevKitRunner.tsx`
- `<TestItem>` props corrected: `expandedJson` → `isExpanded`, `onToggleJson` → `onToggleExpand`, removed undeclared `globalRunning` prop.
- Default result fallback added: `results[test.id] ?? { status: 'idle' as const }` — prevents a TypeError crash on mount before any test is run.

#### `src/components/dev-kit/TestItem.tsx`
- Added `if (!result) return null;` early guard at the top of the component body as a safety net against any future undefined `result` prop.

#### `src/components/dev-kit/VisitorsPanel.tsx`
- Replaced two `setError(String(e))` catch-block calls with `setError(formatEdgeError(e, '...'))` from `@/lib/devkit/edgeResponse`. Fixes `[object Object]` being displayed when the thrown value is a plain object instead of an `Error` instance.
- Added import for `formatEdgeError`.

#### `appwrite-hubs/` — all 8 admin function packages rebuilt with fresh `node_modules/`
- `admin-devkit-data`: ran `npm install` (was missing `node_modules/`), rebuilt tar.gz.
- `admin-visitor-analytics`: first-time tar.gz created (no archive existed); ran `npm install`.
- `admin-feature-flags`: refreshed `node_modules/`, rebuilt tar.gz.
- `admin-moderation`: refreshed `node_modules/`, rebuilt tar.gz.
- `admin-portfolio-usernames`: refreshed `node_modules/`, rebuilt tar.gz.
- `inspect-ai-keys`: tar.gz created (no archive existed); refreshed `node_modules/`.
- `admin-email`: refreshed `node_modules/`, rebuilt tar.gz.
- `admin-testmail`: tar.gz created (no archive existed; zero external deps).

All archives are rooted at `./` so Appwrite finds `./src/main.js` as the entrypoint. Upload each to Appwrite Console → Functions → (create if missing) → Deployments → Create Deployment, then Activate.

---

## 2026-05-10 — Fix four broken features after Appwrite migration (AI badge, CV score, AI tools, CV preview)

### What changed

#### `src/lib/appwrite-bridge.ts`
- Removed `'ai-health'` and `'score-resume'` from `AI_HUB_FUNCTIONS`.
  - `ai-health` now calls the standalone `ai-health` Appwrite function directly (returns `{status:'healthy',latencyMs:0}` instantly) instead of routing through `ai-gateway` and making a real AI provider call. This restores the "AI Online" badge.
  - `score-resume` removed because scoring is now computed locally (see `useResumeScore.ts`).

#### `src/hooks/useResumeScore.ts`
- Removed `edgeFunctions` import and the `invokeScoreResume` edge function call entirely.
- Added imports for `calcContactScore`, `calcSummaryScore`, `calcExperienceScore`, `calcEducationScore`, `calcSkillsScore` from `resumeCompletionRules.ts`.
- Added `buildLocalResumeScore(resume)` — builds a full `ResumeHealthScore` (all categories + topStrength + topImprovement) using deterministic local rules. Instant, no network call, no AI.
- `invokeScoreResume` now delegates to `buildLocalResumeScore` and returns immediately. All callers (`scoreResume`, `backgroundScore`, `runBackgroundScore`) continue to work unchanged.

#### `src/hooks/useEditorHydration.ts`
- Fixed field name mismatches between `DatabaseResumeLike` interface and actual Appwrite documents:
  - `resumeFromDb.template_id` → resolves `$$.template` first, falls back to `template_id`.
  - `resumeFromDb.updated_at` → resolves `$updatedAt` first, falls back to `updated_at`.
- Both fixes apply in both the initial hydration path and the stale-resume detection path.
- This restores correct template selection and enables proper stale-detection for documents coming from Appwrite (not Supabase).

#### `src/hooks/useResumes.ts` — `dbToResumeData`
- Added fallback to `content` blob: if `db.contact_info`, `db.experience`, etc. are missing/null (Supabase migration format stored everything in a single `content` JSONB column), the function now falls back to the same fields from `parseJson(db.content, {})`.
- Resume title and templateId also fall back to blob values.
- This restores the CV preview for resumes whose data lives in the `content` column rather than individual attributes.

#### `appwrite-hubs/ai-gateway/src/main.js`
- Added a `resume-section-ai` feature-specific handler block (inserted before the generic AI route).
- Reads `featureName === 'resume-section-ai'` and `opts['x-resume-section-ai-action']` (`enhance` | `tailor` | `fill-gap` | `explain-gap`).
- Builds proper system + user prompts from `section`, `currentContent`, `context.jobDescription`.
- Returns `{ status, improved, changes, suggestions, providerUsed, modelUsed }` at top level so `useAIEnhance.ts`'s `respData.improved` access and `validateImprovedShape` check both pass.
- Strips markdown code fences from AI responses before JSON parsing; falls back gracefully if parsing fails.
- Deployed to Appwrite (deployment ID `69ffdf9963e2f4c828af`, status `ready`).


---

## 2026-05-10 — thewise.cloud landing page + deploy pipeline corrections

### What changed

#### New file: `thewise-cloud-landing/index.html`
- Static "coming soon" landing page for `thewise.cloud` (separate from the WiseResume app at `resume.thewise.cloud`).
- Features: hacker-cat GIF, "The Wise Cloud" purple-gradient heading, typewriter-animated "coming soon..." loop, pill links to `resume.thewise.cloud` and `quran.thewise.cloud`, "Magdy Saber" footer link → `magdysaber.com`. Dark theme (`#0a0a0f` background).

#### New file: `.github/workflows/deploy-landing.yml`
- Separate `workflow_dispatch` workflow (ID 273959366) that uploads only `thewise-cloud-landing/index.html` to the Hostinger FTP root via `lftp put`. Does not affect `resume/` or the main app deploy.

#### Fixed: `.github/workflows/deploy-frontend.yml`
- Deploy target corrected back to `resume/` only. Removed erroneous `.` (root) mirror that had been added when diagnosing the v4.1.1 version-bump issue. Future app deploys will never touch `thewise.cloud` root again.

#### Root-cause note
- The `resume/` target in `deploy-frontend.yml` is intentional — `resume.thewise.cloud` is the production app domain. An incorrect "fix" to `.` (added while chasing a version bump issue) deployed WiseResume to `thewise.cloud` root and then deleted it with `--delete`. Both errors are now resolved.

## 2026-05-10 — Version bump to 4.1.1 + deploy pipeline fix

### What changed

#### `package.json`
- Version changed from `"4.1.0-Appwrite-Native"` to `"4.1.1"`. Removes the internal "Appwrite-Native" label from the user-visible footer version string (`v{__APP_VERSION__}` in `Footer.tsx`).

#### `.github/workflows/deploy-frontend.yml`
- Fixed `lftp mirror` target from `resume/` (a wrong subdirectory that had silently re-appeared after a prior git reconciliation) back to `.` (the FTP home = Hostinger web root `/public_html/`).
- Added `rm -f index.html` before the mirror so `index.html` is always re-uploaded, even when its content hash is unchanged.
- Both fixes committed via GitHub Contents API and deployed via workflow run `25615530667` (SUCCESS). Live site now serves `index-nwWBJNno.js` + `Footer-DDOOkJOz.js` containing `"4.1.1"` (last-modified `2026-05-10T00:29:26Z`).

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

## 2026-05-09 — Task #10: Per-feature AI provider routing in the ai-gateway

### What changed

#### appwrite-hubs/ai-gateway/src/main.js
- Added `FEATURE_ROUTES` — a hardcoded map of 22 featureName → { provider, model } covering all major AI features.
- Added `buildPool()` helper (extracts existing env-var pool construction).
- Added `pickProvider(featureName, pool)`:
  - If featureName has a FEATURE_ROUTES entry AND that provider has ≥1 key → uses that provider + its preferred model.
  - Otherwise → random pick from the full pool (original fallback preserved).
- Response now includes `modelUsed` and `routedByFeature` for observability.

#### src/components/dev-kit/AIRoutingPanel.tsx (new)
- DevKit panel showing the full routing table grouped by provider.
- Provider summary chips, per-provider feature cards with model + rationale.

#### src/pages/DevToolsPage.tsx
- Added AIRoutingPanel import + Route icon import.
- Added 'ai-routing' panel to AI & Testing group.
- Added case 'ai-routing' to renderPanel().

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

## 2026-05-09 — Task #10: Per-feature AI provider routing in the gateway

### What changed

#### Updated: `appwrite-hubs/ai-gateway/src/main.js`
- Added `FEATURE_ROUTES` — a hardcoded map of 22 featureName → `{ provider, model }` entries covering all major AI features.
- Added `buildPool()` helper that constructs the full provider pool from env vars (unchanged from prior behaviour).
- Added `pickProvider(featureName, pool)` helper:
  - If `featureName` has an entry in `FEATURE_ROUTES` AND the preferred provider has ≥1 configured key → picks a random key from that provider + uses the preferred model.
  - Otherwise → random pick from the full pool (original fallback behaviour preserved).
- Response shape extended: `data.modelUsed` and `data.routedByFeature` fields now returned so callers can observe which model was actually used. Datadog spans tagged with `routed_by_feature`.
- Routing logic (per `Routing AI Providers/04-feature-routing-map.md`):
  - **NVIDIA NIM / Nemotron 70B** — quality-critical generation: `generate-cover-letter`, `tailor-resume`, `recruiter-simulation`.
  - **Groq / Llama 3.3 70B Versatile** — speed-critical / chat / streaming: `agentic-chat`, `wise-ai-chat`, `resume-section-ai`, `editor-ai`, `smart-fit-rewrite`, `detect-and-humanize`, `career-assessment`, `generate-portfolio-bio`, `generate-resignation-letter`, `validate-tailor`.
  - **Groq / Llama 3.1 8B Instant** — lightweight classifier: `suggest-template`.
  - **DeepSeek / deepseek-chat** — structured analysis: `analyze-resume`, `generate-fix-suggestions`.
  - **OpenRouter / Llama 3.3 70B free** — long-context / parsing: `parse-resume`, `parse-job`, `optimize-for-linkedin`, `generate-question-bank`, `company-briefing`.
  - All other featureNames (score-resume, ask-portfolio, ai-health, coupons, etc.) fall through to random pool.

#### New: `src/components/dev-kit/AIRoutingPanel.tsx`
DevKit panel (`ai-routing`) that displays the live `FEATURE_ROUTES` config as a grouped table.
- Provider summary chips (NVIDIA / Groq / DeepSeek / OpenRouter) with feature counts.
- Per-provider expandable cards listing each feature → featureName slug → preferred model → rationale.
- "Random fallback pool" note for unregistered features.
- No remote data fetching — the map is mirrored directly from the gateway source so it stays in sync at build time.

#### Updated: `src/pages/DevToolsPage.tsx`
- Imported `AIRoutingPanel` and `Route` icon.
- Added `{ id: 'ai-routing', title: 'AI Routing', icon: Route }` under the AI & Testing panel group.
- Added `case 'ai-routing': return wrap('AI Routing', <AIRoutingPanel />)` to `renderPanel()`.

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

## 2026-05-10 — Restore quran.thewise.cloud (wisequran deploy)

### What changed

#### Triggered: `iammagdy/wisequran` deploy workflow (run 25616085615)
- `quran.thewise.cloud` was returning 404 after the `--delete` mirror in the WiseResume deploy wiped the `/public_html/quran/` subdirectory on Hostinger.
- Triggered `workflow_dispatch` on wisequran's existing "Deploy to Hostinger" workflow (ID 244949119) via GitHub API. Workflow runs `pnpm build` → smoke-tests → deploys to `domains/thewise.cloud/public_html/quran` via SFTP.
- Result: SUCCESS. `quran.thewise.cloud` serves HTTP 200, last-modified `2026-05-10T01:00:45Z`.
- No code changes were needed — the wisequran repo already had all SFTP secrets and a working deploy workflow.
