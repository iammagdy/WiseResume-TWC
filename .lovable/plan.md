# Navigation Update: Interview Tab → Contextual Access

## Status: ✅ COMPLETED

## Summary
Removed Interview from the bottom tab bar and made it accessible contextually from:
1. **Preview Page** - "Interview" button in bottom actions
2. **Dashboard Resume Cards** - "Practice Interview" in card dropdown menu
3. **AI Studio Bar** - "Voice Interview" action button (with "Live" badge)

## New 3-Tab Layout
```
┌────────────┬──────────────┬──────────────┐
│    Home    │    Editor    │   Settings   │
└────────────┴──────────────┴──────────────┘
```

## Files Modified
- `src/components/layout/BottomTabBar.tsx` - Reduced to 3 tabs
- `src/pages/PreviewPage.tsx` - Added Interview button
- `src/components/dashboard/ResumeListCard.tsx` - Added onInterview prop and menu item
- `src/components/dashboard/ResumeGroup.tsx` - Pass through onInterview prop
- `src/pages/DashboardPage.tsx` - Added handleInterview handler
- `src/components/editor/AIAssistantBar.tsx` - Added Voice Interview action
- `src/pages/InterviewPage.tsx` - Updated back navigation to /preview
- `src/lib/navigation.ts` - Updated BACK_ROUTES for /interview

