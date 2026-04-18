# Phase 1 — Database Integrity & Indexes

**Last verified:** 2026-04-18
**Type:** reference card
**Sources:**
- `.local/tasks/phase-1-db-integrity.md`
- `server/schema.ts`
- `server/db.ts`
- `drizzle.config.ts`
- `server/index.ts` (`/api/health`, `/api/db-health`)
- `project-governance/CHANGELOG.md` entry dated 2026-04-18 — Phase 1

**Canonical owner:** `.local/tasks/phase-1-db-integrity.md` (task brief) + `server/schema.ts` (live truth).

---

**What it is:** Schema-layer fix that adds the foreign-key constraints and missing B-tree indexes the Neon Postgres database was launched without. Restores the cascade-delete behavior the original Supabase migrations had and prevents sequential scans on every list-by-user query once data lands.

**Where it lives:** Drizzle schema in `server/schema.ts`; pushed via `npm run db:push`. Health endpoints in `server/index.ts`.

**Key facts:**
- Every relational column (`user_id`, `owner_id`, `resume_id`, `candidate_id`, `job_id`, `short_link_id`) declares `.references(() => parent.col, { onDelete: 'cascade' })`. → `server/schema.ts`
- Parent tables in the cascade graph: `profiles`, `portfolios`, `resumes`, `wisehire_jobs`, `wisehire_candidates`, `portfolio_short_links`. → `server/schema.ts`
- 18 previously-missing FK-style B-tree indexes added; analytics-heavy tables also get a composite `(user_id, created_at desc)` index for the "give me this user's recent rows" pattern. → `server/schema.ts`
- Verification gate: `npm run db:push --force` completes cleanly, audit query shows `fk_count > 0` for every child table and zero `MISSING_INDEX` rows, `/api/health` and `/api/db-health` stay green. → `.local/tasks/phase-1-db-integrity.md` step 3

**Out of scope on this card:** the Phase 4 `ai_provider_breaker` table (separate card) and the Phase 5 BRIN-index / retention work (separate card).

**Related cards:** `./phase-4-ai-provider-resilience.md`, `./phase-5-analytics-data-lifecycle.md`, the per-table cards under `../database-tables/`.
