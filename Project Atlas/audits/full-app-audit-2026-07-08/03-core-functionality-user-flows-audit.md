# Core Functionality and User Flows

## Finding P1-FLOW-01 — URL upload/import calls a missing API route

Severity: P1  
Area: Upload/import  
Route/component/function involved: `/upload`, `UploadPage.handleUrlImport`  
User impact: Importing a resume/content URL fails before parsing.  
Backend impact: Vercel returns 404/SPA fallback because `api/fetch-url` is absent.  
Evidence: `src/pages/UploadPage.tsx:306-314` posts to `/api/fetch-url`; `api/` contains no `fetch-url.ts`.  
Reproduction: Open `/upload`, enter a valid HTTP(S) URL, submit, observe failed request. Browser reproduction remains pending.  
Recommended fix: Route this flow through the authenticated `job-import`/appropriate Appwrite contract, or add a hardened Vercel endpoint with SSRF controls and tests. Avoid duplicating fetch logic.  
Fix class: Frontend contract/backend.  
Deployment required: Vercel; Appwrite only if contract changes.  
Manual Appwrite action: No by default.  
Browser QA required: Yes.

## Flow status matrix

| Flow | Code evidence | Runtime status |
|---|---|---|
| Sign up/login/logout | Appwrite auth hooks/pages present | UNKNOWN production |
| OAuth callback | `/auth/callback` route present | UNKNOWN; owner verification pending |
| OTP password reset | `email-service` calls and reset routes present | UNKNOWN production |
| Dashboard list/create/actions | Components/hooks present | UNKNOWN browser |
| Manual resume/editor/autosave | Store/editor components present | UNKNOWN end-to-end |
| PDF/DOCX upload | parsers and tests present | UNKNOWN real files |
| URL upload | Missing API contract | CONFIRMED BROKEN by source |
| AI section improve | JWT, credits, idempotency present in separate hub | UNKNOWN deployed version |
| Preview/PDF/ATS/plain text | UI and Vercel PDF API present | UNKNOWN download evidence |
| Tailoring/deep link/history | routes and gateway calls present | UNKNOWN browser/backend |
| Cover letters | routes/gateway feature present | UNKNOWN |
| Portfolio publish/password/contact | hooks/hubs present | UNKNOWN live permissions/Turnstile |
| Applications/jobs | routes/hooks present | UNKNOWN `/jobs` production smoke |
| Pricing/plans | routes present; billing intentionally disabled | UNKNOWN copy consistency |

## Additional risks

- P2: `job-import` can return `ok:true` when its server-side job document write fails (`appwrite-hubs/job-import/src/main.js:658-675`), relying on a frontend fallback. This creates persistence ambiguity; return an explicit `persisted` flag and test both paths.
- P2: Preview route/source-of-truth mismatch risks wrong-resume export behavior. Verify direct refresh, query/state loss, ownership, selected template, Arabic, and post-tailoring export.
- P2: Custom-domain routing is active for any non-app hostname in `src/AppInterior.tsx`, while Atlas labels custom domains Coming Soon. Confirm platform domain mapping and intended release state.

