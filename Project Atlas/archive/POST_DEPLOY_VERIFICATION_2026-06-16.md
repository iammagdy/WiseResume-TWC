# Post-Appwrite Deploy Verification

**Date:** 2026-06-16  
**Repo HEAD audited:** `7b2b369c7a1548b4edf32d1da8b3211e2b7ce7a3` (`main`)  
**Auditor:** Cursor agent (read-only — no code/deploy/data changes)

---

## 1. Executive summary

| Question | Result |
|----------|--------|
| **Overall status** | **PARTIAL PASS** |
| **GitHub Actions deploy at HEAD SHA?** | **No** — latest successful `Deploy Appwrite Hubs` run used **`ec404dc3`**, not `7b2b369c` |
| **Appwrite hubs active?** | **Yes** — all 11 audited hubs `enabled: true`, latest deployment `status: ready` |
| **Hub code matches current `main`?** | **No** — source-hash manifest vs live `main.js` mismatch on **all 11** audited hubs |
| **Production frontend smoke** | **Partial** — routes return HTTP 200 SPA shell; dashboard metric strings not confirmed in public bundles |
| **AI Gateway healthy?** | **No** — recent live logs show `[ALERT] No AI provider API keys found` |
| **Ready for TestSprite rerun?** | **Not yet** — redeploy hubs from `7b2b369c`, fix AI keys, manual QA first |

---

## 2. GitHub Actions deployment

### Latest `Deploy Appwrite Hubs` run (GitHub API)

| Field | Value |
|-------|-------|
| **Run ID** | [27592167248](https://github.com/iammagdy/WiseResume-TWC/actions/runs/27592167248) |
| **Status** | `completed` |
| **Conclusion** | **success** |
| **Branch** | `main` |
| **HEAD SHA deployed** | **`ec404dc3d5e0e5bef83ff42b11253c8fd30bfd96`** |
| **Target SHA requested** | `7b2b369c7a1548b4edf32d1da8b3211e2b7ce7a3` |
| **Started** | 2026-06-16T03:30:26Z |
| **Finished** | 2026-06-16T03:39:16Z (~9 min) |

### Run for `7b2b369c`?

**Not found.** Queries for:
- `gh run list --workflow=deploy-appwrite-hubs.yml --commit 7b2b369c…`
- `gh run list --status in_progress`

returned **no runs** for the current HEAD SHA.

> **Interpretation:** The successful deploy recorded in GitHub Actions predates the large merge follow-up commits (`7d2cac77` merge + 4 cherry-picks). If a deploy was triggered manually after the merge, it does **not** appear as a completed GitHub Actions run for `7b2b369c` at audit time.

### Schema setup steps (run 27592167248)

All schema steps in the workflow **passed** (steps 7–9 and deploy step 10 succeeded):

- Observability schema
- App settings schema
- AI logs schema
- (Additional schema scripts run inside deploy step prior to hub packaging)

### Smoke checks (inside deploy step)

From workflow logs — **all returned HTTP 200**:

| Hub smoke-tested | Result |
|------------------|--------|
| `ai-gateway` | HTTP 200 |
| `ai-health` | HTTP 200 |
| `admin-devkit-data` | HTTP 200 |
| `admin-email` | HTTP 200 |
| `admin-feature-flags` | HTTP 200 |
| `admin-moderation` | HTTP 200 |
| `admin-portfolio-usernames` | HTTP 200 |
| `admin-visitor-analytics` | HTTP 200 |
| `admin-onboarding-funnel` | HTTP 200 |
| `inspect-ai-keys` | HTTP 200 |
| `admin-deploy-hubs` | HTTP 200 |
| `admin-sentry` | HTTP 200 |

`fn_deployed_hashes` updated for 23 hubs including portfolio security functions.

---

## 3. Appwrite hub deployment state (live API read)

**Endpoint:** `https://fra.cloud.appwrite.io/v1`  
**Project:** `69fd362b001eb325a192`  
**Audited at:** 2026-06-16T17:18Z

| Hub | Enabled | Latest deployment ID | Status | Created (UTC) | Manifest hash (16) | Live `main.js` hash (16) | Match |
|-----|---------|-------------------|--------|---------------|--------------------|--------------------------|-------|
| `ai-gateway` | ✅ | `6a3180323e43dccdcf62` | **ready** | **2026-06-16 16:56:18** | `99ef900da5c8be27` | `1147686fcd64e214` | ❌ |
| `email-service` | ✅ | `6a30c4881aa4782c8bba` | ready | 2026-06-16 03:35:36 | `70356d196ca7b299` | `708cbafb594f178d` | ❌ |
| `admin-devkit-data` | ✅ | `6a30c3e638c3aaaeaf88` | ready | 2026-06-16 03:32:54 | `9e2991a8ae422663` | `26f5f8ad46061464` | ❌ |
| `public-share` | ✅ | `6a30c3cc63ddc83b97a1` | ready | 2026-06-16 03:32:28 | `4a69d846ba79e6fb` | `c35d751a2d60a3c0` | ❌ |
| `resume-section-ai` | ✅ | `6a30c3843edb651c1850` | ready | 2026-06-16 03:31:16 | `6d84ff0a0e510022` | `a940b779e27c3a1e` | ❌ |
| `job-import` | ✅ | `6a30c391cb875cf8aa26` | ready | 2026-06-16 03:31:30 | `0b596e55a28a306d` | `ffdfc86493058437` | ❌ |
| `admin-impersonate` | ✅ | `6a30c4523dab0c856c64` | ready | 2026-06-16 03:34:42 | `cf8ff461a9068f43` | `5b99360132830454` | ❌ |
| `admin-deploy-hubs` | ✅ | `6a30c46cacf871a72e13` | ready | 2026-06-16 03:35:09 | `9a99051c1aa407bd` | `c0062754f4f9ba59` | ❌ |
| `admin-moderation` | ✅ | `6a30c41d8de1ffa0c62d` | ready | 2026-06-16 03:33:49 | `58331bf2a13b397f` | `d0f78abf33c164ff` | ❌ |
| `admin-visitor-analytics` | ✅ | `6a30c4381a0204308924` | ready | 2026-06-16 03:34:16 | `cc53c536d68aa1ff` | `13d3091b7be14b2f` | ❌ |
| `wisehire-gateway` | ✅ | `6a30c3bd1abf659082ad` | ready | 2026-06-16 03:32:13 | `cc7ef0564d5e67fc` | `a705814c1177073b` | ❌ |

### Notes on hash drift

- Committed manifest (`src/lib/devkit/sourceHashes.generated.json` at `7b2b369c`) reflects the **`ec404dc3` deploy era** (generated 2026-06-16T03:31:13Z during GHA).
- Current `main` hub sources (post-merge) differ on **every audited hub**.
- **`ai-gateway` was redeployed again at 16:56 UTC** (deployment ID `6a3180323e43dccdcf62`), suggesting a **partial/manual redeploy** after the 03:39 GHA run — still does not match committed manifest hash for current source.

---

## 4. Production smoke checks (`https://wiseresume.app`)

| Check | Result | Evidence |
|-------|--------|----------|
| `/dashboard` | **PASS** (shell) | HTTP 200, HTML contains `#root` |
| `/tailoring-hub` | **PASS** (shell) | HTTP 200 |
| `/ai-studio` | **PASS** (shell) | HTTP 200 |
| `/portfolio` | **PASS** (shell) | HTTP 200 |
| `/settings` | **PASS** (shell) | HTTP 200 |
| `/templates` | **PASS** (shell) | HTTP 200 |
| `/preview` | *(not tested — same SPA pattern expected)* | — |
| `/p/demo` (public portfolio) | **PASS** (shell) | HTTP 200 |
| **Saved Jobs vs Missing Keywords** | **UNKNOWN** (prod) | Strings not found in 7 public JS chunks crawled from index; **source on `main` confirms Saved Jobs** in `DashboardMetricsStrip.tsx` |
| **`/api/portfolio-interest`** | **PARTIAL** | OPTIONS → 405; POST → **500** (endpoint exists, fails without valid Appwrite env/data — expected for dummy payload) |
| **`/api/health`** | **FAIL** | HTTP 404 on Vercel (health may be on separate API server only) |

### Security spot-checks (static, unchanged)

- Public portfolio hook uses `portfolio-gate` + `get-public-portfolio` Appwrite functions (no browser `password_hash` read on public flow).
- SSRF guards present in repo (`src/lib/security/ssrfGuards.ts`).
- Impersonation uses HMAC (`admin-impersonate`).

---

## 5. AI Gateway quick safety check

| Check | Result |
|-------|--------|
| `tailor-resume` path in source | **Present** — dedicated handlers + schema in `ai-gateway/src/main.js` |
| DeepSeek-first routing | **Present** — `'tailor-resume': { provider: 'deepseek', model: DEEPSEEK_MODEL }` |
| `node --check` on live source | **PASS** |
| Recent production executions | **ALERT** — logs include: `[ALERT] ai-gateway: No AI provider API keys found — all AI requests will fail` |
| Smoke execution (from deploy) | HTTP 200 (`smoke-check` ping) |

**Conclusion:** Gateway is **reachable** but **not safe for real AI workloads** until provider API keys are configured in Appwrite function environment.

---

## 6. Risks

### Blocker
1. **Hub source drift** — Production Appwrite functions do **not** match post-merge `main` source for audited hubs (manifest vs live hash mismatch on all 11).

### High
2. **No GHA deploy at `7b2b369c`** — Latest successful Actions deploy is **`ec404dc3`**, missing merge-era hub changes (+1,957 lines in `ai-gateway` alone vs that SHA).
3. **Missing AI provider keys** — Live `ai-gateway` logs alert that all AI requests will fail.
4. **Stale `sourceHashes.generated.json`** — DevKit deploy gate may show false “up to date” or block until manifest refreshed.

### Medium
5. **Portfolio interest API** — Endpoint exists but returned 500 on dummy POST (verify `APPWRITE_API_KEY` on Vercel).
6. **Production dashboard metric** — Could not confirm Saved Jobs string in crawled production bundles (auth-gated lazy chunks).
7. **Partial `ai-gateway` redeploy** — Only `ai-gateway` shows a 16:56 UTC deployment; other hubs remain on 03:31–03:35 UTC deploy.

### Low
8. **`/api/health` 404** on production domain — may be by design (Vercel vs Express server).

---

## 7. Appwrite deployment checklist (recommendation — not executed)

| Action | Priority |
|--------|----------|
| Re-run **`Deploy Appwrite Hubs`** from branch `main` at SHA **`7b2b369c`** (target: **`all`**) | **Critical** |
| Verify run appears in GitHub Actions with `headSha = 7b2b369c…` | Critical |
| Confirm `fn_deployed_hashes` updates and smoke checks pass | High |
| Optionally run **`Deploy Email Service`** for v2/v3 verification templates | Medium |
| Verify Appwrite env vars: `DEEPSEEK_KEY`, `OPENROUTER_KEY_1`, `GROQ_KEY_1`, etc. on `ai-gateway` | Critical |
| Verify Vercel env: `APPWRITE_API_KEY` for `portfolio-interest` | High |

**Do not** consider deployment complete until GHA run matches current `main` SHA and hash manifest is recomputed/committed.

---

## 8. Recommended manual QA (before TestSprite)

1. Log in → Dashboard → confirm **Saved Jobs** metric (not Missing Keywords).
2. Tailoring Hub → run tailor on a real resume + job → confirm changes + unchanged guard.
3. AI Studio → run one low-cost tool → confirm credits decrement and response (not key alert).
4. Public portfolio → interest button + contact form + password gate.
5. Signup → verify branded verification email (after `email-service` deploy).
6. DevKit → Deploy Hubs panel → confirm no hubs show “source drift”.

---

## 9. TestSprite readiness

| Criterion | Ready? |
|-----------|--------|
| `main` builds | ✅ |
| Hubs deployed from `7b2b369c` | ❌ |
| AI keys configured | ❌ (live alert) |
| Production feature smoke | ⚠️ Partial |
| **Rerun TestSprite now?** | **No** — redeploy hubs from current `main`, fix AI keys, complete manual QA checklist above |

---

## 10. Owner-friendly summary

GitHub Actions shows a **successful** full hub deploy earlier today, but it ran from commit **`ec404dc3`**, **not** the current merge HEAD **`7b2b369c`**. All Appwrite functions we checked are **online and ready**, but their deployed code **does not match** the merged source on `main` yet. The website **loads** on all main routes, but we could not fully confirm the new **Saved Jobs** dashboard label in production without logging in. The AI gateway is **up** but recent logs warn **no AI API keys are configured**, so tailoring and AI tools may still fail. **Do not rerun TestSprite yet** — trigger another **Deploy Appwrite Hubs (all)** from current `main`, confirm the GitHub run uses SHA `7b2b369c`, fix AI keys, then do quick manual checks.

---

*Verification completed 2026-06-16. No code commits, pushes, deployments, or Appwrite mutations were performed.*
