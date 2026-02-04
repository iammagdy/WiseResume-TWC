

# Critical Bug Fix: Invalid Hook Call Error

## Problem Identified

The app is experiencing a **"Invalid hook call"** error that breaks the entire application:

```
Warning: Invalid hook call. Hooks can only be called inside of the body of a function component.
```

The error occurs in `OfflineBanner` → `useNetworkStatus` and prevents the Auth page (and likely all pages using `MobileLayout`) from rendering.

### Root Cause Analysis

After investigating the console logs and code:

1. **Stale Cache/HMR Issue**: The error line numbers don't match the actual source code (error says line 3, but `useState` is on line 9 of `useNetworkStatus.ts`). This indicates a bundler cache mismatch.

2. **Potential Module Initialization Order**: The `src/integrations/lovable/index.ts` imports `supabase` client at the top level and calls `createLovableAuth({})` at module load time, which could cause issues during HMR.

---

## Fix Plan

### Step 1: Fix the Lovable Auth Initialization (Safety Check)

**File: `src/integrations/lovable/index.ts`**

Move the `createLovableAuth` call to be lazy-loaded to avoid any potential module initialization issues:

```typescript
// src/integrations/lovable/index.ts
import { createLovableAuth } from "@lovable.dev/cloud-auth-js";
import { supabase } from "../supabase/client";

// Lazy initialization to avoid module load issues
let lovableAuthInstance: ReturnType<typeof createLovableAuth> | null = null;

function getLovableAuth() {
  if (!lovableAuthInstance) {
    lovableAuthInstance = createLovableAuth({});
  }
  return lovableAuthInstance;
}

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: "google" | "apple", opts?: SignInOptions) => {
      const lovableAuth = getLovableAuth();
      const result = await lovableAuth.signInWithOAuth(provider, {
        redirect_uri: opts?.redirect_uri,
        extraParams: {
          ...opts?.extraParams,
        },
      });

      if (result.redirected) {
        return result;
      }

      if (result.error) {
        return result;
      }

      try {
        await supabase.auth.setSession(result.tokens);
      } catch (e) {
        return { error: e instanceof Error ? e : new Error(String(e)) };
      }
      return result;
    },
  },
};
```

### Step 2: Ensure `useNetworkStatus` is Properly Exported

**File: `src/hooks/useNetworkStatus.ts`**

The hook looks correct, but let's ensure proper exports:

```typescript
// No changes needed - hook is properly implemented
```

### Step 3: Clear Vite Cache and Rebuild

After making changes, the Vite cache will automatically rebuild. This should resolve any stale bundle issues.

---

## After Fix: Testing Plan

Once the bug is fixed, we can properly test:

### Test 1: CV Import Flow
1. Navigate to `/upload`
2. Upload a PDF resume
3. Verify the parsing progress steps work correctly
4. Check that the resume data appears in the editor

### Test 2: AI Tailor Feature
1. Navigate to `/editor` with a resume loaded
2. Open the Tailor Sheet
3. Paste a job description or URL
4. Click "Tailor My Resume"
5. Verify the AI tailoring process completes
6. Review and apply changes

---

## Technical Details

### Files to Modify

| File | Change |
|------|--------|
| `src/integrations/lovable/index.ts` | Lazy-load `createLovableAuth` to prevent module initialization issues |

### Why This Fix Works

1. **Lazy Initialization**: By deferring `createLovableAuth()` until the first actual use, we avoid any potential race conditions during Vite's HMR or initial module loading.

2. **Cache Reset**: Any code changes will trigger Vite to rebuild the affected modules, clearing stale cache.

3. **No Breaking Changes**: The API surface (`lovable.auth.signInWithOAuth`) remains identical.

---

## Success Criteria

After implementation:
- Auth page loads without console errors
- All pages using `MobileLayout` render correctly  
- Google/Apple sign-in buttons work
- Upload page allows PDF import
- Tailor feature functions end-to-end

