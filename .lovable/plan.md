
# Editor Header + Space Fix: Two Focused Changes

## The Two Problems

### Problem 1 — Header has both "Template" + "Tools" buttons on mobile (taking up space + causing confusion)
The user wants: remove "Tools", replace with a "Chat" button that goes **directly** to the Wise AI chat (not a tools menu).

Currently on mobile (lines 994–1061):
- Button 1: "Template" → opens template gallery (keep this)
- Button 2: "Tools" → opens a bottom sheet with a full tools menu (REPLACE THIS with "Chat")

### Problem 2 — The top area on mobile takes too much vertical space, leaving the editor cramped
Looking at the screenshot and the code, the chrome above the editor content consists of:

1. **Header** (`py-3`) — title, back button, undo/redo, Template + Tools buttons → ~60px
2. **Progress Bar section** (`py-3` with `mb-1`, plus a `<details>` disclosure) → ~60-70px
3. **Tailored Resume Indicator Banner** (conditional, ~36px min-height) → ~36px
4. **StepperNav** (section tabs with scroll) → ~56px
5. **Editor/Preview TabsList** (sticky) → ~44px

That's ~5 layers of chrome before the editor content even starts. On a 375px phone with a 56px bottom bar, the editor gets maybe 180-200px of space.

**Fix strategy — compact the progress bar section on mobile:**
- Change `py-3` → `py-1.5` on the progress bar container
- Move the "Last saved" status inline with the progress bar (on one row instead of two rows) on mobile
- Make the `<details>` disclosure for ATS breakdown **hidden on mobile** (accessible via the StepperNav or a dedicated button) — this alone removes ~20px
- Reduce `py-1.5` on the tailored banner to `py-1`
- Change StepperNav container from `shrink-0` (no padding) — it already has internal padding in the component, no change needed

Let me be precise about what changes and what the pixel savings are:

**Exact changes:**

**Change A: Progress bar container** (`px-4 py-3 border-b border-border` → `px-4 py-1.5 border-b border-border`)
- Saves ~12px (top+bottom padding from 12px each → 6px each)

**Change B: Progress bar flex direction** — on mobile the save status goes on the same row as the progress bar, not a column:
- Change `flex flex-col sm:flex-row` → `flex flex-row flex-wrap` so they're always on one line
- This collapses the "Last saved · X ago" from a second row to inline

**Change C: ATS score breakdown `<details>` — hide on mobile:**
- Wrap the `<details>` in `hidden sm:block` so it doesn't take up space on mobile phones
- The ATS score is accessible in the Resume Detail page, so this isn't a loss

**Change D: Tailored banner** — reduce padding `py-1.5` → `py-1` (saves 4px)

**Change E: Editor/Preview tabs** (`TabsList`) — the sticky tabs are fine but the `mt-2` on `TabsContent` can be removed (it already has `mt-0`)

**Total savings: ~30-40px** = significantly more editor real estate on a phone

---

## Changes Summary

### File 1: `src/pages/EditorPage.tsx`

**Change 1a — Replace "Tools" button with "Chat" button** (lines 1005–1012):

```tsx
// BEFORE:
<button
  onClick={() => { haptics.light(); setShowToolsSheet(true); }}
  className="rounded-full min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 active:scale-95 bg-primary/10 hover:bg-primary/15 touch-manipulation"
  aria-label="Editor tools"
>
  <Sparkles className="w-5 h-5 text-primary" />
  <span className="text-[9px] font-medium leading-none text-primary">Tools</span>
</button>

// AFTER:
<button
  onClick={() => { haptics.light(); setShowChat(true); }}
  className="rounded-full min-w-[48px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 active:scale-95 bg-primary/10 hover:bg-primary/15 touch-manipulation animate-[pulse-glow_2s_ease-in-out_infinite]"
  aria-label="Open Wise AI Chat"
>
  <span className="relative">
    <MessageSquare className="w-5 h-5 text-primary" />
    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
  </span>
  <span className="text-[9px] font-medium leading-none text-primary">Chat</span>
</button>
```

The `Sheet` block for `showToolsSheet` (lines 1013–1060) gets **removed** — it becomes dead code since no button triggers it anymore. The `setShowToolsSheet` state can be left (it's also used internally nowhere else on mobile — tools were only accessible via this button). Actually we should keep the state so the `editorToolGroups`/`toolMeta` don't break, but the Sheet itself can be removed from the JSX.

**Change 1b — Compact the progress bar section on mobile** (lines 1067–1138):
- `px-4 py-3` → `px-4 py-1.5 sm:py-3`  
- `flex flex-col sm:flex-row sm:items-center` → `flex flex-row flex-wrap items-center` (always one row)
- Wrap the `<details>` (lines 1116–1137) in `<div className="hidden sm:block">` so it only shows on tablet/desktop

**Change 1c — Compact the tailored banner** (line 1142):
- `py-1.5` → `py-1` on the tailored indicator banner

---

## What is NOT Changed

- Template button — stays exactly as-is
- `showToolsSheet` state variable — kept (editorToolGroups/toolMeta still reference it, no issue leaving the state)
- The tools Sheet JSX is removed from the render tree (no button triggers it so it's dead code, but removing it is clean)
- Desktop layout — completely untouched (the `hidden md:flex` group at lines 944–993 keeps the full "Template / Design / Live / Wise AI" buttons)
- `AgenticChatSheet` — no change, still rendered at line 1273
- All other sheets, StepperNav, editor content — untouched
- Mobile Editor/Preview tabs — untouched
