

# Add Bottom Padding to Preview Page

## Problem

The Preview page's root container lacks `pb-20` bottom padding, so content at the bottom will be hidden behind the fixed bottom tab bar.

## Fix

### `src/pages/PreviewPage.tsx` (line 363)

Add `pb-20` to the root container, matching the same fix already applied to EditorPage:

```typescript
// Before
<div className="flex-1 flex flex-col min-h-0 overflow-hidden">

// After
<div className="flex-1 flex flex-col min-h-0 overflow-hidden pb-20">
```

This single-line change ensures the export buttons and bottom content on the Preview page remain visible above the bottom tab bar.

