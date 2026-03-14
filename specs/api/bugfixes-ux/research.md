# Research Findings: api/bugfixes-ux

## Phase 0: Outline & Research

### 1. File Naming and Blob typing for PDF Exports
**Decision**: Client-side generation with robust configuration.
**Rationale**: `pdfGenerator.ts` currently orchestrates export locally. Backend API generation is ruled out (as no such edge function exists for downloading PDFs directly). We will thoroughly inspect `html2canvas` layout readiness (fonts/SVGs), the `Blob` assignment parameters (`type: "application/pdf"`), and the anchor click methodology (`download` attribute).

### 2. Differentiating Connection Drops vs Backend Token Drops
**Decision**: Modify `supabaseBridge.ts` catchment and AppShell hooks.
**Rationale**: Currently, AppShell catches a generic `bridgeError`. We will inspect the exact shapes of errors returned by generic offline events vs Kinde Token exchanges rejecting Supabase RLS. Only auth-related Supabase rejections will trigger "We couldn't connect your data."

### 3. Glassmorphism Performance Constraints
**Decision**: Apply `backdrop-blur-md` conditionally.
**Rationale**: CSS variable-backed `backdrop-blur` heavily taxes low-end mobile devices if stacked repeatedly. We will use a safe, optimized glassmorphism layer (e.g., `bg-background/80 backdrop-blur-md`) mapped correctly in Tailwind to ensure accessibility over the cloud animation. We will adjust the bottom FAB positioning out of document reflow (fixed/absolute) so Ask and Settings remain horizontally adjacent but non-overlapping.

### 4. Active Resume State Recovery
**Decision**: Immediate reactive mutation.
**Rationale**: The "Create a resume first" bug stems from stale closure cache or delayed `is_active` DB syncs. The `useResumes.ts` creation hook will be updated to eagerly return and inject the newly generated resume into the local `useResumeStore` state as active immediately upon successful DB insertion, guaranteeing UI routing skips the dead-end layer.
