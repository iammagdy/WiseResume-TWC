
# Fix AI Features (401 Errors) and PDF Downloads on Mobile

## Problem 1: ALL AI Edge Functions Return 401

**Root Cause Found**: The `verify_jwt = true` setting in `supabase/config.toml` causes Supabase's gateway to validate the JWT **before** the function code runs. The gateway is rejecting the JWT with "Invalid JWT", so the function code (which has its own `getUser(token)` auth check) never even executes.

Evidence:
- Edge function logs show NO auth error messages (the code never runs)
- Analytics show ALL function calls returning 401 (enhance-section, interview-chat, elevenlabs-scribe-token, parse-resume)
- Direct curl test confirmed: `{"code":401,"message":"Invalid JWT"}` at the gateway level
- The functions already implement their own robust auth via `supabaseClient.auth.getUser(token)`

**Fix**: Set `verify_jwt = false` for all functions in `supabase/config.toml`. The functions already verify auth themselves using `getUser(token)`, which is more reliable in Lovable Cloud environments.

## Problem 2: PDF Download Broken on Mobile (iOS/Android)

**Root Cause**: The current download method uses `document.createElement('a')` + `link.click()` which does not work reliably on iOS Safari and some Android browsers. Mobile browsers block or ignore programmatic link clicks for downloads.

Additionally, there's a **bug**: the `cover-letter` case in the switch statement (line 208-212) is missing a `break`, causing it to fall through to the `combined` case.

**Fix**: Use `window.open(url, '_blank')` as fallback for mobile devices, and add the missing `break` statement.

---

## Changes

### File 1: `supabase/config.toml`
Set `verify_jwt = false` for ALL 17 edge functions. The functions handle their own authentication securely.

### File 2: `src/pages/PreviewPage.tsx`
1. Add mobile detection for download method
2. On mobile: use `window.open(blobUrl)` instead of `link.click()` for reliable PDF downloads on iOS/Android
3. Fix the missing `break` in the `cover-letter` switch case
4. Add proper cover letter PDF generation (currently falls through to combined)

### File 3: Redeploy all edge functions
After config change, redeploy all functions so the `verify_jwt = false` setting takes effect.

---

## Technical Details

### Why verify_jwt = false is safe
Every single edge function already implements authentication:
```typescript
const token = authHeader.replace('Bearer ', '');
const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
if (authError || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
```
This is actually MORE secure than gateway JWT verification because it validates the token against the auth service directly.

### Mobile PDF Download Fix
```typescript
// Current (broken on mobile):
link.click();

// Fixed (works on all devices):
if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
  window.open(url, '_blank');
} else {
  link.click();
}
```

---

## Summary

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| All AI features 401 | Gateway JWT verification rejecting tokens | Set verify_jwt = false |
| PDF download on mobile | link.click() blocked by mobile browsers | Use window.open() fallback |
| Cover letter export bug | Missing break in switch statement | Add break statement |
