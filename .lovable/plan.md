

## Editor Header: Replace AI Studio with Wise AI Chat

### Problem
The editor header has an "AI Studio" button that navigates to `/ai-studio`, but AI Studio already has its own tab in the bottom navigation bar. This wastes a header slot. The user wants this replaced with a direct "Wise AI Chat" button that opens the chat sheet inline.

### Changes

**File: `src/pages/EditorPage.tsx`**

1. **Replace the AI Studio header button (lines 504-514)** with a "Wise AI" chat button:
   - Change icon from `Sparkles` to `MessageSquare` (already imported on line 3 area -- will verify and add `MessageSquare` import)
   - Change `onClick` from `navigate('/ai-studio')` to `setShowChat(true)` (chat sheet state already exists at line 141)
   - Change label from "AI Studio" to "Wise AI"
   - Keep the same glow/pulse styling to maintain visual prominence
   - Keep `aria-label` updated to "Open Wise AI Chat"

2. **Verify Design and Preview buttons** (lines 484-503):
   - **Design button** (line 484-491): Opens `CustomizeSheet` via `handleCustomize()` -- already working, triggers `setShowCustomize(true)` which renders the lazy-loaded `CustomizeSheet` at line 742. No changes needed.
   - **Preview button** (line 493-503): Toggles `showPreview` state. On mobile, this opens `LivePreviewSheet` (line 730); on desktop, it shows a side panel (line 694-700). Both paths are functional. No changes needed.

### What Does NOT Change
- All AI functionality and API calls
- Design and Preview button logic (confirmed working)
- Bottom tab bar AI Studio tab (remains as-is)
- Chat sheet (`AgenticChatSheet`) behavior
- All other header elements (back button, version history, offline indicator)

### Icon Choice
`MessageSquare` from lucide-react -- represents chat/messaging, visually distinct from the Sparkles icon used in the bottom tab's "Studio" label, avoiding confusion between the two entry points.

