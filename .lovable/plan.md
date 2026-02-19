

# Fix Shake Detection Sensitivity and Add Shake Context to Dialog

## Problem
The shake-to-report feature triggers too easily with light movement, causing the bug report dialog to pop up unexpectedly. Additionally, the dialog doesn't explain *why* it appeared, confusing users.

## Changes

### 1. Increase shake detection difficulty (`src/hooks/useShakeDetect.ts`)

Current settings are too sensitive:
- `THRESHOLD = 15` (acceleration magnitude) -- raise to **25**
- `SHAKE_COUNT = 3` (shakes needed) -- raise to **4**
- `SHAKE_WINDOW_MS = 1000` -- keep as-is
- `COOLDOWN_MS = 3000` -- raise to **5000** (5 seconds)

These changes mean the user must shake the device harder and more deliberately before the dialog triggers.

### 2. Mark shake-triggered reports in the bug report data (`src/hooks/useShakeDetect.ts`)

Pass a `source: 'shake'` indicator in the `triggerBugReport` call so the dialog knows this was triggered by shaking.

Update the `BugReportData` type in `src/lib/bugReport.ts` to include an optional `source?: 'shake' | 'error' | 'manual'` field.

### 3. Show shake explanation in the dialog (`src/components/BugReportDialog.tsx`)

When `data.source === 'shake'`, change the dialog messaging:
- **Title**: "Shake Detected" instead of "We Detected an Issue"
- **Description**: "You shook your device to report a problem. Describe what went wrong and we'll look into it within **24 hours**."
- Add a small dismissive note: "Triggered by device shake gesture" below the context card

This way users understand exactly why the dialog appeared and can dismiss it if it was accidental.

## Technical Details

| File | Change |
|---|---|
| `src/hooks/useShakeDetect.ts` | Raise THRESHOLD to 25, SHAKE_COUNT to 4, COOLDOWN_MS to 5000; add `source: 'shake'` to triggerBugReport call |
| `src/lib/bugReport.ts` | Add optional `source` field to `BugReportData` interface |
| `src/components/BugReportDialog.tsx` | Conditionally show "Shake Detected" title and explanation when source is 'shake' |

