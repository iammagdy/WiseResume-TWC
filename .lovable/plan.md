

# CV Parsing Logic Enhancement Plan

## Comparison Analysis

### Current WiseResume Architecture

| Component | Current Approach | Strengths | Weaknesses |
|-----------|-----------------|-----------|------------|
| **Text Extraction** | pdf.js with layout-aware reconstruction, Y-coordinate grouping, two-column detection | Excellent handling of complex layouts, sidebar resumes | N/A - Very solid |
| **OCR Fallback** | Tesseract.js for scanned PDFs | Client-side, works offline | Slower than cloud OCR |
| **AI Parsing** | Edge function with tool calling (function schema) | Structured output guaranteed | Prompt could be stronger |
| **System Prompt** | 177 lines with detailed rules | Comprehensive name detection, section variants | Missing "FULL EXTRACTION" directive |
| **Local Fallback** | Regex-based `sectionParsers.ts` | Works without AI, good for network errors | Less accurate than AI |
| **Schema** | OpenAI function calling format | Type-safe output | N/A |

### megZone Architecture (from uploaded document)

| Component | megZone Approach | Strengths | Weaknesses |
|-----------|------------------|-----------|------------|
| **Text Extraction** | pdf.js + OCR fallback | Same as WiseResume | N/A |
| **AI Parsing** | `responseSchema` config in Gemini SDK | Native Gemini structured output | Different SDK format |
| **System Prompt** | 3 critical instructions only | Concise, focused on extraction | Less comprehensive |
| **Key Insight** | "FULL EXTRACTION" directive | Prevents AI summarization/truncation | WiseResume is missing this! |
| **JSON Cleaning** | `cleanAndParseJson` utility | Handles markdown wrapping | WiseResume uses tool calling (better) |
| **Human Review** | Side-by-side comparison UI | User validation | WiseResume already has ImportReviewSheet |

---

## Key Enhancement: The "FULL EXTRACTION" Directive

The most valuable insight from the megZone document is the **"FULL EXTRACTION" rule** in the system prompt:

```text
2. **FULL EXTRACTION:** Extract 100% of the text in the work experience descriptions. 
   Do not summarize, do not bulletize if it's a paragraph, and do not omit details. 
   Return the exact text.
```

**Why this matters:**
- LLMs have a natural tendency to summarize or condense content
- Resume descriptions often contain valuable keywords for ATS matching
- Truncated bullets lose important achievements and metrics

---

## Implementation Plan

### 1. Enhance the AI Parsing System Prompt

**File:** `supabase/functions/parse-resume/index.ts`

Add three new critical directives to the existing systemPrompt (line 143):

```typescript
const systemPrompt = `You are an expert resume parser. Extract ALL structured information from resume text.

CRITICAL RULES:
1. **PROCESS ALL CONTENT:** The input may be from a multi-page document. Process the ENTIRETY of the text. Do not stop after the first page or section.
2. **FULL EXTRACTION:** Extract 100% of the text in work experience descriptions. Do NOT summarize, do NOT bulletize paragraphs, and do NOT omit details. Return the EXACT text.
3. **DATE PARSING:** Be very careful with dates. Preserve original format when possible (YYYY-MM, MMM YYYY, etc.).
4. Extract EVERYTHING - all jobs, education, projects, skills, certifications. Never skip sections!
5. Empty fields: use "" for strings, [] for arrays - never omit required fields
... [keep existing rules 4-16]
```

### 2. Add "Responsibilities" Field to Experience Schema

**File:** `supabase/functions/parse-resume/index.ts`

The megZone schema separates `responsibilities` (array of detailed bullets) from general description. This improves bullet extraction.

Update the `parseResumeTool` schema (around line 83-98):

```typescript
properties: {
  company: { type: "string", ... },
  position: { type: "string", ... },
  startDate: { type: "string", ... },
  endDate: { type: "string", ... },
  current: { type: "boolean", ... },
  description: { 
    type: "string", 
    description: "Overall job/project description paragraph (non-bullet content)" 
  },
  achievements: {
    type: "array",
    items: { type: "string" },
    description: "Key achievements, features built, or bullet points - extract EVERY bullet, do not summarize",
  },
  responsibilities: {
    type: "array",
    items: { type: "string" },
    description: "Detailed job responsibilities - extract EVERY bullet point verbatim, do not summarize or combine",
  },
  isProject: { type: "boolean", ... },
},
```

### 3. Enhance Skills Schema for Categorization (Optional)

**File:** `supabase/functions/parse-resume/index.ts`

The megZone approach categorizes skills. While WiseResume uses a flat array (which is fine), we could add optional categorization:

```typescript
skills: {
  type: "object",
  description: "Skills categorized by type, or use 'other' for a flat list",
  properties: {
    technical: { type: "array", items: { type: "string" } },
    frameworks: { type: "array", items: { type: "string" } },
    tools: { type: "array", items: { type: "string" } },
    languages: { type: "array", items: { type: "string" } }, // e.g., "Arabic (Native)"
    soft: { type: "array", items: { type: "string" } },
    other: { type: "array", items: { type: "string" } },
  }
}
```

**Note:** This would require updating the frontend to flatten categories, or we can keep the simpler flat array approach.

### 4. Add Robust JSON Cleaning Utility (Already Handled)

WiseResume already uses **tool calling** which guarantees structured JSON output - this is **better** than the megZone approach of regex-based JSON extraction. No change needed here.

---

## Summary of Changes

| Priority | Change | File | Benefit |
|----------|--------|------|---------|
| **HIGH** | Add "FULL EXTRACTION" directive | `parse-resume/index.ts` | Prevents AI summarization |
| **HIGH** | Add "PROCESS ALL CONTENT" directive | `parse-resume/index.ts` | Handles multi-page resumes |
| **MEDIUM** | Add `responsibilities` field to experience | `parse-resume/index.ts` + types | Better bullet extraction |
| **LOW** | Categorize skills | `parse-resume/index.ts` + types | Optional enhancement |

---

## Technical Details

### Files to Modify

1. **`supabase/functions/parse-resume/index.ts`**
   - Update `systemPrompt` (lines 143-177) to add 3 new critical directives at the top
   - Optionally add `responsibilities` field to schema

2. **`src/types/resume.ts`** (if adding responsibilities)
   - Update `Experience` interface to include optional `responsibilities?: string[]`

3. **Backend result mapping** (lines 339-349 in parse-resume/index.ts)
   - Map new `responsibilities` field if added
   - Merge into achievements or keep separate based on preference

---

## What We're NOT Changing

The megZone document validates that WiseResume's architecture is already well-designed:

- ✅ **Text extraction** - WiseResume's layout-aware approach is excellent
- ✅ **OCR fallback** - Already implemented with Tesseract.js
- ✅ **Tool calling** - Better than regex JSON parsing
- ✅ **Human review** - ImportReviewSheet already provides this
- ✅ **Type safety** - Already using TypeScript interfaces

The main enhancement is **prompt engineering** to prevent AI summarization.

