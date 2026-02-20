

# Fix 3 Interview UX Issues (Issue 1 Already Resolved)

## Issue 1 -- Chat Thread: ALREADY IMPLEMENTED

After reviewing the codebase, the chat thread is already fully functional:
- `TranscriptBubble` component renders both user (right-aligned, primary gradient bg) and interviewer (left-aligned, card bg) messages
- Each message has role labels ("You" / "Wise AI"), timestamps, and slide-up + fade animations
- The transcript area (lines 358-383 of InterviewPage) maps over all transcript entries and auto-scrolls
- A typing indicator shows when the AI is thinking
- Interim speech text shows as a translucent right-aligned bubble

No changes needed for this issue.

---

## Issue 2 -- "Type"/"Hide" Toggle Label Fix

### Current State
Line 484-492 of `InterviewPage.tsx`: a `Button` with `Keyboard` icon and text that toggles between "Hide" and "Type".

### Changes

**File: `src/pages/InterviewPage.tsx`**
- Import `KeyboardOff` from lucide-react (in addition to existing `Keyboard`)
- When `showTextInput` is false: show `Keyboard` icon + "Type" label
- When `showTextInput` is true: show `KeyboardOff` icon + "Close" label
- Add slide-up animation to the text input container (already partially done with `motion.div` but improve with `translateY`)
- Keep minimum 44x44px tap target

---

## Issue 3 -- End Interview Confirmation Dialog

### Current State
Line 493-502: the "End Interview" button directly calls `endInterview()`.

### Changes

**File: `src/pages/InterviewPage.tsx`**
- Add `showEndConfirm` state (boolean, default false)
- Change the "End Interview" button's `onClick` from `endInterview` to `setShowEndConfirm(true)`
- Add a confirmation bottom sheet using the existing `Sheet` component (from `@/components/ui/sheet`) with `side="bottom"`:
  - Drag handle bar at top
  - Title: "End Interview?" in bold
  - Subtitle explaining progress will be saved
  - Two stacked buttons: "Yes, End Interview" (destructive, calls `endInterview` + closes sheet) and "Keep Going" (ghost, closes sheet)
- Sheet dismisses on backdrop tap or swipe-down (built into the Sheet component)

---

## Issue 4 -- Performance Sparkline Chart

### Current State
`InterviewStatsCard` shows Sessions, Avg Score, Best in a 3-column grid. No chart.

### Changes

**File: `src/components/interview/InterviewStatsCard.tsx`**
- Import `LineChart`, `Line`, `ResponsiveContainer`, `Tooltip` from `recharts` (already installed)
- Below the stats grid, if `scoredSessions.length >= 1`, render a sparkline chart:
  - Data: scored sessions mapped to `{ session: index+1, score: overall_score, date: created_at }`
  - Container: `w-full h-16 mt-3`
  - Line: `stroke` = `hsl(var(--primary))`, strokeWidth 2, dot radius 3
  - Custom tooltip showing "Session N: X/10 -- date"
  - If only 1 session: show the single dot with a "Keep practicing to see your trend!" message below in `text-muted-foreground text-xs`
  - If 0 sessions: chart hidden (the entire card already returns null for 0 sessions)
- Add a simple SVG stroke-dashoffset animation on mount for the line (via a custom `animationBegin`/`animationDuration` on the recharts `Line` component, which supports this natively)

---

## Files Changed Summary

| File | Issue | Change |
|---|---|---|
| `src/pages/InterviewPage.tsx` | 2, 3 | Swap "Hide" for "Close" with `KeyboardOff` icon; add `showEndConfirm` state + bottom Sheet confirmation dialog |
| `src/components/interview/InterviewStatsCard.tsx` | 4 | Add recharts sparkline below stats grid with score trend and custom tooltip |

## Technical Notes
- Issue 1 requires no changes (already implemented)
- Recharts is already installed (v2.15.4) and used elsewhere in the app (ATSScoreTrendChart)
- Sheet component is already imported/used throughout the app
- All animations use Framer Motion or recharts built-in animation props
- No changes to API calls, voice logic, session state, or data models
- 44px minimum touch targets maintained on all new/modified interactive elements
