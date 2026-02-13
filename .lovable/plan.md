

## Fix: Duplicate Toasts and Premium Toast Redesign

### Problem 1: Duplicate Delete Toasts
When deleting a resume, TWO success toasts appear:
- `useResumes.ts` hook fires `toast.success('Resume deleted')` in its `onSuccess` callback
- `DashboardPage.tsx` fires `toast.success('"Title" deleted')` with an Undo action in its own `onSuccess`

**Fix**: Remove the generic toast from `useResumes.ts` (line 243) since the DashboardPage provides a richer, contextual toast with the resume title and Undo action. The hook should only handle cache invalidation.

### Problem 2: Toast Visual Design
The current toast styling has issues visible in the screenshot:
- Oversized icon with a glowing green circle that bleeds into the layout
- The toast surface looks messy with conflicting glass layers and border-left treatment
- Close button and action button styling feel inconsistent with the Cosmic Glass UI

**Fix**: Redesign the toast CSS in `index.css` and update the Sonner component config in `sonner.tsx`:

**`src/components/ui/sonner.tsx` changes:**
- Reduce icon size from `h-5 w-5` to `h-4 w-4` and remove the heavy `drop-shadow` glow
- Clean up the `toastOptions.classNames` to remove conflicting class layers
- Keep `richColors={false}` and `closeButton={true}`

**`src/index.css` changes (lines 968-1161):**
- Simplify the base `[data-sonner-toast]` styling: cleaner glass surface, tighter padding, no border-left
- Replace the `.toast-premium` class with a cleaner design: subtle rounded card with a thin top-edge color accent instead of a thick left border
- Refined type-specific styles (success/error/warning/info): subtle tinted background with a thin colored top border instead of a left border
- Smaller, tighter progress bar animation
- Remove redundant `box-shadow` layers that cause visual noise
- Ensure mobile toast width uses full width minus safe margins

### Files Changed
1. **`src/hooks/useResumes.ts`** - Remove `toast.success('Resume deleted')` from the delete mutation's `onSuccess` (line 243)
2. **`src/components/ui/sonner.tsx`** - Smaller icons, remove drop-shadow glow, cleaner class names
3. **`src/index.css`** - Redesigned toast CSS block (lines 968-1161): cleaner glass surface, top-accent color bar, refined shadows
