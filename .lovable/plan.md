

## Fix: 100% Deterministic ATS Scoring -- No More Fake Score Changes

### The Problem

Scanning the **exact same CV twice** without changing anything gives different scores (85 then 91). This happens because 60% of the score is computed by an AI model, and AI models are inherently non-deterministic -- even with `temperature: 0`. This makes the app unreliable and misleading.

### The Solution

**Remove AI completely from scoring.** Replace the two AI-evaluated pillars (Keyword Optimization and Content Quality) with deterministic, code-based analysis. The same resume will ALWAYS produce the exact same score, guaranteed.

### How the New Deterministic Pillars Work

**Keyword Optimization (35% weight) -- Code-based:**
- Extract all skills from the resume's skills array
- Check how many skills appear in the experience descriptions and summary (keyword echo)
- Check for industry tool/technology mentions (programming languages, frameworks, certifications)
- Count unique technical terms vs generic words
- Scoring rubric:
  - 0 skills listed: 0 points
  - Skills listed but none echoed in experience/summary: 25 points
  - 1-30% of skills echoed: 40 points
  - 31-60% of skills echoed: 60 points
  - 61-80% of skills echoed: 80 points
  - 81-100% of skills echoed: 95 points
  - Bonus +5 if 8+ unique skills (capped at 100)

**Content Quality (25% weight) -- Code-based:**
- Count action verbs at the start of bullet points/achievements (e.g., "Led", "Developed", "Increased", "Managed")
- Count quantified achievements (bullets containing numbers, percentages, dollar amounts)
- Check bullet length (too short = vague, too long = unfocused)
- Scoring rubric:
  - Count total bullets across all experience entries
  - Action verb ratio: (bullets starting with action verb / total bullets)
  - Quantified ratio: (bullets with numbers / total bullets)
  - Base score = (actionVerbRatio * 50) + (quantifiedRatio * 50)
  - If 0 bullets: score = 5
  - If all descriptions are just paragraphs (no bullets): score = max 40

### What Changes

**`supabase/functions/score-resume/index.ts`** -- Replace AI call with two new deterministic functions:

1. Remove the `callAI` import and all AI-related code (the prompt, the AI call, the JSON parsing)
2. Add `scoreKeywordOptimization(resume)` function that:
   - Extracts skills as lowercase strings
   - Concatenates all experience descriptions, achievements, responsibilities, and summary into one text blob
   - Counts how many skills appear in that text blob
   - Applies the rubric above
3. Add `scoreContentQuality(resume)` function that:
   - Collects all achievement and responsibility bullets
   - Checks each bullet against a list of ~60 common action verbs
   - Checks each bullet for numeric patterns (digits, %, $)
   - Applies the rubric above
4. Add deterministic `topStrength` and `topImprovement` generation based on which pillar scored highest/lowest
5. Remove AI imports (`callAI`, `isAIError`, `parseAIJSON`) -- no longer needed
6. Remove the `background` parameter handling since scoring is now instant (no AI latency)

**`src/hooks/useResumeScore.ts`** -- Remove AI credit consumption:

1. Remove `trackGeminiUsage()` calls since no AI is used
2. Remove `incrementUsage.mutate()` and the credit toast since scoring no longer costs credits
3. Remove the `checkCredits` gate -- users can score unlimited times for free
4. Keep the cache mechanism (still useful to avoid unnecessary network calls)

### The Overall Score Formula (unchanged)

```
overall = keywordOptimization * 0.35
        + contentQuality * 0.25
        + sectionStructure * 0.15
        + parsability * 0.10
        + contactCompleteness * 0.10
        + lengthDensity * 0.05
```

All 6 pillars are now computed by code. Same input = same output, every single time.

### What This Guarantees

- Score the same CV 100 times: you get the exact same number every time
- Score only changes when the user actually changes CV content
- Real improvements (adding action verbs, adding numbers, adding skills) produce real score increases
- No AI credits consumed for scoring
- Faster response time (no waiting for AI model)
- The `topStrength` and `topImprovement` messages are generated from the actual data analysis, not hallucinated by AI

### Technical Details

| File | Change |
|------|--------|
| `supabase/functions/score-resume/index.ts` | Remove all AI code; add `scoreKeywordOptimization()` and `scoreContentQuality()` deterministic functions; add deterministic feedback generation |
| `src/hooks/useResumeScore.ts` | Remove AI credit tracking, remove credit checks, keep caching |

### Action Verb List (built into the function)

The content quality scorer will check against these common resume action verbs: Led, Managed, Developed, Created, Implemented, Designed, Built, Achieved, Increased, Decreased, Reduced, Improved, Launched, Delivered, Coordinated, Supervised, Trained, Mentored, Analyzed, Resolved, Negotiated, Streamlined, Optimized, Automated, Spearheaded, Pioneered, Established, Maintained, Organized, Executed, Collaborated, Facilitated, Generated, Secured, Transformed, Oversaw, Directed, Administered, Initiated, Consolidated, Restructured, Revamped, Formulated, Architected, Engineered, Deployed, Integrated, Migrated, Monitored, Evaluated, Assessed, Researched, Presented, Published, Authored, Documented, Configured, Troubleshot, Debugged

