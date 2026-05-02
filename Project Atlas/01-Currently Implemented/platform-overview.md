# Platform Overview — The Wise Cloud

**Last verified:** 2026-04-17
**Type:** overview
**Sources:**
- `README.md`
- `replit.md`
- `project-governance/CONSTITUTION.md`
- `project-governance/PRODUCT.md`
- `project-governance/ARCHITECTURE.md`
- `project-governance/BRANDING.md`
- `src/AppInterior.tsx`

**Canonical owner:** `project-governance/PRODUCT.md` + `project-governance/ARCHITECTURE.md`

---

## Two products, one codebase

The Wise Cloud is a single React + Vite SPA backed by Supabase. It runs two distinct products on the same infrastructure, separated permanently by the `profiles.account_type` column (`job_seeker` | `hr`).

→ `project-governance/CONSTITUTION.md` §7 (account-type isolation)
→ `project-governance/DECISIONS.md` Decision #7 (same-codebase rationale)

| Product | Audience | Routes | Live? |
|---|---|---|---|
| **WiseResume** | Job seekers | `/dashboard`, `/editor`, `/interview`, `/ai-studio`, `/portfolio`, `/applications`, … | Yes — production at https://resume.thewise.cloud |
| **WiseHire** | HR / recruiters | `/wisehire/*` | Phase 1 live (invite-only); Phases 2–4 planned |

The landing page (`/`) shows both via a "For Job Seekers" / "For Companies" toggle. → `src/pages/Index.tsx`, `project-governance/BRANDING.md` §6.

## Shared infrastructure

| Layer | Tech | Source |
|---|---|---|
| Frontend | React 18 + TypeScript 5 + Vite 5 | `package.json`, `vite.config.ts` |
| Styling | Tailwind + Radix UI + shadcn/ui + Framer Motion | `tailwind.config.ts`, `src/components/ui/` |
| State | Zustand (persisted) + TanStack Query v5 | `src/store/`, `src/hooks/useMe.ts` |
| Auth | Kinde Auth → Supabase via deterministic UUID v5 bridge | `supabase/functions/token-exchange/`, `src/lib/supabaseBridge.ts` |
| Database | Supabase Postgres + RLS on every table | `supabase/migrations/`, `src/integrations/supabase/types.ts` |
| Backend | Supabase Edge Functions (Deno) — 93 functions | `supabase/functions/` |
| AI | 8-step routing chain across 9 providers w/ BYOK | `supabase/functions/_shared/aiClient.ts` |
| Voice | _Removed_ — Interview Coach voice path retired; `useVoiceInterview.ts` is a stub. The `elevenlabs-scribe-token` edge function was deleted 2026-04-24 (Task #21). | `src/hooks/useVoiceInterview.ts` |
| Mobile | Capacitor 8 native shell (no PWA — loads a Vite-built `dist/` payload via WebView) | `capacitor.config.ts`, `critical-systems/13-mobile-capacitor.md` |
| Hosting | Hostinger (frontend) + Supabase (backend) | `.github/workflows/deploy.yml` |

## Inventory at a glance (live today)

| Surface | Count | Where to look |
|---|---|---|
| App routes | ~80 (incl. WiseHire + dynamic params) | `src/AppInterior.tsx` |
| Pages | 56 (WiseResume) + 20 (WiseHire) | `src/pages/`, `src/pages/wisehire/` |
| Edge Functions | 93 | `supabase/functions/`, `supabase/functions/EDGE_FUNCTION_AUDIT.md` |
| Database tables (in generated types.ts) | 39 | `src/integrations/supabase/types.ts` |
| Database tables (incl. WiseHire + chat_sessions/chat_messages/tool_cache + admin tables present in migrations) | ~60 | `supabase/migrations/`, `project-governance/ARCHITECTURE.md` §5 |
| Storage buckets | 5 (`avatars`, `resumes`, `portfolios`, `temp`, `candidate-resumes`) | `project-governance/ARCHITECTURE.md` §6 |
| AI providers supported (BYOK + platform) | 9 (OpenAI, Anthropic, Gemini, Groq, Mistral, xAI, Cohere, OpenRouter, Ollama) | `supabase/functions/_shared/aiClient.ts` |

## Pricing (today)

→ `src/lib/planConfig.ts` (frontend canon) and `supabase/functions/_shared/planLimits.ts` (server canon — keep in sync)

**WiseResume:** Free (5 daily AI credits, 1 resume) · Pro $9/mo (100 credits, unlimited resumes) · Premium $19/mo (unlimited credits + analytics + custom branding).
**WiseHire:** No free tier. Starter $49 · Professional $149 · Business $399 · Enterprise (custom). 7-day Professional trial auto-granted on HR signup.

## Critical-system index

The 13 deep-dive docs in `critical-systems/` cover every system that touches more than one feature:

1. Auth bridge (Kinde → Supabase)
2. AI routing 8-step chain
3. Credits + BYOK
4. Multi-layer rate limiting
5. WiseHire Phase 1 surface
6. Admin Dev Kit
7. Storage buckets
8. Deployment
9. Security model (4-layer invariant)
10. AI Studio + agentic chat
