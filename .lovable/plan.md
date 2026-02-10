

# Add Interview Prep Banner on Dashboard Page

## What It Does
Shows a dismissable "Try Interview Prep" banner on the Dashboard page for first-time users who have at least one resume. Once dismissed, it never appears again (persisted in settings store).

## Implementation

### 1. Settings Store (`src/store/settingsStore.ts`)
- Add `hasSeenInterviewHint: boolean` to the state interface (default: `false`)
- Add `setHasSeenInterviewHint` action
- Add to `defaultSettings`

### 2. NextStepBanner Component (`src/components/editor/NextStepBanner.tsx`)
- Add `'interview'` to the variant union type
- Add interview config entry:
  - Icon: `Mic` (from lucide-react)
  - Text: "Ready to practice? Try AI Interview Prep."
  - Action label: "Interview"
  - Settings key: `hasSeenInterviewHint`
- Add dismiss handler for the new settings key

### 3. Dashboard Page (`src/pages/DashboardPage.tsx`)
- Import `NextStepBanner`
- Place the banner between the search bar and the content area (before the resume list)
- Only show when user has at least one resume
- `onAction` navigates to the interview page using the first available resume (loads it into the store, then navigates to `/interview`)

### No new files. No backend changes.
