

# Fix Navigation: Unified Back Button, SwipeBack, and Page Transitions

## Overview

The app has three navigation utilities (`SwipeBackWrapper`, `useBackNavigation`, `BACK_ROUTES`) that were built but never wired into actual pages. Every page currently hardcodes its own back destination and has inconsistent back button styling. This plan fixes all of it.

## What Gets Created

### 1. Standardized Back Button Component: `src/components/ui/BackButton.tsx`

A single reusable back button that:
- Uses `useBackNavigation()` internally (no hardcoded routes)
- Consistent 44x44px touch target, `ArrowLeft` icon, rounded-xl styling
- Accepts optional `onBeforeBack` guard (for Editor's unsaved changes dialog)
- Accepts optional `className` for header-specific tweaks

```
Props:
- onBeforeBack?: () => boolean  (return true to block navigation)
- className?: string
```

### 2. Fix `SwipeBackWrapper` to use `BACK_ROUTES`

Currently uses `navigate(-1)` which is unreliable in Capacitor WebViews. Will be updated to use `getBackRoute()` from `src/lib/navigation.ts` instead, matching how the hardware back button already works.

### 3. Integrate SwipeBack into AppShell

Instead of wrapping every individual page, add `SwipeBackWrapper` once inside `AppShell.tsx` around the outlet content -- but only on non-dashboard/non-editor routes (dashboard is a root screen, editor has its own gesture handling). This gives swipe-back to all sub-pages automatically.

### 4. Add CSS page transition

Replace the static `animate-fade-in` class on the outlet wrapper in AppShell with a keyed CSS transition that fades content in on route change, using the existing `animate-fade-in` keyframe but re-triggered per route via a `key` on a lightweight `div` (not `AnimatePresence` which causes remounts).

## What Gets Updated

### Pages that need back button replacement (swap hardcoded `navigate('/...')` with `<BackButton />`):

| Page | Current back target | After |
|------|-------------------|-------|
| SettingsPage | `navigate('/dashboard')` | `<BackButton />` |
| ProfilePage | `navigate('/dashboard')` | `<BackButton />` |
| TemplatesPage | `navigate('/dashboard')` | `<BackButton />` |
| NotificationsPage | `navigate('/dashboard')` | `<BackButton />` |
| ResumeDetailPage | `navigate('/dashboard')` | `<BackButton />` |
| UploadPage | `navigate('/dashboard')` | `<BackButton />` |
| ExamplesPage | `navigate('/dashboard')` | `<BackButton />` |
| GuidesPage | `navigate('/dashboard')` | `<BackButton />` |
| GuidePage | `navigate('/guides')` | `<BackButton />` |
| CoverLettersPage | `navigate('/ai-studio')` | `<BackButton />` |
| CoverLetterNewPage | `navigate('/cover-letters')` | `<BackButton />` |
| CoverLetterEditPage | `navigate('/cover-letters')` | `<BackButton />` |
| ResignationLettersPage | `navigate('/ai-studio')` | `<BackButton />` |
| ResignationLetterNewPage | `navigate('/resignation-letters')` | `<BackButton />` |
| ResignationLetterEditPage | `navigate('/resignation-letters')` | `<BackButton />` |
| ApplicationTrackerPage | `navigate('/applications')` | `<BackButton />` |
| PreviewPage | `navigate('/editor')` | `<BackButton />` |
| PortfolioEditorPage | `navigate('/dashboard')` | `<BackButton />` |
| AIStudioPage | `navigate('/dashboard')` | `<BackButton />` |
| CareerPage | (if has back button) | `<BackButton />` |
| InterviewPage | (if has back button) | `<BackButton />` |

**Special case -- EditorPage**: Uses an unsaved-changes guard. Will use `<BackButton onBeforeBack={() => unsavedGuard.interceptNavigate(getBackRoute('/editor'))} />`.

### Files modified:

| File | Change |
|------|--------|
| `src/components/ui/BackButton.tsx` | **NEW** -- reusable back button component |
| `src/components/layout/SwipeBackWrapper.tsx` | Fix `navigate(-1)` to use `getBackRoute()` |
| `src/components/layout/AppShell.tsx` | Wrap outlet in `SwipeBackWrapper`, add route-keyed fade transition |
| ~20 page files | Replace inline back button with `<BackButton />` |
| `src/hooks/useBackNavigation.ts` | No changes needed (already correct) |
| `src/lib/navigation.ts` | Add `/guides/:slug` -> `/guides` mapping |

## Technical Details

### BackButton component pattern:
```tsx
// Usage in any page header:
<BackButton />

// Usage in EditorPage with guard:
<BackButton onBeforeBack={() => {
  if (isDirty) { showDialog(); return true; }
  return false;
}} />
```

### SwipeBackWrapper fix:
```tsx
// Before (unreliable):
navigate(-1);

// After (deterministic):
const backRoute = getBackRoute(location.pathname);
navigate(backRoute);
```

### AppShell integration:
```tsx
// Wrap outlet content (non-editor routes only):
<SwipeBackWrapper className="flex-1 flex flex-col min-h-0">
  <div key={location.pathname} className="flex-1 flex flex-col min-h-0 animate-fade-in">
    {currentOutlet}
  </div>
</SwipeBackWrapper>
```

The `key={location.pathname}` on the inner `div` (not on a component boundary) re-triggers the CSS fade-in animation without causing React remounts -- the outlet itself stays stable.

### Navigation map addition:
```ts
'/guides': '/dashboard',  // already exists
// Add:
'/guide': '/guides',      // for /guides/:slug dynamic route
```

## Result
- Every back button in the app routes through `BACK_ROUTES` -- one place to update
- Swipe-right-to-go-back works on all sub-pages automatically
- Smooth fade transition between pages without remounting
- Consistent 44x44px back button styling everywhere
- EditorPage retains its unsaved-changes guard

