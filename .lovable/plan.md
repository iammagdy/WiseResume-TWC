
Issue diagnosis complete. The crash is happening before the page renders because `ScreenshotsGalleryPage.tsx` creates a backend client at module load using `import.meta.env.VITE_SUPABASE_URL`, and in this preview session that env is missing (`main.tsx` logs `supabaseUrl: "missing"`). That makes `createClient(...)` throw `supabaseUrl is required`, which triggers the global error screen.

What I will implement after approval:

1) Make the screenshots backend client initialization crash-safe
- File: `src/pages/ScreenshotsGalleryPage.tsx`
- Replace the current top-level `createClient(import.meta.env...)` usage with a resilient setup:
  - Read env values first.
  - Add safe fallback values for the Lovable Cloud backend URL + publishable key (so the page can run even when preview env injection is missing).
  - Create the client only from validated non-empty values.
- This prevents route-level hard crashes during import.

2) Move client creation behind a guarded/lazy path
- Keep client construction out of brittle module-scope assumptions.
- Ensure `fetchScreenshots` and `handleGenerate` check that a valid client exists before calling database/function APIs.
- If config is unavailable, show a user-friendly toast and keep the page usable (no hard error boundary).

3) Preserve mobile-first + non-blank loading behavior
- Keep existing skeleton grid for loading.
- Ensure the page always renders a valid UI state on `/screenshots-gallery` at `xs` width (375px), even if backend calls fail.
- Keep action buttons disabled appropriately while generating/loading.

4) Improve error clarity for this specific flow
- Update error toasts/messages for:
  - backend config missing
  - generation request failure
  - fetch failure
- Goal: users see actionable messages instead of “Something went wrong” crash screen.

5) Validation checklist (end-to-end)
- Open `/screenshots-gallery` directly on mobile viewport (375px).
- Confirm no crash/error boundary appears.
- Tap “Generate Screenshots” and verify request is sent to Lovable Cloud backend function.
- Confirm screenshots list refreshes after completion and individual/“Download All” still work.

Technical notes
- No database migration needed (table already exists).
- No backend function code changes needed for this fix.
- Scope is isolated to `ScreenshotsGalleryPage.tsx` to minimize risk and unblock immediately.
