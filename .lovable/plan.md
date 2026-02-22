

# Performance Enhancement Plan

## The Big Picture

Your app takes over 6 seconds to fully load, and the single biggest culprit is shocking: your logo images are **2.5 MB each**. That's 5 MB of images just for the logo -- before any actual content loads. For context, an entire well-optimized web app should be under 1-2 MB total.

## Changes (ordered by impact)

### 1. Compress logo images (biggest win -- saves ~4.9 MB)

Both `public/favicon.png` and `src/assets/wise-ai-logo.png` are 2,504 KB each. These should be under 50 KB.

- Convert `favicon.png` to a compressed PNG or WebP at the sizes actually used (40px in spinner, 192px max for PWA icon). A 192x192 PNG should be ~10-20 KB.
- Convert `wise-ai-logo.png` to WebP format. At the sizes it's displayed (64px-120px), a high-quality WebP should be ~15-30 KB.
- Create a new optimized `wise-ai-logo.webp` and update all 5 files that import it to use the WebP version.
- Keep PNG as fallback only in index.html using the existing `<img>` tag.

This alone should cut load time by 2-3 seconds.

### 2. Remove route-change remount in AppShell

The `AnimatePresence` in AppShell uses `key={location.pathname}`, which completely destroys and recreates the page component on every navigation. This causes:
- Full component tree teardown and rebuild
- All queries re-fired
- State lost
- Visible jank between pages

Fix: Remove the `key` prop and the `AnimatePresence` wrapper, or use a simpler CSS opacity transition that doesn't trigger remount. The page-level `Suspense` boundaries already handle loading states.

### 3. Optimize framer-motion usage

114 files import framer-motion (93 KB chunk). Many uses are trivial fade-in animations that can be replaced with CSS:

- Replace simple `motion.div` with `initial={{ opacity: 0 }}` / `animate={{ opacity: 1 }}` with CSS `animate-fade-in` utility class
- Keep framer-motion only where it's truly needed: gesture-based interactions (swipe cards), `AnimatePresence` exit animations, `LayoutGroup` (bottom tab pill), and spring physics
- This won't remove framer-motion from the bundle (it's needed), but reduces component render overhead

### 4. Add manualChunks for Radix UI

Radix UI components are imported across many pages but not currently split. Add a chunk for them:

```
if (id.includes('node_modules/@radix-ui')) return 'radix';
```

This groups all Radix code into one cacheable chunk instead of duplicating it across page bundles.

### 5. Defer non-critical providers

`CommandPalette`, `WhatsNewDialog`, and `BugReportDialog` are loaded at the App root level. While they're lazy-loaded, their `Suspense` boundaries still evaluate on every render. Wrap them in a `useEffect`-gated mount so they only render after initial page load:

```tsx
const [ready, setReady] = useState(false);
useEffect(() => { const t = setTimeout(() => setReady(true), 2000); return () => clearTimeout(t); }, []);
```

### 6. Reduce style recalculations

101 style recalculations (84.7ms) on page load. This is partly caused by:
- The inline `<style>` block in index.html for spinner keyframes (already cleaned up on React mount)
- Multiple Google Fonts loading with `font-display: swap` causing reflows

Fix: Add `font-display: optional` instead of `swap` for the Space Grotesk font to prevent layout shift. Inter can remain `swap` since it's the primary font.

## Technical Details

### Files to modify:

| File | Change |
|------|--------|
| `public/favicon.png` | Replace with compressed ~20 KB version |
| `src/assets/wise-ai-logo.png` | Replace with compressed WebP ~25 KB version |
| `src/components/brand/AppIcon.tsx` | Update import to WebP |
| `src/pages/Index.tsx` | Update import to WebP |
| `src/components/landing/Footer.tsx` | Update import to WebP |
| `src/components/applications/JobMatchScore.tsx` | Update import to WebP |
| `src/components/portfolio/qr/QRGeneratorSheet.tsx` | Update import to WebP |
| `src/components/layout/AppShell.tsx` | Remove AnimatePresence key remount |
| `vite.config.ts` | Add Radix UI manual chunk |
| `src/App.tsx` | Defer non-critical global components |
| `index.html` | Update font-display strategy |

### Expected results:
- Initial load: 6.2s down to ~2-3s
- Asset transfer: 5+ MB down to ~1.2 MB
- Route transitions: Smoother, no full remounts
- Perceived performance: Significantly faster navigation

