# 03 — Ideas

**Last verified:** 2026-04-17
**Type:** index
**Canonical owner:** Project Atlas maintainer (see `../MAINTENANCE.md`)
**Sources (governance — supreme):**
- `project-governance/DECISIONS.md` (especially Decisions #4, #5, #8 — items here are explicitly the "not committed" side of those decisions)
- `project-governance/ARCHITECTURE.md` Rule B (no-AI scorer) and Rule C (intentionally retained orphan code)
- `replit.md` (working notes — items the team has discussed but not formally specced; e.g. server-side LinkedIn importer quotas)
- Per-row source citations are inline in the Ideas log table below.

What is in this folder: items that have been **discussed, sketched, or brainstormed** but are **not committed** — there is no spec, no plan, no roadmap entry. One‑line entries with their source.

If an idea graduates into a written plan/spec, move its entry to `../02-Planned/`. If it ships, move it to `../01-Currently Implemented/`.

---

## Ideas log

| # | Idea | Source |
|---|---|---|
| 1 | Sync GitHub repos into the public portfolio (intentionally retained orphan edge function pending UI wire-up) | `supabase/functions/fetch-github-projects/`, `project-governance/ARCHITECTURE.md` Rule C, `supabase/functions/EDGE_FUNCTION_AUDIT.md` |
| 2 | Replace deterministic ATS scorer (`score-resume`) with an AI model call | `project-governance/ARCHITECTURE.md` Rule B (explicitly forbidden without amendment) |
| 3 | WiseHire mobile responsive (Phase 1/2 are desktop-first by Decision #8) | `project-governance/DECISIONS.md` Decision #8 |
| 4 | Switch back from implicit OAuth to PKCE on Kinde when custom-domain support stabilises | `project-governance/DECISIONS.md` Decision #4 |
| 5 | Hard-delete (vs soft-delete) policy revisit for compliance edge cases | `project-governance/DECISIONS.md` Decision #5 |
| 6 | Replace in-memory LinkedIn import quotas with a `linkedin_imports` DB table for durability | `replit.md` (Server-side LinkedIn Importer section) — already on the project task list |
| 7 | Interview Coach issue backlog (UX, scoring, voice fallbacks) | `docs/issues/interview-feature-issues.md`, `docs/interview-feature-fix-plan.md` |
| 8 | Portfolio feature issue backlog (theme polish, share UX, edge cases) | `docs/issues/portfolio-feature-issues.md` |
| 9 | Reusable doc/spec/changelog/template scaffolds for governance work | `wise-templates/` (templates 01–14, 99) — sketched workflow, not yet wired into any tooling |
| 10 | "Sync GitHub" UI button in portfolio settings to wire `fetch-github-projects` | `supabase/functions/fetch-github-projects/`, governance Rule C |

---

## How to add a new idea

1. Find the source: a paragraph in `DECISIONS.md`, a deferred TODO, a brainstorm doc in `docs/`, an unwired template, etc.
2. Add one row above with a short title and a citation.
3. If the idea grows a written plan, move it to `02-Planned/` with its own card.
