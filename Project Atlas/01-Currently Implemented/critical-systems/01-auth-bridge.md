# Auth Bridge — Kinde → Supabase

**Last verified:** 2026-04-17
**Type:** deep dive
**Sources:**
- `supabase/functions/token-exchange/`
- `supabase/functions/_shared/authMiddleware.ts`
- `src/lib/supabaseBridge.ts`
- `src/contexts/AuthContext.tsx`
- `project-governance/ARCHITECTURE.md` §4
- `project-governance/DECISIONS.md` Decision #2 + Decision #4
- `replit.md` (Auth System + wise-ai-chat full fix sections)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §4

---

## Why it exists

WiseResume + WiseHire authenticate users through **Kinde** (the only approved auth provider — `project-governance/CONSTITUTION.md` §4) but persist all data in **Supabase**, which expects its own JWT. The bridge converts a Kinde session into a Supabase session deterministically, so the same Kinde user always maps to the same Supabase row, forever.

## The flow (seven steps)

1. User authenticates with Kinde via OAuth **implicit** flow (not PKCE — chosen for custom-domain compatibility, → Decision #4).
2. Kinde redirects back with a JWT.
3. Frontend calls the `token-exchange` Edge Function with that Kinde JWT. → `supabase/functions/token-exchange/index.ts`
4. The function verifies the Kinde JWT, derives a **deterministic UUID v5** from the Kinde user ID, then mints a Supabase JWT for that UUID.
5. `src/lib/supabaseBridge.ts` (singleton) stores the bridge token in `localStorage` to avoid re-exchanging on every refresh.
6. All authenticated Supabase calls use the bridge token.
7. The `me` Edge Function returns the current profile, plan, and credits keyed off `auth.uid()` (which now equals the bridge UUID).

## Two non-obvious facts

- `user.id` everywhere in app code is the **bridge UUID**, never the raw Kinde `kp_xxx` ID. → `replit.md` (Auth System)
- `authMiddleware.ts` deliberately delegates JWT verification to `supabase.auth.getUser(token)` (any algorithm) instead of verifying HS256 directly. This was the root-cause fix for the 2026-04-13 "AI is temporarily unavailable" incident, which broke when ES256 user tokens hit a HS256-only verifier. → `replit.md` lines describing the wise-ai-chat 2026-04-13 fix.

## Files that must stay in sync

| File | Role |
|---|---|
| `supabase/functions/token-exchange/index.ts` | Verifies Kinde JWT, mints Supabase JWT |
| `supabase/functions/_shared/authMiddleware.ts` | Used by every authenticated edge function — `requireAuth` wraps it |
| `src/lib/supabaseBridge.ts` | Frontend lifecycle: init, refresh, persist, clear |
| `src/contexts/AuthContext.tsx` | React context that exposes the bridged user |
| `supabase/functions/me/index.ts` | Returns the canonical user profile post-bridge |

## Invariants

- All edge functions need `verify_jwt = false` in `supabase/config.toml` so they receive the bridged token without Supabase's gateway second-guessing the algorithm. → `replit.md` (Edge Function Status)
- `src/integrations/supabase/types.ts` and `src/integrations/supabase/client.ts` are auto-generated / read-only — never edit manually. → `project-governance/ARCHITECTURE.md` §1.

## Failure modes seen and fixed

- ES256 vs HS256 token mismatch (fixed 2026-04-13).
- Custom-domain OAuth 404 — fixed by Decision #4 (implicit flow).
- Redundant token exchanges on every page refresh — fixed by localStorage persistence in `supabaseBridge.ts`.
