# Feature Specification: Parsing & ATS Simulation Audit

**Feature Branch**: `020-parsing-ats-audit`
**Created**: 2026-03-19
**Status**: Draft
**Scope**: Full remediation of all identified parsing failures and ATS simulation weaknesses — Critical, High, and Medium severity. Reliable parsing is the first impression WiseResume makes; broken extraction poisons every downstream AI tool.

---

## Diagnostic Report

> This section documents the audit findings grouped by category. Each finding includes the affected file(s), severity, a plain-English explanation of the failure, and the recommended fix.

---

### Category 1 — PDF & Resume Section Extraction Accuracy

---

#### FINDING-001: Section headings are too narrow — unrecognized headings silently eat content

**File(s)**: `src/lib/pdf/sectionParsers.ts` — lines 5–11 (`SECTION_PATTERNS`), lines 72–105 (`extractSections`)
**Severity**: 🔴 Critical

**What goes wrong (plain English):**
The parser recognizes only a fixed list of English section names. If a user writes "Work History" instead of "Experience", or "Career Summary" instead of "Summary", the section heading is not recognized as a section boundary. Everything inside that section simply flows into whichever section was being read before it — silently and with zero warning to the user. For example: a resume with sections ordered CONTACT → WORK HISTORY → SKILLS will have all the work history content appended to the header block, leaving the experience section completely empty.

Current recognized headings (from code):
```
experience: experience | work experience | employment | work history | professional experience | projects
```
Missing common variants: *Career History, Employment Background, Professional Background, Relevant Experience, Internship Experience, Research Experience, Consulting Experience, Freelance Work, Contract Work*

```
skills: skills | technical skills | core competencies | technologies | expertise | proficiencies | languages | soft skills | hard skills
```
Missing: *Key Skills, Core Skills, Areas of Expertise, Competencies, Technical Proficiencies, Tools & Technologies, Programming Languages*

The `summary` pattern misses: *Personal Statement, Executive Summary, Professional Profile, Highlights, At a Glance*
The `education` pattern misses: *Degrees, Academic History, Educational Background, Formal Education*
The `certifications` pattern misses: *Professional Development, Continuing Education, Accreditations, Awards, Achievements*

Additionally, `extractSections` only tracks 5 section types (`summary`, `experience`, `education`, `skills`, `certifications`). There is no bucket for `projects`, `volunteering`, `languages`, or `awards`. Any content under these headings falls into whatever section happened to come before it.

**Recommended Fix:**
1. Expand `SECTION_PATTERNS` with all common variant names listed above.
2. Add `projects`, `volunteering`, `languages`, `awards` as recognized but pass-through buckets (accumulate their text and forward to the AI for structured parsing).
3. Add a catch-all `unrecognized` bucket that captures any line that *looks* like a heading (all-caps, short, colon-terminated) but matches no known pattern — log it for debugging rather than silently swallowing content.

---

#### FINDING-002: ALL-CAPS lines used as block splitters cause false positives for company names

**File(s)**: `src/lib/pdf/sectionParsers.ts` — line 362 (`splitIntoBlocks`)
**Severity**: 🟠 High

**What goes wrong (plain English):**
The block-splitting logic in `splitIntoBlocks` treats any short ALL-CAPS line as the start of a new experience block. This is meant to catch company names written in all caps (e.g., "GOOGLE"). However, it also triggers on any company name that happens to be uppercase — causing a single experience entry to be cut in half mid-description. For example, an entry for "IBM GLOBAL SERVICES" followed by a second line "Software Engineer" would be split into *two* separate experience blocks, creating a phantom entry with no dates or bullets.

**Recommended Fix:**
Only use ALL-CAPS detection as a block-start signal if it is *also* followed by a line that contains recognizable date patterns within 2–3 lines. Otherwise, treat it as part of the current block.

---

#### FINDING-003: Company/position swap heuristic has an incomplete job-title keyword list

**File(s)**: `src/lib/pdf/sectionParsers.ts` — lines 217–219 (`parseExperienceSection`)
**Severity**: 🟠 High

**What goes wrong (plain English):**
The parser tries to figure out which line is the job title and which is the company name by checking whether the line contains words like "developer", "engineer", "manager". If the company name line is not recognized, the first line is assumed to be the company and the second is the position. This breaks for every title not in the list. For example: "Architect", "Consultant", "Coordinator", "Designer", "Officer", "VP", "President", "Associate", "Intern", "Researcher", "Lecturer", "Professor", "Nurse", "Doctor", "Technician", "Accountant", "Auditor", "Attorney" — all of these would result in the company name being stored as the job title and vice versa.

**Recommended Fix:**
Extend the keyword list to cover all common job-title words. As a secondary heuristic, if one line ends with `, Inc.`, `, Ltd.`, `, LLC`, `Corp`, or similar company suffixes, it is almost certainly the company name.

---

#### FINDING-004: `extractDateRange` misses year-only date formats

**File(s)**: `src/lib/pdf/sectionParsers.ts` — lines 387–411 (`RANGE_PATTERN`, `extractDateRange`)
**Severity**: 🟠 High

**What goes wrong (plain English):**
The date range regex requires either "Month Year" or a 4-digit year on both sides of the separator. It fails silently on many valid real-world formats:
- `2019 - 2022` with spaces but no month (the `\d{4}` fallback in the pattern requires no spaces between year and separator)
- `2019–2022` (em-dash, no spaces)
- `2023` alone (single graduation year on an education entry)
- `Sep 2021 – Present` where em-dash has no spaces
- Dates written as `09/2021 – 05/2023`

When dates are not found, `startDate` and `endDate` are both empty strings. This causes every experience entry to appear as an undated job, which the ATS simulation then flags as "Missing start date."

**Recommended Fix:**
Add additional regex branches to handle: `MM/YYYY`, `YYYY-YYYY` (no spaces), single-year entries, and ensure em-dash (`–`) and en-dash (`—`) without surrounding spaces are covered.

---

#### FINDING-005: Skills splitter strips multi-word and parenthetical skills

**File(s)**: `src/lib/pdf/sectionParsers.ts` — lines 296–320 (`parseSkillsSection`)
**Severity**: 🟡 Medium

**What goes wrong (plain English):**
The skills parser splits on the pipe `|` character. This is correct when used as a separator between skills. However, the 50-character length filter then removes any compound skill that happens to be verbose, such as "Amazon Web Services (AWS)" (25 chars — fine) or "CI/CD pipeline management and automation" (40 chars — stripped). More critically, if someone writes their skills in prose ("Proficient in Python, JavaScript, and React"), the split-on-comma logic works, but if they group them with pipe notation like "Frontend: HTML | CSS | React | Vue", the word "Frontend:" becomes its own skill token.

**Recommended Fix:**
Detect and strip category labels (word followed by colon before skill tokens). Raise the character limit from 50 to 80. Add a prose-detection path for skills written as sentences.

---

### Category 2 — Job Description & External Parsing

---

#### FINDING-006: LinkedIn import maps only 4 fields — all other profile data is lost

**File(s)**: `supabase/functions/parse-linkedin/index.ts`
**Severity**: 🟠 High

**What goes wrong (plain English):**
The `extract_linkedin_data` AI tool definition instructs the model to extract only four top-level fields: `summary`, `experience`, `education`, and `skills`. A real LinkedIn profile contains much more: certifications, volunteer work, publications, projects, languages, honors/awards, recommendations, contact info (email, phone, website). When a user pastes their full LinkedIn profile text hoping to import their complete professional history, these sections are silently discarded. The user then has to manually re-enter certifications and other sections, defeating the purpose of the import.

Additionally, the experience entries in the LinkedIn schema may not capture multi-role positions (where a user held multiple roles at one company — a LinkedIn-specific feature). If the AI flattens these into a single entry, position history for that company is lost.

**Recommended Fix:**
Expand the `extract_linkedin_data` tool schema to include `certifications`, `volunteer`, `projects`, `languages`, `honors`. Add explicit handling instructions in the system prompt for multi-role positions (return as separate experience entries with the same company name).

---

#### FINDING-007: LinkedIn import rejects input silently when only a URL is provided — error message is unclear

**File(s)**: `supabase/functions/parse-linkedin/index.ts`
**Severity**: 🟡 Medium

**What goes wrong (plain English):**
The function validates that the input is not just a bare LinkedIn URL (since scraping LinkedIn is not supported). However, if a user pastes only a URL expecting the system to fetch their profile, they receive an error. The error message may not clearly explain *why* the URL was rejected and *what they should do instead* (i.e., copy-paste the full text of their LinkedIn profile page).

**Recommended Fix:**
Return a user-friendly error message: "We can't fetch LinkedIn profiles directly. Instead, please open your LinkedIn profile, select all text (Ctrl+A), and paste it here." Log this event for analytics to measure how often this mistake happens.

---

#### FINDING-008: `parse-job-url` domain whitelist requires manual code changes for new job boards

**File(s)**: `supabase/functions/parse-job-url/index.ts` — `ALLOWED_DOMAINS` array
**Severity**: 🟡 Medium

**What goes wrong (plain English):**
The function only fetches from a hardcoded list of ~30 job board domains. Any company career page (e.g., `careers.shopify.com`), any newer job board (e.g., `wellfound.com`, `himalayas.app`), or any regional job board not in the list will be rejected with a generic "domain not allowed" error. Users who paste URLs from unlisted career pages get no actionable guidance.

**Recommended Fix:**
Two paths forward (choose based on risk tolerance):
- **Option A (Conservative):** Keep the whitelist but expand it to include company career subdomain patterns (e.g., `*.greenhouse.io`, `*.lever.co`, `*.workable.com`). Show a clear "this URL isn't supported — try pasting the job description text instead" message.
- **Option B (Flexible):** Allow any HTTPS URL that is not a private/internal IP, but run the fetched content through an additional AI classifier that validates it looks like a job description before parsing. This is more useful but increases attack surface.

---

### Category 3 — ATS Parser Simulation Logic

---

#### FINDING-009: ATS simulation is purely structural — it does not actually simulate keyword matching

**File(s)**: `src/lib/atsParserSimulation.ts` — lines 23–25, 156, 159
**Severity**: 🔴 Critical

**What goes wrong (plain English):**
The function is named `simulateATSParsing` but it only checks whether sections *exist* and whether word counts meet thresholds. A real ATS system scores a resume primarily by how well its keywords match the target job description. The current implementation:

1. **Does not accept a job description as input.** Keyword matching requires comparing the resume against a specific JD. Without that, any "ATS score" shown to the user is a structural quality score, not an actual ATS match score. This is misleading.
2. **Only extracts keywords from the `skills` array** (line 156): `extractKeywordsFromSkills(resume.skills)`. It completely ignores keywords embedded in experience bullet points, the summary, certifications, or education — which are the fields ATS systems scan most heavily.
3. **Has no scoring output.** `simulateATSParsing` returns `issues` (a list of strings) but no numeric score. If a score is displayed in the UI, it must be calculated elsewhere, creating a disconnect between the issues list and the displayed score.

**Recommended Fix:**
1. Add a `jobDescription?: string` parameter to `simulateATSParsing`. When provided, perform keyword extraction from both the resume and the JD, then calculate a match percentage.
2. Expand keyword extraction to scan all text fields: summary, experience descriptions, achievements, certifications, education.
3. Return a `score: number` (0–100) from the function alongside `issues`, so the UI and the diagnostic logic always agree.
4. Add a `matchedKeywords: string[]` and `missingKeywords: string[]` array so the UI can highlight what is present and what is absent.

---

#### FINDING-010: ATS simulation does not check for formatting red flags that real ATS systems fail on

**File(s)**: `src/lib/atsParserSimulation.ts`
**Severity**: 🟠 High

**What goes wrong (plain English):**
Real ATS systems (Taleo, Workday, Greenhouse, Lever) fail or misparse resumes that contain:
- Tables (content parsed out of order or merged into a single cell)
- Text boxes (content completely invisible to text-layer parsers)
- Headers/footers (name and contact info may be in a header layer that ATS ignores)
- Images embedded inline with text
- Two-column layouts (columns read left-to-right across both columns, garbling content)
- Non-standard fonts or excessive special characters

The current ATS simulation has no checks for any of these. If a user submits a stylized PDF with a two-column layout, the ATS sim gives a green light while real-world ATS systems will fail.

**Recommended Fix:**
Add a `formattingWarnings` field to the `ATSParsedResult` output. Populate it based on signals from the `textExtractor.ts` extraction (which already detects two-column layouts) and `textPreprocessor.ts` (which already scores garbage ratios). Pass these signals through to `simulateATSParsing` so the simulation can warn: "Your resume uses a two-column layout which some ATS systems struggle with."

---

#### FINDING-011: First-person pronoun check misses all non-English pronouns and context

**File(s)**: `src/lib/atsParserSimulation.ts` — line 61
**Severity**: 🟡 Medium

**What goes wrong (plain English):**
The check `/\b(I|me|my|mine|myself)\b/i` correctly catches English first-person pronouns. However:
- It will flag a company name like "Mines Advisory Group" because it contains "mines".
- It won't catch the French "je", Arabic "أنا", or Spanish "yo" in multilingual resumes.
- It does not distinguish between "I led the team" (bad for ATS) vs. a quote or title that happens to contain "I".

This is a minor false-positive/false-negative issue but can confuse non-English speakers.

**Recommended Fix:**
Use word boundary matching more carefully. Add common non-English first-person pronouns for the most prevalent resume languages. Provide context in the warning message: "Avoid starting bullet points or sentences with 'I'."

---

### Category 4 — Error Handling & Fallbacks

---

#### FINDING-012: No user-facing fallback path when PDF text extraction yields zero readable text

**File(s)**: `src/lib/pdfParser.ts`, `src/lib/pdf/ocrExtractor.ts`
**Severity**: 🔴 Critical

**What goes wrong (plain English):**
When a user uploads a completely image-based PDF (a scanned document), the text extraction pipeline in `textExtractor.ts` produces empty or near-empty output. The system then attempts OCR via `ocrExtractor.ts` using Tesseract.js. If OCR also fails (e.g., the scan is too blurry, the image has less than 30% confidence across all pages), the system falls back to local regex parsing. At this point, the resume object will be mostly empty — all fields blank — but there is no indication to the user that the import failed. The user may proceed thinking the data was imported successfully, only to discover the editor is empty.

Worse: if the AI parse times out at 120 seconds, the code falls back to `parseResumeText()` (local parser). A user on a slow connection could wait 2+ minutes before receiving an empty result with no clear explanation.

**Recommended Fix:**
1. After the OCR path completes, calculate a "completeness score" (how many fields are non-empty). If the score falls below a threshold (e.g., fewer than 3 fields populated), do not silently proceed.
2. Show the user a modal or inline banner: "We couldn't read your document reliably. You can: (A) try a different file format, or (B) fill in your details manually."
3. Add a `parseStatus: 'success' | 'partial' | 'failed'` field to the `ParseResult` interface and surface it in the UI.
4. Expose the `extractionSummary` (already computed in `pdfParser.ts`) to the user in a collapsible "Parsing Quality" section so they can see confidence scores per field.

---

#### FINDING-013: `parse-resume` edge function has no fallback when the Gemini model is unavailable

**File(s)**: `supabase/functions/parse-resume/index.ts`
**Severity**: 🟠 High

**What goes wrong (plain English):**
The `parse-resume` function calls Gemini 2.5 Flash Lite for text cleaning and then Gemini again for the main parsing pass. If the Gemini API returns a rate limit error (429) or a service unavailable error (503), the function propagates the error back to the client as a generic failure. The user sees an error toast with no guidance. The only fallback mentioned is a client-side timeout that routes to local regex parsing — but this fallback only triggers on a *timeout*, not on an API error response.

Additionally, if the *text cleaning* pre-pass fails (the first Gemini call), the main parsing pass proceeds with the uncleaned, garbled text — which may produce worse results than if no cleaning had been attempted.

**Recommended Fix:**
1. Wrap each Gemini call in a try/catch that distinguishes between rate limit, service error, and unexpected errors.
2. On rate limit (429): return a `retryAfter` value to the client and show the user a "Server is busy — retry in X seconds" message.
3. On any AI call failure: fall through to the local regex parser (which already exists) and flag the result as `parseStatus: 'partial'` so the user knows to review it.
4. Make the text-cleaning pre-pass strictly optional — if it fails, skip it and pass the raw text to the main parse.

---

#### FINDING-014: Unreadable image uploads (JPG/PNG) produce no user guidance

**File(s)**: `src/lib/pdf/ocrExtractor.ts` — `extractTextFromImage`, `src/lib/pdfParser.ts`
**Severity**: 🟠 High

**What goes wrong (plain English):**
The OCR extractor supports direct image uploads (JPG, PNG). If the uploaded image is a photo of a resume taken at an angle, or has poor lighting, Tesseract.js will still complete but produce garbage text (garbled words, nonsense characters). The `computeTextConfidence` function in `textPreprocessor.ts` will score this low, but there is no code path that uses a low confidence score to halt processing and ask the user for help. The garbled text is passed to the AI, which will attempt to parse it and return a partially-filled resume object — possibly with hallucinated data.

**Recommended Fix:**
1. After `computeTextConfidence`, if the confidence score is below 0.25 (existing threshold for "low quality"), stop processing immediately.
2. Return a specific error code `PARSE_ERROR_LOW_CONFIDENCE` to the client.
3. The UI should display: "The image quality is too low to read reliably. Please upload a clear, straight-on scan or try a PDF version of your resume."
4. Do not pass low-confidence text to the AI — this wastes credits and may produce convincing-looking but factually wrong data.

---

## User Scenarios & Testing

### User Story 1 — Resume with Non-Standard Section Headings Parses Correctly (Priority: P1)

A mid-career professional uploads a resume they've used for 10 years. Their sections are titled "Work History", "Core Competencies", and "Career Summary". Today these headings cause silent data loss.

**Why this priority**: This is the #1 upload flow. Broken section detection silently destroys data with no user feedback, and this directly determines whether WiseResume's core import feature feels reliable or broken.

**Independent Test**: Upload a test resume with non-standard section names. Verify that all three sections populate correctly in the editor.

**Acceptance Scenarios**:

1. **Given** a resume with the heading "Work History", **When** the file is uploaded and parsed, **Then** the experience entries appear correctly in the editor — no data is silently lost.
2. **Given** a resume with heading "Core Competencies", **When** parsed, **Then** the skills section in the editor is populated with the correct list.
3. **Given** a resume with heading "Career Summary", **When** parsed, **Then** the summary field is populated correctly.
4. **Given** a resume with a section heading the parser does not recognize, **When** parsed, **Then** the content is not silently dropped — it is either placed in the nearest related section or flagged in the parsing quality summary.

---

### User Story 2 — Unreadable or Low-Quality Document Triggers a Graceful Recovery Flow (Priority: P1)

A recent graduate uploads a blurry phone photo of their resume. Today the app silently returns an empty editor.

**Why this priority**: Silent failures destroy trust. A clear "we couldn't read this" message with actionable alternatives converts a frustrating failure into a recoverable moment.

**Independent Test**: Upload a deliberately blurry or blank image. Verify the app shows a clear recovery message instead of silently proceeding.

**Acceptance Scenarios**:

1. **Given** an uploaded image with OCR confidence below the minimum threshold, **When** parsing completes, **Then** the user sees a recovery banner: "We had trouble reading this document" with options to retry with a different file or enter details manually.
2. **Given** a fully image-based PDF where text extraction returns empty and OCR fails, **When** parsing completes, **Then** `parseStatus` is `'failed'` and the editor prompts the user to review and fill in sections manually.
3. **Given** a parse that completes but populates fewer than 3 fields, **When** the editor loads, **Then** an inline notice explains the partial import and highlights the empty sections.

---

### User Story 3 — ATS Simulation Produces a Meaningful, Job-Specific Score (Priority: P2)

A high-volume job applicant wants to know if their resume will pass ATS screening for a specific Software Engineer role. Today the ATS score reflects only structural completeness, not keyword match.

**Why this priority**: Keyword-match ATS scoring is WiseResume's core differentiator. A structural-only score misleads users into thinking they'll pass ATS when they won't.

**Independent Test**: Run the ATS simulation with and without a job description and verify the score changes based on keyword overlap.

**Acceptance Scenarios**:

1. **Given** a resume and a job description are both provided, **When** `simulateATSParsing` is called, **Then** the result includes a `score` (0–100), `matchedKeywords`, and `missingKeywords` based on overlap between the full resume text and the JD.
2. **Given** a resume with zero keywords matching the JD, **When** the simulation runs, **Then** the score is low (< 30) and `missingKeywords` lists the top 10 JD terms not found in the resume.
3. **Given** a resume where all JD keywords appear in experience bullets (not just the skills section), **When** the simulation runs, **Then** those keywords are correctly included in `matchedKeywords`.
4. **Given** the ATS simulation result, **When** the UI renders it, **Then** the displayed score matches the `score` field in the result — there is one source of truth.

---

### User Story 4 — LinkedIn Import Captures All Available Profile Data (Priority: P2)

A career switcher pastes their LinkedIn profile text to bootstrap their resume. Today certifications, volunteer work, and languages are silently discarded.

**Why this priority**: LinkedIn import is a primary onboarding shortcut. Losing certifications and volunteer work forces manual re-entry and reduces first-impression quality.

**Independent Test**: Paste a LinkedIn profile text containing certifications, volunteer entries, and languages. Verify all three appear in the resulting resume object.

**Acceptance Scenarios**:

1. **Given** a LinkedIn profile text with certifications, **When** parsed, **Then** the `certifications` array in the resume object is populated.
2. **Given** a LinkedIn profile with volunteer experience, **When** parsed, **Then** `volunteering` entries appear in the result.
3. **Given** a LinkedIn profile with languages listed, **When** parsed, **Then** `languages` appear in the result.
4. **Given** a profile where one company has 3 progressive roles, **When** parsed, **Then** three separate experience entries are created with the same company name — not one merged entry.
5. **Given** a user who pastes only a LinkedIn URL (not profile text), **When** the parse function receives the input, **Then** a user-friendly error message is returned explaining exactly how to export their profile text.

---

### User Story 5 — Date Extraction Works for All Common Resume Date Formats (Priority: P3)

A recruiter reviews imported resumes and notices dates are frequently missing. Many candidates use formats like "2019–2022" or "09/2021 – Present".

**Why this priority**: Missing dates cause the ATS simulation to flag every experience entry as incomplete. This is a false alarm that erodes trust in the tool.

**Independent Test**: Run `extractDateRange` with a test suite covering 8+ date format variants. All should return correct `startDate` and `endDate`.

**Acceptance Scenarios**:

1. **Given** a date range "2019–2022" (em-dash, no spaces), **When** `extractDateRange` is called, **Then** `startDate = "2019"` and `endDate = "2022"`.
2. **Given** "09/2021 – Present", **When** parsed, **Then** `startDate = "09/2021"`, `current = true`.
3. **Given** a single year "2023" on an education entry, **When** parsed, **Then** `endDate = "2023"` (graduation year).
4. **Given** "Jan 2020 - Dec 2022" (standard format), **When** parsed, **Then** both dates are correct — existing behavior is preserved.

---

### Edge Cases

- What happens when a resume has no section headings at all (one long block of text)? The entire document should fall into the header/summary bucket and be forwarded to AI for best-effort parsing.
- What happens when a bilingual resume mixes Arabic and English sections? Section heading detection must not break on Unicode characters — the existing international character support in `sectionParsers.ts` should cover this, but must be verified.
- What happens when a skills section contains 0 items after parsing? `simulateATSParsing` should not crash — it already handles this gracefully (shows "Fewer than 5 skills").
- What happens when a user pastes 200KB of LinkedIn text (exceeding the 200KB limit)? The edge function should truncate gracefully with a clear warning, not silently fail.
- What happens when the ATS simulation receives a resume with no job description? It should clearly indicate the score is a structural estimate only, not a keyword-match score.

---

## Requirements

### Functional Requirements

- **FR-001**: `extractSections` MUST recognize all section heading variants listed in FINDING-001, including "Work History", "Career Summary", "Core Competencies", "Key Skills", and at minimum 5 additional common variants per section type.
- **FR-002**: `extractSections` MUST NOT silently discard content under unrecognized section headings. Unrecognized content MUST be captured in an `unrecognized` fallback bucket.
- **FR-003**: `splitIntoBlocks` MUST NOT use ALL-CAPS line detection as a block-start trigger without also requiring date proximity, to prevent false splitting of company names.
- **FR-004**: `parseExperienceSection` MUST correctly identify job titles for at minimum 20 common title keywords beyond the current 9 (engineer, developer, manager, director, analyst, specialist, lead, senior, junior).
- **FR-005**: `extractDateRange` MUST handle the following formats without returning empty strings: `YYYY–YYYY` (em-dash), `MM/YYYY – MM/YYYY`, `YYYY - Present`, single-year `YYYY`.
- **FR-006**: `simulateATSParsing` MUST accept an optional `jobDescription` parameter and, when provided, compute keyword overlap to produce `matchedKeywords`, `missingKeywords`, and a numeric `score` (0–100).
- **FR-007**: `simulateATSParsing` MUST extract keywords from ALL text fields in the resume (summary, experience descriptions, achievements, certifications) — not only from the `skills` array.
- **FR-008**: `simulateATSParsing` MUST return a `score: number` field so the UI and the simulation logic share a single source of truth.
- **FR-009**: `simulateATSParsing` MUST accept formatting signals from the extraction layer (column layout, confidence score) and include them as `formattingWarnings` in the result.
- **FR-010**: The `parse-linkedin` edge function MUST extract `certifications`, `volunteering`, `languages`, and `projects` in addition to the current 4 fields.
- **FR-011**: The `parse-linkedin` edge function MUST return a user-friendly, actionable error message when a bare URL is submitted.
- **FR-012**: The `parse-job-url` edge function MUST display a user-friendly message when a URL domain is not on the whitelist, explaining the paste-text alternative.
- **FR-013**: The PDF parsing pipeline MUST surface a `parseStatus: 'success' | 'partial' | 'failed'` field to the caller.
- **FR-014**: When OCR confidence falls below 0.25, the system MUST halt AI parsing and return `parseStatus: 'failed'` with a recovery message — it MUST NOT pass low-confidence text to the AI.
- **FR-015**: When the Gemini AI API returns a 429 or 503 error, the `parse-resume` edge function MUST fall through to the local regex parser and return `parseStatus: 'partial'` rather than returning an error to the client.

### Key Entities

- **`ParseResult`**: Extended with `parseStatus: 'success' | 'partial' | 'failed'` and `parseWarnings: string[]`.
- **`ATSParsedResult`**: Extended with `score: number`, `matchedKeywords: string[]`, `missingKeywords: string[]`, `formattingWarnings: string[]`.
- **`SectionBlocks`**: Extended with `unrecognized: string[]` and pass-through buckets for `projects`, `volunteering`, `languages`, `awards`.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A test suite of 10 resumes with non-standard section headings (e.g., "Work History", "Core Competencies") achieves a section detection accuracy of ≥ 90% — meaning ≥ 9 of 10 resumes have all section content correctly assigned.
- **SC-002**: A test suite of 8 date format variants processed by `extractDateRange` all return non-empty `startDate` and `endDate` (or `current: true`) — 0 empty-string regressions on standard formats.
- **SC-003**: When a low-quality image (OCR confidence < 0.25) is uploaded, 100% of such uploads surface a recovery UI element — 0 silent empty-editor outcomes.
- **SC-004**: The `simulateATSParsing` function, when called with a job description, returns a `score` that changes by ≥ 20 points between a high-match resume and a zero-match resume for the same JD.
- **SC-005**: A LinkedIn profile paste containing certifications and volunteer entries results in those fields being present in the parsed `ResumeData` object in ≥ 95% of test cases.
- **SC-006**: After implementing FR-015, the `parse-resume` function returns a valid (partial) result on simulated Gemini 429/503 errors instead of propagating an HTTP error to the client.

---

## Out of Scope

- Re-implementing the OCR engine (Tesseract.js) itself — only the confidence-gating and fallback logic around it.
- Adding support for DOCX or other non-PDF file formats — separate spec.
- Monetization or credit changes related to failed parses.
- Scraping LinkedIn profiles directly (remains blocked by ToS and security policy).
- Full NLP/semantic keyword matching (e.g., understanding that "React.js" and "ReactJS" are the same) — a future enhancement; simple case-insensitive fuzzy matching is sufficient for this spec.
- Redesigning the resume editor's manual entry UI.
