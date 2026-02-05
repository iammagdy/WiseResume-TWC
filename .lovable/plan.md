

# Fix: AI Generating Fake Data from LinkedIn URLs

## Problem Identified

When users paste a LinkedIn **URL** instead of the actual **profile text content**, the AI fabricates believable-looking but completely fake data.

From the network logs:
```
Request Body: {"profileText":"https://www.linkedin.com/in/iam-magdysaber?utm_source=..."}
```

The edge function expects **full profile text** (copied from LinkedIn page), but users are pasting just the URL. When given only a URL, the AI hallucinates data based on contextual clues like the username.

## Solution

Implement validation at two levels:

### 1. Frontend Validation (LinkedInImportSheet.tsx)
- Detect if the pasted content is just a URL (starts with `http` or contains `linkedin.com/in/`)
- Show a helpful error message explaining they need to paste the full profile text, not the URL
- Provide clearer instructions about what to copy

### 2. Backend Validation (parse-linkedin/index.ts)  
- Add validation to detect URL-only input
- Return a clear error instead of letting AI hallucinate
- Add instruction to the AI prompt to refuse if given only a URL

## Implementation Details

### File 1: `src/components/settings/LinkedInImportSheet.tsx`

Add URL detection before calling the parse function:

```typescript
const handleParse = async () => {
  if (!profileText.trim()) {
    toast.error('Please paste your LinkedIn profile content');
    return;
  }

  // NEW: Detect if user pasted just a URL instead of profile content
  const trimmedText = profileText.trim();
  const isJustUrl = /^https?:\/\/(www\.)?linkedin\.com/i.test(trimmedText) && 
                    trimmedText.split('\n').length <= 3 && 
                    trimmedText.length < 500;
  
  if (isJustUrl) {
    setError("It looks like you pasted a LinkedIn URL. Please go to your profile page, select all text (Ctrl/Cmd+A), copy it (Ctrl/Cmd+C), and paste the full content here.");
    toast.error('Please paste your profile content, not the URL');
    return;
  }

  // Continue with parsing...
}
```

Also update the instructions to be clearer:

```tsx
<ol className="space-y-2 text-sm text-muted-foreground">
  <li>Open your LinkedIn profile in a browser</li>
  <li><strong>Select ALL content</strong> on the page (Ctrl/Cmd+A) and copy (Ctrl/Cmd+C)</li>
  <li>Paste the <strong>full text</strong> below (not just the URL!)</li>
</ol>
```

### File 2: `supabase/functions/parse-linkedin/index.ts`

Add backend validation as a safety net:

```typescript
// After getting profileText
if (!profileText || typeof profileText !== "string") {
  return new Response(
    JSON.stringify({ error: "Profile text is required" }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// NEW: Detect URL-only input
const trimmedText = profileText.trim();
const isUrlOnly = /^https?:\/\/(www\.)?linkedin\.com/i.test(trimmedText) && 
                  trimmedText.split('\n').length <= 3 && 
                  trimmedText.length < 500;

if (isUrlOnly) {
  return new Response(
    JSON.stringify({ 
      error: "Please paste the full profile content, not just the URL. Go to your LinkedIn profile, select all (Ctrl+A), copy (Ctrl+C), and paste the complete text." 
    }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

Update the AI system prompt to prevent hallucination:

```typescript
const systemPrompt = `You are an expert at extracting structured resume data from LinkedIn profile text. 

IMPORTANT RULES:
- If the input is ONLY a URL (like "https://linkedin.com/in/username"), return EMPTY data. Do NOT make up or guess information.
- Only extract data that is explicitly present in the provided text.
- Never fabricate or hallucinate data.

Your task is to parse the provided LinkedIn profile content...`;
```

## User Experience After Fix

| Scenario | Before | After |
|----------|--------|-------|
| User pastes URL only | Fake data generated | Clear error: "Please paste profile content, not URL" |
| User pastes actual profile text | Works correctly | Works correctly (no change) |
| User pastes very short text | May hallucinate | Additional validation could warn |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/settings/LinkedInImportSheet.tsx` | Add URL detection, improve instructions |
| `supabase/functions/parse-linkedin/index.ts` | Add backend URL validation, update AI prompt |

## Why This Matters

The current behavior is problematic because:
1. Users don't realize the data is fake - it looks legitimate
2. They may import completely fabricated experience/education into their resume
3. This could lead to embarrassing or harmful situations if used in job applications

The fix ensures users only get real data extracted from their actual profile content.

