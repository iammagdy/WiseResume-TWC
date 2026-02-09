

# Agentic Chat Enhancement Plan

## Analysis Summary

After comparing the megZone agentic architecture with WiseResume's current implementation, I've identified **5 key missing features** that would significantly improve the AI assistant's capabilities.

| Feature | Status | Impact |
|---------|--------|--------|
| Closed-Loop Feedback | ❌ Missing | Critical - AI doesn't know if edits succeeded |
| suggestEdits (Human-in-Loop) | ❌ Missing | High - Prevents unwanted changes on subjective edits |
| update_experience tool | ❌ Missing | High - Can only add, not modify experiences |
| Thinking Mode toggle | ❌ Missing | Medium - Complex reasoning for career pivots |
| proofreadAndApplyFixes | ⚠️ Partial | Medium - Proofread exists but doesn't apply fixes |

---

## Changes Required

### 1. Add Closed-Loop Feedback (Priority: Critical)

**Problem:** Currently, when the AI calls a function like `update_summary`, WiseResume executes it locally but never tells the AI whether it succeeded. The AI is "flying blind."

**Solution:** After executing a function call, send the result back to the AI so it can provide a meaningful confirmation.

**Files to modify:**
- `src/hooks/useAgenticChat.ts` - Add second API call with function result
- `supabase/functions/agentic-chat/index.ts` - Handle function response in conversation

```typescript
// After local execution, send back to AI:
const functionResponse = {
  role: 'function',
  name: functionName,
  content: JSON.stringify({ success: true, applied: args })
};
// Then call API again with this response
// AI will then provide a natural confirmation message
```

### 2. Add `suggestEdits` Tool (Priority: High)

**Problem:** Currently, all edits are auto-applied. For subjective changes like "Make my resume more leadership-focused," the AI might change things the user didn't want.

**Solution:** Add a new tool that returns **proposals** (original vs. suggested) for user review before applying.

**New tool definition:**
```typescript
{
  name: "suggest_edits",
  description: "For subjective/risky changes, propose edits for user approval instead of directly applying",
  parameters: {
    proposals: [{
      section: "summary|experience|skills",
      original: "Current text",
      suggested: "New text",
      explanation: "Why this change improves the resume"
    }]
  }
}
```

**UI enhancement:** Add a diff card in chat showing Green/Red comparison with Accept/Reject buttons.

### 3. Add `update_experience` Tool (Priority: High)

**Problem:** The AI can only ADD new experiences, not modify existing ones. Users saying "Update my Google job description" have no recourse.

**Files to modify:**
- `supabase/functions/agentic-chat/index.ts` - Add tool definition
- `src/hooks/useAgenticChat.ts` - Add handler

**New tool:**
```typescript
{
  name: "update_experience",
  description: "Update an existing work experience entry by company name or position",
  parameters: {
    identifier: { type: "string", description: "Company name or position to find" },
    updates: {
      description: "optional string",
      achievements: "optional string[]",
      // ... other updatable fields
    }
  }
}
```

### 4. Add Thinking Mode Toggle (Priority: Medium)

**Problem:** Gemini Flash is fast but struggles with complex reasoning like "Rewrite my resume for a career change from finance to tech."

**Solution:** Add a toggle in the UI that switches to Gemini 2.5 Pro with `thinkingBudget` for complex tasks.

**Files to modify:**
- `src/components/editor/AgenticChatSheet.tsx` - Add toggle switch
- `src/lib/agenticChat.ts` - Pass `thinkingMode` param
- `supabase/functions/agentic-chat/index.ts` - Use Pro model + thinking config

### 5. Enhance Proofread with Auto-Apply (Priority: Medium)

**Problem:** Current `proofread` tool just signals completion but doesn't return fixes. megZone's `proofreadAndApplyFixes` returns structured fixes and applies them.

**Solution:** Enhance the proofread tool to return actionable fixes and optionally apply them.

**Enhanced tool:**
```typescript
{
  name: "proofread_and_fix",
  description: "Scan resume for errors and fix them",
  parameters: {
    fixes: [{
      section: "summary|experience|education",
      itemId: "optional - for array items",
      original: "text with error",
      corrected: "fixed text",
      reason: "Grammar|Spelling|Clarity"
    }],
    autoApply: { type: "boolean", description: "Apply fixes automatically or show diff" }
  }
}
```

### 6. Add Markdown Rendering (Priority: Low)

**Problem:** AI responses are rendered as plain text, losing formatting.

**Solution:** Use `react-markdown` to render assistant messages.

---

## Implementation Files

| File | Changes |
|------|---------|
| `supabase/functions/agentic-chat/index.ts` | Add 3 new tools, enhance prompt, handle function response loop |
| `src/hooks/useAgenticChat.ts` | Add closed-loop feedback, new function handlers, thinking mode |
| `src/lib/agenticChat.ts` | Add `thinkingMode` and `functionResponse` params |
| `src/components/editor/AgenticChatSheet.tsx` | Add thinking toggle, suggest-edits diff cards, markdown rendering |

---

## Summary of Enhancements

```text
BEFORE:                          AFTER:
┌─────────────────────┐          ┌─────────────────────┐
│ User: "Update my    │          │ User: "Update my    │
│ summary"            │          │ summary"            │
│                     │          │                     │
│ → AI calls tool     │          │ → AI calls tool     │
│ → App executes      │          │ → App executes      │
│ → AI: "I updated    │          │ → App tells AI ✓    │ ← NEW: Feedback loop
│   it" (guessing)    │          │ → AI: "Done! Your   │
│                     │          │   summary now says  │
│                     │          │   X instead of Y"   │
└─────────────────────┘          └─────────────────────┘

┌─────────────────────┐          ┌─────────────────────┐
│ User: "Make it more │          │ User: "Make it more │
│ leadership-focused" │          │ leadership-focused" │
│                     │          │                     │
│ → AI changes things │          │ → AI proposes edits │ ← NEW: suggestEdits
│ → User: "Wait, I    │          │ → Shows diff card   │
│   didn't want that" │          │ → User: Accept ✓    │
└─────────────────────┘          └─────────────────────┘

┌─────────────────────┐          ┌─────────────────────┐
│ [🧠 Flash only]     │          │ [Toggle: 🧠 Pro]    │ ← NEW: Thinking mode
│                     │          │                     │
│ Simple edits only   │          │ Complex reasoning   │
│                     │          │ Career pivots, etc. │
└─────────────────────┘          └─────────────────────┘
```

---

## New Message Types

The chat will support three message types:

1. **Text** - Regular conversation
2. **Function Call** - Shows badge + confirmation (existing)
3. **Suggestion Card** - Shows diff with Accept/Reject buttons (NEW)

