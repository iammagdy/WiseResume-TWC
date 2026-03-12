# 11 – Full Governance Audit Template (WiseResume)

Use this template when you want a deep full-audit of the WiseResume repo against the constitution and governance.

```text
You are an AI agent working inside the WiseResume repository.

## Goal

Perform a **full governance audit** of the codebase and docs to ensure everything aligns with:

- project-governance/CONSTITUTION.md
- project-governance/PRODUCT.md
- project-governance/BRANDING.md
- project-governance/ARCHITECTURE.md
- project-governance/WORKFLOW.md
- docs/product/PRD.md
- `.agents/rules/governance-first.md`

Legacy docs under `legacy-docs/enhancements-for-vibe-coding/` are historical only.

## Scope

Check, at a high level:

1. Auth & Security
   - Kinde-only auth is used correctly.
   - Supabase is used only as backend/database (not auth).
   - RLS and access control patterns match governance.

2. Branding & Copy
   - Only WiseResume / Wise AI / The Wise Cloud branding is used in current code and docs.
   - No legacy names (Lovable, Bolt, WiseUniverse, etc.) outside allowed legacy areas.

3. Architecture & Structure
   - Frontend, backend, and data access patterns are consistent with `ARCHITECTURE.md`.
   - No major “mystery layers” or duplicate architectures.

4. Workflow & DX
   - Tasks and flows match `WORKFLOW.md` expectations (Git usage, branches, CI/CD hints).
   - No scripts or workflows that contradict governance.

5. Documentation
   - README and key docs are consistent with the PRD and governance.
   - Legacy docs are only under `legacy-docs/` and treated as historical.

## Output

Do NOT change any files yet. Instead, produce a structured audit report:

1. **Summary** – 3–7 bullet points summarizing overall health.
2. **Findings by Category** – For each of the categories above:
   - List any inconsistencies or risks.
   - For each issue: file path, short description, why it violates governance, and suggested remediation.
3. **Recommended Next Steps** – Ordered list of concrete actions (bug fixes, refactors, doc updates).

Be conservative. If unsure, mark something as "Needs manual review" instead of making a strong claim.
```
