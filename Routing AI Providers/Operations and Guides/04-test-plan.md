# 04 — Test Plan

> **Audience:** Engineer or AI agent. The "What you'll see" callouts are written for the non-technical reader so you can follow along and confirm things are working.
>
> **Purpose:** Concrete, runnable smoke tests for each phase of `../05-implementation-plan.md`. Each test states the input, the action, the expected output, and how to verify in the dashboard.
>
> **Testing philosophy:** We're not aiming for unit-test coverage here — that's a separate effort. This doc is the **manual smoke-test sheet** that gets walked through after each phase deploy. Catches "did we wire it up correctly?" issues fast.
>
> **Prerequisites for every test:** the three keys from doc 01 (`GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`) are set in Replit Secrets, and the workflow `Start application` is running.

---

## Test category index

- **T0.** Pre-flight (after Phase 0)
- **T1.** Routing config validator (after Phase 1)
- **T2.** Schema additions (after Phase 2)
- **T3.** Managed Gemini in `aiClient.ts` (after Phase 3)
- **T4.** Per-function migration (after each migration in Phase 4) — also covers caching, since caching is delivered as part of the per-function migration when `cache.enabled = true`
- **T5.** Streaming end-to-end (after Phase 5)
- **T6.** Dashboard accuracy (after Phase 6)
- **T7.** Friendly error UX (after Phase 7)
- **T8.** Limit-aware soft routing (after Phase 8 — **optional, post-launch** per `../05-implementation-plan.md`)

---

## T0 — Pre-flight: keys are valid

**Goal:** Confirm each of the three managed providers responds successfully to a one-line test prompt with the configured key.

### T0.1 Gemini

**Run** (from a Deno/edge-function shell):

```ts
const r = await fetch(
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': Deno.env.get('GEMINI_API_KEY')!,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'Reply with the single word: ok' }] }],
    }),
  },
);
console.log(r.status, (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text);
```

**Expected:** `200 ok` (status 200, response text "ok").

### T0.2 Groq

```ts
const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')!}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
    max_tokens: 5,
  }),
});
console.log(r.status, (await r.json()).choices?.[0]?.message?.content);
```

**Expected:** `200 ok`.

### T0.3 OpenRouter

```ts
const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')!}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'deepseek/deepseek-chat-v3.1:free',
    messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
    max_tokens: 5,
  }),
});
console.log(r.status, (await r.json()).choices?.[0]?.message?.content);
```

**Expected:** `200 ok`.

> **What you'll see (non-technical):** Three quick "ok" responses in the console, one per provider. If any returns a 401/403, that key is wrong — re-paste it from the provider's dashboard.

---

## T1 — Routing config validator catches misconfiguration

**Goal:** Prove that the boot-time validator in `aiRouting.ts` blocks bad configs.

### T1.1 — Missing fallback

Temporarily edit a feature route in `aiRouting.ts`:

```ts
'resume.parse': {
  primary:  { provider: 'gemini', model: MODELS.gemini.flash },
  fallbacks: [],   // ← intentionally empty
  // ...
},
```

**Expected:** Edge function deploy/cold-start fails with `RoutingValidationError: 'resume.parse' has no fallback (≥1 required)`.

**Cleanup:** revert the change.

### T1.2 — Unknown model slug

```ts
primary:  { provider: 'gemini', model: 'gemini-99-superpro' },
```

**Expected:** `RoutingValidationError: unknown model 'gemini-99-superpro' on provider 'gemini'`.

### T1.3 — Streaming + caching mutual exclusion

```ts
streaming: true,
cache: { enabled: true, /* ... */ },
```

**Expected:** `RoutingValidationError: streaming and caching cannot both be enabled for 'feature.x'`.

### T1.4 — BYOK-only feature accidentally added to map

Add a `'chat.portfolio_visitor'` entry. **Expected:** `RoutingValidationError: 'chat.portfolio_visitor' is BYOK-only and must not appear in FEATURE_ROUTES`.

> **What you'll see:** Workflow logs show the exact validator error message and the function refuses to serve. This is intentional — better to fail fast at boot than silently misroute.

---

## T2 — Schema additions

**Goal:** Confirm the new columns/tables from `../05-implementation-plan.md` Phase 2 exist and accept inserts.

### T2.1 — `ai_usage_logs` new columns

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'ai_usage_logs'
  AND column_name IN (
    'feature_key', 'provider_used', 'model_used',
    'prompt_tokens', 'completion_tokens', 'total_tokens',
    'latency_ms', 'fallback_depth', 'cache_hit', 'error_type'
  )
ORDER BY column_name;
```

**Expected:** All 10 rows present (column names exactly as in `../05-implementation-plan.md` Phase 2). `is_nullable = YES` and `column_default IS NULL` for `feature_key`, `provider_used`, `model_used`, `fallback_depth`, `cache_hit` (so old rows are correctly NULL — see `../08-admin-dashboard-spec.md` Accuracy section). **Note: there is no `status` column** — success is `error_type IS NULL`.

### T2.2 — `ai_provider_status` table

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'ai_provider_status'
ORDER BY ordinal_position;

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'ai_provider_status'::regclass AND contype = 'p';
```

**Expected:**
- Columns: `provider`, `model`, `usage_date`, `daily_request_count`, `daily_token_count`, `last_429_at`, `last_5xx_at`, `updated_at`.
- Primary key: `(provider, model, usage_date)` — verified per architect-fix in this session.

### T2.3 — `ai_cache` table

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'ai_cache'
ORDER BY ordinal_position;
```

**Expected columns** (per `../05-implementation-plan.md` Phase 2 lines 83–94): `id` (uuid PK), `feature_key` (text), `input_hash` (text), `response` (jsonb), `model_used` (text), `provider_used` (text), `hit_count` (integer), `created_at` (timestamptz), `expires_at` (timestamptz), plus a unique constraint `(feature_key, input_hash)`. **There are no `cache_scope_user_id` or `cache_scope_tenant_id` columns** — scope is encoded into `input_hash` per `../07-caching-design.md`.

### T2.4 — Insert smoke test

```sql
INSERT INTO ai_usage_logs (
  user_id, action_type, feature_key, provider_used, model_used,
  fallback_depth, cache_hit, prompt_tokens, completion_tokens, total_tokens,
  latency_ms, error_type, created_at
) VALUES (
  '00000000-0000-0000-0000-000000000000', 'test', 'resume.parse',
  'gemini', 'gemini-2.5-flash', 0, false, 100, 50, 150, 380, NULL, now()
);
```

**Expected:** 1 row inserted. Then delete it: `DELETE FROM ai_usage_logs WHERE action_type = 'test';`

---

## T3 — Managed Gemini path in `aiClient.ts`

**Goal:** Confirm `callAI()` (legacy) and `callAIForFeature()` (new) can route to managed Gemini.

### T3.1 — Direct call via the legacy API (for backwards compat sanity)

In a sandboxed edge function:

```ts
const r = await callAI({
  messages: [{ role: 'user', content: 'Reply with the single word: ok' }],
  model: 'gemini-2.5-flash',
  provider: 'gemini',         // explicit
  userId: '<a real user uuid>',
  maxTokens: 5,
});
console.log(r.content, r.providerUsed, r.modelUsed);
```

**Expected:** `ok gemini gemini-2.5-flash`.

### T3.2 — Auto-fallback when Gemini fails

Mock Gemini to return 503 (e.g. by temporarily setting `GEMINI_API_KEY` to a bogus value), then:

```ts
const r = await callAIForFeature({
  featureKey: 'resume.parse',     // primary is gemini.flash
  messages: [/* ... */],
  userId: '<uuid>',
});
console.log(r.providerUsed, r.fallbackDepth);
```

**Expected:** `openrouter 1` (first fallback per `../04-feature-routing-map.md`).

**Cleanup:** restore the real `GEMINI_API_KEY`.

### T3.3 — Verify `ai_usage_logs` row

After T3.2 runs, query:

```sql
SELECT feature_key, provider_used, fallback_depth, error_type
FROM ai_usage_logs
WHERE feature_key = 'resume.parse'
ORDER BY created_at DESC LIMIT 1;
```

**Expected:** `resume.parse | openrouter | 1 | NULL` (success = `error_type IS NULL`).

> **What you'll see (non-technical):** When you make Gemini "broken" on purpose, the system automatically uses OpenRouter instead — and the dashboard shows that this happened. That's the safety net working.

---

## T4 — Per-function migration smoke test (template)

**Goal:** For each migrated function, verify (a) it still works, (b) the dashboard shows the expected primary provider.

### Template (run for every function in doc 03)

1. **Trigger the function from the front-end** the way a user would (e.g. for `parse-resume`: upload a PDF in the resume builder).
2. **Verify the response** looks correct (parsed JSON, valid bullet, etc. — feature-specific).
3. **Open the dashboard.** Within 60 s, the **Provider mix** chart should show one new call on the expected primary provider for this feature (per `../04-feature-routing-map.md`).
4. **Query the log:**

   ```sql
   SELECT feature_key, provider_used, model_used, fallback_depth, cache_hit,
          prompt_tokens, completion_tokens, total_tokens, latency_ms, error_type
   FROM ai_usage_logs
   WHERE feature_key = '<the feature key>'
   ORDER BY created_at DESC LIMIT 1;
   ```

5. **Expected:** `provider_used` = primary, `fallback_depth` = 0, `error_type IS NULL`, `prompt_tokens` and `completion_tokens` are non-NULL and >0.

### Force-failover variant

After step 5, repeat steps 1–4 with the primary provider key temporarily set to a bogus value. **Expected:** `provider_used` = first fallback, `fallback_depth` = 1.

---

## T8 — Limit-aware soft routing (Phase 8, optional)

> **Phase mapping note:** auto-throttle / soft-routing is **Phase 8 (optional, post-launch)** per `../05-implementation-plan.md`. Run this section only if Phase 8 has been deployed. Earlier phases do not include automatic re-ordering on gauge color.

**Goal:** Confirm that when a provider crosses 90% of its declared daily limit, the router begins preferring fallbacks for non-critical features.

### Setup

In a test environment, temporarily set the declared limit for one provider to a tiny number (e.g. `gemini.flash` RPD = 5) in `aiRouting.ts`:

```ts
export const PROVIDER_LIMITS = {
  // ...
  gemini: { 'gemini-2.5-flash': { rpd: 5, tpd: 10_000 } },
  // ...
};
```

### Steps

1. Make 5 successful calls to a `gemini.flash`-primary feature (e.g. `resume.parse`).
2. Verify the dashboard's gauge for `gemini.flash` reads 5/5 (red).
3. Make a 6th call.
4. **Expected:** The 6th call's `provider_used` is the first fallback (`openrouter`), even though Gemini wouldn't have actually returned 429 yet (the router checks the gauge before calling).

### Cleanup

Restore the real `PROVIDER_LIMITS` values from `../03-providers-and-models.md`.

> **What you'll see (non-technical):** The system stops calling a provider before it actually hits the cap, so users never see an error — they just get answered by a different provider.

---

## T5 — Streaming end-to-end (Phase 5)

**Goal:** Verify the SSE path works for one streaming feature, and that the dashboard correctly logs the call after stream completion.

### T5.1 — Happy path

1. From the front-end, trigger a streaming feature (e.g. `bullet.rewrite` via the resume editor's "improve this bullet" action).
2. **Expected:** Tokens render in the UI incrementally (not all-at-once at the end).
3. After the stream completes, query:

   ```sql
   SELECT feature_key, provider_used, prompt_tokens, completion_tokens, latency_ms, error_type
   FROM ai_usage_logs WHERE feature_key = 'bullet.rewrite'
   ORDER BY created_at DESC LIMIT 1;
   ```

4. **Expected:** `error_type IS NULL` (success), `completion_tokens` > 0 (counted from the streamed deltas; see `../06-streaming-design.md`).

### T5.2 — Mid-stream provider failure

Trickier to reproduce. In a test env, mock the Groq SSE endpoint to return a 503 after sending 2 deltas. **Expected per `../06-streaming-design.md`:** the partial output is discarded, the request is re-issued against the first fallback, and the user sees a clean stream from the fallback (no garbled mix). Log row shows `provider_used = <fallback>`, `fallback_depth = 1`.

### T5.3 — Client disconnect

User closes the tab mid-stream. **Expected:** Edge function detects the disconnect (Deno's `req.signal.aborted`), aborts the upstream provider call, writes a log row with `error_type = 'aborted'`. No quota wasted on tokens the user didn't see.

---

## T4-cache — Caching end-to-end (covered as part of Phase 4 per-function migration)

**Goal:** Same input → cache hit on second call. Different scope → no false hit. (Caching ships as part of each cacheable function's Phase 4 migration; there is no separate "Phase 7 caching" — Phase 7 in the parent plan is "Friendly user error UX". See `../05-implementation-plan.md`.)

### T4-cache.1 — Cache hit (per-user scope)

1. Call `resume.parse` with file F1, user U1. Note the response and `created_at`.
2. Within the TTL (24 h), call `resume.parse` with **the same file F1**, **the same user U1** (per-user scope per `../07-caching-design.md` line 27).
3. **Expected:** Second response is byte-identical to the first.
4. Query:

   ```sql
   SELECT user_id, feature_key, cache_hit, provider_used, latency_ms
   FROM ai_usage_logs WHERE feature_key = 'resume.parse'
   ORDER BY created_at DESC LIMIT 2;
   ```

5. **Expected:** Newer row has `cache_hit = true`, `provider_used = NULL` (no provider called), `latency_ms` < 50 (just a DB lookup).

### T4-cache.2 — Per-user scope isolation

Two **different** users uploading the **same** file to `resume.parse` → **separate** `ai_cache` rows; second user's call is a **miss** that triggers a fresh provider call. This is the correctness guarantee from `../07-caching-design.md` line 39 (PII never crosses users).

### T4-cache.3 — Cross-user scope (the only two cross-user features)

For `job.parse_url` (cross-user per `../07-caching-design.md` line 30): two **different** users hitting the **same canonical URL** → second call is a `cache_hit = true`. Same for `interview.company_briefing` keyed on company name.

### T4-cache.4 — Per-tenant scope isolation

For `wisehire.bulk_screen`, two recruiters in **org A** sharing a CV+JD pair → cache hit on the second call. A recruiter in **org B** with the same pair → cache **miss** (separate tenant scope).

### T4-cache.5 — TTL expiry

Set a 1-second TTL in the test env, call once, wait 2 s, call again. **Expected:** Second call is a miss; the expired row is either ignored by the lookup query (TTL filter on `expires_at > NOW()`) or has been swept by the nightly cron (runbook E.3).

### T4-cache.6 — BYOK bypass

For a user with a working BYOK key on the relevant provider, calls **never** hit the cache. **Expected:** No `ai_cache` row written; `cache_hit = false` always.

---

## T6 — Dashboard accuracy (Phase 6)

**Goal:** Every KPI on the DevKit "AI Activity" tab equals an exact `count(*) / sum(...) / avg(...)` over `ai_usage_logs`.

### T6.1 — Provider mix matches raw count

In the dashboard, note the percentages in the **Provider mix** chart for "today".

```sql
SELECT provider_used, count(*),
       round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct
FROM ai_usage_logs
WHERE created_at::date = current_date
  AND feature_key IS NOT NULL
GROUP BY provider_used;
```

**Expected:** Percentages match the dashboard exactly.

### T6.2 — Fallback rate excludes pre-migration rows

```sql
SELECT
  count(*) FILTER (WHERE fallback_depth IS NOT NULL AND fallback_depth > 0)::float
  / NULLIF(count(*) FILTER (WHERE fallback_depth IS NOT NULL), 0) AS fallback_rate,
  count(*) FILTER (WHERE feature_key IS NULL) AS pre_migration_excluded
FROM ai_usage_logs
WHERE created_at::date = current_date;
```

**Expected:** `fallback_rate` matches the dashboard's number; `pre_migration_excluded` matches the footnote's "(N pre-migration calls excluded)" count.

### T6.3 — Cache hit rate counts only cacheable features

For each `feature_key` listed as cacheable in `../04-feature-routing-map.md`:

```sql
SELECT feature_key,
       count(*) FILTER (WHERE cache_hit = true)::float
       / NULLIF(count(*), 0) AS hit_rate
FROM ai_usage_logs
WHERE created_at::date = current_date
  AND feature_key IN (/* the cacheable keys */)
GROUP BY feature_key;
```

**Expected:** Per-feature hit rates appear and are non-zero (after warmup).

### T6.4 — Free-tier gauges read live data + declared limits

For one provider+model:

```sql
SELECT daily_request_count, daily_token_count
FROM ai_provider_status
WHERE provider = 'gemini' AND model = 'gemini-2.5-flash'
  AND usage_date = current_date;
```

**Expected:** `daily_request_count` matches the gauge's "X / Y RPD" numerator; the denominator (Y) matches the declared limit in `aiRouting.ts`'s `PROVIDER_LIMITS` for that model, which mirrors `../03-providers-and-models.md`.

> **What you'll see (non-technical):** Every number on the dashboard can be backed up by a database query that gives the same number. There are no estimates or rounded-off projections.

---

## T7 — Friendly error UX (Phase 7)

**Goal:** When all providers in a chain fail, the user sees the friendly toast/banner specified in decision D10 of `../09-decisions-log.md` ("Our AI is busy right now. Please try again in a few minutes.") and not a raw 502/500.

### Steps

1. In a test environment, set all three managed-provider keys to bogus values (or set `PROVIDER_HEALTH_OVERRIDE` to mark all three `'down'` per runbook B in doc 02).
2. Trigger any feature from the front-end.
3. **Expected:** Edge function returns HTTP 503 with body `{ "code": "ai.all_providers_unavailable", "retry_after_seconds": 1800 }`.
4. **Expected:** Front-end displays the friendly toast (no raw error text).
5. Query:

   ```sql
   SELECT feature_key, error_type FROM ai_usage_logs
   WHERE created_at >= now() - interval '1 minute'
   ORDER BY created_at DESC LIMIT 1;
   ```

6. **Expected:** `error_type` is `'all_providers_exhausted'` (or the equivalent string adopted in Phase 7).

> **What you'll see (non-technical):** Even when all three AI services are down at the same time, the user sees a calm "try again in a few minutes" message — not a scary error code.

---

## When to re-run this whole sheet

- After every phase deploy.
- Before launch.
- After any change to `aiRouting.ts` that affects more than one feature.
- After enabling billing on a provider (to confirm the new limits flowed through).
- After a runbook intervention (rotation, kill-switch, cache purge) — verify the system is back in a known-good state.
