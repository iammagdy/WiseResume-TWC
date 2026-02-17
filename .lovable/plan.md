

## Fix Remaining User Flow Issues

### Overview
Six issues were identified during the user flow analysis. This plan addresses the 5 actionable ones (excluding the install banner per your earlier request).

---

### 1. Editor Tab Should Navigate to Most Recent Resume (Not Always Create)

**Problem:** When the user has 5 resumes but none is "actively selected" in the Zustand store, tapping Editor opens the Create dialog. This is confusing -- the user expects to edit their most recent resume.

**Fix in `src/components/layout/BottomTabBar.tsx`:**
- Import `useResumes` hook to access the user's resume list
- When `guarded && !currentResumeId`:
  - If user has resumes, navigate to `/resume/{mostRecentId}` (sorted by `updated_at`)
  - If user has zero resumes, navigate to `/dashboard?action=create` (current behavior)

---

### 2. Hide Application Tracking Zeros on Activity Page

**Problem:** The `JobActivityStatsCard` currently shows when `stats.applicationsSubmitted > 0 || stats.originals > 0`. Since the user has 2 originals, it renders -- but the "Application Tracking" section within it (0 Submitted, 0 Interviews, 0 Offers) is hollow and discouraging.

**Fix in `src/components/applications/JobActivityStats.tsx`:**
- Add a conditional check: only render the "APPLICATION TRACKING" grid row when `stats.applicationsSubmitted > 0 || stats.interviews > 0 || stats.offers > 0`
- The "RESUME ACTIVITY" section (2 Created, 3 Tailored) will still display since it has meaningful data

---

### 3. Unify Onboarding State Management

**Problem:** Two independent onboarding systems exist:
- `OnboardingPage.tsx` uses `localStorage('wr-onboarding-completed')`  
- `OnboardingCarousel` (in Dashboard) uses `profiles.onboarding_completed` from the database

If a user completes onboarding via one path, the other may still trigger.

**Fix in `src/pages/DashboardPage.tsx`:**
- In the `handleOnboardingComplete` callback, also set `localStorage.setItem('wr-onboarding-completed', 'true')` so both systems stay in sync
- This is a one-line addition to the existing function

---

### 4. Pass Onboarding Template to Create Dialog

**Problem:** When onboarding saves a template to localStorage, the dashboard opens the Create dialog but doesn't tell it which template was selected. The user's choice is lost.

**Fix in `src/pages/DashboardPage.tsx`:**
- Store the consumed template ID in a new state variable (e.g., `onboardingTemplateId`)
- Pass it as a prop to `CreateResumeDialog` so it can pre-select that template
- Clear the state after dialog closes

**Fix in `src/components/dashboard/CreateResumeDialog.tsx`:**
- Accept an optional `defaultTemplateId` prop
- If provided, pre-select that template in the creation flow

---

### 5. AI Studio: Add Inline Resume Creation Shortcut

**Problem:** When no resume is selected, clicking any AI tool shows a toast "Create or select a resume first" with no action button. The user must manually navigate away to create one.

**Fix in `src/pages/AIStudioPage.tsx`:**
- In the "no resume" context bar, add a "Create Resume" button alongside the existing "Select" button
- The "Create Resume" button navigates to `/dashboard?action=create`
- Alternatively, update the `requireResume` toast to include an action button: `toast.info('Create or select a resume first', { action: { label: 'Create', onClick: () => navigate('/dashboard?action=create') } })`

---

### Summary Table

| Fix | File(s) | Impact |
|-----|---------|--------|
| Editor tab navigates to most recent resume | `BottomTabBar.tsx` | Eliminates confusing Create dialog for existing users |
| Hide Application Tracking zeros | `JobActivityStats.tsx` | Cleaner Activity page for new users |
| Sync onboarding state | `DashboardPage.tsx` | Prevents double-onboarding |
| Pass template to Create dialog | `DashboardPage.tsx`, `CreateResumeDialog.tsx` | Onboarding choices are honored |
| AI Studio creation shortcut | `AIStudioPage.tsx` | Actionable path when no resume exists |

### Files Changed
- `src/components/layout/BottomTabBar.tsx`
- `src/components/applications/JobActivityStats.tsx`
- `src/pages/DashboardPage.tsx`
- `src/components/dashboard/CreateResumeDialog.tsx`
- `src/pages/AIStudioPage.tsx`
