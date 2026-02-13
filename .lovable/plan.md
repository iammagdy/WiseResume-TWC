

## Fix Editor Tab Navigation Overflow

### Problem
The `StepperNav` component uses `px-[30%]` padding on the scroll container (line 91), which pushes tabs off-screen and forces horizontal scrolling. With only 5 tabs, they should all fit on screen without scrolling on most devices.

### Solution

**File: `src/components/editor/StepperNav.tsx`**

1. **Remove excessive horizontal padding** -- change `px-[30%]` to `px-2` so the tabs can spread across the full width
2. **Change layout to distribute tabs evenly** -- add `justify-between w-full` so all 5 tabs share the available space equally instead of being left-aligned with scroll
3. **Remove snap scrolling classes** -- since all tabs will be visible, `snap-x snap-mandatory` and `overflow-x-auto` become unnecessary; change to `overflow-x-hidden`
4. **Keep fade indicators and auto-scroll logic** as fallback for very narrow screens (under ~320px)

### Specific Change (line 91)

Before:
```
className="flex items-center gap-1 relative overflow-x-auto scrollbar-hide snap-x snap-mandatory px-[30%]"
```

After:
```
className="flex items-center justify-between relative overflow-x-auto scrollbar-hide w-full px-2"
```

Also update the step button (line 116) to remove `snap-center shrink-0` so tabs can flex naturally:
```
className="flex flex-col items-center gap-1.5 relative z-10 touch-manipulation min-w-[48px] min-h-[48px] p-1"
```

### Files Modified
- `src/components/editor/StepperNav.tsx` -- 2 line changes to fix tab layout
