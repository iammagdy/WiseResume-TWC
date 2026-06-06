# Wise AI — Logo Loader (React component)

Drop-in indeterminate loader. The logo's real parts pop into place, hold, fade,
and repeat. Pure CSS animation, no dependencies.

## Files
- `WiseLogoLoader.tsx` — the component
- `wise-loader-assets/` — 4 transparent PNGs (W, separator, "WISE Ai" text, AI star badge)

## Install
1. Copy both `WiseLogoLoader.tsx` and the `wise-loader-assets/` folder into your
   `src/` (keep them next to each other so the relative imports resolve).
   e.g. `src/components/loader/WiseLogoLoader.tsx` + `src/components/loader/wise-loader-assets/...`
2. Vite already handles `import x from "./foo.png"` out of the box — no config needed.

## Use
```tsx
import WiseLogoLoader from "@/components/loader/WiseLogoLoader";

// inline
<WiseLogoLoader size={120} />

// full-screen overlay
<div className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm">
  <WiseLogoLoader size={160} />
</div>
```

## Props
| prop         | default | meaning                  |
|--------------|---------|--------------------------|
| `size`       | `200`   | square size in px        |
| `durationMs` | `3800`  | loop length              |
| `className`  | —       | passthrough              |
| `style`      | —       | passthrough              |

Respects `prefers-reduced-motion` (animation pauses).

## Giving this to Claude Code
Just point it at this folder and say:
> "Add this loader component to the app and use it as the global loading state.
>  Files are in WiseLogoLoader.tsx + wise-loader-assets/."

Claude Code can wire it into your existing Suspense / loading boundaries.
