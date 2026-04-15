# CHANGELOG

Local changelog tracking WiseResume changes.

## 2026-04-15 (Release v2.5.4)

- Updated the app version to v2.5.4.
- Added a new plain-language changelog entry for users.
- Improved the admin email search so it waits briefly before running lookups while you type.

---

## 2026-04-15 (Task #8 — Wise AI Phase 1: Chat Persistence + History)

### FEAT — Wise AI chat session persistence (spec: 002-wise-ai-agent-evolution)

- **DB** (`supabase/migrations/20260415161238_chat_sessions.sql`): Two new tables with RLS. `chat_sessions` (id, user_id FK→auth.users CASCADE, resume_id FK→resumes SET NULL, title, created_at, updated_at) + `chat_messages` (id, session_id FK→chat_sessions CASCADE, role CHECK IN ('user','assistant'), content, function_call JSONB). Sessions are never auto-pruned (the 50-session limit is a UI display cap only via `.limit(50)` in `useChatSessions`). Performance indexes on `(user_id, updated_at DESC)` and `(session_id, created_at ASC)`.
- **`src/lib/agenticChat.ts`**: Added `action?: 'delete' | 'update'` to `SuggestionProposal` interface to support the delete-experience confirmation flow.
- **`src/hooks/useChatHistory.ts`** (new): TanStack Query hooks — `useChatSessions()` (50-session list ordered by `updated_at DESC`, enabled only when authenticated), `useSessionMessages(sessionId)` (messages for a session), `useDeleteChatSession()` (mutation with cache invalidation).
- **`src/hooks/useAgenticChat.ts`**: Full persistence layer added. On mount loads the latest session from DB (once per auth session). `sessionIdRef` tracks active session; session row created on FIRST user message with title derived from message text (first 50 chars; "Chat — [date]" if < 10 chars). All user and assistant messages persisted fire-and-forget via `persistMessage()`. New public exports: `startNewSession()` (clears messages + nulls sessionId), `loadSession(id)` (loads a historical session's messages from DB + sets sessionId). Added `delete_experience` acceptance logic in `applySuggestion`: when `action === 'delete'` and `section === 'experience'`, filters the matching entry from `currentResume.experience` via identifier lookup.
- **`src/hooks/useChatHistory.ts`** (new): see above.
- **`supabase/functions/agentic-chat/index.ts`**: Added `delete_experience` tool (params: `identifier`, `explanation`, optional `itemId`). Handler looks up the matching experience entry in `currentResume`, builds a human-readable description of the entry, and returns a `SuggestionResult` with `action: 'delete'` — the frontend shows a confirmation card before applying. `SuggestionResult` interface extended with `action?: 'delete' | 'update'`.
- **`src/components/editor/AgenticChatSheet.tsx`**: History panel added behind a Clock icon button in the header. Toggles between `'chat'` and `'history'` panel states. History view: session list (title + date) with two-step inline delete confirm (Trash2 → Delete/Cancel). Clicking a session loads it via `loadSession()` and returns to chat view. Empty state shown when no sessions exist. New `DeleteConfirmCard` component: renders for `proposal.action === 'delete'` proposals — shows "Entry to remove" block with destructive styling + "Yes, Delete" / "Cancel" buttons instead of the standard Before/After diff. `FunctionCallBadge` updated with `delete_experience → 'Deleted Experience'` label. `clearChat` replaced with `startNewSession` throughout.

**Files changed**: `supabase/migrations/20260415161238_chat_sessions.sql`, `src/lib/agenticChat.ts`, `src/hooks/useChatHistory.ts` (new), `src/hooks/useAgenticChat.ts`, `supabase/functions/agentic-chat/index.ts`, `src/components/editor/AgenticChatSheet.tsx`, `project-governance/ARCHITECTURE.md`, `project-governance/CHANGELOG.md`

---

## 2026-04-15 (Task #7 — Build from Text resume creation mode)

### FEAT — "Build from Text" in CreateResumeDialog

- **`CreateResumeDialog.tsx`**: Added fifth `CreateMode` value `'paste'`. New "Build from Text" option appears in the mode picker (after "Import Profile"). Mode renders a textarea for freeform career text and an optional title input. On submit, calls `parse-linkedin` edge function with `platform: 'generic'`, maps the parsed `ProfileData` to `ResumeData` (same field mapping as `showLocalImport`), creates the resume via `useResumeMutations.createResume`, and navigates to `/editor`. Errors render inline below the textarea (no toast). Loading state shows "Building..." on the submit button. State (`pasteText`, `pasteTitle`, `pasteError`) is reset in `resetAndClose`.
- **`parse-linkedin/index.ts`** — `generic` platform hint updated: added explicit instruction that input may be informal or bullet-point notes, and that AI must never invent data not present in the text.
- **Intent**: Competes directly with Google's "Smart CV Generator" — lets users build a structured resume from any unstructured career text (notes, a bio, informal bullet points) without needing a polished LinkedIn export or PDF.

**Files changed**: `src/components/dashboard/CreateResumeDialog.tsx`, `supabase/functions/parse-linkedin/index.ts`, `project-governance/ARCHITECTURE.md`, `project-governance/CHANGELOG.md`

---

## 2026-04-15 (Governance — AI System Architecture Amendment)

### GOV-AI-AUDIT — AI System Governance Update

A full audit of all AI providers, AI Studio tools, and Supabase edge functions was run on 2026-04-15. Findings were used to expand `project-governance/ARCHITECTURE.md` and promote four structural observations into enforceable governance rules.

**Section 2 (Modification Rules) — Four new enforceable rules added:**
- **Rule A — Four-Layer Security Invariant**: Every new AI endpoint must enforce, in order: JWT auth → rate limit → atomic credit check → payload size guard. BYOK users bypass credit check only.
- **Rule B — Deterministic Scoring is Sacred**: `score-resume` uses no AI and must not deduct credits. Its `_shared/scoringFunctions.ts` logic must remain deterministic. Replacing it with AI requires a spec + constitution amendment.
- **Rule C — Orphan Function Retention**: `fetch-github-projects` is retained pending UI wiring ("Sync GitHub" in portfolio settings). Deletion without explicit owner sign-off is a governance violation.
- **Rule D — Voice Pipeline Change Protocol**: The three-layer interview voice pipeline (ElevenLabs STT → Gemma LLM → browser TTS) must be validated end-to-end before any change merges.

**Section 8 (AI System Architecture) — Expanded with:**
- Credit system clarifications: 2-credit cost for `tailor-resume`/`generate-cover-letter`; `score-resume` credit exemption noted.
- BYOK Strict Mode and hard-vs-skippable error distinction documented.
- Full 8-step AI routing priority chain (previously only 3 steps documented).
- AI Studio Tools Inventory: all 15 tools listed by category with edge function mappings.
- `wise-ai-chat` dispatch map: all 7 accepted `type` values with purpose descriptions.
- Voice Interview Pipeline: three-layer diagram, fallback path, and scoring behaviour documented.
- Key Frontend AI Hooks table: `useAIAction`, `useAICredits`, `useVoiceInterview`, `useAIEnhance`, `usePlan`.

**Files changed**: `project-governance/ARCHITECTURE.md`, `project-governance/CHANGELOG.md`

---
