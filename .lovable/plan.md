

## Fix: Username Uniqueness Check and URL Display

### Problem 1: Username Always Shows "Available" (Critical)
The username availability check queries the `profiles` table directly, but RLS policies only allow users to see their own profile row. This means when checking if another user already has a username, the query returns empty (blocked by RLS), so every username falsely appears as "Available."

### Problem 2: URL Display Format
The username field currently shows `wiseresume.lovable.app/p/` inline next to the input. The user wants:
- A label "Username" on top
- Below it: `wiseresume.lovable.app/p/` as a static prefix on its own line
- Then the username input field

### Solution

**1. Create a database function to check username availability (bypasses RLS safely)**

Create a new `check_username_available` RPC function with `SECURITY DEFINER` that:
- Accepts a username and the requesting user's ID
- Returns `true` if the username is not taken by any other user
- Returns `false` if another user already has that username
- Returns `true` if the requesting user already owns that username

```sql
CREATE OR REPLACE FUNCTION public.check_username_available(p_username text, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE username = lower(p_username)
      AND user_id != p_user_id
  );
END;
$$;
```

**2. Update `src/pages/ProfilePage.tsx`**

- Replace the direct Supabase query (lines 100-114) with a call to the new RPC function:
  ```typescript
  const { data } = await supabase.rpc('check_username_available', {
    p_username: username,
    p_user_id: user!.id,
  });
  setUsernameAvailable(data === true);
  ```

- Also update the username save logic in `handleSavePortfolio` to block saving if `usernameAvailable` is false (already done on line 502).

- Fix the URL display layout (lines 359-393): show the URL prefix `wiseresume.lovable.app/p/` on its own line above the input, not inline next to it.

**3. Add a save-time guard in `handleSavePortfolio`**

Before saving, do a final RPC check to prevent race conditions where two users try to claim the same username simultaneously. If the username was claimed in between, show an error toast and abort the save.

### Files to Change

| File | Change |
|------|--------|
| Database migration | Add `check_username_available` RPC function |
| `src/pages/ProfilePage.tsx` | Use RPC for availability check; fix URL prefix layout; add save-time guard |

