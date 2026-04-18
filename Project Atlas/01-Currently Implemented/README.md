# 01 — Currently Implemented

**Last verified:** 2026-04-18
**Type:** index
**Canonical owner:** Project Atlas maintainer (see `../MAINTENANCE.md`)
**Sources (governance — supreme):**
- `project-governance/CONSTITUTION.md` (scope and invariants for the live system)
- `project-governance/PRODUCT.md` (current shipped feature surface)
- `project-governance/ARCHITECTURE.md` (current architecture invariants)
- `project-governance/CHANGELOG.md` (most recent shipped changes)
- For per-card sources, each card under this folder lists its own `Sources` block (engineering paths, line ranges where useful).

What is in this folder: every feature, page, edge function, table, and system that **exists in the live codebase today**. If something is described here, it is built.

If a feature is committed to but not yet built, it lives in `../02-Planned/`. If it is sketched / brainstormed only, it lives in `../03-Ideas/`.

---

## Contents

- [`platform-overview.md`](./platform-overview.md) — one-page summary of WiseResume + WiseHire and the shared infrastructure
- [`critical-systems/`](./critical-systems/) — 10 deep-dive docs for the systems every agent needs to understand
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
- [`pages/`](./pages/) — one reference card per route
- [`edge-functions/`](./edge-functions/) — one reference card per Supabase Edge Function
- [`database-tables/`](./database-tables/) — one reference card per Postgres table
- [`frontend-layer/`](./frontend-layer/) — Zustand stores, shared hooks, integration libraries
- [`stability-fixes/`](./stability-fixes/) — cross-cutting hardening work (the 2026-Q2 stability initiative, Phases 1–5)
