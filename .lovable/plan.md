

## Fix Remaining Unguarded `.join()` Calls on Skills

### Findings

Three edge functions still have unguarded `.join()` on `skills` that will crash if skills contain objects instead of strings:

| File | Line | Unguarded Call |
|------|------|---------------|
| `generate-cover-letter/index.ts` | 93 | `resume.skills?.slice(0, 10).join(', ')` |
| `interview-chat/index.ts` | 77 | `(resumeData.skills \|\| []).join(", ")` |
| `interview-chat/index.ts` | 77 | `(e.achievements \|\| []).join("; ")` (minor risk) |

All other edge functions already use `safeSkillsString()` or don't touch skills at all.

### Fix

Add the same `safeSkillsString` utility to both files and replace the unguarded calls.

**File 1: `supabase/functions/generate-cover-letter/index.ts`**

- Add `safeSkillsString` helper after imports (same pattern as other functions)
- Line 93: replace `resume.skills?.slice(0, 10).join(', ')` with `safeSkillsString(resume.skills?.slice(0, 10))`

**File 2: `supabase/functions/interview-chat/index.ts`**

- Add `safeSkillsString` helper after imports
- Line 77: replace `(resumeData.skills || []).join(", ")` with `safeSkillsString(resumeData.skills)`

### Not Changing

- `recruiter-simulation` -- already has `safeSkillsString` for skills; the `achievements.join()` on line 252 is safe because achievements are always `string[]` from the database schema
- `one-page-optimizer` -- its `.filter(Boolean).join()` operates on `contactInfo` values (strings), not skills
- `tailor-resume`, `analyze-resume`, `score-resume` -- already fixed
