

# Fix PDF Upload - Worker Loading Error

## Problem

When uploading a PDF resume, you see "Failed to parse PDF. Please try again." This is caused by the PDF.js worker failing to load from an external CDN.

The error message from the console:
> "Setting up fake worker failed: Failed to fetch dynamically imported module"

---

## Root Cause

The current code uses a CDN URL to load the PDF.js worker:
```javascript
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
```

This fails because:
1. PDF.js version 4.x uses ES modules (`.mjs` files), not `.min.js`
2. The CDN doesn't properly serve the worker for dynamic imports
3. Version mismatch between the package and CDN

---

## Solution

Use Vite's built-in worker handling with `import.meta.url` to load the worker directly from the installed npm package:

```javascript
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();
```

This approach:
- Works reliably with Vite's module resolution
- Keeps the worker in sync with the installed package version
- Handles ESM modules correctly
- Works in both development and production builds

---

## Implementation

### File to Modify

**`src/lib/pdfParser.ts`**

Update the worker source configuration from CDN-based to Vite-compatible:

```typescript
import * as pdfjsLib from 'pdfjs-dist';
import { ResumeData } from '@/types/resume';
import { v4 as uuidv4 } from 'uuid';

// Configure PDF.js worker using Vite's import.meta.url
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();
```

**Key Change**: Replace line 6 (the old CDN URL) with the `new URL()` pattern that Vite understands.

---

## Why This Works

Vite has special handling for the `new URL(..., import.meta.url)` pattern:
- In development: Serves the worker file directly from node_modules
- In production: Bundles and includes the worker file in the build output
- Ensures version consistency between the main library and worker

---

## Testing

After the fix:
1. Navigate to the Upload page
2. Select a PDF resume file
3. The file should parse successfully and navigate to the Editor
4. Check console for any remaining errors

