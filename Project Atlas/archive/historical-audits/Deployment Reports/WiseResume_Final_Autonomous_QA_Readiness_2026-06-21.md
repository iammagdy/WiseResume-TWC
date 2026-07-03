# WiseResume Final Autonomous QA Readiness Report - 2026-06-21

## 1. Executive Summary

- Final status: `BLOCKED_EXTERNAL_ACCESS`
- Is production deployed? Yes. Vercel production deployment succeeded for commit `393ff9ae73d8fd4f80efd7c91fe87a8271a0d599`.
- Are Appwrite functions deployed? Partially. The changed `job-import` hub was deployed successfully through the official targeted workflow and is active/ready. Previously changed `get-public-portfolio`, `verify-portfolio-password`, and `ai-gateway` remain active/ready from the earlier targeted workflow.
- Did browser/live QA pass? Public unauthenticated routes passed on `https://wiseresume.app`. Authenticated browser QA is blocked because no safe test credentials are available in this session.
- Are there unresolved P0/P1/P2 blockers? Yes. `PORTFOLIO_JWT_SECRET` is missing from the required Appwrite portfolio functions and from GitHub repository secrets.
- Is TestSprite rerun recommended? Not yet. Add/verify `PORTFOLIO_JWT_SECRET` and complete owner/auth smoke first.
- Is broad user testing recommended? No.
- Is launch recommended? No.

## 2. Git / Branch / Sync State

- Local branch: `main`
- Initial SHA: `c13513e71e1a96647ceba256598ab7501f47429f`
- Code fix commit created in this pass: `393ff9ae73d8fd4f80efd7c91fe87a8271a0d599`
- Final docs commit: pending at report creation time
- Working tree status before documentation: no uncommitted tracked changes
- Pre-existing untracked files intentionally left untouched:
  - `Project Atlas/Comprehensive Audit 2026-06-20/`
  - `scripts/execute_schema_migration.md`
  - `scripts/test_wisehire_access.md`
  - `scripts/update_magdy_account.md`
  - `status_check.txt`

## 3. Deployment State

### Vercel

- Status: success
- Deployment URL: `https://wise-resume-d17kk176t-iam-magdy.vercel.app`
- Public production domain smoke target: `https://wiseresume.app`
- Commit SHA: `393ff9ae73d8fd4f80efd7c91fe87a8271a0d599`
- Evidence: GitHub deployment `5136403494`, state `success`, description `Deployment has completed`.

### Appwrite

| Function | Changed? | Workflow Run ID | Deployment ID | Ready/Active | Source Hash | Env Presence | Notes |
|---|---|---|---|---|---|---|---|
| `job-import` | Yes | `27884437136` | `6a37068e5b8ff5226838` | Ready/active | `c00d55c1f5ff8c8ed5bd6179d08928e6f81da4140cfa3e044b68e1b5fa964618` | Required vars present: `APPWRITE_API_KEY`, `APPWRITE_PROJECT_ID`, `APPWRITE_ENDPOINT`, `DEEPSEEK_KEY`, `GROQ_KEY_1`, `OPENROUTER_KEY_1` | Fixed to prefer DeepSeek before Groq/OpenRouter fallbacks. |
| `get-public-portfolio` | No in this pass | `27883728138` | `6a36ff71461f294e1ce4` | Ready/active | `996397a6ef20065b3c7c872b0e2bd1349b61525b879fad6ccccbfa11e5f4f98f` | Missing `PORTFOLIO_JWT_SECRET` | External blocker for protected portfolio unlock/session issuance. |
| `verify-portfolio-password` | No in this pass | `27883728138` | `6a36ff80ae087936f7bb` | Ready/active | `ceae5b6a3bb0714b8bfd8bcf0c7ece96744e5d97f087fe22fb0158f6d8ce31a4` | Required vars present | Password verification code is deployed. |
| `portfolio-gate` | No | n/a | `6a349379dda708c77208` | Ready/active | `f9ca7995dcafa60b01f9fd30cab26b54d5fc72e63fe587241ef13098327ae785` | Missing `PORTFOLIO_JWT_SECRET` | External blocker if this gate path is used for protected portfolio sessions. |
| `public-share` | No | n/a | `6a34926137a0bd9311ed` | Ready/active | `c35d751a2d60a3c088cf0e630d34a253691db934e9b859e32ac3771485207aab` | Required vars present | Public-share token secret present. |
| `ai-gateway` | No in this pass | `27883728138` | `6a36ff8e7cbdd33d3ea5` | Ready/active | `e9c40b8f3096ad73e0bad7d7c2cf5a7cb8bf7a1933c836171f950049240ff27b` | Required core/provider/security vars present; `NVIDIA_KEY_*` absent | Later Appwrite-managed auto-builds failed but remained inactive. Official workflow deployment remains active. |
| `resume-section-ai` | No | n/a | `6a3494fd6feb62c62157` | Ready/active | `a940b779e27c3a1ed756f656d510193c3183367a9ea5cb625eb4b27fee219fcc` | Required provider vars present | DeepSeek-first source already aligned. |
| `admin-devkit-data` | No | n/a | `6a36c146ec85f00d57cb` | Ready/active | `045289d347b5524bac4bd81ced20b8ac8cd6a342528e5c592cbcfc76503d135a` | Required admin vars present | Admin browser QA blocked by missing safe credentials/admin access. |

## 4. Validation Commands

| Command | Result | Notes |
|---|---|---|
| `npx tsc --noEmit` | Pass | TypeScript check passed. |
| `npm run build` | Pass | Existing non-blocking Vite `bcryptjs` browser crypto and chunk-size warnings remain. |
| `node --check appwrite-hubs/ai-gateway/src/main.js` | Pass | Syntax check. |
| `node --check appwrite-hubs/get-public-portfolio/src/main.js` | Pass | Syntax check. |
| `node --check appwrite-hubs/verify-portfolio-password/src/main.js` | Pass | Syntax check. |
| `node --check appwrite-hubs/portfolio-gate/src/main.js` | Pass | Syntax check. |
| `node --check appwrite-hubs/job-import/src/main.js` | Pass | Syntax check for changed hub. |
| `node tests/hubs/portfolio-password-verification.test.cjs` | Pass | Bcrypt and legacy SHA behavior covered locally. |
| `node tests/hubs/ai-gateway-routing.test.cjs` | Pass | DeepSeek route and tailor identity tests pass. |
| `node tests/hubs/job-import-routing.test.cjs` | Pass | New regression test confirms DeepSeek precedes Groq/OpenRouter fallbacks. |
| `npx vitest run src/lib/devkit/aiToolsCatalogue.test.ts src/lib/__tests__/workspaceSearch.test.ts` | Pass | 2 files, 13 tests. |
| `node scripts/compute-source-hashes.mjs` | Pass | Updated `job-import` hash. |
| `git diff --check` | Pass | Only line-ending warnings appeared. |

## 5. Browser / Live QA Results

| Flow | Result | Evidence | Notes |
|---|---|---|---|
| Login | Partial public shell pass | `/auth` and `/sign-in` load on `https://wiseresume.app`. | Real login blocked by missing safe test credentials. |
| Dashboard | Blocked | Protected route requires login. | No safe test credentials. |
| Create Resume | Blocked | Requires authenticated account. | No safe test credentials. |
| Upload | Blocked | Requires authenticated account. | No safe test credentials. |
| Editor Save | Blocked | Requires authenticated resume/account. | No safe test credentials. |
| Improve Summary | Blocked | Requires authenticated AI flow. | No safe test credentials. |
| Improve Bullets | Blocked | Requires authenticated AI flow. | No safe test credentials. |
| Suggest Skills | Blocked | Requires authenticated AI flow. | No safe test credentials. |
| Tailoring Hub | Blocked | Requires authenticated account. | No safe test credentials. |
| Tailoring Result | Blocked | Requires authenticated tailored resume. | No safe test credentials. |
| Designed PDF | Blocked | Requires authenticated tailored resume. | No safe test credentials. |
| ATS PDF | Blocked | Requires authenticated resume. | No safe test credentials. |
| DOCX | Blocked | Requires authenticated resume. | No safe test credentials. |
| Cover Letter | Blocked | Requires authenticated account/AI credits. | No safe test credentials. |
| Company Briefing | Blocked | Requires authenticated AI flow. | No safe test credentials. |
| Portfolio Publish | Blocked | Requires authenticated account and missing `PORTFOLIO_JWT_SECRET` prevents full protected-flow confidence. | Owner action required. |
| Portfolio Password Wrong | Blocked external | Cannot create/live test protected portfolio; required JWT secret missing. | Local regression passes only. |
| Portfolio Password Correct | Blocked external | Cannot create/live test protected portfolio; required JWT secret missing. | Local regression passes only. |
| Public Portfolio | Partial | `/p/nonexistent-codex-smoke-portfolio` route loads through SPA but no real portfolio was available. | Real public portfolio owner QA still required. |
| Public Portfolio Chat | Blocked | Requires real public portfolio/chat session. | No safe account/portfolio fixture. |
| Settings Logout | Blocked | Requires authenticated account. | No safe test credentials. |
| Mobile Smoke | Not run | Public desktop smoke only. | Lower priority while P0 external secret is missing. |

Public routes checked successfully on `https://wiseresume.app`: `/`, `/pricing`, `/auth`, `/sign-in`, `/auth/verify-email`, `/auth/reset-password`. The raw Vercel deployment URL is protected by Vercel authentication, so it could not be used for public browser QA.

Observed non-blocking browser console issue: Sentry ingest requests are blocked by Content Security Policy on public pages. This affects observability, not core user flow execution.

## 6. AI Tools Verification

| Tool | Backend Function | Primary Provider | Fallback | Auth | Credits | Result | Notes |
|---|---|---|---|---|---|---|---|
| Improve Summary | `resume-section-ai` / `ai-gateway` | DeepSeek | Groq/OpenRouter | Required | Required | Local routing pass, live blocked | No safe login. |
| Improve Bullets | `resume-section-ai` / `ai-gateway` | DeepSeek | Groq/OpenRouter | Required | Required | Local routing pass, live blocked | No safe login. |
| Suggest Skills | `resume-section-ai` / `ai-gateway` | DeepSeek | Groq/OpenRouter | Required | Required | Local routing pass, live blocked | No safe login. |
| Tailoring Hub | `ai-gateway` `tailor-resume` | DeepSeek | Limited fallback | Required | Required | Local routing pass, live blocked | No safe login. |
| Job URL Import | `job-import` | DeepSeek | Groq/OpenRouter | Required | Function-specific | Fixed/deployed | New source order and deployment verified. |
| Cover Letter | `ai-gateway` | DeepSeek | Groq/OpenRouter/NVIDIA if configured | Required | Required | Local routing pass, live blocked | No safe login. |
| Company Briefing | `ai-gateway` | DeepSeek | Groq/OpenRouter/NVIDIA if configured | Required | Required | Local routing pass, live blocked | No safe login. |
| Wise AI Chat | `ai-gateway` | DeepSeek | Groq/OpenRouter/NVIDIA if configured | Required | Required | Local routing pass, live blocked | No safe login. |
| Public Portfolio Chat | `public-share` + `ai-gateway` | DeepSeek | Groq/OpenRouter/NVIDIA if configured | Public token/session | Required/capped | Blocked | Needs real portfolio fixture and secret validation. |

## 7. Issues Found and Fixed

### Job Import Provider Order

- Severity: P2
- Root cause: `appwrite-hubs/job-import/src/main.js` built its provider pool as Groq -> OpenRouter -> DeepSeek, while the main `ai-gateway` `parse-job` route is DeepSeek-first.
- Files changed:
  - `appwrite-hubs/job-import/src/main.js`
  - `src/lib/devkit/sourceHashes.generated.json`
  - `tests/hubs/job-import-routing.test.cjs`
- Tests added/updated: added `node tests/hubs/job-import-routing.test.cjs`.
- Deploy target: `job-import`
- Verification result: local regression passed, full validation suite passed, official workflow run `27884437136` succeeded, deployment `6a37068e5b8ff5226838` is ready/active.

## 8. Issues Deferred

### Sentry CSP Console Noise

- Reason deferred: P3 observability issue; public routes still loaded and P0 external secret blocker takes priority.
- Future recommendation: update CSP/connect-src policy or Sentry transport settings so browser telemetry is accepted without console noise.

### Vercel Preview URL Authentication

- Reason deferred: Expected platform access control on deployment URL; public domain `https://wiseresume.app` is reachable.
- Future recommendation: continue using the public production domain for unauthenticated QA unless authenticated Vercel preview access is intentionally provided.

## 9. External Blockers

### Missing `PORTFOLIO_JWT_SECRET`

- GitHub repository secret: missing.
- Appwrite `get-public-portfolio` variable: missing.
- Appwrite `portfolio-gate` variable: missing.
- Severity: P0 external blocker.
- Impact: protected portfolio password verification code is deployed and local tests pass, but the live protected public portfolio flow cannot be considered safe/complete while the JWT/session signing secret is absent.
- Owner action needed: add a strong `PORTFOLIO_JWT_SECRET` through the approved secret path, deploy targeted hubs `get-public-portfolio` and `portfolio-gate`, then rerun protected portfolio wrong/correct password QA.

### Missing Safe Test Credentials

- Severity: external access blocker for browser QA.
- Impact: authenticated flows could not be verified live: dashboard, resume create/edit, upload, Tailoring Hub generation, exports, AI tools, settings/logout, DevKit.
- Owner action needed: provide or create a safe non-production-risk test account with appropriate plan/credits, plus admin access only if DevKit QA is required.

## 10. Final Recommendation

Final status: `BLOCKED_EXTERNAL_ACCESS`.

The code/deploy loop did make progress: the P2 `job-import` provider-order mismatch is fixed, tested, pushed, deployed, and verified active. However, the project cannot honestly move to `READY_FOR_TESTSPRITE_RERUN` because the P0 portfolio JWT secret is missing in the live function environment and authenticated live QA is blocked by missing safe credentials.

Next sequence:

1. Add/verify `PORTFOLIO_JWT_SECRET` in the approved deployment path.
2. Target-deploy `get-public-portfolio` and `portfolio-gate`.
3. Use a safe test account to run owner/browser smoke for protected portfolio unlock, Tailoring Hub, core AI tools, exports, settings/logout, and public portfolio chat.
4. Rerun TestSprite only after those live checks pass.
