

## Fix Black Lines on Template Preview Cards

### Root Cause
Lines 184-185 in `src/pages/Index.tsx` render two gradient overlay divs meant to create a "fade to edge" scroll effect. In dark mode, `from-background` resolves to a near-black color, producing visible dark vertical strips on the left and right edges of the template row. These are the "weird black lines" visible in the screenshot.

### Solution
Remove the gradient fade overlays entirely. They add visual noise on a short row of only 3 small cards that already fit on screen without needing scroll-fade hints.

### File Changes

**File: `src/pages/Index.tsx`**

**Delete lines 184-185** (the two gradient overlay divs):
```
<div className="absolute left-0 top-0 bottom-2 w-6 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
<div className="absolute right-0 top-0 bottom-2 w-6 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
```

These two elements are the sole cause of the dark vertical bars flanking the template cards. Removing them eliminates the issue without affecting any other functionality.

### Technical Details
- The overlays were intended as scroll-fade hints for horizontal scrolling, but with only 3 narrow cards (w-28 each) the row rarely scrolls, making these unnecessary
- No other files or components are affected
- The `relative` wrapper on line 182 can remain (harmless) or be simplified to a plain div

