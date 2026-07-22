# Feature Specification: Resume Editor

**Last Verified:** 2026-07-22
**Status:** Active Production Feature - Phase 2 Startup Verified
**Location:** `Project Atlas/features/resume-editor.md`

---

## 1. User Goal

Provides job seekers with a real-time resume builder for personal details, work history, education, skills, projects, and custom sections, with live preview, autosave, template selection, exports, and AI-assisted content tools.

---

## 2. Routes and Navigation

* `/editor?id=<resumeId>` - Canonical Editor route.
* `/editor?resumeId=<resumeId>` - Supported compatibility query parameter.
* `/editor` without a query ID falls back to the persisted current/default resume only after store hydration.
* When the URL includes a target, it takes precedence over persisted Editor state.

---

## 3. Main Frontend Files

* `src/pages/EditorPage.tsx` - Editor container, readiness gates, state coordination, loading/failure states, and feature controls.
* `src/hooks/useResumes.ts` - Resume list/document React Query hooks and Appwrite document normalization.
* `src/lib/editorResumeStartup.ts` - Route-first target resolution, matching-document confirmation, request timeout, and slow-loading threshold.
* `src/store/resumeStore.ts` - Persisted current resume ID/data and editable resume state.
* `src/lib/editorSession.ts` - Per-resume Editor session restoration helpers.
* `src/components/editor/EditorScrollForm.tsx` and `EditorSectionContent.tsx` - Desktop/mobile section form orchestration.
* `src/components/editor/LivePreviewPanel.tsx` - Live resume preview.
* `src/hooks/useEditorAutosave.ts` - Debounced persistence for the confirmed current resume.

---

## 4. Backend and Data

* **Functions:** `ai-gateway` for AI editing actions. Editor startup does not require an AI function call.
* **Collections:** `resumes`, with owner validation preserved through the existing Appwrite/Auth data layer; `profiles` is related but does not gate requested-resume readiness.
* **Storage:** `avatars` and resume asset buckets where applicable.
* The requested resume document is the critical startup record. The full resume library, metrics, AI credits, activity data, and optional preview enhancements are not Editor startup prerequisites.

---

## 5. Startup and Readiness Contract

The Editor becomes editable only after all of the following are available:

1. authenticated user session;
2. normalized resume ID from `?id=` or `?resumeId=`;
3. Appwrite document for that exact ID;
4. ownership-confirmed, normalized editable resume state.

Rules:

* The route ID is the first-render React Query key; Editor must not wait for a passive store-sync effect or the full resume list.
* Persisted Zustand data is usable only when its ID matches the route target and the requested document has been confirmed for the authenticated owner.
* Stale data from a previous resume must be treated as unavailable by rendering, autosave, preview, and Editor effects.
* A stable resume ID emits one React Query document request; rerenders reuse the query/cache. Route switching issues one request for each distinct target.
* The readiness-critical document request is bounded at `5,000 ms` and disables automatic retries. Retry is an explicit user action.
* A true Appwrite not-found response is distinct from timeout or temporary network failure.
* Loading UI appears immediately. The copy changes from `Loading resume...` to `Still loading your resume...` after `2,500 ms`.
* Timeout/network failure offers Retry and Dashboard actions without creating, overwriting, or exposing another resume.
* The old eight-second Editor redirect is removed; unresolved startup cannot race an unrelated Dashboard redirect.

---

## 6. Current Behavior

* Form fields update the confirmed current resume in real time and retain the existing debounced Appwrite autosave semantics.
* Preview receives the same confirmed resume identity used by the Editor fields.
* Supports section reordering, custom bullet formatting, template switching, AI editing controls, and PDF/DOCX exports.
* Default resume template is `wiseresume-classic`.
* Mobile AI actions retain minimum 44px touch targets and textareas auto-grow based on content height.

---

## 7. Verification and Known Risks

* Phase 2 production verification: five warm hard refreshes reached interactive inputs/Preview in `1.434-2.400 s`, median `1.653 s`; one cold post-deployment run took `4.427 s`.
* Switching between two production resumes never rendered the previous resume while the target loaded.
* Autosave and Preview persistence were verified with a harmless marker, then the marker was removed and the blank resume state was confirmed after refresh.
* Integration tests prove document-request deduplication, but exact production Appwrite request count is `UNKNOWN` because the selected browser backend did not expose a request timeline.
* Unsaved offline edits continue to use the existing Appwrite `$updatedAt` collision guards; Phase 2 did not alter offline synchronization or persistence semantics.
* See `Project Atlas/reports/performance/performance-phase-2-editor-remediation-2026-07-22.md` for detailed evidence.

---

## 8. Historical Evidence and Reports

* [`Project Atlas/reports/performance/performance-phase-2-editor-remediation-2026-07-22.md`](../reports/performance/performance-phase-2-editor-remediation-2026-07-22.md) - Current Editor startup remediation and production evidence.
* [`Project Atlas/reports/audits/2026-04-22-editor-page-control-and-crash-audit.md`](../reports/audits/2026-04-22-editor-page-control-and-crash-audit.md) - Historical Editor crash audit.
* [`Project Atlas/reports/ui-ux-audit-2026-06-22/03_PAGE_BY_PAGE_FINDINGS.md`](../reports/ui-ux-audit-2026-06-22/03_PAGE_BY_PAGE_FINDINGS.md) - Historical page findings.
