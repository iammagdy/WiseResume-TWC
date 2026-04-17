# 08 — Admin "AI Activity" Dashboard Spec

> **Purpose:** Define exactly what the new DevKit "AI Activity" tab looks like, what data it shows, and where each number comes from. The dashboard exists so the operator (you) can see, at a glance, how the AI layer is actually behaving — not how we hope it's behaving.

---

## Where it lives

- New tab in `src/pages/DevToolsPage.tsx`, in the same group as the existing "Analytics" tab from Task #19.
- Tab label: **AI Activity**.
- Backed by a new admin-gated edge function `admin-ai-activity` that calls SECURITY-DEFINER RPCs (locked to `service_role`, identical lockdown pattern to `admin-analytics`).
- Reuses the same presentational components introduced in Task #19: `KpiCard`, `SectionCard`, `Sparkline`, `RankedList`, `Donut`, `HeatmapDowHour`, `EmptyState`, `RangeSwitcher`.

---

## Time-range switcher

Same component as the Analytics tab. Options:

- **Today** (hourly bucket)
- **Last 7 days** (daily)
- **Last 30 days** (daily)
- **Last 90 days** (daily)
- **All time** (daily)

All KPIs and charts on this tab respect the selected range. Only the "Free-tier limit gauges" section is *always* today-scoped — limits are per-day so any other window is meaningless for that section.

---

## Sections (top to bottom)

### 1. KPI hero strip

| KPI | Value | Sub-label | Delta | Source |
|---|---|---|---|---|
| Total AI calls | sum(rows) in window | "across all features" | vs previous equal window | `count(*) from ai_usage_logs` |
| Total tokens | sum(`total_tokens`) | "prompt + completion" | vs prev | `sum(total_tokens)` |
| Avg latency | mean(`latency_ms`) | "first-token for streams" | vs prev | `avg(latency_ms)` |
| Fallback rate | `count(fallback_depth>0) / count(*)` × 100 | "primary missed" | vs prev | derived |
| Cache hit rate | `count(cache_hit=true) / count(*)` × 100 | "of cacheable calls" | vs prev | derived (only cacheable features in denom) |
| Error rate | `count(error_type is not null) / count(*)` × 100 | "terminal failures" | vs prev | derived |

### 2. Free-tier limit gauges (always today)

Three gauges, one per managed provider. For each:

- Daily call count vs declared limit (e.g. Groq: 380 / 1,000 RPD).
- Token count vs declared TPD where applicable.
- Color: green <70%, amber 70–90%, red >90%.
- Last 429 / 5xx timestamp from `ai_provider_status`.
- "Reset in" countdown (next UTC midnight).

Source: `ai_provider_status` table (keyed by `(provider, model, usage_date)` — see `05-implementation-plan.md` Phase 2) + declared per-model limits from the routing config (kept in sync with `03-providers-and-models.md`). Because the table is model-level, gauges accurately compare each model's RPD/TPD against its own declared cap; a provider-level rollup is also shown for "calls today across all models on this provider."

### 3. Provider mix chart

Stacked area chart, one band per provider, daily (or hourly for Today).

Y-axis = call count.
X-axis = time.
Tooltip shows per-provider count for that bucket.

Tells the operator at a glance: "are we leaning too hard on one provider?"

Source: `select date_trunc(...) bucket, provider_used, count(*) from ai_usage_logs where created_at in window group by 1, 2`.

### 4. Top features table

Top 20 features by call count in the window.

| Feature key | Calls | Tokens | Avg latency | Primary provider used | Fallback hits | Cache hits |
|---|---:|---:|---:|---|---:|---:|
| `bullet.rewrite` | 4,210 | 1.2 M | 380 ms | groq (95%), gemini (4%), openrouter (1%) | 5% | 0% |
| `resume.parse` | 312 | 850 K | 2,100 ms | gemini (88%), openrouter (12%) | 12% | 41% |
| ... | | | | | | |

Click a row → drill into that feature (sub-section 7).

### 5. Recent failures list

Last 50 rows where `error_type is not null` in the window.

Columns: timestamp, feature_key, provider tried, error_type, latency, fallback_depth.

Useful for triaging actual incidents in real time.

### 6. Activity heatmap (DOW × hour)

Reuse the `HeatmapDowHour` component. Source: same query shape as in Task #19, but filtered to `ai_usage_logs` instead of `usage_events`.

Shows when AI traffic peaks — useful for predicting when free-tier limits will bite.

### 7. Per-feature drill-down panel (modal/inline)

Opened by clicking a row in the Top Features table. Shows for one feature:

- Primary provider success rate over time.
- Token-count distribution (P50 / P90 / P99).
- Latency distribution.
- Fallback chain breakdown ("primary succeeded 87%, fallback-1 succeeded 11%, fallback-2 succeeded 2%, all failed 0%").
- Cache hit rate trend.
- "Clear cache" button (calls `purge_ai_cache(p_feature_key)`).

### 8. Cache section

- Cache hit rate per cacheable feature.
- Top 20 most-reused cache entries (by `hit_count`).
- Cache size (rows + bytes).
- Estimated saved requests.
- "Purge expired" button (manual trigger of the nightly cron).

---

## Backing RPCs (all SECURITY DEFINER, service_role only)

In a new migration introduced in Phase 6:

```sql
-- 1. Overview KPIs
create function get_ai_activity_overview(p_start timestamptz, p_end timestamptz)
returns table (
  total_calls       bigint,
  total_tokens      bigint,
  avg_latency_ms    numeric,
  fallback_rate     numeric,
  cache_hit_rate    numeric,
  error_rate        numeric
) language sql security definer as $$ ... $$;

-- 2. Provider daily series (for stacked area)
create function get_ai_provider_series(p_start timestamptz, p_end timestamptz, p_bucket text)
returns table (bucket timestamptz, provider_used text, calls bigint, tokens bigint)
language sql security definer as $$ ... $$;

-- 3. Top features
create function get_ai_top_features(p_start timestamptz, p_end timestamptz, p_top_n int)
returns table (
  feature_key     text,
  calls           bigint,
  tokens          bigint,
  avg_latency_ms  numeric,
  provider_mix    jsonb,        -- { "groq": 0.95, "gemini": 0.04, "openrouter": 0.01 }
  fallback_rate   numeric,
  cache_hit_rate  numeric
) language sql security definer as $$ ... $$;

-- 4. Recent failures
create function get_ai_recent_failures(p_start timestamptz, p_end timestamptz, p_limit int)
returns table (
  created_at    timestamptz,
  feature_key   text,
  provider_used text,
  error_type    text,
  latency_ms    int,
  fallback_depth int
) language sql security definer as $$ ... $$;

-- 5. Heatmap (DOW × hour)
create function get_ai_dow_hour(p_start timestamptz, p_end timestamptz)
returns table (dow int, hour int, calls bigint)
language sql security definer as $$ ... $$;

-- 6. Per-feature drill-down
create function get_ai_feature_detail(p_feature_key text, p_start timestamptz, p_end timestamptz)
returns jsonb language sql security definer as $$ ... $$;

-- 7. Cache stats
create function get_ai_cache_stats()
returns jsonb language sql security definer as $$ ... $$;

-- 8. Provider status (today)
create function get_ai_provider_status_today()
returns table (
  provider           text,
  daily_request_count int,
  daily_token_count  bigint,
  last_429_at        timestamptz,
  last_5xx_at        timestamptz,
  declared_rpd       int,    -- joined from a static limits table
  declared_tpd       bigint
) language sql security definer as $$ ... $$;

-- 9. Cache purge
create function purge_ai_cache(p_feature_key text)
returns int language sql security definer as $$ ... $$;
```

All revoked from `public/anon/authenticated`, granted to `service_role` only — same lockdown as the Task #19 RPCs.

---

## Edge function

`supabase/functions/admin-ai-activity/index.ts`:

- Auth: `requireAdminAuth(req, DEV_KIT_PASSWORD)`.
- Accepts `range: 'today' | '7d' | '30d' | '90d' | 'all'` and `feature_key?: string` (drill-down).
- Calls the RPCs in parallel.
- Returns one consolidated payload similar in shape to `admin-analytics`.

---

## Component layout (Tailwind)

```
src/components/dev-kit/ai-activity/
├── AIActivityPanel.tsx       (orchestrator — pattern copied from AnalyticsPanel)
├── ProviderLimitGauge.tsx    (the green/amber/red gauges)
├── ProviderMixChart.tsx      (stacked area)
├── TopFeaturesTable.tsx      (sortable table with drill-down)
├── FeatureDetailPanel.tsx    (drill-down view)
├── RecentFailuresList.tsx    (50-row list)
├── CacheStatsPanel.tsx       (cache section)
└── types.ts                  (TypeScript types matching the edge fn payload)
```

Shared components reused from Task #19:
`KpiCard`, `SectionCard`, `Sparkline`, `RankedList`, `Donut`, `HeatmapDowHour`, `EmptyState`, `RangeSwitcher`.

---

## Accuracy guarantees (per the locked decision in `09-decisions-log.md`)

The user explicitly required: **100% accurate, no hallucinations, no assumptions.** Concretely:

- Every KPI value is derived from a `count(*)` / `sum(...)` / `avg(...)` over actual `ai_usage_logs` rows in the window. No estimates, no projections.
- "Provider mix" percentages are exact `count(provider_used = X) / count(*)`.
- "Fallback rate" only counts rows where `fallback_depth IS NOT NULL` (post-migration rows). The schema in `05-implementation-plan.md` Phase 2 deliberately defaults this column to **NULL** (not 0) so old rows can never be misread as "primary succeeded". Same treatment for `cache_hit` (NULL by default, not false). The dashboard footer shows "(N pre-migration calls excluded — rows where `feature_key IS NULL`)" so the operator sees the exclusion explicitly.
- "Cache hit rate" only counts calls to cacheable features (lookup against the routing config's `cache.enabled`). Calls to non-cacheable features don't pollute the rate.
- "Free-tier limit" gauges read declared limits from a single source (`03-providers-and-models.md` → mirrored as a constant in `aiRouting.ts`) and current usage from `ai_provider_status`. If either is missing, the gauge renders an empty state with a "configure" CTA — never guesses.
- "Last updated" timestamp shown on every section.
- Auto-refresh: only when `range === 'today'`, every 60 s. Other ranges are static until the user clicks Refresh.

---

## Empty-state behavior

Every section uses `EmptyState` when the underlying query returns zero rows:

- "No AI calls in this window."
- "No failures in this window — nice."
- "No cache entries yet."
- etc.

No invented data, no "—" placeholders that look like values.
