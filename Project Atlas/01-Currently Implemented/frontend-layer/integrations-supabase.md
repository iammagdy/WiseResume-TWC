# Supabase frontend integration (`src/integrations/supabase/`)

**Last verified:** 2026-05-08
**Type:** reference card
**Sources:** `src/integrations/supabase/`.

**Canonical owner:** `safeClient.ts` for the authenticated PostgREST client; `edgeFunctions.ts` for edge-fn invocation; both feature-flag files for rollout control.

---

| File | Purpose |
|---|---|
| `safeClient.ts` | The **only** Supabase client app code should import. Wraps `createClient` with the Kinde→Supabase token bridge, an automatic 401-refresh-once retry, and a session-expired event dispatch. Detects PostgREST auth codes (`PGRST301/302/303`) even when surfaced as 400s. Honors `getImpersonationToken()` over the user token. |
| `safeClient.test.ts` | Vitest spec covering env fallback + client init. |
| `edgeFunctions.ts` | Wrapper around all edge-fn invocations. Adds the bearer token, classifies error responses (using `aiErrorParser.parseAIErrorBody`), dispatches `app:session-expired` when appropriate, and rewrites legacy invokes through the `transactionalEmailFlag` and `resumeSectionAiFlag` rollout shims. |
| `sessionExpired.ts` | Debounced (60 s) dispatcher for the `app:session-expired` custom event. Filters out `OFFLINE_NETWORK` and `UNKNOWN` bridge errors so a network blip never logs the user out. |
| `transactionalEmailFlag.ts` | Single-line constant `USE_MERGED_TRANSACTIONAL_EMAIL` controlling Task #55 rollout from the three legacy fns (`send-contact-email`, `submit-contact-request`, `send-resume-reminder`) to the merged `transactional-email` fn. |
| `resumeSectionAiFlag.ts` | Single-line constant `USE_MERGED_RESUME_SECTION_AI` controlling Task #56 rollout from four legacy fns (`enhance-section`, `tailor-section`, `fill-gap`, `explain-gap`) to the merged `resume-section-ai` fn. |
| `types.ts` | Auto-generated PostgREST schema types (Drizzle/Supabase-typed). Re-generate via the codegen step in CI. |

## Hard rules
- **Never** import `@supabase/supabase-js` `createClient` directly anywhere else. Always go through `safeClient.ts`.
- Both flag files are flip-on-deploy: rolling back is only valid during the 24 h soak window before the legacy fns are deleted (`replit.md` rule).
- `safeClient` must remain the only place that reads `getImpersonationToken()` for PostgREST calls — edge-fn callers in `edgeFunctions.ts` read it independently.
