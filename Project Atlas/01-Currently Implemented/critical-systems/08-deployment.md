# Deployment

**Last verified:** 2026-04-17
**Type:** deep dive
**Sources:**
- `.github/workflows/deploy.yml`
- `.github/workflows/deploy-edge-functions.yml`
- `.github/workflows/check-edge-functions-deployed.yml`
- `.github/workflows/set-supabase-secrets.yml`
- `.github/workflows/refresh-devkit-github-token.yml`
- `.github/workflows/apply-rpc-migration.yml`
- `.github/workflows/db-migration.yml` (broken — see below)
- `scripts/deploy-functions.sh`
- `scripts/check-edge-functions-deployed.mjs`
- `scripts/refresh-devkit-secrets.sh`
- `replit.md` (CI/CD Workflows + Sentry Source Map Upload + Infrastructure & Secrets)
- `QUICK_START.md`

**Canonical owner:** `replit.md` (CI/CD Workflows + Infrastructure & Secrets sections).

---

## Hosting

- **Frontend:** Hostinger via FTP, deployed by `deploy.yml` GitHub Action. Production URL: https://resume.thewise.cloud.
- **Backend:** Supabase project `jnsfmkzgxsviuthaqlyy` — Edge Functions, Postgres, Storage.

## CI/CD workflows

| Workflow | Purpose |
|---|---|
| `deploy.yml` | Build frontend, upload to Hostinger via FTP. Inlines all `VITE_*` vars at build time and uploads Sentry source maps if `SENTRY_AUTH_TOKEN` is present. |
| `deploy-edge-functions.yml` | Deploys all Supabase Edge Functions. Final step re-runs the deployed-drift check (see below) to catch a partial deploy immediately. |
| `check-edge-functions-deployed.yml` | Compares `supabase/functions/` against the live deployment on every push to `main` and on PRs that touch `supabase/functions/**`. Fails when a function exists in source but is not deployed. |
| `set-supabase-secrets.yml` | Pushes secrets to Supabase. **Hard-fails** if `GITHUB_PAT` is missing. |
| `refresh-devkit-github-token.yml` | Dedicated workflow to sync `GITHUB_TOKEN` to Supabase, with post-push verification. |
| `apply-rpc-migration.yml` | Apply any SQL file via the Supabase management API. The supported path for production schema changes. |
| `db-migration.yml` | ⚠️ **Known broken** — duplicate-key conflict in `supabase_migrations`. Use `apply-rpc-migration.yml` instead. → `replit.md`. |

## Required secrets

→ `replit.md` (Sentry section + GitHub Actions Secrets) and `QUICK_START.md` (GitHub Actions Secrets Required).

| Secret | Where | Why |
|---|---|---|
| `VITE_SUPABASE_URL` | GitHub repo + `.replit [userenv.shared]` | Vite inlines at build time |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | GitHub repo + `.replit` | Same |
| `VITE_KINDE_CLIENT_ID` | GitHub repo + `.replit` | KindeProvider init |
| `VITE_KINDE_DOMAIN` | GitHub repo + `.replit` | KindeProvider init |
| `VITE_SENTRY_DSN` | GitHub repo | Browser error tracking |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | GitHub repo | Source-map upload (optional) |
| `FTP_PASSWORD` | GitHub repo | Hostinger upload |
| `SUPABASE_ACCESS_TOKEN` | Replit secret + GitHub | Management API + shell shortcuts |
| `GITHUB_ACCESS_TOKEN` (PAT) | Replit secret | `scripts/refresh-devkit-secrets.sh` |
| `SUPABASE_DB_PASSWORD` | GitHub | (only relevant when `db-migration.yml` is fixed) |

Edge function runtime secrets (Supabase Dashboard → Edge Functions → Secrets, ~15 total): `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `RESEND_API_KEY`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `DEV_KIT_PASSWORD`, `KINDE_DOMAIN`, `ADMIN_EMAILS`, etc. → `replit.md` (Infrastructure & Secrets).

## Sentry source maps

Production builds emit **hidden** source maps (`sourcemap: 'hidden'` in `vite.config.ts`). Maps are uploaded to Sentry during CI then **deleted** from `dist/` — they are never served publicly. Upload step is gated on `SENTRY_AUTH_TOKEN`. Release name: `VITE_SENTRY_RELEASE` → `GITHUB_SHA` → `'local'` fallback.

→ `replit.md` (Sentry Source Map Upload).

## Edge function deployment drift check

`scripts/check-edge-functions-deployed.mjs` (npm: `npm run check:functions:deployed`) calls the Supabase Management API (`GET /v1/projects/{ref}/functions`) and compares the result against local `supabase/functions/<name>/` directories.

It exits non-zero when a function exists in source but is **not** deployed — exactly the failure mode that broke the first-time TOTP wizard (`admin-rotate-totp` was committed but never deployed, so the browser hit a CORS preflight on a non-existent endpoint and the wizard appeared silently broken).

The check also prints two warning lists that do **not** fail the run:

- **Orphaned deployments** — deployed but no source directory (usually leftovers from renamed/deleted functions).
- **Possibly stale** — deployed `updated_at` is older than the last git commit time for the function directory (filesystem mtime is unreliable in CI because `git clone` rewrites it to checkout time). Informational only.

`_shared/` and any directory whose name starts with `_` are excluded, matching `scripts/deploy-functions.sh`. Non-directory files like `EDGE_FUNCTION_AUDIT.md` are also ignored. A function directory must contain `index.ts` to be considered.

The same script runs in three places:

- `check-edge-functions-deployed.yml` — on every push to `main` and on PRs that touch `supabase/functions/**`.
- `deploy-edge-functions.yml` — as a final post-deploy verification step, so a partial deploy fails the workflow.
- Locally — `SUPABASE_ACCESS_TOKEN=... npm run check:functions:deployed`.

**When the check fails:** run the "Deploy Supabase Edge Functions" workflow (or `bash scripts/deploy-functions.sh` from Replit, where `SUPABASE_ACCESS_TOKEN` is already a secret), then re-run the check to confirm.

### Orphan removal log

Functions deleted from the Supabase deployment because they had no source-of-truth code in `supabase/functions/`. Each was confirmed unused before deletion (no callers in `src/`, `server/`, or other edge functions; one-shot operational migrations were complete). Deletes were performed via `DELETE /v1/projects/{ref}/functions/{slug}` against the Management API.

| Date | Function | Why removed |
|---|---|---|
| 2026-04-21 (Task #13) | `generate-store-screenshots` | Orphan per `BACKEND_AUDIT.md` / `EDGE_FUNCTION_AUDIT.md`; zero client/CI references. |
| 2026-04-21 (Task #13) | `send-contact-inquiry` | Superseded by `send-contact-email` (UI uses that). |
| 2026-04-21 (Task #13) | `send-feature-request` | Superseded by `send-contact-email`. |
| 2026-04-21 (Task #13) | `wisehire-apply` | Superseded by `wisehire-bulk-screen` + direct candidate insertion. |
| 2026-04-24 (Task #21) | `admin-backfill-ollama-urls` | One-shot admin tool; smoke-tested at `scanned=0`; no source on disk and zero callers. Re-implement fresh if Ollama URL safety rules change. |
| 2026-04-24 (Task #21) | `admin-migrate-api-key-encryption` | One-shot v1→v2 BYOK key migration; completed for the only legacy row on 2026-04-21 (constraint `user_api_keys_key_version_v2_only` is VALIDATED, zero rows with `key_version <> 2`). The runbook in `docs/ops/api-key-encryption-rotation.md` is now historical — re-implement from spec if a future rotation is required. |
| 2026-04-24 (Task #21) | `ai-breaker-status` | Phase 4 admin observability stub (read-only breaker state). Never wired into the AI Provider panel — the panel polls `/api/admin/ai-provider/openrouter-status` etc., not this function. Zero callers in `src/`. No source on disk and not in git history. |
| 2026-04-24 (Task #21) | `elevenlabs-scribe-token` | Issued ElevenLabs Scribe tokens for the Interview Coach voice path. The voice path was removed (`src/hooks/useVoiceInterview.ts` is now a stub). Source still in git history if needed. |
| 2026-04-24 (Task #21) | `generate-headshot` | "AI Professional Headshot" feature was never shipped (`AvatarCropSheet.tsx` shows a "coming soon" toast). Source still in git history if needed. |

After each removal batch, `npm run check:functions:deployed` should report zero "deployed but no source directory" warnings.

**Verification evidence (Task #21, 2026-04-24):** post-deletion run captured at `.local/evidence/task-21-check-functions-deployed.log` — `exit 0`, ends with `In sync — every local edge function is deployed.`, no orphan-warning section, no missing-deployment error. (The "Possibly stale" warnings shown there are informational and unrelated to orphan removal — see "Edge function deployment drift check" above.)

## Manual deployment from the workspace

```bash
# Redeploy all edge functions (uses SUPABASE_ACCESS_TOKEN Replit secret)
bash scripts/deploy-functions.sh

# Sync GitHub-related secrets to Supabase
bash scripts/refresh-devkit-secrets.sh <GITHUB_PAT>
```

Platform merges do **not** trigger GitHub Actions webhooks — always trigger `workflow_dispatch` via API after edge function code changes. → `replit.md`.

## Mobile / PWA

→ `QUICK_START.md` + `capacitor.config.ts`.

WiseResume ships as a Capacitor 8 PWA (`cloud.thewise.resume`, currently version 2.3.1). Android build flow is documented in `QUICK_START.md` and `ANDROID_DEPLOYMENT_GUIDE.md` (referenced from `QUICK_START.md`).

> ⚠️ `ANDROID_DEPLOYMENT_GUIDE.md` is referenced by `QUICK_START.md` but was not directly opened during this verification. Re-read it if mobile deploy details are needed.
