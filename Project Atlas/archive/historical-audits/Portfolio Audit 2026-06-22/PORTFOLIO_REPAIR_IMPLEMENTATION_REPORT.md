# WiseResume Portfolio — Repair Implementation Report

**Date:** 2026-06-22
**Branch:** `fix/portfolio-repair` (off `main` @ `4f639724`)
**Status:** `READY_FOR_REVIEW` → then `READY_FOR_DEPLOY_APPROVAL` (after the owner-verification items below)
**Scope:** Implements the approved repair plan for every finding in
`PORTFOLIO_FULL_DISCOVERY_AUDIT.md`. **Nothing pushed, merged, or deployed. No production data mutated.**

Owner decisions applied: contact → owner only (reply-to visitor); owner email → never public;
custom domains → disabled/hidden (not built); Vercel `api/public-portfolio` → ownership re-check only, marked legacy.

---

## 1. Summary of fixes
Security/privacy hardened across the portfolio backend and frontend: contact form now reaches the
owner (not admin); owner email/user_id removed from all public output; brute-force lockout added to the
real password path; password hash no longer leaves the server; chat/credit caps fail closed; timing-safe
comparisons standardized; visitor-question injection hardened. Reliability/UX: custom-domain UI disabled
honestly; duplicate publish toast removed; canonical share/template URLs; analytics routed through the
validated server endpoint; rate-limited public state; byte-accurate draft guard. P3-09 (secret separation)
was **deferred** after verification showed a naive fix would break DevKit auth.

## 2. Findings coverage table
| ID | Status | Notes |
|----|--------|-------|
| PORT-P1-01 | ✅ Fixed | Contact → owner via username lookup; `reply_to` = visitor; 422 if owner has no email |
| PORT-P1-02 | ✅ Fixed | email + user_id removed from JSON-LD, `get-public-portfolio`, Vercel `mapProfile` |
| PORT-P1-03 | ✅ Fixed | Lockout (8/15min per username+IP) on `get-public-portfolio` + `verify-portfolio-password` |
| PORT-P1-04 | ⚠️ Needs owner verification | Collection-ID drift — confirm live IDs before unifying (no code change yet) |
| PORT-P1-05 | ✅ Fixed (disabled) | Custom-domain editor UI replaced with "coming soon"; saved value preserved |
| PORT-P2-01 | ✅ Fixed (+verify) | Hash no longer echoed to `portfolio_extras`/client state; **verify `portfolio_settings` perms** |
| PORT-P2-02 | ✅ Fixed | session-cap, chat rate-limit, daily-cap fail **closed** on DB error |
| PORT-P2-03 | ✅ Fixed | server per-session cap authoritative (fail-closed); client cap is a hint only |
| PORT-P2-04 | ✅ Fixed | single `portfolio_settings` read (TOCTOU removed) |
| PORT-P2-05 | ✅ Fixed | `crypto.timingSafeEqual` over fixed-length digests (no length oracle) |
| PORT-P2-06 | ✅ Fixed | Vercel `getResume` ownership re-check; path marked legacy/secondary |
| PORT-P2-07 | ✅ Fixed | `updateProfile({silent})` — no duplicate publish toast |
| PORT-P2-08 | ⚠️ Needs owner verification | OG `APPWRITE_DATABASE_ID` / `profiles` read strategy (no blind code change) |
| PORT-P2-09 | ✅ Fixed | template footer + sample data + Career-Card share use canonical `wiseresume.app` |
| PORT-P2-10 | ✅ Fixed | view beacon → validated `/api/track-portfolio-view` (sendBeacon). Follow-up: added the real Vercel serverless route `api/track-portfolio-view.ts` (the route previously existed only in the non-Vercel `server/index.ts`, so the beacon would have 404'd in production); validates input, server-side write, stores no visitor IP. |
| PORT-P2-11 | ✅ Fixed | visitor question capped/sanitized; `<profile_data>`/`<visitor_question>` wrappers |
| PORT-P3-01 | ✅ Fixed | distinct rate-limited public state (no false "Not Found") |
| PORT-P3-02 | ◻️ Not changed | hardcoded project/endpoint fallbacks left (non-secret, single-project repo); low value/risk |
| PORT-P3-03 | ✅ Fixed | `parseBody` JSON.parse guarded in 3 hubs (400 not 500) |
| PORT-P3-04 | ◻️ Deferred | gate enumeration throttle — deferred (optional) |
| PORT-P3-05 | ◻️ Deferred (docs) | in-memory limits documented as best-effort |
| PORT-P3-06 | ✅ Verified safe | print layout already `esc()`-encodes hrefs — no change needed |
| PORT-P3-07 | ◻️ Deferred (docs) | XFF/Cloudflare dependency documented |
| PORT-P3-08 | ✅ Fixed | all 3 draft/extras guards use UTF-8 byte size |
| PORT-P3-09 | ⛔ Deferred (risky) | minter signs DevKit tokens with `APPWRITE_API_KEY`; safe fix needs a new dedicated secret + env (owner) |
| PORT-P3-10 | ✅ Fixed | `user_id` dropped from analytics journey response |
| PORT-P3-11 | ⚠️ Needs owner verification | data check for legacy plaintext `resume_shares` passwords (upgrade-on-access kept) |
| PORT-P3-12 | ✅ Fixed | robust `initials` (whitespace-safe) |
| PORT-SEC-15 | ✅ Fixed | `validateCustomDomain` reserved-domain check uses exact/suffix match (was substring `includes`). NOTE: surfaced by the security discovery pass; **not** a numbered finding in the consolidated audit — included as extra hardening. (Earlier drafts mislabeled this "PORT-P3-15"; corrected.) |
| "chat missing" | ✅ Verified safe | wiring exists via `public-share` actions (refuted) |
| hash in public resp | ✅ Verified safe | public functions never return the hash |

## 3. Files changed
Hubs: `appwrite-hubs/get-public-portfolio/src/main.js`, `verify-portfolio-password/src/main.js`,
`portfolio-gate/src/main.js`, `ai-gateway/src/main.js`, `public-share/src/main.js`,
`admin-visitor-analytics/src/main.js`.
Frontend/API: `api/public-portfolio.ts`, `src/hooks/usePortfolioSEO.ts`, `usePublicPortfolio.ts`,
`useProfile.ts`, `usePortfolioTracking.ts`, `src/pages/PortfolioEditorPage.tsx`, `PublicPortfolioPage.tsx`,
`src/components/portfolio/editor/MoreTab.tsx`, `src/components/portfolio/CareerCardSheet.tsx`,
`src/components/templates/WiseResumeClassicTemplate.tsx`, `src/lib/templateData.ts`.
Generated: `src/lib/devkit/sourceHashes.generated.json`. Docs: this report + `CHANGELOG.md` + handover.

## 4. Tests / validation results
- `npx tsc --noEmit` → **PASS** (exit 0)
- `npm run build` → **PASS** (exit 0, 58s; only pre-existing chunk-size advisories; no sourcemaps)
- `node --check` on all 6 changed hubs → **PASS**
- `node tests/hubs/portfolio-password-verification.test.cjs` → **PASS**
- Targeted vitest (usePublicPortfolio, PublicPortfolioPage, PortfolioPrivate-D8, MoreTab, usePortfolioSEO) → **37/37 PASS**
- `git diff --check` → clean

## 5. Source hash changes
Regenerated via `scripts/compute-source-hashes.mjs` → `src/lib/devkit/sourceHashes.generated.json`.
Updated hubs: get-public-portfolio, verify-portfolio-password, portfolio-gate, ai-gateway, public-share,
admin-visitor-analytics.

## 6. Appwrite hub deployment targets (after approval — official GitHub Actions workflow only, no Console, no `target=all`)
`get-public-portfolio,verify-portfolio-password,portfolio-gate,ai-gateway,public-share,admin-visitor-analytics`

## 7. Vercel deployment note
Frontend + `api/public-portfolio.ts` + `server/index.ts` (track endpoint already existed) ship via the normal
Vercel deploy. Deploy **hubs first**, then Vercel, so the client never calls an un-deployed contract.

## 8. Manual Appwrite verification checklist (owner)
- [ ] `portfolio_settings` read permission is **server-only** (PORT-P2-01).
- [ ] `portfolio_session_rate_limits` collection exists with `count` + `reset_at` (PORT-P1-03; chat rate-limit now fails closed).
- [ ] `chat_sessions.question_count` attribute exists (PORT-P2-02/03 enforcement).
- [ ] Username collection IDs — resolve drift `username_*` vs `portfolio_*` (PORT-P1-04).
- [ ] Function CORS allowed-origins restricted (not wildcard) for portfolio hubs.
- [ ] OG: `APPWRITE_DATABASE_ID` set; `profiles` read strategy for `/og-image` (PORT-P2-08).
- [ ] Any legacy plaintext passwords in `resume_shares` (PORT-P3-11).

## 9. Manual QA checklist (post-deploy)
Owner: publish/unpublish; username change; resume select/change; enable/disable + save password (no client hash);
custom-domain shows "coming soon"; copy/QR/Career-Card use wiseresume.app; **contact form → owner receives, reply-to = visitor**.
Visitor: open `/p/:username`; wrong password ×8 → "Too many attempts" (not Not Found); correct password; mobile;
chat cap not resettable by new tab; SEO/social preview shows **no email**; malformed username; unpublished portfolio.

## 10. Risks / remaining warnings
- Brute-force lockout + chat rate-limit now **depend on their collections existing** (fail-closed). Verify §8 before deploy or chat/session-creation could be blocked.
- PORT-P3-09 (secret separation) intentionally not done — would break DevKit auth without a coordinated secret rollout.
- Legacy docs keep an `extras.passwordHash` echo until the owner republishes (then it's dropped). Optional cleanup script deferred.
- Custom-domain feature remains unbuilt by design.

## 11. Final status
`READY_FOR_REVIEW` — code complete, validated locally, on branch only. Promote to
`READY_FOR_DEPLOY_APPROVAL` once the §8 Appwrite Console items are confirmed. **Awaiting owner approval to push/PR/deploy.**
