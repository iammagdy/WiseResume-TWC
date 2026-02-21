
# ATS Parser Preview Side Panel

## What This Adds

A new "ATS View" tab/panel alongside the existing "Preview" that shows users exactly how an ATS system would parse and interpret their resume -- stripping all formatting and displaying raw extracted text organized by detected sections. This gives users a plain-text, machine-eye view of their resume with inline ATS validation checks and section-by-section parsing confidence indicators.

---

## How It Works

The ATS Parser Preview renders the resume as a **plain-text structured document** (no styling, no templates) -- simulating what an ATS like Workday, Greenhouse, or Lever would extract. Each section is labeled with how the parser identifies it, and any parsing issues are highlighted inline.

---

## New Component: `ATSParserPreview`

**File:** `src/components/editor/ATSParserPreview.tsx`

A standalone panel component that takes the current resume from the store and renders:

### Header
- Title: "ATS Parser View"
- Subtitle: "How applicant tracking systems see your resume"
- Overall ATS score ring (reusing `ScoreRing`)

### Parsed Sections (plain text render)
Each resume section is rendered as a labeled block:

```
[CONTACT INFORMATION]          -- detected / missing
  Full Name: John Doe
  Email: john@example.com
  Phone: +1 555-0123
  Location: San Francisco, CA

[PROFESSIONAL SUMMARY]        -- 72 words, third-person
  Results-driven software engineer with...

[WORK EXPERIENCE]              -- 3 entries detected
  Software Engineer | Google | Jan 2022 - Present
  - Led migration of legacy services...
  - Increased test coverage by 40%...

  Junior Developer | Startup Inc | Jun 2020 - Dec 2021
  - Built RESTful APIs serving 10k req/s...

[EDUCATION]                    -- 1 entry detected
  BS Computer Science | MIT | 2020

[SKILLS]                       -- 12 keywords detected
  JavaScript, TypeScript, React, Node.js, ...

[CERTIFICATIONS]               -- 1 entry
  AWS Solutions Architect | Amazon | 2023
```

### Section Status Indicators
Each section header shows a small status badge:
- Green checkmark: Section parsed cleanly
- Amber warning: Section has minor issues (e.g., missing dates)
- Red X: Section missing or unparseable

### Inline ATS Validation
At the bottom, render the 10-item ATS checklist (reusing `runATSValidation` from `atsValidationChecks.ts`) as a compact pass/warn/fail list.

### Parsing Notes
- Flag any special characters found with their location
- Highlight inconsistent date formats
- Show word/character count per section
- Show detected keywords vs. common ATS keywords

---

## Integration Points

### Desktop (side panel)
The existing `LivePreviewPanel` renders in the right resizable panel. The new `ATSParserPreview` will be toggled via a segmented control at the top of the preview panel area.

**Changes to `EditorPage.tsx`:**
- Add state: `previewMode: 'visual' | 'ats'`
- In the desktop `ResizablePanel` (line 1232), wrap the content in a container with a segmented toggle at top
- When `previewMode === 'visual'`, show `LivePreviewPanel` (existing)
- When `previewMode === 'ats'`, show `ATSParserPreview` (new)

### Mobile (tab)
On mobile, the existing Editor/Preview tabs become Editor/Preview/ATS (3 tabs).

**Changes to `EditorPage.tsx`:**
- Expand `mobileEditorTab` type to `'editor' | 'preview' | 'ats'`
- Add a third `TabsTrigger` for "ATS View"
- Add a third `TabsContent` rendering `ATSParserPreview`

---

## Files to Create

### `src/components/editor/ATSParserPreview.tsx`
The main component (~250 lines):
- Reads `currentResume` from `useResumeStore`
- Calls `runATSValidation(currentResume)` via `useMemo`
- Renders each section as monospace plain text in a scrollable container
- Uses a `font-mono` font to simulate raw text extraction
- Each section block has a header with section name + status icon
- Bottom: compact ATS checklist summary
- Uses `framer-motion` for entry animation
- `onClose` prop for desktop panel close button

### `src/lib/atsParserSimulation.ts`
Pure utility functions (~120 lines):
- `simulateATSParsing(resume: ResumeData): ATSParsedResult` -- converts structured resume into flat text sections with metadata
- `ATSParsedResult` type: `{ sections: ATSParsedSection[]; totalWords: number; detectedKeywords: string[]; issues: string[] }`
- `ATSParsedSection` type: `{ name: string; status: 'detected' | 'partial' | 'missing'; lines: string[]; wordCount: number; issues: string[] }`
- Handles all resume section types (contact, summary, experience, education, skills, certifications, awards, projects, publications, volunteering)
- Counts words, detects keywords, flags formatting issues

---

## Files to Modify

### `src/pages/EditorPage.tsx`
- Import `ATSParserPreview` (lazy-loaded)
- Add `previewMode` state (`'visual' | 'ats'`)
- Desktop: Add segmented toggle above the `ResizablePanel` content
- Mobile: Add third tab "ATS" to the `TabsList` and corresponding `TabsContent`
- Expand `mobileEditorTab` type union

### `src/components/editor/LivePreviewPanel.tsx`
- No changes needed -- it remains as-is for the "Visual" mode

---

## UI Design

### Desktop Layout
```
+------------------+---+-------------------------+
|                  | | | [Visual] [ATS View]     |
|    Editor        | | +-------------------------+
|    Form          | | | [CONTACT INFORMATION]   |
|                  | | |   Full Name: ...        |
|                  | | |   Email: ...            |
|                  | | |                         |
|                  | | | [WORK EXPERIENCE]       |
|                  | | |   ...                   |
|                  | | |                         |
|                  | | | --- ATS Checks ---      |
|                  | | |   Pass: Contact info    |
|                  | | |   Warn: Add metrics     |
+------------------+---+-------------------------+
```

### Mobile Layout
```
+-----------------------------------+
| [Editor] [Preview] [ATS View]    |
+-----------------------------------+
| [CONTACT INFORMATION]      [ok]  |
|   Full Name: John Doe             |
|   Email: john@example.com         |
|                                    |
| [PROFESSIONAL SUMMARY]     [ok]  |
|   Results-driven...               |
|                                    |
| --- ATS Compatibility ---         |
|   10/10 checks passed             |
+-----------------------------------+
```

### Visual Style
- Background: `bg-muted/20` (subtle paper look)
- Text: `font-mono text-sm` for the parsed content
- Section headers: `uppercase tracking-wider text-xs font-bold text-muted-foreground` with a bracket decoration `[SECTION NAME]`
- Status icons: `CheckCircle2` (green), `AlertTriangle` (amber), `XCircle` (red) from lucide-react
- ATS checklist at bottom uses the same compact style as `ATSValidationChecklist`

---

## Technical Details

- All rendering is **deterministic and instant** -- no API calls, no AI credits
- `simulateATSParsing` simply restructures `ResumeData` into flat text, simulating what an ATS text extractor would produce
- The segmented toggle uses existing Shadcn `Tabs` or simple buttons with `bg-primary/10` active state
- Lazy-loaded via `React.lazy` to avoid impacting editor bundle
- `ATSParserPreview` is memoized and only re-renders when `currentResume` changes (shallow compare via Zustand selector)
- Mobile: third tab adds ~40px to the tab bar but remains within 44px touch targets by using smaller text (`text-xs`)
