

## Keyboard-Aware Editor: Toolbar, Auto-Hide Nav, Draft Save

### Overview

Enhance the keyboard experience in the editor by adding a floating toolbar above the keyboard with "Done" and "Next" buttons, hiding the bottom tab bar when the keyboard is open, compacting the header, and triggering a draft save when the keyboard closes.

### Changes

**1. `src/hooks/useKeyboardAwareScroll.ts` -- Expand to expose keyboard state**

- Return `isKeyboardOpen` boolean (true when `keyboardHeight > 100`)
- Change `scrollIntoView` block to `'nearest'` instead of `'center'` so the field scrolls just enough to be visible (closer to top of visible area)
- Set a CSS class `keyboard-open` on `document.documentElement` when keyboard is detected, remove it when closed
- Dispatch a custom `keyboard-close` event when keyboard height transitions from >100 to 0 (for draft save trigger)

**2. `src/components/editor/KeyboardToolbar.tsx` -- New file**

A fixed toolbar that appears above the keyboard with:
- **"Previous" button** (ChevronUp icon) -- focuses the previous focusable input/textarea in the form
- **"Next" button** (ChevronDown icon) -- focuses the next focusable input/textarea in the form
- **"Done" button** (text) -- blurs the active element to dismiss the keyboard
- Haptic feedback on each button press
- Positioned using `bottom: var(--keyboard-height)` so it sits right above the keyboard
- Only rendered when keyboard is open (uses the `keyboard-open` class or a context)
- Uses `position: fixed; z-index: 60` to sit above everything

Logic for Previous/Next:
```
- Query all input/textarea elements within the editor scroll container
- Find current activeElement index
- Focus the previous/next element in the list
```

**3. `src/components/layout/BottomTabBar.tsx` -- Hide when keyboard is open**

- Add CSS rule: `.keyboard-open .bottom-tab-bar { display: none }` (or use a class/data attribute)
- Add `bottom-tab-bar` className to the nav element for targeting
- This reclaims ~64px of space when typing

**4. `src/pages/EditorPage.tsx` -- Header compaction and keyboard toolbar**

- Import and render `KeyboardToolbar` inside the editor
- Add a CSS rule for the header: `.keyboard-open .editor-header { py-1 }` -- reduce vertical padding from `py-3` to `py-1` when keyboard is open, saving ~16px
- Hide the version history button and AI chat button when keyboard is open (via CSS `keyboard-open` class)
- Listen for the `keyboard-close` custom event to trigger `saveToCloud()` immediately (draft save on keyboard dismiss)

**5. `src/index.css` -- Keyboard utility styles**

Add global styles:
```css
/* Hide bottom nav when keyboard is open */
.keyboard-open .bottom-tab-bar {
  display: none !important;
}

/* Compact editor header when keyboard is open */
.keyboard-open .editor-header {
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
}

.keyboard-open .editor-header .keyboard-hide {
  display: none;
}
```

### Technical Details

**Keyboard detection (useKeyboardAwareScroll.ts):**
```typescript
const handleResize = () => {
  const keyboardHeight = window.innerHeight - vv.height;
  const isOpen = keyboardHeight > 100;

  // Toggle class on document for CSS-driven hiding
  document.documentElement.classList.toggle('keyboard-open', isOpen);

  // Detect keyboard close for draft save
  if (!isOpen && prevOpen.current) {
    window.dispatchEvent(new CustomEvent('keyboard-close'));
  }
  prevOpen.current = isOpen;

  // Scroll focused input into view
  const active = document.activeElement as HTMLElement;
  if (active && isOpen && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
    setTimeout(() => {
      active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }
};
```

**KeyboardToolbar component structure:**
```
[fixed bar at bottom: var(--keyboard-height)]
  [Previous (chevron-up)] [Next (chevron-down)] --- [Done]
```

**Next/Previous field logic:**
```typescript
const focusables = Array.from(
  document.querySelectorAll<HTMLElement>(
    '.editor-scroll-container input, .editor-scroll-container textarea'
  )
);
const idx = focusables.indexOf(document.activeElement as HTMLElement);
// Next: focus focusables[idx + 1], Previous: focus focusables[idx - 1]
```

**Draft save on keyboard close (EditorPage.tsx):**
```typescript
useEffect(() => {
  const handleKbClose = () => saveToCloud();
  window.addEventListener('keyboard-close', handleKbClose);
  return () => window.removeEventListener('keyboard-close', handleKbClose);
}, [saveToCloud]);
```

### Files Modified
- `src/hooks/useKeyboardAwareScroll.ts` -- add keyboard-open class toggle, keyboard-close event
- `src/components/editor/KeyboardToolbar.tsx` -- new component (Done/Next/Previous toolbar)
- `src/components/layout/BottomTabBar.tsx` -- add `bottom-tab-bar` class for CSS targeting
- `src/pages/EditorPage.tsx` -- render KeyboardToolbar, add `editor-header` class, listen for keyboard-close to save draft
- `src/index.css` -- keyboard-open utility styles for hiding nav and compacting header

