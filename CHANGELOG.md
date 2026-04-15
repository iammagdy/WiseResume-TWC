# Changelog

## 2026-04-15 — Wise AI Phases 2 & 3

### Phase 2: New AI Tools
- Added `get_company_briefing` tool to agentic-chat edge function: AI can now research a company and open the Company Briefing sheet from conversation
- Added `open_job_tracker` tool to agentic-chat edge function: AI can redirect the user to the Applications tracker (/applications)
- SYSTEM_PROMPT updated to describe both new tools with usage guidance

### Phase 2: "Add with AI" in Experience Editor
- Added Bot-icon button to `ExperienceSection` for each experience entry; clicking sends a pre-filled message to the Wise AI chat
- `chatTriggerStore` (Zustand) created at `src/store/chatTriggerStore.ts`; deep components write, EditorPage reads and opens AI chat sheet automatically
- `EditorPage` now watches `pendingPrompt` from the trigger store and forwards it as `chatInitialMessage` to `AgenticChatSheet`

### Phase 2: Frontend Tool Handlers
- `useAgenticChat` exports `pendingAction` / `clearPendingAction`; handles `get_company_briefing` (sets pending action) and `open_job_tracker` (navigates to /applications)
- `AgenticChatSheet` handles `get_company_briefing` tool call: checks cache, shows inline "View Saved / Generate Fresh" decision card, then opens `CompanyBriefingSheet`
- `CompanyBriefingSheet` accepts `initialCompanyName`, `initialBriefing`, and `onBriefingGenerated` props; auto-generates when company name provided without cached data

### Phase 3: Tool Output Caching
- New Supabase migration: `tool_cache` table with `(user_id, tool_name, cache_key, output JSONB, created_at, expires_at)`; unique index for upsert; 7-day TTL for `get_company_briefing`
- `useToolCache` hook at `src/hooks/useToolCache.ts`: `getCache`, `setCache`, `deleteCache`, `getCacheAge` — all RLS-safe, only active for authenticated users; normalised cache keys
- `AgenticChatSheet` writes to cache via `onBriefingGenerated` callback; reads cache before opening briefing sheet; inline UI shows cache age and offers "View Saved / Generate Fresh" choice
