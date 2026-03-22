# WiseResume Project Constitution

## 1. Purpose
This constitution establishes the supreme governance, engineering standards, and workflow rules for the **WiseResume** project. This document and its accompanying files in the `project-governance/` directory constitute the ultimate instructions for any AI agents or developers working on this repository.

## 2. Source of Truth Hierarchy
1. **The Current Codebase**: The live state of the repository MUST be treated as the primary source of truth.
2. **Governance Documents**: Files within `project-governance/` override them and are the official guiding principles.

## 3. Legacy Documentation
The repository contains a `legacy-docs/enhancements-for-vibe-coding/` folder with historical documentation from earlier phases of WiseResume (including old Supabase Auth setups, previous branding, early UX/architecture experiments, and vibe-coding workflows).
* All files inside `legacy-docs/enhancements-for-vibe-coding/` are historical context only.
* These files MAY be used only for:
  * Understanding historical design decisions,
  * Learning about previous UX and architecture ideas,
  * Recovering context about why certain choices were made.
* They MUST NOT be treated as current source of truth for:
  * Authentication (**Kinde** is the ONLY approved authentication provider),
  * Backend architecture (**Supabase** is backend/database ONLY, not auth),
  * Branding (only **WiseResume**, **Wise AI**, and **The Wise Cloud** are valid brands),
  * Deployment strategy,
  * Any other rules defined in `project-governance/`.
* If anything in `legacy-docs/enhancements-for-vibe-coding/` conflicts with the current codebase or any file under `project-governance/`, the governance files and current implementation ALWAYS win.
* Agents MUST NOT copy outdated patterns from `legacy-docs/enhancements-for-vibe-coding/` into new specs, plans, or code without explicitly reconciling them with the governance and explaining the change.

## 4. Core Principles
* **Preserve Working Behavior**: You MUST preserve working behavior while modernizing or cleaning legacy parts.
* **Branding Cleanup Rules**: You MUST safely remove and avoid Lovable, Bolt, and similar platform branding. However, if removal may break functionality, you MUST stop and ask before changing it.
* **Agent Workflow & Independence**: 
  * You MUST inspect the current codebase reality before any implementation.
  * You MUST NOT guess routes, files, variables, providers, tables, or behaviors.
  * If anything is unclear, you MUST ask the user before implementing.
  * You MUST always recommend the best solution and explain trade-offs clearly, especially because the owner is non-technical.
  * High-risk changes MUST be explained before implementation.
* **Git Sync / Conflict Avoidance Rules**: 
  * You MUST always avoid conflicts by syncing and inspecting the latest GitHub repository state before making changes.
  * If multiple tools may have changed the repo, you MUST first review the latest repo state to account for all changes before proceeding.

## 5. Governance Structure
This constitution is supported by the following specialized governance files:
* [PRODUCT.md](./PRODUCT.md) - Product identity, scope, and quality rules.
* [BRANDING.md](./BRANDING.md) - Official naming, UI details, and branding rules.
* [ARCHITECTURE.md](./ARCHITECTURE.md) - Technology stack, token bridge constraints, and security requirements.
* [WORKFLOW.md](./WORKFLOW.md) - Development workflows, repo sync rules, communication, and deployment.
* [DECISIONS.md](./DECISIONS.md) - Log of all major technical decisions.
* [CHANGELOG.md](./CHANGELOG.md) - Maintained record of all accepted changes to the project.

## 6. Agent Execution Instructions

The following instructions MUST be treated as a persistent system prompt for any AI agent (including AntiGravity) working on this repository. Agents MUST follow these instructions for every action, unless explicitly overridden by this constitution or other governance files.

### 6.1 General Behavior

- Always treat the current codebase as the primary source of truth.
- Always read and respect all documents under `project-governance/` before making changes.
- Do NOT guess routes, files, variables, providers, tables, or behaviors. If anything is unclear, ask the user before implementing.
- High‑risk changes MUST be explained to the user before implementation.

### 6.2 Branch and Git Discipline

- You MUST NOT create new Git branches on your own (no `feature/*`, `fix/*`, `00x-*`, or similar).
- You MUST only work on the branch explicitly specified by the user for the current task.
- You MUST NOT push directly to `main` unless the user explicitly instructs you to do so.
- Before making changes, you MUST ensure you are working against the latest state of the specified branch.

### 6.3 Testing Discipline

- For any non-trivial change (logic, UI, data flow, or configuration), you MUST run the project’s test suite (for example: `npm run test`) after applying your changes.
- A task is NOT considered complete until:
  - Code changes are applied to the specified branch.
  - The test suite has been executed.
  - Any failing tests have been either fixed or explicitly reported to the user.

### 6.4 Changelog Discipline

- Every accepted change to this repository MUST be recorded in `project-governance/CHANGELOG.md`.
- You MUST always follow the existing style, structure, and context already used in `CHANGELOG.md`. Reuse the same headings, formatting, tense, and level of detail as existing entries.
- For each change, you MUST:
  - Inspect the current contents of `project-governance/CHANGELOG.md` before adding a new entry.
  - Add a new entry in the correct place according to the existing format (typically at the top, under the appropriate version or date section, unless the file specifies a different pattern).
- Each new changelog entry MUST include, at minimum:
  - The date of the change in `YYYY-MM-DD` format.
  - The area or scope of the change (for example: `Interview`, `Portfolio`, `Tests`, `Onboarding`, etc.).
  - A concise but clear title or summary of the change.
  - A short description of what was changed and why, written in the same voice and style as existing entries.
  - References to relevant files, components, or features that were touched.
  - (If applicable) a reference to the branch name, spec ID, or task identifier associated with this change.
- You MUST NOT invent a new changelog style or structure. If you need to extend the format (for example, to add a new section or area), you MUST do it in a way that is consistent with the existing context and explain the reasoning in the entry description.

### 6.5 Task Completion Definition

For any implementation or modification task, the task is only considered “done” when all of the following are true:

1. The required code changes have been applied to the user-specified branch.
2. The test suite has been executed and test outcomes have been reported, with failures either fixed or clearly reported to the user.
3. `project-governance/CHANGELOG.md` has been updated with a new entry that:
   - Follows the existing changelog style and context.
   - Accurately describes the change, its scope, and its impact.
4. In your final summary back to the user, you MUST explicitly state:
   - What you changed in the code.
   - Which tests you ran and their result.
   - Exactly what you added or modified in `project-governance/CHANGELOG.md` (including date, scope, and the main title/summary of the entry).

Agents MUST treat these instructions as mandatory requirements for every change they make within this repository.
