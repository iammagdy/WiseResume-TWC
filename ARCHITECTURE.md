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

**Handled tools:**
- `add_experience`, `update_experience`, `delete_experience` — resume mutation
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
Streaming chat endpoint. Tool call loop with 12 registered tools:

1. `get_resume` — fetch resume data
2. `update_section` — replace a resume section
3. `add_experience` — add a work experience entry
4. `update_experience` — edit an experience entry
5. `delete_experience` — remove an experience entry
6. `add_education` — add an education entry
7. `update_education` — edit an education entry
8. `add_skill` — add a skill tag
9. `remove_skill` — remove a skill tag
10. `add_project` — add a project entry
11. `get_company_briefing` — trigger company research briefing (Phase 2)
12. `open_job_tracker` — navigate user to job application tracker (Phase 2)

---

## Phase History

| Phase | Task | Status |
|---|---|---|
| 1 | DB-backed chat sessions, history sidebar, delete_experience tool | Complete |
| 2 | `get_company_briefing` + `open_job_tracker` tools; "Add with AI" in Experience editor; frontend tool handlers | Complete |
| 3 | `tool_cache` DB table + `useToolCache` hook; cache-reuse UI in chat | Complete |
