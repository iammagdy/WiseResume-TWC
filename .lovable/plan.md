

## Fix APK Build: PWA Precache Size Limit

### Root Cause
When the new Wise AI logo was copied to all icon sizes (48x48, 72x72, etc.), the **full 2.56 MB PNG** was used for every size -- no resizing was done. The PWA `injectManifest` plugin has a default 2 MB limit per file, causing the build to fail.

### Solution (Two-Part Fix)

#### 1. Increase the precache size limit in `vite.config.ts`
Add `maximumFileSizeToCacheInBytes: 5 * 1024 * 1024` (5 MB) to the `injectManifest` config. This unblocks the build immediately.

#### 2. Exclude large icon files from precache glob pattern
Update the `globPatterns` to exclude PNG files in the `icons/` directory since they don't need to be precached (the browser fetches them on-demand from the manifest). Change:
```
globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"]
```
to:
```
globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"]
```
This removes ALL PNGs from precaching (including the 2.56 MB wise-ai-logo asset), keeping the service worker lean. The icons and logo still load normally -- they just won't be cached by the service worker on first install.

### Technical Details

**File: `vite.config.ts`** -- Update the `injectManifest` block:
```typescript
injectManifest: {
  globPatterns: ["**/*.{js,css,html,ico,svg,woff2}"],
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
},
```

This is a single-file, two-line change that fully resolves the build failure.

