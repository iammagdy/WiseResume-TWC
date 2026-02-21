

# User Flow & Navigation Improvements

## Problems Identified

### 1. Editor "Dead End" — No Resume Loaded
When a user taps the **Editor** tab without a resume loaded, the BottomTabBar silently loads the most recent resume or redirects to `?action=create`. But if the user has resumes and the fetch hasn't finished yet, or the store is stale, they see a loading skeleton for up to 8 seconds before being bounced to the dashboard. There is no explanation of what is happening.

**Fix:** Show a brief inline toast or micro-banner ("Loading your latest resume...") when the Editor tab auto-loads a resume. If the redirect to `/dashboard?action=create` fires, show a toast explaining why ("No resumes yet -- let's create one!").

### 2. Back Button Inconsistency Across Sub-Pages
Multiple pages hard-code `navigate('/dashboard')` in their back button instead of using the centralized `getBackRoute()` from `navigation.ts`. Examples:
- `PortfolioEditorPage.tsx` line 383: back goes to `/dashboard` instead of staying on the Portfolio tab
- `ProfilePage.tsx` line 80: back goes to `/dashboard` (correct)
- `NotificationsPage.tsx` line 57: back goes to `/dashboard` (correct)
- `ExamplesPage.tsx` line 74: back goes to `/dashboard` (correct)
- `GuidesPage.tsx` line 48: back goes to `/dashboard` (correct)

The Portfolio back button is wrong -- it should go back contextually. `BACK_ROUTES` already maps `/portfolio` to `/dashboard`, but the PortfolioEditorPage's inline `navigate('/dashboard')` bypasses the system.

**Fix:** Replace hard-coded `navigate('/dashboard')` calls with a shared `useBackNavigation()` hook that reads from `BACK_ROUTES`, so all back buttons behave consistently and can be updated from one place.

### 3. AI Studio "Requires Resume" is a Dead End
When the user opens an AI tool from the AI Studio without a resume loaded, `requireResume()` shows a toast and navigates to `/dashboard`. The user has no idea why they were kicked out or what to do next.

**Fix:** Replace the generic toast with a specific actionable message: "Select a resume first to use this tool" and navigate to `/dashboard` with a highlight/pulse on the resume list. Or better: show an inline sheet asking "Which resume do you want to work with?" with a quick-pick list instead of navigating away.

### 4. Post-Auth Redirect is Always `/dashboard`
After login or signup (line 173, 205 of `AuthPage.tsx`), the user always goes to `/dashboard`. If they were trying to access `/ai-studio` or `/portfolio` and got redirected to `/auth`, they lose their intended destination.

**Fix:** Store the intended route before redirecting to `/auth` (via `ProtectedRoute`) and restore it after successful authentication. Use a `?redirect=` query param or sessionStorage.

### 5. Onboarding Double-Check Creates Flash
`DashboardPage` checks onboarding status (line 142-159) and `OnboardingPage` also checks it (line 35-54). Both query the database independently. If timing is off, the user sees the dashboard flash before being redirected to onboarding.

**Fix:** Consolidate onboarding check into a single gate. The `DashboardPage` already shows an onboarding overlay (`setShowOnboarding(true)`), so remove the independent redirect from `OnboardingPage` and let the dashboard be the single source of truth.

### 6. No "Where Am I?" Breadcrumb on Deep Pages
Pages like `/cover-letter/edit/:id`, `/resignation-letter/edit/:id`, `/guides/:slug`, and `/resume/:id` show a back arrow but no breadcrumb trail. Users lose spatial awareness of where they are in the app hierarchy.

**Fix:** Add a subtle breadcrumb text below the header on detail pages showing the path (e.g., "AI Tools > Cover Letters > Edit"). This is one line of text, not a full breadcrumb component.

### 7. Tab Bar Doesn't Reflect "You Are Here" on Sub-Routes
The BottomTabBar correctly highlights tabs via `matchPaths`, but there is no visual indication of the specific sub-page within a tab. For example, under "AI Tools", the user might be on `/interview`, `/cover-letters`, or `/career` -- the tab just shows "AI Tools" highlighted with no distinction.

**Fix:** Add a subtle page title in the mobile header bar (the "WiseResume" branded bar at line 41 of AppShell) that shows the current page name instead of just the app name. This gives users instant spatial awareness.

### 8. Upload Flow Ends Abruptly
After uploading and importing a resume (`UploadPage.tsx` line 197), the user is sent to `/editor` with just a toast. There is no summary of what was imported or a quick "review what we found" step before diving into editing.

**Fix:** The `ImportReviewSheet` already exists (line 25) and shows section selection. Add a brief "Import Complete" confirmation with section counts before navigating to the editor, giving users confidence their data was captured correctly.

---

## Implementation Summary

| # | Issue | Fix | Files |
|---|-------|-----|-------|
| 1 | Editor dead-end on no resume | Toast explaining auto-load or redirect | `BottomTabBar.tsx`, `DesktopNav.tsx` |
| 2 | Back button inconsistency | New `useBackNavigation` hook | `PortfolioEditorPage.tsx`, new hook |
| 3 | AI Studio resume-required dead end | Inline resume picker instead of redirect | `AIStudioPage.tsx` |
| 4 | Post-auth always goes to dashboard | Store + restore intended destination | `ProtectedRoute.tsx`, `AuthPage.tsx` |
| 5 | Onboarding double-check flash | Consolidate into dashboard-only gate | `OnboardingPage.tsx`, `DashboardPage.tsx` |
| 6 | No breadcrumb on deep pages | Subtle path text on detail headers | Detail page headers (cover-letter, resume, guides) |
| 7 | No current page name in header | Dynamic page title in AppShell mobile header | `AppShell.tsx` |
| 8 | Upload ends abruptly | Brief success summary before editor | `UploadPage.tsx` |

---

## Technical Details

### New hook: `useBackNavigation`
```typescript
// src/hooks/useBackNavigation.ts
import { useNavigate, useLocation } from 'react-router-dom';
import { getBackRoute } from '@/lib/navigation';
import { useAuth } from '@/hooks/useAuth';

export function useBackNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  return () => {
    const route = getBackRoute(location.pathname, !!user);
    navigate(route);
  };
}
```

### Post-auth redirect (ProtectedRoute change)
- On redirect to `/auth`, append `?redirect=/intended-path` 
- In `AuthPage`, after successful login, read `redirect` param and navigate there instead of `/dashboard`

### Dynamic page title in AppShell
- Map current `location.pathname` to a human-readable title using a simple lookup
- Replace the static "WiseResume" text in the mobile header with the current page title
- Keep "WiseResume" as fallback for unmapped routes

### AI Studio resume picker
- Instead of `navigate('/dashboard')` in `requireResume()`, show a small `Sheet` listing the user's resumes (max 5, sorted by recent)
- Selecting one sets it in the store and proceeds with the tool action
- "View All" button navigates to dashboard for full list

