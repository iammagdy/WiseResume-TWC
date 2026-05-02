# generate-cover-letter

  **Last verified:** 2026-05-02 (Task #28)
  **Type:** reference card
  **Sources:**
  - `supabase/functions/generate-cover-letter/index.ts`
  - `supabase/config.toml` (JWT verification flag)
  - `supabase/functions/_shared/aiClient.ts`
- `supabase/functions/_shared/creditUtils.ts`
- `project-governance/ARCHITECTURE.md` §7
- `src/components/cover-letter/templates/registry.ts`
- `src/components/cover-letter/CoverLetterPreview.tsx`
- `src/lib/coverLetterPdfGenerator.ts`

  **Canonical owner:** `project-governance/ARCHITECTURE.md` §7 (Edge Functions)

  ---

  **What it does:** Generates a cover letter from resume + JD. 2 credits.

  **Auth:** JWT (`requireAuth`) + L1 IP rate limit + L2 atomic credit check + payload size guard. → critical-system 09.

  **Template style (Task #28):** Request body accepts an optional `template_style` (string). The edge function persists it as-is on the inserted `cover_letters` row (column added in migration `20260214172249_*.sql`, defaulting to `'professional'`). The frontend gallery exposes 4 visible values — `'professional'` (Classic), `'modern'` (Modern), `'compact'` (Compact), `'creative'` (Creative) — plus a hidden legacy value `'minimal'` aliased to Classic for old rows. The column is plain text with no enum/check constraint, so adding new template styles is a frontend-only change going forward. Null/empty values render the legacy plain whitespace-pre-wrap card via `<CoverLetterPreview>`'s fallback so pre-Task-#28 rows keep their original look. PDF rendering routes via `coverLetterPdfGenerator.ts`'s `switch (templateStyle)` — `'compact'` → `renderCompact()`, `'creative'` → `renderCreative()`, others fall through to the legacy renderers.

  **Related:**
  - `Project Atlas/01-Currently Implemented/edge-functions/README.md`
- `Project Atlas/01-Currently Implemented/critical-systems/02-ai-routing-chain.md`
  