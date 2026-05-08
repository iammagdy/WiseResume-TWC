# 02 - Migration Tracking (Phase 5: Rebuild on Appwrite)

**Current Phase:** Phase 5 (Web-app rebuild on Appwrite Functions / Databases)
**Migration Status:** Auth + AI Hub COMPLETE ✅ · Data layer + non-AI features REBUILD PENDING ⚠️

## Completed Milestones
- [x] **Phase 0:** Master Plan & Rules established.
- [x] **Phase 1:** Kinde REMOVED from web app. Appwrite Auth ACTIVE. Claim-Account flow implemented.
- [x] **Phase 2:** 99 Collections created. Initial production data migrated (21 users, 20 resumes).
- [x] **Phase 3:** AI-Gateway Hub LIVE. 24 features routed via `appwrite-bridge.ts` `AI_HUB_FUNCTIONS` set. 7-key pool configured.
- [x] **Phase 4 (corrected scope):** AI features migrated to direct Appwrite Function execution. *Note: the data layer (`/api/data/*`) and the ~60 non-AI edge functions were NOT migrated in Phase 4 despite the previous "99% COMPLETE" tracker entry.*
- [x] **Cleanup:** GitHub Workflows reduced from 33 to 4 essentials.
- [x] **2026-05-08 — Scorched-earth Supabase + Kinde removal from web app.** Top-level `supabase/` directory deleted. `@supabase/supabase-js` and `@kinde-oss/kinde-auth-react` uninstalled. Replit env vars (`VITE_KINDE_*`, `VITE_SUPABASE_*`, `SUPABASE_*`) deleted. Express server collapsed from 5 577 lines to a ~80-line minimal stub. The 9 legacy bridge files (`supabaseBridge.ts`, `supabaseAuth.ts`, `supabaseConstants.ts`, `apiFetch.ts`, `apiFnUrl.ts`, `safeClient.ts`, `edgeFunctions.ts`, `sessionExpired.ts`, integration `types.ts`) converted to throw-stubs that surface `pending_appwrite_migration` instead of silently calling Supabase. CSP, vite chunks, scripts, and tests cleaned up.

## Remaining (Phase 5 — Rebuild)
- [ ] Rebuild data layer: replace every `apiFetch('/api/data/*')` call with an Appwrite SDK `databases.listDocuments()` / `createDocument()` / `updateDocument()` / `deleteDocument()` call against the matching collection.
- [ ] Rebuild ~60 non-AI Appwrite Functions to replace the deleted Supabase Edge Functions (admin-*, wisehire-*, transactional-email, portfolio-public, token-exchange, me, …).
- [ ] Rebuild server-side PDF export as an Appwrite Function (Puppeteer worker). Until shipped, the Express stub returns `503` for `POST /api/export/pdf-native`.
- [ ] Migrate remaining Storage buckets (Profile photos & Resume PDFs) and re-enable CORS for the public `photoUrl` bucket.
- [ ] Update Admin DevKit UI to call new Appwrite Functions.
- [ ] Migrate the **mobile app** (`mobile/`) — currently still pointing at the legacy backend. Out of scope for the 2026-05-08 web cutover.
- [ ] Final production sign-off and deletion of the throw-stubs once every importer has been migrated.

## Stub-deletion checklist (post-rebuild)
Once no source file imports from any of these, physically delete them:
- `src/lib/supabaseBridge.ts`, `src/lib/supabaseAuth.ts`, `src/lib/supabaseConstants.ts`
- `src/lib/apiFetch.ts`, `src/lib/apiFnUrl.ts`
- `src/integrations/supabase/` (entire directory)
- The catch-all `/api/*` 503 handler in `server/index.ts`
