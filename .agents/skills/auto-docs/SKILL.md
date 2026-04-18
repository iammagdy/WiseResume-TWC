---
name: auto-docs
description: After every completed task or fix, automatically update CHANGELOG.md with two versions: a technical section for developers and a simple Arabic section for the product owner. Always do this before marking any task complete.
---

# Auto Documentation After Every Fix

After finishing any task, bug fix, or feature — before calling mark_task_complete — you MUST update `CHANGELOG.md` with two clearly labeled sections for that entry.

## Rule

Every CHANGELOG entry must contain BOTH sections:

### Section 1 — `### للمطورين` (Technical)
- File names changed
- Function/hook/component names
- DB migrations and SQL changes
- API endpoints added or modified
- Exact behavior change with technical reasoning

### Section 2 — `### بالبساطة` (Simple Arabic for product owner)
- Written fully in Arabic
- No code, no file names, no jargon
- Explain WHAT changed and WHY it matters to the user
- Maximum 3–5 short sentences
- Written as if explaining to a non-technical person

## CHANGELOG Entry Format

```markdown
## YYYY-MM-DD — [Task Title] (Task #N)

### للمطورين
- **ComponentName** (`path/to/file.tsx`): what changed and why technically.
- **DB**: migration file name and what it does.
- **API**: endpoint added/changed and its behavior.

### بالبساطة
اللي اتغير في الجزء ده هو ... يعني دلوقتي لما ... هيبقى ...
النتيجة إن المستخدم هيلاقي ... بدل ما كان ...
```

## When to Apply

- After completing ANY task (feature, bug fix, security patch, cleanup)
- After post-merge setup for task-agent work
- After any hotfix applied directly

## Files to Update

1. `CHANGELOG.md` — always, with both sections
2. `replit.md` — only when architecture, infrastructure, or key patterns change

## Important

- The simple Arabic section is NOT optional
- Never write only the technical section
- Keep simple Arabic free of English technical terms
- The product owner reads the simple section to understand progress
