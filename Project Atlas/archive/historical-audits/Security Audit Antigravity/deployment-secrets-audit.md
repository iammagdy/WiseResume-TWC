# Deployment / Secrets / Environment Audit — WiseResume-TWC

**Date:** 2026-06-09 | **Audited commit:** `main` @ `96beb3ec`  
**Files:** `.github/workflows/deploy-appwrite-hubs.yml`, `scripts/compute-source-hashes.mjs`, `.env.example`, `appwrite.json`

---

## 1. GitHub Actions Workflow Security

### Trigger
```yaml
on:
  workflow_dispatch:
    inputs:
      target:
        description: 'Hub target to deploy ("all" or comma-separated hub ids)'
        required: false
        default: 'all'
```

**Assessment:** `workflow_dispatch` only — no automatic trigger on push or PR. Deployments require manual initiation. ✅

### Source Hash Integrity Check
```yaml
- name: Recompute hub source hashes
  run: node scripts/compute-source-hashes.mjs

- name: Ensure source hash manifest is committed
  run: git diff --exit-code -- src/lib/devkit/sourceHashes.generated.json
```

Before deploying any hub, the workflow recomputes all source hashes and verifies they match the committed manifest. If a hub was modified without updating the manifest, the workflow fails. ✅

**Gap:** Source hash is truncated to 16 hex chars (WR-2026-013). Adequate for accidental drift detection; marginally weaker against crafted collision.

### Secret Injection
All secrets are injected as GitHub Actions secrets, not hardcoded. Pattern: `${{ secrets.SECRET_NAME }}`. ✅

Secrets used in the workflow:
- `APPWRITE_API_KEY`, `ADMIN_EMAIL`
- `OPENROUTER_KEY_1/2/3`, `GROQ_KEY_1/2/3`, `DEEPSEEK_KEY`, `NVIDIA_KEY_1/2/3`
- `DATADOG_API_KEY`, `DD_API_KEY`, `DD_SITE`
- `DEVKIT_PASSWORD`, `IMPERSONATION_HMAC_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`
- `GITHUB_TOKEN` (aliased from `DEPLOY_GITHUB_TOKEN`)
- `VITE_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_ORG_SLUG`, `SENTRY_PROJECT_SLUG`, `SENTRY_WEBHOOK_SECRET`

Note: `IMPERSONATION_HMAC_SECRET` IS listed as a secret in the workflow — this indicates it's intended to be configured. Status of whether it's actually set in GitHub/Appwrite: UNKNOWN. See WR-2026-003.

### Concurrency Control
```yaml
concurrency:
  group: deploy-appwrite-hubs-${{ github.ref }}
  cancel-in-progress: true
```

Prevents simultaneous deployments on the same branch. ✅

---

## 2. Source Hash Truncation (WR-2026-013) — P2

`scripts/compute-source-hashes.mjs` computes SHA-256 of each hub's source but stores only 16 hex characters:

```js
const hash = crypto.createHash('sha256')
  .update(content)
  .digest('hex')
  .slice(0, 16);   // ← truncation to 64 bits
```

**Risk:** Birthday collision space is 2^32 pairs (~4 billion). For random accidental drift detection, this is more than sufficient. For a motivated attacker constructing a malicious hub that produces an identical 16-char prefix, a brute-force collision requires ~4 billion SHA-256 computations — feasible on modern hardware in minutes to hours.

**Full 64-char SHA-256** would make crafted collision computationally infeasible (2^128 pairs).

**Fix:** Remove `.slice(0, 16)` to use the full hash. Update any length-sensitive comparison logic.

---

## 3. IMPERSONATION_HMAC_SECRET Configuration Status

The GHA workflow lists `IMPERSONATION_HMAC_SECRET: ${{ secrets.IMPERSONATION_HMAC_SECRET }}` as a deployment secret (line 102 of the workflow). This indicates it is INTENDED to be configured.

**STATUS: UNKNOWN** — whether the secret is actually set in the GitHub repository secrets (Appwrite deploy) AND in Appwrite Console function environment variables.

If `IMPERSONATION_HMAC_SECRET` is not set, `admin-devkit-data` falls back to `APPWRITE_API_KEY`. The fallback is a safety net, not an intended configuration.

**Manual verification:**
1. GitHub → Settings → Secrets and Variables → Actions → verify `IMPERSONATION_HMAC_SECRET` exists
2. Appwrite Console → Functions → Admin DevKit Data Hub → Settings → Environment Variables → verify `IMPERSONATION_HMAC_SECRET` exists

---

## 4. No Secrets in Hub Logs

```bash
$ grep -rn "console\.(log|error|warn)(.*process\.env" appwrite-hubs/*/src/main.js
(no output)
```

No env var values are logged to console in any hub. ✅

---

## 5. No Committed .env Files

```bash
$ find . -name ".env" -not -path "*/node_modules/*"
(no output)
```

No `.env` files committed. `.env.example` is present for documentation. ✅

---

## 6. .env.example Stale Entries (WR-2026-020) — P3

`.env.example` contains references to `KINDE_*` and `SUPABASE_*` environment variables from decommissioned providers. These are documentation artifacts, not live secrets.

**Risk:** Misleads new developers about the current auth/database setup. May cause confusion when setting up a new environment.

---

## 7. appwrite.json Function $id Empty (WR-2026-021) — P3

All 20 functions have `"$id": ""`. The Appwrite CLI uses function `name` for matching when `$id` is empty. If a function name changes in the Console without updating `appwrite.json`, the next deployment creates a duplicate function.

**Verification:**
1. In the Appwrite Console, each function has a unique ID in the URL (e.g., `...functions/6abc123.../overview`)
2. Copy each function's ID into `appwrite.json` to enable stable ID-based updates

---

## 8. Legacy Live API Calls — None Found ✅

```bash
$ grep -rni "supabase|kinde|revenuecat|stripe" appwrite-hubs/*/src/main.js
(no output — after filtering comments)
```

No live API calls to decommissioned providers in any deployed function. ✅

---

## 9. Env Var Audit — Complete List

All environment variables referenced across hubs (deduplicated):
```
ADMIN_EMAIL
APPWRITE_API_KEY
APPWRITE_ENDPOINT
APPWRITE_FUNCTION_API_ENDPOINT
APPWRITE_FUNCTION_API_KEY
APPWRITE_FUNCTION_PROJECT_ID
APPWRITE_PROJECT_ID
DATADOG_API_KEY
DD_API_KEY
DD_SITE
DEEPSEEK_KEY
DEVKIT_PASSWORD
FRONTEND_URL
GITHUB_REPO
GITHUB_TOKEN
GROQ_KEY_1
GROQ_KEY_2
GROQ_KEY_3
IMPERSONATION_HMAC_SECRET
NVIDIA_KEY_1
NVIDIA_KEY_2
NVIDIA_KEY_3
OPENROUTER_KEY_1
OPENROUTER_KEY_2
OPENROUTER_KEY_3
RESEND_API_KEY
RESEND_FROM_EMAIL
RESEND_FROM_NAME
SENTRY_AUTH_TOKEN
TESTMAIL_NAMESPACE
```

All are consumed via `process.env.*` with no logging. ✅

---

## 10. Deployment Pipeline Trust

The deploy pipeline is:
1. Manual `workflow_dispatch` trigger (no auto-deploy)
2. Source hash manifest recomputation and diff check
3. Schema setup scripts run (idempotent)
4. Hub deployment via `scripts/deploy_hubs.cjs`

The source hash check prevents deploying hubs whose source has changed without the manifest being updated. This is a meaningful integrity control.

**Gap:** The hash check only verifies the manifest is current with the source — it does not prevent an authorized deployer from updating both the source AND the manifest together (intentional or malicious). Supply chain protection relies on GitHub branch protection rules and team access controls.
