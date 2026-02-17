

## Fix: Hybrid Deterministic + AI Scoring for Real ATS Accuracy

### Problem

Scanning the **same resume twice without any changes** produces scores that differ by ~9 points. This happens because all 6 scoring pillars are evaluated by an AI model, even though 4 of them are **factual checks** that can be computed deterministically with code:

- **Contact Completeness**: Does the resume have a name? Email? Phone? LinkedIn? This is a yes/no checklist -- not an opinion.
- **Section Structure**: Are Experience, Education, Skills, Summary sections present? Code can check `resume.experience.length > 0`.
- **Parsability**: Are dates consistent? Are there special characters? Code can validate date formats with regex.
- **Length and Density**: How many bullets, how many words? Pure arithmetic.

Asking an AI model to count whether an email exists is wasteful and introduces random variance. The AI should ONLY evaluate the 2 subjective pillars: **Keyword Optimization** and **Content Quality** -- things that genuinely require language understanding.

### Solution: Hybrid Scoring

Split the 6 pillars into two groups:

| Group | Pillars | How Scored |
|-------|---------|------------|
| **Deterministic (code)** | Contact Completeness, Section Structure, Parsability, Length and Density | Computed server-side with exact rules -- same input always = same output |
| **AI-evaluated** | Keyword Optimization, Content Quality | Scored by gemini-2.5-flash with strict rubrics |

The overall score is still the same weighted average. But now 4 of 6 pillars are perfectly reproducible, and only the 2 subjective pillars have any AI variance. This reduces total score variance from ~9 points to ~1-2 points maximum.

### Deterministic Scoring Rules

**Contact Completeness (10% weight):**
- Full name present and non-empty: +20 points
- Email present and non-empty: +20 points
- Phone present and non-empty: +20 points
- Location present and non-empty: +20 points
- LinkedIn/portfolio present and non-empty: +20 points
- Score = sum of present fields (0, 20, 40, 60, 80, or 100)

**Section Structure (15% weight):**
- Has Summary (non-empty string): +20 points
- Has Experience (array with 1+ entries): +25 points
- Has Education (array with 1+ entries): +20 points
- Has Skills (array with 1+ items): +20 points
- Has optional sections (certifications, projects, awards, volunteering, languages -- any 1+): +15 points
- Score = sum (capped at 100)

**Parsability (10% weight):**
- Start with 100, deduct for issues:
- Inconsistent date formats (mix of formats across experience/education): -15
- Missing dates on experience entries: -10 per entry (max -30)
- Description fields contain bullet characters or symbols: -10
- Empty description on experience entries: -15 per entry (max -30)
- Floor at 0

**Length and Density (5% weight):**
- Count total experience bullets (achievements + responsibilities)
- Count total skills
- 0 bullets: 10 points
- 1-3 bullets: 30 points
- 4-8 bullets: 50 points
- 9-15 bullets: 75 points
- 16+ bullets: 100 points
- Adjust: if skills < 3, subtract 20; if experience entries < 1, subtract 30
- Floor at 0, cap at 100

### Changes

**`supabase/functions/score-resume/index.ts`** -- Major rewrite

1. Add 4 deterministic scoring functions that compute scores from the resume data directly (no AI)
2. Reduce the AI prompt to ONLY evaluate Keyword Optimization and Content Quality (2 pillars instead of 6)
3. Compute the weighted overall score server-side by combining the 4 deterministic scores with the 2 AI scores
4. The AI prompt becomes much simpler and more focused, reducing variance further
5. Add server-side validation: verify the AI returns numbers in 0-100 range, clamp if needed

No changes needed to the frontend -- the response shape (`overallScore`, `categories` with the same 6 keys, `topStrength`, `topImprovement`) stays identical. The UI, history store, and trend chart all work as-is.

### Technical Detail

```text
Server-side flow:
1. Parse resume data
2. Compute 4 deterministic scores (pure code, zero variance)
3. Send ONLY summary + skills + experience + education text to AI
4. AI returns: { keywordOptimization: N, contentQuality: N, topStrength: "...", topImprovement: "..." }
5. Combine all 6 scores with weights:
   overall = kw*0.35 + cq*0.25 + ss*0.15 + pa*0.10 + cc*0.10 + ld*0.05
6. Return full result
```

### What This Guarantees

- Contact Completeness will ALWAYS return the same score for the same resume (it's arithmetic)
- Section Structure will ALWAYS return the same score (it's presence checks)
- Parsability will ALWAYS return the same score (it's regex/format checks)
- Length and Density will ALWAYS return the same score (it's counting)
- Only Keyword Optimization and Content Quality have any AI variance (~1-2 points each)
- Total score variance drops from ~9 points to ~1 point maximum
- No more "scam" scores -- what you see is what your resume actually has
