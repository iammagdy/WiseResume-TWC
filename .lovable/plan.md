
# Robust AI-Powered Resume Parsing

## Problem Summary
The current regex-based parser (`parseResumeText` in `sectionParsers.ts`) often fails to correctly extract structured data from resume text. It relies on simple pattern matching for section headings and uses heuristics that break with real-world resume formats. This results in nearly empty results (only finding email/phone) even when the text extraction worked correctly.

## Solution
Replace the fragile regex-based parsing with an AI-powered parsing step that uses Lovable AI (Gemini) to intelligently convert raw resume text into structured data. This will:
- Handle any resume format or layout
- Correctly identify sections without relying on exact heading matches  
- Extract all relevant information including experience details, education, and skills
- Work seamlessly with both standard PDF extraction and OCR-extracted text

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Upload Flow                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User uploads PDF                                            │
│           │                                                     │
│           ▼                                                     │
│  2. Extract raw text (PDF.js or OCR fallback)                   │
│           │                                                     │
│           ▼                                                     │
│  3. Call AI Edge Function to parse text → structured JSON       │
│           │                                                     │
│           ▼                                                     │
│  4. Populate editor with structured resume data                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Create AI Parsing Edge Function

**New file: `supabase/functions/parse-resume/index.ts`**

This edge function will:
- Accept raw resume text as input
- Use Lovable AI (Gemini) to intelligently parse it into structured JSON
- Return the structured resume data matching the `ResumeData` type

The AI prompt will instruct the model to:
- Extract contact info (name, email, phone, location, LinkedIn)
- Extract summary/objective text
- Parse all work experience entries with dates, company, position, description
- Parse education entries with institution, degree, field, dates
- Extract skills as a list
- Handle any resume format robustly

### Step 2: Update PDF Parser Module

**Modify: `src/lib/pdfParser.ts`**

- Replace the local `parseResumeText()` call with a call to the new edge function
- Handle loading states and errors gracefully
- Add fallback to local parsing if AI fails (network error, etc.)

### Step 3: Update Upload Page

**Modify: `src/pages/UploadPage.tsx`**

- Update processing message to indicate AI parsing is happening
- Handle the async nature of AI parsing
- Show appropriate error messages if parsing fails

### Step 4: Update Config

**Modify: `supabase/config.toml`**

- Add the new `parse-resume` function configuration

## Technical Details

### Edge Function Structure

```typescript
// Key aspects of the edge function:
- Uses Lovable AI gateway (google/gemini-3-flash-preview)
- Structured output via tool calling for reliable JSON
- Handles rate limits (429) and payment errors (402)
- Returns data matching ResumeData interface
```

### AI Prompt Strategy

The prompt will use tool calling (function calling) to ensure structured output:
- Define a `parse_resume` function with parameters matching ResumeData
- The model will call this function with extracted data
- This guarantees valid JSON output in the expected format

### Error Handling

1. **Network errors**: Fall back to local regex parsing (better than nothing)
2. **Rate limits (429)**: Show user-friendly message to wait
3. **Payment required (402)**: Show message about AI credits
4. **Parse errors**: Show what was found and suggest manual entry

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/parse-resume/index.ts` | Create | AI-powered resume parsing edge function |
| `supabase/config.toml` | Modify | Add parse-resume function config |
| `src/lib/pdfParser.ts` | Modify | Call AI edge function instead of local parser |
| `src/pages/UploadPage.tsx` | Modify | Update loading states and error handling |
| `src/lib/pdf/sectionParsers.ts` | Keep | Keep as fallback parser |

## Benefits

1. **Robust parsing**: Works with any resume format
2. **Better extraction**: AI understands context, not just patterns
3. **Handles edge cases**: Multi-column, creative layouts, varied headings
4. **Consistent results**: Same quality for PDF and OCR text
5. **Automatic**: No user prompts or choices needed

## User Experience

1. User uploads PDF
2. Text is extracted (fast, 1-2 seconds)
3. "Analyzing resume with AI..." message appears
4. AI parses text into structured data (2-4 seconds)
5. Editor opens with all sections populated correctly
6. Success toast shows what was found

If AI fails, the app will still work using the local parser as a fallback.
