

## Public Portfolio Feature -- Production Fixes

After thorough analysis, here are all the issues found and the fixes needed:

---

### Issue 1: Edge Function Auth Uses Non-Existent Method

The `generate-portfolio-bio` function calls `supabase.auth.getClaims(token)` which does not exist in the Supabase JS SDK. This causes silent auth failures.

**Fix**: Replace with `supabase.auth.getUser()` which is the standard method.

**File**: `supabase/functions/generate-portfolio-bio/index.ts`

---

### Issue 2: AI Model 404 Errors Don't Trigger Fallback

When a user has a custom Gemini API key, the system routes to Gemini directly. If the model returns a 404 (model not found), it throws with type `unknown` -- but the fallback logic only catches `quota_exceeded`, `rate_limit`, and `invalid_key`. So the request fails instead of falling back to the Lovable gateway.

**Fix**: Add `unknown` error type (specifically for non-4xx client errors) to the fallback conditions in `callAI`.

**File**: `supabase/functions/_shared/aiClient.ts`

---

### Issue 3: Selected Resume Not Persisted or Used

The "Source Resume" dropdown only affects AI bio generation in the current session. It resets on reload, and the public portfolio page always fetches the `is_primary` or most recent resume regardless of the user's selection.

**Fix**:
- Add a `portfolio_resume_id UUID` column to the `profiles` table
- Update the `get_public_portfolio` RPC to use this column (falling back to primary/most recent if null)
- Persist the selected resume ID when saving portfolio settings
- Update the "Source Resume" label to clarify it controls both the bio AND the portfolio content

**Files**: Database migration, `src/pages/ProfilePage.tsx`, `src/hooks/useProfile.ts`, `supabase/functions` RPC update

---

### Issue 4: Missing Error Boundary on Public Portfolio

The public portfolio page has no error boundary wrapping. If any component crashes, visitors see a blank white screen.

**Fix**: Wrap the page content in the existing `ErrorBoundary` component.

**File**: `src/pages/PublicPortfolioPage.tsx`

---

### Issue 5: Install Prompt Shows on Public Portfolio

External visitors to `/p/username` see the "Install WiseResume" banner, which is confusing for non-users viewing someone's portfolio.

**Fix**: Hide the `InstallPrompt` component when the current route starts with `/p/`.

**File**: `src/components/pwa/InstallPrompt.tsx`

---

### Issue 6: Empty Resume Silently Blocks Bio Generation

When the auto-selected resume has no summary/experience, clicking "AI Generate" does nothing visible (toast may be missed). Users don't understand why it fails.

**Fix**: Show an inline warning message below the Source Resume dropdown when the selected resume has no usable data, instead of only relying on a toast.

**File**: `src/pages/ProfilePage.tsx`

---

### Summary of Changes

| File | Change |
|------|--------|
| Database migration | Add `portfolio_resume_id` column to `profiles` |
| Database migration | Update `get_public_portfolio` RPC to use `portfolio_resume_id` |
| `supabase/functions/generate-portfolio-bio/index.ts` | Fix auth to use `getUser()` instead of `getClaims` |
| `supabase/functions/_shared/aiClient.ts` | Expand fallback logic for model 404 errors |
| `src/pages/ProfilePage.tsx` | Persist selected resume ID, add inline data warning |
| `src/hooks/useProfile.ts` | Add `portfolioResumeId` field |
| `src/pages/PublicPortfolioPage.tsx` | Wrap in ErrorBoundary |
| `src/components/pwa/InstallPrompt.tsx` | Hide on `/p/` routes |

