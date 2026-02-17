

## Fix: Overlapping Floating Buttons on Applications Page

### Problem
The "Save Job" FAB on the Activity page (`bottom-24`, `z-50`) and the global PWA Install banner (`bottom-28`, `z-40`) overlap each other. When the install banner is visible, the FAB is partially hidden behind it, making it unusable.

### Solution
Stagger the vertical positions so all floating elements have clear separation:

| Element | Current Position | New Position |
|---------|-----------------|-------------|
| BottomTabBar | bottom-0 (h-16/20) | No change |
| Save Job FAB | `bottom-24` | `bottom-[7.5rem]` (~120px, clears tab bar + spacing) |
| Install Banner | `bottom-28` | `bottom-[11rem]` (~176px, clears FAB) |

Additionally, ensure consistent z-index layering:
- Install Banner: `z-40` (background layer)
- Save Job FAB: `z-50` (above banner)

### Changes

**File: `src/pages/ApplicationsPage.tsx`**
- Move the Save Job FAB from `bottom-24` to `bottom-[7.5rem]` to provide better clearance above the tab bar
- Keep `z-50` so it stays above the install banner

**File: `src/components/pwa/InstallPrompt.tsx`**
- Increase bottom offset from `bottom-28` to `bottom-[11.5rem]` so it clears both the tab bar and any page-level FABs
- Keep `z-40` (below FABs)

This ensures a clear visual stack: Tab Bar at bottom, then FAB above it, then Install Banner above both -- no overlapping.

