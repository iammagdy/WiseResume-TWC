# WiseResume — Mobile UX Priorities
*Last updated: 2026-05-16 | App version: 4.6.0*

## Layout Constraints

### Bottom Tab Bar
- Height: **4.5rem** (72px)
- Defined in `src/components/layout/BottomTabBar.tsx`
- Hidden on desktop (`lg:hidden`)
- Contains 5 primary tabs: Home, Resumes, Search, Activity, More
- The "More" sheet holds secondary navigation items

### Floating Action Button (FAB)
- Offset from bottom: `bottom-[calc(5.5rem+env(safe-area-inset-bottom))]`
- This positions FAB above the tab bar with safe area clearance
- Controlled by `src/components/layout/appShellLayout.ts`
- `FIXED_FOOTER_ROUTE_PREFIXES` array controls which route prefixes suppress the FAB

### Main Content Padding with FAB
- When FAB is visible: `pb-[8.5rem] lg:pb-0`
- When FAB is hidden: `pb-24 lg:pb-0`
- This ensures the last list item is never covered by the FAB
- If a page shows the FAB but lacks this padding, add its route prefix to `FIXED_FOOTER_ROUTE_PREFIXES`

### Safe Area Insets
- Always use `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` for notch/home-indicator clearance
- `pt-safe` utility class handles top safe area on sticky headers
- `pb-safe` pattern used in bottom bars

## Mobile Breakpoint

- **Primary mobile breakpoint**: `< 900px` (default `useIsMobile()` threshold)
- **Editor mobile breakpoint**: `< 1024px` (`EDITOR_MOBILE_BREAKPOINT`)
- **Tailwind lg**: `>= 1024px` — used for desktop layout switches (`lg:hidden`, `lg:block`, `lg:flex`)

The `useIsMobile()` hook (`src/hooks/use-mobile.tsx`) uses `matchMedia` for reactive updates:
```ts
export function useIsMobile(breakpoint: number = 900) { ... }
```

## Touch Target Minimums

- Interactive elements must be at least **44px × 44px** for reliable touch activation
- Icon-only buttons: use `size="icon"` which gives `w-9 h-9` (36px) — add `p-2` wrapper if needed to hit 44px
- List items and card rows: minimum `min-h-[44px]`
- Bottom tab items: already sized correctly by BottomTabBar layout

## Swipe Gesture Conventions

`ResumeListCard` (`src/components/dashboard/ResumeListCard.tsx`) implements horizontal swipe gestures:
- **Swipe left**: reveals destructive actions (delete)
- **Swipe right**: reveals secondary actions (duplicate, rename)
- Uses `framer-motion` `PanInfo` for drag detection
- Threshold: typically `> 80px` drag to reveal action panel

When adding new list cards, follow this pattern for swipe support.

## More Menu (Bottom Tab Bar)

- Grid layout: `grid-cols-3 sm:grid-cols-4` (as of 2026-05-16 audit fix — was grid-cols-4)
- Items grouped with section labels: **Discover** / **Tools** / **Account**
- Max items: keep total ≤ 12 to avoid excessive scroll in the sheet
- All `matchPath` values are fixed — never change them without updating routing

## Common Mobile Pitfalls (from 2026-05-16 Audit)

### 1. Content Hidden Behind FAB
**Symptom:** Last item in a scrollable list is obscured by the FAB on mobile.
**Fix:** Ensure route is in `FIXED_FOOTER_ROUTE_PREFIXES` in `appShellLayout.ts`, OR main container uses `pb-[8.5rem]` when FAB is active.

### 2. Grid Density on Mobile
**Symptom:** `grid-cols-4` with icon+label items is too cramped at 375px width.
**Fix:** Use responsive `grid-cols-3 sm:grid-cols-4`. Test at 375px in Chrome DevTools.

### 3. Breadcrumb Overflow
**Symptom:** Long resume names (60+ chars) cause breadcrumb to overflow container.
**Fix:** Apply `truncate max-w-[180px] sm:max-w-none` to the dynamic breadcrumb segment.

### 4. Hero Above Fold for Returning Users
**Symptom:** Dashboard shows a large welcome hero even for users with existing resumes, pushing the resume list below the fold at 390px.
**Fix:** Conditionally show compact greeting when `resumes.length > 0`. See DashboardPage Phase 2.1 implementation.

### 5. Keyboard Obscuring Inputs
**Symptom:** On iOS, the software keyboard pushes the viewport up but form inputs can still be obscured.
**Pattern:** Use `scroll-into-view` behavior on focus for textareas at page bottom. TailorPage instructions textarea is a candidate.

## Testing Checklist for Mobile Changes

Test at these viewports before committing:
- [ ] 375px × 812px (iPhone SE / older)
- [ ] 390px × 844px (iPhone 14, primary target)
- [ ] 414px × 896px (iPhone Plus)
- [ ] 360px × 800px (Android mid-range)

Always test in Chrome DevTools device emulation with "Mobile" throttling to catch jank.
