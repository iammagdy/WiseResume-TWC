# Phase 3 — Background Work Hygiene

**Last verified:** 2026-04-18
**Type:** reference card
**Sources:**
- `.local/tasks/phase-3-background-hygiene.md`
- `src/components/ai/AIHealthBadge.tsx` (~line 187, polling interval)
- `src/hooks/useActiveStatus.ts` (lines 30–45 — visibility pattern)
- `src/lib/pdfParser.ts` (lines 11–16, pdfjs worker config)
- `src/hooks/useResumeScore.ts`
- `project-governance/CHANGELOG.md` entry dated 2026-04-18 — Phase 3

**Canonical owner:** `.local/tasks/phase-3-background-hygiene.md` (task brief) + the listed sources (live truth).

---

**What it is:** Pauses background work when the tab is hidden, moves heavy compute (OCR, PDF text extraction) off the main thread, and debounces resume-scoring during typing — so the editor stays responsive and the platform stops spending AI quota and CPU when nobody is watching.

**Where it lives:** AI health badge component, OCR/PDF parser modules, and the resume-scoring hook.

**Key facts:**
- `AIHealthBadge` listens for `visibilitychange`; the 90-second AI-health interval is **cleared** while the tab is hidden and re-armed on focus. Pattern mirrors `useActiveStatus`. → `src/components/ai/AIHealthBadge.tsx:187`, `src/hooks/useActiveStatus.ts:30-45`
- `tesseract.js` initialization and recognition run inside a dedicated Web Worker; the main thread only posts the file/blob and receives extracted text + progress events. → `src/lib/pdfParser.ts` and the OCR worker module it wires up
- `pdfjs-dist` runs with its worker enabled; page-by-page extraction yields between pages so the main thread does not freeze on multi-page PDFs. → `src/lib/pdfParser.ts:11-16`
- `useResumeScore` debounced at 250–400ms — the heuristic only runs after the user pauses typing, with a "running…" indicator while debounced. → `src/hooks/useResumeScore.ts`
- Component-level `setInterval` / `setTimeout` audit: every usage in components has explicit cleanup in its effect's return. Server-side intervals already use `.unref()` and are out of scope.

**Related cards:** `./phase-2-frontend-rerender-and-bundle.md` (template re-render fixes — separate concern), `../critical-systems/02-ai-routing-chain.md` (AI health endpoint).
