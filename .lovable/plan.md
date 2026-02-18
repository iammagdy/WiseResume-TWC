

## Shake-to-Report, Haptic Audit, Mobile Responsiveness and UX Analysis

### Overview

This plan covers four areas: (1) adding a "shake to report bug" gesture, (2) auditing haptic feedback coverage, (3) mobile responsiveness analysis, and (4) UX/user flow analysis. The app is already in strong shape -- haptics are used in 122 files, `active:scale-95` appears in 84 files, and the landing page renders beautifully at 375px. The main gaps are the missing shake detection and a handful of components lacking haptic feedback.

---

### 1. Shake-to-Report Bug Feature

**What it does:** When the user shakes their device, the existing Bug Report dialog opens automatically with a pre-filled "Shake reported" context message. A strong haptic buzz confirms detection.

**New file: `src/hooks/useShakeDetect.ts`**

A custom hook that:
- Listens to `window.devicemotion` events (accelerometer data)
- Uses a threshold algorithm: if acceleration exceeds ~15 m/s^2 on any axis 3+ times within a 1-second window, it counts as a "shake"
- On iOS 13+, requests `DeviceMotionEvent.requestPermission()` (required by Safari)
- Calls `haptics.heavy()` on detection, then invokes `triggerBugReport()` from the existing `src/lib/bugReport.ts` system
- Includes a 3-second cooldown to prevent duplicate triggers
- Only activates on mobile (checks `'DeviceMotionEvent' in window`)

**File to modify: `src/App.tsx`**

- Import and call `useShakeDetect()` inside the `AppRoutes` component (alongside existing `useBackButton`, `useStatusBar`, etc.)
- The hook will use the existing `triggerBugReport()` which the already-mounted `BugReportDialog` listens to

**File to modify: `src/store/settingsStore.ts`**

- Add `shakeToReportEnabled: boolean` (default `true`) and `setShakeToReportEnabled` action
- Add a toggle in Settings page under the "About and Help" section so users can disable this

**File to modify: `src/pages/SettingsPage.tsx`**

- Add a `SettingsRow` toggle for "Shake to Report Bug" with a `Vibrate` icon, reading/writing `shakeToReportEnabled` from the settings store

---

### 2. Haptic Feedback Audit

**Current state:** Haptics are well-integrated across 122 files using `haptics.light()`, `haptics.medium()`, `haptics.selection()`, etc. The `src/lib/haptics.ts` utility uses the Web Vibration API.

**Gaps found -- components missing haptic feedback:**

| Component | Interaction Missing Haptics | Fix |
|-----------|---------------------------|-----|
| `CreateResumeDialog` | "Create" button press | Add `haptics.medium()` |
| `AddSectionSheet` | Section selection | Add `haptics.light()` |
| `ExportOptionsSheet` | Export format selection | Add `haptics.light()` |
| `ShareSheet` | Copy link / share actions | Add `haptics.success()` |
| `VersionHistorySheet` | Restore version | Add `haptics.medium()` |
| `CustomizeSheet` | Color/font selection | Add `haptics.light()` |
| `GapFillerSheet` | Generate / apply actions | Add `haptics.medium()` |
| `GapExplainerSheet` | Generate action | Add `haptics.medium()` |
| Pull-to-refresh (`PullToRefresh`) | Refresh trigger | Add `haptics.medium()` |

Each fix is a single line addition (`haptics.light()` or `haptics.medium()`) in the click handler.

**Also ensure `active:scale-95` is on all these buttons** for the visual press feedback per project guidelines.

---

### 3. Mobile Responsiveness Analysis

**Current state -- STRONG:** The app already has excellent mobile foundations:
- Uses `100dvh` for viewport height (handles mobile browser chrome)
- `WebkitOverflowScrolling: 'touch'` and `overscrollBehavior: 'contain'` on scroll containers
- Safe area insets (`pt-safe`, `pb-safe`) throughout
- 44px minimum touch targets enforced across most interactive elements
- Bottom tab bar with `pb-safe` and proper `z-50` stacking
- Fluid typography via `clamp()` system
- All sheets/dialogs are mobile-optimized with max-height constraints

**Minor issues found:**

| Issue | Location | Fix |
|-------|----------|-----|
| Search input in Dashboard has no `min-h-[44px]` | `DashboardPage.tsx` search bar | Add `min-h-[44px]` class |
| Resume filter chips could be tight on iPhone SE (375px) | `ResumeFilters.tsx` | Ensure horizontal scroll with `overflow-x-auto` and `flex-nowrap` |
| Some editor section move-up/move-down buttons are 32px (below 44px standard) | `HobbiesSection`, `LanguagesSection`, `AwardsSection` | Increase to `min-w-[44px] min-h-[44px]` |
| `CommandPalette` dialog doesn't have mobile-optimized sizing | `CommandPalette.tsx` | Already uses `CommandDialog` which has responsive sizing -- no change needed |

---

### 4. UX and User Flow Analysis

**Overall flow assessment:**

The app has a well-designed mobile-first flow:

```text
Landing (/) --> Auth (/auth) --> Onboarding Carousel --> Dashboard (/dashboard)
                                                              |
                                    +-------------------------+-------------------------+
                                    |              |              |            |         |
                                 Editor        AI Studio     Applications  Settings   Upload
                                 (/editor)     (/ai-studio)  (/applications) (/settings) (/upload)
```

**Strengths:**
- Bottom tab bar provides native-app-feel navigation
- Pull-to-refresh on Dashboard
- Lazy loading with skeleton fallbacks on every route
- Error boundaries wrapping the app
- Biometric lock for sensitive data
- Offline sync support
- Deep linking from Cmd+K to AI Studio tools

**UX gaps identified:**

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No empty state guidance when shake-to-report is triggered but user hasn't encountered an error | Low | Pre-fill the bug report with "Manual report via shake gesture" as the error message |
| Editor move-up/move-down buttons are visually small on mobile | Medium | Increase tap targets to 44px as noted above |
| No haptic feedback on error toasts | Low | Add `haptics.error()` call in `showErrorToast()` in `src/lib/errorToast.ts` |
| No haptic on successful save/auto-save | Low | Add `haptics.light()` in the auto-save success path |

---

### Implementation Summary

| Priority | Task | Files |
|----------|------|-------|
| 1 | Create `useShakeDetect` hook | New: `src/hooks/useShakeDetect.ts` |
| 2 | Wire shake hook into App + Settings toggle | `src/App.tsx`, `src/store/settingsStore.ts`, `src/pages/SettingsPage.tsx` |
| 3 | Add missing haptics to ~9 components | Various editor/sheet components |
| 4 | Fix touch target sizes on editor reorder buttons | `HobbiesSection`, `LanguagesSection`, `AwardsSection` |
| 5 | Add `haptics.error()` to `showErrorToast` | `src/lib/errorToast.ts` |

### Technical Details for Shake Detection

The shake algorithm:
1. Listen to `devicemotion` events
2. Track acceleration magnitude: `sqrt(x^2 + y^2 + z^2)` from `accelerationIncludingGravity`
3. If magnitude exceeds threshold (15) three times in 1 second, trigger shake
4. On trigger: `haptics.heavy()` then `triggerBugReport({ errorMessage: 'Bug report via shake gesture', route: location.pathname })`
5. Set a 3-second cooldown via timestamp comparison
6. iOS permission: check `typeof DeviceMotionEvent.requestPermission === 'function'` and call it; if denied, silently disable

