# `docs/`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `docs/`.

**Canonical owner:** Engineering docs that don't fit Atlas's "card per surface" model — long-form audits, design docs, postmortems, ops runbooks, screenshots.

---

## Top-level docs

| File | Topic |
|---|---|
| `backend.md` | Canonical backend architecture (as of 2026-04-18). Companion to Atlas's per-edge-fn cards. |
| `AI_TOOLS_AUDIT.md` | Read-only audit of every AI-powered edge function. |
| `ai_features_design.md` | 8-pack AI features tech design (DB schema + UI components). |
| `db-unused-index-analysis.md` | April 21, 2026 unused-index audit (32 indexes flagged). |
| `openrouter2-deployment.md` | OpenRouter 2 managed-provider deployment runbook (Tasks #13/#14). |
| `tailor-tool-backlog.md` | Tailor tool backlog + health audit (3 docs combined). |

## Subfolders

| Folder | Contents |
|---|---|
| `audits/` | Dated audit reports (AI tools reliability, editor crash audit). |
| `features/` | Per-feature design notes (e.g. `trial-resume.md`). |
| `issues/` | Per-feature fix plans (interview, portfolio). |
| `landing/` | Landing-page audit + Phase 6 verification + scroll-stack diagnosis. |
| `ops/` | Operational runbooks: API key encryption rotation, auth refresh-token reuse, PWA removal verification, stale-v3.4 postmortem. |
| `product/` | `PRD.md`. |
| `screenshots/` | Static screenshots referenced from the docs above. |

## Hard rules
- Atlas does not duplicate these docs — it links to them. If a card needs context that lives here, link, don't copy.
- `ops/` runbooks are operational truth; cite them in incident response.
