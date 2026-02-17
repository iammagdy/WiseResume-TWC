

## Fix: Align AI Enhancement Prompts with Deterministic Scoring Rules

### Root Cause

The `enhance-section` edge function uses generic "improve" prompts that don't know about the 6 deterministic scoring pillars. So the AI can "improve" a section in ways that actually HURT the score:

- **Skills**: AI renames "React" to "React.js Development" or "Python" to "Python Programming Language". The keyword echo scorer does `textBlob.includes(skill)` -- longer/different skill names break the match, dropping Keyword Optimization (35% weight).
- **Education**: AI reformats dates (e.g., "2020" becomes "January 2020"), causing mixed date formats. Parsability deducts 15 points for inconsistent formats.
- **Experience**: AI may rephrase bullets removing action verbs from the start or removing specific numbers, dropping Content Quality (25% weight).
- **Summary**: AI may rewrite without echoing listed skills, hurting Keyword Optimization.

### The Fix

Update the `enhance-section` edge function's `buildPrompt()` to inject scoring-aware constraints for the `ats_improve` action (used by "Improve Score"). These constraints tell the AI exactly what the scorer measures:

**For Skills section:**
- NEVER rename, merge, or remove existing skills
- Only ADD new relevant skills
- Keep each skill as a short string (1-3 words max)
- Include the user's exact listed skill names so the AI preserves them

**For Experience section:**
- Every bullet MUST start with one of the exact action verbs from the scorer's list (Led, Managed, Developed, etc.)
- Every bullet MUST include at least one number, percentage, or dollar amount
- NEVER remove existing bullets, only improve or add
- Preserve all date formats exactly as they are

**For Education section:**
- Preserve all date formats exactly -- do not reformat dates
- Preserve institution names, degree names, and field names exactly
- Only enhance GPA presentation or add relevant coursework if missing

**For Summary section:**
- Must mention at least 3-5 skills from the user's skills list by exact name
- Use strong action verbs from the scorer's list
- Include quantified achievements (numbers, years of experience)

### What Changes

| File | Change |
|------|--------|
| `supabase/functions/enhance-section/index.ts` | Update `buildPrompt()` to add scoring-aligned constraints for the `ats_improve` action. Add the ACTION_VERBS list and inject section-specific scoring rules into the prompt. |

### Technical Details

In `buildPrompt()`, the existing `ats_improve` action prompt (lines ~70-90 of enhance-section) will be replaced with a version that includes:

1. The exact list of 60 action verbs the scorer checks for
2. Section-specific rules that match what the deterministic scorer measures
3. For skills: the instruction to preserve existing skill names verbatim and only add new ones
4. For experience: explicit requirement that every bullet starts with an action verb AND contains a metric
5. For education: explicit instruction to not touch date formats
6. For summary: explicit instruction to echo skill names from the skills array

This means "Improve Score" will produce enhancements that are guaranteed to improve (or at worst maintain) the deterministic score, because the AI will be optimizing for the exact same criteria the scorer checks.
