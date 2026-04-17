# 07 — Caching Design

> **Purpose:** Specify the cache layer — what gets cached, how the key is derived, when it expires, when it's invalidated, and how it's safe.

---

## Why we cache

Three reasons:

1. **Cost (free-tier headroom):** every cache hit is a request we don't spend against a provider's daily limit.
2. **Latency:** a cache hit returns in ~50 ms vs ~1–10 s for an LLM call.
3. **Determinism:** the same input deserves the same output. Re-parsing the same uploaded PDF and getting subtly different JSON each time is its own bug.

We **only** cache features where (1) the input determines the output and (2) the user benefits from consistency. Generative or personalized features are never cached.

---

## What gets cached (and what doesn't)

Per `04-feature-routing-map.md`. Recap:

**Cacheable features:**

| Feature key | TTL | Scope | Key parts |
|---|---|---|---|
| `resume.parse` | 24 h | **per-user** | `[user_id, fileSha256]` |
| `linkedin.parse` | 24 h | **per-user** | `[user_id, fileSha256]` |
| `job.parse_text` | 7 d | **per-user** | `[user_id, textSha256]` |
| `job.parse_url` | 7 d | cross-user | `[urlNormalized]` |
| `interview.question_bank` | 24 h | **per-user** | `[user_id, jdSha256, role, level]` |
| `interview.company_briefing` | 7 d | cross-user | `[companyNameNormalized]` |
| `resume.suggest_template` | 24 h | **per-user** | `[user_id, resumeSha256]` |
| `wisehire.bulk_screen` | 24 h | **per-tenant** | `[tenant_id, cvSha256, jdSha256]` |
| `wisehire.mask_cvs` | forever (no TTL) | **per-tenant** | `[tenant_id, cvSha256]` |

**Scope rules (this is a hard rule, not a guideline):**

- **per-user / per-tenant** — for any feature whose input contains PII (a resume, a CV, a private JD pasted by the user, the user's profile context). The user/tenant ID is part of the cache key, so a cache hit is only possible when the *same* user re-submits the *same* input. Cross-user collisions are impossible.
- **cross-user** — only for features whose input is genuinely public (a public URL, a public company name). No PII flows through.

If a feature's PII status is uncertain, default to **per-user**. Cross-tenant data sharing for `wisehire.*` features is forbidden by the recruiter product's privacy contract, so those are always **per-tenant**.

**Never cached:** every other feature. Cover letters, bullet rewrites, chat, tailoring, summary generation, recruiter sim, gap fills, gap explanations, career advisor, etc. — these are generative or personalized.

The route's `cache.enabled` boolean and `cache.ttlSeconds` come from `aiRouting.ts`. Edge functions never decide caching themselves.

---

## Schema

Defined in the Phase 2 migration (`05-implementation-plan.md`):

```sql
create table public.ai_cache (
  id              uuid primary key default gen_random_uuid(),
  feature_key     text not null,
  input_hash      text not null,        -- sha256 hex string
  response        jsonb not null,       -- the full AIResponse payload
  model_used      text not null,        -- so we know which model produced this
  provider_used   text not null,
  hit_count       integer not null default 0,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  unique (feature_key, input_hash)
);

create index idx_ai_cache_lookup on public.ai_cache (feature_key, input_hash);
create index idx_ai_cache_expiry on public.ai_cache (expires_at);
```

RLS is enabled but **no policies are granted** to anon/authenticated. The cache is service-role only, accessed exclusively from edge functions via `getServiceClient()`.

---

## Key derivation

The `input_hash` is a SHA-256 hex digest of a **canonical JSON serialization** of the cache key parts.

```ts
async function deriveCacheKey(featureKey: string, keyParts: Record<string, unknown>): Promise<string> {
  // Canonical serialization: sorted keys, no whitespace.
  const canonical = JSON.stringify(keyParts, Object.keys(keyParts).sort());
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
```

The `keyParts` object varies per feature — defined in the route. Examples:

- `resume.parse` → `{ fileSha: '...' }` (computed by hashing the uploaded file bytes).
- `job.parse_url` → `{ urlNormalized: 'https://example.com/jobs/123' }` (normalized = lowercased host, no trailing slash, no UTM params).
- `wisehire.bulk_screen` → `{ cvSha: '...', jdSha: '...' }`.

**Important:** for **per-user** and **per-tenant** scoped features, the user/tenant ID is part of the cache key — cross-user collisions are impossible by construction. Only **cross-user** features (currently just `job.parse_url` and `interview.company_briefing`, both with public-shaped inputs containing no PII) share rows across users.

The cache **never** contains a generated cover letter, rewritten bullet, or anything personalized — those features are not in the cacheable list at all.

---

## Where the key parts come from

Cache **policy** lives in `aiRouting.ts` (which feature is cacheable, what its scope is, what TTL). Cache **values** (the actual file SHA, URL, company name) come from the edge function — only it has the raw input.

Therefore the new shared client signature is:

```ts
type FeatureCallOpts = {
  featureKey: FeatureKey;
  messages: AIMessage[];
  userId: string;
  tenantId?: string;                          // required for wisehire.* features
  cacheKeyParts?: Record<string, unknown>;    // required iff route.cache.enabled
  // ...
};
```

The edge function is responsible for computing/passing `cacheKeyParts` — for example, `parse-resume` passes `{ fileSha: sha256(fileBytes) }`. The shared client merges that with the route's scope token (`user_id` or `tenant_id`) to form the actual `input_hash`. If the edge function calls a cacheable feature without `cacheKeyParts`, the shared client throws a deterministic error at compile/runtime — silent skipping is forbidden.

This contract is checked by the Phase 1 unit tests: every entry with `cache.enabled` in `FEATURE_ROUTES` declares the expected `cacheKeyParts` shape; the test fails if a route enables cache without specifying its key shape.

## Lookup & put flow

Inside the new shared client:

```ts
async function callAIForFeature(opts) {
  const route = resolveRoute(opts.featureKey);

  // 1. Cache lookup
  if (route.cache.enabled) {
    if (!opts.cacheKeyParts) throw new Error(`Cacheable feature ${opts.featureKey} missing cacheKeyParts`);
    const scopedParts = applyScopeToken(route.cache.scope, opts, opts.cacheKeyParts);
    const inputHash = await deriveCacheKey(opts.featureKey, scopedParts);
    const cached = await cacheLookup(opts.featureKey, inputHash);
    if (cached) {
      await logToUsageLogs({ ...meta, cache_hit: true, latency_ms: Date.now() - t0 });
      await incrementCacheHitCount(cached.id);
      return cached.response;
    }
  }

  // 2. Provider chain (existing logic)
  const result = await tryProviderChain(route, opts);

  // 3. Cache put
  if (route.cache.enabled && result.ok) {
    await cachePut({
      featureKey: opts.featureKey,
      inputHash,
      response: result,
      modelUsed: result.modelUsed,
      providerUsed: result.providerUsed,
      expiresAt: new Date(Date.now() + route.cache.ttlSeconds * 1000),
    });
  }

  await logToUsageLogs({ ...meta, cache_hit: false });
  return result;
}
```

**Concurrency:** two simultaneous calls with the same key may both miss the cache and both call the provider. We accept this — adding distributed locking is overkill for v1 and the cost is "one wasted call." The `unique (feature_key, input_hash)` constraint ensures only one row is stored.

---

## Expiration & cleanup

- Each row has `expires_at`. `cacheLookup` filters `where expires_at > now()`.
- A nightly Postgres cron job deletes rows where `expires_at < now() - interval '7 days'` (keeps recently-expired rows around briefly for debugging).
- For features with `ttlSeconds: null` (e.g. `wisehire.mask_cvs`), `expires_at` is set to `'9999-12-31'` and the cron skips them.

---

## Invalidation

We invalidate cache rows in three cases:

1. **Schema changes in the parsed output.** When we change `parse-resume`'s output JSON shape (e.g. add a new field), we bump a `cache_version` constant in `aiRouting.ts` and include it in the key parts. Old cache entries are simply never matched again and expire naturally.
2. **User-requested re-parse.** The front-end can pass `bypassCache: true` in the request body; the edge function passes it to `callAIForFeature`, which skips lookup and overwrites on put.
3. **Operator manual purge.** A new admin RPC `purge_ai_cache(p_feature_key text)` deletes rows for a given feature. Surfaced in the DevKit AI Activity dashboard as a "Clear cache" button per feature.

---

## Privacy & security

- The cache contains only structured outputs of public-shaped inputs (PDFs the user uploads, URLs, company names, JDs). The user's resume content does eventually reach `ai_usage_logs` (via the `metadata` jsonb on some entries), but **not** the cache itself by design.
- A user uploading the same resume twice will hit the cache and get the same parsed JSON — but **another user** uploading **a different resume** never sees that data; the SHA-256 input hash makes accidental cross-user matches astronomically unlikely.
- Service role only. No client-side access. RLS is enabled but no policies grant access.
- BYOK calls **bypass the cache entirely** — both lookup and put are skipped when `userByokData` is set in the shared client. This guarantees BYOK quota is not "shared" via cache hits and that BYOK responses (which may go to a different model than the managed default) don't pollute the shared cache.

---

## Observability

- Every call writes `cache_hit: bool` to `ai_usage_logs`.
- The dashboard shows:
  - **Cache hit rate** overall and per cacheable feature.
  - **Hit count distribution** (top-N most-reused cache entries).
  - **Cache size** (rows + bytes).
  - **Estimated request savings** (`cache_hits × avg_provider_latency`).

---

## Trade-offs we're accepting

1. **Cache is shared across users.** Justified because we only cache structural output of public-shaped input. No PII leakage path exists.
2. **No invalidation on user data change.** A user editing their LinkedIn profile won't invalidate the parsed cache — but the file SHA changes when they re-export, so the next parse misses naturally.
3. **JSON serialization for keys is order-sensitive.** We canonicalize via `Object.keys(...).sort()` to avoid spurious misses.
4. **No per-feature size cap on cached responses.** If `parse-resume` ever returns a 1 MB JSON blob, it gets cached as-is. We monitor cache size; if it grows unreasonably, we add a size cap then.
