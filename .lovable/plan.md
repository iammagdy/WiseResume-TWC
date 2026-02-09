

# Fix Build Errors - Missing Imports

## Problem Summary

Multiple build errors are preventing the app from compiling:

1. **`src/pages/Index.tsx`** - Missing imports for `AppLogo` and `Button` components
2. **`src/lib/agenticChat.ts`** - Missing import for `handleAIError` from `./aiProvider`
3. **`src/lib/aiAnalysis.ts`** - Missing import for `handleAIError` from `./aiProvider`
4. **`src/lib/aiTailor.ts`** - Missing import for `handleAIError` from `./aiProvider`
5. **`src/lib/careerPath.ts`** - Missing import for `handleAIError` from `./aiProvider`
6. **`src/hooks/useAuth.test.tsx`** - TypeScript spread argument errors in mock functions

---

## Fix 1: `src/pages/Index.tsx`

**Problem:** The file uses `AppLogo` (line 92) and `Button` (lines 148, 155) but doesn't import them.

**Solution:** Add these imports to the file's import statements.

```typescript
// Add to imports
import { AppLogo } from '@/components/brand/AppLogo';
import { Button } from '@/components/ui/button';
```

---

## Fix 2: `src/lib/agenticChat.ts`

**Problem:** Uses `handleAIError` (line 63) but doesn't import it.

**Solution:** Add the import from `./aiProvider`.

```typescript
// Update line 3 to include handleAIError
import { getUserGeminiKey, trackGeminiUsage, handleAIError } from './aiProvider';
```

---

## Fix 3: `src/lib/aiAnalysis.ts`

**Problem:** Uses `handleAIError` (line 26) but doesn't import it.

**Solution:** Add the import from `./aiProvider`.

```typescript
// Update line 2 to include handleAIError
import { getUserGeminiKey, trackGeminiUsage, handleAIError } from './aiProvider';
```

---

## Fix 4: `src/lib/aiTailor.ts`

**Problem:** Uses `handleAIError` (lines 89, 124, 144, 168) but doesn't import it.

**Solution:** Add the import from `./aiProvider`.

```typescript
// Update line 2 to include handleAIError
import { getUserGeminiKey, trackGeminiUsage, handleAIError } from './aiProvider';
```

---

## Fix 5: `src/lib/careerPath.ts`

**Problem:** Uses `handleAIError` (line 67) but doesn't import it.

**Solution:** Add the import from `./aiProvider`.

```typescript
// Update line 3 to include handleAIError
import { getUserGeminiKey, trackGeminiUsage, handleAIError } from './aiProvider';
```

---

## Fix 6: `src/hooks/useAuth.test.tsx`

**Problem:** TypeScript error on lines 19-20 - spread arguments must have tuple type.

**Current Code:**
```typescript
onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
getSession: (...args: unknown[]) => mockGetSession(...args),
```

**Solution:** Remove the argument forwarding since the mock functions don't need them:

```typescript
onAuthStateChange: () => mockOnAuthStateChange(),
getSession: () => mockGetSession(),
```

---

## Files to Modify

| File | Line(s) | Change |
|------|---------|--------|
| `src/pages/Index.tsx` | 1-30 | Add imports for `AppLogo` and `Button` |
| `src/lib/agenticChat.ts` | 3 | Add `handleAIError` to existing import |
| `src/lib/aiAnalysis.ts` | 2 | Add `handleAIError` to existing import |
| `src/lib/aiTailor.ts` | 2 | Add `handleAIError` to existing import |
| `src/lib/careerPath.ts` | 3 | Add `handleAIError` to existing import |
| `src/hooks/useAuth.test.tsx` | 19-20 | Fix spread argument syntax |

---

## Expected Outcome

After these fixes:
- All missing imports will be resolved
- TypeScript compilation will succeed
- The app will build and run correctly
- The full user flow (landing page → create resume → editor) can be tested

