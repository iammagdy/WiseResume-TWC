

# Database Logic, Edge Function Wiring, and Social Auth Audit

## Issues Found

### Issue 1: Missing Edge Functions in `config.toml` (Critical)

Four edge functions exist as code but are NOT registered in `supabase/config.toml`, meaning they will fail to deploy:

| Missing Function | Purpose |
|---|---|
| `send-bug-report` | Saves bug reports to DB + emails developer |
| `send-resume-reminder` | Sends stale-resume notification reminders |
| `weekly-digest` | Sends weekly career digest notifications |
| `company-briefing` | AI company research briefing (recently added) |

**Fix:** Add all four entries to `supabase/config.toml` with `verify_jwt = false`.

---

### Issue 2: Incomplete CORS Headers in Legacy Functions (Medium)

Two functions use an **outdated, shorter** CORS `Access-Control-Allow-Headers` list that is missing the `x-supabase-client-*` headers. This can cause preflight failures on newer Supabase client versions:

| Function | Current Headers |
|---|---|
| `send-resume-reminder` | `authorization, x-client-info, apikey, content-type` (missing 4 headers) |
| `weekly-digest` | `authorization, x-client-info, apikey, content-type` (missing 4 headers) |

Both also use the deprecated `serve()` import from `deno.land/std` instead of `Deno.serve()`.

**Fix:** Update both functions to use the full CORS header set and `Deno.serve()`.

---

### Issue 3: `track-portfolio-view` Short Link Increment Uses Broken RPC (Low)

Lines 133-136 in `track-portfolio-view/index.ts` attempt to call `supabase.rpc("increment_short_link_count")` inside an `.update()` call. This RPC does not exist in the database, so it always fails and falls back to a read-modify-write pattern which has a race condition.

**Fix:** Remove the broken RPC call and use the existing read-modify-write fallback directly, or add a proper SQL `UPDATE short_links SET click_count = click_count + 1 WHERE id = p_link_id` statement.

---

### Issue 4: No `/auth/callback` Route for APK Social Auth (Critical for Mobile)

`socialAuth.ts` redirects native (non-Lovable) builds to `/auth/callback` after Google/Apple sign-in. However:
- There is NO `/auth/callback` route defined in `App.tsx`
- The app has no `AuthCallback` page component

This means on the APK build, after a user signs in with Google or Apple, they will land on a 404 page. The OAuth flow will technically set the session via URL hash tokens, but the user will see a blank/error page instead of being redirected to the dashboard.

**Fix:** Create a lightweight `/auth/callback` route that reads the session from the URL hash and redirects to `/dashboard`.

---

### Issue 5: `og-image` and `portfolio-meta` Use Short CORS Headers (Low)

These two functions use `authorization, x-client-info, apikey, content-type` instead of the full set. While these are primarily consumed by crawlers/browsers (not the Supabase client), updating them for consistency prevents future issues.

**Fix:** Update CORS headers to the full set.

---

## Implementation Steps

### Step 1: Register Missing Functions in config.toml

Add these four entries:
```text
[functions.send-bug-report]
verify_jwt = false

[functions.send-resume-reminder]
verify_jwt = false

[functions.weekly-digest]
verify_jwt = false

[functions.company-briefing]
verify_jwt = false
```

### Step 2: Fix CORS and Runtime in Legacy Functions

Update `send-resume-reminder/index.ts` and `weekly-digest/index.ts`:
- Replace `import { serve }` with `Deno.serve()`
- Add full CORS header set including the four `x-supabase-client-*` headers

### Step 3: Fix Short Link Click Tracking

In `track-portfolio-view/index.ts`, replace the broken RPC + fallback pattern (lines 132-153) with a direct increment:
```typescript
await supabaseClient
  .from("short_links")
  .update({ click_count: supabaseClient.rpc(...) }) // REMOVE THIS
```
Replace with a simple read-increment-write or a raw SQL increment via the service client.

### Step 4: Create Auth Callback Route for APK Builds

Create `src/pages/AuthCallbackPage.tsx`:
- On mount, call `supabase.auth.getSession()` to pick up tokens from the URL hash
- Redirect to `/dashboard` on success, `/auth` on failure
- Show a brief loading spinner during the redirect

Register the route in `App.tsx` as a public route:
```typescript
<Route path="/auth/callback" element={<AuthCallbackPage />} />
```

### Step 5: Update Remaining CORS Headers

Update `og-image/index.ts` and `portfolio-meta/index.ts` to use the full CORS header set for consistency.

---

## Social Auth on APK Summary

| Aspect | Status |
|---|---|
| Lovable domain detection | Working -- correctly routes to `lovable.auth.signInWithOAuth` |
| APK/non-Lovable detection | Working -- correctly routes to `supabase.auth.signInWithOAuth` |
| `skipBrowserRedirect: true` | Correct for native in-app browser |
| OAuth URL validation | Correct (checks hostname) |
| Redirect URL after OAuth | **Broken** -- `/auth/callback` route does not exist |
| Capacitor deep linking | Not configured for OAuth callback URLs (should add `capacitor://localhost/auth/callback` and `https://localhost/auth/callback` to allowed redirect URLs in backend auth settings) |

