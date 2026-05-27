# Frontend Audit

## Summary

The frontend is a React/Vite SPA with Appwrite auth and Vercel SPA rewrites. Route coverage, lazy loading, error boundaries, Sentry integration, and auth session hardening are present. Local TypeScript passes. Full lint fails and production build was not run because `npm run build` triggers a `prebuild` asset-copy script, which this audit treated as outside the safest read-only command set.

## Checks

| Check | Evidence | Status | Risk/Impact | Recommendation |
|---|---|---|---|---|
| React/Vite setup | `package.json`, `vite.config.ts` | PASS | Modern SPA stack present. | Run build in clean CI/Vercel environment. |
| TypeScript | `npx tsc --noEmit` exit code 0 | PASS | Type-level compilation passes. | Keep mandatory. |
| Lint | `npm run lint` exit code 1, 2064 problems | FAIL | Quality gate is not release-clean. | Fix or scope lint before launch. |
| Build readiness | `npm run build` inspected, not run | UNKNOWN | Build may fail despite typecheck. | Verify Vercel build logs for commit `7523be92` or run in clean throwaway environment. |
| Routing | `src/App.tsx`, `src/AppInterior.tsx` | PASS | Public, auth, protected, WiseHire, admin, share routes exist. | Add route smoke coverage. |
| Protected route behavior | `ProtectedRoute.tsx`, tests passed | PASS | Waits for session validation and email verification. | Production refresh smoke. |
| WiseHire guard | `WiseHireGuard.tsx` | UNKNOWN | Guard exists but comments reference old Kinde/Supabase concepts. | Test HR/job-seeker production accounts. |
| Error boundaries | `ErrorBoundary.tsx`, `main.tsx` | PASS | Catches global and route errors; handles chunk failures. | Verify Sentry DSN and alerts. |
| Loading states | Skeleton components and Suspense fallbacks | PASS | Many lazy pages have fallbacks. | Add visual smoke for mobile/slow network. |
| Empty/error states | Partial evidence in pages/hooks | UNKNOWN | Not exhaustively inspected. | Add e2e negative-path tests. |
| Env var naming | `VITE_APPWRITE_*`, `VITE_SENTRY_DSN`, `removed web payment API key` | PASS | Client vars are correctly prefixed. | Verify no server secrets in Vercel client env. |
| Source maps | `vite.config.ts` disables unless Sentry token exists; deletes after upload | PASS | Reduces source exposure. | Verify Vercel artifacts contain no `.map` files. |
| CSP/security headers | `vite.config.ts` CSP meta; `vercel.json` headers | PASS with caveat | CSP uses `script-src 'unsafe-inline'`; headers omit HSTS. | Harden CSP/HSTS after validating app behavior. |
| Performance | Lazy routing, manual chunks, deferred Sentry | PASS | Good cold-start practices present. | Use Vercel/Lighthouse/Web Vitals data. |
| Bundle size | GitHub workflow has entry chunk check; not active for Vercel | UNKNOWN | Vercel may not enforce same threshold. | Add Vercel/CI bundle budget. |
| Mobile/cross-browser | Responsive classes exist; no live visual audit | UNKNOWN | Mobile upload/OCR/PDF are high-risk. | Run iOS Safari/Android Chrome smoke. |

## Runtime Risks

- **AI errors can surface broadly.** Many UI flows depend on `appwriteFunctions.invoke`; AI gateway issues can affect Tailor, AI Studio, cover letters, parsing, portfolio bio, and WiseHire tools.
- **Direct Appwrite DB writes depend on live permissions.** The frontend writes resumes, profiles, portfolio data, WiseHire records, notifications, shares, and more through Appwrite SDK calls.
- **Storage fallback behavior is mixed.** Auth now avoids trusting `sessionStorage`, but dashboard/onboarding/profile banners still use local/session storage for UX flags.
- **Sentry sends default PII.** `monitoring.ts` sets `sendDefaultPii: true`; Replay masks text, but event/user data policy needs explicit review.
- **Old comments/docs can mislead operators.** Several comments still mention Supabase/Kinde even though active code is Appwrite-native.

## Vercel Build Compatibility

- `vercel.json` rewrites non-API paths to `/index.html`, which is correct for React Router SPA routes.
- `/api/export/pdf-native.ts` is configured as a Vercel function with Chromium include files and 60-second max duration.
- `package.json` uses Node `>=22.0.0`; Vercel project should be configured for Node 22.
- `npm run build` runs `tsc --noEmit && vite build && node scripts/check-no-sourcemaps.mjs`, but `prebuild` copies PDF/OCR assets.

**Status:** UNKNOWN until Vercel production build logs are reviewed for the latest commit.

## Frontend Production Recommendations

1. Make `npx tsc --noEmit`, targeted auth tests, and a Vercel production smoke test required before launch.
2. Resolve or intentionally baseline lint failures so `npm run lint` can be trusted.
3. Add Playwright flows for signup, verification, login refresh, resume create/edit/save, AI failure states, and PDF export.
4. Add mobile smoke coverage for upload/OCR/editor/export.
5. Verify Sentry events, source-map upload/delete behavior, and privacy redaction in production.
