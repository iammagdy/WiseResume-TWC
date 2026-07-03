# PR #129 Merge Closeout

**Date:** 2026-06-26
**PR:** [#129 — Audit 2026-06-26 repair: F1 manifest, F9 editor CI, F7 lockfiles, docs sync](https://github.com/iammagdy/WiseResume-TWC/pull/129)
**Branch:** `repair/audit-findings-2026-06-26` → `main`
**Merge commit:** `7794704910fe05ceedbce9b4e777d4602204ad9b`
**Merged at:** 2026-06-26T02:55:25Z
**Merge method:** Merge commit (standard)

## Checks Status at Merge

| Check | Status | Notes |
|-------|--------|-------|
| PR Validation — Typecheck + portfolio tests | SUCCESS | Required check passed |
| Vercel (PR preview) | SUCCESS | Preview deployment completed |
| Vercel Preview Comments | SUCCESS | Bot comment posted |
| TestSprite Pre-Check | FAILURE | Advisory (non-required); pre-existing test failures in unrelated files |

**Merge state:** `MERGEABLE` / `UNSTABLE` — the failing TestSprite check was non-required and did not block merge.

## Vercel Production Deployment

- **Status:** SUCCESS — "Deployment has completed"
- **Commit:** `7794704910fe05ceedbce9b4e777d4602204ad9b`
- Vercel auto-deployed from `main` on merge. Production is now serving the new commit.

## Appwrite Deploy

**Not required.** No Appwrite hub source code was changed in this PR. The source hash manifest was updated to reflect already-deployed hubs (from the DevKit analytics merge). No `target=all` was run.

Appwrite deploy should only be considered if F2 manual verification reveals live drift.

## What Was Merged (4 commits)

1. `cc7d72ec` — F1: Refresh source hash manifest (3 hub hashes updated)
2. `de1cfab3` — F9: Restore PortfolioEditorPage CI coverage (test-only mock fixes)
3. `853ce2cc` — F7: Add missing portfolio-hub package-lock.json files (4 hubs)
4. `5b9678bb` — F4/F5/F6: Sync docs (CHANGELOG, SOURCE_OF_TRUTH_MAP, RULES, audit reports)

## Remaining Manual Owner Checklist

| Finding | Action | Status |
|---------|--------|--------|
| F2 | Verify Appwrite live deployment hashes match current source | **Pending owner verification** |
| F3 | Verify Vercel production serves latest `main` commit | **Pending owner verification** |
| F13 | Confirm `VITE_TURNSTILE_SITE_KEY` is set in Vercel | **Pending owner verification** |
| F14 | Confirm Appwrite GitHub App remains suspended | **Pending owner verification** |

## Known Follow-up: Stale Tests (separate PR)

The following pre-existing test failures are unrelated to PR #129 and should be addressed in a separate follow-up PR:

- **`src/pages/__tests__/AIStudioPage.test.tsx`** — 2 failures: `getByRole("button", { name: /close humanize…/ })` not found
- **`src/components/templates/__tests__/WiseResumeClassicTemplate.test.tsx`** — 1 failure: expects `href="https://resume.thewise.cloud"` but gets `href="https://wiseresume.app"`

These failures exist on `main` prior to this PR and do not block production.

## Backlog Items (not addressed in this PR)

- **F8:** Consider adding `vitest.config.ts` deps optimizer for `pako`/`docx`/`pdfjs-dist`
- **F10:** Prune stale `claude/*` branches (owner decision)
- **F12:** Consider CI timeout hardening
- **F15:** Consider adding full-suite CI gate (beyond PR Validation scoped tests)
