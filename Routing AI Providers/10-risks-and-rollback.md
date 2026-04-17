# 10 — Risks, Mitigations, and Rollback

> **Purpose:** Catalog what could go wrong with this rollout, how each risk is mitigated, and what the explicit "undo" looks like for each phase. The goal is that no part of the plan creates a situation we can't back out of.

---

## Risk register

### R1 — Existing AI features break during the rollout

**Likelihood:** Low. **Impact:** High.

**Mitigation:**
- All schema changes are additive (new columns, new tables — no removals, no type changes).
- `callAI()` keeps its existing signature and behavior. The new `callAIForFeature()` is added alongside, not replacing it.
- Edge functions are migrated **one at a time** (Phase 4), with smoke tests after each.
- Phase 0–3 add infrastructure but don't change any feature's behavior; feature behavior changes only in Phase 4 onward, function-by-function.

**Rollback:** per-function git revert. Other migrated functions keep working.

---

### R2 — Gemini free-tier proves insufficient at launch

**Likelihood:** Medium (250 RPD on 2.5 Flash is the tightest cap in the chain). **Impact:** Low — fallbacks absorb it.

**Mitigation:**
- Every feature using Gemini as primary has at least one non-Gemini fallback.
- The "limit-aware soft routing" in Phase 8 (optional) automatically deprioritizes Gemini when usage hits 70% of declared daily.
- Dashboard shows live limit gauges so the operator sees pressure building before users feel it.

**Rollback:** swap Gemini features to Groq/OpenRouter primaries by editing `04-feature-routing-map.md` and `aiRouting.ts` (5-minute change, no schema impact).

---

### R3 — Streaming + fallback produces incoherent output

**Likelihood:** Medium without explicit handling. **Impact:** Medium — users see garbled text.

**Mitigation:**
- On primary failure mid-stream, we send `event: provider-change` and the front-end **clears the buffer** before consuming new tokens. We restart from scratch with the fallback model — no concatenation across models.
- The brief flicker is the chosen UX (documented trade-off in `06-streaming-design.md`).
- Heartbeats every 15 s prevent middleboxes from killing slow streams.

**Rollback:** front-end stops sending `Accept: text/event-stream`; edge functions fall back to one-shot JSON. Streaming becomes invisible until re-enabled.

---

### R4 — Cache pollution / stale cache after schema change

**Likelihood:** Medium when we change a parser's output JSON shape. **Impact:** Low — affected features return outdated structure.

**Mitigation:**
- A `cache_version` constant in `aiRouting.ts` is included in the cache key. Bumping it instantly invalidates all entries for that feature.
- Manual purge available via the dashboard ("Clear cache" per feature).
- Nightly cron prunes expired entries.
- Cache is opt-in per feature; non-deterministic features are never cached.

**Rollback:** truncate `ai_cache` table. Worst case: every cacheable call goes to the provider for a day. No correctness impact.

---

### R5 — `ai_usage_logs` row volume grows unmanageably

**Likelihood:** Low at launch (free-tier limits cap volume). **Impact:** Low (Postgres handles millions of rows fine; indexes are in place).

**Mitigation:**
- Indexes on `(feature_key, created_at desc)` and `(provider_used, created_at desc)` keep dashboard queries fast.
- Optional: nightly aggregation into a daily-rollup table, populated by a cron job, after 90 days. Out of scope for v1.

**Rollback:** drop the new indexes if they ever become a write bottleneck (unlikely at our scale).

---

### R6 — A provider changes its API surface

**Likelihood:** Medium over a year. **Impact:** Low — only affects one provider's adapter.

**Mitigation:**
- Per-provider adapter functions in `aiClient.ts` isolate API differences. A schema change in Gemini's response only touches the Gemini adapter.
- Existing dynamic model discovery in `aiClient.ts` already handles model-list churn for OpenRouter and Groq.
- Sentry forwarding from `logger.ts` surfaces unexpected response shapes immediately.

**Rollback:** pin to a previous adapter version via git revert; the affected provider drops out of the chain temporarily and the others absorb traffic.

---

### R7 — A provider's TOS changes (e.g. tighter free-tier rules)

**Likelihood:** Medium. **Impact:** Variable.

**Mitigation:**
- We comply with all current TOS by design (one key per provider, no rotation, no scraping).
- The dashboard's per-provider gauges immediately surface a sudden cap drop.
- Routing config can re-prioritize providers in minutes.

**Rollback:** drop the offending provider from `aiRouting.ts` chains; other providers absorb the load.

---

### R8 — Admin dashboard misleads the operator

**Likelihood:** Medium without strict accuracy rules. **Impact:** High (operational decisions based on wrong numbers).

**Mitigation (per locked decision D9):**
- Every dashboard number is a real `count(*) / sum(...) / avg(...)` over `ai_usage_logs`. No projections.
- Pre-migration rows (missing the new columns) are excluded from rate denominators with a visible footnote, never silently zero-filled.
- Empty states are explicit ("No data") instead of `0` placeholders.
- "Last updated" timestamps on every section.

**Rollback:** hide misleading sections by feature-flagging them off in the dashboard component.

---

### R9 — Edge function cold-start slows streaming

**Likelihood:** Low after the first request. **Impact:** Cosmetic — first token takes ~1 s extra.

**Mitigation:**
- Existing model-discovery cache in `aiClient.ts` warms on first call.
- Heartbeat keeps connection alive across cold starts.
- Optional: a "warmup" cron that pings the most-used features every 5 minutes (out of scope for v1).

**Rollback:** no action needed; cold-start latency is bounded.

---

### R10 — A bug in `callAIForFeature` breaks newly-migrated functions

**Likelihood:** Medium during Phase 4. **Impact:** Medium (one feature at a time).

**Mitigation:**
- Phase 3 includes mocked-provider unit tests for `callAIForFeature` covering: success, primary 429 + fallback success, all-fail, streaming primary failure, cache hit, cache miss + put.
- Phase 4 migrates one function per PR with a smoke test.
- The existing `callAI()` is untouched, so any regression is local to the migrated function.

**Rollback:** per-function git revert restores the old `callAI()` call.

---

### R11 — Operator (or a future agent) loses context on the plan

**Likelihood:** Medium over months / project handoffs. **Impact:** Medium.

**Mitigation:**
- This entire `Routing AI Providers/` folder exists for exactly this reason.
- README.md is the entry point; everything is cross-linked.
- `replit.md` (project root) gets a short "Routing AI Providers" section pointing here.
- Any deviation during implementation is recorded back into this folder with a date.

**Rollback:** N/A — process risk, mitigated by documentation hygiene.

---

## Phase-by-phase rollback summary

| Phase | What it adds | How to undo |
|---|---|---|
| 0 | Pre-flight checks | N/A — no changes |
| 1 | `aiRouting.ts` config + tests | Delete the file. Nothing imports it. |
| 2 | DB schema (new columns + 2 new tables) | Reverse migration. Everything additive — no data loss. |
| 3 | New `callAIForFeature` paths in `aiClient.ts` | Git revert the additions; existing `callAI()` unchanged. |
| 4 | Per-function migration | Per-function git revert. Other migrated functions still work. |
| 5 | Streaming for marked features | Front-end stops sending `Accept: text/event-stream`. |
| 6 | Admin dashboard tab | Hide the tab via component conditional. |
| 7 | Friendly error toast | Front-end falls back to generic toast. |
| 8 | Limit-aware soft routing (optional) | Disable the feature flag in `aiRouting.ts`. |

**At every phase boundary, all existing AI features continue to work.** This is the project's core safety guarantee.

---

## Severity escalation

If any of these happen during rollout, **stop and surface to the operator immediately**:

1. Any existing AI feature returns errors after a phase deployment (not a single user — a pattern).
2. Provider declares an unexpected outage that breaks the chain entirely.
3. `ai_usage_logs` write rate causes Postgres CPU > 70% (extremely unlikely at launch scale).
4. A provider sends a TOS-change notice or account warning email.

Each of these has a documented response: revert to the prior phase, switch the affected feature's primary in `aiRouting.ts`, or pause rollout pending TOS review.
