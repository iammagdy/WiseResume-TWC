

# Per-Section Editor Skeletons

## Problem
The current `SectionSkeleton` is a generic 3-block placeholder used for all lazy-loaded editor sections. It doesn't match the actual layout of each section (e.g., Contact has 6 input fields, Summary has a textarea, Experience has an "Add" button + card list), causing visible layout shift when the real content loads on mobile.

## Solution
Create section-specific skeleton components that mirror the real UI layout of each editor section, then use them as the Suspense fallback for each tab.

## Sections to Cover

| Section | Skeleton Layout |
|---------|----------------|
| **Contact** | 6 labeled input field placeholders (name, email, phone, location, LinkedIn, portfolio) |
| **Summary** | 1 label + textarea placeholder + collapsible tips bar |
| **Experience** | "Add" button bar + 2 collapsed entry cards with header rows |
| **Education** | "Add" button bar + 1 collapsed entry card |
| **Skills** | Input + "Add" button bar + row of pill/badge placeholders |
| **More sections** (Languages, Projects, etc.) | "Add" button bar + 1 collapsed entry card (reusable pattern) |

## Technical Details

### New file: `src/components/editor/SectionSkeletons.tsx`

Contains named exports for each section skeleton:

- **`ContactSectionSkeleton`** -- 6 rows, each with a small label bar (h-4 w-16) and an input bar (h-12 w-full), in a `space-y-3` container
- **`SummarySectionSkeleton`** -- label bar + tall textarea placeholder (h-40) + tips bar (h-10)
- **`ExperienceSectionSkeleton`** -- button bar (h-10 right-aligned) + 2 card placeholders (h-16 rounded-xl border)
- **`EducationSectionSkeleton`** -- button bar + 1 card placeholder
- **`SkillsSectionSkeleton`** -- input row + row of 5-6 pill placeholders (h-8 w-16 rounded-full)
- **`ListSectionSkeleton`** -- generic reusable: button bar + N card placeholders (used for Languages, Projects, Certifications, Awards, etc.)

All skeletons will:
- Use `animate-pulse` (consistent with existing skeleton pattern)
- Use `bg-muted rounded-lg/xl` blocks matching real component dimensions
- Include `flex-1 flex flex-col` to work with the black-bar fix
- Keep the same `space-y-3` / `space-y-4` spacing as real sections

### Changes to `src/pages/EditorPage.tsx`

Replace `<SectionSkeleton />` in each Suspense fallback with the matching skeleton:

```
// Contact tab
<Suspense fallback={<ContactSectionSkeleton />}>

// Summary tab  
<Suspense fallback={<SummarySectionSkeleton />}>

// Experience tab
<Suspense fallback={<ExperienceSectionSkeleton />}>

// Education tab
<Suspense fallback={<EducationSectionSkeleton />}>

// Skills tab
<Suspense fallback={<SkillsSectionSkeleton />}>

// More sub-sections
<Suspense fallback={<ListSectionSkeleton />}>
```

### Files changed
1. **New**: `src/components/editor/SectionSkeletons.tsx` -- all section-specific skeletons
2. **Modified**: `src/pages/EditorPage.tsx` -- swap generic `SectionSkeleton` for per-section variants
3. **No changes** to `PageSkeletons.tsx` (the generic `SectionSkeleton` stays available for any future use)

