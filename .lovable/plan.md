
# Fix CV Parsing: Deploy Edge Function + Fix Multi-Value Location Validation

## Problem
Two issues are causing the parsing to still produce `"location": "Python, SQ"` with empty skills:

1. **Edge function not deployed**: The `parse-resume` edge function has no logs, meaning the updated code with the improved prompt, relaxed schema, and `validateAndFixFields` was never deployed to production.

2. **Regex doesn't handle comma-separated values**: Even once deployed, `validateAndFixFields` uses `^(python|...)$` which only matches exact single-word strings. The AI is returning `"Python, SQ"` (comma-separated list of skills), which doesn't match the anchored pattern.

## Changes

### 1. Fix `validateAndFixFields` in edge function
**File: `supabase/functions/parse-resume/index.ts`** (line 572-602)

Update the location validation to handle comma-separated values:

```text
// Current (broken for "Python, SQ"):
if (location && SKILL_PATTERN.test(location)) { ... }

// Fixed:
// Split location by comma/semicolon, check each part
const locationParts = location.split(/[,;]/).map(p => p.trim()).filter(Boolean);
const skillParts: string[] = [];
const geoParts: string[] = [];

for (const part of locationParts) {
  if (SKILL_PATTERN.test(part)) {
    skillParts.push(part);
  } else {
    geoParts.push(part);
  }
}

if (skillParts.length > 0) {
  skills.push(...skillParts);
  data.contactInfo.location = geoParts.join(', ');
}
```

Also add more common skill abbreviations to the pattern: `sq|sql|api|apis|numpy|pandas|nosql|sass|less|ci|cd`.

### 2. Deploy the edge function
After making the code fix, deploy `parse-resume` so the changes actually take effect in production.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/parse-resume/index.ts` | Fix `validateAndFixFields` to handle comma-separated location values + add more skill patterns |

## No Other Changes Needed
The system prompt, schema relaxation, email/URL protection in `textPreprocessor.ts`, and contact hints in `pdfParser.ts` are all already correctly implemented in the codebase -- they just need to be deployed.
