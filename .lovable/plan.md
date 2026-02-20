

# 3 UX Improvements

## IMPROVEMENT 1: Add Mobile Header with Brand Logo

**Current state**: On mobile, the BottomTabBar handles navigation perfectly (already implemented with `lg:hidden`). The DesktopNav shows only on `lg+` screens (already correct with `hidden lg:flex`). However, there is NO mobile header showing the app brand name — the page content starts immediately at the top.

**Change**: Add a slim mobile-only header bar in `AppShell.tsx` that shows "WiseResume" brand text, visible only below `lg` breakpoint.

### File: `src/components/layout/AppShell.tsx`
- Add a mobile header div before `<main>` (only when `showBottomNav` is true):
  - Class: `lg:hidden` (hidden on desktop where DesktopNav already shows brand)
  - Contains: "WiseResume" brand text in top-left, styled with `text-sm font-bold text-primary`
  - Height: compact (h-10), glass surface with bottom border, respects `pt-safe`
  - No nav links — just the brand mark

No other navigation changes needed — the bottom tab bar and desktop nav already work correctly.

---

## IMPROVEMENT 2: Restyle "Unpublish Portfolio" Button

**Current state** (line 604-610 of `PortfolioEditorPage.tsx`):
```tsx
<Button variant="destructive" className="w-full h-11 ...">
  Unpublish Portfolio
</Button>
```
This renders as a solid red button identical in weight to "Save Portfolio".

**Change**: Switch from `variant="destructive"` to `variant="outline"` and add destructive styling via classes.

### File: `src/pages/PortfolioEditorPage.tsx` (lines 604-610)
- Change the Button to:
  - `variant="outline"`
  - Add classes: `border-destructive text-destructive hover:bg-destructive/10`
  - Add `AlertTriangle` icon (from lucide-react, already available) before the label
- This makes it visually lighter (transparent bg, red border/text) while keeping the same onClick handler

---

## IMPROVEMENT 3: Make Editor Resume Name Tappable for Switching

**Current state** (lines 908-920 of `EditorPage.tsx`):
The resume title is displayed and tapping it opens a `window.prompt()` to rename. There's no way to switch resumes.

**Change**: Make the resume name tap navigate to `/dashboard` so the user can pick a different resume, and add a small chevron-down indicator to signal interactivity. Move the rename action to a long-press or remove it (the rename is a niche feature; switching resumes is more useful).

### File: `src/pages/EditorPage.tsx` (lines 908-920)
- Change the `onClick` handler from `window.prompt` rename to `navigate('/dashboard')`
- Add a `ChevronDown` icon (already imported) after the title text as a visual affordance
- Keep the `truncate` class and add `max-w-[45vw]` to ensure proper truncation on small screens
- The title tooltip (`title` attribute) still shows the full name on hover/long-press

---

## Summary

| File | Change |
|------|--------|
| `src/components/layout/AppShell.tsx` | Add mobile-only brand header (3-4 lines) |
| `src/pages/PortfolioEditorPage.tsx` | Restyle Unpublish button (1 line change) |
| `src/pages/EditorPage.tsx` | Resume name tap navigates to dashboard + chevron indicator (2 line changes) |

No backend, routing, database, or dependency changes.

