

## Build a Complete AI Credit System

### ✅ Phase 1: Universal Credit Enforcement (DONE)
- Created `src/hooks/useAIAction.ts` — universal wrapper hook
- Wired 14 AI features to credit system:
  - `useAIEnhance` (enhance-section)
  - `TailorSheet` (tailor-resume)
  - `RecruiterSimSheet` (recruiter-simulation)
  - `LinkedInOptimizerSheet` (optimize-for-linkedin)
  - `AIDetectorSheet` (detect-and-humanize)
  - `OnePageWizardSheet` (one-page-optimizer)
  - `CareerPathSheet` (career-path-advisor)
  - `GapExplainerSheet` (explain-gap)
  - `GapFillerSheet` (fill-gap)
  - `CoverLetterGenerator` (generate-cover-letter)
  - `useAgenticChat` (agentic-chat)
  - `useResumeScore` (score-resume)

### ✅ Phase 2: Visual Credit Upgrades (DONE)
- Created `src/components/ai/CreditRing.tsx` — circular progress ring (green→amber→red)
- Created `src/components/ai/CreditUsageSheet.tsx` — bottom sheet with daily breakdown
- Updated `AICreditsIndicator.tsx` — tappable ring that opens usage sheet

### Remaining (Phase 3 - Polish)
- Add `AICostBadge` to remaining AI action buttons that don't have it yet
- Wire `proofread-resume` manual "Check Now" to credit system
- Wire `interview-chat` to credit system (in useVoiceInterview)
- Wire `career-assessment` quiz to credit system
- Wire `generate-headshot` to credit system
