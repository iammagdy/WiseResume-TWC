

## Mobile Responsiveness Fix: Form Inputs and Interactive Elements

### Overview

Optimize form fields, AI action buttons, navigation buttons, and floating elements for mobile touch interaction. All changes use Tailwind responsive prefixes and the existing `useIsMobile` hook. Desktop layouts remain completely unchanged.

### Changes

**File 1: `src/components/ui/form-field.tsx`**

Improve the `InputFormField` and `TextareaFormField` components for mobile touch comfort:

- **Labels**: Change from `text-sm` to `text-sm sm:text-sm font-semibold` (add `font-semibold` for better readability on mobile)
- **Input field wrapper spacing**: Change the root `space-y-1.5` to `space-y-2 sm:space-y-1.5` for more vertical breathing room on mobile
- **Character counter**: Add `text-xs` (already `text-sm`, reduce to `text-xs` on small screens) -- no position change needed since it's already in a flex row below the input
- **Textarea**: Add `min-h-[120px]` class on mobile to the Textarea component for better vertical space, keep existing `resize-none`
- **Clear button**: Already has `min-w-[48px] min-h-[48px]` -- no change needed (already meets 44px+ target)
- **Error messages**: Keep as-is (already well-styled with icon + text)

These are minor Tailwind class additions that affect both components uniformly.

**File 2: `src/components/ui/input.tsx`**

The base Input component already has `h-12` (48px) and `text-[16px]` -- no changes needed. Already meets all mobile requirements.

**File 3: `src/components/ui/textarea.tsx`**

The base Textarea already uses `text-[16px]` (prevents iOS zoom). Add a responsive minimum height:

- Add `min-h-[120px] sm:min-h-[80px]` to replace the current `min-h-[80px]`, giving textareas more vertical space on mobile

**File 4: `src/pages/EditorPage.tsx`**

Optimize the Previous/Next navigation buttons and bottom bar for mobile:

- **Nav buttons container** (line 648): Change from `gap-3` to `gap-2 sm:gap-3` and add `flex-col xs:flex-row` -- on very small screens (<480px), stack the Previous/Next buttons vertically as full-width buttons
- **Button height**: Change from `h-12` to `min-h-[56px] sm:h-12` on mobile for larger touch targets
- **ProofreadButton**: Change from `bottom-36` to `bottom-40 sm:bottom-36` and increase touch target from `w-12 h-12` to `w-14 h-14 sm:w-12 sm:h-12` on mobile for a 56px touch target

**File 5: `src/components/editor/ProofreadButton.tsx`**

Optimize the floating proofread FAB for mobile:

- Increase size from `w-12 h-12` to `min-w-[48px] min-h-[48px] w-12 h-12` (already 48px, which is good)
- Adjust position from `bottom-36 right-4` to `bottom-40 right-4 sm:bottom-36` to avoid overlap with the AI Studio bar on mobile
- No logic changes

**File 6: `src/components/editor/SectionCard.tsx`**

Minor mobile optimization for section card padding:

- Change content padding from `px-4 pb-4` to `px-3 sm:px-4 pb-4` to give slightly more horizontal space to form fields on very narrow screens (320px)

**File 7: `src/components/editor/InlineAIButton.tsx`**

The AI Assist button already has `min-h-[44px]` and the dropdown menu items have `min-h-[44px]` -- already meets touch target requirements. No changes needed.

### What Does NOT Change

- Form validation logic, Zod schemas, error handling
- Auto-save functionality and debouncing
- AI Assist, AIEnhanceDialog, AIContextualNudge features
- Character counting and maxLength enforcement
- Input/Textarea data binding and onChange handlers
- Desktop layouts (>=768px) -- identical behavior and appearance
- AIAssistantBar bottom bar functionality
- Keyboard shortcuts for desktop users
- Template switching and job matching features
- All sheet/modal functionality

### Technical Notes

- Uses Tailwind responsive prefixes (`sm:`) for all adjustments
- Input already uses `text-[16px]` which prevents iOS auto-zoom -- verified in both Input and Textarea base components
- Clear buttons already have 48px touch targets -- verified in form-field.tsx
- AI Assist menu items already have 44px minimum height -- verified in InlineAIButton.tsx
- Navigation buttons increase from 48px to 56px on mobile for one-handed comfort
- ProofreadButton repositioned to avoid AI Studio bar overlap on mobile

