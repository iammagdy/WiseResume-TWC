

# Fix Public Portfolio - Empty Resume Data Not Falling Back

## Problem

The public portfolio page shows the user's name and bio correctly, but skills, experience, and education sections are missing. The RPC `get_public_portfolio` has fallback logic that was added in a previous migration, but it does not work due to a PostgreSQL PL/pgSQL behavior: assigning `NULL` to a `record` variable (`v_resume := NULL`) does not properly reset the `IS NULL` check in PostgreSQL 17. As a result, the function returns the empty linked resume instead of falling back to a richer one.

## Root Cause

In the current RPC code:
```sql
v_resume := NULL;  -- This doesn't properly reset IS NULL for record types
...
IF NOT FOUND OR v_resume IS NULL THEN  -- v_resume IS NULL evaluates incorrectly
```

The `v_resume := NULL` assignment on a PL/pgSQL `record` type doesn't make `v_resume IS NULL` return `true` as expected. So the fallback never executes.

## Solution

Move the content check INTO the SQL WHERE clause so that an empty resume simply isn't selected. This avoids the problematic `record := NULL` pattern entirely:

```sql
-- Instead of: SELECT then check then nullify
-- Do: SELECT with content check in WHERE clause
IF v_profile.portfolio_resume_id IS NOT NULL THEN
  SELECT * INTO v_resume
  FROM public.resumes
  WHERE id = v_profile.portfolio_resume_id
    AND user_id = v_profile.user_id
    AND (
      jsonb_array_length(COALESCE(skills, '[]'::jsonb)) > 0
      OR jsonb_array_length(COALESCE(experience, '[]'::jsonb)) > 0
      OR jsonb_array_length(COALESCE(education, '[]'::jsonb)) > 0
    );
END IF;
```

When the linked resume has no content, `FOUND` will be `false` and `v_resume` will remain uninitialized (truly NULL). The existing fallback logic (`IF NOT FOUND OR v_resume IS NULL`) will then correctly select the primary or latest resume with data.

## Changes

| File | Change |
|------|--------|
| Database migration | Replace the `get_public_portfolio` RPC: remove the separate empty-check block (lines 83-90) and move the content filter into the WHERE clause of the linked resume SELECT (lines 76-81) |

The separate check block that tries to nullify `v_resume` will be removed entirely. Only one SELECT statement changes.
