# `project-governance/`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `project-governance/`.

**Canonical owner:** Platform-level rules, ADRs, and process. Atlas defers to these files as canonical for everything they cover.

---

| File | What it owns |
|---|---|
| `CONSTITUTION.md` | Top-level platform rules. |
| `ARCHITECTURE.md` | "Source of architectural truth" + security rules. Cited by `replit.md`. |
| `PRODUCT.md` | Platform identity + product governance. |
| `BRANDING.md` | Approved branding rules (logos, colors, voice). |
| `DECISIONS.md` | Architectural Decision Records (ADRs). Every major technical decision MUST be appended here. |
| `WORKFLOW.md` | Development & deployment workflow. |
| `Speckit-Reference.md` | EN/AR Speckit command reference. |
| `AUDIT-2026-04.md` | Outcome of the April-2026 governance refresh. |
| `CHANGELOG.md` | Local repo changelog. (The user-facing changelog at `/whats-new` reads `public/changelog.json`.) |

## Hard rules
- Atlas is a **reference index**; it cannot override `CONSTITUTION.md`, `ARCHITECTURE.md`, `PRODUCT.md`, `BRANDING.md`, or `DECISIONS.md`. If Atlas conflicts with these, the governance docs win and Atlas must be corrected.
- New ADRs must be appended to `DECISIONS.md` with a date — do not modify existing ADRs.
- WiseHire / WiseResume product-isolation rule (Constitution §7.4) is binding: never share components across account types.
