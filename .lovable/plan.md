

## Fix: AI Enhancements Must Produce Schema-Correct Data

### The Real Problem

The score drops because the AI enhancer returns **structurally invalid data** that doesn't match the app's TypeScript types. For example:

- **Experience**: The app expects `{ id, company, position, startDate, endDate, current, description, achievements, responsibilities }` but the AI returns objects missing `id`, `achievements`, `responsibilities`, and `current` fields
- **Education**: The app expects `{ id, institution, degree, field, startDate, endDate, gpa }` but the AI returns objects with different/missing keys
- **Skills**: Sometimes returns `{ name: "Python", level: "Expert" }` objects instead of plain strings

When these malformed objects are stored in the resume, the scorer sees incomplete data (empty descriptions, missing achievements) and penalizes heavily. The `sanitizeAIContent` function only strips Markdown -- it does NOT validate or repair the schema.

### Root Cause Chain
1. The enhance prompt says `"improved": <the enhanced content - string for summary, object for experience/education, array for skills>` -- this is far too vague
2. AI returns data in its own invented format (missing `id`, `current`, `achievements` fields)
3. The `applyResult` function blindly passes `rawImproved` to `updateResume`
4. The resume store accepts it (it only validates `Array.isArray`, not individual objects)
5. The scorer sees broken/incomplete entries and gives a lower score

### Fix (3 changes)

#### 1. Add explicit JSON schema to the enhance prompt (`supabase/functions/enhance-section/index.ts`)

Tell the AI exactly what format each section must return, matching the TypeScript types:

- **Summary**: Return a plain string
- **Experience**: Return an array where each object has `{ id: string, company: string, position: string, startDate: string, endDate: string, current: boolean, description: string, achievements: string[], responsibilities: string[] }`
- **Education**: Return an array where each object has `{ id: string, institution: string, degree: string, field: string, startDate: string, endDate: string, gpa: string }`
- **Skills**: Return a flat array of strings only (e.g., `["Python", "React", "AWS"]`)

The prompt will include the current content's exact structure as a template the AI must follow, preserving all `id` values and structural fields.

#### 2. Add schema validation/repair in `applyResult` (`src/components/editor/ai/AIEnhanceSheet.tsx`)

Before applying enhanced data, validate and repair it:

- **Experience**: For each item, ensure `id` exists (copy from original or generate UUID), ensure `achievements` is an array, ensure `current` is boolean, ensure `description` is string
- **Education**: Ensure `id`, `institution`, `degree`, `field` exist
- **Skills**: Flatten any objects to strings
- Merge AI-enhanced fields with original entry fields so nothing is lost (e.g., if AI omits `responsibilities`, keep the original)

#### 3. Merge strategy instead of replace (`src/components/editor/ai/AIEnhanceSheet.tsx`)

For experience and education, instead of wholesale replacing the array, merge each AI-enhanced entry with its corresponding original entry by index or `id`. This ensures fields the AI didn't touch (like `id`, `isProject`, `credentialId`) are preserved.

### Technical Details

| File | Change |
|------|--------|
| `supabase/functions/enhance-section/index.ts` | Add per-section JSON schema examples to the prompt response format; include current content structure as a template |
| `src/components/editor/ai/AIEnhanceSheet.tsx` | Add `repairExperience()`, `repairEducation()`, `repairSkills()` helper functions; update `applyResult()` to merge AI data with originals preserving all fields |

### Why This Guarantees Scores Go Up

- Every enhanced entry retains its `id`, `achievements`, `responsibilities`, and all other fields
- The scorer sees complete, well-structured data with the AI's keyword/metric additions on top
- No data loss, no schema mismatches, no empty fields replacing populated ones
- The merge strategy means even if the AI forgets a field, the original value is preserved

