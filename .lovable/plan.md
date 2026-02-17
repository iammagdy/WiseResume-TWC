

## Fix Remaining UI/UX Bugs and Flow Issues

### Overview

The previous round of improvements introduced good structural changes, but left several bugs and gaps unfixed. This plan addresses 4 concrete issues found during the flow analysis.

---

### 1. Dashboard Does Not Auto-Open Create Dialog from `?action=create`

**Problem:** The Editor tab in the bottom nav redirects to `/dashboard?action=create` when no resume is active, but the Dashboard page never reads this query parameter. The create dialog does not open -- the user just lands on the dashboard with nothing happening.

**Fix in `src/pages/DashboardPage.tsx`:**
- Import `useSearchParams` from `react-router-dom`
- On mount, check for `action=create` query param
- If present, call `setShowCreateDialog(true)` and clear the param from the URL to prevent re-triggering on refresh

---

### 2. Landing Page "AI Recruiters" Chip Links to `/auth` for All Users

**Problem:** The "4 AI Recruiters" bonus chip on the landing page always navigates to `/auth`. For already-authenticated users, this causes a confusing redirect loop (auth page detects session and bounces to dashboard).

**Fix in `src/pages/Index.tsx`:**
- Change the `bonusChips` array to use dynamic href based on auth state
- For "4 AI Recruiters": use `/ai-studio` when authenticated, `/auth` when not
- For "12 Templates": use `/templates` when authenticated, `/auth` when not

---

### 3. Onboarding Selections Are Never Used

**Problem:** The onboarding flow saves `wr-onboarding-goal` and `wr-onboarding-template` to localStorage but the dashboard never reads them. A user who picks "Land a new job" and selects the "Modern" template during onboarding arrives at an empty dashboard with no follow-through.

**Fix in `src/pages/DashboardPage.tsx`:**
- After onboarding completes (in `handleOnboardingComplete`), check localStorage for `wr-onboarding-template`
- If a template was selected, auto-open the create dialog with that template pre-selected
- Clear the localStorage keys after consumption so they don't re-trigger

---

### 4. Quick Action Chips Missing on Dashboard When Resumes Exist

**Problem:** The `QuickActionChips` component is imported but never rendered in the current dashboard layout. Users with resumes miss useful shortcuts (Upload, Templates, Interview, etc.).

**Fix in `src/pages/DashboardPage.tsx`:**
- Render `QuickActionChips` between the stats section and the search bar when the user has resumes
- This provides quick access to Upload, Templates, and other secondary actions without cluttering the resume list

---

### Summary Table

| Bug | File | Impact |
|-----|------|--------|
| `?action=create` param ignored | `DashboardPage.tsx` | Editor tab dead-end not fully fixed |
| AI Recruiters chip links to `/auth` | `Index.tsx` | Confusing redirect for logged-in users |
| Onboarding choices discarded | `DashboardPage.tsx` | Wasted personalization opportunity |
| QuickActionChips never rendered | `DashboardPage.tsx` | Missing useful shortcuts |

### Files Changed
- `src/pages/DashboardPage.tsx` (3 fixes)
- `src/pages/Index.tsx` (1 fix)

