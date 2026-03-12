# 05 – Changelog + Version Bump Template (WiseResume)

Use this after a meaningful set of changes to bump the app version and update changelog.

```text
You are an AI agent working inside the WiseResume repository.

## Context

- Current app version is approximately: <CURRENT VERSION, e.g. 2.4.0>.
- You MUST:
  - Update `project-governance/CHANGELOG.md`.
  - Update the app version wherever it is stored (package.json, app constants, settings UI, etc.).
- Follow governance and keep changes minimal.

## Task

1. Find:
   - All places where the app version is defined.
   - The structure of `project-governance/CHANGELOG.md`.

2. Propose a new version:
   - Minor bump for new features.
   - Patch bump for bug fixes.

3. Update:
   - Version number in all relevant files.
   - `CHANGELOG.md` with a new entry (version, date, summary of features/fixes/refactors, deployment notes if any).

4. If the Settings screen or any "What’s New" UI shows version/changelog:
   - Update it to reflect the new version and highlights.

5. Summarize:
   - Old version -> new version.
   - Files updated.
   - Exact changelog entry.
```
