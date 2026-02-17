

## Fix Preview Page Bottom Actions - Oversized Buttons on Mobile

### Problems Identified

1. **Download button too tall**: Uses `size="lg"` with `h-12 sm:h-14` (48px on mobile) -- combined with `text-base sm:text-lg` font, it looks disproportionately large
2. **Secondary action row also oversized**: Edit, Interview, Share buttons use `size="lg"` with `h-11 sm:h-12` -- these are secondary actions that don't need to be this prominent
3. **Excessive padding**: The bottom container has `p-4` padding and `space-y-2 sm:space-y-3` gap, eating into the already limited mobile viewport
4. **Icons too large in secondary row**: `w-5 h-5` icons in the secondary buttons make them feel chunky
5. **Double bottom spacing**: `pb-safe` on the bottom actions container plus the BottomTabBar's own padding creates visual bloat

### Changes

**File: `src/pages/PreviewPage.tsx`** (lines 591-669)

Reduce button sizes and spacing for mobile while keeping desktop comfortable:

- **Download button**: Change from `h-12 sm:h-14 text-base sm:text-lg` to `h-10 sm:h-12 text-sm sm:text-base` -- still prominent but not oversized
- **Export dropdown button**: Match at `h-10 sm:h-12`
- **Secondary row (Edit, Interview, Share)**: Change from `size="lg" h-11 sm:h-12` to `size="default" h-9 sm:h-10` -- clearly secondary
- **Container padding**: Reduce from `p-4` to `px-3 py-2 sm:p-4`
- **Row gap**: Change `space-y-2 sm:space-y-3` to `space-y-1.5 sm:space-y-2`
- **Icon sizes in secondary**: Change `w-4 h-4 sm:w-5 sm:h-5` to `w-3.5 h-3.5 sm:w-4 sm:h-4`
- **Download icon**: `w-4 h-4 sm:w-5 sm:h-5` (down from `w-5 h-5`)

These changes save roughly 30-40px of vertical space on mobile, making the preview area taller and the buttons feel proportional to the screen.

