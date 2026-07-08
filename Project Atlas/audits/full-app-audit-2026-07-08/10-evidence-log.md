# Evidence Log

## Repository state

- Branch: `main`; upstream `origin/main`; working tree was clean before reports.
- Recent head: `b70135f4 docs(atlas): update DevKit AI routing session closeout`.
- Current architecture was grounded in living Project Atlas docs only; archive was not used.

## Commands

| Command/check | Result |
|---|---|
| `git status -sb`, branch, recent log | PASS; clean at audit start |
| file/route/hub/test inventories with `rg` | PASS |
| `npx tsc --noEmit` | PASS, exit 0 |
| `npm run build` | PASS, exit 0, 2m31s; large chunk warnings; no source maps |
| `npm run lint` | TIMEOUT after 184s; no final result |
| `npx vitest run --reporter=dot` | FAIL: 155 files passed, 3 failed, 1 skipped; 910 tests passed, 2 failed, 1 todo |
| in-app browser production load | BLOCKED: control timed out before DOM/screenshot |
| Playwright | NOT RUN; fallback required user approval under selected audit procedure |
| Appwrite Console/live logs | NOT ACCESSED |

## Key code evidence

- Missing URL endpoint: `src/pages/UploadPage.tsx:306-314`; no `api/fetch-url.ts`.
- Default-all deployment: `.github/workflows/deploy-appwrite-hubs.yml:6-9,236-241`.
- Unbound visit update: `api/track-portfolio-view.ts:195-203`.
- Separate AI auth/credits/idempotency: `appwrite-hubs/resume-section-ai/src/main.js:275-424,873-883`; `appwrite-hubs/job-import/src/main.js:50-88,554-675`.
- Route inventory: `src/AppInterior.tsx:300-447`.
- Feature-gate toast redirect: `src/AppInterior.tsx` `FeatureGate`.
- HTTP(S)-only QR link classification: `src/pages/QrScanPage.tsx:16-25,163-167`.

## Evidence quality notes

- `CONFIRMED` means direct source or completed command evidence.
- `UNKNOWN` means live runtime, browser, console, secret, permission, or deployed-version evidence was unavailable.
- No production verification claim is made.
