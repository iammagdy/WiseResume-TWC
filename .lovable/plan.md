

## AI Scoring Reliability Audit -- Critical Fixes

### Problem Summary

Several AI scoring and enhancement features silently return **fake hardcoded scores** when the AI response fails to parse, instead of surfacing an error. Users relying on these scores to land real jobs would get misleading data.

---

### Issue 1: CRITICAL -- `analyze-resume` returns fake scores on parse failure

**File:** `supabase/functions/analyze-resume/index.ts` (lines 139-158)

When `parseAIJSON()` returns `null` (AI response is malformed), the function silently falls back to **hardcoded fake scores**:

```
overallScore: 65, skillsMatch: 60, experienceRelevance: 70,
keywordAlignment: 55, atsCompatibility: 75
```

These numbers are completely fabricated -- not based on the user's actual resume or job description. A user could have a terrible resume and still see "65/100", or an excellent one and still see "65/100".

**Fix:** Remove the fallback object. Return a `502` error like `score-resume` already does, so the client shows "Analysis failed. Try again." instead of fake data.

---

### Issue 2: CRITICAL -- `tailor-resume` returns fake before/after scores on partial parse

**File:** `supabase/functions/tailor-resume/index.ts` (lines 378-413)

When the AI response is partially parsed but missing scoring fields, the function fills in **hardcoded fallback scores**:

```
overallScore: { before: 62, after: 86 }
sectionScores: { summary: { before: 60, after: 85 }, ... }
atsAnalysis: { originalKeywordDensity: 0, optimizedKeywordDensity: 0 }
```

This is dangerous because:
- The tailored resume content is real (from AI), but the scores next to it are fake
- A user sees "before: 62, after: 86" and thinks the tailoring improved their resume by 24 points, when in reality the AI just didn't return scores
- The `atsAnalysis` defaults to `0` density which contradicts the actual keyword improvements

**Fix:** Keep empty arrays for list fields (missingSkills, etc.) since those are optional display data. But for `overallScore` and `sectionScores`, mark them as `null` when missing so the UI can show "Score unavailable" instead of fake numbers.

---

### Issue 3: IMPORTANT -- `proofread-resume` returns fake writing scores on parse failure

**File:** `supabase/functions/proofread-resume/index.ts` (lines 136-140, 157-159)

Two places return fake scores:
1. When `parseAIJSON()` returns null: returns `{ overall: 80, spelling: 90, grammar: 85, style: 75 }` -- completely fabricated
2. When individual score fields are missing: defaults to `overall: 80, spelling: 90, grammar: 85, style: 75`

A resume full of typos would show "Spelling: 90" if the AI response has a parsing issue.

**Fix:** Return a `502` error when parsing fails entirely (line 136-140). For the individual field defaults (line 157-159), use `0` instead of inflated fake numbers -- this makes it obvious to the user that scoring wasn't available.

---

### Issue 4: IMPORTANT -- `enhance-section` returns raw AI text as "enhanced content" on parse failure

**File:** `supabase/functions/enhance-section/index.ts` (lines 162-166)

When `parseAIJSON()` fails, the fallback returns:
```
{ improved: content, changes: ['AI enhanced the content'], suggestions: [] }
```

Where `content` is the raw AI text (which may include markdown, code fences, or garbage). This raw text could be injected into the user's resume as an "improvement," corrupting their resume content.

**Fix:** Return a `502` error instead of silently injecting potentially malformed content.

---

### Issue 5: MODERATE -- `jobMatchScorer.ts` crashes on object-type skills

**File:** `src/lib/jobMatchScorer.ts` (line 45)

```typescript
const resumeSkills = (resume.skills || []).map(s => s.toLowerCase());
```

If skills are objects (`{name: "React"}`), calling `.toLowerCase()` on an object returns `"[object object]"`, making all keyword matching fail silently. The score would show 0% skill match even for perfectly matching resumes.

**Fix:** Use the same safe extraction pattern: `s => (typeof s === 'string' ? s : s?.name || '').toLowerCase()`

---

### Issue 6: LOW -- `proofread-resume` score clamping hides failures

**File:** `supabase/functions/proofread-resume/index.ts` (lines 156-164)

The `Math.min(100, Math.max(0, ...))` clamping is correct, but the default values (`?? 80`, `?? 90`, etc.) silently mask when the AI didn't return a score for a category. Combined with the clamping, this makes it impossible for the UI to know if a score is real or fake.

**Fix:** Addressed as part of Issue 3 -- use `0` instead of inflated defaults.

---

### Implementation Plan

**File 1: `supabase/functions/analyze-resume/index.ts`**
- Lines 139-158: Replace the `?? { fake fallback }` with a proper `502` error response when `parseAIJSON()` returns null

**File 2: `supabase/functions/tailor-resume/index.ts`**
- Lines 378-413: Change `overallScore` and `sectionScores` fallbacks to `null` instead of fake numbers
- Keep empty array defaults for optional list fields (missingSkills, etc.)

**File 3: `supabase/functions/proofread-resume/index.ts`**
- Lines 136-140: Return `502` error instead of fake scores when parsing fails
- Lines 157-159: Change defaults from `80/90/85/75` to `0`

**File 4: `supabase/functions/enhance-section/index.ts`**
- Lines 162-166: Return `502` error instead of injecting raw AI text into resume

**File 5: `src/lib/jobMatchScorer.ts`**
- Line 45: Fix object-type skills handling with safe extraction

**File 6: Client-side UI (optional but recommended)**
- In `TailorSheet` or wherever `sectionScores`/`overallScore` is displayed: handle `null` gracefully by showing "Score unavailable" instead of rendering `null` as `0`

---

### What's Already Solid (No Changes Needed)

- `score-resume`: Correctly returns `502` error when parsing fails (line 118-122). No fake fallbacks. Uses `temperature: 0` for consistency.
- `recruiter-simulation`: Returns `500` error when parsing fails (line 199-203). No fake fallbacks.
- `useResumeScore.ts` (client): Returns `null` on failure, shows toast error. No fake scores displayed.
- `ATSScoreBreakdown.tsx`: Only renders real AI scores from `ResumeHealthScore`. No hardcoded values.
- `resumeCompletionRules.ts`: Client-side completeness calculator -- purely rules-based, no AI. Correctly labeled as "Completeness" not "ATS Score."
- `JobMatchScore.tsx`: Already shows disclaimer: "This score is based on keyword overlap... not a deep AI analysis." Honest labeling.
- `callAI()` shared helper: Proper 30-second timeout, error categorization, no silent failures.

