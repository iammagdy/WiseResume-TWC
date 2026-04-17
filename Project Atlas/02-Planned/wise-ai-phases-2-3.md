# Wise AI Agent Evolution — Phases 2 & 3 (planned + partial)

**Status:** Phase 1 shipped. Phases 2 & 3 partial — entry points landed (`Add with AI`, company briefing, tool cache); broader Phase 2/3 scope still on the spec.
**Last verified:** 2026-04-17
**Sources:**
- `specs/002-wise-ai-agent-evolution/spec.md`
- `replit.md` (Wise AI — Recent Feature History — Phases 1, 2, 3)
- `CHANGELOG.md` (2026-04-15 Wise AI Phases 2 & 3)
- `Project Atlas/01-Currently Implemented/critical-systems/10-ai-studio-and-agentic-chat.md`

**Canonical owner:** `specs/002-wise-ai-agent-evolution/spec.md`.

---

## What's already shipped (overlap with Currently Implemented)

- DB-backed `chat_sessions` + `chat_messages` (Phase 1)
- 12-tool agentic toolset including `get_company_briefing`, `open_job_tracker` (Phases 1 + 2)
- "Add with AI" entry point on ExperienceSection via `chatTriggerStore` (Phase 2)
- `tool_cache` table + `useToolCache` hook + AgenticChatSheet cache UI (Phase 3)

## What's still planned

- Wider tool catalogue (more sections, more page-spanning actions)
- Streaming responses end-to-end (depends on AI routing rollout)
- Cross-session memory beyond the current per-session history
- Proactive suggestions (chat surfaces nudges instead of reacting only)

## Tool list reconciliation (open item)

The `agentic-chat` tool list differs between two source files:
- `ARCHITECTURE.md` (root) lists 12 tools.
- `replit.md` (Edge Functions section) lists 10 tools, including some not in the root list (`update_summary`, `update_skills`, `add_skills`, `update_contact`, `suggest_edits`, `proofread_and_fix`).

The only authoritative reconciliation is to re-read `supabase/functions/agentic-chat/index.ts`. This is tracked as a follow-up.

## Hard constraints

- Four-Layer Security Invariant applies to every new tool surface.
- `tool_cache` rows must remain RLS-isolated per user.
- BYOK strict mode applies — Phase 2/3 tools must not silently fall back to platform keys when a user has BYOK configured.
