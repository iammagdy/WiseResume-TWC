> [!CAUTION]
> Historical / archived document. Do not treat as current project truth. Use Project Atlas/SOURCE_OF_TRUTH_MAP.md and living specs for current references.

# One-Page Wizard — Analysis & Improvement Report

**Scope reviewed**
- UI: `src/components/editor/ai/OnePageWizardSheet.tsx`
- Backend: `supabase/functions/one-page-optimizer/index.ts`
- Call sites: `src/pages/PreviewPage.tsx`, `src/pages/EditorPage.tsx`, `src/pages/AIStudioPage.tsx`
- Routing config: `Routing AI Providers/04-feature-routing-map.md`
- Cost map: `src/lib/aiCostEstimates.ts` (1 credit per run)

---

## TL;DR

The One-Page Wizard is **functional and shipped**, but it’s the weakest of the three AI flows you’ve been hardening. The UX shell looks good and the edge function is structurally sound (auth, rate limits, credit refund on failure, AI fallback chain), but there are **real bugs** that will bite real users:

- **Bug #1 (P1, broken feature):** “Apply & Download One-Page PDF” button is **only wired in PreviewPage**. In **Editor** and **AI Studio**, clicking it silently does nothing for the download step — users see “Changes applied!” and an unfulfilled promise.
- **Bug #2 (P1, factual lie):** Even after applying changes, the page count is **predicted by the AI**, never **measured**. The success badge says “2 → 1 page” without verifying the rendered template actually fits.
- **Bug #3 (P2, no rollback):** Apply mutates the resume in place with no undo, no diff/preview, no version snapshot. There is no way back if the user dislikes the result.
- **Bug #4 (P2, AI can drop data):** The condense step rewrites `experience.description` and `experience.achievements` for matched IDs only. If the model returns fewer items or invents new IDs, content is silently lost or ignored. There’s no schema validation of the AI response.
- **Bug #5 (P3, misleading visualization):** The `Progress` bar shows `1 / currentEstimatedPages * 100` for “before vs after” — that’s a meaningless ratio, not a reduction visualization.

Beyond the bugs, the feature is missing the things modern resume builders compete on: **WYSIWYG diff**, **per-section opt-in**, **per-template aware compression**, and **layout-side levers** (font size, margins, line height) before rewriting copy.

**Verdict:** Good bones, half-finished feature. ~2 days of focused work would move it from “demo-quality” to “best-in-class.”

---

## 1. What it does today

### Flow
1. User opens the sheet from Editor / Preview / AI Studio (lazy-loaded).
2. **Preview state** — explains the strategy, shows a “2 most recent jobs preserved” promise.
3. **Analyze** posts the full resume to the `one-page-optimizer` edge function:
   - Auth required, rate-limited (10 req / 60 s, both client + server table), payload capped at 100 KB.
   - Estimates current page count from a character-density heuristic (`charCount / 3000`).
   - **Short-circuit**: if already ≤ 1 page, returns a no-op success without calling the model.
   - Otherwise, deducts 1 credit, calls the AI fallback chain, and refunds on parse/AI failure.
4. **Results state** — shows page-count badge, strategy text, list of reductions, list of removed items, layout tips.
5. **Apply** — overwrites `summary`, and merges `description` + `achievements` per experience by ID.
6. **Apply & Download** — applies changes, then (in PreviewPage only) triggers `handleExport('one-page', true, true)`.

### Strengths
- Loading / analyzing / results state machine is clean.
- Edge function is properly hardened (auth → rate limit → payload cap → credit gate → AI → refund-on-fail).
- AI provider routing already supports the `auto` chain (Gemini → OpenRouter → Groq) per `04-feature-routing-map.md`.
- Lazy-loaded across all three entry points (no bundle hit until opened).
- AIProviderVia badge keeps user informed which engine ran the job.
- Sheet correctly unmounts when closed (`{showOnePage && <…>}`).

---

## 2. Bugs found (ranked)

### 🔴 P1 — “Apply & Download One-Page PDF” is dead in 2 of 3 entry points

**Where:** `src/pages/EditorPage.tsx:1072` and `src/pages/AIStudioPage.tsx:712` instantiate the sheet **without** the `onExportOnePage` callback. PreviewPage is the only page that wires it.

```tsx
// EditorPage.tsx (BROKEN)
{showOnePage && <OnePageWizardSheet open={showOnePage} onOpenChange={setShowOnePage} />}

// PreviewPage.tsx (correct)
<OnePageWizardSheet
  open={showOnePageWizard}
  onOpenChange={setShowOnePageWizard}
  onExportOnePage={() => requestAnimationFrame(() => requestAnimationFrame(() =>
    handleExport('one-page', true, true)))}
/>
```

In the sheet:
```tsx
const handleApplyAndDownload = async () => {
  applyCondensedChanges();
  toast.success('Changes applied! Generating one-page PDF...');
  onOpenChange(false);
  onExportOnePage?.();   // ← undefined in Editor + AI Studio: silent no-op
};
```

**User impact:** The toast says “Generating one-page PDF…” and absolutely nothing happens. This is the worst kind of bug — silent success theater.

**Fix:** Wire `onExportOnePage` everywhere (or surface a single export hook from the resume store).

---

### 🔴 P1 — Page-count claim is fabricated by the model, not measured

`optimizedEstimatedPages: 1` is **literally hard-coded into the prompt** (`one-page-optimizer/index.ts:130`), and `currentEstimatedPages` is the rough char-count heuristic. After the user applies changes, **nothing checks if the resume actually fits one page** in the chosen template. Different templates have wildly different densities (Modern vs Classic vs Compact ATS).

**User impact:** UI proudly shows “2 → 1 page” and user downloads… a 2-page PDF. Trust killer.

**Fix options:**
1. After Apply, render the merged resume off-screen with the active template (you already do this for the Tailor PDF flow) and run a real overflow check via the same logic the `download-as-one-page` path uses.
2. If still > 1 page, show a non-blocking warning + offer to (a) re-tighten with the wizard or (b) auto-shrink margins / font-size by `1pt` increments.

---

### 🔴 P1 — No schema validation of AI response → silent data loss

`parseAIJSON` returns whatever JSON the model emits. The handler does `{ success: true, ...result }` and ships it. The client trusts it blindly:

```tsx
updatedResume.experience = currentResume.experience.map(exp => {
  const condensed = result.condensedExperience.find(c => c.id === exp.id);
  if (condensed) {
    return { ...exp, description: condensed.description, achievements: condensed.achievements };
  }
  return exp;            // ← dropped/missing IDs leave original untouched
});
```

Failure modes that silently happen today:
- Model omits one experience → original kept (looks like nothing was condensed for that role).
- Model returns `achievements: []` → user’s achievements are wiped.
- Model returns wrong / hallucinated `id` → that condensed entry is silently discarded.
- Model returns stringified JSON inside `description` → renders as raw braces.

**Fix:** Add a Zod (or tiny manual) schema validator on the edge function. On schema fail, refund the credit and return a typed error `{ code: 'invalid_ai_response' }` for the UI to show a real error instead of a “success”.

---

### 🟠 P2 — No undo, no version snapshot, no draft mode

`applyCondensedChanges()` mutates the live resume via `updateResume(...)`. There is **no automatic snapshot, no “revert,” no comparison view** — and the diff is not even shown side by side. (Compare with the Tailor flow, which keeps the original and offers a Compare sheet.)

**User impact:** Once applied, the only “undo” is to manually retype lost achievements.

**Fix:**
- Save a snapshot to `resume_versions` (you already have versioning infra used by Tailor) right before `updateResume`, so users can roll back.
- Render an inline before/after diff in the Results state, or reuse the existing `CompareSheet`.

---

### 🟠 P2 — No per-section opt-in / opt-out

Every reduction is all-or-nothing. A user who likes the new summary but wants to keep their original 2014 job description can’t get just the summary applied.

**Fix:** Per-card checkboxes (default on), and `applyCondensedChanges()` uses only the checked diffs.

---

### 🟡 P3 — Misleading progress bar

```tsx
<Progress value={(1 / result.currentEstimatedPages) * 100} className="h-2" />
```

For a 3-page resume this draws a 33% bar with “Before → After” labels. It doesn’t represent reduction (which would be `(current-optimized)/current * 100`); it represents the optimized fraction of the current. Visually it suggests “you’re only 33% done.”

**Fix:** Show two stacked bars (Before, After) or replace with a `% reduction` label + delta.

---

### 🟡 P3 — Removed-item rendering relies on `as any` fallbacks

```tsx
<p title={item.item || (item as any).name || (item as any).title || ''}>
  {item.item || (item as any).name || (item as any).title || JSON.stringify(item)}
</p>
```

This is defensive code papering over the schema-validation gap. If the model returns `{ name: "..." }` instead of `{ item: "..." }`, the user sees the JSON dump fallback. Once the validator from Bug #3 is in place, these casts can go away.

---

### 🟡 P3 — `currentResume` is read once at sheet open; not refetched

If the user edits the resume in another tab while the wizard is open and then hits Apply, the wizard merges into a stale state. Low impact for most users, but a real footgun for the “open multiple tabs” cohort.

**Fix:** Re-pull `currentResume` from the store inside `applyCondensedChanges()` (it already is, via `useShallow`, but ensure the merge is computed against fresh data).

---

### 🟢 P4 — Polish nits

- Footer “Apply Changes Only” button is below the primary “Apply & Download” — that ordering implies download is always desired. For users in Editor (where download isn’t the next step), the order is backwards.
- `Cancel` after Apply does not actually undo — it just closes the sheet. Label is misleading.
- `targetRole` and `yearsOfExperience` are accepted by the edge function but **never sent from the UI**. Free signal lost.
- The `condensedExperience` payload returns full `description` + `achievements` arrays per kept experience, but the UI doesn’t show them in the diff. Users have to apply blind.
- Page-count heuristic uses 3000 chars/page — a `Modern` template fits ~2200, `Compact` fits ~3500. One global constant is too coarse.
- No empty-state for resumes with no `experience` (the prompt assumes there is some).

---

## 3. Quality assessment by dimension

| Dimension              | Score | Notes |
|------------------------|-------|-------|
| **Functional correctness** | 5 / 10 | Apply & Download broken on 2/3 pages; page-count claim unverified; AI response untyped. |
| **Reliability**         | 7 / 10 | Edge function is well-hardened; refunds on AI/parse failure; rate-limited. |
| **UX**                  | 6 / 10 | Pretty shell, decent state machine, but no diff, no per-section toggle, misleading progress, no undo. |
| **Trust & honesty**     | 4 / 10 | Says “2 → 1 page” without checking; says “Generating PDF…” without generating. |
| **Performance**         | 8 / 10 | Lazy-loaded; payload caps; one AI call per run. |
| **Security**            | 8 / 10 | Auth + RLS + payload cap + sanitizeInputText; nothing concerning. |
| **Cost discipline**     | 8 / 10 | 1 credit, refunded on failure, short-circuits if already 1 page. |
| **Observability**       | 6 / 10 | Console.error on UI failure; logger on backend; no metrics on “did the rendered output actually become 1 page?” |

---

## 4. Recommended improvements (prioritized)

### 🔥 Sprint-1 (must-fix to call the feature finished)

1. **Wire `onExportOnePage` in EditorPage and AIStudioPage** so the headline button isn’t a lie. Pull the export handler into a reusable hook (`useResumeExport`) and call it from all three pages.
2. **Validate the AI response with a Zod schema** in the edge function. On schema fail: refund credit, return `{ code: 'invalid_ai_response' }`, and let the UI surface a real error toast.
3. **Snapshot before Apply** into `resume_versions` and add an “Undo last condense” affordance (toast action that reverts the last snapshot).
4. **Measure pages after Apply.** Reuse the same template-render-then-paginate logic the export pipeline uses; if still > 1, warn instead of celebrating.

### 💪 Sprint-2 (true product upgrades)

5. **Per-section diff & opt-in.** Each reduction/removal becomes a card with a checkbox and a side-by-side before/after; Apply only applies checked items.
6. **Layout levers first, copy edits second.** Before rewriting words, try the cheaper, lossless options:
   - tighten margins (1.0" → 0.6"),
   - drop body font 11pt → 10pt,
   - tighten line-height,
   - collapse 2-line headers.
   Show the user how much page space each lever buys, *then* offer AI rewrites.
7. **Template-aware page estimation.** Replace `chars/3000` with a per-template constant (or a one-shot off-screen render measure).
8. **Pass `targetRole` from active job context** (if user has a current Application/Job linked) so the model condenses with relevance in mind.
9. **Per-card actions** — “Apply this one” / “Skip” / “Edit before applying.”

### ✨ Sprint-3 (delight)

10. **Live mini-preview** in the Results state showing the condensed resume rendered in the active template (you already have `templateComponents` registry — render at 0.4× scale on the right panel).
11. **Comparison sheet** reuse — drop users into the existing `CompareSheet` after analysis, like the Tailor flow does. Consistency wins.
12. **"Why this was removed" tooltip on every reduction** — the model already returns `reason`/`strategy`; surface them on hover, not just inline text.
13. **Streaming progress** — replace the indeterminate `MiniSpinner` with a 3-stage progress bar (analyzing → condensing → finalizing). The model takes 8–20 s; users will read the bar.
14. **Telemetry** — log `pages_before`, `pages_after_predicted`, `pages_after_measured`, `applied`, `downloaded`. Surface aggregate accuracy in DevKit so you can tune the prompt.
15. **A/B with template suggestion** — if a template change alone would solve the page overflow (e.g. switching to `Compact ATS`), suggest *that* before condensing copy.

---

## 5. Suggested issue list (copy-paste ready)

```
[P1] OnePageWizard: Apply & Download is a no-op in EditorPage and AIStudioPage
[P1] OnePageWizard: page-count claim is unverified — measure rendered output
[P1] OnePageWizard: validate AI response shape, refund credit on schema failure
[P2] OnePageWizard: snapshot resume to versions table before Apply; add Undo
[P2] OnePageWizard: add per-section opt-in + before/after diff
[P3] OnePageWizard: replace misleading "Before→After" Progress bar with reduction delta
[P3] OnePageWizard: send targetRole/yearsOfExperience from active job context
[P3] OnePageWizard: template-aware page estimation
[P4] OnePageWizard: re-order footer buttons in Editor entry; clarify "Cancel" copy
```

---

## 6. Bottom line

The One-Page Wizard *looks* finished but is structurally **half-shipped**. The two P1 truth-bugs (the dead Download button and the unverified page-count) directly damage trust the moment a user actually runs it. Fix those four Sprint-1 items and you get a feature that no longer embarrasses the rest of the AI suite. Then Sprint-2 turns it into something genuinely better than competitors who only do AI copy edits — because **layout levers + AI condensation + measured outcome** is a combination none of the big resume builders ship today.
