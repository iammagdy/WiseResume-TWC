# Deployment

**Last verified:** 2026-04-17
**Type:** deep dive
**Sources:**
- `.github/workflows/deploy.yml`
- `.github/workflows/deploy-edge-functions.yml`
- `.github/workflows/set-supabase-secrets.yml`
- `.github/workflows/refresh-devkit-github-token.yml`
- `.github/workflows/apply-rpc-migration.yml`
- `.github/workflows/db-migration.yml` (broken — see below)
- `scripts/deploy-functions.sh`
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
| `deploy-edge-functions.yml` | Deploys all 93 Supabase Edge Functions. |
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
