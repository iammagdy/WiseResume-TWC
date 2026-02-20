
# Fix Download Issues, Portfolio Privacy, and Dashboard Tailored CV Tabs

## Overview

This plan addresses four interconnected issues: APK downloads silently failing, portfolio page download errors and privacy concerns, and making tailored CVs easier to find on the dashboard.

---

## Issue 1: APK Downloads Don't Actually Save (Android Capacitor)

**Root Cause:** In a Capacitor WebView, the `<a download>` trick silently fails -- the browser reports success but no file is saved. The current `downloadMobile()` function only uses the anchor approach.

**Fix:** Update `src/lib/downloadUtils.ts` to detect Capacitor native platform and use `navigator.share()` as the primary download method on Android (just like iOS already does). The Web Share API works reliably in Capacitor WebViews and presents the native Android share sheet where the user can choose "Save to Files".

### File: `src/lib/downloadUtils.ts`
- Import `Capacitor` from `@capacitor/core`
- Add a `isCapacitorNative()` check
- In `downloadFile()`, route Capacitor Android through the iOS-style `navigator.share` flow (which supports file sharing)
- Keep the anchor fallback for regular Android browsers (Chrome, Firefox) where `<a download>` works fine

---

## Issue 2: Portfolio "Download CV" Button -- Privacy and Errors

**Root Cause:** The button is labeled "Download CV" but actually captures a screenshot of the portfolio page as PDF. The label is misleading and raises privacy concerns since visitors think they're getting the actual CV. The download error likely stems from `html2canvas` failing on cross-origin avatar images.

**Fix (3 changes):**

### A. Rename button: "Download CV" to "Save as PDF"
### File: `src/pages/PublicPortfolioPage.tsx` (line ~1696)
- Change label from `'Download CV'` to `'Save as PDF'`
- Change generating label from `'Generating...'` to `'Saving...'`

### B. Fix html2canvas error on cross-origin images
### File: `src/pages/PublicPortfolioPage.tsx` (handleDownload function, line ~1354)
- Add `foreignObjectRendering: false` to html2canvas options for better cross-origin handling
- Wrap the entire flow in a more graceful try/catch that still produces a PDF even if some images fail to load
- Add `onclone` callback to remove problematic cross-origin images from the cloned DOM before capture

### C. Use navigator.share on mobile for the portfolio PDF
- After generating the blob, use `navigator.share` on mobile devices instead of the anchor download, which is more reliable

---

## Issue 3: Dashboard -- Add "My CVs" and "Tailored" Tabs

**Root Cause:** After tailoring a CV, the user has difficulty finding it because all resumes are shown in a single list. The tailored versions are nested under master resumes, which can be confusing.

**Fix:** Add a tab bar at the top of the resume list on the Dashboard with two tabs:

### File: `src/pages/DashboardPage.tsx`
- Add a `Tabs` component (already exists in the project) with two tabs: **"My CVs"** and **"Tailored"**
- **"My CVs" tab:** Shows only original/master resumes (resumes without a `parent_resume_id`)
- **"Tailored" tab:** Shows only tailored resumes (resumes with a `parent_resume_id`), each displaying:
  - The tailored resume title
  - A brief showing the target job title and company
  - The job URL as a clickable LinkedIn/link chip (if available from the `target_job_title` and `target_company` fields)
  - Quick actions (edit, download, delete)
- Default tab is "My CVs"
- Tab state persists during the session but resets on page reload

### Database field needed:
- Check if `job_url` is stored on tailored resumes. Currently the tailor flow stores `target_job_title` and `target_company` but the job URL from `JobUrlParser` is not persisted to the database.

### File: `src/components/editor/TailorSheet.tsx`
- When creating the tailored resume in `handleApplyChanges`, also save the `jobUrl` to the resume record (will need a new column or use existing metadata)

---

## Issue 4: Persist Job URL for Tailored Resumes

**Fix:** Add a `job_url` column to the `resumes` table so tailored resumes can link back to the original job posting.

### Database Migration:
```sql
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS job_url text;
```

### File: `src/components/editor/TailorSheet.tsx`
- In `handleApplyChanges`, include `job_url: jobUrl || null` in the insert

### File: `src/pages/DashboardPage.tsx` (Tailored tab)
- Display `job_url` as a clickable link chip when available

---

## Technical Summary of File Changes

| File | Change |
|------|--------|
| `src/lib/downloadUtils.ts` | Add Capacitor-aware share-first download for Android |
| `src/pages/PublicPortfolioPage.tsx` | Rename "Download CV" to "Save as PDF", fix html2canvas error handling |
| `src/pages/DashboardPage.tsx` | Add "My CVs" / "Tailored" tabs with job brief display |
| `src/components/editor/TailorSheet.tsx` | Save job_url when creating tailored resume |
| Database migration | Add `job_url` column to `resumes` table |
