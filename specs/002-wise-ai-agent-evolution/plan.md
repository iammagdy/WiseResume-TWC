# Implementation Plan: Wise AI Agent Evolution — Phase 1

**Date**: 2026-04-15 | **Spec**: `specs/002-wise-ai-agent-evolution/spec.md`

---

## Summary

Add DB-backed chat session persistence, a history sidebar, and a delete-experience tool to the
existing Wise AI agent (`agentic-chat` edge function + `AgenticChatSheet` + `useAgenticChat`).
The feature extends the current in-memory chat into a persistent, session-aware assistant without
replacing any existing infrastructure.

---

## Technical Context

**Language/Version**: TypeScript (React 18 + Vite frontend) + Deno (Supabase Edge Functions)
**Primary Dependencies**: Supabase JS client, TanStack Query, Zustand, Framer Motion, Lucide React
**Storage**: Supabase PostgreSQL — two new tables: `chat_sessions`, `chat_messages`
**Testing**: Vitest (existing suite — 292 tests, run after changes)
**Target Platform**: Web (mobile-first, WCAG AA) + Capacitor PWA
**Project Type**: Full-stack web application (React SPA + Supabase backend)
**Performance Goals**: History list load < 1s for 50 sessions; chat sheet open < 500ms perceived
**Constraints**: No extra AI calls for session title generation; non-blocking DB writes (chat must
never stall on a DB failure); guest users must have zero behavior change
**Scale/Scope**: Per-user cap of 50 sessions displayed; all messages within a session loaded in full

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Rule | Status | Notes |
|------|--------|-------|
| **Rule A — Four-Layer Security** | PASS | `delete_experience` is added to an existing endpoint (`agentic-chat`) that already enforces all four layers: `requireAuth` → `checkRateLimit`/`checkUserRateLimit` → `checkAndDeductCredit` → `checkPayloadSize`. No new endpoint is created. |
| **Rule B — Deterministic Scoring** | PASS | `score-resume` is not touched. |
| **Rule C — Orphan Retention** | PASS | `fetch-github-projects` is not touched. |
| **Rule D — Voice Pipeline** | PASS | `interview-chat`, `elevenlabs-scribe-token`, and `useVoiceInterview.ts` are not touched. |
| **RLS Requirement** | PASS | Both new tables will have RLS enabled with `auth.uid()` policies in the same migration. |
| **WiseHire Isolation** | PASS | Feature is scoped to `job_seeker` accounts only. `delete_experience` operates on `currentResume` which is WiseResume-only. WiseHire routes are not affected. |
| **Changelog Discipline** | REQUIRED | `project-governance/CHANGELOG.md` must be updated as the final step of implementation. |
| **Migration Pattern** | REQUIRED | New tables must be written as raw SQL in `supabase/migrations/` with `npx supabase db push`. Do NOT use `shared/schema.ts` — this project does not use Drizzle. |
| **No Manual Edit of types.ts** | REQUIRED | `src/integrations/supabase/types.ts` is auto-generated. Never edit it manually. Regenerate with Supabase CLI after migration. |

---

## Project Structure

### Documentation (this feature)

```text
specs/002-wise-ai-agent-evolution/
├── spec.md              ← Feature specification (this feature's source of truth)
├── plan.md              ← This file
└── tasks.md             ← Phase 3 output (to be created)
```

### Source Code (affected files)

```text
supabase/
├── migrations/
│   └── [timestamp]_chat_sessions_and_messages.sql   ← NEW: DB schema + RLS
└── functions/
    └── agentic-chat/
        └── index.ts                                  ← MODIFY: add delete_experience tool

src/
├── lib/
│   └── agenticChat.ts            ← MODIFY: extend SuggestionProposal with action field
├── hooks/
│   └── useAgenticChat.ts         ← MODIFY: add persistence layer + session management
└── components/
    └── editor/
        └── AgenticChatSheet.tsx  ← MODIFY: add history panel UI + delete confirmation card

project-governance/
├── ARCHITECTURE.md               ← UPDATE: register new tables + edge function change
└── CHANGELOG.md                  ← UPDATE: prepend new entry
```

---

## Complexity Tracking

No constitution violations. All changes extend existing files. No new edge functions, no new
response types (existing `suggest_edits` pathway is extended minimally with the `action` field).

---

## Technical Design Notes

### DB Schema

```sql
-- chat_sessions
CREATE TABLE public.chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id   UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  title       TEXT NOT NULL DEFAULT 'New Chat',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions"
  ON public.chat_sessions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- chat_messages
CREATE TABLE public.chat_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content       TEXT NOT NULL DEFAULT '',
  function_call JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own messages"
  ON public.chat_messages FOR ALL TO authenticated
  USING (
    session_id IN (
      SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
    )
  );
```

### SuggestionProposal Extension

Extend the existing interface in `src/lib/agenticChat.ts`:

```typescript
export interface SuggestionProposal {
  section: string;
  itemId?: string;
  original: string;
  suggested: string;
  explanation: string;
  status?: 'pending' | 'accepted' | 'rejected';
  action?: 'delete' | 'update'; // NEW: 'delete' renders removal card; omit/update = diff card
}
```

### delete_experience Tool (agentic-chat edge function)

New tool in the TOOLS array:

```jsonc
{
  "type": "function",
  "function": {
    "name": "delete_experience",
    "description": "Removes a work experience entry from the resume. Use when the user asks to delete, remove, or get rid of a specific job or work history entry. Always confirm with the user before deleting.",
    "parameters": {
      "type": "object",
      "properties": {
        "identifier": {
          "type": "string",
          "description": "Company name or job title to identify the experience entry to delete"
        },
        "itemId": {
          "type": "string",
          "description": "Optional: the specific experience entry ID if known"
        }
      },
      "required": ["identifier"]
    }
  }
}
```

The edge function returns this as a `suggestion` response type with a single proposal where
`action = 'delete'`, `original` = JSON string of the matched experience entry, `suggested` = `""`.

### Session Persistence Flow (useAgenticChat)

1. **On mount** (authenticated user): query `chat_sessions` ORDER BY `updated_at DESC` LIMIT 1.
   If found, load all `chat_messages` for that session. Hydrate in-memory `messages` state.
2. **On user message send**: if no active `sessionId`, insert a new `chat_sessions` row (title
   derived from first 50 chars of the message, or "Chat — [date]" fallback for < 10 chars) and
   store the returned `id` as `sessionId`. Then insert the user message into `chat_messages`.
3. **On assistant message received**: insert the assistant message into `chat_messages` (with
   `function_call` JSONB containing tool name + args + suggestions array if present).
4. **startNewSession()**: clear in-memory messages, clear `sessionId` ref, set `isNewSession =
   true`. Next message send will create a fresh `chat_sessions` row.
5. **All DB writes are fire-and-forget** (`supabase.from(...).insert(...)` without `await` in the
   UI critical path). Chat never stalls on DB failure.

### History Panel (AgenticChatSheet)

- Toggled by a `Clock` Lucide icon button in the sheet header (visible to authenticated users only).
- View state: `'chat' | 'history'` — simple toggle, no separate sheet/drawer.
- History view renders up to 50 sessions from a TanStack Query hook (`useChatHistory`).
- Each row: session title (truncated to 40 chars) + relative date. Delete icon on the right.
- Delete flow: clicking the icon transitions the row to an inline "Remove this chat? Confirm / Cancel"
  state. No full-screen modals.
- Clicking a session row calls `loadSession(sessionId)` which fetches messages from DB, hydrates
  state, and switches view back to `'chat'`.
- Empty state: a simple message encouraging the user to start a chat (no icon, no illustration).

---

## Implementation Order

1. **DB migration** (blocks everything) — create tables + RLS + apply with `npx supabase db push`
2. **Type extension** — extend `SuggestionProposal` in `agenticChat.ts`
3. **Persistence layer** — extend `useAgenticChat` (session load, message writes, `startNewSession`)
4. **History panel** — extend `AgenticChatSheet` (view toggle, history list, session load, delete)
5. **Delete experience tool** — add `delete_experience` to edge function + deletion card in sheet
6. **Governance docs** — update `ARCHITECTURE.md` and `CHANGELOG.md`
