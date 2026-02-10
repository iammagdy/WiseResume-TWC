

# Full Security Audit -- Findings and Fix Plan

## Audit Summary

Reviewed all 17 edge functions, 3 database tables, and 10 RLS policies. Here are the findings:

---

## Finding 1: THREE Edge Functions Missing Authentication (HIGH)

The following backend functions can be called by **anyone on the internet** without logging in, consuming your AI credits:

| Function | Risk |
|----------|------|
| `explain-gap` | Unauthenticated users can generate gap explanations (AI credit abuse) |
| `detect-and-humanize` | Unauthenticated users can run AI detection/humanization (AI credit abuse) |
| `one-page-optimizer` | Unauthenticated users can run one-page optimization (AI credit abuse) |

**All other 14 functions** already have proper authentication.

### Fix
Add the standard authentication block to each of these 3 functions:
- Import `createClient` from Supabase
- Extract the `Authorization` header
- Verify the token with `supabase.auth.getUser(token)`
- Return 401 if unauthorized
- Add input size validation (consistent with the other functions)

No frontend changes needed -- all 3 functions are already called via `supabase.functions.invoke()`, which automatically sends the user's auth token.

---

## Finding 2: RLS Scanner False Positives (NO ACTION)

The scanner flagged `profiles`, `resumes`, and `ai_usage_logs` as "publicly readable." This is a **false positive**. All 3 tables have RESTRICTIVE policies with `auth.uid() = user_id`, which correctly restricts access to the row owner only. Unauthenticated requests return zero rows because `auth.uid()` evaluates to NULL. These scanner findings will be dismissed.

---

## Finding 3: Leaked Password Protection (MANUAL)

This requires toggling a setting in Cloud UI (cannot be fixed via code). Already discussed in previous message.

---

## Files Modified (3 edge functions)

| File | Change |
|------|--------|
| `supabase/functions/explain-gap/index.ts` | Add auth check + input size validation |
| `supabase/functions/detect-and-humanize/index.ts` | Add auth check + input size validation |
| `supabase/functions/one-page-optimizer/index.ts` | Add auth check + input size validation |

## Security Findings Management

- **Dismiss** the 3 false-positive "publicly readable" findings from the scanner
- **Delete** findings after fixing the 3 unauthenticated edge functions

