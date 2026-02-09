
# Add Gemini API Key Support to Remaining Edge Functions

## Overview

This plan updates the 12 remaining edge functions to support user-provided Gemini API keys, allowing users to bypass the Lovable AI gateway and call Google's Gemini API directly. This follows the pattern already established in `tailor-resume` and `enhance-section`.

## Functions to Update

| Function | Current State | Priority |
|----------|--------------|----------|
| agentic-chat | Lovable gateway only | High |
| analyze-resume | Lovable gateway only | High |
| career-path-advisor | Lovable gateway only | High |
| detect-and-humanize | Lovable gateway only | High |
| explain-gap | Lovable gateway only | High |
| generate-cover-letter | Lovable gateway only | High |
| interview-chat | Lovable gateway only | High |
| one-page-optimizer | Lovable gateway only | High |
| optimize-for-linkedin | Lovable gateway only | High |
| parse-linkedin | Lovable gateway only | High |
| parse-resume | Lovable gateway only | High |
| recruiter-simulation | Uses OLD API endpoint | Critical (bug fix) |

## Special Cases

| Function | Decision |
|----------|----------|
| generate-headshot | Keep Lovable gateway only (image generation model not available via direct Gemini API) |
| parse-job-url | Keep Lovable gateway only (SSRF protection complexity, low priority) |

## Implementation Pattern

Each function will be updated following the established pattern from `enhance-section`:

### 1. Extract userGeminiKey from Request Body

```typescript
const { existingParams, userGeminiKey } = await req.json();
```

### 2. Add AI Routing Logic

```typescript
// Determine which AI gateway to use
const useGeminiDirect = !!userGeminiKey;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

if (!useGeminiDirect && !LOVABLE_API_KEY) {
  throw new Error("LOVABLE_API_KEY is not configured");
}

// Choose API endpoint and auth based on provider
const apiUrl = useGeminiDirect
  ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
  : "https://ai.gateway.lovable.dev/v1/chat/completions";

const apiKey = useGeminiDirect ? userGeminiKey : LOVABLE_API_KEY;
const modelName = useGeminiDirect 
  ? "gemini-2.5-flash-preview-05-20"  // Direct Gemini model name
  : "google/gemini-2.5-flash";         // Lovable gateway model name
```

### 3. Enhanced Error Handling for Gemini Direct

```typescript
if (!response.ok) {
  if (response.status === 401 || response.status === 403) {
    return new Response(
      JSON.stringify({ error: "Invalid API key. Please check your AI settings." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  if (response.status === 429) {
    const errorMsg = useGeminiDirect 
      ? "Rate limit exceeded. Your Gemini key may have hit its quota."
      : "Rate limits exceeded, please try again later.";
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  // ... existing error handling
}
```

## Model Mapping

| Lovable Gateway Model | Direct Gemini Model |
|----------------------|---------------------|
| google/gemini-2.5-flash | gemini-2.5-flash-preview-05-20 |
| google/gemini-2.5-pro | gemini-2.5-pro-preview-05-06 |
| google/gemini-3-flash-preview | gemini-2.0-flash |
| openai/gpt-5-mini | gemini-2.5-flash-preview-05-20 (fallback) |

## Detailed Changes Per Function

### 1. agentic-chat/index.ts
- Extract `userGeminiKey` from request body
- Add routing logic for AI gateway selection
- Update model name based on provider
- Add Gemini-specific error handling

### 2. analyze-resume/index.ts
- Extract `userGeminiKey` from request body
- Add provider routing with model mapping
- Enhance error messages for direct Gemini calls

### 3. career-path-advisor/index.ts
- Extract `userGeminiKey` from request body
- Add dual-provider support
- Update logging to indicate provider used

### 4. detect-and-humanize/index.ts
- Extract `userGeminiKey` from request body
- Update both detection and humanization API calls
- Handle provider-specific errors for both calls

### 5. explain-gap/index.ts
- Extract `userGeminiKey` from request body
- Add provider routing logic
- Model uses tool calling - ensure compatibility with Gemini direct

### 6. generate-cover-letter/index.ts
- Already validates auth, just needs routing logic
- Add provider selection and model mapping
- Update error messages

### 7. interview-chat/index.ts
- Extract `userGeminiKey` from request body
- Update both role analysis and main chat AI calls
- Add provider-specific error handling

### 8. one-page-optimizer/index.ts
- Extract `userGeminiKey` from request body
- Add provider routing logic
- Update logging

### 9. optimize-for-linkedin/index.ts
- Extract `userGeminiKey` from request body
- Add dual-provider support
- Maintain JSON parsing logic

### 10. parse-linkedin/index.ts
- Extract `userGeminiKey` from request body
- Add provider routing with tool calling support
- Gemini supports tool calling via OpenAI-compatible endpoint

### 11. parse-resume/index.ts
- Extract `userGeminiKey` from request body
- Add provider routing with tool calling support
- Ensure tool_choice works with Gemini direct

### 12. recruiter-simulation/index.ts (Critical Bug Fix)
- Currently uses WRONG API endpoint: `lovable.dev/api/llm/openai/v1/chat/completions`
- Should use: `ai.gateway.lovable.dev/v1/chat/completions`
- Add `userGeminiKey` support
- Fix model name (currently uses `openai/gpt-5-mini`, should map correctly)

## Frontend Service Layer Updates

The following frontend modules also need updates to pass `userGeminiKey`:

### Already Updated:
- `src/lib/aiTailor.ts` ✅
- `src/lib/aiAnalysis.ts` ✅ (partially - only analyzeResume)
- `src/hooks/useAIEnhance.ts` ✅
- `src/lib/careerPath.ts` ✅
- `src/lib/agenticChat.ts` ✅

### Need Updates:
- Components that directly call edge functions (need to check hooks and sheets)

## Files to Modify

| File | Changes |
|------|---------|
| supabase/functions/agentic-chat/index.ts | Add userGeminiKey routing |
| supabase/functions/analyze-resume/index.ts | Add userGeminiKey routing |
| supabase/functions/career-path-advisor/index.ts | Add userGeminiKey routing |
| supabase/functions/detect-and-humanize/index.ts | Add userGeminiKey routing |
| supabase/functions/explain-gap/index.ts | Add userGeminiKey routing |
| supabase/functions/generate-cover-letter/index.ts | Add userGeminiKey routing |
| supabase/functions/interview-chat/index.ts | Add userGeminiKey routing |
| supabase/functions/one-page-optimizer/index.ts | Add userGeminiKey routing |
| supabase/functions/optimize-for-linkedin/index.ts | Add userGeminiKey routing |
| supabase/functions/parse-linkedin/index.ts | Add userGeminiKey routing |
| supabase/functions/parse-resume/index.ts | Add userGeminiKey routing |
| supabase/functions/recruiter-simulation/index.ts | Fix API endpoint + add userGeminiKey |

## Testing Strategy

After implementation:
1. Test each function with default Lovable gateway (no userGeminiKey)
2. Test each function with a valid Gemini API key
3. Test error handling with an invalid Gemini key
4. Verify tool calling works correctly for parse-resume and parse-linkedin

## Benefits

1. Consistent behavior across all AI functions
2. Users can use their own Gemini API keys everywhere
3. Fixed critical bug in recruiter-simulation endpoint
4. Better error messages for provider-specific issues
5. Centralized routing pattern for future maintenance
