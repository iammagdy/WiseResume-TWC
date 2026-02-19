
# Full Navigation Audit — All Bugs Found & Fixed

## Complete Findings

After a thorough audit of every page, component, and navigation action across the entire app, here are all the bugs found:

---

## Bug 1 (Critical) — Dashboard "Edit" button goes to Detail page, not Editor

**File:** `src/pages/DashboardPage.tsx` — `handleEdit` function, line 222–225

**Problem:** When the user taps the "Edit" button from the `ResumeListCard` actions sheet, `handleEdit(resumeId)` is called. This function navigates to `/resume/${resumeId}` — the **Resume Detail page** (read-only view), NOT the editor. The user is forced to make an extra tap just to reach the editor.

```ts
// CURRENT — wrong destination for "Edit"
const handleEdit = (resumeId: string) => {
  haptics.light();
  navigate(`/resume/${resumeId}`);  // ← Goes to detail page, not editor
};
```

**Fix:** Load the resume into the store and navigate directly to `/editor`:

```ts
const handleEdit = (resumeId: string) => {
  haptics.light();
  const resume = resumes?.find(r => r.id === resumeId);
  if (resume) {
    setCurrentResumeId(resumeId);
    setCurrentResume(dbToResumeData(resume));
    navigate('/editor');
  }
};
```

Note: The **card tap** (`handleCardClick` in `ResumeListCard`) still correctly goes to `/resume/:id` — that detail page is the right destination for a tap (gives overview before editing). The "Edit" action button in the overflow sheet is what needs to go directly to `/editor`.

---

## Bug 2 (Critical) — "ATS Improve" button in ResumeListCard navigates to editor without loading resume

**File:** `src/components/dashboard/ResumeListCard.tsx` — `ATSScoreBreakdown onImprove` prop, line 316–319

**Problem:** The "Improve" button inside `ATSScoreBreakdown` navigates to `/editor?openTailor=1` without setting the resume in the store. If the current resume in the store is different or null, the editor opens to the wrong or empty resume.

```tsx
// CURRENT — no store update before navigating
onImprove={() => {
  haptics.medium();
  navigateToEditor(`/editor?openTailor=1`);  // ← No setCurrentResume call
}}
```

**Fix:** Load the specific resume into the store before navigating:

```tsx
onImprove={() => {
  haptics.medium();
  const { setCurrentResume: setResume, setCurrentResumeId: setId } = useResumeStore.getState();
  setId(resume.id);
  setResume(dbToResumeData(resume));
  navigateToEditor(`/editor?openTailor=1`);
}}
```

Since this is inside a `memo` component we can't call hooks conditionally, so we use `useResumeStore.getState()` to access the store imperatively inside the callback.

---

## Bug 3 (Medium) — TemplatesPage "Use This Template" navigates to editor with no resume in store

**File:** `src/pages/TemplatesPage.tsx` — `handleUseTemplate`, line 31–35

**Problem:** When a user taps "Use This Template" from the Templates page, it sets the template in the store and navigates to `/editor`. However, it does **not** check if there's a current resume loaded. If `currentResumeId` is null, the editor opens in a blank/create mode, which is confusing — the user just wanted to apply a template to their existing resume.

```ts
// CURRENT — goes to editor but may have no resume loaded
const handleUseTemplate = (id: TemplateId) => {
  setSelectedTemplate(id);
  updateResume({ templateId: id });  // updateResume with no currentResume is a no-op
  navigate('/editor');
};
```

**Fix:** Check if a resume is in the store. If yes, apply the template and go to editor. If not, navigate to dashboard with the `?action=create` flow (which opens the Create dialog):

```ts
const handleUseTemplate = (id: TemplateId) => {
  const { currentResumeId } = useResumeStore.getState();
  setSelectedTemplate(id);
  if (currentResumeId) {
    updateResume({ templateId: id });
    navigate('/editor');
  } else {
    // No resume selected — go to dashboard to create one with this template
    navigate('/dashboard?action=create');
    toast.info('Create a resume first, then apply this template from the editor.');
  }
};
```

Actually, looking at the flow again, `TemplatesPage` is a valid standalone browse page — users browse templates before they have a resume. The right fix is simpler: just navigate to dashboard to trigger resume creation when no resume exists, so the user can pick this template during setup.

---

## Bug 4 (Minor) — Dashboard Sign Out navigates to `/auth` instead of `/`

**File:** `src/pages/DashboardPage.tsx` — Profile popover "Sign Out" button, line 544–548

**Problem:** The Sign Out button in the profile popover directly calls `supabase.auth.signOut()` and navigates to `/auth`. The correct destination after sign-out is the landing page `/`, not the auth page. The `SettingsPage` `handleSignOut` correctly goes to `/`, but the Dashboard popover is inconsistent.

```tsx
// CURRENT — wrong destination after sign out  
onClick={async () => {
  haptics.warning();
  await supabase.auth.signOut();
  navigate('/auth');  // ← Should be '/'
}}
```

**Fix:** Navigate to `/` instead:

```tsx
onClick={async () => {
  haptics.warning();
  await supabase.auth.signOut();
  navigate('/');  // ← Correct: landing page
}}
```

---

## Summary Table

| # | Severity | File | Button/Action | Current Destination | Correct Destination |
|---|---|---|---|---|---|
| 1 | Critical | `DashboardPage.tsx` | "Edit" in card actions sheet | `/resume/:id` (detail page) | `/editor` (with resume loaded in store) |
| 2 | Critical | `ResumeListCard.tsx` | "Improve" in ATS score breakdown | `/editor?openTailor=1` (no store update) | `/editor?openTailor=1` (with this resume loaded) |
| 3 | Medium | `TemplatesPage.tsx` | "Use This Template" with no resume | `/editor` (empty/wrong resume) | `/dashboard?action=create` with toast |
| 4 | Minor | `DashboardPage.tsx` | "Sign Out" in profile popover | `/auth` | `/` |

---

## Files to Change

| File | What Changes |
|---|---|
| `src/pages/DashboardPage.tsx` | Fix `handleEdit` to load resume + navigate to `/editor`; Fix Sign Out to navigate to `/` |
| `src/components/dashboard/ResumeListCard.tsx` | Fix `onImprove` callback to load resume into store via `useResumeStore.getState()` before navigating |
| `src/pages/TemplatesPage.tsx` | Fix `handleUseTemplate` to guard against missing resume and redirect appropriately |

No database changes, no migrations, no new dependencies required.
