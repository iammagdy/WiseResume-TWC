# Project Atlas Changelog

**Last verified:** 2026-05-12
**Type:** changelog
**Sources:**
- `Project Atlas/GOVERNANCE.md`
- `Project Atlas/RULES.md`
- `Project Atlas/MASTER_HANDOVER_2026.md`
- `Project Atlas/SOURCE_OF_TRUTH_MAP.md`
**Canonical owner:** this file

---

## 2026-05-12 - Atlas A-to-Z source map

### Summary
Added `Project Atlas/SOURCE_OF_TRUTH_MAP.md` so future agents and contributors have one clear map for product identity, architecture, AI, DevKit, deployment, implemented features, planned work, governance, and conflict resolution.

### What changed
- Added the A-to-Z Atlas source map.
- Updated `Project Atlas/README.md` so the source map is the first file agents read.
- Re-verified the map against current code references: `package.json`, `src/lib/appwrite.ts`, `src/lib/appwrite-collections.ts`, and `src/lib/appwrite-bridge.ts`.

### Why
After removing competing external documents, the Atlas needed a single orientation page that tells agents exactly where each kind of truth lives and what must not be reintroduced.

### Verification
Documentation-only change. Key deleted outside docs were checked against `main` and returned not found. No runtime tests were required.

---

## 2026-05-12 - Documentation consolidation: Atlas-only source of truth

### Summary
The project documentation model was consolidated so `Project Atlas/` is the only source of truth for WiseResume, WiseHire, The Wise Cloud, architecture, deployment, AI routing, agent rules, and operational state.

### What changed
- Added `Project Atlas/GOVERNANCE.md` as the canonical governance page using the current Appwrite-native architecture.
- Updated Atlas rules and maintenance guidance to remove references to `project-governance/` as a higher authority.
- Folded durable rules from the old governance folder into Atlas language: inspect first, do not guess, preserve working behavior, keep account boundaries strict, document accepted changes, and protect deployment safety.
- Preserved AI routing intent inside `Project Atlas/02-Planned/ai-routing-rollout.md` and removed the old external routing folder as a separate source of truth.
- Removed stale or conflicting Markdown documentation outside `Project Atlas/`.

### Why
The repository had multiple competing documentation surfaces. Some older docs still described Kinde/Supabase as current and claimed `project-governance/` was supreme, while the live project is Appwrite-native and the README already directed agents to the Atlas. This cleanup removes that ambiguity for the owner and future AI agents.

### Verification
This was a documentation-only change. No application code was changed and no runtime test suite was required.
