# AI Routing Rollout — unified per-feature routing layer

**Status:** planned (design complete, not implemented)
**Last verified:** 2026-04-17
**Sources:**
- `Routing AI Providers/README.md`
- `Routing AI Providers/01-current-state.md` through `Routing AI Providers/10-risks-and-rollback.md`
- `project-governance/ARCHITECTURE.md` §8 (current 8-step chain)

**Canonical owner:** `Routing AI Providers/` folder.

---

**What's planned:** A unified per-feature routing module that wraps the existing 8-step chain with smart fallback policies, streaming support, output caching, and a Dev Kit dashboard for routing health. Each AI feature (e.g. Tailor, Cover Letter, Brief Generator) gets a configurable routing profile (preferred model class, fallback chain, cache key, cost budget).

**What's already done (current state):**
- 8-step priority chain (`_shared/aiClient.ts`)
- BYOK strict mode (`_shared/creditUtils.ts`)
- Tool output caching for `agentic-chat` (`tool_cache` table, 7-day TTL on `get_company_briefing`)
- Fail-closed credit deduction (Decision #6)

**What's missing (target state):**
- Per-feature routing profiles
- Streaming responses end-to-end
- Cross-feature output cache layer
- Routing health dashboard in Dev Kit
- Per-tier (Pro vs Premium) routing differentiation

**Read these before starting work:**
1. `Routing AI Providers/01-current-state.md` — what we have today
2. `Routing AI Providers/02-target-architecture.md` — what we want
3. `Routing AI Providers/04-feature-routing-map.md` — feature-by-feature requirements
4. `Routing AI Providers/10-risks-and-rollback.md` — phased rollout plan, risks, and rollback steps

**Hard constraints (will not change):**
- Rule B: `score-resume` stays AI-free, 0 credits.
- Four-Layer Security Invariant (critical-system 09) applies to every new endpoint.
- BYOK allowlist must stay in sync between `aiClient.ts` and `creditUtils.ts`.
