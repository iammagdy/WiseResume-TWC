

# Fix Profile Data Persistence & Avatar Issues

## Problems Identified

### 1. Profile Row Doesn't Exist for User
**Root cause**: The database trigger `handle_new_user` should create a profile row when a user signs up, but it's not working correctly. When the `updateProfile` function tries to UPDATE, it affects 0 rows because the row doesn't exist.

The network logs show:
- `GET /profiles?user_id=...` returns `[]` (empty)
- `PATCH /profiles?user_id=...` returns `204` but updates nothing

### 2. No "Remove Avatar" Option
The current UI only has an upload button. Users can't clear their avatar once uploaded.

### 3. Google OAuth Data Not Pre-Filled
When signing in with Google, the user's name (`Magdy Saber`) from OAuth metadata isn't used to populate the profile. This data is available in `user.user_metadata.full_name`.

---

## Solution

### Step 1: Change UPDATE to UPSERT in useProfile Hook
Convert the profile `UPDATE` to an `UPSERT` operation so it creates the row if it doesn't exist.

**File:** `src/hooks/useProfile.ts`

Changes:
- Replace `.update()` with `.upsert()` and include `user_id` in the data
- This ensures profile rows are created on first save, even if the trigger failed
- Use `onConflict: 'user_id'` to merge updates properly

### Step 2: Pre-Fill Profile from OAuth Metadata on First Load
When fetching profile, if no row exists but user has `user_metadata`, auto-create the profile with that data.

**File:** `src/hooks/useProfile.ts`

Changes:
- If `fetchProfile` returns null but we have a `userId`, create the row with:
  - `full_name` from `user.user_metadata.full_name` or `user.user_metadata.name`
  - `avatar_url` from `user.user_metadata.avatar_url` (if Google provides one)
- Pass `user` object to the hook or access it within the hook

### Step 3: Add "Remove Avatar" Button
Add a visible option to remove/clear the avatar when one exists.

**File:** `src/components/settings/EditProfileSheet.tsx`

Changes:
- When `avatarUrl` is set, show a small "X" or "Remove" button overlaid on the avatar
- On click:
  - Set `avatarUrl` to `null`
  - Delete the file from storage: `supabase.storage.from('avatars').remove([fileName])`
  - Auto-save the null value to database

### Step 4: Fix the Database Trigger (if needed)
Ensure the trigger works for new users going forward.

**File:** Database migration

Changes:
- Verify the trigger exists and is functioning
- Consider adding the trigger again with `CREATE OR REPLACE`
- Alternatively, rely on the client-side UPSERT as the primary mechanism (more resilient)

---

## Implementation Details

### useProfile Hook Changes

```typescript
export function useProfile(userId: string | undefined, user?: User | null) {
  // ... existing state ...

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('...')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        // Existing profile found
        setProfile({...});
      } else {
        // No profile exists - create one with OAuth metadata
        const defaultProfile = {
          fullName: user?.user_metadata?.full_name || user?.user_metadata?.name || null,
          avatarUrl: user?.user_metadata?.avatar_url || null,
          jobTitle: null,
          // ... other fields null ...
        };
        
        // Create the row via upsert
        await supabase.from('profiles').upsert({
          user_id: userId,
          full_name: defaultProfile.fullName,
          avatar_url: defaultProfile.avatarUrl,
        }, { onConflict: 'user_id' });
        
        setProfile(defaultProfile);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [userId, user]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!userId) return;

    const dbUpdates = {
      user_id: userId, // Required for upsert
      // ... transform updates to db columns ...
    };

    const { error } = await supabase
      .from('profiles')
      .upsert(dbUpdates, { onConflict: 'user_id' });

    if (error) {
      toast.error('Failed to update profile');
      throw error;
    }

    setProfile((prev) => prev ? { ...prev, ...updates } : updates as Profile);
    toast.success('Profile updated');
  }, [userId]);

  return { profile, loading, updateProfile };
}
```

### Remove Avatar UI

```text
Current:                    New:
+----------------+          +----------------+
|    [Avatar]    |          |    [Avatar]    |
|       📷      |          |    📷    ❌   |
+----------------+          +----------------+
                            (X appears when avatar exists)
```

Add a new button that:
1. Calls `supabase.storage.from('avatars').remove([path])`
2. Sets `avatarUrl` to `null` in local state
3. Calls `onSave({ avatarUrl: null })` to persist

### SettingsPage Update
Pass the `user` object to `useProfile` hook:

```typescript
const { profile, loading: profileLoading, updateProfile } = useProfile(user?.id, user);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useProfile.ts` | UPSERT instead of UPDATE, auto-create from OAuth |
| `src/pages/SettingsPage.tsx` | Pass user to useProfile hook |
| `src/components/settings/EditProfileSheet.tsx` | Add "Remove Avatar" button |

---

## Expected Results

1. **Avatar reflects immediately** after upload (already works, but now persists)
2. **Profile data saves correctly** even for users without a pre-existing row
3. **New users see their name** pre-filled from Google OAuth
4. **Users can remove their avatar** with a visible button
5. **No silent failures** - UPSERT ensures the row always exists

---

## User Flow After Fix

```text
User signs in with Google
         ↓
App checks for profile row
         ↓
Row doesn't exist? → Create it with OAuth metadata (name, avatar)
         ↓
User sees their name pre-filled ✓
         ↓
User uploads/removes avatar → UPSERT saves immediately ✓
         ↓
Settings page always shows current data ✓
```

