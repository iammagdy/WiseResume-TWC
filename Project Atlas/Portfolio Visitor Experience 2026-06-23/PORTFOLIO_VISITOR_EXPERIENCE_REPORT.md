# Public Portfolio — Visitor Experience Fixes & Redesign

**Date:** 2026-06-23
**Branch:** `fix/portfolio-visitor-experience`
**Scope:** fix 3 broken visitor features (chat, interest, contact) + redesign the password gate + polish the chat launcher and footer.

## 1. AI chat — was completely broken
**Root cause (from live execution logs):** public-share's `executeAiGateway` called
`createExecution({ functionId: 'ai-gateway', … })` (object form), but public-share bundles
**node-appwrite 17.2.0**, whose `createExecution(functionId, body, async, xpath, method)` is
**positional**. The object was read as the `functionId` → `Invalid functionId param` → every
`ask-portfolio` call 500'd ("Could not get a response").
**Fix:** switched to the positional signature. (`appwrite-hubs/public-share/src/main.js`)

## 2. "I'm Interested" — "Could not send interest" (TWO causes)
**Cause A (fixed):** the `portfolio_interactions` collection had only a `user_id` attribute, but
`api/portfolio-interest.ts` writes `token` / `portfolio_username` / `interaction_type` /
`referrer_hostname` and looks up by `token` → "Unknown attribute" → 500. Same schema-drift class
as the earlier profiles bug. **Fix:** `scripts/setup_portfolio_interactions_schema.cjs`
(idempotent) adds the 4 attributes + a `token` key index; wired into the public-share deploy block.
Additive only. ✅ deployed & verified (attributes `available`).

**Cause B (OWNER ACTION):** post-deploy testing of the live endpoint returned
`{"error":"config_error","message":"Portfolio interest API is not configured."}` — the Vercel
serverless function is missing **`APPWRITE_API_KEY`** (it returns config_error before any DB call).
The same gap affects the other `api/*.ts` serverless functions (e.g. `track-portfolio-view`,
`public-portfolio` legacy path). ⚠️ **Set `APPWRITE_API_KEY` (and confirm `APPWRITE_PROJECT_ID`)
in Vercel → Project → Settings → Environment Variables (Production)** — a server API key, so the
owner must enter it. Interest works once both Cause A (done) and Cause B (env var) are resolved.

## 3. Contact form — "Security check required" with no widget
**Root cause:** ai-gateway requires a Cloudflare Turnstile token for anonymous senders (else it
falls back to requiring a logged-in session → "Security check required"). The frontend never sends
a token because **`VITE_TURNSTILE_SITE_KEY` is not set in the Vercel build**, so the Turnstile
widget never renders.
**Fix:** ⚠️ **OWNER ACTION REQUIRED** — set `VITE_TURNSTILE_SITE_KEY` in Vercel (Production env)
to the Cloudflare Turnstile **site key** that pairs with the `TURNSTILE_SECRET_KEY` already in
Appwrite. I also made the failure message clearer (`PortfolioContactForm.tsx`). The form works as
soon as the site key is set.

## 4. Password gate redesign (centerpiece)
New `src/components/portfolio/public/PortfolioPasswordGate.tsx`:
- A **cat** that looks toward the pointer when idle and **covers its eyes with its paws** while
  you type the password (and **peeks** when you toggle "show password").
- An **animated, accent-driven background** (drifting aurora blobs hue-rotated from the portfolio
  accent color, a moving sheen, and a masked grid) on a glassy card with an accent glow.
- Respects `prefers-reduced-motion`; show/hide password toggle; error shake.
- Verified locally via a temporary dev-only route (reverted before commit): idle, typing
  (paws cover eyes), and on a real loaded portfolio.

## 5. Chat launcher + footer polish
- **Launcher** (`ChatWidget.tsx`): added a pulse ring, a sparkle "AI" badge, and a first-visit
  hint pill — "✨ Ask me about <Name> · Skills, experience, availability…" (dismissable) — so
  visitors realize the portfolio is askable.
- **Footer** (`PublicPortfolioPage.tsx`): replaced the plain underlined "Built with WiseResume"
  text with an accent-tinted pill badge (sparkle + "Create yours ↗" hover).

## Validation
- `node --check` on public-share, deploy_hubs.cjs, the new schema script: PASS.
- `npx tsc --noEmit`: PASS. `npm run build`: PASS.
- Source hashes regenerated — only `public-share` changed.
- Visual: password gate (idle + typing), chat launcher hint, footer badge — screenshot-verified locally.

## Deploy
- Appwrite: narrow `--only=public-share` (ships the chat fix + runs the portfolio_interactions
  schema). Not `target=all`.
- Frontend (gate, launcher, footer, contact msg): Vercel auto-deploy on merge.

## Owner actions (Vercel env vars — can't be set by the assistant)
1. **`APPWRITE_API_KEY`** (+ confirm `APPWRITE_PROJECT_ID`) → unblocks "I'm Interested" (and the
   analytics beacon).
2. **`VITE_TURNSTILE_SITE_KEY`** → unblocks the contact form (pairs with Appwrite
   `TURNSTILE_SECRET_KEY`).

## Status
Chat ✅ fixed & verified live. Interest schema ✅ fixed & deployed (needs owner env var to fully
work). Password gate / launcher / footer ✅ built & screenshot-verified (ship via Vercel on merge).
Contact form ⚠️ pending owner env var.
