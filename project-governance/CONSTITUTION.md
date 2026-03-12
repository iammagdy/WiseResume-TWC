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
