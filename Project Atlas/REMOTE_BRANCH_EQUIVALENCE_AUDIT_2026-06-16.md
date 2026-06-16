# Remote Branch Equivalence Audit — 2026-06-16

## 1. Executive summary

| Item | Value |
|------|--------|
| **Final status** | **PARTIAL_REVIEW_REQUIRED** |
| **Remote branches audited** | **17** (matches expected list; no extras, no missing) |
| **SAFE_DELETE_PROVEN** | **2** |
| **LIKELY_SAFE_BUT_OWNER_CONFIRM** | **12** |
| **NEEDS_REVIEW_UNMERGED** | **3** |
| **DELETE_ONLY_AFTER_LOCAL_BRANCH_REVIEW** | **1** (`origin/claude/awesome-ride-7faf3b`) |
| **KEEP (open PR / active)** | **0** |
| **Open PRs** | **0** |

**Summary:** Fifteen of seventeen remotes have at least one merged GitHub PR and show `git cherry` `+` patches due to squash/rebase hash drift — not because unique product work is absent from `main`. Two remotes (`bolt-import-slim`, `claude/find-atlas-design-system-y4KJ7`, `claude/fix-plan-upgrade-sync-d2dUM`) need deeper review before any deletion. One remote (`awesome-ride`) matches a local unmerged worktree branch at the same SHA; delete only after local review.

**Recommended next action:** Run a focused remote-deletion task starting with the **SAFE_DELETE_PROVEN** list, then batch-delete **LIKELY_SAFE** branches after spot-checking sensitive paths (`appwrite-hubs/`, workflows, schema scripts).

---

## 2. Main verification

| Check | Result |
|-------|--------|
| Current branch | `main` |
| Local HEAD | `f3c0e4d2b2a62d5fcb72718cc5a06285f2a7be0b` |
| `origin/main` HEAD | `f3c0e4d2b2a62d5fcb72718cc5a06285f2a7be0b` |
| HEAD equals `origin/main` | Yes |
| Working tree | Clean |
| Open PR count | 0 |

---

## 3. Branch classification table

| Branch | Commits ahead | Cherry `+` | Changed files (summary) | Related PR | Risk | Classification | Recommendation |
|--------|--------------:|-----------:|-------------------------|------------|------|----------------|----------------|
| `origin/bolt-import-slim` | 1 | 1 | Orphan root commit (full bolt.new snapshot) | None | **High** | NEEDS_REVIEW_UNMERGED | Inspect manually — unrelated history |
| `origin/claude/app-audit-report-y0dzO` | 7 | 7 | Docs + `appwrite-hubs/*`, `appwrite.json`, admin UI | #74 MERGED | **High** | LIKELY_SAFE_BUT_OWNER_CONFIRM | Delete after owner confirms hub/admin equivalence |
| `origin/claude/app-unit-tests-report-r7gPa` | 3 | 3 | Test report + test file edits | #82 MERGED | Low | LIKELY_SAFE_BUT_OWNER_CONFIRM | Delete after confirming report on `main` |
| `origin/claude/atlas-onboarding-GqwrK` | 8 | 7 | Email system, deploy workflow, auth pages | #70 MERGED | **High** | LIKELY_SAFE_BUT_OWNER_CONFIRM | Delete after email/deploy equivalence check |
| `origin/claude/atlas-onboarding-jTBF9` | 2 | 2 | `ai-gateway`, portfolio chat, docs | #66 MERGED | **High** | LIKELY_SAFE_BUT_OWNER_CONFIRM | Delete after AI gateway spot-check |
| `origin/claude/atlas-onboarding-mnWBQ` | 4 | 2 | Email HTML templates only | #67, #68 MERGED | Low | LIKELY_SAFE_BUT_OWNER_CONFIRM | Delete after template spot-check |
| `origin/claude/awesome-ride-7faf3b` | 2 | 2 | `ai-gateway`, `resume-section-ai`, CHANGELOG | #62 MERGED | **High** | DELETE_ONLY_AFTER_LOCAL_BRANCH_REVIEW | Compare with local worktree first |
| `origin/claude/cv-tailoring-selection-g8qnC` | 1 | 1 | `appShellLayout.ts`, `appwrite-functions.ts` | #71 MERGED | Low | **SAFE_DELETE_PROVEN** | Delete in next task |
| `origin/claude/find-atlas-design-system-y4KJ7` | 5 | 5 | Storybook, mobile app removal, 108 files | #57 **CLOSED** | **High** | NEEDS_REVIEW_UNMERGED | Inspect manually — never merged |
| `origin/claude/fix-plan-upgrade-sync-d2dUM` | 2 | 2 | DevKit v2.1 overhaul, multiple hubs | None | **High** | NEEDS_REVIEW_UNMERGED | Inspect manually — no PR |
| `origin/claude/gallant-darwin-6j9w9u` | 6 | 5 | Security hubs, workflows, source hashes | #96, #97 MERGED | **High** | LIKELY_SAFE_BUT_OWNER_CONFIRM | Delete after security/hub equivalence |
| `origin/claude/gallant-lovelace-zgwv00` | 4 | 4 | DevKit audit, schema scripts, workflow | #99 MERGED | **High** | LIKELY_SAFE_BUT_OWNER_CONFIRM | Delete after schema/deploy check |
| `origin/claude/pensive-wright-i20soz` | 4 | 4 | `testsprite.md`, `.mcp.json`, node runtime | #100 MERGED | Medium | LIKELY_SAFE_BUT_OWNER_CONFIRM | Delete after confirming `testsprite.md` on `main` |
| `origin/claude/read-project-docs-JEUkC` | 4 | 3 | `job-import` hub, consent banner, `.gitignore` | #52, #53 MERGED | Medium | LIKELY_SAFE_BUT_OWNER_CONFIRM | Delete after job-import spot-check |
| `origin/claude/read-project-rules-5x3PH` | 8 | 6 | PDF export (`api/`, `nativePdfGenerator.ts`) | #63, #64 MERGED; #65 **CLOSED** | **High** | LIKELY_SAFE_BUT_OWNER_CONFIRM | Inspect PR #65 closed changes vs `main` |
| `origin/claude/read-project-rules-YuLHJ` | 3 | 3 | DevKit deploy fix, docs | #58 MERGED | Medium | LIKELY_SAFE_BUT_OWNER_CONFIRM | Delete after DevKit spot-check |
| `origin/claude/teleport-session-recovery-i4XxZ` | 1 | 1 | `Project Atlas/CHANGELOG.md` only | #54, #55 MERGED | Low | **SAFE_DELETE_PROVEN** | Delete in next task |
| `origin/fix/ai-credits-schema` | 8 | 5 | `setup_ai_credits_schema.cjs`, security hubs | #98 MERGED | **High** | LIKELY_SAFE_BUT_OWNER_CONFIRM | Delete after schema on `main` confirmed |

---

## 4. Detailed branch notes

### `origin/bolt-import-slim`

| Field | Value |
|-------|-------|
| SHA | `3989a30d19b688cf679acfcb4a87c2b32ac6a207` |
| Date | 2026-05-15 |
| Message | `feat: initial slim commit for bolt.new` |

**Summary:** No merge base with `origin/main` (`git diff origin/main...branch` fails). This is an orphan snapshot of a bolt.new import, not part of the `main` ancestry graph.

**Unique commits:** 1 (`3989a30d`)

**Related PRs:** None

**Sensitive paths:** Entire repo snapshot (includes `.github`, Appwrite, Atlas docs)

**Classification reason:** Cannot prove equivalence — unrelated history. May be archival reference for early import.

**Next action:** Owner decides archive vs delete. Do **not** auto-delete.

---

### `origin/claude/app-audit-report-y0dzO`

| Field | Value |
|-------|-------|
| SHA | `8253e9f64e27b7097ef77d46d193b0ad052de6e4` |
| Date | 2026-06-02 |
| Message | `docs: log admin panel visibility bug in MASTER_HANDOVER_2026` |

**Diff stat:** 18 files, +624 / −79

**Sensitive paths:** `appwrite-hubs/admin-sentry/`, `appwrite-hubs/ai-gateway/`, `appwrite.json`, `useIsAdmin.ts`, `AdminRoute.tsx`

**Related PR:** [#74](https://github.com/iammagdy/WiseResume-TWC/pull/74) MERGED 2026-06-02

**Evidence:** `admin-sentry` is registered in current `appwrite.json` on `main`. Cherry shows 7 `+` patches (squash drift).

**Next action:** Spot-check admin lock + sentry hub on `main`, then delete remote.

---

### `origin/claude/app-unit-tests-report-r7gPa`

| Field | Value |
|-------|-------|
| SHA | `6791720c258cb24229326311dc2533ea89ab98ff` |
| Date | 2026-06-06 |
| Message | `fix(tests): remove dead Supabase mocks from useAICredits test` |

**Diff stat:** 8 files, +324 / −315

**Related PR:** [#82](https://github.com/iammagdy/WiseResume-TWC/pull/82) MERGED 2026-06-06

**Evidence:** `Project Atlas/UNIT-TEST-REPORT-2026-06-06.md` exists on `main`.

**Next action:** Confirm test files match `main`; delete remote.

---

### `origin/claude/atlas-onboarding-GqwrK`

| Field | Value |
|-------|-------|
| SHA | `3ce1d2fb210c3e8cfce888d95390eb664d7ae1e6` |
| Date | 2026-05-24 |
| Message | `docs: add session log Part 3 — admin-deploy-hubs git→tarball fix` |

**Diff stat:** 12 files, +1218 / −25

**Sensitive paths:** `.github/workflows/deploy-appwrite-hubs.yml`, `appwrite-hubs/email-service/`, `admin-deploy-hubs/`, auth pages

**Related PR:** [#70](https://github.com/iammagdy/WiseResume-TWC/pull/70) MERGED 2026-05-24

**Next action:** Verify email-service + deploy tarball fix on `main`; delete remote.

---

### `origin/claude/atlas-onboarding-jTBF9`

| Field | Value |
|-------|-------|
| SHA | `445c5a3afd8143ea41e06fb095449b387beeefef` |
| Date | 2026-05-22 |
| Message | `docs(atlas): log AI tools audit and repair session 2026-05-22` |

**Diff stat:** 3 files — `ai-gateway/src/main.js`, `ChatWidget.tsx`, CHANGELOG

**Related PR:** [#66](https://github.com/iammagdy/WiseResume-TWC/pull/66) MERGED 2026-05-22

**Next action:** Spot-check AI tool repairs on `main`; delete remote.

---

### `origin/claude/atlas-onboarding-mnWBQ`

| Field | Value |
|-------|-------|
| SHA | `c888af30b537e6625751711343dd1ef4c1bd0c2c` |
| Date | 2026-05-22 |
| Message | `feat(email-templates): full branded template set — dark design system` |

**Diff stat:** 6 files — email HTML templates only

**Related PRs:** [#67](https://github.com/iammagdy/WiseResume-TWC/pull/67), [#68](https://github.com/iammagdy/WiseResume-TWC/pull/68) MERGED

**Next action:** Compare templates on `main`; low-risk delete candidate.

---

### `origin/claude/awesome-ride-7faf3b`

| Field | Value |
|-------|-------|
| SHA | `a2349cde04031786ca1b1bb921b91743682d7be6` |
| Date | 2026-05-20 |
| Message | `docs: update CHANGELOG with AI gateway fix (2026-05-20)` |

**Diff stat:** 4 files — `ai-gateway`, `resume-section-ai`, CHANGELOG

**Related PR:** [#62](https://github.com/iammagdy/WiseResume-TWC/pull/62) MERGED 2026-05-20

**Local match:** Local branch `claude/awesome-ride-7faf3b` at **same SHA** with active worktree at `.claude/worktrees/awesome-ride-7faf3b`.

**Next action:** Review local worktree for uncommitted work, delete local branch + worktree first, then delete remote.

---

### `origin/claude/cv-tailoring-selection-g8qnC` — SAFE_DELETE_PROVEN

| Field | Value |
|-------|-------|
| SHA | `eb674974af38185cd7cfef5919724c539ac9a8db` |
| Date | 2026-05-24 |
| Message | `fix: hide Import Job FAB on auth pages + user-friendly error messages` |

**Diff stat:** 2 files, +15 / −3

**Related PR:** [#71](https://github.com/iammagdy/WiseResume-TWC/pull/71) MERGED 2026-06-09

**Equivalence evidence:** `src/components/layout/appShellLayout.ts` on `main` includes `/auth` and `/sign-in` in `FIXED_FOOTER_ROUTE_PREFIXES` (FAB hidden on auth routes) — the branch's stated fix is present on `main` under different commit SHAs.

**Next action:** Safe to delete remote in next task.

---

### `origin/claude/find-atlas-design-system-y4KJ7`

| Field | Value |
|-------|-------|
| SHA | `93eb49aff0544526a5d723a25876325763fd348d` |
| Date | 2026-05-19 |
| Message | `docs(handover): add 2026-05-19 design system session summary` |

**Diff stat:** 108 files, +4136 / −24937 (massive — removes `mobile/` app, Storybook stories, Supabase refs)

**Related PR:** [#57](https://github.com/iammagdy/WiseResume-TWC/pull/57) **CLOSED** (not merged)

**Evidence:** `mobile/` does not exist on `main` (partial overlap), but PR was never merged — equivalence unclear.

**Next action:** Manual review. Do not delete without owner sign-off.

---

### `origin/claude/fix-plan-upgrade-sync-d2dUM`

| Field | Value |
|-------|-------|
| SHA | `4d05f0ef0055369e85ecb8e0bed5cfd7adc0a37c` |
| Date | 2026-05-15 |
| Message | `docs: add DevKit v2.1.0 session log and master handover entry` |

**Diff stat:** 19 files, +2755 / −189 — full DevKit dashboard overhaul

**Sensitive paths:** Multiple `appwrite-hubs/admin-*`, DevKit panels, `DevToolsPage.tsx`

**Related PRs:** None found

**Next action:** Compare DevKit panels on `main` vs branch tip. No merged PR — not safe to delete.

---

### `origin/claude/gallant-darwin-6j9w9u`

| Field | Value |
|-------|-------|
| SHA | `5bdfc69236c8d8369cc52727eda97a2eefc5b49f` |
| Date | 2026-06-10 |
| Message | `chore: merge main, regenerate source hashes` |

**Diff stat:** 6 files — security impersonation, AI gateways, deploy workflow

**Related PRs:** [#96](https://github.com/iammagdy/WiseResume-TWC/pull/96), [#97](https://github.com/iammagdy/WiseResume-TWC/pull/97) MERGED

**Next action:** Confirm hub runtime + security fixes on `main`; delete remote.

---

### `origin/claude/gallant-lovelace-zgwv00`

| Field | Value |
|-------|-------|
| SHA | `695aa6c293cde830c7ea74d13e36ae72eaa40c09` |
| Date | 2026-06-12 |
| Message | `docs(atlas): session log #34 — DevKit full audit & fix` |

**Diff stat:** 16 files — schema setup scripts, DevKit audit, deploy workflow

**Sensitive paths:** `scripts/setup_*_schema.cjs`, `admin-devkit-data`, workflow

**Related PR:** [#99](https://github.com/iammagdy/WiseResume-TWC/pull/99) MERGED 2026-06-12

**Next action:** Confirm schema scripts on `main`; delete remote.

---

### `origin/claude/pensive-wright-i20soz`

| Field | Value |
|-------|-------|
| SHA | `ac222c82ad15d66785b03b03236ce6b02d62eaac` |
| Date | 2026-06-14 |
| Message | `chore(deploy): upgrade default hub runtime from node-18.0 to node-22.0` |

**Diff stat:** 4 files — `testsprite.md`, `.mcp.json`, `appwrite.json`, `deploy_hubs.cjs`

**Related PR:** [#100](https://github.com/iammagdy/WiseResume-TWC/pull/100) MERGED 2026-06-14

**Evidence:** `testsprite.md` exists on `main`.

**Next action:** Confirm runtime upgrades on `main`; delete remote.

---

### `origin/claude/read-project-docs-JEUkC`

| Field | Value |
|-------|-------|
| SHA | `37c7a7eae63c0354ac01c4d0b63cf0150386892b` |
| Date | 2026-05-17 |
| Message | `chore: merge main into feature branch, resolve conflicts` |

**Diff stat:** 4 files — `job-import` hub, consent banner, `.gitignore`

**Related PRs:** [#52](https://github.com/iammagdy/WiseResume-TWC/pull/52), [#53](https://github.com/iammagdy/WiseResume-TWC/pull/53) MERGED

**Next action:** Spot-check `job-import` hub on `main`; delete remote.

---

### `origin/claude/read-project-rules-5x3PH`

| Field | Value |
|-------|-------|
| SHA | `4faa180fdf566f716afb550b2209a5f06bd454a3` |
| Date | 2026-05-21 |
| Message | `docs: update MASTER_HANDOVER_2026 with page-cuts root-cause fix session` |

**Diff stat:** 5 files — `api/export/pdf-native.ts`, `nativePdfGenerator.ts`, package files

**Sensitive paths:** `api/export/pdf-native.ts`, PDF export pipeline

**Related PRs:** [#63](https://github.com/iammagdy/WiseResume-TWC/pull/63), [#64](https://github.com/iammagdy/WiseResume-TWC/pull/64) MERGED; [#65](https://github.com/iammagdy/WiseResume-TWC/pull/65) **CLOSED** (page-cuts fix)

**Evidence:** `nativePdfGenerator.ts` on `main` includes `totalContentHeightPx` client-height logic from merged PRs. PR #65 (live DOM height) was closed — verify whether that specific fix is on `main`.

**Next action:** Owner confirms PDF export equivalence including PR #65 intent.

---

### `origin/claude/read-project-rules-YuLHJ`

| Field | Value |
|-------|-------|
| SHA | `8daa4dc5eda6d9c5ebdde638448e90dff83a261b` |
| Date | 2026-05-22 |
| Message | `docs(atlas): add 2026-05-22 session summary to MASTER_HANDOVER` |

**Diff stat:** 7 files — DevKit deploy repair, docs

**Related PR:** [#58](https://github.com/iammagdy/WiseResume-TWC/pull/58) MERGED 2026-05-22

**Next action:** Spot-check DevKit deploy fix on `main`; delete remote.

---

### `origin/claude/teleport-session-recovery-i4XxZ` — SAFE_DELETE_PROVEN

| Field | Value |
|-------|-------|
| SHA | `bba28840106f032aecb041d000cfda93daa717c0` |
| Date | 2026-05-18 |
| Message | `docs: add CHANGELOG entry for 2026-05-18 session` |

**Diff stat:** 1 file, +23 lines (`Project Atlas/CHANGELOG.md`)

**Related PRs:** [#54](https://github.com/iammagdy/WiseResume-TWC/pull/54), [#55](https://github.com/iammagdy/WiseResume-TWC/pull/55) MERGED

**Equivalence evidence:** `main` CHANGELOG contains multiple `2026-05-18` session entries (Deploy Timeout, DevKit Hub Runtime, Import Job Diagnosis). The branch's only unique patch is documentation already represented on `main`.

**Next action:** Safe to delete remote in next task.

---

### `origin/fix/ai-credits-schema`

| Field | Value |
|-------|-------|
| SHA | `d7b0a70de85202462802514ba263d5cba8fcd1a8` |
| Date | 2026-06-10 |
| Message | `docs(atlas): session log — backend security audit + ai_credits schema fix` |

**Diff stat:** 9 files — schema script, security hubs, workflows

**Sensitive paths:** `scripts/setup_ai_credits_schema.cjs`, `admin-impersonate`, `ai-gateway`, `wisehire-gateway`, workflows

**Related PR:** [#98](https://github.com/iammagdy/WiseResume-TWC/pull/98) MERGED 2026-06-10

**Evidence:** `scripts/setup_ai_credits_schema.cjs` exists on `main`.

**Next action:** Confirm schema + security hub patches on `main`; then delete remote.

---

## 5. Proposed deletion list for next task (SAFE_DELETE_PROVEN only)

| Branch | Evidence |
|--------|----------|
| `origin/claude/cv-tailoring-selection-g8qnC` | PR #71 merged; auth FAB fix present in `appShellLayout.ts` on `main` |
| `origin/claude/teleport-session-recovery-i4XxZ` | PRs #54/#55 merged; only CHANGELOG diff; content on `main` |

**Commands (next task only):**
```bash
git push origin --delete claude/cv-tailoring-selection-g8qnC
git push origin --delete claude/teleport-session-recovery-i4XxZ
```

---

## 6. Owner-confirmation list (LIKELY_SAFE_BUT_OWNER_CONFIRM)

| Branch | PR(s) | Owner check before delete |
|--------|-------|---------------------------|
| `origin/claude/app-audit-report-y0dzO` | #74 | Admin lock + sentry hub on `main` |
| `origin/claude/app-unit-tests-report-r7gPa` | #82 | Test report + test files on `main` |
| `origin/claude/atlas-onboarding-GqwrK` | #70 | Email-service + deploy pipeline |
| `origin/claude/atlas-onboarding-jTBF9` | #66 | AI gateway / portfolio chat fixes |
| `origin/claude/atlas-onboarding-mnWBQ` | #67, #68 | Email templates |
| `origin/claude/gallant-darwin-6j9w9u` | #96, #97 | Hub runtime + security patches |
| `origin/claude/gallant-lovelace-zgwv00` | #99 | DevKit audit + schema scripts |
| `origin/claude/pensive-wright-i20soz` | #100 | TestSprite brief + node runtime |
| `origin/claude/read-project-docs-JEUkC` | #52, #53 | Job-import + consent banner |
| `origin/claude/read-project-rules-5x3PH` | #63, #64 ( #65 closed) | PDF export — verify PR #65 intent |
| `origin/claude/read-project-rules-YuLHJ` | #58 | DevKit deploy fix |
| `origin/fix/ai-credits-schema` | #98 | `setup_ai_credits_schema.cjs` + hub security |

---

## 7. Keep / review list

### NEEDS_REVIEW_UNMERGED

| Branch | Reason | Next step |
|--------|--------|-----------|
| `origin/bolt-import-slim` | No merge base with `main`; orphan bolt.new snapshot | Archive or delete after owner review |
| `origin/claude/find-atlas-design-system-y4KJ7` | PR #57 closed, never merged; 108-file diff | Manual diff review |
| `origin/claude/fix-plan-upgrade-sync-d2dUM` | No PR; DevKit v2.1 overhaul | Compare DevKit on `main` vs branch |

### DELETE_ONLY_AFTER_LOCAL_BRANCH_REVIEW

| Branch | Reason | Next step |
|--------|--------|-----------|
| `origin/claude/awesome-ride-7faf3b` | Local worktree at same SHA (`a2349cde`); PR #62 merged | Review local worktree, delete local then remote |

### Local unmerged branches without matching remote

These were **not** in the remote audit list (no `origin/` ref):

| Local branch | Notes |
|--------------|-------|
| `claude/ecstatic-jones-e24c9d` | Local only — review separately |
| `claude/frosty-ramanujan-26b957` | Local only — review separately |

---

## 8. Safety confirmation

- **No remote branches were deleted** during this audit.
- **No local branches were deleted.**
- **No product code was changed.**
- **No deployments were run.**
- **No force-push or history rewrite** was performed.
- This task was **report-only** plus documentation commit.

---

## 9. Recommended next prompt

> "Delete the 2 SAFE_DELETE_PROVEN remote branches from the remote equivalence audit, then batch-delete the 12 LIKELY_SAFE_BUT_OWNER_CONFIRM branches after spot-checking `appwrite-hubs/`, workflows, and schema scripts on `main`. Do not delete NEEDS_REVIEW_UNMERGED branches or `awesome-ride` until local worktree review is complete."
