# WiseResume All-Findings Repair Report (F1–F15)

**Date:** 2026-06-26
**Branch:** `repair/audit-findings-2026-06-26` (off `main@a4d497f9`)
**Mode:** implementation — scoped commits, no Appwrite deploy, no `target=all`, Appwrite GitHub App left suspended, no secrets touched.
**Source audit:** `Project Atlas/Comprehensive Audit 2026-06-26/WiseResume_Comprehensive_Audit_Report.md` (verdict PASS WITH WARNINGS, no confirmed P0).

---

## 1. Executive Summary

All code-actionable findings are fixed: **F1** (the P1 deploy blocker), **F9** (the P1 CI gap), and **F7** (housekeeping). **F11** was found already-implemented and left unchanged. **F4/F5/F6** documentation drift is synced. **F2/F3/F13/F14** require Appwrite Console / Vercel / GitHub access the agent does not have and are handed off as an owner checklist. **F8/F10/F12/F15** are documented as backlog/monitored with no safe code change.

**One material discovery during F1:** the source-hash manifest was stale for **three** hubs, not the two the audit caught — `email-service` (changed by commit `fbd24841` on 2026-06-23, after the manifest was last generated) was also drifted. All three are now corrected; the deploy gate passes.

No architecture/editor/auth/API/routing/AI-logic was changed. The `hasMeaningfulChanges` honesty guardrail is intact.

---

## 2. Findings Fixed

### F1 — Stale source-hash manifest (P1, deploy blocker) — FIXED
- **Action:** `node scripts/compute-source-hashes.mjs` → committed `src/lib/devkit/sourceHashes.generated.json`.
- **Diff:** `generatedAt` + three hub hashes:
  - `admin-visitor-analytics` `21bacdc1…` → `f22a75b5…`
  - `track-visitor-event` `94ed10b2…` → `6cc18cdf…`
  - `email-service` `708cbafb…` → `255a4afe…` (pre-existing drift from `fbd24841`, surfaced + owner-approved to include)
- **Proof gate now passes:** after commit, re-running `compute-source-hashes.mjs` + `git diff --exit-code -- src/lib/devkit/sourceHashes.generated.json` returns exit 0 — i.e. `deploy-appwrite-hubs.yml`'s "Ensure source hash manifest is committed" step will no longer fail.
- **Commit:** `cc7d72ec` — `chore(devkit): refresh source hash manifest after analytics merge`
- **Deploy needed:** none to fix the gate (manifest is a repo artifact; no hub runtime change).

### F9 — PortfolioEditorPage tests disabled in CI (P1) — FIXED
- **Root cause (verified by reproduction):** a **test-mock defect**, not an editor bug.
  1. The `@/hooks/useResumes` mock omitted `parseDbJson`, which `deriveResumeCompletion` (`src/lib/portfolioCompletion.ts:1`, used at `PortfolioEditorPage.tsx:1221`) imports → throw on render.
  2. The deeper hang: the `useProfile`/`useResumes` mocks returned a **fresh object per render**, so the page's `useEffect(…, [profile])` (`PortfolioEditorPage.tsx:237/327`, which calls ~40 `setState`) re-fired every render → infinite render loop (a synchronous loop `testTimeout` can't interrupt → CI hang). The real hooks are react-query-stable, so production never loops.
- **Fix (test-only):** mocks now return **stable references**; added the `parseDbJson` mock; relaxed one assertion to `queryAllByText` (the fully-mounted page renders "portfolio" in several places). **No editor source changed.**
- **Re-enabled** both specs in `.github/workflows/pr-validation.yml`; updated the stale NOTE.
- **Validation:** `npx vitest run PortfolioEditorPage.test.tsx PortfolioEditorPage-D8.test.tsx` → **5 passed**, ~10s, no hang. `tsc --noEmit` exit 0.
- **Commit:** `de1cfab3` — `test(editor): restore PortfolioEditorPage CI coverage`

### F7 — Untracked portfolio-hub package-lock files (P2) — FIXED
- **Decision basis:** 21/25 hubs already track `package-lock.json`; `deploy_hubs.cjs:163-169` runs `npm install` then tars the hub dir. Convention + reproducibility → commit the 4 missing ones. Each verified as a valid `lockfileVersion: 3` file matching its hub `package.json`.
- **Commit:** `853ce2cc` — `chore(repo): close low-risk audit housekeeping`

---

## 3. Findings Already Addressed (No Change)

### F11 — Tailoring "no meaningful changes" copy — ALREADY ADDRESSED
`src/pages/TailoringHubPage.tsx:128-131,396-407,722-751` already distinguishes a recoverable **warning** (`tailorWarning`) from a hard failure: amber styling, title "No changes detected", honest+actionable copy, and **Retry tailoring** + **Edit job description** buttons; it does not navigate/save/show false success. `hasMeaningfulChanges` (`src/lib/tailorMerge.ts:184-190`) is unchanged. No code change made; would only weaken honesty to alter further.

---

## 4. Findings Verified — Owner Action Required (no agent access)

| ID | What to verify | How |
|----|----------------|-----|
| F2 | Appwrite active deployments for `admin-visitor-analytics` / `track-visitor-event` match current source hashes `f22a75b5…` / `6cc18cdf…` (and `email-service` = `255a4afe…`) | Appwrite Console → Functions → each function → Deployments. If a hash differs, request an owner-approved **narrow** deploy `--only=admin-visitor-analytics,track-visitor-event` (or add `email-service`). **Do NOT run `target=all`.** |
| F3 | Vercel production serves `main@a4d497f9` | Vercel dashboard → latest production deployment commit; confirm `wiseresume.app` shows DevKit "App Overview" default tab + landing micro-interactions. |
| F13 | `VITE_TURNSTILE_SITE_KEY` set in Vercel | Vercel → Project → Settings → Environment Variables; then load a published portfolio contact form → expect no "Security check required". |
| F14 | Appwrite GitHub App remains suspended | GitHub → Settings → Applications → Appwrite → confirm suspended / `WiseResume-TWC` not granted; confirm no `vcs` build fires on push. |

> The repair branch changes **no** Appwrite/Vercel/secret state, so these are verifications, not regressions introduced here.

---

## 5. Findings Documented as Backlog / Monitored (No Safe Code Change)

- **F8 — `.impeccable` submodule scratch** (`critique/`, `design.json`, `live/`): left untouched and unstaged. Changing submodule-internal ignore rules requires owner approval; recommend ignoring at the submodule level in a separate, owner-approved step.
- **F10 — stale remote `claude/*` branches:** verify-only. Merged into `origin/main`: `claude/clever-volta-cnv3wt`, `claude/confident-johnson-ruvmnw`, `claude/happy-bardeen-jsqvpj`. Not-merged (likely squash-merged PRs or abandoned): `claude/epic-maxwell-evkfa4`, `claude/fervent-faraday-iwuf82`, `claude/gifted-knuth-wq79sc`, `claude/jolly-hawking-wijwt3`, `claude/serene-ride-nk2c6t`. **No branch deleted.** Recommend owner confirm each PR status before pruning.
- **F12 — portfolio gate CDN propagation (>40s):** not reproducible from code; documented as monitored. Investigate `get-public-portfolio` edge cache TTL only if user-reported.
- **F15 — heavy `postinstall` puppeteer step:** safe while the Appwrite GitHub App stays suspended (no VCS auto-build packs the repo). Revisit only if VCS auto-build is ever re-enabled.

---

## 6. Documentation Sync (F4/F5/F6) — DONE

- **F4:** `Project Atlas/CHANGELOG.md` — added entries for 2026-06-24 (landing UX), 2026-06-25 (DevKit analytics), and 2026-06-26 (this repair pass); bumped "Last verified" to 2026-06-26.
- **F5:** `Project Atlas/SOURCE_OF_TRUTH_MAP.md` — app version `4.1.5` → `4.7.3`.
- **F6:** "Last verified" refreshed to 2026-06-26 in `RULES.md` (rules re-read, still current) and `SOURCE_OF_TRUTH_MAP.md` (scoped note: only app version re-verified; inventory figures unchanged).

---

## 7. Files Changed

| File | Finding | Change |
|------|---------|--------|
| `src/lib/devkit/sourceHashes.generated.json` | F1 | Regenerated (3 hub hashes + timestamp) |
| `src/pages/__tests__/PortfolioEditorPage.test.tsx` | F9 | Stable mocks, `parseDbJson`, `queryAllByText` |
| `.github/workflows/pr-validation.yml` | F9 | Re-enabled both editor specs; updated note |
| `appwrite-hubs/get-public-portfolio/package-lock.json` | F7 | Added (tracked) |
| `appwrite-hubs/portfolio-gate/package-lock.json` | F7 | Added (tracked) |
| `appwrite-hubs/portfolio-settings/package-lock.json` | F7 | Added (tracked) |
| `appwrite-hubs/verify-portfolio-password/package-lock.json` | F7 | Added (tracked) |
| `Project Atlas/CHANGELOG.md` | F4 | 3 new entries + verified date |
| `Project Atlas/SOURCE_OF_TRUTH_MAP.md` | F5/F6 | Version + verified date |
| `Project Atlas/RULES.md` | F6 | Verified date |
| `Project Atlas/Comprehensive Audit 2026-06-26/…` | — | Audit report + this repair report |

---

## 8. Commits Created

1. `cc7d72ec` — `chore(devkit): refresh source hash manifest after analytics merge` (F1)
2. `de1cfab3` — `test(editor): restore PortfolioEditorPage CI coverage` (F9)
3. `853ce2cc` — `chore(repo): close low-risk audit housekeeping` (F7)
4. `docs(atlas): sync audit findings and source of truth` (F3 docs + F4/F5/F6 + reports) — this commit

---

## 9. Validation Commands & Results

| Command | Result |
|---------|--------|
| `node scripts/compute-source-hashes.mjs` + `git diff --exit-code …generated.json` (post-commit) | exit 0 — deploy gate satisfied |
| `npx vitest run PortfolioEditorPage.test.tsx PortfolioEditorPage-D8.test.tsx` | 5 passed, ~10s, no hang |
| `npx tsc --noEmit` | exit 0 |
| `npm run test` (full) | **670 passed, 3 failed, 1 todo, 1 skipped** — 75s, **no hang** (confirms the F9 loop fix across the whole suite, which `vitest.config.ts` glob always included) |
| `git diff --check` | exit 0 (clean) |

**Pre-existing failures (NOT introduced by this repair, out of F1–F15 scope):**
- `src/components/templates/__tests__/WiseResumeClassicTemplate.test.tsx` — "renders required contact links, plain phone, and page footer branding" (1).
- `src/pages/__tests__/AIStudioPage.test.tsx` — "keeps hidden tools usable in recent history" + "returns to /ai-studio when a deep-linked sheet is dismissed" (2): tests look for `/humanize/i` and `/close humanizer/i` buttons that the UI appears to have renamed.

Both files were last modified at `5436b9c1` (before this branch) and import none of the files changed here; the re-enabled `PortfolioEditorPage` specs are among the 670 passing. Recommend a separate, scoped test-maintenance PR — not mixed into this repair.

---

## 10. Deployment Needs

- **Appwrite deploy required?** No, not to land this branch. F1 corrects only the repo manifest. A **narrow** `--only=admin-visitor-analytics,track-visitor-event` deploy is needed **only if** F2 verification shows the live hubs don't match the recomputed hashes — owner-approved, never `target=all`.
- **Vercel-only deploy enough?** Yes for the frontend/test/doc changes here (Vercel auto-deploys on merge to `main`). No Vercel env change is made by this branch (F13 is an owner verification).
- **Appwrite GitHub App:** remains suspended; nothing in this branch re-enables it.

---

## 11. Manual Owner Verification Checklist
1. F2 — Console deployment hashes match `f22a75b5…` / `6cc18cdf…` / `255a4afe…`.
2. F3 — `wiseresume.app` serving `main` (App Overview default tab).
3. F13 — `VITE_TURNSTILE_SITE_KEY` set; contact form OK.
4. F14 — Appwrite GitHub App suspended; no `vcs` builds on push.
5. F10 — confirm PR status before pruning any `claude/*` branch.

---

## 12. Final Status

### PASS WITH WARNINGS

All code-actionable findings (F1, F9, F7) are fixed and validated locally; F11 was already done; docs (F4/F5/F6) are synced. Remaining items are **owner-side verifications** (F2/F3/F13/F14) and **backlog** (F8/F10/F12/F15) — none block merging this branch. Recommend: merge the PR, let Vercel auto-deploy, then complete the manual checklist; trigger a narrow Appwrite hub deploy only if F2 shows live drift.
