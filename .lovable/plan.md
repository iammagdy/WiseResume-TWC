

## Make Create Resume Button More Responsive

### Current State
- **FloatingCreateButton**: A 56px (w-14 h-14) circular FAB with just a `+` icon, no text label. Already has `whileTap={{ scale: 0.9 }}` and haptic feedback. Clicking it opens the `CreateResumeDialog`.
- **EmptyState button**: A large `h-14 px-8 text-lg` button labeled "Create Your First Resume". Already triggers the same dialog.
- **CreateResumeDialog**: Already has the 3 options (Start from Scratch, Upload PDF, Duplicate Existing) -- no need to rebuild this.

### What Changes

**1. FloatingCreateButton (`src/components/dashboard/FloatingCreateButton.tsx`)**
- Reduce size from `w-14 h-14` to `h-12 rounded-full` pill shape
- Add text label: "+ New Resume"
- Keep `whileTap={{ scale: 0.92 }}` for tactile press feedback
- Remove the pulsing ring animation (too distracting, wastes vertical attention)
- Reduce shadow intensity slightly

**2. EmptyState (`src/components/dashboard/EmptyState.tsx`)**
- Reduce button from `h-14 px-8 text-lg` to `h-12 px-6 text-base` (slightly smaller)
- Keep existing "Create Your First Resume" label and `Plus` icon
- Add `active:scale-[0.97]` for press feedback (already in Button component defaults)
- Reduce floating icon from `w-20 h-20` to `w-16 h-16` and `mb-6` to `mb-5` to save vertical space

No changes needed to `CreateResumeDialog` -- it already provides the 3-option modal (Start from Scratch, Upload PDF, Duplicate Existing) which maps to the user's requested options.

### Technical Details

**FloatingCreateButton changes:**
```
// Before: icon-only circle
w-14 h-14 rounded-full

// After: pill with label
h-12 px-5 rounded-full gap-2
<Plus className="w-5 h-5" />
<span className="text-sm font-semibold">New Resume</span>
```

**EmptyState changes:**
- Floating icon: `w-20 h-20` -> `w-16 h-16`, inner icon `w-10 h-10` -> `w-8 h-8`
- CTA button: `h-14 px-8 text-lg` -> `h-12 px-6 text-base`
- Reduce `py-12` to `py-8` on the outer container for less vertical padding
