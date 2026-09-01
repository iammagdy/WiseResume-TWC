# WiseResume Developer & AI Agent Rules

**Last verified:** 2026-08-20
**Type:** governance
**Sources:**
- `Project Atlas/GOVERNANCE.md`
- `Project Atlas/MASTER_HANDOVER_2026.md`
- `Project Atlas/DEPLOYMENT_GUIDE.md`
**Canonical owner:** `Project Atlas/GOVERNANCE.md`

---

Every agent or developer working on this repository must follow these rules.

## 1. Source Of Truth

`Project Atlas/` living specs are the **only** documentation source of truth.

Do not rely on old root docs, deleted governance folders, external planning folders, chat memory, or stale Markdown outside the Atlas.

### Strict Archive Rules
* **Historical Only:** `Project Atlas/archive/` is historical-only and is **NOT** a source of truth.
* **Prohibited for AI Agents:** AI agents MUST NOT treat archived files as current system truth or use them for decisions unless explicitly instructed by the project owner.
* **Living Specs Exclusively:** Current system truth lives ONLY in living Project Atlas specs (`MASTER_HANDBOOK.md`, `CURRENT_STATE.md`, `RULES.md`, `architecture/`, `features/`, `product/`, `deployment/`, etc.).

The current codebase and live logs still matter. If living Atlas specs and implementation disagree, inspect the code and logs, fix the Atlas living specs, and record the correction.

## 2. Definition Of Done

A task is not finished until:

- the root cause is verified, not guessed;
- the change is verified to work, or the verification blocker is clearly reported;
- user-facing UI contains no unnecessary regional references such as provider regions;
- relevant files in `Project Atlas/` are updated;
- for customer-impacting product, feature, or bug-fix tasks, an explicit What's New eligibility decision (`WHATS_NEW_REQUIRED`, `WHATS_NEW_NOT_REQUIRED`, or `WHATS_NEW_DEFER_UNTIL_PRODUCTION`) is recorded in task closeout;
- `Project Atlas/CHANGELOG.md` has a dated entry for accepted changes;
- deployment-sensitive changes follow `Project Atlas/DEPLOYMENT_GUIDE.md`.

## 3. Architecture Constraints

- Stack: React, TypeScript, Vite, Tailwind, Radix UI, shadcn/ui.
- Auth: Appwrite Auth only for the Appwrite-native web app.
- Backend: Appwrite Databases, Storage, and Functions.
- AI: all AI calls go through the consolidated Appwrite `ai-gateway` unless an Atlas file explicitly documents an exception.
- Admin DevKit: cross-user reads/writes must run through server-side Appwrite Functions such as `admin-devkit-data`, not direct browser database calls.
- Mobile: still legacy and out of scope unless explicitly targeted.

## 4. No Guessing

If you do not know the root cause of an error, do not guess.

Search the codebase, read the relevant Atlas files, inspect logs, and verify file paths before proposing or applying fixes. Every fix must address the root cause, not only the symptom.

## 5. Deployment Safety

Before touching GitHub Actions workflows, FTP config, Hostinger paths, deploy scripts, or domain routing, read `Project Atlas/DEPLOYMENT_GUIDE.md`.

Never run a deleting FTP mirror against the Hostinger root path `.` from this repo. The WiseResume app deploys to `resume/`; the landing page uploads a single file to root; WiseQuran belongs to a separate repo.

## 6. Communication

The owner is non-technical. Explain high-risk changes in plain language before implementing them. Recommend the best path clearly, with trade-offs only where they matter.

## 7. Test & QA Routing Rules

* **Executable Test Code**: All runnable tests remain in root `tests/` (`EXECUTABLE_TEST_CODE`). Do not move test files into `Project Atlas/`.
* **Generated Test Outputs**: Machine-generated test runner output files (JSON, HTML reports, traces) remain in root `reports/` (`GENERATED_TEST_OUTPUT`).
* **QA Strategy & Reports**: All human QA strategy, checklists, and summary reports belong in `Project Atlas/qa/` or `Project Atlas/reports/` living subdirectories.
* **Archival**: Legacy human-written QA reports MUST be merged into living specs and archived under `Project Atlas/archive/historical-audits/` or `imported-reports/`.
* **No Root QA Noise**: AI agents MUST NOT create random Markdown or QA documentation files in the repository root or root `reports/`.

## 8. AI Agent Bootstrap & File Placement Rules

* **Mandatory Agent Bootstrap**: Every AI agent MUST execute [`Project Atlas/skills/agent-bootstrap.md`](./skills/agent-bootstrap.md) at the start of every turn before making edits.
* **Mandatory Routing Pre-Check**: Consult [`Project Atlas/ATLAS_ROUTING_RULES.md`](./ATLAS_ROUTING_RULES.md) to determine exact file placement before creating new files.
* **Root Hygiene**: Never place unclassified Markdown files or scratch logs directly in repository root (`/`) or `Project Atlas/` root.
* **Temporary Files**: Intermediate working files belong in `Project Atlas/temp/` and MUST be deleted or promoted to living specs before task closeout.

## 9. What's New Governance & Public Release Evaluation

The `/whats-new` Product Updates Hub must accurately reflect genuine customer-facing releases. Every completed customer-impacting product, feature, or bug-fix task must be evaluated for What's New eligibility during documentation closeout following [`Project Atlas/skills/whats-new-maintenance.md`](./skills/whats-new-maintenance.md).

### Mandatory Closeout Evaluation
Every completed customer-impacting product, feature, or bug-fix task MUST receive an explicit What's New decision during task closeout:
- `WHATS_NEW_REQUIRED`: The change is eligible and must be published to the updates hub.
- `WHATS_NEW_NOT_REQUIRED`: The change is internal-only, operational, or does not meet customer-facing criteria.
- `WHATS_NEW_DEFER_UNTIL_PRODUCTION`: The change qualifies, but production deployment and live browser/runtime verification have not yet occurred.

Internal, documentation-only, or administrative housekeeping tasks are not required to complete a What's New evaluation unless a closeout decision is specifically useful.

### REQUIRED Criteria
A change is eligible for `/whats-new` when it:
- creates or materially changes a user-visible feature;
- materially improves a real user workflow;
- adds a new customer-facing capability;
- significantly changes UX that users will notice;
- changes public plans, product behavior, localization, exports, portfolio, resume workflows, job workflows, or similar user-visible functionality;
- fixes a meaningful user-facing product problem where communicating the fix benefits customers.

### NOT REQUIRED Criteria
Do NOT publish internal-only work to the public updates hub, including:
- backend-only refactors;
- schema mechanics or database migrations;
- deployment mechanics or CI/test-only changes;
- source-hash updates;
- infrastructure changes or secret rotation;
- internal security hardening with no user-visible effect;
- admin-only or internal DevKit changes;
- documentation-only changes;
- technical implementation details users do not need to know.

Internal work may only qualify if it directly produces a clear, factual, user-facing outcome.

### Production Requirement
Do NOT publish a release as shipped until production deployment and appropriate runtime/browser verification are complete. Merging a PR or completing local implementation is NOT sufficient. If implementation is merged but production verification is pending, assign `WHATS_NEW_DEFER_UNTIL_PRODUCTION`.

### Evidence Requirement
Never fabricate or infer release dates. Release timing must follow this evidence hierarchy:
1. Verified production/deployment evidence (Vercel/Appwrite deployment records, live URL verification);
2. Living Atlas feature/QA/deployment records;
3. Merge and commit history;
4. Verified existing public release records.

If release timing cannot be proven from this evidence hierarchy, mark it as `UNVERIFIED_DATE` and do NOT publish until verified.

### Copy Requirements
All public What's New entries must:
- focus on customer outcomes rather than internal engineering mechanics;
- avoid developer jargon and internal provider/schema details;
- avoid unsupported marketing claims or fabricated performance metrics;
- avoid absolute claims such as "fully", "instant", "perfect", or "secure" unless explicitly supported by verified evidence;
- describe real user impact factually;
- provide bilingual English LTR and Arabic RTL copy.

---

Failure to follow these rules creates confusion and technical debt. Stick to the Atlas.
