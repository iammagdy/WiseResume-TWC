

# Fix: Customize Button Scrolling Issue

## Problem

When tapping the "Customize" floating button, the page forcefully scrolls down to the `#section-theme` element via `scrollIntoView()`. This is disorienting -- the user loses their current scroll position and gets teleported down the page. A floating action button should not displace the user's viewport.

## Solution

Remove the `scrollIntoView` call from the Customize button's tap handler. The button should only expand the collapsed "Theme" and "Customization" accordion sections so they become visible when the user scrolls to them naturally. No forced scrolling.

### File: `src/pages/PortfolioEditorPage.tsx` (lines 1159-1172)

**Before:**
```js
onTap={() => {
  haptics.light();
  setOpenSections(prev => {
    const next = new Set(prev);
    next.add('theme');
    next.add('customization');
    return next;
  });
  setTimeout(() => {
    document.getElementById('section-theme')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}}
```

**After:**
```js
onTap={() => {
  haptics.light();
  setOpenSections(prev => {
    const next = new Set(prev);
    next.add('theme');
    next.add('customization');
    return next;
  });
}}
```

The `setTimeout` + `scrollIntoView` block (lines 1169-1171) will be removed entirely. The sections will still expand so the user can scroll to them at their own pace.

## Result
- Tapping "Customize" expands the theme/customization sections without moving the viewport
- User retains their current scroll position
- The experience feels native and non-disruptive
