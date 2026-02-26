
Goal: restore CV parsing and OCR extraction so uploads return real structured data instead of “no content found”.

What I verified
- The upload flow is reaching the AI parse endpoint URL correctly:
  - POST to `.../functions/v1/parse-resume`
- The browser fails at network layer with `TypeError: Failed to fetch` (no HTTP status), which means the request is blocked before app code can read a response.
- Shared backend CORS logic is the blocker:
  - `supabase/functions/_shared/cors.ts` only allows localhost/native/custom domain list.
  - Current preview origin (`*.lovableproject.com`) is not allowed.
  - For disallowed origins, it returns `Access-Control-Allow-Origin: http://localhost:8080`, which causes browser CORS rejection.
- Because of this, parsing falls back to local regex parser (`parseResumeText`) which is intentionally limited and often returns sparse/empty results.
- OCR itself is extracting text; the AI parse step is what gets blocked.
- No database schema/RLS changes are needed for this fix.

Implementation plan (ordered)
1) Fix shared CORS policy so web preview requests are accepted
- Update `supabase/functions/_shared/cors.ts` to correctly allow:
  - Lovable preview/published origins (`*.lovableproject.com`, `*.lovable.app`)
  - localhost + native app schemes (existing behavior)
  - optional custom domain from env (`ALLOWED_ORIGIN`)
- Ensure denied-origin fallback does NOT return localhost for web callers.
- Return a safe permissive value (`*`) when appropriate, and keep required headers list.
- Expand allowed methods from only `POST, OPTIONS` to include `GET, POST, PUT, PATCH, DELETE, OPTIONS` so non-POST functions don’t break.

2) Make parsing failure explicit instead of silent fallback
- Update `src/lib/pdfParser.ts`:
  - In `parseTextWithAI`, detect transport/CORS failures (`Failed to fetch` / `TypeError`) and throw a typed error (e.g. `AI_UNREACHABLE`) instead of silently falling back to local parser.
  - Keep local parser fallback only for controlled non-network parse failures if needed.
- This prevents “no content found” false negatives when backend is temporarily unreachable.

3) Surface actionable UI feedback during upload/OCR
- Update `src/pages/UploadPage.tsx`:
  - Map `AI_UNREACHABLE` to a clear recovery message:
    - “We couldn’t reach the AI parser. Please retry in a moment.”
  - Keep existing recovery UI (`UploadErrorRecovery`) and avoid blank states.
  - Ensure OCR path (`parseResumePDFWithOCR`) uses same error messaging so users know this is connectivity/CORS, not a bad CV.

4) Remove noisy non-blocking scoring failures from confusing parsing UX
- Update `src/hooks/useResumeScore.ts`:
  - If scoring endpoint is unreachable, suppress repetitive error spam during background scoring and keep import flow successful.
  - Keep manual re-score available.
- This avoids misleading “scoring failed” logs being interpreted as parse failure.

5) Align `score-resume` auth behavior with cross-project token reality (recommended)
- Update `supabase/functions/score-resume/index.ts` similarly to `parse-resume`:
  - Accept optional/cross-project bearer token for rate-limit identity (payload `sub` fallback) instead of hard-failing when token isn’t from this backend.
- This is not the primary parser blocker but will prevent follow-up failures in AI scoring features after CORS is fixed.

Files to change
- `supabase/functions/_shared/cors.ts` (primary fix)
- `src/lib/pdfParser.ts`
- `src/pages/UploadPage.tsx`
- `src/hooks/useResumeScore.ts`
- `supabase/functions/score-resume/index.ts` (recommended stabilization)

Validation checklist (end-to-end)
1. Upload a scanned PDF that previously failed.
   - Expected: OCR runs, AI parse returns populated contact/experience/skills.
2. Upload a text PDF.
   - Expected: no OCR prompt, parse succeeds directly.
3. Confirm browser network:
   - `parse-resume` returns HTTP response (no “Failed to fetch”).
4. Confirm backend logs:
   - parse function receives requests from preview origin.
5. Confirm import UX:
   - No blank screen; recovery UI appears for real errors.
6. Confirm editor result:
   - Resume data is populated (not empty import).
7. Confirm background score behavior:
   - Import still succeeds even if scoring is delayed/unavailable.

Risk and rollback
- Risk: overly strict CORS matching can still miss some preview origins.
- Mitigation: use robust domain pattern matching plus permissive fallback.
- Rollback path: revert only `_shared/cors.ts` if needed; other changes are additive and isolated.

Expected outcome
- Parsing and OCR stop returning empty “no content found” due to blocked AI calls.
- AI extraction pipeline becomes reachable and user-visible errors become accurate when connectivity issues occur.
