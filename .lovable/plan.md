

## Fix: AI Health Badge Overlapping Headers Across All Pages

### Problem
The `AIHealthBadge` is absolutely positioned at `top-2 right-3 z-30` in `AppShell.tsx`. This causes it to overlap with page header elements (profile avatar on dashboard, action buttons on other pages) because the badge sits in the same visual space as top-right header content.

### Solution
Instead of keeping the badge as a floating overlay in AppShell, embed it directly into the dashboard header (the primary page where it's most useful) and remove it from the global shell. For the other AI routes (AI Studio, Interview, Career, etc.), those pages already have their own AI provider indicators (AIEngineBadge, AICreditsIndicator) in their content, making the global badge redundant.

### Technical Details

**File: `src/components/layout/AppShell.tsx`**
- Remove the `AI_ROUTES` array entirely
- Remove the `showAIHealth` variable and the floating `AIHealthBadge` block (lines 34-39)
- Remove the `AIHealthBadge` import

**File: `src/pages/DashboardPage.tsx`**
- Import `AIHealthBadge`
- Place it inside the dashboard header, to the left of the profile avatar button, as an inline element (not absolutely positioned)
- This keeps the badge visible where it matters most without overlapping anything

This approach:
- Eliminates the overlap on all pages permanently
- Keeps the health indicator visible on the dashboard where users check AI status
- Avoids redundancy with the existing AI badges on Studio, Interview, Career, and Cover Letter pages
