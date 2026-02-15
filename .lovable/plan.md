

## Icon Readability & UX Flow Audit + Page Break Display Bug Fix

### Critical Bug: Page Break Indicators Show Auto Breaks as Manual

**What's happening:** When you set 1 manual page break in the Page Breaks sheet, the badge correctly shows "1". However, the preview shows 7+ purple badges ("Page 4 ends here", "Page 5 ends here", etc.) because `findSmartBreakPositions` returns ALL break positions (your 1 forced break + 6 auto-fill breaks), and `PageBreakIndicator` renders ALL of them with the purple "manual" style.

**Root cause:** `PageBreakIndicator` uses a single boolean `isManualMode` to choose styling. When manual mode is on, every break -- including auto-fills between forced breaks -- gets the prominent purple badge. This is misleading.

**Fix (2 files):**

1. **`src/lib/pdfGenerator.ts`** -- Export a new function `findSmartBreakPositionsTagged` (or modify the return type) that returns break positions tagged as `'manual'` or `'auto'`. The existing `findSmartBreakPositions` will remain unchanged for PDF generation (which only needs positions). A new companion function will return `{ position: number, type: 'manual' | 'auto' }[]`.

2. **`src/components/editor/PageBreakIndicator.tsx`** -- Call the tagged version instead. Render forced/manual breaks with the purple badge ("Page X ends here") and auto-fill breaks with the subtle amber dashed line ("Page X ends"). This way, the user clearly sees which breaks they chose vs which ones the system added to prevent content overflow.

---

### Icon & UX Audit Findings

#### 1. Bottom Tab Bar (5 tabs: Home, Editor, Studio, Jobs, Settings)
- **Home** (Home icon): Clear, universally understood. Size w-6 h-6 on mobile, adequate.
- **Editor** (FileText icon): Clear with "Editor" label. Adequate.
- **Studio** (Sparkles icon): Clear with "Studio" label. The glow effect on active state is a nice touch. No issues.
- **Jobs** (Briefcase icon): Clear with "Jobs" label. No issues.
- **Settings** (Settings/gear icon): Universally understood. No issues.
- All tabs have `aria-label`, `min-h-[48px]`, and `active:scale-95` haptic feedback. No changes needed.

#### 2. Preview Page Bottom Bar (Edit, Save, Interview, Share + Download)
- **Edit** (ArrowLeft): Already fixed in previous iteration with always-visible labels (`text-xs`). No issues.
- **Interview** (Mic icon): Label "Interview" visible on all sizes now. No issues.
- **Share** (Share2 icon): Label visible. No issues.
- **Save** (FolderDown, iOS only): Label visible. No issues.
- **Download** (Download icon): Primary CTA, large and prominent. No issues.

#### 3. Editor Header Tools
The Editor page packs many icon buttons in the header. On mobile, the header uses a collapsible approach. Key icons:
- **Undo/Redo** (Undo2/Redo2): Icon-only but universally understood. Have proper disabled states.
- **Wise AI** (MessageSquare): Has text label "Wise AI" on larger screens. On narrow screens it may be icon-only but the Sparkles glow makes it distinctive.
- **Preview** (Eye): Clear in context. Has label on wider screens.
- **ATS Score** (BarChart3): Displays score number which serves as label.

#### 4. Editor StepperNav Section Icons
All section icons are well-chosen and color-coded:
- Contact (User), Summary (AlignLeft), Experience (Briefcase), Education (GraduationCap), Skills (Wrench)
- More sections: Awards (Trophy/amber), Projects (Rocket/blue), Certifications (Award/orange), Publications (BookOpen/emerald), Volunteering (Heart/rose), Languages (Globe/cyan), Hobbies (Palette/purple), References (Users/sky)
- All have text labels in the sheet/dropdown. No issues.

#### 5. Dashboard Resume Card Actions
The `ResumeListCard` has proper labeled actions in its action sheet: Edit, Duplicate, Delete all with icons + text. Swipe actions also have proper icon+text. No issues.

#### 6. User Flow Analysis

**New User Flow** (Landing -> Auth -> Dashboard -> Create -> Editor -> Preview -> Export):
- Landing: Clear CTAs. No dead ends.
- Auth: Clean form, returns to Dashboard on success.
- Dashboard: "Create Resume" floating button is prominent. No confusion.
- Editor: StepperNav guides through sections. "Preview & Export" button in header navigates to Preview. Clear.
- Preview: Download is the primary CTA. Export options sheet shows all formats. No dead ends.
- Overall flow is logical with no gaps.

**Returning User Flow** (Dashboard -> Resume Card -> Resume Detail -> Edit -> Preview):
- Resume card tap navigates to detail page. Detail page has clear "Edit" button. No issues.

**Settings Flow** (Settings tab -> adjust options -> back):
- Settings page has bottom tab bar, so "back" is always available. No dead ends.

No major icon or flow issues found beyond the page break display bug.

---

### Implementation Plan

| Step | File | Change |
|------|------|--------|
| 1 | `src/lib/pdfGenerator.ts` | Add exported `findSmartBreakPositionsTagged()` that returns `{ position: number; type: 'manual' \| 'auto' }[]` by tracking which break positions come from `forcedBreaks` vs `computeAutoBreaksInSegment` |
| 2 | `src/components/editor/PageBreakIndicator.tsx` | Import and use the tagged function. Render manual breaks with purple badge, auto-fill breaks with amber dashed line. Update the `breaks` state to `{ position: number; type: 'manual' \| 'auto' }[]` |

### What Won't Change
- Core PDF generation algorithm (unchanged `findSmartBreakPositions` still used by `generatePDF`)
- No changes to export handlers, data models, types, or routes
- No changes to template rendering or section ordering
- All existing icon choices remain (they're well-suited)
- No flow restructuring needed

