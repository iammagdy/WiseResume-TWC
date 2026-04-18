# Admin Dev Kit

**Last verified:** 2026-04-18
**Type:** deep dive
**Sources:**
- `src/components/dev-kit/`
- `supabase/functions/admin-*` (27 functions)
- `supabase/functions/verify-dev-kit/`
- `supabase/functions/hard-purge/`
- `replit.md` (DevKit + DevKit Analytics & Monitoring Hub)
- `project-governance/ARCHITECTURE.md` §7 (Admin & Dev Kit)
- `scripts/refresh-devkit-secrets.sh`, `scripts/deploy-functions.sh`

**Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Admin & Dev Kit) for the function inventory; `replit.md` for current panel layout.

---

## Access control

- Mounted at `/devkit`. → `src/AppInterior.tsx`.
- Password-protected by `DEV_KIT_PASSWORD` (Supabase secret), verified server-side by the `verify-dev-kit` Edge Function.
- Admin-only edge functions are wrapped by `requireAdminAuth` from `_shared/adminAuth.ts`.
- `hard-purge` is now protected by `requireAdminAuth` — previously had no auth (fixed 2026-04-14, → `replit.md` Security Audit).

## Panels

→ `src/components/dev-kit/` and `replit.md` (DevKit Analytics & Monitoring Hub).

| Panel | What it shows | Backed by |
|---|---|---|
| Analytics | Page views, active users, top features bar chart, portfolio views, signups sparkline, geographic distribution, AI credits today vs yesterday | `admin-analytics`, `admin-onboarding-funnel` |
| Live Activity | 30 s auto-refresh of last 50 `usage_events`, edge function health cards, manual "Run health check" | `admin-live-activity`, `ai-health` |
| Deployment | Last 5 GitHub commits, env var checklist, links to Supabase + GitHub. **Analytics Retention Sweep section** (added Task #21): last-run time, duration, per-table deleted-row counts (`portfolio_visits`, `error_log`, `audit_logs`, `trial_resumes`), last-error amber banner, independent Refresh button. Fetches `GET /api/admin/analytics-sweep-status` with Supabase JWT. | `admin-github-status`, `admin-env-check`, `/api/admin/analytics-sweep-status` |
| Audit Log | Admin actions trail | `admin-audit-logs` |
| Users | List, search, identity, content, plan, credits, suspend, delete, merge | `admin-list-users`, `admin-list-user-content`, `admin-get-identity`, `admin-update-profile`, `admin-set-plan`, `admin-grant-trial`, `admin-revoke-trial`, `admin-set-credits`, `admin-suspend-user`, `admin-delete-user`, `admin-merge-identity`, `admin-revoke-sessions`, `admin-save-note` |
| Email actions | Send magic links, confirmations, custom emails via Resend | `admin-email-actions` |
| Coupons | Create, list, toggle, delete coupon codes | `admin-manage-coupons` |
| App settings | Platform-wide flags, maintenance mode, feature gates | `admin-get-settings`, `admin-update-settings`, `app_settings` table |
| Portfolio usernames | Audit / clean public portfolio handles | `admin-portfolio-usernames` |
| WiseHire | Waitlist + invite generation + account-type badges | `admin-wisehire-waitlist`, `admin-wisehire-invite` |
| AI Provider | Search & switch active model for OpenRouter / Groq / Gemini / Ollama. Free/paid filter. Live credits (OpenRouter balance endpoint), token usage (Groq usage endpoint). Instant persistence via Zustand `settingsStore` → `localStorage`. No demo data. | `settingsStore` (`setOpenrouterModel`, `setGroqModel`, `setGeminiModel`, `setOllamaModel`), OpenRouter `/api/v1/auth/key` + `/api/v1/generation`, Groq `/openai/v1/usage` |

## DevKit shell shortcuts

→ `scripts/` directory; `replit.md` (CI/CD).

```bash
bash scripts/refresh-devkit-secrets.sh <GITHUB_PAT>   # sync GitHub secrets to Supabase
bash scripts/deploy-functions.sh                       # redeploy all 93 edge functions
```

`SUPABASE_ACCESS_TOKEN` is configured as a Replit secret so both commands work from the workspace shell without GitHub Actions.

## Known gotchas

- `db-migration.yml` GitHub Action is **broken** (duplicate-key conflict in `supabase_migrations`). Use `apply-rpc-migration.yml` instead. → `replit.md`.
- `admin-github-status` requires `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` secrets in Supabase. The token recently went stale and was rotated — refresh via `refresh-devkit-secrets.sh`. → `replit.md`.
- `app_settings` table feeds `<FeatureGate>` wrappers around feature-flagged routes (e.g. `/interview`, `/applications`, `/portfolio`, `/cover-letters`). → `src/AppInterior.tsx`.
