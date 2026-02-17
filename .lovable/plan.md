
## Add AICostBadge to AI Trigger Points

### Changes

Three files need a small addition -- importing `AICostBadge` and placing it next to the sheet title.

**1. `src/components/editor/TailorSheet.tsx`**
- Import `AICostBadge`
- Add `<AICostBadge operation="tailor" />` next to the "AI Resume Tailor" title (line ~401), showing "~2 credits"

**2. `src/components/editor/ai/AIEnhanceSheet.tsx`**
- Import `AICostBadge`
- Add `<AICostBadge operation="enhance" />` next to the "AI Enhance" title (line ~198), showing "~1 credit"

**3. `src/components/editor/tailor/CoverLetterGenerator.tsx`**
- Import `AICostBadge`
- Add `<AICostBadge operation="cover-letter" />` next to the "Cover Letter" title (line ~189), showing "~2 credits"

Each badge will appear as a small inline pill (e.g., "~2 credits") right after the sheet title text, using the existing `AICostBadge` component and `aiCostEstimates` map. No new files or logic needed.
