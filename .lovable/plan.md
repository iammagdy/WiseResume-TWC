

## Remove Interview from Bottom Bar, Add to Studio and Export

### Overview

Remove the Interview tab from the bottom navigation bar (reducing it from 6 to 5 tabs), keep it accessible via the AI Studio page (already there as a secondary tool), and add an "Interview Prep" option in the Export sheet so users can practice answering questions about their resume right before exporting.

---

### Changes

#### 1. Remove Interview Tab from Bottom Bar

**File: `src/components/layout/BottomTabBar.tsx`**

- Remove the Interview tab entry (`path: '/interview'`, `icon: Mic`, `label: 'Interview'`) from the `tabs` array
- Remove the `Mic` import from lucide-react
- Final tabs: Home, Editor, Studio, Jobs, Settings (5 tabs)

#### 2. Add Interview Prep to Export Sheet

**File: `src/components/editor/ExportOptionsSheet.tsx`**

- Add a new export option entry with id `'interview-prep'`:
  - Label: "Interview Prep"
  - Description: "Practice answering questions about this resume"
  - Icon: `Mic` (from lucide-react)
  - Always available
- When user selects "Interview Prep" and taps the action button, navigate to `/interview` instead of triggering a download
- Update `getButtonLabel` to return "Start Practice" for this type
- Update the action button icon to show `Mic` instead of `Download`/`Copy` for this type

**File: `src/types/resume.ts`**

- Add `'interview-prep'` to the `ExportType` union

#### 3. AI Studio Already Has Interview (No Change Needed)

The Interview tool is already in `secondaryTools` on the AI Studio page (line 70: `{ id: 'interview', icon: Mic, label: 'Interview', desc: 'Practice Q&A' }`). No changes needed here.

---

### Files Summary

| File | Action |
|------|--------|
| `src/components/layout/BottomTabBar.tsx` | Remove Interview tab from tabs array |
| `src/types/resume.ts` | Add `'interview-prep'` to ExportType |
| `src/components/editor/ExportOptionsSheet.tsx` | Add Interview Prep option, handle navigation |

### Implementation Order

1. `src/types/resume.ts` (add type)
2. `src/components/layout/BottomTabBar.tsx` (remove tab)
3. `src/components/editor/ExportOptionsSheet.tsx` (add interview prep option)

