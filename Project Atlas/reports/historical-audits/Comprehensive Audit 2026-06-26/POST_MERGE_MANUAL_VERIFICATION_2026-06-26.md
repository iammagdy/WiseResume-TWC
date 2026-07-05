# Post-Merge Manual Verification Report — 2026-06-26

**PR:** #129 — `repair/audit-findings-2026-06-26` → `main`
**Merge commit:** `7794704910fe05ceedbce9b4e777d4602204ad9b`
**Closeout commit:** `f5b465809bde260785f5d9739e6dd083f516f27b`
**Verification date:** 2026-06-26
**Verifier:** Cascade (automated + manual checks)

---

## 1. Repo / GitHub State — ✅ VERIFIED

| Check | Result |
|-------|--------|
| `main` contains merge commit `77947049` | ✅ Confirmed via `git merge-base --is-ancestor` |
| Closeout note commit `f5b46580` on `main` | ✅ Confirmed in `git log` (local + remote synced) |
| No unexpected commits after closeout | ✅ `f5b46580` is HEAD of `main`; only 2 commits added (merge + closeout) |
| Local/remote `main` in sync | ✅ Both at `f5b46580` |

---

## 2. F3 — Vercel Production — ✅ VERIFIED

| Check | Result |
|-------|--------|
| GitHub Deployments API: Production deployment for `77947049` | ✅ Deployed at 2026-06-26T02:56:49Z, environment=Production |
| GitHub Deployments API: Production deployment for `f5b46580` | ✅ Deployed at 2026-06-26T02:58:41Z, environment=Production |
| Commit status for `77947049` | ✅ Vercel: SUCCESS — "Deployment has completed" |
| Commit status for `f5b46580` | ✅ Vercel: SUCCESS — "Deployment has completed" |
| Production site `wiseresume.app` responding | ✅ Live, serving content (title: "Wiseresume AI - AI Resume Editor") |

**F3 verdict:** Vercel production is **Ready** and serving the latest `main` commit (`f5b46580`).

---

## 3. F2 — Appwrite Live Deployment Hashes — ❌ UNAVAILABLE (owner action required)

**Status:** Cannot verify from this environment.

**Reason:** No Appwrite CLI installed, no `.appwrite` config file, no Appwrite API key/token available in this environment.

**Expected current source hashes (from `sourceHashes.generated.json` on `main`):**

| Hub | Expected Hash |
|-----|---------------|
| `admin-visitor-analytics` | `f22a75b5b7639663e1abedb80457991cd79b461314b65c5372cb16ea2dd48a1b` |
| `track-visitor-event` | `6cc18cdf69520f65203d8b3be3bfa29f0193e2be122ad3091af4d566f91befdc` |
| `email-service` | `255a4afe3d5707c73136f00b597797d9eaa3f9ae2487752cb1917cd6e301bfda` |

**Owner verification steps:**

1. Open Appwrite Console → Functions → `admin-visitor-analytics` → Settings → Source
2. Compare the deployed source hash with `f22a75b5…` above
3. Repeat for `track-visitor-event` (expected `6cc18cdf…`) and `email-service` (expected `255a4afe…`)
4. Alternatively, run locally: `node scripts/compute-source-hashes.mjs` to get current hashes, then compare with Appwrite Console deployments

**If drift is confirmed:**
- Do NOT run `target=all`
- Recommend a narrow, owner-approved deploy only: `node scripts/deploy_hubs.cjs --only=admin-visitor-analytics,track-visitor-event,email-service`

---

## 4. F13 — `VITE_TURNSTILE_SITE_KEY` in Vercel — ❌ UNAVAILABLE (owner action required)

**Status:** Cannot verify from this environment.

**Reason:** Vercel CLI is not installed locally and no Vercel API token is available for programmatic access.

**Owner verification steps:**

1. Go to Vercel Dashboard → `wise-resume-twc` project → Settings → Environment Variables
2. Filter for `production` environment
3. Confirm `VITE_TURNSTILE_SITE_KEY` exists (do not share its value)
4. If present: visit a published portfolio page (e.g., `wiseresume.app/u/<username>`) and use the contact form — verify no "Security check required" error appears
5. If missing: add `VITE_TURNSTILE_SITE_KEY` to Vercel production environment variables and trigger a redeploy

---

## 5. F14 — Appwrite GitHub App Suspension — ⚠️ PARTIALLY VERIFIED

| Check | Result |
|-------|--------|
| Repo webhooks (GitHub API) | ✅ Empty array — no webhooks configured on `iammagdy/WiseResume-TWC` |
| GitHub Actions triggered by merge/closeout push | ✅ No Actions ran on push to `main` (only PR Validation ran on the PR itself) |
| GitHub App installation status | ❌ Cannot query — `user/installations` API returns 403 (requires GitHub App-scoped token) |

**What we can confirm:** No webhooks are configured on the repo, and no GitHub Actions fired from the merge or closeout push. This is consistent with the Appwrite GitHub App being suspended/disconnected, but does not constitute direct proof.

**Owner verification steps:**

1. Go to GitHub → Settings → Integrations → Applications (or GitHub → Settings → Installed GitHub Apps)
2. Find the Appwrite GitHub App
3. Confirm it shows as "Suspended" or is not installed for `iammagdy/WiseResume-TWC`
4. Alternatively, check Appwrite Console → Settings → Platforms → VCS — confirm GitHub integration is disabled/suspended

---

## 6. Summary Table

| Finding | Description | Verdict |
|---------|-------------|---------|
| F2 | Appwrite live deployment hashes match source | ❌ Unavailable — owner must verify in Appwrite Console |
| F3 | Vercel production serves latest `main` | ✅ Verified — production is Ready, serving `f5b46580` |
| F13 | `VITE_TURNSTILE_SITE_KEY` set in Vercel | ❌ Unavailable — owner must check Vercel dashboard |
| F14 | Appwrite GitHub App suspended | ⚠️ Partially verified — no webhooks, no Actions fired, but direct App status unverifiable |

---

## 7. Appwrite Deploy Needed?

**No.** No hub source code changed in PR #129. The manifest was updated to reflect already-deployed hubs. Appwrite deploy is only needed if F2 owner verification reveals live drift.

If drift is confirmed, deploy only: `--only=admin-visitor-analytics,track-visitor-event,email-service` (never `target=all`).

---

## 8. Vercel Status

**Ready.** Production deployment completed successfully for both the merge commit (`77947049`) and the closeout commit (`f5b46580`). Site is live at `wiseresume.app`.

---

## 9. Known Follow-ups (separate PRs, not blocking)

- **`src/pages/__tests__/AIStudioPage.test.tsx`** — 2 pre-existing failures: button role `/close humanize…/` not found (UI likely renamed)
- **`src/components/templates/__tests__/WiseResumeClassicTemplate.test.tsx`** — 1 pre-existing failure: expects `href="https://resume.thewise.cloud"` but app uses `https://wiseresume.app`

Both files were last modified at `5436b9c1` (before this branch) and are unrelated to PR #129.

---

## 10. Final Verdict

### **READY WITH OWNER CHECKS REMAINING**

- Vercel production is live and serving the latest `main` commit ✅
- No Appwrite deploy is required at this time ✅
- No Appwrite VCS auto-builds fired from the merge ✅
- Three owner manual checks remain:
  - **F2:** Appwrite live deployment hash verification (console)
  - **F13:** `VITE_TURNSTILE_SITE_KEY` presence in Vercel (dashboard)
  - **F14:** Appwrite GitHub App suspension confirmation (GitHub settings)
- Pre-existing test failures are documented for a separate follow-up PR
