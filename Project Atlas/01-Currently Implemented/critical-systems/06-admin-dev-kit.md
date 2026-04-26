# Admin Dev Kit

**Last verified:** 2026-04-25 (Task #25)

## Login recovery — what to do when /devkit rejects the admin

> Added 2026-04-25 (Task #25). Step-by-step playbook for the next time `/devkit` says "Incorrect email or password — try again." even with what should be the right credentials.

1. **Look at the login screen first.** It now distinguishes the failure modes itself — no need to read edge logs to know which one it is:
   - "DEV_KIT_PASSWORD is not set in Supabase secrets…" → the `DEV_KIT_PASSWORD` secret is missing from the Supabase project. Push it (step 3 below).
   - "ADMIN_EMAILS is not set in Supabase secrets…" → the email allowlist is empty. Push `ADMIN_EMAILS` to Supabase the same way.
   - "Could not create an admin session…" → the function couldn't insert into `public.admin_sessions`. Check the service-role key and that the table still exists (migration `20260507000000_admin_sessions.sql`).
   - "Login service unavailable — check the verify-dev-kit edge function deploy." → generic 5xx fallback. Redeploy with `npx supabase functions deploy verify-dev-kit --project-ref jnsfmkzgxsviuthaqlyy`.
   - "Verification function not found" toast → function isn't deployed at all. Run `bash scripts/deploy-functions.sh`.
   - "Too many attempts — temporarily locked" countdown → the admin tripped the 5-failures-in-10-minutes brute-force guard. Either wait it out or sweep the row (step 2 below).
   - Generic "Incorrect email or password — try again." → genuine password mismatch. Either the admin typed it wrong or the `DEV_KIT_PASSWORD` Supabase secret is stale. Rotate it via step 3.
2. **Clear an active lockout for one email.** The lockout key is the email lowercased with every non-`[a-z0-9]` character replaced with `_` (e.g. `magdy.saber@outlook.com` → `magdy_saber_outlook_com`). Delete only that key — never truncate the table:
   ```sql
   delete from public.rpc_rate_limits
   where endpoint = 'devkit-login-fail'
     and ip_address = '<lockout_key>';
   ```
   Or via the supabase-js service-role client from the Replit shell:
   ```js
   await c.from('rpc_rate_limits').delete()
     .eq('endpoint', 'devkit-login-fail')
     .eq('ip_address', '<lockout_key>');
   ```
3. **Rotate `DEV_KIT_PASSWORD` in Supabase.** The function reads it via `Deno.env.get("DEV_KIT_PASSWORD")` at request time, so a fresh deploy is not required after a secret update — but doing one anyway is the safe default.
   ```bash
   curl -X POST "https://api.supabase.com/v1/projects/jnsfmkzgxsviuthaqlyy/secrets" \
     -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '[{"name":"DEV_KIT_PASSWORD","value":"<new-password>"}]'
   ```
   Verify it landed:
   ```bash
   curl "https://api.supabase.com/v1/projects/jnsfmkzgxsviuthaqlyy/secrets" \
     -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
     | jq '.[] | select(.name=="DEV_KIT_PASSWORD") | {name, updated_at}'
   ```
4. **Redeploy `verify-dev-kit` if you suspect a stale build.** `npx supabase functions deploy verify-dev-kit --project-ref jnsfmkzgxsviuthaqlyy` (or `bash scripts/deploy-functions.sh` for the full set).
5. **Verify end-to-end without the UI.** A direct POST avoids browser/auth-state confusion:
   ```bash
   curl -sS -X POST "$SUPABASE_URL/functions/v1/verify-dev-kit" \
     -H "Authorization: Bearer $VITE_SUPABASE_PUBLISHABLE_KEY" \
     -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"email":"<admin@email>","password":"<new-password>","rememberMe":false}'
   ```
   Expect `{"success":true,"token":"…","session_id":"…","expires_at":…}`. If you tested with a wrong password to confirm the rejection path, sweep the lockout row again (step 2) before handing off.


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
| Deployment | Last 5 GitHub commits, env var checklist, links to Supabase + GitHub. **Analytics Retention Sweep section** (added Task #21, extended Task #10): last-run time, duration, per-table deleted-row counts (`portfolio_visits`, `error_log`, `audit_logs`, `trial_resumes`, `admin_audit_log`), last-error amber banner, independent Refresh button. Fetches `GET /api/admin/analytics-sweep-status` with Supabase JWT. | `admin-github-status`, `admin-env-check`, `/api/admin/analytics-sweep-status` |
| Audit Log | Admin actions trail | `admin-audit-logs` |
| Users | List, search, identity, content, plan, credits, suspend, delete, merge | `admin-list-users`, `admin-list-user-content`, `admin-get-identity`, `admin-update-profile`, `admin-set-plan`, `admin-grant-trial`, `admin-revoke-trial`, `admin-set-credits`, `admin-suspend-user`, `admin-delete-user`, `admin-merge-identity`, `admin-revoke-sessions`, `admin-save-note` |
| Email actions | Send magic links, confirmations, custom emails via Resend | `admin-email-actions` |
| Coupons | Create, list, toggle, delete coupon codes | `admin-manage-coupons` |
| App settings | Platform-wide flags, maintenance mode, feature gates | `admin-get-settings`, `admin-update-settings`, `app_settings` table |
| Portfolio usernames | Audit / clean public portfolio handles | `admin-portfolio-usernames` |
| WiseHire | Waitlist + invite generation + account-type badges | `admin-wisehire-waitlist`, `admin-wisehire-invite` |
| AI Provider | **Hardened (Task #1, 2026-04-18):** Feature routing collapsible (shows sub-provider per feature). Circuit breaker chip per sub-panel (healthy/degraded/open with 1 Hz live countdown via `useTick`). Confirm-before-switch inline card on every model list (Enter / Esc keyboard support). Test button on OpenRouter / Groq / Gemini (latency + preview, in-flight tests cancelled on rerun and on unmount). Dynamic model lists: OpenRouter from `/api/admin/ai-provider/openrouter-models` proxy, Groq from `/api/admin/ai-provider/groq-models`, Gemini from `/api/admin/ai-provider/gemini-models` (static fallback when key absent). All four upstream-list endpoints share a 10-min server-side TTL cache. Managed OpenRouter balance from server proxy. All managed keys server-side only — zero key material in browser. Gemini key sent via `x-goog-api-key` header (never in URL). Sanitized error strings to the browser; full upstream errors logged server-side. Header "Refresh all" awaits `Promise.allSettled` over breaker + every visible sub-panel; failures shown in a single toast. **Throttled to one fan-out per 3 s (Task #10).** Breaker poll auto-runs every 20 s while page is visible. Every model switch and `gemini-test` invocation writes to `admin_audit_log` via `POST /api/admin/ai-provider/audit-model-switch` — **all audit writes are fire-and-forget so the response doesn't wait on the insert (Task #10).** The Recent Activity section's filter changes **abort the prior in-flight `audit-recent` request via AbortController (Task #10)**, and the `admin_audit_log` table itself is on a 365-day retention sweep tunable via `ADMIN_AUDIT_LOG_RETENTION_DAYS` (Task #10). | `settingsStore`, ~~`ai-breaker-status` edge fn~~ (removed 2026-04-24 Task #21 — never wired in; chip data comes from server proxy routes), `ai-test` edge fn (S4: now accepts Bearer JWT + ADMIN_EMAILS in addition to legacy DevKit HMAC), `/api/admin/ai-provider/openrouter-status`, `/api/admin/ai-provider/openrouter-models`, `/api/admin/ai-provider/groq-models`, `/api/admin/ai-provider/groq-usage`, `/api/admin/ai-provider/gemini-models`, `/api/admin/ai-provider/gemini-test`, `/api/admin/ai-provider/audit-model-switch`, `admin_audit_log` Drizzle table, `src/lib/aiDefaults.ts` |

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
| `/api/admin/ai-provider/audit-recent` | GET | Filterable, cursor-paginated `admin_audit_log` reader for the **Recent activity** section at the bottom of the AI Provider tab. Always restricted to `action IN ('model-switch','provider-test')`. Query params: `provider` (openrouter/groq/gemini/ollama/wiseresume-sub), `action` (model-switch/provider-test), `okOnly=failed` (only failed provider-tests), `actorEmail` (case-insensitive substring), `before` (cursor `${at}|${id}` from prior `nextCursor`), `limit` (1–100, default 50). Returns `{ entries, nextCursor }`. Ordered `(at DESC, id DESC)`, served by the dedicated `idx_admin_audit_log_at_id` composite index added in Task #10 so unfiltered cursor scans stay index-only as the table grows. Reloaded by the header "Refresh all" button alongside the rest of the panel. (Task #3, extended in Task #5, indexed in Task #10) |

All routes respond with `{ configured: false }` (or `{ configured: true, error }`) when the env var is absent — safe to call even in environments where the key is not yet set.

## Admin username bypass (Task #11, 2026-04-26)

Admins can now force-assign any portfolio username from the Users panel — any length, any characters, no user-facing validation rules.

### How it works
- The Save button in `UserDetailDrawer.tsx` now passes `admin_bypass_validation: true` to `admin-update-profile`.
- With that flag, the edge function skips `check_username_available` (which enforces min-length, character set, reserved list, exclusive assignments) and runs only a direct uniqueness check (`profiles WHERE username = X AND user_id != target`).
- Saving still rejects if another active user owns the slug.
- After a successful username change, a row is inserted into `notifications` (`type: 'admin_action'`) so the user sees an in-app notification: "Your portfolio username has been updated to [slug]."

### What else changed
- The availability indicator while typing now uses a direct `profiles` SELECT instead of the `check_username_available` RPC, so it shows ✓/✗ based on uniqueness only.
- The Save button is no longer blocked by the ✗ indicator — admin can override taken/invalid states.

## Identity panel improvements (Task #11, 2026-04-26)

The Identity section in `UserDetailDrawer.tsx` now surfaces more useful information for identifying users.

### New fields returned by `admin-get-identity`
| Field | Source | Notes |
|---|---|---|
| `signed_up_at` | `auth.users.created_at` | When the Supabase shadow account was first created |
| `last_sign_in_at` | `auth.users.last_sign_in_at` | Most recent Supabase auth event |
| `kinde_email` | Kinde Management API (`GET /api/v1/user?id={kinde_sub}`) | Real user email; only fetched when auth email is a `@kinde.placeholder` OR contact_email is blank, AND KINDE_M2M_CLIENT_ID/SECRET/DOMAIN are all configured. Returns `null` otherwise. |

### Display order in Identity card
1. **Kinde email** (only visible when returned) — real identity, shown first
2. **Contact email** (from `profiles.contact_email`)
3. **Auth email (internal)** — may be `kp_XXX@kinde.placeholder`, labelled "(placeholder)"
4. **Joined** — sign-up date
5. **Last sign-in**
6. **Kinde sub**
7. **Last token exchange**

## User list email display (Task #11, 2026-04-26)

`AdminUsersPanel.tsx` now prefers `contact_email` over the auth email for **all** users, not just collision/shadow accounts. The `isKindeShadow` check now matches the broader `@kinde.placeholder` suffix (not just `@collision.kinde.placeholder`).

## AI error parser bleed-through fix (Task #11, 2026-04-26)

`edgeFunctions.ts` now short-circuits the AI error parser entirely for any `admin-*` function that returns a non-ok HTTP response. Instead of routing through `parseAIErrorBody` (which was mapping `status:"invalid"` in validation error bodies to "AI is temporarily unavailable"), the wrapper now reads the `error` or `message` field from the JSON body directly and surfaces it as-is. This prevents any admin validation error from being displayed as an AI failure.

## Known gotchas

- `db-migration.yml` GitHub Action is **broken** (duplicate-key conflict in `supabase_migrations`). Use `apply-rpc-migration.yml` instead. → `replit.md`.
- `admin-github-status` requires `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO` secrets in Supabase. The token recently went stale and was rotated — refresh via `refresh-devkit-secrets.sh`. → `replit.md`.
- `app_settings` table feeds `<FeatureGate>` wrappers around feature-flagged routes (e.g. `/interview`, `/applications`, `/portfolio`, `/cover-letters`). → `src/AppInterior.tsx`.
- Kinde email lookup in `admin-get-identity` requires `KINDE_DOMAIN`, `KINDE_M2M_CLIENT_ID`, and `KINDE_M2M_CLIENT_SECRET` to be configured in Supabase secrets. Without these, `kinde_email` is always `null` and the "Kinde email" row does not appear in the Identity card.
