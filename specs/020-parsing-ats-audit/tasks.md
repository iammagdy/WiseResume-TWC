# Tasks: Parsing & ATS Simulation Audit

**Spec**: `specs/020-parsing-ats-audit/spec.md`
**Plan**: `specs/020-parsing-ats-audit/plan.md`
**Branch**: `020-parsing-ats-audit`

> ⚠️ **Implementation note**: Tasks are written with maximum detail for autonomous execution. Every task references the exact file, the exact lines to change (where known from the audit), and the exact pattern to apply. Do not skip details or summarize — follow each task precisely.

---

## Phase 1: Foundational — TypeScript Interface Extensions

**Purpose**: Extend the core TypeScript interfaces that every other task in this spec depends on. These must be done FIRST — all later tasks reference the new fields added here.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

---

- [ ] T001 [S][FOUNDATION] **Extend `SectionBlocks` interface in `src/lib/pdf/sectionParsers.ts`**

  File: `src/lib/pdf/sectionParsers.ts`
  Lines to change: 16–23 (the `interface SectionBlocks` block)

  Replace the current interface:
  ```typescript
  interface SectionBlocks {
    summary: string[];
    experience: string[];
    education: string[];
    skills: string[];
    certifications: string[];
    header: string[];
  }
  ```
  With the expanded version:
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
    unrecognized: string[];
  }
  ```

---

- [ ] T002 [S][FOUNDATION] **Extend `ParseResult` interface in `src/lib/pdfParser.ts`**

  File: `src/lib/pdfParser.ts`
  Lines to change: 28–33 (the `export interface ParseResult` block)

  Replace:
  ```typescript
  export interface ParseResult {
    success: boolean;
    data?: ResumeData;
    needsOCR: boolean;
    pageCount: number;
  }
  ```
  With:
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

---

- [ ] T003 [S][FOUNDATION] **Extend `ATSParsedResult` interface in `src/lib/atsParserSimulation.ts`**

  File: `src/lib/atsParserSimulation.ts`
  Lines to change: 12–17 (the `export interface ATSParsedResult` block)

  Replace:
  ```typescript
  export interface ATSParsedResult {
    sections: ATSParsedSection[];
    totalWords: number;
    detectedKeywords: string[];
    issues: string[];
  }
  ```
  With:
  ```typescript
  export interface ATSParsedResult {
    sections: ATSParsedSection[];
    totalWords: number;
    detectedKeywords: string[];   // all keywords found in the resume (skills + all text)
    matchedKeywords: string[];    // JD keywords found in resume (empty if no JD provided)
    missingKeywords: string[];    // JD keywords NOT found in resume (empty if no JD provided)
    score: number;                // 0–100: keyword match % when JD provided; structural score otherwise
    issues: string[];
    formattingWarnings: string[]; // ATS formatting red flags from extraction signals
  }
  ```

**✅ Checkpoint — Foundation**: All three interfaces are extended. Verify TypeScript compiles (run `npx tsc --noEmit` or check the dev server for type errors). At this point every subsequent task has a valid type contract to implement against.

---

## Phase 2: User Story 1 — Non-Standard Section Headings (Priority: P1) 🎯

**Goal**: Resume sections titled "Work History", "Core Competencies", "Career Summary", etc. are correctly detected and their content is not silently lost.

**Findings addressed**: FINDING-001, FINDING-002, FINDING-003, FINDING-005
**File**: `src/lib/pdf/sectionParsers.ts`

**Independent Test**: Upload a test resume where sections are named "Work History", "Core Competencies", and "Career Summary". All three sections should populate correctly in the editor after parsing.

---

- [ ] T004 [S][US1] **Replace `SECTION_PATTERNS` with the expanded variant list** (`src/lib/pdf/sectionParsers.ts`)

  File: `src/lib/pdf/sectionParsers.ts`
  Lines to change: 5–11 (the `const SECTION_PATTERNS` block)

  Replace the entire `SECTION_PATTERNS` constant with:
  ```typescript
  const SECTION_PATTERNS: Record<string, RegExp> = {
    summary: /^(summary|objective|profile|about\s*me|professional\s*summary|career\s*objective|career\s*summary|executive\s*summary|personal\s*statement|professional\s*profile|highlights|at\s*a\s*glance)$/i,

    experience: /^(experience|work\s*experience|employment|work\s*history|professional\s*experience|career\s*history|employment\s*history|professional\s*background|career\s*background|relevant\s*experience|internship\s*experience|research\s*experience|consulting\s*experience|freelance\s*work|contract\s*work|projects?)$/i,

    education: /^(education|academic|qualifications|academic\s*background|schooling|degrees?|educational\s*background|formal\s*education|academic\s*history)$/i,

    skills: /^(skills|technical\s*skills|core\s*competencies|technologies|expertise|proficiencies|soft\s*skills|hard\s*skills|key\s*skills|core\s*skills|areas\s*of\s*expertise|competencies|technical\s*proficiencies|tools?\s*(?:&|and)\s*technologies|programming\s*languages?)$/i,

    certifications: /^(certifications?|certificates?|licenses?|credentials?|professional\s*certifications?|training|courses?|professional\s*development|continuing\s*education|accreditations?)$/i,

    awards: /^(awards?|honors?|achievements?|accomplishments?|recognition|awards?\s*(?:&|and)\s*honors?)$/i,

    projects: /^(projects?|personal\s*projects?|side\s*projects?|open\s*source|portfolio)$/i,

    volunteering: /^(volunteer(?:ing)?|community\s*service|civic\s*engagement|community\s*involvement)$/i,

    languages: /^(languages?\s*(?:spoken)?|language\s*skills|spoken\s*languages?)$/i,
  };
  ```

  > **Important**: The `languages` pattern must appear AFTER `skills` in the object literal so it takes priority over skills for a standalone "Languages" heading. JavaScript objects maintain insertion order — the `SECTION_ENTRIES` constant on line 14 iterates in insertion order.

  After this change, also update line 14 to ensure it still reads:
  ```typescript
  const SECTION_ENTRIES = Object.entries(SECTION_PATTERNS);
  ```
  (No change needed to this line — just confirm it is still there.)

---

- [ ] T005 [S][US1] **Update `extractSections` to initialize new buckets and add unrecognized catch-all** (`src/lib/pdf/sectionParsers.ts`)

  File: `src/lib/pdf/sectionParsers.ts`
  Function: `extractSections` (lines 72–105)

  **Step 1** — Update the `sections` initializer at line 73 to include the new buckets:
  ```typescript
  const sections: SectionBlocks = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    awards: [],
    projects: [],
    volunteering: [],
    languages: [],
    header: [],
    unrecognized: [],
  };
  ```

  **Step 2** — Update the heading-detection block (lines 88–101). Replace the `if (foundSection) { ... } else { sections[currentSection].push(line); }` block with this expanded version:
  ```typescript
  if (foundSection) {
    currentSection = foundSection as keyof SectionBlocks;
    // Don't add the heading itself to content
  } else {
    // Check if this line looks like an unrecognized section heading
    // (all-caps short line, or line ending with colon) to avoid silently
    // appending unknown section content to the previous section
    const looksLikeHeading =
      cleanLine.length > 2 &&
      cleanLine.length < 60 &&
      (
        /^[A-Z][A-Z\s&/()-]{2,}$/.test(cleanLine) ||
        line.trim().endsWith(':')
      );
    if (looksLikeHeading && currentSection !== 'unrecognized') {
      currentSection = 'unrecognized';
    }
    sections[currentSection].push(line);
  }
  ```

  **Step 3** — In `parseResumeText` (lines 28–55), the function currently only reads 5 buckets. The AI edge function receives the full raw text anyway, so no change is needed to `parseResumeText`'s return value — it will still compile because `ResumeData` already supports `projects`, `volunteering`, etc. via the AI path. The local parser path simply leaves those fields as empty arrays, which is acceptable.

---

- [ ] T006 [S][US1] **Fix ALL-CAPS false-positive block splits in `splitIntoBlocks`** (`src/lib/pdf/sectionParsers.ts`)

  File: `src/lib/pdf/sectionParsers.ts`
  Function: `splitIntoBlocks` (lines 349–382)

  **Step 1** — Change the loop from `for...of` to an index-based loop so we can look ahead:
  ```typescript
  function splitIntoBlocks(lines: string[]): string[][] {
    const blocks: string[][] = [];
    let currentBlock: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
  ```

  **Step 2** — Add a helper function just BEFORE `splitIntoBlocks` (at line 348, before the function definition):
  ```typescript
  /** Only treat an ALL-CAPS line as a block boundary if a date appears within the next 3 lines.
   *  This prevents company names written in all-caps from splitting an experience entry in half. */
  function looksLikeBlockHeader(line: string, nextLines: string[]): boolean {
    if (!/^[A-Z][A-Z0-9 &,./()-]{2,}$/.test(line)) return false;
    if (line.split(/\s+/).length > 5) return false;
    const nearby = nextLines.slice(0, 3).join(' ');
    return /\b(19|20)\d{2}\b/.test(nearby) ||
      /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)/i.test(nearby);
  }
  ```

  **Step 3** — Replace the `isBlockStart` expression inside the loop. The current code at line 357 has:
  ```typescript
  const isBlockStart = line === '' ||
    /^(?:Jan(?:uary)?|...$/i.test(line) ||
    /^\d{4}\s*[-–—]/.test(line) ||
    /^(?:•|►|▪|▸|→|–|—|\*)\s/.test(line) ||
    /^\d+[.)]\s/.test(line) ||
    (/^[A-Z][A-Z0-9 &,./()-]{2,}$/.test(line) && line.split(/\s+/).length <= 5);
  ```

  Replace the last condition (the ALL-CAPS check) so it becomes:
  ```typescript
  const isBlockStart = line === '' ||
    /^(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}/i.test(line) ||
    /^\d{4}\s*[-–—]/.test(line) ||
    /^(?:•|►|▪|▸|→|–|—|\*)\s/.test(line) ||
    /^\d+[.)]\s/.test(line) ||
    looksLikeBlockHeader(line, lines.slice(i + 1));
  ```

  **Step 4** — Close the loop correctly (the `for...of` loop's body stays the same, just the outer `for` declaration and `isBlockStart` change).

---

- [ ] T007 [S][US1] **Expand job-title keyword list and add company-suffix heuristic** (`src/lib/pdf/sectionParsers.ts`)

  File: `src/lib/pdf/sectionParsers.ts`
  Function: `parseExperienceSection` (lines 196–252)
  Lines to change: approximately 217–237 (company/position swap logic)

  **Step 1** — Add a constant for job title keywords just BEFORE the `parseExperienceSection` function definition (at approximately line 195):
  ```typescript
  const JOB_TITLE_KEYWORDS = /\b(architect|attorney|accountant|auditor|administrator|analyst|associate|consultant|coordinator|counselor|designer|developer|director|engineer|executive|intern|lecturer|manager|nurse|officer|president|principal|professor|researcher|scientist|specialist|supervisor|technician|therapist|trainer|lead|senior|junior|vp|vice\s*president|cto|ceo|coo|cfo|head\s*of)\b/i;

  const COMPANY_SUFFIX = /\b(Inc\.?|Ltd\.?|LLC|Corp\.?|Co\.?|Group|Holdings|International|Solutions|Services|Technologies|Consulting|Associates|Partners|Foundation|Institute|University|College|Hospital|Medical|Agency|Bureau|Department|Ministry)\b/i;
  ```

  **Step 2** — Replace lines 217–237 (the company/position swap logic) with:
  ```typescript
  // Swap if position looks more like a job title than company
  if (
    position &&
    !JOB_TITLE_KEYWORDS.test(company) &&
    JOB_TITLE_KEYWORDS.test(position)
  ) {
    [company, position] = [position, company];
  }

  // Secondary check: if company line matches a company suffix but position doesn't, swap
  if (
    position &&
    COMPANY_SUFFIX.test(position) &&
    !COMPANY_SUFFIX.test(company)
  ) {
    [company, position] = [position, company];
  }

  // If we only have one header line, try to split by common separators
  if (!position && company.includes(' at ')) {
    const parts = company.split(' at ');
    position = parts[0];
    company = parts[1];
  } else if (!position && company.includes(' - ')) {
    const parts = company.split(' - ');
    if (JOB_TITLE_KEYWORDS.test(parts[0])) {
      position = parts[0];
      company = parts[1];
    } else {
      company = parts[0];
      position = parts[1];
    }
  }
  ```

---

- [ ] T008 [S][US1] **Strip category labels and raise character limit in `parseSkillsSection`** (`src/lib/pdf/sectionParsers.ts`)

  File: `src/lib/pdf/sectionParsers.ts`
  Function: `parseSkillsSection` (lines 296–320)

  Replace the entire function body with:
  ```typescript
  export function parseSkillsSection(lines: string[]): string[] {
    // Strip category label patterns like "Frontend:", "Backend:", "Languages:"
    // These are common in formatted resumes: "Frontend: HTML | CSS | React"
    const cleanedLines = lines.map(l => l.replace(/^[A-Za-z\s/&]+:\s*/, ''));
    const fullText = cleanedLines.join(' ');

    // Split by common delimiters
    const skills = fullText
      .split(/[,|•·\n;]/)
      .map(s => s.replace(/[:\-–—]/g, ' ').trim())
      .filter(s => {
        // Filter out junk
        return s.length > 1 &&
          s.length < 80 &&           // raised from 50 to 80
          !s.match(/^\d+$/) &&
          !s.match(/^(and|or|the|a|an)$/i);
      })
      .slice(0, 60);

    // Deduplicate (case-insensitive)
    const seen = new Set<string>();
    return skills.filter(skill => {
      const lower = skill.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
  }
  ```

**✅ Checkpoint — US1**: Section heading expansion is complete. Manual test: paste a resume text with headings "Work History", "Core Competencies", "Career Summary" into the upload flow. All three sections must populate in the editor.

---

## Phase 3: User Story 5 — Date Extraction Formats (Priority: P3)

**Goal**: `extractDateRange` handles `2019–2022`, `09/2021`, single graduation years, and all existing formats without regression.

**Finding addressed**: FINDING-004
**File**: `src/lib/pdf/sectionParsers.ts`

**Independent Test**: The existing `sectionParsers.test.ts` can be extended. Run `npx vitest run src/lib/pdf/sectionParsers.test.ts` before and after — the existing tests must still pass.

---

- [ ] T009 [S][US5] **Replace single `RANGE_PATTERN` with multi-branch date patterns** (`src/lib/pdf/sectionParsers.ts`)

  File: `src/lib/pdf/sectionParsers.ts`
  Lines to change: 384–390 (the `MONTHS_PATTERN` and `RANGE_PATTERN` constants)

  Replace:
  ```typescript
  const MONTHS_PATTERN = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?';

  // Pattern: "Month Year - Month Year" or "Month Year - Present"
  const RANGE_PATTERN = new RegExp(
    `((?:${MONTHS_PATTERN})\\s*\\d{4}|\\d{4})\\s*[-–—to]+\\s*((?:${MONTHS_PATTERN})\\s*\\d{4}|\\d{4}|Present|Current|Now)`,
    'i'
  );
  ```

  With:
  ```typescript
  const MONTHS_PATTERN = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?';

  // Branch 1 (original): "Month Year – Month Year/Present" or "YYYY – Month Year/Present"
  const RANGE_FULL = new RegExp(
    `((?:${MONTHS_PATTERN})\\s*\\d{4}|\\d{4})\\s*[-–—to]+\\s*((?:${MONTHS_PATTERN})\\s*\\d{4}|\\d{4}|Present|Current|Now)`,
    'i'
  );

  // Branch 2: MM/YYYY – MM/YYYY or MM/YYYY – Present
  const RANGE_SLASH = /(\d{1,2}\/\d{4})\s*[-–—to]+\s*(\d{1,2}\/\d{4}|Present|Current|Now)/i;

  // Branch 3: YYYY–YYYY with no spaces (em-dash or en-dash directly touching digits)
  const RANGE_YEAR_COMPACT = /\b(\d{4})\s*[-–—]\s*(\d{4}|Present|Current|Now)\b/i;

  // Branch 4: Single 4-digit year (used for graduation years in education)
  const SINGLE_YEAR = /\b((?:19|20)\d{2})\b/;
  ```

---

- [ ] T010 [S][US5] **Update `extractDateRange` function to try all branches** (`src/lib/pdf/sectionParsers.ts`)

  File: `src/lib/pdf/sectionParsers.ts`
  Lines to change: 396–411 (the `export function extractDateRange` function)

  Replace the entire function:
  ```typescript
  export function extractDateRange(text: string): { startDate: string; endDate: string; current: boolean } {
    // Try each pattern branch in priority order
    for (const pattern of [RANGE_FULL, RANGE_SLASH, RANGE_YEAR_COMPACT]) {
      const match = text.match(pattern);
      if (match) {
        const endStr = match[2].toLowerCase();
        const isCurrent = ['present', 'current', 'now'].some(p => endStr.includes(p));
        return {
          startDate: match[1],
          endDate: isCurrent ? '' : match[2],
          current: isCurrent,
        };
      }
    }

    // Single year fallback — used for graduation year on education entries
    const single = text.match(SINGLE_YEAR);
    if (single) {
      return { startDate: '', endDate: single[1], current: false };
    }

    return { startDate: '', endDate: '', current: false };
  }
  ```

**✅ Checkpoint — US5**: Run `npx vitest run src/lib/pdf/sectionParsers.test.ts`. All existing tests must pass. Manually call `extractDateRange('2019–2022')` and `extractDateRange('09/2021 – Present')` in a test or browser console — both must return non-empty results.

---

## Phase 4: User Story 2 — Graceful Recovery on Parse Failure (Priority: P1) 🎯

**Goal**: When OCR confidence is too low or AI parsing produces empty data, the user sees a clear inline recovery banner — never a silent empty editor.

**Findings addressed**: FINDING-012, FINDING-014
**Files**: `src/lib/pdfParser.ts`, `src/lib/pdf/ocrExtractor.ts`, `src/pages/UploadPage.tsx`, `src/components/settings/LinkedInImportSheet.tsx`

---

- [ ] T011 [S][US2] **Add confidence gate to `parseResumePDFWithOCR` in `src/lib/pdfParser.ts`**

  File: `src/lib/pdfParser.ts`
  Lines to change: 165–174 (the `export async function parseResumePDFWithOCR` function)

  The current function signature is:
  ```typescript
  export async function parseResumePDFWithOCR(
    file: File,
    onProgress?: OCRProgressCallback
  ): Promise<ResumeData>
  ```

  Replace the entire function with:
  ```typescript
  export async function parseResumePDFWithOCR(
    file: File,
    onProgress?: OCRProgressCallback
  ): Promise<{ data: ResumeData; parseStatus: 'success' | 'partial' | 'failed'; parseWarnings: string[] }> {
    // Extract text using OCR
    const text = await extractTextWithOCR(file, onProgress);

    // Confidence gate: if OCR produced near-nothing, do not waste AI credits
    // computeTextConfidence is already imported via preprocessResumeText
    const { computeTextConfidence } = await import('./pdf/textPreprocessor');
    const confidence = computeTextConfidence(text);

    if (confidence < 0.25) {
      const emptyResume = parseResumeText(''); // returns an empty ResumeData skeleton
      return {
        data: emptyResume,
        parseStatus: 'failed',
        parseWarnings: [
          `Image quality too low to extract text reliably (confidence: ${Math.round(confidence * 100)}%). ` +
          'Please upload a clearer scan or a PDF with selectable text.'
        ],
      };
    }

    // Parse into structured data using AI
    const data = await parseTextWithAI(text);
    const summary = getExtractionSummary(data);
    const parseStatus: 'success' | 'partial' | 'failed' =
      summary.isEmpty ? 'failed' : summary.isPartial ? 'partial' : 'success';
    const parseWarnings: string[] = (parseStatus !== 'success') ? [summary.summary] : [];

    return { data, parseStatus, parseWarnings };
  }
  ```

  > **Check**: `computeTextConfidence` must be exported from `src/lib/pdf/textPreprocessor.ts`. Grep that file for `export function computeTextConfidence` — it is already exported. The dynamic import here avoids a circular dependency; alternatively, add it to the static imports at the top of `pdfParser.ts` if you prefer.

---

- [ ] T012 [S][US2] **Update `parseResumePDF` to populate `parseStatus` in its returned `ParseResult`** (`src/lib/pdfParser.ts`)

  File: `src/lib/pdfParser.ts`
  Function: `parseResumePDF` (lines 127–155)

  **Step 1** — Update the early-return `needsOCR` branch (lines 131–137) to include the new fields:
  ```typescript
  if (extraction.needsOCR) {
    return {
      success: false,
      needsOCR: true,
      pageCount: extraction.pageCount,
      parseStatus: 'failed',
      parseWarnings: ['PDF contains no selectable text — OCR is required to read this file.'],
    };
  }
  ```

  **Step 2** — Update the successful parse return (lines 147–154) to compute and include `parseStatus`:
  ```typescript
  // Parse into structured data using AI
  const data = await parseTextWithAI(textWithHints);

  // Determine parse quality
  const extractionSummary = getExtractionSummary(data);
  const parseStatus: 'success' | 'partial' | 'failed' =
    extractionSummary.isEmpty ? 'failed' : extractionSummary.isPartial ? 'partial' : 'success';
  const parseWarnings: string[] = (parseStatus !== 'success') ? [extractionSummary.summary] : [];

  return {
    success: true,
    data,
    needsOCR: false,
    pageCount: extraction.pageCount,
    parseStatus,
    parseWarnings,
  };
  ```

---

- [ ] T013 [S][US2] **Update `UploadPage.tsx` caller of `parseResumePDFWithOCR` to use new return shape**

  File: `src/pages/UploadPage.tsx`

  **Step 1** — Add two new state variables near the top of the component (alongside other `useState` calls):
  ```typescript
  const [showParseRecoveryBanner, setShowParseRecoveryBanner] = useState(false);
  const [parseRecoveryWarnings, setParseRecoveryWarnings] = useState<string[]>([]);
  ```

  **Step 2** — Find the OCR call at approximately line 101:
  ```typescript
  const resumeData = await parseResumePDFWithOCR(pendingFile, progressCallback);
  const extraction = getExtractionSummary(resumeData);
  ```
  Replace with:
  ```typescript
  const { data: resumeData, parseStatus: ocrStatus, parseWarnings: ocrWarnings } =
    await parseResumePDFWithOCR(pendingFile, progressCallback);
  const extraction = getExtractionSummary(resumeData);

  if (ocrStatus !== 'success') {
    setParseRecoveryWarnings(ocrWarnings);
    setShowParseRecoveryBanner(true);
  }
  ```

  **Step 3** — Find where `parseResumePDF` result is handled (also in `UploadPage.tsx`). Look for where `ParseResult` is used and add the same check:
  ```typescript
  // After receiving the ParseResult from parseResumePDF:
  if (result.parseStatus !== 'success') {
    setParseRecoveryWarnings(result.parseWarnings);
    setShowParseRecoveryBanner(true);
  }
  ```

  **Step 4** — Add the recovery banner JSX to the component's return statement. Place it ABOVE the editor/review content, below the page header. Use existing UI components (`Alert`, `AlertTitle`, `AlertDescription`, `Button`) already in the project:
  ```tsx
  {showParseRecoveryBanner && (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>We had trouble reading your document</AlertTitle>
      <AlertDescription>
        <p className="mb-3">{parseRecoveryWarnings.join(' ')}</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setShowParseRecoveryBanner(false);
              navigate('/upload');
            }}
          >
            Try a different file
          </Button>
          <Button
            size="sm"
            onClick={() => setShowParseRecoveryBanner(false)}
          >
            Fill in manually
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )}
  ```

  **Step 5** — Add the missing import at the top of `UploadPage.tsx` if not already present:
  ```typescript
  import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
  import { AlertTriangle } from 'lucide-react';
  ```

---

- [ ] T014 [P][US2] **Update `LinkedInImportSheet.tsx` caller to handle new `parseResumePDFWithOCR` return shape (if used)**

  File: `src/components/settings/LinkedInImportSheet.tsx`

  Grep this file for `parseResumePDFWithOCR`. If it calls it, update the destructuring the same way as T013 Step 2. If it only calls `parseTextWithAI` directly, no change is needed to the call site — but confirm the file compiles after T011's return type change.

**✅ Checkpoint — US2**: Upload a black/blank image (e.g., a solid black PNG renamed to `.jpg`). The upload flow must show the recovery banner with the confidence message instead of a silent empty editor.

---

## Phase 5: User Story 3 — ATS Simulation Keyword Scoring (Priority: P2)

**Goal**: `simulateATSParsing` returns a real keyword-match score when a job description is provided, pulls keywords from all resume sections (not just skills), and surfaces formatting warnings.

**Findings addressed**: FINDING-009, FINDING-010, FINDING-011
**Files**: `src/lib/atsParserSimulation.ts`, `src/components/editor/ATSParserPreview.tsx`

---

- [ ] T015 [S][US3] **Add keyword extraction helpers to `atsParserSimulation.ts`**

  File: `src/lib/atsParserSimulation.ts`

  Add the following constants and helper functions BEFORE the `simulateATSParsing` function (i.e., after the interface definitions, around line 26):

  ```typescript
  // Common English stop words — filtered from keyword extraction
  const STOP_WORDS = new Set([
    'the','a','an','and','or','of','in','to','for','with','on','at','by','as',
    'is','are','was','were','be','been','being','have','has','had','do','does',
    'did','will','would','could','should','may','might','shall','can','need',
    'must','that','this','these','those','it','its','i','me','my','we','our',
    'you','your','from','not','no','so','if','then','than','also','just','more',
    'very','about','up','out','all','into','over','after','any','only','other',
    'new','some','well','way','each','their','they','he','she','his','her',
  ]);

  /** Extract all meaningful keywords from the full resume (all sections, not just skills) */
  function extractAllResumeKeywords(resume: ResumeData): Set<string> {
    const allText = [
      resume.summary || '',
      resume.contactInfo?.fullName || '',
      ...(resume.experience || []).flatMap(e => [
        e.position || '',
        e.company || '',
        e.description || '',
        ...(e.achievements || []),
        ...(e.responsibilities || []),
      ]),
      ...(resume.education || []).flatMap(e => [
        e.degree || '',
        e.field || '',
        e.institution || '',
      ]),
      ...(resume.skills || []),
      ...(resume.certifications || []).map(c => c.name || ''),
      ...(resume.projects || []).flatMap(p => [p.name || '', p.description || '']),
      ...(resume.awards || []).map(a => a.title || ''),
      ...(resume.volunteering || []).flatMap(v => [v.role || '', v.organization || '']),
    ].join(' ');

    return new Set(
      allText
        .toLowerCase()
        .split(/[\s,.|•·;:()\[\]{}'"\/\\+\-]+/)
        .filter(w => w.length >= 3 && !STOP_WORDS.has(w))
    );
  }

  /** Extract unique keywords from a job description string */
  function extractJDKeywords(jd: string): string[] {
    return [
      ...new Set(
        jd
          .toLowerCase()
          .split(/[\s,.|•·;:()\[\]{}'"\/\\+\-]+/)
          .filter(w => w.length >= 3 && !STOP_WORDS.has(w))
      ),
    ];
  }
  ```

---

- [ ] T016 [S][US3] **Update `simulateATSParsing` signature, scoring logic, and return value** (`src/lib/atsParserSimulation.ts`)

  File: `src/lib/atsParserSimulation.ts`
  Lines to change: 27 (function signature) and 154–162 (the final return block)

  **Step 1** — Update the function signature (line 27):
  ```typescript
  export function simulateATSParsing(
    resume: ResumeData,
    jobDescription?: string,
    formattingSignals?: { isMultiColumn?: boolean; confidence?: number }
  ): ATSParsedResult {
  ```

  **Step 2** — Add formatting warnings computation at the very start of the function body (right after `const globalIssues: string[] = [];`):
  ```typescript
  const formattingWarnings: string[] = [];
  if (formattingSignals?.isMultiColumn) {
    formattingWarnings.push(
      'Two-column layout detected — some ATS systems read columns left-to-right across both columns, garbling your content. Consider a single-column layout when submitting to ATS portals.'
    );
  }
  if (formattingSignals?.confidence !== undefined && formattingSignals.confidence < 0.5) {
    formattingWarnings.push(
      'Low text extraction confidence — your resume may contain images, text boxes, or non-standard fonts that ATS systems cannot read reliably.'
    );
  }
  ```

  **Step 3** — Replace the final `return` statement (lines 154–162) with the new scoring logic:
  ```typescript
  // Totals
  totalWords = sections.reduce((sum, s) => sum + s.wordCount, 0);

  // Keywords from all resume text (used for detectedKeywords regardless of JD)
  const allResumeKeywords = extractAllResumeKeywords(resume);
  const detectedKeywords = Array.from(allResumeKeywords);

  // Scoring and keyword matching
  let score = 0;
  let matchedKeywords: string[] = [];
  let missingKeywords: string[] = [];

  if (jobDescription && jobDescription.trim().length > 0) {
    // Job description provided: compute keyword match percentage
    const jdKws = extractJDKeywords(jobDescription);
    matchedKeywords = jdKws.filter(k => allResumeKeywords.has(k));
    missingKeywords = jdKws.filter(k => !allResumeKeywords.has(k)).slice(0, 20);
    score = jdKws.length > 0
      ? Math.min(100, Math.round((matchedKeywords.length / jdKws.length) * 100))
      : 0;
  } else {
    // No job description: compute structural completeness score
    const keyIds = ['contact', 'summary', 'experience', 'education', 'skills'];
    const detected = sections.filter(s => keyIds.includes(s.id) && s.status === 'detected').length;
    score = Math.round((detected / keyIds.length) * 100);
  }

  // Global issues
  if (totalWords < 200) globalIssues.push('Resume has fewer than 200 words — may appear incomplete to ATS');

  return {
    sections,
    totalWords,
    detectedKeywords,
    matchedKeywords,
    missingKeywords,
    score,
    issues: globalIssues,
    formattingWarnings,
  };
  ```

---

- [ ] T017 [S][US3] **Fix first-person pronoun check** (`src/lib/atsParserSimulation.ts`)

  File: `src/lib/atsParserSimulation.ts`
  Lines to change: approximately line 61 (the pronoun check inside the summary section)

  Replace:
  ```typescript
  if (/\b(I|me|my|mine|myself)\b/i.test(summary)) summaryIssues.push('Contains first-person pronouns');
  ```
  With:
  ```typescript
  // Check for first-person pronouns used in sentence context (not just as part of a word/name)
  // Pattern 1: pronoun at start of sentence or after a period
  // Pattern 2: "I" directly followed by a verb (strong signal of narrative writing)
  if (
    /(?:^|\.\s+|\n)\s*(?:I|me|my|mine|myself)\b/i.test(summary) ||
    /\bI\s+(?:am|was|have|had|led|managed|built|developed|designed|created|worked|helped|grew|increased|reduced|achieved)\b/i.test(summary)
  ) {
    summaryIssues.push("Contains first-person pronouns (e.g., 'I', 'my') — rephrase in third person or remove the subject entirely");
  }
  ```

---

- [ ] T018 [S][US3] **Wire new `simulateATSParsing` fields into `ATSParserPreview.tsx`**

  File: `src/components/editor/ATSParserPreview.tsx`

  **Step 1** — Find the `useMemo` call at approximately line 82:
  ```typescript
  const parsed = useMemo(
    () => currentResume ? simulateATSParsing(currentResume) : null,
    [currentResume]
  );
  ```
  This call signature is still valid — the new parameters `jobDescription` and `formattingSignals` are both optional, so no change is required to this call.

  **Step 2** — Find where the component renders score-related information. Add the new `score` field from `parsed.score` wherever a score number is currently displayed. Search the component for any hardcoded score computation or a display like `{parsed.sections.filter(...).length}` used as a score — replace with `{parsed.score}`.

  **Step 3** — If `parsed.formattingWarnings` is non-empty, render them as a warning list. Add this block wherever the issues list is displayed:
  ```tsx
  {parsed.formattingWarnings && parsed.formattingWarnings.length > 0 && (
    <div className="mt-2 space-y-1">
      {parsed.formattingWarnings.map((warning, i) => (
        <p key={i} className="text-xs text-warning flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {warning}
        </p>
      ))}
    </div>
  )}
  ```
  Add `import { AlertTriangle } from 'lucide-react';` if not already imported in this file.

  **Step 4** — Confirm TypeScript compiles. The `ATSParsedResult` type is now extended (T003), so any code in `ATSParserPreview.tsx` that spreads or reads the result object must be aware of the new fields.

**✅ Checkpoint — US3**: Open the editor, navigate to the ATS tab. The `parsed.score` value should display. Open browser console and call `simulateATSParsing(resume, 'React TypeScript senior engineer')` — `matchedKeywords` and `missingKeywords` should be non-empty arrays, and `score` should be a number 0–100.

---

## Phase 6: User Story 4 — LinkedIn Import Completeness (Priority: P2)

**Goal**: Pasting a full LinkedIn profile captures certifications, volunteering, languages, and projects — not just the current 4 fields.

**Findings addressed**: FINDING-006, FINDING-007
**File**: `supabase/functions/parse-linkedin/index.ts`

---

- [ ] T019 [S][US4] **Expand `extract_linkedin_data` tool schema in the LinkedIn edge function**

  File: `supabase/functions/parse-linkedin/index.ts`

  Find the `extract_linkedin_data` tool definition. It currently has a `parameters.properties` object with `summary`, `experience`, `education`, `skills`. Add these 4 new properties to the `properties` object:

  ```typescript
  certifications: {
    type: 'array',
    description: 'Certifications and licenses from the "Licenses & Certifications" section',
    items: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the certification' },
        organization: { type: 'string', description: 'Issuing organization' },
        date: { type: 'string', description: 'Issue date e.g. "Mar 2023"' },
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
        role: { type: 'string', description: 'Volunteer role or title' },
        organization: { type: 'string', description: 'Organization name' },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['role', 'organization'],
    },
  },
  languages: {
    type: 'array',
    description: 'Languages listed in the Languages section',
    items: {
      type: 'object',
      properties: {
        language: { type: 'string', description: 'Language name' },
        proficiency: { type: 'string', description: 'Proficiency level e.g. Native, Fluent, Professional, Elementary' },
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
        name: { type: 'string', description: 'Project name' },
        description: { type: 'string' },
        url: { type: 'string', description: 'Project URL if listed' },
      },
      required: ['name'],
    },
  },
  ```

---

- [ ] T020 [S][US4] **Update LinkedIn system prompt for multi-role positions and new sections**

  File: `supabase/functions/parse-linkedin/index.ts`

  Find the `systemPrompt` string (or equivalent constant). Add the following instructions to the end of the system prompt:

  ```
  For the experience section: if a person held multiple roles at the same company (progressive promotion, e.g., "Software Engineer → Senior Engineer → Staff Engineer at Google"), return EACH role as a SEPARATE experience entry with the SAME company name. Do not merge multiple roles into one entry.

  Extract certifications from the "Licenses & Certifications" section, volunteering from the "Volunteer Experience" section, languages from the "Languages" section, and projects from the "Projects" section. If any of these sections are not present in the provided text, return an empty array for that field.
  ```

---

- [ ] T021 [S][US4] **Improve the LinkedIn URL-only rejection error message**

  File: `supabase/functions/parse-linkedin/index.ts`

  Find the validation block that returns an error when the input is just a LinkedIn URL (no profile text). The current error response likely returns a message like `'Please provide LinkedIn profile text, not just a URL'`.

  Replace the `return new Response(...)` for that error case with:
  ```typescript
  return new Response(
    JSON.stringify({
      error: 'URL_ONLY_REJECTED',
      message:
        "We can't fetch LinkedIn profiles directly due to access restrictions. " +
        "To import your LinkedIn data: open your LinkedIn profile in a browser, " +
        "press Ctrl+A (or Cmd+A on Mac) to select all text on the page, copy it, " +
        "and paste the full text into this field.",
    }),
    { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
  ```

**✅ Checkpoint — US4**: Paste a LinkedIn profile text that includes a "Licenses & Certifications" section. The returned resume object must have a non-empty `certifications` array.

---

## Phase 7: Cross-Cutting Edge Function Fixes

**Purpose**: Remaining edge function improvements that are not tied to a single user story — job URL whitelist and the Gemini fallback parser.

**Findings addressed**: FINDING-008, FINDING-013

---

- [ ] T022 [P][US4] **Expand job URL whitelist and improve rejection message** (`supabase/functions/parse-job-url/index.ts`)

  File: `supabase/functions/parse-job-url/index.ts`

  **Step 1** — Find the `ALLOWED_DOMAINS` array. Add these entries to it:
  ```typescript
  'greenhouse.io',
  'lever.co',
  'workable.com',
  'ashbyhq.com',
  'smartrecruiters.com',
  'recruitee.com',
  'breezy.hr',
  'wellfound.com',
  'himalayas.app',
  'remotive.com',
  'arc.dev',
  'ycombinator.com',
  'workatastartup.com',
  ```

  **Step 2** — Find the domain validation block (where `ALLOWED_DOMAINS` is checked against the parsed hostname). Add subdomain matching for ATS platforms. The current check likely does `ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d))`. If it doesn't already use `endsWith`, update it to:
  ```typescript
  const ATS_SUBDOMAINS = [
    'greenhouse.io', 'lever.co', 'workable.com', 'ashbyhq.com', 'smartrecruiters.com'
  ];
  const isAllowed =
    ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d)) ||
    ATS_SUBDOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  ```

  **Step 3** — Find the error response when the domain is not allowed. Replace it with:
  ```typescript
  return new Response(
    JSON.stringify({
      error: 'DOMAIN_NOT_ALLOWED',
      message: `We can't fetch job listings from "${hostname}" directly. ` +
        'Please copy the job description text from that page and use the ' +
        '"Paste job description" option instead.',
    }),
    { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
  ```

---

- [ ] T023 [S][FOUNDATION] **Wrap AI text-cleaning pre-pass in try/catch** (`supabase/functions/parse-resume/index.ts`)

  File: `supabase/functions/parse-resume/index.ts`

  Find the `cleanTextWithAI` call (used to clean low-quality extracted text before the main parse). It is called at the beginning of the main handler when text quality is low. Currently, if this call throws, it likely propagates the error to the client.

  Wrap it so a failure silently falls through:
  ```typescript
  let cleanedText = rawText; // rawText = the text received from the client
  try {
    if (needsCleaning) { // this condition already exists in the code
      cleanedText = await cleanTextWithAI(rawText);
    }
  } catch (cleanErr) {
    console.warn('[parse-resume] Text cleaning pre-pass failed — continuing with raw text:', cleanErr);
    cleanedText = rawText; // use raw text if cleaning fails
  }
  ```

  Adapt the variable names to match what actually exists in the file — the key change is adding a `try/catch` around the `cleanTextWithAI` call so a failure does not block the main parse.

---

- [ ] T024 [S][FOUNDATION] **Create `supabase/functions/parse-resume/localParser.ts` — Deno-compatible fallback parser**

  File to CREATE: `supabase/functions/parse-resume/localParser.ts`

  This is a new file. It must be written in TypeScript compatible with Deno (no npm imports). It exports one function: `localParseResume(text: string): ResumeData`.

  The `ResumeData` type must be inlined or re-declared minimally in this file (Deno edge functions cannot import from `@/types/resume`). Declare a minimal interface at the top of the file:

  ```typescript
  // Minimal ResumeData shape — mirrors src/types/resume.ts
  interface MinimalResumeData {
    contactInfo: {
      fullName: string;
      email: string;
      phone: string;
      location: string;
      linkedin: string;
    };
    summary: string;
    experience: Array<{
      id: string;
      company: string;
      position: string;
      startDate: string;
      endDate: string;
      current: boolean;
      description: string;
      achievements: string[];
    }>;
    education: Array<{
      id: string;
      institution: string;
      degree: string;
      field: string;
      startDate: string;
      endDate: string;
    }>;
    skills: string[];
    certifications: Array<{
      id: string;
      name: string;
      issuer: string;
      date: string;
    }>;
    templateId: string;
  }

  export function localParseResume(text: string): MinimalResumeData {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Extract email
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);

    // Extract phone
    const phoneMatch = text.match(/(\+?\d{1,4}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/);

    // Extract LinkedIn
    const linkedinMatch = text.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/i);

    // Extract name: first non-contact line, 1–5 words
    let fullName = '';
    for (const line of lines.slice(0, 8)) {
      if (!line.includes('@') && !line.match(/^\+?[0-9(]/) && line.length < 60) {
        if (/^[A-Za-z\u00C0-\u024F\u0600-\u06FF\s.\-']+$/.test(line) && line.split(/\s+/).length <= 5) {
          fullName = line;
          break;
        }
      }
    }

    // Section detection
    const SECTION_MAP: Record<string, RegExp> = {
      summary: /^(summary|objective|profile|about\s*me|professional\s*summary|career\s*summary|career\s*objective|personal\s*statement)$/i,
      experience: /^(experience|work\s*experience|employment|work\s*history|professional\s*experience|career\s*history)$/i,
      education: /^(education|academic|qualifications|degrees?)$/i,
      skills: /^(skills|technical\s*skills|core\s*competencies|key\s*skills)$/i,
      certifications: /^(certifications?|certificates?|licenses?)$/i,
    };

    const buckets: Record<string, string[]> = {
      summary: [], experience: [], education: [], skills: [], certifications: [], header: [],
    };
    let current = 'header';

    for (const line of lines) {
      const clean = line.replace(/[:\-–—|•]/g, '').trim();
      let found = false;
      for (const [section, pattern] of Object.entries(SECTION_MAP)) {
        if (pattern.test(clean)) { current = section; found = true; break; }
      }
      if (!found) buckets[current].push(line);
    }

    // Parse skills
    const skills = buckets.skills
      .join(' ')
      .split(/[,|•·;]/)
      .map(s => s.trim())
      .filter(s => s.length > 1 && s.length < 80);

    // Parse experience (simple — one entry per non-empty block)
    const expLines = buckets.experience;
    const experience = expLines.length > 0
      ? [{
          id: crypto.randomUUID(),
          company: expLines[0] || '',
          position: expLines[1] || '',
          startDate: '',
          endDate: '',
          current: false,
          description: expLines.slice(2).join(' ').slice(0, 500),
          achievements: [],
        }]
      : [];

    // Parse education
    const eduLines = buckets.education;
    const education = eduLines.length > 0
      ? [{
          id: crypto.randomUUID(),
          institution: eduLines[0] || '',
          degree: eduLines[1] || '',
          field: '',
          startDate: '',
          endDate: '',
        }]
      : [];

    // Parse certifications
    const certifications = buckets.certifications
      .slice(0, 5)
      .filter(l => l.length > 2)
      .map(l => ({
        id: crypto.randomUUID(),
        name: l.slice(0, 150),
        issuer: '',
        date: '',
      }));

    return {
      contactInfo: {
        fullName,
        email: emailMatch?.[0] ?? '',
        phone: phoneMatch?.[0] ?? '',
        location: '',
        linkedin: linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : '',
      },
      summary: buckets.summary.join(' ').slice(0, 500) ||
        // If no summary section, note that this was parsed in fallback mode
        '⚠️ Parsed in fallback mode — AI was unavailable. Please review and correct all fields.',
      experience,
      education,
      skills: skills.slice(0, 40),
      certifications,
      templateId: 'modern',
    };
  }
  ```

---

- [ ] T025 [S][FOUNDATION] **Add Gemini 429/503 error handling + localParser fallback** (`supabase/functions/parse-resume/index.ts`)

  File: `supabase/functions/parse-resume/index.ts`

  **Step 1** — Add the import at the top of the file:
  ```typescript
  import { localParseResume } from './localParser.ts';
  ```

  **Step 2** — Find the main Gemini AI call (the two-pass parsing block that calls the Gemini model). It is the largest block in the handler. Wrap the outer call in a try/catch:

  ```typescript
  let parsedResume: any = null;
  let parseStatus: 'success' | 'partial' | 'failed' = 'success';
  let fallbackMode = false;

  try {
    // [EXISTING Gemini call code here — do not change the call itself]
    parsedResume = await callGeminiToParse(cleanedText); // adapt to actual function/variable name
  } catch (err: any) {
    const httpStatus = err?.status ?? err?.statusCode ?? 0;

    if (httpStatus === 429) {
      // Rate limited — tell client to retry
      return new Response(
        JSON.stringify({
          error: 'RATE_LIMITED',
          message: 'AI service is temporarily busy. Please wait 30 seconds and try again.',
          retryAfter: 30,
        }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (httpStatus === 503 || httpStatus === 500 || httpStatus === 0) {
      // Service unavailable or network error — fall back to local parser
      console.warn('[parse-resume] Gemini unavailable (status:', httpStatus, '), falling back to local regex parser');
      parsedResume = localParseResume(cleanedText);
      parseStatus = 'partial';
      fallbackMode = true;
    } else {
      // Unknown error — propagate
      throw err;
    }
  }
  ```

  **Step 3** — In the response returned to the client, include `parseStatus` and `fallbackMode` in the JSON body:
  ```typescript
  return new Response(
    JSON.stringify({
      ...parsedResume,
      parseStatus,
      fallbackMode,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
  ```

  > **Note**: The exact structure of the existing handler may differ — adapt the variable names and structure. The key behaviors to implement are: (1) catch Gemini errors, (2) return 429 with retryAfter on rate limit, (3) call `localParseResume` on 5xx/network errors, (4) include `fallbackMode: true` in successful fallback responses.

**✅ Checkpoint — Phase 7**: Deploy the edge functions locally (`supabase functions serve`). Simulate a Gemini 503 by temporarily replacing the API key with an invalid one. The response should include `fallbackMode: true` and a partially-populated resume object instead of an HTTP error.

---

## Phase 8: Polish & Verification

**Purpose**: Compile checks, cross-file consistency, and manual smoke tests.

---

- [ ] T026 [P][POLISH] **Run TypeScript type check across the full project**

  Command: `npx tsc --noEmit`

  Expected: Zero errors. Common errors to watch for after these changes:
  - Callers of `parseResumePDFWithOCR` that still expect `Promise<ResumeData>` (now returns `Promise<{data, parseStatus, parseWarnings}>`) — fix all call sites
  - Code in `ATSParserPreview.tsx` that accesses `parsed.detectedKeywords` should still work — the field still exists; `matchedKeywords` and `missingKeywords` are new additions
  - Any place that spreads `ATSParsedResult` and then checks specific keys — the new keys have defaults so no runtime error, but TS needs them in the interface (done in T003)

---

- [ ] T027 [P][POLISH] **Run existing unit tests to confirm no regressions**

  Command: `npx vitest run`

  The existing `src/lib/pdf/sectionParsers.test.ts` tests `extractDateRange`. All 4 existing test cases must pass with the new multi-branch implementation. If any fail, debug T009/T010.

---

- [ ] T028 [P][POLISH] **Manual smoke test: upload flow end-to-end**

  Test cases to verify manually:
  1. Upload a PDF with standard section names → editor should populate as before (regression check)
  2. Upload a PDF with "Work History" and "Core Competencies" headings → both sections must populate
  3. Upload a blank or solid-black PNG → recovery banner must appear with "Try a different file" and "Fill in manually" buttons
  4. Open the editor ATS tab → `score` value must display (number 0–100)
  5. In the LinkedIn import sheet, paste only a URL → new actionable error message must appear

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational — T001, T002, T003)**: No dependencies — start immediately. BLOCKS all other tasks.
- **Phase 2 (US1 — T004–T008)**: Depends on T001 (SectionBlocks extended). Tasks T004–T008 are sequential within the phase (same file).
- **Phase 3 (US5 — T009–T010)**: Depends on T001. Can run in parallel WITH Phase 2 (different functions in same file — but be careful of merge conflicts; sequence them if working alone).
- **Phase 4 (US2 — T011–T014)**: Depends on T002 (ParseResult extended). T011 → T012 → T013 → T014 (sequential — each depends on the previous).
- **Phase 5 (US3 — T015–T018)**: Depends on T003 (ATSParsedResult extended). T015 must complete before T016 (helpers before function). T016 → T017 → T018 (sequential).
- **Phase 6 (US4 — T019–T021)**: No dependency on Phases 2–5. Can start after Phase 1. T019 → T020 → T021 (sequential, same file).
- **Phase 7 (T022–T025)**: T022 can run in parallel with Phase 6. T023 → T024 → T025 (sequential — T024 must exist before T025 can import it).
- **Phase 8 (Polish — T026–T028)**: Depends on all previous phases being complete.

### Parallel Opportunities

When working alone, the safest sequential order is:

```
T001 → T002 → T003
  ↓
T004 → T005 → T006 → T007 → T008   (US1 — sectionParsers)
  ↓ (can overlap with above if different functions)
T009 → T010                          (US5 — date parsing)
  ↓
T011 → T012 → T013 → T014           (US2 — recovery flow)
  ↓
T015 → T016 → T017 → T018           (US3 — ATS simulation)
  ↓
T019 → T020 → T021                   (US4 — LinkedIn)
  ↓
T022                                  (job URL whitelist — parallel safe)
T023 → T024 → T025                   (parse-resume fallback — sequential)
  ↓
T026 → T027 → T028                   (polish)
```

### Files Changed — Quick Reference

| File | Tasks |
|------|-------|
| `src/lib/pdf/sectionParsers.ts` | T001, T004, T005, T006, T007, T008, T009, T010 |
| `src/lib/pdfParser.ts` | T002, T011, T012 |
| `src/lib/atsParserSimulation.ts` | T003, T015, T016, T017 |
| `src/pages/UploadPage.tsx` | T013 |
| `src/components/settings/LinkedInImportSheet.tsx` | T014 |
| `src/components/editor/ATSParserPreview.tsx` | T018 |
| `supabase/functions/parse-linkedin/index.ts` | T019, T020, T021 |
| `supabase/functions/parse-job-url/index.ts` | T022 |
| `supabase/functions/parse-resume/index.ts` | T023, T025 |
| `supabase/functions/parse-resume/localParser.ts` | T024 (NEW FILE) |

---

## Notes

- `[P]` = can run in parallel with other `[P]` tasks in the same phase (different files)
- `[S]` = must run sequentially (same file as previous task, or depends on its output)
- Every task references the exact file and approximate line numbers from the audit
- If a line number is slightly off due to prior edits, search for the surrounding context string to locate the correct spot
- After T024 (new file), confirm the Deno import resolves: `import { localParseResume } from './localParser.ts'` uses the `.ts` extension, which is required in Deno — do not omit it
- The `Alert` component used in T013's recovery banner must exist in `src/components/ui/alert.tsx` — verify before adding the import; if it doesn't exist, use a `div` with equivalent styling
- Total tasks: **28** across 8 phases
