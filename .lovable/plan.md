

# Fix AI Copilot Error and Rename to "Wise AI"

## Problem Analysis

After investigating the error "Failed to execute 'json' on 'Response': Unexpected token '<', "<!doctype "... is not valid JSON", I found **two critical issues**:

### Issue 1: Environment Variable Undefined Bug (Root Cause)

The network request shows:
```
Request: POST undefined/functions/v1/agentic-chat
authorization: Bearer undefined
```

**Root cause**: Multiple frontend modules directly use `import.meta.env.VITE_SUPABASE_URL` without fallbacks. When Vite's env injection temporarily fails during preview/build edge cases, these values become `undefined`, causing:
- Requests go to `undefined/functions/v1/agentic-chat` (which returns the HTML page)
- The HTML response fails JSON parsing, producing the error shown

### Issue 2: Inconsistent Naming

The AI assistant is currently named:
- "AI Copilot" in the UI
- "MegZone AI" in the backend system prompt
- Should be: "Wise AI" everywhere

## Solution Overview

### Phase 1: Fix Environment Variable Bug

Update all files that directly access `import.meta.env.VITE_SUPABASE_URL` to use the safe client's exported config with fallback values.

**Files affected:**
| File | Current Issue |
|------|---------------|
| `src/lib/agenticChat.ts` | Direct env access, no fallback |
| `src/lib/aiTailor.ts` | Direct env access, no fallback |
| `src/lib/aiAnalysis.ts` | Direct env access, no fallback |
| `src/lib/careerPath.ts` | Direct env access, no fallback |

**Fix approach:**
1. Export `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from `safeClient.ts`
2. Update each affected file to import these values instead of accessing env directly

### Phase 2: Rename to "Wise AI"

Update all UI references and backend prompts:

| Location | Current | New |
|----------|---------|-----|
| `AgenticChatSheet.tsx` - Sheet title | "AI Copilot" | "Wise AI" |
| `AgenticChatSheet.tsx` - Empty state heading | "AI Resume Copilot" | "Wise AI" |
| `AgenticChatSheet.tsx` - Placeholder | "Ask me to edit your resume..." | "Ask Wise AI to edit your resume..." |
| `EditorPage.tsx` - Aria label | "Open AI Copilot" | "Open Wise AI" |
| `agentic-chat/index.ts` - System prompt | "MegZone AI" | "Wise AI" |

## Technical Implementation Details

### safeClient.ts Updates

Export the URL and key constants for use by other modules:

```typescript
// Add to exports at end of file
export { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY };
```

### Service Layer Updates Pattern

Each service file (agenticChat.ts, aiTailor.ts, etc.) will be updated from:

```typescript
// Before - fragile
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const response = await fetch(`${SUPABASE_URL}/functions/v1/...`, {
  headers: {
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  },
});
```

To:

```typescript
// After - resilient with fallbacks
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/safeClient';

const response = await fetch(`${SUPABASE_URL}/functions/v1/...`, {
  headers: {
    'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  },
});
```

### Edge Function System Prompt Update

Update the system prompt in `agentic-chat/index.ts`:

```typescript
const SYSTEM_PROMPT = `You are Wise AI, an expert resume assistant integrated into the WiseResume editor. You help users improve their resumes through natural conversation.
...
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/integrations/supabase/safeClient.ts` | Export SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY constants |
| `src/lib/agenticChat.ts` | Import from safeClient instead of direct env access |
| `src/lib/aiTailor.ts` | Import from safeClient instead of direct env access |
| `src/lib/aiAnalysis.ts` | Import from safeClient instead of direct env access |
| `src/lib/careerPath.ts` | Import from safeClient instead of direct env access |
| `src/components/editor/AgenticChatSheet.tsx` | Rename "AI Copilot" to "Wise AI" |
| `src/pages/EditorPage.tsx` | Update aria-label |
| `supabase/functions/agentic-chat/index.ts` | Update system prompt naming |

## Benefits

1. **Eliminates Undefined Errors**: Fallback values ensure requests always go to the correct endpoint
2. **Consistent Branding**: "Wise AI" used throughout app and backend
3. **Improved Reliability**: No more HTML error pages from failed requests
4. **Better UX**: Clear, consistent naming helps users understand they're talking to the same AI

