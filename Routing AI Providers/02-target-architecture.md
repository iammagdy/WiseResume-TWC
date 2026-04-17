# 02 — Target Architecture

> **Purpose:** Describe what the system looks like *after* this work is done. Read `01-current-state.md` first.

---

## One-line target

> *Every AI feature in WiseResume calls a single shared client that picks the right provider and model based on a central config, falls back automatically across three managed providers, optionally streams the response, optionally serves from cache, deducts credits atomically, logs token-level activity, and surfaces all of it in a DevKit dashboard — without any AI feature needing to know which provider answered it.*

---

## High-level diagram

```
                      ┌─────────────────────────────────────────────┐
   FRONT-END          │  React app                                   │
   (browser /         │   ├─ feature hooks (useAIEnhance, etc.)      │
    Capacitor)        │   └─ supabase.functions.invoke(<edge fn>)    │
                      └────────────────────┬────────────────────────┘
                                           │ HTTPS + Bearer JWT
                                           ▼
                      ┌─────────────────────────────────────────────┐
   EDGE FUNCTIONS     │  ~30 feature edge fns (parse-resume,         │
   (Deno on Supabase) │   enhance-section, generate-cover-letter,    │
                      │   …) — UNCHANGED API surface.                │
                      │                                              │
                      │   each calls:                                │
                      │     callAI({ featureKey, messages, ... })    │
                      └────────────────────┬────────────────────────┘
                                           │
                                           ▼
                      ┌─────────────────────────────────────────────┐
   SHARED CLIENT      │  _shared/aiClient.ts (extended)              │
   (the brain)        │                                              │
                      │  1. checkAndDeductCredit (existing)          │
                      │  2. cacheLookup(featureKey, inputHash)       │
                      │     ── HIT  → return cached response         │
                      │     ── MISS → continue                       │
                      │  3. resolveRoute(featureKey)                 │
                      │     reads aiRouting.ts → primary + fallbacks │
                      │  4. for each provider in chain:              │
                      │       try call (one-shot OR stream)          │
                      │       on 429/5xx/timeout → next              │
                      │  5. logToUsageLogs({                         │
                      │       featureKey, provider, model,           │
                      │       prompt_tokens, completion_tokens,      │
                      │       latency_ms, cache_hit, fallback_depth, │
                      │       error?                                 │
                      │     })                                       │
                      │  6. cachePut(...) if eligible                │
                      │  7. return response                          │
                      └────────────────────┬────────────────────────┘
                                           │
            ┌──────────────────────────────┼──────────────────────────────┐
            ▼                              ▼                              ▼
     ┌─────────────┐               ┌─────────────┐               ┌─────────────┐
     │ OpenRouter  │               │    Groq     │               │   Gemini    │
     │ (managed +  │               │ (managed +  │               │ (managed +  │
     │   BYOK)     │               │   BYOK)     │               │   BYOK)     │
     └─────────────┘               └─────────────┘               └─────────────┘

                      ┌─────────────────────────────────────────────┐
   PERSISTENCE        │  Supabase Postgres                           │
                      │   ├─ ai_credits         (existing)           │
                      │   ├─ ai_usage_logs      (extended schema)    │
                      │   ├─ ai_cache           (NEW)                │
                      │   ├─ usage_events       (existing)           │
                      │   ├─ user_api_keys      (existing — BYOK)    │
                      │   └─ app_settings       (extended keys)      │
                      └─────────────────────────────────────────────┘

                      ┌─────────────────────────────────────────────┐
   ADMIN              │  DevKit → AI Activity tab (NEW)              │
                      │   ├─ Per-provider usage today vs limit       │
                      │   ├─ Per-feature provider mix                │
                      │   ├─ Token consumption charts                │
                      │   ├─ Fallback activations / failure rate     │
                      │   ├─ Cache hit rate                          │
                      │   └─ Per-key health (managed keys)           │
                      └─────────────────────────────────────────────┘
```

---

## Core components, in plain language

### 1. The routing config (`_shared/aiRouting.ts`) — NEW

A single TypeScript module exporting:

- **`PROVIDERS`** — catalog of provider definitions (base URL, env-var name, request format, supports streaming, etc.).
- **`MODELS`** — catalog of model definitions per provider (model ID, context window, supports vision, supports tools, suggested-for hints).
- **`FEATURE_ROUTES`** — the `featureKey → { primary, fallbacks[], streaming, cacheable, creditCost }` map. (See `04-feature-routing-map.md` for the full table.)
- Helper: **`resolveRoute(featureKey)`** that returns the resolved chain at runtime, applying any admin overrides from `app_settings`.

This file is **the only place** model names appear. Edge functions never hardcode a model.

### 2. The extended shared client (`_shared/aiClient.ts`)

Today's `callAI()` keeps working unchanged. Two new entry points are added:

- **`callAIForFeature({ featureKey, messages, userId, ... })`** — the new "smart" path. Uses the routing config, supports cache lookup, supports streaming, writes rich `ai_usage_logs` rows.
- **`callAIForFeatureStream({ featureKey, messages, userId, ... })`** — same as above but yields a `ReadableStream` of token deltas using Server-Sent Events.

Edge functions are migrated from `callAI(...)` to `callAIForFeature(...)` **one at a time** in a later phase. Until migrated, they keep working as today.

### 3. Gemini as a managed provider

A new branch in `aiClient.ts` calls Gemini with the platform's `GEMINI_API_KEY` (no longer "legacy"). Gemini becomes a peer of OpenRouter and Groq in the managed chain. The existing BYOK Gemini path is unchanged.

### 4. The cache layer

A new table `ai_cache` (schema in `07-caching-design.md`) keyed by `(feature_key, input_hash)` with response payload + TTL. Only opted-in features (parsing, embeddings, suggestions) cache. Generative/personalized features do not.

### 5. Streaming

For features marked `streaming: true` in the routing config, the edge function returns a `text/event-stream` response. The front-end consumes it via `EventSource`/`fetch + ReadableStream`. Not all providers support streaming the same way; see `06-streaming-design.md`.

### 6. Token-level logging

`ai_usage_logs` gets new columns (additively, no rewrites of existing rows):

- `feature_key text`
- `provider_used text` (`'openrouter' | 'groq' | 'gemini' | 'gemini_byok' | …`)
- `model_used text`
- `prompt_tokens int`
- `completion_tokens int`
- `total_tokens int`
- `latency_ms int`
- `fallback_depth int` (0 = primary succeeded, 1 = first fallback, …)
- `cache_hit bool`
- `error_type text \| null`

`metadata` jsonb stays for free-form context.

### 7. The admin dashboard

A new tab in DevKit, **AI Activity**, fed by new SECURITY-DEFINER RPCs (locked to `service_role`, called only by an admin-gated edge function). Sections specified in `08-admin-dashboard-spec.md`.

### 8. Friendly error UX

When the entire fallback chain fails, the edge function returns a structured 503 with a stable `code` (`"ai.all_providers_unavailable"`). The front-end maps that code to a friendly toast: *"Our AI is busy right now. Please try again in a few minutes."* (Exact copy in `09-decisions-log.md`.)

---

## Sequence: a single AI feature call (post-implementation)

```
User clicks "Improve this bullet"
    │
    ▼
useAIEnhance hook → supabase.functions.invoke('enhance-section', { ... })
    │
    ▼
enhance-section/index.ts
    │
    ├─ requireAuth(req)                    → userId
    ├─ checkPayloadSize(req, 50 KB)
    ├─ checkRateLimit(userId, 'pro_or_free')
    ├─ checkAndDeductCredit(userId, cost)  → credit charged atomically
    │
    ▼
callAIForFeature({ featureKey: 'bullet.rewrite', messages, userId })
    │
    ├─ cacheLookup('bullet.rewrite', sha256(messages))
    │      → MISS  (rewriting is not cached; see 07-caching-design.md)
    │
    ├─ resolveRoute('bullet.rewrite')
    │      → primary:   groq · llama-3.3-70b-versatile
    │        fallbacks: [openrouter · deepseek/deepseek-chat-v3.1:free,
    │                    gemini · gemini-2.5-flash]
    │
    ├─ try Groq
    │      ✓ 200 OK in 380ms, 412 prompt + 180 completion tokens
    │
    ├─ logToUsageLogs({
    │       feature_key:'bullet.rewrite', provider_used:'groq',
    │       model_used:'llama-3.3-70b-versatile',
    │       prompt_tokens:412, completion_tokens:180,
    │       latency_ms:380, fallback_depth:0, cache_hit:false
    │     })
    │
    └─ return AIResponse to enhance-section
                                 │
                                 ▼
                      JSON response → front-end → UI updates
```

If Groq had returned 429:

```
    ├─ try Groq                  ✗ 429
    ├─ try OpenRouter DeepSeek   ✓ 200 OK (logged with fallback_depth=1)
```

If all three failed:

```
    ├─ try Groq                  ✗ 429
    ├─ try OpenRouter            ✗ 503
    ├─ try Gemini                ✗ 429
    └─ throw createAIError('all_providers_unavailable',
                           'AI is busy right now…', 503)
                                 │
                                 ▼
              edge fn → 503 with code='ai.all_providers_unavailable'
                                 │
                                 ▼
              front-end → friendly toast + "Try again" button
```

---

## What this architecture buys us

- **Capacity:** spreading load across 3 free tiers ≈ 3× headroom.
- **Reliability:** any single provider can go fully down without a user-visible outage.
- **Quality per feature:** picking the right model per use case (Gemini's vision for parsing, Groq's speed for chat, OpenRouter's catalog for premium reasoning).
- **Observability:** the dashboard answers "what's our actual provider mix today, and are we close to any limit?" without guessing.
- **Cheap experimentation:** swap a model = edit one line in `aiRouting.ts`. No edge function changes, no redeploy of every function.
- **Forward compatibility:** when paid tiers are enabled later, billing flips on per provider with zero feature-code changes.

---

## What this architecture explicitly does *not* do

- It does not replace BYOK. BYOK still bypasses managed routing entirely (strict mode).
- It does not change per-user daily credit limits.
- It does not introduce client-side AI calls — every call still goes through an edge function.
- It does not assume any specific paid tier. Free tier is fully sufficient for the v1 launch.
- It does not enable any multi-account or key-rotation behavior. One managed key per provider per environment.
