

## Consolidate Editor Header into Mobile ActionsPanel

### Overview

Replace the row of individual header buttons (Design, Preview, Wise AI) with a single compact trigger button on mobile that opens an "Editor Tools" ActionsPanel. On desktop (md+), keep the existing buttons visible.

### What Changes

**File: `src/pages/EditorPage.tsx`**

1. **Add import** for `ActionsPanel` and `ActionsPanelGroup` from `@/components/ActionsPanel`, plus additional icons (`Wand2` or `Sparkles`, `BarChart3`, `Target`, `Palette`, `Eye`, `MessageSquare`, `Clock`) -- most already imported.

2. **Build action groups via `useMemo`** (placed near the other memos, around line 460-480):

| Group | Title | Actions |
|-------|-------|---------|
| quick-actions | Quick Actions | Design (`Palette`, calls `handleCustomize`), Live Preview (`Eye`, toggles `setShowPreview`), Wise AI (`MessageSquare`, calls `setShowChat(true)`), Versions (`Clock`, calls `setShowVersionHistory(true)`, conditional on `user && currentResumeId`) |
| ai-features | AI Features | AI Enhance (`Sparkles`, calls `setShowTailor(true)`), Tailor to Job (`Target`/`Briefcase`, calls `handleTailor`), ATS Check (`BarChart3`, calls `setShowJobSheet(true)`), Proofread (`Scissors`, calls `handleProofread`) |

3. **Update the header right section** (lines 687-743):
   - Wrap existing buttons (Design, Live Preview, Wise AI) in `<div className="hidden md:flex items-center gap-1.5">` so they remain visible on desktop only.
   - Add a new `<div className="flex md:hidden">` containing the `ActionsPanel` with trigger:
     ```tsx
     <ActionsPanel
       trigger={
         <button className="rounded-full min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 active:scale-95 bg-primary/10 hover:bg-primary/15 touch-manipulation">
           <Sparkles className="w-5 h-5 text-primary" />
           <span className="text-[9px] font-medium leading-none text-primary">Tools</span>
         </button>
       }
       title="Editor Tools"
       groups={editorToolGroups}
     />
     ```

4. **No handler changes.** Every `onClick` in the groups calls the exact same existing functions (`handleCustomize`, `setShowPreview`, `setShowChat`, `setShowVersionHistory`, `setShowTailor`, `handleTailor`, `setShowJobSheet`, `handleProofread`).

### Visual Result

- **Mobile**: One "Tools" sparkle button in the header opens a full-width bottom panel with all editor actions grouped logically.
- **Desktop (md+)**: Existing Design, Live Preview, and Wise AI buttons remain visible as before -- no change to desktop experience.

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/EditorPage.tsx` | Add ActionsPanel import, build `editorToolGroups` memo, wrap existing header buttons in `hidden md:flex`, add mobile-only ActionsPanel trigger |

