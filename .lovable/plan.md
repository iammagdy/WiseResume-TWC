

# Mobile App Improvements and Responsiveness Enhancements

## Current State

Your app already has a strong mobile foundation: `100dvh` layouts, 44px touch targets, safe-area handling, pull-to-refresh, haptic feedback, skeleton loading screens, Capacitor integration, keyboard-aware scrolling, and bottom tab navigation. The improvements below address the remaining gaps.

---

## Improvement 1: Haptic Feedback on Form Validation Errors

Currently, form validation errors show visual feedback but don't trigger haptic vibration. On a native mobile app, a subtle vibration on error makes the experience feel polished.

**What changes:**
- Add `haptics.notification('error')` calls in `AuthPage.tsx` login/signup error handlers
- Add haptic feedback on editor section validation failures
- Add haptic feedback when AI operations fail (tailor, score, etc.)

---

## Improvement 2: Swipe-to-Go-Back Gesture on Key Pages

Pages like Resume Detail, Cover Letter Edit, and Interview currently rely on a back button. Adding a swipe-right gesture to navigate back would feel more native.

**What changes:**
- Create a `SwipeBackWrapper` component using Framer Motion's `onPan` gesture
- Wrap detail/edit pages that have a back button
- Respect `prefers-reduced-motion` and only trigger above a velocity threshold

---

## Improvement 3: Smart Keyboard Toolbar for Rich Text Fields

The editor already has a `KeyboardToolbar` component, but it could be extended with quick-insert actions (bullet point, em-dash, common phrases) that float above the keyboard on mobile.

**What changes:**
- Extend `KeyboardToolbar.tsx` with context-aware quick-insert buttons (e.g., bullet `"Managed"`, `"Led"`, `"Developed"` for experience sections)
- Show/hide based on which section is active

---

## Improvement 4: Network-Aware Loading States

When on slow mobile connections (3G), the app should show more informative loading states and potentially reduce image quality or defer non-critical requests.

**What changes:**
- Create a `useNetworkQuality` hook that reads `navigator.connection.effectiveType`
- When on `"slow-2g"` or `"2g"`, show a subtle banner: "Slow connection detected"
- Defer background scoring and ATS analysis until connection improves or user explicitly requests it

---

## Improvement 5: Orientation-Aware Resume Preview

The Preview page renders the resume at a fixed scale. On landscape mobile, there is wasted space. The preview should auto-adjust zoom to fill the available width.

**What changes:**
- In `LivePreviewPanel.tsx`, detect orientation changes via `matchMedia('(orientation: landscape)')`
- Auto-select a higher zoom level in landscape to maximize the readable area
- Reset to default zoom on portrait

---

## Improvement 6: Offline Queue Visibility

The app supports offline sync, but there is no user-facing indicator of how many pending changes are queued. Users on flaky mobile connections need reassurance.

**What changes:**
- Add a small badge on the Home tab (or editor header) showing pending sync count from `useOfflineSyncStore`
- When tapped, show a brief summary: "3 changes waiting to sync"

---

## Improvement 7: Reduce Initial Bundle for Mobile First-Load

The main bundle is 670 KB gzipped. For mobile users on slow connections, further code-splitting would improve Time to Interactive.

**What changes:**
- Lazy-load the `PortfolioEditorPage`, `CareerPage`, and `InterviewPage` routes (they are secondary flows)
- Move `qr-code-styling` into a dedicated chunk (only used in portfolio QR sheet)
- Add `react-image-crop` to its own chunk (only used in avatar crop)

---

## Improvement 8: Double-Tap to Quick Preview in Dashboard

Currently, tapping a resume card navigates to the detail page. A quick double-tap gesture could open the live preview directly, saving one navigation step.

**What changes:**
- Add a `useDoubleTap` hook
- On double-tap of a resume card, load the resume and navigate directly to `/preview`
- Single tap remains as-is (resume detail)

---

## Technical Summary

| # | Improvement | Files | Complexity |
|---|------------|-------|------------|
| 1 | Haptic validation feedback | AuthPage, EditorPage, TailorSheet | Low |
| 2 | Swipe-to-go-back gesture | New component + 5-6 page wrappers | Medium |
| 3 | Smart keyboard toolbar | KeyboardToolbar.tsx | Medium |
| 4 | Network-aware loading | New hook + AppShell integration | Low |
| 5 | Orientation-aware preview | LivePreviewPanel.tsx | Low |
| 6 | Offline queue visibility | BottomTabBar, editor header | Low |
| 7 | Bundle splitting | vite.config.ts, route definitions | Low |
| 8 | Double-tap quick preview | New hook + DashboardPage | Medium |

No new dependencies are required for any of these improvements.

