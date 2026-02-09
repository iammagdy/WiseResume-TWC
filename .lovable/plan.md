# Navigation Redesign - COMPLETED ✓

## Summary

Consolidated the bottom tab bar from 5 tabs to 4 tabs, merging AI settings into the main Settings page.

## What Changed

### Tab Bar (4 tabs now)
- **Home** → Dashboard
- **Editor** → Resume editing + AI tools
- **Interview** → Mock interviews
- **Settings** → All settings including AI configuration

### Settings Page
Added new **"AI & Voice"** section with:
- AI Provider selection (WiseResume AI / Gemini)
- ElevenLabs API Key for voice interviews

### Files Modified
- `src/components/layout/BottomTabBar.tsx` - Removed AI tab
- `src/pages/SettingsPage.tsx` - Added AI & Voice section
- `src/components/settings/AISettingsSheet.tsx` - Created new sheet component
- `src/App.tsx` - Removed /ai route
- `src/lib/navigation.ts` - Removed /ai from back routes
- `src/pages/AIPage.tsx` - Deleted
- `src/components/layout/PageSkeletons.tsx` - Removed AISkeleton
- `src/components/editor/ai/AIProviderBadge.tsx` - Opens sheet instead of navigating

## Benefits
1. Cleaner 4-tab navigation (iOS/Android standard)
2. AI settings logically grouped with other settings
3. No more misleading "AI" tab name
4. AI features remain in Editor (Wise AI button, AI Studio)
