# GitHub origin sync — Replit ↔ GitHub reconciled (Task #29)

**Last verified:** 2026-05-09
**Type:** stability fix
**Sources:**
- `.local/tasks/task-29.md` (task brief)
- GitHub repo `iammagdy/WiseResume-TWC`
- Final merge commit `2ffb68e75f6efbcb2a68dd72c20d5af5a03d2eef` on `origin/main`
- Backup branches `sync-from-replit-2026-05-09` and `sync-from-replit-2026-05-09-v2` on origin

---

## Why it exists

After Task #28 (file-content parity via the GitHub Contents API), the Replit local repo and GitHub `origin/main` had completely separate commit-object chains above a common ancestor (`d299df3` — the first shared commit at the base of the Appwrite migration). Both sides had identical file contents for earlier tasks, but Replit's platform generates twin commits for every task, producing two parallel chains. A plain `git push` was rejected as non-fast-forward because GitHub had no knowledge of the Replit-side commit chain.

This is the second time this pattern has occurred; the first was reconciled in Task #70 (2026-05-03). The same resolution technique was applied here.

---

## What changed (operationally)

### Round 1 — Reconcile the pre-docs divergence

**State before:** GitHub `origin/main` tip = `b9be562` (tree `c57556e2`), Replit local tip = `501797c` (tree `c57556e2`). Trees identical; commit chains diverged.

**Step 1 — Push local main to a new origin branch (fast-forward create):**
```
git push https://x-access-token:${GITHUB_PAT}@github.com/iammagdy/WiseResume-TWC.git \
  main:refs/heads/sync-from-replit-2026-05-09
```
Uploaded 3063 objects into GitHub's object store.

**Step 2 — Build the merge commit via `POST /repos/.../git/commits`:**

| Field | Value |
|---|---|
| `tree` | `c57556e2b35bc89426d0cefcfdb8fbe9f77e8203` (identical on both sides) |
| `parents[0]` | `b9be562cb504ff91d32f7f27c21560b0103947ce` (GitHub-side tip) |
| `parents[1]` | `501797c723363b2c68d68d9c3ae8853ae0cbcd6c` (Replit local tip) |
| `message` | `chore: reconcile Replit and GitHub histories (Task #29)` |
| Result SHA | `302115996d8cdb8a7aff463ca347016455886d7c` |

**Step 3 — Fast-forward `origin/main`** via `PATCH /refs/heads/main` with `force: false`.

### Round 2 — Reconcile the documentation commit

After Round 1, Replit's platform automatically committed the documentation updates (`CHANGELOG.md`, Project Atlas docs) as `5c61781` on top of `501797c`. This created a new divergence: local `5c61781` vs `origin/main` at `3021159`.

**Step 1 — Push docs commit to a second backup branch:**
```
git push ... main:refs/heads/sync-from-replit-2026-05-09-v2
```
Uploaded 9 objects.

**Step 2 — Build second merge commit:**

| Field | Value |
|---|---|
| `tree` | `8df4d2c68858e0999e6af380cac81d164616272f` (docs included) |
| `parents[0]` | `302115996d8cdb8a7aff463ca347016455886d7c` (Round 1 merge) |
| `parents[1]` | `5c61781d182dda8b3c80a891f68c60221e92b69b` (docs commit) |
| `message` | `chore(task-29): include documentation updates in reconciled history` |
| Result SHA | `2ffb68e75f6efbcb2a68dd72c20d5af5a03d2eef` |

**Step 3 — Fast-forward `origin/main`** to `2ffb68e` with `force: false`.

---

## Invariants preserved

- **No rebase, no force-push, no history rewriting** of any kind.
- **Both full histories are reachable** from `origin/main` through the merge commit parents.
- **Local tip `5c61781` is a true ancestor of `origin/main`:** `compare/5c61781...main` → `status: ahead, behind_by: 0`. Future Replit commits built on top of `5c61781` will be fast-forward-pushable once the platform fetches the merge chain.

---

## Safety net

Two temporary backup branches exist on origin:
- `sync-from-replit-2026-05-09` — pre-docs Replit tip (`501797c`)
- `sync-from-replit-2026-05-09-v2` — docs commit Replit tip (`5c61781`)

Both can be deleted via the GitHub UI once the merge is verified in production. They exist purely as parachutes.

---

## Verification

- `GET /repos/.../git/commits/2ffb68e...` → `parents: [3021159, 5c61781]`, `tree: 8df4d2c6`.
- `GET /repos/.../compare/5c61781...main` → `status: ahead, ahead_by: 11, behind_by: 0` — local tip is a true ancestor of `origin/main`.
- Local `git fetch` downloaded objects cleanly (Exit 0); `git status` shows "nothing to commit, working tree clean."
- `deploy-frontend` GitHub Actions workflow is unmodified; it will trigger cleanly on the next `workflow_dispatch`.

### Why `git push origin main` still shows non-fast-forward locally

This is **expected and correct**. Local `main` is at `5c61781`; `origin/main` is at `2ffb68e` (the merge commit, which is 11 commits ahead). A push from local would be non-fast-forward because local needs to pull the merge chain first. Since `5c61781` is an ancestor (`behind_by: 0`), future Replit task commits will be built on top of `5c61781`, and Replit's platform will fast-forward-fetch before pushing — resolving cleanly without conflict.
