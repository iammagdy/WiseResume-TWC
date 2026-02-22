

# Fix Public Portfolio - 3 Issues

## Issue 1: Name Invisible in Hero Section

**Root Cause**: The `.pf-hero-ambient` div has `position: absolute; inset: 0; z-index: 0` with a fully opaque dark gradient covering the entire hero area. Elements with CSS `animation` classes (badges, location, buttons) implicitly create stacking contexts and render above this overlay. The avatar has `relative z-10`. But the `h1` (name) has NO positioning and NO animation class, so it renders BEHIND the opaque ambient overlay and is invisible.

**Fix**: Add `relative z-[1]` to the h1 element so it renders above the ambient layer.

| File | Change |
|------|--------|
| `src/pages/PublicPortfolioPage.tsx` (line 497) | Add `relative z-[1]` to the h1 className |

## Issue 2: Portfolio Shows No Skills/Experience/Education

**Root Cause**: The user's `portfolio_resume_id` points to resume `e769fdd4` which has 0 skills, 0 experience, 0 education. The RPC `get_public_portfolio` finds this resume (it exists), so it never falls through to the fallback logic that would pick a resume with actual data. The user has 6 other resumes with rich data.

**Fix**: Update the RPC to check if the linked resume has any meaningful content (at least one of: skills, experience, or education non-empty). If the linked resume is empty, fall through to the primary/latest resume.

| File | Change |
|------|--------|
| Database migration (RPC update) | Add a check after fetching the linked resume: if skills, experience, and education are all empty arrays, treat it as "not found" and fall through to the next resume |

The updated RPC logic (after line 74 in the current function):

```text
-- After fetching portfolio_resume_id resume, check if it has meaningful data
IF v_resume IS NOT NULL THEN
  IF (v_resume.skills IS NULL OR jsonb_array_length(COALESCE(v_resume.skills, '[]'::jsonb)) = 0)
     AND (v_resume.experience IS NULL OR jsonb_array_length(COALESCE(v_resume.experience, '[]'::jsonb)) = 0)
     AND (v_resume.education IS NULL OR jsonb_array_length(COALESCE(v_resume.education, '[]'::jsonb)) = 0) THEN
    v_resume := NULL;  -- Treat as not found, fall through to primary/latest
  END IF;
END IF;
```

## Issue 3: Splash Screen Still Shows on Public Portfolio

**Status**: The code fix from the previous session IS in place (lines 135-137, 152 in App.tsx). The splash screen appeared during my testing because the browser session had `hasSeenSplash = false` in Zustand store. For a completely fresh visitor, the `isPublicStandalone` check should prevent the splash. This fix is already working correctly.

However, I verified it shows the splash briefly before Zustand hydrates. To make this bulletproof, we should also check `window.location.pathname` directly (not just `location.pathname` from React Router) as a synchronous guard before Zustand even loads.

**Fix**: The current implementation already uses `location.pathname` from `useLocation()` which is available synchronously within the Router. This should work. No additional changes needed unless the splash is still appearing for the user.

## Summary of Changes

| # | File | Change |
|---|------|--------|
| 1 | `src/pages/PublicPortfolioPage.tsx` | Add `relative z-[1]` to h1 className (line 497) |
| 2 | Database migration | Update `get_public_portfolio` RPC to skip empty linked resumes |

