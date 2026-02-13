
## Add "Wise AI" Label Below Chat Icon

### Problem
The Wise AI chat trigger button in the editor header (top-right area) only shows a Sparkles icon with no text label. Adding "Wise AI" below it will improve user trust and feature discoverability.

### Changes

**File: `src/pages/EditorPage.tsx` (lines ~406-429)**

Restructure the chat trigger button to include a "Wise AI" text label below the Sparkles icon:

1. Change the button layout from a simple icon container to a vertical flex column (`flex-col`) with `gap-0.5`
2. Add a `<span className="text-[9px] font-medium ...">Wise AI</span>` below the Sparkles icon
3. Slightly increase the button's min dimensions to accommodate the label (from `min-w-[52px] min-h-[52px]` to `min-w-[54px] min-h-[54px]`)
4. The label color follows the same auth-aware pattern: `text-primary` when logged in, `text-muted-foreground` when guest

The notification dot and lock badge positions will be adjusted to stay relative to the icon area rather than the full button.

### Result
- Logged-in users see: glowing Sparkles icon + "Wise AI" label in primary color with pulse animation
- Guest users see: dimmed Sparkles icon + "Wise AI" label in muted color at 50% opacity
- No other files need changes -- the label is only added to the header trigger button
