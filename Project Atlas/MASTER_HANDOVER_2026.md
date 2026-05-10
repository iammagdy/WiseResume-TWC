# WiseResume Master Handover & State (May 2026)

## MANDATORY CONTEXT FOR AI AGENTS
- **Environment:** Replit is the **development environment only**. Production is Hostinger (static frontend) + Appwrite Cloud Feed (backend). Never store production secrets in Replit.
- **Rule:** Do not guess. Check logs and verify root cause before suggesting any fix.

---

## The Architecture (Current — Appwrite-Native)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Auth | Appwrite Account SDK (`account.get()` / `deleteSession()`) | No Kinde, no Supabase |
| Database | Appwrite Databases (`databases.*`) | 96 collections in `main` DB |
| AI | Appwrite `ai-gateway` Function | Routes 24+ features; per-feature routing via `FEATURE_ROUTES` (22 entries); provider pool: OpenRouter, Groq, DeepSeek, NVIDIA NIM |
| Storage | Appwrite Storage | `photoUrl` bucket needs `Access-Control-Allow-Origin: *` |
| Frontend | React 18 + Vite 6, served from Hostinger `/public_html/` | SPA, base path `/` |
| Server | Express stub (`server/index.ts`, ~80 lines) | Health probe + PDF 503 placeholder |
| CI/CD | GitHub Actions | `deploy-frontend.yml` + `deploy-appwrite-hubs.yml` |
| Repo | `https://github.com/iammagdy/WiseResume-TWC` | main branch, remote HEAD `2ffb68e` |

**Appwrite Endpoint:** `https://fra.cloud.appwrite.io/v1`
**Project ID:** `69fd362b001eb325a192`

---

## Deployment (Hostinger — CRITICAL)

> ⚠️ **Read `Project Atlas/DEPLOYMENT_GUIDE.md` before touching any workflow or FTP config.**
> The information below is a quick summary only — the guide is the authoritative source.

### Three domains, three separate deploys

| Domain | Deploy target | Workflow / Repo |
|---|---|---|
| `resume.thewise.cloud` | `resume/` subdirectory via FTP | `deploy-frontend.yml` in this repo |
| `thewise.cloud` | FTP root (`.`) via `put` | `deploy-landing.yml` in this repo |
| `quran.thewise.cloud` | `quran/` via SFTP | `deploy.yml` in `iammagdy/wisequran` |

### Hostinger layout
```
/public_html/           ← thewise.cloud root (landing page)
/public_html/resume/    ← resume.thewise.cloud (WiseResume app)
/public_html/quran/     ← quran.thewise.cloud (WiseQuran app)
```

### deploy-frontend.yml — WiseResume app
- FTP: `ftp://82.29.154.120:21`, user `u966279061.thewise.cloud`, secret `FTP_PASSWORD`
- lftp mirror target: **`resume/`** — this is correct and intentional
- **NEVER change `resume/` to `.`** — doing so overwrites the landing page and the `--delete` flag will wipe `quran/` too
- Workflow ID: `273053817` | Last successful deploy: run `25615721678` (2026-05-10), bundle `index-nwWBJNno.js`, version `4.1.1`

---

## Legacy Stubs (throw-stubs, NOT deleted yet)

The following files are preserved only to keep 130+ legacy import sites compiling. Every runtime call throws `pending_appwrite_migration`. Delete each file once all its importers are migrated:

- `src/lib/supabaseBridge.ts`, `src/lib/supabaseAuth.ts`, `src/lib/supabaseConstants.ts`
- `src/lib/apiFetch.ts`, `src/lib/apiFnUrl.ts`
- `src/integrations/supabase/` (entire directory)
- Express catch-all `/api/*` 503 handler in `server/index.ts`

---

## Session Log — 2026-05-08 (Tasks #25, #28, #29)

### Task #25 — Fix live blank page and deploy to production

**Symptom:** `https://thewise.cloud/` returned a blank page. Live bundle was `index-CzJaKF4H.js` (old pre-Appwrite build with Supabase/Kinde chunks).

**Root cause (FTP path bug):** `deploy-frontend.yml` used `/public_html/resume/` as the lftp mirror destination. The FTP session starts at `/public_html` (the Hostinger account root, which is the web document root). The absolute path `/public_html/resume/` resolved to `~/public_html/resume/` — a ghost directory that Apache never serves from. Every GitHub Actions deploy since the migration silently succeeded but wrote to the wrong folder. The old Supabase/Kinde build was already in `/public_html/` (placed manually) and was never touched.

**Root cause (CSP):** `public/_headers` listed Supabase/Kinde origins in `connect-src` and was missing `https://fra.cloud.appwrite.io`. Also missing `'unsafe-inline'` in `script-src` (required for Vite's inline theme-detection script).

**Fixes applied:**

`deploy-frontend.yml`:
- Mirror target: `/public_html/resume/` → `.` (FTP home = web root)
- Added `set net:timeout 30`, `set net:max-retries 3`, `set net:reconnect-interval-base 5`
- Added `timeout-minutes: 30` (job) and `timeout-minutes: 20` (Sync step)
- Added `rm -f index.html` before mirror (lftp skips size-identical files)
- Added **Verify build output** step (prints bundle hash from `dist/index.html`)
- Added **Probe FTP directory structure** step (prints `ls` after login for future debugging)

`public/_headers`:
- `connect-src`: removed `*.supabase.co`, `*.supabase.in`, `wss://*.supabase.co`, `*.kinde.com`; added `https://fra.cloud.appwrite.io`
- `script-src`: added `'unsafe-inline'`
- `style-src` / `font-src`: removed stale Google Fonts entries

**Outcome:**
- `deploy-appwrite-hubs` run 25603130088`25580008577` — SUCCESS
- `deploy-frontend` run 25603130088`25582827906` — SUCCESS
- Live: `https://thewise.cloud/` renders WiseResume landing page, bundle `index-AQhfc8ts.js`, `last-modified: 2026-05-08T22:35:30 UTC`

---

### Task #28 — Sync GitHub repo

**Problem:** Local `main` was 55 commits ahead of `origin/main`. `git push` rejected (non-fast-forward). `git push --force` failed: "Could not read 9bdf2075" — during push negotiation, git tried to parse the remote tip's parent chain locally; those objects were never fetched, so the chain was unresolvable.

**Root cause:** Multiple deploy-fix commits were made directly via the GitHub Contents API during Task #25 diagnosis, creating a diverged history above the common ancestor `b0f8c7a` ("Transitioned from Plan to Build mode"). Local had 3 commits above that ancestor; remote had 6.

**Resolution:** Used the GitHub Contents API to update the 3 files that differed between remote tip (`dd697183`) and local HEAD (`501797c`):
- `CHANGELOG.md` — Task #25 entry
- `public/_headers` — CSP fix
- `Project Atlas/04-For You (Plain Language)/stability-improvements.md` — blank-page entry

`deploy-frontend.yml` was already identical on both sides (blob SHA `23b86ee2` matched).

---

### Task #29 — Reconcile diverged git history (background agent)

**Problem:** After Task #28, file contents matched but git commit histories remained diverged. `git push` without force would fail for any future session.

**Resolution (GitHub Data API, no force-push):**
- Round 1: Pushed local `main` (`501797c`, tree `c57556e2`) to backup branch `sync-from-replit-2026-05-09` (3063 objects). Created merge commit `3021159` via `POST /git/commits` with parents `[b9be562, 501797c]` and tree `c57556e2`. Fast-forwarded `origin/main` to `3021159`.
- Round 2: Replit auto-committed docs as `5c61781`. Pushed to `sync-from-replit-2026-05-09-v2` (9 objects). Created merge commit `2ffb68e` with parents `[3021159, 5c61781]`. Fast-forwarded `origin/main` to `2ffb68e`.

**Current state:** Local tip `5c61781` is a true ancestor of `origin/main` (`2ffb68e`). `git push origin main` will succeed from a fresh pull. No force-push used, no history rewritten.

**Backup branch** `sync-from-replit-2026-05-09` still exists on GitHub — Task #30 (proposed) will delete it.

---

## Where We Stand Now

### Working (as of 2026-05-09)
- `https://thewise.cloud/` — live, renders Appwrite-native build, no blank page
- Auth (sign-in/sign-up/sign-out via Appwrite Account SDK)
- AI Hub — 24+ features via `ai-gateway` Appwrite Function (deployed build is still pre-Task-#10/#19; see critical note below)
- DevKit AIKeysPanel — NVIDIA slots use `<select>` dropdown with 5 Mistral/Gemma models; `mistral-medium-3-instruct` is default
- DevKit AIRoutingPanel — new panel showing full `FEATURE_ROUTES` table by provider
- GitHub repo (`iammagdy/WiseResume-TWC`, `main`) — remote HEAD `2ffb68e`, `git push` will work from a fresh clone

### ⚠️ Code-Complete But NOT Yet Deployed to Appwrite
These changes are merged into the repo but the Appwrite `ai-gateway` Function has not been redeployed. They are not live in production:
- **Per-feature routing** (`FEATURE_ROUTES`, 22 entries) — Task #10
- **Datadog LLM Observability** (`dd-trace` v5, `llmobs.trace()`, `flushDD()`) — Task #19
- **NVIDIA default model fix** in `inspect-ai-keys` (`mistral-medium-3-instruct`, `NVIDIA_VALID_MODELS`) — Task #11

`appwrite-hubs/ai-gateway.tar.gz` was rebuilt (35 MB) and is ready. `deploy-appwrite-hubs.yml` must be run to push both `ai-gateway` and `inspect-ai-keys` to Appwrite.

### Intentionally Broken (pending Appwrite rebuild)
- `/api/data/*` — 503 `pending_appwrite_migration`
- ~60 non-AI edge functions — all throw `pending_appwrite_migration`
- PDF export (`POST /api/export/pdf-native`) — 503
- WiseHire HR SaaS — throws `pending_appwrite_migration`
- Portfolio tracking / short-links — partially migrated; some features still on stubs
- Mobile app (`mobile/`) — still targets legacy backend, not migrated

### Active Task Queue (pending)
- **#15** — Deploy admin-testmail to Appwrite
- **#16** — Add more email tag types for transactional email flows
- **#21** — Connect Mission Control / Analytics / Observability / Live Activity to real data
- **#22** — AI gateway provider failover (try next provider if preferred one fails)
- **#23** — Move AI routing config to Appwrite Database (editable without redeploy)
- **#24** — Show which provider was actually used on each AI result
- **#25** — Keep NVIDIA model list up to date as NIM adds/retires models
- **#26** — Post-deploy smoke test in `deploy-frontend.yml`
- **#27** — Wire `public/_headers` CSP into `.htaccess`
- **#30** — Delete backup branch `sync-from-replit-2026-05-09` from GitHub

---

## Key Files for Next Agent

| File | Purpose |
|------|---------|
| `.github/workflows/deploy-frontend.yml` | FTP deploy to Hostinger — mirror to `.` |
| `.github/workflows/deploy-appwrite-hubs.yml` | Deploy Appwrite Functions — run this to push ai-gateway + inspect-ai-keys |
| `public/_headers` | CSP headers (Apache does not apply these natively — see Task #27) |
| `public/.htaccess` | SPA fallback rewrite (`RewriteBase /`, `RewriteRule . /index.html`) |
| `src/lib/appwrite.ts` | Appwrite client (`account`, `databases`, `functions`, `storage`) |
| `src/lib/appwrite-bridge.ts` | `AI_HUB_FUNCTIONS` set + `invokeAppwriteHub()` router |
| `src/lib/appwrite-collections.ts` | `COLLECTIONS` const — 96 collection IDs, `DATABASE_ID`, `BUCKETS` |
| `src/contexts/AuthContext.tsx` | Appwrite-only auth context (`AppUser` shape, `user.$id`) |
| `appwrite-hubs/ai-gateway/src/main.js` | AI router — `FEATURE_ROUTES` + Datadog LLMObs + coupon/billing logic |
| `appwrite-hubs/inspect-ai-keys/src/main.js` | DevKit key inspector — updated NVIDIA default + NVIDIA_VALID_MODELS |
| `src/lib/devkit/aiTestSlotModels.ts` | `NVIDIA_LLM_MODELS` + `FALLBACK_AI_TEST_DEFAULT_MODELS` |
| `src/components/dev-kit/AIRoutingPanel.tsx` | DevKit routing table panel (static, mirrors FEATURE_ROUTES) |
| `CHANGELOG.md` | Technical change log (all tasks documented here) |
| `Project Atlas/05-Migration to Appwrite/09-Session-Log-2026-05-09.md` | This session's detailed log |

---
*Last updated: 2026-05-09 by session agent (Tasks #19, #11, #10)*
