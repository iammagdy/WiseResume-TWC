# CV Masking / Anonymisation Tool

## What & Why
Recruiting agencies and HR teams often need to share CVs with client companies or internal hiring managers with sensitive information removed — to prevent bias in shortlisting and to stop clients from bypassing the agency to contact candidates directly. This tool lets HR upload a batch of CVs, automatically strips or replaces all personally identifiable information (PII), and lets them download the clean anonymised versions.

This is distinct from the existing Bias Mode (which only hides fields in the pipeline UI). This is a standalone anonymisation export tool.

## Done looks like
- HR navigates to a new "CV Masking" page in the WiseHire shell
- They upload 1–10 PDF CVs via a drag-and-drop upload zone
- Each CV is processed: AI identifies and redacts PII — name, email, phone, address, date of birth, nationality, gender, any profile photo reference
- Each candidate is assigned a neutral anonymous label: Candidate A, Candidate B, etc.
- HR sees a preview of each masked CV as plain text with the redacted sections highlighted/labelled (e.g. `[NAME REDACTED]`, `[EMAIL REDACTED]`)
- HR can download each masked CV individually as a `.txt` file, or download all as a ZIP
- Rate limited per tier (Starter: 3 batches/day, Pro: 20 batches/day)
- The page is accessible from the WiseHire nav
- The edge function uses the HR user's own AI key (BYOK) if present, otherwise the platform key

## Out of scope
- Reconstructing a styled PDF output (plain text download is sufficient for now)
- Storing masked CVs in the database — this is a stateless processing tool, results are ephemeral
- Editing/tweaking the masked content in the UI before download

## Tasks
1. **Edge function `wisehire-mask-cvs`** — Accept up to 10 PDF uploads as multipart form data. For each file: extract text (reuse existing PDF text extraction pattern from the bulk-screen function). Send extracted text to GPT-4o-mini with a structured prompt to identify and replace all PII fields (name → `[NAME]`, email → `[EMAIL]`, phone → `[PHONE]`, address → `[ADDRESS]`, DOB → `[DATE OF BIRTH]`, nationality → `[NATIONALITY]`, gender → `[GENDER]`). Assign each document an anonymous ID (Candidate A, B, C…). Apply rate limiting via `checkRateLimit` (Starter: 3/day, Pro: 20/day). Return an array of `{ label, filename, maskedText, redactedFields[] }`.

2. **Hook `useMaskCVs.ts`** — Mutation that posts files to the edge function and returns the array of masked results. Manages loading state per file and overall batch status.

3. **Component `MaskedCVCard.tsx`** — Displays one anonymised CV result: anonymous label (Candidate A), original filename, list of redacted field types found, masked text preview (scrollable, max height), and a download button for that individual file.

4. **Page `CandidateMaskingPage.tsx`** — Full page at `/wisehire/mask-cvs`: drag-and-drop PDF upload zone (up to 10 files, with file count and size feedback), Process button that triggers the edge function, loading state with per-file progress indication, results grid of `MaskedCVCard` components, "Download All as ZIP" button (client-side zip using JSZip), and a "Clear & start over" reset action.

5. **Nav and routing** — Add "CV Masking" nav item (with a fitting icon) to the WiseHireShell navigation. Register the `/wisehire/mask-cvs` route inside the `WiseHireGuard` block in `App.tsx`.

6. **TypeScript check and app restart** — Confirm 0 type errors. Smoke-test the upload flow and verify the nav item is visible.

## Relevant files
- `supabase/functions/wisehire-bulk-screen/index.ts` (PDF extraction pattern to reuse)
- `supabase/functions/_shared/rateLimiter.ts`
- `supabase/functions/_shared/authMiddleware.ts`
- `supabase/functions/_shared/cors.ts`
- `src/components/wisehire/WiseHireShell.tsx`
- `src/App.tsx`
- `src/pages/wisehire/BulkScreenPage.tsx` (UI pattern reference)
