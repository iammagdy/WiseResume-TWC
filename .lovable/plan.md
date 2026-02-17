

## Fix: AI Enhancements Destroying Resume Data (Score Drop Root Cause)

### Root Cause

The score drops from 78 to 49 because **the enhanced content is being truncated and corrupted before it's applied to the resume**.

Here's the chain of events:

1. The AI returns proper structured data (arrays of experience objects, skill arrays, etc.)
2. `contentToString()` on line 71 converts arrays to JSON and **truncates to 500 characters**: `.slice(0, 500)`
3. This truncated string is stored as `improved` in the `SectionResult`
4. When the user clicks "Apply", `applyResult()` tries to `JSON.parse()` that truncated string
5. The truncated JSON is invalid, so parsing fails
6. The `catch` block applies the raw truncated string directly to the resume store
7. The resume now has corrupted/incomplete data instead of proper structured content
8. The scorer reads this broken data and gives a much lower score

For example, an experience section with 5 detailed entries becomes a 500-character fragment of broken JSON. The scorer sees "No description" for most entries.

### Fix

**Store the raw AI response data separately from the display string.** The `SectionResult` interface needs a `rawImproved` field that holds the actual structured data from the AI, while `improved` (the string) is only used for display.

### Changes

**`src/components/editor/ai/AIEnhanceSheet.tsx`**

1. Add `rawImproved: unknown` to the `SectionResult` interface -- this holds the actual AI data (arrays, objects, strings)
2. When storing results (line 146-154), set `rawImproved: data.improved` (the raw AI response) and keep `improved: contentToString(data.improved)` for display only
3. Remove the `.slice(0, 500)` truncation in `contentToString` -- use a separate `contentToPreview()` for display that truncates, but never truncate the stored data
4. In `applyResult()`, use `result.rawImproved` directly instead of trying to parse the display string back into data. This eliminates the JSON parse/truncation problem entirely
5. The display strings (`original` and `improved` shown in the UI) can still be truncated for readability -- they're only for visual comparison

### Technical Details

| File | Change |
|------|--------|
| `src/components/editor/ai/AIEnhanceSheet.tsx` | Add `rawImproved` field to `SectionResult`; store raw AI data; fix `applyResult` to use raw data; separate display truncation from data storage |

### Why This Guarantees Scores Go Up

- The scorer receives the same structured data the AI produced
- No truncation, no broken JSON, no data loss
- The `ats_improve` prompt already targets the exact 6 scoring pillars
- With intact data, the scorer will see all the keywords, action verbs, and metrics the enhancer added

