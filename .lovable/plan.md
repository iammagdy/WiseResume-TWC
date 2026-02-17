

## Fix: Close Button Overlapping Count Badge in ResumeListSheet

### Problem
In the "Tailored Versions" (and "Resumes Created") bottom sheet, the count badge uses `ml-auto` to push itself to the far right of the header row. The Sheet component's close button (X) is absolutely positioned at `right-4 top-4`. Both elements occupy the same space, causing the X button to sit directly on top of the badge.

### Root Cause
The `SheetHeader` in `ResumeListSheet.tsx` uses `px-6` padding, but the close button is positioned at `right-4` (16px from edge). The badge with `ml-auto` extends to the right edge of the header's content area, which overlaps with the close button's hit area.

### Solution
Add right padding to the header's inner `div` to reserve space for the close button. This is a single-line change.

**File: `src/components/applications/ResumeListSheet.tsx` (line 84)**

Change the header row from:
```
<div className="flex items-center gap-2">
```
to:
```
<div className="flex items-center gap-2 pr-10">
```

The `pr-10` (40px) creates enough clearance for the 44x44px close button so the badge and X no longer overlap.

### Other Sheets
Scanned all other Sheet headers across the app -- only `ResumeListSheet` has this issue because it is the only sheet that places an `ml-auto` element in the header row competing with the close button's position. No other fixes needed.

