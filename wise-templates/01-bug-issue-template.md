# 01 – Bug Issue Template (WiseResume)

Use this template when you want the agent to fix a specific bug in WiseResume.

```text
You are an AI agent working inside the WiseResume repository.

## Context

- Follow `project-governance/` and `.agents/rules/governance-first.md`.
- Treat `legacy-docs/enhancements-for-vibe-coding/` as historical context only.
- Auth: Kinde ONLY. Backend: Supabase ONLY. Branding: WiseResume / Wise AI / The Wise Cloud ONLY.

## Bug Description

- Title: <SHORT BUG TITLE HERE>
- Location (route / screen / component): <WHERE YOU SEE IT>
- Observed behavior: <WHAT ACTUALLY HAPPENS>
- Expected behavior: <WHAT SHOULD HAPPEN FOR THE USER>
- Steps to reproduce:
  1. <STEP 1>
  2. <STEP 2>
  3. <STEP 3>

## Constraints

- Preserve working behavior. Make the *smallest safe change* that fixes the bug.
- Do NOT change auth flows, DB schema, or deployment unless explicitly requested.
- Respect AI credits and privacy rules.

## Required Workflow

1. Sync with latest repo state.
2. Review:
   - project-governance/CONSTITUTION.md
   - project-governance/ARCHITECTURE.md
   - project-governance/WORKFLOW.md
3. Inspect relevant code (components, hooks, edge functions).
4. Explain in plain language:
   - Root cause.
   - Smallest safe fix.
5. Ask for approval if the fix is high-impact.

## Deliverables

- Implement the fix with minimal, focused changes.
- Add/update a small test if reasonable.
- Update `project-governance/CHANGELOG.md` with:
  - Date
  - Short description
  - Files touched
- Summarize what changed and why it fixes the bug.
```
