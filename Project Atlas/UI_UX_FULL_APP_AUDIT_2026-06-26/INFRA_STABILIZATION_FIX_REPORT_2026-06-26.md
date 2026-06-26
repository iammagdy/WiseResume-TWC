# Infra Stabilization Fix Report — 2026-06-26

**Branch:** `fix/remove-prod-dev-tunnel-and-sentry-csp`  
**Base:** `main` @ `38583687` (PR #132 merge)  
**Date:** 2026-06-26  
**Production URL:** `https://wiseresume.app`

---

## 1. Summary

Two safe infra/config fixes applied before wider public launch:

1. **F-C:** Removed committed Impeccable dev tunnel script from production HTML
2. **F-A:** Added Sentry ingest domain to CSP `connect-src` in all production CSP definitions

No Appwrite changes. No backend/auth/routing/AI/UI logic changes. No secrets touched.

---

## 2. Files Changed

| File | Commit | Change |
|------|--------|--------|
| `index.html` | 1 (dev tunnel removal) | Removed 3 lines: `<!-- impeccable-live-start -->` / `<script src="http://localhost:8400/live.js">` / `<!-- impeccable-live-end -->` |
| `vercel.json` | 2 (Sentry CSP) | Added `https://*.ingest.de.sentry.io` to `connect-src` in CSP HTTP header |
| `vite.config.ts` | 2 (Sentry CSP) | Added `https://*.ingest.de.sentry.io` to `connect-src` in `CSP_BASE` array (meta tag CSP) |
| `public/_headers` | 2 (Sentry CSP) | Added `https://*.ingest.de.sentry.io` to `connect-src` in CSP HTTP header (Hostinger/Cloudflare) |
| `Project Atlas/UI_UX_FULL_APP_AUDIT_2026-06-26/INFRA_STABILIZATION_FIX_REPORT_2026-06-26.md` | 3 (docs) | This report |

---

## 3. Dev Tunnel Block Removed

**Exact block removed from `index.html` (was lines 183-185):**

```html
<!-- impeccable-live-start -->
<script src="http://localhost:8400/live.js"></script>
<!-- impeccable-live-end -->
```

**Root cause:** The Impeccable design tool's live-preview feature injected this script tag into `index.html`. It was committed to the repo and shipped in production builds. CSP blocked it (`script-src 'self'` doesn't allow `http://localhost:8400`), so no code executed, but it generated a CSP violation on every page load and exposed an insecure localhost URL in page source.

**Post-removal grep verification:**
- `localhost:8400` — 0 hits in production source files
- `impeccable-live-start` — 0 hits in production source files
- `impeccable-live-end` — 0 hits in production source files
- `live.js` — 0 hits in production source files
- Remaining `impeccable-live` references exist only in `.impeccable/` tooling directories (non-production, expected)

---

## 4. CSP Locations Updated

Sentry ingest domain `https://*.ingest.de.sentry.io` added to `connect-src` only (not `script-src` or `style-src`) in:

| Location | Used By | Status |
|----------|---------|--------|
| `vercel.json:25` | Vercel HTTP header | Updated |
| `vite.config.ts:14` | Meta tag CSP (build-time injection) | Updated |
| `public/_headers:6` | Hostinger/Cloudflare HTTP header | Updated |

### `page.html` — Intentionally Left Unchanged

`page.html` contains a CSP meta tag (line 5) but is **not referenced** in any build config (`vite.config.ts`), deployment workflow (`.github/workflows/`), or runtime code. Vite uses `index.html` as its entry point, not `page.html`. The file appears to be a standalone template that is not served in production.

**Decision:** Left unchanged. Updating it would risk introducing inconsistencies if it's ever used as a reference template. If it's confirmed to be served in the future, the Sentry domain should be added to its `connect-src` as well.

---

## 5. Validation Results

| Check | Command | Result |
|-------|---------|--------|
| Dev tunnel grep | `grep -R "localhost:8400\|impeccable-live-start\|impeccable-live-end" index.html public vite.config.ts vercel.json page.html` | 0 hits |
| Sentry CSP grep | `grep -R "https://\*.ingest.de.sentry.io" vercel.json vite.config.ts public/_headers` | 3 hits (all intended files) |
| TypeScript | `npx tsc --noEmit` | PASS (exit 0) |
| Tests | `npm run test` | 673 passed, 1 todo, 1 skipped (112 test files) |
| Git diff check | `git diff --check` | Clean (no whitespace errors) |
| Production build | `npm run build` | PASS — built in 1m 32s, no sourcemaps leaked |

---

## 6. Appwrite Deploy Required?

**No.** No Appwrite function code or permissions were changed. No Appwrite deploy needed.

---

## 7. Vercel-Only Deploy Enough?

**Yes.** Both fixes are frontend-only:
- F-C (dev tunnel): `index.html` change takes effect on next Vercel rebuild
- F-A (Sentry CSP): `vercel.json` header + `vite.config.ts` meta tag both take effect on next Vercel rebuild

If the app is also deployed to Hostinger (`resume.thewise.cloud`), the `public/_headers` file is already updated and will take effect on the next GitHub Actions FTP deploy. No separate Hostinger config change needed.

---

## 8. Deferred Findings (Not Touched)

| ID | Issue | Reason Deferred |
|----|-------|----------------|
| F-B | Appwrite `track-visitor-event` ERR_ABORTED | Working as designed — browser cancels in-flight request during navigation; retry queue (`localStorage`) re-emits events on next page view. No fix needed. |
| F-D | `/examples` HTTP 401 | Page renders correctly from static JSON. 401 is on a background analytics call. If fix needed, it's an Appwrite console permission change, not code. |
| F-E | `/subscription` HTTP 401 | Page handles 401 gracefully via `useMe()` error handling. Shows "payments coming soon" regardless. If fix needed, it's an Appwrite function permission/deploy issue. |

---

## 9. Commits

1. `fix: remove dev tunnel script from production html` — `index.html` only
2. `fix: allow Sentry ingest in CSP` — `vercel.json`, `vite.config.ts`, `public/_headers`
3. `docs: record infra stabilization fix` — this report

---

## 10. Broad Testing Status

**Broad testing remains unblocked.** These fixes are config hygiene that improve production observability (Sentry) and remove a non-functional but unprofessional artifact (dev tunnel script). No user-facing behavior changes. No regressions introduced.

---

*End of report.*
