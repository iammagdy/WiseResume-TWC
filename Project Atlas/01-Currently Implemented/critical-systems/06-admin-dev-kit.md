# Admin Dev Kit

**Last verified:** 2026-04-18 (Task #28)
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
| AI Provider | **Hardened (Task #1, 2026-04-18):** Feature routing collapsible (shows sub-provider per feature). Circuit breaker chip per sub-panel (healthy/degraded/open with 1 Hz live countdown via `useTick`). Confirm-before-switch inline card on every model list (Enter / Esc keyboard support). Test button on OpenRouter / Groq / Gemini (latency + preview, in-flight tests cancelled on rerun and on unmount). Dynamic model lists: OpenRouter from `/api/admin/ai-provider/openrouter-models` proxy, Groq from `/api/admin/ai-provider/groq-models`, Gemini from `/api/admin/ai-provider/gemini-models` (static fallback when key absent). All four upstream-list endpoints share a 10-min server-side TTL cache. Managed OpenRouter balance from server proxy. All managed keys server-side only — zero key material in browser. Gemini key sent via `x-goog-api-key` header (never in URL). Sanitized error strings to the browser; full upstream errors logged server-side. Header "Refresh all" awaits `Promise.allSettled` over breaker + every visible sub-panel; failures shown in a single toast. Breaker poll auto-runs every 20 s while page is visible. Every model switch and `gemini-test` invocation writes to `admin_audit_log` via `POST /api/admin/ai-provider/audit-model-switch`. | `settingsStore`, `ai-breaker-status` edge fn, `ai-test` edge fn (S4: now accepts Bearer JWT + ADMIN_EMAILS in addition to legacy DevKit HMAC), `/api/admin/ai-provider/openrouter-status`, `/api/admin/ai-provider/openrouter-models`, `/api/admin/ai-provider/groq-models`, `/api/admin/ai-provider/groq-usage`, `/api/admin/ai-provider/gemini-models`, `/api/admin/ai-provider/gemini-test`, `/api/admin/ai-provider/audit-model-switch`, `admin_audit_log` Drizzle table, `src/lib/aiDefaults.ts` |

## DevKit shell shortcuts

→ `scripts/` directory; `replit.md` (CI/CD).

```bash
bash scripts/refresh-devkit-secrets.sh <GITHUB_PAT>   # sync GitHub secrets to Supabase
bash scripts/deploy-functions.sh                       # redeploy all 93 edge functions
```

`SUPABASE_ACCESS_TOKEN` is configured as a Replit secret so both commands work from the workspace shell without GitHub Actions.

## AI Provider admin proxy routes (Task #28)

Added to `server/index.ts`, all behind `requireAuthHeader + requireAdminEmail`:

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/ai-provider/openrouter-status` | GET | OpenRouter key balance/rate-limit via managed `OPENROUTER_API_KEY` |
| `/api/admin/ai-provider/groq-models` | GET | Live Groq model list via managed `GROQ_API_KEY` |
| `/api/admin/ai-provider/gemini-models` | GET | Live Gemini model list via managed `GEMINI_API_KEY` (filters to `generateContent` only) |
| `/api/admin/ai-provider/gemini-test` | POST | Gemini `generateContent` ping using managed `GEMINI_API_KEY`; returns `{ success, model, latencyMs, preview }` |
| `/api/admin/ai-provider/audit-recent` | GET | Last 50 `admin_audit_log` rows with `action IN ('model-switch','provider-test')` for the **Recent activity** section at the bottom of the AI Provider tab. Reloaded by the header "Refresh all" button alongside the rest of the panel. (Task #3) |

All routes respond with `{ configured: false }` (or `{ configured: true, error }`) when the env var is absent — safe to call even in environments where the key is not yet set.

## Known gotchas

- `db-migration.yml` GitHub Action is **broken** (duplicate-key conflict in `supabase_migrations`). Use `apply-rpc-migration.yml` instead. → `replit.md`.
- `admin-github-status` requires `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` secrets in Supabase. The token recently went stale and was rotated — refresh via `refresh-devkit-secrets.sh`. → `replit.md`.
- `app_settings` table feeds `<FeatureGate>` wrappers around feature-flagged routes (e.g. `/interview`, `/applications`, `/portfolio`, `/cover-letters`). → `src/AppInterior.tsx`.
