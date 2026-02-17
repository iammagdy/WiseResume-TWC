

## Pipeline Analysis: Issues Found and Fixes

### Summary
After tracing through every recently-changed pipeline (ATS Suggestions, Deep Analyze, Public Portfolio PDF, and the editor integration), I found **3 issues** that need fixing and confirmed several areas are wired correctly.

---

### Issue 1: Wrong Supabase Client Import in `useATSSuggestions`

**File:** `src/hooks/useATSSuggestions.ts` (line 3)

**Problem:** The hook imports from `@/integrations/supabase/client` but the rest of the app consistently uses `@/integrations/supabase/safeClient`. The `safeClient` wrapper has error-recovery fallback logic for initialization failures. Using the raw `client` means the hook could fail silently if the environment variables are missing at init time.

**Fix:** Change the import to:
```typescript
import { supabase } from '@/integrations/supabase/safeClient';
```

---

### Issue 2: `isAnalyzing` State is Global, Not Per-Section

**File:** `src/hooks/useATSSuggestions.ts` (line 107)

**Problem:** `isAnalyzing` is a single boolean. If a user taps "Deep Analyze" on the Summary section, every `ATSInlineSuggestions` instance across all sections will show the spinner simultaneously (since `isAnalyzing` is passed to all 4 instances). Additionally, if a user quickly taps Deep Analyze on two sections, the first section's loading state will be cleared when the second finishes.

**Fix:** Change `isAnalyzing` from a single boolean to a `Set<string>` tracking which sections are currently analyzing:
```text
const [analyzingSections, setAnalyzingSections] = useState<Set<string>>(new Set());

// In fetchDeepSuggestions:
setAnalyzingSections(prev => new Set(prev).add(section));
// ...in finally:
setAnalyzingSections(prev => { const next = new Set(prev); next.delete(section); return next; });

// Return:
isAnalyzingSection: (section) => analyzingSections.has(section)
```

Then update `ATSInlineSuggestions` to receive `isAnalyzing` as a boolean derived from `isAnalyzingSection(section)` at the call site in EditorPage.

---

### Issue 3: Missing Error Toast in Deep Analyze Failure Path

**File:** `src/hooks/useATSSuggestions.ts` (line 214)

**Problem:** When `fetchDeepSuggestions` fails, it only does `console.error`. The user sees the spinner stop but gets no feedback about what went wrong. This is especially bad for 429/402 rate-limit errors from the edge function.

**Fix:** Add a toast notification in the catch block:
```typescript
catch (err) {
  console.error('Deep ATS analysis failed:', err);
  const msg = err instanceof Error ? err.message : 'Deep analysis failed';
  // Dynamic import to avoid circular deps
  import('sonner').then(({ toast }) => toast.error(msg));
}
```

---

### Verified: No Issues Found

| Pipeline | Status |
|----------|--------|
| Edge function `enhance-section` request body shape | Correct -- accepts `section`, `action`, `currentContent`, `context` |
| Edge function `ats_optimize` action validation | Correct -- listed in `VALID_ACTIONS` |
| `deepResults` state + `clearDeepResult` wiring in EditorPage | Correct -- all 4 sections pass `deepResult`, `onApplyDeep`, `onDiscardDeep` |
| `handleApplyDeep` section-to-field mapping | Correct -- covers all section types with type guards |
| `resumeStore.updateResume` sanitization | Correct -- sanitizes `experience`, `education`, `skills` arrays |
| `renderEditorContent` dependency array | Correct -- includes all new deps |
| Badge `glass` variant | Correct -- exists in badge component |
| `haptics` module API (`.light()`, `.medium()`, `.success()`) | Correct -- all methods exist |
| `ATSScanSheet` props and lazy import | Correct |
| Public Portfolio PDF: `generatePDF` signature match | Correct -- `(resume, templateId, element, undefined, options)` |
| Public Portfolio: `usePublicPortfolio` hook `templateId` mapping | Correct |
| `downloadFile` utility usage | Correct |

---

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useATSSuggestions.ts` | Fix import to `safeClient`, make `isAnalyzing` per-section, add error toast |
| `src/components/editor/ATSInlineSuggestions.tsx` | No changes needed (already receives `isAnalyzing` as a prop) |
| `src/pages/EditorPage.tsx` | Update `isATSAnalyzing` usage to call per-section check at each `ATSInlineSuggestions` |

No database changes or new files required.

