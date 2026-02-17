

## Add AI Credits Visibility to Dashboard and Settings

### What Already Exists
- `AICreditsIndicator` component (shows remaining daily credits with color coding)
- `useAICredits` hook (queries `ai_credits` table, auto-resets daily)
- `useAICreditsMutations` hook (increment usage, check limits, low-credit warnings)
- Already displayed in: AI Studio header, Editor AI Assistant bar

### What's Missing
The credits indicator is not visible on the two most-visited screens: Dashboard and Settings.

### Changes

**1. Add AICreditsIndicator to Dashboard header** (`src/pages/DashboardPage.tsx`)
- Import `AICreditsIndicator`
- Place it next to the existing `AIHealthBadge` in the header bar (line ~367)
- One-line addition

**2. Add AI Credits section to Settings page** (`src/pages/SettingsPage.tsx`)
- Add a row in the "AI & Intelligence" section showing current credits usage
- Display: "X / 20 credits used today" with a progress bar
- Uses existing `useAICredits` hook

### Tasks NOT applicable (and why)

| Task | Status | Reason |
|------|--------|--------|
| 1.1 Frontend Service Failure | N/A | Lovable manages the dev server automatically -- no supervisor config exists |
| 1.2 Edge Function Security | Already Secure | Lovable Cloud requires `verify_jwt = false` in config.toml with in-code JWT validation (which all 26 functions already implement). This is the documented correct pattern. |

### Technical Details

**Files modified:**
- `src/pages/DashboardPage.tsx` -- import and render `AICreditsIndicator` in header
- `src/pages/SettingsPage.tsx` -- add credits usage row with progress bar in AI settings section

