

## Fix Editor Tab Issues and Guest Resume Creation

### Problem Summary
Two issues identified through testing:

1. **Guest Resume Creation is Broken**: Clicking "Create" in the resume dialog fails silently because `createResume.mutateAsync` throws "Not authenticated" for guest users. Guests can never reach the editor to see the tabs.

2. **AI Assist Lock Icon**: When not logged in, the "AI Assist" buttons show a Lock icon instead of Sparkles. While functionally correct (auth-gated), the Lock icon feels restrictive and confusing. It should use Sparkles with reduced opacity instead, matching the overall AI branding.

3. **StepperNav Tabs**: The previous fix (opaque backgrounds, `flex-1 min-w-0`, `w-10 h-10` circles) is already applied and looks correct in code. Needs visual verification once the guest flow is fixed.

---

### Changes

#### 1. Fix Guest Resume Creation
**File: `src/components/dashboard/CreateResumeDialog.tsx`**

In `handleStartBlank`, add a guest fallback before the DB mutation. If `!user`, create a local-only resume using the zustand store with a UUID id, then navigate to `/editor` -- bypassing the database entirely.

```
// Before the existing DB call:
if (!user) {
  const guestId = uuidv4();
  setCurrentResumeId(guestId);
  setCurrentResume({
    id: guestId,
    contactInfo: { fullName: '', email: '', phone: '', location: '', linkedin: '' },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    templateId: 'modern',
  });
  onOpenChange(false);
  navigate('/editor');
  return;
}
```

This requires importing `uuidv4` (already a project dependency).

#### 2. Fix Editor Guest Redirect
**File: `src/pages/EditorPage.tsx`**

The stale-resume-ID check (lines 122-129) will incorrectly redirect guests because `useResume` returns no data when `!user`. Add a guard: only run the stale-ID redirect when the user is authenticated, so guests with local-only resumes are not kicked out.

Change the condition to:
```
if (user && currentResumeId && !isValidating && !resumeFromDb && resumeError) {
```

#### 3. Replace Lock Icon with Sparkles for Unauthenticated AI Assist
**File: `src/components/editor/InlineAIButton.tsx`**

Replace the Lock icon (line 111) with Sparkles but without the pulse animation, keeping the 60% opacity styling that already exists for unauthenticated state. This communicates "AI feature available but requires sign-in" without the negative "locked" feeling.

Change:
```
<Lock className="w-3.5 h-3.5" />
```
To:
```
<Sparkles className="w-3.5 h-3.5" />
```

Also remove the `Lock` import since it will no longer be used.

---

### Technical Notes

- The `uuid` package is already installed (v13.0.0) and used elsewhere in the codebase
- The zustand store uses `persist` middleware, so the guest resume will survive page refreshes via localStorage
- The guest is already limited to one resume by the `handleCreateNew` guard in DashboardPage (line 80-84)
- No database or migration changes needed
- 3 files modified total

