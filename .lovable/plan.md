

## Mobile-First Optimization Audit and Plan

### Current State Assessment

The app already has solid mobile foundations:
- `xs: 375px` breakpoint defined in Tailwind config
- Safe area padding utilities (`pb-safe`, `pt-safe`)
- 44px minimum touch targets via `.touch-target` utility
- `BottomTabBar` with 5-tab layout and 48px min heights
- Fluid typography system (`text-fluid-*` classes)
- `100dvh` usage for proper mobile viewport
- Haptic feedback integration
- Keyboard-aware scrolling hooks
- Pull-to-refresh on dashboard
- Glass morphism design system

However, there are gaps that prevent a true mobile-first experience:

---

### Issues Found and Fixes

#### 1. Landing Page (Index.tsx) -- Not Mobile-Optimized for Small Screens

**Problem:** Hero section uses fixed `px-6` padding and `text-[32px]` fixed font size. The comparison table and feature grid don't account for 320px screens (some Android devices). Template preview carousel items are fixed at `w-28`, which wastes space on smaller screens.

**Fix:**
- Use `px-4 sm:px-6` instead of `px-6` throughout
- Replace `text-[32px]` with `text-fluid-2xl` for the hero heading
- Make feature grid `grid-cols-1 xs:grid-cols-2` so cards stack on very small screens
- Template carousel items: `w-24 xs:w-28`

#### 2. Editor Header Overflow on Small Screens

**Problem:** The editor header (EditorPage.tsx line ~636) packs the back button, title, undo/redo buttons, version history, Design button, Preview button, and Wise AI button into a single row. On 320-375px screens, this overflows horizontally.

**Fix:**
- Hide undo/redo text labels on mobile; show icons only with smaller padding
- Collapse Design + Preview into a single overflow menu on screens below `xs` (375px)
- Reduce Wise AI button from `min-w-[54px]` to `min-w-[48px]` on mobile

#### 3. Dashboard Stats Section Spacing

**Problem:** `DashboardStats` component and the quick-action grid use `gap-3` and `px-6` which creates cramped layouts on 320px devices.

**Fix:**
- Change empty-state grid from `grid-cols-2 gap-3 px-6` to `grid-cols-2 gap-2 px-4 xs:gap-3 xs:px-6`
- Ensure action cards have `min-h-[80px]` for comfortable tap targets

#### 4. ApplicationsPage -- Eager Imports and Missing Touch Optimizations

**Problem:** `ApplicationsPage` eagerly imports 10+ components including `JobSearchSheet`, `SaveJobSheet`, `FollowUpEmailSheet`. Job action buttons use `min-h-[32px]` which is below the 44px minimum touch target.

**Fix:**
- Lazy-load sheet components (JobSearchSheet, SaveJobSheet, FollowUpEmailSheet, ApplicationDetailSheet)
- Increase action button min-height to `min-h-[44px]`
- Add `active:scale-95` to all interactive cards

#### 5. ProfilePage Missing Safe Area + Header Not Glass

**Problem:** Profile header uses `h-14` fixed height with no `pt-safe` for notch devices. The page also doesn't use `glass-header` for the sticky header.

**Fix:**
- Add `pt-safe` to profile header
- Apply `glass-header` class for consistency
- Add `pb-20` for bottom nav clearance (currently not applied since it relies on AppShell)

#### 6. TemplatesPage Filter Chips Not Touch-Friendly

**Problem:** Filter chip buttons use padding-only sizing (`px-4 py-1.5`) resulting in touch targets around 32px tall -- below the 44px minimum.

**Fix:**
- Change to `px-4 py-2.5 min-h-[44px]` for proper touch targets
- Add `active:scale-95` for haptic feel

#### 7. InterviewPage -- No Skeleton Fallback

**Problem:** Interview page shows no skeleton/loading state while the complex voice interview hook initializes. Users see a brief flash before content appears.

**Fix:**
- Add a dedicated `InterviewSkeleton` to `PageSkeletons.tsx` (already referenced in App.tsx but may be generic)
- Show the skeleton while `hasValidResume` is being checked

#### 8. AuthPage -- MobileLayout Header Not Used Consistently

**Problem:** AuthPage uses `MobileLayout` but doesn't leverage `showHeader` prop. The form inputs don't enforce `min-h-[48px]` per project guidelines.

**Fix:**
- Ensure all auth form inputs have `min-h-[48px]` and `text-base` (16px to prevent iOS zoom)
- These should already be handled by the InputFormField component but need verification

#### 9. AppShell -- Bottom Nav Padding Inconsistency

**Problem:** `AppShell` applies `pb-20` when `showBottomNav` is true, but the `TAB_ROUTES` array includes `/auth` which means unauthenticated routes also get bottom padding.

**Fix:**
- Remove `/auth` from `TAB_ROUTES` since the auth page shouldn't show the bottom navigation bar (users aren't signed in yet)

#### 10. Settings Page -- Long Scroll Without Section Jump

**Problem:** The settings page is very long (1100+ lines) with 7 sections. On mobile, users have to scroll extensively. The sticky section indicator exists but there's no quick-jump mechanism.

**Fix:**
- Add a collapsible "jump to section" pill bar at the top that horizontally scrolls through section chips
- Each chip scrolls the user to that section on tap
- Mark active section with primary color

#### 11. Missing `active:scale-95` on Several Interactive Elements

**Problem:** Project guidelines require every button to include `active:scale-95`, but several components miss this:
- Profile page "Edit Profile" button
- Templates page filter chips
- Dashboard dropdown menu trigger
- Several sheet trigger buttons across editor

**Fix:**
- Audit and add `active:scale-95 touch-manipulation` to all buttons and interactive elements across the modified files

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Index.tsx` | Mobile-first padding, fluid typography, responsive grid |
| `src/pages/EditorPage.tsx` | Compact header icons on mobile, reduce overflow |
| `src/pages/DashboardPage.tsx` | Responsive grid spacing for empty state |
| `src/pages/ApplicationsPage.tsx` | Lazy-load sheets, increase touch targets |
| `src/pages/ProfilePage.tsx` | Safe area, glass header, touch targets |
| `src/pages/TemplatesPage.tsx` | Touch-friendly filter chips |
| `src/pages/SettingsPage.tsx` | Section jump bar |
| `src/components/layout/AppShell.tsx` | Remove `/auth` from TAB_ROUTES |

### Priority Order

1. AppShell fix (auth route showing bottom nav) -- quick fix, high impact
2. Landing page mobile optimization -- first impression
3. Editor header overflow -- most-used screen
4. Dashboard spacing -- home screen
5. Applications/Templates/Profile touch target fixes
6. Settings section jump bar -- nice-to-have UX improvement

