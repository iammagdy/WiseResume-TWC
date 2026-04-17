# AI Studio + Agentic Chat (Wise AI)

**Last verified:** 2026-04-17
**Type:** deep dive
**Sources:**
- `src/pages/AIStudioPage.tsx`
- `supabase/functions/wise-ai-chat/`
- `supabase/functions/agentic-chat/`
- `supabase/functions/_shared/aiClient.ts`
- `src/components/editor/AgenticChatSheet.tsx`
- `src/components/interview/CompanyBriefingSheet.tsx`
- `src/hooks/useAgenticChat.ts`
- `src/hooks/useToolCache.ts`
- `src/store/chatTriggerStore.ts`
- `replit.md` (Wise AI — Recent Feature History + AI System)
- `project-governance/ARCHITECTURE.md` §8 (AI Studio Tools Inventory) + §7 (Edge Functions)
- `ARCHITECTURE.md` (root) — agentic-chat 12-tool list
- `CHANGELOG.md` (2026-04-15 Wise AI Phases 2 & 3)

**Canonical owner:** `project-governance/ARCHITECTURE.md` §8 (AI Studio Tools Inventory). Per the project governance hierarchy, **`project-governance/*` is supreme** — if any other file (root `ARCHITECTURE.md`, `replit.md`, or this card) disagrees with `project-governance/ARCHITECTURE.md`, treat governance as authoritative and update the other source.

> **Open reconciliation:** root `ARCHITECTURE.md` lists 12 agentic tools while `replit.md` (Edge Functions section) lists 10 with partly different names. Neither overrides governance. The only way to resolve is to read `supabase/functions/agentic-chat/index.ts` and update both files to match. Tracked as a follow-up task.

---

## Two surfaces, one client

Both flows ultimately call `callAI()` from `_shared/aiClient.ts`. They differ in UX and tool set.

### `wise-ai-chat` — single-shot AI Studio sheets

Powers 7 AI Studio use cases (cold email, job rejection, personal branding, portfolio bio, reference letter, salary negotiation, skills gap). → `supabase/functions/EDGE_FUNCTION_AUDIT.md`.

Frontend: `src/pages/AIStudioPage.tsx` exposes 16 tools across 3 categories (Documents, Research & Coaching, Writing). Most route through `wise-ai-chat`; a few have dedicated edge functions (`generate-cover-letter`, `company-briefing`, `career-path-advisor`, `career-assessment`, `optimize-for-linkedin`, `generate-resignation-letter`, `detect-and-humanize`).

→ `project-governance/ARCHITECTURE.md` §8 (AI Studio Tools Inventory) for the full mapping.

### `agentic-chat` — multi-turn assistant with tool calls

DB-backed sessions (`chat_sessions`, `chat_messages`) and persistent history. → `replit.md` (Wise AI Phase 1).

**Tools registered (12 total — `ARCHITECTURE.md` root, §"agentic-chat"):**

| # | Tool | Purpose |
|---|---|---|
| 1 | `get_resume` | Fetch resume data |
| 2 | `update_section` | Replace a resume section |
| 3 | `add_experience` | Add a work experience entry |
| 4 | `update_experience` | Edit an experience entry |
| 5 | `delete_experience` | Remove an experience entry (Phase 1) |
| 6 | `add_education` | Add an education entry |
| 7 | `update_education` | Edit an education entry |
| 8 | `add_skill` | Add a skill tag |
| 9 | `remove_skill` | Remove a skill tag |
| 10 | `add_project` | Add a project entry |
| 11 | `get_company_briefing` | Trigger company research briefing (Phase 2) |
| 12 | `open_job_tracker` | Navigate user to `/applications` (Phase 2) |

> Note: `replit.md` (Edge Functions section) lists a slightly different tool set for `agentic-chat` (10 tools incl. `update_summary`, `update_skills`, `add_skills`, `update_contact`, `suggest_edits`, `proofread_and_fix`). Both files are in-repo. **Canonical owner:** root `ARCHITECTURE.md` for `agentic-chat`'s actual tool list, but a re-read of `supabase/functions/agentic-chat/index.ts` is the only way to fully reconcile. → Track this as a follow-up reconciliation item if precise parity is needed.

## Phase 3 — tool output caching

→ `replit.md` (Wise AI Phase 3) and `CHANGELOG.md` (2026-04-15).

- `tool_cache` table: `(user_id, tool_name, cache_key, output JSONB, created_at, expires_at)` with unique upsert index, 7-day TTL for `get_company_briefing`.
- `useToolCache` hook (`src/hooks/useToolCache.ts`): `getCache<T>`, `setCache`, `deleteCache`, `getCacheAge`. RLS-safe; only active when authenticated; normalised keys (lowercase + underscore).
- `AgenticChatSheet`: writes via `onBriefingGenerated` callback; reads cache before opening; inline cache-reuse card with age + "View Saved" / "Generate Fresh".

## "Add with AI" entry point

→ `replit.md` (Phase 2).

`ExperienceSection` exposes a Bot-icon button that writes a `pendingPrompt` to `chatTriggerStore` (Zustand). `EditorPage` watches the store and forwards the prompt as `chatInitialMessage` to `AgenticChatSheet`, which auto-opens.

## Failure history (lessons baked in)

The 2026-04-13 "AI is temporarily unavailable" incident exposed four root causes — timeout cascade, missing `verify_jwt = false` in `supabase/config.toml`, HS256-only auth middleware, and a parameter-mismatched `deductCredits` RPC. All fixed; HTTP 200 verified post-fix. See `replit.md` (wise-ai-chat full fix) for the full post-mortem and the resulting timing constants (`PER_MODEL_TIMEOUT_MS = 8 s`, max 3 models/provider, outer 40 s).
