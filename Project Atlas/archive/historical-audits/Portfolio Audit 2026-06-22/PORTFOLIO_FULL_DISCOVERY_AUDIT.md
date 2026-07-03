# WiseResume Portfolio — Full Discovery Audit

**Date:** 2026-06-22
**Type:** Discovery-first product / technical / security / data-flow / UX audit
**Scope:** The entire Portfolio feature, end-to-end (owner setup → publish → public view → password gate → visitor interactions → chat/contact → analytics → share/SEO → custom domain → admin username management).
**Method:** Read-only discovery from current repo HEAD. Four parallel discovery passes (frontend flow, backend functions, schema/tests, adversarial security) + owner-level manual verification of the highest-impact and conflicting claims.
**Repo state at audit:** branch `main`, HEAD `4f639724` == `origin/main` (clean, 0 ahead / 0 behind).
**Source of truth:** current repo code. Atlas docs used for history only.

> **Audit only. No code was changed, nothing committed, pushed, or deployed.** Every claim is backed by `file:line` evidence or explicitly marked `UNKNOWN / NEEDS LIVE VERIFICATION`. Live Appwrite Console state (collection permissions, function CORS, rate limits) cannot be read from the repo and is flagged where it matters.

---

## A. Executive Summary

**Overall verdict: `PASS WITH WARNINGS`.**

The Portfolio feature is broadly well-architected and most of the headline security controls are genuinely in place (React auto-escaping holds, `safeHref()` scheme allowlist, honeypot, fail-closed password gate on settings-read error, server-side resume ownership check on the primary path, secrets with no fallback defaults). The recent XSS/AI-abuse remediation commits (`ff1a803a`, `61924ade`) were verified to still hold at HEAD.

However, there are several **High (P1)** issues that are user-visible or privacy-relevant, and two **product capabilities that are exposed in the UI but do not actually work end-to-end** (custom domains; portfolio contact-form delivery to the owner). These must be addressed before public launch.

- **Ready for broad user testing?** **YES, with warnings.** Nothing is an actively-trivial P0 data breach. But testers will hit the misleading custom-domain UI and the misdirected contact form, so brief testers or fix those first.
- **Ready for public launch?** **NO — not yet.** Fix the P1 set below (contact-form misdirection, custom-domain honesty, email-in-JSON-LD, password brute-force gap on the live path, collection-ID drift verification) first.

### Top 5 Risks
1. **`PORT-P1-01` Portfolio contact form delivers to the platform admin, not the owner** — UI explicitly promises "goes directly to [owner]"; backend hardcodes `to: ['contact@thewise.cloud']`. Owner never receives messages; admin silently reads all visitor→owner private messages. (Confirmed.)
2. **`PORT-P1-02` Owner contact email published in public JSON-LD + public API payload** — harvestable by spam crawlers; bypasses the on-page email obfuscation. (Confirmed.)
3. **`PORT-P1-03` No brute-force lockout/rate-limit on the *primary* (Appwrite) password path** — `get-public-portfolio` / `verify-portfolio-password` have no throttle; the rate-limiting code exists only on the secondary Vercel `api/` path that the app does not primarily use.
4. **`PORT-P1-04` Collection-ID drift for username/rules collections** — admin hub and frontend catalog reference *different* collection IDs; one side may be silently operating on non-existent or parallel collections. NEEDS LIVE VERIFICATION but is a latent data-integrity landmine.
5. **`PORT-P1-05` Custom-domain resolution is an O(n) full-table scan and the lookup hook is stubbed** — feature is configurable in the paid UI but not functional/scalable end-to-end.

### Top 5 Product Gaps
1. **Custom domains** — fully presented in the editor (DNS panel, validation) but not wired to a working, scalable lookup or any provisioning. Paying users get no error and no working domain.
2. **Portfolio contact form** — non-functional for its stated purpose (owner delivery); also defaults to enabled.
3. **Portfolio AI chat** — wired (action handlers exist) but session-cap enforcement is fail-open + client-side-resettable; live functionality NEEDS LIVE VERIFICATION.
4. **Rate-limited / error states on the public page** — a rate-limited or non-`invalid_password` error renders a generic "Not Found," confusing legitimate visitors.
5. **Two backend codepaths (Appwrite functions vs Vercel `api/`) have diverging defaults** (theme, scroll effect, ownership re-check, rate-limiting), so behavior depends on which path serves a request — a maintenance and consistency hazard.

---

## B. Actual Portfolio Pipeline Map (as discovered)

### Owner side
1. **Setup** — Owner opens `/portfolio` ([AppInterior.tsx:364](src/AppInterior.tsx:364)), gated by `ProtectedRoute` + `JobSeekerRoute` + `feature_portfolio` flag. Page: [PortfolioEditorPage.tsx](src/pages/PortfolioEditorPage.tsx) (~1675 lines).
2. **Username selection** — debounced 500 ms availability check queries the `profiles` collection **directly from the browser** ([PortfolioEditorPage.tsx:498-531](src/pages/PortfolioEditorPage.tsx:498)); validation against rules from `usePortfolioUsernameRules` ([:540-560](src/pages/PortfolioEditorPage.tsx:540)).
3. **Publish/save** (`handleSave`, [:833-1156](src/pages/PortfolioEditorPage.tsx:833)) — client validation → authoritative DB read of `portfolio_settings` → re-check username uniqueness → `updateProfile()` writes `profiles` (overwrites the `portfolio_extras` JSON blob) → if password changed, **bcrypt-hash in the browser (cost 12)** and upsert `portfolio_settings` → invalidate `['public-portfolio']` / `['portfolio-gate']` caches → toast.
4. **Data storage** — `profiles` (top-level + `portfolio_extras` JSON blob containing case studies, services, testimonials, highlights, translations, draft, **and `passwordEnabled`/`passwordHash` echoes**), `portfolio_settings` (`password_enabled`, `password_hash`), `portfolio_history`, `portfolio_*_usernames`/rules collections.
5. **Owner links** — `getPortfolioCanonicalUrl()` (`https://wiseresume.app/p/<u>`) for copy/QR/"View live"; `getPortfolioUrl()` (runtime host) for navigation and **the Career Card LinkedIn share** ([CareerCardSheet.tsx:483](src/components/portfolio/CareerCardSheet.tsx:483)).

### Public side
6. **Route** — `/p/:username` → [PublicPortfolioPage.tsx](src/pages/PublicPortfolioPage.tsx) ([AppInterior.tsx:402](src/AppInterior.tsx:402)); custom hostnames branch to `CustomDomainPortfolioWrapper` ([AppInterior.tsx:270](src/AppInterior.tsx:270)).
7. **Gate (phase 1)** — `usePortfolioGate(username)` → Appwrite function `portfolio-gate` → `{exists, portfolioEnabled, passwordEnabled, accentColor}` (no hash). Fail-closed on settings error.
8. **Password gate UI** — `<PasswordGate>` if `passwordRequired && !portfolio` ([PublicPortfolioPage.tsx:390-403](src/pages/PublicPortfolioPage.tsx:390)).
9. **Fetch (phase 2)** — `usePublicPortfolio(username, enabled, password)` → Appwrite function `get-public-portfolio` → verifies bcrypt/SHA-256 hash, returns `{profile, resume, sessionToken}`. Resume fetched with **ownership re-check** on this path.
10. **Render** — `PublicHero` + lazy `PublicSections`; SEO via `usePortfolioSEO`; analytics beacons via `usePortfolioTracking`.
11. **Visitor actions** — contact form (`PortfolioContactForm` → `send-contact-email` via ai-gateway, Turnstile/honeypot) and AI chat (`ChatWidget` → `create-portfolio-chat-session` then `ask-portfolio`, both routed to the `public-share` function).
12. **Custom domain** — `usePublicPortfolioByDomain` is a **stub** ([usePublicPortfolio.ts:248-257](src/hooks/usePublicPortfolio.ts:248)); actual resolution is the Vercel `api/public-portfolio?mode=domain` O(n) scan ([api/public-portfolio.ts:123-147](api/public-portfolio.ts:123)).

---

## C. File and Function Inventory

### Frontend
| File / Component | Role | Inputs | Outputs | Risk notes |
|---|---|---|---|---|
| [PortfolioEditorPage.tsx](src/pages/PortfolioEditorPage.tsx) | Owner editor (all config) | profile, resumes, username rules | `updateProfile`, direct `portfolio_settings` writes | Browser bcrypt; reads `portfolio_settings` (hash) client-side; double toast; tab race (`:895-902`) |
| [PublicPortfolioPage.tsx](src/pages/PublicPortfolioPage.tsx) | Public render + gate orchestration | `:username`, gate, fetch hooks | rendered page / NotFound / gate | 429 → NotFound; `initials` whitespace edge case (`:447`) |
| [usePublicPortfolio.ts](src/hooks/usePublicPortfolio.ts) | Gate + full fetch + domain utils | username, password | `PublicPortfolio`/gate | Custom-domain hook stubbed; error→null |
| [useProfile.ts](src/hooks/useProfile.ts) | Owner profile CRUD + normalization | userId | `Profile` (incl. `portfolioExtras.passwordHash`) | No `Query.select`; loads hash into browser (`:255`) |
| [usePortfolioSEO.ts](src/hooks/usePortfolioSEO.ts) | `<head>` meta + JSON-LD | profile | DOM tags | **email in JSON-LD (`:84`)**; robots respects `seoNoindex` (good) |
| [usePortfolioTracking.ts](src/hooks/usePortfolioTracking.ts) | View/dwell beacons | username | writes `portfolio_visits` | Unauthenticated client write → inflation risk |
| [portfolioUrl.ts](src/lib/portfolioUrl.ts) / [urlUtils.ts](src/lib/urlUtils.ts) | URL resolution / `safeHref` allowlist | host, raw URL | safe URL | `safeHref` good; `DOMAIN_MAP` keeps old domain |
| [CareerCardSheet.tsx](src/components/portfolio/CareerCardSheet.tsx) | Career card + LinkedIn share | username | PNG / share URL | Share uses runtime domain, not canonical (`:483`) |

### Backend (Appwrite functions + Express + Vercel API)
| Function | File | Purpose | Auth | Execute | Collections | Deployed via |
|---|---|---|---|---|---|---|
| get-public-portfolio | [main.js](appwrite-hubs/get-public-portfolio/src/main.js) | Full public fetch + inline password verify + session token | public; internal API key | `["any"]` | profiles, portfolio_settings, resumes (R) | `deploy_hubs.cjs` / workflow |
| portfolio-gate | [main.js](appwrite-hubs/portfolio-gate/src/main.js) | Gate metadata only (no hash) | public | `["any"]` | profiles, portfolio_settings (R) | same |
| verify-portfolio-password | [main.js](appwrite-hubs/verify-portfolio-password/src/main.js) | Standalone password check | public | `["any"]` | profiles, portfolio_settings (R) | same |
| public-share | [main.js](appwrite-hubs/public-share/src/main.js) | actions: verify-share-password, **create-portfolio-chat-session**, **ask-portfolio** | public; internal token | `["any"]` | profiles, resumes, resume_shares, chat_sessions, portfolio_session_rate_limits (R/W) | same |
| ai-gateway | [main.js](appwrite-hubs/ai-gateway/src/main.js) | AI hub; ask-portfolio proxy; send-contact-email | JWT (except ask-portfolio internal token) | `["any"]` | ai_credits, chat_sessions, contact_requests, … | same |
| admin-portfolio-usernames | [main.js](appwrite-hubs/admin-portfolio-usernames/src/main.js) | Admin username CRUD/rules/premium | signed DevKit token | `["any"]` | username_* collections | same |
| admin-visitor-analytics | [main.js](appwrite-hubs/admin-visitor-analytics/src/main.js) | Analytics aggregation | signed DevKit token | `["any"]` | visitor_events (R) | same |
| POST /api/export/pdf-native | [server/index.ts:422](server/index.ts:422) | PDF export (Puppeteer) | JWT required | — | none | Vercel |
| GET /og-image/:username | [server/index.ts:929](server/index.ts:929) | OG image (Puppeteer) | **none (public)** | — | profiles (R, project-header only) | Vercel |
| POST /api/track-portfolio-view | [server/index.ts:698](server/index.ts:698) | View beacon sink | none | — | portfolio_visits (W) | Vercel |
| POST /api/portfolio-interest | [server/index.ts:795](server/index.ts:795) | Lead capture | none | — | portfolio_interactions (W) | Vercel |
| GET/POST /api/public-portfolio | [api/public-portfolio.ts](api/public-portfolio.ts) | **Secondary** gate/domain/full fetch path; has IP password rate-limit | public | — | profiles, resumes, portfolio_session_rate_limits | Vercel |

> **Routing note:** the frontend `appwriteFunctions` wrapper maps logical names → physical functions: `ask-portfolio`/`create-portfolio-chat-session`/`verify-share-password` → `public-share` ([appwrite-functions.ts:239-275](src/lib/appwrite-functions.ts:239)); AI features → `ai-gateway`. This refutes any claim that those chat functions are "missing" — they are action handlers inside `public-share`.

---

## D. Schema and Data Model Map

| Collection | Key fields | Class | Indexes | Permissions | Known risks |
|---|---|---|---|---|---|
| **profiles** | `username`, `user_id`, `portfolio_enabled`, `portfolio_bio`, `portfolio_resume_id`, `portfolio_style/layout/accent/font`, `portfolio_sections`, **`portfolio_extras` (JSON blob incl. `passwordHash`, `passwordEnabled`, `customDomain`, `contactFormEnabled`)**, `portfolio_draft`, `contact_email`, social URLs, `seo_noindex` | Dual (owner full doc; public via server fn) | `username` index required | NEEDS LIVE VERIFICATION | `passwordHash` lives in the owner-readable blob; `customDomain` not a top-level indexed field |
| **portfolio_settings** | `user_id`, `password_enabled`, `password_hash` | Should be **server-only** | `user_id` index | **NEEDS LIVE VERIFICATION** — editor reads it from the browser ([PortfolioEditorPage.tsx:909,1038](src/pages/PortfolioEditorPage.tsx:909)) | If client read is allowed, bcrypt hash reaches the browser |
| **portfolio_visits** | `username`, `ref`, `sections_viewed`, `time_spent_seconds`, `device`, `ab_variant` | Public write / owner read | `username`, `$createdAt` (NLV) | Public create (NLV) | Unauthenticated writes → count inflation; analytics index NLV |
| **portfolio_session_rate_limits** | `count`, `reset_at`; doc id = hash(username\|ip) | Server-only | doc-id lookup | Server-only | Fail-open if collection missing (see findings) |
| **chat_sessions** | session/question counters | Server-only | NLV | Server-only | Cap fail-open on non-404 error |
| **contact_requests** | `name`, `email`(req), `subject`, `message`(req), `status`, `user_id` | Server-write / admin-read | `email_idx`, `status_idx` | NLV | No `user_id` index |
| **portfolio_history** | `user_id`, snapshots | Owner-only | NLV | Owner R/W | **No setup script in repo** — schema only in live Console (NLV) |
| **portfolio_interactions** | unknown (`user_id` implied) | UNKNOWN | UNKNOWN | UNKNOWN | **No setup script in repo** (NLV) |
| **username_rules / _overrides / _reserved / _exclusive / _premium** (admin hub IDs) | rules, reserved/premium lists | Server/admin-only | mostly doc-id | Admin-only | **ID DRIFT** vs frontend catalog (`portfolio_username_rules`, `portfolio_user_overrides`, `portfolio_reserved_usernames`, `portfolio_exclusive_assignments`, `portfolio_premium_usernames`) — [admin main.js:44-48](appwrite-hubs/admin-portfolio-usernames/src/main.js:44) vs [appwrite-collections.ts:103-114](src/lib/appwrite-collections.ts:103) |
| **resumes** | `user_id`, summary, experience, education, skills, projects, … | Owner-only | `user_id` (NLV) | Owner R/W | Vercel `getResume` fast-path skips ownership re-check ([api/public-portfolio.ts:266-280](api/public-portfolio.ts:266)); Appwrite fn does re-check (good) |

---

## E. Findings

Severity key: **P0** critical · **P1** high · **P2** medium · **P3** low · **UX/Gap** · **NLV** needs live verification.
For each: deployment column → `Vercel` (frontend/api), `Appwrite hub` (function redeploy), `Schema/manual` (Appwrite Console action), or `none`.

### PORT-P1-01 — Portfolio contact form delivers to admin, not the owner *(CONFIRMED)*
- **Severity:** P1 · **Category:** Product Gap / Privacy / Trust
- **Evidence:** [ai-gateway/src/main.js:3156](appwrite-hubs/ai-gateway/src/main.js:3156) hardcodes `to: ['contact@thewise.cloud']` as the only recipient; no owner-email lookup. UI claims delivery to the owner: [PortfolioContactForm.tsx:195](src/components/portfolio/public/PortfolioContactForm.tsx) ("Your message goes directly to [owner] — no account needed").
- **Impact:** Owner never receives visitor messages (feature broken for its purpose). Platform admin silently receives/reads private visitor→owner messages. The on-screen promise is false → trust/legal exposure.
- **Root cause:** `send-contact-email` is a shared endpoint (also used for bug/crash reports, where admin delivery is correct); the `portfolio_contact` case was never given owner routing.
- **Recommended fix:** For `type === 'portfolio_contact'`, look up the owner's `contact_email` by username server-side and send there (set `reply_to` = visitor); error clearly if owner has no contact email; correct the UI copy.
- **Risk of fix:** Low–medium (touches a live function path; add a test). **Suggested tests:** unit test that portfolio_contact resolves owner recipient; reject when missing. **Deploy:** Appwrite hub (ai-gateway).

### PORT-P1-02 — Owner contact email exposed in public JSON-LD and public API payload *(CONFIRMED)*
- **Severity:** P1 · **Category:** Privacy
- **Evidence:** [usePortfolioSEO.ts:84](src/hooks/usePortfolioSEO.ts:84) writes `jsonLdData.email = profile.contactEmail` into a `<script type="application/ld+json">`; `user_id` and `contactEmail` are also returned in the public profile payload ([get-public-portfolio/src/main.js:184](appwrite-hubs/get-public-portfolio/src/main.js:184) area). On-page obfuscation (`data-eu/data-ed`) is bypassed at the JSON-LD/API level.
- **Impact:** Owner email harvested by crawlers/scrapers at scale; defeats the deliberate on-page obfuscation.
- **Root cause:** email included in structured data + public projection without an opt-in or obfuscation.
- **Recommended fix:** Remove `email` from JSON-LD; omit `contactEmail`/`user_id` from the public payload (expose contact only via the gated contact form / click-to-reveal).
- **Risk of fix:** Low. **Tests:** assert public response and JSON-LD contain no `email`/`user_id`. **Deploy:** Vercel (SEO hook) + Appwrite hub (payload).

### PORT-P1-03 — No brute-force lockout on the primary (Appwrite) password path
- **Severity:** P1 · **Category:** Security
- **Evidence:** `get-public-portfolio` and `verify-portfolio-password` verify passwords inline with **no rate limit / lockout / delay** (entire handlers). The IP-based password rate-limiting (`recordPasswordFailure`, `portfolio_session_rate_limits`, 8/15min) exists **only** on the secondary Vercel path ([api/public-portfolio.ts](api/public-portfolio.ts); asserted by [publicPrivacyHardening.test.ts](src/lib/security/publicPrivacyHardening.test.ts)). The app's primary runtime path is the Appwrite functions ([usePublicPortfolio.test.tsx](src/hooks/__tests__/usePublicPortfolio.test.tsx) confirms gate→`portfolio-gate`, fetch→`get-public-portfolio`).
- **Impact:** Unlimited online password guessing against any password-protected portfolio. Mitigated by bcrypt cost-12 (slow) but no lockout exists on the live path; success immediately returns full data.
- **Root cause:** rate-limiting was implemented on the path the app doesn't primarily use.
- **Recommended fix:** Port the IP/username failure-counter + lockout into `get-public-portfolio` / `verify-portfolio-password` (reuse `portfolio_session_rate_limits`).
- **Risk of fix:** Medium (auth path). **Tests:** repeated wrong-password attempts → lockout. **Deploy:** Appwrite hub.

### PORT-P1-04 — Collection-ID drift for username/rules collections *(NLV)*
- **Severity:** P1 · **Category:** Data Integrity
- **Evidence:** admin hub hardcodes `username_rules`, `username_rules_overrides`, `username_reserved`, `username_exclusive`, `username_premium` ([admin-portfolio-usernames/src/main.js:44-48](appwrite-hubs/admin-portfolio-usernames/src/main.js:44)); frontend catalog lists `portfolio_username_rules`, `portfolio_user_overrides`, `portfolio_reserved_usernames`, `portfolio_exclusive_assignments`, `portfolio_premium_usernames` ([appwrite-collections.ts:103-114](src/lib/appwrite-collections.ts:103)).
- **Impact:** If the two sides point at different live collections, admin changes (reserved/premium/rules) won't reflect in the user-facing validation, or one side silently operates on non-existent collections. Username governance becomes unreliable.
- **Root cause:** naming divergence between hub and catalog; no shared constant.
- **Recommended fix:** Verify live Console collection IDs; unify both sides on one ID set via a shared constant.
- **Risk of fix:** Low (constants) once the correct IDs are confirmed. **Deploy:** Appwrite hub + Vercel (+ possible Schema/manual rename). **Owner confirmation required** (Console inspection).

### PORT-P1-05 — Custom-domain lookup is O(n) full scan + the hook is stubbed
- **Severity:** P1 · **Category:** Performance / Reliability / Product Gap
- **Evidence:** [api/public-portfolio.ts:123-147](api/public-portfolio.ts:123) paginates up to ~5,000 `profiles`, parsing each `portfolio_extras` blob to match `customDomain` (not an indexed top-level field). [usePublicPortfolio.ts:248-257](src/hooks/usePublicPortfolio.ts:248) documents the hook as a non-functional stub.
- **Impact:** Each custom-domain hit is a read storm; does not scale. The editor still presents custom domains as a working paid feature (see PORT-UX-01).
- **Root cause:** `customDomain` stored inside a JSON blob; no indexed field; no provisioning.
- **Recommended fix:** Promote `custom_domain` to an indexed top-level attribute; query with `Query.equal`; or gate the feature off until built.
- **Risk of fix:** Medium (schema migration). **Deploy:** Schema/manual + Vercel + Appwrite hub.

### PORT-P2-01 — `portfolio_settings` (password_hash) read from the browser *(NLV)*
- **Severity:** P2 (P1 if Console perms allow client read) · **Category:** Security
- **Evidence:** [PortfolioEditorPage.tsx:909,1038](src/pages/PortfolioEditorPage.tsx:909) read `portfolio_settings` via the browser SDK; `passwordHash` is also embedded in `portfolio_extras` and loaded by `useProfile` into React state ([useProfile.ts:255](src/hooks/useProfile.ts:255), [PortfolioEditorPage.tsx:276](src/pages/PortfolioEditorPage.tsx:276)).
- **Impact:** The owner's own bcrypt hash reaches their browser (defense-in-depth weakness). **If** `portfolio_settings` read permission is broader than owner-only, it becomes a cross-user hash leak.
- **Recommended fix:** Keep `password_hash` only in a server-only collection; never return it to any client; verify Console permissions on `portfolio_settings`. Stop echoing `passwordHash` into `portfolio_extras`.
- **Deploy:** Vercel + Schema/manual (permissions). **Owner confirmation required.**

### PORT-P2-02 — Session-cap & rate-limit checks fail OPEN on DB errors
- **Severity:** P2 · **Category:** Security / Reliability
- **Evidence:** `validatePortfolioSession` returns `{ok:true}` on non-404 errors ([ai-gateway/src/main.js:1156-1163](appwrite-hubs/ai-gateway/src/main.js:1156)); `checkPortfolioSessionRateLimit` returns `{ok:true}` on DB error ([public-share/src/main.js:157-158](appwrite-hubs/public-share/src/main.js:157)); portfolio daily AI cap also fails open.
- **Impact:** During DB hiccups or a missing collection, AI question caps / session rate limits are silently bypassed → owner credit drain / abuse.
- **Recommended fix:** Fail closed (deny) on enforcement-path DB errors; ensure `portfolio_session_rate_limits` / `chat_sessions` exist in all environments.
- **Deploy:** Appwrite hub (+ Schema/manual to ensure collections exist).

### PORT-P2-03 — Portfolio AI chat cap is client-side-resettable
- **Severity:** P2 · **Category:** Security / Product
- **Evidence:** [ChatWidget.tsx](src/components/portfolio/public/ChatWidget.tsx) stores `questionCount` in `sessionStorage` (resettable by new tab); server cap depends on PORT-P2-02 which can fail open.
- **Recommended fix:** Make the server-side per-session cap authoritative and fail-closed.
- **Deploy:** Appwrite hub.

### PORT-P2-04 — Password gate TOCTOU: `portfolio_settings` read twice
- **Severity:** P2 · **Category:** Security
- **Evidence:** main handler reads settings (fail-closed) then `verifyPassword()` re-reads independently and treats a missing doc as valid ([get-public-portfolio/src/main.js](appwrite-hubs/get-public-portfolio/src/main.js) ~`:148`,`:321-338`).
- **Impact:** Narrow race (settings deleted between reads) could bypass the gate.
- **Recommended fix:** Read settings once; pass hash + flag into the verifier.
- **Deploy:** Appwrite hub.

### PORT-P2-05 — Hand-rolled timing-safe compare early-exits on length
- **Severity:** P2 · **Category:** Security
- **Evidence:** `timingSafeCompare` returns false on length mismatch ([get-public-portfolio/src/main.js:67-74](appwrite-hubs/get-public-portfolio/src/main.js:67); [verify-portfolio-password/src/main.js:37-44](appwrite-hubs/verify-portfolio-password/src/main.js:37)). `public-share` correctly uses `crypto.timingSafeEqual` — inconsistent.
- **Impact:** Length/format oracle via timing; bcrypt value itself not directly recoverable.
- **Recommended fix:** Use `crypto.timingSafeEqual` on fixed-length buffers everywhere.
- **Deploy:** Appwrite hub.

### PORT-P2-06 — Two backends diverge on defaults & ownership re-check
- **Severity:** P2 · **Category:** Data Integrity / Reliability
- **Evidence:** theme default `'modern'` (Appwrite fn) vs `null`→`'minimal'` (Vercel) — owner intent not honored; `scrollEffect` `'none'` vs `'fade'`; Vercel `getResume` fast-path skips `user_id` re-check ([api/public-portfolio.ts:266-280](api/public-portfolio.ts:266)) while the Appwrite fn re-checks.
- **Recommended fix:** Single source of truth for mapping/defaults; add the ownership re-check to the Vercel path (or retire it).
- **Deploy:** Vercel (+ Appwrite hub).

### PORT-P2-07 — Double success toast on publish
- **Severity:** P2 · **Category:** UX
- **Evidence:** `updateProfile()` fires `toast.success('Profile updated')` ([useProfile.ts:387](src/hooks/useProfile.ts:387)) and `handleSave` fires `'Published!…'` ([PortfolioEditorPage.tsx:1096](src/pages/PortfolioEditorPage.tsx:1096)).
- **Recommended fix:** Suppress the generic toast on the publish path.
- **Deploy:** Vercel.

### PORT-P2-08 — OG image fetches profile with project header only (no API key) *(NLV)*
- **Severity:** P2 · **Category:** Reliability / NLV
- **Evidence:** [server/index.ts:946-952](server/index.ts:946) sends only `X-Appwrite-Project`; needs `APPWRITE_DATABASE_ID` (no deploy-script injection found). If `profiles` lacks guest read, OG cards silently degrade to username-only.
- **Recommended fix:** Verify env + read strategy for OG; confirm `profiles` public-read intent.
- **Deploy:** Schema/manual (perms/env) — **owner confirmation**.

### PORT-P2-09 — Hardcoded old domain `resume.thewise.cloud` in resume templates
- **Severity:** P2 · **Category:** Product / SEO
- **Evidence:** [WiseResumeClassicTemplate.tsx:369](src/components/WiseResumeClassicTemplate.tsx:369), [templateData.ts:409,419](src/lib/templateData.ts:409); Career Card share uses runtime domain ([CareerCardSheet.tsx:483](src/components/portfolio/CareerCardSheet.tsx:483)).
- **Recommended fix:** Point to `wiseresume.app` / canonical helper.
- **Deploy:** Vercel.

### PORT-P2-10 — Unauthenticated analytics writes (count inflation)
- **Severity:** P2 · **Category:** Data Integrity
- **Evidence:** [usePortfolioTracking.ts:101-105](src/hooks/usePortfolioTracking.ts:101) writes `portfolio_visits` directly from the browser; no server validation of `username`.
- **Recommended fix:** Route writes through a server endpoint with validation/throttle (the `/api/track-portfolio-view` endpoint already exists — prefer it over direct SDK writes).
- **Deploy:** Vercel (+ Schema/manual perms).

### PORT-P2-11 — Prompt injection surface in portfolio chat
- **Severity:** P2 · **Category:** Security
- **Evidence:** visitor `question` injected with delimiter-based separation only ([ai-gateway/src/main.js:2481-2518](appwrite-hubs/ai-gateway/src/main.js:2481)).
- **Recommended fix:** Hardened XML-tag isolation + output filtering.
- **Deploy:** Appwrite hub.

### PORT-P3-xx — Lower-severity items
- **PORT-P3-01** Rate-limited (429) / non-`invalid_password` errors render generic "Not Found" ([PublicPortfolioPage.tsx:409](src/pages/PublicPortfolioPage.tsx:409)). *UX.* Vercel.
- **PORT-P3-02** Hardcoded project ID / endpoint as `||` fallbacks across hubs (masks misconfig). *Security/Ops.* Appwrite hub.
- **PORT-P3-03** `parseBody` JSON.parse not individually guarded → 500 on malformed body. *Reliability.* Appwrite hub.
- **PORT-P3-04** Username/portfolio enumeration via `portfolio-gate` with no throttle. *Security.* Appwrite hub.
- **PORT-P3-05** In-memory rate limits (og-image, track-view, interest, ai-gateway email) reset on cold start / per-instance. *Reliability.* Vercel/hub.
- **PORT-P3-06** Print-layout `safeHref` output not HTML-attr-encoded ([portfolioPrintLayout.ts](src/lib/portfolioPrintLayout.ts)). *Security (low).* Vercel.
- **PORT-P3-07** `XFF` IP spoofing for rate limits off-Cloudflare ([ai-gateway/src/main.js:146-186](appwrite-hubs/ai-gateway/src/main.js:146)). *Security.* Appwrite hub.
- **PORT-P3-08** Draft-size guard uses `.length` (UTF-16 units) not bytes → CJK over-budget risk ([PortfolioEditorPage.tsx:418](src/pages/PortfolioEditorPage.tsx:418)). *Data.* Vercel.
- **PORT-P3-09** Admin DevKit token accepted if signed with `APPWRITE_API_KEY` (secret-separation) ([admin-portfolio-usernames/src/main.js:61-65](appwrite-hubs/admin-portfolio-usernames/src/main.js:61)). *Security.* Appwrite hub.
- **PORT-P3-10** `journey` analytics returns `user_id` ([admin-visitor-analytics/src/main.js:480-494](appwrite-hubs/admin-visitor-analytics/src/main.js:480)). *Privacy (admin-only).* Appwrite hub.
- **PORT-P3-11** Legacy plaintext share passwords may persist in `resume_shares` until accessed ([public-share/src/main.js:300-313](appwrite-hubs/public-share/src/main.js:300)). *Security.* Appwrite hub + data check.
- **PORT-P3-12** `contactFormEnabled` defaults to `true`; `initials` whitespace edge case. *UX.* Vercel.

### REFUTED / corrected during verification
- **"Portfolio chat function `create-portfolio-chat-session` is missing / chat is dead"** — **REFUTED.** It is a logical name routed to `public-share` ([appwrite-functions.ts:49,239-275](src/lib/appwrite-functions.ts:49)) and handled there ([public-share/src/main.js:431,434](appwrite-hubs/public-share/src/main.js:431)). Wiring exists; live end-to-end success is NLV.
- **"Password hash exposed in public API responses"** — **REFUTED for public/visitor responses.** `portfolio-gate`, `get-public-portfolio`, `verify-portfolio-password` all omit the hash from public payloads. The real residual concern is owner-browser exposure (PORT-P2-01).

### Verified-safe (with evidence)
1. No `dangerouslySetInnerHTML` in public portfolio components; React escaping holds (commits `ff1a803a`/`61924ade` still effective).
2. `safeHref()` scheme allowlist (`http/https/mailto/tel`) on all owner URLs ([urlUtils.ts:52-74](src/lib/urlUtils.ts:52)); `javascript:`/`data:` rejected.
3. Fail-CLOSED on `portfolio_settings` read error in gate + main functions.
4. Server-side resume ownership check on the primary path ([get-public-portfolio/src/main.js:263](appwrite-hubs/get-public-portfolio/src/main.js:263)).
5. Honeypot (`website` field) silently drops bots ([PortfolioContactForm.tsx:200-224](src/components/portfolio/public/PortfolioContactForm.tsx:200), [ai-gateway:3097](appwrite-hubs/ai-gateway/src/main.js:3097)).
6. Video embeds restricted to YouTube/Vimeo/Loom allowlist.
7. `PORTFOLIO_JWT_SECRET` / `PUBLIC_SHARE_TOKEN_SECRET` have **no fallback defaults** (fail at startup).
8. Session token binds `username` + `userId` (anti-recycle).
9. Robots `noindex` respects owner `seoNoindex` ([usePortfolioSEO.ts:37](src/hooks/usePortfolioSEO.ts:37)).
10. Unpublished portfolios return 404 (with fail-closed default if settings missing).

---

## F. Missing / Incomplete Capabilities (separate from bugs)
- **Custom domains** — UI-complete, not functional/scalable (PORT-P1-05, PORT-UX-01). No automated provisioning.
- **Portfolio contact form** — non-functional for owner delivery (PORT-P1-01); defaults on.
- **Portfolio AI chat** — wired but enforcement weak (PORT-P2-02/03); live status NLV.
- **Visitor analytics** — present but writes are unauthenticated/inflatable (PORT-P2-10) and some indexes are missing/NLV.
- **`portfolio_history` / `portfolio_interactions`** — no schema setup script in repo (NLV).

## G. Fix Plan (phased)
- **Phase 0 — Manual / NLV (owner):** confirm Console permissions for `portfolio_settings`, `profiles`, `portfolio_visits`, `resumes`, `chat_sessions`; confirm function CORS allowed-origins; confirm the **real** username collection IDs (PORT-P1-04); confirm `portfolio_history`/`portfolio_interactions` schemas; confirm OG env. *No code. Owner approval: N/A (read-only).* 
- **Phase 1 — P0/P1 security/data/privacy:** PORT-P1-01 (contact routing), PORT-P1-02 (email exposure), PORT-P1-03 (password rate-limit on live path), PORT-P1-04 (ID drift unify), PORT-P2-01 (hash off the client). *Files: ai-gateway, usePortfolioSEO, get-public-portfolio/verify-portfolio-password, useProfile/PortfolioEditorPage, appwrite-collections + admin hub. Validation: `tsc`, `build`, hub `node --check`, targeted tests. Deploy: Vercel + Appwrite hubs (+ Console perms). Owner approval required.*
- **Phase 2 — Reliability/edge:** PORT-P1-05 (custom-domain index or gate-off), PORT-P2-02/03/04/06, fail-closed enforcement. *Deploy: Vercel + hubs + possible schema.*
- **Phase 3 — Owner UX:** PORT-P2-07 (toast), PORT-P2-09 (domains), PORT-UX-01 (honest custom-domain UI), PORT-P3-12.
- **Phase 4 — Visitor/public:** PORT-P3-01 (error states), PORT-P2-11 (injection), PORT-P3-06.
- **Phase 5 — Tests & docs:** add the tests below; update Atlas + CHANGELOG.

## H. Validation Plan
```bash
npx tsc --noEmit
npm run build
npm run test -- portfolio
npm run test -- usePublicPortfolio
node --check appwrite-hubs/get-public-portfolio/src/main.js
node --check appwrite-hubs/public-share/src/main.js
node --check appwrite-hubs/ai-gateway/src/main.js
node scripts/compute-source-hashes.mjs   # if hubs change, to refresh deploy manifest
```
**Tests to add:** public payload contains no `password_hash`/`email`/`user_id`; password-required + correct/wrong + sessionToken round-trip on the Appwrite path; brute-force lockout; portfolio_contact routes to owner; snake↔camel normalization; custom-domain not-found; rate-limit (429) UI state; accessibility on `PublicHero`/gate.
**Manual QA checklist:** publish; change username (old link behavior); change selected resume; unpublish; enable password; visitor open URL; wrong then correct password; old-domain URL; mobile; contact form (does owner receive?); chat session + cap across tabs; malformed/bad username; copy/QR/Career Card/SEO preview (correct domain + no email leak).

## I. Final Recommendation
- **Fix now vs defer:** Fix Phase 1 now; it is small, high-value, and mostly low-risk. Defer Phase 3–4 polish.
- **Before broad user testing:** PORT-P1-01 (contact routing) and PORT-UX-01/PORT-P1-05 (don't present custom domains as working) — these will otherwise generate false bug reports and erode trust. Confirm PORT-P1-04 IDs.
- **Before public launch:** all P1 + PORT-P2-01/02/04/05 (auth-path hardening) + PORT-P2-06 (backend consistency).
- **Can wait:** the P3 set, prompt-injection hardening polish, draft byte-count, analytics index tuning.
- **PRs:** **multiple, phased** PRs (one per phase, security-first) — not one mega-PR. Keep frontend (Vercel) and hub-redeploy changes reviewable separately.
- **Appwrite functions needing redeploy (if fixes accepted):** `ai-gateway`, `get-public-portfolio`, `verify-portfolio-password`, `public-share`, `admin-portfolio-usernames` (only the ones actually touched per phase). Use the official GitHub Actions workflow — never Console deploy.
- **Schema / manual Appwrite actions needing owner confirmation:** `portfolio_settings`/`profiles`/`portfolio_visits` read-write permissions; username collection ID unification; promoting `custom_domain` to an indexed attribute; function CORS allowed-origins; OG env/perms; existence of `portfolio_history`/`portfolio_interactions` schemas.

---

*Audit only — no files changed, nothing committed/pushed/deployed. Awaiting owner approval before any implementation. Items marked NLV require live Appwrite Console verification and were not assumed.*
