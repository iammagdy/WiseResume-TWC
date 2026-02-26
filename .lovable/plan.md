
# Remove Proofreading Feature Entirely

## Overview
Remove the proofreading feature completely from the application, including dedicated files, edge function, and all references across the codebase.

## Changes

### Phase 1: Delete Dedicated Files (5 files + 1 edge function)

| File | Action |
|------|--------|
| `src/components/editor/ProofreadSheet.tsx` | Delete |
| `src/components/editor/ProofreadButton.tsx` | Delete |
| `src/hooks/useProofread.ts` | Delete |
| `src/store/proofreadStore.ts` | Delete |
| `src/types/proofread.ts` | Delete |
| `supabase/functions/proofread-resume/index.ts` | Delete + remove deployed function |

### Phase 2: EditorPage Cleanup (`src/pages/EditorPage.tsx`)
- Remove imports: `ProofreadSheet` (line 60), `useProofread` (line 81), `ProofreadButton` (line 82), `selectErrorCount`/`selectIssueCount` (line 86)
- Remove state: `showProofread` (line 238), `handleProofread` (line 774)
- Remove from `actionDescriptions` the `'proofread'` entry (line 790)
- Remove from quick actions array the proofread item (line 835) and from `useMemo` deps (line 839)
- Remove proofread hook usage block (lines 973-977)
- Remove `ProofreadSheet` JSX rendering (lines 1392-1405)

### Phase 3: AIStudioPage Cleanup (`src/pages/AIStudioPage.tsx`)
- Remove `ProofreadSheet` lazy import (line 54)
- Remove `'Proofread my resume'` from SUGGESTIONS (line 61)
- Remove `'Try: "Proofread my experience"'` from PLACEHOLDER_EXAMPLES (line 70)
- Remove `'Run Proofread after editing...'` from PRO_TIPS (line 76)
- Remove `proofread` tool entry from toolCategories (line 114)
- Remove `showProofread` state (line 190)
- Remove proofread case from tool action switch (lines 208, 270)
- Remove proofread from recommended tools logic (lines 424-425)
- Remove `ProofreadSheet` JSX (line 593)

### Phase 4: Settings Store (`src/store/settingsStore.ts`)
- Remove `autoProofread` from interface (lines 53-54), setter (line 86), default (line 127), and action (line 171)

### Phase 5: Supporting Components
| File | Change |
|------|--------|
| `src/components/editor/AIAssistantBar.tsx` | Remove `onProofread`, `proofreadIssueCount` props, proofread secondary tool entry, and related switch cases |
| `src/components/layout/CommandPalette.tsx` | Remove proofread command item (lines 83-86) and `SpellCheck` import |
| `src/components/layout/FeatureMapSheet.tsx` | Change "Smart Tailor, Proofread & Enhance" to "Smart Tailor & Enhance" (line 32) |
| `src/components/ai/CreditUsageSheet.tsx` | Remove `proofread: 'Proofread'` from CATEGORY_LABELS (line 22) |
| `src/components/settings/sections/AICreditsRow.tsx` | Change "Proofreading, Rewriting" to "Rewriting" in tooltip text (line 34) |
| `src/components/ai-studio/AIStudioTourModal.tsx` | Remove "Proofread" from description text (line 20) |
| `src/components/editor/AgenticChatSheet.tsx` | Remove "Proofread my resume" suggestion (line 46), remove `proofread_and_fix` label (line 67) |
| `src/components/store/MockScreens.tsx` | Remove Proofreader tool card (line 145) |
| `src/lib/aiCostEstimates.ts` | Remove `'proofread': 1` entry (line 6) |
| `src/lib/bugReport.ts` | Remove `'Proofread': 'ai'` from FEATURE_CATEGORY_HINTS (line 63) |

### Phase 6: Dashboard Tips (text-only, keep tips but reword)
| File | Change |
|------|--------|
| `src/components/dashboard/DailyTipCard.tsx` | Change "Proofread twice" tip to a different actionable tip (line 12) |
| `src/components/dashboard/DashboardStats.tsx` | Change "Proofread twice" tip to match (line 52) |
| `src/components/dashboard/WhatsNextCard.tsx` | Remove "Enhance/Proofread" comment text (line 141) |

### Phase 7: Config and Documentation
- Remove `[functions.proofread-resume]` block from `supabase/config.toml` (lines 60-61) -- note: this file is auto-managed, but the entry should be cleaned up
- Documentation files (`docs/APP_BLUEPRINT_FLUTTER.md`, `docs/REBUILD_PROMPTS_FLUTTER.md`, `docs/RECREATE_DOCS_PROMPT.md`) -- remove proofread references

### Phase 8: Deploy
- Delete the deployed `proofread-resume` edge function from production

## Summary
- **5 files deleted** (component, hook, store, types, edge function)
- **~15 files edited** to remove imports, state, JSX, and text references
- **1 edge function removed** from production
- No database changes needed
