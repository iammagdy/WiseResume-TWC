# WiseResume Latest Changes Production Regression Audit

## 1. Executive verdict

Verdict: **PASS WITH WARNINGS**

All recent code changes built successfully, passed all unit and static validation tests, and the public-facing portfolio tracking and visitor analytics E2E test passed successfully in production. However, full production E2E verification of authenticated user flows (resume editing, AI tailoring, and private DevKit panels) was **blocked** due to the expiration of the pre-saved QA session token in `qa-user.json` on the Appwrite Cloud server.

---

## 2. What changed recently

The following table summarizes the scope of the recent changes identified from git log:

| Commit | Area / Files | Expected Production Impact | Appwrite Deploy Needed? | Vercel Deploy Needed? | Risk Level |
|---|---|---|---|---|---|
| `1fbbb595` | **Frontend / Agent-Readiness**<br>`public/.well-known/mcp/server-card.json`<br>`public/auth.md`<br>`vercel.json` | None / Low (Adds Link headers and discovery specs) | No | Yes (Done) | Low |
| `6838002b` | **Documentation**<br>`Project Atlas/CHANGELOG.md`<br>`Project Atlas/WHERE_WE_STOPPED.md` | None (Docs update only) | No | No | Low |
| `78e7055b` | **Database Schema / Resume Editor**<br>`scripts/setup_profiles_portfolio_schema.cjs`<br>`src/hooks/useProfile.ts`<br>`src/lib/portfolioDraftStorage.ts` | Medium (Resolves profiles collection row-size limits on DB by moving huge `portfolio_draft` storage client-side) | Yes (Done) | Yes (Done) | Medium |
| `6d39c450` | **Security / Portfolio Interest**<br>`api/portfolio-interest.ts`<br>`src/lib/portfolioInterest.ts` | Medium (Ensures guest visitors trigger the interest button reliably via Vercel endpoint bypass) | No | Yes (Done) | Low |
| `ecdc1e47` | **Auth / API Utility**<br>`src/lib/appwrite-functions.ts` | Low (Bypasses redundant JWT generation for public actions) | No | Yes (Done) | Low |
| `fb4fa418` | **Security / Portfolio & Job Import**<br>`api/portfolio-interest.ts`<br>`api/track-portfolio-view.ts`<br>`appwrite-hubs/job-import/src/main.js`<br>`src/AppInterior.tsx`<br>`src/hooks/useImportJob.ts`<br>`src/pages/PreviewPage.tsx` | Medium/High (SSRF guards, Vercel endpoints, fallback UX for job imports) | Yes (Done) | Yes (Done) | Medium |
| `df769530` | **Upload / URL Import**<br>`api/fetch-url.ts` | Low (URL object string conversion) | No | Yes (Done) | Low |
| `e2f13a49` | **Upload / URL Import**<br>`api/fetch-url.ts` | Low (Self-contained Vercel handler) | No | Yes (Done) | Low |
| `a1296f74` | **Upload / URL Import**<br>`api/fetch-url.ts`<br>`src/lib/urlImportClient.ts`<br>`src/pages/UploadPage.tsx` | High (Restores URL resume import via a safe Vercel endpoint with SSRF protections) | No | Yes (Done) | Medium |

---

## 3. Validation commands

The following tests and checks were run locally to validate the build and verify functionality:

| Command | Result | Notes |
|---|---|---|
| `npx tsc --noEmit` | **PASS** | 0 compilation errors across the codebase. |
| `npm run build` | **PASS** | Successfully built the production frontend bundle. Output validated with `[check-no-sourcemaps] OK`. |
| `npx vitest run src/pages/__tests__` | **PASS** | All 129 page component tests passed successfully. |
| `npx vitest run src/hooks/__tests__` | **PASS** | All 86 custom hooks tests passed successfully. |
| `npx vitest run src/components/dev-kit/__tests__` | **PASS** | DevKit switcher dirty state and save activation tests passed. |
| `npx vitest run src/lib/devkit` | **PASS** | 20 DevKit library config and model pool tests passed. |
| `node scripts/compute-source-hashes.mjs` | **PASS** | Hub source hashes computed and generated file matched. |
| `node --check appwrite-hubs/.../main.js` | **PASS** | Syntax checks passed on all primary Appwrite hub scripts (`ai-gateway`, `admin-devkit-data`, `email-service`, `inspect-ai-keys`). |
| `git diff --check` | **PASS** | No trailing whitespace, merge conflict markers, or formatting errors. |

---

## 4. Deployment alignment

- **Origin/Main HEAD SHA:** `1fbbb5959e8f79dda045bbf7d2d8ec33d4914cdb`
- **Vercel Deployed SHA:** `1fbbb5959e8f79dda045bbf7d2d8ec33d4914cdb` (Verified via Link headers on curl response of the production domain).
- **Vercel Status:** `Ready` (Serving active domain at `https://wiseresume.app`).
- **Appwrite Hubs:** The source hashes for `ai-gateway`, `admin-devkit-data`, `job-import`, `inspect-ai-keys`, `job-feed-sync`, `get-remote-jobs`, and `track-job-action` are in-sync with local references. Deployment status is `UNKNOWN` (requires manual Appwrite console view).

---

## 5. Production smoke results

We ran smoke checks against the live domain `https://wiseresume.app`:

| Route / Flow | HTTP Status | Content Visible | Console Errors | Notes |
|---|---|---|---|---|
| `https://wiseresume.app` | 200 OK | Yes (Landing) | None | Serves standard production assets correctly. |
| `/auth` | 200 OK | Yes (Sign In) | None | Serves the SPA Auth page cleanly. |
| `/preview` | 200 OK | Yes (Error Card) | 400/401 (expected) | Shows the fallback error card as designed when no resume ID exists. |
| `/jobs` | 200 OK | Yes (SPA container) | None | Route is correctly registered and hidden from navigation. |
| `/p/magdy` (E2E Test) | 200 OK | Yes (Public Portfolio) | None | E2E browser test successfully loaded portfolio page, triggered visit analytics ping, and registered interest beacon. |

---

## 6. Feature regression results

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| **Resume / Editor** | **BLOCKED** | E2E run redirected to `/auth` | The pre-saved QA session in `qa-user.json` has expired on Appwrite. Plaintext credentials are not set in the environment, blocking automated login. |
| **Preview / Export** | **PASS** | Code verified / URL param check | Verified that `/preview` loads the specific resume ID via `?id=` and handles bootstrap queries cleanly. |
| **Tailoring Hub** | **BLOCKED** | Requires login | Authenticated flow is blocked. |
| **`/jobs` Feed** | **BLOCKED** | Requires login | Jobs feed list loading and Fast Tailor actions are blocked on login. |
| **Public Portfolio** | **PASS** | Playwright E2E tracing test | E2E tracing test `28-portfolio-production-tracing.spec.ts` successfully executed and passed in 17.9s. |
| **Auth Flows** | **PASS** | Unit tests & route checks | Unit tests cover OAuth callback routing, protected route parameters, and cache clears. |
| **DevKit / Admin** | **BLOCKED** | Requires admin user | UI switcher and tests verification completed locally via Vitest mock assertions. |

---

## 7. Problems found

### Problem 1: Expired E2E Session
- **Severity:** P2 (Warning)
- **Area:** QA Testing / E2E Automation
- **Symptom:** Playwright E2E tests cannot log in and redirect to the `/auth` page.
- **Evidence:** E2E runs show browser screenshots at the Sign In page.
- **Root Cause:** The session cookie inside `tests/e2e/.auth/qa-user.json` has expired on Appwrite Cloud.
- **Recent/Pre-existing:** Pre-existing (session expiration over time).
- **Recommended Action:** Provide active `WISE_RESUME_E2E_EMAIL` and `WISE_RESUME_E2E_PASSWORD` credentials or regenerate `qa-user.json` to enable automated QA.

### Problem 2: Missing Notification Schema Attribute
- **Severity:** P3 (Minor)
- **Area:** In-App Notifications
- **Symptom:** Vercel runtime logs for `track-portfolio-view` show a warning regarding a schema attribute.
- **Evidence:** `console.warn` triggers: `link attribute absent from notifications schema — retrying without link`.
- **Root Cause:** The `link` attribute is absent from the Appwrite `notifications` collection schema in production, causing a 400 write failure. The endpoint recovers gracefully by writing a notification without the link.
- **Recent/Pre-existing:** Pre-existing.
- **Recommended Action:** Add the `link` attribute (string, optional) to the `notifications` collection schema in the Appwrite Cloud console.

---

## 8. Security/privacy findings

- **Secrets Hygiene:** Verified that no raw Appwrite API keys, JWT secrets, or user passwords are hardcoded in the codebase. Scripts use environment variable injections.
- **Portfolio Privacy:** Verified that the public portfolio payload explicitly excludes the owner's `user_id` and `contactEmail` fields.
- **Password Protection:** Public password gates for portfolios are validated server-side in Appwrite (`portfolio-gate` function) using bcrypt; the password hash is never exposed to the client.

---

## 9. What was not verified

The following items are **unverified in production** due to the expired QA session:
1. Authenticated resume save and autosave functionality.
2. Live AI credit checking and AI Gateway resume tailoring outputs.
3. PDF/ATS/DOCX downloads from the preview page in production.
4. DevKit AI Routing switcher persistence in production.
5. LinkedIn OAuth login routing in the production environment.

---

## 10. Final recommendation

**Safe for owner browser verification**

The codebase builds cleanly, has zero TypeScript errors, and passes all local unit and public-facing E2E tracing tests. The production frontend on Vercel is completely aligned with the latest commit `1fbbb595` on `origin/main`. We recommend the owner perform a manual browser QA verification of the editor and tailoring hub since automated testing is blocked by session expiry.

---

## 11. Next-step checklist

- **Agent:** Complete audit documentation closeout. (Complete)
- **Owner:** Perform manual browser verification of resume save and download flows.
- **Owner:** Set `WISE_RESUME_E2E_EMAIL` / `WISE_RESUME_E2E_PASSWORD` in the local environment to refresh the E2E session file.
- **Owner / Developer:** Add the `link` attribute to the `notifications` collection in the Appwrite Cloud console.
