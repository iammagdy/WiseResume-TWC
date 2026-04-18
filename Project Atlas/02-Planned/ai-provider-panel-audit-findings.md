# AI Provider Panel — Audit Findings (Task #28 follow-up)

**Created:** 2026-04-18
**Source:** Code review of all changes shipped in Task #28 (commits `a87b9f9`, `2101bc9`, `4433544`) plus Task #29 (Groq usage card).
**Scope:** `src/components/dev-kit/AIProviderPanel.tsx` (1312+ lines) and `server/index.ts` lines 1160–1320 (4 admin proxy endpoints, plus the `groq-usage` endpoint added in Task #29).
**Status:** Findings documented for handoff. None are showstoppers — the panel works in production today. These are polish / hardening items.

> **For the next agent:** Use this file as the backlog. Each finding has a severity, a precise file:line pointer, the root cause, and a recommended fix. Group items into one or two follow-up tasks rather than one task per finding.

---

## How the affected code is wired

```
AIProviderPanel.tsx (DevKit > AI Provider tab)
├─ Tabs: OpenRouter / Groq / Gemini / Ollama
├─ Each tab = sub-panel with: BreakerChip, BreakerBanner, TestBanner, ConfirmCard, model list
├─ Parent fetches: ai-breaker-status (edge fn) + 3 server proxy routes
└─ Server routes proxy upstream APIs using managed env-var keys

server/index.ts (Express, behind requireAuthHeader + requireAdminEmail)
├─ GET  /api/admin/ai-provider/openrouter-status   → openrouter.ai/api/v1/auth/key
├─ GET  /api/admin/ai-provider/groq-models         → api.groq.com/openai/v1/models
├─ GET  /api/admin/ai-provider/groq-usage          → api.groq.com/openai/v1/usage   (Task #29)
├─ GET  /api/admin/ai-provider/gemini-models       → generativelanguage.googleapis.com/v1beta/models
└─ POST /api/admin/ai-provider/gemini-test         → generativelanguage.googleapis.com/.../generateContent
```

---

## 🔴 Critical functional bugs

### F1. Breaker countdown never ticks
- **Where:** `AIProviderPanel.tsx` lines 209 (`BreakerChip`), 236 (`BreakerBanner`).
- **Symptom:** When the circuit breaker is OPEN, the UI shows e.g. "resets in 47s" and stays frozen at 47s forever until the admin clicks Refresh.
- **Cause:** `secsLeft` is computed once at render time from `Date.now()` with no interval to re-render.
- **Fix:** Add a 1s interval (a tiny `useTickEvery(1000)` hook) that re-renders the component while any breaker row is open. Stop the interval when no breakers are open.

### F2. Gemini `Test` button always pings a hardcoded model
- **Where:** `server/index.ts` line 1293: `const model = 'gemini-2.0-flash';`
- **Symptom:** Admin selects `gemini-1.5-pro` in the panel, clicks Test, but the server actually pings `gemini-2.0-flash`. False reassurance.
- **Fix:** Accept `{ model }` in the request body. Server-side: validate against the live models list (already fetched by `/gemini-models`), reject anything else, fall back to `gemini-2.0-flash`.

### F3. Gemini models mapping returns invalid types
- **Where:** `server/index.ts` lines 1265–1266.
  - Line 1265 (`id`): if `m.name` is not a string, returns the raw value (could be `undefined` or an object). Type claims `string`.
  - Line 1266 (`name`): falls back to `m.name` (which may still be the prefixed `"models/gemini-1.5-pro"`), so the UI label shows the prefix.
- **Fix:** Filter out malformed entries before mapping. Always strip the `models/` prefix for both `id` and `name`. Add a Zod-style validation, or at minimum `if (typeof m.name !== 'string') return null` and `.filter(Boolean)`.

### F4. Test results persist across tab switches
- **Where:** `AIProviderPanel.tsx` — each sub-panel keeps its own `testState`.
- **Symptom:** Admin tests OpenRouter → success banner. Switches tabs and comes back an hour later → green banner still says "OK" with stale latency, even if the provider now broke.
- **Fix:** Either (a) lift `testState` to parent and reset on tab switch, or (b) add a timestamp to the result and grey it out after ~60s.

### F5. Tailwind opacity classes `/8` are not in the default config
- **Where:** Multiple — line 239 (`bg-amber-500/8`, `bg-green-500/8`), 598, 748, 928, 1107 (`bg-primary/8`).
- **Symptom:** Tailwind's JIT only ships standard opacity steps (`/5`, `/10`, `/20`, ...). `/8` is silently dropped or rendered fully transparent depending on the build.
- **Fix:** Replace all `/8` with `/10` (closest standard step). Single search-and-replace across the file.

### F6. `hasFetched.current` ref ignores prop changes (Ollama)
- **Where:** `AIProviderPanel.tsx` lines 968, 987–992 (`OllamaPanel`).
- **Symptom:** If the admin changes `ollamaBaseUrl` in another settings panel, the Ollama models list does not refetch — the ref is still `true` from the first URL.
- **Fix:** Either drop the ref pattern and use `useEffect(() => { fetchModels(); }, [base])` directly, or reset the ref when `base` changes.

### F7. `AbortSignal.timeout()` not supported on older Safari/iOS
- **Where:** `AIProviderPanel.tsx` line 1006 (`OllamaPanel.runTest`).
- **Symptom:** Safari < 17.4 and iOS < 17.4 throw `TypeError: AbortSignal.timeout is not a function`. Surfaces as an opaque "Test failed".
- **Fix:** Use the `AbortController + setTimeout` pattern already used on the server (lines 1180–1196).

### F8. "Refresh all" button is misleadingly named
- **Where:** `AIProviderPanel.tsx` lines 1233–1240, header.
- **Symptom:** Refreshes only breaker status + managed OR + managed Groq + Groq usage. Does **not** refresh: OpenRouter model list (300+ items), Ollama model list, Gemini model list, any test banners.
- **Fix:** Either rename to "Refresh status" or lift the per-panel refresh callbacks up so the header button truly refreshes everything.

---

## 🟠 Security findings

### S1. `String(e)` may leak the upstream URL (which contains the API key for Gemini)
- **Where:** `server/index.ts` lines 1194 (`openrouter-status`), 1229 (`groq-models`), 1271 (`gemini-models`), and the new `groq-usage` endpoint.
- **Cause:** When `fetch` throws a `TypeError: fetch failed`, some Node/Undici versions include the request URL in the message. For Gemini, that URL contains `?key=<GEMINI_API_KEY>`.
- **Risk:** API key could be returned to the browser inside the `error` field and end up in browser logs / Sentry / screenshots.
- **Fix:** Use the same pattern as `gemini-test` (line 1313): `e instanceof Error ? e.message : 'unknown error'`. Even better: log the raw error server-side, return only a generic message to the client. Apply to all four older endpoints.

### S2. Gemini API key passed as URL query string
- **Where:** `server/index.ts` lines 1254 (`gemini-models`), 1294 (`gemini-test`): `?key=${key}`.
- **Cause:** Documented Google API style, but the key ends up in any reverse-proxy/CDN/access logs in front of the server.
- **Fix:** Use the header form: `headers: { 'x-goog-api-key': key }`. Officially supported by Google Generative Language API.

### S3. `fetchWithToken` silently sends unauthenticated requests
- **Where:** `AIProviderPanel.tsx` lines 168–177.
- **Cause:** If `getSupabaseToken()` returns `null` (expired session), the request goes out without an `Authorization` header. Server returns 401 → user sees "HTTP 401" with no actionable hint.
- **Fix:** When the token is `null`, throw early with `"Session expired — please re-login to the DevKit."`

### S4. Two parallel admin auth schemes
- **Cause:** The edge function `ai-test` is gated by a shared secret (`adminPassword: getDevKitToken()`), while the new server proxy routes use `requireAuthHeader + requireAdminEmail` (Supabase JWT). Either leak rotates independently.
- **Fix:** Pick one. Recommended: migrate `ai-test` (and similar edge functions) to JWT-based admin verification using Supabase's `auth.getUser()` inside the edge function. Track in a separate hardening task.

---

## 🟡 Performance findings

### P1. No server-side cache on Groq/Gemini model lists
- **Where:** `server/index.ts` lines 1218 (Groq), 1253 (Gemini).
- **Cause:** Every browser refresh = upstream API call. Model lists change on the order of hours, not seconds.
- **Fix:** In-memory cache with 10-minute TTL keyed by route. Two-line change with a `Map<string, { value, expiresAt }>`.

### P2. No debounce or memoization on model list filtering
- **Where:** All four sub-panels (`OpenRouterPanel`, `GroqPanel`, `GeminiPanel`, `OllamaPanel`) — `models.filter(...)` runs on every render.
- **Cause:** OpenRouter ships ~300 models. Each keystroke re-filters and re-renders; no `useMemo`.
- **Fix:** Wrap each `filtered` in `useMemo([models, search, filter])`. Add a 100–150ms debounce on the search input.

### P3. Refresh sets state to `null` causing UI flash
- **Where:** Lines 1180, 1192 (`fetchManagedOR`, `fetchManagedGroq`) — both do `setManagedXxx(null)` first.
- **Symptom:** Existing data disappears, "Loading…" shows for the duration of the request.
- **Fix:** Keep the previous data, add an `isRefreshing` boolean instead.

### P4. No request deduplication
- **Cause:** Rapid double-clicks on "Refresh all" fire overlapping requests.
- **Fix:** Cache the in-flight `Promise` per endpoint and return it for concurrent callers.

### P5. No cancel on unmount
- **Cause:** If the admin closes the DevKit while a test is running, the `setTestState` after `await` runs on an unmounted component → React warning + small leak.
- **Fix:** Wire an `AbortController` per test, abort in the cleanup of the effect / on unmount.

### P6. OpenRouter model list fetched directly from the browser
- **Where:** `AIProviderPanel.tsx` line 418.
- **Cause:** Each user's IP hits openrouter.ai directly, bypassing the admin-only proxy pattern used for the others. Inconsistent and wastes bandwidth on a list that changes slowly.
- **Fix:** Move to a new `/api/admin/ai-provider/openrouter-models` endpoint with the same 10-minute cache as P1.

---

## 🟢 UX findings

### U1. ConfirmCard has no keyboard handlers
- **Where:** Component at line 253.
- **Fix:** `Enter` confirms, `Esc` cancels. Add `onKeyDown` on the wrapper.

### U2. No live polling of breaker status
- **Cause:** Admin only sees breaker state changes if they manually refresh.
- **Fix:** Auto-poll every 15–30s while the AI Provider panel is open. Pause when the tab is hidden (`document.visibilityState`).

### U3. Partial refresh failures show no toast
- **Cause:** "Refresh all" runs three independent fetches. If one fails, only that section shows an error — no global notification.
- **Fix:** Use `Promise.allSettled` and surface failures in a single toast.

### U4. Gemini daily usage uses UTC date
- **Where:** Line 839: `new Date().toISOString().slice(0, 10)`.
- **Symptom:** Cairo admin sees their counter reset at 02:00 local time, not midnight.
- **Fix:** Compute the date in the user's local timezone with `toLocaleDateString('en-CA')` (gives `YYYY-MM-DD`).

### U5. `groqModel` shows "none selected" while routing actually defaults to a model
- **Where:** Line 718–720.
- **Cause:** When the panel is in Wiseresume mode with sub-provider Groq, the actual routing layer falls back to `qwen/qwen3-32b`. The UI claims no model is set.
- **Fix:** Show the same default the routing layer uses — pull it from a shared constant in `aiClient.ts` instead of the user's BYOK `groqModel`.

---

## 🔵 Architecture & docs

### A1. Per-user Gemini breaker rows hidden
- **Where:** `BREAKER_ID.gemini = 'gemini_global'`.
- **Cause:** Only the global row is shown. If a per-user `gemini_${userId}` breaker pattern exists in the table, it's invisible here.
- **Fix:** Either confirm there are no per-user rows, or list any matching `gemini_*` rows and group them.

### A2. `getBreakerRow` recomputes on every render
- **Where:** Line 1210.
- **Cause:** Called once per tab-bar render to compute `isOpen` for the red dot. Not memoized.
- **Impact:** Negligible (≤5 rows), noted for completeness.

### A3. No telemetry on admin actions
- **Cause:** Switching the active model and running tests are not logged anywhere.
- **Fix:** Add a server-side audit log table (`admin_audit_log` with `actor_email`, `action`, `payload`, `at`) and call it from each model-switch / test endpoint. This is also useful for the broader DevKit.

### A4. `replit.md` does not mention the new admin proxy route family
- **Where:** Project root `replit.md`.
- **Fix:** Add a one-paragraph note: "Admin AI provider proxy routes live at `/api/admin/ai-provider/*` in `server/index.ts`. They proxy openrouter.ai, api.groq.com, and generativelanguage.googleapis.com using managed env-var keys (`OPENROUTER_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`). Auth: `requireAuthHeader + requireAdminEmail`."

---

## ✅ What was already done correctly (for context)

- `requireAuthHeader + requireAdminEmail` applied consistently to all five proxy endpoints.
- Each endpoint returns `{ configured: false }` when its env var is missing — never crashes.
- Each endpoint has `AbortController + 8s timeout` (15s for `gemini-test`).
- Zero `as any` and zero `catch (e: any)` in the React component — every cast is a named interface.
- `BREAKER_ID` is a single source of truth that matches `aiClient.ts`.
- Confirm-before-switch UX prevents fat-finger model changes.
- Task #29 (Groq usage card) follows the same patterns — same fixes apply to it.

---

## Recommended grouping for follow-up work

A reasonable single task could be: **"AI Provider panel — polish & hardening (Task #28/#29 follow-up)"** containing F1, F3, F5, F6, F7, S1, S2, P1, U1, U4. Roughly 1 working day.

A second task: **"AI Provider panel — observability & testability"** containing F2, F4, F8, P5, U2, A3. Roughly 1 working day.

Anything tagged `S` should be prioritised over anything else — especially S1 and S2 because they touch the managed Gemini key.
