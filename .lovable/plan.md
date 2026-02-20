

# Performance Cleanup: Remove Dead Code and Optimize Bundle

## Summary

After a thorough audit of the entire codebase, I found **dead files, unused dependencies, orphaned components, and build configuration issues** that add unnecessary weight to the mobile app. This cleanup will reduce bundle size, improve load times, and remove confusion from the codebase.

---

## 1. Remove Unused Dependencies (package.json)

These installed packages are never imported anywhere in the source code:

| Package | Size Impact | Why Dead |
|---|---|---|
| `@elevenlabs/react` | ~50KB+ | Never imported; ElevenLabs integration uses custom `useElevenLabsScribe` hook with raw WebSocket |
| `input-otp` | ~15KB | UI component `input-otp.tsx` exists but is never used anywhere |
| `embla-carousel-react` | ~20KB | Only used directly in `MultiJobCompareSheet.tsx` (keep); but the `carousel.tsx` UI wrapper is dead |

**Action:** Remove `@elevenlabs/react` and `input-otp` from `package.json`.

---

## 2. Delete Unused Files

### Dead Hook Files (never imported by any component)

| File | Reason |
|---|---|
| `src/hooks/useAIAnalytics.ts` | Zero imports across entire codebase |
| `src/hooks/useSheetKeyboard.ts` | Zero imports across entire codebase |

### Dead Component Files

| File | Reason |
|---|---|
| `src/components/NavLink.tsx` | Zero imports anywhere |
| `src/components/portfolio/PortfolioQRDialog.tsx` | Replaced by `QRGeneratorSheet`; no longer imported |
| `src/App.css` | Contains only a comment, never imported |

### Dead UI Component Files (installed by shadcn but never used)

| File | Reason |
|---|---|
| `src/components/ui/aspect-ratio.tsx` | Zero imports |
| `src/components/ui/breadcrumb.tsx` | Zero imports |
| `src/components/ui/context-menu.tsx` | Zero imports |
| `src/components/ui/hover-card.tsx` | Zero imports |
| `src/components/ui/menubar.tsx` | Zero imports |
| `src/components/ui/navigation-menu.tsx` | Zero imports |
| `src/components/ui/pagination.tsx` | Zero imports |
| `src/components/ui/sidebar.tsx` | Zero imports |
| `src/components/ui/input-otp.tsx` | Zero imports |
| `src/components/ui/carousel.tsx` | Zero imports (embla used directly) |

---

## 3. Build Configuration Optimization

### Disable Production Source Maps

**File:** `vite.config.ts`

Currently `sourcemap: true` ships full source maps in production. This roughly doubles the deployed JS size and exposes source code.

**Fix:** Change to `sourcemap: false` (or `'hidden'` if you want them for error tracking but not publicly served).

---

## 4. Remove Dead Comment Reference

**File:** `src/pages/PortfolioEditorPage.tsx`

Line 489 has a stale comment referencing `PortfolioQRDialog`:

```
// QR download is now handled inside PortfolioQRDialog
```

**Fix:** Remove or update the comment since the component was replaced.

---

## 5. Clean Up `perf-audit-results.ts`

This file is a static tracker object that's never imported or used at runtime. It only serves as documentation.

**Action:** Either delete it (move notes to a markdown file) or keep as-is since it tree-shakes out if unreferenced. Low priority.

---

## Estimated Impact

| Metric | Improvement |
|---|---|
| JS Bundle Size | ~100-200KB reduction (source maps removal + dead deps) |
| File Count | 14 fewer files to parse/maintain |
| Unused Dependencies | 2 packages removed from node_modules |
| Tree-shake Efficiency | Cleaner dependency graph for Vite |

---

## Technical Notes

- All deletions are safe: verified zero imports via regex search across the entire `src/` directory
- No functional changes: only removing code that is never reached
- The `ElectricBorder` component (canvas-based animation) is used by `DeveloperCreditCard` in Settings -- keeping it, but noting it runs `requestAnimationFrame` continuously when visible
- The large `index.css` (1787 lines) contains portfolio-specific CSS (`pf-*` prefixed classes) that is necessary for the public portfolio feature -- no trimming needed there
- `html2canvas` is used (CareerCardSheet, pdfGenerator, PublicPortfolioPage) -- keeping
- `react-image-crop` is used (AvatarCropSheet) -- keeping

