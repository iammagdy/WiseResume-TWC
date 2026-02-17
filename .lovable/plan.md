

## Sanitize AI Content for PDF Generation

### Problem
AI models sometimes include Markdown formatting (`**bold**`, `# headers`, `*italic*`) in their JSON responses, even when instructed not to. This formatting bleeds into the resume text fields and appears as literal asterisks/hashes in the PDF output, since `pdf-lib`'s `drawText` renders plain text and the React templates display these as raw characters.

### Solution
Two-pronged defense: (1) strengthen the server-side prompt to explicitly forbid Markdown in text values, and (2) add a client-side sanitizer that strips any Markdown that slips through before the content reaches the store/PDF.

### Changes

**1. New file: `src/lib/ai/sanitizeContent.ts`**

A utility module exporting two functions:
- `stripMarkdown(text: string): string` -- removes Markdown syntax from a plain string:
  - `**text**` and `__text__` become `text` (bold)
  - `*text*` and `_text_` become `text` (italic)
  - `# Header` lines become `Header` (heading markers)
  - `` `code` `` becomes `code` (inline code)
  - `- item` or `* item` list prefixes preserved as-is (these are valid resume bullets)
  - Trims excessive whitespace
- `sanitizeAIContent(data: unknown): unknown` -- recursively walks the AI response object:
  - Strings: applies `stripMarkdown`
  - Arrays: maps each element through `sanitizeAIContent`
  - Objects: maps each value through `sanitizeAIContent`
  - Primitives (numbers, booleans, null): passed through unchanged

This keeps the utility pure, testable, and reusable across all AI pipelines.

**2. Modified: `src/hooks/useAIEnhance.ts`**

- Import `sanitizeAIContent` from `@/lib/ai/sanitizeContent`
- After receiving the successful response (`data`) from the edge function and before calling `setResult(data)`, sanitize the `improved` field:
  ```
  data.improved = sanitizeAIContent(data.improved);
  ```
- This ensures all downstream consumers (SectionAIAction, AIEnhanceSheet, etc.) receive clean content

**3. Modified: `supabase/functions/enhance-section/index.ts`**

- Update the `buildPrompt` function's closing instruction block to add an explicit anti-Markdown directive:
  - Current: `"IMPORTANT: Respond with ONLY valid JSON in this exact format, no markdown or code blocks:"`
  - Updated: `"IMPORTANT: Respond with ONLY valid JSON in this exact format, no markdown or code blocks. All text values inside the JSON must be plain text WITHOUT any Markdown formatting -- do not use **, *, #, _, or backticks in the text content:"`

**4. Modified: `src/components/editor/ai/AIEnhanceSheet.tsx`**

- Import `sanitizeAIContent` and apply it inside the `applyResult` function when parsing individual results, as a second sanitization point (belt-and-suspenders with the hook):
  ```
  parsed = sanitizeAIContent(parsed);
  ```

### Technical Details

**stripMarkdown regex pipeline:**

```text
Input: "**Led** a team of *10 engineers* to build `microservices`"
Step 1 (bold):    "Led a team of *10 engineers* to build `microservices`"
Step 2 (italic):  "Led a team of 10 engineers to build `microservices`"
Step 3 (code):    "Led a team of 10 engineers to build microservices"
Step 4 (headers): no-op (no # at line start)
Output: "Led a team of 10 engineers to build microservices"
```

**Why strip instead of converting to HTML:**
The PDF generator uses `pdf-lib` `drawText` for cover letters (plain text only) and `html2canvas` for resume templates. The template components render text via React JSX `{text}`, which auto-escapes HTML entities. Converting Markdown to `<b>` tags would display literal `<b>` in the UI. Stripping is the correct approach for this architecture.

**Recursive sanitizer flow:**

```text
sanitizeAIContent({
  improved: "**Strong** summary",
  changes: ["Added **metrics**"],
  suggestions: ["Consider *expanding*"]
})

returns:
{
  improved: "Strong summary",
  changes: ["Added metrics"],
  suggestions: ["Consider expanding"]
}
```

### Files Changed
- `src/lib/ai/sanitizeContent.ts` (new) -- stripMarkdown + sanitizeAIContent utilities
- `src/hooks/useAIEnhance.ts` (modified) -- apply sanitizer before setting result
- `supabase/functions/enhance-section/index.ts` (modified) -- strengthen prompt anti-Markdown instruction
- `src/components/editor/ai/AIEnhanceSheet.tsx` (modified) -- apply sanitizer in applyResult
