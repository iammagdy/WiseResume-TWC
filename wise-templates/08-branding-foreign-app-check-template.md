# 08 – Branding / Foreign App Check Template (WiseResume)

Use this to detect any branding that does not belong to WiseResume.

```text
You are an AI agent working inside the WiseResume repository.

Task:
Scan the repo for unexpected branding or references that do NOT belong to WiseResume, Wise AI, or The Wise Cloud.

Rules:
- Follow branding rules in `project-governance/BRANDING.md` and the constitution.
- `legacy-docs/enhancements-for-vibe-coding/` is allowed to contain old names, but new code/docs MUST NOT.

Steps:
1. Search for suspicious names such as:
   - Lovable
   - Bolt
   - WiseUniverse
   - Names of other apps or platforms
2. For each match, report:
   - File path
   - Line/snippet
   - Why it is a problem (or confirm if it is allowed in legacy/docs).
3. For real problems:
   - Propose a safe replacement consistent with branding rules.
   - Note if changing it might break functionality (env var, API endpoint, etc.).

Do NOT change files automatically until I approve specific replacements.

Output:
- Report of branding violations or foreign app references.
- Suggested fixes that preserve functionality.
```
