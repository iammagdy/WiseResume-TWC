

# Extend Tailor Tool: Add Awards + Fix Gaps in Projects/Certifications

## Current State

Projects and Certifications are **already partially wired** in the tailor tool -- the edge function prompt includes them, the AI returns them, and the TailorSheet renders cards for them. However, there are several gaps, and **Awards is completely missing**.

## What Needs to Change

### 1. Add Awards to the Type System
**File:** `src/types/resume.ts`
- Add `'awards'` to `TailorSectionId`
- Add `awards?: Award[]` to `SuperTailorResult`

### 2. Add Awards to the AI Prompt
**File:** `supabase/functions/tailor-resume/index.ts`
- Add the Awards data to the `userPrompt` section (like Projects/Certifications already are)
- Add the `awards` array to the JSON output schema
- Add `awards` default fallback in the response normalization block

### 3. Add Awards Section Card + Fix Missing Pieces in TailorSheet
**File:** `src/components/editor/TailorSheet.tsx`
- Add `'awards'` to `SECTION_LABELS` and to the default `enabledSections` array
- Add a new `SectionChangeCard` for Awards (after certifications)
- Add Awards merge logic in `handleApplyChanges` (like projects/certifications)
- Save `awards` and `projects` to the DB insert (currently only `certifications` is saved -- `projects` and `awards` are lost)
- Extend `handleEditSection` to support projects, certifications, and awards edits (currently only handles summary and skills)

### 4. Add Awards Icon to SectionChangeCard
**File:** `src/components/editor/tailor/SectionChangeCard.tsx`
- Add `awards: '🏆'` to the `SECTION_ICONS` record

### 5. Add Section Scores for Projects, Certifications, Awards
**File:** `supabase/functions/tailor-resume/index.ts`
- Add `projects`, `certifications`, and `awards` to the `sectionScores` schema in the prompt so the AI returns before/after scores for these too (currently hardcoded to 5 and 3 in the UI)

---

## Technical Details

### Type Change (`src/types/resume.ts`)
```
TailorSectionId = 'summary' | 'skills' | 'experience' | 'education' | 'projects' | 'certifications' | 'awards'
```

### Edge Function Prompt Additions (`supabase/functions/tailor-resume/index.ts`)
Add to `userPrompt`:
```
AWARDS:
${resume.awards?.map(...) || 'Not provided'}
```

Add to JSON output schema:
```
"awards": [
  { "id": "<keep original>", "title": "<title>", "issuer": "<issuer>", "date": "<date>", "description": "<enhanced description>" }
]
```

Add awards to sectionScores:
```
"projects": { "before": <0-100>, "after": <0-100> },
"certifications": { "before": <0-100>, "after": <0-100> },
"awards": { "before": <0-100>, "after": <0-100> }
```

### DB Insert Fix (`TailorSheet.tsx`)
Currently the insert to create a tailored resume is missing `projects` and `awards`:
```
projects: mergedResume.projects as unknown as Json,
awards: mergedResume.awards as unknown as Json,
```

### handleEditSection Extension
Currently only handles `summary` and `skills`. Will add cases for `projects`, `certifications`, and `awards` that update the corresponding arrays in the tailor result.

---

## Files Changed Summary

| File | Change |
|------|--------|
| `src/types/resume.ts` | Add `'awards'` to `TailorSectionId`, add `awards?: Award[]` to `SuperTailorResult` |
| `src/components/editor/tailor/SectionChangeCard.tsx` | Add `awards: '🏆'` to `SECTION_ICONS` |
| `src/components/editor/TailorSheet.tsx` | Add Awards label/card/merge/DB-save, fix missing projects in DB insert, extend `handleEditSection` |
| `supabase/functions/tailor-resume/index.ts` | Add Awards to prompt input, JSON output schema, section scores, and response defaults |

