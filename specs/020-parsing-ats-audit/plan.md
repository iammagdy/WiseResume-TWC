# Implementation Plan: Parsing & ATS Simulation Audit

**Branch**: `020-parsing-ats-audit` | **Date**: 2026-03-19 | **Spec**: `specs/020-parsing-ats-audit/spec.md`

## Summary

Fix all 14 parsing and ATS simulation findings: 3 Critical failures (silent data loss on non-standard section headings, silent empty-editor on OCR failure, ATS score disconnected from keyword matching), 7 High failures (date parsing, company/position swap, LinkedIn missing fields, AI fallback gap, formatting warnings, image confidence gating, ALL-CAPS false splits), and 4 Medium issues (skills stripping, URL whitelist UX, first-person pronoun false positives, LinkedIn URL error message). All fixes are isolated to 7 files — 5 TypeScript source files and 2 Deno edge functions.

## Clarification Decisions

1. All 14 findings are in scope — no deferral.
2. ATS `score` computation: a simple percentage (matched JD keywords ÷ total JD keywords × 100), capped at 100. No weighted scoring in this spec.
3. Keyword extraction: case-insensitive, split on whitespace/punctuation, min 3 chars, exclude stop words. No stemming or semantic matching in this spec.
4. LinkedIn expansion: add `certifications`, `volunteering`, `languages`, `projects` to the AI tool schema. Multi-role positions returned as separate entries with the same company name.
5. `parse-job-url` whitelist: Option A (keep whitelist, expand with common ATS subdomains `*.greenhouse.io`, `*.lever.co`, `*.workable.com`, `*.ashbyhq.com`). Improve error message to guide paste-text fallback.
6. `ParseResult` extended with `parseStatus` field — existing callers receive `success: true` cases as `parseStatus: 'success'` with no breaking change.
7. Manual testing only (consistent with project standard). No new test files required for this spec beyond the existing `sectionParsers.test.ts`.
8. **Q1 — Recovery UI (answered):** Option A — a prominent, dismissible inline banner above the editor with "Try a different file" and "Fill in manually" CTAs.
9. **Q2 — ATS Score components (answered + clarified):** The three components named (`ATSScorePreview`, `ATSScoreBreakdown`, `JobMatchScore`) are powered by the AI `score-resume` / `analyze-resume` edge functions — they do NOT call `simulateATSParsing`. The `simulateATSParsing` function is consumed by `src/components/editor/ATSParserPreview.tsx` (the editor's ATS tab). Phase 4 targets `ATSParserPreview.tsx` as the wiring point, not the three dashboard/upload components. No changes needed to `useResumeScore.ts` or `jobMatchScorer.ts`.
10. **Q3 — Edge function fallback (answered):** Option B — implement a Deno-compatible regex parser inside `parse-resume`. Flag output as `parseStatus: 'partial'` with a "Fallback Mode" notice shown to the user.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend), Deno (edge functions)
**Primary Dependencies**: pdf.js (text extraction), Tesseract.js (OCR), Gemini AI via `WISE_AI_API_KEY`
**Storage**: N/A (all processing is stateless per-request)
**Testing**: Vitest (frontend), manual integration testing for edge functions
**Target Platform**: Browser (frontend), Supabase Edge Runtime (Deno)
**Performance Goals**: Section detection < 5ms per resume; ATS simulation < 10ms (no AI calls)
**Constraints**: No new npm dependencies; no Supabase schema changes; all edge function changes must remain backward-compatible with existing callers

## Project Structure

### Files to Modify
```
src/lib/pdf/sectionParsers.ts               # FINDING-001, 002, 003, 004, 005
src/lib/atsParserSimulation.ts              # FINDING-009, 010, 011
src/lib/pdfParser.ts                        # FINDING-012 (ParseResult + parseStatus)
src/lib/pdf/ocrExtractor.ts                 # FINDING-014 (confidence gate)
supabase/functions/parse-linkedin/index.ts  # FINDING-006, 007
supabase/functions/parse-job-url/index.ts   # FINDING-008
supabase/functions/parse-resume/index.ts    # FINDING-013
```

### Files to Create
```
supabase/functions/parse-resume/localParser.ts   # Deno-compatible regex fallback parser (Q3)
```

---

## Phase-by-Phase Approach

---

### Phase 1: Section Heading Expansion & Silent Data-Loss Fix (FINDING-001, FINDING-002)

**Target file**: `src/lib/pdf/sectionParsers.ts`

**FINDING-001 — Expand `SECTION_PATTERNS` and add fallback bucket**

Replace lines 5–11 with the expanded patterns below. Add `unrecognized` and pass-through buckets for `projects`, `volunteering`, `languages`, `awards` to `SectionBlocks`:

```typescript
const SECTION_PATTERNS = {
  summary: /^(summary|objective|profile|about\s*me|professional\s*summary|career\s*objective|career\s*summary|executive\s*summary|personal\s*statement|professional\s*profile|highlights|at\s*a\s*glance)$/i,

  experience: /^(experience|work\s*experience|employment|work\s*history|professional\s*experience|career\s*history|employment\s*history|professional\s*background|career\s*background|relevant\s*experience|internship\s*experience|research\s*experience|consulting\s*experience|freelance\s*work|contract\s*work|projects?)$/i,

  education: /^(education|academic|qualifications|academic\s*background|schooling|degrees?|educational\s*background|formal\s*education|academic\s*history)$/i,

  skills: /^(skills|technical\s*skills|core\s*competencies|technologies|expertise|proficiencies|languages?|soft\s*skills|hard\s*skills|key\s*skills|core\s*skills|areas\s*of\s*expertise|competencies|technical\s*proficiencies|tools?\s*(?:&|and)\s*technologies|programming\s*languages?)$/i,

  certifications: /^(certifications?|certificates?|licenses?|credentials?|professional\s*certifications?|training|courses?|professional\s*development|continuing\s*education|accreditations?)$/i,

  awards: /^(awards?|honors?|achievements?|accomplishments?|recognition|awards?\s*(?:&|and)\s*honors?)$/i,

  projects: /^(projects?|personal\s*projects?|side\s*projects?|open\s*source|portfolio)$/i,

  volunteering: /^(volunteer(?:ing)?|community\s*service|civic\s*engagement|community\s*involvement)$/i,

  languages: /^(languages?\s*(?:spoken)?|language\s*skills|spoken\s*languages?)$/i,
};
```

Update `SectionBlocks` interface to add the new buckets:

```typescript
interface SectionBlocks {
  summary: string[];
  experience: string[];
  education: string[];
  skills: string[];
  certifications: string[];
  awards: string[];
  projects: string[];
  volunteering: string[];
  languages: string[];
  header: string[];
  unrecognized: string[];  // catch-all for unknown headings — never silently dropped
}
```

In `extractSections`, initialize the new buckets and update the `foundSection` assignment to cover the extended type. When no section matches but the line *looks like a heading* (all-caps, short, colon-terminated), push it to `unrecognized`:

```typescript
// At the bottom of the heading-check block, before the `else`:
if (foundSection) {
  currentSection = foundSection as keyof SectionBlocks;
} else {
  // Check if this looks like an unrecognized heading
  const looksLikeHeading =
    cleanLine.length > 2 &&
    cleanLine.length < 60 &&
    (/^[A-Z][A-Z\s&/()-]{2,}$/.test(cleanLine) || line.endsWith(':'));
  if (looksLikeHeading && currentSection !== 'unrecognized') {
    currentSection = 'unrecognized';
  }
  sections[currentSection].push(line);
}
```

In `parseResumeText`, pass `sections.projects`, `sections.volunteering`, `sections.languages`, and `sections.awards` through to the returned object so the AI has access to them (they are already handled by the AI edge function's full schema):

```typescript
// Append unrecognized and pass-through sections as extra context for AI
// by appending them to the relevant sections or returning as raw text fields.
// For the local parser path only — AI path receives full text anyway.
```

---

**FINDING-002 — Fix ALL-CAPS false-positive block splits**

In `splitIntoBlocks` (around line 357–362), change the ALL-CAPS trigger so it requires date proximity. The existing all-caps check:

```typescript
(/^[A-Z][A-Z0-9 &,./()-]{2,}$/.test(line) && line.split(/\s+/).length <= 5);
```

Replace with a lookahead helper that checks whether the *next* 3 lines contain a date pattern before treating this as a block boundary:

```typescript
// Replace the inline ALL-CAPS check with a named helper:
function looksLikeBlockHeader(line: string, nextLines: string[]): boolean {
  if (!/^[A-Z][A-Z0-9 &,./()-]{2,}$/.test(line)) return false;
  if (line.split(/\s+/).length > 5) return false;
  // Only treat as block start if a date pattern appears within the next 3 lines
  const nearby = nextLines.slice(0, 3).join(' ');
  return /\b(19|20)\d{2}\b/.test(nearby) ||
    /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(nearby);
}
```

Pass `lines.slice(i + 1)` as `nextLines` when iterating.

---

### Phase 2: Date & Company Parsing Fixes (FINDING-003, FINDING-004)

**Target file**: `src/lib/pdf/sectionParsers.ts`

**FINDING-003 — Expand job-title keyword list**

Replace lines 217–219 with the expanded title keywords:

```typescript
const JOB_TITLE_KEYWORDS = /architect|consultant|coordinator|designer|developer|director|engineer|intern|lecturer|manager|nurse|officer|professor|researcher|scientist|specialist|technician|therapist|attorney|accountant|auditor|administrator|analyst|associate|lead|senior|junior|principal|vp|vice\s*president|president|cto|ceo|coo|cfo/i;

if (
  position &&
  !JOB_TITLE_KEYWORDS.test(company) &&
  JOB_TITLE_KEYWORDS.test(position)
) {
  [company, position] = [position, company];
}
```

Also add a company-suffix heuristic as a secondary check (after the keyword swap attempt):

```typescript
const COMPANY_SUFFIX = /\b(?:Inc\.?|Ltd\.?|LLC|Corp\.?|Co\.?|Group|Holdings|International|Solutions|Services|Technologies|Consulting|Associates|Partners)\b/i;
// If company line matches a job title but position matches a company suffix, swap
if (COMPANY_SUFFIX.test(position) && !COMPANY_SUFFIX.test(company)) {
  [company, position] = [position, company];
}
```

---

**FINDING-004 — Expand `RANGE_PATTERN` to handle additional date formats**

Replace the `RANGE_PATTERN` definition (lines 387–390) with a multi-branch approach:

```typescript
// Branch 1 (existing): "Month Year – Month Year/Present"
const RANGE_FULL = new RegExp(
  `((?:${MONTHS_PATTERN})\\s*\\d{4}|\\d{4})\\s*[-–—to]+\\s*((?:${MONTHS_PATTERN})\\s*\\d{4}|\\d{4}|Present|Current|Now)`,
  'i'
);

// Branch 2: MM/YYYY – MM/YYYY or MM/YYYY – Present
const RANGE_SLASH = /(\d{1,2}\/\d{4})\s*[-–—to]+\s*(\d{1,2}\/\d{4}|Present|Current|Now)/i;

// Branch 3: YYYY–YYYY (em-dash or en-dash, no spaces)
const RANGE_YEAR_ONLY = /\b(\d{4})\s*[-–—]\s*(\d{4}|Present|Current|Now)\b/i;

// Branch 4: Single year (graduation / single-year roles)
const SINGLE_YEAR = /\b((?:19|20)\d{2})\b/;
```

Update `extractDateRange` to try each branch in order:

```typescript
export function extractDateRange(text: string): { startDate: string; endDate: string; current: boolean } {
  for (const pattern of [RANGE_FULL, RANGE_SLASH, RANGE_YEAR_ONLY]) {
    const match = text.match(pattern);
    if (match) {
      const endStr = match[2].toLowerCase();
      const isCurrent = ['present', 'current', 'now'].some(p => endStr.includes(p));
      return { startDate: match[1], endDate: isCurrent ? '' : match[2], current: isCurrent };
    }
  }
  // Single year fallback (education graduation year)
  const single = text.match(SINGLE_YEAR);
  if (single) {
    return { startDate: '', endDate: single[1], current: false };
  }
  return { startDate: '', endDate: '', current: false };
}
```

---

### Phase 3: Skills Parsing Fix (FINDING-005)

**Target file**: `src/lib/pdf/sectionParsers.ts`

**FINDING-005 — Strip category labels and raise character limit**

In `parseSkillsSection`, add a pre-processing step before the split to remove "Category: " prefixes, and raise the max character limit from 50 to 80:

```typescript
export function parseSkillsSection(lines: string[]): string[] {
  // Strip category label patterns like "Frontend:", "Backend:", "Languages:"
  const cleanedLines = lines.map(l => l.replace(/^[A-Za-z\s/&]+:\s*/, ''));
  const fullText = cleanedLines.join(' ');

  const skills = fullText
    .split(/[,|•·\n;]/)
    .map(s => s.replace(/[:\-–—]/g, ' ').trim())
    .filter(s =>
      s.length > 1 &&
      s.length < 80 &&   // raised from 50
      !s.match(/^\d+$/) &&
      !s.match(/^(and|or|the|a|an)$/i)
    )
    .slice(0, 60);

  const seen = new Set<string>();
  return skills.filter(skill => {
    const lower = skill.toLowerCase();
    if (seen.has(lower)) return false;
    seen.add(lower);
    return true;
  });
}
```

---

### Phase 4: ATS Simulation Overhaul (FINDING-009, FINDING-010, FINDING-011)

**Target files**: `src/lib/atsParserSimulation.ts`, `src/components/editor/ATSParserPreview.tsx`

> **Architecture note**: `simulateATSParsing` is the local, instant ATS check rendered in the **editor's ATS tab** (`ATSParserPreview.tsx` line 82). It is NOT the source of the scores in `ATSScoreBreakdown`, `ATSScorePreview`, or `JobMatchScore` — those are driven by the `score-resume` / `analyze-resume` AI edge functions and are untouched by this spec. Phase 4 wires the new `score`, `matchedKeywords`, and `missingKeywords` fields into `ATSParserPreview.tsx` only.

**FINDING-009 — Add job description input, keyword extraction from all sections, numeric score**

The `simulateATSParsing` signature becomes:

```typescript
export function simulateATSParsing(
  resume: ResumeData,
  jobDescription?: string,
  formattingSignals?: { isMultiColumn?: boolean; confidence?: number }
): ATSParsedResult
```

Add a `score`, `matchedKeywords` (already present as `detectedKeywords`), and `missingKeywords` to the return type:

```typescript
export interface ATSParsedResult {
  sections: ATSParsedSection[];
  totalWords: number;
  detectedKeywords: string[];  // keywords found in resume
  matchedKeywords: string[];   // keywords found in BOTH resume and JD (when JD provided)
  missingKeywords: string[];   // JD keywords NOT found in resume (when JD provided)
  score: number;               // 0-100: structural score when no JD, keyword match % when JD provided
  issues: string[];
  formattingWarnings: string[];
}
```

Add keyword extraction helper that reads ALL resume text fields:

```typescript
const STOP_WORDS = new Set(['the','a','an','and','or','of','in','to','for','with','on','at','by','as','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','shall','can','need','must','that','this','these','those','it','its','i','me','my','we','our','you','your']);

function extractAllResumeKeywords(resume: ResumeData): Set<string> {
  const text = [
    resume.summary || '',
    resume.contactInfo?.fullName || '',
    ...resume.experience.flatMap(e => [
      e.position || '',
      e.description || '',
      ...(e.achievements || []),
      ...(e.responsibilities || []),
    ]),
    ...resume.education.flatMap(e => [e.degree || '', e.field || '', e.institution || '']),
    ...resume.skills,
    ...(resume.certifications || []).map(c => c.name || ''),
    ...(resume.projects || []).flatMap(p => [p.name || '', p.description || '']),
    ...(resume.awards || []).map(a => a.title || ''),
  ].join(' ');

  return new Set(
    text
      .toLowerCase()
      .split(/[\s,.|•·;:()\[\]{}'"\/\\]+/)
      .filter(w => w.length >= 3 && !STOP_WORDS.has(w))
  );
}

function extractJDKeywords(jd: string): string[] {
  return [...new Set(
    jd
      .toLowerCase()
      .split(/[\s,.|•·;:()\[\]{}'"\/\\]+/)
      .filter(w => w.length >= 3 && !STOP_WORDS.has(w))
  )];
}
```

Scoring logic at the end of `simulateATSParsing`:

```typescript
let score = 0;
let matchedKeywords: string[] = [];
let missingKeywords: string[] = [];

if (jobDescription) {
  const resumeKws = extractAllResumeKeywords(resume);
  const jdKws = extractJDKeywords(jobDescription);
  matchedKeywords = jdKws.filter(k => resumeKws.has(k));
  missingKeywords = jdKws.filter(k => !resumeKws.has(k)).slice(0, 20);
  score = jdKws.length > 0 ? Math.round((matchedKeywords.length / jdKws.length) * 100) : 0;
} else {
  // Structural score: proportion of key sections that are 'detected'
  const keyIds = ['contact', 'summary', 'experience', 'education', 'skills'];
  const detected = sections.filter(s => keyIds.includes(s.id) && s.status === 'detected').length;
  score = Math.round((detected / keyIds.length) * 100);
}
```

---

**FINDING-010 — Add `formattingWarnings` from extraction signals**

At the start of `simulateATSParsing`, compute formatting warnings from the optional `formattingSignals` parameter:

```typescript
const formattingWarnings: string[] = [];
if (formattingSignals?.isMultiColumn) {
  formattingWarnings.push('Two-column layout detected — some ATS systems read columns left-to-right across both, garbling your content. Consider a single-column layout for ATS submissions.');
}
if (formattingSignals?.confidence !== undefined && formattingSignals.confidence < 0.5) {
  formattingWarnings.push('Low text extraction confidence — your resume may contain images, text boxes, or unusual fonts that ATS systems cannot read.');
}
```

Include `formattingWarnings` in the return value.

---

**FINDING-011 — Tighten first-person pronoun check**

Replace line 61 with:

```typescript
// Match first-person pronouns only at the start of a sentence or after whitespace
// Avoid false positives like "Mines Advisory Group" or company names
if (/(?:^|\.\s+|\n)\s*(?:I|me|my|mine|myself)\b/i.test(summary) ||
    /\bI\s+(?:am|was|have|had|led|managed|built|developed|designed)\b/i.test(summary)) {
  summaryIssues.push("Contains first-person pronouns (e.g., 'I', 'my') — rephrase in third person or omit the subject");
}
```

---

### Phase 5: ParseResult Extension, OCR Confidence Gate & Recovery Banner (FINDING-012, FINDING-014)

**Target files**: `src/lib/pdfParser.ts`, `src/lib/pdf/ocrExtractor.ts`, `src/pages/UploadPage.tsx`

**FINDING-012 — Add `parseStatus` to `ParseResult`**

Extend the `ParseResult` interface (line 28):

```typescript
export interface ParseResult {
  success: boolean;
  data?: ResumeData;
  needsOCR: boolean;
  pageCount: number;
  parseStatus: 'success' | 'partial' | 'failed';
  parseWarnings: string[];
}
```

In `parseResumePDF`, use `getExtractionSummary` (already exists at line 179) to determine `parseStatus` after AI parsing:

```typescript
const data = await parseTextWithAI(textWithHints);
const summary = getExtractionSummary(data);
const parseStatus = summary.isEmpty ? 'failed' : summary.isPartial ? 'partial' : 'success';
const parseWarnings: string[] = [];
if (parseStatus !== 'success') {
  parseWarnings.push(summary.summary);
}

return {
  success: true,
  data,
  needsOCR: false,
  pageCount: extraction.pageCount,
  parseStatus,
  parseWarnings,
};
```

For the `needsOCR` early-return branch, add defaults:

```typescript
return {
  success: false,
  needsOCR: true,
  pageCount: extraction.pageCount,
  parseStatus: 'failed',
  parseWarnings: ['PDF contains no selectable text — OCR required'],
};
```

---

**FINDING-014 — Confidence gate before AI call in OCR path**

In `parseResumePDFWithOCR` (`pdfParser.ts` line 165–174), add a confidence check before the AI call:

```typescript
export async function parseResumePDFWithOCR(
  file: File,
  onProgress?: OCRProgressCallback
): Promise<{ data: ResumeData; parseStatus: 'success' | 'partial' | 'failed'; parseWarnings: string[] }> {
  const text = await extractTextWithOCR(file, onProgress);

  // Gate: if OCR produced near-nothing, do not waste AI credits
  const { computeTextConfidence } = await import('./pdf/textPreprocessor');
  const confidence = computeTextConfidence(text);
  if (confidence < 0.25) {
    return {
      data: parseResumeText(''),  // empty resume skeleton
      parseStatus: 'failed',
      parseWarnings: [
        'Image quality too low to extract text reliably (confidence: ' + Math.round(confidence * 100) + '%). ' +
        'Please upload a clearer scan or a PDF with selectable text.'
      ],
    };
  }

  const data = await parseTextWithAI(text);
  const summary = getExtractionSummary(data);
  return {
    data,
    parseStatus: summary.isEmpty ? 'failed' : summary.isPartial ? 'partial' : 'success',
    parseWarnings: summary.isEmpty || summary.isPartial ? [summary.summary] : [],
  };
}
```

> **Note**: The return type of `parseResumePDFWithOCR` changes — any callers must be updated to handle the new shape.

**Wire the recovery banner into `UploadPage.tsx`** (Q1 — Option A confirmed)

`UploadPage.tsx` currently calls `parseResumePDFWithOCR` at line 101 and uses the return value directly as `ResumeData`. Update to:

```typescript
// BEFORE:
const resumeData = await parseResumePDFWithOCR(pendingFile, progressCallback);
const extraction = getExtractionSummary(resumeData);

// AFTER:
const { data: resumeData, parseStatus, parseWarnings } = await parseResumePDFWithOCR(pendingFile, progressCallback);
const extraction = getExtractionSummary(resumeData);

// Show recovery banner if parse was partial or failed
if (parseStatus !== 'success') {
  setParseRecoveryWarnings(parseWarnings);   // new state: string[]
  setShowParseRecoveryBanner(true);          // new state: boolean
}
```

Add a recovery banner component inline in `UploadPage.tsx` (no new file needed — use existing `Alert` component from the UI library):

```tsx
{showParseRecoveryBanner && (
  <Alert variant="warning" className="mb-4">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>We had trouble reading your document</AlertTitle>
    <AlertDescription>
      {parseRecoveryWarnings.join(' ')}
      <div className="flex gap-2 mt-3">
        <Button size="sm" variant="outline" onClick={() => navigate('/upload')}>
          Try a different file
        </Button>
        <Button size="sm" onClick={() => setShowParseRecoveryBanner(false)}>
          Fill in manually
        </Button>
      </div>
    </AlertDescription>
  </Alert>
)}
```

The banner is dismissible via the "Fill in manually" button (sets `showParseRecoveryBanner` to `false`) and does not block the user from proceeding with whatever data was extracted.

Similarly, update the `parseResumePDF` caller path in `UploadPage.tsx` to check `parseStatus` from the `ParseResult` and trigger the same banner.

**Wire `ATSParserPreview.tsx` to consume new `simulateATSParsing` fields**

`ATSParserPreview.tsx` at line 82 calls `simulateATSParsing(currentResume)` with no JD. After Phase 4:

```typescript
// The parsed result now has .score, .formattingWarnings
const parsed = useMemo(
  () => currentResume ? simulateATSParsing(currentResume) : null,
  [currentResume]
);
```

Expose `parsed.score` in the component's UI wherever the structural ATS score is displayed, replacing any locally-computed score value. Display `parsed.formattingWarnings` as a separate warning list if non-empty. Display `parsed.missingKeywords` (empty when no JD is provided) only when a JD has been wired in via the Tailor Resume flow.

---

### Phase 6: Edge Function Fixes (FINDING-006, FINDING-007, FINDING-008, FINDING-013)

**Target file**: `supabase/functions/parse-linkedin/index.ts`

**FINDING-006 — Expand LinkedIn schema with 4 additional sections**

In the `extract_linkedin_data` tool definition, add to the `properties` object:

```typescript
certifications: {
  type: 'array',
  description: 'List of certifications or licenses from the Licenses & Certifications section',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      organization: { type: 'string' },
      date: { type: 'string', description: 'Issue date, e.g. "Mar 2023"' },
    },
    required: ['name'],
  },
},
volunteering: {
  type: 'array',
  description: 'Volunteer experience entries',
  items: {
    type: 'object',
    properties: {
      role: { type: 'string' },
      organization: { type: 'string' },
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      description: { type: 'string' },
    },
    required: ['role', 'organization'],
  },
},
languages: {
  type: 'array',
  description: 'Languages and proficiency levels',
  items: {
    type: 'object',
    properties: {
      language: { type: 'string' },
      proficiency: { type: 'string', description: 'e.g. Native, Fluent, Professional, Elementary' },
    },
    required: ['language'],
  },
},
projects: {
  type: 'array',
  description: 'Projects listed on the profile',
  items: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: 'string' },
      url: { type: 'string' },
    },
    required: ['name'],
  },
},
```

Also add to the system prompt: *"For experience entries where a person held multiple roles at the same company (progressive promotion), return each role as a separate experience entry with the same company name."*

---

**FINDING-007 — Improve LinkedIn URL-only rejection error message**

Find the URL-only validation check in the edge function and replace the error response body:

```typescript
// BEFORE (generic):
return new Response(JSON.stringify({ error: 'Please provide LinkedIn profile text, not just a URL' }), ...);

// AFTER (actionable):
return new Response(JSON.stringify({
  error: 'URL_ONLY_REJECTED',
  message: "We can't fetch LinkedIn profiles directly due to access restrictions. " +
    "Instead: open your LinkedIn profile in a browser, press Ctrl+A (or Cmd+A on Mac) to select all text, " +
    "copy it, and paste it into this field.",
}), { status: 400, headers: { 'Content-Type': 'application/json' } });
```

---

**Target file**: `supabase/functions/parse-job-url/index.ts`

**FINDING-008 — Expand domain whitelist and improve rejection message**

Add to the `ALLOWED_DOMAINS` array:

```typescript
// ATS platforms — subdomain patterns handled separately below
'greenhouse.io',
'lever.co',
'workable.com',
'ashbyhq.com',
'smartrecruiters.com',
'recruitee.com',
'breezy.hr',
'wellfound.com',          // formerly AngelList jobs
'himalayas.app',
'remotive.com',
'arc.dev',
'ycombinator.com',
'workatastartup.com',
```

Add subdomain matching logic alongside the existing domain check:

```typescript
const ATS_SUBDOMAINS = ['greenhouse.io', 'lever.co', 'workable.com', 'ashbyhq.com', 'smartrecruiters.com'];
const isAllowedAtsSub = ATS_SUBDOMAINS.some(d => hostname.endsWith('.' + d) || hostname === d);

if (!isAllowed && !isAllowedAtsSub) {
  return new Response(JSON.stringify({
    error: 'DOMAIN_NOT_ALLOWED',
    message: `We can't fetch job listings from "${hostname}" directly. ` +
      'Please copy the job description text and paste it using the "Paste text" option instead.',
  }), { status: 400, headers: { 'Content-Type': 'application/json' } });
}
```

---

**Target file**: `supabase/functions/parse-resume/index.ts`

**FINDING-013 — Add fallback on Gemini 429/503 errors**

The `parse-resume` function currently calls `handleAIError` and propagates the error. Add a retry/fallback path. Find the main AI call block and wrap it:

```typescript
let parsedResume: ResumeData | null = null;
let parseStatus: 'success' | 'partial' | 'failed' = 'success';

try {
  parsedResume = await callGeminiParseResume(cleanedText); // existing AI call
} catch (err: any) {
  const status = err?.status ?? err?.statusCode;

  if (status === 429) {
    // Rate limited — tell the client to retry
    return new Response(JSON.stringify({
      error: 'RATE_LIMITED',
      message: 'AI service is temporarily busy. Please wait a moment and try again.',
      retryAfter: 30,
    }), { status: 429, headers: corsHeaders });
  }

  if (status === 503 || status === 500) {
    // Service unavailable — fall back to local regex parser
    console.warn('[parse-resume] Gemini unavailable, falling back to local parser');
    // Import local parser equivalent (parse raw structured fields from text using regex)
    parsedResume = localParseResume(cleanedText); // see note below
    parseStatus = 'partial';
  } else {
    // Unexpected error — propagate
    throw err;
  }
}
```

> **Note on `localParseResume` (Q3 — Option B confirmed)**: Implement a Deno-compatible regex parser *inside* the edge function. Create a new file `supabase/functions/parse-resume/localParser.ts` that duplicates a stripped-down version of `sectionParsers.ts` logic (no uuid dependency — use `crypto.randomUUID()` from Deno). It must produce a valid `ResumeData` shape. Flag all results from this path as `parseStatus: 'partial'`. The response body should include a `fallbackMode: true` flag so the client can show: "Parsed in fallback mode — AI was unavailable. Please review your data carefully."

Also wrap the *text-cleaning pre-pass* in its own try/catch that silently skips cleaning on failure:

```typescript
let cleanedText = rawText;
try {
  cleanedText = await cleanTextWithAI(rawText);
} catch (cleanErr) {
  console.warn('[parse-resume] Text cleaning pre-pass failed, using raw text:', cleanErr);
  // Continue with uncleaned text — better than failing entirely
}
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Expanded `SECTION_PATTERNS` introduces new false positives (e.g., "Languages" section matched for skills) | Medium | "Languages" is already in the skills pattern — the new `languages` bucket takes priority for standalone "Languages" headings with proficiency content; the order of SECTION_ENTRIES determines priority, so `languages` bucket should be checked before `skills` |
| `looksLikeBlockHeader` lookahead requires passing index context into `splitIntoBlocks` | Low | Refactor loop from `for...of` to `for (let i = 0; i < lines.length; i++)` — straightforward |
| `parseResumePDFWithOCR` return type change breaks callers | Medium | Find all callers via Grep, update to destructure `{ data, parseStatus, parseWarnings }`. Likely 1–2 call sites in the upload component |
| ATS score changes with new formula — existing users see different numbers | Low | Score was not previously a stable API contract; document the change. The structural-only fallback (no JD) maps to the same conceptual meaning |
| Gemini local fallback in edge function produces weaker results | Low | `parseStatus: 'partial'` signals the UI to prompt the user to review the imported data — acceptable degradation |
| New LinkedIn schema properties not returned by AI on older responses | Low | The AI tool call specifies properties but does not require them — missing fields default to empty arrays in the response mapper |

## Open Questions

None — all decisions confirmed. See Clarification Decisions items 8–10.
