> [!CAUTION]
> Historical / archived document. Do not treat as current project truth. Use Project Atlas/SOURCE_OF_TRUTH_MAP.md and living specs for current references.

# Final Post-Deploy Verification

**Date:** 2026-06-16  
**Auditor:** Cursor agent (read-only — no code/deploy/data changes)  
**Production URL:** https://wiseresume.app  
**Appwrite endpoint:** `https://fra.cloud.appwrite.io/v1` (project `69fd362b001eb325a192`)

---

## Executive summary

| Area | Result |
|------|--------|
| **Overall** | **PARTIAL PASS** |
| **GitHub Actions deploy** | **PASS** — run succeeded on `main` |
| **Deployed SHA** | **`b147a45a207f89831c4060f9f88400f6c0815d56`** (newer than hash-refresh commit `58857b16`) |
| **Schema steps** | **PASS** — all 17 schema steps succeeded |
| **Hub deploy + smoke** | **PASS** — 23 hubs deployed; 12 safe smoke checks HTTP 200 |
| **Hub alignment (`fn_deployed_hashes`)** | **PASS** — 23/23 hubs in sync with committed manifest |
| **AI provider keys** | **UNKNOWN / likely not ready** — key variables exist but values are masked; `NVIDIA_KEY_1` absent; no post-deploy key-alert in recent logs |
| **Production route smoke** | **PARTIAL** — SPA routes HTTP 200; dashboard metric strings not in public bundle; `/api/portfolio-interest` returns 500 on dummy POST |
| **TestSprite rerun** | **Conditional** — UI/auth flows can rerun; AI/tailoring tests should wait until manual AI verification passes |

---

## 1. GitHub Actions

### Latest successful run

| Field | Value |
|-------|-------|
| **Workflow** | Deploy Appwrite Hubs |
| **Run ID** | [27638431584](https://github.com/iammagdy/WiseResume-TWC/actions/runs/27638431584) |
| **Branch** | `main` |
| **Head SHA** | **`b147a45a207f89831c4060f9f88400f6c0815d56`** |
| **Conclusion** | **success** |
| **Started** | 2026-06-16T18:15:07Z |
| **Finished** | 2026-06-16T18:24:25Z (~9 min) |

### SHA context

| Commit | Message | Notes |
|--------|---------|-------|
| `58857b16` | `chore(deploy): refresh Appwrite hub source hashes` | Owner-requested hash manifest refresh |
| `f21842c9` | `chore: sync package-lock.json with package.json` | Unblocked `npm ci` |
| `5fb5f8e3` | `fix(deploy): skip audit/notification indexes…` | Schema blocker fix |
| `02e2ef75` | `fix(deploy): notifications is_read optional` | Schema blocker fix |
| **`b147a45a`** | **`fix(deploy): admin-sentry manifest lookup`** | **Successful full deploy SHA** |

The successful deploy used a **newer intentional `main` SHA** that includes the hash refresh plus deploy-pipeline fixes required to reach hub deployment.

### Schema steps (all passed)

Steps 7–23 completed successfully, including:

- Observability, app settings, AI logs, idempotency, company briefings, tailoring lineage
- Security collections (FIX-16), AI credits, edge function logs, error log
- Discount codes, feature flags, WiseHire collections, AI routing config
- Contact requests, **audit logs**, **notifications**

`Ensure source hash manifest is committed` passed (`git diff --exit-code` clean after recompute).

### Hub smoke checks (HTTP 200)

From deploy step logs:

| Hub | Result |
|-----|--------|
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

`fn_deployed_hashes` updated for **23 hubs** during this run.

---

## 2. Appwrite hub alignment (live API read)

**Audited at:** 2026-06-16 post-deploy (read-only Appwrite API)  
**Alignment source of truth:** `app_settings.fn_deployed_hashes` vs `src/lib/devkit/sourceHashes.generated.json` (16-char prefixes)

### Drift check (`check-hub-drift.cjs`)

```
NEEDS REDEPLOY (0)
IN SYNC (23): ai-gateway, admin-devkit-data, admin-email, inspect-ai-keys, admin-deploy-hubs,
  admin-feature-flags, admin-impersonate, admin-moderation, admin-onboarding-funnel,
  admin-portfolio-usernames, admin-sentry, admin-testmail, admin-visitor-analytics, ai-health,
  coupons, email-service, job-import, public-share, resume-section-ai, wisehire-gateway,
  portfolio-gate, get-public-portfolio, verify-portfolio-password
```

### Per-hub detail (requested hubs)

| Hub | Enabled | Latest deployment ID | Status | Created (UTC) | Manifest hash (16) | Recorded hash (16) | Aligned |
|-----|---------|---------------------|--------|---------------|--------------------|--------------------|---------|
| `ai-gateway` | ✅ | `6a319338307eedd944c6` | ready | 2026-06-16 18:17:28 | `1147686fcd64e214` | `1147686fcd64e214` | ✅ |
| `email-service` | ✅ | `6a319411837757d5e374` | ready | 2026-06-16 18:21:06 | `708cbafb594f178d` | `708cbafb594f178d` | ✅ |
| `admin-devkit-data` | ✅ | `6a3193790e7fe8d5af44` | ready | 2026-06-16 18:18:33 | `26f5f8ad46061464` | `26f5f8ad46061464` | ✅ |
| `public-share` | ✅ | `6a31936046fc890a07b3` | ready | 2026-06-16 18:18:08 | `c35d751a2d60a3c0` | `c35d751a2d60a3c0` | ✅ |
| `resume-section-ai` | ✅ | `6a3193150b26ac3a9e04` | ready | 2026-06-16 18:16:53 | `a940b779e27c3a1e` | `a940b779e27c3a1e` | ✅ |
| `job-import` | ✅ | `6a319328a00d43bfe631` | ready | 2026-06-16 18:17:13 | `ffdfc86493058437` | `ffdfc86493058437` | ✅ |
| `admin-impersonate` | ✅ | `6a3193deebce952efaa6` | ready | 2026-06-16 18:20:15 | `5b99360132830454` | `5b99360132830454` | ✅ |
| `admin-deploy-hubs` | ✅ | `6a3193f8121d8d3c4238` | ready | 2026-06-16 18:20:40 | `c0062754f4f9ba59` | `c0062754f4f9ba59` | ✅ |
| `admin-moderation` | ✅ | `6a3193acf0f5209922a9` | ready | 2026-06-16 18:19:25 | `d0f78abf33c164ff` | `d0f78abf33c164ff` | ✅ |
| `admin-visitor-analytics` | ✅ | `6a3193c58c4b56f1095b` | ready | 2026-06-16 18:19:49 | `13d3091b7be14b2f` | `13d3091b7be14b2f` | ✅ |
| `wisehire-gateway` | ✅ | `6a319353a2d578daf821` | ready | 2026-06-16 18:17:55 | `a705814c1177073b` | `a705814c1177073b` | ✅ |

All audited hubs have **active deployment = latest deployment** and **ready** status from run #27638431584.

**Manifest `generatedAt`:** `2026-06-16T17:25:29.218Z` (from commit `58857b16`; unchanged at deploy SHA `b147a45a` because hub sources were identical).

---

## 3. AI provider keys (`ai-gateway`)

### Function variables (management API — values masked)

| Variable | Status |
|----------|--------|
| `DEEPSEEK_KEY` | Key present (value masked by Appwrite API) |
| `OPENROUTER_KEY_1` | Key present (value masked) |
| `GROQ_KEY_1` | Key present (value masked) |
| `NVIDIA_KEY_1` | **Not configured** |

> Appwrite does not return secret values via `listVariables`; presence of the key name does **not** prove a non-empty runtime value.

### Recent execution logs (last 25, post-deploy window)

| Check | Result |
|-------|--------|
| `[ALERT] No AI provider API keys found` | **Not found** in last 25 executions |
| Post-deploy smoke execution (`6a319484409a47e3b458`) | HTTP 200, no key alert in captured stderr/stdout |
| Pool-composition logs | Not observed in recent execution capture |

### Assessment

- **Smoke reachability:** PASS (HTTP 200).
- **AI workload readiness:** **Cannot confirm PASS** without a real AI feature call.
- If runtime values are empty (e.g. GitHub secrets not populated during deploy `ensureVariable` sync), `ai-gateway` startup validation would log the key alert on cold start and **all AI tools would fail**.
- **`NVIDIA_KEY_1` is optional** for failover but missing entirely.

**Conclusion:** Treat AI tools as **not verified / possibly not ready** until owner runs one real AI Studio or Tailoring Hub action and confirms a non-error response with credit usage.

---

## 4. Production smoke (`https://wiseresume.app`)

### Public route checks

| Route | HTTP | Notes |
|-------|------|-------|
| `/dashboard` | 200 | SPA shell (`#root`) |
| `/tailoring-hub` | 200 | SPA shell |
| `/ai-studio` | 200 | SPA shell |
| `/portfolio` | 200 | SPA shell |
| `/settings` | 200 | SPA shell |
| `/templates` | 200 | SPA shell |
| `/p/demo` | 200 | Public portfolio shell |

### API

| Endpoint | Result |
|----------|--------|
| `OPTIONS /api/portfolio-interest` | 405 |
| `POST /api/portfolio-interest` (empty `{}`) | **500** — endpoint exists; failure expected without valid payload/env |

### Authenticated / bundle checks

| Check | Result |
|-------|--------|
| **Saved Jobs vs Missing Keywords** | **Not confirmed in production** — main bundle `/assets/index-D52Ct7RI.js` does not contain either string (likely auth-gated lazy chunks) |
| **Source on `main`** | **Saved Jobs** confirmed in `DashboardMetricsStrip.tsx` |
| Tailoring Hub / AI Studio / Portfolio editor (logged-in) | **Not tested** — no auth session in this audit |

---

## 5. Remaining risks

### High

1. **AI provider keys unverified at runtime** — smoke ping succeeds but real AI calls not exercised; `NVIDIA_KEY_1` missing.
2. **Authenticated UX not verified** — Saved Jobs metric, tailoring, AI Studio, portfolio editor require login.

### Medium

3. **`/api/portfolio-interest`** — 500 on dummy POST; verify Vercel `APPWRITE_API_KEY` and real payload when doing portfolio QA.
4. **Deploy SHA ≠ hash-only commit** — production hubs match manifest from `58857b16` era sources; deploy landed on `b147a45a` (includes pipeline fixes only for hub sources).

### Low

5. **`email-templates`** — no local `main.js` source (`null` in manifest); expected.
6. **Audit/notification DB indexes** — skipped due to Appwrite 767-byte index limit; queries work via scan.

---

## 6. TestSprite readiness

| Criterion | Ready? |
|-----------|--------|
| `main` builds locally | ✅ (from prior smoke audit) |
| Appwrite hubs deployed from current `main` manifest | ✅ |
| `fn_deployed_hashes` in sync | ✅ |
| GHA deploy success at current `main` | ✅ |
| AI Gateway real inference verified | ❌ / unknown |
| Authenticated dashboard/tailoring verified | ❌ |

**Recommendation:** TestSprite can be **rerun for non-AI UI flows** (auth, navigation, editor shell). **Defer or expect failures** on AI Studio, Tailoring Hub, and resume-section-ai scenarios until owner confirms one live AI call succeeds.

---

## 7. Exact next steps (owner)

1. **Log in** → Dashboard → confirm **Saved Jobs** (not Missing Keywords).
2. **AI Studio** → run one low-cost tool → confirm response + credit decrement (not provider/key error).
3. **Tailoring Hub** → tailor a resume against a job description → confirm content changes.
4. **Portfolio** → interest/contact flows on a public portfolio page.
5. If AI fails: in Appwrite Console → `ai-gateway` → Settings → Variables → confirm `DEEPSEEK_KEY`, `OPENROUTER_KEY_1`, `GROQ_KEY_1` have **non-empty** values (and optionally add `NVIDIA_KEY_1`).
6. Re-run **TestSprite** after step 2 passes.

---

## 8. Audit trail

| Item | Value |
|------|-------|
| Prior failed runs (same day) | `27637237292`, `27637558454`, `27637813870`, `27638017955` — lockfile, schema, manifest lookup blockers (all resolved) |
| Successful run | **27638431584** |
| Hash refresh commit (requested) | `58857b166ba3521829ea648408351b9852f01c98` |
| Effective deploy commit | **`b147a45a207f89831c4060f9f88400f6c0815d56`** |
