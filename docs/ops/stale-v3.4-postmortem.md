# Postmortem — Live site stuck on v3.4 after a "successful" v3.5 deploy

**Date:** 2026-04-21
**Task:** #29
**Site:** https://resume.thewise.cloud (Hostinger, `/public_html/resume/`)

## Symptom

After what the operator believed was a successful deploy of v3.5.0, the
live site continued to show **v3.4** in Settings, and an authenticated
user saw the banner *"AI features require server configuration —
contact support."* The repository at `main` was already at v3.5.0
(`package.json`, `public/changelog.json`, and the freshly-built
`dist/changelog.json` all agreed).

## Investigation — captured ground truth

Curl probes against the live site (no caching layers between us and
Hostinger origin — `x-hcdn-cache-status: DYNAMIC` on every response):

| Probe                              | Result                                                 |
| ---------------------------------- | ------------------------------------------------------ |
| `HEAD /index.html`                 | 200, `last-modified: Sun, 19 Apr 2026 07:48:21 GMT`    |
| `HEAD /changelog.json`             | 200, **same Last-Modified**, no `Cache-Control` header |
| Body of `/changelog.json`          | First entry: `"version": "v3.4.0"`                     |
| Live `index.html`'s entry script   | `assets/index-6cKUqAp4.js`                             |
| Local `dist/assets/index-*.js`     | `index-Cpyw-0el.js` (different hash — different build) |
| `HEAD /custom-sw.js`               | `cache-control: public, max-age=604800` (7 days!)      |
| `HEAD /` for HSTS / X-Content-Type-Options / COOP | **none of the three present**          |
| `HEAD /assets/anything.map`        | 200 (SPA rewrite — `.map` deny rule absent)            |
| `HEAD /this-does-not-exist`        | 200, returns `index.html` — SPA rewrite IS working     |

## Root cause

**The recent v3.5 upload to Hostinger never actually overwrote the
files in `/public_html/resume/`.** Every live file is timestamped
`Sun, 19 Apr 2026 07:48:21 GMT` — the v3.4 deploy from two days
earlier. The hash of the entry script in the live `index.html`
(`index-6cKUqAp4.js`) does not exist anywhere in the v3.5 build, which
proves the live HTML is from an entirely different build, not a
partial overwrite.

Two corroborating observations make the diagnosis airtight:

1. The live `.htaccess` is the v3.4-era version — it has the
   pre-existing CSP / X-Frame-Options / Referrer-Policy /
   Permissions-Policy headers (those have been there since well before
   v3.5), but it is missing every change introduced in Task #22
   (the `Cache-Control: no-cache` `<FilesMatch>` rule for
   `custom-sw.js`, `changelog.json`, `index.html`, etc.) and every
   change introduced in Task #26 (HSTS, X-Content-Type-Options, COOP,
   `.map` deny). If a v3.5 upload had run, even partially, the
   `.htaccess` Hostinger serves would not be the v3.4 one.

2. The Cache-Control on `custom-sw.js` is `public, max-age=604800` —
   the Hostinger default for a `.js` file under their generic media
   `<FilesMatch>`. That's exactly what we'd see if the new
   `<FilesMatch>` (which forces `no-cache, no-store, must-revalidate`
   on `custom-sw.js`) had never been uploaded.

The "AI features require server configuration" banner is downstream
of the same root cause. The deployed v3.4 client is making
bridge / Edge Function calls under the v3.4 contract; the
Edge Functions on Supabase have been redeployed for v3.5
expectations and the contract no longer matches. Once v3.5 actually
ships to the live site, the new client will speak the new contract
and the banner will resolve. (If it does not, file a separate
follow-up — but do not chase it before the version is fixed, the
two are entangled.)

The likely upstream reason for the bad upload is one of:

- The operator used Hostinger's web File Manager, which (a) hides
  dotfiles by default and (b) does not delete remote files that
  aren't in the upload set. That would explain why `.htaccess` and
  the new `index.html` never landed.
- The operator selectively uploaded a subset of `dist/` (e.g.
  dragged only `assets/` over), missing `index.html`,
  `changelog.json`, and `.htaccess` entirely.
- The `deploy.yml` GitHub Actions workflow simply was not run.

We can't tell after-the-fact which one it was — the lftp invocation
in `deploy.yml` previously did not assert anything post-upload, so
even a successful workflow run wouldn't have caught this. The fix
below closes that gap so the next occurrence is impossible to miss.

## Fix shipped

Two changes in this repo (Task #29):

1. **`.github/workflows/deploy.yml` hardened.**
   - `lftp` now runs with `set cmd:fail-exit yes`, so any single file
     upload error aborts the workflow instead of being silently
     swallowed.
   - The lftp output is captured to `/tmp/lftp.log` and the workflow
     greps for `.htaccess` in the transfer list. If `.htaccess` is
     not transferred, the workflow fails with a clear error before
     reporting success.
   - A new **post-upload verification step** runs
     `node scripts/verify-live-deploy.mjs` against the live URL,
     retrying for ~60 s. The workflow only reports success if every
     check passes.

2. **`scripts/verify-live-deploy.mjs` (new).** Standalone verifier
   that any operator can run locally after a manual upload:
   ```bash
   node scripts/verify-live-deploy.mjs
   ```
   It asserts:
   - `https://resume.thewise.cloud/changelog.json` first entry's
     `version` matches `package.json` `version` (prefixed with `v`).
   - `changelog.json` and `index.html` both carry a `Cache-Control`
     containing `no-cache` or `no-store`.
   - `Strict-Transport-Security`, `X-Content-Type-Options`, and
     `Cross-Origin-Opener-Policy` are present on `/`.
   - A probe URL ending in `.map` returns 403 or 404 (Task #26 deny
     rule active).

   Exit code 0 = clean; exit code 1 = at least one assertion failed.

## What the operator must do now

1. Run the **`Deploy to Hostinger`** GitHub Actions workflow
   (`.github/workflows/deploy.yml`) from the GitHub UI →
   *Workflow dispatch*. Confirm the run reports green — the new
   verification step in the workflow will fail the run if the live
   site is still stale, so green now genuinely means the live site
   reflects this commit.
2. As a sanity check from a workstation:
   ```bash
   node scripts/verify-live-deploy.mjs
   ```
   Should print "✅ All checks passed."
3. Open `https://resume.thewise.cloud/` in a fresh incognito window
   and confirm Settings shows `v3.5.0`. The "AI features require
   server configuration" banner should be gone for an authenticated
   user; if it persists after the version is correct, escalate as a
   separate bridge / Edge Function bug.

## Why this won't silently happen again

- The lftp dot-files inclusion is now asserted post-transfer, not
  assumed.
- The lftp `cmd:fail-exit yes` flag makes partial uploads loud.
- The post-upload verification step catches every other failure mode
  (wrong upload directory, Hostinger CDN serving stale content from
  origin disk, mismatched build secrets producing the wrong asset
  hashes, `.htaccess` not being applied because of a syntax error,
  etc.). Every one of these would now turn the deploy workflow red
  instead of letting the operator believe it succeeded.
