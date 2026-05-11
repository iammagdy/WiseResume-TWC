# WiseResume Master Handover & State (May 2026)

## MANDATORY CONTEXT FOR AI AGENTS
- **Environment:** Replit is the **development environment only**. Production is Hostinger (static frontend) + Appwrite Cloud Feed (backend). Never store production secrets in Replit.
- **Rule:** Do not guess. Check logs and verify root cause before suggesting any fix.

---

## The Architecture (Current — Appwrite-Native)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Auth | Appwrite Account SDK (`account.get()` / `deleteSession()`) | Fully Appwrite-native |
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

---

## Where We Stand Now

### Working (as of 2026-05-09)
- `https://thewise.cloud/` — live, renders Appwrite-native build
- Auth (sign-in/sign-up/sign-out via Appwrite Account SDK)
- AI Hub — 24+ features via `ai-gateway` Appwrite Function
- DevKit AIKeysPanel — NVIDIA slots use `<select>` dropdown with 5 Mistral/Gemma models
- DevKit AIRoutingPanel — new panel showing full `FEATURE_ROUTES` table by provider
- **Fix (2026-05-11):** Profile name persistence and reflection issue resolved by mapping snake_case Appwrite fields to camelCase UI fields in `useProfile.ts`.
- **Fix (2026-05-11):** iOS CV parsing stability improved by ensuring `prebuild` script runs to generate necessary PDF.js and Tesseract assets, and adding asset health checks in `textExtractor.ts`.
- **Fix (2026-05-11):** ProfilePage performance optimized by adding `Query.limit` to job application and resume fetches, and removing redundant profile fetching in `useMe.ts`.
- **Fix (2026-05-11):** Resolved "AI Unavailable" badge issue by ensuring the `ai-health` Appwrite function is correctly invoked and adding better error handling for execution failures.
- GitHub repo (`iammagdy/WiseResume-TWC`, `main`) — remote HEAD `2ffb68e` (plus local fixes)

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

---

## Key Files

| File | Purpose |
|------|---------|
| `.github/workflows/deploy-frontend.yml` | FTP deploy to Hostinger — mirror to `.` |
| `.github/workflows/deploy-appwrite-hubs.yml` | Deploy Appwrite Functions |
| `public/_headers` | CSP headers |
| `public/.htaccess` | SPA fallback rewrite |
| `src/lib/appwrite.ts` | Appwrite client |
| `src/lib/appwrite-bridge.ts` | `AI_HUB_FUNCTIONS` set + `invokeAppwriteHub()` router |
| `src/lib/appwrite-collections.ts` | `COLLECTIONS` const — 96 collection IDs |
| `src/contexts/AuthContext.tsx` | Appwrite-only auth context |
| `appwrite-hubs/ai-gateway/src/main.js` | AI router |
| `appwrite-hubs/inspect-ai-keys/src/main.js` | DevKit key inspector |
| `CHANGELOG.md` | Technical change log |

---
*Last updated: 2026-05-11*
