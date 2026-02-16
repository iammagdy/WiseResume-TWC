

## Replace Studio Tab with a Lucide Icon

### What will change
Replace the custom PNG image (`wise-ai-icon.png`) for the Studio tab with a Lucide `Sparkles` icon. This eliminates the PNG asset, removes the custom icon rendering path for this tab, and ensures the Studio icon matches the exact same style, size, and color behavior as all other bottom tab icons (Home, Editor, Jobs, Settings).

### Why Sparkles
The `Sparkles` icon from Lucide is the standard convention for AI/generative features across modern apps. It clearly communicates "AI-powered" and visually fits alongside the other outline-style Lucide icons in the tab bar.

### Steps

1. **Update `src/components/layout/BottomTabBar.tsx`**:
   - Add `Sparkles` to the Lucide import (line 2)
   - Remove the `wiseAiIcon` PNG import (line 3)
   - Change the Studio tab definition (lines 33-38) from using `customIcon: wiseAiIcon` to `icon: Sparkles`
   - No other rendering changes needed -- the existing Lucide icon rendering path handles size, color, and active/inactive states automatically

### Technical Details
- Import change: `import { FileText, Settings, Home, Briefcase, Sparkles } from 'lucide-react'`
- Tab config change: replace `customIcon: wiseAiIcon` with `icon: Sparkles`
- The custom icon rendering code (`<img>` branch) remains for future use but won't be triggered since no tab uses `customIcon` anymore
- The `wise-ai-icon.png` asset file stays in the repo (it may be used elsewhere like the AI Studio page header)

