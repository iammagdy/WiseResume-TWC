

## Fix Three Issues: AI Scoring, App Name, and App Icon

### Issue 1: AI Scoring Failures in APK

The `score-resume` edge function works correctly (verified by direct testing -- returns valid scores). The failure in the APK is likely caused by:
- Auth token not being passed correctly from the Capacitor WebView
- Network timeouts on slower mobile connections
- The error toast "Scoring failed. Tap Re-score to try again." is a catch-all that hides the real error

**Fix:** Add detailed console logging in `useResumeScore.ts` to surface the actual error, and add retry logic with better error differentiation (auth vs network vs rate limit). Also ensure the Supabase client passes the auth header correctly when invoked from native WebView.

**Files to change:**
- `src/hooks/useResumeScore.ts` -- Add `console.error` with full error details before showing toast, add automatic retry (1 retry with 2s delay), and differentiate error types in user-facing messages

### Issue 2: App Name Should Be "Wise Resume"

Currently inconsistent:
- `capacitor.config.ts`: `appName: 'Wise AI'` (wrong)
- `manifest.json`: `"short_name": "WiseResume"`, `"name": "WiseResume - AI Resume Editor"` (close but needs update)
- `index.html`: `<title>WiseResume - AI Resume Editor</title>` (close)

**Fix:** Unify all to "Wise Resume":

**Files to change:**
- `capacitor.config.ts` -- Change `appName` from `'Wise AI'` to `'Wise Resume'`
- `public/manifest.json` -- Change `name` to `"Wise Resume - AI Resume Editor"` and `short_name` to `"Wise Resume"`
- `index.html` -- Change `<title>` to `"Wise Resume - AI Resume Editor"`, update OG title
- `.github/workflows/build-apk.yml` -- Update artifact name if needed

### Issue 3: App Icon Not Matching Landing Page

The icons in `public/icons/` are all full-size 2.56 MB copies of `wise-ai-logo.png` without any resizing. While they contain the correct image, their massive size causes:
- Slow loading on mobile
- Potential rendering issues on Android (expects properly sized icons)

**Fix:** Since we cannot resize images in Lovable (no image processing tools), we will ensure the correct logo file is referenced consistently. The current setup already copies the logo to all icon slots -- the icons should display correctly despite being oversized. If the icon still doesn't appear in the APK, we need to update the GitHub workflow to use Android's adaptive icon XML format instead of just copying PNGs.

For now, the workflow already injects `wise-ai-logo.png` (via `public/icons/`) into the mipmap directories. We'll verify the icon injection step handles all required Android icon formats.

### Technical Details

#### `capacitor.config.ts` (line 5)
Change `appName: 'Wise AI'` to `appName: 'Wise Resume'`

#### `public/manifest.json` (lines 2-3)
```json
"name": "Wise Resume - AI Resume Editor",
"short_name": "Wise Resume",
```

#### `index.html` (line 6, 27)
```html
<title>Wise Resume - AI Resume Editor</title>
...
<meta property="og:title" content="Wise Resume - AI Resume Editor" />
```

#### `src/hooks/useResumeScore.ts`
- Add detailed `console.error` logging before toast to help debug APK issues
- Add 1 automatic retry with 2-second delay before showing failure toast
- Differentiate between auth errors (suggest re-login) and other errors

