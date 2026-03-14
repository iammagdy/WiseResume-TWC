# Verification Quickstart: api/bugfixes-ux

Use this guide to manually verify the bug-fixes and UX polish applied in this phase.

## 1. Authentication & Backend Connectivity
1. Sign out of the application.
2. Sign in using your Kinde credentials.
3. Open the Developer Tools -> Network Tab.
4. Verify that requests to `your-supabase-url.supabase.co/rest/v1/...` return `200 OK` and not `401 Unauthorized` or `500 Internal Server Error`.
5. Ensure the token exchange Edge function call appears in the Network tab and completes successfully (status 200).

### Negative Auth Test (Missing or Misconfigured `EXT_SUPABASE_JWT_SECRET`)
> Run this only in a safe test/staging environment — never against production.
1. Temporarily remove or leave `EXT_SUPABASE_JWT_SECRET` unconfigured in Supabase Secrets.
2. Sign in with valid Kinde credentials.
3. **Expected behavior**: The token-exchange edge function should return a clear error (visible in the Network tab as a `400` or `500` response). The app should NOT silently proceed — it should either show an error state or a connection banner.
4. **Pass criterion**: The user sees a visible error state or banner and is NOT routed to their resume data as if authenticated.
5. Restore `EXT_SUPABASE_JWT_SECRET` immediately after this test.

## 2. Active Resume Recovery ("Create a resume first" fix)

### Scenario A — Create New Resume
1. Go to the dashboard and click "Create New Resume".
2. Once the resume is created, immediately click the "AI Studio" or "Deep Analyze" tab **without refreshing**.
3. **Pass criterion**: You must NOT see the "Create a resume first" interstitial. The newly created resume must load as the active target instantly.

### Scenario B — Duplicate Existing Resume
1. Go to the dashboard and click "Duplicate" on any existing resume.
2. Immediately click "AI Studio" or "Deep Analyze" **without refreshing**.
3. **Pass criterion**: Same as Scenario A — the duplicated resume must be recognized as active without any interstitial or stale state.

## 3. Global Connection Banner Precision
1. Turn off your Wi-Fi or disconnect from the internet.
2. You should see a standard "Offline" indicator.
3. You MUST NOT see "We couldn't connect your data. Please try again in a moment." (This specific red banner is now strictly reserved for backend Supabase rejections and 500 API failures, not local network drops).

## 4. Deep Analyze Actionable Feedback
1. Open a resume in the Editor and navigate to "Job Analysis" (Deep Analyze tool).
2. Ensure the text area for the Job Description is completely empty.
3. Click the "Analyze Match" button.
4. The button should NOT feel "dead". You should immediately see a toast notification popping up saying "Add Job Description" (or similar wording explaining the missing input).

## 5. PDF Export Integrity
1. Open a completed resume in the Preview page.
2. Click "Download PDF".
3. Wait for the generation to complete.
4. Verify the downloaded file is saved with a valid `.pdf` extension (e.g., `WiseResume.pdf`).
5. Open the file in a standard PDF viewer (like Chrome or Adobe Acrobat). It must be legible, not corrupted, and not consist of blank white pages.

### If the exported PDF is blank or corrupted
- Right-click the downloaded file and check its properties (file size). A valid resume PDF should be **at least 100 KB**.
- If the file is smaller than ~10 KB, the blob generation likely failed silently — note the exact file size and report it.
- If the file opens but shows only white/blank pages, the `html2canvas` render may have failed — check the browser console for errors during export.
- If the file extension is wrong (e.g., `.pdf` missing or `.pdf.pdf`), the `download` attribute on the anchor element is the likely culprit.

## 6. UI Polish & Typography
1. Open any floating Sheet or Modal (e.g., Settings Page, Data Export Sheet, AI Match Sheet).
2. Verify that the background behind the sheet text has a sleek `backdrop-blur` (glassmorphism) applied — the background should be visibly softened, not fully transparent.
3. Toggle to **Light Theme** with the animated cloud background visible. Confirm all text inside the sheet is clearly readable (no washed-out or near-invisible text).
4. Toggle to **Dark Theme** with the animated cloud background visible. Confirm the same legibility — text must not bleed into the dark background or be obscured by cloud animation colors.
5. **Pass criterion for both themes**: A typical user should be able to read every label, value, and button inside floating sheets without straining or zooming. If text blends with the background, the blur or opacity value needs adjustment.
6. Resize the window to mobile width (approximately 375px wide). Verify the "Ask Wise AI" floating button does NOT overlap the Settings or Download action buttons at the bottom of the screen.
