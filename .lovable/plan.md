

## Touch Target and Mobile Accessibility Improvements

### Analysis

After thorough exploration, the codebase is in better shape than the issue descriptions assumed:

- **No table layout exists** in the job tracker -- both `ApplicationsPage` and `ApplicationTrackerPage` already use card-based layouts. Issue 10 is already resolved by design.
- **Most editor buttons already meet 44px minimums** -- ExperienceSection delete buttons use `min-h-[44px]`, accordion headers use `min-h-[80px]`, and "Add" buttons use `min-h-[56px]`.
- **Actual gaps found**: A few interactive elements fall below the 44px touch target standard, and the delete action in `ApplicationCard` lacks a confirmation step.

### Changes

**1. Fix AIActionBar button heights (Issue 9)**

File: `src/components/editor/ai/AIActionBar.tsx`

- Increase primary action buttons from `h-10` (40px) to `h-11` (44px) to meet the minimum touch target
- Increase "More" dropdown trigger from `h-10` to `h-11`
- Increase dropdown menu item padding from `py-3` to `py-3.5` for better touch targets

**2. Fix ApplicationCard "More options" button (Issue 9)**

File: `src/components/applications/ApplicationCard.tsx`

- The three-dot menu button currently uses `p-2` (total ~32px). Add `min-h-[44px] min-w-[44px]` and center the icon to meet touch target requirements.

**3. Add mobile delete confirmation Drawer for ApplicationCard (Issue 9)**

File: `src/components/applications/ApplicationCard.tsx`

- Replace the inline `onDelete` call in the dropdown with a confirmation step
- On mobile, use a bottom Drawer (vaul) instead of AlertDialog for thumb-friendly deletion confirmation
- The Drawer shows the job title/company being deleted and provides "Delete" (destructive) and "Cancel" buttons with 44px minimum height
- On desktop (>768px), keep the existing dropdown behavior with no extra confirmation (the ApplicationTrackerPage detail view already has an AlertDialog for deletion)

**4. Increase SectionCard action area spacing on mobile (Issue 9)**

File: `src/components/editor/SectionCard.tsx`

- Add `min-h-[44px] flex items-center` to the action wrapper div to ensure the AI action button in the header always has adequate touch area
- Change header gap from `gap-3` to `gap-3 sm:gap-3` (already fine) but ensure the action area has sufficient padding

### Technical Details

**AIActionBar changes:**
```
// Before
className="shrink-0 h-10 px-4 ..."
// After  
className="shrink-0 h-11 px-4 ..."
```

**ApplicationCard delete confirmation Drawer:**
- Uses the existing `Drawer` component from `src/components/ui/drawer.tsx`
- Local state `showDeleteConfirm` controls visibility
- The `useIsMobile` hook determines whether to show a Drawer (mobile) or skip confirmation (desktop, since detail page has its own)
- Both "Delete" and "Cancel" buttons in the drawer use `min-h-[44px]` and `active:scale-95`

**SectionCard action wrapper:**
```
// Before
{action && <div className="shrink-0">{action}</div>}
// After
{action && <div className="shrink-0 min-h-[44px] flex items-center">{action}</div>}
```

### Files Changed

- `src/components/editor/ai/AIActionBar.tsx` -- increase button heights to 44px
- `src/components/applications/ApplicationCard.tsx` -- fix "More" button size, add delete confirmation Drawer on mobile
- `src/components/editor/SectionCard.tsx` -- ensure action slot meets 44px touch target

