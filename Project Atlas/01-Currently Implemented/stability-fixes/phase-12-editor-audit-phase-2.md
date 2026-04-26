# Phase 12 — Editor audit Phase 2: keyboard context split, layout cleanup, label fixes, DEV-only logger

**Last verified:** 2026-04-26
**Type:** stability fix
**Sources:**
- `src/context/KeyboardContext.tsx` (split state/dispatch + `_hasProvider` sentinel)
- `src/lib/editorLogger.ts` (DEV-only warn/error logger)
- `src/components/editor/AwardsSection.tsx` (P1-6 label/htmlFor fixes)
- `src/components/editor/ProjectsSection.tsx` (P1-6 label/htmlFor fixes)
- `src/pages/EditorPage.tsx` (MobileLayout removal call site)
- `public/changelog.json` (v3.6.3 in-app release note)
- `package.json` (version `3.6.3`)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §3 (Frontend boot + state lifecycle)

---

## Why it exists

A focused audit of the editor's component layer found four categories of P1-P6 issues that had accumulated since the initial build:

1. **KeyboardContext single-context anti-pattern (P1).** The original `KeyboardContext` exported one combined object containing both state and the setter function. Any component that only needed to *read* keyboard state (e.g. to adjust scroll offset when the virtual keyboard opens) was forced to subscribe to a context value that included a mutable function reference, causing re-renders that had nothing to do with the keyboard actually opening or closing. Additionally, components outside the provider silently received the default `{ isOpen: false, height: 0 }` with no way to distinguish "no keyboard" from "provider not mounted yet" — a footgun for unit-test isolation and conditional rendering.

2. **Redundant MobileLayout wrapper (P2).** A `MobileLayout` component wrapping the mobile editor path had become a no-op shell after earlier refactors — it added a DOM node and a React reconciliation boundary but applied no layout logic of its own. Its presence caused occasional flicker and double-scroll on smaller screens when the wrapper and its children had conflicting flex/overflow settings.

3. **Unlinked form labels in Awards and Projects sections (P3–P6).** Several `<Label>` elements in the editor's Awards and Projects panels were rendering visible text but were not connected to their corresponding `<Input>` via `htmlFor` / `id` pairing. Screen readers could not associate the label with the field, browser auto-fill skipped those inputs, and a few inputs had no label at all. The affected fields were: Award Title, Issuing Organization, Date Received, Description in `AwardsSection`; Project Name, Role, Start Date, End Date, Technologies, Description, Project URL, GitHub in `ProjectsSection`.

4. **Console noise in production (internal).** Several `console.warn` and `console.error` calls scattered through the editor's hot path were emitting in both development and production builds. On the live site these messages were visible to any user with DevTools open, leaking internal state descriptions and making it harder to identify genuine errors in error-tracking dashboards.

---

## What changed

### 1 — KeyboardContext split (P1)

`src/context/KeyboardContext.tsx` was rewritten to export **two** separate React contexts:

- **`KeyboardStateContext`** — holds `{ isOpen: boolean; height: number; _hasProvider: boolean }`. The `_hasProvider: true` flag is only set inside `KeyboardProvider`; the default value is `false`, so any consumer can detect that it is running outside a provider and skip keyboard-aware logic rather than silently using stale defaults.
- **`KeyboardDispatchContext`** — holds the setter callback `(isOpen: boolean, height: number) => void`. Components that only update keyboard state (e.g. the input-focus listener) subscribe to this context alone and never re-render when state changes.

`KeyboardProvider` wraps children with both providers. The dispatch callback is stabilised with `useCallback` (empty dep array) so it never changes identity. When the keyboard opens, the provider toggles the `keyboard-open` class on `document.documentElement`, which CSS layout rules can target without any additional JS re-renders.

Two public hooks (`useKeyboardState`, `useKeyboardDispatch`) replace the old single export and enforce the split at the call-site level.

→ `src/context/KeyboardContext.tsx`

### 2 — MobileLayout removal (P2)

The `MobileLayout` wrapper component was removed from the editor's mobile rendering path. `EditorPage` now renders its content directly without the extra wrapper layer. No logic that was provided by `MobileLayout` needed to be moved — the component had no remaining purpose. The result is a single, consistent DOM structure on all screen sizes.

→ `src/pages/EditorPage.tsx`

### 3 — label/htmlFor fixes in AwardsSection and ProjectsSection (P3–P6)

Every `<Label>` in both sections now carries an `htmlFor` attribute whose value matches the `id` of its corresponding `<Input>` or `<Textarea>`. IDs are unique per item instance: `award-${award.id}-title`, `award-${award.id}-issuer`, `award-${award.id}-date`, `award-${award.id}-desc`; `proj-${proj.id}-name`, `proj-${proj.id}-role`, `proj-${proj.id}-start`, `proj-${proj.id}-end`, `proj-${proj.id}-tech-input`, `proj-${proj.id}-desc`, `proj-${proj.id}-url`, `proj-${proj.id}-github`. This makes every field accessible to screen readers and enables browser auto-fill for all inputs in both sections.

→ `src/components/editor/AwardsSection.tsx`
→ `src/components/editor/ProjectsSection.tsx`

### 4 — DEV-only logger (internal)

`src/lib/editorLogger.ts` is a tiny two-method module (`warn`, `error`) that guards every call behind `import.meta.env.DEV`. In production builds Vite tree-shakes the body away entirely — the guard evaluates to `false` at build time and the branch is removed. Call sites that previously used bare `console.warn`/`console.error` throughout the editor now import `editorLogger` instead, so the live site's console is clean while local development retains the full diagnostic output.

→ `src/lib/editorLogger.ts`

---

## What this does NOT change

- No change to any resume data model, autosave path, or Supabase query.
- No change to the score algorithm or any AI feature.
- The keyboard-open CSS class toggled by `KeyboardProvider` remains `keyboard-open` on `document.documentElement` — existing CSS rules that target it are unaffected.
- No public API of `KeyboardProvider` visible to components other than the two new hooks changed.

---

## Verification

- `tsc --noEmit` — clean.
- `vite build` — clean.
- All 7 live-site checks pass: `node scripts/verify-live-deploy.mjs` → `✅ All checks passed` (run 2026-04-26).
- Live site reports `v3.6.3` in `changelog.json` at `https://resume.thewise.cloud/changelog.json`.
