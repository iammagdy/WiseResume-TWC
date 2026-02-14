

## Grammar and Spell Checker (Mobile-First)

This feature adds an AI-powered proofreading layer on top of the existing editor. It uses a new edge function to check resume text and presents results through mobile-optimized bottom sheets and floating UI elements. No existing editor components are modified -- the checker runs as a parallel, non-blocking overlay.

---

### Architecture Overview

The grammar checker works as a **post-typing analysis layer**:
1. User types in the editor (existing flow, untouched)
2. A debounced hook collects all resume text and sends it to a new `proofread-resume` edge function
3. The edge function uses the Lovable AI gateway (no API key needed) to identify spelling, grammar, and style issues
4. Results are stored in a Zustand store and displayed via a floating "Proofread" button with error count badge
5. Tapping the button opens a bottom sheet with issues listed, navigable with prev/next buttons

---

### New Files to Create

**1. `supabase/functions/proofread-resume/index.ts`** -- Edge function
- Accepts `{ text: string, sections: { id: string, name: string, text: string }[] }`
- Uses `callAI` with `google/gemini-2.5-flash` (fast, cheap) to identify issues
- Returns structured JSON: `{ issues: ProofreadIssue[], score: WritingScore }`
- Each issue: `{ id, sectionId, type: 'spelling'|'grammar'|'style', original, suggestion, explanation, offset, length }`
- Writing score: `{ overall, spelling, grammar, style, tone: 'professional'|'casual'|'mixed' }`
- Rate limited: 10 requests per minute per user
- Max input: 50KB of text

**2. `src/hooks/useProofread.ts`** -- Core hook
- `useProofread(resume: ResumeData | null)` returns `{ issues, score, isChecking, checkNow, fixIssue, ignoreIssue, fixAll }`
- Debounced auto-check (2 second delay after typing stops, configurable)
- Cancels in-flight requests when user continues typing (AbortController)
- Caches results keyed by text hash to avoid re-checking identical content
- `checkNow()` for manual trigger (bypasses debounce)
- `fixIssue(id)` applies the suggestion to the resume via `updateResume()`
- `ignoreIssue(id)` removes from current session
- `fixAll()` applies all safe fixes (spelling corrections only, skips grammar/style)

**3. `src/store/proofreadStore.ts`** -- Zustand store (not persisted)
- State: `issues: ProofreadIssue[]`, `score: WritingScore | null`, `ignoredIds: Set<string>`, `isChecking: boolean`
- Actions: `setIssues`, `setScore`, `removeIssue`, `ignoreIssue`, `clear`
- Derived: `activeIssues` (filtered by ignored), `issueCount`, `errorCount` (spelling+grammar only)

**4. `src/components/editor/ProofreadSheet.tsx`** -- Bottom sheet (75% height)
- Writing score card at top (collapsible):
  - Overall score ring (0-100)
  - Breakdown bars: Spelling, Grammar, Style
  - Tone badge: Professional / Casual / Mixed
- Issue list below (scrollable):
  - Each issue card shows:
    - Type badge with color (red=spelling, blue=grammar, green=style)
    - Section name label (e.g., "Summary", "Experience - Google")
    - Original text with colored underline
    - 1-3 suggestion buttons (44px touch targets)
    - "Ignore" text button
  - Tap suggestion -> applies fix, haptic feedback, toast "Fixed", card animates out
- Empty state when no issues: checkmark animation + "Your resume looks great!"
- "Fix All Spelling" button in footer (fixes only spelling issues, safest)
- "Check Now" button if auto-check is disabled
- Prev/Next navigation arrows at bottom for stepping through issues

**5. `src/components/editor/ProofreadButton.tsx`** -- Floating action button
- Positioned bottom-right, above the AI Studio bar (bottom-36, right-4)
- Shows a small badge with error count (red for errors, blue if only style suggestions)
- Pulsing animation when new issues are found
- 48px touch target
- Tap opens ProofreadSheet
- Hidden when no issues and no active check
- `active:scale-95` + haptic on tap

**6. `src/types/proofread.ts`** -- TypeScript types
- `ProofreadIssue { id: string; sectionId: string; sectionName: string; type: 'spelling' | 'grammar' | 'style'; original: string; suggestions: string[]; explanation: string; offset: number; length: number }`
- `WritingScore { overall: number; spelling: number; grammar: number; style: number; tone: 'professional' | 'casual' | 'mixed' }`
- `ProofreadResult { issues: ProofreadIssue[]; score: WritingScore }`

---

### Files to Modify

**7. `src/pages/EditorPage.tsx`** -- Minor additions
- Import `useProofread` hook, pass `currentResume`
- Lazy import `ProofreadSheet` and `ProofreadButton`
- Add `showProofread` state
- Render `ProofreadButton` in the editor body (above AI Studio bar)
- Render `ProofreadSheet` in the Suspense/ErrorBoundary block
- Wire `fixIssue` callback to apply fixes via `updateResume()`

**8. `src/components/editor/AIAssistantBar.tsx`** -- Add "Proofread" tool
- Add new entry to `secondaryTools`: `{ id: 'proofread', icon: SpellCheck, label: 'Proofread', color: 'text-red-500' }`
- Add `onProofread` callback prop
- Wire click in `handleSecondaryAction` switch
- Show issue count badge on the tool button when issues exist

**9. `src/store/settingsStore.ts`** -- Add auto-check toggle
- Add `autoProofread: boolean` (default: `true`)
- Add `setAutoProofread: (value: boolean) => void`
- Add to `defaultSettings` and store actions

---

### Technical Details

**Text extraction for checking:**
- The hook extracts all text from `ResumeData`:
  - `contactInfo.name` (skip email/phone/url -- not prose)
  - `summary` (full text)
  - Each `experience[].description` + `experience[].achievements[]`
  - Each `education[].description`
  - `skills[]` are skipped (proper nouns / technical terms cause false positives)
- Each piece is tagged with its `sectionId` so fixes can be applied to the right field

**Fix application logic:**
- Spelling fix on summary: string replacement at offset
- Spelling fix on experience description: find the experience entry by ID, replace in description
- Spelling fix on achievement bullet: find the exact bullet, replace text
- All fixes go through `useResumeStore.getState().updateResume()` to trigger auto-save

**Performance safeguards:**
- 2-second debounce prevents checking during active typing
- AbortController cancels in-flight AI requests when new text arrives
- Text hash comparison skips re-checking identical content
- Edge function uses `gemini-2.5-flash` (fastest model) for low latency
- Issues are stored in memory only (not persisted) -- fresh check on each edit session

**Mobile optimizations:**
- ProofreadButton uses `touch-manipulation` and `active:scale-95`
- Bottom sheet uses 75% max height with drag handle
- Issue cards have 44px minimum touch targets for suggestion buttons
- Haptic feedback on fix application (`haptics.success()`)
- Toast notifications for applied fixes ("Fixed: [original] -> [suggestion]")
- Smooth card exit animation when issue is fixed

**Edge function prompt strategy:**
- The AI is prompted to return structured JSON with issues categorized by type
- It is instructed to be lenient with industry jargon and technical terms
- It scores resume-specific writing quality (action verbs, quantified achievements, professional tone)
- The `tone` field helps users understand if their language is appropriately professional

**No database changes needed** -- all proofreading state is ephemeral (in-memory only).

---

### Implementation Order

1. Create `src/types/proofread.ts` (types)
2. Create `supabase/functions/proofread-resume/index.ts` (edge function)
3. Create `src/store/proofreadStore.ts` (state management)
4. Create `src/hooks/useProofread.ts` (core logic)
5. Create `src/components/editor/ProofreadButton.tsx` (floating button)
6. Create `src/components/editor/ProofreadSheet.tsx` (results UI)
7. Update `src/store/settingsStore.ts` (auto-check toggle)
8. Update `src/components/editor/AIAssistantBar.tsx` (add Proofread tool)
9. Update `src/pages/EditorPage.tsx` (wire everything together)
10. Deploy edge function and test on 375px viewport

