# Project Atlas — Source of Truth Master Inventory Map

**Last Verified:** 2026-07-03  
**Status:** Canonical Documentation Index  
**Consolidation Status:** Documentation consolidation merged to main at `9567aa3066d58dd7636369d894f6eec15d72555b`. Living Docs Normalization completed on branch `docs/atlas-living-docs-normalization` at commit `608d8f389b9839ca8fe03fa7e50fddc5eb42265a` and pending merge.  
**Location:** `Project Atlas/SOURCE_OF_TRUTH_MAP.md`  

---

## 1. Quick Navigation for AI Agents & Developers

| Topic | Primary Canonical Document |
|---|---|
| **AI Operating Manual** | [`Project Atlas/MASTER_HANDBOOK.md`](./MASTER_HANDBOOK.md) |
| **Current Verified System State** | [`Project Atlas/CURRENT_STATE.md`](./CURRENT_STATE.md) |
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

### `deployment/` — Production Deployment Specifications
* `deployment/current-deployment.md` — Active Vercel & Appwrite deployment specification.

### `reports/` — Categorized Historical Audits & Evidence
* `reports/ui-ux/` — UI/UX stabilization and dashboard audit reports.
* `reports/performance/` — Application load time & performance audits.
* `reports/devkit/` — DevKit health and visitor analytics reports.
* `reports/landing/` — Landing page audit and scroll-flicker reports.
* `reports/historical-audits/` — Archive of past feature and security audits.

### `archive/` — Zero-Data-Loss Archival Folder
* Contains stale, superseded, or legacy documentation (e.g. legacy Hostinger FTP guide, pre-Appwrite migration logs) preserved for historical audit completeness.
