# 01 — Currently Implemented

**Last verified:** 2026-05-13
**Type:** index
**Canonical owner:** Project Atlas maintainer (see `../MAINTENANCE.md`)
**Sources (governance — supreme):**
- `project-governance/CONSTITUTION.md` (scope and invariants for the live system)
- `project-governance/PRODUCT.md` (current shipped feature surface)
- `project-governance/ARCHITECTURE.md` (current architecture invariants)
- `project-governance/CHANGELOG.md` (most recent shipped changes)
- For per-card sources, each card under this folder lists its own `Sources` block (engineering paths, line ranges where useful).

What is in this folder: every feature, page, function, table, and system that **exists in the live codebase today**. If something is described here, it is built.

If a feature is committed to but not yet built, it lives in `../02-Planned/`. If it is sketched / brainstormed only, it lives in `../03-Ideas/`.

---

## Contents

- [`platform-overview.md`](./platform-overview.md) — one-page summary of WiseResume + WiseHire and the shared infrastructure
- [`critical-systems/`](./critical-systems/) — deep-dive docs for the systems every agent needs to understand
  - [01 — Auth bridge (Kinde → Supabase)](./critical-systems/01-auth-bridge.md)
  - [02 — AI routing 8-step chain](./critical-systems/02-ai-routing-chain.md)
  - [03 — Credits + BYOK](./critical-systems/03-credits-and-byok.md)
  - [04 — Rate limiting (multi-layer)](./critical-systems/04-rate-limiting.md)
  - [05 — WiseHire Phase 1 surface](./critical-systems/05-wisehire-phase-1.md)
  - [06 — Admin Dev Kit](./critical-systems/06-admin-dev-kit.md)
  - [07 — Storage buckets](./critical-systems/07-storage-buckets.md)
  - [08 — Deployment](./critical-systems/08-deployment.md)
  - [09 — Security model (4-layer invariant)](./critical-systems/09-security-model.md)
  - [10 — WiseResume AI Studio + agentic chat](./critical-systems/10-ai-studio-and-agentic-chat.md)
  - [13 — Mobile (Expo)](./critical-systems/13-mobile-expo.md)
  - [14 — MCP server + Agent Skills](./critical-systems/14-mcp-and-agent-skills.md)
  - [15 — Cron jobs + scheduled functions](./critical-systems/15-cron-jobs.md)
  - [16 — Feature flags + kill switches](./critical-systems/16-feature-flags-and-kill-switches.md)
  - [17 — Ops health + error streams](./critical-systems/17-ops-health-and-error-streams.md)
  - [18 — Admin impersonation](./critical-systems/18-impersonation.md)
- [`pages/`](./pages/) — one reference card per route
- [`functions/`](./functions/) — one reference card per backend function or routed function surface
- [`database-tables/`](./database-tables/) — one reference card per Postgres table
- [`frontend-layer/`](./frontend-layer/) — Zustand stores, shared hooks, integration libraries, contexts, types, Supabase frontend integration, test setup
- [`backend-layer/`](./backend-layer/) — Express server, shared backend helpers, Cloudflare Pages middleware
- [`repo/`](./repo/) — top-level repo folders: project-governance, specs, docs, reports, scripts, tests, wise-templates, Routing AI Providers
- [`public-surfaces/`](./public-surfaces/) — `public/` static surfaces: `.well-known/` (MCP, agent skills, OAuth/OIDC, universal links), `data/`, `docs/`, root assets
- [`stability-fixes/`](./stability-fixes/) — cross-cutting hardening work (the 2026-Q2 stability initiative, Phases 1–5)
