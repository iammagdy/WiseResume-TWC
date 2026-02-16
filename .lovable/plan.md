

## Fix AI Features, Scrolling Issues in Android APK

### Issue 1: AI Features Failing -- Root Cause Found

**The Problem:** The CORS configuration in `supabase/functions/_shared/cors.ts` lists `http://localhost` for Capacitor Android, but **Capacitor 5+ (you're on v8) uses `https://localhost` by default on Android**. The edge function boots but rejects every request from the APK because the origin `https://localhost` is not in the allowed list and doesn't match the native-app check (`!origin || origin === 'null'`).

Evidence: Edge function logs show many boot/shutdown cycles but zero request processing -- the CORS preflight fails before any code runs.

**Fix:** Add `https://localhost` to the allowed origins in `supabase/functions/_shared/cors.ts`. Also add a broader fallback: if the origin starts with `http://localhost` or `https://localhost` (any port), treat it as allowed.

**File: `supabase/functions/_shared/cors.ts`**
```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost',
  'https://localhost',          // Capacitor Android v5+
  'capacitor://localhost',
  'https://wiseresume.lovable.app',
  'https://wiseresume.magdysaber.com',
];
```

Also update the `isNativeApp` check to be more robust:
```typescript
const isNativeApp = !origin || origin === 'null' 
  || origin === 'https://localhost' 
  || origin === 'http://localhost';
```

This single change should fix ALL AI features (scoring, enhancing, tailoring, etc.) since they all use the same shared CORS module.

---

### Issue 2: Scrolling Broken on Studio Tab and Resume Detail Page

**The Problem:** The AppShell's `<main>` element has `overflow-hidden`, which is correct for establishing scroll contexts. But on Android WebView, the child scroll containers need explicit touch handling. The AIStudioPage also has a `fixed` sticky input bar at the bottom that may intercept touch events.

**Fix (3 parts):**

1. **`src/index.css`**: Add WebView-specific scroll fixes:
```css
/* Android WebView scroll fix */
.overflow-y-auto {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}
```

2. **`src/pages/AIStudioPage.tsx`** (line 161): Add `touch-action: pan-y` to the scrollable container to ensure Android WebView allows vertical scrolling:
```tsx
<div className="flex-1 flex flex-col min-h-0 overflow-y-auto pb-[140px] sm:pb-20 pt-safe"
     style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
```

3. **`src/pages/ResumeDetailPage.tsx`** (line 167): Same fix for the scrollable content area:
```tsx
<div className="flex-1 overflow-y-auto px-4 py-6 space-y-6"
     style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
```

---

### Issue 3: Additional Robustness for AI Calls

As a secondary safety net, update `src/hooks/useResumeScore.ts` to use a direct `fetch` call as a fallback if `supabase.functions.invoke` fails. This bypasses any Supabase client quirks in the WebView.

**File: `src/hooks/useResumeScore.ts`** -- In the `invokeScoreResume` function, if the first call via `supabase.functions.invoke` fails, retry with a direct `fetch` to the edge function URL with explicit headers.

---

### Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/_shared/cors.ts` | Add `https://localhost` to allowed origins; update native-app detection |
| `src/index.css` | Add `-webkit-overflow-scrolling` and `overscroll-behavior` for scroll containers |
| `src/pages/AIStudioPage.tsx` | Add inline `touchAction: 'pan-y'` style to scrollable container |
| `src/pages/ResumeDetailPage.tsx` | Add inline `touchAction: 'pan-y'` style to scrollable container |
| `src/hooks/useResumeScore.ts` | Add direct `fetch` fallback for edge function calls |

### After Implementation

1. The CORS fix will be deployed automatically with the edge function
2. Rebuild the APK via GitHub Actions
3. Test AI scoring and all AI features while signed in
4. Test scrolling on Studio tab and Resume Detail page

