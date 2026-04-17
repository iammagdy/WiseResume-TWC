# The Wise Cloud — Platform Constitution

## 1. Purpose

This constitution establishes the supreme governance, engineering standards, and workflow rules for **The Wise Cloud** platform — which includes **WiseResume** (the AI career platform for job seekers) and **WiseHire** (the AI HR SaaS tool for companies and recruiters). This document and its accompanying files in the `project-governance/` directory constitute the ultimate instructions for any AI agents or developers working on this repository.

Both products share the same codebase, infrastructure, authentication, database, and admin tooling. They are governed by the same rules unless a specific exception is documented in this constitution or in `DECISIONS.md`.

---

## 2. Source of Truth Hierarchy

1. **The Current Codebase**: The live state of the repository MUST be treated as the primary source of truth.
2. **Governance Documents**: Files within `project-governance/` are the official guiding principles and override any other documentation.

---

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
  * Branding (only **WiseResume**, **WiseHire**, **Wise AI**, and **The Wise Cloud** are valid brands),
  * Deployment strategy,
  * Any other rules defined in `project-governance/`.
* If anything in `legacy-docs/enhancements-for-vibe-coding/` conflicts with the current codebase or any file under `project-governance/`, the governance files and current implementation ALWAYS win.
* Agents MUST NOT copy outdated patterns from `legacy-docs/enhancements-for-vibe-coding/` into new specs, plans, or code without explicitly reconciling them with the governance and explaining the change.

---

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

---

## 5. Governance Structure

This constitution is supported by the following specialized governance files:

* [PRODUCT.md](./PRODUCT.md) — Product identity, scope, feature inventory, and quality rules for both WiseResume and WiseHire.
* [BRANDING.md](./BRANDING.md) — Official naming, color palettes, UI details, and branding rules for all approved brands.
* [ARCHITECTURE.md](./ARCHITECTURE.md) — Full technology stack, authentication bridge, all database tables, all edge functions, storage buckets, AI system, WiseHire routing, and security requirements.
* [WORKFLOW.md](./WORKFLOW.md) — Development workflows, repo sync rules, communication norms, and deployment governance.
* [DECISIONS.md](./DECISIONS.md) — Log of all major architectural decisions (currently 10 decisions).
* [CHANGELOG.md](./CHANGELOG.md) — Maintained record of all accepted changes to the project.

---

## 6. Agent Execution Instructions

The following instructions MUST be treated as a persistent system prompt for any AI agent working on this repository. Agents MUST follow these instructions for every action, unless explicitly overridden by this constitution or other governance files.

### 6.1 General Behavior

- Always treat the current codebase as the primary source of truth.
- Always read and respect all documents under `project-governance/` before making changes.
- Do NOT guess routes, files, variables, providers, tables, or behaviors. If anything is unclear, ask the user before implementing.
- High-risk changes MUST be explained to the user before implementation.
- When working on WiseHire features, always enforce `account_type` routing: WiseHire features must never be accessible to `job_seeker` accounts, and WiseResume features must never be visible to `hr` accounts.
- When working on WiseResume features, confirm that changes do not accidentally affect WiseHire routes, shared schema columns, or shared edge functions in ways that break HR account behavior.

### 6.2 Branch and Git Discipline

- You MUST NOT create new Git branches on your own (no `feature/*`, `fix/*`, `00x-*`, or similar).
- You MUST only work on the branch explicitly specified by the user for the current task.
- You MUST NOT push directly to `main` unless the user explicitly instructs you to do so.
- Before making changes, you MUST ensure you are working against the latest state of the specified branch.

### 6.3 Testing Discipline

- For any non-trivial change (logic, UI, data flow, or configuration), you MUST run the project's test suite (`npm run test`) after applying your changes.
- A task is NOT considered complete until:
  - Code changes are applied to the specified branch.
  - The test suite has been executed.
  - Any failing tests have been either fixed or explicitly reported to the user.

### 6.4 Changelog Discipline

- Every accepted change to this repository MUST be recorded in `project-governance/CHANGELOG.md`.
- You MUST always follow the existing style, structure, and context already used in `CHANGELOG.md`. Reuse the same headings, formatting, tense, and level of detail as existing entries.
- For each change, you MUST:
  - Inspect the current contents of `project-governance/CHANGELOG.md` before adding a new entry.
  - Add a new entry at the top, under the appropriate date section.
- Each new changelog entry MUST include, at minimum:
  - The date of the change in `YYYY-MM-DD` format.
  - The area or scope of the change (e.g., `Interview`, `Portfolio`, `WiseHire`, `Governance`, etc.).
  - A concise but clear title or summary of the change.
  - A short description of what was changed and why.
  - References to relevant files, components, or features touched.
  - (If applicable) a reference to the spec ID or task identifier.
- You MUST NOT invent a new changelog style or structure.

### 6.5 Task Completion Definition

For any implementation or modification task, the task is only considered "done" when all of the following are true:

1. The required code changes have been applied to the user-specified branch.
2. The test suite has been executed and test outcomes have been reported, with failures either fixed or clearly reported to the user.
3. `project-governance/CHANGELOG.md` has been updated with a new entry following the existing style.
4. In your final summary back to the user, you MUST explicitly state:
   - What you changed in the code.
   - Which tests you ran and their result.
   - Exactly what you added or modified in `project-governance/CHANGELOG.md`.

---

## 7. WiseHire Governance

WiseHire follows all the same rules as WiseResume (RLS, authentication, changelog, testing discipline, bot protection, security) with the following documented exceptions:

### 7.1 Desktop-First Exception (Phase 1 & 2)
WiseHire Phase 1 and 2 are explicitly desktop-first. Mobile responsive support is deferred to Phase 3. This is documented in Decision #8. When Phase 3 begins, WiseHire must be brought to the same `xs`/375px mobile baseline as WiseResume.

### 7.2 No Free Tier
WiseHire has no free tier. When a trial expires and no coupon/plan is active, the user sees a "Contact Us" lockout screen. There is no partial-access fallback.

### 7.3 Invite-Only Access (Pre-Launch)
During pre-launch, WiseHire does not accept open sign-ups. A waitlist captures interest. Only admin-generated signed invite links (HMAC-SHA256, 72-hour expiry) bypass the waitlist gate.

### 7.4 Account Type Isolation
The `account_type` field on `profiles` is permanent and immutable post-signup. Every WiseHire route (`/wisehire/*`) MUST enforce `account_type = 'hr'`. Every WiseResume route MUST be inaccessible to `hr` accounts. This must be enforced at both the frontend router and the edge function level.

### 7.5 Candidate Data Privacy
Candidate data (resumes, briefs, scorecards) belongs to the HR user who uploaded it — not to the candidate. However, it must be handled with care: stored in access-controlled Supabase Storage (`candidate-resumes` bucket), deleted after the 30-day post-cancellation window, and never shared with other HR users. Talent Pool data is a separate concept — job seekers opt in explicitly and can opt out at any time.

### 7.6 Shared Infrastructure Rules
WiseHire reuses: Kinde auth, Supabase database, `aiClient.ts`, `parse-resume` edge function, `admin-email-actions` edge function, `admin-manage-coupons` edge function, the coupon/trial system, the dev kit, and Resend for email. Any modification to shared infrastructure must be validated for impact on both WiseResume and WiseHire.
