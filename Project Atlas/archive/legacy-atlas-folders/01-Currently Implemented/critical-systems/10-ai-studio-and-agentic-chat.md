# AI Studio + Agentic Chat (Wise AI)

**Last verified:** 2026-06-09
**Type:** deep dive
**Sources:**
- `src/pages/AIStudioPage.tsx`
- `src/lib/aiStudioTools.ts`
- `src/components/layout/appSidebarNav.ts`
- `supabase/functions/wise-ai-chat/`
- `supabase/functions/agentic-chat/`
- `supabase/functions/_shared/aiClient.ts`
- `src/components/editor/AgenticChatSheet.tsx`
- `src/components/interview/CompanyBriefingSheet.tsx`
- `src/hooks/useAgenticChat.ts`
- `src/hooks/useToolCache.ts`
- `src/store/chatTriggerStore.ts`
- `src/pages/__tests__/AIStudioPage.test.tsx`
**Canonical owner:** `src/pages/AIStudioPage.tsx`

---

## Two surfaces, one client

Both flows ultimately call `callAI()` from `_shared/aiClient.ts`. They differ in UX and tool set.

## Current frontend IA

The current `/ai-studio` surface is no longer a category grid of equally weighted AI cards.

It now behaves as a Wise AI workspace with:

- a hero chat launcher for Wise AI Chat;
- recent-tool recall from `wr-recent-ai-tools`;
- 6 primary workflow cards;
- 2 secondary workflow cards;
- hidden-but-supported direct links for legacy tools;
- QR utilities removed from the AI Studio information architecture.

### Primary workflows

| Workflow | Main launcher | Notes |
|---|---|---|
| Tailor for a Job | `/tailoring-hub` | Keeps `job-match` as the analytics-safe tool ID |
| Improve My Resume | `/ai-studio/enhance` | Groups resume cleanup utilities under one entry point |
| Prepare for Interview | `/interview` | Interview prep remains the main route |
| Company Briefing | `/ai-studio/company-briefing` | Still exposed as its own primary card |
| Cover Letter | `/cover-letters` | Dedicated route flow unchanged |
| LinkedIn / Personal Brand | `/ai-studio/linkedin` | Brand-adjacent helpers remain contextual |

### Secondary workflows

| Workflow | Main launcher |
|---|---|
| Career Plan | `/career` |
| Write Documents | `/resignation-letters` |

### `wise-ai-chat` - single-shot AI Studio sheets

Powers 7 AI Studio use cases (cold email, job rejection, personal branding, portfolio bio, reference letter, salary negotiation, skills gap).

Frontend: `src/pages/AIStudioPage.tsx` still supports the legacy tool IDs, but presents them through workflow-driven buckets. Most hidden tool sheets still route through `wise-ai-chat`; a few have dedicated edge functions (`generate-cover-letter`, `company-briefing`, `career-path-advisor`, `career-assessment`, `optimize-for-linkedin`, `generate-resignation-letter`, `detect-and-humanize`).

### Hidden tools that remain link-compatible

The following tools are no longer first-class cards in the main AI Studio grid, but direct links remain valid:

- `/ai-studio/tailor`
- `/ai-studio/enhance`
- `/ai-studio/onepage`
- `/ai-studio/humanizer`
- `/ai-studio/ab-compare`
- `/ai-studio/recruiter`
- `/ai-studio/skills-gap`
- `/ai-studio/salary-negotiation`
- `/ai-studio/cold-email`
- `/ai-studio/job-rejection`
- `/ai-studio/personal-branding`
- `/ai-studio/portfolio-bio`
- `/ai-studio/reference-letter`

`/resignation-letters` remains available as the dedicated route for resignation-letter generation, and the QR utilities stay reachable at `/qr-code`, `/qr-batch`, and `/qr-scan` outside AI Studio.

### `agentic-chat` - multi-turn assistant with tool calls

DB-backed sessions (`chat_sessions`, `chat_messages`) and persistent history.

**Tools registered (12 total - verified against `supabase/functions/agentic-chat/index.ts` `TOOLS` array):**

| # | Tool | Purpose |
|---|---|---|
| 1 | `update_summary` | Replace the resume professional summary |
| 2 | `add_experience` | Add a work experience entry |
| 3 | `update_experience` | Edit an existing experience entry by company/position |
| 4 | `update_skills` | Replace the entire skills list |
| 5 | `add_skills` | Append new skills without removing existing ones |
| 6 | `update_contact` | Update one or more contact info fields |
| 7 | `add_project` | Add a project / portfolio piece |
| 8 | `suggest_edits` | Propose edits for user approval |
| 9 | `delete_experience` | Remove a work experience entry |
| 10 | `get_company_briefing` | Trigger company research briefing |
| 11 | `open_job_tracker` | Navigate user to `/applications` |
| 12 | `proofread_and_fix` | Scan resume for grammar, spelling, and clarity fixes |

## Phase 3 - tool output caching

- `tool_cache` table: `(user_id, tool_name, cache_key, output JSONB, created_at, expires_at)` with unique upsert index and 7-day TTL for `get_company_briefing`
- `useToolCache` hook (`src/hooks/useToolCache.ts`): `getCache<T>`, `setCache`, `deleteCache`, `getCacheAge`
- `AgenticChatSheet`: writes via `onBriefingGenerated` callback and can reuse saved company briefings

## "Add with AI" entry point

`ExperienceSection` exposes a Bot-icon button that writes a `pendingPrompt` to `chatTriggerStore` (Zustand). `EditorPage` watches the store and forwards the prompt as `chatInitialMessage` to `AgenticChatSheet`, which auto-opens.

## 2026-06-09 workspace simplification

Frontend-only IA cleanup changed presentation, not backend behavior:

- the sidebar label now reads `Wise AI`;
- the duplicated hero and welcome messaging were removed from the page body;
- primary cards were resized to behave like compact workflow entries rather than oversized feature tiles;
- the interview card no longer duplicates Company Briefing as a secondary button because Company Briefing already has its own primary card.

See `Project Atlas/03-Implemented/wise-ai-workspace-simplification-2026-06-09.md` for the durable implementation report.
