

# AI Studio Cleanup & Enhancement

## Overview
Clean up the AI Studio page and AIHubSheet by removing non-AI tools and dead placeholders, then add credit cost badges to every tool card so users know the cost before clicking.

## Changes

### 1. Remove non-AI tools from AI Studio page
In `src/pages/AIStudioPage.tsx`:
- Remove **"Ideas"** (id: `ideas`) from the `toolCategories` "Create" section -- it's static content, not AI
- Remove **"Customize"** (id: `customize`) from the "Create" section -- it's design/layout, not AI
- Remove the lazy imports for `ContentLibrarySheet` and `CustomizeSheet`
- Remove the `showContentLibrary` and `showCustomize` state variables
- Remove the corresponding sheet renders and deep-link entries
- Remove the `handleSecondaryAction` cases for `ideas` and `customize`

### 2. Remove "Coming Soon" placeholders from AIHubSheet
In `src/components/editor/AIHubSheet.tsx`:
- Remove the entire **"Competitive Edge"** section's **Salary Coach** tile (dead button)
- Remove the entire **"Learning"** section with **Reverse Engineer** and **Rejection Analyzer** tiles (dead buttons)
- Remove the unused props: `onSalaryNegotiator`, `onReverseEngineer`, `onRejectionAnalyzer`
- Remove unused imports: `DollarSign`, `Users`, `MessageCircle`

### 3. Add credit cost badges to AI Studio tool cards
In `src/pages/AIStudioPage.tsx`:
- Add a `cost` field to each tool in `toolCategories` mapping to the operation key from `AI_COST_MAP`
- Import and render `AICostBadge` inside each tool card (both featured tools and secondary grid tools)
- Featured tools get the badge next to the description text
- Secondary grid tools get a small badge below the label

**Credit mapping per tool:**
| Tool | Operation Key | Credits |
|------|--------------|---------|
| Smart Tailor | `tailor` | 2 |
| Job Match | `score` | 1 |
| A/B Compare | `score` x2 | 2 |
| Proofread | `proofread` | 1 |
| Enhance | `enhance` | 1 |
| 1-Page | `one-page` | 1 |
| Career | `career-assessment` | 2 |
| Interview | `interview` | 1 |
| Recruiter | `recruiter-sim` | 2 |
| LinkedIn | `linkedin` | 1 |
| Humanize | `detect-humanize` | 1 |
| Briefing | `company_briefing` | 1 |

### 4. Add credit cost badges to AIHubSheet tiles
In `src/components/editor/AIHubSheet.tsx`:
- Import `AICostBadge` and add it to the Essential tiles (Smart Tailor, Job Match, AI Enhance)
- Add it to the Recruiter Sim tile (keeping the "New" badge, adding cost below)

## Files Modified

| File | Change |
|------|--------|
| `src/pages/AIStudioPage.tsx` | Remove Ideas/Customize tools, add credit badges to all tool cards |
| `src/components/editor/AIHubSheet.tsx` | Remove 3 dead placeholder tiles and unused props, add credit badges |
| `src/lib/aiCostEstimates.ts` | No changes needed -- existing map covers all tools |

## What stays unchanged
- All Tier 1-3 AI tools remain functional
- The Agentic Chat section is untouched
- The Featured Tools section keeps Smart Tailor, A/B Compare, and Job Match
- Deep-link support for remaining tools stays intact

