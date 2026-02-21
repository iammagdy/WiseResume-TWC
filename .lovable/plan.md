

# Navigation Audit: Fix Misrouted Buttons Across the App

After a thorough review of every page, back button, and action button in the app, here are the issues found and the fixes needed.

---

## Issues Found

### 1. Interview Page: Back button goes to `/dashboard` instead of staying within its tab group
The Interview page is grouped under the **AI Tools** tab (its `matchPaths` includes `/interview` in `DesktopNav`), but its back button navigates to `/dashboard`. The `BACK_ROUTES` map also sends `/interview` to `/dashboard`. It should go to `/ai-studio` to stay consistent with the tab hierarchy.

**Affected files:**
- `src/lib/navigation.ts` -- change `'/interview': '/dashboard'` to `'/interview': '/ai-studio'`
- `src/pages/InterviewPage.tsx` -- change all `navigate('/dashboard')` back-button calls to `navigate('/ai-studio')` (3 occurrences: setup header, active header, no-resume state)

### 2. Cover Letters Page: Back button goes to `/dashboard` instead of `/ai-studio`
Cover Letters is grouped under the AI Tools tab (`/cover-letters` is in AI Tools `matchPaths`), but its back button goes to `/dashboard`. Should go to `/ai-studio`.

**Affected files:**
- `src/lib/navigation.ts` -- change `'/cover-letters': '/dashboard'` to `'/cover-letters': '/ai-studio'`
- `src/pages/CoverLettersPage.tsx` -- change `navigate('/dashboard')` to `navigate('/ai-studio')` (line 93)

### 3. Resignation Letters Page: Back button goes to `/dashboard` instead of `/ai-studio`
Same issue as Cover Letters -- grouped under AI Tools tab but back goes to dashboard.

**Affected files:**
- `src/lib/navigation.ts` -- change `'/resignation-letters': '/dashboard'` to `'/resignation-letters': '/ai-studio'`
- `src/pages/ResignationLettersPage.tsx` -- change `navigate('/dashboard')` to `navigate('/ai-studio')` (line 63)

### 4. Portfolio Editor Page: Back button goes to `/dashboard` instead of staying on `/portfolio`
The Portfolio page has its own bottom tab, so pressing back from the Portfolio editor should not jump to dashboard. However, since `/portfolio` IS the tab itself and there's no parent above it, `/dashboard` is acceptable. **No change needed** -- this is correct behavior (portfolio IS a top-level tab).

### 5. Landing Page "AI Tailor" Quick Action routes to `/editor` instead of `/ai-studio?tool=tailor`
In `QuickActions.tsx`, the "AI Tailor" card navigates to `/editor` with `createBlank: true`, which dumps the user into a blank editor. It should navigate to the AI Studio tailor tool instead.

**Affected file:**
- `src/components/landing/QuickActions.tsx` -- change the "AI Tailor" action route from `/editor` to `/ai-studio?tool=tailor` and remove `createBlank: true`

### 6. BottomTabBar: `/interview` missing from AI Tools `matchPaths`
In `BottomTabBar.tsx`, the AI Tools tab `matchPaths` does NOT include `/interview`, so when the user is on the Interview page, no tab appears active. The `DesktopNav` correctly includes it.

**Affected file:**
- `src/components/layout/BottomTabBar.tsx` -- add `'/interview'` to the AI Tools tab `matchPaths` array

### 7. Update navigation test to reflect new back routes
The test file checks that `/interview` goes to `/dashboard` -- needs updating.

**Affected file:**
- `src/lib/navigation.test.ts` -- update test expectations for changed routes

---

## Summary of Changes

| File | Change |
|---|---|
| `src/lib/navigation.ts` | Update 3 BACK_ROUTES: `/interview` -> `/ai-studio`, `/cover-letters` -> `/ai-studio`, `/resignation-letters` -> `/ai-studio` |
| `src/pages/InterviewPage.tsx` | Change 3 back-button `navigate('/dashboard')` calls to `navigate('/ai-studio')` |
| `src/pages/CoverLettersPage.tsx` | Change back-button `navigate('/dashboard')` to `navigate('/ai-studio')` |
| `src/pages/ResignationLettersPage.tsx` | Change back-button `navigate('/dashboard')` to `navigate('/ai-studio')` |
| `src/components/landing/QuickActions.tsx` | Fix "AI Tailor" route from `/editor` to `/ai-studio?tool=tailor` |
| `src/components/layout/BottomTabBar.tsx` | Add `/interview` to AI Tools `matchPaths` |
| `src/lib/navigation.test.ts` | Update test expectations |

All other pages (Editor, Preview, Settings, Profile, Templates, Examples, Guides, Guide detail, Notifications, ApplicationTracker, OnboardingPage, CoverLetterNew, CoverLetterEdit, ResignationLetterNew, ResignationLetterEdit, CareerPage) were verified and route correctly.

