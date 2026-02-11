
# Enhanced Cover Letter Generator: Smart Contact Info, History, and Premium UI

## Overview

Three major enhancements: (1) auto-inject real contact info so no more placeholder text like `[Your Phone Number]`, (2) cover letter history system matching the tailor history design, and (3) premium results screen with PDF download and edit/view toggle.

---

## Part 1: Auto-Inject Contact Info

**Problem:** The screenshot shows `[Your Phone Number] | [Your Email Address]` and `[Your LinkedIn Profile URL]` -- the AI generates placeholders because the prompt doesn't include actual contact details.

**Backend fix** (`supabase/functions/generate-cover-letter/index.ts`):
- Add contact info (phone, email, LinkedIn) to the AI user prompt so the model uses real values
- Add instruction: "Use the candidate's actual contact details. Do NOT use placeholder brackets."

**Frontend safety net** (`CoverLetterGenerator.tsx`):
- After receiving the AI response, run a regex replacement to swap any remaining `[Your Phone Number]`, `[Your Email Address]`, `[Your LinkedIn Profile URL]` with actual values from `resume.contactInfo`

---

## Part 2: Cover Letter History

**New type** in `src/types/resume.ts`:
```
CoverLetterHistory {
  id: string;
  jobTitle: string;
  company: string;
  tone: string;
  coverLetter: string;
  createdAt: string;
}
```

**Store changes** in `src/store/resumeStore.ts`:
- Add `coverLetterHistory: CoverLetterHistory[]` (persisted, max 20 entries)
- Add `addCoverLetterHistory(entry)`, `deleteCoverLetterHistoryEntry(id)`, `clearCoverLetterHistory()` actions

**New component** `src/components/editor/tailor/CoverLetterHistorySheet.tsx`:
- Same visual structure as `TailorHistorySheet.tsx` -- grouped by date, cards with role/company, tone badge, timestamp
- Actions per card: View (loads into generator), Copy, Delete
- Footer: Clear All button

**Integration:**
- History button in the CoverLetterGenerator header
- Auto-save to history on successful generation

---

## Part 3: Enhanced Results Screen and Downloads

**Remove framer-motion** from `CoverLetterGenerator.tsx` (currently uses `motion.div` on line 155) to prevent the infinite loop crash consistent with all other editor fixes.

**Premium layout:**
- Success header with green checkmark badge and a celebration shimmer CSS animation
- Job context card showing target role and company with tone badge
- Read mode: styled paper-like card with proper typography instead of raw textarea
- Edit mode: toggle to textarea when user taps "Edit", back to styled view on "Done"

**Download options:**
- "Download PDF" button using `generateCoverLetterPDF` from `src/lib/pdfGenerator.ts` (already exists) combined with `downloadFile` from `src/lib/downloadUtils.ts`
- "Download TXT" kept as secondary option
- "Copy to Clipboard" remains prominent

**Redesigned action buttons:**
- Primary row: Copy to Clipboard (gradient), Download PDF (outline)
- Secondary row: Regenerate (outline), History (outline)

---

## Technical Details

### Files to modify:

| File | Changes |
|------|---------|
| `supabase/functions/generate-cover-letter/index.ts` | Add phone/email/LinkedIn to AI prompt; instruct no placeholders |
| `src/types/resume.ts` | Add `CoverLetterHistory` interface |
| `src/store/resumeStore.ts` | Add `coverLetterHistory` state and CRUD actions |
| `src/components/editor/tailor/CoverLetterGenerator.tsx` | Remove framer-motion; enhance UI with read/edit toggle, PDF download, placeholder replacement, history integration |
| `src/components/editor/tailor/CoverLetterHistorySheet.tsx` | New file -- history sheet matching TailorHistorySheet design |

### Contact Info in AI Prompt (Edge Function):

Add to the user prompt before the job description:
```
CANDIDATE CONTACT INFO:
Phone: {resume.contactInfo.phone}
Email: {resume.contactInfo.email}
LinkedIn: {resume.contactInfo.linkedin}

Include these actual contact details in the letter header. Do NOT use placeholder brackets like [Your Phone Number].
```

### Placeholder Replacement (Frontend Safety Net):

```typescript
function injectContactInfo(letter: string, contactInfo: ContactInfo): string {
  return letter
    .replace(/\[Your Phone Number\]/gi, contactInfo.phone || '')
    .replace(/\[Your Email Address\]/gi, contactInfo.email || '')
    .replace(/\[Your LinkedIn Profile URL\]/gi, contactInfo.linkedin || '')
    .replace(/\[Your LinkedIn\]/gi, contactInfo.linkedin || '');
}
```

### PDF Download:

Uses the existing `generateCoverLetterPDF` function from `src/lib/pdfGenerator.ts` which already formats cover letters on A4 pages with proper typography, combined with the cross-platform `downloadFile` utility.

### History Entry Shape:

```typescript
{
  id: "uuid",
  jobTitle: "Account Supervisor",
  company: "Loynova",
  tone: "professional",
  coverLetter: "Full letter text...",
  createdAt: "2026-02-11T..."
}
```
