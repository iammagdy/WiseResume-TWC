
## Enhance AI Detector (Multi-Section Support) and LinkedIn Optimizer (Download to Word)

### Part 1: AI Detector -- Add Multi-Section Support

Currently the AI Detector only has a "Load Summary" button and an "Apply to Summary" action. We will expand it to support all text-based resume sections.

**Changes to `src/components/editor/ai/AIDetectorSheet.tsx`:**

- Replace the single "Load Summary" button with a **section selector dropdown/chips** that lets the user pick which section to load:
  - Summary (loads `currentResume.summary`)
  - Experience (loads all experience descriptions and achievements as combined text, with position/company headers)
  - Projects (loads project descriptions)
  - Volunteering (loads volunteering descriptions)
  - Awards (loads award descriptions)
  - Publications (loads publication descriptions)
- Track the selected section in state (`selectedSection`)
- The "Load" button label changes to "Load [Section]"
- When humanized text is ready, the "Apply to Summary" button becomes **"Apply to [Section]"** and correctly writes back to the appropriate resume field:
  - Summary: writes string directly
  - Experience: replaces the combined description text back into the experience entries (AI returns the full rewritten block, which is split and mapped back by index)
  - Other sections: similar mapping
- For experience specifically: load each entry as a labeled block (e.g., "Software Engineer at Google: [description + achievements]"), send the combined text for analysis, and when applying the humanized version, parse the labeled blocks back into individual entries

**No edge function changes needed** -- the `detect-and-humanize` function already accepts any text string and returns humanized text. The section-awareness is purely a client-side concern.

---

### Part 2: LinkedIn Optimizer -- Add "Download as Word" Button

When results are displayed, add a "Download as Word" button in the footer alongside the existing "Start Over" button.

**Changes to `src/components/editor/ai/LinkedInOptimizerSheet.tsx`:**

- Add a "Download as Word" button (with a FileDown icon) in the results footer
- Create a `handleDownloadDocx` function that:
  1. Dynamically imports the `docx` library (already installed)
  2. Builds a Word document with all the LinkedIn content organized into sections:
     - **Headlines** -- numbered list of all 5 options
     - **About Section (Short)** -- the short version
     - **About Section (Medium)** -- the medium version
     - **About Section (Long)** -- the long version
     - **Experience Rewrites** -- each with position, company, and the LinkedIn-optimized text
     - **Suggested Skills** -- comma-separated list
     - **Keywords** -- comma-separated list
     - **Tips** -- bulleted list
  3. Uses `Packer.toBlob()` to generate the file
  4. Downloads using the existing `downloadFile` utility from `src/lib/downloadUtils.ts`
  5. File name: `LinkedIn_Profile_[Name].docx` (using the user's name from the resume)
- Also add a **"Copy All"** button that copies all content sections into the clipboard as formatted plain text, so users who just want to paste quickly can do so without downloading

**Footer layout change:**
- When results are showing, the footer will have two rows:
  - Row 1: "Download as Word" (primary) and "Copy All" (outline) side by side
  - Row 2: "Start Over" (ghost) full width

---

### Technical Details

**AI Detector section mapping:**

For the experience section, text is formatted as:
```
[Position] at [Company]
[Description]
- [Achievement 1]
- [Achievement 2]
---
```

When applying humanized text back, the same delimiter pattern (`---`) is used to split and map entries back by index. Only the description and achievements text is replaced; metadata (company, position, dates) is preserved.

**LinkedIn DOCX generation:**

Uses the same `docx` library already in the project. The document structure:
- Title: "LinkedIn Profile Content - [Name]"
- Each section uses HeadingLevel.HEADING_1
- Body text uses size 22 (11pt)
- Professional formatting with spacing between sections

**Files to modify:**
| File | Change |
|------|--------|
| `src/components/editor/ai/AIDetectorSheet.tsx` | Add section selector, multi-section load/apply logic |
| `src/components/editor/ai/LinkedInOptimizerSheet.tsx` | Add Download as Word button, Copy All button, DOCX generation |
