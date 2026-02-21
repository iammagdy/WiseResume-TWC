
# Native App UI Compaction: Make Everything Feel Like a Real App

## Problem
The app's UI elements (icons, inputs, labels, cards, spacing) are sized for a desktop website, not a native mobile app. This makes form fields hard to see without scrolling, wastes precious viewport space, and gives a "web page" feel rather than a polished native app experience.

## Root Causes Identified

1. **Input fields are 48px tall** (`h-12`) -- native apps use 40px or 36px
2. **Form field labels have `space-y-2`** (8px gap) between label and input -- should be 4px
3. **Section card headers are oversized** -- 32x32px icon box + large padding
4. **The tip pill + nudge card = two instructional banners** before any input
5. **The "Previous / Next" navigation row** at the bottom of each section consumes ~56px
6. **Dashboard header has too many icon buttons** competing for attention
7. **The "Good afternoon" greeting card** takes ~120px of vertical space with a large font
8. **Stepper nav pills are 36px tall** (`h-9`) -- could be 32px
9. **The progress bar row has generous padding** (`py-1 sm:py-3`)
10. **Bottom action bar could be slimmer** -- currently 36px min-height

## Changes

### 1. Compact Input Fields (HIGH IMPACT)
**File: `src/components/ui/input.tsx`**
- Reduce default height from `h-12` (48px) to `h-10` (40px)
- Reduce padding from `px-4 py-3` to `px-3 py-2`
- Keep `text-[16px]` (required to prevent iOS zoom on focus)

### 2. Tighten Form Field Spacing (HIGH IMPACT)
**File: `src/components/ui/form-field.tsx`**
- Reduce wrapper `space-y-2` to `space-y-1` (label-to-input gap: 8px to 4px)
- Reduce label text from `text-sm font-semibold` to `text-xs font-medium`
- Reduce clear button touch area from `min-w-[48px] min-h-[48px]` to `min-w-[40px] min-h-[40px]` (still above 38px minimum)
- Reduce textarea `min-h-[120px]` to `min-h-[100px]` on mobile

### 3. Compact Section Card Header
**File: `src/components/editor/SectionCard.tsx`**
- Reduce icon box from `w-8 h-8` to `w-6 h-6`, icon from `w-4 h-4` to `w-3.5 h-3.5`
- Reduce header padding from `px-4 pt-4 pb-2` to `px-3 pt-3 pb-1`
- Reduce content padding from `px-3 sm:px-4 pb-4` to `px-3 pb-3`

### 4. Reduce Contact Section Vertical Waste
**File: `src/components/editor/ContactSection.tsx`**
- Reduce the wrapper `space-y-5` to `space-y-3` (field-to-field gap: 20px to 12px)

### 5. Compact Stepper Nav Pills
**File: `src/components/editor/StepperNav.tsx`**
- Reduce pill height from `h-9` (36px) to `h-7` (28px)
- Reduce container padding from `py-1.5` to `py-1`

### 6. Slim Down Editor Chrome
**File: `src/pages/EditorPage.tsx`**
- Reduce editor header back button from `p-3 min-w-[48px] min-h-[48px]` to `p-2 min-w-[40px] min-h-[40px]`
- Reduce the back arrow icon from `w-6 h-6` to `w-5 h-5`
- Reduce progress bar row padding from `py-1` to `py-0.5`

### 7. Compact Dashboard Layout
**File: `src/pages/DashboardPage.tsx`**
- Reduce the "Good afternoon" greeting font from the current large size to `text-lg` (from `text-xl` or larger)
- Tighten vertical spacing between dashboard sections

### 8. Compact Bottom Action Bar
**File: `src/pages/EditorPage.tsx`**
- Reduce button heights from `h-8 min-h-[36px]` to `h-7 min-h-[28px]`
- Reduce bar padding from `py-0.5` to `py-px`

## Expected Impact
- Each input field saves ~8px vertically (6 contact fields = ~48px saved)
- Label spacing saves ~4px per field (6 fields = ~24px)
- Section card header saves ~12px
- Stepper nav saves ~12px  
- Progress row saves ~4px
- Header saves ~8px
- **Total: ~108px of vertical space recovered** -- enough to show 2-3 more fields above the fold

## Files Modified
| File | Change |
|------|--------|
| `src/components/ui/input.tsx` | `h-12` to `h-10`, padding reduction |
| `src/components/ui/form-field.tsx` | Tighter spacing, smaller labels |
| `src/components/editor/SectionCard.tsx` | Smaller header icons and padding |
| `src/components/editor/ContactSection.tsx` | `space-y-5` to `space-y-3` |
| `src/components/editor/StepperNav.tsx` | Shorter pills |
| `src/pages/EditorPage.tsx` | Slimmer header, progress, action bar |
| `src/pages/DashboardPage.tsx` | Tighter greeting/spacing |

No database changes. No new dependencies.
