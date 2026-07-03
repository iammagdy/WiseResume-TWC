# `wise-templates/`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `wise-templates/`.

**Canonical owner:** Author / agent process templates.

---

> **Naming note:** despite the name, `wise-templates/` does **not** hold resume templates. Resume templates live under `src/components/templates/`. This folder holds **markdown templates** for issue / spec / changelog / governance artifacts.

| Template | Used for |
|---|---|
| `01-bug-issue-template.md` | Bug reports. |
| `02-ui-issue-template.md` | UI-specific issues. |
| `03-feature-spec-template.md` | New feature specs (precedes a SpecKit spec under `specs/`). |
| `04-refactor-template.md` | Refactor proposals. |
| `05-changelog-version-template.md` | Versioned changelog entries. |
| `06-settings-changelog-ui-template.md` | Settings-page changelog UI updates. |
| `07-cleanup-unnecessary-files-template.md` | Cleanup proposals. |
| `08-branding-foreign-app-check-template.md` | Branding consistency checks against external apps. |
| `09-readme-docs-update-template.md` | README / docs updates. |
| `10-governance-prefix-template.md` | Governance task prefix template. |
| `11-full-governance-audit-template.md` | Full governance audit. |
| `12-ui-analyze-template.md` | UI analysis report. |
| `13-testing-strategy-template.md` | Testing strategy proposals. |
| `14-unit-integration-test-template.md` | Test-suite plan. |
| `99-add-new-template.md` | Meta — how to add a new template. |
| `WiseResume-Templates.md` | Index/catalog of the templates above. |

## Hard rules
- Use these templates verbatim for the artifacts they cover — keeps audits / reviews consistent.
- New template kinds must follow `99-add-new-template.md` and bump the numeric prefix.
