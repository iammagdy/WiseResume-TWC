

## Add "Jump to Section" FloatingPanel to Settings Header

### Overview

Add a FloatingPanel trigger button in the Settings header (top-right) that opens a panel listing all settings sections. Tapping a section smoothly scrolls to it. The existing horizontal jump bar and all section rendering remain untouched.

### What Changes

**File: `src/pages/SettingsPage.tsx`**

1. **Add imports** for `FloatingPanelRoot`, `FloatingPanelTrigger`, `FloatingPanelContent` from `@/components/ui/floating-panel`, and the `Menu` icon from `lucide-react`.

2. **Add a scroll helper** function near the existing `scrollToTop`:
   ```text
   const scrollToSection = useCallback((sectionId: string) => {
     const el = scrollRef.current?.querySelector(`#${sectionId}`);
     el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
     haptics.selection();
   }, []);
   ```

3. **Update the header** (lines 273-284): Add the FloatingPanel trigger as a right-aligned button next to the title. The header layout changes from a simple left-aligned row to a `justify-between` row:

   - Left side: Back button + "Settings" title (unchanged)
   - Right side: FloatingPanel trigger with `Menu` icon

4. **FloatingPanel content**: Maps over the existing `SECTIONS` array to render a list of tappable rows, each showing the section icon and label. On click, calls `scrollToSection(section.id)`. Styled with `max-h-[80dvh]`, `overflow-y-auto`, `pb-safe`, and 44px min-height touch targets.

5. **Make header sticky**: Add `sticky top-0 z-10 backdrop-blur-xl` to the header so it stays visible while scrolling.

### Visual Result

- **Mobile**: A compact menu icon button in the header opens a bottom-anchored panel with all 7 sections listed vertically with their icons. Tapping scrolls to the section.
- **Desktop**: Same behavior -- the menu button is always visible as a quick-access alternative to the horizontal chip bar.

### Existing Logic Preserved

- `SECTIONS` array is reused as-is (no changes)
- Section DOM IDs (`section-appearance`, `section-ai-voice`, etc.) are unchanged
- `activeSection` tracking via IntersectionObserver is untouched
- Horizontal jump bar remains in place
- All section rendering stays identical

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/SettingsPage.tsx` | Add FloatingPanel imports, `scrollToSection` helper, update header with sticky positioning and FloatingPanel trigger |

