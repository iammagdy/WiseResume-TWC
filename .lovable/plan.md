

# Fix: SyntaxError from `docx` Package Breaking Preview Page

## Problem
The `/preview` page crashes with `SyntaxError: Unexpected token '{'` because the `docx` npm package uses syntax that Vite's dependency pre-bundler can't handle. Since `PreviewPage.tsx` statically imports `docxGenerator.ts` (which statically imports from `docx`), the error occurs on every preview page load -- even when the user isn't exporting DOCX.

## Root Cause
The `docx` library (line 32 of `PreviewPage.tsx`: `import { generateAndDownloadDOCX } from '@/lib/docxGenerator'`) is eagerly loaded via a static import, which triggers Vite to pre-bundle it into a chunk that contains incompatible syntax.

## Fix

### 1. `src/lib/docxGenerator.ts` -- Lazy-load the `docx` package
Change the top-level static `import { ... } from 'docx'` to a dynamic `import('docx')` inside the `generateAndDownloadDOCX` function. This way the heavy `docx` module is only fetched when the user actually clicks "Download DOCX".

### 2. `src/pages/PreviewPage.tsx` -- Use dynamic import for DOCX generator
Replace the static `import { generateAndDownloadDOCX } from '@/lib/docxGenerator'` with a dynamic `const { generateAndDownloadDOCX } = await import('@/lib/docxGenerator')` inside the DOCX export case of `handleExport`. This prevents the `docx` dependency from loading at page mount.

### 3. `vite.config.ts` -- Exclude `docx` from dependency optimization
Add `optimizeDeps: { exclude: ['docx'] }` to tell Vite not to pre-bundle the `docx` package, avoiding the syntax error in the pre-bundled chunk.

## Files Modified

| File | Change |
|------|--------|
| `src/lib/docxGenerator.ts` | Move `import { ... } from 'docx'` into the function body as `await import('docx')` |
| `src/pages/PreviewPage.tsx` | Remove static import of `generateAndDownloadDOCX`, use dynamic `import()` in the DOCX case |
| `vite.config.ts` | Add `optimizeDeps: { exclude: ['docx'] }` |

## Why This Works
- The `docx` package is only loaded when the user explicitly chooses DOCX export
- Vite won't try to pre-bundle it, avoiding the syntax error
- The preview page loads instantly without pulling in the ~50KB docx library
- All other export types (PDF, one-page, cover letter) are unaffected
