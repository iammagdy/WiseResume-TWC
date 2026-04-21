# Phase 7 — Deploy verification + DevTools exposure hardening (2026-04-21)

**Last verified:** 2026-04-21

## Why
Two adjacent gaps in the live-site posture surfaced this week:

- **Stale-deploy invisibility (Task #29).** A v3.5 upload to Hostinger
  reported "successful" yet the live site continued to serve v3.4. Curl
  probes against origin (Hostinger CDN was `DYNAMIC`, not caching)
  showed every file timestamped two days earlier, the live `index.html`
  referenced an asset hash present in no local v3.5 build, and the
  `.htaccess` on Hostinger was the v3.4-era version (Task #22's
  no-cache rules and Task #26's headers were both absent). Most likely
  cause: an upload tool that hides dotfiles by default skipped
  `.htaccess` and didn't overwrite key files. The deploy pipeline had
  no post-upload assertion, so this stayed silent.
- **DevTools exposure (Task #26).** Sourcemaps were being shipped to
  production unconditionally; production console was noisy with
  routine `console.log` traffic; three industry-standard response
  headers (HSTS, X-Content-Type-Options, COOP) were missing, leaving
  the site flagged by every external scanner.

## What shipped

### Deploy verification (Task #29)
| File | Purpose |
|---|---|
| `scripts/verify-live-deploy.mjs` (new) | Standalone, dependency-free Node verifier. Asserts (a) live `/changelog.json` first-entry version matches `package.json` version, (b) `index.html` and `changelog.json` serve `Cache-Control` containing `no-cache`/`no-store`, (c) `/` carries `Strict-Transport-Security`, `X-Content-Type-Options`, `Cross-Origin-Opener-Policy`, (d) any `.map` URL returns 403/404. Exit code 1 with a per-check `FAIL` line + remediation hint on any failure. Runnable by hand from a workstation: `node scripts/verify-live-deploy.mjs`. |
| `.github/workflows/deploy.yml` | lftp invocation now runs with `set cmd:fail-exit yes` (and the script under `set -euo pipefail`) so partial uploads abort the workflow. New post-upload "Verify live site reflects the new build" step runs the verifier with up to 6 × 10 s retries (~60 s) — workflow only goes green when every assertion passes. This is the authoritative gate for "did `.htaccess` actually land", chosen over greping the lftp transfer log because lftp legitimately skips unchanged files. |
| `docs/ops/stale-v3.4-postmortem.md` (new) | Postmortem with the curl evidence table, root-cause reasoning, and operator runbook (run the hardened workflow, then run the verifier locally, then visually confirm v3.5 in Settings). |

### DevTools exposure hardening (Task #26)
| File | Purpose |
|---|---|
| `vite.config.ts` | `build.sourcemap = process.env.SENTRY_AUTH_TOKEN ? 'hidden' : false` (was unconditionally on). `esbuild.drop = ['debugger']`. `esbuild.pure = ['console.log','console.info','console.debug','console.trace']` so the minifier removes calls whose return value is unused — `console.error` and `console.warn` are deliberately preserved so Sentry breadcrumbs and ErrorBoundary diagnostics still fire. |
| `scripts/check-no-sourcemaps.mjs` (new) | Postbuild guard. Walks `dist/` for `*.map` files and exits 1 if any exist while `SENTRY_AUTH_TOKEN` is unset, so a misconfigured CI run can't silently re-leak source. Logs and exits 0 when the Sentry plugin is expected to upload + delete maps. |
| `package.json` | `"build": "vite build && node scripts/check-no-sourcemaps.mjs"` so the guard runs on every build. |
| `public/.htaccess` | New `<FilesMatch "\.map$">` block returning 403 before SPA fallback rewrite. New response headers: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `Cross-Origin-Opener-Policy: same-origin`. Existing CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy left untouched. |

## How to verify after a deploy
```bash
# From any workstation, no credentials needed:
node scripts/verify-live-deploy.mjs
# Exit 0 + "✅ All checks passed." = live site is on the version in package.json,
# all required headers and cache rules are in effect, and *.map URLs are denied.
```

The same script is the post-upload gate inside `.github/workflows/deploy.yml`,
so any future stale or partial deploy now fails the workflow visibly instead
of silently reporting green.

## Out of scope (separate follow-ups)
- Server-side authorization audit (RLS / edge-function auth) — tracked as
  Task #27.
- Submitting `thewise.cloud` to the HSTS preload list — tracked as Task #28.
- Running the hardened deploy workflow to actually unblock v3.5 going
  live — tracked as Task #30.
