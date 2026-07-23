# Architectural Decision Records (ADR) — Project Atlas

**Repository:** `iammagdy/WiseResume-TWC`  
**Owner:** Magdy Saber  

---

## ADR-001: Project Atlas as Single Documentation Source of Truth

* **Status:** Approved
* **Date:** 2026-07-03
* **Context:** Documentation was previously scattered across root Markdown files, legacy `docs/` folders, and external audit reports.
* **Decision:** `Project Atlas/` is established as the single, clean, reliable documentation source of truth for the entire application.
* **Consequences:** All future documentation updates must occur inside `Project Atlas/`. Root documentation files are moved or consolidated into Atlas.

---

## ADR-002: Master Handbook Living Entry Point

* **Status:** Approved
* **Date:** 2026-07-03
* **Context:** AI agents required a clear, living operating manual rather than relying on historical session handovers.
* **Decision:** `Project Atlas/MASTER_HANDBOOK.md` is created as the primary AI-agent entry point. `Project Atlas/MASTER_HANDOVER_2026.md` remains preserved as a chronological session log.
* **Consequences:** Future AI agents start execution by reading `MASTER_HANDBOOK.md` and `RULES.md`.

---

## ADR-003: Appwrite-Native Backend Architecture

* **Status:** Approved
* **Date:** 2026-06-26
* **Context:** Past documentation occasionally referenced external auth/database providers (Supabase, Kinde).
* **Decision:** WiseResume is strictly Appwrite-native (Appwrite Auth, Databases, Storage, Functions). Vercel hosts frontend assets and serverless proxy routes, but does not replace Appwrite infrastructure.
* **Consequences:** All backend features, database permissions, and authentication flows must target Appwrite. Appwrite docs are core system truth.

---

## ADR-004: Consolidated AI Gateway Routing

* **Status:** Approved
* **Date:** 2026-06-26
* **Context:** Direct client-side AI API calls presented security risks and rate-limiting issues.
* **Decision:** AI features use server-side Appwrite functions. Most route through `ai-gateway`; the existing `resume-section-ai` and `job-import` hubs are explicit standalone exceptions.
* **2026-07-23 Amendment:** The earlier "all features" wording did not match the deployed source. This correction documents the exceptions without approving additional bypasses.
* **Consequences:** Client code must not call external AI provider endpoints directly. New AI features should use `ai-gateway` unless a separate architecture decision approves another server-side boundary.

---

## ADR-005: Billing Feature State

* **Status:** Approved
* **Date:** 2026-07-03
* **Context:** Billing integrations (Stripe, RevenueCat) were previously explored or partially drafted.
* **Decision:** Billing features are disabled or set to "Coming Soon" status until production code explicitly specifies payment enablement.
* **Consequences:** UI components must show "Coming Soon" or free usage mode for billing features.

---

## ADR-006: Phased Zero-Data-Loss Documentation Consolidation

* **Status:** Approved
* **Date:** 2026-07-03
* **Context:** 609 documentation files exist across the workspace requiring organization without risk of deleting historical data.
* **Decision:** Execute a phased consolidation: Batch 1 (Core Foundation), Batch 2 (Subdirectory Migration & Archival), Batch 3 (Link Validation). No documentation file is deleted; stale docs move to `Project Atlas/archive/`.
* **Consequences:** Complete historical preservation with clean top-level Atlas hierarchy.
