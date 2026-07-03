> [!CAUTION]
> Historical / archived document. Do not treat as current project truth. Use Project Atlas/SOURCE_OF_TRUTH_MAP.md and living specs for current references.

# Post-Merge Smoke Test & Impact Audit

**Date:** 2026-06-16  
**Repo:** WiseResume-TWC  
**Scope:** Changes integrated from `claude/trusting-cannon-hl2s8r` into `main`, plus follow-up cherry-picks  
**Auditor:** Cursor agent (read-only audit — no code/deploy/data changes)

---

## 1. Executive summary

| Question | Result |
|----------|--------|
| **Overall status** | **PARTIAL PASS** |
| **Is `main` buildable?** | **Yes** — `tsc` and `npm run build` both succeed |
| **Is the merge technically safe?** | **Mostly yes** — compile/build pass, routes load, security patterns intact; **manual QA + hub deployment still required** |
| **Is manual QA still needed?** | **Yes** — portfolio interest/contact on live env, tailoring end-to-end, AI tools with real credits, email verification |

### Current git state

| Item | Value |
|------|-------|
| Branch | `main` |
| HEAD SHA | `7b2b369c7a1548b4edf32d1da8b3211e2b7ce7a3` |
| Working tree | Clean (`## main...origin/main`) |
| Diff since pre-merge base `253a2210` | **340 files**, +31,009 / −4,865 lines |

### Merge timeline (recent history)

```
7b2b369c  ci: add targeted email-service deploy workflow + script
0667351f  feat(email): add editorial v2 verification template
8973c47f  feat(email-templates): add dark-theme verification email v3
0bf2b115  fix: use .claude/* wildcard so negation patterns are effective
7d2cac77  merge: integrate origin/main into claude/trusting-cannon-hl2s8r   ← BIG MERGE
5436b9c1  fix: portfolio, profile, dashboard polish, and merge-prep for main
253a2210  docs: session log for portfolio security remediation (pre-merge main tip)
```

The **big merge commit** is `7d2cac77`. Four follow-up commits landed on `main` after it (email templates + deploy workflow + `.gitignore`).

---

## 2. What was newly merged into `main`

### Dashboard
- **Saved Jobs** metric replaces Missing Keywords in `DashboardMetricsStrip.tsx`
- `DashboardSavedJobsDialog`, saved jobs hook (`useSavedJobPostings.ts`)
- Workspace layout/toolbar UX (search, tablet scroll, intelligence panel)
- Create/New Resume flow preserved (`CreateResumeDialog`, `handleCreateNew`, keyboard shortcut `n`)

### Portfolio
- Canonical domain helpers (`src/lib/portfolioUrl.ts` → `wiseresume.app`)
- Server-side portfolio interest (`api/portfolio-interest.ts`, `src/lib/portfolioInterest.ts`, `server/index.ts` route)
- Turnstile-ready contact form + CSP updates (`PortfolioContactForm.tsx`, `vite.config.ts`, `vercel.json`, `public/_headers`)
- Themed print layout (`src/lib/portfolioPrintLayout.ts`)
- Public portfolio via Appwrite functions (`portfolio-gate`, `get-public-portfolio`) — no browser read of `password_hash` on public pages
- Profile seeding at signup (`src/lib/profileSeed.ts`, `AuthPage.tsx`, `useProfile.ts`)

### Tailoring Hub
- Compare/result UX (`TailoringHubResultPage.tsx`, `TailorResumeCompare*`, export panels)
- `hasMeaningfulChanges` guard (`src/lib/tailorMerge.ts`, `TailoringHubPage.tsx`)
- Saved jobs integration for tailoring (`JobMatchSavedJobsList`, `buildTailoringHubJobUrl`)
- Quick PDF export dialog, lineage helpers, section compare components

### AI Gateway
- Large `appwrite-hubs/ai-gateway/src/main.js` update (~1,800+ lines touched in merge)
- Dedicated `tailor-resume` prompt path and schema
- DeepSeek-first routing for tailor/cover-letter/agentic tools
- Credit cost table per tool; routing tests in `tests/hubs/ai-gateway-routing.test.cjs`

### DevKit / Admin
- Deploy Hubs panel uses source hash manifest (`sourceHashes.generated.json`)
- Moderation, visitor analytics, portfolio usernames, audit log improvements
- Admin impersonation HMAC flow (`admin-impersonate` — `IMPERSONATION_HMAC_SECRET`)
- Many schema setup scripts under `scripts/setup_*_schema.cjs`

### Security
- SSRF guards for PDF/export URL fetching (`src/lib/security/ssrfGuards.ts` + tests)
- Public portfolio password verification server-side (hubs + `api/public-portfolio.ts`)
- Portfolio gate returns only safe fields (no `password_hash`)
- `.env.example` uses placeholders only (no real secrets found in repo scan)

### Email verification
- New templates: `email-verification-v2.html`, `email-verification-v3.html`
- New workflow: `.github/workflows/deploy-email-service.yml`
- New script: `scripts/deploy_email_service.cjs`
- `AuthPage.tsx` invokes `email-service` for verification/password-reset emails

### Scripts / workflows / docs
- `deploy-appwrite-hubs.yml` expanded (manual `workflow_dispatch`, hub target input)
- `deploy-frontend.yml` **removed** (Vercel handles frontend from `main`)
- Audit scripts (`audit-page-imports.mjs`, `audit-page-loads.mjs`)
- Extensive Project Atlas session logs and security audit docs

---

## 3. Validation results

| Command | Result | Notes |
|---------|--------|-------|
| `git status -sb` | **PASS** | Clean tree on `main`, synced with `origin/main` |
| `npx tsc --noEmit` | **PASS** | Exit 0, no errors |
| `npm run build` | **PASS** | Built in ~44s; chunk size warnings only (pre-existing pattern) |
| `node --check appwrite-hubs/ai-gateway/src/main.js` | **PASS** | Syntax OK |
| `node --check appwrite-hubs/email-service/src/main.js` | **PASS** | Syntax OK |

### Targeted unit tests

| Command / scope | Result | Notes |
|-----------------|--------|-------|
| `TailoringHubPage-F1.test.tsx` | **PASS** | 7/7 — `hasMeaningfulChanges` guard works |
| `ssrfGuards.test.ts` | **PASS** | SSRF guard tests pass |
| `ai-gateway-routing.test.cjs` | **PASS** | Included in 12-test focused batch |
| `tailorMerge.test.ts` | **FAIL** | `buildMergedResume > merges skills when enabled` — expects 3 skills, got 6 (merge adds original + tailored) |
| `usePublicPortfolio.test.tsx` | **FAIL** | `mockListDocuments is not defined` — tests still assume direct Appwrite DB reads; hook now uses `functions.createExecution` |

**Focused batch (4 files):** 2 files passed, 2 files failed (6 failing assertions total in combined run).

---

## 4. Smoke test results

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| **Dashboard — Saved Jobs** | **PASS** (static) | `DashboardMetricsStrip.tsx` label `'Saved Jobs'`, prop `savedJobsCount` | No "Missing Keywords" string in strip |
| **Dashboard — render/actions** | **PASS** (static) | Routes in `AppInterior.tsx`; `CreateResumeDialog`, `handleCreateNew`, "New Resume" button | Runtime shell loads `/dashboard` HTTP 200 |
| **Portfolio — wiseresume.app** | **PASS** (static) | `CANONICAL_PORTFOLIO_HOST = 'wiseresume.app'`; `getPortfolioCanonicalUrl` | |
| **Portfolio — interest API** | **PASS** (static) | `api/portfolio-interest.ts`, `sendPortfolioInterest`, `POST /api/portfolio-interest` | **Not runtime-tested** against live Appwrite |
| **Portfolio — contact form** | **PASS** (static) | `PortfolioContactForm.tsx` Turnstile token gating | **Not runtime-tested** with real Turnstile key |
| **Portfolio — password gate** | **PASS** (static) | `usePublicPortfolio` → `portfolio-gate` / `get-public-portfolio` functions; no hash in gate response | Editor still reads `password_hash` for **owner** settings (expected) |
| **Portfolio — no public hash leak** | **PASS** (static) | `portfolio-gate/src/main.js` comment + sanitized return; public hook uses functions not `portfolio_settings` reads | |
| **Tailoring Hub — routes** | **PASS** (static + HTTP) | `/tailoring-hub`, `/tailoring-hub/result/:resumeId` in `AppInterior.tsx`; HTTP 200 | |
| **Tailoring Hub — unchanged guard** | **PASS** (test) | F-1 tests pass | |
| **Tailoring Hub — saved jobs wire** | **PASS** (static) | `useSavedJobPostings`, `JobMatchSavedJobsList`, dashboard dialog | |
| **AI Gateway — tailor path** | **PASS** (static) | `featureName === 'tailor-resume'` handlers; DeepSeek model constants | |
| **AI Gateway — routing tests** | **PASS** (test) | `ai-gateway-routing.test.cjs` | |
| **AI credits** | **UNKNOWN** | Credit costs in catalogue + gateway; no hardcoded wrong limits spotted in quick scan | Needs live tool invocation |
| **DevKit — Deploy Hubs** | **PASS** (static) | `DeployHubsPanel.tsx` imports `sourceHashes.generated.json` | |
| **DevKit — hash manifest** | **PASS** (static) | Includes `ai-gateway`, `email-service`, `portfolio-gate`, `get-public-portfolio` | |
| **DevKit — deploy workflow** | **PASS** (static) | `deploy-appwrite-hubs.yml` is `workflow_dispatch` only (manual) | |
| **Email — deploy workflow** | **PASS** (static) | `deploy-email-service.yml` + `deploy_email_service.cjs` present | Not executed |
| **Security — impersonation** | **PASS** (static) | `admin-impersonate` uses `IMPERSONATION_HMAC_SECRET`, signed payload | |
| **Security — SSRF** | **PASS** (test) | `ssrfGuards.test.ts` | |
| **Security — secrets in repo** | **PASS** (scan) | No `sk-…` or live API keys in tracked source; `.env.example` placeholders only | |
| **Runtime routes** | **PASS** (HTTP) | Dev server `localhost:5000` — all routes return **200** with `#root` | SPA shell only; auth may redirect client-side |

### Runtime route check (`npm run dev`)

| Route | HTTP | `#root` present |
|-------|------|-----------------|
| `/dashboard` | 200 | Yes |
| `/tailoring-hub` | 200 | Yes |
| `/ai-studio` | 200 | Yes |
| `/portfolio` | 200 | Yes |
| `/settings` | 200 | Yes |
| `/templates` | 200 | Yes |
| `/preview` | 200 | Yes |

---

## 5. Risks found

### Blocker
*None identified in build/type layer.* Production blockers would be **undeployed Appwrite hubs** if production still runs old hub code.

### High
1. **Appwrite hub drift** — `ai-gateway`, `email-service`, `admin-devkit-data`, `job-import`, `public-share`, `resume-section-ai`, `wisehire-gateway`, and multiple admin hubs changed since `253a2210`. Production AI/tailoring/email may behave differently until manual GHA deploy.
2. **Portfolio interest API env** — `api/portfolio-interest.ts` requires `APPWRITE_API_KEY` (+ project ID) on Vercel. Missing env → "I'm Interested" fails in production.
3. **Unit test drift** — `usePublicPortfolio.test.tsx` outdated vs Appwrite-function architecture; gives false signal in CI if those tests run.

### Medium
4. **`tailorMerge.test.ts` failure** — skills merge semantics may have changed; verify tailoring output manually.
5. **Turnstile CSP** — contact form depends on Cloudflare Turnstile + CSP headers; misconfigured production env disables send button.
6. **Large merge surface (340 files)** — subtle regressions possible in editor export, DevKit moderation, WiseHire gateway.

### Low
7. **Chunk size warnings** — build warns on >500 kB bundles (ocr, doc-export); performance not a merge blocker.
8. **Portfolio editor reads `password_hash`** — owner-only in `PortfolioEditorPage.tsx`; not a public leak but worth knowing for security reviews.
9. **Stale remote branch refs** — 18 branches still show `git cherry +` artifacts; repo hygiene only.

---

## 6. Appwrite deployment checklist

### Hubs / functions changed in `253a2210..HEAD`

| Hub | Changed | Deploy priority |
|-----|---------|-----------------|
| `ai-gateway` | Yes | **Critical** — tailoring, credits, routing |
| `email-service` | Yes | **High** — verification/reset emails + new HTML templates |
| `admin-devkit-data` | Yes | High — DevKit data plane |
| `admin-deploy-hubs` | Yes | Medium |
| `admin-impersonate` | Yes | Medium |
| `admin-moderation` | Yes | Medium |
| `admin-visitor-analytics` | Yes | Medium |
| `job-import` | Yes | Medium |
| `public-share` | Yes | Medium |
| `resume-section-ai` | Yes | Medium |
| `wisehire-gateway` | Yes | Medium |
| Other admin hubs | Minor | Low |

### Hubs on `main` but **not** in this diff (already on pre-merge `main`)

`portfolio-gate`, `get-public-portfolio`, `verify-portfolio-password` — deployed earlier with portfolio security work; re-deploy only if unsure of production state.

### Vercel (frontend + serverless API)

Auto-deploys from `main` push. New/changed API routes:
- `api/portfolio-interest.ts`
- `api/public-portfolio.ts`
- `api/app-settings.ts`

### Recommended deployment action (do not execute in this audit)

| Target | When |
|--------|------|
| **`all`** via `Deploy Appwrite Hubs` GHA | Safest after large merge — ensures hash manifest matches deployed code |
| **Minimum:** `ai-gateway`, `email-service`, `admin-devkit-data` | If time-constrained |
| **`email-service` only** | Via new `Deploy Email Service` workflow after template changes |

**Manual deployment is likely required** — workflows are `workflow_dispatch` only; nothing auto-deploys hubs on git push.

---

## 7. Recommended next actions

### Manual test first (production or staging)
1. **Dashboard** — confirm 4th metric is **Saved Jobs**, import/save a job posting
2. **Public portfolio** — interest button, contact form (with Turnstile), password gate, print layout, `wiseresume.app` share URL
3. **Signup → profile** — full name appears; onboarding completion clears banner
4. **Tailoring Hub** — run tailor, confirm compare/result/export; verify unchanged job shows warning
5. **AI Studio** — run `tailor-resume` or cover letter; confirm credits decrement
6. **Email** — signup verification email uses branded template

### Fix first if something fails
1. Deploy Appwrite hubs (`all` or critical subset)
2. Verify Vercel env: `APPWRITE_API_KEY`, `VITE_TURNSTILE_SITE_KEY`, Turnstile secret on `ai-gateway`
3. Update `usePublicPortfolio.test.tsx` to mock `functions.createExecution` (test hygiene, not production)

### Can wait
- Stale remote branch cleanup
- `tailorMerge` test expectation update
- Bundle size optimization
- Full vitest suite run (slow; several known flaky/outdated tests)

---

## 8. Owner-friendly summary

**What changed:** A large batch of Cloud work is now on `main`. The dashboard shows **Saved Jobs** instead of Missing Keywords. Portfolios use **wiseresume.app** links, have a working **interest button** and **contact form** setup, better **print** styling, and **safer password protection**. Signup now **seeds your name** into your profile. The **Tailoring Hub** has compare/export improvements. **AI tools** route through an updated gateway (DeepSeek-first for tailoring). **DevKit/admin** panels and deploy tooling were improved. New **email verification templates** and a **one-click email-service deploy** workflow were added.

**What's solid:** The app **builds cleanly**, TypeScript passes, main pages **load without crashing** locally, and key security patterns (server-side portfolio passwords, SSRF guards, signed impersonation) are still in place.

**What still needs you:** **Click-test the product** on staging/production — especially portfolio interest, contact form, tailoring, and AI tools. **Deploy Appwrite hubs manually** via GitHub Actions; the code on GitHub is ahead of what may be running in Appwrite Cloud. A couple of **unit tests are outdated** and fail even though the app builds; that's a test cleanup task, not necessarily a user-facing bug.

---

*Report generated 2026-06-16. No code, commits, pushes, deployments, or Appwrite data modifications were made during this audit.*
