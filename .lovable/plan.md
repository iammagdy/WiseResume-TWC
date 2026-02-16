

## Full App Page Audit: Routing, Logic, and Flow Analysis

### Summary of All Routes

The app has **28 routes** total. Here is the analysis of each:

---

### 1. Healthy Pages (No Issues Found)

| Route | Purpose | Wiring |
|-------|---------|--------|
| `/` (Index) | Landing page, accessible to all users including authenticated | Correct - links to /auth, /dashboard, /templates |
| `/auth` | Login/Signup/Forgot password | Correct - redirects to /dashboard on success |
| `/dashboard` | Main hub with resume list, stats, quick actions | Correct - primary navigation target |
| `/editor` | Resume editor (guarded - needs active resume) | Correct - bottom tab with guard |
| `/preview` | Resume PDF preview | Correct - accessible from editor |
| `/upload` | Resume upload/import | Correct - accessible from dashboard |
| `/settings` | App settings | Correct - bottom tab |
| `/interview` | Voice mock interview | Correct - accessible from AI Studio |
| `/applications` | Job application tracker list | Correct - bottom tab "Jobs" |
| `/onboarding` | 5-step first-time onboarding | Correct - shown after signup |
| `/profile` | User profile with stats | Correct - accessible from dashboard |
| `/templates` | Template gallery | Correct - accessible from dashboard |
| `/resume/:id` | Resume detail/preview page | Correct - accessible from dashboard cards |
| `/job/:id` | Job detail page | Correct - accessible from applications |
| `/application/:id` | Application tracker detail | Correct - accessible from applications |
| `/notifications` | Notification center | Correct - accessible from dashboard |
| `/cover-letters` | Cover letter list (main entry) | Correct - accessible from dashboard quick actions |
| `/cover-letter/new` | Create new cover letter | Correct - accessible from /cover-letters |
| `/cover-letter/edit/:id` | Edit saved cover letter | Correct - accessible from /cover-letters |
| `/examples` | Resume example gallery | Correct - accessible from dashboard |
| `/career` | Career assessment tools | Correct - accessible from AI Studio |
| `/resignation-letters` | Resignation letter list | Correct - accessible from dashboard |
| `/resignation-letter/new` | Create new resignation letter | Correct - accessible from /resignation-letters |
| `/resignation-letter/edit/:id` | Edit resignation letter | Correct - accessible from /resignation-letters |
| `/guides` | Career guides list | Correct - accessible from dashboard/settings |
| `/guides/:slug` | Individual guide article | Correct - accessible from /guides |
| `/ai-studio` | AI tools hub | Correct - bottom tab "Studio" |
| `/share/:token` | Public resume share (outside AppShell) | Correct - no auth required |
| `*` (NotFound) | 404 page | Correct |

---

### 2. Issues Found

#### Issue A: Duplicate `/cover-letter` Route (Redundant Page)

**`/cover-letter`** (CoverLetterPage.tsx) is a standalone page that duplicates the functionality of the newer `/cover-letters` + `/cover-letter/new` + `/cover-letter/edit/:id` flow.

- `/cover-letter` has its own "Create" tab and "Saved" tab built into one page
- `/cover-letters` is a proper list page, `/cover-letter/new` is a proper creation page, `/cover-letter/edit/:id` is a proper edit page
- The newer flow (`/cover-letters`) is better designed with pull-to-refresh, action sheets, FAB, and proper CRUD
- Only **one reference** still navigates to the old `/cover-letter` route: `ApplicationTrackerPage.tsx` line 158

**Fix**: Remove the `/cover-letter` route and `CoverLetterPage.tsx`. Update the single reference in `ApplicationTrackerPage.tsx` to navigate to `/cover-letter/edit/${coverLetter.id}` instead.

#### Issue B: Back Route Map Missing Entries

`src/lib/navigation.ts` BACK_ROUTES is missing:
- `/cover-letters` (should go to `/dashboard`)
- `/resignation-letters` (should go to `/dashboard`)
- `/career` (should go to `/ai-studio`)
- `/examples` (should go to `/dashboard`)
- `/guides` (should go to `/dashboard`)
- `/ai-studio` (should go to `/dashboard`)

This means hardware back button on these pages falls through to the default `/dashboard`, which happens to be correct for most but `/career` should go to `/ai-studio`. Adding explicit entries is safer.

#### Issue C: AI_ROUTES Missing `/resignation-letter`

In `AppShell.tsx`, the `AI_ROUTES` array (which controls the AI Health Badge visibility) does not include `/resignation-letter` or `/cover-letter/new`. These pages use AI for generation but don't show the health badge. This is minor but inconsistent.

---

### 3. Plan of Changes

#### Step 1: Remove redundant CoverLetterPage

- Delete `src/pages/CoverLetterPage.tsx`
- Remove the `/cover-letter` route from `App.tsx` (line 134)
- Remove `CoverLetterPage` lazy import from `App.tsx` (line 52)
- Update `ApplicationTrackerPage.tsx` line 158: change `navigate('/cover-letter')` to `navigate('/cover-letter/edit/${coverLetter.id}')`
- Remove `/cover-letter` from `AppShell.tsx` TAB_ROUTES (it's already covered by the prefix match on `/cover-letter/new` and `/cover-letter/edit`)

#### Step 2: Fix back route map

Add missing entries to `BACK_ROUTES` in `src/lib/navigation.ts`:
- `/cover-letters` -> `/dashboard`
- `/resignation-letters` -> `/dashboard`  
- `/career` -> `/ai-studio`
- `/examples` -> `/dashboard`
- `/guides` -> `/dashboard`
- `/ai-studio` -> `/dashboard`

#### Step 3: Add resignation letter routes to AI_ROUTES

In `AppShell.tsx`, add `/resignation-letter` to `AI_ROUTES` so the health badge shows when generating resignation letters.

---

### Technical Summary

| File | Change |
|------|--------|
| `src/pages/CoverLetterPage.tsx` | Delete (redundant) |
| `src/App.tsx` | Remove CoverLetterPage import and route |
| `src/pages/ApplicationTrackerPage.tsx` | Fix navigate to use cover letter edit route with ID |
| `src/lib/navigation.ts` | Add 6 missing BACK_ROUTES entries |
| `src/components/layout/AppShell.tsx` | Add `/resignation-letter` to AI_ROUTES; clean up TAB_ROUTES |

