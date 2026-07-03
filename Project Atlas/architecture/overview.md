# WiseResume/WiseHire — Architecture Overview

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 SPA + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand stores (`src/store/`) |
| Auth + DB | Supabase (PostgreSQL + RLS) |
| Edge Functions | Deno / Supabase Edge Functions (`supabase/functions/`) |
| Mobile | Capacitor (iOS / Android build targets) |

---

## Key Frontend Modules

### `src/hooks/useAgenticChat.ts`
Central hook for the Wise AI chat. Manages message history (Supabase-backed), tool call parsing, streaming responses, and exports `pendingAction` / `clearPendingAction` for tool-driven side effects.

**Handled tools** (subset — full registry is in `agentic-chat/index.ts`; see Edge Functions section below):
- `update_summary`, `add_experience`, `update_experience`, `delete_experience`, `update_skills`, `add_skills`, `update_contact`, `add_project` — resume mutations
- `suggest_edits`, `proofread_and_fix` — proposal / review flows
- `get_company_briefing` — sets `pendingAction` with company name; `AgenticChatSheet` reads it and opens the briefing sheet (with cache check)
- `open_job_tracker` — navigates to `/applications`

### `src/components/editor/AgenticChatSheet.tsx`
Bottom-sheet UI for Wise AI chat. Renders message history, typing indicator, inline **cache-reuse card** (Phase 3), and mounts `CompanyBriefingSheet` as a sub-sheet. Reads `useToolCache` to check for a cached company briefing before opening the briefing sheet.

### `src/components/interview/CompanyBriefingSheet.tsx`
Sheet that generates (and displays) an AI company briefing. Accepts:
- `initialCompanyName` — pre-fills company name and auto-generates if no cached briefing
- `initialBriefing` — pre-populates briefing from cache (skips generation)
- `onBriefingGenerated(briefing, companyName)` — callback used by `AgenticChatSheet` to write result to `tool_cache`

### `src/hooks/useToolCache.ts`
RLS-safe Supabase hook for tool output caching. Methods: `getCache<T>`, `setCache`, `deleteCache`, `getCacheAge`. Uses normalised (lowercase + underscore) cache keys and 7-day TTL enforced at DB level.

### `src/store/chatTriggerStore.ts`
Zustand store. Allows deep components (e.g. `ExperienceSection`) to write a `pendingPrompt` string; `EditorPage` watches it and forwards the prompt as `chatInitialMessage` to `AgenticChatSheet`.

---

## Database Tables (Supabase / PostgreSQL)

| Table | Purpose |
|---|---|
| `resumes` | Resume documents (JSONB) |
| `chat_sessions` | DB-backed Wise AI sessions |
| `chat_messages` | Per-session message history |
| `tool_cache` | Cached tool outputs (e.g. company briefings); 7-day TTL |
| `applications` | Job application tracker |

All tables have **Row Level Security** policies; users can only access their own rows.

---

## Edge Functions (`supabase/functions/`)

92 Deno edge functions. Key function for Wise AI:

### `agentic-chat/index.ts`
Streaming chat endpoint. Tool call loop with 12 registered tools (verified against `supabase/functions/agentic-chat/index.ts` `TOOLS` array):

1. `update_summary` — replace the resume professional summary
2. `add_experience` — add a work experience entry
3. `update_experience` — edit an existing experience entry by company/position
4. `update_skills` — replace the entire skills list
5. `add_skills` — append new skills without removing existing ones
6. `update_contact` — update one or more contact info fields
7. `add_project` — add a project / portfolio piece
8. `suggest_edits` — propose edits for user approval (subjective/risky changes)
9. `delete_experience` — remove a work experience entry (Phase 1, confirmation required)
10. `get_company_briefing` — trigger company research briefing (Phase 2)
11. `open_job_tracker` — navigate user to `/applications` (Phase 2)
12. `proofread_and_fix` — scan resume for grammar/spelling/clarity fixes

---

## Phase History

| Phase | Task | Status |
|---|---|---|
| 1 | DB-backed chat sessions, history sidebar, delete_experience tool | Complete |
| 2 | `get_company_briefing` + `open_job_tracker` tools; "Add with AI" in Experience editor; frontend tool handlers | Complete |
| 3 | `tool_cache` DB table + `useToolCache` hook; cache-reuse UI in chat | Complete |
