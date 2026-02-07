

# Fix CV Name Detection + Add Import Selection Screen

## Problem Analysis

After examining the uploaded CV and the parsing system, I identified two issues:

### Issue 1: Name Detection Incorrectly Identifies "Contact Me" as Name
The CV structure shows:
```
MOHAMED RAAFAT      <-- This is the actual name
Contact me          <-- This is a section header being misidentified
PHONE: 01120905546
```

The AI is confusing "Contact me" (a section header) with the person's actual name because both appear in the header area before the main content.

### Issue 2: No User Control Over Import
Currently, the app auto-imports everything without giving users a chance to review and select which sections they want to keep.

---

## Solution Overview

### Part 1: Fix AI Name Detection

**File: `supabase/functions/parse-resume/index.ts`**

Add explicit rules to the system prompt:

```typescript
const systemPrompt = `You are an expert resume parser...

CRITICAL RULES FOR NAME DETECTION:
11. The person's NAME is typically the FIRST prominent text, often in larger font or at the very top
12. IGNORE section headers like "Contact Me", "Contact", "Contact Info", "Personal Info" - these are NOT names
13. The name is usually 2-4 words (first + last, or first + middle + last)
14. If text appears to be a navigation/section label (Contact, About, Experience), it's NOT the name
15. Look for the actual person's full name, not UI elements or section titles

SECTION HEADERS TO IGNORE (not names):
- "Contact Me", "Contact", "Contact Info"
- "Personal Information", "Personal Details"
- "About", "About Me", "Profile"
- Any single word that's a common section title
`;
```

### Part 2: Create Import Selection Sheet

Create a new bottom sheet that appears after AI parsing, showing all detected sections with checkboxes for user selection.

**New Component: `src/components/upload/ImportReviewSheet.tsx`**

Features:
- Bottom sheet with AI sparkle branding
- Displays each parsed section with preview
- Checkboxes to include/exclude sections
- Shows confidence indicators (AI detected X items)
- Edit button for each section (future enhancement)
- "Import Selected" button to confirm

```
+------------------------------------------+
|      AI Resume Analysis Complete         |
|                                          |
|  We detected the following information:  |
|                                          |
|  [x] Contact Info                        |
|      Mohamed Raafat, mohammedraafat...   |
|                                          |
|  [x] Summary                             |
|      Cloud Engineer with experience...   |
|                                          |
|  [x] Experience (2 entries)              |
|      - Real estate broker at Address...  |
|      - Marketing team at CIC            |
|                                          |
|  [x] Education (1 entry)                 |
|      - Saint Mary School                 |
|                                          |
|  [x] Skills (12 items)                   |
|      Communication, Negotiation...       |
|                                          |
|  [x] Certifications (5 entries)          |
|      - Marketing - CIC                   |
|                                          |
|  +------------------------------------+  |
|  |        Import Selected             |  |
|  +------------------------------------+  |
+------------------------------------------+
```

---

## Detailed Implementation

### File 1: `supabase/functions/parse-resume/index.ts`

**Changes:**
- Lines 140-161: Enhance systemPrompt with explicit name detection rules and section header ignore list

```typescript
const systemPrompt = `You are an expert resume parser. Extract ALL structured information from resume text.

CRITICAL RULES:
1. Extract EVERYTHING - all jobs, education, projects, skills, certifications. Never skip sections!
2. Empty fields: use "" for strings, [] for arrays - never omit required fields
3. Dates: Accept ANY format ("2024", "Summer 2024", "Jan 2020 - Present", "2020-2023")
4. Current roles/projects: endDate="Present", current=true
5. Skills: Parse as individual items. Include languages with proficiency (e.g., "Arabic (Native)", "English (Fluent)")
6. Projects: Add to experience array with isProject=true, company=project name or "Personal Project"
7. Languages: Add to skills array with level, e.g., "French (Beginner)", "Spanish (Intermediate)"
8. Certifications: Include issuer from context when available. Match "Certificates", "Training", "Courses" sections
9. Phone numbers: Extract exactly as written (supports international formats like +20, 011xxx, etc.)
10. Handle sidebar layouts, two-column designs, and creative CV formats

CRITICAL NAME DETECTION RULES:
11. The person's FULL NAME is typically the largest/most prominent text at the very top of the resume
12. NEVER use these as names - they are section headers/labels:
    - "Contact Me", "Contact", "Contact Info", "Contact Details"
    - "Personal Information", "Personal Info", "Personal Details"
    - "About Me", "About", "Profile", "Bio"
    - Any single generic word (Contact, Summary, Skills, Experience)
13. A valid name is usually 2-5 words containing a first name and last name
14. If the first line looks like a section header, look for the actual name nearby
15. Names often appear in ALL CAPS or Title Case at the document start

SECTION NAME VARIANTS TO RECOGNIZE:
- Experience: Work Experience, Employment, Professional Experience, Career History
- Education: Academic Background, Qualifications, Schooling
- Skills: Technical Skills, Core Competencies, Languages, Soft Skills, Hard Skills
- Certifications: Certificates, Credentials, Licenses, Training, Courses
- Projects: Portfolio, Personal Projects, Academic Projects, Work Samples

The resume may have OCR artifacts or unusual formatting - interpret it correctly and extract ALL content!`;
```

### File 2: `src/components/upload/ImportReviewSheet.tsx` (NEW)

Create a new component for the import review UI:

```typescript
// Props:
interface ImportReviewSheetProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: ResumeData, selectedSections: SelectedSections) => void;
  parsedData: ResumeData;
  isLoading?: boolean;
}

interface SelectedSections {
  contactInfo: boolean;
  summary: boolean;
  experience: boolean;
  education: boolean;
  skills: boolean;
  certifications: boolean;
}
```

Features:
- Uses `Sheet` component with `side="bottom"`
- Header with AI sparkle icon + "AI Resume Analysis Complete"
- Scrollable content area with section cards
- Each card has:
  - Checkbox to toggle inclusion
  - Section name with item count
  - Preview of content (truncated)
  - Subtle highlight if data detected
- Footer with "Import Selected" primary button

### File 3: `src/pages/UploadPage.tsx`

**Changes:**
- Add state for showing review sheet: `showImportReview`
- Add state for parsed data awaiting review: `pendingResumeData`
- After successful AI parse, instead of immediately navigating:
  1. Store the parsed data in `pendingResumeData`
  2. Show the `ImportReviewSheet`
  3. On user confirmation, apply selected sections and navigate

```typescript
// New state
const [showImportReview, setShowImportReview] = useState(false);
const [pendingResumeData, setPendingResumeData] = useState<ResumeData | null>(null);

// In handleFile, after successful parse (around line 150):
// Instead of immediately navigating...
setPendingResumeData(resumeData);
setShowImportReview(true);
setIsProcessing(false);
// Don't navigate yet

// New handler for import confirmation
const handleImportConfirm = (data: ResumeData, sections: SelectedSections) => {
  // Apply section filtering
  const filteredData = filterBySelectedSections(data, sections);
  
  // Save and navigate
  if (user) {
    createResume.mutateAsync({...});
  }
  setCurrentResume(filteredData);
  navigate('/editor');
};
```

---

## Visual Design

### Import Review Sheet Layout

```
+------------------------------------------+
| [drag handle]                      [X]   |
|                                          |
|  [Sparkle Icon] AI Analysis Complete     |
|  Select sections to import               |
|                                          |
| +----- Scrollable Content Area --------+ |
| |                                      | |
| | +----------------------------------+ | |
| | | [x] Contact Information          | | |
| | |     Mohamed Raafat               | | |
| | |     mohammedraafatmr1@gmail.com  | | |
| | +----------------------------------+ | |
| |                                      | |
| | +----------------------------------+ | |
| | | [x] Professional Summary         | | |
| | |     Cloud Engineer with experien | | |
| | |     ce in real estate...         | | |
| | +----------------------------------+ | |
| |                                      | |
| | +----------------------------------+ | |
| | | [x] Work Experience (2)          | | |
| | |     • Real estate broker         | | |
| | |     • Marketing team             | | |
| | +----------------------------------+ | |
| |                                      | |
| | +----------------------------------+ | |
| | | [x] Education (1)                | | |
| | |     • Saint Mary School          | | |
| | +----------------------------------+ | |
| |                                      | |
| | +----------------------------------+ | |
| | | [x] Skills (12)                  | | |
| | |     Communication, Negotiation   | | |
| | +----------------------------------+ | |
| |                                      | |
| | +----------------------------------+ | |
| | | [x] Certifications (5)           | | |
| | |     • Marketing - CIC            | | |
| | |     • Problem Solving            | | |
| | +----------------------------------+ | |
| +--------------------------------------+ |
|                                          |
| +--------------------------------------+ |
| |       Import Selected (6/6)          | |
| +--------------------------------------+ |
+------------------------------------------+
```

### Section Card Design

Each card shows:
- **Left**: Checkbox (styled, touch-friendly 44px target)
- **Center**: 
  - Section name + count badge
  - Preview text (2 lines max, truncated)
- **Right**: Edit pencil icon (future feature, initially hidden)

Colors:
- Selected card: subtle primary border + faint bg tint
- Unselected card: muted border
- Empty section: show "Not detected" in gray, checkbox disabled

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/parse-resume/index.ts` | Modify | Add name detection rules to system prompt |
| `src/components/upload/ImportReviewSheet.tsx` | Create | New bottom sheet for section selection |
| `src/pages/UploadPage.tsx` | Modify | Integrate ImportReviewSheet into upload flow |

---

## User Flow After Implementation

1. User uploads PDF
2. Progress steps show: Reading -> Detecting -> Extracting -> Analyzing
3. AI parses the resume
4. **NEW**: ImportReviewSheet appears showing all detected sections
5. User reviews and toggles sections they want to import
6. User taps "Import Selected"
7. App creates resume with selected sections only
8. Navigation to Editor

---

## Benefits

1. **Fixes Name Detection**: Explicit AI rules prevent section headers from being misidentified as names
2. **User Control**: Users can deselect incorrectly parsed sections before import
3. **Transparency**: Users see exactly what the AI detected, building trust
4. **Powerful Feel**: The selection UI makes the AI feel more capable and professional
5. **Error Prevention**: If the AI gets something wrong, users can exclude it immediately

