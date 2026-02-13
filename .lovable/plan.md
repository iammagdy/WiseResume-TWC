

## Make Guest Welcome Card Dismissible (First-Visit Only)

### Problem
The "Welcome, Guest" CTA card in Settings is shown every time for unauthenticated users. Returning guests who already know they're not signed in don't need this large card taking up space on every visit.

### Solution
Convert the card to a **first-visit-only** experience with a dismiss option. After dismissal, show a compact single-line "Sign in" row instead, so the CTA is still accessible but not intrusive.

- On first visit: full card with benefits list and "Get Started Free" button
- After dismiss: compact `SettingsRow` navigation row ("Sign in to unlock all features")
- Dismissal persisted in `localStorage` (`wr-settings-guest-cta-dismissed`) so it survives sessions

### Changes to `src/pages/SettingsPage.tsx`

1. Add a `guestCtaDismissed` state initialized from localStorage
2. Add a dismiss (X) button to the top-right corner of the existing guest CTA card
3. When dismissed, store `'1'` in localStorage under `wr-settings-guest-cta-dismissed`
4. When dismissed, render a compact replacement row:
   ```
   [AppIcon] Sign in to unlock all features  [ChevronRight]
   ```
   This row navigates to `/auth` on tap.
5. Wrap both states in `AnimatePresence` for a smooth transition.

### Technical Details

- **Storage key**: `wr-settings-guest-cta-dismissed` in `localStorage` (persists across sessions, unlike the editor banner which uses `sessionStorage`)
- **No new files** -- all changes are in `SettingsPage.tsx`
- The compact row reuses the existing `SettingsRow` component with `type="navigation"`
- A small X button (28x28px, matching the NextStepBanner dismiss pattern) is absolutely positioned in the card's top-right corner
- The full card gets `position: relative` to contain the dismiss button

