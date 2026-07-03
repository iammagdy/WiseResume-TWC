# Atlas Source Of Truth Map

**Last verified:** 2026-07-03  
**Type:** Master Index  
**Canonical owner:** `Project Atlas/SOURCE_OF_TRUTH_MAP.md`  

---

This map is the A-to-Z guide for where application truth lives inside `Project Atlas/`.

## A. Master Entry Points

* **Living AI Operating Manual:** `Project Atlas/MASTER_HANDBOOK.md`
* **Verified System Truth Snapshot:** `Project Atlas/CURRENT_STATE.md`
* **Architectural Decision Records:** `Project Atlas/DECISIONS.md`
* **Developer & Agent Rules:** `Project Atlas/RULES.md`
* **Repository Governance:** `Project Atlas/GOVERNANCE.md`
* **Chronological Session Handover Log:** `Project Atlas/MASTER_HANDOVER_2026.md`
* **Consolidation Implementation Plan:** `Project Atlas/DOCS_CONSOLIDATION_IMPLEMENTATION_PLAN_2026-07-03.md`

---

## B. Platform Identity & Stack

* **Product Umbrella:** The Wise Cloud / WiseResume (`wiseresume.app`).
* **Repository:** `iammagdy/WiseResume-TWC`, default branch `main`.
* **Frontend Runtime:** React 18, TypeScript 5, Vite 6, Tailwind CSS, Radix UI, shadcn/ui.
* **Frontend Hosting:** Vercel.
* **Backend Runtime:** Appwrite Cloud (Appwrite Databases, Appwrite Storage, Appwrite Functions).
* **Appwrite Endpoint:** `https://fra.cloud.appwrite.io/v1`.
* **Appwrite Project ID:** `69fd362b001eb325a192`.
* **Appwrite Database ID:** `main`.

---

## C. Core Subdirectory Map

* `Project Atlas/product/` — Product Requirements Documents (PRDs), product briefs, brand guidelines.
* `Project Atlas/architecture/` — System architecture, technical context, database analysis, Appwrite Function canonical specs.
* `Project Atlas/features/` — Feature specifications, implementation plans, localization guides.
* `Project Atlas/ai/` — AI architecture specs, prompt guides, AI gateway documentation.
* `Project Atlas/design-system/` — Production design specs (`production/`) and visual target references (`visual-reference/`).
* `Project Atlas/deployment/` — Production deployment rules, Hostinger/Vercel guides (`DEPLOYMENT_GUIDE.md`).
* `Project Atlas/qa/` — Quality Assurance evidence logs, E2E test reports, unit test reports.
* `Project Atlas/security/` — Security audits, permissions checks, rate limit & credential protection audits.
* `Project Atlas/reports/` — Historical performance, UX, and system health audit reports.
* `Project Atlas/general/` — Developer contribution and general guidelines (`CONTRIBUTING.md`).
* `Project Atlas/archive/` — Preserved zero-data-loss repository for stale, superseded, and historical session logs.

---

## D. Code-Adjacent Local Pointers

* `appwrite-hubs/**/README.md` files remain code-adjacent as short local developer pointers. Canonical technical specs for all Appwrite Functions live in `Project Atlas/architecture/appwrite-functions.md`.

---

## E. Documentation Inventory & Consolidation Status

* **Total Workspace Documentation Files Count:** 609 files.
* **Consolidation Status:** Batch 1 Core Atlas Foundation Established (2026-07-03).
* **Root Pointer Policy:** Root `README.md` is a short pointer linking directly to `Project Atlas/MASTER_HANDBOOK.md`.
