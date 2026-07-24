# Revoked Credential History Cleanup Plan

**Status:** plan only; no rewrite or force-push authorized or performed.

## Scope and preparation

The revoked historical GitHub credential appears only in `.replit`, `.local/tasks/spec-kit-skill.md`, and `.local/tasks/task-11.md` in reachable history. Determine all affected branches/tags with a value-free scanner before any rewrite; record ref names and commit IDs in a private owner record, never in a public issue. Confirm revocation, make an immutable bare-clone backup and a second encrypted/offline backup, pause merges and deployment automation, and notify collaborators.

## Authorized execution sequence

1. In a fresh mirror clone, use `git filter-repo` with a replacement file that removes the credential-bearing authenticated URL/token without putting the token in shell history, logs, or documentation.
2. Verify every ref with the same value-free current/history scanner and inspect `.replit` plus the two task paths. Verify clone integrity, default branch, tags, Actions workflow references, and release artifacts.
3. Obtain explicit owner approval for the reviewed rewritten refs. Push each rewritten branch/tag with `--force-with-lease` only—never plain `--force`.
4. Rotate/disable any deployment references to old commit SHAs only after the rewrite is stable. Existing PRs, commit links, release attestations, caches, forks, and old clones will retain old SHAs; close/recreate affected PRs and ask clone owners to re-clone rather than merge old histories.
5. Ask GitHub Support about cached views/search indexes if removal is legally or operationally required. A rewrite cannot guarantee removal from third-party clones, forks, logs, or caches.

## Stop and rollback

Stop before force-push if a second credential appears, protected branches/tags cannot be mapped, release/deployment impact is unknown, or verification finds a surviving match. Roll back by restoring the saved mirror's original refs using `--force-with-lease` only after owner approval; do not delete the backup until independent verification and collaborator migration are complete.
