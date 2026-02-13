

## Enhance Wise AI Icon and Section AI Buttons

### Overview
Upgrade the visual treatment of the main Wise AI chat icon and the per-section AI buttons with glowing effects, auth-aware states, and polished interactions.

### Changes

---

### 1. Main Wise AI Icon (EditorPage header)

**File: `src/pages/EditorPage.tsx` (lines 401-408)**

Current: A plain `MessageCircle` icon in a ghost button with a small pulse dot.

Changes:
- Replace `MessageCircle` with `Sparkles` icon (consistent AI branding)
- Make the button larger with a gradient background and glowing box-shadow
- **Logged in**: Pulsing glow ring animation, tooltip "Click for AI assistance"
- **Logged out**: 50% opacity, lock badge overlay (`Lock` icon), tooltip "Sign in to unlock Wise AI". Clicking opens the sign-in prompt dialog instead of the chat sheet
- Wrap with `Tooltip` component for hover text

### 2. Section AI Buttons (InlineAIButton)

**File: `src/components/editor/InlineAIButton.tsx`**

Changes:
- Accept new `isAuthenticated` prop
- Change label from "AI" to "AI Assist" with sparkle emoji or icon
- **Logged in**: Brighter primary color with subtle glow shadow, gentle pulse animation on the sparkles icon, enhanced hover state with scale and brighter glow
- **Logged out**: Grey out with reduced opacity, replace sparkles icon with `Lock` icon, show tooltip "Sign in to use AI Assist". Clicking opens sign-in prompt instead of dropdown menu
- Add `Tooltip` wrapper for contextual help text

**File: `src/components/editor/SectionAIAction.tsx`**

Changes:
- Import `useAuth` and pass `isAuthenticated` to `InlineAIButton`
- When not authenticated, pass an `onLockedClick` callback that triggers the sign-in prompt dialog

### 3. EditorPage Integration

**File: `src/pages/EditorPage.tsx`**

Changes:
- Update the Wise AI header button with auth-aware rendering
- Add a reusable `handleAILockedClick` function that opens the sign-in prompt with AI-specific messaging ("Unlock Wise AI", "Sign in to access AI-powered resume editing")
- Pass this handler down to `SectionAIAction` components via context or prop

---

### Technical Details

**New CSS classes (added inline or via Tailwind):**
- Glow effect: `shadow-[0_0_20px_-4px_hsl(var(--primary)/0.5)]` on the main icon
- Pulse glow: A keyframe animation that alternates the glow intensity
- Lock badge: Absolute positioned small `Lock` icon (12x12) at bottom-right of the main button

**Tooltip integration:**
- Uses existing `Tooltip`, `TooltipTrigger`, `TooltipContent` from `@/components/ui/tooltip`
- `TooltipProvider` is likely already at app level; if not, wrap locally

**Auth-aware click handlers:**
- Main icon: `onClick={() => user ? setShowChat(true) : handleAILockedClick()}`
- Section buttons: `onClick={() => isAuthenticated ? openMenu() : onLockedClick?.()`

**Files modified:**
1. `src/pages/EditorPage.tsx` -- Main Wise AI icon upgrade with auth states, glow, tooltip
2. `src/components/editor/InlineAIButton.tsx` -- Enhanced styling, auth-aware states, lock icon, tooltip, label change
3. `src/components/editor/SectionAIAction.tsx` -- Pass auth state and locked click handler to InlineAIButton

**No new files or dependencies needed.** All icons (`Sparkles`, `Lock`) and components (`Tooltip`) are already available.
