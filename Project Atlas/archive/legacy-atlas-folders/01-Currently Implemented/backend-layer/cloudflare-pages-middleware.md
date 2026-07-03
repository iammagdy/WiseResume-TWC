# Cloudflare Pages middleware (`functions/_middleware.ts`)

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `functions/_middleware.ts` (177 lines).

**Canonical owner:** Production Hostinger/Cloudflare-Pages-style content negotiation for AI agents.

---

> Note: top-level `functions/` is the **Cloudflare Pages Functions** convention, **not** `supabase/functions/`. They are unrelated despite the shared name.

## What it does
Implements `Accept: text/markdown` content negotiation for the marketing surface so AI agents can read pages as markdown without scraping HTML.

- For `/` (and `/enterprises`): returns a hand-authored markdown summary of the platform with `Content-Type: text/markdown`.
- For other public HTML routes with `Accept: text/markdown`: fetches the upstream HTML asset, strips the shell, returns generic markdown extraction.
- Otherwise: passes through to static assets / other Pages Functions untouched.

## Constraints
- Must work in the **Cloudflare Pages Functions** runtime (Service-Worker-style fetch handler). No imports — file is consumed as-is by the Pages build.
- The hand-authored home markdown is the contract surfaced to MCP/agent clients alongside `public/.well-known/mcp/server-card.json` and `public/.well-known/agent-skills/`.

## Hard rules
- Do not add Node-only or npm imports — runtime is Workers, not Node.
- Hand-authored markdown for `/` must stay aligned with the marketing claims in `src/pages/Index.tsx` (`replit.md` rule: never invent stats).
- Adding per-route hand-authored markdown is encouraged; do it page-by-page rather than re-writing the generic extractor.
