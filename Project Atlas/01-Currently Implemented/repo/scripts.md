# `scripts/`

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `scripts/`.

**Canonical owner:** Repo-level CI/CD and maintenance scripts. Most are referenced from `package.json` scripts or GitHub Actions.

---

| Script | Purpose |
|---|---|
| `apply-kinde-branding.mjs` | Logs into Kinde dashboard via Puppeteer and applies brand colors + logo. `--wisehire` flag for the blue brand. |
| `kinde-brand-console.js` | Browser-console helper for manual Kinde branding tweaks. |
| `capture-wallpaper.mjs` | Puppeteer capture of the `/wallpaper` page (used for marketing assets). |
| `phase6-screenshots.mjs` | 12-shot landing-matrix capture (WiseResume × WiseHire × light/dark × hero/mid/post) + emits TTFB/FCP/LCP per variant. |
| `check-edge-function-db-refs.mjs` | Static guard against Audit finding H1 (Task #11): edge fns referencing non-existent tables/RPCs. |
| `check-edge-functions-deployed.mjs` | Local source dirs vs deployed Supabase functions parity (+ `--all` checks per Task #68 / Phase 4). |
| `check-no-sourcemaps.mjs` | Bans `.map` files in `dist/` unless `SENTRY_AUTH_TOKEN` is set. |
| `check-supabase-migration-drift.mjs` | Lists migration files not present in `supabase_migrations.schema_migrations`. Exit 1 on drift. |
| `edge-fn-monthly-reaudit.mjs` | Monthly probe-set re-runner; writes `reports/edge-fn-drift-<YYYY-MM-DD>.md`. |
| `edge-fn-drift-allowlist.json` | Allow-list consumed by the drift checker. |
| `smoke-test-edge-functions.mjs` | Post-deploy smoke test for catastrophic regressions (deploy fail, startup crash, CORS, dispatch, auth gate). |
| `verify-live-deploy.mjs` | End-to-end live-deploy verification. |
| `probe-webhooks-signed.mjs` | Live signed-payload probes for `auth-email-hook` (standard webhooks) + `kinde-webhook` (Kinde HMAC). |
| `preview-waitlist-emails.mjs` | Generates HTML previews of WiseHire waitlist emails; optionally sends to Resend sandbox without DB writes. |
| `copy-pdf-ocr-assets.mjs` | Copies pinned `eng.traineddata.gz` (SHA-256 verified) for PDF OCR. |
| `ensure-puppeteer-chrome.mjs` | Ensures Puppeteer's bundled Chrome is installed (Replit / CI safety). |
| `deploy-functions.sh` | Bulk Supabase edge-function deploy. |
| `refresh-devkit-secrets.sh` | Refreshes DevKit secret material. |
| `post-merge.sh` | Post-merge setup hook (see `post_merge_setup` skill). |
| `atlas-sync-check.ts` | Atlas freshness checker. |
| `README.md` | Per-script usage. |

## Hard rules
- Scripts that talk to Supabase require `SUPABASE_ACCESS_TOKEN` in env — never hard-code tokens.
- `check-edge-function-db-refs.mjs`, `check-edge-functions-deployed.mjs`, and `check-supabase-migration-drift.mjs` should run in CI on every PR touching `supabase/`.
- `smoke-test-edge-functions.mjs` runs post-deploy via the GitHub Actions workflow.
