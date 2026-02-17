

## Fix: ErrorBoundary UI Clarity and Button Visibility

### Problems
1. **"Report Issue" button is nearly invisible** -- the `variant="secondary"` button blends into the dark background, making it look broken/disabled
2. **Chunk loading errors show raw technical URLs** -- users see `Failed to fetch dynamically imported module: https://long-url...` which is meaningless and alarming. These transient network errors should have friendlier messaging
3. **Technical details shown by default for non-technical errors** -- chunk errors don't need a scary red code block

### Changes

**File: `src/components/ErrorBoundary.tsx`**

1. **Detect chunk/network errors** and show a friendlier experience:
   - Title: "Connection hiccup" instead of "Something went wrong"
   - Description: "The page couldn't load properly. This usually fixes itself -- just tap Reload."
   - Hide the "Technical details" section for chunk errors (users don't need to see raw URLs)
   - Hide the "Report Issue" button for chunk errors (these are transient, not bugs)

2. **Fix button visibility**:
   - Change "Report Issue" from `variant="secondary"` to `variant="outline"` so it has a visible border in both light and dark themes
   - Change "Go to Dashboard" from `variant="outline"` to `variant="ghost"` to create a clear visual hierarchy: primary > outline > ghost

3. **Rename "Try Again" to "Reload" for chunk errors** since it triggers `window.location.reload()` -- clearer user expectation

### Technical Detail

Add a computed `isChunkError` boolean at the top of the render method:

```text
isChunkError = true
  +---------------------------+
  | Title: Connection hiccup  |
  | Friendly description      |
  | No technical details      |
  | [Reload]  (primary)       |
  | [Go to Dashboard] (outline)|
  +---------------------------+

isChunkError = false
  +---------------------------+
  | Title: Something went wrong|
  | Generic description       |
  | Technical details (collapsed)|
  | [Try Again]  (primary)    |
  | [Report Issue] (outline)  |
  | [Go to Dashboard] (ghost) |
  +---------------------------+
```

This ensures chunk loading errors (the most common crash screen users see) feel reassuring rather than alarming, while genuine application errors still show full debugging and reporting options.

