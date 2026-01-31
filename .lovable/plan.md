
# Fix PDF Text Extraction - Missing Type Filtering

## Problem
When uploading any PDF, you see "Could not extract readable text" even though the PDF has selectable text. The parsing completes but reports no text extracted.

## Root Cause
The PDF.js `getTextContent()` returns items that can be either `TextItem` or `TextMarkedContent`:

- **TextItem**: Has `str`, `transform`, `width`, `height`, etc.
- **TextMarkedContent**: Only has `type` and `id` - no text content

The current code assumes ALL items are `TextItem` and have `str` and `transform` properties. When it encounters a `TextMarkedContent` item:
1. `item.str` is `undefined`
2. Calling `.trim()` on `undefined` throws an error or produces unexpected results
3. `item.transform` is also `undefined`, so coordinate calculations fail

This causes the text extraction to fail silently or produce empty results.

## Solution
Filter out `TextMarkedContent` items before processing by checking if the `str` property exists.

---

## Implementation

### File: `src/lib/pdf/textExtractor.ts`

**Change 1**: Update the `TextItem` interface to properly reflect the optional nature and add a type guard

```typescript
interface TextItem {
  str: string;
  transform: number[];
  width?: number;
  height?: number;
  hasEOL?: boolean;
}

// Type guard to filter out TextMarkedContent items
function isTextItem(item: any): item is TextItem {
  return typeof item.str === 'string' && Array.isArray(item.transform);
}
```

**Change 2**: Filter items at the start of `reconstructPageText()`

```typescript
function reconstructPageText(items: any[]): string {
  // Filter to only actual TextItem objects (not TextMarkedContent)
  const textItems = items.filter(isTextItem);
  
  if (textItems.length === 0) return '';

  // ... rest of the function uses textItems instead of items
}
```

**Change 3**: Also add safer handling in the main loop

```typescript
for (const item of textItems) {
  // No need for .trim() check anymore since isTextItem guarantees str exists
  const text = item.str.trim();
  if (!text) continue;
  
  const x = item.transform[4];
  const y = Math.round(item.transform[5] / Y_TOLERANCE) * Y_TOLERANCE;
  // ...
}
```

---

## Why This Fixes the Issue
By properly filtering items to only those with `str` and `transform` properties:
1. All text content is properly extracted
2. No crashes on undefined properties
3. Coordinate-based line reconstruction works correctly
4. Multi-page documents are handled properly

---

## Testing
After the fix:
1. Upload any text-based PDF resume
2. Text should be extracted and the editor populated with data
3. Console should not show any errors
4. The toast should show what was found (name, email, jobs, skills, etc.)
