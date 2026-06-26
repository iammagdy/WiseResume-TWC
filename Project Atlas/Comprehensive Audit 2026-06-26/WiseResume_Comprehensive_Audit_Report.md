# WiseResume Comprehensive Audit Report

**Date:** 2026-06-26
**Type:** read-only audit (no fixes applied)
**Repository:** `iammagdy/WiseResume-TWC`
**Production domain:** `https://wiseresume.app`
**Auditor scope:** codebase + Project Atlas docs + git state + tests. No edits, commits, pushes, deploys, or destructive actions were performed. The only file written is this report.

---

## 1. Executive Summary

WiseResume is in a **PASS WITH WARNINGS** state. Production is live, the prior `BLOCKED_EXTERNAL_ACCESS` blocker (`PORTFOLIO_JWT_SECRET`) was resolved by the owner, and the 2026-06-21 post-secret live QA passed all P1 flows with only two non-blocking P2 observations. The most recent merged work (DevKit Visitor Analytics command-center + country resolution, merged to `main` at `a4d497f9`) is on `main`.

No **confirmed P0** (launch-blocking security/data/credit) issue was found in this pass. The strongest finding is a **deployment-hygiene P1**: the committed Appwrite source-hash manifest (`src/lib/devkit/sourceHashes.generated.json`) is **stale** for the two hubs changed in the last session. This was verified by recomputing the hashes read-only — both mismatch. Because the official `Deploy Appwrite Hubs` workflow hard-fails on `git diff --exit-code` of that manifest, **the official Appwrite hub deploy path is currently broken** until the manifest is regenerated and committed. The hubs appear to have been deployed out-of-band (local `deploy_hubs.cjs`), so production may be correct, but the repo and the official pipeline are out of sync.

Secondary risks are documentation drift (CHANGELOG is two sessions behind the Master Handover; `SOURCE_OF_TRUTH_MAP` version is stale), an unverified Vercel deploy of the latest `main`, disabled critical-path editor tests in CI, and a few owner-side environment items (`VITE_TURNSTILE_SITE_KEY`).

Verified-healthy areas this pass: tailoring route aliasing + redirect test, public-portfolio payload sanitization (no `password_hash` / owner email / `user_id` leak), `/preview?...&action=` auto-export hardening, the `hasMeaningfulChanges` honesty guardrail, and `deploy_hubs.cjs` Git-disable + `activate:true` behavior.

---

## 2. Current Repo / Doc / Deployment State

### Git
- **Branch:** `main`
- **Local HEAD:** `a4d497f9c42ab8f0b775424cb26d75dfcc6321f4`
- **origin/main:** `a4d497f9c42ab8f0b775424cb26d75dfcc6321f4` (synced — local == origin)
- **HEAD commit date:** 2026-06-25 23:49 +0300
- **Latest commit:** `a4d497f9` — Merge `feature/devkit-visitors-analytics-upgrade`
- **Working tree:** dirty in two benign ways:
  - ` M .impeccable` — submodule has **untracked** content (`critique/`, `design.json`, `live/`), submodule commit itself is clean. Tooling scratch.
  - Untracked: `appwrite-hubs/get-public-portfolio/package-lock.json`, `appwrite-hubs/portfolio-gate/package-lock.json`, `appwrite-hubs/portfolio-settings/package-lock.json`, `appwrite-hubs/verify-portfolio-password/package-lock.json`
- **Local branches:** `feature/devkit-visitors-analytics-upgrade`, `fix/portfolio-password-persistence`, `fix/portfolio-repair`, `main`. **All three feature branches are already merged into `main`** (`git branch --merged main`). No unmerged-but-ready local work.
- **Remote branches:** several stale `claude/*` PR branches + `fix/portfolio-*`.

### Docs
- `MASTER_HANDOVER_2026.md`: latest session = **2026-06-25** (DevKit Visitor Analytics). (File is 507 KB — exceeds the 250 KB read limit; read in portions.)
- `CHANGELOG.md`: latest entry = **2026-06-23** (Auth Bold) → **two sessions behind** the handover (missing 06-24 landing UX and 06-25 DevKit analytics).
- `RULES.md`: "Last verified 2026-05-12".
- `SOURCE_OF_TRUTH_MAP.md`: "Last verified 2026-05-13"; states app version **4.1.5**, but `package.json` is **4.7.3**.

### Deployment
- **Vercel:** Auto-deploys from `main`. Atlas 2026-06-25 session log (written pre-merge) says "Vercel not yet deployed — changes on feature branch." Now merged → expected to auto-deploy `a4d497f9`. **Not confirmed live in this pass.**
- **Appwrite hubs:** Manual/explicit only. Session log says `track-visitor-event` + `admin-visitor-analytics` were deployed (status=ready). Appwrite GitHub App is **suspended** (since 2026-06-23) to stop VCS auto-builds; deploys are manual via `Deploy Appwrite Hubs` workflow or local `deploy_hubs.cjs`.

---

## 3. Top 10 Highest-Risk Findings

| # | ID | Title | Severity |
|---|----|-------|----------|
| 1 | F1 | Stale source-hash manifest breaks the official `Deploy Appwrite Hubs` workflow | P1 |
| 2 | F9 | Critical-path editor tests disabled in CI (mount hang) | P1 |
| 3 | F2 | DevKit analytics hubs deployed out-of-band; repo manifest disagrees with deployed source | Needs manual verification |
| 4 | F3 | Vercel production deploy of latest `main` (`a4d497f9`) unconfirmed | Needs manual verification |
| 5 | F13 | `VITE_TURNSTILE_SITE_KEY` may be missing in Vercel → portfolio contact form "Security check required" | Needs manual verification |
| 6 | F4 | CHANGELOG two sessions behind MASTER_HANDOVER | Documentation mismatch |
| 7 | F5 | `SOURCE_OF_TRUTH_MAP` app version stale (4.1.5 vs 4.7.3) | Documentation mismatch |
| 8 | F12 | Portfolio password-gate CDN propagation delay (>40s after publish) | P2 |
| 9 | F7 | Untracked `package-lock.json` in 4 portfolio hub dirs (deploy-input ambiguity) | P2 / env |
| 10 | F11 | Tailoring "No meaningful changes" reads as failure on sparse resumes | P2 |

---

## 4. Full Findings Table

| ID | Area | Severity | Title | Code change | Appwrite deploy | Vercel-only | Manual Console verify | Test coverage |
|----|------|----------|-------|:-----------:|:---------------:|:-----------:|:---------------------:|:-------------:|
| F1 | I | P1 | Stale source-hash manifest blocks official hub deploy | Yes | No (regenerate+commit only) | No | No | No |
| F2 | H/I | Needs verify | Hubs deployed out-of-band; manifest mismatch | No | Verify | No | Yes | No |
| F3 | H | Needs verify | Latest `main` Vercel deploy unconfirmed | No | No | Verify | No | No |
| F4 | — | Doc mismatch | CHANGELOG behind handover | Docs | No | No | No | No |
| F5 | — | Doc mismatch | SOURCE_OF_TRUTH_MAP version stale | Docs | No | No | No | No |
| F6 | — | P2 | RULES / map "Last verified" dates old | Docs | No | No | No | No |
| F7 | I | P2/env | Untracked hub `package-lock.json` files | Maybe | Maybe | No | Yes | No |
| F8 | — | P2/env | `.impeccable` submodule untracked scratch content | No | No | No | No | No |
| F9 | C | P1 | PortfolioEditorPage tests disabled in CI (hang) | Yes (test-infra) | No | No | No | Yes |
| F10 | — | P2 | Stale remote `claude/*` branches | No | No | No | No | No |
| F11 | D | P2 | Tailoring guardrail copy reads as false failure | Maybe (copy) | No | No | No | Maybe |
| F12 | F | P2 | Portfolio gate CDN propagation delay | No | No | No | Yes (monitor) | No |
| F13 | F/J | Needs verify | `VITE_TURNSTILE_SITE_KEY` missing in Vercel | No | No | Verify (Vercel env) | Yes | No |
| F14 | I | Needs verify | Appwrite GitHub App must remain suspended | No | No | No | Yes | No |
| F15 | I | P2 | `postinstall` puppeteer-chrome step is heavy for any VCS auto-build | No | No | No | No | No |

### Verified-healthy (not findings — recorded as evidence of good state)
- **Tailoring routing:** `@/Users.../src/AppInterior.tsx:387-392` — `/tailoring` → `/tailoring-hub` redirect; `/tailor/result/:resumeId` and `/tailoring-hub/result/:resumeId` both resolve to `TailoringHubResultPage`. Redirect regression test at `src/pages/__tests__/TailoringRedirect.test.tsx`.
- **Public portfolio privacy:** `appwrite-hubs/get-public-portfolio/src/main.js:258-263` — owner contact email and internal `user_id` intentionally excluded; password hash never returned; unlock token bound to username + `user_id` (lines 438-446, 492).
- **Preview auto-export:** `src/pages/PreviewPage.tsx:91-229` — `?action=download|ats-pdf|docx` captured once at mount, timer in ref (no cleanup-cancel), URL cleaned after trigger; wrong-resume skeleton gate via `isPreviewReady` (lines 115-116, 733).
- **Tailoring honesty:** `src/lib/tailorMerge.ts:184-190` — `hasMeaningfulChanges` ignores whitespace/casing/punctuation-only diffs.
- **Deploy safety:** `scripts/deploy_hubs.cjs:32` `DISABLE_APPWRITE_GIT_FOR_MANAGED_HUBS = true`; `:282` `activate: true`.

---

## 5. P0 — Launch-Blocking

**None confirmed in this pass.** No confirmed security, data-loss, payment, AI-credit, or user-trust catastrophe was identified. The prior P0 external blocker (`PORTFOLIO_JWT_SECRET`) is resolved and verified by the 2026-06-21 post-secret QA. (Note: this audit did not exhaustively re-test every authenticated write flow live; see the Manual Verification Checklist.)

---

## 6. P1 — Important Before Wider Testing

### F1 — Stale source-hash manifest breaks the official `Deploy Appwrite Hubs` workflow
- **Area:** I (Appwrite backend/deployment)
- **Evidence:**
  - `deploy-appwrite-hubs.yml:34-38` recomputes hashes then runs `git diff --exit-code -- src/lib/devkit/sourceHashes.generated.json` (hard fail on any diff).
  - `git log` shows `admin-visitor-analytics/src/main.js` and `track-visitor-event/src/main.js` changed in `8a198d2a` / `d0e1f507` / `08d54d59`, but `sourceHashes.generated.json` was last updated on the PR #120 branch (`78e00c4e` / `d5ee0f9b`).
  - Read-only recompute (SHA-256, CRLF→LF normalized) confirms mismatch:
    - `admin-visitor-analytics`: actual `f22a75b5b7639663e1abedb80457991cd79b461314b65c5372cb16ea2dd48a1b` vs committed `21bacdc1addb95afae831c9395e0528167c1d30a182bb7ef75ba7ce3ca98fa3d`
    - `track-visitor-event`: actual `6cc18cdf69520f65203d8b3be3bfa29f0193e2be122ad3091af4d566f91befdc` vs committed `94ed10b2f4eb9f02fbc8c5080cb1b270d3d7a35692eaceb0368d9483adcd1c5a`
- **Why it matters:** The next manual `Deploy Appwrite Hubs` run (any target, including `all`) will fail the "Ensure source hash manifest is committed" step before deploying anything. Also, the DevKit "needs redeployment" detector reads this manifest, so it will report inaccurate drift.
- **Likely root cause:** The 06-25 session deployed the two hubs via local `deploy_hubs.cjs` but did not run `compute-source-hashes.mjs` and commit the regenerated manifest.
- **Recommended next action:** Run `node scripts/compute-source-hashes.mjs`, review the diff, commit the regenerated manifest to `main`. (Deferred to a fix pass — not done in this audit.)
- **Needs:** code change (manifest regenerate+commit) = Yes · Appwrite deploy = No · Vercel-only = No · Console verify = No · test = No.

### F9 — Critical-path editor tests disabled in CI
- **Area:** C (Editor) / test infrastructure
- **Evidence:** `pr-validation.yml:8-13` — `PortfolioEditorPage.test.tsx` and `PortfolioEditorPage-D8.test.tsx` are intentionally excluded because they hang during full mount (pre-existing mount-loop; flagged for a separate test-infra PR).
- **Why it matters:** The editor is a core surface; its largest page has no automated CI coverage, so regressions can ship undetected.
- **Likely root cause:** `vitest.config.ts` dep handling for `pako`/`docx`/`pdfjs-dist` + an editor mount loop.
- **Recommended next action:** Schedule the test-infra follow-up (align vitest deps, investigate mount loop), then re-enable in `pr-validation.yml`.
- **Needs:** code change (test-infra) = Yes · test coverage = Yes.

---

## 7. P2 / Backlog

- **F6 — Doc "Last verified" dates stale** (`RULES.md` 2026-05-12, `SOURCE_OF_TRUTH_MAP.md` 2026-05-13). Refresh during the next Atlas maintenance pass.
- **F7 — Untracked hub `package-lock.json`** in `get-public-portfolio`, `portfolio-gate`, `portfolio-settings`, `verify-portfolio-password`. Decide whether they should be committed (reproducible hub installs) or gitignored. Could affect hub build inputs.
- **F8 — `.impeccable` submodule untracked scratch** (`critique/`, `design.json`, `live/`). Add to submodule ignore or clean per owner approval. Preserve per Atlas rules unless owner approves cleanup.
- **F10 — Stale remote `claude/*` branches.** Housekeeping; prune after confirming all merged/closed.
- **F11 — Tailoring "No meaningful changes detected"** (`TailoringHubPage` guardrail via `hasMeaningfulChanges`). Correct behavior, but the message reads as a failure on sparse/blank resumes (P2-01 in 2026-06-21 QA). Consider reframing as an informational state with guidance to add resume content.
- **F12 — Portfolio gate CDN propagation delay** (>40s after publish, P2-02 in 2026-06-21 QA). Monitor; investigate `get-public-portfolio` edge cache TTL only if user-reported.
- **F15 — `postinstall` runs `ensure-puppeteer-chrome.mjs`** (heavy). Harmless under GitHub Actions/Vercel, but the historical Appwrite VCS auto-build OOM was traced to this. Keep VCS auto-build disabled (see F14).

---

## 8. Test / Environment / Documentation Mismatches

### Tests present
- **Vitest unit/component:** broad coverage incl. `TailoringRedirect.test.tsx`, `resolveTailoringResultState`, portfolio public/privacy suites, `urlUtils/safeHref`, templates, completion logic.
- **Hub tests** (`tests/hubs/`, node `--check`/logic): `ai-gateway-routing`, `ai-health-auth`, `devkit-auth-signed-only`, `job-import-credit`, `job-import-routing`, `p0-readiness`, `portfolio-password-verification`, `portfolio-settings`, `track-visitor-event`, `wisehire-ratelimit`.
- **Playwright E2E** (`tests/e2e/specs/`, 24 specs): auth/shell, resumes, editor AI, tailoring, cover letter, exports, portfolio public (merged), admin ops, transactional email, and the large `27-antigravity-auth-flows.spec.ts`.

### Gaps / risks
- **F9:** `PortfolioEditorPage` tests disabled in CI (hang) — critical editor flow uncovered.
- No CI gate enforces the source-hash manifest on PRs — only `deploy-appwrite-hubs.yml` enforces it, so **F1 will only surface at deploy time**, not on PR.
- TestSprite is referenced in Atlas as configured but advisory ("No tests detected" is a standing non-blocking gate); requires a dashboard-authored plan + `TESTSPRITE_API_KEY`.

### Documentation mismatches
- **F4:** CHANGELOG (06-23) behind MASTER_HANDOVER (06-25).
- **F5:** `SOURCE_OF_TRUTH_MAP` version 4.1.5 vs `package.json` 4.7.3.
- 2026-06-25 session log says "Vercel not yet deployed" — written pre-merge and now outdated (F3).

### Environment items
- **F13:** `VITE_TURNSTILE_SITE_KEY` in Vercel (portfolio contact form / anonymous senders).
- **F14:** Appwrite GitHub App suspension state.
- **F7:** hub `package-lock.json` tracking decision.

---

## 9. Recommended Fix Order

1. **F1** — Regenerate + commit `sourceHashes.generated.json` (unblocks the official Appwrite deploy path). *Code change, owner-approved commit.*
2. **F3 / F2** — Verify Vercel is serving `a4d497f9` and that live Appwrite `admin-visitor-analytics` / `track-visitor-event` match the recomputed hashes (`f22a75b5…` / `6cc18cdf…`). *Verification only.*
3. **F13** — Confirm/set `VITE_TURNSTILE_SITE_KEY` in Vercel. *Owner env.*
4. **F4 / F5 / F6** — Sync CHANGELOG + SOURCE_OF_TRUTH_MAP + verified dates. *Docs.*
5. **F9** — Test-infra follow-up to re-enable editor tests. *Code, separate PR.*
6. **F7 / F8 / F10 / F11 / F12 / F15** — Backlog polish/housekeeping.

---

## 10. Required Validation Commands

### Safe to run now (read-only / local, no secrets)
```bash
git fetch origin && git status -sb && git rev-parse HEAD origin/main
npx tsc --noEmit
npm run test                 # vitest run (unit/component)
node tests/hubs/track-visitor-event.test.cjs
node tests/hubs/ai-gateway-routing.test.cjs
node tests/hubs/portfolio-password-verification.test.cjs
```

### Run before any fix to F1 (writes a tracked file — treat as part of the fix, not the audit)
```bash
node scripts/compute-source-hashes.mjs
git diff -- src/lib/devkit/sourceHashes.generated.json   # expect a diff for the 2 hubs
```

### Requires env/secrets — do NOT run blindly
```bash
npm run build                # tsc + vite build + sourcemap check (heavy; local OK)
npm run test:e2e             # Playwright — needs safe QA account + live targets
node scripts/deploy_hubs.cjs --only=...   # Appwrite deploy — owner-approved only
```

> Do **not** run broad/destructive E2E against production or with real user data. Use a safe QA account and non-destructive actions only.

---

## 11. Appwrite Deployment Needs

- **No new Appwrite deploy is strictly required to keep production running** (post-secret QA passed; hubs reportedly already deployed out-of-band).
- **Blocker for the official path (F1):** the `Deploy Appwrite Hubs` workflow will fail its manifest gate until `sourceHashes.generated.json` is regenerated and committed. Fix F1 before attempting any workflow-based hub deploy.
- **If a redeploy is later desired**, prefer a **narrow target** (`track-visitor-event,admin-visitor-analytics`), not `target=all`. `all` additionally runs ~18 schema-setup scripts against live Appwrite.
- **Keep VCS auto-build disabled** (`DISABLE_APPWRITE_GIT_FOR_MANAGED_HUBS = true`; GitHub App suspended).
- **Manual Console verification** recommended: confirm the deployed source hash for both hubs matches the recomputed values above.

---

## 12. Vercel Deployment Needs

- **No code change required for Vercel** from this audit.
- **Verify** that production (`https://wiseresume.app`) is serving `main@a4d497f9` (the DevKit analytics command-center + landing/dashboard polish). The Atlas note "Vercel not yet deployed" predates the merge.
- **Set/confirm env var** `VITE_TURNSTILE_SITE_KEY` (F13) so the portfolio contact form renders the Turnstile widget for anonymous senders.

---

## 13. Manual Verification Checklist (Owner / QA Account)

1. Confirm `https://wiseresume.app` serves the latest build (DevKit Analytics "App Overview" default tab; landing micro-interactions).
2. In Appwrite Console, confirm active deployments for `admin-visitor-analytics` and `track-visitor-event` correspond to the current source (hashes `f22a75b5…` / `6cc18cdf…`).
3. Confirm `VITE_TURNSTILE_SITE_KEY` is set in Vercel; load a published portfolio's contact form and verify no "Security check required" error.
4. Confirm the Appwrite GitHub App remains **suspended** (no `vcs` auto-builds firing on push).
5. With a safe QA account: login → dashboard → create/edit resume (autosave) → one AI improve action (credit deducts once) → one Tailoring Hub run with **real** content (meaningful diff, honest before/after) → export Designed PDF / ATS PDF / DOCX → settings → logout.
6. Publish a password-protected portfolio; verify guest HTML exposes no `password_hash` / owner email / `user_id`; confirm gate activates within ~1–2 min (propagation).
7. DevKit: load Analytics + Visitors tabs; confirm `/devkit` traffic is excluded and country resolution populates.

---

## 14. Final Verdict

### PASS WITH WARNINGS

Production is live and the prior external blocker is resolved; no confirmed P0 was found. Proceed toward broad testing **after** addressing the deployment-hygiene P1 (F1, stale source-hash manifest) and completing the manual verification checklist (Vercel deploy of latest `main`, Turnstile env, live hub-hash match). The disabled editor tests (F9) and documentation drift (F4/F5) should be cleared before a formal launch sign-off.

---

*Audit performed read-only. No files were edited except this report. No commits, pushes, deploys, env changes, or destructive actions were performed.*
