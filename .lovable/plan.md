

# Improved Portfolio Discoverability + Editor Add Section FAB

## Issue 1: Portfolio Customization -- Already Exists, Improve Discoverability

The portfolio editor page already contains all requested customization controls (accent colors, themes, fonts, layouts, section toggles, and a "Preview" button). The real issue is discoverability -- these controls are buried inside collapsible cards.

### Changes

**Add a "Quick Customize" floating shortcut on the Portfolio page** (`src/pages/PortfolioEditorPage.tsx`):
- A small pill button fixed at the bottom of the portfolio scroll area (above the safe area): `[Palette icon] Customize`
- Tapping it auto-scrolls to and expands the "Visual Theme" and "Customization" collapsible cards
- This provides a one-tap shortcut to the existing controls without duplicating any UI
- Includes a "View Live Portfolio" prominent button that opens the public URL -- this already exists as the "Preview" button in the hero card, but we add a second instance inside the Customization card so it's visible after making changes
- Entrance animation: fade-in-up with Framer Motion, respects reduced motion

### Files Changed
| File | Change |
|---|---|
| `src/pages/PortfolioEditorPage.tsx` | Add floating "Customize" pill that scrolls to/expands the theme and customization sections; add "View Live" button inside the Customization card |

---

## Issue 2: Add Section FAB in Editor

### Current State
The "Add Section" grid is only reachable by navigating to the "more" tab in the stepper. There is no persistent visual entry point.

### Plan

**Add a Floating Action Button (FAB)** to the Editor page (`src/pages/EditorPage.tsx`):
- Circular button, fixed position: `bottom: calc(24px + env(safe-area-inset-bottom))`, `right: 24px`
- Primary/brand color background with a `Plus` icon (24px, white)
- z-index: below the bottom tab bar but above content
- Only visible on mobile (`md:hidden`) since desktop has the stepper always visible
- Only visible when NOT already on the "more" tab (avoid redundancy)

**Tap behavior**:
- Tapping the FAB opens a bottom Sheet with the existing `AddSectionSheet` component inside it
- The `Plus` icon rotates 45 degrees to become an "X" when the sheet is open
- Selecting a section from the sheet navigates to that section (sets `activeTab` to `'more'` and `moreSubSection` to the selected ID), then closes the sheet

**First-visit pulse**:
- On first app load (tracked via `localStorage` key `wr-add-section-seen`), the FAB pulses with a glow animation
- After the user taps it once, the pulse stops permanently

**Entrance animation**:
- FAB: `scale(0)` to `scale(1)` with spring easing on mount via Framer Motion
- Sheet items: staggered fade-in-up (50ms delay between each), already partially handled by the grid layout

**Reduced motion**:
- FAB appears instantly (no scale animation)
- Sheet items appear without stagger delay

### Files Changed
| File | Change |
|---|---|
| `src/pages/EditorPage.tsx` | Add FAB button (mobile only, hidden on "more" tab), Sheet wrapper for AddSectionSheet, pulse animation state, icon rotation |
| `src/components/editor/AddSectionSheet.tsx` | Add staggered entrance animation (Framer Motion) to each section option button |

---

## Technical Details

### FAB Positioning (avoiding conflicts)
The bottom tab bar is the base layer. The FAB should be at `bottom: calc(5rem + env(safe-area-inset-bottom))` (above the tab bar's 80px height) to avoid overlap. This matches the existing floating element staggering pattern used in the app.

### No Data Changes
- No database migrations
- No new API calls
- No new routes
- All existing functionality remains untouched

