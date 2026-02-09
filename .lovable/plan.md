
# Fix "Failed to Enhance Content" Error in AI Features

## Problem Summary

Three edge functions are using a non-existent authentication method `supabase.auth.getClaims(token)` instead of the correct `supabase.auth.getUser(token)`. This causes authentication to fail silently and return "Unauthorized" errors.

## Root Cause

```typescript
// BROKEN (method doesn't exist)
const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);
if (authError || !claimsData?.claims) { ... }
const userId = claimsData.claims.sub;

// CORRECT (standard Supabase method)
const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
if (authError || !user) { ... }
const userId = user.id;
```

## Edge Functions to Fix

| Function | Line | Current (Broken) | Fix To |
|----------|------|------------------|--------|
| `enhance-section/index.ts` | 153-161 | `getClaims(token)` | `getUser(token)` |
| `analyze-resume/index.ts` | 35-44 | `getClaims(token)` | `getUser(token)` |
| `tailor-resume/index.ts` | 35-44 | `getClaims(token)` | `getUser(token)` |

## Implementation

### 1. Fix enhance-section/index.ts (Lines 152-162)

Replace:
```typescript
const token = authHeader.replace('Bearer ', '');
const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);
if (authError || !claimsData?.claims) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
const userId = claimsData.claims.sub;
```

With:
```typescript
const token = authHeader.replace('Bearer ', '');
const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
if (authError || !user) {
  console.error('Auth error:', authError);
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
const userId = user.id;
```

### 2. Fix analyze-resume/index.ts (Lines 34-44)

Same pattern - replace `getClaims(token)` with `getUser(token)`.

### 3. Fix tailor-resume/index.ts (Lines 34-44)

Same pattern - replace `getClaims(token)` with `getUser(token)`.

## Verification

After these fixes, the following AI features will work correctly:
- AI Enhance (summary, experience, skills, etc.)
- Resume Analysis 
- Resume Tailoring
- Career Path Advisor (already working)
- Wise AI Agentic Chat (already working)

## Technical Notes

- `getUser(token)` validates the JWT and returns the full user object
- The user ID is accessed via `user.id` instead of `claimsData.claims.sub`
- Adding `console.error('Auth error:', authError)` helps with debugging
- No changes needed to the frontend code - it's already using `supabase.functions.invoke` correctly

## Summary

| Task | File | Effort |
|------|------|--------|
| Fix auth method | `enhance-section/index.ts` | 1 min |
| Fix auth method | `analyze-resume/index.ts` | 1 min |
| Fix auth method | `tailor-resume/index.ts` | 1 min |
| Deploy and test | - | 2 min |
