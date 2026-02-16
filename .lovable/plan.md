

## Fix: RadioGroup Not Showing Selected AI Provider

### Root Cause

The Zustand persisted store likely has `aiProvider` set to `'gemini'` (which is why the Settings row shows "Gemini"), but the `RadioGroup` from Radix UI wrapped inside `motion.label` from Framer Motion has a known issue where the controlled `value` prop doesn't visually sync on mount. The `key={aiProvider}` forces a remount but the Radix internal state still doesn't pick up the value correctly because the `motion.label` wrapper intercepts the rendering lifecycle.

### Fix

**`src/components/settings/AISettingsSheet.tsx`**

Replace `motion.label` wrappers with `motion.div` elements. The `label` + `htmlFor` pattern conflicts with how Radix RadioGroup manages selection internally. Using `div` wrappers and letting Radix handle click-to-select via the `RadioGroupItem` directly fixes the issue.

Also add a safety fallback on `aiProvider` so if the persisted value is somehow corrupted, it defaults to `'wiseresume'`:

```tsx
const safeProvider = (aiProvider === 'wiseresume' || aiProvider === 'gemini') 
  ? aiProvider 
  : 'wiseresume';
```

Use `safeProvider` for the `RadioGroup` value, the `key` prop, and the visual highlight logic.

### Changes

| File | Change |
|------|--------|
| `src/components/settings/AISettingsSheet.tsx` | Replace `motion.label` with `motion.div`; add `safeProvider` fallback; use it for RadioGroup value/key and highlight classes |

