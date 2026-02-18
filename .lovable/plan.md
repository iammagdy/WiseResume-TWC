

## Extend Command Palette with AI Actions

### Overview

Add a new "AI Tools" command group to the existing Cmd+K palette that lists every AI action from AI Studio. Selecting an AI action navigates to `/ai-studio` with a query parameter (e.g., `?tool=tailor`) that auto-opens the corresponding sheet on arrival.

### What Changes

**1. Add "AI Tools" group to `CommandPalette.tsx`**

A new `CommandGroup heading="AI Tools"` with entries for all AI features:

| Label | Icon | Navigation |
|-------|------|-----------|
| Smart Tailor | Wand2 | `/ai-studio?tool=tailor` |
| A/B Compare | GitCompareArrows | `/ai-studio?tool=ab-compare` |
| Job Match Analysis | Target | `/ai-studio?tool=job-match` |
| Proofread Resume | SpellCheck | `/ai-studio?tool=proofread` |
| AI Enhance | Sparkles | `/ai-studio?tool=enhance` |
| AI Detector / Humanize | Shield | `/ai-studio?tool=humanizer` |
| LinkedIn Optimizer | Linkedin | `/ai-studio?tool=linkedin` |
| One-Page Wizard | FileText | `/ai-studio?tool=onepage` |
| Recruiter Simulation | UserCheck | `/ai-studio?tool=recruiter` |
| Career Path Advisor | TrendingUp | `/ai-studio?tool=career` |
| Content Ideas | Lightbulb | `/ai-studio?tool=ideas` |
| Customize Design | Palette | `/ai-studio?tool=customize` |
| Wise AI Chat | MessageSquare | `/ai-studio?tool=chat` |
| Practice Interview | Mic | `/interview` (direct) |

**2. Handle `?tool=` query param in `AIStudioPage.tsx`**

Add a `useEffect` that reads `searchParams.get('tool')` on mount and auto-opens the matching sheet. The `searchParams` state is already imported but unused for this purpose. After opening, clear the param to prevent re-triggering on re-renders.

### Files to Modify

| File | Change |
|------|--------|
| `src/components/layout/CommandPalette.tsx` | Add AI Tools command group with ~14 entries using query-param navigation |
| `src/pages/AIStudioPage.tsx` | Add `useEffect` to read `?tool=` param and open the corresponding sheet state |

### Technical Details

**CommandPalette changes:**
- Import additional icons: `Wand2, Target, SpellCheck, Sparkles, Shield, Linkedin, UserCheck, TrendingUp, Lightbulb, GitCompareArrows, MessageSquare`
- All AI items use the existing `go()` helper which calls `navigate()` and closes the dialog
- Interview is the only one that navigates directly (`/interview`) since it's a standalone page

**AIStudioPage deep-link effect:**
- Reads `tool` from `searchParams` (already available via `useSearchParams`)
- Maps tool values to sheet state setters (e.g., `'tailor'` -> `setShowTailor(true)`)
- Calls `setSearchParams({}, { replace: true })` after opening to clear the param
- Runs only once on mount via a ref guard to avoid loops

