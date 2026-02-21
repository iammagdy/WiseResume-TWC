

# Reorganize AI Studio for Better Feature Discoverability

## The Problem
The AI Studio tab currently has several discoverability issues:
- **Hidden features**: Cover Letters and Resignation Letters have full pages but aren't listed anywhere in AI Studio -- users may never find them
- **Inconsistent patterns**: Some tools open as bottom sheets (Proofread, Enhance, LinkedIn, etc.) while others navigate to pages (Interview, Career) -- confusing UX
- **Collapsed by default**: 9 tools are tucked inside a "More AI Tools" collapsible, making them easy to miss
- **No history/persistence**: Sheet-based tools (Proofread, Enhance, LinkedIn) disappear after closing -- no way to revisit results
- **Career page back button**: Still navigates to `/dashboard` instead of `/ai-studio`

## The Solution
Reorganize AI Studio into a clear, scannable grid of ALL features grouped by purpose, with every feature visible on first load (no collapsible). Add Cover Letters and Resignation Letters as first-class entries. Keep tools that are quick actions as sheets, but ensure navigation-based tools (Interview, Career, Cover Letters, Resignation Letters) are clearly linked.

---

## Changes

### 1. Restructure tool categories to include ALL features

Replace the current "Featured Tools" + collapsible "More AI Tools" layout with a single flat grid organized into 4 clear sections, all visible without scrolling past a fold:

**Resume Tools** (work on your resume)
- Smart Tailor -- sheet (existing)
- Proofread -- sheet (existing)
- Enhance -- sheet (existing)
- 1-Page Wizard -- sheet (existing)
- Humanize -- sheet (existing)

**Job Analysis** (match to jobs)
- Job Match Analysis -- sheet (existing)
- A/B Compare -- sheet (existing)
- Recruiter Sim -- sheet (existing)

**Career Growth** (plan your future)
- Interview Practice -- navigates to `/interview`
- Career Plan -- navigates to `/career`
- LinkedIn Optimizer -- sheet (existing)
- Company Briefing -- sheet (existing)

**Documents** (generate letters) -- NEW section
- Cover Letters -- navigates to `/cover-letters`
- Resignation Letters -- navigates to `/resignation-letters`

### 2. Fix CareerPage back button

File: `src/pages/CareerPage.tsx`
- Change `navigate('/dashboard')` to `navigate('/ai-studio')` (line 96)

### 3. Remove the collapsible wrapper

File: `src/pages/AIStudioPage.tsx`
- Remove the `Collapsible` / "More AI Tools" section entirely
- Display all tools in a single scrollable grid with section headers
- Each tool card shows: icon, name, short description, and cost badge
- Use a consistent 2-column grid (3 on tablet, 4 on desktop)

### 4. Keep Wise AI Chat prominent at top

The Wise AI Chat button stays at the top as the primary CTA, followed by the tool grid sections.

### 5. Add Cover Letters and Resignation Letters to navigation map

File: `src/pages/AIStudioPage.tsx`
- Add `cover-letters` and `resignation-letters` entries to the tool categories and to the `handleSecondaryAction` switch
- These navigate to their respective pages instead of opening sheets

### 6. Update deep-link support

Add `cover-letters` and `resignation-letters` to the `toolMap` in the deep-link `useEffect`.

---

## Technical Details

### File: `src/pages/AIStudioPage.tsx`

**toolCategories** restructured to:
```text
[
  { title: "Resume Tools", tools: [tailor, proofread, enhance, onepage, humanizer] },
  { title: "Job Analysis",  tools: [job-match, ab-compare, recruiter] },
  { title: "Career Growth", tools: [interview, career, linkedin, company-briefing] },
  { title: "Documents",     tools: [cover-letters, resignation-letters] },
]
```

Each tool entry gains a `navigate?: string` field. If present, the handler calls `navigate(tool.navigate)` instead of opening a sheet.

The Featured Tools section (Smart Tailor, A/B Compare, Job Match as large cards) is removed. All tools now appear uniformly in the grid, making the page shorter and easier to scan.

The `Collapsible` wrapper is removed -- all sections render directly.

### File: `src/pages/CareerPage.tsx`
- Line 96: `navigate('/dashboard')` changes to `navigate('/ai-studio')`

### File: `src/lib/navigation.ts`
- Add `'/career': '/ai-studio'` to `BACK_ROUTES` if not already present

### No new files needed
All changes are within existing files. No new pages or components are created.

---

## Summary of Changes

| File | Change |
|---|---|
| `src/pages/AIStudioPage.tsx` | Flatten all tools into 4 visible sections; add Cover Letters and Resignation Letters; remove Collapsible; remove separate Featured Tools section; add deep-link entries for new tools |
| `src/pages/CareerPage.tsx` | Fix back button: `/dashboard` to `/ai-studio` |
| `src/lib/navigation.ts` | Add `/career` to BACK_ROUTES pointing to `/ai-studio` |

