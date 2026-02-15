

## Onboarding Tour, Visual Indicators, and Progress Bar Unification

### Overview

This plan covers three areas: (1) an AI Studio onboarding tour for first-time users, (2) visual indicators like pulse animations and AI tip badges, and (3) unifying the progress bar between dashboard and editor so they look and calculate the same way.

---

### Part 1: Onboarding Tour for AI Studio

**Current State**: The app already has an `AIIntroTooltip` modal in the editor (shown on first visit, persisted via `hasSeenAIIntro` in `settingsStore`). There is no equivalent for the AI Studio tab.

**Changes**:

**File: `src/store/settingsStore.ts`**
- Add `hasSeenAIStudioTour: boolean` (default `false`) and its setter to the settings store

**File: `src/components/ai-studio/AIStudioTourModal.tsx`** (new)
- Create a multi-step welcome modal (3 steps):
  1. "Welcome to AI Studio" -- highlights the chat feature with animated Sparkles icon
  2. "Your AI Toolkit" -- shows featured tools (Tailor, Enhance, Proofread)
  3. "Try it now" -- encourages tapping a suggestion chip, with a "Got It!" dismiss button
- Uses framer-motion for step transitions
- Glass-elevated card design matching existing `AIIntroTooltip` style
- Dismissal sets `hasSeenAIStudioTour: true` in settings store

**File: `src/pages/AIStudioPage.tsx`**
- Import and render `AIStudioTourModal` when `!hasSeenAIStudioTour` (with 800ms delay after mount)
- On dismiss, call `setHasSeenAIStudioTour(true)`

---

### Part 2: Visual Indicators

**File: `src/pages/AIStudioPage.tsx`**
- Add pulse animation to the Wise AI Chat card on first visit (when `!hasSeenAIStudioTour`): a subtle pulsing glow ring around the card using `animate` from framer-motion
- Update chat input placeholder examples to cycle through suggestions: "Ask AI to edit your resume...", "Try: Write a summary for a software engineer", etc.
- Add "AI is thinking..." spinner state to the chat button area when chat sheet is opening (use existing loading pattern)

**File: `src/components/editor/AIFloatingButton.tsx`**
- Add pulse animation on first visit: check `hasSeenAIIntro` from settings store; if false, add a more prominent pulse ring (already has a subtle one -- increase opacity from 0.5 to 0.7 and scale from 1.2 to 1.4)

**File: `src/components/editor/ai/AICreditsIndicator.tsx`**
- No changes needed -- credits display already exists with Zap icon

---

### Part 3: Progress Bar Unification

**Current Inconsistency**:
- Dashboard `ResumeListCard` uses the generic `<Progress>` (Radix) component with `gradient-primary` fill (pink/red gradient) and its own simple `calculateResumeCompletion()` function (checks 5 sections: contact, summary, experience, education, skills -- binary yes/no)
- Editor uses `<ProgressBar>` component with dynamic color gradient (red at 0-33%, amber at 34-66%, green at 67-100%) and `calcOverallScore()` from `resumeCompletionRules.ts` (granular per-section scoring)

**Solution**: Replace the dashboard card's progress bar with the editor's `ProgressBar` component and scoring logic.

**File: `src/components/dashboard/ResumeListCard.tsx`**
- Remove the `calculateResumeCompletion()` function and `getCompletionTextColor()` function
- Remove import of `Progress` from `@/components/ui/progress`
- Import `ProgressBar` from `@/components/editor/ProgressBar` and `dbToResumeData` from `@/hooks/useResumes`
- Convert the `DatabaseResume` to `ResumeData` using `dbToResumeData()` (already available)
- Replace the `<Progress>` + percentage span block (lines 298-310) with:
  ```
  <ProgressBar resume={resumeData} className="mb-2" />
  ```
  This gives the card the same dynamic color bar (red/amber/green), same percentage calculation, and same "X% Complete" label as the editor
- The `ProgressBar` component already has `h-3` (close to 8px) bar height and handles all the color logic
- Remove `completionPercentage` useMemo since it's no longer needed

**File: `src/components/editor/ProgressBar.tsx`**
- Change bar height from `h-3` to `h-2.5` (10px) to better match the spec while staying consistent
- Add an optional `compact` prop: when true, uses `h-2` (8px) for card contexts and hides the "Resume" and "Complete" text labels (just shows percentage)
- Dashboard cards will use `<ProgressBar resume={data} compact />`

---

### What Does NOT Change

- All resume scoring logic in `resumeCompletionRules.ts` (the source of truth)
- Editor ProgressBar confetti animation and color gradient logic
- Dashboard card swipe gestures, menu actions, and data loading
- AI tool functionality, API calls, and sheet behaviors
- Onboarding carousel (existing 4-screen flow)
- Score ring on individual cards (health score from background scoring)

### Files Summary

| File | Action |
|------|--------|
| `src/store/settingsStore.ts` | Add `hasSeenAIStudioTour` state |
| `src/components/ai-studio/AIStudioTourModal.tsx` | New -- 3-step tour modal |
| `src/pages/AIStudioPage.tsx` | Render tour modal, add pulse on chat card |
| `src/components/editor/AIFloatingButton.tsx` | Increase pulse prominence on first visit |
| `src/components/editor/ProgressBar.tsx` | Add `compact` prop for card usage |
| `src/components/dashboard/ResumeListCard.tsx` | Replace Progress with ProgressBar, remove local calculation |

