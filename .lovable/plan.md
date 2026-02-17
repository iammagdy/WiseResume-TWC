

## Fix Score Dropping After AI Enhancement + Collapsible Results UI

### Root Cause Analysis

Two fundamental problems cause the score to drop from 78% to 45% after "Improve Score":

**Problem 1: Prompt Misalignment**
The "Improve Score" button triggers the `improve` action in `enhance-section`, whose prompt simply says *"Improve the existing content to be more impactful and professional."* This has zero awareness of ATS scoring criteria. Meanwhile, the scorer evaluates four specific categories: completeness, atsReadiness, impactLanguage, and formatting. The enhance AI may remove keywords, restructure sections, or use creative phrasing that the scorer penalizes.

**Problem 2: Model + Temperature Mismatch**
- Scorer: `gemini-2.5-flash-lite` at `temperature: 0` (deterministic)
- Enhancer: `gemini-2.5-flash` at `temperature: 0.7` (creative/variable)

The creative temperature means the enhancer's output is unpredictable, and a different, cheaper model scores it -- producing inconsistent evaluations.

### Solution

#### 1. New ATS-Aware Enhancement Prompt (`enhance-section/index.ts`)

When the action is `improve` and the flow originates from "Improve Score", use a dedicated ATS-optimized prompt that explicitly targets the four scoring criteria:

- **Completeness**: Preserve all existing content; do not remove information
- **ATS Readiness**: Retain and add industry-standard keywords; use standard section formatting
- **Impact Language**: Use strong action verbs and quantify achievements with metrics
- **Formatting**: Keep contact info intact, dates consistent, professional structure

This will be triggered by adding a new action type `ats_improve` (distinct from the generic `improve`) so existing enhance flows are not affected.

Add `'ats_improve'` to `VALID_ACTIONS` and create a dedicated prompt:

```
Optimize this resume section specifically for ATS (Applicant Tracking System) compatibility and scoring.

Rules:
1. NEVER remove existing content or keywords -- only add and improve
2. Add relevant industry keywords naturally within context
3. Replace weak verbs with strong action verbs (Led, Delivered, Optimized, etc.)
4. Add quantifiable metrics where possible (%, $, team sizes, timeframes)
5. Keep standard formatting -- no special characters, clean structure
6. Preserve all dates, company names, and factual information exactly
```

#### 2. Lower Temperature for ATS Enhancement (`enhance-section/index.ts`)

When action is `ats_improve`, use `temperature: 0.3` instead of `0.7` to produce more consistent, predictable improvements that align with what the scorer expects.

#### 3. "Improve Score" Button Triggers `ats_improve` (`AIEnhanceSheet.tsx`)

Add an `atsMode` prop to `AIEnhanceSheet`. When opened via "Improve Score", it:
- Auto-selects the `ats_improve` mode (hidden from mode selector since it's contextual)
- Passes `action: 'ats_improve'` to the edge function
- Shows a header indicating "ATS Score Optimization" instead of generic "AI Enhance"

#### 4. Collapsible Results Sections (`AIEnhanceSheet.tsx`)

Make each result card collapsed by default, showing only:
- Section name + Applied/Pending badge
- Number of changes made (e.g., "3 improvements")
- Expand arrow to reveal the full Original vs Enhanced comparison

When expanded, show the existing comparison UI (original, enhanced, changes, tips, apply/discard buttons).

### Technical Changes

| File | Change |
|------|--------|
| `supabase/functions/enhance-section/index.ts` | Add `ats_improve` to `VALID_ACTIONS`; add ATS-specific prompt in `buildPrompt`; use `temperature: 0.3` for `ats_improve` |
| `src/components/editor/ai/AIEnhanceSheet.tsx` | Add `atsMode` prop; auto-select `ats_improve` when from "Improve Score"; make result cards collapsed by default with expand/collapse toggle |
| `src/components/dashboard/ATSScoreBreakdown.tsx` | Pass `atsMode={true}` when opening enhance sheet from "Improve Score" button |
| `src/pages/ResumeDetailPage.tsx` | Pass `atsMode={true}` when opening enhance sheet from "Improve Score" button |
| `src/hooks/useAIEnhance.ts` | Add `'ats_improve'` to the `ActionType` union |

### Expected Outcome

- "Improve Score" will produce content that is specifically optimized for the same criteria the scorer evaluates
- Scores should consistently go UP after applying ATS improvements (never down)
- Lower temperature ensures predictable, conservative improvements
- Result sections are compact by default, expandable on demand for comparison

