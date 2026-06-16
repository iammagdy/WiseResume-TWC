# Branch Cleanup Report — 2026-06-16

## 1. Executive summary

| Item | Value |
|------|--------|
| **Final status** | **PARTIAL** — `main` is sole active line of development; 18 remote + 9 local Claude worktree branches kept |
| **Local HEAD** | `7fbd4e93ea03f496ac7883ba784a669a7b63dba4` |
| **origin/main HEAD** | `7fbd4e93ea03f496ac7883ba784a669a7b63dba4` |
| **Working tree** | Clean (tracked) |
| **Open PRs** | **0** |
| **Branches deleted** | **29** (24 remote, 5 local) |
| **Branches kept** | **27** (18 remote, 9 local worktree-linked) |

**Classification:** PARTIAL cleanup completed safely. Could not achieve single-branch `main` only because (1) 18 remote branches have unique patches not proven equivalent to `main`, and (2) 6 merged local branches are locked by Claude worktrees under `.claude/worktrees/`.

---

## 2. Branch inventory before cleanup

| Scope | Count |
|-------|------:|
| Local branches (incl. `main`) | 14 |
| Remote branches (incl. `origin/main`) | 46 |
| Open PRs | 0 |

### Local branches (before)

`main`, `feat/ui-ux-audit-fixes`, `design-system-v1`, `security-remediation-review`, `claude/setup-live-testing-o7L6C`, `claude/trusting-cannon-hl2s8r`, plus 8 `claude/*` worktree branches (`awesome-ride`, `bold-bhaskara`, `ecstatic-jones`, `frosty-ramanujan`, `jolly-mestorf`, `kind-hodgkin`, `serene-booth`, `upbeat-borg`, `zen-herschel`).

### Remote branches (before)

45 non-`main` refs including `feat/ui-ux-audit-fixes`, `design-system-v1`, `wr-security-remediation-review`, numerous `claude/*`, `fix/*`, `codex/*`, `visual/*`, `bolt-import-slim`.

---

## 3. Deletion criteria used

| Category | Rule applied |
|----------|----------------|
| **A — Fully merged** | `git merge-base --is-ancestor <branch> origin/main` → delete |
| **B — Merged PR + on main** | GitHub PR `MERGED` + cherry_plus=0 on `git cherry origin/main <branch>` → delete |
| **C — Squash/cherry equivalent** | `git cherry` shows **zero** `+` lines (patches already on `main`) → delete |
| **D — Keep (uncertain / unique)** | `git cherry` shows one or more `+` patches → **keep** |
| **E — Protected / blocked** | `main`, worktree-checked-out branches → **keep** or skip |

---

## 4. Branches deleted

### Remote (24) — all `git push origin --delete` succeeded

| Branch | Evidence | Category |
|--------|----------|----------|
| `claude/admin-devkit-refactor-phase5-Mw1QH` | Ancestor of `origin/main` | A |
| `claude/atlas-onboarding-K3wJ2` | Ancestor | A |
| `claude/inspiring-mayer-6PTJP` | Ancestor | A |
| `claude/kind-hodgkin-685acc` | Ancestor | A |
| `claude/trusting-cannon-hl2s8r` | Ancestor (PR merge integrated) | A |
| `claude/zen-herschel-d10996` | Ancestor | A |
| `codex/bolt-slim` | Ancestor | A |
| `codex/export-system-replacement` | Ancestor | A |
| `design-system-v1` | Ancestor (PR #69) | A |
| `feat/ui-ux-audit-fixes` | Ancestor (PR #103) | A |
| `wr-security-remediation-review` | Ancestor (PR #91) | A |
| `claude/atlas-handover-review-pv67uk` | cherry_plus=0 (PRs #88–90) | C |
| `claude/company-briefing-undefined-error-BTejq` | cherry_plus=0 (PR #72) | C |
| `claude/peaceful-pascal-Bb0Zr` | cherry_plus=0 (PR #83) | C |
| `claude/setup-live-testing-o7L6C` | cherry_plus=0 | C |
| `fix/company-briefing-lineage-schema` | cherry_plus=0 (PR #84) | C |
| `fix/correct-node-runtime` | cherry_plus=0 (PR #102) | C |
| `fix/schema-index-length-error` | cherry_plus=0 (PR #85) | C |
| `fix/setup-security-collections-defaults` | cherry_plus=0 (PR #94) | C |
| `fix/setup-security-collections-idempotent` | cherry_plus=0 (PR #95) | C |
| `fix/setup-security-collections-indextype` | cherry_plus=0 (PR #93) | C |
| `fix/source-hashes-post-pr91` | cherry_plus=0 (PR #92) | C |
| `fix/source-hashes-update` | cherry_plus=0 (PR #101) | C |
| `visual/project-atlas-editor-upload-tailor` | cherry_plus=0 (PRs #86–87) | C |

### Local (5) — `git branch -d` succeeded

| Branch | Evidence |
|--------|----------|
| `design-system-v1` | `--merged main` |
| `feat/ui-ux-audit-fixes` | `--merged main` |
| `security-remediation-review` | `--merged main` |
| `claude/setup-live-testing-o7L6C` | `--merged main` |
| `claude/trusting-cannon-hl2s8r` | `--merged main` |

---

## 5. Branches kept

### Remote (18) — unique `+` patches on `git cherry origin/main`

| Branch | cherry_plus | Recommended next step |
|--------|------------:|----------------------|
| `origin/bolt-import-slim` | 1 | Review; likely superseded by `codex/bolt-slim` (deleted) — safe to delete after owner confirms |
| `origin/claude/app-audit-report-y0dzO` | 7 | Review docs-only deltas; merge or delete if redundant |
| `origin/claude/app-unit-tests-report-r7gPa` | 3 | Review test report commits |
| `origin/claude/atlas-onboarding-GqwrK` | 7 | PR #70 merged — likely squash hash drift; verify then delete |
| `origin/claude/atlas-onboarding-jTBF9` | 2 | PR #66 merged — verify patch equivalence |
| `origin/claude/atlas-onboarding-mnWBQ` | 2 | PRs #67–68 merged — verify |
| `origin/claude/awesome-ride-7faf3b` | 2 | Review unique commits |
| `origin/claude/cv-tailoring-selection-g8qnC` | 1 | PR #71 merged — verify |
| `origin/claude/find-atlas-design-system-y4KJ7` | 5 | Review design-system session docs |
| `origin/claude/fix-plan-upgrade-sync-d2dUM` | 2 | Review DevKit session docs |
| `origin/claude/gallant-darwin-6j9w9u` | 5 | PRs #96–97 merged — verify |
| `origin/claude/gallant-lovelace-zgwv00` | 4 | PR #99 merged — verify |
| `origin/claude/pensive-wright-i20soz` | 4 | PR #100 merged — verify |
| `origin/claude/read-project-docs-JEUkC` | 3 | Review |
| `origin/claude/read-project-rules-5x3PH` | 6 | Review |
| `origin/claude/read-project-rules-YuLHJ` | 3 | Review |
| `origin/claude/teleport-session-recovery-i4XxZ` | 1 | Review |
| `origin/fix/ai-credits-schema` | 5 | PR #98 merged — verify patch equivalence |

### Local (9) — worktree-locked or not merged

| Branch | Reason | Next step |
|--------|--------|-----------|
| `claude/bold-bhaskara-70e2ee` | Merged into `main` but checked out in worktree | `git worktree remove` then `git branch -d` |
| `claude/jolly-mestorf-626ad9` | Same | Same |
| `claude/kind-hodgkin-685acc` | Same (remote already deleted) | Same |
| `claude/serene-booth-dc1c57` | Same | Same |
| `claude/upbeat-borg-aadc15` | Same | Same |
| `claude/zen-herschel-d10996` | Same (remote already deleted) | Same |
| `claude/awesome-ride-7faf3b` | Not merged; unique commits | Review or delete worktree + branch |
| `claude/ecstatic-jones-e24c9d` | Not merged; ahead of old main | Review session work |
| `claude/frosty-ramanujan-26b957` | Not merged; unique commits | Review DevKit work |

---

## 6. Final branch state (after cleanup, before this report commit)

### Local
- `main` (current)
- 9 `claude/*` worktree branches (see §5)

### Remote
- `origin/main`
- `origin/HEAD` → `origin/main`
- 18 kept branches (see §5)

---

## 7. Confirmation

- All product code and documentation intended for production are on **`main`** (includes PR #103 UI/UX audit + merge report `7fbd4e93`).
- Local tracked working tree was **clean** during cleanup.
- Local `main` **equals** `origin/main` at `7fbd4e93`.
- **No product code** was changed during this hygiene task.
- **No deployments** were run.
- **No** `appwrite-hubs/`, API, server, auth provider, or AI provider logic was modified.

---

## 8. Owner-friendly summary

We deleted **29 stale branches** that were fully merged or whose changes already live on `main`. `main` is the only branch you need for production work.

**18 old remote branches** still exist because Git shows unique commits that were likely squash-merged under different SHAs — they need a quick owner review before deletion.

**9 local Claude worktree branches** remain because Git cannot delete a branch while its worktree folder exists under `.claude/worktrees/`. Six of those are already merged and can be removed after cleaning up worktrees.

To finish single-branch cleanup later:
1. Review kept remotes with `git log origin/main..origin/<branch>`.
2. Remove unused worktrees: `git worktree list` → `git worktree remove <path>`.
3. Delete remaining local branches with `git branch -d <branch>`.
4. Delete reviewed remotes with `git push origin --delete <branch>`.
