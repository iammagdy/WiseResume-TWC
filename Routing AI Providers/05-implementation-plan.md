# 05 — Implementation Plan (Phased)

> **Purpose:** Step-by-step rollout. Each phase is independently deployable and **does not break existing AI features**. Phases must be done in order; phases inside the same number can run in parallel.
>
> **Golden rule:** at any phase boundary, every existing AI feature in WiseResume must still work exactly as it does today.

---

## Phase 0 — Pre-flight checklist (no code changes)

Done by the project owner before any code is written.

- [ ] Read `01-current-state.md` and confirm it still matches the codebase.
- [ ] Read `04-feature-routing-map.md` and confirm the per-feature provider picks.
- [ ] Read `09-decisions-log.md` and confirm all locked decisions still hold.
- [ ] Get a `GEMINI_API_KEY` from `aistudio.google.com` (free tier, no billing required for v1).
- [ ] Confirm `OPENROUTER_API_KEY` and `GROQ_API_KEY` are present and working.
- [ ] (Optional) Add $10 of credit to OpenRouter to lift the daily cap from 50 → 1,000 RPD.

**Exit criteria:** all secrets present in the Replit project, all checklist items signed off.

---

## Phase 1 — Routing config file (new code, no behavior change)

**Goal:** create the single source of truth for routing decisions. Nothing imports it yet.

### Tasks

1. Create `supabase/functions/_shared/aiRouting.ts` containing:
   - `PROVIDERS` — provider catalog from `03-providers-and-models.md`.
   - `MODELS` — model catalog from `03-providers-and-models.md`.
   - `FEATURE_ROUTES` — every entry from the table in `04-feature-routing-map.md`.
   - `resolveRoute(featureKey)` — pure function returning the resolved chain (no DB calls yet).
2. Create `supabase/functions/_shared/__tests__/aiRouting.test.ts` with:
   - Snapshot test of the full route table.
   - Assertion that every `FEATURE_ROUTES` key has at least 1 fallback.
   - Assertion that no model string is used outside `MODELS`.

### Verification

- `npx tsc --noEmit` clean.
- Tests pass.
- Grep confirms no edge function imports `aiRouting.ts` yet.

### Risk

- None. New file, nothing reads it.

### Rollback

- Delete the file.

---

## Phase 2 — Schema additions (additive, backward-compatible)

**Goal:** widen `ai_usage_logs` and create `ai_cache` and `ai_provider_status` tables. No existing rows are touched.

### Tasks

1. New migration `supabase/migrations/<timestamp>_ai_routing_observability.sql`:
   ```sql
   alter table public.ai_usage_logs
     add column if not exists feature_key       text,
     add column if not exists provider_used     text,
     add column if not exists model_used        text,
     add column if not exists prompt_tokens     integer,
     add column if not exists completion_tokens integer,
     add column if not exists total_tokens      integer,
     add column if not exists latency_ms        integer,
     add column if not exists fallback_depth    integer,            -- NULL until Phase 4 migration writes it
     add column if not exists cache_hit         boolean,            -- NULL until Phase 4 migration writes it
     add column if not exists error_type        text;
   -- Defaults are intentionally NULL (not 0/false) so the dashboard can distinguish
   -- "pre-migration row, didn't capture" from "primary succeeded / cache miss".

   create index if not exists idx_ai_usage_logs_feature_key
     on public.ai_usage_logs (feature_key, created_at desc);
   create index if not exists idx_ai_usage_logs_provider_used
     on public.ai_usage_logs (provider_used, created_at desc);

   create table if not exists public.ai_cache (
     id          uuid primary key default gen_random_uuid(),
     feature_key text        not null,
     input_hash  text        not null,
     response    jsonb       not null,
     model_used  text        not null,
     provider_used text      not null,
     hit_count   integer     not null default 0,
     created_at  timestamptz not null default now(),
     expires_at  timestamptz not null,
     unique (feature_key, input_hash)
   );
   alter table public.ai_cache enable row level security;
   -- Service role only: no anon/authenticated grants needed.

   create index if not exists idx_ai_cache_lookup on public.ai_cache (feature_key, input_hash);
   create index if not exists idx_ai_cache_expiry on public.ai_cache (expires_at);

   create table if not exists public.ai_provider_status (
     provider            text not null,
     model               text not null,                                -- model-level so limit gauges in 08 can be accurate
     usage_date          date not null default current_date,
     daily_request_count integer not null default 0,
     daily_token_count   bigint  not null default 0,
     last_429_at         timestamptz,
     last_5xx_at         timestamptz,
     updated_at          timestamptz not null default now(),
     primary key (provider, model, usage_date)
   );
   alter table public.ai_provider_status enable row level security;
   ```

   The `(provider, model, usage_date)` PK matches how 03 declares free-tier limits (per model, not per provider). The dashboard's "limit gauges" in section 08 sum across `usage_date = current_date` for accuracy.
2. Add a small Postgres scheduled job (pg_cron or external) to delete expired `ai_cache` rows nightly.

### Verification

- Migration runs cleanly on dev.
- All existing `ai_usage_logs` rows still readable; new columns are NULL.
- `select pg_get_indexdef(...)` confirms indexes exist.

### Risk

- Low. All additive. No column removals, no type changes.

### Rollback

- Reverse migration drops the new columns/tables. Existing inserts stop populating new columns gracefully (they're nullable).

---

## Phase 3 — Extend `aiClient.ts` (new entry points; existing `callAI()` unchanged)

**Goal:** add `callAIForFeature()` and `callAIForFeatureStream()` alongside the existing `callAI()`. Add managed-Gemini provider branch — **gated off by default** so it doesn't change behavior of unmigrated functions.

### Tasks

1. Add managed-Gemini branch to the existing routing priority. Reads `GEMINI_API_KEY`, falls back to OpenRouter/Groq exactly like today's managed pair.
   - **Behavior gate:** new managed-Gemini path is *only* used by `callAIForFeature()` (consulting `aiRouting.ts`). The legacy `callAI()` keeps its existing priority order **unchanged** — it does not pick up managed Gemini just because the key is set. This guarantees Phase 3 has zero behavior impact on the 30 unmigrated functions; managed Gemini only "turns on" feature-by-feature in Phase 4 as functions are migrated to `callAIForFeature()`.
2. Implement `callAIForFeature(opts)`:
   - Resolves route via `resolveRoute(featureKey)`.
   - Iterates primary → fallbacks; on each attempt, captures latency, tokens, error type.
   - Writes one row to `ai_usage_logs` per call (success or terminal failure), filling the new columns.
   - Increments `ai_provider_status` counters atomically.
   - Throws `createAIError('all_providers_unavailable', ...)` when chain is exhausted.
3. Implement `callAIForFeatureStream(opts)`:
   - Same as above but returns a `ReadableStream<Uint8Array>` with `text/event-stream` SSE frames.
   - On fallback, the stream re-starts from the new provider (we send a `event: provider-change` SSE marker so the front-end can clear partial tokens). See `06-streaming-design.md`.
4. Add cache lookup/put helpers `cacheLookup()`, `cachePut()` (used only when `route.cache.enabled`).
5. Unit-test the new paths with mocked `fetch`.

### Verification

- `npx tsc --noEmit` clean.
- Existing `callAI()` callers unaffected (snapshot tests).
- New paths covered by mocked-provider tests for: success, primary 429 → fallback success, all-fail.

### Risk

- Medium. The shared client is hot path. Mitigation: new entry points are *separate functions*; the existing `callAI()` is not modified beyond a thin extraction of the Gemini branch.

### Rollback

- Revert the additions; managed Gemini reverts to legacy-fallback-only as before.

---

## Phase 4 — Migrate edge functions one at a time

**Goal:** move existing edge functions from `callAI({ model: '...' })` to `callAIForFeature({ featureKey: '...' })`. **One PR per function or small group.**

### Order (lowest risk first)

1. `enhance-section` (test on a single section first via feature-flag).
2. `parse-resume`, `parse-linkedin`, `parse-job-text`, `parse-job-url` (parsing batch).
3. `tailor-resume`, `tailor-section` (tailoring batch).
4. `generate-cover-letter`, `generate-resignation-letter`.
5. Interview / career batch (`generate-question-bank`, `interview-chat`, `company-briefing`, `career-*`).
6. Chat batch (`agentic-chat`, `wise-ai-chat`).
7. WiseHire batch.
8. Long-tail (`one-page-optimizer`, `optimize-for-linkedin`, `detect-and-humanize`, `recruiter-simulation`, `suggest-template`, `fill-gap`, `explain-gap`, `generate-portfolio-bio`).

### For each function

- Replace the `callAI(...)` call with `callAIForFeature({ featureKey: '<from map>', messages, userId })`.
- Remove any local model-string constants — they live in `aiRouting.ts` now.
- Keep the function's request/response shape identical.
- Manual smoke test in dev.

### Verification

- After each batch: run a quick happy-path test of every function in the batch.
- Dashboard (Phase 6) shows the new `provider_used` / `model_used` rows being written.

### Risk

- Per-function risk is small because we migrate incrementally and the new path is well-tested by Phase 3.

### Rollback

- Per-function git revert. Other migrated functions keep working.

---

## Phase 5 — Streaming for chat & long-generation features

**Goal:** wire the front-end to consume SSE for the features marked `streaming: true` in the map.

### Tasks

1. For each streaming feature, change the edge function to return a `text/event-stream` response when the request includes `Accept: text/event-stream`.
2. Front-end:
   - Add a small `useAIStream(featureKey, payload)` hook in `src/hooks/` that opens a fetch + ReadableStream and yields token deltas.
   - Migrate the chat hooks (`useAgenticChat`, `useChatHistory`) and the cover letter / tailoring hooks first.
3. Backwards compat: features without `Accept: text/event-stream` still get the one-shot JSON response.

### Verification

- Streaming features show progressive token rendering in the UI.
- Non-streaming features still work unchanged.
- Cancellation: closing the stream from the client terminates the upstream provider call (AbortController plumbed through).

### Risk

- Streaming + fallback is the trickiest part. Mitigation: the SSE protocol explicitly supports a `event: provider-change` marker and the front-end clears the buffer when it sees one. Detailed in `06-streaming-design.md`.

### Rollback

- Front-end stops sending `Accept: text/event-stream`; edge functions fall back to one-shot JSON.

---

## Phase 6 — Admin "AI Activity" dashboard

**Goal:** new tab in DevKit showing per-provider/per-key/per-feature/per-token activity.

### Tasks

1. New migration adding SECURITY-DEFINER aggregation RPCs (locked to `service_role`):
   - `get_ai_activity_overview(p_start, p_end)` → totals by provider, by feature, fallback rate, cache hit rate.
   - `get_ai_provider_daily_usage(p_provider, p_start, p_end)` → daily call/token series for limit charting.
   - `get_ai_provider_limits()` → declared free-tier limits per provider/model from a config (matches `03-providers-and-models.md`).
   - `get_ai_top_features(p_start, p_end, p_limit)` → top features with token + latency + provider mix.
2. New edge function `admin-ai-activity` (DevKit-auth gated) that calls the RPCs and returns a payload similar in shape to `admin-analytics`.
3. New presentational components in `src/components/dev-kit/ai-activity/` — reuses existing `KpiCard`, `SectionCard`, `Sparkline`, `RankedList`, `Donut`, `EmptyState` from Task #19.
4. New tab in `src/pages/DevToolsPage.tsx` → "AI Activity".

Sections specified in `08-admin-dashboard-spec.md`.

### Verification

- Dashboard renders for an admin.
- Numbers match raw `ai_usage_logs` queries.
- Free-tier limit gauges correctly read from declared config.

### Risk

- Low — pattern is a copy of Task #19.

### Rollback

- Hide the tab. Migrations are additive.

---

## Phase 7 — Friendly user error UX

**Goal:** when the chain is fully exhausted, the user sees a helpful message — not a 500.

### Tasks

1. Standardize the error response from the edge functions: `{ error: 'AI temporarily unavailable', code: 'ai.all_providers_unavailable', retry_after_seconds: 1800 }` with HTTP 503.
2. Front-end: add an `AIBusyToast` component that renders the message from `09-decisions-log.md` ("Our AI is busy right now. Please try again in a few minutes.") with a "Retry" button.
3. Wire it through the existing toast system; map by error `code`.

### Verification

- Forced chain exhaustion (env var override) shows the friendly toast, not a generic error.

### Risk

- None.

### Rollback

- Front-end falls back to the generic toast.

---

## Phase 8 — Limit-aware soft routing (optional, post-launch)

**Goal:** when a provider's daily counter is >70% of its declared limit, deprioritize it for non-critical features for the rest of the day.

### Tasks

1. `resolveRoute()` reads `ai_provider_status` and re-orders the chain when a provider is in "warning" state.
2. Critical features (parsing, generation) still try the original primary; non-critical features (suggestions, autocomplete) skip straight to fallback.

### Verification

- Manually bumping a provider's `daily_request_count` to 71% of its declared limit shifts the route order as expected.

### Risk

- Low; it's a soft-routing layer on top of the existing chain.

---

## Acceptance criteria for the whole project

- [ ] All 30 existing edge functions migrated to `callAIForFeature` and still pass smoke tests.
- [ ] Gemini works as a managed provider in the auto-fallback chain.
- [ ] Streaming works for the features marked `streaming: true`.
- [ ] Cache layer reduces duplicate-input parse calls to 0 within TTL.
- [ ] DevKit "AI Activity" dashboard shows per-provider/per-key/per-feature/per-token activity, free-tier limit gauges, fallback activations, and cache hit rate, all with date-range filtering matching the existing Analytics tab.
- [ ] Friendly error toast shows when all providers fail.
- [ ] Provider terms of service compliance verified — no multi-account, no key rotation, no scraping (see `09-decisions-log.md`).
- [ ] `replit.md` updated with the new architecture and operational notes.
- [ ] This folder updated with any deviations from the plan.

---

## What we are NOT doing in this project

To keep scope tight:

- No new BYOK providers added.
- No paid-tier code paths (works on free tier; paid is a billing toggle later).
- No semantic-search / vector-store features (embeddings catalog is in place but not consumed yet).
- No cost dashboards in $$$ (only token counts).
- No client-side AI calls.
- No multi-account / key-rotation behavior (forbidden — see `09-decisions-log.md`).
