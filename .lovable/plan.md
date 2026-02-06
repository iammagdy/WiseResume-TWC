
# AI Studio Enhancement: Personal Career Coach Suite

## ✅ Mobile Flow Fixes (Completed)

All 8 mobile flow issues have been resolved:
1. ✅ Hardware back button - now uses explicit route mapping (`src/lib/navigation.ts`)
2. ✅ PreviewPage bottom actions - flex layout, no sticky overlap
3. ✅ EditorPage layout - proper flex structure with shrink-0 sections
4. ✅ Keyboard handling in sheets - new `useSheetKeyboard` hook created
5. ✅ OnboardingCarousel snap - added `snap-always` to items
6. ✅ InterviewPage bottom spacing - added `mb-20` for tab bar
7. ✅ PullToRefresh threshold - uses `<= 1` instead of `=== 0`
8. ✅ Standardized navigation - centralized in `src/lib/navigation.ts`

---

## Issues That Were Fixed

### Issue 1: Hardware Back Button Logic Has Edge Case Bug
**File:** `src/hooks/useBackButton.ts` (Line 30)  
**Severity:** Medium

The current logic uses `window.history.length > 1` to decide whether to use history navigation. This is unreliable because:
- History length accumulates across browser sessions
- In Capacitor WebViews, history can be unpredictable
- Direct URL access (deep links) will have history length of 1 even on nested pages

```typescript
// Current (unreliable)
window.history.length > 1 ? navigate(-1) : navigate('/dashboard');

// Problem: A user deep-linked to /editor will have history.length = 1
// and will be sent to /dashboard even if they expect to go back to /preview
```

**Fix:** Use explicit route-based back navigation instead of history.

---

### Issue 2: PreviewPage Bottom Actions Overlap with Bottom Tab Bar
**File:** `src/pages/PreviewPage.tsx` (Line 439-440)  
**Severity:** High

The bottom action bar has:
```tsx
className="sticky bottom-16 p-4 pb-safe glass border-t border-border space-y-3 mb-safe"
```

Issues:
- `bottom-16` + `mb-safe` creates inconsistent spacing on different devices
- Double safe-area padding (`pb-safe` + `mb-safe`) causes excessive spacing
- `sticky` behavior can fail when combined with flex layouts

**Fix:** Use single consistent spacing that accounts for the tab bar height.

---

### Issue 3: EditorPage Bottom Action Bar Positioning
**File:** `src/pages/EditorPage.tsx` (Line ~252)  
**Severity:** High

Similar to PreviewPage, the "Preview & Export" button bar has:
```tsx
className="sticky bottom-32 p-4 glass border-t border-border z-30"
```

The `bottom-32` (128px) hardcoded value doesn't account for:
- Different device safe areas
- The AI Assistant bar height variations
- Potential keyboard showing

**Fix:** Use flexbox-based layout instead of absolute positioning.

---

### Issue 4: Missing Keyboard-Aware Scroll in Sheets
**Files:** Multiple sheet components  
**Severity:** Medium

When the keyboard opens inside bottom sheets (like TailorSheet with job description input), the content may get hidden behind the keyboard. The `MobileLayout` has keyboard handling, but sheets don't use `MobileLayout`.

**Fix:** Add viewport meta adjustments and scroll-into-view for focused inputs in sheets.

---

### Issue 5: OnboardingCarousel Missing Snap-Start CSS
**File:** `src/components/onboarding/OnboardingCarousel.tsx` (Line 97)  
**Severity:** Low

The carousel uses `snap-x-mandatory` class but the children `OnboardingStep` components don't have `snap-start` class, causing imprecise snap behavior.

**Fix:** Add snap alignment to carousel items.

---

### Issue 6: Interview Page Missing Bottom Safe Area
**File:** `src/pages/InterviewPage.tsx` (Line 225)  
**Severity:** Medium

The interview controls container has `pb-safe` but the page itself doesn't account for the bottom tab bar. When the tab bar is visible, controls may be partially hidden.

```tsx
<div className="border-t border-border/30 bg-card/40 backdrop-blur-md px-4 py-4 space-y-3 pb-safe">
```

**Fix:** Add proper bottom padding to account for AppShell's tab bar.

---

### Issue 7: PullToRefresh Scroll Detection Flaky
**File:** `src/components/ui/pull-to-refresh.tsx` (Lines 30-33)  
**Severity:** Low

The scroll detection checks `containerRef.current.scrollTop === 0`, which can be imprecise due to:
- Scroll bounce on iOS
- Sub-pixel rendering differences
- Fast scroll momentum

**Fix:** Use a threshold (e.g., `scrollTop <= 1`) instead of exact equality.

---

### Issue 8: Inconsistent Back Navigation Across Pages
**Files:** Multiple pages  
**Severity:** Medium

Different pages have inconsistent back navigation targets:
- `EditorPage` → `Dashboard` (authenticated) or `/` (guest)
- `PreviewPage` → `/editor`
- `UploadPage` → `/dashboard`
- `InterviewPage` → `/dashboard`
- `AuthPage` → `/`

Some use direct navigation, some check auth state. This can lead to confusing navigation flows.

**Fix:** Standardize back navigation logic based on user context.

---

## Implementation Plan

### Phase 1: Critical Navigation & Layout Fixes

#### Fix 1: Hardware Back Button - Use Explicit Routes
Replace history-based navigation with explicit parent route logic.

```typescript
// New logic in useBackButton.ts
const BACK_ROUTES: Record<string, string> = {
  '/editor': '/dashboard',
  '/preview': '/editor',
  '/upload': '/dashboard',
  '/interview': '/dashboard',
  '/settings': '/dashboard',
  '/auth': '/',
};

const getBackRoute = (pathname: string): string => {
  return BACK_ROUTES[pathname] || '/dashboard';
};
```

#### Fix 2: PreviewPage Bottom Bar Positioning
Replace sticky + absolute positioning with proper flex layout.

```typescript
// PreviewPage.tsx - Bottom actions
<motion.div
  className="p-4 glass border-t border-border space-y-3"
  // Remove: sticky bottom-16 mb-safe
>
```

The AppShell already adds `pb-20` for bottom nav, so sticky isn't needed.

#### Fix 3: EditorPage Layout Restructure
Restructure to use proper flex layout with fixed AI bar.

```typescript
// Current structure has overlapping sticky elements
// Fix: Use flex column with fixed-height sections

<div className="flex-1 flex flex-col overflow-hidden">
  {/* Header - shrink-0 */}
  {/* Progress - shrink-0 */}
  {/* Tabs content - flex-1 overflow-y-auto */}
  {/* Bottom action bar - shrink-0 */}
  {/* AI Assistant bar - shrink-0 */}
</div>
```

### Phase 2: Sheet & Input Improvements

#### Fix 4: Add Keyboard Handling to Sheets
Create a wrapper hook for sheets with inputs.

```typescript
// New hook: useSheetKeyboard.ts
export function useSheetKeyboard() {
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };
    
    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, []);
}
```

### Phase 3: Minor UX Fixes

#### Fix 5: OnboardingCarousel Snap
Add snap alignment to carousel children.

```tsx
// OnboardingStep.tsx
<div className="flex-shrink-0 w-full snap-start snap-always">
```

#### Fix 6: Interview Page Bottom Spacing
Account for tab bar in interview page.

```tsx
// The controls container needs mb-20 when tab bar visible
<div className="... pb-safe mb-20">
```

#### Fix 7: PullToRefresh Scroll Threshold
Use threshold instead of exact equality.

```typescript
// pull-to-refresh.tsx
if (containerRef.current && containerRef.current.scrollTop <= 1) {
  setIsPulling(true);
}
```

#### Fix 8: Standardize Back Navigation
Create a unified back navigation helper.

```typescript
// New utility: getBackRoute.ts
export function getBackRoute(pathname: string, isAuthenticated: boolean): string {
  const routes: Record<string, string> = {
    '/editor': '/dashboard',
    '/preview': '/editor', 
    '/upload': '/dashboard',
    '/interview': '/dashboard',
    '/settings': '/dashboard',
    '/auth': '/',
  };
  
  // Guest users on editor go to landing
  if (pathname === '/editor' && !isAuthenticated) {
    return '/';
  }
  
  return routes[pathname] || '/dashboard';
}
```

---

## Files to Modify

| File | Priority | Changes |
|------|----------|---------|
| `src/hooks/useBackButton.ts` | High | Use explicit route mapping |
| `src/pages/PreviewPage.tsx` | High | Fix bottom action positioning |
| `src/pages/EditorPage.tsx` | High | Restructure layout for proper stacking |
| `src/pages/InterviewPage.tsx` | Medium | Add bottom tab bar spacing |
| `src/components/ui/pull-to-refresh.tsx` | Low | Use scroll threshold |
| `src/components/onboarding/OnboardingCarousel.tsx` | Low | Add snap-start to children |
| `src/components/onboarding/OnboardingStep.tsx` | Low | Add snap-start class |
| `src/lib/navigation.ts` | New | Create navigation helper utility |

---

## Summary

The app has a solid mobile foundation with:
- **Good:** Safe area handling, haptic feedback, offline detection, biometric lock, proper touch targets
- **Needs Fix:** Sticky positioning conflicts, inconsistent back navigation, keyboard handling in sheets

These fixes will ensure reliable navigation and prevent layout issues across different devices and orientations.
