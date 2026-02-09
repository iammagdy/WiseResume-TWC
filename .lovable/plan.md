

# Fix Duplicate Close Button Issue

## Problem Identified

The screenshot shows two X buttons in the Import Resume sheet. After analyzing the codebase, I found:

1. **Root Cause**: The `SheetContent` component in `src/components/ui/sheet.tsx` (lines 74-77) **always** renders a built-in close button
2. **Duplicate**: The `ImportUploadSheet` component (lines 144-150) adds its **own** custom close button next to the "WISE AI ENGINE" badge
3. **Result**: Two X buttons appear - one from the Sheet component and one custom

## Files Affected

| File | Issue | Fix Required |
|------|-------|--------------|
| `src/components/upload/ImportUploadSheet.tsx` | Adds custom X button when SheetContent already has one | Remove custom close button |
| `src/components/ui/sheet.tsx` | Always renders close button | Add optional `hideCloseButton` prop |
| `src/components/ui/dialog.tsx` | Always renders close button | Add optional `hideCloseButton` prop (for consistency) |

## Solution Approach

There are two valid approaches:

**Option A: Remove custom close buttons from components** (Recommended)
- Remove the custom X button from `ImportUploadSheet` since `SheetContent` already provides one
- This is the simplest fix and maintains consistency across all sheets

**Option B: Add `hideCloseButton` prop to SheetContent**
- Allow components to opt-out of the built-in close button when they need custom placement
- More flexible but adds complexity

I recommend **Option A** as the primary fix, since:
- The built-in close button is already well-styled and accessible
- Keeps UI consistent across all sheets
- Less code to maintain

---

## Implementation Details

### 1. Fix ImportUploadSheet (Primary Fix)

**File:** `src/components/upload/ImportUploadSheet.tsx`

Remove the custom close button (lines 144-150) from the header. The header will only contain the "WISE AI ENGINE" badge, and users will use the built-in X button that SheetContent provides.

```tsx
// Before (lines 136-151):
<div className="flex items-center justify-between pb-4">
  <Badge ...>WISE AI ENGINE</Badge>
  <button onClick={onClose} ...>  // ❌ DUPLICATE - Remove this
    <X className="w-5 h-5" />
  </button>
</div>

// After:
<div className="pb-4">
  <Badge ...>WISE AI ENGINE</Badge>
</div>
```

### 2. Add Optional hideCloseButton Prop (For Flexibility)

**File:** `src/components/ui/sheet.tsx`

Add an optional prop to hide the built-in close button when needed:

```tsx
interface SheetContentProps ... {
  hideCloseButton?: boolean;
}

const SheetContent = React.forwardRef<...>(
  ({ side = "right", className, children, hideCloseButton = false, ...props }, ref) => (
    // ...existing code...
    {!hideCloseButton && (
      <SheetPrimitive.Close className="absolute right-4 top-4 ...">
        <X className="h-5 w-5" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    )}
  )
);
```

### 3. Add Optional hideCloseButton Prop to Dialog (Consistency)

**File:** `src/components/ui/dialog.tsx`

Same pattern for dialogs:

```tsx
interface DialogContentProps ... {
  hideCloseButton?: boolean;
}
```

---

## Verification

After implementation, these sheets should have exactly ONE close button:
- Import Upload Sheet
- All other sheets using SheetContent
- All dialogs using DialogContent

---

## Summary

| Task | Priority | Effort |
|------|----------|--------|
| Remove custom close button from ImportUploadSheet | High | 2 min |
| Add `hideCloseButton` prop to SheetContent | Medium | 3 min |
| Add `hideCloseButton` prop to DialogContent | Low | 3 min |

Total estimated time: ~10 minutes

