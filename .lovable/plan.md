

## Public Portfolio -- Comprehensive Production Fix Plan

After thorough testing, here are all the remaining issues and the fixes required:

---

### Problem 1: Portfolio Page Shows No Resume Data

**Root Cause**: The user's `portfolio_resume_id` is NULL in the database, and no resume is marked as `is_primary`. The RPC falls back to the most recently updated resume, which happens to be an empty one ("Magdy Saber's Resume" with 0 experience, 0 education, 0 skills). The rich resumes with actual data exist but aren't being selected.

**Fix**: When saving portfolio settings on the Profile page, the `selectedResumeId` must be persisted. Currently the code sends `portfolioResumeId` in the update call, but the `updateProfile` mutation maps it correctly. The real issue is the user has never re-saved since the feature was added. However, there's a defensive fix needed: the `useEffect` that initializes `selectedResumeId` should also account for the profile having loaded but `portfolioResumeId` being null -- in that case, auto-save the first resume with actual data as the default.

**File**: `src/pages/ProfilePage.tsx` -- Update the initialization logic to prefer resumes that have content.

---

### Problem 2: Share Button Shares Text Instead of Portfolio URL

**Root Cause**: The "Share" button on the Profile page shares generic text ("Magdy Saber -- Professional, X resumes on WiseResume") instead of the actual portfolio URL when the portfolio is enabled.

**Fix**: When `portfolioEnabled` is true and `username` exists, the Share button should share the portfolio URL (`https://wiseresume.lovable.app/p/username`) instead of profile text. This makes the Share button actually useful.

**File**: `src/pages/ProfilePage.tsx` -- Update `handleShareProfile`

---

### Problem 3: Bio is Truncated in Database

**Root Cause**: The stored bio for user "magdy" is "Hi there! I'm Magdy Saber," -- it was cut short. This likely happened because the AI generation succeeded but the response was truncated due to low `maxTokens` (300) or the user saved a partial result.

**Fix**: Increase `maxTokens` from 300 to 500 in the edge function to ensure the full bio is always generated. Also add a soft warning on the Profile page if the bio appears incomplete (ends mid-sentence without punctuation).

**File**: `supabase/functions/generate-portfolio-bio/index.ts`

---

### Problem 4: Portfolio Page Missing Job Title

**Root Cause**: The portfolio page renders the job title from the profile, but the user's `job_title` field is NULL in the profiles table even though it exists in their resumes. The portfolio looks incomplete without it.

**Fix**: In the `get_public_portfolio` RPC, if the profile's `job_title` is NULL, fall back to extracting the most recent job title from the selected resume's experience array. This ensures the portfolio hero section always shows relevant professional identity.

**File**: Database migration to update the RPC function

---

### Problem 5: No "View My Portfolio" Quick Action

**Root Cause**: After enabling the portfolio, the only way to see it is by manually copying the URL and opening it in a new tab. There's no quick "Preview Portfolio" button.

**Fix**: Add a "Preview Portfolio" button in the portfolio URL section that opens the portfolio in a new browser tab. The existing external link icon button is too small and not labeled.

**File**: `src/pages/ProfilePage.tsx`

---

### Problem 6: Resume Selector Defaults to Empty Resume

**Root Cause**: The `useEffect` that initializes `selectedResumeId` picks the primary resume (none exists) or falls back to `resumes[0]` which is the most recently updated one -- but that resume is empty. The user's actual content-rich resumes are further down the list.

**Fix**: When auto-selecting a default resume, prioritize resumes that actually have content (summary or experience). Add a smart sorting function.

**File**: `src/pages/ProfilePage.tsx`

---

### Summary of All Changes

| File | Change |
|------|--------|
| `src/pages/ProfilePage.tsx` | Smart resume default selection (prefer resumes with data), share portfolio URL when enabled, add labeled "Preview" button |
| `supabase/functions/generate-portfolio-bio/index.ts` | Increase maxTokens to 500 |
| Database migration | Update `get_public_portfolio` RPC to fallback job title from resume experience |

### Technical Details

**Smart resume selection logic:**
```text
1. If profile has portfolioResumeId and it exists in resumes list -> use it
2. Else find first resume with summary OR experience.length > 0
3. Else find primary resume
4. Else use resumes[0]
```

**Share button logic:**
```text
if (portfolioEnabled && username) {
  share portfolio URL
} else {
  share profile text (current behavior)
}
```

**RPC job title fallback (pseudo-SQL):**
```text
If v_profile.job_title IS NULL AND resume has experience:
  Extract first experience entry's position as job_title
```

