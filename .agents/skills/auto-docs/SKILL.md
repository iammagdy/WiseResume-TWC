---
name: auto-docs
description: After every completed task or fix, automatically update documentation in two places following the Project Atlas structure: CHANGELOG.md (technical English) and Project Atlas/04-For You (Plain Language)/ (plain English for the owner). Always do this before marking any task complete.
---

# Auto Documentation After Every Fix

After finishing any task, bug fix, or feature — before calling mark_task_complete — you MUST update documentation in TWO places.

---

## Place 1 — `CHANGELOG.md` (Technical, English only)

The root `CHANGELOG.md` is a **technical record for engineers**. Rules:
- English only
- Include: file names, function/hook/component names, DB migration names, API endpoints, exact behavior change
- No Arabic, no plain-language explanations
- Match the existing style of entries already in the file (e.g. `## YYYY-MM-DD — Title (Task #N)` header, bullet points with `**Component** (path):` format)

---

## Place 2 — `Project Atlas/04-For You (Plain Language)/`

This folder is written **for the product owner** — no code, no file paths, no jargon.

### Which file to update:

| Type of change | File to update |
|---|---|
| New user-facing feature | `current-features.md` |
| Behind-the-scenes improvement (performance, cleanup, stability, security) | `stability-improvements.md` |
| Planned feature now confirmed | `coming-soon.md` |
| Idea promoted to planned | `under-discussion.md` → `coming-soon.md` |

### Plain-language entry format:

```markdown
## [What changed — written as a benefit, not a task title] (YYYY-MM-DD)

**What was the situation:** [The problem before the fix, in one sentence.]

**What changed:** [What was done, in plain words. No file names, no code.]

**What you'll notice:** [What the owner or user will see differently. If nothing visible changed, say so.]
```

### Rules for plain-language entries:
- No code snippets
- No file paths
- No technical acronyms unless explained in the same sentence
- Write in the same tone as the existing entries in `stability-improvements.md`
- Update `**Last verified:**` at the top of the file to today's date

---

## Also update `replit.md` when:
- A new architectural pattern is introduced (new shared hook, new cache key, new DB table)
- Infrastructure changes (new endpoint, new migration file, new env var)
- Key constraints or rules change

Do NOT update replit.md for routine bug fixes or small UI changes.

---

## Checklist before mark_task_complete

- [ ] `CHANGELOG.md` entry added (technical English)
- [ ] Correct Atlas `04-For You` file updated (plain English)
- [ ] `replit.md` updated if architecture changed
- [ ] `**Last verified:**` date updated in the Atlas file
