# Session Log - 2026-05-15 - Bolt Repo Slimming (5 MB Import Cap)

## Summary

Prepared a dedicated slim branch (`codex/bolt-slim`) so the WiseResume repo can be imported into bolt.new, which enforces a hard ~5 MB GitHub tarball size cap.

## Root cause

The repository HEAD included large committed build/deploy artifacts and image-heavy documentation assets. bolt.new imports by downloading the GitHub tarball and rejects repos over 5 MB.

## What changed (on branch `codex/bolt-slim`)

- Removed committed Appwrite hub artifacts from git history HEAD (generated `.tar.gz` / `.zip` bundles):
  - Root-level hub archives (e.g. `admin-*.tar.gz`, `ai-gateway.tar.gz`, `inspect-ai-keys.tar.gz`, `resume-section-ai.tar.gz`)
  - `appwrite-hubs/*.tar.gz` and `appwrite-hubs/auth-master.zip`
- Removed image-heavy documentation assets:
  - `screenshots/`
  - `docs/screenshots/`
  - `.canvas/assets/`
- Updated `.gitignore` to prevent re-adding generated archives and removed asset directories:
  - `*.tar.gz`, `*.zip`, `screenshots/`, `docs/screenshots/`, `.canvas/assets/`, `.codex/`

## Verification

Measured the staged tree archive size (git tree from index):
- Uncompressed tar: ~13.8 MB
- Gzipped tarball: ~3.28 MB (below bolt.new 5 MB cap)

## Current state

- Local branch `codex/bolt-slim` contains the slimmed repository state intended for bolt.new import.
- Changes are not pushed to GitHub yet in this workspace.

## Where we stopped

- Next step is to commit and push `codex/bolt-slim`, then set it as the GitHub default branch (or merge into `main` if you want the repo slim by default).
- If you want to preserve screenshots and build artifacts, keep them on a separate branch (or store them outside git, e.g., Releases/Drive).
