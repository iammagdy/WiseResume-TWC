# Portfolio visitor count + completion-bar accuracy fix (2026-06-23)

**Last verified:** 2026-06-23
**Type:** stability-fix reference card
**Branch / PR:** `claude/clever-volta-cnv3wt` / PR #119
**Sources:**
- `api/track-portfolio-view.ts`, `server/index.ts` (visit beacon write path)
- `src/hooks/usePortfolioAnalytics.ts` (owner dashboard read)
- `src/hooks/usePortfolioTracking.ts`, `src/components/portfolio/editor/VisitorsTab.tsx`
- `src/pages/PortfolioEditorPage.tsx`, `src/components/portfolio/editor/CompletionScoreBar.tsx`
- `src/hooks/useResumes.ts` (resume JSON-string storage)
- Live Appwrite schema inspection of `main/portfolio_visits`

**Canonical owner:** Project Atlas maintainer.

---

## Symptoms (owner-reported)

1. **Visitors tab always shows 0** ("No visitors yet") on the portfolio editor,
   despite many real visits.
2. **Completion bar reports wrong data** — "Work experience" (+15%) and "Skills"
   (+10%) shown as *Missing* even though the linked resume has them.

Both were root-caused before fixing.

---

## Root cause #1 — visitor count (schema/code drift, silent write failures)

The public visit beacon (`api/track-portfolio-view.ts`, mirrored in
`server/index.ts`) writes these fields to `portfolio_visits`:

```
username, ref, sections_viewed, sections_timing, time_spent_seconds, device, ab_variant
```

and the owner dashboard (`usePortfolioAnalytics` → `docToVisit`) reads them back
via `Query.equal('username', …)` + `Query.orderDesc('$createdAt')`.

**But the live `main/portfolio_visits` collection had a completely different
column set** — `user_id, portfolio_id, referrer, country, device_type, page,
utm_source` (+2) — and **zero indexes**. **None** of the attributes the code
writes existed. Because the beacon is fire-and-forget (errors swallowed), every
`createDocument` failed silently with *"Unknown attribute"*.

**Evidence:** the collection had **0 rows total** — not one visit had ever been
recorded for any user. The read query also couldn't match (no `username`
attribute / index).

> Note: even with the schema correct, production writes require
> `APPWRITE_PROJECT_ID` + `APPWRITE_API_KEY` in the Vercel env, or
> `/api/track-portfolio-view` returns `204` without writing (same key the
> "I'm Interested" feature uses).

## Root cause #2 — completion bar (JSON string vs. array)

`useResumes()` returns **raw Appwrite documents** where `skills` and
`experience` are **JSON-encoded strings** (`resumeDataToDb` stores them via
`JSON.stringify`). The completion logic in `PortfolioEditorPage` tested
`Array.isArray(selectedResume?.skills)` / `.experience` on the raw string —
which is **always `false`** — so those items were perpetually flagged missing.

**Evidence:** the reporting user's resume holds 15 skills + multiple experiences,
all stored as JSON strings.

---

## Fixes

### Visitor count (data-layer migration — applied to production)
- Added the missing **optional** attributes to `main/portfolio_visits`
  (`username`, `ref`, `sections_viewed` [array], `sections_timing`,
  `time_spent_seconds` [int 0..86400], `device`, `ab_variant`, `short_link_id`,
  `company_name`, `city`) plus a **key index `idx_pv_username`** for the
  dashboard lookup. Additive, backward-compatible, never touches existing rows
  or permissions.
- Reproducible script: **`scripts/setup_portfolio_visits_schema.cjs`** (idempotent,
  same pattern as `setup_portfolio_interactions_schema.cjs`).
- **Verified end-to-end against production:** a beacon-shaped write now succeeds;
  the dashboard's exact `username` query returns it; the verification row was
  deleted so analytics start clean (table back to 0 rows).

### Completion bar (code fix + regression test)
- New pure helper `src/lib/portfolioCompletion.ts` →
  `deriveResumeCompletion(resume)` parses `skills`/`experience` with
  `parseDbJson` before counting (tolerates JSON strings, arrays, null/malformed).
- `PortfolioEditorPage` now consumes the helper for `hasExperience`, `hasSkills`,
  and `skillsCount` (drives both `buildCompletionItems` and the strength checks).
- `parseDbJson` exported from `useResumes.ts`.
- Regression test `src/lib/__tests__/portfolioCompletion.test.ts` (4 cases) locks
  in the JSON-string contract.

---

## Status & open items

- **Visitor schema fix:** live in production now (DB change, independent of merge).
  Real visits record going forward, provided the Vercel `APPWRITE_API_KEY` /
  `APPWRITE_PROJECT_ID` are set. If visits still read 0 after real traffic, check
  that env var first.
- **Completion fix:** ships to the live app on merge of PR #119 (frontend via Vercel).
- **Unrelated red checks:** `AI Gateway Hub` build failure is the **pre-existing
  `ai-gateway` GitHub-App auto-build issue** documented in the PR #117 handover
  (empty `providerRootDirectory` → builds whole repo → builder killed); this PR
  changes **no** function build inputs. `TestSprite "No tests detected"` is the
  standing repo gate (separate E2E platform; does not recognise vitest units).
