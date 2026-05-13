# export-portfolio-pdf

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `supabase/functions/export-portfolio-pdf/index.ts`, `supabase/functions/_shared/pdfRenderer.ts`

---

## What it does

Renders a server-side PDF of an authenticated user's portfolio.

**Method:** POST only (405 otherwise)
**Auth:** `requireAuth` (Kinde-bridge JWT)
**Body:** `{ portfolio_id: string }` — required

## Flow

1. Authenticates the caller via `requireAuth`.
2. Selects the portfolio row from `portfolios` scoped to `(id, user_id)` — 404 if not owned by caller.
3. Calls shared `renderArtifactPdf(client, { kind: 'portfolio', ownerUserId, title, payload })`.
4. Returns `{ url }` JSON with the storage URL of the generated PDF.

## DB tables

- `portfolios` (read-only; columns: `id, user_id, title, slug, theme, sections, data`)
- Storage write handled inside `_shared/pdfRenderer.ts`

## Error envelopes

`{ error: <message> }` JSON; statuses: 400 (missing portfolio_id), 404 (not found), 405 (wrong method), 500 (other), plus the original status from `AuthError`.
