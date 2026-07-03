> [!CAUTION]
> Historical / archived document. Do not treat as current project truth. Use Project Atlas/SOURCE_OF_TRUTH_MAP.md and living specs for current references.

# Post-Deploy Alignment Fix

**Date:** 2026-06-16  
**Purpose:** Refresh stale Appwrite hub source-hash manifest so GitHub Actions deploy aligns with current `main` hub sources.

---

## 1. Git state

| Item | Value |
|------|-------|
| Branch | `main` |
| Starting SHA | `7b2b369c7a1548b4edf32d1da8b3211e2b7ce7a3` |
| **Final SHA** | **`58857b166ba3521829ea648408351b9852f01c98`** |
| Synced with `origin/main` | Yes (after push) |

### Commit created

```
58857b16 chore(deploy): refresh Appwrite hub source hashes
```

---

## 2. Source hashes

| Question | Answer |
|----------|--------|
| **Did `sourceHashes.generated.json` change?** | **Yes** — all 24 hub hashes updated to match current `appwrite-hubs/*/src/main.js` |
| **`compute-source-hashes.mjs` changed?** | No |
| **`appwrite-hubs/` changed?** | No |
| **Other files in commit?** | No — single file only |

### Notable hash updates (16-char prefix for quick reference)

| Hub | Old prefix | New prefix |
|-----|------------|------------|
| `ai-gateway` | `99ef900da5c8be27` | `1147686fcd64e214` |
| `admin-devkit-data` | `9e2991a8ae422663` | `26f5f8ad46061464` |
| `email-service` | `70356d196ca7b299` | `708cbafb594f178d` |
| `job-import` | `0b596e55a28a306d` | `ffdfc86493058437` |
| `resume-section-ai` | `6d84ff0a0e510022` | `a940b779e27c3a1e` |
| `wisehire-gateway` | `cc7ef0564d5e67fc` | `a705814c1177073b` |

Manifest now stores **full SHA-256 hex** per `scripts/compute-source-hashes.mjs` (previously held stale 16-char prefixes from the `ec404dc3` deploy era).

`generatedAt` updated to `2026-06-16T17:25:29.218Z`.

---

## 3. Validation results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **PASS** |
| `npm run build` | **PASS** (~35s) |
| `node --check appwrite-hubs/ai-gateway/src/main.js` | **PASS** |
| `node --check appwrite-hubs/email-service/src/main.js` | **PASS** |
| `node --check appwrite-hubs/admin-devkit-data/src/main.js` | **PASS** |

No product logic, hub source, or workflow files were modified.

---

## 4. Owner action — Appwrite deploy (required)

**Do not deploy from local machine.** Run manually in GitHub:

1. Go to **Actions** → **`Deploy Appwrite Hubs`**
2. Click **Run workflow**
3. **Branch:** `main`
4. **Target:** `all`
5. Confirm the run uses SHA **`58857b16…`** (not `ec404dc3` or `7b2b369c`)

### What the run should do

- Recompute hashes (should match committed manifest)
- Pass all schema setup steps
- Deploy all hubs from current `main`
- Run safe smoke checks (ai-gateway, admin-devkit-data, etc.)
- Update `fn_deployed_hashes` in Appwrite (16-char prefixes)

### Optional follow-up

- **`Deploy Email Service`** workflow if you want v2/v3 verification templates deployed separately

---

## 5. AI provider environment variables (read-only audit)

Configure these in **Appwrite Console → Functions → `ai-gateway` → Variables** (and matching **GitHub Actions secrets** for deploy). **Do not commit real values.**

### Minimum for startup (at least one required)

Startup validation (`performStartupValidation` in `appwrite-hubs/ai-gateway/src/main.js` ~L134–138) passes if **any** of these is set:

| Variable | Provider | Reference |
|----------|----------|-----------|
| `DEEPSEEK_KEY` | DeepSeek (primary for most features) | `ai-gateway/src/main.js` L135, L2899–2900, L2748–2769 |
| `GROQ_KEY_1` | Groq (fallback) | L135, L2892, `GROQ_KEY_2`, `GROQ_KEY_3` |
| `OPENROUTER_KEY_1` | OpenRouter (fallback) | L135, L2896, `OPENROUTER_KEY_2`, `OPENROUTER_KEY_3` |
| `NVIDIA_KEY_1` | NVIDIA NIM (fallback) | L135, L2903, `NVIDIA_KEY_2`, `NVIDIA_KEY_3` |

### Full AI provider pool (`buildProviderPool`, ~L2885–2904)

| Variables |
|-----------|
| `GROQ_KEY_1`, `GROQ_KEY_2`, `GROQ_KEY_3` |
| `OPENROUTER_KEY_1`, `OPENROUTER_KEY_2`, `OPENROUTER_KEY_3` |
| `DEEPSEEK_KEY` |
| `NVIDIA_KEY_1`, `NVIDIA_KEY_2`, `NVIDIA_KEY_3` |

### Other `ai-gateway` env vars (non-AI but required for features)

| Variable | Purpose |
|----------|---------|
| `APPWRITE_API_KEY` or `APPWRITE_FUNCTION_API_KEY` | DB / Appwrite operations |
| `RESEND_API_KEY` | Contact email feature |
| `TURNSTILE_SECRET_KEY` | Portfolio contact form verification |
| `GATEWAY_SMOKE_SECRET` | Internal smoke tests |
| `ADMIN_TEST_HMAC_SECRET` | DevKit signed tests |
| `PUBLIC_SHARE_TOKEN_SECRET` | Public share tokens |

### `resume-section-ai` hub

| Variable | Reference |
|----------|-----------|
| `DEEPSEEK_KEY` | `resume-section-ai/src/main.js` L111–112 |

### `wisehire-gateway` hub

| Variable | Reference |
|----------|-----------|
| `DEEPSEEK_KEY`, `GROQ_KEY_1`, `OPENROUTER_KEY_1`, `NVIDIA_KEY_1` | `wisehire-gateway/src/main.js` L55–58 |

### GitHub Actions secrets injected on deploy

From `.github/workflows/deploy-appwrite-hubs.yml` deploy step:  
`DEEPSEEK_KEY`, `GROQ_KEY_1–3`, `OPENROUTER_KEY_1–3`, `NVIDIA_KEY_1–3`, plus `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, etc.

> **Live alert root cause:** Recent `ai-gateway` executions logged `[ALERT] No AI provider API keys found` — at least **`DEEPSEEK_KEY`** (recommended) or one fallback key must be set **in Appwrite function environment** after deploy. GitHub secrets alone do not persist unless the deploy script pushes them to each function.

---

## 6. Readiness checklist

| Gate | Ready? |
|------|--------|
| Hash manifest matches `main` hub sources | **Yes** (after `58857b16`) |
| Build / typecheck | **Yes** |
| Appwrite hubs deployed from `58857b16` | **No** — owner must run GHA deploy |
| AI keys configured in Appwrite | **Unknown** — verify after deploy |
| **Ready for Appwrite deploy** | **Yes** — run workflow now |
| **Ready for TestSprite** | **No** — complete deploy + verify AI keys + manual QA first |

---

## 7. Post-deploy verification (after owner runs GHA)

1. Confirm GHA run `headSha` = `58857b16…`, conclusion = success
2. Confirm smoke checks HTTP 200 in logs
3. Check `ai-gateway` logs — **no** `[ALERT] No AI provider API keys found`
4. Run one low-cost AI action (e.g. tailor smoke) without burning credits
5. Re-run post-deploy verification doc checklist

---

*Alignment fix completed 2026-06-16. One commit pushed; no local deploy; no Appwrite data changes.*
