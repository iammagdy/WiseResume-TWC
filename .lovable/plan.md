
## Remove Thinking Mode from Wise AI Chat

### Current State Analysis
The Thinking Mode feature is currently implemented in three places:

1. **UI Component** (`src/components/editor/AgenticChatSheet.tsx`):
   - Brain icon with toggle switch in the header (lines 296-311)
   - Conditional placeholder text in input field (lines 432-435)
   - Listed as a capability in the CAPABILITIES array (line 53)

2. **Hook** (`src/hooks/useAgenticChat.ts`):
   - `thinkingMode` state (line 10)
   - `toggleThinkingMode` function (lines 273-275)
   - Passed to `sendChatMessage` and `sendFunctionFeedback` (lines 190, 216)
   - Exported in return object (line 281)

3. **Backend Function** (`supabase/functions/agentic-chat/index.ts`):
   - Reads `thinkingMode` from request (line 19, 278)
   - Selects Pro model when enabled (lines 318-322)
   - Increases temperature and max_tokens (lines 354-355)
   - Adds thinking budget for Pro model (lines 358-365)

### Why It's Redundant
- The Pro model is used with identical tools and system prompt as Flash
- Without enhanced instructions, it just costs more and runs slower
- No specialized behavior or output format differentiates it
- Users see no meaningful difference in results

### Solution: Complete Removal

**File Changes:**

1. **`src/components/editor/AgenticChatSheet.tsx`**
   - Remove `thinkingMode` and `toggleThinkingMode` from hook destructuring (line 223-226)
   - Remove the toggle switch UI block (lines 293-311)
   - Remove "Thinking Mode" from CAPABILITIES array (line 53)
   - Remove conditional placeholder text logic (lines 432-435) → always use standard prompt
   - Simplify placeholder to: `'Ask Wise AI to edit your resume...'`

2. **`src/hooks/useAgenticChat.ts`**
   - Remove `thinkingMode` state (line 10)
   - Remove `toggleThinkingMode` function (lines 273-275)
   - Remove `thinkingMode` parameter from `sendChatMessage` call (line 190)
   - Remove `thinkingMode` parameter from `sendFunctionFeedback` call (line 216)
   - Remove `toggleThinkingMode` from return object (line 283)

3. **`supabase/functions/agentic-chat/index.ts`**
   - Remove `thinkingMode?: boolean` from ChatRequest interface (line 19)
   - Remove `thinkingMode` destructuring (line 278)
   - Remove model selection logic (lines 317-322) → always use Flash
   - Replace with: `const modelName = useGeminiDirect ? "gemini-2.5-flash-preview-05-20" : "google/gemini-2.5-flash";`
   - Simplify temperature to: `temperature: 0.7` (remove ternary on line 354)
   - Simplify max_tokens to: `max_tokens: 2000` (remove ternary on line 355)
   - Remove thinking budget block (lines 358-365)

### Benefits
✓ Simplified UI with one less toggle to manage
✓ Always-consistent model (Flash) reduces confusion
✓ Faster response times
✓ Lower AI costs
✓ Cleaner, more maintainable code

### Testing
After removal, verify:
1. The "Pro" toggle and Brain icon no longer appear in the header
2. Wise AI chat still works with standard messages
3. All tool calls (add_skills, update_summary, etc.) still function
4. The input placeholder shows consistent text
5. Suggestion cards and function call badges still display correctly
