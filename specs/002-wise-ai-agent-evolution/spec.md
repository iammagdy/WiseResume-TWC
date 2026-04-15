# Feature Specification: Wise AI Agent Evolution — Phase 1

**Feature ID**: `002-wise-ai-agent-evolution`
**Created**: 2026-04-15
**Status**: Draft
**Scope**: WiseResume only (`job_seeker` accounts)
**Input**: Phased AI agent upgrade — chat persistence + history UI + delete experience tool

---

## Background

The existing `agentic-chat` edge function and `AgenticChatSheet` component already provide
AI-powered tool calling that can add, update, and suggest edits to resume sections. Conversation
history is held only in React state — it is **lost on every page refresh or navigation**. There
is no session history UI, and no way to delete an experience entry via chat. This spec defines
Phase 1 of the agent evolution, with Phases 2 and 3 to follow in separate specs.

| Phase | Scope |
|-------|-------|
| **Phase 1 — this spec** | Chat persistence + history sidebar + delete experience tool |
| Phase 2 (future) | Inline smart quick-add in editor + job search redirect tool + company brief callable from chat |
| Phase 3 (future) | Tool output caching + reuse popups |

---

## User Scenarios & Testing

### User Story 1 — Persistent Chat Sessions (Priority: P1)

A user starts a conversation with Wise AI, closes the sheet, navigates to the dashboard and back,
reopens the chat, and finds their conversation exactly where they left it. They can also start a
fresh session at any time with a "New Chat" action.

**Why this priority**: The current loss of context on every navigation is the biggest friction
point. It makes the agent feel unreliable. Everything else in this spec depends on having
persistent sessions.

**Independent Test**: Open the chat, send three messages, navigate to `/dashboard`, return to
`/editor`, reopen the chat sheet — all three messages are visible. Hard-refresh the page —
messages still present.

**Acceptance Scenarios**:

1. **Given** a logged-in user opens the chat and sends at least one message, **When** they close
   and reopen the sheet, **Then** the full conversation is visible with correct role labels and
   timestamps.
2. **Given** a user has an active session with messages, **When** they click "New Chat", **Then**
   a blank session starts; the previous session is preserved and accessible from history.
3. **Given** a user navigates between `/editor` and `/dashboard`, **When** they reopen the chat
   sheet, **Then** the same session resumes — no messages are lost.
4. **Given** a user sends a new message in a resumed session, **When** the AI responds, **Then**
   the AI has access to the full prior conversation as context (not just the new message).
5. **Given** a guest (unauthenticated) user, **When** they use the chat, **Then** behavior is
   unchanged — in-memory only, no DB writes.
6. **Given** a session was created while editing Resume A, **When** the user is now editing
   Resume B and reopens that old session, **Then** the session messages load normally and the
   currently active resume (Resume B) remains unchanged.

---

### User Story 2 — Chat History Sidebar (Priority: P2)

A user wants to review what they discussed with Wise AI last week. They open a history panel,
see a list of past sessions with a short title and date, click one, and read the full conversation.
They can also delete sessions they no longer want.

**Why this priority**: Persistence without navigation is useless. The history panel is what turns
persisted data into a genuinely useful product feature.

**Independent Test**: Create two separate sessions (via "New Chat"), then open the history panel —
both sessions appear. Clicking a past session loads its full message thread. The delete flow
removes a session cleanly.

**Acceptance Scenarios**:

1. **Given** a logged-in user has multiple sessions, **When** they open the History view, **Then**
   sessions are listed in reverse-chronological order (newest first), capped at 50, each showing
   an auto-generated title and a relative date (e.g., "2 days ago").
2. **Given** a user clicks a past session in the history panel, **When** the session loads,
   **Then** all messages in that session are shown in order with correct role labels.
3. **Given** a user wants to remove a session, **When** they click the delete icon on a session
   row, **Then** an inline two-step confirmation appears (Confirm / Cancel, no modal). On confirm,
   the session and all its messages are permanently deleted.
4. **Given** a user has no sessions yet, **When** they open the History view for the first time,
   **Then** an encouraging empty state is shown prompting them to start a chat.
5. **Given** a user opens a session whose linked resume has since been deleted, **When** the
   session loads, **Then** the messages are displayed normally alongside a small inline notice:
   "The resume linked to this session has been deleted."

---

### User Story 3 — Delete Experience via Chat (Priority: P3)

A user types "delete my Google job" in the chat and Wise AI removes the correct experience entry
after showing a clear confirmation card with Yes / No buttons.

**Why this priority**: The existing toolset cannot delete anything. This completes the CRUD loop
for experience entries and is the most commonly requested missing agent capability.

**Independent Test**: With a resume that has at least two experience entries, type "remove my
[company] experience" — Wise AI shows a "This entry will be removed" card with the matched entry
content and explicit Yes / No buttons. Clicking Yes removes the entry from the live resume;
clicking No leaves it unchanged.

**Acceptance Scenarios**:

1. **Given** a resume has experience entries, **When** the user asks to delete one by company
   name or job title, **Then** Wise AI identifies the matching entry and renders a deletion
   confirmation card showing the full entry content (company, position, dates) with **Yes** and
   **No** action buttons before taking any action.
2. **Given** Wise AI matches exactly one entry, **When** the user clicks **Yes**, **Then** the
   entry is removed from the live resume and the chat shows a success confirmation message.
3. **Given** Wise AI matches exactly one entry, **When** the user clicks **No**, **Then** no
   change is made to the resume and the chat acknowledges the cancellation.
4. **Given** Wise AI cannot uniquely identify the entry (ambiguous match), **When** there are
   multiple candidates, **Then** the AI responds with a text message asking the user to clarify
   which entry to delete — no deletion card is shown until disambiguation.
5. **Given** no experience entries match the user's request, **When** the AI searches the resume,
   **Then** it responds with a text message explaining it could not find a matching entry and
   suggests alternatives.

---

### Edge Cases

- **DB write failure mid-conversation**: The in-memory state remains correct. Background chat
  message writes are non-blocking — a failed write is silently skipped for that message. Credit
  deductions (which happen in the edge function) are unaffected.
- **Auth token expiry mid-conversation**: If the Kinde → Supabase bridge token expires during a
  session, background DB writes for new messages will fail silently. The in-memory chat continues
  uninterrupted. On next page load the bridge re-initialises and persistence resumes.
- **Very short first message**: If the first user message is fewer than 10 characters (e.g.,
  "Hi", "?"), the session title falls back to `"Chat — [Month Day]"` (e.g., "Chat — Apr 15").
  Otherwise the title is the first 50 characters of the first user message (no AI call needed).
- **Session row creation timing**: A `chat_sessions` row is only inserted when the first user
  message is sent — not on "New Chat" click. No orphan empty sessions are created.
- **History list growth**: The history panel displays a maximum of 50 sessions per user. No
  automated pruning occurs — older sessions beyond 50 are simply not shown in the UI.
- **Long session messages**: All messages within a session are loaded in full when a session is
  opened (no pagination in Phase 1). The existing `MAX_HISTORY_SIZE = 200KB` guard in the
  `agentic-chat` edge function handles context window truncation for the AI model.
- **Session with deleted resume**: The session loads normally. A small inline notice is shown:
  "The resume linked to this session has been deleted." No resume context is passed to the AI.
- **Guest user session history**: History panel is not rendered for unauthenticated users.
  In-memory chat behavior is unchanged.

---

## Requirements

### Functional Requirements

- **FR-001**: The system MUST persist all chat messages (user + assistant, including `functionCall`
  metadata and `suggestions` array as JSONB) to Supabase upon send/receive for authenticated users.
- **FR-002**: The system MUST load the most recent active session (and its full message thread)
  when an authenticated user opens the chat sheet.
- **FR-003**: On every new message sent in a resumed session, the system MUST pass the full prior
  message history as `conversationHistory` to the `agentic-chat` edge function so the AI retains
  memory of the prior conversation.
- **FR-004**: Users MUST be able to start a new session at any time via a "New Chat" action
  within the chat sheet.
- **FR-005**: Users MUST be able to view a history panel listing up to 50 past sessions in
  reverse-chronological order, each showing an auto-generated title and relative timestamp.
- **FR-006**: Users MUST be able to open any past session from the history panel and read its
  full message thread.
- **FR-007**: Users MUST be able to delete a session from the history panel using an inline
  two-step confirmation flow (no modal required).
- **FR-008**: The `agentic-chat` edge function MUST support a new `delete_experience` tool that
  identifies an experience entry by company name or job title, returns a deletion confirmation
  response, and completes the deletion only after user confirmation.
- **FR-009**: The `SuggestionProposal` interface MUST be extended with an optional
  `action: 'delete' | 'update'` field. When `action = 'delete'`, the UI renders a "This entry
  will be removed" card with **Yes** and **No** buttons instead of a before/after diff.
- **FR-010**: Chat persistence MUST NOT apply to guest (unauthenticated) users — in-memory
  behavior is fully preserved for guests.
- **FR-011**: All new Supabase tables MUST have Row Level Security enabled. Users may only
  read, insert, update, or delete their own rows.
- **FR-012**: Session titles MUST be derived from the first user message (first 50 chars, or
  "Chat — [date]" fallback) — no AI call is used for title generation.
- **FR-013**: The session history cap of 50 sessions applies uniformly to all subscription tiers
  (Free, Pro, Premium).

### Key Entities

- **ChatSession**: Belongs to a user. Has an auto-generated title (from first user message).
  Records `created_at`, `updated_at`, `resume_id` (nullable FK — which resume was active when
  the session was started).
- **ChatMessage**: Belongs to a session. Has `role` (`user` | `assistant`), `content` (text),
  `function_call` (nullable JSONB — tool name + args + suggestions array), `created_at`.

---

## Success Criteria

- **SC-001**: A user can close and reopen the chat sheet and find their last conversation intact,
  with no visible loading delay beyond 500ms on a standard connection.
- **SC-002**: The history list loads in under 1 second for a user with up to 50 sessions.
- **SC-003**: Asking Wise AI to "delete my [X] experience" renders a deletion confirmation card
  at least 90% of the time when the company name or job title is clearly stated.
- **SC-004**: New DB tables are covered by RLS — a direct Supabase query with another user's
  token MUST return zero rows.
- **SC-005**: Guest users experience zero change in chat behavior — no errors, no DB calls, no
  broken UI.

---

## Assumptions

- The existing `agentic-chat` edge function and `AgenticChatSheet` / `useAgenticChat` hook are
  the authoritative entry points for this feature. This spec extends them, not replaces them.
- The existing `messages` table in the database is for contact/support communications only and
  MUST NOT be repurposed. New `chat_sessions` and `chat_messages` tables are required.
- DB migrations follow the project's actual pattern: raw SQL files in `supabase/migrations/`
  applied with `npx supabase db push`. The spec-kit template references `shared/schema.ts` and
  `npm run db:push` but those do not apply to this project.
- The `delete_experience` tool operates only on in-memory resume data managed by the
  `useResumeStore` / `updateResume` hook — the same mechanism used by all other agent tools.
  No direct DB writes to resume tables are needed.
- The Kinde → Supabase token bridge produces a deterministic UUID v5 per user. RLS policies
  use `auth.uid()` which resolves to this bridge UUID.
- Phase 1 does not add `tool_calls` or `stored_outputs` tables (Phase 3 scope).
- Phase 1 does not add job search, inline quick-add, or company brief in chat (Phase 2 scope).
- `delete_experience` confirmation reuses the existing `suggest_edits` response pathway with the
  new `action: 'delete'` flag on `SuggestionProposal` — no new response type is required in the
  edge function.
- Session title generation is client-side and requires no AI call, no extra credit cost.
- Loading a history session does NOT switch the active resume. The currently loaded resume stays
  as-is; the session messages are shown alongside it.
