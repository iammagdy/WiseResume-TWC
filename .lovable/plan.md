
# Auto-Scroll to First Form Field on Editor Load

## Problem
When the editor loads on mobile, the form fields (Full Name, Email, etc.) are pushed below the fold by header chrome. Users have to manually scroll down to start editing.

## Solution
After the resume data hydrates and the active section renders, auto-scroll the content container so the first input/textarea field is visible. This uses `scrollContainerRef` (already exists at line 281) and a short delay to wait for lazy-loaded section components to mount.

## Technical Change

### File: `src/pages/EditorPage.tsx`
Add a `useEffect` after the existing hydration/AI-intro effects (~line 314) that:

1. Waits for `currentResume` to be truthy (data loaded)
2. Waits 500ms for the lazy-loaded section component to render
3. Finds the first `input` or `textarea` inside `scrollContainerRef.current`
4. Calls `element.scrollIntoView({ behavior: 'smooth', block: 'center' })` to bring it into view
5. Only runs once per editor session (use a `useRef` flag to prevent re-triggering on re-renders)
6. Only runs on mobile (`isMobile` check) since desktop has enough space

```
// Auto-scroll to first form field on mobile after initial load
const hasAutoScrolled = useRef(false);
useEffect(() => {
  if (!isMobile || !currentResume || hasAutoScrolled.current) return;
  const timer = setTimeout(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const firstInput = container.querySelector('input, textarea');
    if (firstInput) {
      firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      hasAutoScrolled.current = true;
    }
  }, 600);
  return () => clearTimeout(timer);
}, [isMobile, currentResume]);
```

No new files, no new dependencies, no database changes. One small effect added.
