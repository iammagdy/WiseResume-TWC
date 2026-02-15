

## Enhance Wise AI Chat Header & Avatar Branding

### Problem
The Wise AI chat sheet header uses a generic `Bot` icon from lucide-react inside a plain gradient circle. This looks unpolished and doesn't match the branded identity of the app. The same generic icon repeats in every AI message bubble and the "thinking" indicator.

### Solution
Replace all `Bot` icon instances in the chat sheet with the branded `AppIcon` component (the purple-pink gradient document icon with sparkle), and improve the header layout for a more premium feel.

### Changes

**File: `src/components/editor/AgenticChatSheet.tsx`**

1. **Import `AppIcon`**: Add `import { AppIcon } from '@/components/brand/AppIcon';`

2. **Header avatar (line 273-275)**: Replace the `Bot` icon circle with `AppIcon`:
   - Remove the `div` wrapper with `gradient-primary` background
   - Use `<AppIcon size={32} showSparkle />` directly -- the icon already has its own gradient background and rounded corners
   - This gives the header a distinctive branded look matching the app's identity

3. **AI message bubble avatar (line 337-339)**: Replace `Bot` with a smaller `AppIcon`:
   - Use `<AppIcon size={28} showSparkle={false} />` (no sparkle at small size for cleanliness)
   - Remove the wrapping `div` with `gradient-primary` since AppIcon has its own background

4. **Thinking indicator avatar (line 386-388)**: Same replacement:
   - Use `<AppIcon size={28} showSparkle={false} className="shrink-0" />`
   - Remove the wrapping `div`

5. **Guest showcase icon (line 178-180)**: Replace the large `Sparkles` icon circle:
   - Use `<AppIcon size={56} showSparkle />` for a polished branded hero
   - Remove the wrapping `div` with `gradient-primary`

6. **Remove `Bot` from imports** (line 6) since it will no longer be used

### Visual Result
- Header: Shows the full branded app icon (purple-pink gradient square with "W" document and cyan sparkle) next to "Wise AI" text and provider badge
- Chat bubbles: Each AI response shows a compact version of the branded icon instead of a generic robot
- Guest view: The hero section shows a larger branded icon for recognition

### What Does NOT Change
- All chat functionality, message sending, and AI processing
- User message styling and avatar
- Input field, suggestions, and keyboard handling
- Provider badge and clear chat button positioning
- Sheet open/close behavior

