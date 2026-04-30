# parse-job

  **Last verified:** 2026-04-30
  **Type:** reference card
  **Sources:**
  - `supabase/functions/parse-job/index.ts`
  - `supabase/config.toml` (JWT verification flag)
  - `project-governance/ARCHITECTURE.md` §7

  **Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

  ---

  **What it does:** Merged job-parsing function. Routes on `body.action`:
  - `'url'` — fetches a job posting URL and extracts structured fields (title, company, description, deadline). SSRF-protected via domain allowlist.
  - `'text'` — parses raw pasted job description text into structured fields.
  - `'linkedin'` — parses a LinkedIn profile text blob into structured profile data.

  Replaces three former standalone functions: `parse-job-url`, `parse-job-text`, `parse-linkedin`.

  **Auth:** Supabase bearer JWT (`requireAuth`). Each action runs its own rate-limit and credit-check block.

  **Routing discriminator:** `body.action: 'url' | 'text' | 'linkedin'`

  **Related:**
  - `Project Atlas/01-Currently Implemented/edge-functions/README.md`
  - `src/lib/aiTailor.ts` (url + text call sites)
  - `src/components/dashboard/CreateResumeDialog.tsx` (linkedin call site)
  - `src/components/settings/ProfileImportSheet.tsx` (linkedin call site)
  - `src/pages/OnboardingPage.tsx` (linkedin call site)
  - `src/components/applications/AddApplicationSheet.tsx` (url call site)
