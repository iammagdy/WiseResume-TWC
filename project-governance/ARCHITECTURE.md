# Architecture Truth & Security Rules

## 1. Source of Architectural Truth
You MUST NEVER assume outdated documentation (such as files in `legacy-docs/enhancements-for-vibe-coding/` or other older folders) represents the true architecture. The current codebase is the primary source of truth, and specifically:
* **Authentication Provider**: **Kinde ONLY**
  * The project uses a Kinde → Supabase Token Bridge consisting of a `token-exchange` edge function and a singleton `supabaseBridge.ts` lifecycle manager.
* **Backend and Database**: **Supabase ONLY**
  * Core tables include `resumes`, `profiles`, `cover_letters`, `interview_sessions`, and others with RLS.
  * Edge Functions handle AI tools, email, PDF generation, parsing, etc.

## 2. Modification Rules
* Existing Edge Functions, database integrations, and current backend wiring MUST be inspected before any modification.
* Do NOT assume outdated Auth documentation is correct if the current implementation shows otherwise.
* **Do Not Touch**: Agents MUST NEVER manually modify auto-generated or read-only files. This includes:
  * `src/integrations/supabase/types.ts`
  * `src/integrations/supabase/client.ts`
  * `.env`
  * `supabase/config.toml`
  * `bun.lock` / `package-lock.json`

## 3. Security and Privacy Rules
* **Data Exposure**: You MUST NEVER expose user data, interview content, resume data, private profile data, session data, tokens, or hidden fields improperly.
* **Key Management**: BYOK (Bring Your Own Key) API keys MUST be handled securely.
* **Public/Private Boundaries**: Public pages MUST expose ONLY intentionally public data.
* **Authorization**: You MUST NEVER weaken authentication, authorization, or data protection without explicit approval.
