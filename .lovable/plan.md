

# Fix CV Parsing: Contact Info & Skills Extraction

## Problem
The AI parser sometimes places skills (e.g. "Python") into the location field, misses emails/phones, and confuses field types. Root causes:
1. The system prompt lacks explicit field-type guidance and negative examples
2. The tool schema marks `email`, `phone`, `location` as **required**, forcing the AI to hallucinate values when not found
3. No post-processing validation catches misclassified fields (e.g. a skill placed in location)
4. The `fixConcatenatedWords` preprocessor can break email addresses (e.g. inserting spaces into `john@Company.com`)

---

## Changes

### 1. Enhance AI System Prompt (Edge Function)
**File: `supabase/functions/parse-resume/index.ts`** -- Update `systemPrompt` (line 130)

Add explicit field-type instructions and negative examples:

```text
=== CONTACT INFO RULES ===
- email: MUST contain "@" and a domain. If no email found, return "".
- phone: MUST be digits with optional separators (+, -, spaces, parens). If no phone found, return "".
- location: MUST be a geographic place (city, state, country). NEVER put skills, technologies, or programming languages here. If no location found, return "".
  - VALID: "New York, NY", "London, UK", "Cairo, Egypt", "Remote"
  - INVALID: "Python", "JavaScript", "React" -- these are SKILLS, not locations.

=== SKILLS RULES ===
- Programming languages (Python, JavaScript, Java, C++, etc.) are ALWAYS skills.
- Frameworks and tools (React, Django, Docker, AWS, etc.) are ALWAYS skills.
- NEVER place technology names in contactInfo.location or contactInfo.fullName.
```

### 2. Relax Schema Required Fields (Edge Function)
**File: `supabase/functions/parse-resume/index.ts`** -- Update `parseResumeTool` schema (line 27)

Change contactInfo required from:
```
required: ["fullName", "email", "phone", "location"]
```
To:
```
required: ["fullName"]
```

Add `description` hints to each field in the schema properties:
- `email`: `"Email address containing @ symbol, or empty string if not found"`
- `phone`: `"Phone number with digits, or empty string if not found"`  
- `location`: `"Geographic location (city/state/country), NOT skills or technologies. Empty string if not found"`

### 3. Add Post-Processing Validation (Edge Function)
**File: `supabase/functions/parse-resume/index.ts`** -- Add after line 406 (after pass 2 merge), before the name validation block

Add a `validateAndFixFields` function that:
- **Location check**: If `location` matches a known skill/technology pattern (Python, JavaScript, React, Java, C++, Node, AWS, Docker, etc.), move it to the `skills` array and clear location
- **Email check**: If `email` doesn't contain `@`, clear it
- **Phone check**: If `phone` digits are fewer than 7, clear it
- **Skills dedup**: After moving misclassified fields, deduplicate the skills array

```text
Common skill keywords to check against location:
/^(python|javascript|typescript|java|c\+\+|c#|ruby|go|rust|swift|kotlin|php|r|scala|perl|html|css|sql|react|angular|vue|node|django|flask|spring|express|docker|kubernetes|aws|azure|gcp|git|linux|mongodb|postgresql|mysql|redis|terraform|jenkins|graphql|rest|api|agile|scrum|jira|figma|tableau|power\s*bi|excel|machine\s*learning|ai|ml|data\s*science|deep\s*learning|nlp|tensorflow|pytorch)$/i
```

### 4. Protect Contact Info in Text Preprocessor (Client-side)
**File: `src/lib/pdf/textPreprocessor.ts`** -- Update `fixConcatenatedWords` (line 12)

The current regex `([a-z])([A-Z])` will break email addresses like `john@BigCompany.com` into `john@Big Company.com`. 

Add email/URL protection:
- Before applying the PascalCase fix, extract and replace emails/URLs with placeholders
- Apply the fix
- Restore the placeholders

```text
function fixConcatenatedWords(text: string): string {
  // Protect emails and URLs from being split
  const protected: { placeholder: string; original: string }[] = [];
  let safeText = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, (match) => {
    const ph = `__EMAIL_${protected.length}__`;
    protected.push({ placeholder: ph, original: match });
    return ph;
  }).replace(/https?:\/\/\S+/g, (match) => {
    const ph = `__URL_${protected.length}__`;
    protected.push({ placeholder: ph, original: match });
    return ph;
  });
  
  // Apply PascalCase splitting
  safeText = safeText.replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, '$1 $2');
  
  // Restore protected tokens
  for (const { placeholder, original } of protected) {
    safeText = safeText.replace(placeholder, original);
  }
  return safeText;
}
```

### 5. Add Contact Info Hint Extraction (Client-side)
**File: `src/lib/pdf/textPreprocessor.ts`** -- Add new exported function

Add a `extractContactHints` function that scans the first 15 lines of text for emails, phones, and locations using regex. These hints are appended to the text sent to the AI as a structured block:

```text
--- CONTACT INFO HINTS (extracted by regex) ---
Potential emails: john@example.com
Potential phones: +1-555-123-4567
```

**File: `src/lib/pdfParser.ts`** -- Update `parseResumePDF` to call `extractContactHints` and append hints to the cleaned text before sending to AI.

This gives the AI a strong signal about contact info even if the text layout is confusing.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/parse-resume/index.ts` | Enhanced prompt, relaxed schema, post-processing validation |
| `src/lib/pdf/textPreprocessor.ts` | Email/URL protection in word splitting, contact hint extraction |
| `src/lib/pdfParser.ts` | Append contact hints before AI call |

## No Database or Backend Infrastructure Changes
All changes are code-only: prompt engineering, schema tweaks, regex validation, and client-side preprocessing.

