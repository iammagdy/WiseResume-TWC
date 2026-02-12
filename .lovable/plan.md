

## Touch Targets, Ripple Effects, and Jobs Teaser Screen

### Overview

Two areas of work: (1) audit and fix touch targets across the app with a global touch-ripple effect, and (2) replace the Jobs tab blocking dialog with an inviting teaser/preview screen showing blurred sample data and feature highlights.

---

### 1. Touch Target Audit and Fixes

**Already compliant (no changes needed):**
- DailyTipCard close button: already `w-11 h-11` (44px) -- meets standards
- BottomTabBar buttons: `h-16` full height, `min-w-[52px]` -- exceeds 48px
- Back buttons across app: `p-3` + `min-w-[48px] min-h-[48px]` -- compliant
- Editor Next/Previous buttons: `h-12` (48px) -- compliant

**Needs fixing:**

**File: `src/pages/DashboardPage.tsx`**
- Profile avatar trigger: currently has no explicit min size. The avatar is `w-9 h-9` (36px) which is below 48px. Add `min-w-[48px] min-h-[48px] flex items-center justify-center` to the `motion.button` wrapper to increase the tap area while keeping the visual avatar at 36px.

**File: `src/components/applications/JobActivityStats.tsx`**
- Stat tile buttons: currently `p-4` which makes them tall enough, but add `min-h-[48px]` explicitly for safety.

**File: `src/components/dashboard/DailyTipCard.tsx`**
- Collapsed "Tip" re-expand button: currently `px-2.5 py-1` which is likely ~28px tall. Increase to `min-h-[44px] min-w-[44px] px-3 py-2` to meet the standard.

**File: `src/components/editor/SectionCard.tsx`**
- The AI action slot in the header row has an 8x8 icon container (32px). This is handled by InlineAIButton which already has `min-h-[44px]` -- no change needed.

---

### 2. Global Touch Ripple Effect

**File: `src/index.css`**

Add a CSS-only touch ripple utility class that can be applied to interactive elements. This avoids adding framer-motion or JS overhead to every button.

- Create a `.touch-ripple` class using CSS `::after` pseudo-element with a radial gradient
- On `:active`, the pseudo-element scales up and fades out, creating a Material Design-style expanding circle
- Implementation:
  ```css
  .touch-ripple {
    position: relative;
    overflow: hidden;
  }
  .touch-ripple::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at var(--ripple-x, 50%) var(--ripple-y, 50%), currentColor 0%, transparent 60%);
    opacity: 0;
    transform: scale(0);
    transition: opacity 0.3s, transform 0.3s;
    pointer-events: none;
  }
  .touch-ripple:active::after {
    opacity: 0.08;
    transform: scale(2.5);
    transition: opacity 0.05s, transform 0.2s;
  }
  ```
- Apply `touch-ripple` class to: BottomTabBar buttons, stat tile buttons, SectionCard header area, dropdown menu items

**Files to add `touch-ripple` class:**
- `src/components/layout/BottomTabBar.tsx` -- add to each tab button
- `src/components/applications/JobActivityStats.tsx` -- add to stat tile buttons
- `src/pages/DashboardPage.tsx` -- add to profile avatar button

---

### 3. Jobs Tab Teaser Screen (Replace Blocking Dialog)

**File: `src/pages/ApplicationsPage.tsx`**

Replace the current guest gate (which shows a `SignInPromptDialog` modal over a blank page) with an inline teaser screen.

Current behavior: When `!user`, renders a blank page with a forced-open SignInPromptDialog.

New behavior:
- Remove the `SignInPromptDialog` import and usage for the guest gate
- Render a full teaser page within the same layout structure:

**Teaser layout:**
1. **Same header** as the authenticated view (keep the ArrowLeft + "My Activity" title for consistency)
2. **Blurred mock stats grid**: Render the same 2x2 `JobActivityStatsCard` layout but with hardcoded sample data (e.g., 12 Resumes, 8 Tailored, 5 Jobs Analyzed, 3 Cover Letters) and apply `blur-sm select-none pointer-events-none` to the entire grid. This gives users a visual preview of the feature.
3. **Blurred mock timeline**: Render 3-4 fake timeline entries (simple div placeholders with gray bars mimicking text) with `blur-sm` applied.
4. **Overlay CTA section**: Positioned over the blurred content (using absolute positioning within a relative container), centered vertically:
   - Lock icon (48px, primary color, with a subtle pulse animation)
   - "Track Your Job Applications" heading (text-xl font-bold)
   - "Sign in to unlock your activity dashboard" subtitle (text-sm text-muted-foreground)
   - Feature highlights list with icons:
     - Briefcase icon + "Track application status"
     - Bell icon + "Set follow-up reminders"  
     - BarChart3 icon + "View activity insights"
     - Layers icon + "Manage all jobs in one place"
   - Primary gradient CTA button: "Sign In to Get Started" (navigates to /auth)
   - Ghost link below: "Continue as guest" (navigates to /dashboard)

**File: `src/components/layout/BottomTabBar.tsx`**

Update the Jobs tab behavior: instead of blocking navigation with a toast, allow navigation to `/applications` even when not signed in. The teaser page handles the gate.

- Remove the `isJobsLocked` guard from `handleTabPress`
- Keep the Lock icon overlay for visual indication
- Remove the `opacity-50` or disabled styling from the Jobs tab (it should look tappable)
- Keep `aria-disabled` only for the Editor tab

---

### Technical Details

**Touch ripple approach**: Using CSS-only `:active` pseudo-element rather than JS event listeners. This is zero-overhead, works on all elements, and degrades gracefully. The ripple always originates from center (50% 50%) since CSS `:active` doesn't have pointer position -- this is a trade-off for simplicity. For true pointer-position ripples, we'd need JS, which isn't worth the complexity.

**Blurred teaser vs modal**: The teaser approach is more effective for conversion because users can see what they're missing. A modal over a blank page doesn't communicate value. The blur creates intrigue while the feature list communicates specific benefits.

**Mock data for teaser**: Hardcoded directly in the component (not from any hook) to avoid unnecessary API calls for unauthenticated users. The mock data is purely decorative.

### Files Modified

- `src/index.css` -- add `.touch-ripple` CSS utility
- `src/pages/DashboardPage.tsx` -- increase profile avatar touch target, add touch-ripple
- `src/components/dashboard/DailyTipCard.tsx` -- increase collapsed Tip button touch target
- `src/components/layout/BottomTabBar.tsx` -- add touch-ripple, allow Jobs navigation for guests
- `src/components/applications/JobActivityStats.tsx` -- add touch-ripple, explicit min-h
- `src/pages/ApplicationsPage.tsx` -- replace guest gate with teaser screen

