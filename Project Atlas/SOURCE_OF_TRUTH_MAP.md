# Project Atlas — Source of Truth Master Inventory Map

**Last Verified:** 2026-07-03  
**Status:** Canonical Documentation Index  
**Consolidation Status:** Documentation consolidation merged to main at `9567aa3066d58dd7636369d894f6eec15d72555b`. Living Docs Normalization merged to main at `5497ce41a657245125fd0ebeca949e6bdd1fa58d`. Phase 2 Routing Rules merged at `0727589e`.
**Location:** `Project Atlas/SOURCE_OF_TRUTH_MAP.md`  

---

## 1. Quick Navigation for AI Agents & Developers

| Topic | Primary Canonical Document |
|---|---|
| **Mandatory Agent Initialization** | [`Project Atlas/skills/agent-bootstrap.md`](./skills/agent-bootstrap.md) |
| **AI Operating Manual** | [`Project Atlas/MASTER_HANDBOOK.md`](./MASTER_HANDBOOK.md) |
| **Current Verified System State** | [`Project Atlas/CURRENT_STATE.md`](./CURRENT_STATE.md) |
| **Active Operational Handover State** | [`Project Atlas/WHERE_WE_STOPPED.md`](./WHERE_WE_STOPPED.md) |
| **Master Document Routing Rules** | [`Project Atlas/ATLAS_ROUTING_RULES.md`](./ATLAS_ROUTING_RULES.md) |
| **Developer Guidelines & Rules** | [`Project Atlas/RULES.md`](./RULES.md) |
| **Architecture Decision Records (ADR)** | [`Project Atlas/DECISIONS.md`](./DECISIONS.md) |
| **System Change Log** | [`Project Atlas/CHANGELOG.md`](./CHANGELOG.md) |
| **Appwrite Functions Spec** | [`Project Atlas/architecture/appwrite-functions.md`](./architecture/appwrite-functions.md) |
| **Current Deployment Guide** | [`Project Atlas/deployment/current-deployment.md`](./deployment/current-deployment.md) |
| **Chronological Handover History** | [`Project Atlas/MASTER_HANDOVER_2026.md`](./MASTER_HANDOVER_2026.md) |

---

## 2. Directory Structure & Living Specs Map

### `product/` — Product Requirements & Brand
* `product/requirements.md` — Product requirements document (PRD).
* `product/brand-guidelines.md` — Brand identity and style guidelines.
* `product/WiseCloud-App-Brief.md` — Wise Cloud product strategy brief.

### `architecture/` — System & Infrastructure Specifications
* `architecture/overview.md` — High-level architecture overview.
* `architecture/appwrite-architecture.md` — Appwrite backend architecture.
* `architecture/frontend-architecture.md` — React/Vite/Tailwind frontend architecture.
* `architecture/data-model.md` — Database collections and schemas.
* `architecture/auth-and-permissions.md` — Appwrite Auth & document-level security.
* `architecture/appwrite-functions.md` — Appwrite serverless functions specification.
* `architecture/integrations.md` — Third-party service integrations.

### `features/` — Living Feature Specifications
* `features/dashboard.md` — User Dashboard specification.
* `features/portfolio.md` — Public & Private Portfolios specification.
* `features/resume-editor.md` — Resume Editor specification.
* `features/tailoring-hub.md` — Tailoring Hub (AI resume tailoring) specification.
* `features/upload-import.md` — CV Upload & Extraction specification.
* `features/preview-export.md` — Preview & Export specification.
* `features/cover-letters.md` — Cover Letters specification.
* `features/notifications.md` — In-App Notifications & Bell Dropdown specification.
* `features/devkit-admin.md` — DevKit Admin Hub specification.

### `skills/` — AI Agent Skills System
* `skills/README.md` — Skills system overview and governance.
* `skills/SKILLS_INDEX.md` — Skill selection matrix.
* `skills/agent-bootstrap.md` — **Mandatory** agent initialization protocol.
* `skills/new-code-quality.md` — Code quality & TypeScript rules.
* `skills/feature-implementation.md` — Feature development workflow.
* `skills/ui-visual-implementation.md` — UI & Tailwind styling standards.
* `skills/appwrite-safe-change.md` — Safe Appwrite backend changes.
* `skills/ai-gateway-safe-change.md` — Safe AI gateway provider changes.
* `skills/qa-validation.md` — QA and test suite validation.
* `skills/security-review.md` — Security and auth review.
* `skills/documentation-closeout.md` — Documentation closeout workflow.
* `skills/skillkit-optional-setup.md` — Optional SkillKit setup guidelines.

### `deployment/` & `operations/` — Operations & Deployment Specifications
* `deployment/current-deployment.md` — Active Vercel & Appwrite deployment specification.
* `operations/README.md` — Infrastructure operations and deployment runbooks overview.

### `qa/` — QA Strategy & Test Suite Inventory
* `qa/PLAYWRIGHT_E2E_SUITE.md` — Playwright E2E suite specification.
* `qa/test-suite-map.md` — Executable test directory mapping (`tests/`).
* `qa/test-output-locations.md` — Generated test artifact locations (`reports/`).

### `prompts/` — AI Agent Prompts & Templates
* `prompts/README.md` — AI agent prompts and template library overview.

### `assets/` — Visual Brand Assets & Diagrams
* `assets/README.md` — Brand logos, architecture diagrams, and UI screenshots.

### `decisions/` — Architectural Decision Records
* `decisions/README.md` — ADR directory guide and link to `DECISIONS.md`.

### `reports/` — Categorized Historical Audits & Evidence
* `reports/ui-ux/` — UI/UX stabilization and dashboard audit reports.
* `reports/performance/` — Application load time & performance audits.
* `reports/devkit/` — DevKit health and visitor analytics reports.
* `reports/landing/` — Landing page audit and scroll-flicker reports.
* `reports/historical-audits/` — Archive of past feature and security audits.

### `temp/` — Temporary Scratch Directory
* `temp/README.md` — Temporary agent scratch directory and cleanup rules.

### `archive/` — Historical Only Archival Folder (NOT Source of Truth)
> [!CAUTION]
> **Historical Archive Governance**: `Project Atlas/archive/` is historical-only, non-canonical, and MUST NOT be used by AI agents as current truth unless explicitly instructed by the owner.
* `archive/README.md` — Archival policy and historical-only disclaimer.
* `archive/legacy-docs/` — Archived root documentation (e.g. historical `CHANGELOG.md`, duplicate briefs).
* `archive/legacy-atlas-folders/` — Archived pre-normalization specification folders (e.g. `00-Full-App-Reference`, `01-Currently Implemented`, `05-Migration to Appwrite`).
* `archive/historical-audits/` — Archived point-in-time security, UI/UX, QA, and deployment audit reports.
* `archive/imported-repo-docs/` — Imported repository documentation files.
* `archive/imported-reports/` — Imported repository report files.
* `archive/review-needed/` — Files pending classification.
