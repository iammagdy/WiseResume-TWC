# Operational Scripts

Small Node scripts used for Appwrite deployment, build hygiene, local asset setup, screenshots, and Atlas checks.

Supabase Edge Functions are decommissioned for the active app. Any script whose name still contains `edge` or `supabase` is a legacy audit/removal aid and must not be treated as the production deploy path.

| Script | Purpose | Auth required |
| --- | --- | --- |
| `deploy_hubs.cjs` | Deploy Appwrite hubs from `appwrite-hubs/`, sync function variables, and run safe smoke executions where configured. | `APPWRITE_API_KEY`, `APPWRITE_PROJECT_ID`, `APPWRITE_ENDPOINT`; optional `DEVKIT_PASSWORD`, Resend, AI provider keys |
| `verify-live-deploy.mjs` | Verify live deployment state for the current Appwrite/Hostinger setup. | Depends on target check |
| `check-no-sourcemaps.mjs` | Build-time guard: fail the build if `dist/` ships any `.map` files. | None |
| `copy-pdf-ocr-assets.mjs` | Pre-dev/pre-build copy step for pdf.js and Tesseract worker assets. | None |
| `atlas-sync-check.ts` | Atlas inventory consistency check. Some labels still need Appwrite-native cleanup. | None |
| `setup_observability_schema.cjs` | Observability/Appwrite setup helper. | Appwrite credentials |
| `setup_app_settings_schema.cjs` | Repairs the `app_settings` key/value schema used by DevKit operational settings and deployed hashes. | Appwrite credentials |
| `setup_impersonation_sessions_schema.cjs` | Idempotently creates or repairs the server-only `admin_impersonation_sessions` collection used by DevKit Act As. The revoke-path index and required attributes fail closed; optional cleanup indexes fail softly. | Appwrite credentials |
| `setup_ai_logs_schema.cjs` | Creates the `ai_request_logs` schema used by the AI gateway request log writer. | Appwrite credentials |
| `ensure-puppeteer-chrome.mjs` | Ensure local Chromium dependency exists for screenshot/browser checks. | None |
| `capture-wallpaper.mjs`, `phase6-screenshots.mjs` | Visual capture helpers. | Local browser/runtime only |

## Canonical Deploy Path

GitHub Actions is the source of truth for Appwrite hub deployment on pushes to `main`.
The manual fallback uses the exact same script:

```bash
node scripts/deploy_hubs.cjs
```

The workflow `.github/workflows/deploy-appwrite-hubs.yml` recomputes source hashes, runs the idempotent Appwrite schema helpers, deploys hubs with `scripts/deploy_hubs.cjs`, waits for `ready`, runs safe smoke checks, and updates `app_settings.fn_deployed_hashes`.

Appwrite's own Git auto-deploy must stay disabled for managed hubs so there is only one deployment mechanism.

New backend functions must be added to:

- `appwrite-hubs/<function-id>/`
- `appwrite.json`
- `.github/workflows/deploy-appwrite-hubs.yml`
- `scripts/deploy_hubs.cjs`
- DevKit diagnostics inventory if the panel depends on it

## Legacy Scripts

`check-edge-function-db-refs.mjs` is retained only as historical migration/audit context. It references Supabase-era infrastructure and should not be used to validate production Appwrite behavior.

If a future cleanup removes the remaining Supabase-era files, update this README and Atlas in the same change.
