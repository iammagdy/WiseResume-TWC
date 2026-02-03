

## Fix: Job Entries Getting Split Across Pages (Executive Template)

### Problem Identified

In the **Executive Template**, job entries (experience items) are being split across PDF pages, making the downloaded CV look unprofessional. Specifically:
- A job entry starts on Page 1 but part of it appears on Page 2
- The "Key Achievements" highlight box can also be awkwardly split from related content

### Root Causes

1. **Key Achievements section missing `data-break-avoid`**: The Executive template's "Key Achievements" highlight box (the amber-colored box) doesn't have `data-break-avoid`, so it can be separated from the experience it summarizes

2. **Smart break algorithm too aggressive**: The current thresholds allow cutting through blocks when they are "too large" (over 25% page height). For resumes with detailed job entries, this threshold is too low

3. **Section headers can be orphaned**: When a section title (like "PROFESSIONAL EXPERIENCE") falls near the bottom of a page, it might appear alone without any content below it - this is called an "orphaned header"

---

### Implementation Plan

#### 1. Fix Executive Template - Add missing `data-break-avoid`
**File**: `src/components/templates/ExecutiveTemplate.tsx`

- Add `data-break-avoid` to the Key Achievements section (the amber highlight box)
- This ensures the achievements block stays together and doesn't get awkwardly split

#### 2. Improve Smart Break Algorithm Thresholds
**File**: `src/lib/pdfGenerator.ts`

- Increase the "max waste" threshold from 25% to 35% - this means the algorithm will try harder to avoid cutting blocks
- Reduce the "min page content" threshold from 20% to 15% - allows shorter pages when necessary to prevent splits
- Add orphan protection: If a break would leave less than 20% of a block on the current page, move the entire block to the next page

#### 3. Add Section Header Protection
**File**: `src/lib/pdfGenerator.ts`

- Detect when a section header (element with `data-section`) is followed by content
- If the header would appear at the bottom of a page without its first content block, move the header to the next page too

---

### Code Changes Summary

| File | Change |
|------|--------|
| `src/components/templates/ExecutiveTemplate.tsx` | Add `data-break-avoid` to Key Achievements section |
| `src/lib/pdfGenerator.ts` | Improve threshold values and add orphan protection logic |

---

### Technical Details

**Improved break thresholds:**
```
Before:
- maxWaste = 25% of page height
- minPageContent = 20% of page height

After:
- maxWaste = 35% of page height  
- minPageContent = 15% of page height
- Orphan threshold = 20% of block height (if less than this on current page, move entire block)
```

**Key Achievements section fix:**
```jsx
// Before
<section className="mb-8 bg-amber-50 p-4 border-l-4 border-amber-600">

// After  
<section data-break-avoid className="mb-8 bg-amber-50 p-4 border-l-4 border-amber-600">
```

---

### Expected Result

- Job entries (experience items) will stay together on a single page
- The Key Achievements highlight box will not be split from its content
- Section headers will always have at least their first content item on the same page
- Professional, clean page breaks that look like industry-standard Word/Google Docs output

