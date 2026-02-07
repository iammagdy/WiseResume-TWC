

# Fix CV/Resume PDF Parsing Issues

## Problem Analysis

After analyzing the uploaded CV (Mohamed Raafat's resume), I can see the content is clearly structured with:
- Contact information
- 2 work experiences
- 1 education entry
- 5 certificates
- 1 project
- Skills and languages sections

However, the parsing may fail because of several issues in the current implementation.

---

## Root Causes Identified

### 1. Text Extraction Coordinate Issues
The current `textExtractor.ts` uses a Y-tolerance of only `3` pixels and column gap threshold of `150` pixels. Many modern CV templates have:
- Varying line heights
- Sidebar layouts with smaller gaps
- Multi-column designs

### 2. Section Detection Patterns Too Narrow
The local fallback parser (`sectionParsers.ts`) doesn't recognize:
- `PROJECTS` section (common in tech resumes)
- `LANGUAGES` section
- `CERTIFICATES` (plural variations)

### 3. Contact Info Extraction Limited
The phone regex doesn't handle Egyptian phone formats like `01120905546` (11 digits without country code).

### 4. AI Model Parsing
The edge function uses Gemini but the prompt may need enhancement for:
- Handling "Projects" section
- Extracting languages as skills
- Better date parsing

---

## Solution: Multi-Layer Improvements

### Phase 1: Improve Text Extraction (`textExtractor.ts`)

**Changes:**
1. Increase Y-tolerance from `3` to `5` pixels to better group text on same line
2. Reduce column gap threshold from `150` to `100` pixels for sidebar layouts
3. Add smarter column detection based on page width percentage

```typescript
// Line 165 - Increase tolerance
const Y_TOLERANCE = 5;  // Was 3

// Line 212 - Smarter column detection
const COLUMN_GAP_THRESHOLD = 100;  // Was 150
```

### Phase 2: Expand Section Patterns (`sectionParsers.ts`)

**Add new section patterns:**

```typescript
const SECTION_PATTERNS = {
  summary: /^(summary|objective|profile|about\s*me|professional\s*summary)$/i,
  experience: /^(experience|work\s*experience|employment|work\s*history|professional\s*experience)$/i,
  education: /^(education|academic|qualifications|academic\s*background)$/i,
  skills: /^(skills|technical\s*skills|core\s*competencies|technologies|expertise|proficiencies|languages?)$/i,
  certifications: /^(certifications?|certificates?|licenses?|credentials?|professional\s*certifications?)$/i,
  projects: /^(projects?|portfolio|work\s*samples?)$/i,  // NEW
};
```

**Improve phone regex for international formats:**

```typescript
// Handle Egyptian and international formats
const phoneMatch = text.match(
  /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/
);
```

### Phase 3: Enhance AI Edge Function (`parse-resume/index.ts`)

**Update the tool schema to include:**
1. Projects array (same structure as experience)
2. Languages array
3. Better date handling instructions

**Enhanced system prompt:**

```typescript
const systemPrompt = `You are an expert resume parser. Your task is to extract structured information from resume text.

IMPORTANT GUIDELINES:
1. Extract ALL information present - don't skip jobs, education, projects, or skills
2. If a field is not found, use empty string "" for required fields and empty array [] for arrays
3. Parse dates flexibly - accept "2024", "Summer 2024", "Jan 2020", etc.
4. For current jobs, set endDate to "Present" and current to true
5. Extract skills as individual items, including languages with proficiency levels
6. PROJECTS should be parsed into the experience array with company set to "Personal Project" or the project name
7. LANGUAGES should be added to skills array with proficiency (e.g., "Arabic (Native)", "English (Upper-intermediate)")
8. CERTIFICATES should include the issuing organization when mentioned
9. Handle various resume formats: chronological, functional, combination, sidebar layouts
10. Be thorough - extract every piece of relevant information

Common section variations to recognize:
- Experience: Work Experience, Employment History, Professional Experience
- Education: Academic Background, Qualifications
- Skills: Technical Skills, Core Competencies, Languages
- Certifications: Certificates, Credentials, Licenses
- Projects: Portfolio, Work Samples`;
```

### Phase 4: Add Projects Support to Types

**Update `types/resume.ts`:**

Add projects as part of experience with a flag, or add a new `projects` array:

```typescript
export interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  achievements: string[];
  isProject?: boolean;  // NEW - flag for project entries
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/pdf/textExtractor.ts` | Increase Y_TOLERANCE to 5, reduce COLUMN_GAP_THRESHOLD to 100 |
| `src/lib/pdf/sectionParsers.ts` | Add projects pattern, improve phone regex, add languages handling |
| `supabase/functions/parse-resume/index.ts` | Enhanced system prompt, add projects support, better date handling |
| `src/types/resume.ts` | Add `isProject` flag to Experience interface |

---

## Detailed Code Changes

### 1. textExtractor.ts (lines 165, 212)

```typescript
// Line 165: Increase Y tolerance for better line grouping
const Y_TOLERANCE = 5;

// Line 212: Reduce column gap for sidebar layouts
const COLUMN_GAP_THRESHOLD = 100;
```

### 2. sectionParsers.ts (lines 5-11, 109-113)

**Section patterns:**
```typescript
const SECTION_PATTERNS = {
  summary: /^(summary|objective|profile|about\s*me|professional\s*summary)$/i,
  experience: /^(experience|work\s*experience|employment|work\s*history|professional\s*experience|projects?)$/i,
  education: /^(education|academic|qualifications|academic\s*background)$/i,
  skills: /^(skills|technical\s*skills|core\s*competencies|technologies|expertise|proficiencies|languages?)$/i,
  certifications: /^(certifications?|certificates?|licenses?|credentials?|professional\s*certifications?)$/i,
};
```

**Phone regex (line 112):**
```typescript
const phoneMatch = text.match(
  /(\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/
);
```

### 3. parse-resume/index.ts (lines 138-150)

**Enhanced system prompt:**
```typescript
const systemPrompt = `You are an expert resume parser. Extract ALL structured information from resume text.

CRITICAL RULES:
1. Extract EVERYTHING - all jobs, education, projects, skills, certifications
2. Empty fields: use "" for strings, [] for arrays - never skip sections
3. Dates: Accept any format ("2024", "Summer 2024", "Jan 2020 - Present")
4. Current roles: endDate="Present", current=true
5. Skills: Parse as individual items. Include languages with proficiency levels
6. Projects: Add to experience array with company="Project" or project name
7. Languages: Add to skills as "Language (Level)" e.g., "Arabic (Native)"
8. Certifications: Include issuer from context when available

SECTION NAME VARIANTS:
- Experience → Work Experience, Employment, Professional Experience
- Education → Academic Background, Qualifications  
- Skills → Technical Skills, Core Competencies, Languages
- Certifications → Certificates, Credentials, Licenses
- Projects → Portfolio, Personal Projects

Parse ALL content - don't skip any sections!`;
```

---

## Expected Results After Fix

For the Mohamed Raafat CV:

```json
{
  "contactInfo": {
    "fullName": "Mohamed Raafat",
    "email": "mohammedraafatmr1@gmail.com",
    "phone": "01120905546",
    "location": "61 hamdy street eldaher",
    "linkedin": "https://linkedin.com/in/mohammed-raafat-3094b9263"
  },
  "summary": "Cloud Engineer with experience in real estate, marketing...",
  "experience": [
    {
      "company": "Address Investment",
      "position": "Real estate broker",
      "startDate": "Summer 2024",
      "endDate": "",
      "current": false,
      "description": "Worked as property advisor for 3 months..."
    },
    {
      "company": "CIC",
      "position": "Marketing team member",
      "startDate": "Summer 2023",
      "endDate": "",
      "description": "Worked on marketing team for three months..."
    },
    {
      "company": "Agarly (Project)",
      "position": "Developer",
      "description": "Car rental platform development...",
      "isProject": true
    }
  ],
  "education": [
    {
      "institution": "Saint Mary School",
      "degree": "High School",
      "endDate": "2021"
    }
  ],
  "skills": [
    "Cloud Engineering",
    "Communication",
    "Negotiation",
    "Teamwork",
    "Problem-solving",
    "Arabic (Native)",
    "English (Upper-intermediate)",
    "French (Beginner)"
  ],
  "certifications": [
    { "name": "Marketing", "issuer": "CIC Marketing Team" },
    { "name": "Problem Solving", "issuer": "Coach Academy" },
    { "name": "JavaScript", "issuer": "Coach Academy" },
    { "name": "Negotiation and Communication Skills", "issuer": "CIC" },
    { "name": "Cloud Technologies", "issuer": "AWS" }
  ]
}
```

---

## Summary

This plan addresses:
1. ✅ Better text extraction from complex PDF layouts
2. ✅ Recognition of more section types (Projects, Languages)
3. ✅ International phone number formats
4. ✅ Enhanced AI parsing with comprehensive prompt
5. ✅ Projects integrated into experience array

After these changes, the parser will handle diverse CV formats from users worldwide.

