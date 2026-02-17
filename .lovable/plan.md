

## Unlimited Credits for BYOK (Bring Your Own Key) Users

### Problem
Currently, all users -- whether using WiseResume AI or their own Gemini API key -- share the same 20/day credit limit. When a user provides their own API key, they're paying for their own API usage, so imposing a credit limit is unnecessary and frustrating.

### Solution
When the AI provider is set to `gemini` with a validated key, treat credits as **unlimited**:
- Skip the credit check (`checkCredits` always returns `true`)
- Skip incrementing the `ai_credits` counter (`incrementUsage` becomes a no-op)
- Still log every action to `ai_usage_logs` so the user can see their history
- Display an infinity symbol instead of "X / 20" in the UI

### Changes

**1. `src/hooks/useAICredits.ts`** -- Provider-aware credit logic

- `useAICredits()`: When provider is `gemini` with a validated key, return `daily_limit: Infinity` so the UI knows it's unlimited
- `checkCredits()`: Immediately return `true` when using own key (no limit enforcement)
- `incrementUsage()`: Skip the `increment_ai_usage` RPC when using own key (don't burn credits), but still allow usage logging to happen elsewhere

**2. `src/components/ai/CreditRing.tsx`** -- Show infinity symbol

- When `limit` is `Infinity`, render an infinity symbol instead of the usage number and show a full/static ring in primary color

**3. `src/components/ai/CreditUsageSheet.tsx`** -- Unlimited display

- When limit is `Infinity`, show "Unlimited" instead of "X / 20"
- Hide the "Resets in..." timer (irrelevant for BYOK users)
- Still show the full activity history (credited + background)

**4. `src/components/editor/ai/AICreditsIndicator.tsx`** -- Infinity badge

- When limit is `Infinity`, show an infinity symbol instead of the ring counter

### What Stays the Same

- `ai_usage_logs` entries are still created by edge functions via `recordUsage()` -- history is preserved
- Background vs credited activity distinction still works
- Switching back to WiseResume AI re-enables the 20/day limit
- The activity timeline in `CreditUsageSheet` continues to show all actions

### Technical Details

| File | Change |
|------|--------|
| `src/hooks/useAICredits.ts` | Import `useSettingsStore`; in `useAICredits`, return `daily_limit: Infinity` when gemini+validated; in `checkCredits`, short-circuit to `true`; in `incrementUsage`, skip RPC |
| `src/components/ai/CreditRing.tsx` | Handle `limit === Infinity`: render static ring with infinity symbol |
| `src/components/ai/CreditUsageSheet.tsx` | Show "Unlimited" text and hide reset timer when limit is Infinity |
| `src/components/editor/ai/AICreditsIndicator.tsx` | Show infinity icon when limit is Infinity |

