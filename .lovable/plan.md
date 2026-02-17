
## Optimize Preview Page for Mobile

### Problems
1. **Header is oversized**: The back button has `p-3` padding with `min-w-[48px] min-h-[48px]`, and the header has `py-3` -- totaling ~56px height
2. **Template switcher row is too tall**: `py-3` padding plus full-height pills
3. **ATS badge row wastes space**: A full-width row just for "ATS-Ready" badge and page break toggle
4. **NextStepBanner adds another row** before the actual preview
5. **Bottom actions take ~100px**: Two rows of buttons plus padding
6. **Outer wrapper has `pb-20`** for bottom tab bar, but the bottom actions already have `pb-safe` -- double spacing
7. **Preview area has nested overflow**: `flex-1 flex flex-col min-h-0 overflow-hidden` wrapper inside the outer `flex-1 flex flex-col min-h-0 overflow-hidden pb-20`

Combined, these chrome elements consume roughly 280-320px of a 812px mobile viewport, leaving only ~500px for the actual resume -- and the resume itself has `minHeight: 792px`, so users must scroll heavily.

### Changes

**File: `src/pages/PreviewPage.tsx`**

1. **Compact header** (line 479):
   - Reduce header padding from `py-3` to `py-2`
   - Reduce back button from `p-3 min-w-[48px] min-h-[48px]` to `p-2 min-w-[44px] min-h-[44px]`
   - Reduce title from `text-lg` to `text-base`

2. **Compact template switcher** (line 493-520):
   - Reduce padding from `py-3` to `py-2`
   - Reduce pill padding from `px-4 py-2` to `px-3 py-1.5`
   - Reduce pill text from `text-sm` to `text-xs`

3. **Merge ATS badge into template row** (lines 522-558):
   - Move the ATS badge and page break toggle into the template switcher row (right-aligned) instead of taking a separate full row
   - This saves ~36px of vertical space

4. **Reduce preview padding** (line 564):
   - Change from `p-2 sm:p-4` to `p-1 sm:p-4` on mobile

5. **Remove redundant wrapper** (line 491):
   - The inner `flex-1 flex flex-col min-h-0 overflow-hidden` wrapper is redundant since the outer div at line 477 already has the same classes
   - Flatten to remove one nesting level

6. **Bottom actions already optimized** from the last edit -- keep as-is

### Estimated Space Savings on Mobile
- Header: ~10px saved
- Template row: ~8px saved
- ATS row merged: ~36px saved
- Preview padding: ~4px saved
- **Total: ~58px more preview area visible**

### Technical Approach
- Merge the ATS badge row into a sub-row beneath the template pills, inside the same border-b container, reducing it to a compact inline bar
- All touch targets remain at 44px minimum
- No functional changes -- only visual compaction
