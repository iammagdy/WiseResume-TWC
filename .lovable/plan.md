

# Fix: 5-Second Blank White Screen on App Load

## Problem
The app shows a blank white screen for ~5 seconds before anything renders. The `<div id="root"></div>` in `index.html` is empty, so users see nothing until:
1. The JS bundle downloads and parses
2. React initializes and mounts
3. Auth context resolves (up to 5s timeout)
4. Google Fonts finish loading

## Solution
A two-part fix: add an instant HTML-level loading indicator, and eliminate render-blocking patterns.

---

## Changes

### 1. `index.html` -- Add Inline Loading Spinner

Add a lightweight, pure-CSS loading indicator inside the `#root` div. React automatically replaces `#root`'s children when it mounts, so no cleanup code is needed.

```html
<div id="root">
  <!-- Instant loading indicator replaced by React on mount -->
  <div style="min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;background:#0a0a14;">
    <div style="display:flex;flex-direction:column;align-items:center;gap:16px;">
      <div style="width:32px;height:32px;border-radius:50%;border:2px solid rgba(255,255,255,0.1);border-top-color:hsl(355,90%,60%);animation:sp .8s linear infinite;"></div>
      <span style="font-family:system-ui,sans-serif;font-size:14px;color:rgba(255,255,255,0.5);">Loading...</span>
    </div>
  </div>
  <style>@keyframes sp{to{transform:rotate(360deg)}}</style>
</div>
```

This renders in under 50ms with zero JS, using the app's dark background color and primary brand color for the spinner.

### 2. `src/App.tsx` -- Eliminate Render-Blocking Auth Wait

The `AppRoutes` component currently renders the landing page (`Index`) which calls `useAuth()` via `HeroSection`. While `AuthProvider.loading` is `true`, no content is blocked (the provider renders children immediately). However, the `useBiometricLock` hook initializes with `isLocked: true` and only unlocks after the `checkAvailability` async call resolves. On web, this call returns quickly but still causes a brief flicker.

No changes needed to `AuthContext` -- it already pre-hydrates from cache and renders children immediately.

### 3. `src/components/landing/HeroSection.tsx` -- Defer Non-Critical Auth Check

The `HeroSection` calls both `useAuth()` and `useProfile()` on mount. The profile fetch triggers a network request that can delay interactivity. The profile data is only needed for the avatar in the top-right corner, so we can defer it:

- Keep `useAuth()` as-is (it reads from context, no delay)
- Delay the profile query render -- show the sign-in button immediately, swap to avatar once profile loads (this already works since `useProfile` returns `null` initially)

No code changes needed here; the current pattern is correct.

### 4. `index.html` -- Make Font Loading Non-Blocking

The current font preload uses `onload` pattern which is good, but add a `font-display: swap` fallback in the noscript tag and ensure the preload doesn't block first paint. The current implementation is already correct with `as="style"` and `onload`.

No changes needed.

---

## Summary of File Changes

| File | Change | Impact |
|------|--------|--------|
| `index.html` | Add inline CSS spinner inside `#root` | Instant visual feedback (< 50ms) |

This is a single, surgical change. The spinner matches the app's dark theme (`#0a0a14` background) and uses the primary brand color (`hsl(355,90%,60%)`) for the spinning indicator. React's `createRoot().render()` automatically replaces the contents of `#root`, so the spinner disappears the moment the app mounts -- no JavaScript cleanup needed.

## Testing
- Hard-refresh the app (Ctrl+Shift+R) and confirm the spinner appears immediately
- Verify the spinner disappears once the landing page renders
- Test on slow 3G throttling in DevTools to confirm the spinner is visible during load

