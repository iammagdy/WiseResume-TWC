

## Fix Scrolling Difficulties Across All Screens

### Root Cause

The scrolling problem stems from a **nested overflow architecture** in the app. The `AppShell.tsx` wrapper applies `overflow-hidden` on the `<main>` element, which means **every page must manage its own scrolling internally**. However, several pages split their content between fixed elements (headers, stats, search bars) and a small scrollable area, leaving users with only a tiny region to scroll -- especially on smaller screens.

### Affected Screens

**1. Dashboard Page (`DashboardPage.tsx`)**
- The header, DailyTipCard, DashboardStats, and search bar are all **outside** the scrollable `PullToRefresh` container
- On a typical mobile screen, these fixed elements consume 40-50% of the viewport, leaving a small scrollable window for the actual resume list
- **Fix**: Wrap the entire page content (except the sticky header) inside the `PullToRefresh` scroll container so everything scrolls together

**2. Applications Page (`ApplicationsPage.tsx`)**
- Has `overflow-hidden` on its root div (line 89), and the tabs section sits outside the `PullToRefresh` scroll area
- **Fix**: Move tabs inside the scroll container and remove redundant `overflow-hidden`

**3. AppShell (`AppShell.tsx`)**
- The `overflow-hidden` on `<main>` is correct for preventing body scroll, but the `motion.div` wrapper should allow overflow so pages can choose their scroll strategy
- **Fix**: No change needed here -- pages should manage their own scrolling, which is the existing pattern. The issue is in individual pages.

**4. Editor Page (`EditorPage.tsx`)**
- Already well-structured with `overflow-y-auto` on the editor content area
- No changes needed

**5. Settings Page (`SettingsPage.tsx`)**
- Already well-structured with a `scrollRef` div using `overflow-y-auto`
- No changes needed

### Technical Changes

#### `src/pages/DashboardPage.tsx`
- Restructure so that **only the header** remains outside the scroll area
- Move DailyTipCard, DashboardStats, QuickActionChips, search bar, and resume list **all inside** a single `PullToRefresh` scroll container
- The `PullToRefresh` becomes the flex-1 scrollable area right after the header
- Content inside uses regular flow (no nested `overflow-y-auto` div)
- Keep `pb-safe` on the inner content for bottom safe area

#### `src/pages/ApplicationsPage.tsx`
- Remove `overflow-hidden` from root div
- Move the tab buttons inside the `PullToRefresh` container so they scroll with content, or make them sticky within the scroll area
- This gives the full viewport area (minus header and bottom nav) for scrolling

#### `src/components/ui/pull-to-refresh.tsx`
- The inner scroll container currently applies `style={{ y }}` which transforms the entire container -- this is fine
- No changes needed here

### What This Achieves
- The entire page content scrolls as one unit on Dashboard and Applications
- Headers remain fixed/sticky at the top
- Users get the full viewport height (minus header and bottom nav) as their scroll area instead of a small constrained box
- Pull-to-refresh continues to work from the top of the scroll area

