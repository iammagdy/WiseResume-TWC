

## Real ATS-Standard Scoring System

### Problem
The current scoring prompt is a generic "rate this resume's quality" instruction with vague categories. It doesn't reflect how real Applicant Tracking Systems actually evaluate resumes. Real ATS systems use specific, weighted criteria based on industry standards -- keyword density, parsability, section structure, quantified achievements, and formatting compliance. The current approach produces inconsistent, unreliable scores that don't correlate with actual ATS performance.

### What Real ATS Systems Evaluate (Based on Industry Research)

Real ATS scoring is built on **6 pillars** with specific weights:

| Pillar | Weight | What It Measures |
|--------|--------|------------------|
| Keyword Optimization | 35% | Industry terms, hard/soft skills, tools, certifications present |
| Content Quality | 25% | Action verbs, quantified achievements (%, $, numbers), result-oriented bullets |
| Section Structure | 15% | Standard headers (Experience, Education, Skills), logical ordering, no missing critical sections |
| Parsability | 10% | Clean text (no special characters, tables, columns), consistent date formats, standard job titles |
| Contact Completeness | 10% | Full name, email, phone, location, LinkedIn URL present and valid |
| Length and Density | 5% | Appropriate length (1-2 pages worth of content), bullet density, no empty filler |

### Solution

Rewrite the `score-resume` edge function prompt to use these real ATS pillars with explicit rubrics for each score range. Also upgrade the model from `gemini-2.5-flash-lite` to `gemini-2.5-flash` for more accurate, nuanced evaluation.

### Changes

**1. `supabase/functions/score-resume/index.ts`** -- Complete prompt rewrite

Replace the system and user prompts with an ATS-standards-based scoring system:

- **System prompt**: Define the AI as an ATS parsing engine that evaluates resumes the way Greenhouse, Lever, Workday, and Taleo do
- **User prompt**: Provide explicit rubrics for each of the 6 categories with score ranges (0-25, 26-50, 51-75, 76-100) and what qualifies for each
- **Model upgrade**: Switch from `gemini-2.5-flash-lite` to `gemini-2.5-flash` for better evaluation accuracy
- **Updated response schema**: Change categories from `{completeness, atsReadiness, impactLanguage, formatting}` to `{keywordOptimization, contentQuality, sectionStructure, parsability, contactCompleteness, lengthDensity}`
- **Weighted overall score**: The overall score is calculated as a weighted average (not simple average) based on the pillar weights above
- **Send full resume data**: Include achievements, responsibilities, certifications, awards, projects, languages, and hobbies in the prompt so the AI can evaluate the full picture (not just summary-level data)

**2. `src/hooks/useResumeScore.ts`** -- Update the `ResumeHealthScore` interface

Update the `categories` type to match the new 6-pillar structure:
```
categories: {
  keywordOptimization: number;
  contentQuality: number;
  sectionStructure: number;
  parsability: number;
  contactCompleteness: number;
  lengthDensity: number;
}
```

**3. `src/components/dashboard/ATSScoreBreakdown.tsx`** -- Update category labels and hints

- Update `CATEGORY_LABELS` to match new category keys
- Update `CATEGORY_HINTS` with actionable advice for each new category
- Keep the same visual layout (collapsible, color-coded bars)

**4. `src/store/atsScoreHistoryStore.ts`** -- Update the `ScoreHistoryEntry` type

Update the `categories` type to match the new 6-pillar structure so history entries are consistent.

**5. `src/components/dashboard/ATSScoreTrendChart.tsx`** -- Update chart series

If this component renders per-category trend lines, update the category keys to match the new 6 pillars.

**6. `supabase/functions/enhance-section/index.ts`** -- Align `ats_improve` prompt

Update the `ats_improve` prompt to reference the same 6 scoring pillars, so enhancements directly target what the scorer evaluates. This ensures improvements always increase the score.

### What Stays the Same
- The scoring API contract (endpoint, auth, rate limiting)
- The `overallScore`, `topStrength`, `topImprovement` fields
- The collapsible UI pattern in ATSScoreBreakdown
- Cache invalidation logic in useResumeScore
- Background scoring behavior

### Technical Details

| File | Change |
|------|--------|
| `supabase/functions/score-resume/index.ts` | Rewrite prompts with 6-pillar ATS rubric; upgrade model to `gemini-2.5-flash`; send full resume data; weighted scoring |
| `src/hooks/useResumeScore.ts` | Update `ResumeHealthScore.categories` type to 6 new keys |
| `src/components/dashboard/ATSScoreBreakdown.tsx` | Update `CATEGORY_LABELS` and `CATEGORY_HINTS` for 6 pillars |
| `src/store/atsScoreHistoryStore.ts` | Update `ScoreHistoryEntry.categories` type |
| `src/components/dashboard/ATSScoreTrendChart.tsx` | Update category keys if used in chart series |
| `supabase/functions/enhance-section/index.ts` | Align `ats_improve` prompt with same 6 pillars |

