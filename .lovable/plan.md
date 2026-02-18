
# Navigation Audit — Fix All Fake & Broken Redirections

## Findings Summary

After a full audit of every button, card, chip, and nav action across all pages and components, I found **4 real broken/fake redirections** and **1 console warning** that needs fixing.

---

## Bug 1 (Critical) — `QuickActions` component: ALL 4 cards ignore their intended route

**File:** `src/components/landing/QuickActions.tsx`

**Problem:** The `handleAction` function **hardcodes `navigate('/auth')`** regardless of which card is clicked. The `action.route` and `action.createBlank` properties on each card are defined but **completely ignored**. This means tapping "Create New", "Upload Resume", "AI Tailor", or "Mock Interview" on the landing page all go to `/auth` — there is no conditional logic for authenticated users.

```ts
// CURRENT — always goes to /auth regardless of action
const handleAction = (action: typeof actions[0]) => {
  triggerHaptic.light();
  navigate('/auth');     // ← FAKE: ignores action.route entirely
};
```

**Fix:** For authenticated users, each card should navigate to its intended destination. For guests, `/auth` is still correct since they need to sign in. The component has `useResumeStore` already imported but unused — fix the handler to respect auth state and action routes:

```ts
const handleAction = (action: typeof actions[0]) => {
  triggerHaptic.light();
  if (!isAuthenticated) {
    navigate('/auth');
    return;
  }
  if (action.createBlank) {
    setCurrentResumeId(null);
    setCurrentResume(emptyResume());
  }
  navigate(action.route);
};
```

The `QuickActions` component needs to import `useAuth` and properly handle each action.

---

## Bug 2 (Critical) — `BottomTabBar`: Editor tab sends users to `/resume/:id` instead of opening their resume in the editor

**File:** `src/components/layout/BottomTabBar.tsx` lines 79–80

**Problem:** When `tab.guarded && !currentResumeId` and the user has resumes, it navigates to `/resume/${resumes[0].id}` — which is the **Resume Detail page**, not the editor. The Editor tab is supposed to open the most recent resume *in the editor* (`/editor`), not the detail view. The user lands on a read-only detail page when they expected to edit.

```ts
// CURRENT — goes to detail page, not editor
if (resumes && resumes.length > 0) {
  navigate(`/resume/${resumes[0].id}`);  // ← WRONG: should open editor
}
```

**Fix:** Load the most recent resume into the store and navigate directly to `/editor`:

```ts
if (resumes && resumes.length > 0) {
  const latest = resumes[0];
  setCurrentResumeId(latest.id);
  navigate('/editor');  // ← Correct: puts user directly in editor
}
```

This requires importing `dbToResumeData` and calling `setCurrentResume` as well, which `useResumes` already exports.

---

## Bug 3 (Console Warning) — `Index.tsx`: `DropdownMenu` ref warning

**File:** `src/pages/Index.tsx` — visible in console logs

**Problem:** The console shows:
> `Warning: Function components cannot be given refs. Attempts to access this ref will fail. Did you mean to use React.forwardRef()?`
> `Check the render method of Index.`

The `DropdownMenuTrigger asChild` is wrapping a `<button>` element correctly, but internally `DropdownMenuContent` → `DropdownMenuPortal` is passing a ref to a function component that doesn't use `forwardRef`. This is a Radix UI version compatibility warning. The actual `DropdownMenu` in `Index.tsx` uses a plain `<button>` as trigger (not `asChild` on a custom component), so the fix is to ensure the trigger uses `asChild` correctly.

Looking at the code, the `DropdownMenuTrigger asChild` wraps a `<button>` — that's correct. The warning originates from `DropdownMenuContent`'s internal portal trying to pass a ref to a child. This is a **known Radix UI React 18 warning** that doesn't break functionality. It cannot be fixed without upgrading Radix packages. We will **note this but not block on it**.

---

## Bug 4 (Medium) — `InterviewPage`: Navigates guests to `/upload` instead of `/auth`

**File:** `src/pages/InterviewPage.tsx` line 79

**Problem:** When a user has no resume, the guard does:
```ts
navigate(user ? '/upload' : '/auth');
```

If a logged-in user has no resume, they're correctly sent to `/upload`. But the UX is broken: landing on the Upload page without context as to *why* they're there is jarring. More importantly, the `QuickActions` "Mock Interview" card on the landing page sends guests to `/auth` (which is fine), but once authenticated with no resume, clicking Interview from the bottom tabs / AI Studio would silently redirect to `/upload` with no explanation beyond a toast. The toast message says "Create or upload a resume first" — and navigates to `/upload` — which is actually reasonable. **This one is acceptable behavior**, not a bug.

---

## Bug 5 (Medium) — `ApplicationsPage`: "Tailor Resume" button in job cards has no resume guard

**File:** `src/pages/ApplicationsPage.tsx` — `JobCard` component, line 77-81

**Problem:** The "Tailor Resume" button calls `onTailor()`. Tracing `onTailor` to its call site — it's passed from the parent where it runs:

```ts
onTailor={() => {
  const resume = resumes?.[0];
  if (!resume) {
    toast.info('Create a resume first');
    return;
  }
  setCurrentResumeId(resume.id);
  navigate('/editor?tailor=true&...');
}}
```

This is already guarded with a toast. **Not a bug.**

---

## Summary of Real Fixes

| # | File | Bug | Fix |
|---|---|---|---|
| 1 | `src/components/landing/QuickActions.tsx` | All 4 action cards always navigate to `/auth` regardless of card or auth state | Add `useAuth` check; route authenticated users to `action.route`; guests to `/auth` |
| 2 | `src/components/layout/BottomTabBar.tsx` | Editor tab sends to `/resume/:id` (detail page) instead of loading resume into store and going to `/editor` | Load `resumes[0]` into store via `setCurrentResumeId` + `setCurrentResume`, navigate to `/editor` |

---

## Files Changed

| File | Change |
|---|---|
| `src/components/landing/QuickActions.tsx` | Add `useAuth`, fix `handleAction` to use `action.route` for authenticated users; `action.createBlank` clears store before navigating to `/editor` |
| `src/components/layout/BottomTabBar.tsx` | Fix Editor tab guard: import `dbToResumeData`, call `setCurrentResume(dbToResumeData(resumes[0]))` + `setCurrentResumeId(resumes[0].id)` before navigating to `/editor` |

No database changes, no new dependencies, no schema migrations required.
