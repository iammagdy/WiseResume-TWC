

## Build a Complete AI Credit System

### Current Problems
1. Only 2 of 18+ AI features actually check and deduct credits -- the rest bypass the system entirely
2. The credit indicator is tiny and easy to miss (just a number with a bolt icon)
3. No visual feedback when credits are consumed
4. No credit history or usage breakdown
5. Cost badges only appear on 4 sheets

### Proposed Credit System

#### 1. Universal Credit Enforcement Hook
Create a single `useAIAction` wrapper hook that every AI feature must go through. It handles: check credits -> execute action -> deduct credits -> show feedback. This replaces the scattered `checkCredits()` / `incrementUsage.mutate()` calls.

#### 2. Enhanced Credit Indicator (Dashboard + AI Studio headers)
Replace the plain number with a small progress ring showing daily usage visually:
- Ring fills as credits are used (green -> amber -> red)
- Tapping it opens a "Credit Usage" sheet with breakdown
- Animated deduction: when a credit is spent, the number ticks down with a brief scale animation

#### 3. Credit Usage Sheet
A bottom sheet accessible from the credit indicator showing:
- Daily usage ring chart (e.g., "14 / 20 used today")
- Per-category breakdown (Enhance: 4, Tailor: 2, Score: 3, etc.) pulled from `ai_usage_logs`
- "Resets at midnight" countdown
- Total lifetime usage stat

#### 4. Wire All AI Features to Credit System
Connect the remaining 16+ unwired features to the credit check/deduct flow:
- `score-resume`, `tailor-resume`, `analyze-resume`, `career-path-advisor`
- `generate-cover-letter`, `recruiter-simulation`, `optimize-for-linkedin`
- `detect-and-humanize`, `one-page-optimizer`, `proofread-resume`
- `interview-chat`, `agentic-chat`, `career-assessment`
- `explain-gap`, `fill-gap`, `generate-headshot`

#### 5. Cost Badges on All AI Buttons
Add `AICostBadge` to every AI action button across the app so users always know the cost before they click.

#### 6. Credit Deduction Toast
After each AI action, show a subtle toast: "1 credit used -- 15 remaining" with the Zap icon, so users always know what happened.

---

### Technical Details

**New files:**
- `src/hooks/useAIAction.ts` -- Universal wrapper that calls `checkCredits`, runs the action, calls `incrementUsage`, and shows the deduction toast
- `src/components/ai/CreditUsageSheet.tsx` -- Bottom sheet with usage ring and per-category breakdown
- `src/components/ai/CreditRing.tsx` -- Small circular progress indicator replacing the plain number

**Modified files:**
- `src/components/editor/ai/AICreditsIndicator.tsx` -- Replace with `CreditRing` + tap to open `CreditUsageSheet`
- `src/hooks/useAIEnhance.ts` -- Replace manual `checkCredits`/`incrementUsage` with `useAIAction`
- `src/components/editor/ai/AIEnhanceSheet.tsx` -- Same cleanup
- `src/components/editor/TailorSheet.tsx` -- Wire to credit system
- `src/components/editor/ATSScanSheet.tsx` -- Wire to credit system
- `src/components/editor/tailor/CoverLetterGenerator.tsx` -- Wire to credit system
- `src/components/editor/ai/RecruiterSimSheet.tsx` -- Wire to credit system
- `src/components/editor/ai/LinkedInOptimizerSheet.tsx` -- Wire to credit system
- `src/components/editor/ai/AIDetectorSheet.tsx` -- Wire to credit system
- `src/components/editor/ai/OnePageWizardSheet.tsx` -- Wire to credit system
- `src/components/editor/CareerPathSheet.tsx` -- Wire to credit system
- `src/components/editor/GapExplainerSheet.tsx` -- Wire to credit system
- `src/components/editor/GapFillerSheet.tsx` -- Wire to credit system
- `src/components/editor/AgenticChatSheet.tsx` -- Wire to credit system
- `src/components/editor/ProofreadSheet.tsx` -- Wire to credit system
- `src/pages/InterviewPage.tsx` -- Wire to credit system
- All AI action buttons -- Add `AICostBadge` where missing

**Database:**
- Query `ai_usage_logs` table (already exists) for per-category breakdown in the usage sheet
- No new tables needed

**Estimated scope:** This is a large change touching 20+ files. Recommend breaking into 3 phases:
1. Phase 1: `useAIAction` hook + wire all features (core enforcement)
2. Phase 2: `CreditRing` indicator + `CreditUsageSheet` (visual upgrade)
3. Phase 3: Cost badges on all remaining buttons + deduction toasts (polish)
