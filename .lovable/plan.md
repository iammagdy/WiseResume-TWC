

# AI Features Audit: Eliminate Demo Data and Enhance Power

## Critical Issues Found

### Issue 1: Hardcoded Demo/Fake Fallback Data in Interview Chat
**File:** `supabase/functions/interview-chat/index.ts` (lines 109-114)

When the AI role analysis fails to parse, the function silently falls back to **hardcoded fake data**:
```
title: "Position",
keySkills: ["Communication", "Problem Solving", "Teamwork"],
questionCategories: ["Behavioral", "Technical", "Situational"],
industryInsights: "Interviewers will focus on your practical experience."
```
This generic data has nothing to do with the user's actual resume or target job. The user gets fake analysis without knowing it.

**Fix:** Remove the hardcoded fallback. If parsing fails, return a clear error so the client can retry, not fake data.

### Issue 2: API Keys Sent in Request Body (Security + Architecture Violation)
Three edge functions still accept `userGeminiKey` from the **client-side request body** instead of using the secure server-side encrypted key lookup:

- `generate-cover-letter/index.ts` (line 57, 131) -- extracts from body and passes to `callAIWithRetry`
- `detect-and-humanize/index.ts` (lines 54, 101, 139) -- extracts from body and passes to `callAI`
- `explain-gap/index.ts` (lines 69, 122) -- extracts from body and passes to `callAI`

This means API keys travel in plaintext over the network, visible in browser DevTools, violating the BYOK architecture where keys are stored encrypted in `user_api_keys` and retrieved server-side via `getUserKeyFromDB(userId)`.

**Fix:** Remove `userGeminiKey` from the request body. Pass `userId` to `callAI`/`callAIWithRetry` instead (like all other functions do). The shared `aiClient.ts` already handles looking up the user's key from the database when `userId` is provided.

### Issue 3: Missing `userId` in Cover Letter AI Call
`generate-cover-letter` (line 124-132) doesn't pass `userId` to `callAIWithRetry`. This means:
- BYOK users who stored keys server-side won't have their keys used
- Usage can't be properly attributed
- The gateway can't do per-user routing

**Fix:** Add `userId: user.id` to the `callAIWithRetry` options.

---

## Prompt Weakness Issues

### Issue 4: analyze-resume Ignores Projects, Certifications, Awards
The resume context sent to the AI (lines 104-114) only includes summary, skills, experience, and education. Projects, certifications, and awards are completely omitted, meaning the AI can't factor them into the match analysis.

**Fix:** Add projects, certifications, and awards to the `userPrompt`.

### Issue 5: Career Path Advisor Lacks Grounding Rules
The prompt says "Be realistic" but has no anti-hallucination constraints. The AI could fabricate salary ranges, role titles, or skill requirements that don't exist in the market.

**Fix:** Add explicit grounding rules: "Base recommendations on established career frameworks. Do not invent fictional company names, salary figures, or certification names. Use widely recognized industry roles and skills only."

### Issue 6: Fill-Gap Prompt Lacks Factual Constraint
The system prompt says "realistic experience entries" but doesn't explicitly forbid inventing company names or achievements that the user didn't do.

**Fix:** Add: "All suggested titles and companies must be generic/descriptive (e.g., 'Freelance Web Developer' or 'Self-Employed Consultant'), not invented real-company names. Achievements must be plausible templates the user can customize, not fabricated metrics."

### Issue 7: Interview Chat Lacks Anti-Fabrication Rules
The interview coach can reference "specific answers they gave" but there's no rule preventing it from inventing questions or scenarios unrelated to the actual resume/job.

**Fix:** Add: "Only reference skills, experiences, and achievements actually present in the candidate's resume. Do not fabricate scenarios or claim the candidate mentioned things they didn't."

### Issue 8: LinkedIn Optimizer Uses Raw JSON Instead of Tool Calling
Unlike `fill-gap` and `company-briefing` which use structured tool calling for reliable JSON output, the LinkedIn optimizer asks the AI to return raw JSON in prose. This is more prone to malformed responses.

**Fix:** Convert to tool calling with a `generate_linkedin_package` tool schema, matching the existing pattern used by `company-briefing`.

### Issue 9: company-briefing Uses `getClaims` Instead of `getUser`
Line 34 uses `supabase.auth.getClaims(token)` while every other function uses `supabase.auth.getUser(token)`. `getClaims` may not fully validate the token in all cases.

**Fix:** Align with the standard pattern: use `getUser(token)` for consistency and security.

---

## Dead Code Cleanup

### Issue 10: Dead `userGeminiKey` in Type Interfaces
These functions declare `userGeminiKey` in their request interface but never use it:
- `fill-gap/index.ts` (line 13)
- `recruiter-simulation/index.ts` (line 51)
- `one-page-optimizer/index.ts` (line 20)
- `agentic-chat/index.ts` (line 20)
- `optimize-for-linkedin/index.ts` (line 52)
- `enhance-section/index.ts` (line 22)

**Fix:** Remove `userGeminiKey` from all interfaces where it's not used.

---

## Prompt Power Enhancements

### Enhancement A: Upgrade Recruiter Simulation to Use Latest Model
Currently uses `google/gemini-2.5-flash`. For the depth of persona-based analysis required, upgrade to `google/gemini-2.5-pro` and increase `maxTokens` from 2000 to 3000 for richer, more detailed feedback.

### Enhancement B: Add Chain-of-Thought to Career Path Advisor
Add explicit reasoning steps: "First identify the candidate's current career stage. Then map their skills to adjacent roles in the same and related industries. Consider both vertical (promotion) and lateral (industry switch) paths. Finally, create a concrete 90-day action plan."

### Enhancement C: Strengthen Cover Letter with Anti-Placeholder Rules
The prompt already says "Do NOT use placeholder brackets" but doesn't enforce using the actual contact info in the header. Add: "The letter header MUST include the candidate's actual name, email, and phone exactly as provided. If any contact field is missing, omit that line entirely rather than using a placeholder."

### Enhancement D: Add Industry-Specific Context to Proofread
The proofreader currently has generic rules. Add: "Consider the candidate's industry when evaluating terminology. Technical resumes may use abbreviations (e.g., 'K8s', 'CI/CD') that are correct in context. Do not flag industry-standard acronyms."

---

## Files Changed Summary

| File | Changes |
|------|--------|
| `supabase/functions/interview-chat/index.ts` | Remove hardcoded fallback, return error on parse failure |
| `supabase/functions/generate-cover-letter/index.ts` | Remove `userGeminiKey` from body, add `userId` to AI call |
| `supabase/functions/detect-and-humanize/index.ts` | Remove `userGeminiKey` from body, pass `userId` instead |
| `supabase/functions/explain-gap/index.ts` | Remove `userGeminiKey` from body, pass `userId` instead |
| `supabase/functions/analyze-resume/index.ts` | Add projects/certifications/awards to resume context |
| `supabase/functions/career-path-advisor/index.ts` | Add grounding rules + chain-of-thought to prompt |
| `supabase/functions/fill-gap/index.ts` | Add factual constraints, remove dead `userGeminiKey` |
| `supabase/functions/proofread-resume/index.ts` | Add industry-aware acronym tolerance |
| `supabase/functions/optimize-for-linkedin/index.ts` | Convert to tool calling, remove dead `userGeminiKey` |
| `supabase/functions/company-briefing/index.ts` | Switch `getClaims` to `getUser` |
| `supabase/functions/recruiter-simulation/index.ts` | Upgrade model, increase maxTokens, remove dead `userGeminiKey` |
| `supabase/functions/enhance-section/index.ts` | Remove dead `userGeminiKey` from interface |
| `supabase/functions/agentic-chat/index.ts` | Remove dead `userGeminiKey` from interface |
| `supabase/functions/one-page-optimizer/index.ts` | Remove dead `userGeminiKey` from interface |

---

## Priority Order

1. **Critical -- fake data:** Remove interview-chat hardcoded fallback (Issue 1)
2. **Critical -- security:** Fix `userGeminiKey` body-passing in 3 functions (Issues 2-3)
3. **High -- data completeness:** Add projects/certs/awards to analyze-resume (Issue 4)
4. **High -- anti-hallucination:** Add grounding rules to career-path, fill-gap, interview (Issues 5-7)
5. **Medium -- reliability:** Convert LinkedIn optimizer to tool calling (Issue 8)
6. **Medium -- consistency:** Fix company-briefing auth method (Issue 9)
7. **Low -- cleanup:** Remove dead `userGeminiKey` declarations (Issue 10)
8. **Enhancements:** Model upgrades, chain-of-thought, stronger prompts (A-D)

