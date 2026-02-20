

# Fix: Tailored CVs Showing in "My CVs" Tab + CV Name Overflow

## Problem 1: Tailored CVs appear in "My CVs" tab
The "My CVs" tab renders `ResumeGroup` components which include both the master resume AND its tailored versions nested underneath. This means tailored CVs show up in both tabs, confusing users.

## Problem 2: CV name overflows its container
The title row in `ResumeListCard` uses `flex-wrap` (line 226), which allows badges to wrap but also prevents the `truncate` on the title from working properly when the title is long combined with inline badges.

---

## Fix Plan

### File: `src/pages/DashboardPage.tsx` (lines 757-799)

**Change the "My CVs" tab to show only master resumes without their nested tailored versions.**

Currently, when a master has tailored versions, it renders a `ResumeGroup` (which expands to show tailored children). Instead, always render a plain `ResumeListCard` for masters -- no nested tailored versions. The tailored versions belong exclusively in the "Tailored" tab.

- Remove the conditional that checks `tailoredVersions.length > 0` and renders `ResumeGroup`
- Always render `ResumeListCard` for each master resume
- Also render orphaned tailored resumes (from `resumeHierarchy.orphanTailored`) in the "My CVs" tab since they have no parent

### File: `src/components/dashboard/ResumeListCard.tsx` (line 226)

**Fix the title overflow by removing `flex-wrap` from the title row and ensuring proper truncation.**

- Change the title row from `flex-wrap` to `overflow-hidden` so the title truncates correctly
- Ensure the title `h3` element has `min-w-0` so `truncate` works within a flex container
- Keep badges as `shrink-0` so they don't get squished

### Summary of Changes

| File | Change |
|---|---|
| `DashboardPage.tsx` | Replace `ResumeGroup` in "My CVs" tab with plain `ResumeListCard` for all masters; add orphaned tailored resumes |
| `ResumeListCard.tsx` | Fix title row flex layout to prevent name overflow |

