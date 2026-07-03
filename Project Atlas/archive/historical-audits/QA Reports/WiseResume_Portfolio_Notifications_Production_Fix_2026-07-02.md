# QA Report: WiseResume Portfolio Notifications Production Fix (2026-07-02)

## 1. Problem Summaries & Root Causes

### A. Turnstile / Security Check Stuck UX
- **Symptom:** Submitting the public portfolio contact form fails at the Turnstile/security check stage with "Couldn’t complete the security check. Please refresh the page and try again." The Turnstile widget is visible but appears stuck on "Verifying...".
- **Root Cause:**
  - Turnstile verification token can expire (e.g. if the form is left open) or get stuck due to network drops/timeouts.
  - The UI state did not listen to or handle the widget verification timeout/error states, resulting in a locked loading state overlay that forced the user to manually refresh the page.
- **Fix:**
  - Introduced a 6-second watchdog timeout in `PortfolioContactForm.tsx` using React ref timers.
  - If Turnstile takes longer than 6 seconds, the loading state is cancelled, the widget is reset cleanly using `window.turnstile.reset()`, and a user-friendly error message with a retry option is displayed.
  - Cleaned up noisy `console.log` statements in the component.

### B. "I'm Interested" & Messages Missing Notification
- **Symptom:** Clicking "I'm Interested" or submitting a message on the public portfolio did NOT create any visible notification in the authenticated app.
- **Root Cause:**
  - The notification writing helper in the serverless functions (`ai-gateway` and `public-share`) was attempting to write a `link` attribute to the `notifications` collection document.
  - In the live Appwrite database instance, the `link` attribute is missing from the `notifications` collection schema.
  - Since Appwrite collections are in strict schema validation mode, attempting to write a document with an unknown attribute fails with an HTTP 400 Bad Request error.
  - This error caused the database write to fail, preventing the notification from being created.
- **Fix:**
  - Implemented a **link-retry fallback** inside both cloud functions.
  - The function first attempts to create the notification with the `link` property.
  - If Appwrite throws an unknown/invalid attribute error, the function catches it, strips the `link` property, and retries the creation.
  - This ensures that notification deliveries succeed even if schema properties are missing on target environments.

---

## 2. Files Changed

### Backend Cloud Functions:
- [main.js](file:///y:/WiseResume-TWC/appwrite-hubs/ai-gateway/src/main.js)
- [main.js](file:///y:/WiseResume-TWC/appwrite-hubs/public-share/src/main.js)
- [track-portfolio-view.ts](file:///y:/WiseResume-TWC/api/track-portfolio-view.ts)

### Frontend Components & Pages:
- [PortfolioContactForm.tsx](file:///y:/WiseResume-TWC/src/components/portfolio/public/PortfolioContactForm.tsx)
- [NotificationsPage.tsx](file:///y:/WiseResume-TWC/src/pages/NotificationsPage.tsx)

### Translation Catalogs:
- [app.json (English)](file:///y:/WiseResume-TWC/locales/en/app.json)
- [app.json (Arabic)](file:///y:/WiseResume-TWC/locales/ar/app.json)

### Regression Test Suites:
- [PortfolioContactForm.test.tsx](file:///y:/WiseResume-TWC/src/components/portfolio/public/__tests__/PortfolioContactForm.test.tsx)
- [publicPrivacyHardening.test.ts](file:///y:/WiseResume-TWC/src/lib/security/publicPrivacyHardening.test.ts)

### Metadata / DevKit:
- [sourceHashes.generated.json](file:///y:/WiseResume-TWC/src/lib/devkit/sourceHashes.generated.json)

---

## 3. Tests Run & Validation Results

- **TypeScript compilation:** `npx tsc --noEmit` -> ✅ **0 errors**
- **Production Build:** `npm run build` -> ✅ **Successful compile**
- **Hub Syntax:** `node --check` -> ✅ **Syntax valid for changed Appwrite functions**
- **Source Hashes:** `node scripts/compute-source-hashes.mjs` -> ✅ **Hashes recalculated & committed**
- **Workspace Tests:** `npx vitest run` -> ✅ **813/813 PASS**
  - Includes focused `PortfolioContactForm.test.tsx` (Turnstile timeouts & state machines).
  - Includes focused `criticalArabicCoverage.test.ts` (unlocalized literals checks).
  - Includes focused `catalogParity.test.ts` (cross-locale catalog key match).
  - Includes `publicPrivacyHardening.test.ts` (visit permission checking).

---

## 4. Deployments Required

1. **Vercel Frontend & Serverless Routes:** Triggered automatically upon push to `origin/main`.
2. **Appwrite Functions:**
   - Deploy `public-share`
   - Deploy `ai-gateway`
   *(Targeted deployments only, do NOT deploy target=all)*

---

## 5. Production Verification Checklist

Follow these steps once deployments are live:
1. **Turnstile Widget:** Open public portfolio page in incognito, click contact form, verify Turnstile loads and resets gracefully if blocked.
2. **Contact Message:** Submit a contact message. Verify response is success, and check database for `portfolio_messages` document write.
3. **I'm Interested:** Click "I'm Interested", verify success and check database for `portfolio_interactions` document.
4. **Visit Tracking:** Wait 5-10 seconds on the page, then close the tab. Verify `/api/track-portfolio-view` was called, `portfolio_visits` document exists, and the Visitors tab in the editor is populated.
5. **Notifications UI:** Log in as the owner, verify the Bell unread indicator dot is visible, and view the `/notifications` page. Check that all 7 filter tabs render the respective notifications with localized Arabic/English copy.
