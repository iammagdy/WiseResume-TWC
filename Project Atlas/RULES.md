# WiseResume Developer & AI Agent Rules

**Last verified:** 2026-06-26
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

---

Failure to follow these rules creates confusion and technical debt. Stick to the Atlas.
