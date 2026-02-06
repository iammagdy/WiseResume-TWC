

# Fix Google OAuth Infinite Loading Issue

## Problem Analysis

When clicking "Continue with Google" and completing the OAuth flow, the button shows loading indefinitely. This happens because:

1. **No session check on page load**: After OAuth redirects back to the app, the AuthPage doesn't detect the existing session
2. **No redirect after successful auth**: The page doesn't navigate to dashboard when a session is detected
3. **Loading state not cleared**: The `socialLoading` state is only reset on error, not on successful redirect
4. **The lovable OAuth flow works correctly** - Based on the network logs, the user IS successfully authenticated (GET /auth/v1/user returns the user data), but the UI doesn't react to it

## Solution

Add a `useEffect` hook to detect authentication state and automatically redirect authenticated users to the dashboard.

## Implementation Details

### File: `src/pages/AuthPage.tsx`

Add session detection and redirect logic:

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function AuthPage() {
  const navigate = useNavigate();
  // ... existing state ...
  
  // NEW: Check auth state on mount and redirect if authenticated
  useEffect(() => {
    // Set up auth state listener to handle OAuth redirects
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          // User is authenticated, redirect to dashboard
          toast.success('Welcome!');
          navigate('/dashboard', { replace: true });
        }
      }
    );

    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard', { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);
  
  // ... rest of component ...
}
```

### Flow After Fix

```text
User clicks "Continue with Google"
        ↓
socialLoading = 'google' (button shows loading)
        ↓
OAuth popup/redirect to Google
        ↓
User authorizes
        ↓
Redirect back to /auth with tokens
        ↓
lovable.auth sets session via supabase.auth.setSession()
        ↓
onAuthStateChange fires with new session  ← NEW
        ↓
Navigate to /dashboard, show success toast  ← NEW
```

## Changes Summary

| Line | Change |
|------|--------|
| 1 | Add `useEffect` to imports |
| ~27 | Add useEffect hook to detect auth state and redirect |

## Why This Works

1. **onAuthStateChange listener** catches when the session is set after OAuth completes
2. **getSession check on mount** handles the case where the page is loaded with an existing session
3. **replace: true** prevents the user from navigating back to the auth page via browser back button
4. **Success toast** provides positive feedback that authentication worked

## Additional Improvement

Clear the loading state in a finally block if the user stays on the page (edge case):

```typescript
const handleGoogleSignIn = async () => {
  setSocialLoading('google');
  try {
    const { error, redirected } = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });

    if (error) {
      toast.error('Failed to sign in with Google');
    }
    // If redirected, the page will unmount so we don't need to reset state
    // If not redirected but successful, the onAuthStateChange will handle navigation
  } catch (e) {
    toast.error('Failed to sign in with Google');
  } finally {
    // Only reset if we didn't redirect (popup flow or error)
    // Give a short delay to allow onAuthStateChange to fire first
    setTimeout(() => {
      setSocialLoading(null);
    }, 2000);
  }
};
```

This timeout acts as a safety net - if something goes wrong and the auth listener doesn't fire within 2 seconds, the button becomes clickable again.

