# Stability Fixes

**Last verified:** 2026-05-05
**Type:** index
**Canonical owner:** Project Atlas maintainer (see `../../MAINTENANCE.md`) + the per-phase task briefs under `.local/tasks/phase-*.md`
**Sources (governance — supreme):**
- `project-governance/CONSTITUTION.md` §6.5–§6.6 (Documentation Discipline)
- `project-governance/CHANGELOG.md` (entries dated 2026-04-18 — Stability Fixes Phases 1–5 backfill)
- `.local/tasks/phase-1-db-integrity.md` … `.local/tasks/phase-5-data-lifecycle.md` (per-phase task briefs)

---

## What is in this folder

This folder collects **engineering reference cards for cross-cutting stability work** that does not naturally fit any single page, edge function, or database table card. It exists so that future agents — and the owner — can see what was done to harden the platform without having to chase the story across half a dozen unrelated cards.

Cards in this folder describe shipped or in-flight stability fixes from the 2026-Q2 stability initiative (Phases 1–5). Per `project-governance/CONSTITUTION.md` §6.6, every stability change must also have a matching `project-governance/CHANGELOG.md` entry and (when user-visible) a plain-language paragraph in `04-For You (Plain Language)/current-features.md` or its sibling stability summary.

## Contents

- [Phase 1 — Database integrity & indexes](./phase-1-db-integrity-and-indexes.md)
- [Phase 2 — Frontend re-render & bundle fixes](./phase-2-frontend-rerender-and-bundle.md)
- [Phase 3 — Background work hygiene](./phase-3-background-work-hygiene.md)
- [Phase 4 — AI provider resilience (circuit breaker)](./phase-4-ai-provider-resilience.md)
- [Phase 5 — Analytics data lifecycle](./phase-5-analytics-data-lifecycle.md)
- [Phase 6 — DevKit hardening](./phase-6-devkit-hardening.md)
- [Phase 7 — Deploy & DevTools hardening](./phase-7-deploy-and-devtools-hardening.md)
- [Phase 8 — Production edge-function routing](./phase-8-prod-edge-function-routing.md)
- [Phase 9 — Stale-chunk silent recovery](./phase-9-stale-chunk-silent-recovery.md)
- [Phase 10 — Editor session restore + dashboard cold-load cache](./phase-10-editor-session-and-dashboard-cache.md)
- [Phase 11 — PDF export migration to Puppeteer (text-selectable across all surfaces)](./phase-11-pdf-export-puppeteer-migration.md)
- [Phase 12 — Editor audit Phase 2: keyboard context split, layout cleanup, label fixes, DEV-only logger](./phase-12-editor-audit-phase-2.md)
- [Editor ATS panel relabelled as "Job Match Analysis" / "Keyword Match Score"](./ats-keyword-match-clarity.md)
- [GitHub origin sync — Replit ↔ GitHub reconciled (Task #70 v2)](./github-origin-sync-task-70.md)
- [Kinde custom domain split — `auth.thewise.cloud` separated from `resume.thewise.cloud`](./kinde-custom-domain-split.md)
- [Task #15 — DevKit AI model catalog: cron fix, per-provider caps, non-chat filter](./task-15-ai-model-catalog-cron.md)
- [Task #64 — Tailor UX bug fixes: URL/paste toggle, placeholder text, dark-mode text contrast, progress regression on retry, resume-switch toast colour](./task-64-tailor-ux-bugs.md)
- [Task #65 — Tailor animated demo panel: looping Before→After animation in the desktop right panel empty state](./task-65-tailor-animated-demo-panel.md)
- [Task #66 — Tailor AI reliability: prompt token-budget guard, Groq fallback on 5xx, client retry delay 4s, upstream-specific retry message](./task-66-tailor-ai-reliability.md)
