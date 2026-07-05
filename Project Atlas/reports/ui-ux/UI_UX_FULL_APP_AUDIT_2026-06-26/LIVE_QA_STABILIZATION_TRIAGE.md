# Live QA Stabilization Triage — Production Commit `38583687`

**Date:** 2026-06-26  
**Triage by:** Cascade (read-only investigation, no edits made)  
**Production URL:** `https://wiseresume.app`  
**Commit:** `38583687` (PR #131 + #132 merged)  
**Source QA report:** `Project Atlas/UI_UX_FULL_APP_AUDIT_2026-06-26/LIVE_QA_REPORT.md`

---

## 1. Executive Summary

Live browser QA found **zero UI regressions** and **zero P0/P1 blockers** from PR #131 or #132. Five pre-existing infrastructure/config issues were identified. After read-only root-cause investigation of all five, none block broad user testing. One issue (dev tunnel script in production HTML) is a config hygiene issue that should be fixed before public launch but does not affect functionality or user experience.

**Key conclusion:** The app is ready for broad testing now. The dev tunnel script removal is recommended before public launch. The remaining four issues are observability/analytics gaps with no user-facing impact.

---

## 2. Final Verdict

# **READY FOR BROAD TESTING**

> Broad testing is **not blocked**. No P0 or P1 issues found.  
> One P2 issue (F-C: dev tunnel script) is recommended for fix before public launch.  
> No Appwrite deploy required for any fix.  
> One fix (F-C) is code-only (remove 3 lines from `index.html`). One fix (F-A) is Vercel config + code. All others are deferred.

---

## 3. Finding Table

| ID | Issue | Severity | Root Cause | User Impact | Owner/Business Impact | Files/Config Involved | Fix Needed? | Recommended Fix | Blocks Broad Testing? |
|----|-------|----------|------------|-------------|----------------------|----------------------|-------------|-----------------|----------------------|
| **F-A** | Sentry CSP block — error reporting silently fails | P3 (Low) | Sentry ingestion domain `*.ingest.de.sentry.io` not in CSP `connect-src` | **None** — errors are still caught by ErrorBoundary, just not sent to Sentry dashboard | **Medium** — ops observability gap; production errors invisible to Sentry dashboard | `vercel.json` (CSP header), `vite.config.ts` (CSP_BASE meta tag), `public/_headers` (Cloudflare/Hostinger CSP) | Recommended (not blocking) | Add `https://*.ingest.de.sentry.io` to `connect-src` in all three CSP definitions | No |
| **F-B** | Appwrite `track-visitor-event` ERR_ABORTED | P3 (Low) | Browser cancels in-flight `functions.createExecution()` request during navigation. The `async: true` flag starts a fire-and-forget execution, but the HTTP request is still cancelled by the browser when the page navigates. The code already has a retry queue (`saveRetryQueue`) that buffers failed events. | **None** — visitor analytics are best-effort; retry queue re-emits on next page view | **Low** — some visitor analytics events may be lost during fast navigation. Growth/Visitors tab in DevKit may show slightly lower counts. | `src/lib/visitorTrack.ts:241-260` (flush function), `src/hooks/useVisitorTracking.ts` | No | No fix needed. The retry queue already handles this. If improved reliability is desired, switch `async: true` to `async: false` or use `navigator.sendBeacon()` for the flush — but this is optimization, not a bug fix. | No |
| **F-C** | Dev tunnel script `http://localhost:8400/live.js` in production HTML | **P2** (Medium) | The Impeccable design tool's live-preview feature injected a `<script>` tag into `index.html` (lines 183-185). This was committed to the repo and ships in production builds. CSP blocks it, so it has no functional impact, but it: (1) references an insecure `http://` URL, (2) appears in page source for every visitor, (3) generates a CSP violation on every page load. | **None** — CSP blocks the script; no code executes | **Low** — security scanners may flag it; looks unprofessional in page source; CSP noise in console | `index.html:183-185` (3 lines to remove) | **Yes** (before public launch) | Remove lines 183-185 from `index.html`. The Impeccable tool should inject this only in dev mode, not commit it to the repo. | No |
| **F-D** | `/examples` HTTP 401 on Appwrite resource | P3 (Low) | The `ExamplesPage` component itself fetches only a static JSON file (`/data/resumeExamples.json`) — no Appwrite calls. The 401 is from a background call (likely the `track-visitor-event` function execution or a global auth/session check) that returns 401 when the Appwrite function's Execute permission is not set to `any` (guests). The page UI renders correctly regardless. | **None** — page renders fully with example data from static JSON | **None** — examples gallery works; 401 is on a background analytics call | `src/lib/visitorTrack.ts` (background call), `appwrite-hubs/track-visitor-event/src/main.js` (function permissions) | No | If the 401 is from `track-visitor-event`, ensure the function's Execute permission is set to `any` in Appwrite console. This is an Appwrite config change, not a code change. | No |
| **F-E** | `/subscription` HTTP 401 on Appwrite resource | P3 (Low) | The `SubscriptionPage` uses `useMe()` which calls `appwriteFunctions.invoke('get-subscription')`, routed through the `coupons` Appwrite function. The `coupons` function validates the Appwrite JWT. If the JWT is expired or the function's Execute permission doesn't include the user's role, it returns 401. The page handles this gracefully: `useMe()` catches errors and returns `subscription: null` with `subscriptionVerified: false`. The page shows "Payments coming soon" messaging regardless. | **None** — page renders with plan info and "payments coming soon" | **Low** — subscription status may not load if `coupons` function has permission issues | `src/hooks/useMe.ts:105-113` (get-subscription call), `src/lib/appwrite-functions.ts:36` (COUPON_FUNCTIONS routing), `appwrite-hubs/coupons/` (function code) | No | If the 401 persists for authenticated users, check: (1) `coupons` function Execute permission includes `users` role, (2) JWT is valid. The page already handles 401 gracefully. | No |

---

## 4. Highest Priority Item

### F-C: Dev tunnel script in production HTML (`index.html:183-185`)

**Why highest priority:**
- It's the only finding that puts something in the user's page source that shouldn't be there
- It references `http://localhost:8400` (insecure protocol) in production HTML
- It generates a CSP violation console error on every single page load
- Security scanners and auditors will flag it
- The fix is trivial: remove 3 lines

**Root cause (confirmed):**
The Impeccable design tool's live-preview browser injects a `<script src="http://localhost:8400/live.js">` tag wrapped in `<!-- impeccable-live-start -->` / `<!-- impeccable-live-end -->` comments into `index.html`. This was committed to the repo and ships in production builds.

**Exact location:** `index.html` lines 183-185:
```html
<!-- impeccable-live-start -->
<script src="http://localhost:8400/live.js"></script>
<!-- impeccable-live-end -->
```

**Impact:** CSP blocks the script (`script-src 'self'` doesn't allow `http://localhost:8400`), so no code executes. But the tag appears in page source and generates a CSP violation on every page load.

**Risk level of fix:** Zero risk. Removing these 3 lines changes nothing in production behavior (the script is already blocked by CSP).

---

## 5. Safe Fix Plan (If Owner Approves)

### Fix 1: Remove dev tunnel script (F-C) — P2, code-only, zero risk

**File:** `index.html`  
**Action:** Delete lines 183-185 (the `impeccable-live-start` comment, the `<script>` tag, and the `impeccable-live-end` comment)  
**Deploy needed:** Yes — Vercel rebuild + redeploy (or GitHub Actions → FTP for Hostinger)  
**Appwrite deploy needed:** No  
**Risk:** Zero — script is already CSP-blocked in production

### Fix 2: Add Sentry to CSP connect-src (F-A) — P3, config + code, low risk

**Files to update (all three CSP definitions must match):**

1. **`vercel.json`** line 25 — add `https://*.ingest.de.sentry.io` to `connect-src`:
   ```
   connect-src 'self' https://fra.cloud.appwrite.io https://api.resend.com https://api.openrouter.ai https://api.groq.com https://generativelanguage.googleapis.com https://api.elevenlabs.io https://challenges.cloudflare.com https://*.ingest.de.sentry.io
   ```

2. **`vite.config.ts`** line 14 — add `https://*.ingest.de.sentry.io` to `CSP_BASE` `connect-src`:
   ```typescript
   "connect-src 'self' https://fra.cloud.appwrite.io https://api.resend.com https://api.openrouter.ai https://api.groq.com https://generativelanguage.googleapis.com https://api.elevenlabs.io https://challenges.cloudflare.com https://*.ingest.de.sentry.io",
   ```

3. **`public/_headers`** line 6 — add `https://*.ingest.de.sentry.io` to `connect-src` (for Hostinger/Cloudflare deployment)

4. **`page.html`** line 5 — add `https://*.ingest.de.sentry.io` to `connect-src` (if this file is used anywhere)

**Deploy needed:** Yes — Vercel rebuild (or GitHub Actions → FTP for Hostinger)  
**Appwrite deploy needed:** No  
**Risk:** Low — adding a domain to CSP `connect-src` only permits Sentry SDK to send error reports. No security downside.

**Note:** The Sentry DSN is configured via `VITE_SENTRY_DSN` env var (`src/lib/monitoring.ts:6`). The DSN resolves to `https://o4511264984989696.ingest.de.sentry.io/api/4511265054589008/envelope`. Using `https://*.ingest.de.sentry.io` covers all Sentry ingestion endpoints for this region.

### Fix 3: Appwrite analytics abort (F-B) — No fix needed

The `ERR_ABORTED` is browser navigation cleanup cancelling in-flight requests. The code already has a retry queue (`src/lib/visitorTrack.ts:201-216`) that buffers failed events to `localStorage` and re-emits them on the next page view. This is working as designed.

### Fix 4: `/examples` 401 (F-D) — No code fix needed

If the 401 is from `track-visitor-event`, ensure the function's Execute permission is set to `any` in the Appwrite console. This is an Appwrite config change, not a code change. The page itself works correctly.

### Fix 5: `/subscription` 401 (F-E) — No code fix needed

The page handles 401 gracefully via `useMe()` error handling. If the `coupons` function is not deployed or has wrong permissions, that's an Appwrite config issue. The page UI is unaffected.

---

## 6. Manual Smoke Checklist

These flows cannot be verified in headless browser QA and require manual testing in a real browser.

### 6.1 AI Generation Smoke Test
- [ ] Log in to `https://wiseresume.app`
- [ ] Upload or select a resume from Dashboard
- [ ] Navigate to Tailoring Hub (`/tailoring-hub`)
- [ ] Paste a job description and click "Tailor" / "Generate"
- [ ] **Verify:** AI response appears within 30s
- [ ] **Verify:** `TailorProgress` component announces status via `aria-live` region
- [ ] **Verify:** No console errors beyond the known Sentry/Appwrite issues
- [ ] **Verify:** Response is coherent and resume-specific

### 6.2 PDF Export Smoke Test
- [ ] Select a resume from Dashboard
- [ ] Open Editor (`/editor`)
- [ ] Click Export → PDF
- [ ] **Verify:** PDF downloads within 60s
- [ ] **Verify:** PDF contains correct content (contact, experience, education)
- [ ] **Verify:** PDF styling matches on-screen preview (fonts, spacing, colors)
- [ ] **Verify:** No broken layout or missing sections

### 6.3 Dialog Escape Close Test
- [ ] Navigate to Settings (`/settings`)
- [ ] Open any dialog/modal (e.g., account settings, theme picker)
- [ ] Press `Escape` key
- [ ] **Verify:** Dialog closes
- [ ] **Verify:** Focus returns to the trigger button
- [ ] **Verify:** No focus trap or keyboard navigation issues
- [ ] Repeat on Tailoring Hub with any filter/sheet dialog

### 6.4 Reduced-Motion Browser Smoke
- [ ] **Chrome:** Open DevTools → Rendering tab → Emulate CSS media feature `prefers-reduced-motion: reduce`
- [ ] Navigate to Home page (`/`)
- [ ] **Verify:** Hero section renders immediately (no animation)
- [ ] **Verify:** Scroll-triggered reveals appear instantly (no fade/slide)
- [ ] **Verify:** No `setInterval`/`setTimeout`/`requestAnimationFrame` loops running (check Performance tab)
- [ ] Navigate to Dashboard
- [ ] **Verify:** Cards render without entrance animations
- [ ] **Verify:** `AnimatedSplash` skips to final state
- [ ] Disable reduced-motion emulation → verify animations resume

### 6.5 Mobile Keyboard Form Check
- [ ] Open `https://wiseresume.app` on mobile (or Chrome DevTools mobile emulation with touch keyboard)
- [ ] Navigate to Auth page (`/auth`)
- [ ] Tap email field → **Verify:** keyboard appears, field is not obscured
- [ ] Type email → **Verify:** no horizontal scroll, no layout shift
- [ ] Tap password field → **Verify:** keyboard appears, field visible above keyboard
- [ ] Submit form → **Verify:** no zoom-in on input (font-size ≥ 16px)
- [ ] Navigate to Cover Letter form (`/cover-letter/new`)
- [ ] Tap textarea → **Verify:** keyboard appears, textarea scrolls, submit button accessible
- [ ] **Verify:** `viewport-fit=cover` + `interactive-widget=resizes-visual` working (viewport doesn't jump)

---

## 7. What Not to Touch

- **Appwrite Functions:** No Appwrite function code changes needed for any finding. Do not redeploy Appwrite hubs.
- **Auth/routing logic:** No auth or routing changes needed. All redirects are correct behavior.
- **Backend/API logic:** No backend changes needed.
- **AI logic:** No AI gateway or AI-related changes needed.
- **Secrets/env vars:** Do not touch `VITE_SENTRY_DSN`, `APPWRITE_API_KEY`, or any other secrets.
- **`public/_headers` Agent-readiness Link headers:** Do not remove the `.well-known` Link headers — they are intentional for AI agent discovery.
- **CSP `unsafe-inline`:** Do not remove `unsafe-inline` from `script-src` or `style-src` — it's required for the Vite SPA (documented in `_headers` comment M-1).
- **`page.html`:** This appears to be a standalone template. Only update its CSP if it's confirmed to be served in production.
- **Deploy scripts:** Do not modify `.github/workflows/` or FTP config. No deployment pipeline changes needed.

---

## 8. Appwrite Deploy Required?

**No.** None of the five findings require an Appwrite function redeploy.

- F-A (Sentry CSP): Frontend config only
- F-B (analytics abort): No fix needed — retry queue handles it
- F-C (dev tunnel script): Frontend code only (`index.html`)
- F-D (/examples 401): If fix is needed, it's an Appwrite console permission change, not a code deploy
- F-E (/subscription 401): Page handles gracefully; no fix needed

---

## 9. Vercel-Only Deploy Enough?

**Yes for F-C (dev tunnel script removal).** This is a 3-line deletion from `index.html` that takes effect on the next Vercel rebuild.

**For F-A (Sentry CSP):** A Vercel-only deploy is sufficient for `wiseresume.app`. However, if the app is also deployed to Hostinger (`resume.thewise.cloud`), the `public/_headers` file must also be updated and the GitHub Actions FTP deploy must be triggered. Both deployments use the same built `dist/` folder, so a single build covers both — but the CSP change must be in both `vercel.json` (for Vercel) and `public/_headers` (for Hostinger) and `vite.config.ts` (for the meta tag CSP).

**Summary:** Vercel-only deploy is enough for F-C. F-A requires updating config in 3 files but still only needs a frontend rebuild — no Appwrite deploy.

---

## 10. P0/P1 Count

| Severity | Count | Findings |
|----------|-------|----------|
| P0 (Blocker) | 0 | — |
| P1 (Critical) | 0 | — |
| P2 (Should fix before public launch) | 1 | F-C (dev tunnel script) |
| P3 (Nice to have / observability) | 4 | F-A, F-B, F-D, F-E |

---

## 11. Issue to Fix First

**F-C: Remove dev tunnel script from `index.html`** (3 lines, zero risk, Vercel rebuild only).

Second: **F-A: Add Sentry to CSP** (3 config files, low risk, restores production error observability).

The remaining three (F-B, F-D, F-E) are deferred — they are either working as designed (F-B) or handled gracefully by the UI (F-D, F-E).

---

## 12. CSP Configuration Summary

The CSP is defined in **four places** — all must be kept in sync:

| Location | Used By | Current `connect-src` Includes Sentry? |
|----------|---------|---------------------------------------|
| `vercel.json:25` | Vercel HTTP header | No |
| `vite.config.ts:14` (CSP_BASE) | Meta tag injected at build time | No |
| `public/_headers:6` | Hostinger / Cloudflare HTTP header | No |
| `page.html:5` | Standalone template (if used) | No |

**Sentry ingestion domain:** `https://*.ingest.de.sentry.io` (derived from DSN in `src/lib/monitoring.ts:6`, resolved to `o4511264984989696.ingest.de.sentry.io`)

**Sentry SDK features in use** (`src/lib/monitoring.ts:37-44`):
- `browserTracingIntegration()` — sends trace data to Sentry
- `browserProfilingIntegration()` — sends profile data
- `replayIntegration()` — sends session replays (on error only)
- `consoleLoggingIntegration()` — sends console.warn/error as breadcrumbs

All of these need `connect-src` to include the Sentry ingestion domain.

---

*End of triage. No actions taken. Awaiting owner approval for fixes.*
