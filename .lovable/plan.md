

## Safe Area and Keyboard Avoidance Hardening

### Current State

**Safe Areas (Issue 5):**
- The app already has `viewport-fit=cover` in `index.html` and `apple-mobile-web-app-status-bar-style` set to `black-translucent`
- Tailwind config includes `safe-top`, `safe-bottom` spacing values mapped to `env(safe-area-inset-*)`
- Custom `pt-safe` and `pb-safe` utilities exist in `index.css` using `max(16px, env(safe-area-inset-*))` -- these work correctly
- `BottomTabBar` uses `pb-safe` -- this is correct
- `AppShell` applies `pb-20` for bottom nav clearance but does NOT apply `pt-safe` to the top-level container (headers handle it individually)
- `MobileLayout` header uses `pt-safe` -- correct
- `EditorPage` header uses `pt-safe` -- correct
- Most page headers (Upload, Preview) use `pt-safe` -- correct

**The actual gaps:**
1. **FABs overlap with BottomTabBar on notch devices**: The `ProofreadButton` is at `bottom-24` (96px), but `BottomTabBar` is 64px + safe-area-inset-bottom (which can be 34px on iPhone = 98px total). On iPhone with home indicator, the FAB sits ON the tab bar.
2. **AIFloatingButton** (dashboard FAB) is at `bottom-28` (112px) -- this is fine but inconsistent with ProofreadButton.
3. **Some pages missing `pt-safe`**: The `DashboardPage`, `ApplicationsPage`, and other pages that render inside `AppShell` rely on their own headers for `pt-safe`, but some pages use inline headers without it.

**Keyboard Avoidance (Issue 6):**
- `useKeyboardAwareScroll` hook already exists and works well: tracks `visualViewport`, sets `--keyboard-height` CSS variable, toggles `.keyboard-open` class, auto-scrolls focused inputs
- `useSheetKeyboard` hook scrolls focused inputs inside sheets into view
- `KeyboardToolbar` floats above keyboard using `--keyboard-height`
- `capacitor.config.ts` has `Keyboard.resize: 'body'` -- this is the correct setting for Capacitor Android
- CSS already hides `BottomTabBar` when keyboard is open (`.keyboard-open .bottom-tab-bar { display: none }`)
- The editor scroll container does NOT account for keyboard height -- when keyboard opens, content below the fold is still clipped by the now-hidden tab bar area

**The actual gaps:**
1. **Editor scroll container needs keyboard-aware padding**: When keyboard opens on Android, the tab bar hides but the scroll container still has `pb-20` (for tab bar) with no additional padding for keyboard. The `visualViewport` resize helps but the scroll container's bottom padding should dynamically adjust.
2. **Sheet inputs on older Android**: `useSheetKeyboard` uses `scrollIntoView` but some Android WebViews don't resize the sheet's scroll container when `Keyboard.resize: 'body'` is set. The sheet content needs explicit bottom padding when keyboard is open.

### Plan

#### 1. Fix FAB positioning to account for safe areas

**Modified: `src/components/editor/ProofreadButton.tsx`**
- Change `bottom-24` to use a CSS calc that accounts for safe area: `bottom-[calc(5rem+env(safe-area-inset-bottom))]` on mobile, `bottom-36` on desktop (already correct)
- This ensures the FAB always sits above the BottomTabBar + safe area

**Modified: `src/components/editor/AIFloatingButton.tsx`**
- Change `bottom-28` to `bottom-[calc(6rem+env(safe-area-inset-bottom))]` to consistently clear the tab bar + safe area

#### 2. Add keyboard-aware bottom padding to editor scroll container

**Modified: `src/index.css`**
- Add a new utility class `.keyboard-aware-scroll` that transitions `padding-bottom` from the normal value to `var(--keyboard-height)` when `.keyboard-open` is active on the document root

```css
.keyboard-open .editor-scroll-container {
  padding-bottom: calc(var(--keyboard-height, 0px) + 1rem) !important;
}
```

This ensures editor content gets pushed up when the keyboard opens, preventing inputs at the bottom from being hidden.

#### 3. Add keyboard-aware padding for Sheet content

**Modified: `src/index.css`**
- Add a CSS rule for sheet/dialog scroll containers when keyboard is open:

```css
.keyboard-open [data-vaul-drawer] .overflow-y-auto,
.keyboard-open [role="dialog"] .overflow-y-auto {
  padding-bottom: calc(var(--keyboard-height, 0px) + 1rem);
}
```

This ensures sheet content scrolls properly on Android when the keyboard is open without requiring changes to every individual sheet component.

#### 4. Ensure AppShell pages without explicit headers still get top safe area

**Modified: `src/components/layout/AppShell.tsx`**
- The `main` element already has no top safe area because individual page headers handle it. This is the correct pattern and should remain unchanged. No modification needed here.

### Technical Details

**Why calc-based FAB positioning:**
The `pb-safe` utility uses `max(16px, env(safe-area-inset-bottom))`. On iPhone 15, `env(safe-area-inset-bottom)` is 34px. The BottomTabBar is 64px + 34px = 98px tall. A FAB at `bottom-24` (96px) would overlap by 2px. Using `calc(5rem + env(safe-area-inset-bottom))` = 80px + 34px = 114px, providing comfortable clearance.

**Why CSS-only keyboard solution for editor:**
The `useKeyboardAwareScroll` hook already sets `--keyboard-height` and `.keyboard-open` on the document root. Using CSS to react to these is more performant than adding React state to every scroll container, and avoids re-renders during keyboard animation.

**Capacitor Keyboard config validation:**
`Keyboard.resize: 'body'` is already set, which is the recommended mode. The alternative `'native'` mode causes layout issues with fixed-position elements. No changes needed to `capacitor.config.ts`.

### Files Changed
- `src/components/editor/ProofreadButton.tsx` -- safe-area-aware bottom positioning
- `src/components/editor/AIFloatingButton.tsx` -- safe-area-aware bottom positioning
- `src/index.css` -- keyboard-aware padding for editor scroll container and sheet content

