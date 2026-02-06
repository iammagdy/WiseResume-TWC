
## What’s causing the “Edit Profile” sheet not to scroll

Your `EditProfileSheet` is correctly set up as a flex column with a scrollable middle section:

- `SheetContent`: `h-[85vh] flex flex-col`
- Middle content: `flex-1 overflow-y-auto`

However, the shared `SheetContent` component (`src/components/ui/sheet.tsx`) wraps *all* children in an extra `<div>`:

```tsx
<div className={side === "bottom" ? "pt-4" : ""}>
  {children}
</div>
```

That wrapper is **not** a flex container and has no defined height. So your `flex-1` scroll area inside `EditProfileSheet` never gets a real constrained height to scroll within. On mobile, this commonly results in “looks like it should scroll, but doesn’t”.

This is consistent with your screenshot: the bottom-sheet opens, content gets clipped, and swipe doesn’t scroll.

---

## Implementation plan (safe + reusable fix)

### 1) Fix the bottom-sheet internal layout in the shared Sheet component
**File:** `src/components/ui/sheet.tsx`

Goal: when `side === "bottom"`, make the internal wrapper participate in layout so children can use flex sizing and scrolling.

Changes:
- Add `flex flex-col` to the `SheetPrimitive.Content` when `side === "bottom"` (or always, but scoped to bottom is safest).
- Change the children wrapper div to:
  - remain `pt-4` (to keep spacing under the drag indicator)
  - and also become a **flex column with height**
  - and allow its children to shrink (`min-h-0`) so inner scroll containers can work

Concrete approach:
- Update line ~58 to conditionally add: `flex flex-col`
- Update the wrapper at line ~63 to something like:
  - `pt-4 flex flex-col h-full min-h-0`
- Optionally set wrapper `flex-1` instead of `h-full` depending on which behaves best with Radix’s content sizing; we’ll choose the one that matches your `h-[85vh]` usage in `EditProfileSheet`.

Why this is the correct fix:
- It fixes scrolling for this sheet and any other bottom sheets that use the same “header + scroll content + footer” pattern.
- It avoids adding hacky heights in every sheet consumer.

### 2) Ensure the scroll container in EditProfileSheet can actually shrink
**File:** `src/components/settings/EditProfileSheet.tsx`

Even after the shared sheet fix, flex scrolling is most reliable when the scrollable container includes `min-h-0`.

Change:
- Update the scroll area container from:
  - `className="flex-1 overflow-y-auto px-6"`
- to:
  - `className="flex-1 min-h-0 overflow-y-auto px-6"`

Why:
- In a flex column, `min-h-0` is often required so the flex item is allowed to be smaller than its content and thus becomes scrollable.

### 3) Verify footer stays fixed and scroll doesn’t “steal” it
**File:** `src/components/settings/EditProfileSheet.tsx`

You already have:
- Footer: `shrink-0` and `pb-safe`
This is good. After steps (1) and (2), the middle section should scroll and the footer should stay visible.

### 4) Quick QA checklist (mobile-focused)
After implementation, we’ll test:
- Open Settings → Edit Profile
- Scroll down past “Import from LinkedIn” to Professional Details
- Confirm:
  - content scrolls smoothly
  - the Save/Cancel footer stays fixed
  - drag indicator remains visible
  - close (X) still works
- Test on at least:
  - mobile viewport (iPhone-like)
  - desktop viewport (just to ensure no regressions)

---

## Files that will be changed
1. `src/components/ui/sheet.tsx`
   - Fix bottom-sheet wrapper so flex layout + scrolling works inside bottom sheets.
2. `src/components/settings/EditProfileSheet.tsx`
   - Add `min-h-0` to the scroll container to ensure it can scroll within a flex column.

---

## Risks / edge cases and how we’ll handle them
- **Other sheets**: We’ll scope changes to `side === "bottom"` so right/left sheets keep existing behavior.
- **Padding/spacing changes**: We’ll preserve the existing `pt-4` behavior so the drag indicator doesn’t overlap the header.
- **iOS scrolling quirks**: If needed after this, we can add `overscroll-contain` (Tailwind) to the scroll container, but we’ll only do that if there’s still bounce/scroll lock issues.

---

## Expected result
The Edit Profile bottom sheet becomes properly scrollable, with:
- header fixed
- content scrollable
- footer fixed with Save button always accessible
