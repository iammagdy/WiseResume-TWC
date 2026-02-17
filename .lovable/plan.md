

## Guest-to-User Data Migration Flow

### Overview
When a guest user signs in or signs up, any resume data they created locally (stored in the Zustand persist store under `localStorage["resume-storage"]`) should be automatically migrated to their authenticated account in the database.

### How Guest Data Works Today
- Guest resumes are created with a `uuidv4()` ID and stored only in the Zustand store (`resume-storage` localStorage key)
- The store holds `currentResume` (full ResumeData object) and `currentResumeId`
- No `guest_resumes` or `wise_resume_state` keys exist -- all guest data lives in `resume-storage`

### Changes

**1. New file: `src/hooks/useGuestMigration.ts`**

A custom hook that:
- Reads the Zustand `resume-storage` from localStorage on mount
- Checks if `currentResume` exists and `currentResumeId` is a local UUID (not from the DB)
- When a valid user session is provided, inserts the guest resume directly into the `resumes` table using the Supabase client (no edge function needed -- the client SDK with RLS handles this securely)
- On success: clears the Zustand store's `currentResume`/`currentResumeId`, shows a success toast
- Exposes `isMigrating: boolean` so the dashboard can gate the "Create New Resume" button
- Runs only once per sign-in (uses a ref to prevent duplicate migrations)

Why no edge function: The `resumes` table already has RLS policies allowing authenticated users to INSERT their own rows. The client SDK handles auth automatically, so an edge function would add unnecessary complexity. The resume data is small JSON -- no server-side processing needed.

**2. Modified: `src/pages/AuthPage.tsx`**

- Import and call `useGuestMigration(session)` after the auth state resolves
- The hook runs silently; no UI changes needed on the auth page itself
- Migration triggers after successful sign-in/sign-up before navigating to `/dashboard`

**3. Modified: `src/pages/DashboardPage.tsx`**

- Import `useGuestMigration` and call it with the current user
- Use the `isMigrating` flag to disable the "Create New Resume" / FloatingCreateButton while migration is in progress
- Once migration completes, the resumes query auto-refetches (via `queryClient.invalidateQueries`)

### Technical Details

**useGuestMigration hook logic:**

```text
1. Read localStorage['resume-storage'] -> parse JSON
2. Extract state.currentResume and state.currentResumeId
3. If no resume or user is null -> return { isMigrating: false }
4. Check: is currentResumeId a valid UUID that does NOT exist in the DB?
   (Simple heuristic: if the resumes query returns and doesn't include that ID, it's a guest resume)
5. Insert resume into DB via supabase.from('resumes').insert(...)
6. Clear Zustand store: setCurrentResume(null), setCurrentResumeId(null)
7. Invalidate 'resumes' query
8. Show toast: "Your draft resume has been saved to your account."
9. Set isMigrating = false
```

**Guard for "Create New Resume" button:**

```text
DashboardPage:
  const { isMigrating } = useGuestMigration(user);
  
  <FloatingCreateButton disabled={isMigrating} ... />
  <Button disabled={isMigrating} ... />
```

### Files Changed
- `src/hooks/useGuestMigration.ts` (new) -- migration hook
- `src/pages/DashboardPage.tsx` (modified) -- wire hook, gate create button
- `src/pages/AuthPage.tsx` (modified) -- trigger migration after sign-in

### Edge Cases Handled
- No guest data: hook is a no-op, isMigrating stays false
- Multiple resumes: only `currentResume` from the store is migrated (guests can only have one active resume)
- Migration failure: catches error, shows error toast, does not clear local data (preserves the draft)
- Already migrated: uses a sessionStorage flag to prevent re-running on the same session
- User signs out and back in: sessionStorage flag resets naturally

