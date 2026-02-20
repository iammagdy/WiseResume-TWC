
# Database & Wiring Cleanup: Remove Unnecessary Type Casts

## Findings

After auditing all routes, edge function calls, Supabase table references, deleted file imports, and lazy-loaded pages:

- All 38 edge functions have matching client-side invocations -- no orphaned or missing functions
- All 35+ route definitions in App.tsx resolve to existing lazy-loaded page files
- All previously deleted files (PortfolioQRDialog, useAIAnalytics, useSheetKeyboard, NavLink, dead UI components) have zero remaining imports -- no broken references
- All 78 Supabase-importing files use the safe client (`safeClient.ts`) -- zero raw `client.ts` imports

## Issues Found

The only wiring issues are **unnecessary `as any` type casts** on tables that exist in the generated `types.ts`. These casts suppress TypeScript's type checking, making bugs harder to catch at compile time.

| File | Table | Lines | Issue |
|---|---|---|---|
| `src/hooks/useResignationLetters.ts` | `resignation_letters` | 32, 49, 80, 111, 129 | 5 occurrences of `as any` cast -- table exists in types |
| `src/hooks/usePushNotifications.ts` | `push_subscriptions` | 98, 124 | 2 occurrences of `as any` cast -- table exists in types |
| `src/pages/AuthPage.tsx` | `profiles` | 194 | `(supabase.from('profiles') as any)` -- table exists in types |

## Plan

### File 1: `src/hooks/useResignationLetters.ts`
Remove all 5 `as any` casts from `.from('resignation_letters' as any)` to `.from('resignation_letters')`.

### File 2: `src/hooks/usePushNotifications.ts`
Remove both `as any` casts from `.from('push_subscriptions' as any)` to `.from('push_subscriptions')`.

### File 3: `src/pages/AuthPage.tsx`
Change `(supabase.from('profiles') as any).upsert(...)` to `supabase.from('profiles').upsert(...)`.

## Impact
- Zero functional changes -- only removes unnecessary type suppression
- Restores full TypeScript type safety on these 3 tables
- No new dependencies, no schema changes, no route changes
