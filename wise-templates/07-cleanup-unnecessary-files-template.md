# 07 – Cleanup Unnecessary Files Template (WiseResume)

Use this to scan for files that might be safe to remove or move to legacy.

```text
You are an AI agent working inside the WiseResume repository.

Task:
Perform a conservative scan for **unnecessary or redundant files** based on:

- project-governance/CONSTITUTION.md
- project-governance/ARCHITECTURE.md
- project-governance/WORKFLOW.md
- The existence of `legacy-docs/enhancements-for-vibe-coding/` for historical content.

Rules:
- Do NOT delete anything automatically.
- Identify and list candidates only, grouped by category, for example:
  - Old build artefacts
  - Unused images/assets
  - Modules not imported anywhere
  - Old prompts or notes that should live in `legacy-docs/`

For each candidate, explain:
- Why you think it is unnecessary.
- What could break if we removed it.
- Whether it should be deleted or moved to `legacy-docs/` instead.

Output:
- A checklist of suggested deletions/moves.
- No repo changes until I explicitly approve specific items.
```
