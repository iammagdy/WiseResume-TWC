

## Mobile Responsiveness Fix: Dashboard Layout and Navigation Bar

### Overview

Optimize resume cards, stats header, search bar, FAB, and bottom navigation for mobile touch interaction. Desktop layouts remain completely unchanged.

### Changes

**File 1: `src/components/dashboard/ResumeListCard.tsx`**

Improve card touch targets and readability on mobile:

- Card content padding: Change `p-4` to `p-4 sm:p-4` (keep same) but add `min-h-[120px]` to ensure comfortable card height
- Resume title: Change from default font size to `text-base sm:text-sm` (18px on mobile, 14px on desktop)
- Metadata text (target job, timestamp): Change from `text-sm` to `text-sm` (already 14px) -- keep as-is
- "No target job set" text: Add `break-words` class to ensure wrapping
- Three-dot menu button: Change from `h-10 w-10` to `min-w-[44px] min-h-[44px] h-10 w-10` to guarantee 44px touch target
- Progress bar: Already `flex-1` (full-width within card) -- no change needed
- Card spacing: The parent container already uses `space-y-4` which gives ~16px between cards -- adequate

**File 2: `src/components/dashboard/DashboardStats.tsx`**

Optimize the stats hero card for mobile:

- Greeting text: Change from `text-lg` to `text-xl sm:text-lg` for larger mobile display (~20px)
- Avatar size is handled elsewhere (profile dropdown) -- no change here
- Stats grid: The `grid grid-cols-2` already handles 2-column layout on all screens -- keep as-is
- Score Ring: Already 72px -- keep as-is

**File 3: `src/pages/DashboardPage.tsx`**

Optimize search bar and resume list container:

- Search input: Change from `h-11` to `h-12 sm:h-11 text-base` to ensure 48px height and 16px font on mobile
- Resume list container: The existing `space-y-4 md:grid md:grid-cols-2` already forces single-column on mobile and 2-column on tablet -- keep as-is
- Add `px-4` margins are already 16px -- adequate

**File 4: `src/components/dashboard/FloatingCreateButton.tsx`**

Increase FAB size on mobile:

- Change from `h-14 px-5` to `h-16 sm:h-14 px-6 sm:px-5` for a larger (64px) mobile touch target
- Change `bottom-20` to `bottom-24 sm:bottom-20` to add more clearance from the bottom navigation bar
- Icon size: Change from `w-5 h-5` to `w-6 h-6 sm:w-5 sm:h-5` for better visibility on larger FAB

**File 5: `src/components/layout/BottomTabBar.tsx`**

Refine bottom navigation for mobile:

- Tab bar height: Already `h-16` (64px) -- matches requirement, no change
- Icon size: Change from `w-5 h-5` to `w-6 h-6 sm:w-5 sm:h-5` (24px on mobile)
- Label font: Change from `text-[10px]` to `text-[11px]` for better readability
- Add `active:scale-95` tap animation -- already present, keep as-is
- Safe area: Already uses `pb-safe` -- no change needed
- Active pill: Already has primary color highlight with scale animation -- adequate

### What Does NOT Change

- Resume CRUD operations (open, edit, duplicate, delete, rename)
- ATS scoring, health scores, version history
- Navigation routing and deep linking
- Swipe gestures on resume cards
- Desktop layouts (768px+) -- identical behavior and appearance
- Onboarding flow, profile dropdown, daily tip
- Pull-to-refresh functionality
- All dialog/sheet modals
- Search filtering and deferred search logic
- Tab persistence and navigation guards

### Technical Notes

- All changes use Tailwind responsive prefixes (`sm:`, `md:`) only
- No logic changes or new state variables
- Touch targets maintain 44px minimum per project guidelines
- Search input uses `text-base` (16px) to prevent iOS auto-zoom on focus
- FAB positioned at `bottom-24` to clear the 64px nav bar plus safe area
- Bottom tab icons increased to 24px (w-6 h-6) for WCAG touch target compliance

