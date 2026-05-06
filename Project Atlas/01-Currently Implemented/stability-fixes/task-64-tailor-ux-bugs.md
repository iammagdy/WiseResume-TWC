# Task #64 — Tailor UX Bug Fixes

**Last verified:** 2026-05-06
**Type:** stability-fix / UX
**Files touched:**
- `src/components/editor/tailor/JobUrlParser.tsx`
- `src/components/editor/tailor/TailorProgress.tsx`
- `src/lib/aiTailor.ts`
- `src/pages/TailorPage.tsx`

---

## Bugs fixed

### 1 — Can't return to URL mode after "Paste manually"

**Root cause:** `JobUrlParser.tsx` rendered "Use URL instead" only when `!showManual && !isUrl(urlInput)`. Clicking "Or paste manually" sets `showManual = true`, making `!showManual` permanently `false` and hiding the button indefinitely.

**Fix:** Removed both guards. The button now renders unconditionally inside the `(showManual || value) && !parsedInfo` block — i.e., whenever the manual textarea is visible.

### 2 — URL placeholder implied LinkedIn-only

**Root cause:** `placeholder="https://linkedin.com/jobs/view/..."` despite `parse-job` edge function supporting 25+ boards.

**Fix:** Placeholder changed to `"Paste a job URL (LinkedIn, Indeed, Glassdoor…)"`.

### 3 — Loading screen text invisible on dark theme

**Root cause:** `<h4>` had no explicit text colour class (relied on inherited foreground) and `<p>` used `text-muted-foreground`, both rendered against a `from-primary/10` gradient card in dark mode — contrast insufficient.

**Fix:** `<h4>` now has `text-foreground`; `<p>` uses `text-foreground/70`.

### 4 — Progress bar regresses during retry

**Root cause:** On any transient error, `tailorResumeWithProgress` called `onProgress({ progress: 70, … })` before auto-retrying, visibly dropping the bar from whatever value the timer had reached.

**Fix:** Added `let lastEmittedProgress = 0` tracker. Updated on every interval tick (not just step transitions) so it always reflects the live animated value. On retry, `progress: lastEmittedProgress` carries the exact current position through — no jump, no regression.

### 5 — Resume-switch toast appeared as error

**Root cause:** `toast.info('Resume switched — ready to tailor')` used Sonner's info accent which looks reddish in the app's dark theme.

**Fix:** Changed to `toast.success(...)` for unambiguous green styling.
